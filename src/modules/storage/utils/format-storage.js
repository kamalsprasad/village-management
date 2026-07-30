/**
 * Storage formatting helpers (Story 5.3)
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Formats a byte count as a human-readable string (e.g. "1.5 MB").
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, exponent);

  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${UNITS[exponent]}`;
}

/**
 * Formats a 0-1 fraction as a whole-number percentage string (e.g. "42%").
 * @param {number} value
 * @returns {string}
 */
export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) {
    return '0%';
  }

  return `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;
}

/**
 * Formats a storage quota in bytes, returning "Unlimited" for -1.
 * @param {number} quotaBytes
 * @returns {string}
 */
export function formatQuota(quotaBytes) {
  if (quotaBytes === -1) {
    return 'Unlimited';
  }

  return formatBytes(quotaBytes);
}
