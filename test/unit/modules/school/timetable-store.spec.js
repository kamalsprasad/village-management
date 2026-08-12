import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useTimetableStore } from 'src/modules/school/stores/timetable-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock academic-terms-store (used by defaultValidFrom) — shared mutable instance
const mockTermsStore = {
  academicTerms: [
    { $id: 't1', academic_year: 2026, start_date: '2026-01-15T00:00:00Z', term_order: 1 },
  ],
  fetchAcademicTerms: vi.fn().mockResolvedValue({ success: true }),
  termsByYear: vi.fn((year) => [
    { $id: 't1', academic_year: year, start_date: '2026-01-15T00:00:00Z', term_order: 1 },
  ]),
};
vi.mock('src/modules/school/stores/academic-terms-store', () => ({
  useAcademicTermsStore: () => mockTermsStore,
}));

const entry = (over = {}) => ({
  $id: 'entry-1',
  is_template: true,
  class_id: null,
  grade_level: '1',
  academic_year: 2026,
  slot_id: 'slot-1',
  day_of_week: 'monday',
  subject: 'Math',
  teacher_id: 't1',
  notes: null,
  valid_from: '2026-01-15T00:00:00Z',
  valid_to: null,
  ...over,
});

describe('timetable-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useTimetableStore();
    vi.clearAllMocks();
  });

  describe('fetchTimetableEntries', () => {
    it('fetches entries and enriches them', async () => {
      const entries = [entry()];
      mockTables.listRows.mockResolvedValue({ rows: entries });

      const result = await store.fetchTimetableEntries();

      expect(result.success).toBe(true);
      expect(store.timetableEntries).toHaveLength(1);
      expect(store.timetableLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.timetableLoaded = true;
      store.timetableEntries = [entry()];

      const result = await store.fetchTimetableEntries();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchTimetableEntries();

      expect(result.success).toBe(false);
    });
  });

  describe('saveTemplateEntries', () => {
    it('deletes existing template entries and creates new ones', async () => {
      store.timetableEntries = [
        entry({ $id: 'old-1', is_template: true, grade_level: '1', academic_year: 2026 }),
      ];
      mockTables.deleteRow.mockResolvedValue();
      mockTables.createRow.mockResolvedValue(entry({ $id: 'new-1' }));

      const result = await store.saveTemplateEntries('1', 2026, [
        { slot_id: 'slot-1', day_of_week: 'monday', subject: 'Math', teacher_id: 't1' },
      ]);

      expect(result.success).toBe(true);
      expect(mockTables.deleteRow).toHaveBeenCalled();
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('returns error when delete fails and re-fetches', async () => {
      store.timetableEntries = [
        entry({ $id: 'old-1', is_template: true, grade_level: '1', academic_year: 2026 }),
      ];
      mockTables.deleteRow.mockRejectedValue(new Error('delete fail'));
      mockTables.listRows.mockResolvedValue({ rows: [] });

      const result = await store.saveTemplateEntries('1', 2026, []);

      expect(result.success).toBe(false);
    });

    it('returns error when create fails and re-fetches', async () => {
      mockTables.deleteRow.mockResolvedValue();
      mockTables.createRow.mockRejectedValue(new Error('create fail'));
      mockTables.listRows.mockResolvedValue({ rows: [] });

      const result = await store.saveTemplateEntries('1', 2026, [
        { slot_id: 'slot-1', day_of_week: 'monday' },
      ]);

      expect(result.success).toBe(false);
    });
  });

  describe('deleteEntry', () => {
    it('deletes an entry and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.timetableEntries = [entry({ $id: 'entry-1' })];

      const result = await store.deleteEntry('entry-1');

      expect(result.success).toBe(true);
      expect(store.timetableEntries).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteEntry('entry-1');

      expect(result.success).toBe(false);
    });
  });

  describe('defaultValidFrom', () => {
    it('returns first term start_date when terms exist', async () => {
      const result = await store.defaultValidFrom(2026);

      expect(result).toBe('2026-01-15T00:00:00Z');
    });

    it('returns null when no terms exist for the year', async () => {
      // Override the shared mock's termsByYear to return empty
      mockTermsStore.termsByYear = vi.fn(() => []);

      const result = await store.defaultValidFrom(2027);

      expect(result).toBeNull();

      // Restore for subsequent tests
      mockTermsStore.termsByYear = vi.fn((year) => [
        { $id: 't1', academic_year: year, start_date: '2026-01-15T00:00:00Z', term_order: 1 },
      ]);
    });
  });
});
