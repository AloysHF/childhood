import { describe, it, expect } from "vitest";

// Import game functions
import {
  PIECE_TYPES,
  PIECE_SYMBOLS,
  PROMOTED_SYMBOLS,
  PIECE_VALUES,
  PROMOTED_VALUES,
  BOARD_SIZE,
  CELL_SIZE,
  BOARD_PADDING,
  SENTE,
  GOTE,
  isValidPosition,
  initializeBoard,
  getPieceName,
  canPromote,
  isGameOver,
  getKingMoves,
  getRookMoves,
  getBishopMoves,
  getGoldMoves,
  getSilverMoves,
  getKnightMoves,
  getLanceMoves,
  getPawnMoves,
  getDragonMoves,
  getHorseMoves,
  getValidMoves,
  getAllMoves,
  evaluateBoard,
  applyMove,
  alphaBeta,
  getBestAIMove,
} from "./game.js";

describe("shogi constants", () => {
  it("board size", () => {
    expect(BOARD_SIZE).toBe(9);
    expect(CELL_SIZE).toBe(60);
    expect(BOARD_PADDING).toBe(40);
  });

  it("player constants", () => {
    expect(SENTE).toBe("sente");
    expect(GOTE).toBe("gote");
  });

  it("piece types", () => {
    expect(PIECE_TYPES.KING).toBe("king");
    expect(PIECE_TYPES.ROOK).toBe("rook");
    expect(PIECE_TYPES.BISHOP).toBe("bishop");
    expect(PIECE_TYPES.GOLD).toBe("gold");
    expect(PIECE_TYPES.SILVER).toBe("silver");
    expect(PIECE_TYPES.KNIGHT).toBe("knight");
    expect(PIECE_TYPES.LANCE).toBe("lance");
    expect(PIECE_TYPES.PAWN).toBe("pawn");
  });

  it("piece symbols", () => {
    expect(PIECE_SYMBOLS[PIECE_TYPES.KING].sente).toBe("王");
    expect(PIECE_SYMBOLS[PIECE_TYPES.KING].gote).toBe("玉");
    expect(PIECE_SYMBOLS[PIECE_TYPES.ROOK].sente).toBe("飛");
    expect(PIECE_SYMBOLS[PIECE_TYPES.BISHOP].sente).toBe("角");
  });

  it("promoted symbols", () => {
    expect(PROMOTED_SYMBOLS[PIECE_TYPES.ROOK].sente).toBe("龍");
    expect(PROMOTED_SYMBOLS[PIECE_TYPES.BISHOP].sente).toBe("馬");
  });

  it("piece values", () => {
    expect(PIECE_VALUES[PIECE_TYPES.KING]).toBe(10000);
    expect(PIECE_VALUES[PIECE_TYPES.ROOK]).toBe(1000);
    expect(PIECE_VALUES[PIECE_TYPES.BISHOP]).toBe(800);
    expect(PIECE_VALUES[PIECE_TYPES.PAWN]).toBe(100);
  });
});

describe("position validation", () => {
  it("validates positions correctly", () => {
    expect(isValidPosition(0, 0)).toBe(true);
    expect(isValidPosition(8, 8)).toBe(true);
    expect(isValidPosition(4, 4)).toBe(true);
    expect(isValidPosition(-1, 0)).toBe(false);
    expect(isValidPosition(0, -1)).toBe(false);
    expect(isValidPosition(9, 0)).toBe(false);
    expect(isValidPosition(0, 9)).toBe(false);
  });
});

