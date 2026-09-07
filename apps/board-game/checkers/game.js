/* eslint-disable no-var, no-undef */
// ============================================================
// International Draughts (Checkers) - Game Core Logic
// 10x10 board, FMJD rules: flying kings, men capture forward and
// backward, mandatory maximum capture, promotion only when the move
// ends on the last row.
// ============================================================

if (typeof judgeRPS === "undefined" && typeof require !== "undefined") {
  const _gameUtils = require("../../common/game-utils.js");
  var judgeRPS = _gameUtils.judgeRPS;
  var getRPSName = _gameUtils.getRPSName;
}

const BOARD_SIZE = 10;
const EMPTY = 0;
const RED = 1; // Red (first player, top)
const WHITE = 2; // White (second player, bottom)
const RED_KING = 3;
const WHITE_KING = 4;

// AI search depth

// Evaluation weights
const WEIGHT_PIECE = 100;
const WEIGHT_KING = 250;
const WEIGHT_ADVANCE = 3; // Regular piece advance bonus
const WEIGHT_CENTER = 5; // Center position bonus
const WEIGHT_THREATENED = -20; // Threatened piece penalty

const DIAG_DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function createBoard() {
  const board = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 4) row.push(RED);
        else if (r > 5) row.push(WHITE);
        else row.push(EMPTY);
      } else {
        row.push(EMPTY);
      }
    }
    board.push(row);
  }
  return board;
}

function copyBoard(board) {
  const newBoard = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    newBoard.push(board[r].slice());
  }
  return newBoard;
}

function isRed(piece) {
  return piece === RED || piece === RED_KING;
}
function isWhite(piece) {
  return piece === WHITE || piece === WHITE_KING;
}
function isKing(piece) {
  return piece === RED_KING || piece === WHITE_KING;
}
function getOwner(piece) {
  if (isRed(piece)) return RED;
  if (isWhite(piece)) return WHITE;
  return EMPTY;
}

function getOpponent(player) {
  return player === RED ? WHITE : RED;
}

function getPlayerName(player) {
  return player === RED ? "红方" : "白方";
}

// A man is promoted only when its move ENDS on the last row (FMJD rules);
// passing through the last row during a capture keeps it a man.
function promote(piece, row) {
  if (piece === RED && row === BOARD_SIZE - 1) return RED_KING;
  if (piece === WHITE && row === 0) return WHITE_KING;
  return piece;
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

// ============================================================
// Move generation
// ============================================================

// Simple-move directions: men move forward only, kings fly in all 4 diagonals
function getMoveDirs(piece) {
  if (piece === RED) {
    return [
      [1, -1],
      [1, 1],
    ]; // Red moves down
  }
  if (piece === WHITE) {
    return [
      [-1, -1],
      [-1, 1],
    ]; // White moves up
  }
  return DIAG_DIRS; // King moves in all 4 directions
}

/**
 * Get all non-capturing moves for a piece.
 * Men step one square diagonally forward; kings fly any distance
 * along an open diagonal (international "flying king").
 * Returns [{fromR, fromC, toR, toC}]
 */
function getSimpleMoves(board, r, c) {
  const piece = board[r][c];
  const moves = [];
  if (isKing(piece)) {
    for (const [dr, dc] of DIAG_DIRS) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
        nr += dr;
        nc += dc;
      }
    }
    return moves;
  }
  for (const [dr, dc] of getMoveDirs(piece)) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === EMPTY) {
      moves.push({ fromR: r, fromC: c, toR: nr, toC: nc });
    }
  }
  return moves;
}

/**
 * Get the first-hop capture candidates for a piece (single jump only).
 * Used by the AI threat heuristics; the authoritative move generation is
 * sequence based (see getAllMoves).
 * Men jump an adjacent enemy piece in ANY direction (forward or backward).
 * Kings fly over the first enemy piece on a diagonal and land on any empty
 * square behind it.
 */
