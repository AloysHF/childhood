import { describe, it, expect } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {
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
} = require("./game.js");

// ============================================================
// Helper Functions
// ============================================================
function emptyBoard() {
  var board = [];
  for (var y = 0; y < ROWS; y++) {
    board[y] = [];
    for (var x = 0; x < COLS; x++) {
      board[y][x] = null;
    }
  }
  return board;
}

function makePiece(name, team, state) {
  return { name: name, team: team, rank: getRank(name), state: state || STATE_FACE_UP };
}

function makeState(board, currentTeam, opts) {
  opts = opts || {};
  return {
    gameType: opts.gameType || "open",
    oppType: opts.oppType || "pvp",
    board: board,
    currentTeam: currentTeam,
    playerTeam: opts.playerTeam || null,
    aiTeam: opts.aiTeam || null,
    firstPlayer: opts.firstPlayer || null,
    turnCount: opts.turnCount || 0,
    capturedRed: opts.capturedRed || [],
    capturedBlue: opts.capturedBlue || [],
    selectedCell: null,
    gameOver: opts.gameOver || false,
    winner: opts.winner || null,
    aiThinking: false,
  };
}

// ============================================================
// Basic Utility Functions test
// ============================================================
describe("Basic Utility Functions", () => {
  it("isNormalPiece", () => {
    expect(isNormalPiece("工兵")).toBe(true);
    expect(isNormalPiece("司令")).toBe(true);
    expect(isNormalPiece("炸弹")).toBe(false);
    expect(isNormalPiece("地雷")).toBe(false);
    expect(isNormalPiece("军旗")).toBe(false);
  });

  it("isBomb / isMine / isFlag", () => {
    expect(isBomb("炸弹")).toBe(true);
    expect(isBomb("工兵")).toBe(false);
    expect(isMine("地雷")).toBe(true);
    expect(isMine("工兵")).toBe(false);
    expect(isFlag("军旗")).toBe(true);
    expect(isFlag("工兵")).toBe(false);
  });

  it("isMovable", () => {
    expect(isMovable(makePiece("工兵", RED))).toBe(true);
    expect(isMovable(makePiece("司令", RED))).toBe(true);
    expect(isMovable(makePiece("炸弹", RED))).toBe(true);
    expect(isMovable(makePiece("地雷", RED))).toBe(false);
    expect(isMovable(makePiece("军旗", RED))).toBe(false);
  });

  it("getRank", () => {
    expect(getRank("工兵")).toBe(0);
    expect(getRank("排长")).toBe(1);
    expect(getRank("司令")).toBe(8);
    expect(getRank("炸弹")).toBe(null);
    expect(getRank("地雷")).toBe(null);
    expect(getRank("军旗")).toBe(null);
  });

  it("inBounds", () => {
    expect(inBounds(0, 0)).toBe(true);
    expect(inBounds(4, 11)).toBe(true);
    expect(inBounds(-1, 0)).toBe(false);
    expect(inBounds(5, 0)).toBe(false);
    expect(inBounds(0, 12)).toBe(false);
  });

  it("isCamp", () => {
    expect(isCamp(1, 2)).toBe(true);
    expect(isCamp(2, 3)).toBe(true);
    expect(isCamp(3, 9)).toBe(true);
    expect(isCamp(0, 0)).toBe(false);
    expect(isCamp(2, 2)).toBe(false);
  });

  it("isBaseCamp", () => {
    expect(isBaseCamp(1, 0)).toBe(true);
    expect(isBaseCamp(3, 0)).toBe(true);
    expect(isBaseCamp(1, 11)).toBe(true);
    expect(isBaseCamp(3, 11)).toBe(true);
    expect(isBaseCamp(2, 0)).toBe(false);
  });

  it("getBoardRow", () => {
    expect(getBoardRow(0)).toBe(0);
    expect(getBoardRow(5)).toBe(5);
    expect(getBoardRow(6)).toBe(7);
    expect(getBoardRow(11)).toBe(12);
  });

  it("hasDiagonalEligibility", () => {
    // (0,1): boardRow=1, 0+1=1 odd -> true
    expect(hasDiagonalEligibility(0, 1)).toBe(true);
    // (1,2): boardRow=2, 1+2=3 odd -> true
    expect(hasDiagonalEligibility(1, 2)).toBe(true);
    // (0,0): boardRow=0, 0+0=0 even -> false
    expect(hasDiagonalEligibility(0, 0)).toBe(false);
    // (2,3): boardRow=3, 2+3=5 odd -> true
    expect(hasDiagonalEligibility(2, 3)).toBe(true);
  });
});