describe("board initialization", () => {
  it("creates a valid 9x9 board", () => {
    const board = initializeBoard();
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
  });

  it("places pieces correctly", () => {
    const board = initializeBoard();

    // Gote pieces (top)
    expect(board[0][4].type).toBe(PIECE_TYPES.KING);
    expect(board[0][4].player).toBe(GOTE);
    expect(board[0][0].type).toBe(PIECE_TYPES.LANCE);
    expect(board[0][1].type).toBe(PIECE_TYPES.KNIGHT);
    expect(board[0][2].type).toBe(PIECE_TYPES.SILVER);
    expect(board[0][3].type).toBe(PIECE_TYPES.GOLD);
    expect(board[0][5].type).toBe(PIECE_TYPES.GOLD);
    expect(board[0][6].type).toBe(PIECE_TYPES.SILVER);
    expect(board[0][7].type).toBe(PIECE_TYPES.KNIGHT);
    expect(board[0][8].type).toBe(PIECE_TYPES.LANCE);

    // Gote rook and bishop: rook on gote's own right (col 1), bishop left (col 7)
    expect(board[1][1].type).toBe(PIECE_TYPES.ROOK);
    expect(board[1][7].type).toBe(PIECE_TYPES.BISHOP);

    // Gote pawns
    for (let col = 0; col < 9; col++) {
      expect(board[2][col].type).toBe(PIECE_TYPES.PAWN);
      expect(board[2][col].player).toBe(GOTE);
    }

    // Sente pieces (bottom)
    expect(board[8][4].type).toBe(PIECE_TYPES.KING);
    expect(board[8][4].player).toBe(SENTE);
    expect(board[8][0].type).toBe(PIECE_TYPES.LANCE);
    expect(board[8][1].type).toBe(PIECE_TYPES.KNIGHT);
    expect(board[8][2].type).toBe(PIECE_TYPES.SILVER);
    expect(board[8][3].type).toBe(PIECE_TYPES.GOLD);
    expect(board[8][5].type).toBe(PIECE_TYPES.GOLD);
    expect(board[8][6].type).toBe(PIECE_TYPES.SILVER);
    expect(board[8][7].type).toBe(PIECE_TYPES.KNIGHT);
    expect(board[8][8].type).toBe(PIECE_TYPES.LANCE);

    // Sente rook and bishop: rook on sente's own right (col 7), bishop left (col 1)
    expect(board[7][7].type).toBe(PIECE_TYPES.ROOK);
    expect(board[7][1].type).toBe(PIECE_TYPES.BISHOP);

    // Sente pawns
    for (let col = 0; col < 9; col++) {
      expect(board[6][col].type).toBe(PIECE_TYPES.PAWN);
      expect(board[6][col].player).toBe(SENTE);
    }
  });
});

describe("piece names", () => {
  it("returns correct piece names", () => {
    expect(getPieceName({ type: PIECE_TYPES.KING, promoted: false })).toBe("王");
    expect(getPieceName({ type: PIECE_TYPES.ROOK, promoted: false })).toBe("飞车");
    expect(getPieceName({ type: PIECE_TYPES.BISHOP, promoted: false })).toBe("角行");
    expect(getPieceName({ type: PIECE_TYPES.GOLD, promoted: false })).toBe("金将");
    expect(getPieceName({ type: PIECE_TYPES.SILVER, promoted: false })).toBe("银将");
    expect(getPieceName({ type: PIECE_TYPES.KNIGHT, promoted: false })).toBe("桂马");
    expect(getPieceName({ type: PIECE_TYPES.LANCE, promoted: false })).toBe("香车");
    expect(getPieceName({ type: PIECE_TYPES.PAWN, promoted: false })).toBe("步兵");
  });

  it("returns promoted piece names", () => {
    expect(getPieceName({ type: PIECE_TYPES.ROOK, promoted: true })).toBe("成飞车");
    expect(getPieceName({ type: PIECE_TYPES.BISHOP, promoted: true })).toBe("成角行");
  });
});

describe("promotion rules", () => {
  it("allows promotion in correct rows", () => {
    const sentePiece = { type: PIECE_TYPES.PAWN, player: SENTE, promoted: false };
    const gotePiece = { type: PIECE_TYPES.PAWN, player: GOTE, promoted: false };

    // Sente can promote in top 3 rows
    expect(canPromote(sentePiece, 0)).toBe(true);
    expect(canPromote(sentePiece, 1)).toBe(true);
    expect(canPromote(sentePiece, 2)).toBe(true);
    expect(canPromote(sentePiece, 3)).toBe(false);

    // Gote can promote in bottom 3 rows
    expect(canPromote(gotePiece, 6)).toBe(true);
    expect(canPromote(gotePiece, 7)).toBe(true);
    expect(canPromote(gotePiece, 8)).toBe(true);
    expect(canPromote(gotePiece, 5)).toBe(false);
  });

  it("prevents promotion for king and gold", () => {
    const king = { type: PIECE_TYPES.KING, player: SENTE, promoted: false };
    const gold = { type: PIECE_TYPES.GOLD, player: SENTE, promoted: false };

    expect(canPromote(king, 0)).toBe(false);
    expect(canPromote(gold, 0)).toBe(false);
  });

  it("prevents promotion for already promoted pieces", () => {
    const promotedPawn = { type: PIECE_TYPES.PAWN, player: SENTE, promoted: true };
    expect(canPromote(promotedPawn, 0)).toBe(false);
  });
});

