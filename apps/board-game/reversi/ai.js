/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_SIZE,
      PLAYER_BLACK,
      PLAYER_WHITE,
      DIRECTIONS,
      inBounds,
      getOpponent,
      checkDirection,
      isValidMove,
      getValidMoves,
      makeMove,
      countPieces,
      isGameOver,
      getWinner,
      createGameState,
      aiTurn,
      gameState,
      networkProtocol,
      networkConnection,
      roomUI,
      localPlayerRole,
      localTeam,
      remoteTeam,
      initBoard,
      renderGame,
      updateMessage,
      showGameOver,
      handleCellClick,
      startGame,
      restartGame,
      cleanupNetwork,
      setupNetworkHandlers,
      startOnlineRPS,
      handleOnlineRPSChoice,
      handleOnlineRPSReceived,
      checkOnlineRPSComplete,
      handleOnlineRPSResult,
      startOnlineGame,
      applyRemoteAction,
      handleDisconnect,
      rpsChoices,
      handleRPSChoice,
    } = deps;

    // Master-level search depth (plies). Depth 4 keeps the latency acceptable
    // for an 8x8 board while avoiding most simple two-move traps.
    const SEARCH_DEPTH = 4;

    // Static positional weights: corners are decisive, the squares diagonally
    // adjacent to corners (X-squares) are dangerous, edges are stable.
    const POSITION_WEIGHTS = [
      [120, -20, 20, 5, 5, 20, -20, 120],
      [-20, -40, -5, -5, -5, -5, -40, -20],
      [20, -5, 15, 3, 3, 15, -5, 20],
      [5, -5, 3, 3, 3, 3, -5, 5],
      [5, -5, 3, 3, 3, 3, -5, 5],
      [20, -5, 15, 3, 3, 15, -5, 20],
      [-20, -40, -5, -5, -5, -5, -40, -20],
      [120, -20, 20, 5, 5, 20, -20, 120],
    ];

    const MOBILITY_WEIGHT = 8;

    const DISC_WEIGHT = 2;

    const WIN_SCORE = 100000;

    function evaluateBoard(board, aiPlayer) {
      const opponent = getOpponent(aiPlayer);
      let positional = 0;
      let myDiscs = 0;
      let oppDiscs = 0;

      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
          const piece = board[y][x];
          if (piece === aiPlayer) {
            myDiscs++;
            positional += POSITION_WEIGHTS[y][x];
          } else if (piece === opponent) {
            oppDiscs++;
            positional -= POSITION_WEIGHTS[y][x];
          }
        }
      }

      // Mobility matters more than disc count until the board fills up.
      const myMobility = getValidMoves(board, aiPlayer).length;
      const oppMobility = getValidMoves(board, opponent).length;

      return (
        positional +
        (myMobility - oppMobility) * MOBILITY_WEIGHT +
        (myDiscs - oppDiscs) * DISC_WEIGHT
      );
    }

    function finalScore(board, aiPlayer) {
      const diff = countPieces(board);
      const signedDiff = aiPlayer === PLAYER_BLACK ? diff : -diff;
      if (signedDiff > 0) return WIN_SCORE + signedDiff;
      if (signedDiff < 0) return -WIN_SCORE + signedDiff;
      return 0;
    }

    function alphaBeta(board, player, depth, alpha, beta, aiPlayer) {
      const moves = getValidMoves(board, player);

      if (moves.length === 0) {
        // Pass if the opponent can still move; otherwise the game is over.
        const opponentMoves = getValidMoves(board, getOpponent(player));
        if (opponentMoves.length === 0) return finalScore(board, aiPlayer);
        return alphaBeta(board, getOpponent(player), depth, alpha, beta, aiPlayer);
      }

      if (depth === 0) return evaluateBoard(board, aiPlayer);

      if (player === aiPlayer) {
        let best = -Infinity;
        for (const move of moves) {
          const nextBoard = board.map((row) => row.slice());
          makeMove(nextBoard, move.x, move.y, player);
          const score = alphaBeta(nextBoard, getOpponent(player), depth - 1, alpha, beta, aiPlayer);
          if (score > best) best = score;
          if (best > alpha) alpha = best;
          if (beta <= alpha) break;
        }
        return best;
      }

      let best = Infinity;
      for (const move of moves) {
        const nextBoard = board.map((row) => row.slice());
        makeMove(nextBoard, move.x, move.y, player);
        const score = alphaBeta(nextBoard, getOpponent(player), depth - 1, alpha, beta, aiPlayer);
        if (score < best) best = score;
        if (best < beta) beta = best;
        if (beta <= alpha) break;
      }
      return best;
    }

    function searchBestMove(board, aiPlayer, depth) {
      const moves = getValidMoves(board, aiPlayer);
      // Corner moves are always safe to search first and often best.
      const cornerRank = (m) =>
        (m.x === 0 || m.x === BOARD_SIZE - 1) && (m.y === 0 || m.y === BOARD_SIZE - 1) ? 1 : 0;
      const ordered = moves.slice().sort((a, b) => cornerRank(b) - cornerRank(a));

      let bestMove = ordered[0];
      let bestScore = -Infinity;
      for (const move of ordered) {
        const nextBoard = board.map((row) => row.slice());
        makeMove(nextBoard, move.x, move.y, aiPlayer);
        const score = alphaBeta(
          nextBoard,
          getOpponent(aiPlayer),
          depth - 1,
          -Infinity,
          Infinity,
          aiPlayer
        );
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    function getBestAIMove(board, aiPlayer, difficulty) {
      const validMoves = getValidMoves(board, aiPlayer);
      if (validMoves.length === 0) return null;
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") {
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        return { x: move.x, y: move.y };
      }

      if (level === "master") {
        const best = searchBestMove(board, aiPlayer, SEARCH_DEPTH);
        return { x: best.x, y: best.y };
      }

      let bestMove = validMoves[0];
      let bestScore = -Infinity;
      for (const move of validMoves) {
        let score = move.flipped.length;
        if (level !== "normal") {
          const isEdge =
            move.x === 0 || move.y === 0 || move.x === BOARD_SIZE - 1 || move.y === BOARD_SIZE - 1;
          const isCorner =
            (move.x === 0 || move.x === BOARD_SIZE - 1) &&
            (move.y === 0 || move.y === BOARD_SIZE - 1);
          score += isCorner ? 100 : isEdge ? 8 : 0;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      return { x: bestMove.x, y: bestMove.y };
    }

    return { SEARCH_DEPTH, evaluateBoard, alphaBeta, searchBestMove, getBestAIMove };
  }
  return { createGameAI };
});
