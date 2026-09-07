import { describe, it, expect } from "vitest";
import {
  BOARD_SIZE,
  EMPTY,
  BLACK,
  WHITE,
  KOMI,
  DIRECTIONS,
  createBoard,
  getOpponent,
  getPlayerName,
  isValidPosition,
  getGroup,
  getLiberties,
  removeGroup,
  copyBoard,
  playMove,
  isLegalMove,
  getLegalMoves,
  calculateScore,
  judgeRPS,
  getRPSName,
  createGameState,
} from "./game.js";

describe("constants", () => {
  it("BOARD_SIZE is 19", () => {
    expect(BOARD_SIZE).toBe(19);
  });
  it("EMPTY is 0", () => {
    expect(EMPTY).toBe(0);
  });
  it("BLACK is 1", () => {
    expect(BLACK).toBe(1);
  });
  it("WHITE is 2", () => {
    expect(WHITE).toBe(2);
  });
  it("KOMI is 6.5", () => {
    expect(KOMI).toBe(6.5);
  });
  it("DIRECTIONS has 4 directions", () => {
    expect(DIRECTIONS.length).toBe(4);
  });
});

describe("createBoard", () => {
  it("creates 19x19 empty board", () => {
    var board = createBoard();
    expect(board.length).toBe(19);
    expect(board[0].length).toBe(19);
    expect(board[18].length).toBe(19);
    for (var y = 0; y < 19; y++) {
      for (var x = 0; x < 19; x++) {
        expect(board[y][x]).toBe(EMPTY);
      }
    }
  });
});

describe("getOpponent", () => {
  it("BLACK -> WHITE", () => {
    expect(getOpponent(BLACK)).toBe(WHITE);
  });
  it("WHITE -> BLACK", () => {
    expect(getOpponent(WHITE)).toBe(BLACK);
  });
});

describe("getPlayerName", () => {
  it("BLACK is 黑棋", () => {
    expect(getPlayerName(BLACK)).toBe("黑棋");
  });
  it("WHITE is 白棋", () => {
    expect(getPlayerName(WHITE)).toBe("白棋");
  });
});

describe("isValidPosition", () => {
  it("returns true for valid positions", () => {
    expect(isValidPosition(0, 0)).toBe(true);
    expect(isValidPosition(9, 9)).toBe(true);
    expect(isValidPosition(18, 18)).toBe(true);
  });
  it("returns false for invalid positions", () => {
    expect(isValidPosition(-1, 0)).toBe(false);
    expect(isValidPosition(0, -1)).toBe(false);
    expect(isValidPosition(19, 0)).toBe(false);
    expect(isValidPosition(0, 19)).toBe(false);
  });
});

describe("getGroup", () => {
  it("returns single stone group", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    var group = getGroup(board, 9, 9);
    expect(group.color).toBe(BLACK);
    expect(group.stones.length).toBe(1);
    expect(group.stones[0]).toEqual({ x: 9, y: 9 });
  });
  it("returns connected group", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    board[9][10] = BLACK;
    board[10][9] = BLACK;
    var group = getGroup(board, 9, 9);
    expect(group.stones.length).toBe(3);
  });
  it("returns empty group for empty position", () => {
    var board = createBoard();
    var group = getGroup(board, 9, 9);
    expect(group.color).toBe(EMPTY);
    expect(group.stones.length).toBe(0);
  });
  it("does not include opponent stones", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    board[9][10] = WHITE;
    var group = getGroup(board, 9, 9);
    expect(group.stones.length).toBe(1);
  });
});

