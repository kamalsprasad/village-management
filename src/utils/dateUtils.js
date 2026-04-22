import { format, parseISO } from 'date-fns';

/**
 * Format a date string for display.
 * Accepts ISO 8601 strings and any value accepted by `new Date()`.
 *
 * @param {string|Date|null|undefined} dateString - The date to format.
 * @param {string} [fallback='-'] - Value returned when dateString is falsy.
 * @returns {string} Formatted date, e.g. "5 Jan, 2025".
 */
export function formatDate(dateString, fallback = '-') {
  if (!dateString) return fallback;
  try {
    const date =
      typeof dateString === 'string' && dateString.includes('T')
        ? parseISO(dateString)
        : new Date(dateString);
    return format(date, 'd MMM, yyyy');
  } catch {
    return String(dateString);
  }
}
