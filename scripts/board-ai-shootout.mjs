// Board-game AI shootout: quantify whether computer strength actually improved.
// Mirrors scripts/ai-shootout.mjs (card games) for apps/board-game.
//
// Measurement standard
// --------------------
// 1) Difficulty scaling: master vs easy self-play. Master should score >= 65%
//    (draws = 0.5). Otherwise difficulty levels are not meaningfully ordered.
// 2) PR effectiveness: both current-branch master and baseline master play the
//    SAME baseline-normal opponent (alternating colors). A real improvement is
//    a strictly higher score than the baseline master against that fixed foe.
// 3) Unit tests remain the legality/tactic gate; this harness is the strength gate.
//
// Usage:
//   node scripts/board-ai-shootout.mjs --extract-baseline
//   node scripts/board-ai-shootout.mjs --mode=both
//   node scripts/board-ai-shootout.mjs --games=reversi,gomoku --matches=10 --mode=pr
//
// Modes: scale | pr | both (default both)

import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const boardRoot = path.join(root, "apps", "board-game");
const baselineRoot = path.join(root, ".tmp-ai-baseline", "apps", "board-game");

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function withSeed(seed, fn) {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function clearModuleCache(dirPrefix) {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(dirPrefix)) delete require.cache[key];
  }
}

function loadGame(game, { baseline = false } = {}) {
  const dir = baseline ? path.join(baselineRoot, game) : path.join(boardRoot, game);
  if (!fs.existsSync(path.join(dir, "game.js"))) {
    throw new Error(`Missing game module: ${dir}/game.js`);
  }
  clearModuleCache(dir);
  return require(path.join(dir, "game.js"));
}