// ============================================================
// Railway Detection test
// ============================================================
describe("Railway Detection", () => {
  it("Horizontal railway", () => {
    expect(isOnHRailway(1)).toBe(true);
    expect(isOnHRailway(5)).toBe(true);
    expect(isOnHRailway(6)).toBe(true);
    expect(isOnHRailway(10)).toBe(true);
    expect(isOnHRailway(0)).toBe(false);
    expect(isOnHRailway(3)).toBe(false);
  });

  it("Vertical railway", () => {
    // Left and right sides
    expect(isOnVRailway(0, 1)).toBe(true);
    expect(isOnVRailway(4, 5)).toBe(true);
    expect(isOnVRailway(0, 0)).toBe(false); // Endpoints do not count
    expect(isOnVRailway(0, 11)).toBe(false);
    // Middle
    expect(isOnVRailway(2, 5)).toBe(true);
    expect(isOnVRailway(2, 6)).toBe(true);
    expect(isOnVRailway(2, 4)).toBe(false);
  });

  it("areOnSameRailway", () => {
    // Horizontally adjacent and on Horizontal railway
    expect(areOnSameRailway(0, 1, 1, 1)).toBe(true);
    expect(areOnSameRailway(3, 10, 4, 10)).toBe(true);
    // Vertically adjacent and on Vertical railway
    expect(areOnSameRailway(0, 1, 0, 2)).toBe(true);
    expect(areOnSameRailway(4, 5, 4, 6)).toBe(true);
    // Crossing gap row: middle column and side railways can cross
    expect(areOnSameRailway(2, 5, 2, 6)).toBe(true);
    expect(areOnSameRailway(0, 5, 0, 6)).toBe(true);
    expect(areOnSameRailway(4, 5, 4, 6)).toBe(true);
    expect(areOnSameRailway(1, 5, 1, 6)).toBe(false); // Non-railway columns cannot cross
    expect(areOnSameRailway(3, 5, 3, 6)).toBe(false);
    // Not adjacent
    expect(areOnSameRailway(0, 1, 0, 3)).toBe(false);
  });
});

// ============================================================
// Combat Resolution test
// ============================================================
describe("Combat Resolution", () => {
  it("Higher rank captures lower rank", () => {
    expect(canCapture(makePiece("司令", RED), makePiece("军长", BLUE))).toBe(true);
    expect(canCapture(makePiece("军长", RED), makePiece("工兵", BLUE))).toBe(true);
  });

  it("Lower rank cannot capture higher rank", () => {
    expect(canCapture(makePiece("工兵", RED), makePiece("司令", BLUE))).toBe(false);
  });

  it("Same rank mutual destruction", () => {
    expect(canCapture(makePiece("连长", RED), makePiece("连长", BLUE))).toBe(true);
    expect(resolveCombat(makePiece("连长", RED), makePiece("连长", BLUE))).toBe(
      "mutual_destruction"
    );
  });

  it("Bomb destroys any piece in mutual destruction", () => {
    expect(canCapture(makePiece("炸弹", RED), makePiece("司令", BLUE))).toBe(true);
    expect(resolveCombat(makePiece("炸弹", RED), makePiece("司令", BLUE))).toBe(
      "mutual_destruction"
    );
    expect(resolveCombat(makePiece("工兵", RED), makePiece("炸弹", BLUE))).toBe(
      "mutual_destruction"
    );
  });

  it("Engineer clears mines", () => {
    expect(canCapture(makePiece("工兵", RED), makePiece("地雷", BLUE))).toBe(true);
    expect(resolveCombat(makePiece("工兵", RED), makePiece("地雷", BLUE))).toBe("attacker_wins");
  });

  it("Non-engineer hits mine in mutual destruction", () => {
    expect(canCapture(makePiece("排长", RED), makePiece("地雷", BLUE))).toBe(true);
    expect(resolveCombat(makePiece("排长", RED), makePiece("地雷", BLUE))).toBe(
      "mutual_destruction"
    );
  });

  it("Flag cannot be captured", () => {
    expect(canCapture(makePiece("工兵", RED), makePiece("军旗", BLUE))).toBe(false);
  });

  it("Mine cannot attack", () => {
    expect(canCapture(makePiece("地雷", RED), makePiece("工兵", BLUE))).toBe(false);
  });

  it("Same team cannot capture each other", () => {
    expect(canCapture(makePiece("司令", RED), makePiece("工兵", RED))).toBe(false);
  });
});