function getCaptureMoves(board, r, c) {
  const piece = board[r][c];
  const moves = [];
  const owner = getOwner(piece);
  if (isKing(piece)) {
    for (const [dr, dc] of DIAG_DIRS) {
      let sr = r + dr;
      let sc = c + dc;
      while (inBounds(sr, sc) && board[sr][sc] === EMPTY) {
        sr += dr;
        sc += dc;
      }
      if (!inBounds(sr, sc)) continue;
      if (board[sr][sc] === EMPTY || getOwner(board[sr][sc]) === owner) continue;
      let lr = sr + dr;
      let lc = sc + dc;
      while (inBounds(lr, lc) && board[lr][lc] === EMPTY) {
        moves.push({ fromR: r, fromC: c, toR: lr, toC: lc, capturedR: sr, capturedC: sc });
        lr += dr;
        lc += dc;
      }
    }
    return moves;
  }
  for (const [dr, dc] of DIAG_DIRS) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inBounds(lr, lc)) continue;
    if (board[mr][mc] === EMPTY || getOwner(board[mr][mc]) === owner) continue;
    if (board[lr][lc] !== EMPTY) continue;
    moves.push({ fromR: r, fromC: c, toR: lr, toC: lc, capturedR: mr, capturedC: mc });
  }
  return moves;
}

/**
 * Depth-first collection of complete capture sequences for the piece at
 * (r, c). Captured pieces stay on the board as obstacles until the move is
 * finished (FMJD rules), and the same enemy piece may never be jumped twice:
 * both are enforced by keeping the board untouched and tracking captured
 * squares in a set.
 */
function collectCaptureSequences(board, originR, originC, r, c, capturedKeys, victims, results) {
  const piece = board[originR][originC];
  const owner = getOwner(piece);
  const king = isKing(piece);
  let extended = false;

  for (const [dr, dc] of DIAG_DIRS) {
    if (!king) {
      const mr = r + dr;
      const mc = c + dc;
      const lr = r + 2 * dr;
      const lc = c + 2 * dc;
      if (!inBounds(lr, lc)) continue;
      const key = mr + "," + mc;
      if (capturedKeys.has(key)) continue;
      if (board[mr][mc] === EMPTY || getOwner(board[mr][mc]) === owner) continue;
      if (board[lr][lc] !== EMPTY) continue;
      extended = true;
      const nextKeys = new Set(capturedKeys);
      nextKeys.add(key);
      collectCaptureSequences(
        board,
        originR,
        originC,
        lr,
        lc,
        nextKeys,
        victims.concat([{ r: mr, c: mc }]),
        results
      );
    } else {
      let sr = r + dr;
      let sc = c + dc;
      // Fly over empty squares to the first piece on the diagonal
      while (inBounds(sr, sc) && board[sr][sc] === EMPTY) {
        sr += dr;
        sc += dc;
      }
      if (!inBounds(sr, sc)) continue;
      const key = sr + "," + sc;
      if (capturedKeys.has(key)) continue;
      if (board[sr][sc] === EMPTY || getOwner(board[sr][sc]) === owner) continue;
      // Land on any empty square behind the victim
      let lr = sr + dr;
      let lc = sc + dc;
      while (inBounds(lr, lc) && board[lr][lc] === EMPTY) {
        extended = true;
        const nextKeys = new Set(capturedKeys);
        nextKeys.add(key);
        collectCaptureSequences(
          board,
          originR,
          originC,
          lr,
          lc,
          nextKeys,
          victims.concat([{ r: sr, c: sc }]),
          results
        );
        lr += dr;
        lc += dc;
      }
    }
  }

  if (!extended && victims.length > 0) {
    results.push({
      fromR: originR,
      fromC: originC,
      toR: r,
      toC: c,
      captures: victims,
    });
  }
}

/**
 * Get all legal moves for a side.
 * Captures are mandatory: when any capture exists, only the capture
 * sequences taking the maximum number of pieces are legal (quantity rule;
 * a king counts the same as a man).
 */
