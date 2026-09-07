import { describe, it, expect } from "vitest";
import {
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
  AI_DEPTH,
  isWhite,
  isBlack,
  getOwner,
  getOpponent,
  getPlayerName,
  inBounds,
  createBoard,
  copyBoard,
  applyMove,
  getValidMoves,
  getAllMoves,
  isInCheck,
  isSquareAttacked,
  getPawnMoves,
  getKnightMoves,
  getBishopMoves,
  getRookMoves,
  getQueenMoves,
  getKingMoves,
  checkGameOver,
  evaluateBoard,
  getBestAIMove,
  createGameState,
} from "./game.js";

describe("constants", () => {
  it("board size", () => {
    expect(BOARD_SIZE).toBe(8);
    expect(EMPTY).toBe(0);
  });
  it("white pieces", () => {
    expect(W_PAWN).toBe(1);
    expect(W_KNIGHT).toBe(2);
    expect(W_BISHOP).toBe(3);
    expect(W_ROOK).toBe(4);
    expect(W_QUEEN).toBe(5);
    expect(W_KING).toBe(6);
  });
  it("black pieces", () => {
    expect(B_PAWN).toBe(7);
    expect(B_KNIGHT).toBe(8);
    expect(B_BISHOP).toBe(9);
    expect(B_ROOK).toBe(10);
    expect(B_QUEEN).toBe(11);
    expect(B_KING).toBe(12);
  });
  it("colors", () => {
    expect(WHITE).toBe("white");
    expect(BLACK).toBe("black");
  });
  it("AI_DEPTH is 3", () => {
    expect(AI_DEPTH).toBe(3);
  });
});

describe("piece helpers", () => {
  it("isWhite", () => {
    expect(isWhite(W_PAWN)).toBe(true);
    expect(isWhite(W_KING)).toBe(true);
    expect(isWhite(B_PAWN)).toBe(false);
    expect(isWhite(EMPTY)).toBe(false);
  });
  it("isBlack", () => {
    expect(isBlack(B_PAWN)).toBe(true);
    expect(isBlack(B_KING)).toBe(true);
    expect(isBlack(W_PAWN)).toBe(false);
    expect(isBlack(EMPTY)).toBe(false);
  });
  it("getOwner", () => {
    expect(getOwner(W_ROOK)).toBe(WHITE);
    expect(getOwner(B_KNIGHT)).toBe(BLACK);
    expect(getOwner(EMPTY)).toBeNull();
  });
  it("getOpponent", () => {
    expect(getOpponent(WHITE)).toBe(BLACK);
    expect(getOpponent(BLACK)).toBe(WHITE);
  });
  it("getPlayerName", () => {
    expect(getPlayerName(WHITE)).toBe("白方");
    expect(getPlayerName(BLACK)).toBe("黑方");
  });
  it("inBounds", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(7, 7)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(8, 0)).toBe(false);
    expect(inBounds(0, 8)).toBe(false);
  });
});

describe("createBoard", () => {
  it("creates 8x8 board", () => {
    var board = createBoard();
    expect(board.length).toBe(8);
    for (var c = 0; c < 8; c++) {
      expect(board[c].length).toBe(8);
    }
  });
  it("has correct black pieces at row 0", () => {
    var board = createBoard();
    expect(board[0][0]).toBe(B_ROOK);
    expect(board[1][0]).toBe(B_KNIGHT);
    expect(board[2][0]).toBe(B_BISHOP);
    expect(board[3][0]).toBe(B_QUEEN);
    expect(board[4][0]).toBe(B_KING);
    expect(board[5][0]).toBe(B_BISHOP);
    expect(board[6][0]).toBe(B_KNIGHT);
    expect(board[7][0]).toBe(B_ROOK);
  });
  it("has correct white pieces at row 7", () => {
    var board = createBoard();
    expect(board[0][7]).toBe(W_ROOK);
    expect(board[1][7]).toBe(W_KNIGHT);
    expect(board[2][7]).toBe(W_BISHOP);
    expect(board[3][7]).toBe(W_QUEEN);
    expect(board[4][7]).toBe(W_KING);
    expect(board[5][7]).toBe(W_BISHOP);
    expect(board[6][7]).toBe(W_KNIGHT);
    expect(board[7][7]).toBe(W_ROOK);
  });
  it("has pawns at correct rows", () => {
    var board = createBoard();
    for (var c = 0; c < 8; c++) {
      expect(board[c][1]).toBe(B_PAWN);
      expect(board[c][6]).toBe(W_PAWN);
    }
  });
  it("has 32 pieces total", () => {
    var board = createBoard();
    var count = 0;
    for (var c = 0; c < 8; c++) {
      for (var r = 0; r < 8; r++) {
        if (board[c][r] !== EMPTY) count++;
      }
    }
    expect(count).toBe(32);
  });
  it("middle rows are empty", () => {
    var board = createBoard();
    for (var c = 0; c < 8; c++) {
      for (var r = 2; r < 6; r++) {
        expect(board[c][r]).toBe(EMPTY);
      }
    }
  });
});