// ============================================================
// Game State Creation Tests
// ============================================================
describe("createGameState", () => {
  it("Open mode: board has 50 pieces after creation", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    var count = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (state.board[y][x]) count++;
      }
    }
    expect(count).toBe(50);
  });

  it("Open mode: each side has 25 pieces", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    var redCount = 0,
      blueCount = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && p.team === RED) redCount++;
        if (p && p.team === BLUE) blueCount++;
      }
    }
    expect(redCount).toBe(25);
    expect(blueCount).toBe(25);
  });

  it("Open mode: flag is in base camp", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    var flags = [];
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isFlag(p.name)) flags.push({ x: x, y: y, team: p.team });
      }
    }
    expect(flags.length).toBe(2);
    for (var i = 0; i < flags.length; i++) {
      expect(isBaseCamp(flags[i].x, flags[i].y)).toBe(true);
    }
  });

  it("Open mode: mines are in last two rows", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isMine(p.name)) {
          if (p.team === RED) {
            expect(y >= 10).toBe(true);
          } else {
            expect(y >= 4 && y <= 5).toBe(true);
          }
        }
      }
    }
  });

  it("Open mode: bombs are not in first row", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p && isBomb(p.name)) {
          if (p.team === RED) {
            expect(y).not.toBe(6);
          } else {
            expect(y).not.toBe(0);
          }
        }
      }
    }
  });

  it("Open mode: all pieces face up", () => {
    var state = createGameState({ gameType: "open", oppType: "pvp" });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_UP);
      }
    }
  });

  it("Flip mode: 50 pieces randomly placed on full board (excluding camps)", () => {
    var state = createGameState({ gameType: "flip", oppType: "pvp" });
    var count = 0;
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        if (state.board[y][x]) count++;
      }
    }
    expect(count).toBe(50);
    // No pieces in camps
    for (var i = 0; i < CAMPS.length; i++) {
      var c = CAMPS[i];
      expect(state.board[c.y][c.x]).toBe(null);
    }
  });

  it("Flip mode: all pieces face down", () => {
    var state = createGameState({ gameType: "flip", oppType: "pvp" });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_DOWN);
      }
    }
  });

  it("Hidden mode: no pieces in camps", () => {
    var state = createGameState({ gameType: "hidden", oppType: "pvp" });
    for (var i = 0; i < CAMPS.length; i++) {
      var c = CAMPS[i];
      expect(state.board[c.y][c.x]).toBe(null);
    }
  });
});

