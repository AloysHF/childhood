import { describe, it, expect } from "vitest";
import {
  BOARD_SIZE,
  EMPTY,
  RED,
  WHITE,
  RED_KING,
  WHITE_KING,
  AI_DEPTH,
  createBoard,
  copyBoard,
  isRed,
  isWhite,
  isKing,
  getOwner,
  getOpponent,
  getPlayerName,
  promote,
  inBounds,
  getSimpleMoves,
  getCaptureMoves,
  getAllMoves,
  applyMove,
  checkGameOver,
  evaluateBoard,
  getBestAIMove,
  createGameState,
} from "./game.js";

function emptyBoard() {
  const board = [];
  for (var r = 0; r < BOARD_SIZE; r++) board.push(new Array(BOARD_SIZE).fill(EMPTY));
  return board;
}

describe("constants", () => {
  it("BOARD_SIZE is 10 (international draughts)", () => {
    expect(BOARD_SIZE).toBe(10);
  });
  it("EMPTY is 0", () => {
    expect(EMPTY).toBe(0);
  });
  it("RED is 1", () => {
    expect(RED).toBe(1);
  });
  it("WHITE is 2", () => {
    expect(WHITE).toBe(2);
  });
  it("RED_KING is 3", () => {
    expect(RED_KING).toBe(3);
  });
  it("WHITE_KING is 4", () => {
    expect(WHITE_KING).toBe(4);
  });
  it("AI_DEPTH is 4", () => {
    expect(AI_DEPTH).toBe(4);
  });
});

describe("createBoard", () => {
  it("creates 10x10 board", () => {
    var board = createBoard();
    expect(board.length).toBe(10);
    for (var r = 0; r < 10; r++) {
      expect(board[r].length).toBe(10);
    }
  });
  it("RED pieces on dark squares in rows 0-3", () => {
    var board = createBoard();
    var redCount = 0;
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 10; c++) {
        if ((r + c) % 2 === 1) {
          expect(board[r][c]).toBe(RED);
          redCount++;
        } else {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
    expect(redCount).toBe(20);
  });
  it("WHITE pieces on dark squares in rows 6-9", () => {
    var board = createBoard();
    var whiteCount = 0;
    for (var r = 6; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        if ((r + c) % 2 === 1) {
          expect(board[r][c]).toBe(WHITE);
          whiteCount++;
        } else {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
    expect(whiteCount).toBe(20);
  });
  it("rows 4-5 are empty", () => {
    var board = createBoard();
    for (var r = 4; r <= 5; r++) {
      for (var c = 0; c < 10; c++) {
        expect(board[r][c]).toBe(EMPTY);
      }
    }
  });
  it("light squares are always empty", () => {
    var board = createBoard();
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        if ((r + c) % 2 === 0) {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    }
  });
});

describe("copyBoard", () => {
  it("creates independent copy", () => {
    var board = createBoard();
    var copy = copyBoard(board);
    copy[0][1] = 99;
    expect(board[0][1]).toBe(RED);
  });
  it("copies all values correctly", () => {
    var board = createBoard();
    var copy = copyBoard(board);
    for (var r = 0; r < 10; r++) {
      for (var c = 0; c < 10; c++) {
        expect(copy[r][c]).toBe(board[r][c]);
      }
    }
  });
});

describe("piece helpers", () => {
  it("isRed", () => {
    expect(isRed(RED)).toBe(true);
    expect(isRed(RED_KING)).toBe(true);
    expect(isRed(WHITE)).toBe(false);
    expect(isRed(WHITE_KING)).toBe(false);
    expect(isRed(EMPTY)).toBe(false);
  });
  it("isWhite", () => {
    expect(isWhite(WHITE)).toBe(true);
    expect(isWhite(WHITE_KING)).toBe(true);
    expect(isWhite(RED)).toBe(false);
    expect(isWhite(EMPTY)).toBe(false);
  });
  it("isKing", () => {
    expect(isKing(RED_KING)).toBe(true);
    expect(isKing(WHITE_KING)).toBe(true);
    expect(isKing(RED)).toBe(false);
    expect(isKing(WHITE)).toBe(false);
  });
  it("getOwner", () => {
    expect(getOwner(RED)).toBe(RED);
    expect(getOwner(RED_KING)).toBe(RED);
    expect(getOwner(WHITE)).toBe(WHITE);
    expect(getOwner(WHITE_KING)).toBe(WHITE);
    expect(getOwner(EMPTY)).toBe(EMPTY);
  });
});

describe("getOpponent", () => {
  it("RED -> WHITE", () => {
    expect(getOpponent(RED)).toBe(WHITE);
  });
  it("WHITE -> RED", () => {
    expect(getOpponent(WHITE)).toBe(RED);
  });
});

describe("getPlayerName", () => {
  it("RED is 红方", () => {
    expect(getPlayerName(RED)).toBe("红方");
  });
  it("WHITE is 白方", () => {
    expect(getPlayerName(WHITE)).toBe("白方");
  });
});

describe("promote", () => {
  it("RED promotes at row 9", () => {
    expect(promote(RED, 9)).toBe(RED_KING);
  });
  it("RED does not promote at row 8", () => {
    expect(promote(RED, 8)).toBe(RED);
  });
  it("WHITE promotes at row 0", () => {
    expect(promote(WHITE, 0)).toBe(WHITE_KING);
  });
  it("WHITE does not promote at row 1", () => {
    expect(promote(WHITE, 1)).toBe(WHITE);
  });
  it("king stays king", () => {
    expect(promote(RED_KING, 9)).toBe(RED_KING);
    expect(promote(WHITE_KING, 0)).toBe(WHITE_KING);
  });
});

describe("inBounds", () => {
  it("valid positions", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(9, 9)).toBe(true);
    expect(inBounds(3, 4)).toBe(true);
  });
  it("out of bounds", () => {
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(10, 0)).toBe(false);
    expect(inBounds(0, 10)).toBe(false);
  });
});

