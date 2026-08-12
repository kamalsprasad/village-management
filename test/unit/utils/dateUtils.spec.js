import { describe, it, expect } from 'vitest';
import {
  formatDate,
  datePickerToStartOfDayISO,
  datePickerToEndOfDayISO,
  formatDateInTimezone,
  getDayOfWeekInTimezone,
  addDaysToDateStr,
  toDateStrInTimezone,
} from 'src/utils/dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('returns fallback for null/undefined/empty', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
      expect(formatDate(null, 'N/A')).toBe('N/A');
    });

    it('formats an ISO datetime string', () => {
      const out = formatDate('2025-01-05T12:00:00.000Z');
      // Day-of-month depends on local tz, but format is "D MMM, yyyy"
      expect(out).toMatch(/^\d{1,2} \w{3}, 2025$/);
    });

    it('formats a YYYY-MM-DD string', () => {
      const out = formatDate('2025-01-05');
      expect(out).toMatch(/^\d{1,2} \w{3}, 2025$/);
    });

    it('formats a Date object', () => {
      const out = formatDate(new Date('2025-06-15T12:00:00Z'));
      expect(out).toMatch(/^\d{1,2} \w{3}, 2025$/);
    });

    it('returns stringified value on invalid input', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('datePickerToStartOfDayISO', () => {
    it('returns empty string for falsy input', () => {
      expect(datePickerToStartOfDayISO('')).toBe('');
      expect(datePickerToStartOfDayISO(null)).toBe('');
    });

    it('produces an ISO string for UTC timezone', () => {
      const iso = datePickerToStartOfDayISO('2025-01-05', 'UTC');
      expect(iso).toBe('2025-01-05T00:00:00.000Z');
    });

    it('defaults to UTC when timezone omitted', () => {
      const iso = datePickerToStartOfDayISO('2025-01-05');
      expect(iso).toBe('2025-01-05T00:00:00.000Z');
    });
  });

  describe('datePickerToEndOfDayISO', () => {
    it('returns empty string for falsy input', () => {
      expect(datePickerToEndOfDayISO('')).toBe('');
    });

    it('produces end-of-day ISO for UTC', () => {
      const iso = datePickerToEndOfDayISO('2025-01-05', 'UTC');
      expect(iso).toBe('2025-01-05T23:59:59.999Z');
    });
  });

  describe('formatDateInTimezone', () => {
    it('returns empty string for falsy input', () => {
      expect(formatDateInTimezone('', 'UTC')).toBe('');
      expect(formatDateInTimezone(null, 'UTC')).toBe('');
    });

    it('formats a UTC datetime in UTC', () => {
      expect(formatDateInTimezone('2025-01-05T12:00:00Z', 'UTC')).toBe('5 Jan, 2025');
    });

    it('returns empty string for invalid input (Invalid Date)', () => {
      expect(formatDateInTimezone('garbage', 'UTC')).toBe('');
    });

    it('returns stringified value when formatInTimeZone throws (bad timezone)', () => {
      // An invalid timezone causes formatInTimeZone to throw, hitting the catch.
      const out = formatDateInTimezone('2025-01-05T12:00:00Z', 'Invalid/Zone');
      expect(out).toBe('2025-01-05T12:00:00Z');
    });

    it('accepts a custom format', () => {
      expect(formatDateInTimezone('2025-01-05T12:00:00Z', 'UTC', 'yyyy-MM-dd')).toBe('2025-01-05');
    });
  });

  describe('getDayOfWeekInTimezone', () => {
    it('returns -1 for falsy input', () => {
      expect(getDayOfWeekInTimezone('', 'UTC')).toBe(-1);
      expect(getDayOfWeekInTimezone(null, 'UTC')).toBe(-1);
    });

    it('returns 0 (Sunday) for a Sunday in UTC', () => {
      // 2025-01-05 is a Sunday
      expect(getDayOfWeekInTimezone('2025-01-05T12:00:00Z', 'UTC')).toBe(0);
    });

    it('accepts a Date object', () => {
      expect(getDayOfWeekInTimezone(new Date('2025-01-05T12:00:00Z'), 'UTC')).toBe(0);
    });
  });

  describe('addDaysToDateStr', () => {
    it('returns empty string for falsy input', () => {
      expect(addDaysToDateStr('', 5)).toBe('');
    });

    it('adds days correctly', () => {
      expect(addDaysToDateStr('2025-01-05', 10)).toBe('2025-01-15');
    });

    it('subtracts days with negative input', () => {
      expect(addDaysToDateStr('2025-01-15', -10)).toBe('2025-01-05');
    });

    it('handles month boundary', () => {
      expect(addDaysToDateStr('2025-01-31', 1)).toBe('2025-02-01');
    });

    it('returns empty string for invalid input', () => {
      expect(addDaysToDateStr('garbage', 5)).toBe('');
    });
  });

  describe('toDateStrInTimezone', () => {
    it('returns empty string for falsy input', () => {
      expect(toDateStrInTimezone('', 'UTC')).toBe('');
    });

    it('converts ISO to YYYY-MM-DD in UTC', () => {
      expect(toDateStrInTimezone('2025-01-05T12:00:00Z', 'UTC')).toBe('2025-01-05');
    });

    it('returns empty string for invalid input (Invalid Date)', () => {
      expect(toDateStrInTimezone('garbage-value', 'UTC')).toBe('');
    });
  });
});