// ============================================================
// Move Validation Tests
// ============================================================
describe("getValidMoves", () => {
  it("Mine cannot move", () => {
    var board = emptyBoard();
    board[10][2] = makePiece("地雷", RED);
    var moves = getValidMoves(board, 2, 10, RED);
    expect(moves.length).toBe(0);
  });

  it("Flag cannot move", () => {
    var board = emptyBoard();
    board[11][1] = makePiece("军旗", RED);
    var moves = getValidMoves(board, 1, 11, RED);
    expect(moves.length).toBe(0);
  });

  it("Normal piece can move to adjacent empty position", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("排长", RED);
    var moves = getValidMoves(board, 2, 5, RED);
    // (2,5) is on railway, can move along railway and normal directions
    expect(moves.length).toBeGreaterThan(0);
    // At least can go up (2,4) or down (2,6, crossing gap)
    var hasUp = moves.some((m) => m.x === 2 && m.y === 4);
    expect(hasUp).toBe(true);
  });

  it("Engineer can move unlimited along railway", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("工兵", RED);
    // (0,1) is on Horizontal and Vertical railway
    var moves = getValidMoves(board, 0, 1, RED);
    // Should be able to move to Horizontal railway (1,1), (2,1), (3,1), (4,1)
    var hasFar = moves.some((m) => m.x === 4 && m.y === 1);
    expect(hasFar).toBe(true);
  });

  it("Pieces in camp cannot be attacked", () => {
    var board = emptyBoard();
    board[2][1] = makePiece("工兵", RED); // (1,2) is a camp
    board[2][0] = makePiece("司令", BLUE);
    var moves = getValidMoves(board, 0, 2, BLUE);
    // Commander cannot capture engineer in camp
    var canAttackCamp = moves.some((m) => m.x === 1 && m.y === 2);
    expect(canAttackCamp).toBe(false);
  });

  it("Own piece cannot move to own piece position", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("排长", RED);
    board[5][3] = makePiece("连长", RED);
    var moves = getValidMoves(board, 2, 5, RED);
    var canMoveToOwn = moves.some((m) => m.x === 3 && m.y === 5);
    expect(canMoveToOwn).toBe(false);
  });

  it("Gap row can only be crossed via middle column", () => {
    var board = emptyBoard();
    board[5][1] = makePiece("排长", RED);
    var moves = getValidMoves(board, 1, 5, RED);
    // (1,5) cannot cross down to (1,6)
    var canCross = moves.some((m) => m.x === 1 && m.y === 6);
    expect(canCross).toBe(false);

    board[5][2] = makePiece("排长", RED);
    var moves2 = getValidMoves(board, 2, 5, RED);
    // (2,5) can cross down to (2,6)
    var canCross2 = moves2.some((m) => m.x === 2 && m.y === 6);
    expect(canCross2).toBe(true);
  });

  it("Non-engineer slides any distance along a straight railway", () => {
    var board = emptyBoard();
    board[1][2] = makePiece("排长", RED); // (2,1) on the top horizontal railway
    var moves = getValidMoves(board, 2, 1, RED);
    var targets = moves.map((m) => m.x + "," + m.y);
    // slide left and right along row y=1
    expect(targets).toContain("1,1");
    expect(targets).toContain("0,1");
    expect(targets).toContain("3,1");
    expect(targets).toContain("4,1");
  });

  it("Railway slide is blocked by the first piece", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("排长", RED);
    board[1][2] = makePiece("连长", RED); // own piece blocking the row
    var moves = getValidMoves(board, 0, 1, RED);
    var targets = moves.map((m) => m.x + "," + m.y);
    expect(targets).toContain("1,1"); // reachable before the blocker
    expect(targets).not.toContain("2,1"); // occupied by own piece
    expect(targets).not.toContain("3,1"); // beyond the blocker
    expect(targets).not.toContain("4,1");
  });

  it("Railway slide captures the first enemy piece and stops", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("司令", RED);
    board[1][2] = makePiece("连长", BLUE);
    var moves = getValidMoves(board, 0, 1, RED);
    var capture = moves.find((m) => m.x === 2 && m.y === 1);
    expect(capture).toBeDefined();
    expect(capture.type).toBe("capture");
    var targets = moves.map((m) => m.x + "," + m.y);
    expect(targets).not.toContain("3,1"); // beyond the victim
    expect(targets).not.toContain("4,1");
  });

  it("Railway slide does not turn at junctions", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("排长", RED); // (0,1) sits on a railway junction
    var moves = getValidMoves(board, 0, 1, RED);
    var targets = moves.map((m) => m.x + "," + m.y);
    // slides down the side vertical railway through the gap row
    expect(targets).toContain("0,6");
    expect(targets).toContain("0,10");
    // but may not turn onto the crossing horizontal railway at (0,5)/(0,6)
    expect(targets).not.toContain("1,5");
    expect(targets).not.toContain("1,6");
    expect(targets).not.toContain("1,10");
  });
});