function extractBaseline() {
  const games = fs
    .readdirSync(boardRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const outRoot = path.join(root, ".tmp-ai-baseline");
  fs.rmSync(outRoot, { recursive: true, force: true });
  for (const game of games) {
    const dest = path.join(outRoot, "apps", "board-game", game);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of ["ai.js", "game.js"]) {
      const content = execFileSync("git", ["show", `master:apps/board-game/${game}/${file}`], {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      fs.writeFileSync(path.join(dest, file), content);
    }
  }
  const commonDest = path.join(outRoot, "apps", "common");
  fs.mkdirSync(commonDest, { recursive: true });
  fs.copyFileSync(
    path.join(root, "apps", "common", "game-utils.js"),
    path.join(commonDest, "game-utils.js")
  );
  console.log(`Baseline extracted for ${games.length} games into ${outRoot}`);
}

// Side roles: "first" = opening-to-move player, "second" = reply.
// For chinese-checkers (3+ rotation) we still only track first vs second seats.

function createSeat(game, mod, role) {
  const g = mod;
  const s = { role, board: null, player: null };

  switch (game) {
    case "reversi":
      s.board = g.createGameState("pvp").board;
      s.player = g.PLAYER_BLACK;
      s.passCount = 0;
      s.opening = g.PLAYER_BLACK;
      break;
    case "gomoku":
      s.board = g.createGameState("pvp").board;
      s.player = g.BLACK;
      s.opening = g.BLACK;
      break;
    case "international-chess":
      s.board = g.createGameState("pvp").board;
      s.player = g.WHITE;
      s.hasMoved = new Set();
      s.epTarget = null;
      s.opening = g.WHITE;
      break;
    case "checkers":
      s.board = g.createGameState("pvp").board;
      s.player = g.RED;
      s.opening = g.RED;
      break;
    case "chinese-chess":
      s.board = g.createGameState("pvp").board;
      s.player = g.RED;
      s.opening = g.RED;
      break;
    case "dou-shou-qi":
      s.board = g.createGameState("pvp").board;
      s.player = g.RED;
      s.opening = g.RED;
      break;
    case "chinese-checkers": {
      const st = g.createGameState("pvp", 2);
      g.initGame(st);
      s.board = st.board;
      s.players = st.players;
      s.turnIdx = 0;
      s.opening = st.players[0];
      break;
    }
    case "go":
      s.board = g.createGameState("pvp").board;
      s.player = g.BLACK;
      s.ko = null;
      s.capturesB = 0;
      s.capturesW = 0;
      s.passCount = 0;
      s.opening = g.BLACK;
      break;
    case "shogi":
      s.board = g.initializeBoard();
      s.capturedPieces = { [g.SENTE]: [], [g.GOTE]: [] };
      s.player = g.SENTE;
      s.opening = g.SENTE;
      break;
    default:
      throw new Error(`No init for ${game}`);
  }
  return s;
}

function currentSide(game, s) {
  switch (game) {
    case "chinese-checkers":
      return s.players[s.turnIdx % s.players.length] === s.players[0] ? "first" : "second";
    default:
      return s.player === s.opening ? "first" : "second";
  }
}

function stepState(game, current, baseline, s, side) {
  // side: "first" | "second" — who is about to move
  const mod = side === "first" ? current : baseline;
  const g = current;

  switch (game) {
    case "reversi": {
      if (g.isGameOver(s.board) || s.passCount >= 2) {
        const w = g.getWinner(s.board);
        return {
          over: true,
          winner: w === "draw" || w == null ? null : w === g.PLAYER_BLACK ? "first" : "second",
        };
      }
      const move = mod.getBestAIMove(s.board, s.player, "master");
      if (!move) {
        s.passCount++;
        s.player = g.getOpponent(s.player);
        return null;
      }
      s.passCount = 0;
      g.makeMove(s.board, move.x, move.y, s.player);
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "gomoku": {
      if (s.last && g.checkWinAt(s.board, s.last.x, s.last.y, s.last.player)) {
        return { over: true, winner: s.last.player === g.BLACK ? "first" : "second" };
      }
      if (g.checkDraw(s.board)) return { over: true, winner: null };
      const move = mod.getBestAIMove(s.board, s.player, "master");
      if (!move) return { over: true, winner: null };
      s.board = g.makeMove(s.board, move.x, move.y, s.player);
      s.last = { x: move.x, y: move.y, player: s.player };
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "international-chess": {
      const over = g.checkGameOver(s.board, s.player, s.hasMoved, s.epTarget);
      if (over)
        return {
          over: true,
          winner: over.winner == null ? null : over.winner === g.WHITE ? "first" : "second",
        };
      const move = mod.getBestAIMove(s.board, s.player, s.hasMoved, "master");
      if (!move) return { over: true, winner: null };
      s.hasMoved.add(move.fromC + "," + move.fromR);
      s.hasMoved.add(move.toC + "," + move.toR);
      if (move.castling) {
        const rookFromC = move.toC === 6 ? 7 : 0;
        s.hasMoved.add(rookFromC + "," + move.toR);
        s.hasMoved.add((move.toC === 6 ? 5 : 3) + "," + move.toR);
      }
      s.board = g.applyMove(s.board, move);
      s.epTarget = move.doublePawn ? { c: move.toC, r: (move.fromR + move.toR) / 2 } : null;
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "checkers": {
      const over = g.checkGameOver(s.board, s.player);
      if (over)
        return {
          over: true,
          winner: over.winner == null ? null : over.winner === g.RED ? "first" : "second",
        };
      const move = mod.getBestAIMove(s.board, s.player, "master");
      if (!move) return { over: true, winner: null };
      s.board = g.applyMove(s.board, move);
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "chinese-chess": {
      const over = g.checkGameOver(s.board, s.player);
      if (over)
        return {
          over: true,
          winner: over.winner == null ? null : over.winner === g.RED ? "first" : "second",
        };
      const move = mod.getBestAIMove(s.board, s.player, "master");
      if (!move) return { over: true, winner: null };
      s.board = g.applyMove(s.board, move);
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "dou-shou-qi": {
      const over = g.checkGameOver(s.board, s.player);
      if (over)
        return {
          over: true,
          winner: over.winner == null ? null : over.winner === g.RED ? "first" : "second",
        };
      const move = mod.getBestAIMove(s.board, s.player, "master");
      if (!move) return { over: true, winner: null };
      s.board = g.applyMoveForAI(s.board, move);
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "chinese-checkers": {
      const winner = g.checkGameOver(s.board, s.players);
      if (winner) return { over: true, winner: winner === s.players[0] ? "first" : "second" };
      const player = s.players[s.turnIdx % s.players.length];
      const move = mod.getBestAIMove(s.board, player, s.players, "master");
      s.turnIdx++;
      if (!move) {
        const next = s.players[s.turnIdx % s.players.length];
        if (!g.getLegalMoves(s.board, next).length && !g.getLegalMoves(s.board, player).length) {
          return { over: true, winner: null };
        }
        return null;
      }
      s.board = g.makeMove(s.board, move.from, move.to);
      return null;
    }
    case "go": {
      if (s.passCount >= 2 || g.getLegalMoves(s.board, s.player, s.ko).length === 0) {
        s.passCount++;
        if (s.passCount >= 2) {
          const score = g.calculateScore(s.board);
          return { over: true, winner: score.black + g.KOMI > score.white ? "first" : "second" };
        }
        s.player = g.getOpponent(s.player);
        return null;
      }
      const move = mod.getBestAIMove(s.board, s.player, s.ko, s.capturesB, s.capturesW, "master");
      if (!move) {
        s.passCount++;
        s.player = g.getOpponent(s.player);
        if (s.passCount >= 2) {
          const score = g.calculateScore(s.board);
          return { over: true, winner: score.black + g.KOMI > score.white ? "first" : "second" };
        }
        return null;
      }
      const result = g.playMove(s.board, move.x, move.y, s.player);
      if (!result) {
        s.passCount++;
        s.player = g.getOpponent(s.player);
        return null;
      }
      s.passCount = 0;
      if (s.player === g.BLACK) s.capturesB += result.captures;
      else s.capturesW += result.captures;
      s.board = result.board;
      s.ko = result.koPoint;
      s.player = g.getOpponent(s.player);
      return null;
    }
    case "shogi": {
      const status = g.getGameStatus(s.board, s.player, s.capturedPieces);
      if (status.gameOver || status.checkmate || status.stalemate) {
        if (status.checkmate)
          return { over: true, winner: s.player === g.SENTE ? "second" : "first" };
        return { over: true, winner: null };
      }
      const move = mod.getBestAIMove(s.board, s.capturedPieces, s.player, 3, "master");
      if (!move) return { over: true, winner: null };
      const applied = g.applyMove(s.board, move, s.capturedPieces);
      s.board = applied.board;
      s.capturedPieces = applied.capturedPieces;
      s.player = s.player === g.SENTE ? g.GOTE : g.SENTE;
      return null;
    }
    default:
      throw new Error(`No step for ${game}`);
  }
}

function runPair({ label, games, maxSteps, makeState, firstMod, secondMod, current, baseline }) {
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let aborted = 0;
  const t0 = Date.now();

  for (let i = 0; i < games; i++) {
    // Alternate: even → first mover is A; odd → first mover is B.
    const firstIsA = i % 2 === 0;
    const seed = 10007 + i * 7919;
    const outcome = withSeed(seed, () => {
      const s = makeState();
      for (let step = 0; step < maxSteps; step++) {
        const side = currentSide(s.gameName ?? "", s);
        // Determine who is moving: side is first|second in game terms
        // Map: if firstIsA, game-first = A = firstMod; else game-first = B = secondMod
        const firstGameMod = firstIsA ? firstMod : secondMod;
        const secondGameMod = firstIsA ? secondMod : firstMod;
        const result = stepState(s.gameName, firstGameMod, secondGameMod, s, side);
        if (result && result.over) {
          if (result.winner == null) return { winner: null };
          if (result.winner === "first") return { winner: firstIsA ? "A" : "B" };
          return { winner: firstIsA ? "B" : "A" };
        }
      }
      return { winner: null, aborted: true };
    });
    if (outcome.winner === "A") aWins++;
    else if (outcome.winner === "B") bWins++;
    else draws++;
    if (outcome.aborted) aborted++;
  }

  const ms = Date.now() - t0;
  const aScore = (aWins + draws * 0.5) / games;
  console.log(
    `${label}: A ${aWins} - B ${bWins} (draws ${draws}) over ${games} | A score ${(aScore * 100).toFixed(1)}% | ${ms}ms${aborted ? ` | aborted ${aborted}` : ""}`
  );
  return { label, aWins, bWins, draws, aborted, aScore, ms };
}

function makeFactory(game, current, baseline) {
  return () => {
    const s = createSeat(game, current, "first");
    s.gameName = game;
    return s;
  };
}

// Wrap getBestAIMove to force a difficulty level (for scale mode).
function withForcedLevel(mod, level) {
  // We cannot rebind module exports easily; instead we rely on passing
  // difficulty as the last argument. stepState already passes "master".
  // For scale mode we need per-side difficulty — use a Proxy on the module.
  return new Proxy(mod, {
    get(target, prop) {
      if (prop === "getBestAIMove") {
        const original = target.getBestAIMove;
        return (...args) => {
          // Replace trailing difficulty if present, else append.
          if (typeof args[args.length - 1] === "string") {
            args[args.length - 1] = level;
            return original(...args);
          }
          return original(...args, level);
        };
      }
      return target[prop];
    },
  });
}

const GAME_META = {
  reversi: { maxSteps: 120, defaultMatches: 12 },
  gomoku: { maxSteps: 260, defaultMatches: 12 },
  "international-chess": { maxSteps: 180, defaultMatches: 6 },
  checkers: { maxSteps: 180, defaultMatches: 8 },
  "chinese-chess": { maxSteps: 160, defaultMatches: 4 },
  "dou-shou-qi": { maxSteps: 160, defaultMatches: 4 },
  "chinese-checkers": { maxSteps: 280, defaultMatches: 6 },
  go: { maxSteps: 70, defaultMatches: 3 },
  shogi: { maxSteps: 140, defaultMatches: 3 },
};

function runPairAgainst({ game, label, matches, maxSteps, current, trialMod, foeMod }) {
  // trialMod always plays as A; foeMod as B. Sides alternate which color
  // moves first, but A/B stay fixed so scores are comparable across trials.
  const s0 = createSeat(game, current, "first");
  s0.gameName = game;
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let aborted = 0;
  const t0 = Date.now();
  for (let i = 0; i < matches; i++) {
    const firstIsA = i % 2 === 0;
    const seed = 10007 + i * 7919;
    const outcome = withSeed(seed, () => {
      const s = createSeat(game, current, "first");
      s.gameName = game;
      for (let step = 0; step < maxSteps; step++) {
        const side = currentSide(game, s);
        const firstGameMod = firstIsA ? trialMod : foeMod;
        const secondGameMod = firstIsA ? foeMod : trialMod;
        const result = stepState(game, firstGameMod, secondGameMod, s, side);
        if (result && result.over) {
          if (result.winner == null) return { winner: null };
          if (result.winner === "first") return { winner: firstIsA ? "A" : "B" };
          return { winner: firstIsA ? "B" : "A" };
        }
      }
      return { winner: null, aborted: true };
    });
    if (outcome.winner === "A") aWins++;
    else if (outcome.winner === "B") bWins++;
    else draws++;
    if (outcome.aborted) aborted++;
  }
  const ms = Date.now() - t0;
  const aScore = (aWins + draws * 0.5) / matches;
  console.log(
    `${label}: A ${aWins} - B ${bWins} (draws ${draws}) over ${matches} | A score ${(aScore * 100).toFixed(1)}% | ${ms}ms${aborted ? ` | aborted ${aborted}` : ""}`
  );
  void s0;
  return { label, aWins, bWins, draws, aborted, aScore, ms };
}

function runSuite({ games, mode, matchesOverride }) {
  const results = [];
  for (const game of games) {
    const meta = GAME_META[game];
    const current = loadGame(game, { baseline: false });
    const matches = matchesOverride || meta.defaultMatches;

    if (mode === "scale") {
      const result = runPair({
        label: `${game} [master vs easy]`,
        games: matches,
        maxSteps: meta.maxSteps,
        makeState: makeFactory(game, current, current),
        firstMod: withForcedLevel(current, "master"),
        secondMod: withForcedLevel(current, "easy"),
        current,
        baseline: null,
      });
      results.push({ game, mode: "scale", ...result });
      continue;
    }

    // PR mode: fixed baseline-easy opponent.
    const baseline = loadGame(game, { baseline: true });
    const foe = withForcedLevel(baseline, "normal");
    const newScore = runPairAgainst({
      game,
      label: `${game} [new master vs baseline normal]`,
      matches,
      maxSteps: meta.maxSteps,
      current,
      trialMod: withForcedLevel(current, "master"),
      foeMod: foe,
    });
    const oldScore = runPairAgainst({
      game,
      label: `${game} [base master vs baseline normal]`,
      matches,
      maxSteps: meta.maxSteps,
      current,
      trialMod: withForcedLevel(baseline, "master"),
      foeMod: withForcedLevel(baseline, "normal"),
    });
    results.push({
      game,
      mode: "pr",
      label: `${game} [new vs base vs fixed foe]`,
      aScore: newScore.aScore,
      baseScore: oldScore.aScore,
      aWins: newScore.aWins,
      bWins: newScore.bWins,
      draws: newScore.draws,
      aborted: newScore.aborted,
      ms: newScore.ms + oldScore.ms,
    });
  }
  return results;
}

function parseArgs(argv) {
  const args = { mode: "both", games: null, matches: null, extractBaseline: false, help: false };
  for (const raw of argv) {
    if (raw === "--extract-baseline") args.extractBaseline = true;
    else if (raw.startsWith("--mode=")) args.mode = raw.slice(7);
    else if (raw.startsWith("--games=")) args.games = raw.slice(8).split(",").filter(Boolean);
    else if (raw.startsWith("--matches=")) args.matches = Number(raw.slice(10));
    else if (raw === "--help" || raw === "-h") args.help = true;
  }
  return args;
}

function summarize(results) {
  console.log("\n=== Summary ===");
  for (const r of results) {
    if (r.mode === "scale") {
      const status = r.aScore >= 0.65 ? "PASS" : r.aScore < 0.45 ? "FAIL" : "WEAK";
      console.log(
        `  scale ${r.game.padEnd(22)} master score=${(r.aScore * 100).toFixed(1)}%  ${status}`
      );
      continue;
    }
    const delta = r.aScore - (r.baseScore ?? 0.5);
    const status = delta > 0.05 ? "GAIN" : delta < -0.05 ? "LOSS" : "FLAT";
    console.log(
      `  pr    ${r.game.padEnd(22)} new=${(r.aScore * 100).toFixed(1)}% base=${((r.baseScore ?? 0) * 100).toFixed(1)}% Δ=${(delta * 100).toFixed(1)}pp  ${status}`
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      `Usage: node scripts/board-ai-shootout.mjs [--mode=scale|pr|both] [--games=a,b] [--matches=N] [--extract-baseline]`
    );
    return;
  }
  if (args.extractBaseline) extractBaseline();

  const allGames = Object.keys(GAME_META);
  const games = args.games && args.games.length ? args.games : allGames;
  for (const g of games) {
    if (!GAME_META[g]) {
      console.error(`Unknown game: ${g}. Known: ${allGames.join(", ")}`);
      process.exit(1);
    }
  }

  const results = [];
  if (args.mode === "scale" || args.mode === "both") {
    console.log("\n=== Difficulty scaling: master vs easy ===");
    results.push(...runSuite({ games, mode: "scale", matchesOverride: args.matches }));
  }
  if (args.mode === "pr" || args.mode === "both") {
    if (!fs.existsSync(baselineRoot)) {
      console.log("\nBaseline missing — run --extract-baseline first. Skipping PR suite.");
    } else {
      console.log("\n=== PR effectiveness: new master vs baseline master ===");
      results.push(...runSuite({ games, mode: "pr", matchesOverride: args.matches }));
    }
  }
  if (results.length) summarize(results);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
