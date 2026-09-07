/* eslint-disable no-var, no-undef */
// ============================================================
// Army Chess (Open) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

// ============================================================
// Constants
// ============================================================

const NORMAL_PIECE_NAMES = ["工兵", "排长", "连长", "营长", "团长", "旅长", "师长", "军长", "司令"];
const BOMB_NAME = "炸弹";
const MINE_NAME = "地雷";
const FLAG_NAME = "军旗";

// Rank mapping: higher value = higher rank (consistent with LifeLikeChess flag)
const RANK_MAP = {
  工兵: 0,
  排长: 1,
  连长: 2,
  营长: 3,
  团长: 4,
  旅长: 5,
  师长: 6,
  军长: 7,
  司令: 8,
};

// Count of each piece type
const PIECE_COUNTS = {
  工兵: 3,
  排长: 3,
  连长: 3,
  营长: 2,
  团长: 2,
  旅长: 2,
  师长: 2,
  军长: 1,
  司令: 1,
  炸弹: 2,
  地雷: 3,
  军旗: 1,
};

// Board dimensions
const COLS = 5;
const ROWS = 12; // Array row count (visual gap row, 13 rows total)

// Teams
const RED = "red";
const BLUE = "blue";

// Piece states
const STATE_FACE_UP = "face_up";
const STATE_FACE_DOWN = "face_down";

// ============================================================
// Board Layout Constants
// ============================================================

// Camp positions (array coordinates)
const CAMPS = [
  { x: 1, y: 2 },
  { x: 3, y: 2 },
  { x: 2, y: 3 },
  { x: 1, y: 4 },
  { x: 3, y: 4 },
  { x: 1, y: 7 },
  { x: 3, y: 7 },
  { x: 2, y: 8 },
  { x: 1, y: 9 },
  { x: 3, y: 9 },
];

// Base camp positions (array coordinates)
const BASE_CAMPS = [
  { x: 1, y: 0 },
  { x: 3, y: 0 },
  { x: 1, y: 11 },
  { x: 3, y: 11 },
];

// Horizontal railway rows (array y coordinates)
const H_RAILWAYS = [1, 5, 6, 10];

// Vertical railway columns and ranges
const V_RAILWAY_LEFT_RIGHT = { x: [0, 4], yMin: 1, yMax: 10 };
const V_RAILWAY_MIDDLE = { x: 2, yMin: 5, yMax: 6 };

// ============================================================
// Utility Functions
// ============================================================

function isNormalPiece(name) {
  return NORMAL_PIECE_NAMES.includes(name);
}

function isBomb(name) {
  return name === BOMB_NAME;
}
function isMine(name) {
  return name === MINE_NAME;
}
function isFlag(name) {
  return name === FLAG_NAME;
}

function isMovable(piece) {
  return !isMine(piece.name) && !isFlag(piece.name);
}

function getRank(name) {
  return RANK_MAP[name] !== undefined ? RANK_MAP[name] : null;
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function isCamp(x, y) {
  for (const camp of CAMPS) {
    if (camp.x === x && camp.y === y) return true;
  }
  return false;
}

function isBaseCamp(x, y) {
  for (const baseCamp of BASE_CAMPS) {
    if (baseCamp.x === x && baseCamp.y === y) return true;
  }
  return false;
}

// Get visual row number (skip gap row)
function getBoardRow(y) {
  return y > 5 ? y + 1 : y;
}

// Check if position has diagonal eligibility (for camp entry/exit)
function hasDiagonalEligibility(x, y) {
  if (!inBounds(x, y)) return false;
  const boardRow = getBoardRow(y);
  return (x + boardRow) % 2 === 1;
}

// Check if on railway
function isOnHRailway(y) {
  return H_RAILWAYS.includes(y);
}

function isOnVRailway(x, y) {
  if ((x === 0 || x === 4) && y >= 1 && y <= 10) return true;
  if (x === 2 && y >= 5 && y <= 6) return true;
  return false;
}

function isOnRailway(x, y) {
  return isOnHRailway(y) || isOnVRailway(x, y);
}

// Check if two positions are connected by railway (adjacent and both on railway)
function areOnSameRailway(x1, y1, x2, y2) {
  // Horizontally adjacent
  if (y1 === y2 && Math.abs(x1 - x2) === 1) {
    return isOnHRailway(y1);
  }
  // Vertically adjacent
  if (x1 === x2 && Math.abs(y1 - y2) === 1) {
    // Cross gap row (y=5 <-> y=6): only middle column (x=2) can cross
    if ((y1 === 5 && y2 === 6) || (y1 === 6 && y2 === 5)) {
      if (x1 === 2) return true;
      // Side railways (x=0,4) cross gap directly, no special check needed
      return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
    }
    return isOnVRailway(x1, y1) && isOnVRailway(x1, y2);
  }
  return false;
}

// Get image path
function getImagePath(piece) {
  if (isFlag(piece.name)) return "images/军旗.png";
  if (piece.team === RED) return "images/红-" + piece.name + ".png";
  return "images/蓝-" + piece.name + ".png";
}

// ============================================================
// Combat Resolution
// ============================================================

function canCapture(attacker, defender) {
  if (isFlag(defender.name)) return false;
  if (isMine(attacker.name)) return false;
  if (isFlag(attacker.name)) return false;
  if (attacker.team === defender.team) return false;
  if (isBomb(attacker.name)) return true;
  if (isBomb(defender.name)) return true;
  if (attacker.name === "工兵" && isMine(defender.name)) return true;
  if (isMine(defender.name) && isNormalPiece(attacker.name)) return true;
  if (isNormalPiece(attacker.name) && isNormalPiece(defender.name)) {
    return attacker.rank >= defender.rank;
  }
  return false;
}

function resolveCombat(attacker, defender) {
  if (!canCapture(attacker, defender)) return "invalid";
  if (isBomb(attacker.name)) return "mutual_destruction";
  if (isBomb(defender.name)) return "mutual_destruction";
  if (attacker.name === "工兵" && isMine(defender.name)) return "attacker_wins";
  if (isMine(defender.name)) return "mutual_destruction";
  if (attacker.rank === defender.rank) return "mutual_destruction";
  if (attacker.rank > defender.rank) return "attacker_wins";
  return "invalid";
}

// ============================================================
// Create Game State
// ============================================================

function createGameState(mode, seed) {
  const gameType = mode.gameType || "open";
  const oppType = mode.oppType || "pvp";
  const rng = seed ? createSeededRandom(seed) : null;

  const pieces = [];

  // Red team 25 pieces
  const redNames = [];
  for (const name of Object.keys(PIECE_COUNTS)) {
    for (let i = 0; i < PIECE_COUNTS[name]; i++) {
      redNames.push(name);
    }
  }
  for (const name of redNames) {
    pieces.push({
      name: name,
      team: RED,
      rank: getRank(name),
      state: STATE_FACE_UP,
    });
  }

  // Blue team 25 pieces
  for (const name of redNames) {
    pieces.push({
      name: name,
      team: BLUE,
      rank: getRank(name),
      state: STATE_FACE_UP,
    });
  }

  // Place pieces
  const board = [];
  for (let y = 0; y < ROWS; y++) {
    board[y] = [];
    for (let x = 0; x < COLS; x++) {
      board[y][x] = null;
    }
  }

  if (gameType === "flip") {
    // Flip mode: 50 pieces randomly placed on full board, all face down
    placePiecesRandom(board, pieces, rng);
  } else {
    // Open/hidden mode: constrained placement in halves
    placePiecesForTeam(board, pieces.slice(0, 25), 0, rng); // Red -> y 6-11
    placePiecesForTeam(board, pieces.slice(25, 50), 1, rng); // Blue -> y 0-5

    // Hidden mode: opponent pieces face down
    if (gameType === "hidden") {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const p = board[y][x];
          if (p) p.state = STATE_FACE_DOWN;
        }
      }
    }
  }

  return {
    gameType: gameType,
    oppType: oppType,
    board: board,
    currentTeam: null,
    playerTeam: null,
    aiTeam: null,
    firstPlayer: null,
    turnCount: 0,
    capturedRed: [],
    capturedBlue: [],
    selectedCell: null,
    gameOver: false,
    winner: null,
    aiThinking: false,
  };
}