// ============================================================
// Move Operation Tests
// ============================================================
describe("moveCard", () => {
  it("Normal move succeeds", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("排长", RED);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[4][2].name).toBe("排长");
    expect(state.board[5][2]).toBe(null);
    expect(state.currentTeam).toBe(BLUE);
  });

  it("Capture succeeds", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("工兵", BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[4][2].name).toBe("司令");
    expect(state.capturedBlue).toContain("工兵");
  });

  it("Mutual destruction", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("连长", RED);
    board[4][2] = makePiece("连长", BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(result).not.toBe(null);
    expect(state.board[5][2]).toBe(null);
    expect(state.board[4][2]).toBe(null);
    expect(state.capturedRed).toContain("连长");
    expect(state.capturedBlue).toContain("连长");
  });

  it("Engineer captures flag for victory", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", RED);
    board[6][2] = makePiece("军旗", BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 2, y: 6 });
    expect(result).not.toBe(null);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(RED);
  });

  it("Any piece captures the flag in the base camp for victory", () => {
    var board = emptyBoard();
    board[1][1] = makePiece("排长", RED); // adjacent to blue base camp (1,0)
    board[0][1] = makePiece("军旗", BLUE);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 1, y: 1 }, { x: 1, y: 0 });
    expect(result).not.toBe(null);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(RED);
    expect(state.board[0][1].name).toBe("排长");
  });

  it("Piece that entered a base camp cannot move again (open mode)", () => {
    var board = emptyBoard();
    board[0][1] = makePiece("排长", RED);
    expect(getValidMoves(board, 1, 0, RED, "open").length).toBe(0);
    expect(getValidMoves(board, 1, 0, RED, "hidden").length).toBe(0);
  });

  it("Flip mode allows base camp pieces to move", () => {
    var board = emptyBoard();
    board[0][1] = makePiece("排长", RED);
    expect(getValidMoves(board, 1, 0, RED, "flip").length).toBeGreaterThan(0);
  });

  it("Cannot move to illegal position", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("排长", RED);
    var state = makeState(board, RED);
    var result = moveCard(state, { x: 2, y: 5 }, { x: 0, y: 0 });
    expect(result).toBe(null);
  });

  it("Hidden mode: commander captured reveals opponent flag", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("司令", BLUE);
    board[0][1] = makePiece("军旗", BLUE, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: "hidden" });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
  });
});

// ============================================================
// Game Over Detection Tests
// ============================================================
describe("checkGameOver", () => {
  it("Game ended by capturing flag", () => {
    var board = emptyBoard();
    var state = makeState(board, RED, { gameOver: true, winner: RED });
    var result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe(RED);
  });

  it("Red has no usable pieces, blue wins", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", BLUE);
    // Red has no pieces
    var state = makeState(board, RED);
    var result = checkGameOver(state);
    expect(result.ended).toBe(true);
    expect(result.winner).toBe(BLUE);
  });

  it("Game continues when both sides have pieces", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", RED);
    board[0][2] = makePiece("工兵", BLUE);
    var state = makeState(board, RED);
    var result = checkGameOver(state);
    expect(result.ended).toBe(false);
  });
});

// ============================================================
// AI Decision Tests
// ============================================================
describe("aiDecide", () => {
  it("AI prioritizes capturing flag", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", BLUE);
    board[6][2] = makePiece("军旗", RED); // Flag in red headquarters
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    expect(decision.to.x).toBe(2);
    expect(decision.to.y).toBe(6);
  });

  it("AI captures when opportunity exists", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", BLUE);
    board[5][3] = makePiece("工兵", RED);
    board[0][0] = makePiece("工兵", RED); // Prevent blue from having no opponent causing game over
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    // Should choose capture
    var eats = decision.to.x === 3 && decision.to.y === 5;
    expect(eats).toBe(true);
  });

  it("Returns null when no actions available", () => {
    var board = emptyBoard();
    // Only mines and flag, cannot move
    board[11][1] = makePiece("军旗", BLUE);
    board[10][0] = makePiece("地雷", BLUE);
    board[0][0] = makePiece("工兵", RED); // Opponent
    var state = makeState(board, BLUE, { aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).toBe(null);
  });
});

