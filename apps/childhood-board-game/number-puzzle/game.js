/* eslint-disable no-undef */
// ============================================================
// Number Sliding Puzzle (数字华容道) - Game Core Logic
// ============================================================

// Supported grid sizes. A 4x4 grid is the classic 15-puzzle.
const PUZZLE_SIZES = [3, 4, 5];
const DEFAULT_SIZE = 4;
// The empty cell is stored as 0 so the board is a plain number array.
const BLANK = 0;

const SIZE_LABELS = {
  3: "简单 3×3",
  4: "经典 4×4",
  5: "挑战 5×5",
};

// A random walk needs enough steps to look truly shuffled, but staying
// close to `size * size * 25` keeps the first board reasonably easy.
const SIZE_SHUFFLE_STEPS = {
  3: 120,
  4: 400,
  5: 800,
};

/**
 * Whether a grid size is supported.
 * @param {number} size
 * @returns {boolean}
 */
function isValidSize(size) {
  return PUZZLE_SIZES.indexOf(Number(size)) !== -1;
}

/**
 * Human readable label for a grid size.
 * @param {number} size
 * @returns {string}
 */
function getSizeLabel(size) {
  return SIZE_LABELS[size] || size + "×" + size;
}

/**
 * Build the solved board: [1, 2, ..., n-1, 0].
 * @param {number} [size=DEFAULT_SIZE]
 * @returns {number[]}
 */
function createSolvedBoard(size) {
  const width = isValidSize(size) ? Number(size) : DEFAULT_SIZE;
  const board = [];
  for (let value = 1; value < width * width; value++) {
    board.push(value);
  }
  board.push(BLANK);
  return board;
}

/**
 * Board width inferred from the flat array length.
 * @param {number[]} board
 * @returns {number}
 */
function getBoardSize(board) {
  return Math.round(Math.sqrt(board.length));
}

/**
 * Index of the empty cell.
 * @param {number[]} board
 * @returns {number}
 */
function getBlankIndex(board) {
  return board.indexOf(BLANK);
}

/**
 * Whether every tile sits on its target cell.
 * @param {number[]} board
 * @returns {boolean}
 */
function isSolved(board) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === BLANK;
}

function getRow(index, size) {
  return Math.floor(index / size);
}

function getCol(index, size) {
  return index % size;
}

/**
 * Orthogonally adjacent cell indexes.
 * @param {number} index
 * @param {number} size
 * @returns {number[]}
 */
function getNeighbors(index, size) {
  const row = getRow(index, size);
  const col = getCol(index, size);
  const result = [];
  if (row > 0) result.push(index - size);
  if (row < size - 1) result.push(index + size);
  if (col > 0) result.push(index - 1);
  if (col < size - 1) result.push(index + 1);
  return result;
}

/**
 * Whether the tile at `index` can slide into the empty cell.
 * @param {number[]} board
 * @param {number} index
 * @returns {boolean}
 */
function canMove(board, index) {
  if (!Number.isInteger(index) || index < 0 || index >= board.length) return false;
  const size = getBoardSize(board);
  return getNeighbors(getBlankIndex(board), size).indexOf(index) !== -1;
}

/**
 * Slide one tile into the empty cell.
 * Returns a new board, or null when the move is illegal.
 * @param {number[]} board
 * @param {number} index
 * @returns {number[]|null}
 */
function moveTile(board, index) {
  if (!canMove(board, index)) return null;
  const blank = getBlankIndex(board);
  const next = board.slice();
  next[blank] = board[index];
  next[index] = BLANK;
  return next;
}

/**
 * Inversion count of the tile sequence (the blank is ignored).
 * @param {number[]} board
 * @returns {number}
 */
function countInversions(board) {
  const tiles = board.filter((value) => value !== BLANK);
  let inversions = 0;
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (tiles[i] > tiles[j]) inversions++;
    }
  }
  return inversions;
}

/**
 * Classic N-puzzle solvability test.
 * - odd width : solvable when the inversion count is even
 * - even width: solvable when inversions + blank row (from the bottom) is odd
 * @param {number[]} board
 * @returns {boolean}
 */
