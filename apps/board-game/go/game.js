/* eslint-disable no-var, no-undef */
// ============================================================
// Go (Weiqi) - Game core logic
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const BOARD_SIZE = 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const KOMI = 6.5;

// Direction array: up, right, down, left
const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

function createBoard() {
  const board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      row.push(EMPTY);
    }
    board.push(row);
  }
  return board;
}

function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

function getPlayerName(player) {
  return player === BLACK ? "黑棋" : "白棋";
}

function isValidPosition(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// ============================================================
// Liberties and capture logic (core)
// ============================================================

/**
 * Get the connected group of stones (BFS)
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @returns {{ stones: Array<{x: number, y: number}>, color: number }}
 */
function getGroup(board, x, y) {
  const color = board[y][x];
  if (color === EMPTY) return { stones: [], color: EMPTY };

  const visited = {};
  const stones = [];
  const queue = [{ x: x, y: y }];
  visited[x + "," + y] = true;

  while (queue.length > 0) {
    const pos = queue.shift();
    stones.push(pos);

    for (let i = 0; i < DIRECTIONS.length; i++) {
      const nx = pos.x + DIRECTIONS[i].dx;
      const ny = pos.y + DIRECTIONS[i].dy;
      const key = nx + "," + ny;

      if (isValidPosition(nx, ny) && !visited[key] && board[ny][nx] === color) {
        visited[key] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return { stones: stones, color: color };
}

/**
 * Calculate liberties (adjacent empty points) of a stone group
 * @param {number[][]} board
 * @param {Array<{x: number, y: number}>} group
 * @returns {Array<{x: number, y: number}>}
 */
function getLiberties(board, group) {
  const liberties = [];
  const visited = {};

  for (const stone of group) {
    for (const dir of DIRECTIONS) {
      const nx = stone.x + dir.dx;
      const ny = stone.y + dir.dy;
      const key = nx + "," + ny;

      if (isValidPosition(nx, ny) && !visited[key] && board[ny][nx] === EMPTY) {
        visited[key] = true;
        liberties.push({ x: nx, y: ny });
      }
    }
  }

  return liberties;
}

/**
 * Remove a group of stones (capture)
 * @param {number[][]} board
 * @param {Array<{x: number, y: number}>} group
 * @returns {number[][]} new board
 */
function removeGroup(board, group) {
  const newBoard = copyBoard(board);
  for (const stone of group) {
    newBoard[stone.y][stone.x] = EMPTY;
  }
  return newBoard;
}

/**
 * Deep copy the board
 * @param {number[][]} board
 * @returns {number[][]}
 */
function copyBoard(board) {
  const newBoard = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    newBoard.push(board[y].slice());
  }
  return newBoard;
}

/**
 * Place a stone and handle captures
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @returns {{ board: number[][], captures: number, koPoint: {x: number, y: number}|null }}
 */
function playMove(board, x, y, player) {
  const newBoard = copyBoard(board);
  newBoard[y][x] = player;

  const opponent = getOpponent(player);
  let totalCaptures = 0;
  let lastCaptured = null;

  // Check and capture opponent groups with no liberties
  for (const dir of DIRECTIONS) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    if (isValidPosition(nx, ny) && newBoard[ny][nx] === opponent) {
      const group = getGroup(newBoard, nx, ny);
      const liberties = getLiberties(newBoard, group.stones);

      if (liberties.length === 0) {
        // Capture stones
        for (const stone of group.stones) {
          newBoard[stone.y][stone.x] = EMPTY;
          totalCaptures++;
          lastCaptured = { x: stone.x, y: stone.y };
        }
      }
    }
  }

  // Check suicide (if after capture, own group has no liberties and no opponent stones were captured)
  const selfGroup = getGroup(newBoard, x, y);
  const selfLiberties = getLiberties(newBoard, selfGroup.stones);
  if (selfLiberties.length === 0) {
    return null; // Suicide, illegal move
  }

  // Ko detection: a simple ko exists only when exactly one stone was
  // captured and the capturing stone forms a SINGLE-stone group left with
  // exactly one liberty (the classic ko shape). If the capturing group is
  // larger, the opponent's recapture would take several stones and never
  // recreates the previous position, so it must stay legal (e.g. snapbacks).
  let koPoint = null;
  if (totalCaptures === 1 && lastCaptured) {
    const selfGroupAfter = getGroup(newBoard, x, y);
    const selfLibertiesAfter = getLiberties(newBoard, selfGroupAfter.stones);
    if (selfGroupAfter.stones.length === 1 && selfLibertiesAfter.length === 1) {
      koPoint = lastCaptured;
    }
  }

  return {
    board: newBoard,
    captures: totalCaptures,
    koPoint: koPoint,
  };
}

/**
 * Check if a move is legal
 * @param {number[][]} board
 * @param {number} x
 * @param {number} y
 * @param {number} player
 * @param {{x: number, y: number}|null} koPoint
 * @returns {boolean}
 */
function isLegalMove(board, x, y, player, koPoint) {
  // Position must be empty
  if (!isValidPosition(x, y) || board[y][x] !== EMPTY) return false;

  // Ko check
  if (koPoint && koPoint.x === x && koPoint.y === y) return false;

  // Try placing stone
  const result = playMove(board, x, y, player);
  return result !== null;
}

/**
 * Collect all legal move positions
 * @param {number[][]} board
 * @param {number} player
 * @param {{x: number, y: number}|null} koPoint
 * @returns {Array<{x: number, y: number}>}
 */
function getLegalMoves(board, player, koPoint) {
  const moves = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (isLegalMove(board, x, y, player, koPoint)) {
        moves.push({ x: x, y: y });
      }
    }
  }
  return moves;
}

