/* eslint-disable no-var, no-undef */
// ============================================================
// Dou Shou Qi (Animal Chess) - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

// Board dimensions
const COLS = 7;
const ROWS = 9;

// Piece types (rank value: lower = stronger)
const EMPTY = 0;
const RAT = 0;
const CAT = 1;
const DOG = 2;
const WOLF = 3;
const LEOPARD = 4;
const TIGER = 5;
const LION = 6;
const ELEPHANT = 7;

// Teams
const RED = "red";
const BLACK = "black";

// Piece names for display
const PIECE_NAMES = {};
PIECE_NAMES[RAT] = "鼠";
PIECE_NAMES[CAT] = "猫";
PIECE_NAMES[DOG] = "狗";
PIECE_NAMES[WOLF] = "狼";
PIECE_NAMES[LEOPARD] = "豹";
PIECE_NAMES[TIGER] = "虎";
PIECE_NAMES[LION] = "狮";
PIECE_NAMES[ELEPHANT] = "象";

// Piece values for AI evaluation
const PIECE_VALUES = {};
PIECE_VALUES[RAT] = 100;
PIECE_VALUES[CAT] = 200;
PIECE_VALUES[DOG] = 300;
PIECE_VALUES[WOLF] = 400;
PIECE_VALUES[LEOPARD] = 500;
PIECE_VALUES[TIGER] = 600;
PIECE_VALUES[LION] = 700;
PIECE_VALUES[ELEPHANT] = 800;

// Terrain types
const TERRAIN_LAND = 0;
const TERRAIN_RIVER = 1;
const TERRAIN_TRAP_RED = 2;
const TERRAIN_TRAP_BLACK = 3;
const TERRAIN_DEN_RED = 4;
const TERRAIN_DEN_BLACK = 5;

// AI search depth

// Max additional plies explored by quiescence search (capture-only)
const QUIESCENCE_MAX_DEPTH = 6;

// ============================================================
// Terrain definition
// ============================================================

function createTerrain() {
  const terrain = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) col.push(TERRAIN_LAND);
    terrain.push(col);
  }

  // River: left river (x=1,2 y=3,4,5) + right river (x=4,5 y=3,4,5)
  for (let x = 1; x <= 2; x++) {
    for (let y = 3; y <= 5; y++) {
      terrain[x][y] = TERRAIN_RIVER;
    }
  }
  for (let x = 4; x <= 5; x++) {
    for (let y = 3; y <= 5; y++) {
      terrain[x][y] = TERRAIN_RIVER;
    }
  }

  // Black den: (3,0)
  terrain[3][0] = TERRAIN_DEN_BLACK;

  // Red den: (3,8)
  terrain[3][8] = TERRAIN_DEN_RED;

  // Black traps: (2,0), (3,1), (4,0)
  terrain[2][0] = TERRAIN_TRAP_BLACK;
  terrain[3][1] = TERRAIN_TRAP_BLACK;
  terrain[4][0] = TERRAIN_TRAP_BLACK;

  // Red traps: (2,8), (3,7), (4,8)
  terrain[2][8] = TERRAIN_TRAP_RED;
  terrain[3][7] = TERRAIN_TRAP_RED;
  terrain[4][8] = TERRAIN_TRAP_RED;

  return terrain;
}

function isRiver(x, y) {
  return (
    ((x === 1 || x === 2) && (y === 3 || y === 4 || y === 5)) ||
    ((x === 4 || x === 5) && (y === 3 || y === 4 || y === 5))
  );
}

function isTrap(x, y, team) {
  if (team === BLACK) {
    return (x === 2 && y === 0) || (x === 3 && y === 1) || (x === 4 && y === 0);
  }
  return (x === 2 && y === 8) || (x === 3 && y === 7) || (x === 4 && y === 8);
}

function isDen(x, y, team) {
  if (team === BLACK) {
    return x === 3 && y === 0;
  }
  return x === 3 && y === 8;
}

function isOpponentDen(x, y, team) {
  if (team === RED) {
    return x === 3 && y === 0; // Black den
  }
  return x === 3 && y === 8; // Red den
}

// ============================================================
// Piece creation
// ============================================================

function createPiece(type, team) {
  return { type, team, rank: type };
}

// ============================================================
// Initial board setup
// ============================================================

