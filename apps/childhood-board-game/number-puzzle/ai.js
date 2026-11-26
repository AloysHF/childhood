/* eslint-disable no-undef, prefer-arrow-callback */
// ============================================================
// Number Sliding Puzzle (数字华容道) - Hint engine
// ============================================================
//
// The puzzle has no opponent, so the shared AI can only help the
// player: it suggests the next slide. The suggestion quality is
// driven by the shared AIDifficulty level so the existing
// "easy / normal / hard / master" control keeps its meaning.
//
// A greedy Manhattan descent is used instead of a full A* search:
// it is instant on 5x5 boards and, with a little noise on the
// lower levels, never leaks a perfect solution.
//
// Wrapped in a factory (same shape as tic-tac-toe/ai.js) so the
// browser global stays a single `PuzzleHint` object instead of
// leaking `createPuzzleAI` into the shared script scope.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PuzzleHint = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const HINT_PROFILES = {
    easy: { noise: 0.75 },
    normal: { noise: 0.4 },
    hard: { noise: 0.15 },
    master: { noise: 0 },
  };

  /**
   * Build the hint engine.
   * @param {Object} deps - board helpers from game.js
   * @param {Function} deps.getBlankIndex
   * @param {Function} deps.getNeighbors
   * @param {Function} deps.getBoardSize
   * @param {Function} deps.manhattanDistance
   * @param {Function} deps.moveTile
   * @returns {{getHint: Function, legalMoves: Function, scoreMove: Function, getNoise: Function}}
   */
  function createPuzzleAI(deps) {
    const { getBlankIndex, getNeighbors, getBoardSize, manhattanDistance, moveTile } = deps;

    /**
     * Indexes of the tiles that can slide right now.
     * @param {number[]} board
     * @returns {number[]}
     */
    function legalMoves(board) {
      return getNeighbors(getBlankIndex(board), getBoardSize(board));
    }

    /**
     * Manhattan distance after sliding `index` (lower is better).
     * @param {number[]} board
     * @param {number} index
     * @returns {number}
     */
    function scoreMove(board, index) {
      const next = moveTile(board, index);
      if (!next) return Number.POSITIVE_INFINITY;
      return manhattanDistance(next);
    }

    /**
     * Probability of returning a deliberately random move.
     * @param {string} [level]
     * @returns {number}
     */
    function getNoise(level) {
      const profile = HINT_PROFILES[level] || HINT_PROFILES.normal;
      return profile.noise;
    }

    /**
     * Suggest the next tile to slide.
     * @param {number[]} board
     * @param {{level?: string, random?: Function}} [options]
     * @returns {number} tile index, or -1 when no tile can move
     */
    function getHint(board, options) {
      const opts = options || {};
      const random = typeof opts.random === "function" ? opts.random : Math.random;
      const moves = legalMoves(board);
      if (moves.length === 0) return -1;

      const level =
        opts.level || (typeof AIDifficulty !== "undefined" ? AIDifficulty.getLevel() : "normal");

      if (random() < getNoise(level)) {
        return moves[Math.floor(random() * moves.length)];
      }

      let best = moves[0];
      let bestScore = Number.POSITIVE_INFINITY;
      moves.forEach((index) => {
        const score = scoreMove(board, index);
        if (score < bestScore) {
          bestScore = score;
          best = index;
        }
      });
      return best;
    }

    return { getHint, legalMoves, scoreMove, getNoise };
  }

  return { HINT_PROFILES, createPuzzleAI };
});
