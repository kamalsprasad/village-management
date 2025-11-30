import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

/**
 * Finance Store
 *
 * Manages financial transactions state and API interactions.
 * Follows the pattern established in residents-store.js.
 */
export const useFinanceStore = defineStore('finance', {
  state: () => ({
    transactions: [],
    fundingSources: [],
    categories: [], // Story 2.3: Dynamic categories from database
    categoriesLoaded: false, // Track if categories have been fetched
    currentTransaction: null,
    isLoading: false,
    isCategoriesLoading: false, // Separate loading state for categories
    // Summary data for dashboard widget
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      topExpenseCategories: [],
      isLoaded: false,
    },
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      total: 0,
    },
    filters: {
      type: null, // 'income', 'expense', or null for all
      categoryId: null, // Story 2.3: Changed from category string to categoryId
      dateFrom: null,
      dateTo: null,
      status: null, // 'pending', 'completed', 'cancelled', or null for all
    },
  }),

  getters: {
    /**
     * Get paginated transactions for current page
     */
    paginatedTransactions: (state) => state.transactions,

    /**
     * Get total pages based on total count and items per page
     */
    totalPages: (state) => {
      return Math.ceil(state.pagination.total / state.pagination.itemsPerPage);
    },

    /**
     * Check if there are more pages to load
     */
    hasNextPage: (state) => {
      return (
        state.pagination.currentPage <
        Math.ceil(state.pagination.total / state.pagination.itemsPerPage)
      );
    },

    /**
     * Check if there is a previous page
     */
    hasPreviousPage: (state) => {
      return state.pagination.currentPage > 1;
    },

    /**
     * Get income-specific categories (Story 2.3: Dynamic from database)
     */
    incomeCategories: (state) => {
      return state.categories.filter((cat) => cat.type === 'income');
    },

    /**
     * Get expense-specific categories (Story 2.3: Dynamic from database)
     */
    expenseCategories: (state) => {
      return state.categories.filter((cat) => cat.type === 'expense');
    },

    /**
     * Get category by ID
     */
    getCategoryById: (state) => (categoryId) => {
      return state.categories.find((cat) => cat.$id === categoryId);
    },

    /**
     * Get category name by ID (for display purposes)
     */
    getCategoryName: (state) => (categoryId) => {
      const category = state.categories.find((cat) => cat.$id === categoryId);
      return category ? category.name : 'Unknown';
    },

    /**
     * Get payment methods
     */
    paymentMethods: () => ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Money', 'Other'],

    /**
     * Get source modules
     */
    sourceModules: () => ['Farm', 'School', 'Village', 'Guest House', 'Other'],

    /**
     * Get transaction statuses
     */
    transactionStatuses: () => ['pending', 'completed', 'cancelled'],
  },

  actions: {
    /**
     * Build query array based on current filters
     */
    buildQueries(limit, offset) {
      const queries = [Query.limit(limit), Query.offset(offset), Query.orderDesc('date')];

      // Filter by type (income/expense)
      if (this.filters.type) {
        queries.push(Query.equal('type', this.filters.type));
      }

      // Filter by category (Story 2.3: Use category_id relationship)
      if (this.filters.categoryId) {
        queries.push(Query.equal('category_id', this.filters.categoryId));
      }

      // Filter by date range
      if (this.filters.dateFrom) {
        queries.push(Query.greaterThanEqual('date', this.filters.dateFrom));
      }
      if (this.filters.dateTo) {
        queries.push(Query.lessThanEqual('date', this.filters.dateTo));
      }

      // Filter by status
      if (this.filters.status) {
        queries.push(Query.equal('status', this.filters.status));
      }

      return queries;
    },

    /**
     * Fetch transactions with pagination and filters
     * @param {number} page - Page number (1-indexed)
     * @param {number} limit - Items per page (10, 25, 50, 100)
     */
    async fetchTransactions(page = 1, limit = 10) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build queries with filters
        const queries = this.buildQueries(limit, offset);

        // Fetch transactions with pagination and filters
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: transactionsTableId,
          queries,
        });

        this.transactions = response.rows;
        this.pagination.currentPage = page;
        this.pagination.itemsPerPage = limit;
        this.pagination.total = response.total;

        // Enrich with funding source names if needed
        await this.enrichTransactionsWithFundingSources();

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching transactions:', error);
        errorHandler.notifyError('Failed to load transactions. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Enrich transactions with funding source names
     */
    async enrichTransactionsWithFundingSources() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        // Get unique funding source IDs
        const fundingSourceIds = [
          ...new Set(this.transactions.map((t) => t.funding_source_id).filter(Boolean)),
        ];

        if (fundingSourceIds.length === 0) {
          return;
        }

        // Fetch funding sources in batch
        const fundingSourcesResponse = await tables.listRows({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          queries: [Query.equal('$id', fundingSourceIds), Query.limit(100)],
        });

        // Create funding source lookup map
        const fundingSourceMap = {};
        fundingSourcesResponse.rows.forEach((source) => {
          fundingSourceMap[source.$id] = source;
        });

        // Enrich transactions with funding source data
        this.transactions = this.transactions.map((transaction) => ({
          ...transaction,
          fundingSource: transaction.funding_source_id
            ? fundingSourceMap[transaction.funding_source_id]
            : null,
        }));
      } catch (error) {
        console.error('Error enriching transactions with funding sources:', error);
      }
    },

    /**
     * Decrement funding source balance
     * WARNING: This is a client-side operation and is NOT atomic.
     * In a concurrent environment, this could lead to race conditions.
     * TODO: [FUTURE] Replace with Appwrite Cloud Function for atomic operations.
     * See: docs/technical-debt/funding-source-balance-cloud-function.md
     *
     * @param {string} fundingSourceId - Funding source ID
     * @param {number} amount - Amount to decrement
     */
    async decrementFundingSourceBalance(fundingSourceId, amount) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        // Fetch current balance
        const fundingSource = await tables.getRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
        });

        const newBalance = fundingSource.current_balance - amount;

        // Update balance
        await tables.updateRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
          data: {
            current_balance: newBalance,
          },
        });

        // Refresh funding sources cache
        await this.fetchFundingSources();

        console.log(
          `Funding source ${fundingSource.name} balance updated: ${fundingSource.current_balance} -> ${newBalance}`,
        );
      } catch (error) {
        console.error('Error updating funding source balance:', error);
        // Don't throw - the transaction was already created
        // Log for manual reconciliation
        errorHandler.notifyError(
          'Transaction saved, but funding source balance update failed. Please update manually.',
        );
      }
    },

    /**
     * Fetch funding sources for dropdown
     */
    async fetchFundingSources() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          queries: [Query.limit(100), Query.orderAsc('name')],
        });

        this.fundingSources = response.rows;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching funding sources:', error);
        return { success: false, error: error.message };
      }
    },

    // ========================================
    // Story 2.3: Category Management Actions
    // ========================================

    /**
     * Fetch all finance categories from database
     * Categories are cached and only fetched once unless force refresh
     * @param {boolean} forceRefresh - Force refresh even if already loaded
     */
    async fetchCategories(forceRefresh = false) {
      // Skip if already loaded and not forcing refresh
      if (this.categoriesLoaded && !forceRefresh) {
        return { success: true, data: this.categories };
      }

      this.isCategoriesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const categoriesTableId = 'finance_categories';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: categoriesTableId,
          queries: [Query.limit(100), Query.orderAsc('name')],
        });

        this.categories = response.rows;
        this.categoriesLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching categories:', error);
        errorHandler.notifyError('Failed to load categories. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    /**
     * Add a new category
     * @param {Object} categoryData - { name: string, type: 'income'|'expense', subcategories?: string[] }
     */
    async addCategory(categoryData) {
      this.isCategoriesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const categoriesTableId = 'finance_categories';

        const newCategory = await tables.createRow({
          databaseId: dbId,
          tableId: categoriesTableId,
          rowId: ID.unique(),
          data: {
            name: categoryData.name,
            type: categoryData.type,
            subcategories: categoryData.subcategories || [],
          },
        });

        // Add to local state
        this.categories.push(newCategory);

        errorHandler.notifySuccess(`Category "${categoryData.name}" created successfully`);
        return { success: true, data: newCategory };
      } catch (error) {
        console.error('Error creating category:', error);
        errorHandler.notifyError('Failed to create category. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    /**
     * Update an existing category
     * @param {string} categoryId - Category ID to update
     * @param {Object} categoryData - { name?: string, type?: string, subcategories?: string[] }
     */
    async updateCategory(categoryId, categoryData) {
      this.isCategoriesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const categoriesTableId = 'finance_categories';

        const updatedCategory = await tables.updateRow({
          databaseId: dbId,
          tableId: categoriesTableId,
          rowId: categoryId,
          data: categoryData,
        });

        // Update local state
        const index = this.categories.findIndex((cat) => cat.$id === categoryId);
        if (index !== -1) {
          this.categories[index] = updatedCategory;
        }

        errorHandler.notifySuccess('Category updated successfully');
        return { success: true, data: updatedCategory };
      } catch (error) {
        console.error('Error updating category:', error);
        errorHandler.notifyError('Failed to update category. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    /**
     * Delete a category
     * @param {string} categoryId - Category ID to delete
     * @returns {Object} - { success: boolean, hasTransactions?: boolean, error?: string }
     */
    async deleteCategory(categoryId) {
      this.isCategoriesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const categoriesTableId = 'finance_categories';

        // Check if category has transactions (AC#5: Deletion Safeguards)
        const transactionsCheck = await tables.listRows({
          databaseId: dbId,
          tableId: 'finance_transactions',
          queries: [Query.equal('category_id', categoryId), Query.limit(1)],
        });

        if (transactionsCheck.total > 0) {
          return {
            success: false,
            hasTransactions: true,
            transactionCount: transactionsCheck.total,
            error: 'Category has existing transactions',
          };
        }

        // Safe to delete
        await tables.deleteRow({
          databaseId: dbId,
          tableId: categoriesTableId,
          rowId: categoryId,
        });

        // Remove from local state
        this.categories = this.categories.filter((cat) => cat.$id !== categoryId);

        errorHandler.notifySuccess('Category deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting category:', error);
        errorHandler.notifyError('Failed to delete category. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isCategoriesLoading = false;
      }
    },

    /**
     * Add a subcategory to an existing category
     * @param {string} categoryId - Category ID
     * @param {string} subcategoryName - Subcategory name to add
     */
    async addSubcategory(categoryId, subcategoryName) {
      const category = this.categories.find((cat) => cat.$id === categoryId);
      if (!category) {
        errorHandler.notifyError('Category not found');
        return { success: false, error: 'Category not found' };
      }

      // Check for duplicate
      const subcategories = category.subcategories || [];
      if (subcategories.includes(subcategoryName)) {
        errorHandler.notifyError('Subcategory already exists');
        return { success: false, error: 'Subcategory already exists' };
      }

      // Add subcategory
      const updatedSubcategories = [...subcategories, subcategoryName];
      return this.updateCategory(categoryId, { subcategories: updatedSubcategories });
    },

    /**
     * Remove a subcategory from an existing category
     * @param {string} categoryId - Category ID
     * @param {string} subcategoryName - Subcategory name to remove
     */
    async removeSubcategory(categoryId, subcategoryName) {
      const category = this.categories.find((cat) => cat.$id === categoryId);
      if (!category) {
        errorHandler.notifyError('Category not found');
        return { success: false, error: 'Category not found' };
      }

      const subcategories = category.subcategories || [];
      const updatedSubcategories = subcategories.filter((sub) => sub !== subcategoryName);

      return this.updateCategory(categoryId, { subcategories: updatedSubcategories });
    },

    /**
     * Check if a category has any transactions (for deletion safeguard)
     * @param {string} categoryId - Category ID to check
     */
    async checkCategoryHasTransactions(categoryId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'finance_transactions',
          queries: [Query.equal('category_id', categoryId), Query.limit(1)],
        });

        return { success: true, hasTransactions: response.total > 0, count: response.total };
      } catch (error) {
        console.error('Error checking category transactions:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Create a new transaction
     * @param {Object} transactionData - Transaction data
     */
    async createTransaction(transactionData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        const transactionId = ID.unique();

        // Build transaction data object (Story 2.3: Use category_id relationship)
        const data = {
          type: transactionData.type,
          amount: parseFloat(transactionData.amount),
          category_id: transactionData.category_id, // Story 2.3: Relationship to finance_categories
          source_module: transactionData.source_module,
          payment_method: transactionData.payment_method,
          funding_source_id: transactionData.funding_source_id || null,
          date: transactionData.date,
          description: transactionData.description,
          status: transactionData.status || 'completed',
        };

        // Add expense-specific fields if present
        if (transactionData.type === 'expense') {
          data.subcategory = transactionData.subcategory || null;
          data.vendor = transactionData.vendor || null;
          data.receipt_number = transactionData.receipt_number || null;
          data.payment_status = transactionData.payment_status || 'paid';
        }

        const newTransaction = await tables.createRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
          data,
        });

        // IMPORTANT: Update funding source balance for expenses
        // TODO: [FUTURE] Replace with Appwrite Cloud Function for atomic operations
        // See: docs/technical-debt/funding-source-balance-cloud-function.md
        if (
          transactionData.type === 'expense' &&
          transactionData.funding_source_id &&
          transactionData.status === 'completed'
        ) {
          await this.decrementFundingSourceBalance(
            transactionData.funding_source_id,
            parseFloat(transactionData.amount),
          );
        }

        // Refresh the current page to include new transaction
        await this.fetchTransactions(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Transaction recorded successfully');
        return { success: true, data: newTransaction };
      } catch (error) {
        console.error('Error creating transaction:', error);
        errorHandler.notifyError('Failed to record transaction. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing transaction
     * @param {string} transactionId - Transaction ID to update
     * @param {Object} transactionData - Updated transaction data
     */
    async updateTransaction(transactionId, transactionData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // Build update data object (Story 2.3: Use category_id relationship)
        const data = {
          type: transactionData.type,
          amount: parseFloat(transactionData.amount),
          category_id: transactionData.category_id, // Story 2.3: Relationship to finance_categories
          source_module: transactionData.source_module,
          payment_method: transactionData.payment_method,
          funding_source_id: transactionData.funding_source_id || null,
          date: transactionData.date,
          description: transactionData.description,
          status: transactionData.status || 'completed',
        };

        // Add expense-specific fields if present
        if (transactionData.type === 'expense') {
          data.subcategory = transactionData.subcategory || null;
          data.vendor = transactionData.vendor || null;
          data.receipt_number = transactionData.receipt_number || null;
          data.payment_status = transactionData.payment_status || 'paid';
        }

        const updatedTransaction = await tables.updateRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
          data,
        });

        // Refresh the current page
        await this.fetchTransactions(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Transaction updated successfully');
        return { success: true, data: updatedTransaction };
      } catch (error) {
        console.error('Error updating transaction:', error);
        errorHandler.notifyError('Failed to update transaction. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a transaction (soft delete by setting status to 'cancelled')
     * @param {string} transactionId - Transaction ID to delete
     */
    async deleteTransaction(transactionId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // Soft delete: set status to 'cancelled'
        await tables.updateRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
          data: {
            status: 'cancelled',
          },
        });

        // Refresh the current page
        await this.fetchTransactions(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Transaction deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting transaction:', error);
        errorHandler.notifyError('Failed to delete transaction. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Set type filter
     * @param {string|null} type - 'income', 'expense', or null
     */
    setTypeFilter(type) {
      this.filters.type = type;
    },

    /**
     * Set category filter (Story 2.3: Use category ID)
     * @param {string|null} categoryId - Category ID or null
     */
    setCategoryFilter(categoryId) {
      this.filters.categoryId = categoryId;
    },

    /**
     * Set date range filter
     * @param {string|null} dateFrom - Start date ISO string
     * @param {string|null} dateTo - End date ISO string
     */
    setDateRangeFilter(dateFrom, dateTo) {
      this.filters.dateFrom = dateFrom;
      this.filters.dateTo = dateTo;
    },

    /**
     * Set status filter
     * @param {string|null} status - 'pending', 'completed', 'cancelled', or null
     */
    setStatusFilter(status) {
      this.filters.status = status;
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filters.type = null;
      this.filters.categoryId = null; // Story 2.3: Use categoryId
      this.filters.dateFrom = null;
      this.filters.dateTo = null;
      this.filters.status = null;
    },

    /**
     * Apply filters and refresh list
     */
    async applyFilters() {
      // Reset to page 1 when applying filters
      await this.fetchTransactions(1, this.pagination.itemsPerPage);
    },

    /**
     * Change page
     * @param {number} page - Page number to navigate to
     */
    async goToPage(page) {
      if (page < 1 || page > this.totalPages) {
        return;
      }
      await this.fetchTransactions(page, this.pagination.itemsPerPage);
    },

    /**
     * Change items per page
     * @param {number} itemsPerPage - Number of items per page (10, 25, 50, 100)
     */
    async changeItemsPerPage(itemsPerPage) {
      // Reset to page 1 when changing items per page
      await this.fetchTransactions(1, itemsPerPage);
    },

    /**
     * Go to next page
     */
    async nextPage() {
      if (this.hasNextPage) {
        await this.goToPage(this.pagination.currentPage + 1);
      }
    },

    /**
     * Go to previous page
     */
    async previousPage() {
      if (this.hasPreviousPage) {
        await this.goToPage(this.pagination.currentPage - 1);
      }
    },

    /**
     * Clear current transaction
     */
    clearCurrentTransaction() {
      this.currentTransaction = null;
    },

    /**
     * Fetch summary data for dashboard widget
     * Calculates total income, total expenses, net balance, and top expense categories
     */
    async fetchSummary() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // Fetch all completed transactions (not cancelled)
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: transactionsTableId,
          queries: [Query.equal('status', 'completed'), Query.limit(1000)],
        });

        const transactions = response.rows;

        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryTotals = {};

        transactions.forEach((t) => {
          if (t.type === 'income') {
            totalIncome += t.amount;
          } else if (t.type === 'expense') {
            totalExpenses += t.amount;
            // Track expense categories
            if (!categoryTotals[t.category]) {
              categoryTotals[t.category] = 0;
            }
            categoryTotals[t.category] += t.amount;
          }
        });

        // Get top 5 expense categories
        const topExpenseCategories = Object.entries(categoryTotals)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        this.summary = {
          totalIncome,
          totalExpenses,
          netBalance: totalIncome - totalExpenses,
          topExpenseCategories,
          isLoaded: true,
        };

        return { success: true, data: this.summary };
      } catch (error) {
        console.error('Error fetching finance summary:', error);
        return { success: false, error: error.message };
      }
    },
  },
});
