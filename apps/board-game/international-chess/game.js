/* eslint-disable no-var, no-undef */
// ============================================================
// International Chess - Game Core Logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const BOARD_SIZE = 8;
const EMPTY = 0;
const W_PAWN = 1,
  W_KNIGHT = 2,
  W_BISHOP = 3,
  W_ROOK = 4,
  W_QUEEN = 5,
  W_KING = 6;
const B_PAWN = 7,
  B_KNIGHT = 8,
  B_BISHOP = 9,
  B_ROOK = 10,
  B_QUEEN = 11,
  B_KING = 12;

const WHITE = "white";
const BLACK = "black";

// Unicode piece symbols
const PIECE_SYMBOLS = {};
PIECE_SYMBOLS[W_PAWN] = "♙";
PIECE_SYMBOLS[W_KNIGHT] = "♘";
PIECE_SYMBOLS[W_BISHOP] = "♗";
PIECE_SYMBOLS[W_ROOK] = "♖";
PIECE_SYMBOLS[W_QUEEN] = "♕";
PIECE_SYMBOLS[W_KING] = "♔";
PIECE_SYMBOLS[B_PAWN] = "♟";
PIECE_SYMBOLS[B_KNIGHT] = "♞";
PIECE_SYMBOLS[B_BISHOP] = "♝";
PIECE_SYMBOLS[B_ROOK] = "♜";
PIECE_SYMBOLS[B_QUEEN] = "♛";
PIECE_SYMBOLS[B_KING] = "♚";

const PIECE_NAMES = {};
PIECE_NAMES[W_PAWN] = "兵";
PIECE_NAMES[W_KNIGHT] = "马";
PIECE_NAMES[W_BISHOP] = "象";
PIECE_NAMES[W_ROOK] = "车";
PIECE_NAMES[W_QUEEN] = "后";
PIECE_NAMES[W_KING] = "王";
PIECE_NAMES[B_PAWN] = "兵";
PIECE_NAMES[B_KNIGHT] = "马";
PIECE_NAMES[B_BISHOP] = "象";
PIECE_NAMES[B_ROOK] = "车";
PIECE_NAMES[B_QUEEN] = "后";
PIECE_NAMES[B_KING] = "王";

const PIECE_VALUES = {};

PIECE_VALUES[W_PAWN] = 100;
PIECE_VALUES[W_KNIGHT] = 320;
PIECE_VALUES[W_BISHOP] = 330;
PIECE_VALUES[W_ROOK] = 500;
PIECE_VALUES[W_QUEEN] = 900;
PIECE_VALUES[W_KING] = 20000;
PIECE_VALUES[B_PAWN] = 100;
PIECE_VALUES[B_KNIGHT] = 320;
PIECE_VALUES[B_BISHOP] = 330;
PIECE_VALUES[B_ROOK] = 500;
PIECE_VALUES[B_QUEEN] = 900;
PIECE_VALUES[B_KING] = 20000;

// Pawn position bonus values
const PAWN_POS_WHITE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const PAWN_POS_BLACK = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_POS = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_POS = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

// ============================================================
// Piece identification
// ============================================================

function isWhite(piece) {
  return piece >= W_PAWN && piece <= W_KING;
}
function isBlack(piece) {
  return piece >= B_PAWN && piece <= B_KING;
}
function getOwner(piece) {
  if (isWhite(piece)) return WHITE;
  if (isBlack(piece)) return BLACK;
  return null;
}
function getOpponent(color) {
  return color === WHITE ? BLACK : WHITE;
}
function getPlayerName(color) {
  return color === WHITE ? "白方" : "黑方";
}
function inBounds(c, r) {
  return c >= 0 && c < BOARD_SIZE && r >= 0 && r < BOARD_SIZE;
}
function isPawn(piece) {
  return piece === W_PAWN || piece === B_PAWN;
}
function isKnight(piece) {
  return piece === W_KNIGHT || piece === B_KNIGHT;
}
function isBishop(piece) {
  return piece === W_BISHOP || piece === B_BISHOP;
}
function isRook(piece) {
  return piece === W_ROOK || piece === B_ROOK;
}
function isQueen(piece) {
  return piece === W_QUEEN || piece === B_QUEEN;
}
function isKing(piece) {
  return piece === W_KING || piece === B_KING;
}

// ============================================================
// Initial board
// ============================================================