function createBoard() {
  const board = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) col.push(null);
    board.push(col);
  }

  // Black pieces (top, y=0-2)
  board[0][0] = createPiece(LION, BLACK); // (0,0)
  board[6][0] = createPiece(TIGER, BLACK); // (6,0)
  board[1][1] = createPiece(DOG, BLACK); // (1,1)
  board[5][1] = createPiece(CAT, BLACK); // (5,1)
  board[0][2] = createPiece(RAT, BLACK); // (0,2)
  board[2][2] = createPiece(LEOPARD, BLACK); // (2,2)
  board[4][2] = createPiece(WOLF, BLACK); // (4,2)
  board[6][2] = createPiece(ELEPHANT, BLACK); // (6,2)

  // Red pieces (bottom, y=6-8)
  board[0][6] = createPiece(ELEPHANT, RED); // (0,6)
  board[2][6] = createPiece(WOLF, RED); // (2,6)
  board[4][6] = createPiece(LEOPARD, RED); // (4,6)
  board[6][6] = createPiece(RAT, RED); // (6,6)
  board[1][7] = createPiece(CAT, RED); // (1,7)
  board[5][7] = createPiece(DOG, RED); // (5,7)
  board[0][8] = createPiece(TIGER, RED); // (0,8)
  board[6][8] = createPiece(LION, RED); // (6,8)

  return board;
}

// ============================================================
// Board operations
// ============================================================

function copyBoard(board) {
  const newBoard = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      col.push(piece ? { ...piece } : null);
    }
    newBoard.push(col);
  }
  return newBoard;
}

function applyMove(board, move) {
  const newBoard = copyBoard(board);
  newBoard[move.toC][move.toR] = newBoard[move.fromC][move.fromR];
  newBoard[move.fromC][move.fromR] = null;
  return newBoard;
}

// Apply move with mutual destruction handling (for AI search)
function applyMoveForAI(board, move) {
  const newBoard = copyBoard(board);
  const attacker = newBoard[move.fromC][move.fromR];
  const defender = newBoard[move.toC][move.toR];

  if (defender && attacker.rank === defender.rank) {
    // Mutual destruction: both pieces removed
    newBoard[move.fromC][move.fromR] = null;
    newBoard[move.toC][move.toR] = null;
  } else {
    newBoard[move.toC][move.toR] = attacker;
    newBoard[move.fromC][move.fromR] = null;
  }
  return newBoard;
}

// ============================================================
// Piece identification
// ============================================================

function getOwner(piece) {
  return piece ? piece.team : null;
}

function getOpponent(color) {
  return color === RED ? BLACK : RED;
}

function getPlayerName(color) {
  return color === RED ? "红方" : "黑方";
}

function inBounds(c, r) {
  return c >= 0 && c < COLS && r >= 0 && r < ROWS;
}

// ============================================================
// Move validation
// ============================================================

function canCapture(attacker, defender, attackerX, attackerY, defenderX, defenderY) {
  // Cannot capture own pieces
  if (attacker.team === defender.team) return false;

  // Water rule: only the rat may swim, and a rat in the water cannot
  // interact with pieces on land at all — a swimming rat cannot snatch the
  // shore elephant, and rats on land and in water cannot capture each other.
  // (Captures across the river by lion/tiger jumps are handled separately.)
  if (isRiver(attackerX, attackerY) !== isRiver(defenderX, defenderY)) return false;

  // A piece standing in the attacker's trap (the traps guarding its own den)
  // loses all rank and can be captured by any piece. Pieces are unaffected
  // by their own traps.
  if (isTrap(defenderX, defenderY, attacker.team)) return true;

  const attRank = attacker.rank;
  const defRank = defender.rank;

  // Rat captures elephant (reversal)
  if (attRank === RAT && defRank === ELEPHANT) return true;

  // Elephant cannot capture rat
  if (attRank === ELEPHANT && defRank === RAT) return false;

  // Higher rank (higher value) captures lower rank (lower value)
  // ELEPHANT(7) > LION(6) > TIGER(5) > LEOPARD(4) > WOLF(3) > DOG(2) > CAT(1) > RAT(0)
  if (attRank >= defRank) return true;

  return false;
}

// Check if capture results in mutual destruction (same rank)
function isMutualDestruction(attacker, defender) {
  return attacker.rank === defender.rank;
}

