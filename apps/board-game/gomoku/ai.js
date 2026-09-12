/* eslint-disable no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_SIZE,
      EMPTY,
      BLACK,
      WHITE,
      WIN_COUNT,
      WIN_LINES,
      WINS_MAP,
      initWinLines,
      createBoard,
      getOpponent,
      getPlayerName,
      checkWinAt,
      checkDraw,
      makeMove,
      createGameState,
    } = deps;

    const SCORE_HUMAN = [0, 200, 400, 2000, 10000];

    const SCORE_AI = [0, 220, 420, 2100, 20000];

    // A completed five, used as a catastrophic penalty when a candidate move
    // lets the opponent win on their next turn.
    const FIVE_THREAT = 100000;

    const SEARCH_CANDIDATES = 8;

    // Best single-point threat the attacker can realize on their next move,
    // scanning every win line once. Mixed lines (both players) contribute
    // nothing. A line with four attacker stones means an immediate five.
    function maxPointThreat(board, attacker) {
      const defender = getOpponent(attacker);
      let best = 0;
      for (let lid = 0; lid < WIN_LINES.length; lid++) {
        const line = WIN_LINES[lid];
        let count = 0;
        let blocked = false;
        const empties = [];
        for (let k = 0; k < line.length; k++) {
          const val = board[line[k].y][line[k].x];
          if (val === attacker) count++;
          else if (val === defender) blocked = true;
          else empties.push(line[k]);
        }
        if (blocked) continue;
        if (count === 0) continue;
        if (count === line.length - 1) return FIVE_THREAT;
        for (const point of empties) {
          const threat = SCORE_HUMAN[count];
          if (threat > best) best = threat;
        }
      }
      return best;
    }

    // Count how many distinct winning lines the attacker could complete on
    // their next move. Two or more means a double threat (four + three, etc).
    function openThreatCount(board, attacker) {
      const defender = getOpponent(attacker);
      let count = 0;
      for (let lid = 0; lid < WIN_LINES.length; lid++) {
        const line = WIN_LINES[lid];
        let a = 0;
        let blocked = false;
        for (let k = 0; k < line.length; k++) {
          const val = board[line[k].y][line[k].x];
          if (val === attacker) a++;
          else if (val === defender) blocked = true;
        }
        if (blocked) continue;
        if (a >= 3) count++;
      }
      return count;
    }

    function getBestAIMove(board, aiPlayer, difficulty) {
      const humanPlayer = getOpponent(aiPlayer);
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") {
        const emptyCells = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
          for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y][x] === EMPTY) emptyCells.push({ x, y });
          }
        }
        return emptyCells.length > 0
          ? emptyCells[Math.floor(Math.random() * emptyCells.length)]
          : null;
      }
      const attackWeight = { normal: 1, hard: 1.08, master: 1.16 }[level] || 1;
      const scoreAI = [];
      const scoreHuman = [];
      for (let i = 0; i < BOARD_SIZE; i++) {
        scoreAI[i] = [];
        scoreHuman[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
          scoreAI[i][j] = 0;
          scoreHuman[i][j] = 0;
        }
      }

      // Iterate all winning lines, calculate score for each empty position
      for (let lid = 0; lid < WIN_LINES.length; lid++) {
        const line = WIN_LINES[lid];
        let aiCount = 0;
        let humanCount = 0;
        for (let k = 0; k < line.length; k++) {
          const val = board[line[k].y][line[k].x];
          if (val === aiPlayer) aiCount++;
          else if (val === humanPlayer) humanCount++;
        }

        // Only consider if this line is not occupied by both sides
        if (aiCount > 0 && humanCount > 0) continue;

        if (aiCount > 0 && humanCount === 0) {
          // AI's line, add score to empty positions
          for (const point of line) {
            if (board[point.y][point.x] === EMPTY) {
              scoreAI[point.x][point.y] += SCORE_AI[aiCount];
            }
          }
        } else if (humanCount > 0 && aiCount === 0) {
          // Human's line, add score to empty positions (defense score)
          for (const point of line) {
            if (board[point.y][point.x] === EMPTY) {
              scoreHuman[point.x][point.y] += SCORE_HUMAN[humanCount];
            }
          }
        }
      }

      let maxScore = -1;
      let bestX = -1;
      let bestY = -1;

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (board[y][x] !== EMPTY) continue;
          if (scoreAI[x][y] === 0 && scoreHuman[x][y] === 0) continue;

          const center = Math.floor(BOARD_SIZE / 2);
          const centerBonus =
            level === "master" ? BOARD_SIZE - Math.abs(x - center) - Math.abs(y - center) : 0;
          const s = scoreAI[x][y] * attackWeight + scoreHuman[x][y] + centerBonus;
          if (s > maxScore) {
            maxScore = s;
            bestX = x;
            bestY = y;
          } else if (s === maxScore) {
            // On tie, prefer offense (higher AI score)
            if (scoreAI[x][y] > scoreAI[bestX][bestY]) {
              bestX = x;
              bestY = y;
            }
          }
        }
      }

      // Play center when board is empty
      if (bestX === -1) {
        const center = Math.floor(BOARD_SIZE / 2);
        return { x: center, y: center };
      }

      // Completing our own five or blocking the opponent's five is forced;
      // never second-guess it with the shallow search below.
      if (scoreAI[bestX][bestY] >= SCORE_AI[4] || scoreHuman[bestX][bestY] >= SCORE_HUMAN[4]) {
        return { x: bestX, y: bestY };
      }
      if (level === "normal") {
        return { x: bestX, y: bestY };
      }

      // Hard/master: refine the top scoring candidates with a one-move
      // lookahead. A candidate is devalued by the best threat the opponent
      // gains on their reply, so moves that hand the opponent a four, an
      // open three or a double threat lose to safer moves of similar value.
      // Master additionally prefers creating its own open-four / double-three.
      const threatFactor = level === "master" ? 1 : 0.9;
      const candidates = [];
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          if (board[y][x] !== EMPTY) continue;
          if (scoreAI[x][y] === 0 && scoreHuman[x][y] === 0) continue;
          const center = Math.floor(BOARD_SIZE / 2);
          const centerBonus =
            level === "master" ? BOARD_SIZE - Math.abs(x - center) - Math.abs(y - center) : 0;
          const s = scoreAI[x][y] * attackWeight + scoreHuman[x][y] + centerBonus;
          candidates.push({ x: x, y: y, s: s });
        }
      }
      candidates.sort((a, b) => b.s - a.s);
      const top = candidates.slice(0, SEARCH_CANDIDATES);

      let bestCandidate = top[0];
      let bestAdjusted = -Infinity;
      for (const candidate of top) {
        const nextBoard = board.map((row) => row.slice());
        nextBoard[candidate.y][candidate.x] = aiPlayer;
        if (checkWinAt(nextBoard, candidate.x, candidate.y, aiPlayer)) {
          return { x: candidate.x, y: candidate.y };
        }
        const oppThreat = maxPointThreat(nextBoard, humanPlayer);
        const myThreat = maxPointThreat(nextBoard, aiPlayer);
        // Prefer creating multiple open three-or-better lines (double threat).
        const myDoubles = openThreatCount(nextBoard, aiPlayer);
        const oppDoubles = openThreatCount(nextBoard, humanPlayer);
        const adjusted =
          candidate.s +
          myThreat * 0.25 +
          Math.max(0, myDoubles - 1) * 2500 * (level === "master" ? 1 : 0.8) -
          oppThreat * threatFactor -
          Math.max(0, oppDoubles - 1) * 3000;
        if (adjusted > bestAdjusted) {
          bestAdjusted = adjusted;
          bestCandidate = candidate;
        }
      }
      return { x: bestCandidate.x, y: bestCandidate.y };
    }

    return { SCORE_HUMAN, SCORE_AI, getBestAIMove };
  }
  return { createGameAI };
});
