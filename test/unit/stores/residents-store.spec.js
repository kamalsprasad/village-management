import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useResidentsStore } from 'src/stores/residents-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { mockTables } from 'test/helpers/appwrite-mock';

const resident = (over = {}) => ({
  $id: 'r1',
  first_name: 'John',
  middle_names: 'M',
  last_name: 'Doe',
  household_id: 'h1',
  ...over,
});

describe('residents-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useResidentsStore();
  });

  describe('getters', () => {
    it('paginatedResidents returns residents', () => {
      store.residents = [resident()];
      expect(store.paginatedResidents).toHaveLength(1);
    });

    it('totalPages computes from total and itemsPerPage', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      expect(store.totalPages).toBe(3);
    });

    it('hasNextPage true when currentPage < totalPages', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 1;
      expect(store.hasNextPage).toBe(true);
    });

    it('hasNextPage false on last page', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 3;
      expect(store.hasNextPage).toBe(false);
    });

    it('hasPreviousPage true when currentPage > 1', () => {
      store.pagination.currentPage = 2;
      expect(store.hasPreviousPage).toBe(true);
    });

    it('hasPreviousPage false on first page', () => {
      store.pagination.currentPage = 1;
      expect(store.hasPreviousPage).toBe(false);
    });

    it('getFullName builds name from parts', () => {
      expect(store.getFullName(resident())).toBe('John M Doe');
    });

    it('getFullName omits middle_names when empty', () => {
      expect(store.getFullName(resident({ middle_names: '' }))).toBe('John Doe');
    });

    it('getFullName returns empty string for null', () => {
      expect(store.getFullName(null)).toBe('');
    });

    it('getFullNameById looks up by id', () => {
      store.residents = [resident({ $id: 'r1' }), resident({ $id: 'r2', first_name: 'Jane' })];
      expect(store.getFullNameById('r2')).toBe('Jane M Doe');
    });

    it('getFullNameById returns empty string when not found', () => {
      store.residents = [];
      expect(store.getFullNameById('rX')).toBe('');
    });

    it('getResidentById returns the resident or null', () => {
      store.residents = [resident({ $id: 'r1' })];
      expect(store.getResidentById('r1')).toEqual(store.residents[0]);
      expect(store.getResidentById('rX')).toBeNull();
    });
  });

  describe('buildQueries', () => {
    it('includes limit, offset, and orderDesc', () => {
      const q = store.buildQueries(10, 20);
      expect(q).toHaveLength(3);
    });

    it('adds household filter when set', () => {
      store.filters.householdId = 'h1';
      const q = store.buildQueries(10, 0);
      expect(q).toHaveLength(4);
    });
  });

  describe('filterResidentsByName', () => {
    const list = [
      resident({ $id: 'r1', first_name: 'John' }),
      resident({ $id: 'r2', first_name: 'Jane', last_name: 'Smith' }),
    ];

    it('returns all when no search term', () => {
      expect(store.filterResidentsByName(list, '')).toHaveLength(2);
    });

    it('matches by first name (case-insensitive)', () => {
      expect(store.filterResidentsByName(list, 'john')).toHaveLength(1);
    });

    it('matches by last name', () => {
      expect(store.filterResidentsByName(list, 'smith')).toHaveLength(1);
    });

    it('returns empty for no match', () => {
      expect(store.filterResidentsByName(list, 'nonexistent')).toHaveLength(0);
    });
  });

  describe('fetchResidents', () => {
    it('returns cached when already loaded with same params', async () => {
      store.loaded = true;
      store.pagination.currentPage = 1;
      store.pagination.itemsPerPage = 10;
      store.residents = [resident()];
      const result = await store.fetchResidents(1, 10);
      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('fetches and enriches with household names', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({
          rows: [resident({ $id: 'r1', household_id: 'h1' })],
          total: 1,
        })
        .mockResolvedValueOnce({ rows: [{ $id: 'h1', name: 'Household 1' }] });

      const result = await store.fetchResidents(1, 10);
      expect(result.success).toBe(true);
      expect(store.residents).toHaveLength(1);
      expect(store.residents[0].household).toEqual({ $id: 'h1', name: 'Household 1' });
      expect(store.loaded).toBe(true);
    });

    it('applies client-side name filtering', async () => {
      store.filters.searchName = 'john';
      mockTables.listRows
        .mockResolvedValueOnce({
          rows: [
            resident({ $id: 'r1', first_name: 'John' }),
            resident({ $id: 'r2', first_name: 'Jane' }),
          ],
          total: 2,
        })
        .mockResolvedValueOnce({ rows: [] });

      await store.fetchResidents(1, 10);
      expect(store.residents).toHaveLength(1);
      expect(store.residents[0].first_name).toBe('John');
    });

    it('handles error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      const result = await store.fetchResidents(1, 10);
      expect(result.success).toBe(false);
    });
  });

  describe('fetchResidentById', () => {
    it('fetches resident and household', async () => {
      mockTables.getRow
        .mockResolvedValueOnce(resident({ $id: 'r1', household_id: 'h1' }))
        .mockResolvedValueOnce({ $id: 'h1', name: 'HH1' });
      const result = await store.fetchResidentById('r1');
      expect(result.success).toBe(true);
      expect(store.currentResident.household).toEqual({ $id: 'h1', name: 'HH1' });
    });

    it('fetches resident without household', async () => {
      mockTables.getRow.mockResolvedValue(resident({ $id: 'r1', household_id: null }));
      const result = await store.fetchResidentById('r1');
      expect(result.success).toBe(true);
      expect(store.currentResident.household).toBeUndefined();
    });

    it('handles error', async () => {
      mockTables.getRow.mockRejectedValue(new Error('fail'));
      const result = await store.fetchResidentById('r1');
      expect(result.success).toBe(false);
    });
  });

  describe('createResident', () => {
    it('creates a resident and refreshes the list', async () => {
      mockTables.createRow.mockResolvedValue(resident({ $id: 'r-new' }));
      mockTables.listRows
        .mockResolvedValue({ rows: [], total: 0 }); // enrich + refresh + villageSettings
      const result = await store.createResident({
        first_name: 'New',
        last_name: 'Resident',
        dob: '1990-01-01',
        gender: 'male',
        household_id: 'h1',
      });
      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('handles error', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));
      const result = await store.createResident({ first_name: 'X', last_name: 'Y' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateResident', () => {
    it('updates and syncs households when household changed', async () => {
      mockTables.getRow.mockResolvedValue(resident({ $id: 'r1', household_id: 'h-old' }));
      mockTables.updateRow.mockResolvedValue(resident({ $id: 'r1', household_id: 'h-new' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.updateResident('r1', {
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-01-01',
        gender: 'male',
        household_id: 'h-new',
      });
      expect(result.success).toBe(true);
    });

    it('updates without syncing when household unchanged', async () => {
      mockTables.getRow.mockResolvedValue(resident({ $id: 'r1', household_id: 'h1' }));
      mockTables.updateRow.mockResolvedValue(resident({ $id: 'r1', household_id: 'h1' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.updateResident('r1', {
        first_name: 'John',
        last_name: 'Doe',
        dob: '1990-01-01',
        gender: 'male',
        household_id: 'h1',
      });
      expect(result.success).toBe(true);
    });

    it('updates currentResident when it matches', async () => {
      store.currentResident = resident({ $id: 'r1', first_name: 'Old' });
      mockTables.getRow.mockResolvedValue(resident({ $id: 'r1', household_id: 'h1' }));
      mockTables.updateRow.mockResolvedValue(resident({ $id: 'r1', first_name: 'New', household_id: 'h1' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.updateResident('r1', {
        first_name: 'New',
        last_name: 'Doe',
        dob: '1990-01-01',
        gender: 'male',
        household_id: 'h1',
      });
      expect(store.currentResident.first_name).toBe('New');
    });

    it('handles error', async () => {
      mockTables.getRow.mockRejectedValue(new Error('fail'));
      const result = await store.updateResident('r1', { first_name: 'X', last_name: 'Y' });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteResident', () => {
    it('blocks deletion of sole household head', async () => {
      mockTables.getRow
        .mockResolvedValueOnce(resident({ $id: 'r1', household_id: 'h1' })) // resident
        .mockResolvedValueOnce({ $id: 'h1', head_resident_id: 'r1' }); // household
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 }); // no other residents
      const result = await store.deleteResident('r1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/sole household head/);
    });

    it('deletes resident who is not household head', async () => {
      mockTables.getRow
        .mockResolvedValueOnce(resident({ $id: 'r1', household_id: 'h1' }))
        .mockResolvedValueOnce({ $id: 'h1', head_resident_id: 'r-other' });
      mockTables.deleteRow.mockResolvedValue({});
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.deleteResident('r1');
      expect(result.success).toBe(true);
    });

    it('deletes resident with no household', async () => {
      mockTables.getRow.mockResolvedValueOnce(resident({ $id: 'r1', household_id: null }));
      mockTables.deleteRow.mockResolvedValue({});
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.deleteResident('r1');
      expect(result.success).toBe(true);
    });

    it('deletes household head when others exist', async () => {
      mockTables.getRow
        .mockResolvedValueOnce(resident({ $id: 'r1', household_id: 'h1' }))
        .mockResolvedValueOnce({ $id: 'h1', head_resident_id: 'r1' });
      mockTables.listRows.mockResolvedValue({ rows: [{ $id: 'r2' }], total: 1 });
      mockTables.deleteRow.mockResolvedValue({});
      const result = await store.deleteResident('r1');
      expect(result.success).toBe(true);
    });

    it('handles error', async () => {
      mockTables.getRow.mockRejectedValue(new Error('fail'));
      const result = await store.deleteResident('r1');
      expect(result.success).toBe(false);
    });
  });

  describe('filters and pagination', () => {
    it('setSearchFilter sets and clears loaded', () => {
      store.loaded = true;
      store.setSearchFilter('john');
      expect(store.filters.searchName).toBe('john');
      expect(store.loaded).toBe(false);
    });

    it('setHouseholdFilter sets and clears loaded', () => {
      store.loaded = true;
      store.setHouseholdFilter('h1');
      expect(store.filters.householdId).toBe('h1');
      expect(store.loaded).toBe(false);
    });

    it('clearFilters resets all filters', () => {
      store.filters.searchName = 'x';
      store.filters.householdId = 'h1';
      store.clearFilters();
      expect(store.filters.searchName).toBe('');
      expect(store.filters.householdId).toBeNull();
    });

    it('applyFilters resets to page 1', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.applyFilters();
      expect(store.pagination.currentPage).toBe(1);
    });

    it('goToPage ignores out-of-range pages', async () => {
      store.pagination.total = 0;
      store.pagination.itemsPerPage = 10;
      await store.goToPage(99);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('changeItemsPerPage resets to page 1', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.changeItemsPerPage(25);
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.itemsPerPage).toBe(25);
    });

    it('clearCurrentResident sets to null', () => {
      store.currentResident = resident();
      store.clearCurrentResident();
      expect(store.currentResident).toBeNull();
    });
  });
});