function createBoard() {
  const board = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    const col = [];
    for (let r = 0; r < BOARD_SIZE; r++) col.push(EMPTY);
    board.push(col);
  }
  // Black (top, row 0-1)
  board[0][0] = B_ROOK;
  board[1][0] = B_KNIGHT;
  board[2][0] = B_BISHOP;
  board[3][0] = B_QUEEN;
  board[4][0] = B_KING;
  board[5][0] = B_BISHOP;
  board[6][0] = B_KNIGHT;
  board[7][0] = B_ROOK;
  for (let c = 0; c < 8; c++) board[c][1] = B_PAWN;
  // White (bottom, row 6-7)
  board[0][7] = W_ROOK;
  board[1][7] = W_KNIGHT;
  board[2][7] = W_BISHOP;
  board[3][7] = W_QUEEN;
  board[4][7] = W_KING;
  board[5][7] = W_BISHOP;
  board[6][7] = W_KNIGHT;
  board[7][7] = W_ROOK;
  for (let c = 0; c < 8; c++) board[c][6] = W_PAWN;
  return board;
}

// ============================================================
// Board operations
// ============================================================

function copyBoard(board) {
  const newBoard = [];
  for (let c = 0; c < BOARD_SIZE; c++) newBoard.push(board[c].slice());
  return newBoard;
}

function applyMove(board, move) {
  const newBoard = copyBoard(board);
  const piece = newBoard[move.fromC][move.fromR];
  newBoard[move.fromC][move.fromR] = EMPTY;
  // Promotion
  if (move.promotion) {
    newBoard[move.toC][move.toR] = move.promotion;
  } else {
    newBoard[move.toC][move.toR] = piece;
  }
  // En passant: remove the pawn that just double-stepped past the destination.
  // It sits beside the landing square: same file as the destination, same rank
  // as the origin.
  if (move.enPassant) {
    newBoard[move.toC][move.fromR] = EMPTY;
  }
  // Castling: move rook
  if (move.castling) {
    if (move.toC === 6) {
      // King-side castling
      newBoard[5][move.toR] = newBoard[7][move.toR];
      newBoard[7][move.toR] = EMPTY;
    } else {
      // Queen-side castling
      newBoard[3][move.toR] = newBoard[0][move.toR];
      newBoard[0][move.toR] = EMPTY;
    }
  }
  return newBoard;
}

// ============================================================
// Move generation
// ============================================================

function getValidMoves(board, c, r, hasMoved, epTarget) {
  const piece = board[c][r];
  if (piece === EMPTY) return [];
  const color = getOwner(piece);
  let moves = [];

  if (isPawn(piece)) moves = getPawnMoves(board, c, r, color, hasMoved, epTarget);
  else if (isKnight(piece)) moves = getKnightMoves(board, c, r, color);
  else if (isBishop(piece)) moves = getBishopMoves(board, c, r, color);
  else if (isRook(piece)) moves = getRookMoves(board, c, r, color);
  else if (isQueen(piece)) moves = getQueenMoves(board, c, r, color);
  else if (isKing(piece)) moves = getKingMoves(board, c, r, color, hasMoved);

  // Filter moves that leave own king in check
  const validMoves = [];
  for (const move of moves) {
    const newBoard = applyMove(board, move);
    if (!isInCheck(newBoard, color)) {
      validMoves.push(move);
    }
  }
  return validMoves;
}

function isInCheck(board, color) {
  // Find own king
  let kingC = -1,
    kingR = -1;
  const kingPiece = color === WHITE ? W_KING : B_KING;
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] === kingPiece) {
        kingC = c;
        kingR = r;
        break;
      }
    }
    if (kingC !== -1) break;
  }
  if (kingC === -1) return true; // King was captured
  return isSquareAttacked(board, kingC, kingR, getOpponent(color));
}

function isSquareAttacked(board, tc, tr, byColor) {
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      const piece = board[c][r];
      if (piece === EMPTY || getOwner(piece) !== byColor) continue;
      const attacks = getRawAttacks(board, c, r, piece);
      for (const a of attacks) {
        if (a.toC === tc && a.toR === tr) return true;
      }
    }
  }
  return false;
}

