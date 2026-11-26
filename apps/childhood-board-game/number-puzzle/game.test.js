import { describe, it, expect } from "vitest";
import {
  PUZZLE_SIZES,
  DEFAULT_SIZE,
  BLANK,
  SIZE_SHUFFLE_STEPS,
  isValidSize,
  getSizeLabel,
  createSolvedBoard,
  getBoardSize,
  getBlankIndex,
  isSolved,
  getNeighbors,
  canMove,
  moveTile,
  countInversions,
  isSolvable,
  shuffleBoard,
  manhattanDistance,
  getDirectionTarget,
  formatTime,
  getRecordKey,
  isBetterRecord,
  getHint,
} from "./game.js";

/**
 * Deterministic pseudo random source so shuffle tests are reproducible.
 * @param {number} seed
 * @returns {() => number}
 */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

describe("constants", () => {
  it("supports 3x3, 4x4 and 5x5 grids", () => {
    expect(PUZZLE_SIZES).toEqual([3, 4, 5]);
  });
  it("defaults to the classic 4x4 board", () => {
    expect(DEFAULT_SIZE).toBe(4);
  });
  it("uses 0 for the empty cell", () => {
    expect(BLANK).toBe(0);
  });
  it("defines shuffle steps for every size", () => {
    PUZZLE_SIZES.forEach((size) => {
      expect(SIZE_SHUFFLE_STEPS[size]).toBeGreaterThan(0);
    });
  });
});

describe("isValidSize", () => {
  it("accepts supported sizes", () => {
    expect(isValidSize(3)).toBe(true);
    expect(isValidSize(4)).toBe(true);
    expect(isValidSize(5)).toBe(true);
  });
  it("accepts numeric strings", () => {
    expect(isValidSize("4")).toBe(true);
  });
  it("rejects unsupported sizes", () => {
    expect(isValidSize(2)).toBe(false);
    expect(isValidSize(6)).toBe(false);
    expect(isValidSize(null)).toBe(false);
  });
});

describe("getSizeLabel", () => {
  it("returns labelled difficulty names", () => {
    expect(getSizeLabel(3)).toBe("简单 3×3");
    expect(getSizeLabel(4)).toBe("经典 4×4");
    expect(getSizeLabel(5)).toBe("挑战 5×5");
  });
  it("falls back to a plain size label", () => {
    expect(getSizeLabel(6)).toBe("6×6");
  });
});