function canMoveTo(board, piece, fromC, fromR, toC, toR) {
  if (!inBounds(toC, toR)) return false;

  const target = board[toC][toR];

  // Cannot move to own den
  if (isDen(toC, toR, piece.team)) return false;

  // Check terrain restrictions
  if (isRiver(toC, toR)) {
    // Only rat can enter river
    if (piece.type !== RAT) return false;
  }

  // If target has a piece, check capture
  if (target) {
    return canCapture(piece, target, fromC, fromR, toC, toR);
  }

  return true;
}

// ============================================================
// Jump logic for Lion and Tiger
// ============================================================

function canJumpRiver(board, piece, fromC, fromR, toC, toR) {
  // Only lion and tiger can jump
  if (piece.type !== LION && piece.type !== TIGER) return false;

  // Horizontal jump: same row, jumping 3 columns
  if (fromR === toR && Math.abs(fromC - toC) === 3) {
    // Check if all cells between are river
    const minC = Math.min(fromC, toC);
    for (let c = minC + 1; c < minC + 3; c++) {
      if (!isRiver(c, fromR)) return false;
      // Check if rat is blocking
      if (board[c][fromR] && board[c][fromR].type === RAT) return false;
    }
    return true;
  }

  // Vertical jump: same column, jumping 4 rows
  if (fromC === toC && Math.abs(fromR - toR) === 4) {
    // Check if all cells between are river
    const minR = Math.min(fromR, toR);
    for (let r = minR + 1; r < minR + 4; r++) {
      if (!isRiver(fromC, r)) return false;
      // Check if rat is blocking
      if (board[fromC][r] && board[fromC][r].type === RAT) return false;
    }
    return true;
  }

  return false;
}

// ============================================================
// Get valid moves for a piece
// ============================================================

function getValidMoves(board, c, r) {
  const piece = board[c][r];
  if (!piece) return [];

  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  // Normal moves (one step)
  for (const [dc, dr] of dirs) {
    const nc = c + dc;
    const nr = r + dr;
    if (canMoveTo(board, piece, c, r, nc, nr)) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }

  // Lion and tiger can jump over river
  if (piece.type === LION || piece.type === TIGER) {
    // Check all possible jump destinations
    const jumpDirs = [
      [3, 0],
      [-3, 0],
      [0, 4],
      [0, -4],
    ];
    for (const [dc, dr] of jumpDirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (inBounds(nc, nr) && canJumpRiver(board, piece, c, r, nc, nr)) {
        const target = board[nc][nr];
        if (!target || canCapture(piece, target, c, r, nc, nr)) {
          // Cannot jump to own den
          if (!isDen(nc, nr, piece.team)) {
            moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
          }
        }
      }
    }
  }

  return moves;
}

// ============================================================
// Get all moves for a team
// ============================================================

function getAllMoves(board, color) {
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      if (piece && piece.team === color) {
        const pieceMoves = getValidMoves(board, c, r);
        for (const move of pieceMoves) {
          moves.push(move);
        }
      }
    }
  }
  return moves;
}

// ============================================================
// Win/loss detection
// ============================================================

function checkGameOver(board, nextPlayer) {
  // Check if any piece entered opponent's den
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      if (piece && isOpponentDen(c, r, piece.team)) {
        return { winner: piece.team, reason: "den" };
      }
    }
  }

  // Count pieces
  let redCount = 0;
  let blackCount = 0;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const piece = board[c][r];
      if (piece) {
        if (piece.team === RED) redCount++;
        else blackCount++;
      }
    }
  }

  // Check if one side has no pieces
  if (redCount === 0) return { winner: BLACK, reason: "capture" };
  if (blackCount === 0) return { winner: RED, reason: "capture" };

  // Check if next player has any legal moves
  const moves = getAllMoves(board, nextPlayer);
  if (moves.length === 0) {
    return { winner: getOpponent(nextPlayer), reason: "no_moves" };
  }

  return null;
}

// ============================================================
// AI: Alpha-Beta Pruning
// ============================================================

// Time management

// Move-ordering heuristics: killer moves (per remaining depth) and history table.
// These dramatically improve alpha-beta pruning efficiency.

// Transposition table

// Simple hash for board position

// Move ordering

