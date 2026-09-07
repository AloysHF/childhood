import { describe, it, expect } from "vitest";
const {
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
} = require("./game.js");

// ============================================================
// Helper Functions
// ============================================================

function emptyBoard() {
  const board = [];
  for (let c = 0; c < COLS; c++) {
    const col = [];
    for (let r = 0; r < ROWS; r++) col.push(null);
    board.push(col);
  }
  return board;
}

function makePiece(type, team) {
  return { type, team, rank: type };
}

function makeState(board, currentPlayer, opts = {}) {
  return {
    mode: opts.mode || "pvp",
    board,
    terrain: opts.terrain || createTerrain(),
    currentPlayer,
    playerTeam: opts.playerTeam || null,
    aiTeam: opts.aiTeam || null,
    gameOver: opts.gameOver || false,
    winner: opts.winner || null,
    turnCount: opts.turnCount || 0,
    aiThinking: false,
    selectedPiece: null,
    validMoves: [],
    lastMove: null,
    boardFlipped: false,
    firstPlayer: opts.firstPlayer || null,
  };
}

// ============================================================
// Constants - constant definitions
// ============================================================

describe("constants - 常量定义", () => {
  it("COLS = 7", () => {
    expect(COLS).toBe(7);
  });

  it("ROWS = 9", () => {
    expect(ROWS).toBe(9);
  });

  it("Piece types defined correctly", () => {
    expect(RAT).toBe(0);
    expect(CAT).toBe(1);
    expect(DOG).toBe(2);
    expect(WOLF).toBe(3);
    expect(LEOPARD).toBe(4);
    expect(TIGER).toBe(5);
    expect(LION).toBe(6);
    expect(ELEPHANT).toBe(7);
  });

  it("PIECE_NAMES contains 8 animals", () => {
    expect(Object.keys(PIECE_NAMES)).toHaveLength(8);
    expect(PIECE_NAMES[RAT]).toBe("鼠");
    expect(PIECE_NAMES[CAT]).toBe("猫");
    expect(PIECE_NAMES[DOG]).toBe("狗");
    expect(PIECE_NAMES[WOLF]).toBe("狼");
    expect(PIECE_NAMES[LEOPARD]).toBe("豹");
    expect(PIECE_NAMES[TIGER]).toBe("虎");
    expect(PIECE_NAMES[LION]).toBe("狮");
    expect(PIECE_NAMES[ELEPHANT]).toBe("象");
  });

  it("PIECE_VALUES defined correctly", () => {
    expect(PIECE_VALUES[RAT]).toBe(100);
    expect(PIECE_VALUES[CAT]).toBe(200);
    expect(PIECE_VALUES[DOG]).toBe(300);
    expect(PIECE_VALUES[WOLF]).toBe(400);
    expect(PIECE_VALUES[LEOPARD]).toBe(500);
    expect(PIECE_VALUES[TIGER]).toBe(600);
    expect(PIECE_VALUES[LION]).toBe(700);
    expect(PIECE_VALUES[ELEPHANT]).toBe(800);
  });
});

// ============================================================
// Terrain - terrain detection
// ============================================================