function getRawAttacks(board, c, r, piece) {
  if (isPawn(piece)) {
    const dir = isWhite(piece) ? -1 : 1;
    const attacks = [];
    if (inBounds(c - 1, r + dir)) attacks.push({ toC: c - 1, toR: r + dir });
    if (inBounds(c + 1, r + dir)) attacks.push({ toC: c + 1, toR: r + dir });
    return attacks;
  }
  if (isKnight(piece)) return getKnightAttacks(board, c, r, getOwner(piece));
  if (isBishop(piece)) return getDiagonalAttacks(board, c, r, getOwner(piece));
  if (isRook(piece)) return getOrthogonalAttacks(board, c, r, getOwner(piece));
  if (isQueen(piece))
    return getDiagonalAttacks(board, c, r, getOwner(piece)).concat(
      getOrthogonalAttacks(board, c, r, getOwner(piece))
    );
  if (isKing(piece)) return getKingAttacks(board, c, r, getOwner(piece));
  return [];
}

function getDiagonalAttacks(board, c, r, color) {
  const moves = [];
  const dirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (let d = 0; d < dirs.length; d++) {
    for (let i = 1; i < 8; i++) {
      const nc = c + dirs[d][0] * i,
        nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) {
        moves.push({ toC: nc, toR: nr });
      } else {
        moves.push({ toC: nc, toR: nr });
        break;
      }
    }
  }
  return moves;
}

function getOrthogonalAttacks(board, c, r, color) {
  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (let d = 0; d < dirs.length; d++) {
    for (let i = 1; i < 8; i++) {
      const nc = c + dirs[d][0] * i,
        nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) {
        moves.push({ toC: nc, toR: nr });
      } else {
        moves.push({ toC: nc, toR: nr });
        break;
      }
    }
  }
  return moves;
}

function getKnightAttacks(board, c, r, color) {
  const moves = [];
  const jumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (const j of jumps) {
    const nc = c + j[0],
      nr = r + j[1];
    if (inBounds(nc, nr)) moves.push({ toC: nc, toR: nr });
  }
  return moves;
}

function getKingAttacks(board, c, r, color) {
  const moves = [];
  const dirs = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  for (const d of dirs) {
    const nc = c + d[0],
      nr = r + d[1];
    if (inBounds(nc, nr)) moves.push({ toC: nc, toR: nr });
  }
  return moves;
}

function getLineMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (let d = 0; d < dirs.length; d++) {
    for (let i = 1; i < 8; i++) {
      const nc = c + dirs[d][0] * i,
        nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
      } else {
        if (getOwner(board[nc][nr]) !== color) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
        }
        break;
      }
    }
  }
  return moves;
}

function getDiagonalMoves(board, c, r, color) {
  const moves = [];
  const dirs = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
  for (let d = 0; d < dirs.length; d++) {
    for (let i = 1; i < 8; i++) {
      const nc = c + dirs[d][0] * i,
        nr = r + dirs[d][1] * i;
      if (!inBounds(nc, nr)) break;
      if (board[nc][nr] === EMPTY) {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
      } else {
        if (getOwner(board[nc][nr]) !== color) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
        }
        break;
      }
    }
  }
  return moves;
}

function getRookMoves(board, c, r, color) {
  return getLineMoves(board, c, r, color);
}
function getBishopMoves(board, c, r, color) {
  return getDiagonalMoves(board, c, r, color);
}
function getQueenMoves(board, c, r, color) {
  return getLineMoves(board, c, r, color).concat(getDiagonalMoves(board, c, r, color));
}

function getKnightMoves(board, c, r, color) {
  const moves = [];
  const jumps = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ];
  for (let i = 0; i < jumps.length; i++) {
    const nc = c + jumps[i][0],
      nr = r + jumps[i][1];
    if (inBounds(nc, nr) && (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color)) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  return moves;
}