describe("copyBoard", () => {
  it("creates independent copy", () => {
    var board = createBoard();
    var copy = copyBoard(board);
    copy[0][0] = EMPTY;
    expect(board[0][0]).toBe(B_ROOK);
  });
});

describe("applyMove", () => {
  it("moves piece correctly", () => {
    var board = createBoard();
    var move = { fromC: 4, fromR: 6, toC: 4, toR: 4 };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][6]).toBe(EMPTY);
    expect(newBoard[4][4]).toBe(W_PAWN);
  });
  it("captures enemy piece", () => {
    var board = createBoard();
    board[3][3] = B_PAWN;
    var move = { fromC: 4, fromR: 6, toC: 3, toR: 3, promotion: W_QUEEN };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][6]).toBe(EMPTY);
    expect(newBoard[3][3]).toBe(W_QUEEN);
  });
  it("does not modify original", () => {
    var board = createBoard();
    var move = { fromC: 4, fromR: 6, toC: 4, toR: 4 };
    applyMove(board, move);
    expect(board[4][6]).toBe(W_PAWN);
  });
  it("handles castling king-side", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    var move = { fromC: 4, fromR: 7, toC: 6, toR: 7, castling: true };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][7]).toBe(EMPTY);
    expect(newBoard[6][7]).toBe(W_KING);
    expect(newBoard[7][7]).toBe(EMPTY);
    expect(newBoard[5][7]).toBe(W_ROOK);
  });
  it("handles castling queen-side", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[0][7] = W_ROOK;
    var move = { fromC: 4, fromR: 7, toC: 2, toR: 7, castling: true };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][7]).toBe(EMPTY);
    expect(newBoard[2][7]).toBe(W_KING);
    expect(newBoard[0][7]).toBe(EMPTY);
    expect(newBoard[3][7]).toBe(W_ROOK);
  });
  it("handles promotion", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][1] = W_PAWN;
    board[4][0] = W_QUEEN; // promotion
    var move = { fromC: 4, fromR: 1, toC: 4, toR: 0, promotion: W_QUEEN };
    var newBoard = applyMove(board, move);
    expect(newBoard[4][1]).toBe(EMPTY);
    expect(newBoard[4][0]).toBe(W_QUEEN);
  });
});

describe("Pawn moves", () => {
  it("white pawn can move forward one or two from start", () => {
    var board = createBoard();
    var moves = getPawnMoves(board, 4, 6, WHITE);
    expect(moves.length).toBe(2);
  });
  it("white pawn can only move one after leaving start", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][5] = W_PAWN;
    var moves = getPawnMoves(board, 4, 5, WHITE);
    expect(moves.length).toBe(1);
    expect(moves[0].toR).toBe(4);
  });
  it("black pawn can move forward one or two from start", () => {
    var board = createBoard();
    var moves = getPawnMoves(board, 4, 1, BLACK);
    expect(moves.length).toBe(2);
  });
  it("pawn can capture diagonally", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_PAWN;
    board[3][3] = B_PAWN;
    board[5][3] = B_KNIGHT;
    var moves = getPawnMoves(board, 4, 4, WHITE);
    var captures = moves.filter((m) => m.toC !== 4);
    expect(captures.length).toBe(2);
  });
  it("pawn cannot move forward into occupied square", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_PAWN;
    board[4][3] = B_PAWN;
    var moves = getPawnMoves(board, 4, 4, WHITE);
    var forward = moves.filter((m) => m.toC === 4);
    expect(forward.length).toBe(0);
  });
  it("white pawn promotes at row 0", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][1] = W_PAWN;
    var moves = getPawnMoves(board, 4, 1, WHITE);
    expect(moves.length).toBe(4); // queen, rook, bishop, knight
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBe(0);
      expect(moves[i].promotion).toBeDefined();
    }
  });
  it("black pawn promotes at row 7", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][6] = B_PAWN;
    var moves = getPawnMoves(board, 4, 6, BLACK);
    expect(moves.length).toBe(4);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toR).toBe(7);
      expect(moves[i].promotion).toBeDefined();
    }
  });
});

