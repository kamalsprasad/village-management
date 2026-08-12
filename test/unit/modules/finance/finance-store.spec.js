import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';
import { mockTables } from 'test/helpers/appwrite-mock';

const fundingSource = (over = {}) => ({
  $id: 'fs-1',
  name: 'Test Donor',
  type: 'grant',
  total_received: 10000,
  current_balance: 5000,
  date_received: '2025-01-15T12:00:00Z',
  restrictions: null,
  status: 'active',
  ...over,
});

const category = (over = {}) => ({
  $id: 'cat-1',
  name: 'Donations',
  type: 'income',
  subcategories: [],
  ...over,
});

const transaction = (over = {}) => ({
  $id: 'txn-1',
  type: 'income',
  amount: 1000,
  amount_funded: 500,
  category_id: 'cat-1',
  description: 'Test transaction',
  transaction_date: '2025-01-15T12:00:00Z',
  status: 'completed',
  funding_source_id: null,
  ...over,
});

describe('finance-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFinanceStore();
    vi.clearAllMocks();
  });

  // ================================================================
  // Funding Source CRUD
  // ================================================================

  describe('fetchFundingSources', () => {
    it('fetches funding sources and updates state', async () => {
      const sources = [fundingSource()];
      mockTables.listRows.mockResolvedValue({ rows: sources });

      const result = await store.fetchFundingSources();

      expect(result.success).toBe(true);
      expect(store.fundingSources).toEqual(sources);
      expect(store.fundingSourcesLoaded).toBe(true);
    });

    it('returns cached data without fetching when already loaded', async () => {
      store.fundingSourcesLoaded = true;
      store.fundingSources = [fundingSource()];

      const result = await store.fetchFundingSources();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('forces refresh when force=true', async () => {
      store.fundingSourcesLoaded = true;
      const newSources = [fundingSource({ $id: 'fs-2' })];
      mockTables.listRows.mockResolvedValue({ rows: newSources });

      const result = await store.fetchFundingSources(true);

      expect(result.success).toBe(true);
      expect(mockTables.listRows).toHaveBeenCalled();
      expect(store.fundingSources).toEqual(newSources);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchFundingSources();

      expect(result.success).toBe(false);
    });
  });

  describe('addFundingSource', () => {
    it('creates a funding source and adds to state', async () => {
      const newSource = fundingSource({ $id: 'fs-new' });
      mockTables.createRow.mockResolvedValue(newSource);

      const result = await store.addFundingSource({
        name: 'New Donor',
        type: 'grant',
        total_received: '5000',
        current_balance: '5000',
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow.mock.calls[0][0].data.total_received).toBe(5000);
      expect(store.fundingSources.find((s) => s.$id === 'fs-new')).toBeDefined();
    });

    it('defaults status to active', async () => {
      mockTables.createRow.mockResolvedValue(fundingSource());

      await store.addFundingSource({ name: 'Test', type: 'grant' });

      expect(mockTables.createRow.mock.calls[0][0].data.status).toBe('active');
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.addFundingSource({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('updateFundingSource', () => {
    it('updates a funding source and syncs state', async () => {
      store.fundingSources = [fundingSource({ $id: 'fs-1' })];
      const updated = fundingSource({ $id: 'fs-1', name: 'Updated' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateFundingSource('fs-1', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(store.fundingSources[0].name).toBe('Updated');
    });

    it('only includes provided fields in update', async () => {
      mockTables.updateRow.mockResolvedValue(fundingSource());

      await store.updateFundingSource('fs-1', { name: 'New Name' });

      const data = mockTables.updateRow.mock.calls[0][0].data;
      expect(data.name).toBe('New Name');
      expect(data.type).toBeUndefined();
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updateFundingSource('fs-1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('deleteFundingSource', () => {
    it('deletes a funding source with no transactions', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockResolvedValue();
      store.fundingSources = [fundingSource({ $id: 'fs-1' })];

      const result = await store.deleteFundingSource('fs-1');

      expect(result.success).toBe(true);
      expect(store.fundingSources).toHaveLength(0);
    });

    it('prevents deletion when transactions exist', async () => {
      mockTables.listRows.mockResolvedValue({ total: 5, rows: [transaction()] });

      const result = await store.deleteFundingSource('fs-1');

      expect(result.success).toBe(false);
      expect(result.hasTransactions).toBe(true);
      expect(result.transactionCount).toBe(5);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteFundingSource('fs-1');

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // Category CRUD
  // ================================================================

  describe('fetchCategories', () => {
    it('fetches categories and updates state', async () => {
      const cats = [category()];
      mockTables.listRows.mockResolvedValue({ rows: cats });

      const result = await store.fetchCategories();

      expect(result.success).toBe(true);
      expect(store.categories).toEqual(cats);
      expect(store.categoriesLoaded).toBe(true);
    });

    it('returns cached data when already loaded', async () => {
      store.categoriesLoaded = true;
      store.categories = [category()];

      const result = await store.fetchCategories();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchCategories();

      expect(result.success).toBe(false);
    });
  });

  describe('addCategory', () => {
    it('creates a category and adds to state', async () => {
      const newCat = category({ $id: 'cat-new' });
      mockTables.createRow.mockResolvedValue(newCat);

      const result = await store.addCategory({ name: 'Supplies', type: 'expense' });

      expect(result.success).toBe(true);
      expect(mockTables.createRow.mock.calls[0][0].data.subcategories).toEqual([]);
      expect(store.categories.find((c) => c.$id === 'cat-new')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.addCategory({ name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('updateCategory', () => {
    it('updates a category and syncs state', async () => {
      store.categories = [category({ $id: 'cat-1' })];
      const updated = category({ $id: 'cat-1', name: 'Updated' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateCategory('cat-1', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(store.categories[0].name).toBe('Updated');
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updateCategory('cat-1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('deleteCategory', () => {
    it('deletes a category with no transactions', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockResolvedValue();
      store.categories = [category({ $id: 'cat-1' })];

      const result = await store.deleteCategory('cat-1');

      expect(result.success).toBe(true);
      expect(store.categories).toHaveLength(0);
    });

    it('prevents deletion when transactions exist', async () => {
      mockTables.listRows.mockResolvedValue({ total: 3, rows: [transaction()] });

      const result = await store.deleteCategory('cat-1');

      expect(result.success).toBe(false);
      expect(result.hasTransactions).toBe(true);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteCategory('cat-1');

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // Subcategory management
  // ================================================================

  describe('addSubcategory', () => {
    it('adds a subcategory to an existing category', async () => {
      store.categories = [category({ $id: 'cat-1', subcategories: ['Sub1'] })];
      mockTables.updateRow.mockResolvedValue(
        category({ $id: 'cat-1', subcategories: ['Sub1', 'Sub2'] }),
      );

      const result = await store.addSubcategory('cat-1', 'Sub2');

      expect(result.success).toBe(true);
      expect(mockTables.updateRow.mock.calls[0][0].data.subcategories).toEqual(['Sub1', 'Sub2']);
    });

    it('returns error when category not found', async () => {
      const result = await store.addSubcategory('unknown', 'Sub1');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/);
    });

    it('returns error when subcategory already exists', async () => {
      store.categories = [category({ $id: 'cat-1', subcategories: ['Dup'] })];

      const result = await store.addSubcategory('cat-1', 'Dup');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/already exists/);
    });
  });

  describe('removeSubcategory', () => {
    it('removes a subcategory from an existing category', async () => {
      store.categories = [category({ $id: 'cat-1', subcategories: ['Sub1', 'Sub2'] })];
      mockTables.updateRow.mockResolvedValue(category({ $id: 'cat-1', subcategories: ['Sub1'] }));

      const result = await store.removeSubcategory('cat-1', 'Sub2');

      expect(result.success).toBe(true);
      expect(mockTables.updateRow.mock.calls[0][0].data.subcategories).toEqual(['Sub1']);
    });

    it('returns error when category not found', async () => {
      const result = await store.removeSubcategory('unknown', 'Sub1');

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // checkCategoryHasTransactions
  // ================================================================

  describe('checkCategoryHasTransactions', () => {
    it('returns true when category has transactions', async () => {
      mockTables.listRows.mockResolvedValue({ total: 3, rows: [transaction()] });

      const result = await store.checkCategoryHasTransactions('cat-1');

      expect(result.hasTransactions).toBe(true);
      expect(result.count).toBe(3);
    });

    it('returns false when category has no transactions', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });

      const result = await store.checkCategoryHasTransactions('cat-1');

      expect(result.hasTransactions).toBe(false);
    });
  });

  // ================================================================
  // fetchTransactionById
  // ================================================================

  describe('fetchTransactionById', () => {
    it('fetches a single transaction', async () => {
      const txn = transaction();
      mockTables.getRow.mockResolvedValue(txn);

      const result = await store.fetchTransactionById('txn-1');

      expect(result).toEqual(txn);
    });

    it('returns null on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchTransactionById('txn-1');

      expect(result).toBeNull();
    });
  });

  // ================================================================
  // Filters
  // ================================================================

  describe('setTypeFilter', () => {
    it('sets type filter', () => {
      store.setTypeFilter('income');
      expect(store.filters.type).toBe('income');
    });
  });

  describe('setCategoryFilter', () => {
    it('sets category filter', () => {
      store.setCategoryFilter('cat-1');
      expect(store.filters.categoryId).toBe('cat-1');
    });
  });

  describe('setDateRangeFilter', () => {
    it('sets date range filter', () => {
      store.setDateRangeFilter('2025-01-01', '2025-02-01');
      expect(store.filters.dateFrom).toBe('2025-01-01');
      expect(store.filters.dateTo).toBe('2025-02-01');
    });
  });

  describe('setStatusFilter', () => {
    it('sets status filter', () => {
      store.setStatusFilter('completed');
      expect(store.filters.status).toBe('completed');
    });
  });

  describe('clearFilters', () => {
    it('clears all filters', () => {
      store.filters = {
        type: 'income',
        categoryId: 'cat-1',
        dateFrom: '2025-01',
        dateTo: '2025-02',
        status: 'completed',
      };
      store.clearFilters();
      expect(store.filters.type).toBeNull();
      expect(store.filters.categoryId).toBeNull();
      expect(store.filters.dateFrom).toBeNull();
      expect(store.filters.dateTo).toBeNull();
      expect(store.filters.status).toBeNull();
    });
  });

  // ================================================================
  // Pagination
  // ================================================================

  describe('goToPage', () => {
    it('fetches transactions for the requested page', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;
      mockTables.listRows.mockResolvedValue({ rows: [], total: 50 });

      await store.goToPage(2);

      expect(store.pagination.currentPage).toBe(2);
    });

    it('does nothing for page < 1', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;

      await store.goToPage(0);

      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('does nothing for page > totalPages', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;

      await store.goToPage(10);

      expect(mockTables.listRows).not.toHaveBeenCalled();
    });
  });

  describe('changeItemsPerPage', () => {
    it('resets to page 1 with new items per page', async () => {
      store.pagination.currentPage = 3;
      mockTables.listRows.mockResolvedValue({ rows: [], total: 0 });

      await store.changeItemsPerPage(25);

      expect(store.pagination.currentPage).toBe(1);
      expect(store.pagination.itemsPerPage).toBe(25);
    });
  });

  describe('nextPage', () => {
    it('goes to next page when available', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 1;
      mockTables.listRows.mockResolvedValue({ rows: [], total: 50 });

      await store.nextPage();

      expect(store.pagination.currentPage).toBe(2);
    });

    it('does nothing on last page', async () => {
      store.pagination.total = 10;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 1;

      await store.nextPage();

      expect(mockTables.listRows).not.toHaveBeenCalled();
    });
  });

  describe('previousPage', () => {
    it('goes to previous page when available', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 2;
      mockTables.listRows.mockResolvedValue({ rows: [], total: 50 });

      await store.previousPage();

      expect(store.pagination.currentPage).toBe(1);
    });

    it('does nothing on first page', async () => {
      store.pagination.total = 50;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 1;

      await store.previousPage();

      expect(mockTables.listRows).not.toHaveBeenCalled();
    });
  });

  describe('clearCurrentTransaction', () => {
    it('clears current transaction', () => {
      store.currentTransaction = transaction();
      store.clearCurrentTransaction();
      expect(store.currentTransaction).toBeNull();
    });
  });

  // ================================================================
  // Getters
  // ================================================================

  describe('getters', () => {
    it('incomeCategories filters by type=income', () => {
      store.categories = [
        category({ $id: 'c1', type: 'income' }),
        category({ $id: 'c2', type: 'expense' }),
      ];
      expect(store.incomeCategories).toHaveLength(1);
    });

    it('expenseCategories filters by type=expense', () => {
      store.categories = [
        category({ $id: 'c1', type: 'income' }),
        category({ $id: 'c2', type: 'expense' }),
      ];
      expect(store.expenseCategories).toHaveLength(1);
    });

    it('getCategoryName returns name by id', () => {
      store.categories = [category({ $id: 'c1', name: 'Donations' })];
      expect(store.getCategoryName('c1')).toBe('Donations');
    });

    it('getCategoryName returns "Unknown" for unknown id', () => {
      expect(store.getCategoryName('unknown')).toBe('Unknown');
    });

    it('activeFundingSources filters by status=active', () => {
      store.fundingSources = [
        fundingSource({ $id: 'fs1', status: 'active' }),
        fundingSource({ $id: 'fs2', status: 'depleted' }),
      ];
      expect(store.activeFundingSources).toHaveLength(1);
    });

    it('getFundingSourceName returns name by id', () => {
      store.fundingSources = [fundingSource({ $id: 'fs1', name: 'Donor A' })];
      expect(store.getFundingSourceName('fs1')).toBe('Donor A');
    });

    it('totalPages calculates from total and itemsPerPage', () => {
      store.pagination.total = 25;
      store.pagination.itemsPerPage = 10;
      expect(store.totalPages).toBe(3);
    });

    it('hasNextPage and hasPreviousPage work correctly', () => {
      store.pagination.total = 30;
      store.pagination.itemsPerPage = 10;
      store.pagination.currentPage = 2;
      expect(store.hasNextPage).toBe(true);
      expect(store.hasPreviousPage).toBe(true);
    });
  });
});