function getKingMoves(board, c, r, color, hasMoved) {
  const moves = [];
  const dirs = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  for (const d of dirs) {
    const nc = c + d[0],
      nr = r + d[1];
    if (inBounds(nc, nr) && (board[nc][nr] === EMPTY || getOwner(board[nc][nr]) !== color)) {
      moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
    }
  }
  // Castling
  if (hasMoved && !hasMoved.has(c + "," + r)) {
    const row = r;
    // King-side castling (king-side)
    const kRookMoved = hasMoved.has("7," + row);
    const kPathClear = board[5][row] === EMPTY && board[6][row] === EMPTY;
    if (
      !kRookMoved &&
      kPathClear &&
      board[7][row] !== EMPTY &&
      isRook(board[7][row]) &&
      getOwner(board[7][row]) === color
    ) {
      if (
        !isSquareAttacked(board, 4, row, getOpponent(color)) &&
        !isSquareAttacked(board, 5, row, getOpponent(color)) &&
        !isSquareAttacked(board, 6, row, getOpponent(color))
      ) {
        moves.push({ fromC: c, fromR: r, toC: 6, toR: row, castling: true });
      }
    }
    // Queen-side castling (queen-side)
    const qRookMoved = hasMoved.has("0," + row);
    const qPathClear =
      board[1][row] === EMPTY && board[2][row] === EMPTY && board[3][row] === EMPTY;
    if (
      !qRookMoved &&
      qPathClear &&
      board[0][row] !== EMPTY &&
      isRook(board[0][row]) &&
      getOwner(board[0][row]) === color
    ) {
      if (
        !isSquareAttacked(board, 4, row, getOpponent(color)) &&
        !isSquareAttacked(board, 3, row, getOpponent(color)) &&
        !isSquareAttacked(board, 2, row, getOpponent(color))
      ) {
        moves.push({ fromC: c, fromR: r, toC: 2, toR: row, castling: true });
      }
    }
  }
  return moves;
}

function getPawnMoves(board, c, r, color, hasMoved, epTarget) {
  const moves = [];
  const dir = color === WHITE ? -1 : 1;
  const startRow = color === WHITE ? 6 : 1;
  const promoRow = color === WHITE ? 0 : 7;

  // Move forward one step
  if (inBounds(c, r + dir) && board[c][r + dir] === EMPTY) {
    if (r + dir === promoRow) {
      const promos =
        color === WHITE
          ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT]
          : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
      for (let p = 0; p < promos.length; p++) {
        moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir, promotion: promos[p] });
      }
    } else {
      moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir });
    }
    // Move forward two steps (starting position)
    if (r === startRow && board[c][r + dir * 2] === EMPTY) {
      moves.push({ fromC: c, fromR: r, toC: c, toR: r + dir * 2 });
    }
  }
  // Capture (diagonal forward)
  const diagDirs = [-1, 1];
  for (let d = 0; d < diagDirs.length; d++) {
    const nc = c + diagDirs[d],
      nr = r + dir;
    if (inBounds(nc, nr) && board[nc][nr] !== EMPTY && getOwner(board[nc][nr]) !== color) {
      if (nr === promoRow) {
        const promos =
          color === WHITE
            ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT]
            : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
        for (let p = 0; p < promos.length; p++) {
          moves.push({ fromC: c, fromR: r, toC: nc, toR: nr, promotion: promos[p] });
        }
      } else {
        moves.push({ fromC: c, fromR: r, toC: nc, toR: nr });
      }
    }
  }
  // En passant: available only immediately after the opponent double-stepped a
  // pawn past this one; the landing square is the one the enemy pawn skipped.
  if (epTarget && epTarget.r === r + dir && Math.abs(epTarget.c - c) === 1) {
    const victim = board[epTarget.c][r];
    if (victim !== EMPTY && isPawn(victim) && getOwner(victim) !== color) {
      moves.push({ fromC: c, fromR: r, toC: epTarget.c, toR: epTarget.r, enPassant: true });
    }
  }
  return moves;
}

function getAllMoves(board, color, hasMoved, epTarget) {
  const moves = [];
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) {
        const pieceMoves = getValidMoves(board, c, r, hasMoved, epTarget);
        for (const pm of pieceMoves) moves.push(pm);
      }
    }
  }
  return moves;
}

// ============================================================
// Win/loss detection
// ============================================================

function checkGameOver(board, nextPlayer, hasMoved, epTarget) {
  const moves = getAllMoves(board, nextPlayer, hasMoved, epTarget);
  if (moves.length === 0) {
    if (isInCheck(board, nextPlayer))
      return { winner: getOpponent(nextPlayer), reason: "checkmate" };
    return { winner: null, reason: "stalemate" };
  }
  // Check if king is captured (simplified check)
  let whiteKing = false,
    blackKing = false;
  for (let c = 0; c < BOARD_SIZE; c++) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[c][r] === W_KING) whiteKing = true;
      if (board[c][r] === B_KING) blackKing = true;
    }
  }
  if (!whiteKing) return { winner: BLACK, reason: "capture" };
  if (!blackKing) return { winner: WHITE, reason: "capture" };
  return null;
}