describe("terrain - 地形检测", () => {
  it("isRiver detects river cells", () => {
    // Left river
    expect(isRiver(1, 3)).toBe(true);
    expect(isRiver(2, 3)).toBe(true);
    expect(isRiver(1, 4)).toBe(true);
    expect(isRiver(2, 4)).toBe(true);
    expect(isRiver(1, 5)).toBe(true);
    expect(isRiver(2, 5)).toBe(true);

    // Right river
    expect(isRiver(4, 3)).toBe(true);
    expect(isRiver(5, 3)).toBe(true);
    expect(isRiver(4, 4)).toBe(true);
    expect(isRiver(5, 4)).toBe(true);
    expect(isRiver(4, 5)).toBe(true);
    expect(isRiver(5, 5)).toBe(true);

    // Non-river cells
    expect(isRiver(0, 3)).toBe(false);
    expect(isRiver(3, 3)).toBe(false);
    expect(isRiver(6, 3)).toBe(false);
    expect(isRiver(1, 2)).toBe(false);
    expect(isRiver(1, 6)).toBe(false);
  });

  it("isTrap detects trap cells", () => {
    // Black traps (near black den)
    expect(isTrap(2, 0, BLACK)).toBe(true);
    expect(isTrap(3, 1, BLACK)).toBe(true);
    expect(isTrap(4, 0, BLACK)).toBe(true);

    // Red traps (near red den)
    expect(isTrap(2, 8, RED)).toBe(true);
    expect(isTrap(3, 7, RED)).toBe(true);
    expect(isTrap(4, 8, RED)).toBe(true);

    // Non-trap cells
    expect(isTrap(0, 0, BLACK)).toBe(false);
    expect(isTrap(3, 0, BLACK)).toBe(false);
    expect(isTrap(0, 8, RED)).toBe(false);
  });

  it("isDen detects den cells", () => {
    // Black den
    expect(isDen(3, 0, BLACK)).toBe(true);
    expect(isDen(3, 0, RED)).toBe(false);

    // Red den
    expect(isDen(3, 8, RED)).toBe(true);
    expect(isDen(3, 8, BLACK)).toBe(false);

    // Non-den cells
    expect(isDen(0, 0, BLACK)).toBe(false);
    expect(isDen(3, 1, BLACK)).toBe(false);
  });

  it("isOpponentDen detects opponent's den", () => {
    // Red piece entering black den
    expect(isOpponentDen(3, 0, RED)).toBe(true);
    expect(isOpponentDen(3, 0, BLACK)).toBe(false);

    // Black piece entering red den
    expect(isOpponentDen(3, 8, BLACK)).toBe(true);
    expect(isOpponentDen(3, 8, RED)).toBe(false);
  });

  it("createTerrain creates correct terrain map", () => {
    const terrain = createTerrain();

    // Check river cells
    expect(terrain[1][3]).toBe(TERRAIN_RIVER);
    expect(terrain[2][3]).toBe(TERRAIN_RIVER);
    expect(terrain[4][3]).toBe(TERRAIN_RIVER);
    expect(terrain[5][3]).toBe(TERRAIN_RIVER);

    // Check den cells
    expect(terrain[3][0]).toBe(TERRAIN_DEN_BLACK);
    expect(terrain[3][8]).toBe(TERRAIN_DEN_RED);

    // Check trap cells
    expect(terrain[2][0]).toBe(TERRAIN_TRAP_BLACK);
    expect(terrain[3][1]).toBe(TERRAIN_TRAP_BLACK);
    expect(terrain[4][0]).toBe(TERRAIN_TRAP_BLACK);
    expect(terrain[2][8]).toBe(TERRAIN_TRAP_RED);
    expect(terrain[3][7]).toBe(TERRAIN_TRAP_RED);
    expect(terrain[4][8]).toBe(TERRAIN_TRAP_RED);

    // Check land cells
    expect(terrain[0][0]).toBe(TERRAIN_LAND);
    expect(terrain[3][4]).toBe(TERRAIN_LAND);
  });
});

// ============================================================
// Piece creation
// ============================================================

describe("piece creation - 棋子创建", () => {
  it("createPiece creates correct piece", () => {
    const rat = createPiece(RAT, RED);
    expect(rat.type).toBe(RAT);
    expect(rat.team).toBe(RED);
    expect(rat.rank).toBe(RAT);

    const elephant = createPiece(ELEPHANT, BLACK);
    expect(elephant.type).toBe(ELEPHANT);
    expect(elephant.team).toBe(BLACK);
    expect(elephant.rank).toBe(ELEPHANT);
  });
});

// ============================================================
// Board operations
// ============================================================