function placePiecesForTeam(board, pieces, halfIndex, rng) {
  const yStart = halfIndex === 0 ? 6 : 0;

  // Classify pieces
  const flags = [];
  const mines = [];
  const bombs = [];
  const others = [];

  for (const p of pieces) {
    if (isFlag(p.name)) flags.push(p);
    else if (isMine(p.name)) mines.push(p);
    else if (isBomb(p.name)) bombs.push(p);
    else others.push(p);
  }

  // Collect all positions in this half (excluding camps)
  const allPositions = [];
  for (let y = yStart; y < yStart + 6; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }

  // Mark occupied positions
  const occupied = {};
  function occupy(x, y) {
    occupied[x + "," + y] = true;
  }
  function isOccupied(x, y) {
    return !!occupied[x + "," + y];
  }
  function doShuffle(arr) {
    return rng ? shuffleSeeded(arr, rng) : shuffle(arr);
  }

  // 1. Place flag: must be in base camp
  const baseCampPositions = [];
  for (const bc of BASE_CAMPS) {
    if (bc.y >= yStart && bc.y < yStart + 6) {
      baseCampPositions.push(bc);
    }
  }
  doShuffle(baseCampPositions);
  for (let i = 0; i < flags.length; i++) {
    const pos = baseCampPositions[i];
    board[pos.y][pos.x] = flags[i];
    occupy(pos.x, pos.y);
  }

  // 2. Place mines: only in last two rows (excluding camps)
  const mineRows = [];
  for (let y = yStart + 4; y < yStart + 6; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isCamp(x, y) && !isOccupied(x, y)) mineRows.push({ x: x, y: y });
    }
  }
  doShuffle(mineRows);
  for (let i = 0; i < mines.length; i++) {
    const pos = mineRows[i];
    board[pos.y][pos.x] = mines[i];
    occupy(pos.x, pos.y);
  }

  // 3. Place bombs: not in first row (excluding camps)
  const bombPositions = [];
  for (const pos of allPositions) {
    if (pos.y === yStart) continue; // Exclude first row
    if (!isOccupied(pos.x, pos.y)) bombPositions.push(pos);
  }
  doShuffle(bombPositions);
  for (let i = 0; i < bombs.length; i++) {
    const pos = bombPositions[i];
    board[pos.y][pos.x] = bombs[i];
    occupy(pos.x, pos.y);
  }

  // 4. Place remaining pieces (excluding camps)
  const remaining = [];
  for (const pos of allPositions) {
    if (!isOccupied(pos.x, pos.y)) remaining.push(pos);
  }
  doShuffle(remaining);
  for (let i = 0; i < others.length; i++) {
    const pos = remaining[i];
    board[pos.y][pos.x] = others[i];
    occupy(pos.x, pos.y);
  }
}

function placePiecesRandom(board, pieces, rng) {
  // Collect all positions (excluding camps)
  const allPositions = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isCamp(x, y)) {
        allPositions.push({ x: x, y: y });
      }
    }
  }
  if (rng) shuffleSeeded(allPositions, rng);
  else shuffle(allPositions);

  // All pieces face down
  for (const piece of pieces) {
    piece.state = STATE_FACE_DOWN;
  }

  // Place randomly
  for (let i = 0; i < pieces.length; i++) {
    const pos = allPositions[i];
    board[pos.y][pos.x] = pieces[i];
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// Seeded PRNG for deterministic board generation in online mode
function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleSeeded(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// ============================================================
// Move Validation
// ============================================================

function getValidMoves(board, x, y, team, gameType) {
  const piece = board[y][x];
  if (!piece || piece.team !== team) return [];
  if (!isMovable(piece)) return [];
  // Face-down pieces cannot move
  if (piece.state === STATE_FACE_DOWN) return [];
  // A piece that has entered a base camp (大本营) cannot move again.
  // Flip mode skips this: pieces are randomly placed there at setup.
  if (gameType !== "flip" && isBaseCamp(x, y)) return [];

  const isEngineer = piece.name === "工兵";
  let moves;

  if (isEngineer) {
    // Engineer: BFS along railway unlimited + normal + diagonal moves
    moves = getEngineerMoves(board, x, y, team);
  } else {
    // Normal piece: one step move
    moves = getNormalMoves(board, x, y, team);
  }

  // Add diagonal moves (camp entry/exit)
  const diagMoves = getDiagonalMoves(board, x, y, team);
  for (const dm of diagMoves) {
    let dup = false;
    for (let j = 0; j < moves.length; j++) {
      if (moves[j].x === dm.x && moves[j].y === dm.y) {
        dup = true;
        break;
      }
    }
    if (!dup) moves.push(dm);
  }

  return moves;
}

function getNormalMoves(board, x, y, team) {
  const moves = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  for (const dir of dirs) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!inBounds(nx, ny)) continue;

    // Gap row crossing: only middle column(x=2) or side vertical railways(x=0,4) can cross
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // Normal piece can move one step to adjacent position
    const target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: "move" });
    } else if (target.team !== team) {
      // Any piece captures the face-up enemy flag and wins
      if (isFlag(target.name)) {
        if (target.state !== STATE_FACE_DOWN) {
          pushUniqueMove(moves, { x: nx, y: ny, type: "capture_flag" });
        }
        continue;
      }
      // Check camp protection
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      // Face-down pieces cannot be attacked
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: "capture" });
      }
    }
  }

  // Non-engineer pieces on railway slide any number of squares in a straight
  // line (no turning; only engineers may turn at railway junctions). The
  // slide stops at the first occupied square; an enemy piece standing there
  // may be captured if the combat rules allow it.
  if (isOnRailway(x, y)) {
    for (const dir of dirs) {
      let nx = x + dir.dx;
      let ny = y + dir.dy;
      if (!inBounds(nx, ny) || !areOnSameRailway(x, y, nx, ny)) continue;
      while (true) {
        const target = board[ny][nx];
        if (target === null) {
          pushUniqueMove(moves, { x: nx, y: ny, type: "move" });
          const tx = nx + dir.dx;
          const ty = ny + dir.dy;
          if (!inBounds(tx, ty) || !areOnSameRailway(nx, ny, tx, ty)) break;
          nx = tx;
          ny = ty;
        } else {
          if (target.team !== team && target.state !== STATE_FACE_DOWN) {
            if (isFlag(target.name)) {
              // Any piece captures the face-up enemy flag and wins
              pushUniqueMove(moves, { x: nx, y: ny, type: "capture_flag" });
            } else if (!isCamp(nx, ny) && !isBaseCamp(nx, ny) && canCapture(board[y][x], target)) {
              pushUniqueMove(moves, { x: nx, y: ny, type: "capture" });
            }
          }
          break;
        }
      }
    }
  }

  return moves;
}

function pushUniqueMove(moves, move) {
  for (const m of moves) {
    if (m.x === move.x && m.y === move.y) return;
  }
  moves.push(move);
}