describe("getLiberties", () => {
  it("single stone has 4 liberties", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    var group = getGroup(board, 9, 9);
    var liberties = getLiberties(board, group.stones);
    expect(liberties.length).toBe(4);
  });
  it("corner stone has 2 liberties", () => {
    var board = createBoard();
    board[0][0] = BLACK;
    var group = getGroup(board, 0, 0);
    var liberties = getLiberties(board, group.stones);
    expect(liberties.length).toBe(2);
  });
  it("edge stone has 3 liberties", () => {
    var board = createBoard();
    board[0][9] = BLACK; // y=0, x=9 (top edge)
    var group = getGroup(board, 9, 0); // x=9, y=0
    var liberties = getLiberties(board, group.stones);
    expect(liberties.length).toBe(3);
  });
  it("group shares liberties", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    board[9][10] = BLACK;
    var group = getGroup(board, 9, 9);
    var liberties = getLiberties(board, group.stones);
    expect(liberties.length).toBe(6);
  });
  it("blocked stone has fewer liberties", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    board[8][9] = WHITE;
    board[10][9] = WHITE;
    board[9][8] = WHITE;
    board[9][10] = WHITE;
    var group = getGroup(board, 9, 9);
    var liberties = getLiberties(board, group.stones);
    expect(liberties.length).toBe(0);
  });
});

