import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInventoryStore } from 'src/stores/inventory-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables } from 'test/helpers/appwrite-mock';
import {
  ADMIN_ROLE,
  FARM_MANAGER_ROLE,
  FINANCE_MANAGER_ROLE,
  RESIDENT_ROLE,
  makeUser,
} from 'test/helpers/fixtures';

const item = (over = {}) => ({
  $id: 'i1',
  item_name: 'Seeds',
  item_type: 'farm_inputs',
  quantity: 100,
  unit: 'kg',
  status: 'in_stock',
  reorder_threshold: 10,
  estimated_value: 500,
  source: 'finance_purchase',
  ...over,
});

describe('inventory-store', () => {
  let store;
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useInventoryStore();
    authStore = useAuthStore();
  });

  describe('getters (computed state)', () => {
    it('paginatedItems returns items', () => {
      store.items = [item()];
      expect(store.paginatedItems).toHaveLength(1);
    });

    it('totalPages computes from total/itemsPerPage', () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 25;
      expect(store.totalPages).toBe(2);
    });

    it('hasNextPage and hasPreviousPage', () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 25;
      store.pagination.currentPage = 1;
      expect(store.hasNextPage).toBe(true);
      expect(store.hasPreviousPage).toBe(false);
    });

    it('filteredItems filters by search', () => {
      store.items = [item({ $id: 'i1', item_name: 'Seeds' }), item({ $id: 'i2', item_name: 'Fertilizer' })];
      store.filters.search = 'seed';
      expect(store.filteredItems).toHaveLength(1);
      expect(store.filteredItems[0].item_name).toBe('Seeds');
    });

    it('filteredItems filters by itemTypes', () => {
      store.items = [
        item({ $id: 'i1', item_type: 'farm_inputs' }),
        item({ $id: 'i2', item_type: 'equipment' }),
      ];
      store.filters.itemTypes = ['equipment'];
      expect(store.filteredItems).toHaveLength(1);
    });

    it('filteredItems filters by statuses', () => {
      store.items = [
        item({ $id: 'i1', status: 'in_stock' }),
        item({ $id: 'i2', status: 'low_stock' }),
      ];
      store.filters.statuses = ['low_stock'];
      expect(store.filteredItems).toHaveLength(1);
    });

    it('filteredItems filters by sources', () => {
      store.items = [
        item({ $id: 'i1', source: 'finance_purchase' }),
        item({ $id: 'i2', source: 'donation' }),
      ];
      store.filters.sources = ['donation'];
      expect(store.filteredItems).toHaveLength(1);
    });

    it('lowStockItems returns low_stock items', () => {
      store.items = [item({ status: 'in_stock' }), item({ status: 'low_stock' })];
      expect(store.lowStockItems).toHaveLength(1);
    });

    it('outOfStockItems returns out_of_stock items', () => {
      store.items = [item({ status: 'out_of_stock' }), item({ status: 'in_stock' })];
      expect(store.outOfStockItems).toHaveLength(1);
    });

    it('itemsNeedingAttention returns low + out of stock', () => {
      store.items = [
        item({ status: 'in_stock' }),
        item({ status: 'low_stock' }),
        item({ status: 'out_of_stock' }),
      ];
      expect(store.itemsNeedingAttention).toHaveLength(2);
    });

    it('totalInventoryValue sums estimated_value', () => {
      store.items = [item({ estimated_value: 100 }), item({ estimated_value: 200 })];
      expect(store.totalInventoryValue).toBe(300);
    });

    it('itemsByType groups by item_type', () => {
      store.items = [
        item({ item_type: 'farm_inputs', estimated_value: 100 }),
        item({ item_type: 'farm_inputs', estimated_value: 50 }),
        item({ item_type: 'equipment', estimated_value: 200 }),
      ];
      expect(store.itemsByType.farm_inputs.count).toBe(2);
      expect(store.itemsByType.farm_inputs.value).toBe(150);
      expect(store.itemsByType.equipment.count).toBe(1);
    });

    it('itemsByStatus groups by status', () => {
      store.items = [
        item({ status: 'in_stock' }),
        item({ status: 'in_stock' }),
        item({ status: 'low_stock' }),
      ];
      expect(store.itemsByStatus.in_stock).toBe(2);
      expect(store.itemsByStatus.low_stock).toBe(1);
    });
  });

  describe('permission-based getters', () => {
    it('canViewItem returns true for inventory:read', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FINANCE_MANAGER_ROLE];
      expect(store.canViewItem(item({ item_type: 'equipment' }))).toBe(true);
    });

    it('canViewItem returns true for farm:read on farm types', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.canViewItem(item({ item_type: 'farm_produce' }))).toBe(true);
    });

    it('canViewItem returns false for farm:read on non-farm types', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.canViewItem(item({ item_type: 'equipment' }))).toBe(false);
    });

    it('canViewItem returns false for null item', () => {
      expect(store.canViewItem(null)).toBe(false);
    });

    it('canEditItems returns true for inventory:write', () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      expect(store.canEditItems).toBe(true);
    });

    it('canAdjustStock returns true for inventory:write', () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      expect(store.canAdjustStock('equipment')).toBe(true);
    });

    it('canAdjustStock returns true for farm:write on farm types', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.canAdjustStock('farm_produce')).toBe(true);
    });

    it('canAdjustStock returns false for farm:write on non-farm types', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.canAdjustStock('equipment')).toBe(false);
    });

    it('canViewValues requires finance:read', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FINANCE_MANAGER_ROLE];
      expect(store.canViewValues).toBe(true);
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.canViewValues).toBe(false);
    });

    it('canViewAllItems requires inventory/finance permission', () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      expect(store.canViewAllItems).toBe(true);
      authStore.userRoles = [RESIDENT_ROLE];
      expect(store.canViewAllItems).toBe(false);
    });

    it('hasInventoryAccess requires inventory:read or farm:read', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      expect(store.hasInventoryAccess).toBe(true);
      authStore.userRoles = [RESIDENT_ROLE];
      expect(store.hasInventoryAccess).toBe(false);
    });

    it('visibleItems returns all for inventory:read', () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      store.items = [item({ item_type: 'equipment' }), item({ item_type: 'farm_inputs' })];
      expect(store.visibleItems).toHaveLength(2);
    });

    it('visibleItems filters to farm types for farm:read only', () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      store.items = [item({ item_type: 'equipment' }), item({ item_type: 'farm_inputs' })];
      expect(store.visibleItems).toHaveLength(1);
      expect(store.visibleItems[0].item_type).toBe('farm_inputs');
    });

    it('visibleItems returns [] for users with no access', () => {
      authStore.user = makeUser();
      authStore.userRoles = [RESIDENT_ROLE];
      store.items = [item()];
      expect(store.visibleItems).toEqual([]);
    });
  });

  describe('buildQueries', () => {
    it('includes limit, offset, orderDesc', () => {
      const q = store.buildQueries(25, 0);
      expect(q).toHaveLength(3);
    });

    it('adds item_type filter when single type', () => {
      store.filters.itemTypes = ['farm_inputs'];
      const q = store.buildQueries(25, 0);
      expect(q).toHaveLength(4);
    });

    it('does not add item_type filter for multiple types (client-side)', () => {
      store.filters.itemTypes = ['farm_inputs', 'equipment'];
      const q = store.buildQueries(25, 0);
      expect(q).toHaveLength(3);
    });

    it('adds status filter when single status', () => {
      store.filters.statuses = ['in_stock'];
      const q = store.buildQueries(25, 0);
      expect(q).toHaveLength(4);
    });

    it('adds source filter when single source', () => {
      store.filters.sources = ['donation'];
      const q = store.buildQueries(25, 0);
      expect(q).toHaveLength(4);
    });
  });

  describe('fetchAllItems', () => {
    it('paginates through all items', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({ rows: Array(5000).fill(item()), total: 6000 })
        .mockResolvedValueOnce({ rows: [item({ $id: 'i-last' })], total: 6000 });
      const result = await store.fetchAllItems();
      expect(result.success).toBe(true);
      expect(result.data.length).toBe(5001);
    });

    it('handles error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));
      const result = await store.fetchAllItems();
      expect(result.success).toBe(false);
    });
  });

  describe('fetchItems', () => {
    it('returns cached when same params and loaded', async () => {
      store.loaded = true;
      store.pagination.currentPage = 1;
      store.pagination.itemsPerPage = 25;
      store.items = [item()];
      const result = await store.fetchItems(1, 25);
      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('fetches and filters by permission (admin sees all)', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.listRows.mockResolvedValue({
        rows: [item({ item_type: 'equipment' }), item({ item_type: 'farm_inputs' })],
        total: 2,
      });
      const result = await store.fetchItems(1, 25);
      expect(result.success).toBe(true);
      expect(store.items).toHaveLength(2);
    });

    it('filters to farm types for farm:read only', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      mockTables.listRows.mockResolvedValue({
        rows: [item({ item_type: 'equipment' }), item({ item_type: 'farm_inputs' })],
        total: 2,
      });
      const result = await store.fetchItems(1, 25);
      expect(result.success).toBe(true);
      expect(store.items).toHaveLength(1);
      expect(store.items[0].item_type).toBe('farm_inputs');
    });

    it('returns empty for users with no access', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [RESIDENT_ROLE];
      mockTables.listRows.mockResolvedValue({ rows: [item()], total: 1 });
      const result = await store.fetchItems(1, 25);
      expect(result.success).toBe(true);
      expect(store.items).toEqual([]);
    });

    it('handles error', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.listRows.mockRejectedValue(new Error('fail'));
      const result = await store.fetchItems(1, 25);
      expect(result.success).toBe(false);
    });
  });

  describe('fetchItemById', () => {
    it('fetches an item with permission', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ $id: 'i1' }));
      const result = await store.fetchItemById('i1');
      expect(result.success).toBe(true);
      expect(store.currentItem.$id).toBe('i1');
    });

    it('denies access for farm:read on non-farm type', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      mockTables.getRow.mockResolvedValue(item({ item_type: 'equipment' }));
      const result = await store.fetchItemById('i1');
      expect(result.success).toBe(false);
    });

    it('allows farm:read on farm type', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [FARM_MANAGER_ROLE];
      mockTables.getRow.mockResolvedValue(item({ item_type: 'farm_produce' }));
      const result = await store.fetchItemById('i1');
      expect(result.success).toBe(true);
    });

    it('handles error', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockRejectedValue(new Error('fail'));
      const result = await store.fetchItemById('i1');
      expect(result.success).toBe(false);
    });
  });

  describe('createItem', () => {
    it('creates and refreshes', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.createRow.mockResolvedValue(item({ $id: 'i-new' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.createItem({ item_name: 'New', quantity: 10, unit: 'kg' });
      expect(result.success).toBe(true);
    });

    it('handles error', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));
      const result = await store.createItem({ item_name: 'X' });
      expect(result.success).toBe(false);
    });
  });

  describe('updateItem', () => {
    it('updates only provided fields', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.updateRow.mockResolvedValue(item({ $id: 'i1', item_name: 'Updated' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.updateItem('i1', { item_name: 'Updated' });
      expect(result.success).toBe(true);
      const args = mockTables.updateRow.mock.calls[0][0];
      expect(args.data.item_name).toBe('Updated');
      expect(args.data.quantity).toBeUndefined();
    });

    it('updates currentItem when it matches', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      store.currentItem = item({ $id: 'i1', item_name: 'Old' });
      mockTables.updateRow.mockResolvedValue(item({ $id: 'i1', item_name: 'New' }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.updateItem('i1', { item_name: 'New' });
      expect(store.currentItem.item_name).toBe('New');
    });

    it('handles error', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));
      const result = await store.updateItem('i1', { item_name: 'X' });
      expect(result.success).toBe(false);
    });
  });

  describe('adjustStock', () => {
    it('adds stock', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 100, reorder_threshold: 10 }));
      mockTables.updateRow.mockResolvedValue(item({ quantity: 150 }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.adjustStock('i1', { type: 'add', quantity: 50 });
      expect(result.success).toBe(true);
      const args = mockTables.updateRow.mock.calls[0][0];
      expect(args.data.quantity).toBe(150);
    });

    it('removes stock', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 100, reorder_threshold: 10 }));
      mockTables.updateRow.mockResolvedValue(item({ quantity: 50 }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.adjustStock('i1', { type: 'remove', quantity: 50 });
      expect(result.success).toBe(true);
      expect(mockTables.updateRow.mock.calls[0][0].data.quantity).toBe(50);
    });

    it('throws when removing more than available', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 10 }));
      const result = await store.adjustStock('i1', { type: 'remove', quantity: 20 });
      expect(result.success).toBe(false);
    });

    it('sets stock', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 100 }));
      mockTables.updateRow.mockResolvedValue(item({ quantity: 50 }));
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.adjustStock('i1', { type: 'set', quantity: 50 });
      expect(result.success).toBe(true);
    });

    it('throws on negative set', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 100 }));
      const result = await store.adjustStock('i1', { type: 'set', quantity: -10 });
      expect(result.success).toBe(false);
    });

    it('throws on invalid type', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.getRow.mockResolvedValue(item({ quantity: 100 }));
      const result = await store.adjustStock('i1', { type: 'invalid', quantity: 10 });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteItem', () => {
    it('deletes and refreshes', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.deleteRow.mockResolvedValue({});
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      const result = await store.deleteItem('i1');
      expect(result.success).toBe(true);
    });

    it('handles error', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));
      const result = await store.deleteItem('i1');
      expect(result.success).toBe(false);
    });
  });

  describe('findFarmProduceRow', () => {
    it('returns the row when found', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [item({ $id: 'fp1' })] });
      const result = await store.findFarmProduceRow('p1');
      expect(result?.$id).toBe('fp1');
    });

    it('returns null when not found', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });
      const result = await store.findFarmProduceRow('p1');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));
      const result = await store.findFarmProduceRow('p1');
      expect(result).toBeNull();
    });
  });

  describe('_deriveInventoryStatus', () => {
    it('returns out_of_stock when quantity <= 0', () => {
      expect(store._deriveInventoryStatus(0, 10)).toBe('out_of_stock');
      expect(store._deriveInventoryStatus(-5, 10)).toBe('out_of_stock');
    });

    it('returns low_stock when quantity <= reorder_threshold', () => {
      expect(store._deriveInventoryStatus(5, 10)).toBe('low_stock');
      expect(store._deriveInventoryStatus(10, 10)).toBe('low_stock');
    });

    it('returns in_stock when quantity > reorder_threshold', () => {
      expect(store._deriveInventoryStatus(15, 10)).toBe('in_stock');
    });

    it('treats undefined reorder_threshold as 0', () => {
      expect(store._deriveInventoryStatus(5, undefined)).toBe('in_stock');
      expect(store._deriveInventoryStatus(0, undefined)).toBe('out_of_stock');
    });
  });

  describe('filters and pagination', () => {
    it('setFilters merges filters and clears loaded', () => {
      store.loaded = true;
      store.setFilters({ search: 'seed', itemTypes: ['farm_inputs'] });
      expect(store.filters.search).toBe('seed');
      expect(store.filters.itemTypes).toEqual(['farm_inputs']);
      expect(store.loaded).toBe(false);
    });

    it('clearFilters resets all filters', () => {
      store.filters.search = 'x';
      store.filters.itemTypes = ['farm_inputs'];
      store.clearFilters();
      expect(store.filters.search).toBe('');
      expect(store.filters.itemTypes).toEqual([]);
      expect(store.loaded).toBe(false);
    });

    it('clearCurrentItem sets to null', () => {
      store.currentItem = item();
      store.clearCurrentItem();
      expect(store.currentItem).toBeNull();
    });

    it('goToPage ignores out-of-range', async () => {
      store.pagination.total = 0;
      await store.goToPage(99);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('changeItemsPerPage resets to page 1', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });
      await store.changeItemsPerPage(50);
      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.itemsPerPage).toBe(50);
    });
  });

  describe('label/color helpers', () => {
    it('getItemTypeLabel returns label or original', () => {
      expect(store.getItemTypeLabel('farm_inputs')).toBe('Farm Inputs');
      expect(store.getItemTypeLabel('unknown')).toBe('unknown');
    });

    it('getStatusLabel returns label or original', () => {
      expect(store.getStatusLabel('in_stock')).toBe('In Stock');
      expect(store.getStatusLabel('unknown')).toBe('unknown');
    });

    it('getSourceLabel returns label or original', () => {
      expect(store.getSourceLabel('donation')).toBe('Donation');
      expect(store.getSourceLabel('unknown')).toBe('unknown');
    });

    it('getItemTypeColor returns color', () => {
      expect(store.getItemTypeColor('farm_inputs')).toBe('green');
      expect(store.getItemTypeColor('unknown')).toBe('grey');
    });

    it('getItemTypeIcon returns icon', () => {
      expect(store.getItemTypeIcon('farm_inputs')).toBe('agriculture');
      expect(store.getItemTypeIcon('unknown')).toBe('inventory_2');
    });

    it('getStatusColor returns color', () => {
      expect(store.getStatusColor('in_stock')).toBe('positive');
      expect(store.getStatusColor('unknown')).toBe('grey');
    });

    it('formatCurrency formats value', () => {
      expect(store.formatCurrency(1000)).toBe('ZMW 1000.00');
    });

    it('formatCurrency returns em-dash for 0/null/undefined', () => {
      expect(store.formatCurrency(0)).toBe('\u2014');
      expect(store.formatCurrency(null)).toBe('\u2014');
      expect(store.formatCurrency(undefined)).toBe('\u2014');
    });
  });
});