function getAllMoves(board, player) {
  const allCaptures = [];
  const allSimple = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getOwner(board[r][c]) !== player) continue;
      const sequences = [];
      collectCaptureSequences(board, r, c, r, c, new Set(), [], sequences);
      for (const seq of sequences) {
        allCaptures.push(seq);
      }
      for (const sim of getSimpleMoves(board, r, c)) {
        allSimple.push(sim);
      }
    }
  }

  if (allCaptures.length > 0) {
    let maxLen = 0;
    for (const cap of allCaptures) {
      if (cap.captures.length > maxLen) maxLen = cap.captures.length;
    }
    const maximal = [];
    for (const cap of allCaptures) {
      if (cap.captures.length === maxLen) maximal.push(cap);
    }
    return maximal;
  }
  return allSimple;
}

/**
 * Apply move to board (returns new board).
 * The move carries the full capture sequence; promotion is applied only
 * for a man whose move ends on the last row.
 */
function applyMove(board, move) {
  const newBoard = copyBoard(board);
  const piece = newBoard[move.fromR][move.fromC];
  newBoard[move.fromR][move.fromC] = EMPTY;
  if (move.captures) {
    for (const cap of move.captures) {
      newBoard[cap.r][cap.c] = EMPTY;
    }
  } else if (move.capturedR !== undefined) {
    newBoard[move.capturedR][move.capturedC] = EMPTY;
  }
  newBoard[move.toR][move.toC] = promote(piece, move.toR);
  return newBoard;
}

// ============================================================
// Win/loss detection
// ============================================================

function checkGameOver(board, currentPlayer) {
  let redCount = 0,
    whiteCount = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isRed(board[r][c])) redCount++;
      if (isWhite(board[r][c])) whiteCount++;
    }
  }
  if (redCount === 0) return { winner: WHITE, reason: "capture" };
  if (whiteCount === 0) return { winner: RED, reason: "capture" };

  // Check if current side has legal moves
  const moves = getAllMoves(board, currentPlayer);
  if (moves.length === 0) {
    return { winner: getOpponent(currentPlayer), reason: "no_moves" };
  }
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
    currentPlayer: RED,
    playerTeam: null,
    aiTeam: null,
    gameOver: false,
    winner: null,
    turnCount: 0,
    aiThinking: false,
    scoreRed: 0,
    scoreWhite: 0,
    selectedPiece: null, // {r, c} currently selected piece
    validMoves: [], // Valid moves for selected piece
    mustCapture: false, // Whether forced capture
    lastMove: null,
  };
}

// ============================================================
// Export for testing
// ============================================================

const createGameAI =
  typeof module !== "undefined" && module.exports
    ? require("./ai.js").createGameAI
    : globalThis.GameAI.createGameAI;