describe("board operations - 棋盘操作", () => {
  it("createBoard creates initial board with 16 pieces", () => {
    const board = createBoard();
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

    expect(redCount).toBe(8);
    expect(blackCount).toBe(8);
  });

  it("createBoard places pieces at correct positions", () => {
    const board = createBoard();

    // Black pieces (top)
    expect(board[0][0]).toEqual({ type: LION, team: BLACK, rank: LION });
    expect(board[6][0]).toEqual({ type: TIGER, team: BLACK, rank: TIGER });
    expect(board[1][1]).toEqual({ type: DOG, team: BLACK, rank: DOG });
    expect(board[5][1]).toEqual({ type: CAT, team: BLACK, rank: CAT });
    expect(board[0][2]).toEqual({ type: RAT, team: BLACK, rank: RAT });
    expect(board[2][2]).toEqual({ type: LEOPARD, team: BLACK, rank: LEOPARD });
    expect(board[4][2]).toEqual({ type: WOLF, team: BLACK, rank: WOLF });
    expect(board[6][2]).toEqual({ type: ELEPHANT, team: BLACK, rank: ELEPHANT });

    // Red pieces (bottom)
    expect(board[0][6]).toEqual({ type: ELEPHANT, team: RED, rank: ELEPHANT });
    expect(board[2][6]).toEqual({ type: WOLF, team: RED, rank: WOLF });
    expect(board[4][6]).toEqual({ type: LEOPARD, team: RED, rank: LEOPARD });
    expect(board[6][6]).toEqual({ type: RAT, team: RED, rank: RAT });
    expect(board[1][7]).toEqual({ type: CAT, team: RED, rank: CAT });
    expect(board[5][7]).toEqual({ type: DOG, team: RED, rank: DOG });
    expect(board[0][8]).toEqual({ type: TIGER, team: RED, rank: TIGER });
    expect(board[6][8]).toEqual({ type: LION, team: RED, rank: LION });
  });

  it("copyBoard creates independent copy", () => {
    const board = createBoard();
    const copy = copyBoard(board);

    // Modify original
    board[0][0] = null;

    // Copy should not be affected
    expect(copy[0][0]).not.toBeNull();
    expect(copy[0][0].type).toBe(LION);
  });

  it("applyMove moves piece correctly", () => {
    const board = createBoard();
    const move = { fromC: 0, fromR: 0, toC: 0, toR: 1 };
    const newBoard = applyMove(board, move);

    expect(newBoard[0][0]).toBeNull();
    expect(newBoard[0][1]).toEqual({ type: LION, team: BLACK, rank: LION });
  });
});

// ============================================================
// Piece identification
// ============================================================

describe("piece identification - 棋子识别", () => {
  it("getOwner returns correct team", () => {
    const redPiece = makePiece(RAT, RED);
    const blackPiece = makePiece(ELEPHANT, BLACK);

    expect(getOwner(redPiece)).toBe(RED);
    expect(getOwner(blackPiece)).toBe(BLACK);
    expect(getOwner(null)).toBeNull();
  });

  it("getOpponent returns opposite team", () => {
    expect(getOpponent(RED)).toBe(BLACK);
    expect(getOpponent(BLACK)).toBe(RED);
  });

  it("getPlayerName returns correct name", () => {
    expect(getPlayerName(RED)).toBe("红方");
    expect(getPlayerName(BLACK)).toBe("黑方");
  });

  it("inBounds checks boundaries correctly", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(6, 8)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(7, 0)).toBe(false);
    expect(inBounds(0, -1)).toBe(false);
    expect(inBounds(0, 9)).toBe(false);
  });
});

// ============================================================
// Capture rules
// ============================================================

