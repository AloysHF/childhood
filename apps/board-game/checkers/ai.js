/* eslint-disable no-var, no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
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
    } = deps;

    const AI_DEPTH = 4;

    function evaluateBoard(board, aiPlayer) {
      let score = 0;
      const opponent = getOpponent(aiPlayer);

      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const piece = board[r][c];
          if (piece === EMPTY) continue;

          const isAI = getOwner(piece) === aiPlayer;
          const sign = isAI ? 1 : -1;

          // Base score
          if (isKing(piece)) {
            score += sign * WEIGHT_KING;
          } else {
            score += sign * WEIGHT_PIECE;
            // Advance bonus
            if (isAI) {
              if (aiPlayer === RED) score += sign * r * WEIGHT_ADVANCE;
              else score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
            } else if (opponent === RED) {
              score += sign * r * WEIGHT_ADVANCE;
            } else {
              score += sign * (BOARD_SIZE - 1 - r) * WEIGHT_ADVANCE;
            }
          }

          // Center position bonus
          const mid = (BOARD_SIZE - 1) / 2;
          const centerDist = Math.abs(r - mid) + Math.abs(c - mid);
          score += sign * (mid + 0.5 - centerDist) * WEIGHT_CENTER;
        }
      }

      // Threat evaluation
      score += evaluateThreats(board, aiPlayer);

      return score;
    }

    function evaluateThreats(board, player) {
      let score = 0;
      const opponent = getOpponent(player);
      // Check if opponent can capture our pieces
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (getOwner(board[r][c]) === opponent) {
            const caps = getCaptureMoves(board, r, c);
            for (const cap of caps) {
              const target = board[cap.capturedR][cap.capturedC];
              if (getOwner(target) === player) {
                score += WEIGHT_THREATENED * (isKing(target) ? 2.5 : 1);
              }
            }
          }
        }
      }
      return score;
    }

    function alphaBeta(board, depth, alpha, beta, isMaximizing, aiPlayer) {
      const currentPlayer = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
      const gameOver = checkGameOver(board, currentPlayer);

      if (gameOver) {
        if (gameOver.winner === aiPlayer) return 99999 + depth;
        return -99999 - depth;
      }

      if (depth === 0) {
        return evaluateBoard(board, aiPlayer);
      }

      const moves = getAllMoves(board, currentPlayer);

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
          const newBoard = applyMove(board, move);
          const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, false, aiPlayer);
          if (eval_ > maxEval) maxEval = eval_;
          if (maxEval > alpha) alpha = maxEval;
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of moves) {
          const newBoard = applyMove(board, move);
          const eval_ = alphaBeta(newBoard, depth - 1, alpha, beta, true, aiPlayer);
          if (eval_ < minEval) minEval = eval_;
          if (minEval < beta) beta = minEval;
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    function getBestAIMove(board, aiPlayer, difficulty) {
      const moves = getAllMoves(board, aiPlayer);
      if (moves.length === 0) return null;
      const level =
        difficulty ||
        (globalThis.AIDifficulty && globalThis.AIDifficulty.getLevel
          ? globalThis.AIDifficulty.getLevel()
          : "normal");
      if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];
      const searchDepth =
        { normal: AI_DEPTH, hard: AI_DEPTH + 1, master: AI_DEPTH + 2 }[level] || AI_DEPTH;

      let bestMove = null;
      let bestScore = -Infinity;

      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = alphaBeta(newBoard, searchDepth - 1, -Infinity, Infinity, false, aiPlayer);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    return { AI_DEPTH, evaluateBoard, evaluateThreats, alphaBeta, getBestAIMove };
  }
  return { createGameAI };
});