// ============================================================
// RPS Tests
// ============================================================
describe("judgeRPS", () => {
  it("Draw", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
    expect(judgeRPS("scissors", "scissors")).toBe(0);
    expect(judgeRPS("paper", "paper")).toBe(0);
  });

  it("First player wins", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
    expect(judgeRPS("scissors", "paper")).toBe(1);
    expect(judgeRPS("paper", "rock")).toBe(1);
  });

  it("Second player wins", () => {
    expect(judgeRPS("rock", "paper")).toBe(-1);
    expect(judgeRPS("scissors", "rock")).toBe(-1);
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
});

// ============================================================
// Flag Capture test
// ============================================================
describe("Flag Capture", () => {
  it("Engineer can enter base camp diagonally to capture flag", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("工兵", RED);
    board[0][1] = makePiece("军旗", BLUE);
    var moves = getValidMoves(board, 0, 1, RED);
    var flagMove = moves.find((m) => m.type === "capture_flag" && m.x === 1 && m.y === 0);
    expect(flagMove).not.toBe(undefined);
  });

  it("Non-engineer pieces can capture flag (standard rule)", () => {
    var board = emptyBoard();
    board[1][0] = makePiece("排长", RED);
    board[0][1] = makePiece("军旗", BLUE);
    var moves = getValidMoves(board, 0, 1, RED);
    var flagMove = moves.find((m) => m.type === "capture_flag");
    expect(flagMove).toBeDefined();
    expect(flagMove.x).toBe(1);
    expect(flagMove.y).toBe(0);
  });

  it("Engineer can reach near base camp via railway", () => {
    var board = emptyBoard();
    board[5][0] = makePiece("工兵", RED);
    board[0][1] = makePiece("军旗", BLUE);
    var moves = getEngineerMoves(board, 0, 5, RED);
    // Engineer can reach (0,1) via railway
    var canReach01 = moves.some((m) => m.x === 0 && m.y === 1);
    expect(canReach01).toBe(true);
  });
});

// ============================================================
// Camp Protection test
// ============================================================
describe("Camp Protection", () => {
  it("Pieces in camp cannot be attacked", () => {
    var board = emptyBoard();
    board[2][1] = makePiece("工兵", RED);
    board[2][0] = makePiece("司令", BLUE);
    var moves = getValidMoves(board, 0, 2, BLUE);
    var canAttack = moves.some((m) => m.x === 1 && m.y === 2);
    expect(canAttack).toBe(false);
  });

  it("Non-flag pieces in base camp cannot be attacked", () => {
    var board = emptyBoard();
    board[0][1] = makePiece("工兵", RED);
    board[0][0] = makePiece("司令", BLUE);
    var moves = getValidMoves(board, 0, 0, BLUE);
    var canAttack = moves.some((m) => m.x === 1 && m.y === 0);
    expect(canAttack).toBe(false);
  });

  it("Pieces in camp can jump diagonally to another camp", () => {
    // (1,2) and (2,3) are diagonally adjacent camps
    var board = emptyBoard();
    board[2][1] = makePiece("工兵", RED);
    var moves = getValidMoves(board, 1, 2, RED);
    var canReachCamp = moves.some((m) => m.x === 2 && m.y === 3);
    expect(canReachCamp).toBe(true);
  });

  it("Pieces in camp can pass through empty cells to reach farther camps", () => {
    // (2,3) to (1,4) needs to pass through middle empty cell
    var board = emptyBoard();
    board[3][2] = makePiece("团长", RED);
    var moves = getValidMoves(board, 2, 3, RED);
    var canReachCamp = moves.some((m) => m.x === 1 && m.y === 4);
    expect(canReachCamp).toBe(true);
  });

  it("Engineer can enter adjacent camp from railway", () => {
    var board = emptyBoard();
    board[1][1] = makePiece("工兵", RED);
    var moves = getValidMoves(board, 1, 1, RED);
    var canEnterCamp = moves.some((m) => m.x === 1 && m.y === 2);
    expect(canEnterCamp).toBe(true);
  });

  it("Camp piece cannot jump over own piece to reach another camp", () => {
    // (1,2) wants to reach (2,3), but middle cell occupied by own piece
    var board = emptyBoard();
    board[2][1] = makePiece("工兵", RED);
    // (2,3) is not directly adjacent, needs to pass through middle cell, but blocked if middle has own piece
    // Testing path from (1,2) to (3,4): needs to pass through (2,3) camp
    // (1,2) -> (2,3) is directly adjacent camp, so no obstacle cell in between
    // Use a better test: (1,7) to (3,9) passing through (2,8)
    board[7][1] = makePiece("团长", RED);
    board[8][2] = makePiece("连长", RED); // Own piece occupies middle camp
    var moves = getValidMoves(board, 1, 7, RED);
    var canReachCamp = moves.some((m) => m.x === 3 && m.y === 9);
    expect(canReachCamp).toBe(false);
  });
});