describe("createSolvedBoard", () => {
  it("builds a 4x4 solved board", () => {
    expect(createSolvedBoard(4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
  });
  it("builds a 3x3 solved board", () => {
    expect(createSolvedBoard(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });
  it("ends with the empty cell", () => {
    const board = createSolvedBoard(5);
    expect(board.length).toBe(25);
    expect(board[board.length - 1]).toBe(BLANK);
  });
  it("falls back to the default size for invalid input", () => {
    expect(createSolvedBoard(9).length).toBe(DEFAULT_SIZE * DEFAULT_SIZE);
  });
});

describe("getBoardSize", () => {
  it("infers the width from the array length", () => {
    expect(getBoardSize(createSolvedBoard(3))).toBe(3);
    expect(getBoardSize(createSolvedBoard(4))).toBe(4);
    expect(getBoardSize(createSolvedBoard(5))).toBe(5);
  });
});

describe("getBlankIndex", () => {
  it("finds the empty cell", () => {
    expect(getBlankIndex([1, 2, 3, 0])).toBe(3);
    expect(getBlankIndex([0, 1, 2, 3])).toBe(0);
  });
});

describe("isSolved", () => {
  it("is true for the solved board", () => {
    expect(isSolved(createSolvedBoard(3))).toBe(true);
    expect(isSolved(createSolvedBoard(4))).toBe(true);
  });
  it("is false when a tile is out of place", () => {
    expect(isSolved([2, 1, 3, 4, 5, 6, 7, 8, 0])).toBe(false);
  });
  it("is false when the empty cell is misplaced", () => {
    expect(isSolved([0, 1, 2, 3, 4, 5, 6, 7, 8])).toBe(false);
  });
});

describe("getNeighbors", () => {
  it("gives a corner two neighbors", () => {
    expect(getNeighbors(0, 4).sort((a, b) => a - b)).toEqual([1, 4]);
  });
  it("gives a border cell three neighbors", () => {
    expect(getNeighbors(1, 4).sort((a, b) => a - b)).toEqual([0, 2, 5]);
  });
  it("gives a centre cell four neighbors", () => {
    expect(getNeighbors(5, 4).sort((a, b) => a - b)).toEqual([1, 4, 6, 9]);
  });
});

describe("canMove", () => {
  const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];

  it("allows a tile next to the empty cell", () => {
    expect(canMove(board, 4)).toBe(true);
    expect(canMove(board, 6)).toBe(true);
    expect(canMove(board, 8)).toBe(true);
  });
  it("rejects a tile that is not adjacent", () => {
    expect(canMove(board, 0)).toBe(false);
    expect(canMove(board, 1)).toBe(false);
  });
  it("rejects the empty cell and out-of-range indexes", () => {
    expect(canMove(board, 7)).toBe(false);
    expect(canMove(board, -1)).toBe(false);
    expect(canMove(board, 9)).toBe(false);
    expect(canMove(board, 1.5)).toBe(false);
  });
});

describe("moveTile", () => {
  const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];

  it("slides the tile into the empty cell", () => {
    expect(moveTile(board, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });
  it("moves the empty cell to the tile's old position", () => {
    const next = moveTile(board, 6);
    expect(next[6]).toBe(BLANK);
    expect(next[7]).toBe(7);
  });
  it("does not mutate the source board", () => {
    moveTile(board, 8);
    expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });
  it("returns null for an illegal move", () => {
    expect(moveTile(board, 0)).toBeNull();
    expect(moveTile(board, 7)).toBeNull();
  });
});

describe("countInversions", () => {
  it("is 0 for the solved board", () => {
    expect(countInversions(createSolvedBoard(4))).toBe(0);
  });
  it("ignores the empty cell", () => {
    expect(countInversions([2, 1, 3, 0])).toBe(1);
  });
  it("counts every out-of-order pair", () => {
    expect(countInversions([3, 2, 1, 0])).toBe(3);
  });
});

describe("isSolvable", () => {
  it("treats solved boards as solvable", () => {
    expect(isSolvable(createSolvedBoard(3))).toBe(true);
    expect(isSolvable(createSolvedBoard(4))).toBe(true);
    expect(isSolvable(createSolvedBoard(5))).toBe(true);
  });
  it("rejects a single transposition on an odd grid", () => {
    expect(isSolvable([2, 1, 3, 4, 5, 6, 7, 8, 0])).toBe(false);
  });
  it("rejects a single transposition on an even grid", () => {
    const swapped = createSolvedBoard(4);
    swapped[0] = 2;
    swapped[1] = 1;
    expect(isSolvable(swapped)).toBe(false);
  });
  it("accepts a board reached by one legal move", () => {
    const moved = moveTile(createSolvedBoard(4), 11);
    expect(isSolvable(moved)).toBe(true);
  });
});

describe("shuffleBoard", () => {
  it("keeps every tile exactly once", () => {
    PUZZLE_SIZES.forEach((size) => {
      const board = shuffleBoard(size, { random: seededRandom(size) });
      const sorted = board.slice().sort((a, b) => a - b);
      const expected = [];
      for (let value = 0; value < size * size; value++) expected.push(value);
      expect(sorted).toEqual(expected);
    });
  });
  it("always produces a solvable board", () => {
    for (let seed = 1; seed <= 30; seed++) {
      PUZZLE_SIZES.forEach((size) => {
        expect(isSolvable(shuffleBoard(size, { random: seededRandom(seed) }))).toBe(true);
      });
    }
  });
  it("does not return the solved board", () => {
    PUZZLE_SIZES.forEach((size) => {
      expect(isSolved(shuffleBoard(size, { random: seededRandom(7) }))).toBe(false);
    });
  });
  it("never walks backwards through the same move", () => {
    const board = shuffleBoard(4, { random: seededRandom(3), steps: 400 });
    expect(board).not.toEqual(createSolvedBoard(4));
  });
  it("falls back to the default size for invalid input", () => {
    expect(shuffleBoard(9, { random: seededRandom(1) }).length).toBe(16);
  });
  it("returns a solved board when the random source cannot move", () => {
    // random() === 0 always picks the first candidate, which still walks,
    // so the result stays solvable even for a degenerate source.
    const board = shuffleBoard(3, { random: () => 0, steps: 10 });
    expect(isSolvable(board)).toBe(true);
    expect(board.length).toBe(9);
  });
});

describe("manhattanDistance", () => {
  it("is 0 for the solved board", () => {
    expect(manhattanDistance(createSolvedBoard(4))).toBe(0);
  });
  it("is 1 after a single slide", () => {
    expect(manhattanDistance(moveTile(createSolvedBoard(3), 7))).toBe(1);
  });
  it("counts each row and column step", () => {
    // Blank first: every tile sits one step right or one row below its target.
    const board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(manhattanDistance(board)).toBe(12);
  });
});

describe("getDirectionTarget", () => {
  const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];

  it("slides the tile above the empty cell downwards", () => {
    expect(getDirectionTarget(board, "down")).toBe(4);
  });
  it("slides the tile left of the empty cell rightwards", () => {
    expect(getDirectionTarget(board, "right")).toBe(6);
  });
  it("slides the tile below the empty cell upwards", () => {
    const centreBlank = [1, 2, 3, 4, 0, 6, 7, 5, 8];
    expect(getDirectionTarget(centreBlank, "up")).toBe(7);
  });
  it("reports a blocked direction as -1", () => {
    const cornerBlank = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(getDirectionTarget(cornerBlank, "up")).toBe(3);
    expect(getDirectionTarget(cornerBlank, "left")).toBe(1);
    expect(getDirectionTarget(cornerBlank, "down")).toBe(-1);
    expect(getDirectionTarget(cornerBlank, "right")).toBe(-1);
  });
  it("returns -1 for an unknown direction", () => {
    expect(getDirectionTarget(board, "sideways")).toBe(-1);
  });
});

describe("formatTime", () => {
  it("formats zero", () => {
    expect(formatTime(0)).toBe("00:00");
  });
  it("pads minutes and seconds", () => {
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(65)).toBe("01:05");
  });
  it("keeps counting past an hour", () => {
    expect(formatTime(3661)).toBe("61:01");
  });
  it("clamps invalid input", () => {
    expect(formatTime(-5)).toBe("00:00");
    expect(formatTime(undefined)).toBe("00:00");
  });
});

describe("getRecordKey", () => {
  it("keys records per board size", () => {
    expect(getRecordKey(3)).toBe("number-puzzle:best:3");
    expect(getRecordKey(4)).toBe("number-puzzle:best:4");
  });
  it("falls back to the default size", () => {
    expect(getRecordKey(9)).toBe("number-puzzle:best:" + DEFAULT_SIZE);
  });
});

describe("getHint", () => {
  const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];

  it("returns a movable tile", () => {
    const hint = getHint(board, { level: "hard", random: seededRandom(5) });
    expect(canMove(board, hint)).toBe(true);
  });
  it("solves the last pair on master level", () => {
    expect(getHint(board, { level: "master", random: () => 0.99 })).toBe(8);
  });
  it("can be noisy on easy level", () => {
    expect(getHint(board, { level: "easy", random: () => 0 })).toBe(4);
  });
  it("stays playable on a freshly shuffled board", () => {
    PUZZLE_SIZES.forEach((size) => {
      const shuffled = shuffleBoard(size, { random: seededRandom(11) });
      [3, 4, 5].forEach((seed) => {
        const hint = getHint(shuffled, { level: "normal", random: seededRandom(seed) });
        expect(canMove(shuffled, hint)).toBe(true);
      });
    });
  });
});

describe("isBetterRecord", () => {
  it("any record beats no record", () => {
    expect(isBetterRecord(null, { moves: 120, time: 90 })).toBe(true);
  });
  it("fewer moves wins", () => {
    expect(isBetterRecord({ moves: 100, time: 60 }, { moves: 99, time: 500 })).toBe(true);
    expect(isBetterRecord({ moves: 100, time: 60 }, { moves: 101, time: 10 })).toBe(false);
  });
  it("compares time when moves are equal", () => {
    expect(isBetterRecord({ moves: 100, time: 60 }, { moves: 100, time: 59 })).toBe(true);
    expect(isBetterRecord({ moves: 100, time: 60 }, { moves: 100, time: 60 })).toBe(false);
  });
});
