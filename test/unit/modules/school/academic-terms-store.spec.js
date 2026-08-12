import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAcademicTermsStore } from 'src/modules/school/stores/academic-terms-store';
import { mockTables } from 'test/helpers/appwrite-mock';

// Mock settings-store (used for timezone in getters)
vi.mock('src/stores/settings-store', () => ({
  useSettingsStore: () => ({
    timezone: 'UTC',
  }),
}));

const term = (over = {}) => ({
  $id: 'term-1',
  academic_year: 2026,
  term_name: 'Term 1',
  term_order: 1,
  start_date: '2026-01-15T00:00:00Z',
  end_date: '2026-04-15T00:00:00Z',
  notes: null,
  ...over,
});

describe('academic-terms-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAcademicTermsStore();
    vi.clearAllMocks();
  });

  describe('fetchAcademicTerms', () => {
    it('fetches terms and updates state', async () => {
      const terms = [term()];
      mockTables.listRows.mockResolvedValue({ rows: terms });

      const result = await store.fetchAcademicTerms();

      expect(result.success).toBe(true);
      expect(store.academicTerms).toEqual(terms);
      expect(store.academicTermsLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.academicTermsLoaded = true;
      store.academicTerms = [term()];

      const result = await store.fetchAcademicTerms();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchAcademicTerms();

      expect(result.success).toBe(false);
    });
  });

  describe('saveTerm', () => {
    it('creates a new term when no $id', async () => {
      const newTerm = term({ $id: 'term-new' });
      mockTables.createRow.mockResolvedValue(newTerm);

      const result = await store.saveTerm({
        academic_year: 2026,
        term_name: 'Term 1',
        term_order: 1,
        start_date: '2026-01-15',
        end_date: '2026-04-15',
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.academicTerms.find((t) => t.$id === 'term-new')).toBeDefined();
    });

    it('updates an existing term when $id is present', async () => {
      store.academicTerms = [term({ $id: 'term-1', term_name: 'Old' })];
      const updated = term({ $id: 'term-1', term_name: 'New' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.saveTerm({
        $id: 'term-1',
        term_name: 'New',
        term_order: 1,
      });

      expect(result.success).toBe(true);
      expect(mockTables.updateRow).toHaveBeenCalled();
      expect(store.academicTerms[0].term_name).toBe('New');
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.saveTerm({ term_name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('deleteTerm', () => {
    it('deletes a term and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.academicTerms = [term({ $id: 'term-1' })];

      const result = await store.deleteTerm('term-1');

      expect(result.success).toBe(true);
      expect(store.academicTerms).toHaveLength(0);
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteTerm('term-1');

      expect(result.success).toBe(false);
    });
  });

  describe('deleteAllTermsForYear', () => {
    it('deletes all terms for a year', async () => {
      store.academicTerms = [
        term({ $id: 't1', academic_year: 2026 }),
        term({ $id: 't2', academic_year: 2026 }),
        term({ $id: 't3', academic_year: 2025 }),
      ];
      mockTables.deleteRow.mockResolvedValue();

      const result = await store.deleteAllTermsForYear(2026);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(2);
      expect(store.academicTerms).toHaveLength(1);
      expect(store.academicTerms[0].academic_year).toBe(2025);
    });

    it('returns success with 0 deleted when no terms exist', async () => {
      const result = await store.deleteAllTermsForYear(2026);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
    });

    it('returns error on failure', async () => {
      store.academicTerms = [term({ $id: 't1', academic_year: 2026 })];
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteAllTermsForYear(2026);

      expect(result.success).toBe(false);
    });
  });

  describe('copyTermsFromYear', () => {
    it('copies terms from source year to target year with date shift', async () => {
      store.academicTerms = [
        term({ $id: 't1', academic_year: 2025, start_date: '2025-01-15T00:00:00Z', end_date: '2025-04-15T00:00:00Z' }),
      ];
      const copiedTerm = term({ $id: 't-copy', academic_year: 2026 });
      mockTables.createRow.mockResolvedValue(copiedTerm);

      const result = await store.copyTermsFromYear(2025, 2026);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('returns error when no source terms exist', async () => {
      const result = await store.copyTermsFromYear(2025, 2026);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/No terms found/);
    });

    it('returns error on create failure', async () => {
      store.academicTerms = [term({ $id: 't1', academic_year: 2025 })];
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.copyTermsFromYear(2025, 2026);

      expect(result.success).toBe(false);
    });
  });
});