const { AI_DEPTH, evaluateBoard, evaluateThreats, alphaBeta, getBestAIMove } = createGameAI({
  BOARD_SIZE,
  EMPTY,
  RED,
  WHITE,
  RED_KING,
  WHITE_KING,
  WEIGHT_PIECE,
  WEIGHT_KING,
  WEIGHT_ADVANCE,
  WEIGHT_CENTER,
  WEIGHT_THREATENED,
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
  getMoveDirs,
  getSimpleMoves,
  getCaptureMoves,
  getAllMoves,
  applyMove,
  checkGameOver,
  createGameState,
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    RED: RED,
    WHITE: WHITE,
    RED_KING: RED_KING,
    WHITE_KING: WHITE_KING,
    AI_DEPTH: AI_DEPTH,
    createBoard: createBoard,
    copyBoard: copyBoard,
    isRed: isRed,
    isWhite: isWhite,
    isKing: isKing,
    getOwner: getOwner,
    getOpponent: getOpponent,
    getPlayerName: getPlayerName,
    promote: promote,
    inBounds: inBounds,
    getMoveDirs: getMoveDirs,
    getSimpleMoves: getSimpleMoves,
    getCaptureMoves: getCaptureMoves,
    getAllMoves: getAllMoves,
    applyMove: applyMove,
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
  let localTeam = null; // RED or WHITE
  let remoteTeam = null; // RED or WHITE
  const CELL_SIZE = 56;
  const BOARD_PX = CELL_SIZE * BOARD_SIZE;
  const PIECE_RADIUS = 22;

  function initBoard() {
    canvas = document.getElementById("board-canvas");
    canvas.width = BOARD_PX;
    canvas.height = BOARD_PX;
    context = canvas.getContext("2d");
    drawBoard();
  }

  function drawBoard() {
    const lightColor = "#f0d9b5";
    const darkColor = "#9a672f";
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        context.fillStyle = (r + c) % 2 === 0 ? lightColor : darkColor;
        context.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
    // Wooden slab frame
    context.strokeStyle = BoardGameTheme.PALETTE.frame;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, BOARD_PX - 3, BOARD_PX - 3);
  }

  function drawPiece(x, y, piece) {
    const cx = x * CELL_SIZE + CELL_SIZE / 2;
    const cy = y * CELL_SIZE + CELL_SIZE / 2;

    // Glossy disc with the shared material treatment
    BoardGameTheme.glossyDisc(context, cx, cy, PIECE_RADIUS, isRed(piece) ? "#d32f2f" : "#f5f5f5", {
      rimWidth: 1.6,
    });

    // King marker
    if (isKing(piece)) {
      context.fillStyle = "#ffd700";
      context.strokeStyle = "#8d6e00";
      context.lineWidth = 1;
      context.font = "bold 18px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("♚", cx, cy);
      context.strokeText("♚", cx, cy);
    }
  }

  function drawSelection(r, c) {
    context.strokeStyle = "#ffd600";
    context.lineWidth = 3;
    context.strokeRect(c * CELL_SIZE + 2, r * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  }

  function drawValidMoves(moves) {
    for (const m of moves) {
      const cx = m.toC * CELL_SIZE + CELL_SIZE / 2;
      const cy = m.toR * CELL_SIZE + CELL_SIZE / 2;
      context.fillStyle = "rgba(76, 175, 80, 0.5)";
      context.beginPath();
      context.arc(cx, cy, 10, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawLastMove(move) {
    if (!move) return;
    context.strokeStyle = "rgba(255, 152, 0, 0.7)";
    context.lineWidth = 3;
    context.strokeRect(
      move.fromC * CELL_SIZE + 2,
      move.fromR * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
    context.strokeRect(
      move.toC * CELL_SIZE + 2,
      move.toR * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4
    );
  }

  function renderGame(state) {
    drawBoard();

    // Last move
    if (state.lastMove) drawLastMove(state.lastMove);

    // Selection highlight
    if (state.selectedPiece) {
      drawSelection(state.selectedPiece.r, state.selectedPiece.c);
      drawValidMoves(state.validMoves);
    }

    // All pieces
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c] !== EMPTY) {
          drawPiece(c, r, state.board[r][c]);
        }
      }
    }

    // Status bar - shown as 玩家/电脑 (PVE) or 玩家1/玩家2 (PVP)
    const label = getCurrentPlayerLabel({
      mode: state.mode,
      currentSide: state.currentPlayer,
      playerSide: state.mode === "online" ? state.localTeam : state.playerTeam,
      sidesOrder: state.firstPlayer
        ? [state.firstPlayer, state.firstPlayer === RED ? WHITE : RED]
        : [RED, WHITE],
    });
    document.getElementById("current-player").textContent = label.text;
    document.getElementById("current-player").className =
      "team-indicator " + (state.currentPlayer === RED ? "text-red" : "text-white-piece");
    document.getElementById("turn-count").textContent = state.turnCount;

    const redCount = countPieces(state.board, RED);
    const whiteCount = countPieces(state.board, WHITE);
    document.getElementById("score-red").textContent = redCount;
    document.getElementById("score-white").textContent = whiteCount;

    if (state.mode === "pve") {
      const redLabel = state.playerTeam === RED ? "玩家（红方）：" : "电脑（红方）：";
      const whiteLabel = state.playerTeam === WHITE ? "玩家（白方）：" : "电脑（白方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else if (state.mode === "online") {
      const redLabel = state.localTeam === RED ? "你（红方）：" : "对方（红方）：";
      const whiteLabel = state.localTeam === WHITE ? "你（白方）：" : "对方（白方）：";
      document.getElementById("label-red").textContent = redLabel;
      document.getElementById("label-white").textContent = whiteLabel;
    } else {
      document.getElementById("label-red").textContent = "红方：";
      document.getElementById("label-white").textContent = "白方：";
    }

    if (state.gameOver) {
      updateMessage("游戏结束！", "info");
    } else if (state.aiThinking) {
      updateMessage("电脑正在思考...", "info");
    } else if (state.mode === "pve" && state.currentPlayer === state.aiTeam) {
      updateMessage("轮到电脑行动", "info");
    } else if (state.mustCapture) {
      updateMessage("必须吃子！请选择吃子棋子", "info");
    } else {
      updateMessage("轮到 " + label.text + " 行动", "info");
    }
  }

  function countPieces(board, player) {
    let count = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) count++;
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
          ? [state.firstPlayer, state.firstPlayer === RED ? WHITE : RED]
          : [RED, WHITE],
      });
      winnerText.textContent = label.text + " 获胜！";
    } else {
      SoundManager.play("draw");
      winnerText.textContent = "平局！";
    }
    document.getElementById("game-over").style.display = "flex";
  }

  // Get all legal moves for a side to determine forced capture
  function getMustCapture(board, player) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getOwner(board[r][c]) === player) {
          if (getCaptureMoves(board, r, c).length > 0) return true;
        }
      }
    }
    return false;
  }

  // Get legal moves for a piece: the mandatory-maximum capture sequences of
  // this piece (empty if another piece must capture instead), or its simple
  // moves when no capture exists anywhere.
  function getLegalMovesForPiece(board, r, c, player) {
    return getAllMoves(board, player).filter((m) => m.fromR === r && m.fromC === c);
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
    const col = Math.floor(px / CELL_SIZE);
    const row = Math.floor(py / CELL_SIZE);

    if (!inBounds(row, col)) return;

    const piece = gameState.board[row][col];

    // If clicked own piece, select it
    if (getOwner(piece) === gameState.currentPlayer) {
      const moves = getLegalMovesForPiece(gameState.board, row, col, gameState.currentPlayer);
      if (moves.length > 0) {
        gameState.selectedPiece = { r: row, c: col };
        gameState.validMoves = moves;
        renderGame(gameState);
      } else {
        updateMessage("该棋子没有合法移动", "error");
      }
      return;
    }

    // If clicked empty cell with selected piece, try to move
    if (piece === EMPTY && gameState.selectedPiece) {
      const move = findMove(gameState.validMoves, row, col);
      if (move) {
        doMove(move);
        if (gameState.mode === "online" && networkProtocol) {
          const actionData = {
            a: "move",
            fr: move.fromR,
            fc: move.fromC,
            tr: move.toR,
            tc: move.toC,
          };
          if (move.captures && move.captures.length > 0) {
            actionData.cs = move.captures;
          }
          networkProtocol.sendAction(actionData);
        }
      } else {
        updateMessage("无效的目标位置", "error");
      }
    }
  }

  function findMove(moves, toR, toC) {
    for (const move of moves) {
      if (move.toR === toR && move.toC === toC) return move;
    }
    return null;
  }

  function doMove(move) {
    // Play sound based on move type
    if (move.captures && move.captures.length > 0) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }
    // The move is a complete capture sequence (or a simple move); applying it
    // removes every captured piece and promotes only if the move ends on the
    // last row.
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
  }

  function endTurn() {
    const gameOverResult = checkGameOver(gameState.board, getOpponent(gameState.currentPlayer));
    if (gameOverResult) {
      gameState.gameOver = true;
      gameState.winner = gameOverResult.winner;
      renderGame(gameState);
      setTimeout(() => {
        showGameOver(gameState);
      }, 500);
      return;
    }

    gameState.currentPlayer = getOpponent(gameState.currentPlayer);
    gameState.mustCapture = getMustCapture(gameState.board, gameState.currentPlayer);
    renderGame(gameState);

    if (gameState.mode === "pve" && gameState.currentPlayer === gameState.aiTeam) {
      triggerAI();
    }
  }

  function triggerAI() {
    gameState.aiThinking = true;
    renderGame(gameState);
    setTimeout(() => {
      const move = getBestAIMove(gameState.board, gameState.aiTeam);
      gameState.aiThinking = false;
      if (move) {
        // Play sound based on move type
        if (move.captures && move.captures.length > 0) {
          SoundManager.play("take");
        } else {
          SoundManager.play("slide");
        }
        gameState.board = applyMove(gameState.board, move);
        gameState.lastMove = move;
        gameState.turnCount++;
      }
      endTurn();
    }, 300);
  }

  function startGame(mode, firstPlayer) {
    gameState = createGameState(mode);
    gameState.currentPlayer = firstPlayer || RED;
    gameState.firstPlayer = firstPlayer || RED;

    if (mode === "pve") {
      if (firstPlayer === RED) {
        gameState.playerTeam = RED;
        gameState.aiTeam = WHITE;
      } else {
        gameState.playerTeam = WHITE;
        gameState.aiTeam = RED;
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
      (iWin ? "，你赢了！你先手(红方)。" : "，你输了！对方先手(红方)。");

    setTimeout(() => {
      startOnlineGame(result.firstPlayer);
    }, 1500);
  }

  function startOnlineGame(firstPlayerRole) {
    gameState = createGameState("online");

    const hostPiece = RED;
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
    const move = {
      fromR: actionData.fr,
      fromC: actionData.fc,
      toR: actionData.tr,
      toC: actionData.tc,
      captures: actionData.cs || [],
    };
    // Apply the move directly without network send
    if (move.captures.length > 0) {
      SoundManager.play("take");
    } else {
      SoundManager.play("slide");
    }
    gameState.board = applyMove(gameState.board, move);
    gameState.lastMove = move;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    gameState.turnCount++;
    endTurn();
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
          "，你赢了！你先手(红方)。";
        setTimeout(() => {
          startGame("pve", RED);
        }, 1500);
      } else if (humanWins === -1) {
        SoundManager.play("lose");
        resultEl.textContent =
          "你选择了" +
          getRPSName(choice) +
          "，电脑选择了" +
          getRPSName(aiChoice) +
          "，你输了！电脑先手(红方)。";
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
          resultEl.textContent = "玩家1赢了！玩家1先手(红方)。";
          setTimeout(() => {
            startGame("pvp", RED);
          }, 1500);
        } else if (winner === -1) {
          SoundManager.play("lose");
          resultEl.textContent = "玩家2赢了！玩家2先手(红方)。";
          setTimeout(() => {
            startGame("pvp", WHITE);
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
        const player = ev.target.dataset.player;
        const choice = ev.target.dataset.choice;
        handleRPSChoice(player, choice, ev);
      });
    });

    document.getElementById("btn-restart").addEventListener("click", restartGame);

    document.getElementById("mode-selection").style.display = "flex";
    document.getElementById("rps-section").style.display = "none";
    document.getElementById("game-area").style.display = "none";
    document.getElementById("game-over").style.display = "none";
  });
}