describe("playMove", () => {
  it("places stone correctly", () => {
    var board = createBoard();
    var result = playMove(board, 9, 9, BLACK);
    expect(result).not.toBeNull();
    expect(result.board[9][9]).toBe(BLACK);
    expect(result.captures).toBe(0);
  });
  it("captures opponent stones", () => {
    var board = createBoard();
    // Setup: BLACK surrounds a WHITE stone at (9,9)
    // board[y][x] format
    board[9][9] = WHITE; // center
    board[8][9] = BLACK; // top
    board[10][9] = BLACK; // bottom
    board[9][8] = BLACK; // left
    // Last liberty is at (10, 9) -> x=10, y=9
    var result = playMove(board, 10, 9, BLACK);
    expect(result).not.toBeNull();
    expect(result.captures).toBe(1);
    expect(result.board[9][9]).toBe(EMPTY);
  });
  it("captures multiple stones", () => {
    var board = createBoard();
    // Setup: BLACK surrounds two WHITE stones at (9,9) and (10,9)
    // board[y][x] format
    board[9][9] = WHITE;
    board[9][10] = WHITE;
    board[8][9] = BLACK;
    board[8][10] = BLACK;
    board[10][9] = BLACK;
    board[10][10] = BLACK;
    board[9][8] = BLACK;
    // Last liberty is at (11, 9) -> x=11, y=9
    var result = playMove(board, 11, 9, BLACK);
    expect(result).not.toBeNull();
    expect(result.captures).toBe(2);
    expect(result.board[9][9]).toBe(EMPTY);
    expect(result.board[9][10]).toBe(EMPTY);
  });
  it("returns null for suicide move", () => {
    var board = createBoard();
    // Setup: WHITE surrounds a position
    board[8][9] = WHITE;
    board[10][9] = WHITE;
    board[9][8] = WHITE;
    board[9][10] = WHITE;
    // Try to play BLACK in the surrounded position
    var result = playMove(board, 9, 9, BLACK);
    expect(result).toBeNull();
  });
  it("allows suicide if it captures opponent", () => {
    var board = createBoard();
    // Setup: Complex position where move captures and then has liberties
    board[9][9] = WHITE;
    board[8][9] = WHITE;
    board[10][9] = BLACK;
    board[9][8] = BLACK;
    board[9][10] = BLACK;
    // BLACK at (9,10) captures the WHITE stone at (9,9) and has liberties
    var result = playMove(board, 9, 10, BLACK);
    expect(result).not.toBeNull();
  });
  it("detects ko", () => {
    var board = createBoard();
    // Ko position: single WHITE stone with 1 liberty, BLACK captures it,
    // and the capturing stone ends up with exactly 1 liberty (the captured position).
    //
    // Layout (board[y][x]):
    //   x=9  x=10 x=11
    // y=8:   .    B    .
    // y=9:   B    W    B
    // y=10:  .    B    .
    //
    // WHITE at (10,9): neighbors are (10,8)=B, (11,9)=B, (10,10)=B, (9,9)=B
    // That's 0 liberties - illegal! Remove one blocker to give 1 liberty.
    //
    // Correct layout:
    //   x=9  x=10 x=11
    // y=8:   .    .    .
    // y=9:   .    W    .
    // y=10:  .    B    .
    // y=11:  B    .    B
    //
    // WHITE at (10,9): neighbors (10,8)=empty, (11,9)=empty, (10,10)=B, (9,9)=empty
    // That's 3 liberties - too many. Need exactly 1.
    //
    // Use this layout:
    //   x=9  x=10 x=11
    // y=8:   .    W    .
    // y=9:   W    .    B
    // y=10:  .    B    .
    //
    // WHITE at (10,8): neighbors (10,7)=empty, (11,8)=empty, (10,9)=empty, (9,8)=empty -> 4 liberties
    // No good. Let me think differently.
    //
    // For a valid ko test, I need:
    // 1. A WHITE stone with exactly 1 liberty
    // 2. BLACK plays at that liberty
    // 3. After capture, BLACK stone has exactly 1 liberty (= captured position)
    // 4. The BLACK stone must NOT connect to other BLACK stones
    //
    // Simplest: use 4 BLACK stones around the WHITE, with one gap.
    // But the BLACK stone that fills the gap must not be adjacent to any other BLACK.
    //
    //   x=9  x=10 x=11
    // y=8:   B    .    B
    // y=9:   .    W    .
    // y=10:  B    .    B
    //
    // WHITE at (10,9): neighbors (10,8)=B, (11,9)=empty, (10,10)=B, (9,9)=empty -> 2 liberties
    // Not enough. Need to block one more neighbor of WHITE.
    //
    //   x=9  x=10 x=11
    // y=8:   B    .    B
    // y=9:   B    W    .
    // y=10:  B    .    B
    //
    // WHITE at (10,9): neighbors (10,8)=B, (11,9)=empty, (10,10)=B, (9,9)=B -> 1 liberty at (11,9) ✓
    // BLACK plays (11,9), captures (10,9).
    // After: BLACK at (11,9), neighbors: (11,8)=empty, (12,9)=empty, (11,10)=empty, (10,9)=empty
    // That's 4 liberties. Not ko! The capturing stone needs only 1 liberty.
    //
    // For ko, the capturing position must also be mostly blocked.
    // Let me use a position where the capturing stone is blocked by the captured stone's
    // former neighbors on 3 sides.
    //
    //   x=9  x=10 x=11
    // y=8:   B    .    .
    // y=9:   .    W    .
    // y=10:  .    .    B
    //
    // Doesn't help. The key insight: after capture, the capturing stone's other 3 neighbors
    // must all be non-empty (either stones or board edge).
    //
    // Use board edge! Place WHITE near corner.
    // WHITE at (1,1), BLACK at (0,1), BLACK at (1,0), BLACK at (1,2).
    // WHITE at (1,1): neighbors (1,0)=B, (2,1)=empty, (1,2)=B, (0,1)=B -> 1 liberty at (2,1) ✓
    // BLACK plays (2,1), captures (1,1).
    // After: BLACK at (2,1), neighbors: (2,0)=empty, (3,1)=empty, (2,2)=empty, (1,1)=empty -> 4 liberties. Not ko.
    //
    // Need to block (2,0), (3,1), (2,2) too. But they can't be BLACK (would connect).
    // Use WHITE stones to block? But then they'd be captured too if they have no liberties.
    //
    // Let me try: WHITE at (1,1), blocked on 3 sides by BLACK, liberty at (2,1).
    // After capture, block (2,1) on 3 sides using non-BLACK, non-adjacent-to-(2,1) stones.
    //
    // Place WHITE at (2,0), WHITE at (3,1), WHITE at (2,2) - but these would connect
    // to form a group with many liberties.
    //
    // Actually wait - after capture, we just need BLACK at (2,1) to have 1 liberty.
    // The 3 other neighbors of (2,1) are (2,0), (3,1), (2,2).
    // If these are all WHITE, BLACK at (2,1) has 1 liberty at (1,1). But then those WHITE
    // stones might get captured too... Let's check:
    // WHITE at (2,0): neighbors (2,-1)=invalid, (3,0)=empty, (2,1)=B(now), (1,0)=B -> liberties: (3,0). Still alive.
    // WHITE at (3,1): neighbors (3,0)=empty, (4,1)=empty, (3,2)=empty, (2,1)=B(now) -> 3 liberties. Alive.
    // WHITE at (2,2): neighbors (2,1)=B(now), (3,2)=empty, (2,3)=empty, (1,2)=B -> 2 liberties. Alive.
    // So none of the WHITE stones are captured. And BLACK at (2,1) has only (1,1) as liberty. Ko!
    //
    // But we also need to verify totalCaptures === 1. The only stone captured is WHITE at (1,1).
    // WHITE at (2,0): still has liberty at (3,0). Not captured.
    // WHITE at (3,1): still has 3 liberties. Not captured.
    // WHITE at (2,2): still has 2 liberties. Not captured.
    // totalCaptures = 1 ✓

    // Place BLACK stones blocking WHITE at (1,1) on 3 sides
    board[1][0] = BLACK; // (0,1) - left of WHITE
    board[0][1] = BLACK; // (1,0) - above WHITE
    board[2][1] = BLACK; // (1,2) - below WHITE

    // Place WHITE stone with 1 liberty
    board[1][1] = WHITE; // (1,1) - liberty only at (2,1)

    // Place WHITE stones blocking the capturing position (2,1) on 3 sides
    board[0][2] = WHITE; // (2,0) - above capturing position
    board[1][3] = WHITE; // (3,1) - right of capturing position
    board[2][2] = WHITE; // (2,2) - below capturing position

    // Verify WHITE at (1,1) has exactly 1 liberty
    var whiteGroup = getGroup(board, 1, 1);
    expect(whiteGroup.stones.length).toBe(1);
    var whiteLiberties = getLiberties(board, whiteGroup.stones);
    expect(whiteLiberties.length).toBe(1);
    expect(whiteLiberties[0].x).toBe(2);
    expect(whiteLiberties[0].y).toBe(1);

    // BLACK plays at (2,1) to capture WHITE at (1,1)
    var result = playMove(board, 2, 1, BLACK);
    expect(result).not.toBeNull();
    expect(result.captures).toBe(1);
    expect(result.board[1][1]).toBe(EMPTY);
    // Ko point should be set to the captured stone position
    expect(result.koPoint).not.toBeNull();
    expect(result.koPoint.x).toBe(1);
    expect(result.koPoint.y).toBe(1);
  });
});

