/**
 * School Module Utilities (Story 4.2)
 *
 * Shared utility functions for score percentage computations and formats.
 */

/**
 * Compute the score percentage
 * @param {number} scoreValue - Raw score
 * @param {number} maxScore - Maximum score
 * @returns {number} Score percentage (0-100 rounded)
 */
export function computeScorePercent(scoreValue, maxScore) {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.round((scoreValue / maxScore) * 100);
}

/**
 * Get color code for score percentage based on risk thresholds (Story 4.4 / 4.2 AC4)
 * @param {number} percent - Score percentage (0-100)
 * @returns {string} Quasar text color class name
 */
export function getScoreColorClass(percent) {
  if (percent < 50) return 'text-negative'; // Red (< 50%)
  if (percent < 60) return 'text-warning';  // Orange (50-59%)
  return 'text-positive';                    // Green (60%+)
}

/**
 * Get background color code for score percentage
 * @param {number} percent - Score percentage (0-100)
 * @returns {string} Quasar background color class name
 */
export function getScoreBgClass(percent) {
  if (percent < 50) return 'bg-red-1 text-red-9';
  if (percent < 60) return 'bg-orange-1 text-orange-9';
  return 'bg-green-1 text-green-9';
}