describe("getSimpleMoves", () => {
  it("RED piece can move diagonally down", () => {
    var board = emptyBoard();
    board[4][3] = RED; // dark square: (4+3)%2=1
    var moves = getSimpleMoves(board, 4, 3);
    expect(moves.length).toBe(2);
    var targets = moves.map((m) => m.toR + "," + m.toC);
    expect(targets).toContain("5,2");
    expect(targets).toContain("5,4");
  });
  it("WHITE piece can move diagonally up", () => {
    var board = emptyBoard();
    board[5][2] = WHITE;
    var moves = getSimpleMoves(board, 5, 2);
    expect(moves.length).toBe(2);
    var targets = moves.map((m) => m.toR + "," + m.toC);
    expect(targets).toContain("4,1");
    expect(targets).toContain("4,3");
  });
  it("blocked piece has no moves", () => {
    var board = emptyBoard();
    board[4][3] = RED;
    board[5][2] = RED;
    board[5][4] = WHITE;
    var moves = getSimpleMoves(board, 4, 3);
    expect(moves.length).toBe(0);
  });
  it("king flies any distance along open diagonals", () => {
    var board = emptyBoard();
    board[3][4] = RED_KING;
    var moves = getSimpleMoves(board, 3, 4);
    // open diagonals from (3,4): 3 (up-left) + 3 (up-right) + 4 (down-left) + 5 (down-right)
    expect(moves.length).toBe(15);
  });
  it("king stops before the first piece", () => {
    var board = emptyBoard();
    board[3][4] = RED_KING;
    board[1][2] = WHITE;
    var moves = getSimpleMoves(board, 3, 4);
    var targets = moves.map((m) => m.toR + "," + m.toC);
    expect(targets).not.toContain("0,1"); // behind the blocker
    expect(targets).toContain("2,3"); // the square before it
  });
  it("edge piece has fewer moves", () => {
    var board = emptyBoard();
    board[0][1] = RED; // top edge, dark square
    var moves = getSimpleMoves(board, 0, 1);
    // RED moves down: (1,0) and (1,2) both in bounds
    expect(moves.length).toBe(2);
  });
  it("corner piece has only 1 move", () => {
    var board = emptyBoard();
    board[1][0] = RED; // left edge dark square
    var moves = getSimpleMoves(board, 1, 0);
    // RED moves down: (2,1) in bounds, (2,-1) out of bounds
    expect(moves.length).toBe(1);
  });
});