describe("isLegalMove", () => {
  it("allows valid move", () => {
    var board = createBoard();
    expect(isLegalMove(board, 9, 9, BLACK, null)).toBe(true);
  });
  it("rejects occupied position", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    expect(isLegalMove(board, 9, 9, WHITE, null)).toBe(false);
  });
  it("rejects ko position", () => {
    var board = createBoard();
    var koPoint = { x: 9, y: 9 };
    expect(isLegalMove(board, 9, 9, BLACK, koPoint)).toBe(false);
  });
  it("rejects suicide", () => {
    var board = createBoard();
    board[8][9] = WHITE;
    board[10][9] = WHITE;
    board[9][8] = WHITE;
    board[9][10] = WHITE;
    expect(isLegalMove(board, 9, 9, BLACK, null)).toBe(false);
  });
  it("no ko point when the capturing group is larger than one stone", () => {
    var board = createBoard();
    // WHITE stone at (1,1) in atari, its last liberty at (2,1).
    board[1][1] = WHITE;
    board[1][0] = BLACK; // (0,1)
    board[0][1] = BLACK; // (1,0)
    board[2][1] = BLACK; // (1,2)
    // BLACK stones at (2,1)... wait: the capture happens at x=2,y=1. The
    // capturing stone there connects to a friendly stone at (3,1); all other
    // liberties of the pair are blocked by alive WHITE stones, so after the
    // capture the BLACK group {(2,1),(3,1)} has exactly one liberty at the
    // captured point (1,1) but is NOT a single stone: an immediate
    // recapture takes two stones and never repeats the position, so this is
    // NOT a ko and no ko point may be set.
    board[1][3] = BLACK; // (3,1), connects to the capturing stone
    board[0][2] = WHITE; // (2,0) blocks
    board[2][2] = WHITE; // (2,2) blocks
    board[1][4] = WHITE; // (4,1) blocks
    board[0][3] = WHITE; // (3,0) blocks
    board[2][3] = WHITE; // (3,2) blocks

    var result = playMove(board, 2, 1, BLACK);
    expect(result).not.toBeNull();
    expect(result.captures).toBe(1);
    expect(result.board[1][1]).toBe(EMPTY);
    expect(result.koPoint).toBeNull();
  });
});