// Lightweight terminal check for quiescence (den entry or wipe-out only).
// Skips the expensive "no legal moves" detection used by checkGameOver.

// Quiescence search: only explores capture moves to reach a "quiet" position
// before evaluating, eliminating the horizon effect on tactical exchanges.

// Alpha-Beta search

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode,
    board: createBoard(),
    terrain: createTerrain(),
    currentPlayer: RED,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    selectedPiece: null,
    validMoves: [],
    lastMove: null,
    boardFlipped: false,
    firstPlayer: null,
  };
}

// ============================================================
// Module exports (Node.js environment)
// ============================================================

const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const {
  AI_DEPTH,
  AI_MAX_DEPTH,
  AI_TIME_BUDGET_MS,
  evaluateBoard,
  searchDeadline,
  TIME_ABORT,
  killerMoves,
  historyTable,
  sameMove,
  historyKey,
  recordKiller,
  recordHistory,
  transpositionTable,
  TT_MAX_SIZE,
  TT_EXACT,
  TT_LOWER,
  TT_UPPER,
  ttLookup,
  ttStore,
  computeHash,
  orderMoves,
  quickTerminalWinner,
  quiescence,
  alphaBeta,
  getBestAIMove,
} = createGameAI({
  COLS,
  ROWS,
  EMPTY,
  RAT,
  CAT,
  DOG,
  WOLF,
  LEOPARD,
  TIGER,
  LION,
  ELEPHANT,
  RED,
  BLACK,
  PIECE_NAMES,
  PIECE_VALUES,
  TERRAIN_LAND,
  TERRAIN_RIVER,
  TERRAIN_TRAP_RED,
  TERRAIN_TRAP_BLACK,
  TERRAIN_DEN_RED,
  TERRAIN_DEN_BLACK,
  QUIESCENCE_MAX_DEPTH,
  createTerrain,
  isRiver,
  isTrap,
  isDen,
  isOpponentDen,
  createPiece,
  createBoard,
  copyBoard,
  applyMove,
  applyMoveForAI,
  getOwner,
  getOpponent,
  getPlayerName,
  inBounds,
  canCapture,
  isMutualDestruction,
  canMoveTo,
  canJumpRiver,
  getValidMoves,
  getAllMoves,
  checkGameOver,
  createGameState,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLS,
    ROWS,
    EMPTY,
    RAT,
    CAT,
    DOG,
    WOLF,
    LEOPARD,
    TIGER,
    LION,
    ELEPHANT,
    RED,
    BLACK,
    AI_DEPTH,
    AI_MAX_DEPTH,
    AI_TIME_BUDGET_MS,
    TERRAIN_LAND,
    TERRAIN_RIVER,
    TERRAIN_TRAP_RED,
    TERRAIN_TRAP_BLACK,
    TERRAIN_DEN_RED,
    TERRAIN_DEN_BLACK,
    PIECE_NAMES,
    PIECE_VALUES,
    createTerrain,
    isRiver,
    isTrap,
    isDen,
    isOpponentDen,
    createPiece,
    createBoard,
    copyBoard,
    applyMove,
    getOwner,
    getOpponent,
    getPlayerName,
    inBounds,
    canCapture,
    canMoveTo,
    canJumpRiver,
    getValidMoves,
    getAllMoves,
    checkGameOver,
    evaluateBoard,
    alphaBeta,
    getBestAIMove,
    createGameState,
    orderMoves,
    computeHash,
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== "undefined") {
  // Initialize sound manager
  SoundManager.init("../../audio");

  let gameState = null;
  let rpsChoices = { player1: null, player2: null, human: null };
  let canvas, context;

  // Online mode state
  let networkProtocol = null;
  let networkConnection = null;
  let roomUI = null;
  let localPlayerRole = null;
  let localTeam = null;
  let remoteTeam = null;

  // Board dimensions (matching the original board layout)
  const CELL_SIZE = 65;
  const PADDING = 8;
  const BOARD_W = CELL_SIZE * COLS + PADDING * 2;
  const BOARD_H = CELL_SIZE * ROWS + PADDING * 2;
  const PIECE_RADIUS = 25;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    const ratio = window.devicePixelRatio || 1;
    canvas.width = BOARD_W * ratio;
    canvas.height = BOARD_H * ratio;
    canvas.style.width = BOARD_W + "px";
    canvas.style.height = BOARD_H + "px";
    context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    drawBoard();
  }

  function toCanvasX(c) {
    const col = gameState && gameState.boardFlipped ? COLS - 1 - c : c;
    return PADDING + col * CELL_SIZE + CELL_SIZE / 2;
  }

  function toCanvasY(r) {
    const row = gameState && gameState.boardFlipped ? ROWS - 1 - r : r;
    return PADDING + row * CELL_SIZE + CELL_SIZE / 2;
  }

  function drawBoard() {
    // White board base (matches the original board image)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, BOARD_W, BOARD_H);

    // Neutral black outer border
    context.strokeStyle = "#000000";
    context.lineWidth = 4;
    context.strokeRect(2, 2, BOARD_W - 4, BOARD_H - 4);

    // Neutral black grid lines
    context.strokeStyle = "#000000";
    context.lineWidth = 3;

    // Horizontal lines (grid rows, including outer edges)
    for (let r = 0; r <= ROWS; r++) {
      context.beginPath();
      const y = PADDING + r * CELL_SIZE;
      context.moveTo(PADDING, y);
      context.lineTo(PADDING + COLS * CELL_SIZE, y);
      context.stroke();
    }

    // Vertical lines (grid columns, including outer edges)
    for (let c = 0; c <= COLS; c++) {
      context.beginPath();
      const x = PADDING + c * CELL_SIZE;
      context.moveTo(x, PADDING);
      context.lineTo(x, PADDING + ROWS * CELL_SIZE);
      context.stroke();
    }

    // River waves between the two camps (neutral black wave lines)
    for (let c = 1; c <= 5; c++) {
      if (c === 3) continue; // Skip center column
      for (let r = 3; r <= 5; r++) {
        const cx = toCanvasX(c);
        const cy = toCanvasY(r);
        const halfCell = CELL_SIZE / 2;

        context.strokeStyle = "#000000";
        context.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const y = cy - halfCell + 9 + i * 11;
          context.beginPath();
          context.moveTo(cx - halfCell + 5, y);
          context.quadraticCurveTo(cx - halfCell * 0.5, y - 5, cx, y);
          context.quadraticCurveTo(cx + halfCell * 0.5, y + 5, cx + halfCell - 5, y);
          context.stroke();
        }
      }
    }

    // Den circles: black camp (top) / red camp (bottom), with 獸穴 labels
    context.strokeStyle = "#000000";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(toCanvasX(3), toCanvasY(0), 22, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "#d32f2f";
    context.beginPath();
    context.arc(toCanvasX(3), toCanvasY(8), 22, 0, Math.PI * 2);
    context.stroke();

    // Terrain labels (獸穴 / 陷阱) and animal names on the starting cells
    drawTerrainLabels();
    drawStartCharacters();

    // Draw selection and valid moves
    if (gameState && gameState.selectedPiece) {
      drawSelection(gameState.selectedPiece.c, gameState.selectedPiece.r);
      drawValidMoves(gameState.validMoves);
    }

    // Draw last move
    if (gameState && gameState.lastMove) {
      drawLastMove(gameState.lastMove);
    }

    // Draw all pieces
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (gameState && gameState.board[c][r]) {
          drawPiece(c, r, gameState.board[c][r]);
        }
      }
    }
  }

  // Label the dens (獸穴) and the traps around them (陷阱), matching the
  // classic board design. Each camp uses its own team color.
  function drawTerrainLabels() {
    context.font = 'bold 20px "KaiTi", "楷体", "STKaiti", serif';
    context.textAlign = "center";
    context.textBaseline = "middle";

    const camps = [
      {
        color: "#000000",
        den: { c: 3, r: 0 },
        traps: [
          { c: 2, r: 0 },
          { c: 4, r: 0 },
          { c: 3, r: 1 },
        ],
      },
      {
        color: "#d32f2f",
        den: { c: 3, r: 8 },
        traps: [
          { c: 2, r: 8 },
          { c: 4, r: 8 },
          { c: 3, r: 7 },
        ],
      },
    ];

    for (const camp of camps) {
      context.fillStyle = camp.color;
      context.fillText("獸穴", toCanvasX(camp.den.c), toCanvasY(camp.den.r));
      for (const cell of camp.traps) {
        context.fillText("陷阱", toCanvasX(cell.c), toCanvasY(cell.r));
      }
    }
  }

  // Print the animal name on each starting cell, matching the original board.
  function drawStartCharacters() {
    context.font = 'bold 30px "KaiTi", "楷体", "STKaiti", serif';
    context.textAlign = "center";
    context.textBaseline = "middle";

    const camps = [
      {
        color: "#000000",
        cells: [
          { c: 0, r: 0, name: PIECE_NAMES[LION] },
          { c: 6, r: 0, name: PIECE_NAMES[TIGER] },
          { c: 1, r: 1, name: PIECE_NAMES[DOG] },
          { c: 5, r: 1, name: PIECE_NAMES[CAT] },
          { c: 0, r: 2, name: PIECE_NAMES[RAT] },
          { c: 2, r: 2, name: PIECE_NAMES[LEOPARD] },
          { c: 4, r: 2, name: PIECE_NAMES[WOLF] },
          { c: 6, r: 2, name: PIECE_NAMES[ELEPHANT] },
        ],
      },
      {
        color: "#d32f2f",
        cells: [
          { c: 0, r: 6, name: PIECE_NAMES[ELEPHANT] },
          { c: 2, r: 6, name: PIECE_NAMES[WOLF] },
          { c: 4, r: 6, name: PIECE_NAMES[LEOPARD] },
          { c: 6, r: 6, name: PIECE_NAMES[RAT] },
          { c: 1, r: 7, name: PIECE_NAMES[CAT] },
          { c: 5, r: 7, name: PIECE_NAMES[DOG] },
          { c: 0, r: 8, name: PIECE_NAMES[TIGER] },
          { c: 6, r: 8, name: PIECE_NAMES[LION] },
        ],
      },
    ];

    for (const camp of camps) {
      context.fillStyle = camp.color;
      for (const cell of camp.cells) {
        context.fillText(cell.name, toCanvasX(cell.c), toCanvasY(cell.r));
      }
    }
  }

  function drawPiece(c, r, piece) {
    const cx = toCanvasX(c);
    const cy = toCanvasY(r);
    const color = piece.team;

    // Wooden disc with the shared glossy material
    BoardGameTheme.glossyDisc(context, cx, cy, PIECE_RADIUS, "#e8d5a8", {
      light: 0.75,
      dark: 0.42,
      rim: color === RED ? "#c0392b" : "#1a1a1a",
      rimWidth: 3,
      highlight: "rgba(255, 255, 255, 0.18)",
    });

    // Inner decorative ring
    context.strokeStyle = color === RED ? "#e74c3c" : "#333";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(cx, cy, PIECE_RADIUS - 4, 0, Math.PI * 2);
    context.stroke();

    // Text
    context.fillStyle = color === RED ? "#c0392b" : "#1a1a1a";
    context.font = 'bold 22px "KaiTi", "楷体", "STKaiti", serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(PIECE_NAMES[piece.type], cx, cy + 1);
  }

  function drawSelection(c, r) {
    context.strokeStyle = "#ffd600";
    context.lineWidth = 3;
    const x = toCanvasX(c) - PIECE_RADIUS - 2;
    const y = toCanvasY(r) - PIECE_RADIUS - 2;
    const size = (PIECE_RADIUS + 2) * 2;
    context.strokeRect(x, y, size, size);
  }

  function drawValidMoves(moves) {
    for (const m of moves) {
      const cx = toCanvasX(m.toC);
      const cy = toCanvasY(m.toR);
      if (gameState.board[m.toC][m.toR]) {
        context.strokeStyle = "rgba(229, 57, 53, 0.7)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, PIECE_RADIUS + 2, 0, Math.PI * 2);
        context.stroke();
      } else {
        context.fillStyle = "rgba(76, 175, 80, 0.6)";
        context.beginPath();
        context.arc(cx, cy, 8, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = "rgba(255, 152, 0, 0.7)";
    context.lineWidth = 3;
    const size = PIECE_RADIUS + 4;
    context.strokeRect(
      toCanvasX(move.fromC) - size,
      toCanvasY(move.fromR) - size,
      size * 2,
      size * 2
    );
    context.strokeRect(toCanvasX(move.toC) - size, toCanvasY(move.toR) - size, size * 2, size * 2);
  }

  function renderGame(state) {
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    drawBoard();

    // Update status
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === RED ? BLACK : RED]
        : [RED, BLACK],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === RED ? "text-red" : "text-black-side");
    document.getElementById("turn-count").textContent = state.turnCount;

    const redCount = countPieces(state.board, RED);
    const blackCount = countPieces(state.board, BLACK);
    document.getElementById("score-red").textContent = redCount;
    document.getElementById("score-black").textContent = blackCount;

    if (state.mode === "pve") {
      const redLabel = state.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      const blackLabel = state.playerTeam === BLACK ? "玩家（黑方）：" : "电脑（黑方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else if (state.mode === "online") {
      const redLabel = state.localTeam === RED ? "你（红方）：" : "对方（红方）：";
      const blackLabel = state.localTeam === BLACK ? "你（黑方）：" : "对方（黑方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else {
      document.getElementById("label-red").textContent = "红方：";
      document.getElementById("label-black").textContent = "黑方：";
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else {
      updateMessage("轮到 " + label.text + " 行动", "info");
    }
  }

  function countPieces(board, color) {
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (board[c][r] && board[c][r].team === color) count++;
      }
    }
    return count;
  }

  function updateMessage(text, type) {
    const el = document.getElementById("message");
    el.textContent = text;
    if (type === "error") {
      el.className = "error";
    } else if (type === "info") {
      el.className = "info";
    } else {
      el.className = "";
    }
  }

  function showGameOver(state) {
    const winnerText = document.getElementById("winner-text");
    if (state.winner) {
      const isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");

      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.winner,
        playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === RED ? BLACK : RED]
          : [RED, BLACK],
      });
      winnerText.textContent = label.text + " 获胜！";
      winnerText.className = state.winner === RED ? "text-red" : "text-black-side";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
      winnerText.className = "";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = BOARD_W / rect.width;
    const scaleY = BOARD_H / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    let col = Math.round((px - PADDING - CELL_SIZE / 2) / CELL_SIZE);
    let row = Math.round((py - PADDING - CELL_SIZE / 2) / CELL_SIZE);
    if (gameState.boardFlipped) {
      col = COLS - 1 - col;
      row = ROWS - 1 - row;
    }

    if (!inBounds(col, row)) return;

    const piece = gameState.board[col][row];

    if (gameState.selectedPiece) {
      const move = findMove(gameState.validMoves, col, row);
      if (move) {
        doMove(move);
        if (gameState.mode === "online" && networkProtocol) {
          networkProtocol.sendAction({
            a: "move",
            fc: move.fromC,
            fr: move.fromR,
            tc: move.toC,
            tr: move.toR,
          });
        }
        return;
      }
    }

    if (piece && piece.team === gameState.currentPlayer) {
      const moves = getValidMoves(gameState.board, col, row);
      if (moves.length > 0) {
        gameState.selectedPiece = { c: col, r: row };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage("该棋子没有合法移动", "error");
      }
      return;
    }

    gameState.selectedPiece = null;
    gameState.validMoves = [];
    renderGame(gameState);
  }

  function findMove(moves, toC, toR) {
    for (const move of moves) {
      if (move.toC === toC && move.toR === toR) return move;
    }
    return null;
  }

  function doMove(move) {
    const targetPiece = gameState.board[move.toC][move.toR];
    const attackerPiece = gameState.board[move.fromC][move.fromR];

    if (targetPiece) {
      SoundManager.play("take");
      // Check if mutual destruction (same rank)
      if (isMutualDestruction(attackerPiece, targetPiece)) {
        // Both pieces are removed
        gameState.board[move.fromC][move.fromR] = null;
        gameState.board[move.toC][move.toR] = null;
      } else {
        // Normal capture
        gameState.board = applyMove(gameState.board, move);
      }
    } else {
      SoundManager.play("slide");
      gameState.board = applyMove(gameState.board, move);
    }

    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
  }

  function endTurn() {
    const nextPlayer = getOpponent(gameState.currentPlayer);
    const gameOverResult = checkGameOver(gameState.board, nextPlayer);
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = nextPlayer;
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) {
        const targetPiece = gameState.board[move.toC][move.toR];
        const attackerPiece = gameState.board[move.fromC][move.fromR];
        if (targetPiece) {
          SoundManager.play("take");
          if (isMutualDestruction(attackerPiece, targetPiece)) {
            gameState.board[move.fromC][move.fromR] = null;
            gameState.board[move.toC][move.toR] = null;
          } else {
            gameState.board = applyMove(gameState.board, move);
          }
        } else {
          SoundManager.play("slide");
          gameState.board = applyMove(gameState.board, move);
        }
        gameState.lastMove = move;
        gameState.turnCount++;
      }
      endTurn();
    }, 300);
  }

  async function startGame(mode, playerTeam) {
    gameState = createGameState(mode);
    gameState.currentPlayer = RED;
    gameState.firstPlayer = RED;
    gameState.boardFlipped = false;

    if (mode === "pve") {
      gameState.playerTeam = playerTeam || RED;
      gameState.aiTeam = playerTeam === RED ? BLACK : RED;
      gameState.boardFlipped = gameState.playerTeam === BLACK;
    }

    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = mode === "pve" ? "block" : "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;

    if (mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function restartGame() {
    if (gameState && gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendRestart();
    }
    cleanupNetwork();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("rps-online").style.display = "none";
    document.getElementById("mode-selection").style.display = "flex";
    gameState = null;
  }

  // --- Online mode functions ---

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
    remoteTeam = null;
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
        document.getElementById("mode-selection").style.display = "flex";
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
    document.getElementById("mode-selection").style.display = "none";
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
      (iWin ? "，你赢了！你先手(红方)。" : "，你输了！对方先手(红方)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = RED;
    const guestPiece = BLACK;

    if (localPlayerRole === "host") {
      localTeam = firstPlayerRole === "host" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "host" ? guestPiece : hostPiece;
    } else {
      localTeam = firstPlayerRole === "guest" ? hostPiece : guestPiece;
      remoteTeam = firstPlayerRole === "guest" ? guestPiece : hostPiece;
    }

    gameState.currentPlayer = firstPlayerRole === "host" ? hostPiece : guestPiece;
    gameState.firstPlayer = gameState.currentPlayer;
    gameState.localTeam = localTeam;
    gameState.remoteTeam = remoteTeam;

    document.getElementById("rps-online").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = "none";
    document.getElementById("game-over").style.display = "none";

    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;
  }

  function applyRemoteAction(actionData) {
    if (!gameState || gameState.gameOver) return;
    if (gameState.currentPlayer !== remoteTeam) return;
    const move = {
      fromC: actionData.fc,
      fromR: actionData.fr,
      toC: actionData.tc,
      toR: actionData.tr,
    };
    doMove(move);
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      updateMessage("对方已断开连接", "error");
      const winnerText = document.getElementById("winner-text");
      winnerText.textContent = "对方已断开连接，你获胜！";
      document.getElementById("game-over").style.display = "flex";
    }
    cleanupNetwork();
  }

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
        SoundManager.play("victory");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你赢了！你先手(红方)。";
        setTimeout(() => {
          startGame("pve", RED);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(红方)。";
        setTimeout(() => {
          startGame("pve", BLACK);
        }, 1500);
      } else {
        SoundManager.play("draw");
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
      event.target.classList.add("selected");

      const statusEl = document.getElementById("rps-p" + player + "-status");
      statusEl.textContent = "已选择：" + getRPSName(choice);

      if (rpsChoices.player1 && rpsChoices.player2) {
        const resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);

        if (winner === 1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家1赢了！玩家1先手(红方)。";
          setTimeout(() => {
            startGame("pvp", RED);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家2赢了！玩家2先手(红方)。";
          setTimeout(() => {
            startGame("pvp", BLACK);
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

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-pvp").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "block";
      document.getElementById("rps-pve").style.display = "none";
      rpsChoices = { player1: null, player2: null, human: null };
    });

    document.getElementById("btn-pve").addEventListener("click", () => {
      document.getElementById("mode-selection").style.display = "none";
      document.getElementById("rps-section").style.display = "flex";
      document.getElementById("rps-pvp").style.display = "none";
      document.getElementById("rps-pve").style.display = "block";
      rpsChoices = { player1: null, player2: null, human: null };
    });

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
              updateMessage(msg, "error");
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

    document.querySelectorAll(".btn-rps").forEach((button) => {
      button.addEventListener("click", (ev) => {
        const player = ev.target.dataset.player;
        const choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