describe("getCaptureMoves", () => {
  it("RED can capture forward", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    board[3][4] = WHITE;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(1);
    expect(caps[0].toR).toBe(4);
    expect(caps[0].toC).toBe(5);
    expect(caps[0].capturedR).toBe(3);
    expect(caps[0].capturedC).toBe(4);
  });
  it("international rule: man can capture backward", () => {
    var board = emptyBoard();
    board[4][5] = RED;
    board[3][4] = WHITE;
    var caps = getCaptureMoves(board, 4, 5);
    expect(caps.length).toBe(1);
    expect(caps[0].toR).toBe(2);
    expect(caps[0].toC).toBe(3);
  });
  it("cannot capture own piece", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    board[3][4] = RED;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(0);
  });
  it("cannot capture to occupied square", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[4][5] = RED;
    var caps = getCaptureMoves(board, 2, 3);
    expect(caps.length).toBe(0);
  });
  it("king flies over a distant piece", () => {
    var board = emptyBoard();
    board[5][0] = RED_KING;
    board[2][3] = WHITE; // three squares up-right
    var caps = getCaptureMoves(board, 5, 0);
    // landing squares behind the victim along the up-right diagonal: (1,4), (0,5)
    expect(caps.length).toBe(2);
    expect(caps[0].capturedR).toBe(2);
    expect(caps[0].capturedC).toBe(3);
    var targets = caps.map((m) => m.toR + "," + m.toC);
    expect(targets).toContain("1,4");
    expect(targets).toContain("0,5");
  });
});

describe("getAllMoves", () => {
  it("returns simple moves when no captures", () => {
    var board = createBoard();
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBeGreaterThan(0);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].captures).toBeUndefined();
    }
  });
  it("forces capture when available", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    board[3][4] = WHITE;
    board[2][7] = RED; // has simple moves only
    var moves = getAllMoves(board, RED);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].captures.length).toBeGreaterThan(0);
    }
  });
  it("maximum capture rule: must take the most pieces", () => {
    var board = emptyBoard();
    // RED at (4,5): backward jump over (3,4) takes 1; forward chain over (5,4) then (7,4) takes 2
    board[4][5] = RED;
    board[3][4] = WHITE; // single-capture option
    board[5][4] = WHITE; // chain step 1
    board[7][4] = WHITE; // chain step 2 (landing (6,3) then (8,5))
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBeGreaterThan(0);
    for (var i = 0; i < moves.length; i++) {
      expect(moves[i].captures.length).toBe(2);
    }
  });
  it("capture sequence continues from the landing square", () => {
    var board = emptyBoard();
    board[4][5] = RED;
    board[5][4] = WHITE;
    board[7][4] = WHITE;
    var moves = getAllMoves(board, RED);
    var chain = moves.find((m) => m.captures.length === 2);
    expect(chain).toBeDefined();
    expect(chain.captures[0]).toEqual({ r: 5, c: 4 });
    expect(chain.captures[1]).toEqual({ r: 7, c: 4 });
  });
  it("a piece already captured in the sequence cannot be jumped twice", () => {
    var board = emptyBoard();
    // RED king at (5,4); two WHITE in a cross so a second jump over the same
    // piece would be required for a phantom longer chain
    board[5][4] = RED_KING;
    board[3][2] = WHITE;
    board[3][6] = WHITE;
    var moves = getAllMoves(board, RED);
    for (var i = 0; i < moves.length; i++) {
      var keys = moves[i].captures.map((p) => p.r + "," + p.c);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("returns empty array when no legal moves", () => {
    var board = emptyBoard();
    board[0][1] = RED;
    board[1][0] = WHITE; // blocks forward-left step and its jump (lands OOB)
    board[1][2] = WHITE; // blocks forward-right step
    board[2][3] = WHITE; // blocks the jump landing over (1,2)
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBe(0);
  });
});

describe("applyMove", () => {
  it("moves piece correctly", () => {
    var board = createBoard();
    var move = { fromR: 2, fromC: 3, toR: 3, toC: 4 };
    var newBoard = applyMove(board, move);
    expect(newBoard[2][3]).toBe(EMPTY);
    expect(newBoard[3][4]).toBe(RED);
  });
  it("does not modify original board", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    var move = { fromR: 2, fromC: 3, toR: 3, toC: 4 };
    applyMove(board, move);
    expect(board[2][3]).toBe(RED);
    expect(board[3][4]).toBe(EMPTY);
  });
  it("removes all captured pieces of a sequence", () => {
    var board = emptyBoard();
    board[4][5] = RED;
    board[5][4] = WHITE;
    board[7][4] = WHITE;
    var move = {
      fromR: 4,
      fromC: 5,
      toR: 8,
      toC: 5,
      captures: [
        { r: 5, c: 4 },
        { r: 7, c: 4 },
      ],
    };
    var newBoard = applyMove(board, move);
    expect(newBoard[5][4]).toBe(EMPTY);
    expect(newBoard[7][4]).toBe(EMPTY);
    expect(newBoard[8][5]).toBe(RED);
    expect(newBoard[4][5]).toBe(EMPTY);
  });
  it("promotes man ending on the last row", () => {
    var board = emptyBoard();
    board[8][1] = RED;
    var move = { fromR: 8, fromC: 1, toR: 9, toC: 0 };
    var newBoard = applyMove(board, move);
    expect(newBoard[9][0]).toBe(RED_KING);
  });
  it("no promotion when a capture sequence passes through the last row", () => {
    var board = emptyBoard();
    // RED man (7,4) jumps forward over WHITE (8,3) and lands on the last row
    // (9,2); the sequence must continue there, jumping backward over WHITE
    // (8,1) and ending on (7,0) — off the promotion row. FMJD rules: a man
    // is promoted only if its move ENDS on the last row, so it stays a man.
    board[7][4] = RED;
    board[8][3] = WHITE;
    board[8][1] = WHITE;
    var moves = getAllMoves(board, RED);
    expect(moves.length).toBe(1);
    expect(moves[0].captures.length).toBe(2);
    expect(moves[0].toR).toBe(7);
    expect(moves[0].toC).toBe(0);
    var newBoard = applyMove(board, moves[0]);
    expect(newBoard[7][0]).toBe(RED); // NOT a king
    expect(newBoard[8][3]).toBe(EMPTY);
    expect(newBoard[8][1]).toBe(EMPTY);
  });
});