function isSolvable(board) {
  const size = getBoardSize(board);
  const inversions = countInversions(board);
  if (size % 2 === 1) return inversions % 2 === 0;
  const blankRowFromBottom = size - getRow(getBlankIndex(board), size);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

/**
 * Shuffle by walking the blank backwards from the solved board.
 * Every reachable position is reachable this way, so the result is
 * guaranteed to be solvable - no parity fix-up needed.
 * @param {number} [size=DEFAULT_SIZE]
 * @param {{random?: Function, steps?: number}} [options]
 * @returns {number[]}
 */
function shuffleBoard(size, options) {
  const width = isValidSize(size) ? Number(size) : DEFAULT_SIZE;
  const opts = options || {};
  const random = typeof opts.random === "function" ? opts.random : Math.random;
  const steps = opts.steps || SIZE_SHUFFLE_STEPS[width] || width * width * 25;

  // A deterministic random source can produce the solved board again;
  // retry a few times instead of looping forever.
  for (let attempt = 0; attempt < 8; attempt++) {
    const board = createSolvedBoard(width);
    let blank = board.length - 1;
    let previousBlank = -1;
    for (let step = 0; step < steps; step++) {
      const candidates = getNeighbors(blank, width).filter((idx) => idx !== previousBlank);
      const target = candidates[Math.floor(random() * candidates.length)];
      board[blank] = board[target];
      board[target] = BLANK;
      previousBlank = blank;
      blank = target;
    }
    if (!isSolved(board)) return board;
  }
  return createSolvedBoard(width);
}

/**
 * Total Manhattan distance from every tile to its target cell.
 * Used as a difficulty / progress estimate.
 * @param {number[]} board
 * @returns {number}
 */
function manhattanDistance(board) {
  const size = getBoardSize(board);
  let total = 0;
  board.forEach((value, index) => {
    if (value === BLANK) return;
    const target = value - 1;
    total +=
      Math.abs(getRow(index, size) - getRow(target, size)) +
      Math.abs(getCol(index, size) - getCol(target, size));
  });
  return total;
}

/**
 * Target tile index for a keyboard direction.
 * The arrow points at the direction the *tile* travels, so ArrowUp
 * slides the tile below the blank upwards.
 * @param {number[]} board
 * @param {string} key - "up" | "down" | "left" | "right"
 * @returns {number} tile index, or -1 when the direction is blocked
 */
function getDirectionTarget(board, key) {
  const size = getBoardSize(board);
  const blank = getBlankIndex(board);
  const row = getRow(blank, size);
  const col = getCol(blank, size);
  if (key === "up") return row < size - 1 ? blank + size : -1;
  if (key === "down") return row > 0 ? blank - size : -1;
  if (key === "left") return col < size - 1 ? blank + 1 : -1;
  if (key === "right") return col > 0 ? blank - 1 : -1;
  return -1;
}

/**
 * Format seconds as mm:ss.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return String(minutes).padStart(2, "0") + ":" + String(rest).padStart(2, "0");
}

/**
 * localStorage key of the personal best record for a grid size.
 * @param {number} size
 * @returns {string}
 */
function getRecordKey(size) {
  return "number-puzzle:best:" + (isValidSize(size) ? Number(size) : DEFAULT_SIZE);
}

/**
 * Whether `candidate` beats `record` (fewer moves, then less time).
 * @param {{moves: number, time: number}|null} record
 * @param {{moves: number, time: number}} candidate
 * @returns {boolean}
 */
function isBetterRecord(record, candidate) {
  if (!record) return true;
  if (candidate.moves !== record.moves) return candidate.moves < record.moves;
  return candidate.time < record.time;
}

// ============================================================
// Hint engine (shared AI module)
// ============================================================
//
// The factory lives in ai.js. In the browser that file only exposes
// `globalThis.PuzzleHint`, so this binding is deliberately not named
// `createPuzzleAI` - a top-level duplicate would collide with the
// classic-script global and break the whole file at parse time.

const createHintEngine =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createPuzzleAI
    : globalThis.PuzzleHint.createPuzzleAI;

const puzzleAI = createHintEngine({
  getBlankIndex,
  getNeighbors,
  getBoardSize,
  manhattanDistance,
  moveTile,
});

/**
 * Suggest the next tile to slide.
 * @param {number[]} board
 * @param {{level?: string, random?: Function}} [options]
 * @returns {number} tile index, or -1 when nothing can move
 */
function getHint(board, options) {
  return puzzleAI.getHint(board, options);
}

// ============================================================
// Export for testing
// ============================================================

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PUZZLE_SIZES,
    DEFAULT_SIZE,
    BLANK,
    SIZE_LABELS,
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
  };
}

// ============================================================
// Browser UI
// ============================================================

