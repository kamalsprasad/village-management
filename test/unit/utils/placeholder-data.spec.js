import { describe, it, expect } from 'vitest';
import {
  upcomingEvents,
  quickStats,
  recentActivity,
  formatActivityTime,
  getEventIcon,
  getEventColor,
} from 'src/utils/placeholder-data';

describe('placeholder-data', () => {
  describe('upcomingEvents', () => {
    it('is a non-empty array of event objects', () => {
      expect(Array.isArray(upcomingEvents)).toBe(true);
      expect(upcomingEvents.length).toBeGreaterThan(0);
    });

    it('every event has the required fields', () => {
      for (const e of upcomingEvents) {
        expect(e.id).toBeDefined();
        expect(e.title).toBeTruthy();
        expect(e.date).toBeInstanceOf(Date);
        expect(e.time).toBeTruthy();
        expect(e.location).toBeTruthy();
        expect(e.type).toBeTruthy();
      }
    });
  });

  describe('quickStats', () => {
    it('has stats for all expected modules', () => {
      expect(quickStats.households).toBeDefined();
      expect(quickStats.residents).toBeDefined();
      expect(quickStats.finance).toBeDefined();
      expect(quickStats.lending).toBeDefined();
      expect(quickStats.farm).toBeDefined();
      expect(quickStats.school).toBeDefined();
      expect(quickStats.inventory).toBeDefined();
    });

    it('finance stats include currency and numeric values', () => {
      expect(typeof quickStats.finance.monthlyIncome).toBe('number');
      expect(quickStats.finance.currency).toBe('ZMW');
    });
  });

  describe('recentActivity', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(recentActivity)).toBe(true);
      expect(recentActivity.length).toBeGreaterThan(0);
    });

    it('every activity has required fields', () => {
      for (const a of recentActivity) {
        expect(a.id).toBeDefined();
        expect(a.title).toBeTruthy();
        expect(a.timestamp).toBeInstanceOf(Date);
        expect(a.module).toBeTruthy();
      }
    });
  });

  describe('formatActivityTime', () => {
    it('returns "Just now" for a timestamp less than a minute old', () => {
      expect(formatActivityTime(new Date())).toBe('Just now');
    });

    it('returns "Xm ago" for minutes', () => {
      const ts = new Date(Date.now() - 5 * 60000);
      expect(formatActivityTime(ts)).toBe('5m ago');
    });

    it('returns "Xh ago" for hours', () => {
      const ts = new Date(Date.now() - 3 * 3600000);
      expect(formatActivityTime(ts)).toBe('3h ago');
    });

    it('returns "Xd ago" for days', () => {
      const ts = new Date(Date.now() - 2 * 86400000);
      expect(formatActivityTime(ts)).toBe('2d ago');
    });

    it('returns a formatted date for 7+ days', () => {
      const ts = new Date(Date.now() - 10 * 86400000);
      const out = formatActivityTime(ts);
      expect(out).toMatch(/^\w{3} \d{2}, \d{4}$/);
    });
  });

  describe('getEventIcon', () => {
    it('returns the icon for known types', () => {
      expect(getEventIcon('meeting')).toBe('groups');
      expect(getEventIcon('education')).toBe('school');
      expect(getEventIcon('celebration')).toBe('celebration');
      expect(getEventIcon('training')).toBe('model_training');
      expect(getEventIcon('health')).toBe('medical_services');
    });

    it('returns default icon for unknown type', () => {
      expect(getEventIcon('unknown')).toBe('event');
    });
  });

  describe('getEventColor', () => {
    it('returns the color for known types', () => {
      expect(getEventColor('meeting')).toBe('primary');
      expect(getEventColor('education')).toBe('purple');
      expect(getEventColor('celebration')).toBe('positive');
      expect(getEventColor('training')).toBe('orange');
      expect(getEventColor('health')).toBe('red');
    });

    it('returns default color for unknown type', () => {
      expect(getEventColor('unknown')).toBe('grey');
    });
  });
});