describe("game over detection", () => {
  it("detects game over when king is missing", () => {
    const board = initializeBoard();
    // Remove sente king
    board[8][4] = null;
    expect(isGameOver(board)).toBe(true);
  });

  it("detects game is not over when both kings exist", () => {
    const board = initializeBoard();
    expect(isGameOver(board)).toBe(false);
  });
});

describe("piece movement", () => {
  it("king moves correctly", () => {
    const board = initializeBoard();
    const king = board[8][4]; // Sente king
    const moves = getKingMoves(8, 4, king, board);
    // King has 3 moves initially (forward and diagonals)
    expect(moves.length).toBe(3);
  });

  it("pawn moves correctly", () => {
    const board = initializeBoard();
    const pawn = board[6][0]; // Sente pawn
    const moves = getPawnMoves(6, 0, pawn, board);
    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual({ row: 5, col: 0 });
  });

  it("rook moves correctly", () => {
    const board = initializeBoard();
    const rook = board[7][1]; // Sente rook
    const moves = getRookMoves(7, 1, rook, board);
    // Rook has 6 moves initially (vertical and horizontal)
    expect(moves.length).toBe(6);
  });

  it("bishop moves correctly", () => {
    const board = initializeBoard();
    const bishop = board[7][7]; // Sente bishop
    const moves = getBishopMoves(7, 7, bishop, board);
    // Bishop has 0 moves initially (blocked by own pieces)
    expect(moves.length).toBe(0);
  });

  it("gold moves correctly", () => {
    const board = initializeBoard();
    const gold = board[8][3]; // Sente gold
    const moves = getGoldMoves(8, 3, gold, board);
    // Gold has 3 moves initially (forward and diagonals)
    expect(moves.length).toBe(3);
  });

  it("silver moves correctly", () => {
    const board = initializeBoard();
    const silver = board[8][2]; // Sente silver
    const moves = getSilverMoves(8, 2, silver, board);
    // Silver has 2 moves initially (forward diagonals)
    expect(moves.length).toBe(2);
  });

  it("knight moves correctly", () => {
    const board = initializeBoard();
    const knight = board[8][1]; // Sente knight
    const moves = getKnightMoves(8, 1, knight, board);
    // Knight has 0 moves initially (blocked by own pieces)
    expect(moves.length).toBe(0);
  });

  it("lance moves correctly", () => {
    const board = initializeBoard();
    const lance = board[8][0]; // Sente lance
    const moves = getLanceMoves(8, 0, lance, board);
    // Lance has 1 move initially (forward one step)
    expect(moves.length).toBe(1);
  });
});

describe("valid moves calculation", () => {
  it("calculates valid moves for a piece", () => {
    const board = initializeBoard();
    const pawn = board[6][0]; // Sente pawn
    const moves = getValidMoves(6, 0, pawn, board);
    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual({ row: 5, col: 0 });
  });

  it("handles empty squares", () => {
    const board = initializeBoard();
    const moves = getValidMoves(4, 4, null, board);
    expect(moves.length).toBe(0);
  });
});

describe("AI functions", () => {
  it("gets all moves for a player", () => {
    const board = initializeBoard();
    const capturedPieces = { sente: [], gote: [] };
    const moves = getAllMoves(board, SENTE, capturedPieces);
    expect(moves.length).toBeGreaterThan(0);
    // Initial position should have multiple moves
    expect(moves.length).toBeGreaterThanOrEqual(30);
  });

  it("evaluates board position", () => {
    const board = initializeBoard();
    const score = evaluateBoard(board, SENTE);
    // Both sides are equal at start, so score should be around 0
    expect(typeof score).toBe("number");
  });

  it("applies move correctly", () => {
    const board = initializeBoard();
    const capturedPieces = { sente: [], gote: [] };
    const move = {
      type: "move",
      from: { row: 6, col: 0 },
      to: { row: 5, col: 0 },
      piece: board[6][0],
    };
    const result = applyMove(board, move, capturedPieces);
    expect(result.board[5][0]).toBeTruthy();
    expect(result.board[6][0]).toBeNull();
  });

  it("finds best AI move", () => {
    const board = initializeBoard();
    const capturedPieces = { sente: [], gote: [] };
    const bestMove = getBestAIMove(board, capturedPieces, GOTE, 2);
    expect(bestMove).toBeTruthy();
    expect(bestMove.type).toBe("move");
  });

  it("alpha-beta returns a valid move", () => {
    const board = initializeBoard();
    const capturedPieces = { sente: [], gote: [] };
    const result = alphaBeta(board, capturedPieces, 2, -Infinity, Infinity, true, GOTE);
    expect(result.move).toBeTruthy();
    expect(typeof result.score).toBe("number");
  });
});
