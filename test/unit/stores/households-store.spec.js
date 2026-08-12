import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHouseholdsStore } from 'src/stores/households-store';
import { mockTables } from 'test/helpers/appwrite-mock';

const household = (over = {}) => ({
  $id: 'h1',
  name: 'Mwanza Family',
  household_type: 'family',
  ...over,
});

describe('households-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useHouseholdsStore();
  });

  describe('getters', () => {
    it('paginatedHouseholds returns households', () => {
      store.households = [household()];
      expect(store.paginatedHouseholds).toHaveLength(1);
    });

    it('totalPages computes from total and itemsPerPage', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      expect(store.totalPages).toBe(3);
    });

    it('hasNextPage and hasPreviousPage', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 2;
      expect(store.hasNextPage).toBe(true);
      expect(store.hasPreviousPage).toBe(true);
    });
  });

  describe('fetchHouseholds', () => {
    it('returns cached when already loaded with same params', async () => {
      store.loaded = true;
      store.pagination.currentPage = 1;
      store.pagination.itemsPerPage = 10;
      store.households = [household()];
      const result = await store.fetchHouseholds(1, 10);
      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('fetches and enriches with occupant counts', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [household({ $id: 'h1' })], total: 1 }) // households
        .mockResolvedValueOnce({ rows: [], total: 3 }); // residents count for h1

      const result = await store.fetchHouseholds(1, 10);
      expect(result.success).toBe(true);
      expect(store.households[0].occupant_count).toBe(3);
      expect(store.loaded).toBe(true);
    });

    it('handles enrichment error per household', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [household({ $id: 'h1' })], total: 1 })
        .mockRejectedValueOnce(new Error('count failed'));
      const result = await store.fetchHouseholds(1, 10);
      expect(result.success).toBe(true);
      expect(store.households[0].occupant_count).toBe(0);
    });

    it('handles fetch error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      const result = await store.fetchHouseholds(1, 10);
      expect(result.success).toBe(false);
    });
  });

  describe('fetchHouseholdById', () => {
    it('fetches household and occupants', async () => {
      mockTables.getRow.mockResolvedValue(household({ $id: 'h1', name: 'HH1' }));
      mockTables.listRows.mockResolvedValue({ rows: [{ $id: 'r1' }], total: 1 });
      const result = await store.fetchHouseholdById('h1');
      expect(result.success).toBe(true);
      expect(store.currentHousehold.occupant_count).toBe(1);
      expect(store.currentHousehold.occupants).toHaveLength(1);
    });

    it('handles error', async () => {
      mockTables.getRow.mockRejectedValue(new Error('fail'));
      const result = await store.fetchHouseholdById('h1');
      expect(result.success).toBe(false);
    });
  });

  describe('createHousehold', () => {
    it('creates a household and refreshes', async () => {
      mockTables.createRow.mockResolvedValue(household({ $id: 'h-new' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.createHousehold({
        name: 'New HH',
        household_type: 'family',
      });
      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('handles error', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));
      const result = await store.createHousehold({ name: 'X' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateHousehold', () => {
    it('updates and refreshes', async () => {
      mockTables.updateRow.mockResolvedValue(household({ $id: 'h1', name: 'Updated' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.updateHousehold('h1', { name: 'Updated', household_type: 'family' });
      expect(result.success).toBe(true);
    });

    it('updates currentHousehold when it matches', async () => {
      store.currentHousehold = household({ $id: 'h1', name: 'Old' });
      mockTables.updateRow.mockResolvedValue(household({ $id: 'h1', name: 'New' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.updateHousehold('h1', { name: 'New', household_type: 'family' });
      expect(store.currentHousehold.name).toBe('New');
    });

    it('handles error', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));
      const result = await store.updateHousehold('h1', { name: 'X' });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteHousehold', () => {
    it('blocks deletion when household has occupants', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [{ $id: 'r1' }], total: 1 });
      const result = await store.deleteHousehold('h1');
      expect(result.success).toBe(false);
      expect(result.occupantCount).toBe(1);
      expect(mockTables.deleteRow).not.toHaveBeenCalled();
    });

    it('deletes empty household', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [], total: 0 }) // occupant check
        .mockResolvedValueOnce({ rows: [], total: 0 }); // refresh
      mockTables.deleteRow.mockResolvedValue({});
      const result = await store.deleteHousehold('h1');
      expect(result.success).toBe(true);
    });

    it('handles error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));
      const result = await store.deleteHousehold('h1');
      expect(result.success).toBe(false);
    });
  });

  describe('pagination', () => {
    it('goToPage ignores out-of-range', async () => {
      store.pagination.total = 0;
      await store.goToPage(99);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('changeItemsPerPage resets to page 1', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.changeItemsPerPage(25);
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.itemsPerPage).toBe(25);
    });

    it('clearCurrentHousehold sets to null', () => {
      store.currentHousehold = household();
      store.clearCurrentHousehold();
      expect(store.currentHousehold).toBeNull();
    });
  });
});