function getEngineerMoves(board, x, y, team) {
  const moves = [];
  const visited = {};
  visited[x + "," + y] = true;
  const queue = [{ x: x, y: y }];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  // One orthogonal step (to adjacent non-railway cell, like camp)
  for (const dir of dirs) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (!inBounds(nx, ny)) continue;

    // Gap row crossing check
    if ((y === 5 && ny === 6) || (y === 6 && ny === 5)) {
      if (x !== 2 && !isOnVRailway(x, y)) continue;
    }

    // Skip railway cells, leave for BFS
    if (isOnRailway(nx, ny)) continue;

    const key = nx + "," + ny;
    if (visited[key]) continue;
    const target = board[ny][nx];
    if (target === null) {
      moves.push({ x: nx, y: ny, type: "move" });
    } else if (target.team !== team) {
      if (isCamp(nx, ny)) continue;
      if (isBaseCamp(nx, ny)) continue;
      if (target.state === STATE_FACE_DOWN) continue;
      if (canCapture(board[y][x], target)) {
        moves.push({ x: nx, y: ny, type: "capture" });
      }
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift();
    for (const dir of dirs) {
      const nx = cur.x + dir.dx;
      const ny = cur.y + dir.dy;
      const key = nx + "," + ny;
      if (visited[key]) continue;
      if (!inBounds(nx, ny)) continue;

      // Check railway connection
      if (!areOnSameRailway(cur.x, cur.y, nx, ny)) continue;

      visited[key] = true;
      const target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: "move" });
        queue.push({ x: nx, y: ny });
      } else if (target.team !== team) {
        // Face-down pieces cannot be attacked
        if (target.state === STATE_FACE_DOWN) continue;
        // Camp/base camp protection: but flag can be captured by engineer
        if (isFlag(target.name)) {
          moves.push({ x: nx, y: ny, type: "capture_flag" });
        } else if (!isCamp(nx, ny) && !isBaseCamp(nx, ny)) {
          if (canCapture(board[y][x], target)) {
            moves.push({ x: nx, y: ny, type: "capture" });
          }
        }
        // Blocked, do not continue (except flag, already handled)
        if (!isFlag(target.name)) {
          // Non-flag piece blocks, stop exploration
        }
      }
    }
  }

  return moves;
}

function getDiagonalMoves(board, x, y, team) {
  const moves = [];
  const piece = board[y][x];
  if (!piece) return moves;

  const inCamp = isCamp(x, y);

  const diagDirs = [
    { dx: -1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: -1 },
    { dx: 1, dy: 1 },
  ];

  for (let d = 0; d < diagDirs.length; d++) {
    const nx = x + diagDirs[d].dx;
    const ny = y + diagDirs[d].dy;
    if (!inBounds(nx, ny)) continue;

    if (inCamp) {
      // In camp: move diagonally, can pass through empty non-camp cells to reach another camp
      let cx = x + diagDirs[d].dx;
      let cy = y + diagDirs[d].dy;
      while (inBounds(cx, cy)) {
        const target = board[cy][cx];
        if (isCamp(cx, cy)) {
          // Reached another camp
          if (target === null) {
            moves.push({ x: cx, y: cy, type: "move" });
          }
          break;
        }
        if (isBaseCamp(cx, cy)) break;
        if (target === null) {
          // Empty non-camp cell, can pass through and continue
          moves.push({ x: cx, y: cy, type: "move" });
        } else if (target.team !== team) {
          // Encountered enemy piece, can capture but cannot continue
          if (target.state === STATE_FACE_DOWN) break;
          if (isFlag(target.name)) {
            moves.push({ x: cx, y: cy, type: "capture_flag" });
          } else if (canCapture(piece, target)) {
            moves.push({ x: cx, y: cy, type: "capture" });
          }
          break;
        } else {
          // Encountered own piece, cannot pass through
          break;
        }
        cx += diagDirs[d].dx;
        cy += diagDirs[d].dy;
      }
    } else if (isCamp(nx, ny) || isBaseCamp(nx, ny)) {
      // Not in camp: can only enter camp or base camp
      const target = board[ny][nx];
      if (target === null) {
        moves.push({ x: nx, y: ny, type: "move" });
      } else if (target.team !== team && target.state !== STATE_FACE_DOWN && isFlag(target.name)) {
        // Any piece captures the face-up enemy flag and wins
        moves.push({ x: nx, y: ny, type: "capture_flag" });
      }
    }
  }

  return moves;
}

// ============================================================
// Piece Operations
// ============================================================

function moveCard(state, from, to) {
  if (!inBounds(from.x, from.y) || !inBounds(to.x, to.y)) return null;
  const piece = state.board[from.y][from.x];
  if (!piece || piece.team !== state.currentTeam) return null;

  const validMoves = getValidMoves(state.board, from.x, from.y, state.currentTeam, state.gameType);
  let valid = null;
  for (const vm of validMoves) {
    if (vm.x === to.x && vm.y === to.y) {
      valid = vm;
      break;
    }
  }
  if (!valid) return null;

  const target = state.board[to.y][to.x];

  if (valid.type === "capture_flag") {
    // Engineer captures flag for victory
    if (typeof SoundManager !== "undefined") SoundManager.play("take");
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
    state.gameOver = true;
    state.winner = state.currentTeam;
    state.turnCount++;
    return state;
  }

  if (valid.type === "capture") {
    if (typeof SoundManager !== "undefined") SoundManager.play("take");
    const result = resolveCombat(piece, target);
    if (result === "attacker_wins") {
      addCaptured(state, target);
      // Hidden mode: commander captured, reveal opponent flag
      if (state.gameType === "hidden" && target.name === "司令") {
        revealFlag(state, target.team);
      }
      state.board[to.y][to.x] = piece;
      state.board[from.y][from.x] = null;
    } else if (result === "mutual_destruction") {
      addCaptured(state, piece);
      addCaptured(state, target);
      // Hidden mode: commanders mutual destruction, reveal both flags
      if (state.gameType === "hidden") {
        if (piece.name === "司令") revealFlag(state, piece.team);
        if (target.name === "司令") revealFlag(state, target.team);
      }
      state.board[from.y][from.x] = null;
      state.board[to.y][to.x] = null;
    } else {
      return null;
    }
  } else {
    // Normal move
    if (typeof SoundManager !== "undefined") SoundManager.play("place");
    state.board[to.y][to.x] = piece;
    state.board[from.y][from.x] = null;
  }

  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function flipPiece(state, x, y) {
  if (state.gameType !== "flip") return null;
  if (!inBounds(x, y)) return null;
  const piece = state.board[y][x];
  if (!piece || piece.state !== STATE_FACE_DOWN) return null;

  // Play flip sound (SoundManager available in browser context)
  if (typeof SoundManager !== "undefined") SoundManager.play("flip");
  piece.state = STATE_FACE_UP;
  state.currentTeam = state.currentTeam === RED ? BLUE : RED;
  state.turnCount++;
  return state;
}

function revealFlag(state, team) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = state.board[y][x];
      if (p && p.team === team && isFlag(p.name)) {
        p.state = STATE_FACE_UP;
      }
    }
  }
}

function addCaptured(state, piece) {
  if (piece.team === RED) {
    state.capturedRed.push(piece.name);
  } else {
    state.capturedBlue.push(piece.name);
  }
}

// ============================================================
// Game Over Detection
// ============================================================

function hasAnyLegalAction(board, team, gameType) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const piece = board[y][x];
      if (!piece || piece.team !== team) continue;

      // Flip mode: face-down pieces can be flipped
      if (gameType === "flip" && piece.state === STATE_FACE_DOWN) return true;

      // Face-up movable pieces
      if (piece.state === STATE_FACE_UP && isMovable(piece)) {
        if (getValidMoves(board, x, y, team, gameType).length > 0) return true;
      }
    }
  }
  return false;
}