// ============================================================
// End game determination
// ============================================================

/**
 * Calculate territory for both sides (using flood fill)
 * @param {number[][]} board
 * @returns {{ black: number, white: number, blackTerritory: number, whiteTerritory: number }}
 */
function calculateScore(board) {
  const visited = {};
  let blackTerritory = 0;
  let whiteTerritory = 0;
  let blackStones = 0;
  let whiteStones = 0;

  // Count stones
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === BLACK) blackStones++;
      else if (board[y][x] === WHITE) whiteStones++;
    }
  }

  // Use flood fill to identify territory
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const key = x + "," + y;
      if (board[y][x] !== EMPTY || visited[key]) continue;

      // Found an empty point, start flood fill
      const territory = [];
      const borders = {};
      const queue = [{ x: x, y: y }];
      visited[key] = true;

      while (queue.length > 0) {
        const pos = queue.shift();
        territory.push(pos);

        for (const dir of DIRECTIONS) {
          const nx = pos.x + dir.dx;
          const ny = pos.y + dir.dy;
          const nkey = nx + "," + ny;

          if (!isValidPosition(nx, ny) || visited[nkey]) continue;

          if (board[ny][nx] === EMPTY) {
            visited[nkey] = true;
            queue.push({ x: nx, y: ny });
          } else {
            borders[board[ny][nx]] = true;
          }
        }
      }

      // Determine territory ownership
      const borderKeys = Object.keys(borders);
      if (borderKeys.length === 1) {
        const owner = Number.parseInt(borderKeys[0]);
        if (owner === BLACK) {
          blackTerritory += territory.length;
        } else if (owner === WHITE) {
          whiteTerritory += territory.length;
        }
      }
    }
  }

  return {
    black: blackStones + blackTerritory,
    white: whiteStones + whiteTerritory,
    blackTerritory: blackTerritory,
    whiteTerritory: whiteTerritory,
    blackStones: blackStones,
    whiteStones: whiteStones,
  };
}

// ============================================================
// AI: Simplified MCTS
// ============================================================

/**
 * Get the best AI move position
 * @param {number[][]} board
 * @param {number} aiPlayer
 * @param {{x: number, y: number}|null} koPoint
 * @param {number} capturesBlack
 * @param {number} capturesWhite
 * @returns {{x: number, y: number}}
 */

/**
 * Filter candidate move positions (heuristic pruning)
 * Only consider positions near existing stones
 */

/**
 * Heuristic evaluation of move value
 */

/**
 * Simulate a game (fast random play)
 */

/**
 * Quick move generation for simulations - prefers positions near last move
 */

// ============================================================
// Game state
// ============================================================