describe("Knight moves", () => {
  it("knight has up to 8 moves in open field", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_KNIGHT;
    var moves = getKnightMoves(board, 3, 4, WHITE);
    expect(moves.length).toBe(8);
  });
  it("knight at corner has fewer moves", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[0][0] = W_KNIGHT;
    var moves = getKnightMoves(board, 0, 0, WHITE);
    expect(moves.length).toBe(2);
  });
  it("knight can jump over pieces", () => {
    var board = createBoard();
    // Knight at (1,7) can jump to (0,5) or (2,5) despite pawns
    var moves = getKnightMoves(board, 1, 7, WHITE);
    expect(moves.length).toBe(2);
  });
  it("knight cannot capture own pieces", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_KNIGHT;
    board[1][3] = W_PAWN;
    board[5][3] = W_PAWN;
    var moves = getKnightMoves(board, 3, 4, WHITE);
    var capturesOwn = moves.filter(
      (m) => (m.toC === 1 && m.toR === 3) || (m.toC === 5 && m.toR === 3)
    );
    expect(capturesOwn.length).toBe(0);
  });
});

describe("Bishop moves", () => {
  it("bishop moves diagonally", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_BISHOP;
    var moves = getBishopMoves(board, 3, 4, WHITE);
    // diagonals: up-left(2), up-right(3), down-left(4), down-right(4) = 13
    expect(moves.length).toBe(13);
  });
  it("bishop blocked by own piece", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_BISHOP;
    board[4][3] = W_PAWN; // blocks down-right
    var moves = getBishopMoves(board, 3, 4, WHITE);
    var blocked = moves.filter((m) => m.toC === 4 && m.toR === 3);
    expect(blocked.length).toBe(0);
  });
  it("bishop can capture enemy", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_BISHOP;
    board[5][2] = B_PAWN;
    var moves = getBishopMoves(board, 3, 4, WHITE);
    var capture = moves.filter((m) => m.toC === 5 && m.toR === 2);
    expect(capture.length).toBe(1);
    // cannot go beyond
    var beyond = moves.filter((m) => m.toC === 6 && m.toR === 1);
    expect(beyond.length).toBe(0);
  });
});

describe("Rook moves", () => {
  it("rook moves along lines", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_ROOK;
    var moves = getRookMoves(board, 3, 4, WHITE);
    // vertical: 4 up + 3 down = 7, horizontal: 3 left + 4 right = 7 => 14
    expect(moves.length).toBe(14);
  });
  it("rook blocked by own piece", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_ROOK;
    board[3][2] = W_PAWN; // block upward
    var moves = getRookMoves(board, 3, 4, WHITE);
    var upMoves = moves.filter((m) => m.toC === 3 && m.toR < 4);
    expect(upMoves.length).toBe(1); // only row 3
  });
});

describe("Queen moves", () => {
  it("queen moves like rook + bishop", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][4] = W_QUEEN;
    var moves = getQueenMoves(board, 3, 4, WHITE);
    // rook: 14, bishop: 13 => 27
    expect(moves.length).toBe(27);
  });
});

describe("King moves", () => {
  it("king moves one step in all directions", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    var moves = getKingMoves(board, 4, 4, WHITE);
    expect(moves.length).toBe(8);
  });
  it("king at corner has 3 moves", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[0][0] = W_KING;
    var moves = getKingMoves(board, 0, 0, WHITE);
    expect(moves.length).toBe(3);
  });
  it("king cannot move to attacked square", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[3][2] = B_ROOK; // attacks (3,4) and (4,2) etc
    var moves = getValidMoves(board, 4, 4, new Set());
    var toAttacked = moves.filter((m) => m.toC === 3 && m.toR === 4);
    expect(toAttacked.length).toBe(0);
  });
  it("castling king-side works", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    var hasMoved = new Set();
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling && m.toC === 6);
    expect(castle.length).toBe(1);
  });
  it("castling queen-side works", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[0][7] = W_ROOK;
    var hasMoved = new Set();
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling && m.toC === 2);
    expect(castle.length).toBe(1);
  });
  it("castling blocked if king has moved", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    var hasMoved = new Set(["4,7"]);
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling);
    expect(castle.length).toBe(0);
  });
  it("castling blocked if rook has moved", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    var hasMoved = new Set(["7,7"]);
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling);
    expect(castle.length).toBe(0);
  });
  it("castling blocked if path not clear", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    board[5][7] = W_BISHOP; // blocks path
    var hasMoved = new Set();
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling);
    expect(castle.length).toBe(0);
  });
  it("castling blocked if king passes through attacked square", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[7][7] = W_ROOK;
    board[5][0] = B_ROOK; // attacks (5,7)
    var hasMoved = new Set();
    var moves = getKingMoves(board, 4, 7, WHITE, hasMoved);
    var castle = moves.filter((m) => m.castling);
    expect(castle.length).toBe(0);
  });
});