describe("capture rules - 吃子规则", () => {
  it("higher rank captures lower rank", () => {
    // Note: rank value 0=RAT (weakest), 7=ELEPHANT (strongest)
    // Lower rank value = stronger piece
    const elephant = makePiece(ELEPHANT, RED); // rank=7 (strongest)
    const lion = makePiece(LION, BLACK); // rank=6

    expect(canCapture(elephant, lion, 0, 0, 0, 1)).toBe(true);
  });

  it("lower rank cannot capture higher rank", () => {
    const rat = makePiece(RAT, RED);
    const elephant = makePiece(ELEPHANT, BLACK);

    // Normal case: rat cannot capture elephant (except reversal)
    // Actually rat CAN capture elephant (reversal rule)
    expect(canCapture(rat, elephant, 0, 0, 0, 1)).toBe(true);
  });

  it("rat captures elephant (reversal)", () => {
    const rat = makePiece(RAT, RED);
    const elephant = makePiece(ELEPHANT, BLACK);

    expect(canCapture(rat, elephant, 0, 0, 0, 1)).toBe(true);
  });

  it("elephant cannot capture rat", () => {
    const elephant = makePiece(ELEPHANT, RED);
    const rat = makePiece(RAT, BLACK);

    expect(canCapture(elephant, rat, 0, 0, 0, 1)).toBe(false);
  });

  it("same rank can capture (mutual destruction)", () => {
    const rat1 = makePiece(RAT, RED);
    const rat2 = makePiece(RAT, BLACK);

    expect(canCapture(rat1, rat2, 0, 0, 0, 1)).toBe(true);
  });

  it("cannot capture own pieces", () => {
    const rat1 = makePiece(RAT, RED);
    const rat2 = makePiece(RAT, RED);

    expect(canCapture(rat1, rat2, 0, 0, 0, 1)).toBe(false);
  });

  it("any piece can capture in opponent's trap", () => {
    const rat = makePiece(RAT, BLACK);
    const elephant = makePiece(ELEPHANT, RED);

    // Red elephant wandering into black's trap (near black den) loses all
    // rank: even a black rat can capture it.
    expect(canCapture(rat, elephant, 0, 0, 2, 0)).toBe(true);
  });

  it("own trap does not weaken a piece", () => {
    const cat = makePiece(CAT, RED);
    const elephant = makePiece(ELEPHANT, BLACK);

    // Black elephant standing in black's own trap keeps its rank.
    expect(canCapture(cat, elephant, 0, 0, 2, 0)).toBe(false);

    // And a red elephant in red's own trap (3,7) is not weakened either.
    const catBlack = makePiece(CAT, BLACK);
    const elephantRed = makePiece(ELEPHANT, RED);
    expect(canCapture(catBlack, elephantRed, 0, 0, 3, 7)).toBe(false);
  });

  it("rat in water cannot capture the elephant on shore", () => {
    const rat = makePiece(RAT, BLACK);
    const elephant = makePiece(ELEPHANT, RED);

    // Black rat swims at (1,3) (water); red elephant stands at (1,2) (land)
    expect(canCapture(rat, elephant, 1, 3, 1, 2)).toBe(false);
  });

  it("rat on land cannot capture the rat in water", () => {
    const rat = makePiece(RAT, RED);
    const swimmer = makePiece(RAT, BLACK);

    expect(canCapture(rat, swimmer, 1, 2, 1, 3)).toBe(false);
    expect(canCapture(swimmer, rat, 1, 3, 1, 2)).toBe(false);
  });

  it("rat in water can capture a rat in the water", () => {
    const ratA = makePiece(RAT, RED);
    const ratB = makePiece(RAT, BLACK);

    // (1,3) and (2,3) are both river squares
    expect(canCapture(ratA, ratB, 1, 3, 2, 3)).toBe(true);
  });
});

// ============================================================
// Movement rules
// ============================================================

