import { format, parseISO, addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

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

/**
 * Convert a date picker value (YYYY-MM-DD) into an ISO 8601 start-of-day timestamp
 * anchored to the configured village timezone.
 *
 * @param {string} dateStr - YYYY-MM-DD string from a QDate input.
 * @param {string} timezone - IANA timezone string (e.g. 'Africa/Lusaka').
 * @returns {string} ISO 8601 datetime string (UTC) representing 00:00:00 in the given timezone.
 */
export function datePickerToStartOfDayISO(dateStr, timezone) {
  if (!dateStr) return '';
  const zonedDate = fromZonedTime(`${dateStr}T00:00:00`, timezone || 'UTC');
  return zonedDate.toISOString();
}

/**
 * Convert a date picker value (YYYY-MM-DD) into an ISO 8601 end-of-day timestamp
 * anchored to the configured village timezone.
 *
 * @param {string} dateStr - YYYY-MM-DD string from a QDate input.
 * @param {string} timezone - IANA timezone string (e.g. 'Africa/Lusaka').
 * @returns {string} ISO 8601 datetime string (UTC) representing 23:59:59.999 in the given timezone.
 */
export function datePickerToEndOfDayISO(dateStr, timezone) {
  if (!dateStr) return '';
  const zonedDate = fromZonedTime(`${dateStr}T23:59:59.999`, timezone || 'UTC');
  return zonedDate.toISOString();
}

/**
 * Format a date for display in the configured village timezone.
 *
 * @param {string|Date} date - Date value to format.
 * @param {string} timezone - IANA timezone string.
 * @param {string} [fmt='d MMM, yyyy'] - date-fns format string.
 * @returns {string} Formatted date string.
 */
export function formatDateInTimezone(date, timezone, fmt = 'd MMM, yyyy') {
  if (!date) return '';
  try {
    const parsedDate =
      typeof date === 'string' && date.includes('T') ? parseISO(date) : new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return '';
    return formatInTimeZone(parsedDate, timezone || 'UTC', fmt);
  } catch {
    return String(date);
  }
}

/**
 * Return the JavaScript day-of-week (0=Sunday, 6=Saturday) for a given date
 * interpreted in the configured village timezone.
 *
 * @param {string|Date} date - ISO string or Date object.
 * @param {string} timezone - IANA timezone string.
 * @returns {number} Day-of-week index (0-6), or -1 if invalid.
 */
export function getDayOfWeekInTimezone(date, timezone) {
  if (!date) return -1;
  const isoString = typeof date === 'string' ? date : date.toISOString();
  const datePart = isoString.slice(0, 10);
  const zonedDate = fromZonedTime(`${datePart}T12:00:00`, timezone || 'UTC');
  return zonedDate.getDay();
}

/**
 * Add a number of days to a YYYY-MM-DD string and return the resulting YYYY-MM-DD string.
 *
 * @param {string} dateStr - YYYY-MM-DD string.
 * @param {number} days - Number of days to add (can be negative).
 * @returns {string} YYYY-MM-DD string.
 */
export function addDaysToDateStr(dateStr, days) {
  if (!dateStr) return '';
  return format(addDays(parseISO(dateStr), days), 'yyyy-MM-dd');
}

/**
 * Convert an ISO datetime string back into the YYYY-MM-DD calendar date string
 * in the configured village timezone.
 *
 * @param {string} isoString - ISO 8601 datetime string.
 * @param {string} timezone - IANA timezone string.
 * @returns {string} YYYY-MM-DD string in the given timezone.
 */
export function toDateStrInTimezone(isoString, timezone) {
  if (!isoString) return '';
  try {
    const parsed = isoString.includes('T') ? parseISO(isoString) : new Date(isoString);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatInTimeZone(parsed, timezone || 'UTC', 'yyyy-MM-dd');
  } catch {
    return isoString.slice(0, 10);
  }
}