function checkGameOver(state) {
  if (state.gameOver) return { ended: true, winner: state.winner };

  // Check if there are movable pieces
  let hasRed = false,
    hasBlue = false;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = state.board[y][x];
      if (p && p.team === RED && isMovable(p)) hasRed = true;
      if (p && p.team === BLUE && isMovable(p)) hasBlue = true;
    }
  }

  if (!hasRed && !hasBlue) return { ended: true, winner: null }; // Draw
  if (!hasRed) return { ended: true, winner: BLUE };
  if (!hasBlue) return { ended: true, winner: RED };

  // Check if current side has legal actions
  if (state.currentTeam && !hasAnyLegalAction(state.board, state.currentTeam, state.gameType)) {
    const opponent = state.currentTeam === RED ? BLUE : RED;
    return { ended: true, winner: opponent };
  }

  return { ended: false, winner: null };
}

// ============================================================
// AI Decision
// ============================================================

// ============================================================
// Module Exports
// ============================================================
const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const { aiDecide } = createGameAI({
  NORMAL_PIECE_NAMES,
  BOMB_NAME,
  MINE_NAME,
  FLAG_NAME,
  RANK_MAP,
  PIECE_COUNTS,
  COLS,
  ROWS,
  RED,
  BLUE,
  STATE_FACE_UP,
  STATE_FACE_DOWN,
  CAMPS,
  BASE_CAMPS,
  H_RAILWAYS,
  V_RAILWAY_LEFT_RIGHT,
  V_RAILWAY_MIDDLE,
  isNormalPiece,
  isBomb,
  isMine,
  isFlag,
  isMovable,
  getRank,
  inBounds,
  isCamp,
  isBaseCamp,
  getBoardRow,
  hasDiagonalEligibility,
  isOnHRailway,
  isOnVRailway,
  isOnRailway,
  areOnSameRailway,
  getImagePath,
  canCapture,
  resolveCombat,
  createGameState,
  placePiecesForTeam,
  placePiecesRandom,
  shuffle,
  createSeededRandom,
  shuffleSeeded,
  getValidMoves,
  getNormalMoves,
  getEngineerMoves,
  getDiagonalMoves,
  moveCard,
  flipPiece,
  revealFlag,
  addCaptured,
  hasAnyLegalAction,
  checkGameOver,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    NORMAL_PIECE_NAMES,
    BOMB_NAME,
    MINE_NAME,
    FLAG_NAME,
    RANK_MAP,
    PIECE_COUNTS,
    COLS,
    ROWS,
    RED,
    BLUE,
    STATE_FACE_UP,
    STATE_FACE_DOWN,
    CAMPS,
    BASE_CAMPS,
    H_RAILWAYS,
    isNormalPiece,
    isBomb,
    isMine,
    isFlag,
    isMovable,
    getRank,
    inBounds,
    isCamp,
    isBaseCamp,
    getBoardRow,
    hasDiagonalEligibility,
    isOnHRailway,
    isOnVRailway,
    isOnRailway,
    areOnSameRailway,
    judgeRPS,
    canCapture,
    resolveCombat,
    createGameState,
    placePiecesForTeam,
    placePiecesRandom,
    shuffle,
    getValidMoves,
    getNormalMoves,
    getEngineerMoves,
    getDiagonalMoves,
    flipPiece,
    revealFlag,
    moveCard,
    addCaptured,
    hasAnyLegalAction,
    checkGameOver,
    aiDecide,
  };
}