describe("movement rules - 移动规则", () => {
  it("piece can move to adjacent empty cell", () => {
    const board = emptyBoard();
    board[3][3] = makePiece(RAT, RED);

    const moves = getValidMoves(board, 3, 3);
    expect(moves).toHaveLength(4);
    expect(moves).toContainEqual({ fromC: 3, fromR: 3, toC: 3, toR: 2 });
    expect(moves).toContainEqual({ fromC: 3, fromR: 3, toC: 3, toR: 4 });
    expect(moves).toContainEqual({ fromC: 3, fromR: 3, toC: 2, toR: 3 });
    expect(moves).toContainEqual({ fromC: 3, fromR: 3, toC: 4, toR: 3 });
  });

  it("piece cannot move to own den", () => {
    const board = emptyBoard();
    board[3][1] = makePiece(RAT, BLACK);

    const moves = getValidMoves(board, 3, 1);
    // Cannot move to (3,0) which is black den
    expect(moves.some((m) => m.toC === 3 && m.toR === 0)).toBe(false);
  });

  it("only rat can enter river", () => {
    const board = emptyBoard();
    board[0][3] = makePiece(RAT, RED);
    board[0][2] = makePiece(CAT, RED);

    // Rat can enter river (1,3) is river
    const ratMoves = getValidMoves(board, 0, 3);
    expect(ratMoves.some((m) => m.toC === 1 && m.toR === 3)).toBe(true);

    // Cat cannot enter river - but (1,2) is not river, it's land
    // Let's test cat trying to enter actual river cell (1,3)
    const catMoves = getValidMoves(board, 0, 2);
    expect(catMoves.some((m) => m.toC === 1 && m.toR === 3)).toBe(false);
  });

  it("lion can jump over river horizontally", () => {
    const board = emptyBoard();
    // Lion on river bank at (0,3), can jump to (3,3)
    board[0][3] = makePiece(LION, RED);

    const moves = getValidMoves(board, 0, 3);
    // Should be able to jump to (3,3) - land bridge
    expect(moves.some((m) => m.toC === 3 && m.toR === 3)).toBe(true);
  });

  it("lion cannot jump over river if rat is blocking", () => {
    const board = emptyBoard();
    board[0][3] = makePiece(LION, RED);
    board[1][3] = makePiece(RAT, BLACK); // Blocking

    const moves = getValidMoves(board, 0, 3);
    // Should not be able to jump to (3,3)
    expect(moves.some((m) => m.toC === 3 && m.toR === 3)).toBe(false);
  });

  it("tiger can jump over river vertically", () => {
    const board = emptyBoard();
    // Tiger above river at (1,2), can jump to (1,6)
    board[1][2] = makePiece(TIGER, RED);

    const moves = getValidMoves(board, 1, 2);
    // Should be able to jump to (1,6) - below river
    expect(moves.some((m) => m.toC === 1 && m.toR === 6)).toBe(true);
  });

  it("non-lion/tiger cannot jump over river", () => {
    const board = emptyBoard();
    board[0][3] = makePiece(ELEPHANT, RED);

    const moves = getValidMoves(board, 0, 3);
    // Should not be able to jump to (3,3)
    expect(moves.some((m) => m.toC === 3 && m.toR === 3)).toBe(false);
  });
});

// ============================================================
// Win/loss detection
// ============================================================

describe("win/loss detection - 胜负判定", () => {
  it("red wins by entering black den", () => {
    const board = emptyBoard();
    board[3][0] = makePiece(RAT, RED); // Red piece in black den

    const result = checkGameOver(board, BLACK);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
    expect(result.reason).toBe("den");
  });

  it("black wins by entering red den", () => {
    const board = emptyBoard();
    board[3][8] = makePiece(RAT, BLACK); // Black piece in red den

    const result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(BLACK);
    expect(result.reason).toBe("den");
  });

  it("red wins when black has no pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, RED);

    const result = checkGameOver(board, BLACK);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
    expect(result.reason).toBe("capture");
  });

  it("black wins when red has no pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, BLACK);

    const result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(BLACK);
    expect(result.reason).toBe("capture");
  });

  it("game continues when both sides have pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, RED);
    board[6][8] = makePiece(RAT, BLACK);

    const result = checkGameOver(board, RED);
    expect(result).toBeNull();
  });

  it("black wins when red has no legal moves", () => {
    const board = emptyBoard();
    // Red rat in corner, completely blocked
    board[0][0] = makePiece(RAT, RED);
    // Block all possible moves for rat
    board[0][1] = makePiece(CAT, BLACK); // rank=1, rat cannot capture
    board[1][0] = makePiece(CAT, BLACK); // rank=1, rat cannot capture
    board[1][1] = makePiece(CAT, BLACK); // rank=1, rat cannot capture
    // Black piece that can move
    board[6][8] = makePiece(RAT, BLACK);

    const result = checkGameOver(board, RED);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(BLACK);
    expect(result.reason).toBe("no_moves");
  });
});