function createGameState(mode) {
  return {
    mode: mode,
    board: createBoard(),
    currentPlayer: BLACK,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    koPoint: null,
    passCount: 0,
    capturesBlack: 0,
    capturesWhite: 0,
    turnCount: 0,
    aiThinking: false,
    lastMove: null,
    komi: KOMI,
  };
}

// ============================================================
// Export for testing
// ============================================================

const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const {
  getBestAIMove,
  filterCandidateMoves,
  isNearCenter,
  evaluateMove,
  simulateGame,
  getQuickMoves,
} = createGameAI({
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
  createGameState,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    KOMI: KOMI,
    DIRECTIONS: DIRECTIONS,
    createBoard: createBoard,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    isValidPosition: isValidPosition,
    getGroup: getGroup,
    getLiberties: getLiberties,
    removeGroup: removeGroup,
    copyBoard: copyBoard,
    playMove: playMove,
    isLegalMove: isLegalMove,
    getLegalMoves: getLegalMoves,
    calculateScore: calculateScore,
    getBestAIMove: getBestAIMove,
    filterCandidateMoves: filterCandidateMoves,
    evaluateMove: evaluateMove,
    simulateGame: simulateGame,
    getQuickMoves: getQuickMoves,
    judgeRPS: judgeRPS,
    getRPSName: getRPSName,
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
  let localTeam = null; // BLACK or WHITE
  let remoteTeam = null;

  const CELL_SIZE = 28;
  const MARGIN = 20;
  const STONE_RADIUS = 12;
  const canvasSize = MARGIN * 2 + (BOARD_SIZE - 1) * CELL_SIZE;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    context = canvas.getContext("2d");
    drawBoard();
  }

  function drawBoard() {
    // Shared wooden board base and grain
    BoardGameTheme.drawWoodenBoard(context, canvasSize, canvasSize);

    // Carved grid lines
    context.strokeStyle = BoardGameTheme.PALETTE.carve;
    context.lineWidth = 1.2;
    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = MARGIN + i * CELL_SIZE;
      // Vertical lines
      context.beginPath();
      context.moveTo(pos, MARGIN);
      context.lineTo(pos, MARGIN + (BOARD_SIZE - 1) * CELL_SIZE);
      context.stroke();
      // Horizontal lines
      context.beginPath();
      context.moveTo(MARGIN, pos);
      context.lineTo(MARGIN + (BOARD_SIZE - 1) * CELL_SIZE, pos);
      context.stroke();
    }

    // Star points (19x19 board has 9 star points)
    const starPoints = [
      { x: 3, y: 3 },
      { x: 3, y: 9 },
      { x: 3, y: 15 },
      { x: 9, y: 3 },
      { x: 9, y: 9 },
      { x: 9, y: 15 },
      { x: 15, y: 3 },
      { x: 15, y: 9 },
      { x: 15, y: 15 },
    ];
    context.fillStyle = BoardGameTheme.PALETTE.carve;
    for (const sp of starPoints) {
      const sx = MARGIN + sp.x * CELL_SIZE;
      const sy = MARGIN + sp.y * CELL_SIZE;
      context.beginPath();
      context.arc(sx, sy, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawStone(x, y, player) {
    const cx = MARGIN + x * CELL_SIZE;
    const cy = MARGIN + y * CELL_SIZE;
    BoardGameTheme.glossyDisc(
      context,
      cx,
      cy,
      STONE_RADIUS,
      player === BLACK ? "#3a3f44" : "#f2f2f2"
    );
  }

  function drawLastMoveMarker(x, y) {
    const cx = MARGIN + x * CELL_SIZE;
    const cy = MARGIN + y * CELL_SIZE;
    context.strokeStyle = "rgba(229, 57, 53, 0.9)";
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(cx, cy, 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawKoMarker(x, y) {
    const cx = MARGIN + x * CELL_SIZE;
    const cy = MARGIN + y * CELL_SIZE;
    context.fillStyle = "rgba(229, 57, 53, 0.3)";
    context.beginPath();
    context.arc(cx, cy, STONE_RADIUS, 0, Math.PI * 2);
    context.fill();
  }

  function renderGame(state) {
    drawBoard();

    // Draw all stones
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y][x] !== EMPTY) {
          drawStone(x, y, state.board[y][x]);
        }
      }
    }

    // Mark last move
    if (state.lastMove) {
      drawLastMoveMarker(state.lastMove.x, state.lastMove.y);
    }

    // Mark ko point
    if (state.koPoint) {
      drawKoMarker(state.koPoint.x, state.koPoint.y);
    }

    // Update status bar - shown as 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online)
    let label;
    if (state.mode === "online") {
      const isMyTurn = state.currentPlayer === state.localTeam;
      label = { text: isMyTurn ? "你" : "对方" };
    } else {
      label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.currentPlayer,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === BLACK ? WHITE : BLACK]
          : [BLACK, WHITE],
      });
    }
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === BLACK ? "text-black" : "text-white-stone");
    document.getElementById("turn-count").textContent = state.turnCount;
    document.getElementById("captures-black").textContent = state.capturesBlack;
    document.getElementById("captures-white").textContent = state.capturesWhite;

    if (state.mode === "pve") {
      const blackLabel = state.playerTeam === BLACK ? "玩家（黑棋）提子：" : "电脑（黑棋）提子：";
      const whiteLabel = state.playerTeam === WHITE ? "玩家（白棋）提子：" : "电脑（白棋）提子：";
      document.getElementById("label-black").textContent = blackLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else if (state.mode === "online") {
      const blackLabel = state.localTeam === BLACK ? "你（黑棋）提子：" : "对方（黑棋）提子：";
      const whiteLabel = state.localTeam === WHITE ? "你（白棋）提子：" : "对方（白棋）提子：";
      document.getElementById("label-black").textContent = blackLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else {
      document.getElementById("label-black").textContent = "黑棋提子：";
      document.getElementById("label-white").textContent = "白棋提子：";
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else {
      updateMessage("轮到 " + label.text + " 落子", "info");
    }
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
    const scoreDetail = document.getElementById("score-detail");

    // Play victory/lose sound
    const isPlayerWin = state.mode === "pve" ? state.winner === state.playerTeam : true;
    SoundManager.play(isPlayerWin ? "victory" : "lose");
    const score = calculateScore(state.board);
    // Chinese area scoring: stones on the board + surrounded empty points.
    // Captured-stone counters are informational only and must not be added
    // again (the points they occupied already count as territory or stones).
    const blackTotal = score.black;
    const whiteTotal = score.white + state.komi;

    // Determine winner if not yet decided (count-based ending)
    if (!state.winner) {
      state.winner = blackTotal > whiteTotal ? BLACK : WHITE;
    }

    // Show 玩家/电脑 (PVE), 玩家1/玩家2 (PVP), or 你/对方 (online) instead of color
    let labelText;
    if (state.mode === "online") {
      labelText = state.winner === state.localTeam ? "你" : "对方";
    } else {
      const label = getCurrentPlayerLabel({
        mode: state.mode,
        currentSide: state.winner,
        playerSide: state.playerTeam,
        sidesOrder: state.firstPlayer
          ? [state.firstPlayer, state.firstPlayer === BLACK ? WHITE : BLACK]
          : [BLACK, WHITE],
      });
      labelText = label.text;
    }
    winnerText.textContent = labelText + " 获胜！";

    scoreDetail.innerHTML =
      "黑棋：" +
      score.blackStones +
      "子 + " +
      score.blackTerritory +
      "空 = " +
      blackTotal +
      "<br>" +
      "白棋：" +
      score.whiteStones +
      "子 + " +
      score.whiteTerritory +
      "空 + " +
      state.komi +
      "贴目 = " +
      whiteTotal;

    document.getElementById("game-over").style.display = "flex";
  }

  function handleCanvasClick(e) {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;
    if (gameState.mode === "online" && gameState.currentPlayer !== localTeam) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const x = Math.round((px - MARGIN) / CELL_SIZE);
    const y = Math.round((py - MARGIN) / CELL_SIZE);

    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

    if (!isLegalMove(gameState.board, x, y, gameState.currentPlayer, gameState.koPoint)) {
      if (gameState.board[y][x] !== EMPTY) {
        updateMessage("此处已有棋子！", "error");
      } else if (gameState.koPoint && gameState.koPoint.x === x && gameState.koPoint.y === y) {
        updateMessage("打劫！不能立即回提！", "error");
      } else {
        updateMessage("此处不能落子（自杀）！", "error");
      }
      return;
    }

    doMove(x, y);

    if (gameState.mode === "online" && networkProtocol) {
      networkProtocol.sendAction({ a: "place", x: x, y: y });
    }
  }

  function doMove(x, y) {
    const result = playMove(gameState.board, x, y, gameState.currentPlayer);
    if (result === null) {
      updateMessage("非法落子！", "error");
      return;
    }

    // Play sound based on whether stones were captured
    if (result.captures > 0) {
      SoundManager.play("take");
    } else {
      SoundManager.play("place");
    }

    gameState.board = result.board;
    gameState.koPoint = result.koPoint;
    gameState.lastMove = { x: x, y: y };
    gameState.passCount = 0;
    gameState.turnCount++;

    if (gameState.currentPlayer === BLACK) {
      gameState.capturesBlack += result.captures;
    } else {
      gameState.capturesWhite += result.captures;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function doPass() {
    if (!gameState || gameState.gameOver || gameState.aiThinking) return;
    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) return;

    gameState.passCount++;
    gameState.koPoint = null;
    gameState.turnCount++;

    if (gameState.passCount >= 2) {
      // Both passed, game over
      gameState.gameOver = true;
      // Chinese area scoring: stones + surrounded empty points (+ komi for
      // white); captures are informational only (see showGameOver).
      const score = calculateScore(gameState.board);
      const blackTotal = score.black;
      const whiteTotal = score.white + gameState.komi;

      if (blackTotal > whiteTotal) {
        gameState.winner = BLACK;
      } else {
        gameState.winner = WHITE;
      }

      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    const passLabel = getCurrentPlayerLabel({
      mode: gameState.mode,
      currentSide: gameState.currentPlayer,
      playerSide: gameState.playerTeam,
      sidesOrder: gameState.firstPlayer
        ? [gameState.firstPlayer, gameState.firstPlayer === BLACK ? WHITE : BLACK]
        : [BLACK, WHITE],
    });
    updateMessage("对方选择Pass，轮到 " + passLabel.text, "info");
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function doResign() {
    if (!gameState || gameState.gameOver) return;

    gameState.gameOver = true;
    gameState.winner = getOpponent(gameState.currentPlayer);
    renderGame(gameState);
    setTimeout(() => {
      showGameOver(gameState);
    }, 500);
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(
        gameState.board,
        gameState.aiTeam,
        gameState.koPoint,
        gameState.capturesBlack,
        gameState.capturesWhite
      );
      gameState.aiThinking = false;

      if (move) {
        doMove(move.x, move.y);
      } else {
        // AI chooses pass
        doPass();
      }
    }, 500);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || BLACK;
    gameState.firstPlayer = firstPlayer || BLACK;

    if (mode === "pve") {
      if (firstPlayer === BLACK) {
        gameState.playerTeam = BLACK;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = BLACK;
      }
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
      (iWin ? "，你赢了！你先手(黑棋)。" : "，你输了！对方先手(黑棋)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = BLACK;
    const guestPiece = WHITE;

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
    doMove(actionData.x, actionData.y);
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
          "，你赢了！你先手(黑棋)。";
        setTimeout(() => {
          startGame("pve", BLACK);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(黑棋)。";
        setTimeout(() => {
          startGame("pve", WHITE);
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
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家1赢了！玩家1先手(黑棋)。";
          setTimeout(() => {
            startGame("pvp", BLACK);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("victory");
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，玩家2赢了！玩家2先手(黑棋)。";
          setTimeout(() => {
            startGame("pvp", WHITE);
          }, 1500);
        } else {
          SoundManager.play("draw");
          resultEl.textContent =
            "玩家1选择了" +
            getRPSName(rpsChoices.player1) +
            "，玩家2选择了" +
            getRPSName(rpsChoices.player2) +
            "，平局！重新选择。";
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

    document.getElementById("btn-pass").addEventListener("click", doPass);
    document.getElementById("btn-resign").addEventListener("click", doResign);
    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