// ============================================================
// Browser UI (SVG + DOM rendering, junqi-master style)
// ============================================================
if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");
  let gameState = null;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // RED or BLUE
  let pendingBoardSeed = null; // For guest: seed from host for deterministic board
  let onlineTeamsAssigned = false; // Track if teams have been assigned in flip mode

  // Board SVG view coordinate system
  const SVG_W = 480;
  const SVG_H = 780;
  const PAD = 36;
  const COL_SPACE = (SVG_W - 2 * PAD) / (COLS - 1); // = 102
  const GAP = 20;
  // 13 visual rows (0-12), gap between row 5 and row 7
  const ROW_SPACE = (SVG_H - 2 * PAD - GAP) / 12; // ≈ 59.7

  // Array coordinates -> SVG coordinates
  function svgX(x) {
    return PAD + x * COL_SPACE;
  }
  function svgY(y) {
    const vr = getBoardRow(y);
    if (vr <= 5) return PAD + vr * ROW_SPACE;
    return PAD + GAP + vr * ROW_SPACE;
  }

  // DOM elements
  const $modeSelection = document.getElementById("mode-selection");
  const $gameArea = document.getElementById("game-area");
  const $boardContainer = document.getElementById("board-container");
  const $currentTeam = document.getElementById("current-team");
  const $turnCount = document.getElementById("turn-count");
  const $redRemaining = document.getElementById("red-remaining");
  const $blueRemaining = document.getElementById("blue-remaining");
  const $capturedRed = document.getElementById("captured-red");
  const $capturedBlue = document.getElementById("captured-blue");
  const $message = document.getElementById("message");
  const $gameOver = document.getElementById("game-over");
  const $winnerText = document.getElementById("winner-text");
  const $btnRestart = document.getElementById("btn-restart");

  let boardScale = 1;

  // RPS state
  let rpsChoices = { player1: null, player2: null, human: null };
  let pendingMode = null; // Game mode pending RPS completion

  // ============================================================
  // SVG Board Construction (execute once)
  // ============================================================
  function buildBoardSVG() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + SVG_W + " " + SVG_H);
    svg.setAttribute("width", "100%");
    svg.style.display = "block";

    // Railway stripe pattern
    const defs = document.createElementNS(ns, "defs");
    const pat = document.createElementNS(ns, "pattern");
    pat.setAttribute("id", "rail-stripe");
    pat.setAttribute("patternUnits", "userSpaceOnUse");
    pat.setAttribute("width", "8");
    pat.setAttribute("height", "8");
    pat.setAttribute("patternTransform", "rotate(45)");
    const r1 = document.createElementNS(ns, "rect");
    r1.setAttribute("width", "4");
    r1.setAttribute("height", "8");
    r1.setAttribute("fill", "#EAC611");
    const r2 = document.createElementNS(ns, "rect");
    r2.setAttribute("x", "4");
    r2.setAttribute("width", "4");
    r2.setAttribute("height", "8");
    r2.setAttribute("fill", "#111");
    pat.appendChild(r1);
    pat.appendChild(r2);
    defs.appendChild(pat);
    svg.appendChild(defs);

    const gHighway = document.createElementNS(ns, "g");
    const gRailway = document.createElementNS(ns, "g");
    const gDiag = document.createElementNS(ns, "g");
    const gStation = document.createElementNS(ns, "g");

    // ---- Highways (thin black lines) ----
    // Horizontal highways
    const hHighwayRows = [0, 2, 3, 4, 7, 8, 9, 11];
    for (const y of hHighwayRows) {
      addSVGLine(gHighway, ns, { x1: svgX(0), y1: svgY(y), x2: svgX(4), y2: svgY(y) }, "#000", 1);
    }
    // Vertical highways
    for (let x = 0; x < COLS; x++) {
      addSVGLine(gHighway, ns, { x1: svgX(x), y1: svgY(0), x2: svgX(x), y2: svgY(5) }, "#000", 1);
      addSVGLine(gHighway, ns, { x1: svgX(x), y1: svgY(6), x2: svgX(x), y2: svgY(11) }, "#000", 1);
    }

    // ---- Railways (gold/black striped thick lines) ----
    // Horizontal railways
    const hRailRows = [1, 5, 6, 10];
    for (const y of hRailRows) {
      addSVGLine(
        gRailway,
        ns,
        { x1: svgX(0), y1: svgY(y), x2: svgX(4), y2: svgY(y) },
        "url(#rail-stripe)",
        4
      );
    }
    // Vertical railways
    addSVGLine(
      gRailway,
      ns,
      { x1: svgX(0), y1: svgY(1), x2: svgX(0), y2: svgY(10) },
      "url(#rail-stripe)",
      4
    );
    addSVGLine(
      gRailway,
      ns,
      { x1: svgX(4), y1: svgY(1), x2: svgX(4), y2: svgY(10) },
      "url(#rail-stripe)",
      4
    );
    addSVGLine(
      gRailway,
      ns,
      { x1: svgX(2), y1: svgY(5), x2: svgX(2), y2: svgY(6) },
      "url(#rail-stripe)",
      4
    );

    // ---- Diagonals (black dashed lines) ----
    const drawn = {};
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!hasDiagonalEligibility(x, y) && !isCamp(x, y)) continue;
        const diagDirs = [
          { dx: -1, dy: -1 },
          { dx: -1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: 1, dy: 1 },
        ];
        for (let d = 0; d < diagDirs.length; d++) {
          const nx = x + diagDirs[d].dx;
          const ny = y + diagDirs[d].dy;
          if (!inBounds(nx, ny)) continue;
          if (!hasDiagonalEligibility(nx, ny) && !isCamp(nx, ny) && !isBaseCamp(nx, ny)) continue;
          const key =
            Math.min(x, nx) + "," + Math.min(y, ny) + "-" + Math.max(x, nx) + "," + Math.max(y, ny);
          if (drawn[key]) continue;
          drawn[key] = true;
          const line = document.createElementNS(ns, "line");
          line.setAttribute("x1", svgX(x));
          line.setAttribute("y1", svgY(y));
          line.setAttribute("x2", svgX(nx));
          line.setAttribute("y2", svgY(ny));
          line.setAttribute("stroke", "#000");
          line.setAttribute("stroke-width", "1");
          line.setAttribute("stroke-dasharray", "4,3");
          gDiag.appendChild(line);
        }
      }
    }

    // ---- Station markers ----
    const STATION_W = 60;
    const STATION_H = 40;
    const CAMP_RX = 38;
    const CAMP_RY = 28;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cx = svgX(x),
          cy = svgY(y);
        let label = "兵 站";
        if (isCamp(x, y)) {
          // Camp: ellipse
          label = "行 营";
          const ellipse = document.createElementNS(ns, "ellipse");
          ellipse.setAttribute("cx", cx);
          ellipse.setAttribute("cy", cy);
          ellipse.setAttribute("rx", CAMP_RX);
          ellipse.setAttribute("ry", CAMP_RY);
          ellipse.setAttribute("fill", "#fff");
          ellipse.setAttribute("stroke", "#000");
          ellipse.setAttribute("stroke-width", "1");
          ellipse.classList.add("station-xingying");
          gStation.appendChild(ellipse);
        } else {
          // Station / Base camp: rectangle
          if (isBaseCamp(x, y)) label = "大本营";
          const rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", cx - STATION_W / 2);
          rect.setAttribute("y", cy - STATION_H / 2);
          rect.setAttribute("width", STATION_W);
          rect.setAttribute("height", STATION_H);
          rect.setAttribute("fill", "#fff");
          rect.setAttribute("stroke", "#000");
          rect.setAttribute("stroke-width", "1");
          rect.setAttribute("rx", "3");
          rect.classList.add(isBaseCamp(x, y) ? "station-dabenying" : "station");
          gStation.appendChild(rect);
        }
        // Station text
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", cx);
        text.setAttribute("y", cy);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#000000");
        text.setAttribute("font-weight", "700");
        text.textContent = label;
        gStation.appendChild(text);
      }
    }

    svg.appendChild(gHighway);
    svg.appendChild(gRailway);
    svg.appendChild(gDiag);
    svg.appendChild(gStation);

    // Clear container and add SVG + pieces layer
    $boardContainer.innerHTML = "";
    $boardContainer.appendChild(svg);

    const piecesLayer = document.createElement("div");
    piecesLayer.id = "pieces-layer";
    piecesLayer.style.position = "absolute";
    piecesLayer.style.top = "0";
    piecesLayer.style.left = "0";
    piecesLayer.style.width = "100%";
    piecesLayer.style.height = "100%";
    $boardContainer.appendChild(piecesLayer);

    // Calculate scale ratio
    updateScale();
  }

  function addSVGLine(parent, ns, coords, stroke, strokeWidth) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", coords.x1);
    line.setAttribute("y1", coords.y1);
    line.setAttribute("x2", coords.x2);
    line.setAttribute("y2", coords.y2);
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", strokeWidth);
    parent.appendChild(line);
  }

  function updateScale() {
    const svg = $boardContainer.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    boardScale = rect.width / SVG_W;
  }

  // ============================================================
  // Piece Rendering (DOM div elements)
  // ============================================================
  function renderPieces() {
    const layer = document.getElementById("pieces-layer");
    if (!layer || !gameState) return;
    layer.innerHTML = "";
    updateScale();

    const PIECE_W = 56;
    const PIECE_H = 36;
    const board = gameState.board;
    const gameType = gameState.gameType;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const piece = board[y][x];
        if (!piece) continue;

        const div = document.createElement("div");
        div.className = "chess-piece";

        // Determine whether to show piece content
        let showContent = piece.state === STATE_FACE_UP;
        if (gameType === "hidden" && piece.team !== gameState.playerTeam) {
          showContent = false;
        }

        if (showContent) {
          if (piece.team === RED) div.classList.add("chess-red");
          else div.classList.add("chess-blue");
          div.textContent = piece.name;
        } else {
          div.classList.add("chess-face-down");
        }

        div.style.width = PIECE_W + "px";
        div.style.height = PIECE_H + "px";
        div.style.fontSize = Math.round(PIECE_W / 3) + "px";

        // Positioning: SVG coordinates -> pixel coordinates
        const px = svgX(x) * boardScale - PIECE_W / 2;
        const py = svgY(y) * boardScale - PIECE_H / 2;
        div.style.left = px + "px";
        div.style.top = py + "px";

        div.dataset.x = x;
        div.dataset.y = y;

        layer.appendChild(div);
      }
    }

    // Highlight selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;
      const selDiv = layer.querySelector('[data-x="' + sel.x + '"][data-y="' + sel.y + '"]');
      if (selDiv) selDiv.classList.add("chess-selected");
    }
  }

  function highlightMoves(moves) {
    const layer = document.getElementById("pieces-layer");
    if (!layer) return;

    // Remove old highlights
    const old = layer.querySelectorAll(".move-highlight");
    for (const el of old) el.remove();

    for (const m of moves) {
      const div = document.createElement("div");
      div.className = "move-highlight";
      if (m.type === "capture" || m.type === "capture_flag") {
        div.classList.add("highlight-capture");
      } else {
        div.classList.add("highlight-move");
      }
      const px = svgX(m.x) * boardScale - 8;
      const py = svgY(m.y) * boardScale - 8;
      div.style.left = px + "px";
      div.style.top = py + "px";
      div.dataset.x = m.x;
      div.dataset.y = m.y;
      layer.appendChild(div);
    }
  }

  function clearHighlights() {
    const layer = document.getElementById("pieces-layer");
    if (!layer) return;
    const old = layer.querySelectorAll(".move-highlight");
    for (const el of old) el.remove();
    // Remove selection state
    const selDiv = layer.querySelector(".chess-selected");
    if (selDiv) selDiv.classList.remove("chess-selected");
  }

  function drawBoard() {
    renderPieces();
  }

  // ============================================================
  // Event Handling (click on pieces layer)
  // ============================================================
  function onBoardClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.oppType === "pve" && gameState.currentTeam === gameState.aiTeam) return;
    if (gameState.oppType === "online" && localTeam && gameState.currentTeam !== localTeam) return;

    const target = e.target;
    const x = Number.parseInt(target.dataset.x);
    const y = Number.parseInt(target.dataset.y);
    if (Number.isNaN(x) || Number.isNaN(y)) return;

    const piece = gameState.board[y][x];
    const team = gameState.currentTeam;
    const gameType = gameState.gameType;

    // Flip mode: click face-down piece to flip
    if (gameType === "flip" && piece && piece.state === STATE_FACE_DOWN) {
      const result = flipPiece(gameState, x, y);
      if (result) {
        sendNetworkAction({ type: "flip", x: x, y: y });
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }
    }

    // Click highlight target (move/capture)
    if (target.classList.contains("move-highlight")) {
      if (gameState.selectedCell) {
        const sel = gameState.selectedCell;
        const result = moveCard(gameState, sel, { x: x, y: y });
        if (result) {
          sendNetworkAction({ type: "move", fx: sel.x, fy: sel.y, tx: x, ty: y });
          gameState.selectedCell = null;
          clearHighlights();
          drawBoard();
          afterAction();
          return;
        }
      }
    }

    // Already has selected piece
    if (gameState.selectedCell) {
      const sel = gameState.selectedCell;

      // Click same cell: deselect
      if (sel.x === x && sel.y === y) {
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        return;
      }

      // Try move/capture
      const result = moveCard(gameState, sel, { x: x, y: y });
      if (result) {
        sendNetworkAction({ type: "move", fx: sel.x, fy: sel.y, tx: x, ty: y });
        gameState.selectedCell = null;
        clearHighlights();
        drawBoard();
        afterAction();
        return;
      }

      // Select another own piece
      if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
        gameState.selectedCell = { x: x, y: y };
        clearHighlights();
        drawBoard();
        const moves = getValidMoves(gameState.board, x, y, team, gameType);
        highlightMoves(moves);
        return;
      }

      showMessage("无法移动到该位置", "error");
      return;
    }

    // No selection: select own piece (must be face up)
    if (piece && piece.team === team && piece.state === STATE_FACE_UP) {
      gameState.selectedCell = { x: x, y: y };
      clearHighlights();
      drawBoard();
      const moves = getValidMoves(gameState.board, x, y, team, gameType);
      highlightMoves(moves);
      return;
    }

    if (piece && piece.team !== team) {
      showMessage("这不是你的棋子", "error");
    }
  }

  // ============================================================
  // Status Update
  // ============================================================
  function updateStatus() {
    if (!gameState) return;
    const s = gameState;

    if (s.currentTeam) {
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
      const label = getCurrentPlayerLabel({
        mode: s.oppType,
        currentSide: s.currentTeam,
        playerSide: s.oppType === "online" ? localTeam : s.playerTeam,
        sidesOrder: s.firstPlayer
          ? [s.firstPlayer, s.firstPlayer === RED ? BLUE : RED]
          : [RED, BLUE],
      });
      $currentTeam.textContent = label.text;
      $currentTeam.className =
        "team-indicator " + (s.currentTeam === RED ? "red-text" : "blue-text");
    } else {
      $currentTeam.textContent = "—";
      $currentTeam.className = "team-indicator";
    }

    $turnCount.textContent = s.turnCount;

    let redCount = 0,
      blueCount = 0;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const p = s.board[y][x];
        if (p) {
          if (p.team === RED) redCount++;
          else if (p.team === BLUE) blueCount++;
        }
      }
    }
    $redRemaining.textContent = redCount;
    $blueRemaining.textContent = blueCount;

    const $redLabel = document.getElementById("red-label");
    const $blueLabel = document.getElementById("blue-label");
    if (s.oppType === "pve" && s.playerTeam) {
      $redLabel.textContent = s.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      $blueLabel.textContent = s.playerTeam === BLUE ? "玩家（蓝方）：" : "电脑（蓝方）：";
    } else if (s.oppType === "online" && localTeam) {
      $redLabel.textContent = localTeam === RED ? "你（红方）：" : "对方（红方）：";
      $blueLabel.textContent = localTeam === BLUE ? "你（蓝方）：" : "对方（蓝方）：";
    } else {
      $redLabel.textContent = "红方：";
      $blueLabel.textContent = "蓝方：";
    }

    renderCaptured($capturedRed, s.capturedRed, RED);
    renderCaptured($capturedBlue, s.capturedBlue, BLUE);
  }

  function renderCaptured(container, list, team) {
    container.innerHTML = "";
    for (const item of list) {
      const span = document.createElement("span");
      span.className = "captured-piece " + (team === RED ? "red-text" : "blue-text");
      span.textContent = item;
      container.appendChild(span);
    }
  }

  function showMessage(text, type) {
    $message.textContent = text;
    $message.className = type || "";
  }

  // ============================================================
  // Game Flow
  // ============================================================
  function showModeSelection() {
    $modeSelection.style.display = "flex";
    $gameArea.style.display = "none";
    $gameOver.style.display = "none";
  }

  function showGameArea() {
    $modeSelection.style.display = "none";
    $gameArea.style.display = "flex";
    document.getElementById("rule-pve").style.display =
      gameState.oppType === "pve" ? "block" : "none";
    $gameOver.style.display = "none";
  }

  function showGameOverScreen(winner) {
    if (winner) {
      // Play victory/lose sound
      const isPlayerWin = gameState.oppType === "pve" ? winner === gameState.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
      const label = getCurrentPlayerLabel({
        mode: gameState.oppType,
        currentSide: winner,
        playerSide: gameState.oppType === "online" ? localTeam : gameState.playerTeam,
        sidesOrder: gameState.firstPlayer
          ? [gameState.firstPlayer, gameState.firstPlayer === RED ? BLUE : RED]
          : [RED, BLUE],
      });
      $winnerText.textContent = label.text + " 获胜！";
    } else {
      SoundManager.play("draw");
      $winnerText.textContent = "平局！";
    }
    $gameOver.style.display = "flex";
  }

  function startGame(mode, firstPlayer) {
    document.getElementById("rps-section").style.display = "none";
    gameState = createGameState(mode);
    buildBoardSVG();

    // Switch rules panel
    document.querySelectorAll(".rules-content").forEach((el) => {
      el.style.display = "none";
    });
    const rulesId = "rules-" + mode.gameType;
    const rulesEl = document.getElementById(rulesId);
    if (rulesEl) rulesEl.style.display = "block";

    // Bind click event
    const layer = document.getElementById("pieces-layer");
    if (layer) layer.addEventListener("click", onBoardClick);

    const winner = firstPlayer || RED;

    if (mode.oppType === "pvp") {
      gameState.currentTeam = winner;
      gameState.firstPlayer = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      const teamName = winner === RED ? "红方" : "蓝方";
      const firstMsg =
        mode.gameType === "flip"
          ? teamName + "先行，请翻开棋子"
          : teamName + "先行，请选择棋子移动";
      showMessage(firstMsg, "");
    } else {
      gameState.playerTeam = winner === RED ? RED : BLUE;
      gameState.aiTeam = winner === RED ? BLUE : RED;
      gameState.currentTeam = winner;
      showGameArea();
      drawBoard();
      updateStatus();
      if (gameState.currentTeam === gameState.aiTeam) {
        triggerAI();
      } else {
        showMessage("你的回合，请选择棋子移动", "");
      }
    }
  }

  function sendNetworkAction(action) {
    if (gameState.oppType !== "online" || !networkProtocol) return;
    if (action.type === "flip") {
      networkProtocol.sendAction({ a: "flip", x: action.x, y: action.y });
    } else if (action.type === "move") {
      networkProtocol.sendAction({
        a: "move",
        fx: action.fx,
        fy: action.fy,
        tx: action.tx,
        ty: action.ty,
      });
    }
  }

  function afterAction() {
    updateStatus();
    const result = checkGameOver(gameState);
    if (result.ended) {
      gameState.gameOver = true;
      gameState.winner = result.winner;
      drawBoard();
      setTimeout(() => {
        showGameOverScreen(result.winner);
      }, 500);
      return;
    }

    // Online flip mode: show team assignment message when teams are first determined
    if (
      gameState.oppType === "online" &&
      gameState.gameType === "flip" &&
      !onlineTeamsAssigned &&
      localTeam
    ) {
      onlineTeamsAssigned = true;
      const teamName = localTeam === RED ? "红方" : "蓝方";
      showMessage("你控制" + teamName + "！", "info");
      return;
    }

    if (gameState.oppType === "pve" && gameState.currentTeam === gameState.aiTeam) {
      triggerAI();
    } else {
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) in turn message
      const turnLabel = getCurrentPlayerLabel({
        mode: gameState.oppType,
        currentSide: gameState.currentTeam,
        playerSide: gameState.oppType === "online" ? localTeam : gameState.playerTeam,
        sidesOrder: gameState.firstPlayer
          ? [gameState.firstPlayer, gameState.firstPlayer === RED ? BLUE : RED]
          : [RED, BLUE],
      });
      showMessage(turnLabel.text + "的回合", "");
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    showMessage("电脑思考中...", "info");
    const delay = 300 + Math.random() * 700;
    setTimeout(() => {
      const decision = aiDecide(gameState, gameState.aiTeam);
      if (!decision) {
        gameState.aiThinking = false;
        afterAction();
        return;
      }
      if (decision.type === "flip") {
        executeAIFlip(decision);
      } else {
        executeAIAction(decision);
      }
    }, delay);
  }

  function executeAIAction(decision) {
    // Highlight AI action start position
    const layer = document.getElementById("pieces-layer");
    if (layer) {
      const fromDiv = layer.querySelector(
        '[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]'
      );
      if (fromDiv && fromDiv.classList.contains("chess-piece")) {
        fromDiv.classList.add("chess-ai-highlight");
      }
    }

    setTimeout(() => {
      // Play sound based on whether capturing a piece
      const targetPiece = gameState.board[decision.to.y][decision.to.x];
      if (targetPiece && targetPiece !== "empty") {
        SoundManager.play("take");
      } else {
        SoundManager.play("slide");
      }
      moveCard(gameState, decision.from, decision.to);
      clearHighlights();
      drawBoard();

      // Highlight target position
      if (layer) {
        const toDiv = layer.querySelector(
          '[data-x="' + decision.to.x + '"][data-y="' + decision.to.y + '"]'
        );
        if (toDiv && toDiv.classList.contains("chess-piece")) {
          toDiv.classList.add("chess-ai-highlight");
        }
      }

      setTimeout(() => {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  function executeAIFlip(decision) {
    const layer = document.getElementById("pieces-layer");
    if (layer) {
      const fromDiv = layer.querySelector(
        '[data-x="' + decision.from.x + '"][data-y="' + decision.from.y + '"]'
      );
      if (fromDiv && fromDiv.classList.contains("chess-piece")) {
        fromDiv.classList.add("chess-ai-highlight");
      }
    }

    setTimeout(() => {
      SoundManager.play("flip");
      flipPiece(gameState, decision.from.x, decision.from.y);
      clearHighlights();
      drawBoard();

      setTimeout(() => {
        clearHighlights();
        drawBoard();
        gameState.aiThinking = false;
        afterAction();
      }, 400);
    }, 300);
  }

  // ============================================================
  // Rock-Paper-Scissors
  // ============================================================
  function handleRPSChoice(player, choice, ev) {
    SoundManager.play("click");
    if (player === "human") {
      rpsChoices.human = choice;
      document.querySelectorAll("#rps-player-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const choices = ["rock", "scissors", "paper"];
      const aiChoice = choices[Math.floor(Math.random() * 3)];
      rpsChoices.player2 = aiChoice;

      const resultEl = document.getElementById("rps-result");
      const humanWins = judgeRPS(choice, aiChoice);

      if (humanWins === 1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手。";
        setTimeout(() => {
          startGame(pendingMode, RED);
        }, 1500);
      } else if (humanWins === -1) {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手。";
        setTimeout(() => {
          startGame(pendingMode, BLUE);
        }, 1500);
      } else {
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，平局！重新选择。";
        rpsChoices.human = null;
        rpsChoices.player2 = null;
      }
    } else {
      rpsChoices["player" + player] = choice;
      document.querySelectorAll("#rps-p" + player + "-buttons .btn-rps").forEach((btn) => {
        btn.classList.remove("selected");
      });
      ev.target.classList.add("selected");

      const statusEl = document.getElementById("rps-p" + player + "-status");
      statusEl.textContent = "已选择：" + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        const resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          SoundManager.play("victory");
          resultEl.textContent = "红方赢了！红方先手。";
          setTimeout(() => {
            startGame(pendingMode, RED);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent = "蓝方赢了！蓝方先手。";
          setTimeout(() => {
            startGame(pendingMode, BLUE);
          }, 1500);
        } else {
          SoundManager.play("draw");
          resultEl.textContent = "平局！重新选择。";
          rpsChoices.player1 = null;
          rpsChoices.player2 = null;
          document.getElementById("rps-p1-status").textContent = "请选择";
          document.getElementById("rps-p2-status").textContent = "请选择";
          document.querySelectorAll(".btn-rps").forEach((btn) => {
            btn.classList.remove("selected");
          });
        }
      }
    }
  }

  function showRPS(oppType) {
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "flex";
    document.getElementById("rps-pvp").style.display = oppType === "pvp" ? "block" : "none";
    document.getElementById("rps-pve").style.display = oppType === "pve" ? "block" : "none";
    document.getElementById("rps-result").textContent = "";
    rpsChoices = { player1: null, player2: null, human: null };
  }

  // ============================================================
  // Online Mode Functions
  // ============================================================

  function cleanupNetwork() {
    if (networkProtocol) {
      networkProtocol.destroy();
      networkProtocol = null;
    }
    if (networkConnection) {
      networkConnection.close();
      networkConnection = null;
    }
    localPlayerRole = null;
    localTeam = null;
    pendingBoardSeed = null;
    onlineTeamsAssigned = false;
  }

  function setupNetworkHandlers() {
    networkProtocol.setCallbacks({
      onAction: (actionData) => {
        applyRemoteAction(actionData);
      },
      onRPSChoice: (choice) => {
        handleOnlineRPSReceived(choice);
      },
      onRPSResult: (result) => {
        handleOnlineRPSResult(result);
      },
      onRestart: () => {
        cleanupNetwork();
        document.getElementById("game-over").style.display = "none";
        document.getElementById("game-area").style.display = "none";
        document.getElementById("rps-online").style.display = "none";
        $modeSelection.style.display = "flex";
        gameState = null;
      },
      onDisconnect: () => {
        handleDisconnect();
      },
      onError: (err) => {
        console.error("Network error:", err);
      },
    });
  }

  function startOnlineRPS() {
    $modeSelection.style.display = "none";
    document.getElementById("rps-online").style.display = "flex";
    rpsChoices = {
      player1: null,
      player2: null,
      human: null,
      online: null,
      remote: null,
    };
    document.getElementById("rps-online-status").textContent = "请选择";
    document.getElementById("rps-online-result").textContent = "";
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
  }

  function handleOnlineRPSChoice(choice, ev) {
    rpsChoices.online = choice;
    document
      .querySelectorAll("#rps-online-buttons .btn-rps")
      .forEach((btn) => btn.classList.remove("selected"));
    ev.target.classList.add("selected");
    document.getElementById("rps-online-status").textContent =
      "已选择：" + getRPSName(choice) + "，等待对方...";
    networkProtocol.sendRPSChoice(choice);
  }

  function handleOnlineRPSReceived(remoteChoice) {
    rpsChoices.remote = remoteChoice;
    checkOnlineRPSComplete();
  }

  function checkOnlineRPSComplete() {
    if (!rpsChoices.online || !rpsChoices.remote) return;

    if (localPlayerRole === "host") {
      const winner = judgeRPS(rpsChoices.online, rpsChoices.remote);
      let firstPlayer;
      if (winner === 1) {
        firstPlayer = "host";
      } else if (winner === -1) {
        firstPlayer = "guest";
      } else {
        networkProtocol.sendRPSResult(null, null);
        rpsChoices.online = null;
        rpsChoices.remote = null;
        document.getElementById("rps-online-status").textContent = "平局！请重新选择";
        document
          .querySelectorAll("#rps-online-buttons .btn-rps")
          .forEach((btn) => btn.classList.remove("selected"));
        return;
      }
      networkProtocol.sendRPSResult(
        {
          host: localPlayerRole === "host" ? rpsChoices.online : rpsChoices.remote,
          guest: localPlayerRole === "host" ? rpsChoices.remote : rpsChoices.online,
        },
        firstPlayer
      );
    }
  }

  function handleOnlineRPSResult(result) {
    const resultEl = document.getElementById("rps-online-result");
    if (result.firstPlayer === null) {
      rpsChoices.online = null;
      rpsChoices.remote = null;
      document.getElementById("rps-online-status").textContent = "平局！请重新选择";
      document
        .querySelectorAll("#rps-online-buttons .btn-rps")
        .forEach((btn) => btn.classList.remove("selected"));
      return;
    }

    const myChoice = rpsChoices.online;
    const theirChoice = rpsChoices.remote;
    const iWin = result.firstPlayer === localPlayerRole;

    resultEl.textContent =
      "你选择了" +
      getRPSName(myChoice) +
      "，对方选择了" +
      getRPSName(theirChoice) +
      (iWin ? "，你赢了！你先手。" : "，你输了！对方先手。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    const gameType = pendingMode.gameType;
    const seed = Math.floor(Math.random() * 2147483646) + 1;

    if (localPlayerRole === "host") {
      gameState = createGameState({ gameType: gameType, oppType: "online" }, seed);

      localTeam = RED;

      if (gameType !== "flip") {
        gameState.currentTeam = firstPlayerRole === "host" ? RED : BLUE;
        gameState.firstPlayer = gameState.currentTeam;
      } else {
        gameState.currentTeam = RED;
        gameState.firstPlayer = RED;
      }

      networkProtocol.sendAction({ a: "board_sync", seed: seed, gameType: gameType });
    } else {
      // Guest: use seed from host if available, otherwise generate locally
      const actualSeed = pendingBoardSeed || seed;
      pendingBoardSeed = null;
      gameState = createGameState({ gameType: gameType, oppType: "online" }, actualSeed);

      localTeam = BLUE;

      if (gameType !== "flip") {
        gameState.currentTeam = firstPlayerRole === "host" ? RED : BLUE;
        gameState.firstPlayer = gameState.currentTeam;
      } else {
        gameState.currentTeam = RED;
        gameState.firstPlayer = RED;
      }
    }

    onlineTeamsAssigned = gameType !== "flip";

    buildBoardSVG();

    // Switch rules panel
    document.querySelectorAll(".rules-content").forEach((el) => {
      el.style.display = "none";
    });
    const rulesId = "rules-" + gameType;
    const rulesEl = document.getElementById(rulesId);
    if (rulesEl) rulesEl.style.display = "block";

    // Bind click event
    const layer = document.getElementById("pieces-layer");
    if (layer) layer.addEventListener("click", onBoardClick);

    document.getElementById("rps-online").style.display = "none";
    document.getElementById("rule-pve").style.display = "none";
    $gameArea.style.display = "flex";
    $gameOver.style.display = "none";

    drawBoard();
    updateStatus();

    if (gameType === "flip") {
      showMessage("翻棋模式，请翻开棋子", "");
    } else {
      const firstLabel = getCurrentPlayerLabel({
        mode: "online",
        currentSide: gameState.currentTeam,
        playerSide: localTeam,
        sidesOrder: gameState.firstPlayer
          ? [gameState.firstPlayer, gameState.firstPlayer === RED ? BLUE : RED]
          : [RED, BLUE],
      });
      showMessage(firstLabel.text + "先行，请选择棋子移动", "");
    }
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;

    // Handle board sync from host
    if (actionData.a === "board_sync") {
      if (localPlayerRole === "guest") {
        pendingBoardSeed = actionData.seed;
      }
      return;
    }

    if (actionData.a === "flip") {
      flipPiece(gameState, actionData.x, actionData.y);
      clearHighlights();
      gameState.selectedCell = null;
      drawBoard();
      afterAction();
    } else if (actionData.a === "move") {
      moveCard(
        gameState,
        { x: actionData.fx, y: actionData.fy },
        { x: actionData.tx, y: actionData.ty }
      );
      clearHighlights();
      gameState.selectedCell = null;
      drawBoard();
      afterAction();
    }
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      showMessage("对方已断开连接", "error");
      SoundManager.play("victory");
      $winnerText.textContent = "对方已断开连接，你获胜！";
      $gameOver.style.display = "flex";
    }
    cleanupNetwork();
  }

  function restartGame() {
    if (gameState && gameState.oppType === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    $gameOver.style.display = "none";
    $gameArea.style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    $modeSelection.style.display = "flex";
    gameState = null;
  }

  // ============================================================
  // Event Binding
  // ============================================================
  const modeButtons = document.querySelectorAll(".mode-section .btn:not(.btn-online)");
  for (let i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener("click", function () {
      const gameType = this.dataset.gameType;
      const oppType = this.dataset.oppType;
      pendingMode = { gameType: gameType, oppType: oppType };
      showRPS(oppType);
    });
  }

  // Online mode button
  const btnOnline = document.getElementById("btn-online");
  if (btnOnline) {
    if (!RoomUI.isSupported()) {
      btnOnline.style.display = "none";
    } else {
      btnOnline.addEventListener("click", () => {
        roomUI = new RoomUI({
          onConnectionEstablished: (connection, protocol, role) => {
            networkConnection = connection;
            networkProtocol = protocol;
            localPlayerRole = role;
            setupNetworkHandlers();
            startOnlineRPS();
          },
          onError: (msg) => {
            showMessage(msg, "error");
          },
          onCancel: () => {
            cleanupNetwork();
          },
        });
        roomUI.show();
      });
    }
  }

  // Online RPS buttons
  document.querySelectorAll("#rps-online-buttons .btn-rps").forEach((button) => {
    button.addEventListener("click", (ev) => {
      const choice = ev.target.dataset.choice;
      handleOnlineRPSChoice(choice, ev);
    });
  });

  document.querySelectorAll(".rps-buttons:not(#rps-online-buttons) .btn-rps").forEach((button) => {
    button.addEventListener("click", (ev) => {
      const player = ev.target.dataset.player;
      const choice = ev.target.dataset.choice;
      handleRPSChoice(player, choice, ev);
    });
  });

  $btnRestart.addEventListener("click", restartGame);

  // Recalculate on window resize
  window.addEventListener("resize", () => {
    if (gameState) {
      updateScale();
      renderPieces();
    }
  });

  // Initialize
  showModeSelection();
}
