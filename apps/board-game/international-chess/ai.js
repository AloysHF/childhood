/* eslint-disable no-unused-vars, prefer-arrow-callback */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameAI = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createGameAI(deps) {
    const {
      BOARD_SIZE,
      EMPTY,
      W_PAWN,
      W_KNIGHT,
      W_BISHOP,
      W_ROOK,
      W_QUEEN,
      PIECE_VALUES,
      W_KING,
      B_PAWN,
      B_KNIGHT,
      B_BISHOP,
      B_ROOK,
      B_QUEEN,
      B_KING,
      WHITE,
      BLACK,
      PIECE_SYMBOLS,
      PIECE_NAMES,
      PAWN_POS_WHITE,
      PAWN_POS_BLACK,
      KNIGHT_POS,
      BISHOP_POS,
      isWhite,
      isBlack,
      getOwner,
      getOpponent,
      getPlayerName,
      inBounds,
      isPawn,
      isKnight,
      isBishop,
      isRook,
      isQueen,
      isKing,
      createBoard,
      copyBoard,
      applyMove,
      getValidMoves,
      isInCheck,
      isSquareAttacked,
      getRawAttacks,
      getDiagonalAttacks,
      getOrthogonalAttacks,
      getKnightAttacks,
      getKingAttacks,
      getLineMoves,
      getDiagonalMoves,
      getRookMoves,
      getBishopMoves,
      getQueenMoves,
      getKnightMoves,
      getKingMoves,
      getPawnMoves,
      getAllMoves,
      checkGameOver,
      createGameState,
    } = deps;

    const AI_DEPTH = 3;

    const QUIESCENCE_MAX_PLY = 6;

    function getPositionValue(piece, c, r) {
      if (piece === W_PAWN) return PAWN_POS_WHITE[c][r];
      if (piece === B_PAWN) return PAWN_POS_BLACK[c][r];
      if (piece === W_KNIGHT || piece === B_KNIGHT) return KNIGHT_POS[c][r];
      if (piece === W_BISHOP || piece === B_BISHOP) return BISHOP_POS[c][r];
      return 0;
    }

    function evaluateBoard(board, aiColor) {
      let aiScore = 0,
        oppScore = 0;
      for (let c = 0; c < BOARD_SIZE; c++) {
        for (let r = 0; r < BOARD_SIZE; r++) {
          const piece = board[c][r];
          if (piece === EMPTY) continue;
          const val = PIECE_VALUES[piece] + getPositionValue(piece, c, r);
          if (getOwner(piece) === aiColor) aiScore += val;
          else oppScore += val;
        }
      }
      return aiScore - oppScore;
    }

    // MVV-LVA: order captures by the value of the victim minus the value of
    // the attacker so the cheapest winning captures are searched first and
    // alpha-beta cuts arrive as early as possible.
    function moveOrderScore(board, move) {
      let score = 0;
      if (move.promotion) score += 800;
      const victim = board[move.toC][move.toR];
      if (victim !== EMPTY) {
        score += PIECE_VALUES[victim] * 10 - PIECE_VALUES[board[move.fromC][move.fromR]];
      }
      return score;
    }

    // Capture-only search at the horizon: resolves hanging-piece sequences so
    // the static evaluation is only trusted in quiet positions.
    function quiescence(board, alpha, beta, sideToMove, hasMoved, ply) {
      const standPat = evaluateBoard(board, sideToMove);
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;
      if (ply >= QUIESCENCE_MAX_PLY) return alpha;

      const moves = getAllMoves(board, sideToMove, hasMoved);
      const captures = moves.filter((m) => board[m.toC][m.toR] !== EMPTY || m.promotion);
      if (captures.length === 0) return alpha;

      captures.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));
      for (const move of captures) {
        const newBoard = applyMove(board, move);
        const score = -quiescence(
          newBoard,
          -beta,
          -alpha,
          getOpponent(sideToMove),
          hasMoved,
          ply + 1
        );
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    }

    function alphaBeta(board, depth, alpha, beta, aiColor, isAITurn, hasMoved) {
      const currentPlayer = isAITurn ? aiColor : getOpponent(aiColor);
      const gameOver = checkGameOver(board, currentPlayer, hasMoved);
      if (gameOver) {
        // Scores are relative to the side to move (negamax): winning on the
        // move is good, being checkmated is bad, independent of aiColor.
        if (gameOver.winner === currentPlayer) return 99999 + depth;
        if (gameOver.winner === null) return 0; // Draw
        return -99999 - depth;
      }
      if (depth === 0) return quiescence(board, alpha, beta, currentPlayer, hasMoved, 0);

      const moves = getAllMoves(board, currentPlayer, hasMoved);
      moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

      let bestScore = -Infinity;

      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = -alphaBeta(newBoard, depth - 1, -beta, -alpha, aiColor, !isAITurn, hasMoved);
        if (score > bestScore) bestScore = score;
        if (bestScore > alpha) alpha = bestScore;
        if (alpha >= beta) break;
      }
      return bestScore;
    }

    function getBestAIMove(board, aiColor, hasMoved, difficulty) {
      const moves = getAllMoves(board, aiColor, hasMoved);
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

      // Prioritize captures and promotions
      moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));

      for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = -alphaBeta(
          newBoard,
          searchDepth - 1,
          -Infinity,
          -bestScore,
          aiColor,
          false,
          hasMoved
        );
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
      return bestMove;
    }

    return {
      AI_DEPTH,
      QUIESCENCE_MAX_PLY,
      getPositionValue,
      evaluateBoard,
      moveOrderScore,
      quiescence,
      alphaBeta,
      getBestAIMove,
    };
  }
  return { createGameAI };
});