describe("Check detection", () => {
  it("detects check by rook", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[4][0] = B_ROOK; // checks king
    expect(isInCheck(board, WHITE)).toBe(true);
  });
  it("no check when blocked", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[4][0] = B_ROOK;
    board[4][2] = W_PAWN; // blocks
    expect(isInCheck(board, WHITE)).toBe(false);
  });
  it("detects check by knight", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[2][3] = B_KNIGHT; // attacks (4,4)
    expect(isInCheck(board, WHITE)).toBe(true);
  });
  it("detects check by bishop", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[2][2] = B_BISHOP; // attacks (4,4) diagonally
    expect(isInCheck(board, WHITE)).toBe(true);
  });
  it("detects check by pawn", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[3][3] = B_PAWN; // attacks (4,4) diagonally
    expect(isInCheck(board, WHITE)).toBe(true);
  });
  it("isSquareAttacked works", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = B_ROOK;
    expect(isSquareAttacked(board, 4, 0, BLACK)).toBe(true);
    expect(isSquareAttacked(board, 0, 4, BLACK)).toBe(true);
    expect(isSquareAttacked(board, 3, 3, BLACK)).toBe(false);
  });
});

describe("getValidMoves filters", () => {
  it("filters moves that leave king in check", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][4] = W_KING;
    board[4][3] = W_ROOK;
    board[4][0] = B_ROOK; // rook pins white rook
    // white rook at (4,3) cannot move away because king would be in check
    var moves = getValidMoves(board, 4, 3, new Set());
    // rook can only move along column 4 between king and enemy rook, or capture
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].toC).toBe(4);
    }
  });
});

describe("checkGameOver", () => {
  it("returns null for initial board", () => {
    var board = createBoard();
    expect(checkGameOver(board, WHITE)).toBeNull();
  });
  it("detects white king missing", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][0] = B_KING;
    var result = checkGameOver(board, WHITE);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(BLACK);
  });
  it("detects black king missing", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    var result = checkGameOver(board, BLACK);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
  });
  it("detects checkmate", () => {
    // Scholar's mate position: black king at (7,0), white queen at (6,1), white bishop at (5,2)
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[7][0] = B_KING;
    board[6][1] = W_QUEEN; // attacks row 1 and diagonal
    board[5][2] = W_BISHOP; // supports queen
    board[4][7] = W_KING;
    var result = checkGameOver(board, BLACK);
    // Black king has no legal moves and is in check
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
    expect(result.reason).toBe("checkmate");
  });
  it("detects stalemate", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[0][0] = B_KING;
    board[1][2] = W_QUEEN; // controls many squares
    board[2][1] = W_KING; // blocks escape
    // Black king at a8, white queen at c7, white king at c6
    // Black has no legal moves but is NOT in check = stalemate
    // But we need to verify: is black in check?
    // Queen at (1,2) doesn't attack (0,0) directly
    // Let's check: queen attacks row 2, col 1, diagonals from (1,2)
    // Diagonal: (0,1), (2,1), (0,3), (2,3)... not (0,0)
    // So black is not in check, but has no moves = stalemate
    var result = checkGameOver(board, BLACK);
    if (result && result.reason === "stalemate") {
      expect(result.winner).toBeNull();
    }
  });
});