// ============================================================
// Shuffle Tests
// ============================================================
describe("shuffle", () => {
  it("Elements unchanged after shuffle", () => {
    var arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    var sorted = arr.slice().sort();
    shuffle(arr);
    expect(arr.slice().sort()).toEqual(sorted);
  });
});

// ============================================================
// Flip Mode test
// ============================================================
describe("Flip Mode", () => {
  it("Flip piece", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", RED, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: "flip" });
    var result = flipPiece(state, 2, 5);
    expect(result).not.toBe(null);
    expect(state.board[5][2].state).toBe(STATE_FACE_UP);
    expect(state.currentTeam).toBe(BLUE);
  });

  it("Face-down piece cannot move", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("排长", RED, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, "flip");
    expect(moves.length).toBe(0);
  });

  it("Cannot attack face-down piece", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("工兵", BLUE, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, "flip");
    var canAttack = moves.some((m) => m.x === 2 && m.y === 4);
    expect(canAttack).toBe(false);
  });

  it("Flip Mode：AI优先Flip piece", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("工兵", BLUE, STATE_FACE_DOWN);
    board[0][0] = makePiece("工兵", RED, STATE_FACE_UP);
    var state = makeState(board, BLUE, { gameType: "flip", aiTeam: BLUE });
    var decision = aiDecide(state, BLUE);
    expect(decision).not.toBe(null);
    expect(decision.type).toBe("flip");
  });
});

// ============================================================
// Hidden Mode test
// ============================================================
describe("Hidden Mode", () => {
  it("Hidden Mode：所有棋子初始面朝下", () => {
    var state = createGameState({ gameType: "hidden", oppType: "pvp" });
    for (var y = 0; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        var p = state.board[y][x];
        if (p) expect(p.state).toBe(STATE_FACE_DOWN);
      }
    }
  });

  it("Hidden Mode：司令被吃暴露军旗", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("司令", BLUE);
    board[0][1] = makePiece("军旗", BLUE, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: "hidden" });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
  });

  it("Hidden Mode：司令Mutual destruction暴露双方军旗", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("司令", BLUE);
    board[0][1] = makePiece("军旗", BLUE, STATE_FACE_DOWN);
    board[11][1] = makePiece("军旗", RED, STATE_FACE_DOWN);
    var state = makeState(board, RED, { gameType: "hidden" });
    moveCard(state, { x: 2, y: 5 }, { x: 2, y: 4 });
    expect(state.board[0][1].state).toBe(STATE_FACE_UP);
    expect(state.board[11][1].state).toBe(STATE_FACE_UP);
  });

  it("Hidden Mode：Cannot attack face-down piece", () => {
    var board = emptyBoard();
    board[5][2] = makePiece("司令", RED);
    board[4][2] = makePiece("工兵", BLUE, STATE_FACE_DOWN);
    var moves = getValidMoves(board, 2, 5, RED, "hidden");
    var canAttack = moves.some((m) => m.x === 2 && m.y === 4);
    expect(canAttack).toBe(false);
  });
});