// ============================================================
// AI: Alpha-Beta Pruning
// ============================================================

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: WHITE,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    selectedPiece: null,
    validMoves: [],
    lastMove: null,
    hasMoved: new Set(),
    epTarget: null,
    promotionPending: null,
  };
}

// ============================================================
// Export for testing
// ============================================================

const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const { AI_DEPTH, getPositionValue, evaluateBoard, alphaBeta, getBestAIMove } = createGameAI({
  PIECE_VALUES,
  BOARD_SIZE,
  EMPTY,
  W_PAWN,
  W_KNIGHT,
  W_BISHOP,
  W_ROOK,
  W_QUEEN,
  W_KING,
  B_PAWN,
  B_KNIGHT,
  B_BISHOP,
  B_ROOK,
  B_QUEEN,
  B_KING,
  WHITE,
  BLACK,
  PIECE_SYMBOLS,
  PIECE_NAMES,
  PAWN_POS_WHITE,
  PAWN_POS_BLACK,
  KNIGHT_POS,
  BISHOP_POS,
  isWhite,
  isBlack,
  getOwner,
  getOpponent,
  getPlayerName,
  inBounds,
  isPawn,
  isKnight,
  isBishop,
  isRook,
  isQueen,
  isKing,
  createBoard,
  copyBoard,
  applyMove,
  getValidMoves,
  isInCheck,
  isSquareAttacked,
  getRawAttacks,
  getDiagonalAttacks,
  getOrthogonalAttacks,
  getKnightAttacks,
  getKingAttacks,
  getLineMoves,
  getDiagonalMoves,
  getRookMoves,
  getBishopMoves,
  getQueenMoves,
  getKnightMoves,
  getKingMoves,
  getPawnMoves,
  getAllMoves,
  checkGameOver,
  createGameState,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    W_PAWN: W_PAWN,
    W_KNIGHT: W_KNIGHT,
    W_BISHOP: W_BISHOP,
    W_ROOK: W_ROOK,
    W_QUEEN: W_QUEEN,
    W_KING: W_KING,
    B_PAWN: B_PAWN,
    B_KNIGHT: B_KNIGHT,
    B_BISHOP: B_BISHOP,
    B_ROOK: B_ROOK,
    B_QUEEN: B_QUEEN,
    B_KING: B_KING,
    WHITE: WHITE,
    BLACK: BLACK,
    AI_DEPTH: AI_DEPTH,
    isWhite: isWhite,
    isBlack: isBlack,
    getOwner: getOwner,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    inBounds: inBounds,
    createBoard: createBoard,
    copyBoard: copyBoard,
    applyMove: applyMove,
    getValidMoves: getValidMoves,
    getAllMoves: getAllMoves,
    isInCheck: isInCheck,
    isSquareAttacked: isSquareAttacked,
    getPawnMoves: getPawnMoves,
    getKnightMoves: getKnightMoves,
    getBishopMoves: getBishopMoves,
    getRookMoves: getRookMoves,
    getQueenMoves: getQueenMoves,
    getKingMoves: getKingMoves,
    checkGameOver: checkGameOver,
    evaluateBoard: evaluateBoard,
    alphaBeta: alphaBeta,
    getBestAIMove: getBestAIMove,
    createGameState: createGameState,
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
  let localPlayerRole = null; // 'host' | 'guest'
  let localTeam = null; // WHITE or BLACK
  let remoteTeam = null; // WHITE or BLACK
  const CELL_SIZE = 64;
  const PADDING = 24;
  const BOARD_PX = CELL_SIZE * BOARD_SIZE;
  const CANVAS_SIZE = BOARD_PX + PADDING * 2;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    if (window.devicePixelRatio > 1) {
      canvas.width = CANVAS_SIZE * window.devicePixelRatio;
      canvas.height = CANVAS_SIZE * window.devicePixelRatio;
      canvas.style.width = CANVAS_SIZE + "px";
      canvas.style.height = CANVAS_SIZE + "px";
    }
    context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    context.scale(ratio, ratio);
    drawBoard();
  }

  function toCanvasX(c) {
    const col = gameState && gameState.boardFlipped ? 7 - c : c;
    return PADDING + col * CELL_SIZE;
  }
  function toCanvasY(r) {
    const row = gameState && gameState.boardFlipped ? 7 - r : r;
    return PADDING + row * CELL_SIZE;
  }

  function drawBoard() {
    const lightColor = "#f0d9b5";
    const darkColor = "#b58863";
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        context.fillStyle = (c + r) % 2 === 0 ? lightColor : darkColor;
        context.fillRect(toCanvasX(c), toCanvasY(r), CELL_SIZE, CELL_SIZE);
      }
    }
    // Coordinate labels
    context.fillStyle = BoardGameTheme.PALETTE.carve;
    context.font = "11px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    const files = "abcdefgh";
    const flipped = gameState && gameState.boardFlipped;
    for (let c = 0; c < BOARD_SIZE; c++) {
      const fileIdx = flipped ? 7 - c : c;
      context.fillText(files[fileIdx], PADDING + c * CELL_SIZE + CELL_SIZE / 2, CANVAS_SIZE - 8);
    }
    for (let r = 0; r < BOARD_SIZE; r++) {
      const rankNum = flipped ? r + 1 : 8 - r;
      context.fillText(String(rankNum), 10, PADDING + r * CELL_SIZE + CELL_SIZE / 2);
    }
  }

  function drawPiece(c, r, piece) {
    const cx = toCanvasX(c) + CELL_SIZE / 2;
    const cy = toCanvasY(r) + CELL_SIZE / 2;
    const color = getOwner(piece);
    const radius = CELL_SIZE * 0.4;

    // Glossy piece body with the shared material treatment
    BoardGameTheme.glossyDisc(context, cx, cy, radius, color === WHITE ? "#f2f2f2" : "#2e2e2e", {
      rimWidth: 1.5,
    });

    // Unicode symbol
    context.fillStyle = color === WHITE ? "#2c2c2c" : "#fff";
    context.font = "bold " + Math.floor(CELL_SIZE * 0.55) + "px serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(PIECE_SYMBOLS[piece], cx, cy + 2);
  }

  function drawSelection(c, r) {
    context.strokeStyle = "#ffd600";
    context.lineWidth = 3;
    context.strokeRect(toCanvasX(c) + 1.5, toCanvasY(r) + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
  }

  function drawValidMoves(moves) {
    for (const m of moves) {
      const cx = toCanvasX(m.toC) + CELL_SIZE / 2;
      const cy = toCanvasY(m.toR) + CELL_SIZE / 2;
      if (gameState.board[m.toC][m.toR] !== EMPTY) {
        context.strokeStyle = "rgba(229, 57, 53, 0.7)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(cx, cy, CELL_SIZE * 0.42, 0, Math.PI * 2);
        context.stroke();
      } else if (m.castling) {
        context.fillStyle = "rgba(33, 150, 243, 0.6)";
        context.beginPath();
        context.arc(cx, cy, 8, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = "rgba(76, 175, 80, 0.5)";
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
    context.strokeRect(
      toCanvasX(move.fromC) + 1.5,
      toCanvasY(move.fromR) + 1.5,
      CELL_SIZE - 3,
      CELL_SIZE - 3
    );
    context.strokeRect(
      toCanvasX(move.toC) + 1.5,
      toCanvasY(move.toR) + 1.5,
      CELL_SIZE - 3,
      CELL_SIZE - 3
    );
  }

  function renderGame(state) {
    const ratio = window.devicePixelRatio || 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    drawBoard();
    if (state.lastMove) drawLastMove(state.lastMove);
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.c, state.selectedPiece.r);
      drawValidMoves(state.validMoves);
    }
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (state.board[c][r] !== EMPTY) drawPiece(c, r, state.board[c][r]);
      }
    }
    // Current acting side - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === WHITE ? BLACK : WHITE]
        : [WHITE, BLACK],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === WHITE ? "text-white-side" : "text-black-side");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("score-white").textContent = countPieces(state.board, WHITE);
    document.getElementById("score-black").textContent = countPieces(state.board, BLACK);
    if (state.mode === "pve") {
      const whiteLabel = state.playerTeam === WHITE ? "玩家（白方）：" : "电脑（白方）：";
      const blackLabel = state.playerTeam === BLACK ? "玩家（黑方）：" : "电脑（黑方）：";
      document.getElementById("label-white").textContent = whiteLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else if (state.mode === "online") {
      const whiteLabel = state.localTeam === WHITE ? "你（白方）：" : "对方（白方）：";
      const blackLabel = state.localTeam === BLACK ? "你（黑方）：" : "对方（黑方）：";
      document.getElementById("label-white").textContent = whiteLabel;
      document.getElementById("label-black").textContent = blackLabel;
    } else {
      document.getElementById("label-white").textContent = "白方：";
      document.getElementById("label-black").textContent = "黑方：";
    }
    if (state.gameOver) updateMessage("游戏结束！", "info");
    else if (state.aiThinking) updateMessage("电脑正在思考...", "info");
    else if (state.mode === "pve" && state.currentPlayer === state.aiTeam)
      updateMessage("轮到电脑行动", "info");
    else if (state.promotionPending) updateMessage("选择升变棋子", "info");
    else updateMessage("轮到 " + label.text + " 行动", "info");
  }

  function countPieces(board, color) {
    let count = 0;
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r < BOARD_SIZE; r++) {
        if (board[c][r] !== EMPTY && getOwner(board[c][r]) === color) count++;
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
      // Play victory/lose sound
      const isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
      SoundManager.play(isPlayerWin ? "victory" : "lose");
      // Show 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP) instead of color
      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.winner,
        playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === WHITE ? BLACK : WHITE]
          : [WHITE, BLACK],
      });
      winnerText.textContent = label.text + " 获胜！";
      winnerText.className = state.winner === WHITE ? "text-white-side" : "text-black-side";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "和棋！";
      winnerText.className = "";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;
    if (gameState.promotionPending) return;

    const rect = canvas.getBoundingClientRect();
    // rect is in CSS pixels and so are PADDING/CELL_SIZE; do NOT multiply by devicePixelRatio.
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    let col = Math.floor((px - PADDING) / CELL_SIZE);
    let row = Math.floor((py - PADDING) / CELL_SIZE);
    if (!inBounds(col, row)) return;
    if (gameState.boardFlipped) {
      col = 7 - col;
      row = 7 - row;
    }

    const piece = gameState.board[col][row];

    if (gameState.selectedPiece) {
      const move = findMove(gameState.validMoves, col, row);
      if (move) {
        if (move.promotion) {
          showPromotionDialog(move);
          return;
        }
        doMove(move);
        if (gameState.mode === "online" && networkProtocol) {
          const actionData = {
            a: "move",
            fc: move.fromC,
            fr: move.fromR,
            tc: move.toC,
            tr: move.toR,
          };
          if (move.castling) actionData.castling = true;
          networkProtocol.sendAction(actionData);
        }
        return;
      }
    }

    if (piece !== EMPTY && getOwner(piece) === gameState.currentPlayer) {
      const moves = getValidMoves(
        gameState.board,
        col,
        row,
        gameState.hasMoved,
        gameState.epTarget
      );
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

  function showPromotionDialog(move) {
    gameState.promotionPending = move;
    const color = getOwner(gameState.board[move.fromC][move.fromR]);
    const overlay = document.getElementById("promotion-overlay");
    const btns = overlay.querySelectorAll(".promo-btn");
    const pieces =
      color === WHITE
        ? [W_QUEEN, W_ROOK, W_BISHOP, W_KNIGHT]
        : [B_QUEEN, B_ROOK, B_BISHOP, B_KNIGHT];
    for (let i = 0; i < btns.length; i++) {
      btns[i].dataset.promo = pieces[i];
      btns[i].textContent = PIECE_SYMBOLS[pieces[i]];
    }
    overlay.style.display = "flex";
  }

  function handlePromotion(promoPiece) {
    document.getElementById("promotion-overlay").style.display = "none";
    const move = gameState.promotionPending;
    if (!move) return;
    move.promotion = Number.parseInt(promoPiece);
    gameState.promotionPending = null;
    doMove(move);
    if (gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendAction({
        a: "move",
        fc: move.fromC,
        fr: move.fromR,
        tc: move.toC,
        tr: move.toR,
        promo: move.promotion,
      });
    }
  }

  function findMove(moves, toC, toR) {
    // Prefer non-promotion moves, promotion moves need dialog
    for (const move of moves) {
      if (move.toC === toC && move.toR === toR && !move.promotion) return move;
    }
    // If only promotion moves, return first (triggers promotion dialog)
    for (const move of moves) {
      if (move.toC === toC && move.toR === toR) return move;
    }
    return null;
  }

  function doMove(move) {
    // Play sound based on move type
    const targetPiece = gameState.board[move.toC][move.toR];
    if (targetPiece !== EMPTY) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }

    // Track the skipped square so the opponent can capture en passant next move
    const movedPiece = gameState.board[move.fromC][move.fromR];
    gameState.epTarget =
      isPawn(movedPiece) && Math.abs(move.toR - move.fromR) === 2
        ? { c: move.fromC, r: (move.fromR + move.toR) / 2 }
        : null;

    gameState.hasMoved.add(move.fromC + "," + move.fromR);
    gameState.hasMoved.add(move.toC + "," + move.toR);
    if (move.castling) {
      const rookFromC = move.toC === 6 ? 7 : 0;
      gameState.hasMoved.add(rookFromC + "," + move.toR);
    }
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
  }

  function endTurn() {
    const nextPlayer = getOpponent(gameState.currentPlayer);
    const gameOverResult = checkGameOver(
      gameState.board,
      nextPlayer,
      gameState.hasMoved,
      gameState.epTarget
    );
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
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) triggerAI();
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, gameState.aiTeam, gameState.hasMoved);
      gameState.aiThinking = false;
      if (move) {
        // Play sound based on move type
        const targetPiece = gameState.board[move.toC][move.toR];
        if (targetPiece !== EMPTY) {
          SoundManager.play("take");
        } else {
          SoundManager.play("slide");
        }
        // Track the skipped square so the opponent can capture en passant next move
        const movedPiece = gameState.board[move.fromC][move.fromR];
        gameState.epTarget =
          isPawn(movedPiece) && Math.abs(move.toR - move.fromR) === 2
            ? { c: move.fromC, r: (move.fromR + move.toR) / 2 }
            : null;
        gameState.hasMoved.add(move.fromC + "," + move.fromR);
        gameState.hasMoved.add(move.toC + "," + move.toR);
        if (move.castling) {
          const rookFromC = move.toC === 6 ? 7 : 0;
          gameState.hasMoved.add(rookFromC + "," + move.toR);
        }
        gameState.board = applyMove(gameState.board, move);
        gameState.lastMove = move;
        gameState.turnCount++;
      }
      endTurn();
    }, 300);
  }

  function startGame(mode, playerTeam) {
    gameState = createGameState(mode);
    gameState.currentPlayer = WHITE; // White always moves first
    gameState.firstPlayer = WHITE;
    gameState.boardFlipped = false;
    if (mode === "pve") {
      gameState.playerTeam = playerTeam || WHITE;
      gameState.aiTeam = getOpponent(gameState.playerTeam);
      gameState.boardFlipped = gameState.playerTeam === BLACK;
    }
    document.getElementById("mode-selection").style.display = "none";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "flex";
    document.getElementById("rule-pve").style.display = mode === "pve" ? "block" : "none";
    document.getElementById("game-over").style.display = "none";
    document.getElementById("promotion-overlay").style.display = "none";
    initBoard();
    renderGame(gameState);
    canvas.onclick = handleCanvasClick;
    if (mode === "pve" && gameState.currentPlayer === gameState.aiTeam) triggerAI();
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
      (iWin ? "，你赢了！你先手(白方)。" : "，你输了！对方先手(白方)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = WHITE;
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
    document.getElementById("promotion-overlay").style.display = "none";

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
    if (actionData.promo) move.promotion = actionData.promo;
    if (actionData.castling) move.castling = true;
    doMove(move);
  }

  function handleDisconnect() {
    if (gameState && !gameState.gameOver) {
      gameState.gameOver = true;
      updateMessage("对方已断开连接", "error");
      SoundManager.play("victory");
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
          "，你赢了！你先手(白方)。";
        setTimeout(() => {
          startGame("pve", WHITE);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(白方)。";
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
      document.getElementById("rps-p" + player + "-status").textContent =
        "已选择：" + getRPSName(choice);
      if (rpsChoices.player1 && rpsChoices.player2) {
        const resultEl = document.getElementById("rps-result");
        const winner = judgeRPS(rpsChoices.player1, rpsChoices.player2);
        if (winner === 1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家1赢了！玩家1先手(白方)。";
          setTimeout(() => {
            startGame("pvp", WHITE);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent = "玩家2赢了！玩家2先手(白方)。";
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
        handleRPSChoice(ev.target.dataset.player, ev.target.dataset.choice, ev);
      });
    });
    document.getElementById("btn-restart").addEventListener("click", restartGame);
    document.querySelectorAll(".promo-btn").forEach((button) => {
      button.addEventListener("click", (ev) => {
        handlePromotion(ev.target.dataset.promo);
      });
    });
    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
    document.getElementById("promotion-overlay").style.display = "none";
  });
}