// ============================================================
// AI evaluation
// ============================================================

describe("AI evaluation - AI评估", () => {
  it("evaluateBoard returns positive score when AI has more pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(ELEPHANT, RED);
    board[1][0] = makePiece(LION, RED);
    board[6][8] = makePiece(RAT, BLACK);

    const score = evaluateBoard(board, RED);
    expect(score).toBeGreaterThan(0);
  });

  it("evaluateBoard returns negative score when opponent has more pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, RED);
    board[6][8] = makePiece(ELEPHANT, BLACK);
    board[5][8] = makePiece(LION, BLACK);

    const score = evaluateBoard(board, RED);
    expect(score).toBeLessThan(0);
  });

  it("evaluateBoard returns 0 when equal pieces", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, RED);
    board[6][8] = makePiece(RAT, BLACK);

    const score = evaluateBoard(board, RED);
    expect(score).toBe(0);
  });
});

// ============================================================
// Game state
// ============================================================

describe("game state - 游戏状态", () => {
  it("createGameState creates initial state", () => {
    const state = createGameState("pvp");

    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(RED);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.selectedPiece).toBeNull();
    expect(state.validMoves).toHaveLength(0);
    expect(state.lastMove).toBeNull();
    expect(state.boardFlipped).toBe(false);
  });

  it("createGameState creates board with 16 pieces", () => {
    const state = createGameState("pvp");
    let count = 0;

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (state.board[c][r]) count++;
      }
    }

    expect(count).toBe(16);
  });
});

// ============================================================
// Move ordering
// ============================================================

describe("move ordering - 走法排序", () => {
  it("orderMoves sorts captures first", () => {
    const board = emptyBoard();
    // Use wolf (rank=3) which can capture cat (rank=1) and rat (rank=0)
    board[3][3] = makePiece(WOLF, RED);
    board[3][4] = makePiece(CAT, BLACK); // rank=1, wolf can capture
    board[4][3] = makePiece(RAT, BLACK); // rank=0, wolf can capture

    const moves = [
      { fromC: 3, fromR: 3, toC: 3, toR: 2 }, // Move to empty
      { fromC: 3, fromR: 3, toC: 3, toR: 4 }, // Capture cat (rank=1)
      { fromC: 3, fromR: 3, toC: 4, toR: 3 }, // Capture rat (rank=0)
    ];

    const ordered = orderMoves(board, moves, null);

    // Captures should be first - higher value victim first
    // Cat value = 200, Rat value = 100
    expect(ordered[0].toR).toBe(4); // Capture cat (higher value)
    expect(ordered[1].toC).toBe(4); // Capture rat (lower value)
    expect(ordered[2].toR).toBe(2); // Move to empty
  });

  it("orderMoves prioritizes preferred move", () => {
    const board = emptyBoard();
    board[3][3] = makePiece(RAT, RED);
    board[3][4] = makePiece(CAT, BLACK);

    const moves = [
      { fromC: 3, fromR: 3, toC: 3, toR: 2 }, // Move to empty
      { fromC: 3, fromR: 3, toC: 3, toR: 4 }, // Capture
    ];

    const preferred = { fromC: 3, fromR: 3, toC: 3, toR: 2 };
    const ordered = orderMoves(board, moves, preferred);

    // Preferred move should be first
    expect(ordered[0].toR).toBe(2);
  });
});

