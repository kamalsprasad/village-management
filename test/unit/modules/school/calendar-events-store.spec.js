import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCalendarEventsStore } from 'src/modules/school/stores/calendar-events-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock settings-store (used for timezone in getters)
vi.mock('src/stores/settings-store', () => ({
  useSettingsStore: () => ({
    timezone: 'UTC',
  }),
}));

// Mock dateUtils
vi.mock('src/utils/dateUtils', () => ({
  getDayOfWeekInTimezone: vi.fn(() => 1),
  toDateStrInTimezone: vi.fn((d) => d),
  addDaysToDateStr: vi.fn((d, n) => d),
}));

const event = (over = {}) => ({
  $id: 'evt-1',
  title: 'School Holiday',
  start_date: '2026-01-15',
  end_date: '2026-01-15',
  is_school_day: false,
  affected_class_ids: [],
  ...over,
});

describe('calendar-events-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useCalendarEventsStore();
    vi.clearAllMocks();
  });

  describe('fetchCalendarEvents', () => {
    it('fetches events and updates state', async () => {
      const events = [event()];
      mockTables.listRows.mockResolvedValue({ rows: events });

      const result = await store.fetchCalendarEvents();

      expect(result.success).toBe(true);
      expect(store.calendarEvents).toEqual(events);
      expect(store.calendarEventsLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.calendarEventsLoaded = true;
      store.calendarEvents = [event()];

      const result = await store.fetchCalendarEvents();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchCalendarEvents();

      expect(result.success).toBe(false);
    });
  });

  describe('saveEvent', () => {
    it('creates a new event when no $id', async () => {
      const newEvent = event({ $id: 'evt-new' });
      mockTables.createRow.mockResolvedValue(newEvent);

      const result = await store.saveEvent({
        title: 'Holiday',
        start_date: '2026-01-15',
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.calendarEvents.find((e) => e.$id === 'evt-new')).toBeDefined();
    });

    it('updates an existing event when $id is present', async () => {
      store.calendarEvents = [event({ $id: 'evt-1', title: 'Old' })];
      const updated = event({ $id: 'evt-1', title: 'New' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.saveEvent({
        $id: 'evt-1',
        title: 'New',
        start_date: '2026-01-15',
      });

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
      expect(store.calendarEvents[0].title).toBe('New');
    });

    it('defaults end_date to start_date when not provided', async () => {
      mockTables.createRow.mockResolvedValue(event());

      await store.saveEvent({ title: 'Test', start_date: '2026-01-15' });

      const data = mockTables.createRow.mock.calls[0][0].data;
      expect(data.end_date).toBe('2026-01-15');
    });

    it('defaults is_school_day to false when not provided', async () => {
      mockTables.createRow.mockResolvedValue(event());

      await store.saveEvent({ title: 'Test', start_date: '2026-01-15' });

      const data = mockTables.createRow.mock.calls[0][0].data;
      expect(data.is_school_day).toBe(false);
    });

    it('deletes affected_class_ids on create when empty', async () => {
      mockTables.createRow.mockResolvedValue(event());

      await store.saveEvent({ title: 'Test', start_date: '2026-01-15', affected_class_ids: [] });

      const data = mockTables.createRow.mock.calls[0][0].data;
      expect(data.affected_class_ids).toBeUndefined();
    });

    it('sets affected_class_ids to empty array on update when empty', async () => {
      mockTables.updateRow.mockResolvedValue(event());

      await store.saveEvent({ $id: 'evt-1', title: 'Test', start_date: '2026-01-15', affected_class_ids: [] });

      const data = mockTables.updateRow.mock.calls[0][0].data;
      expect(data.affected_class_ids).toEqual([]);
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.saveEvent({ title: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.calendarEvents = [event({ $id: 'evt-1' })];

      const result = await store.deleteEvent('evt-1');

      expect(result.success).toBe(true);
      expect(store.calendarEvents).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteEvent('evt-1');

      expect(result.success).toBe(false);
    });
  });
});