if (typeof document !== "undefined") {
  const KEY_DIRECTIONS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  const state = {
    size: DEFAULT_SIZE,
    board: [],
    moves: 0,
    history: [],
    elapsed: 0,
    startedAt: 0,
    timerId: null,
    finished: false,
    record: null,
  };

  const tiles = new Map();
  let boardGrid = null;
  let boardHole = null;
  let cellSize = 0;
  let gapSize = 0;

  function $(id) {
    return document.getElementById(id);
  }

  function loadRecord(size) {
    try {
      const raw = localStorage.getItem(getRecordKey(size));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.moves !== "number" || typeof parsed.time !== "number") return null;
      return { moves: parsed.moves, time: parsed.time };
    } catch (err) {
      console.warn("[number-puzzle] failed to read best record:", err);
      return null;
    }
  }

  function saveRecord(size, record) {
    try {
      localStorage.setItem(getRecordKey(size), JSON.stringify(record));
    } catch (err) {
      console.warn("[number-puzzle] failed to save best record:", err);
    }
  }

  function stopTimer() {
    if (state.timerId !== null) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function startTimer() {
    if (state.timerId !== null || state.finished) return;
    state.startedAt = Date.now() - state.elapsed * 1000;
    state.timerId = setInterval(() => {
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      $("timer").textContent = formatTime(state.elapsed);
    }, 1000);
  }

  function resetTimer() {
    stopTimer();
    state.elapsed = 0;
    $("timer").textContent = formatTime(0);
  }

  function updateStatus() {
    $("size-label").textContent = getSizeLabel(state.size);
    $("move-count").textContent = String(state.moves);
    $("step-count").textContent =
      "共 " + (state.size * state.size - 1) + " 个数字方块，留 1 个空格";
    const best = state.record;
    $("best-record").textContent = best ? best.moves + " 步 / " + formatTime(best.time) : "—";
  }

  function updateMessage(text, type) {
    const el = $("message");
    el.textContent = text;
    el.className = type || "";
  }

  /**
   * Recompute the geometry so tiles stay square at any viewport width.
   */
  function layoutBoard() {
    if (!boardGrid) return;
    const width = boardGrid.clientWidth;
    if (!width) return;
    cellSize = width / state.size;
    gapSize = Math.max(3, Math.round(cellSize * 0.06));
    const tileSize = cellSize - gapSize;
    const fontSize = Math.max(14, Math.round(tileSize * 0.42));
    tiles.forEach((el) => {
      el.style.width = tileSize + "px";
      el.style.height = tileSize + "px";
      el.style.fontSize = fontSize + "px";
    });
    if (boardHole) {
      boardHole.style.width = tileSize + "px";
      boardHole.style.height = tileSize + "px";
    }
    positionTiles();
  }

  function offsetOf(index) {
    const col = getCol(index, state.size);
    const row = getRow(index, state.size);
    return {
      x: col * cellSize + gapSize / 2,
      y: row * cellSize + gapSize / 2,
    };
  }

  /**
   * Move every tile to the place its value currently occupies.
   * CSS transitions animate the difference, which reads as a slide.
   */
  function positionTiles() {
    if (!boardGrid || !cellSize) return;
    state.board.forEach((value, index) => {
      const offset = offsetOf(index);
      if (value === BLANK) {
        if (boardHole) {
          boardHole.style.transform = "translate(" + offset.x + "px," + offset.y + "px)";
        }
        return;
      }
      const el = tiles.get(value);
      if (!el) return;
      el.style.transform = "translate(" + offset.x + "px," + offset.y + "px)";
      el.classList.toggle("tile-placed", value === index + 1);
    });
  }

  function buildTiles() {
    boardGrid.innerHTML = "";
    tiles.clear();

    boardHole = document.createElement("div");
    boardHole.className = "board-hole";
    boardGrid.appendChild(boardHole);

    for (let value = 1; value < state.size * state.size; value++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "tile";
      el.textContent = String(value);
      el.dataset.value = String(value);
      el.setAttribute("aria-label", "数字 " + value);
      el.addEventListener("click", () => handleTileClick(value));
      boardGrid.appendChild(el);
      tiles.set(value, el);
    }
    layoutBoard();
  }

  function handleTileClick(value) {
    if (state.finished) return;
    const index = state.board.indexOf(value);
    if (index === -1) return;
    slide(index);
  }

  /**
   * Apply one legal slide and update all dependent UI.
   * @param {number} index
   * @returns {boolean} whether the move happened
   */
  function slide(index) {
    if (state.finished) return false;
    const next = moveTile(state.board, index);
    if (!next) {
      SoundManager.play("error");
      updateMessage("只能滑动空格旁边的数字", "error");
      return false;
    }

    state.history.push(state.board.slice());
    if (state.history.length > 500) state.history.shift();
    state.board = next;
    state.moves += 1;
    if (state.timerId === null) startTimer();
    SoundManager.play("slide");
    updateMessage("", "");

    positionTiles();
    updateStatus();
    $("undo-count").textContent = String(state.history.length);

    if (isSolved(state.board)) finishGame();
    return true;
  }

  function finishGame() {
    state.finished = true;
    stopTimer();
    SoundManager.play("victory");

    const time = state.elapsed;
    const record = { moves: state.moves, time: time };
    const isNewRecord = isBetterRecord(state.record, record);
    if (isNewRecord) {
      state.record = record;
      saveRecord(state.size, record);
    }
    updateStatus();

    $("winner-text").textContent = "🎉 拼好了！";
    $("result-detail").textContent =
      getSizeLabel(state.size) + "  ·  " + state.moves + " 步  ·  用时 " + formatTime(time);
    $("result-record").textContent = isNewRecord ? "🏆 新纪录！" : "继续挑战更少步数吧";
    $("game-over").style.display = "flex";
  }

  function undo() {
    if (state.finished || state.history.length === 0) {
      updateMessage("没有可撤销的步骤", "error");
      return;
    }
    state.board = state.history.pop();
    state.moves = Math.max(0, state.moves - 1);
    SoundManager.play("click");
    positionTiles();
    updateStatus();
    $("undo-count").textContent = String(state.history.length);
    updateMessage("已撤销一步", "info");
  }

  /**
   * Highlight the tile the hint engine recommends next.
   */
  function showHint() {
    if (state.finished) return;
    const index = getHint(state.board);
    if (index < 0) return;
    const value = state.board[index];
    const el = tiles.get(value);
    if (el) {
      el.classList.add("tile-hint");
      setTimeout(() => el.classList.remove("tile-hint"), 1600);
    }
    SoundManager.play("click");
    updateMessage("提示：试试滑动「" + value + "」", "info");
  }

  function startGame(size) {
    state.size = isValidSize(size) ? Number(size) : DEFAULT_SIZE;
    // The shared AI control drives how sharp the hints are, so expose it in game.
    if (typeof AIDifficulty !== "undefined") AIDifficulty.setMode("pve");
    state.board = shuffleBoard(state.size);
    state.moves = 0;
    state.history = [];
    state.finished = false;
    state.record = loadRecord(state.size);
    resetTimer();

    $("mode-selection").style.display = "none";
    $("game-over").style.display = "none";
    $("game-area").style.display = "flex";
    $("undo-count").textContent = "0";
    updateMessage("", "");

    buildTiles();
    updateStatus();
  }

  function backToSelection() {
    stopTimer();
    state.finished = true;
    $("game-over").style.display = "none";
    $("game-area").style.display = "none";
    $("mode-selection").style.display = "flex";
  }

  function handleKeydown(event) {
    const direction = KEY_DIRECTIONS[event.key] || KEY_DIRECTIONS[event.key.toLowerCase()];
    if (!direction) return;
    if ($("game-area").style.display === "none") return;
    event.preventDefault();
    const target = getDirectionTarget(state.board, direction);
    if (target < 0) return;
    slide(target);
  }

  document.addEventListener("DOMContentLoaded", () => {
    boardGrid = $("board-grid");
    SoundManager.init("../../audio");

    document.querySelectorAll(".btn-size").forEach((button) => {
      button.addEventListener("click", () => {
        SoundManager.play("click");
        startGame(Number(button.dataset.size));
      });
    });

    $("btn-shuffle").addEventListener("click", () => {
      SoundManager.play("click");
      startGame(state.size);
    });
    $("btn-undo").addEventListener("click", undo);
    $("btn-hint").addEventListener("click", showHint);
    $("btn-back").addEventListener("click", backToSelection);
    $("btn-again").addEventListener("click", () => startGame(state.size));
    $("btn-change-size").addEventListener("click", backToSelection);

    document.addEventListener("keydown", handleKeydown);
    window.addEventListener("resize", layoutBoard);

    $("mode-selection").style.display = "flex";
    $("game-area").style.display = "none";
    $("game-over").style.display = "none";
  });
}