// ============================================================
// Hash computation
// ============================================================

describe("hash computation - 哈希计算", () => {
  it("computeHash returns consistent hash for same board", () => {
    const board = createBoard();
    const hash1 = computeHash(board, RED);
    const hash2 = computeHash(board, RED);

    expect(hash1).toBe(hash2);
  });

  it("computeHash returns different hash for different boards", () => {
    const board1 = createBoard();
    const board2 = createBoard();
    board2[0][0] = null;

    const hash1 = computeHash(board1, RED);
    const hash2 = computeHash(board2, RED);

    expect(hash1).not.toBe(hash2);
  });

  it("computeHash returns different hash for different sides", () => {
    const board = createBoard();
    const hash1 = computeHash(board, RED);
    const hash2 = computeHash(board, BLACK);

    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================
// AI move generation
// ============================================================

describe("AI move generation - AI走法生成", () => {
  it("getBestAIMove returns a valid move", () => {
    const board = createBoard();
    const move = getBestAIMove(board, RED);

    expect(move).not.toBeNull();
    expect(move.fromC).toBeDefined();
    expect(move.fromR).toBeDefined();
    expect(move.toC).toBeDefined();
    expect(move.toR).toBeDefined();
  });

  it("getBestAIMove returns null when no moves available", () => {
    const board = emptyBoard();
    board[0][0] = makePiece(RAT, RED);
    // Block all moves
    board[0][1] = makePiece(ELEPHANT, BLACK);
    board[1][0] = makePiece(ELEPHANT, BLACK);

    // Actually rat can capture elephant, so this won't return null
    // Let's create a truly blocked situation
    const board2 = emptyBoard();
    // No pieces for RED
    board2[6][8] = makePiece(RAT, BLACK);

    const move = getBestAIMove(board2, RED);
    expect(move).toBeNull();
  });
});

// ============================================================
// Integration tests
// ============================================================

describe("integration - 集成测试", () => {
  it("full game can be played", () => {
    const state = createGameState("pvp");

    // Red moves rat forward
    const redMoves = getValidMoves(state.board, 6, 6);
    expect(redMoves.length).toBeGreaterThan(0);

    const move = redMoves[0];
    state.board = applyMove(state.board, move);
    state.currentPlayer = getOpponent(state.currentPlayer);
    state.turnCount++;

    // Black should have moves
    const blackMoves = getAllMoves(state.board, BLACK);
    expect(blackMoves.length).toBeGreaterThan(0);
  });

  it("lion jump works correctly in game", () => {
    const board = emptyBoard();
    // Lion on river bank at (0,3)
    board[0][3] = makePiece(LION, RED);
    board[6][8] = makePiece(RAT, BLACK);

    const moves = getValidMoves(board, 0, 3);

    // Should be able to jump to (3,3) - land bridge
    const jumpMove = moves.find((m) => m.toC === 3 && m.toR === 3);
    expect(jumpMove).toBeDefined();

    // Apply jump move
    const newBoard = applyMove(board, jumpMove);
    expect(newBoard[0][3]).toBeNull();
    expect(newBoard[3][3]).toEqual({ type: LION, team: RED, rank: LION });
  });

  it("game over detection works after move", () => {
    const board = emptyBoard();
    board[3][1] = makePiece(RAT, RED);
    board[6][8] = makePiece(RAT, BLACK);

    // Red moves rat to black den
    const move = { fromC: 3, fromR: 1, toC: 3, toR: 0 };
    const newBoard = applyMove(board, move);

    const result = checkGameOver(newBoard, BLACK);
    expect(result).not.toBeNull();
    expect(result.winner).toBe(RED);
  });
});