describe("checkGameOver", () => {
  it("returns null when game is ongoing", () => {
    var board = createBoard();
    expect(checkGameOver(board, RED)).toBeNull();
  });
  it("detects RED has no pieces", () => {
    var board = emptyBoard();
    board[5][2] = WHITE;
    var result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
  });
  it("detects WHITE has no pieces", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    var result = checkGameOver(board, WHITE);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
  });
  it("detects no legal moves", () => {
    var board = emptyBoard();
    board[0][1] = RED;
    board[1][0] = WHITE;
    board[1][2] = WHITE;
    board[2][3] = WHITE;
    var result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(WHITE);
  });
});

describe("evaluateBoard", () => {
  it("returns near 0 for the symmetric start position", () => {
    var board = createBoard();
    var score = evaluateBoard(board, RED);
    expect(Math.abs(score)).toBeLessThan(50);
  });
  it("positive when AI has more pieces", () => {
    var board = emptyBoard();
    board[3][4] = RED;
    board[3][6] = RED;
    board[5][2] = WHITE;
    var score = evaluateBoard(board, RED);
    expect(score).toBeGreaterThan(0);
  });
  it("negative when opponent has more pieces", () => {
    var board = emptyBoard();
    board[3][4] = RED;
    board[5][2] = WHITE;
    board[5][4] = WHITE;
    var score = evaluateBoard(board, RED);
    expect(score).toBeLessThan(0);
  });
  it("king is worth more than regular piece", () => {
    var board = emptyBoard();
    board[3][4] = RED_KING;
    board[5][2] = WHITE;
    board[5][4] = WHITE;
    var scoreKing = evaluateBoard(board, RED);

    var board2 = emptyBoard();
    board2[3][4] = RED;
    board2[5][2] = WHITE;
    board2[5][4] = WHITE;
    var scoreRegular = evaluateBoard(board2, RED);

    expect(scoreKing).toBeGreaterThan(scoreRegular);
  });
});

describe("getBestAIMove", () => {
  it("returns a valid move", () => {
    var board = createBoard();
    var move = getBestAIMove(board, RED);
    expect(move).not.toBeNull();
    expect(move.fromR).toBeDefined();
    expect(move.fromC).toBeDefined();
    expect(move.toR).toBeDefined();
    expect(move.toC).toBeDefined();
  });
  it("takes winning capture when available", () => {
    var board = emptyBoard();
    board[2][3] = RED;
    board[3][4] = WHITE;
    var move = getBestAIMove(board, RED);
    expect(move.captures.length).toBe(1);
    expect(move.captures[0].r).toBe(3);
    expect(move.captures[0].c).toBe(4);
  });
});

describe("createGameState", () => {
  it("creates correct initial state", () => {
    var state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(RED);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.scoreRed).toBe(0);
    expect(state.scoreWhite).toBe(0);
    expect(state.board.length).toBe(10);
    expect(state.selectedPiece).toBeNull();
    expect(state.validMoves).toEqual([]);
    expect(state.mustCapture).toBe(false);
    expect(state.lastMove).toBeNull();
  });
  it("pve mode has null teams initially", () => {
    var state = createGameState("pve");
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