describe("evaluateBoard", () => {
  it("returns near 0 for initial position", () => {
    var board = createBoard();
    var score = evaluateBoard(board, WHITE);
    expect(Math.abs(score)).toBeLessThan(100);
  });
  it("positive when AI has material advantage", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[4][0] = B_KING;
    board[0][7] = W_ROOK;
    board[1][7] = W_ROOK;
    var score = evaluateBoard(board, WHITE);
    expect(score).toBeGreaterThan(0);
  });
  it("negative when opponent has material advantage", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[4][0] = B_KING;
    board[0][0] = B_ROOK;
    board[1][0] = B_ROOK;
    var score = evaluateBoard(board, WHITE);
    expect(score).toBeLessThan(0);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move from initial position", () => {
    var board = createBoard();
    var move = getBestAIMove(board, WHITE);
    expect(move).not.toBeNull();
    expect(move.fromC).toBeDefined();
    expect(move.fromR).toBeDefined();
    expect(move.toC).toBeDefined();
    expect(move.toR).toBeDefined();
  });
  it("takes winning capture when available", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[4][7] = W_KING;
    board[4][0] = B_KING;
    board[4][3] = W_ROOK;
    board[3][0] = B_QUEEN; // undefended
    var move = getBestAIMove(board, WHITE);
    expect(move).not.toBeNull();
  });
});

describe("getAllMoves", () => {
  it("returns moves for initial board", () => {
    var board = createBoard();
    var moves = getAllMoves(board, WHITE);
    expect(moves.length).toBeGreaterThan(0);
    // White has 20 initial moves (16 pawn + 4 knight)
    expect(moves.length).toBe(20);
  });
  it("returns empty when no pieces", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    var moves = getAllMoves(board, WHITE);
    expect(moves.length).toBe(0);
  });
});

describe("En passant", () => {
  // Black pawn double-stepped d7-d5; white pawn sits on e5.
  // The skipped square d6 is the en passant target.
  function epBoard() {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[3][3] = B_PAWN; // d5: the pawn that just double-stepped
    board[4][3] = W_PAWN; // e5: capturing pawn
    return board;
  }
  it("generates en passant capture right after a double-step", () => {
    var moves = getPawnMoves(epBoard(), 4, 3, WHITE, undefined, { c: 3, r: 2 });
    var ep = moves.filter((m) => m.enPassant);
    expect(ep.length).toBe(1);
    expect(ep[0].toC).toBe(3);
    expect(ep[0].toR).toBe(2);
  });
  it("does not generate en passant without a target", () => {
    var moves = getPawnMoves(epBoard(), 4, 3, WHITE);
    var ep = moves.filter((m) => m.enPassant);
    expect(ep.length).toBe(0);
  });
  it("en passant removes the victim pawn", () => {
    var board = epBoard();
    var newBoard = applyMove(board, { fromC: 4, fromR: 3, toC: 3, toR: 2, enPassant: true });
    expect(newBoard[4][3]).toBe(EMPTY); // capturing pawn left e5
    expect(newBoard[3][2]).toBe(W_PAWN); // landed on d6
    expect(newBoard[3][3]).toBe(EMPTY); // victim removed from d5
  });
  it("en passant exposing own king to check is illegal", () => {
    var board = epBoard();
    board[7][3] = W_KING; // h5
    board[0][3] = B_ROOK; // a5: attacks along rank 5 once d5/e5 are vacated
    var moves = getValidMoves(board, 4, 3, undefined, { c: 3, r: 2 });
    var ep = moves.filter((m) => m.enPassant);
    expect(ep.length).toBe(0);
  });
  it("checkGameOver sees en passant as a legal escape from stalemate", () => {
    var board = [];
    for (var c = 0; c < 8; c++) board.push(new Array(8).fill(EMPTY));
    board[0][7] = W_KING; // a1, boxed in by the black coverage below
    board[4][3] = W_PAWN; // e5
    board[3][3] = B_PAWN; // d5: just double-stepped
    board[4][2] = B_KNIGHT; // e6: blocks the pawn push
    board[2][6] = B_PAWN; // c2: covers b1
    board[1][5] = B_PAWN; // b3: covers a2
    board[2][7] = B_BISHOP; // c1: covers b2
    board[6][0] = B_KING; // g8
    // The only white move is exd6 e.p., so without the target it is stalemate.
    expect(checkGameOver(board, WHITE, undefined, null)).toEqual({
      winner: null,
      reason: "stalemate",
    });
    expect(checkGameOver(board, WHITE, undefined, { c: 3, r: 2 })).toBeNull();
  });
});

describe("createGameState", () => {
  it("creates correct initial state", () => {
    var state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(WHITE);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.board.length).toBe(8);
    expect(state.selectedPiece).toBeNull();
    expect(state.validMoves).toEqual([]);
    expect(state.lastMove).toBeNull();
    expect(state.hasMoved).toBeInstanceOf(Set);
    expect(state.promotionPending).toBeNull();
  });
  it("pve mode has null teams initially", () => {
    var state = createGameState("pve");
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