describe("getLegalMoves", () => {
  it("returns all positions for empty board", () => {
    var board = createBoard();
    var moves = getLegalMoves(board, BLACK, null);
    expect(moves.length).toBe(BOARD_SIZE * BOARD_SIZE);
  });
  it("excludes occupied positions", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    var moves = getLegalMoves(board, WHITE, null);
    expect(moves.length).toBe(BOARD_SIZE * BOARD_SIZE - 1);
  });
  it("excludes ko position", () => {
    var board = createBoard();
    var koPoint = { x: 9, y: 9 };
    var moves = getLegalMoves(board, BLACK, koPoint);
    expect(moves.length).toBe(BOARD_SIZE * BOARD_SIZE - 1);
  });
});

describe("calculateScore", () => {
  it("counts stones on empty board", () => {
    var board = createBoard();
    var score = calculateScore(board);
    expect(score.blackStones).toBe(0);
    expect(score.whiteStones).toBe(0);
    expect(score.black).toBe(0);
    expect(score.white).toBe(0);
  });
  it("counts stones correctly", () => {
    var board = createBoard();
    board[9][9] = BLACK;
    board[9][10] = WHITE;
    var score = calculateScore(board);
    expect(score.blackStones).toBe(1);
    expect(score.whiteStones).toBe(1);
  });
  it("calculates territory", () => {
    var board = createBoard();
    // Simple territory: BLACK controls top-left
    for (var y = 0; y < 9; y++) {
      board[y][9] = BLACK;
    }
    for (var x = 0; x < 9; x++) {
      board[9][x] = BLACK;
    }
    var score = calculateScore(board);
    expect(score.blackTerritory).toBeGreaterThan(0);
  });
});

describe("judgeRPS", () => {
  it("rock beats scissors", () => {
    expect(judgeRPS("rock", "scissors")).toBe(1);
    expect(judgeRPS("scissors", "rock")).toBe(-1);
  });
  it("scissors beats paper", () => {
    expect(judgeRPS("scissors", "paper")).toBe(1);
    expect(judgeRPS("paper", "scissors")).toBe(-1);
  });
  it("paper beats rock", () => {
    expect(judgeRPS("paper", "rock")).toBe(1);
    expect(judgeRPS("rock", "paper")).toBe(-1);
  });
  it("same choice is draw", () => {
    expect(judgeRPS("rock", "rock")).toBe(0);
    expect(judgeRPS("scissors", "scissors")).toBe(0);
    expect(judgeRPS("paper", "paper")).toBe(0);
  });
});

describe("getRPSName", () => {
  it("returns correct names", () => {
    expect(getRPSName("rock")).toBe("石头");
    expect(getRPSName("scissors")).toBe("剪刀");
    expect(getRPSName("paper")).toBe("布");
  });
  it("returns original for unknown", () => {
    expect(getRPSName("unknown")).toBe("unknown");
  });
});

describe("createGameState", () => {
  it("creates correct initial state", () => {
    var state = createGameState("pvp");
    expect(state.mode).toBe("pvp");
    expect(state.currentPlayer).toBe(BLACK);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.koPoint).toBeNull();
    expect(state.passCount).toBe(0);
    expect(state.capturesBlack).toBe(0);
    expect(state.capturesWhite).toBe(0);
    expect(state.turnCount).toBe(0);
    expect(state.aiThinking).toBe(false);
    expect(state.lastMove).toBeNull();
    expect(state.komi).toBe(6.5);
    expect(state.board.length).toBe(19);
  });
  it("pve mode has null teams initially", () => {
    var state = createGameState("pve");
    expect(state.playerTeam).toBeNull();
    expect(state.aiTeam).toBeNull();
  });
});
