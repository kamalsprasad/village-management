import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from 'src/stores/auth-store';
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
    fundingSourcesLoaded: false, // Story 2.4: Track if funding sources have been fetched
    isFundingSourcesLoading: false, // Story 2.4: Separate loading state for funding sources
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
    // Story 2.4: Transaction Links state
    transactionLinks: {}, // Map of transactionId -> array of links
    underfundedTransactions: [], // List of underfunded transactions
    isTransactionLinksLoading: false,
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

    // ========================================
    // Story 2.4: Funding Source Getters
    // ========================================

    /**
     * Get active funding sources only
     */
    activeFundingSources: (state) => {
      return state.fundingSources.filter((source) => source.status === 'active');
    },

    /**
     * Get funding source by ID
     */
    getFundingSourceById: (state) => (sourceId) => {
      return state.fundingSources.find((source) => source.$id === sourceId);
    },

    /**
     * Get funding source name by ID
     */
    getFundingSourceName: (state) => (sourceId) => {
      const source = state.fundingSources.find((s) => s.$id === sourceId);
      return source ? source.name : 'Unknown';
    },

    /**
     * Get funding source types
     */
    fundingSourceTypes: () => ['grant', 'donation', 'income', 'loan'],

    /**
     * Get funding source statuses
     */
    fundingSourceStatuses: () => ['active', 'inactive', 'depleted'],
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
     * Story 2.8: Fetch all transactions for report generation.
     * Unlike fetchTransactions(), this does NOT mutate store pagination/transaction state.
     * Returns raw transaction rows filtered server-side where possible.
     * Implements automatic pagination to bypass Appwrite limit truncations.
     * @param {Object} options - { dateFrom, dateTo, type, status, fundingSourceId, limit }
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    async fetchTransactionsForReport(options = {}) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';
        const {
          dateFrom,
          dateTo,
          type,
          status,
          fundingSourceId,
          limit: queryLimit = 5000,
        } = options;

        const baseQueries = [Query.orderDesc('date')];

        if (type) {
          baseQueries.push(Query.equal('type', type));
        }
        if (status && Array.isArray(status)) {
          baseQueries.push(Query.equal('status', status));
        } else if (status && typeof status === 'string') {
          baseQueries.push(Query.equal('status', status));
        }
        if (dateFrom) {
          baseQueries.push(Query.greaterThanEqual('date', dateFrom));
        }
        if (dateTo) {
          baseQueries.push(Query.lessThanEqual('date', dateTo));
        }
        if (fundingSourceId) {
          baseQueries.push(Query.equal('funding_source_id', fundingSourceId));
        }

        let allRows = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const queries = [...baseQueries, Query.limit(queryLimit), Query.offset(offset)];

          const response = await tables.listRows({
            databaseId: dbId,
            tableId: transactionsTableId,
            queries,
          });

          allRows.push(...response.rows);

          if (allRows.length >= response.total || response.rows.length < queryLimit) {
            hasMore = false;
          } else {
            offset += queryLimit;
          }
        }

        return { success: true, data: allRows, total: allRows.length };
      } catch (error) {
        console.error('Error fetching transactions for report:', error);
        return { success: false, error: error.message, data: [] };
      }
    },

    /**
     * Fetch all necessary data for the dashboard in one go.
     * Caches data if forceRefresh is false.
     * @param {Object} options - { forceRefresh: boolean }
     */
    async fetchDashboardData(options = {}) {
      const { forceRefresh = false } = options;

      // If we already have data and aren't forcing a refresh, just return success
      if (
        !forceRefresh &&
        this.transactions.length > 0 &&
        this.fundingSourcesLoaded &&
        this.categoriesLoaded
      ) {
        return { success: true };
      }

      this.isLoading = true;
      try {
        // Fetch transactions (get a good chunk for recent and charts)
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // We do parallel fetches for better performance
        const [transactionsRes] = await Promise.all([
          tables.listRows({
            databaseId: dbId,
            tableId: 'finance_transactions',
            queries: [Query.limit(100), Query.orderDesc('date')],
          }),
          this.fetchFundingSources(),
          this.fetchCategories(),
        ]);

        if (transactionsRes && transactionsRes.rows) {
          this.transactions = transactionsRes.rows;
        }

        return { success: true };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
     * Decrement funding source balance (for expense transactions)
     * Story 2.4: Only decrements current_balance (not total_received)
     * WARNING: This is a client-side operation and is NOT atomic.
     * TODO: [FUTURE] Replace with Appwrite Cloud Function for atomic operations.
     * See: docs/technical-debt/funding-source-balance-cloud-function.md
     *
     * @param {string} fundingSourceId - Funding source ID
     * @param {number} amount - Amount to decrement
     * @param {Object} options - Options object
     * @param {boolean} options.includeTotalReceived - Include total received in update
     */
    async decrementFundingSourceBalance(fundingSourceId, amount, options = {}) {
      const { includeTotalReceived = false } = options;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';
        const parsedAmount = parseFloat(amount) || 0;

        // Fetch current balance
        const fundingSource = await tables.getRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
        });

        const newBalance = fundingSource.current_balance - parsedAmount;
        const newTotalReceived = includeTotalReceived
          ? Math.max((fundingSource.total_received || 0) - parsedAmount, 0)
          : fundingSource.total_received;
        const nextStatus =
          newBalance <= 0
            ? 'depleted'
            : fundingSource.status === 'depleted'
              ? 'active'
              : fundingSource.status;

        // Update only current_balance (not total_received)
        await tables.updateRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
          data: {
            current_balance: newBalance,
            ...(includeTotalReceived ? { total_received: newTotalReceived } : {}),
            status: nextStatus,
          },
        });

        // Update local state
        const index = this.fundingSources.findIndex((s) => s.$id === fundingSourceId);
        if (index !== -1) {
          this.fundingSources[index].current_balance = newBalance;
          this.fundingSources[index].status = nextStatus;
          if (includeTotalReceived) {
            this.fundingSources[index].total_received = newTotalReceived;
          }
        }

        console.log(
          `Funding source "${fundingSource.name}" balance decremented: ${fundingSource.current_balance} -> ${newBalance}`,
        );
      } catch (error) {
        console.error('Error updating funding source balance:', error);
        errorHandler.notifyError(
          'Transaction saved, but funding source balance update failed. Please update manually.',
        );
      }
    },

    /**
     * Validate if funding source has sufficient balance for expense
     * Story 2.4: Hard block validation
     * @param {string} fundingSourceId - Funding source ID
     * @param {number} amount - Amount to check
     * @returns {Object} - { valid, currentBalance, shortfall }
     */
    validateFundingSourceBalance(fundingSourceId, amount) {
      const source = this.fundingSources.find((s) => s.$id === fundingSourceId);
      if (!source) {
        return { valid: false, error: 'Funding source not found' };
      }

      const currentBalance = arguments.length > 2 ? arguments[2] : source.current_balance;
      const valid = currentBalance >= amount;

      return {
        valid,
        currentBalance,
        shortfall: valid ? 0 : amount - currentBalance,
        sourceName: source.name,
      };
    },

    /**
     * Fetch all funding sources
     */
    async fetchFundingSources() {
      this.isFundingSourcesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          queries: [Query.limit(100), Query.orderDesc('date_received')],
        });

        this.fundingSources = response.rows;
        this.fundingSourcesLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching funding sources:', error);
        return { success: false, error: error.message };
      } finally {
        this.isFundingSourcesLoading = false;
      }
    },

    // ========================================
    // Story 2.4: Funding Source CRUD Actions
    // ========================================

    /**
     * Add a new funding source
     * @param {Object} sourceData - { name, type, total_received, current_balance, date_received, restrictions, status }
     */
    async addFundingSource(sourceData) {
      this.isFundingSourcesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        const newSource = await tables.createRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: ID.unique(),
          data: {
            name: sourceData.name,
            type: sourceData.type,
            total_received: parseFloat(sourceData.total_received) || 0,
            current_balance: parseFloat(sourceData.current_balance) || 0,
            date_received: sourceData.date_received || null,
            restrictions: sourceData.restrictions || null,
            status: sourceData.status || 'active',
          },
        });

        // Add to local state
        this.fundingSources.push(newSource);

        errorHandler.notifySuccess(`Funding source "${sourceData.name}" created successfully`);
        return { success: true, data: newSource };
      } catch (error) {
        console.error('Error creating funding source:', error);
        errorHandler.notifyError('Failed to create funding source. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isFundingSourcesLoading = false;
      }
    },

    /**
     * Update an existing funding source
     * @param {string} sourceId - Funding source ID to update
     * @param {Object} sourceData - Updated data
     */
    async updateFundingSource(sourceId, sourceData) {
      this.isFundingSourcesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        // Build update data - only include provided fields
        const data = {};
        if (sourceData.name !== undefined) data.name = sourceData.name;
        if (sourceData.type !== undefined) data.type = sourceData.type;
        if (sourceData.total_received !== undefined)
          data.total_received = parseFloat(sourceData.total_received);
        if (sourceData.current_balance !== undefined)
          data.current_balance = parseFloat(sourceData.current_balance);
        if (sourceData.date_received !== undefined) data.date_received = sourceData.date_received;
        if (sourceData.restrictions !== undefined) data.restrictions = sourceData.restrictions;
        if (sourceData.status !== undefined) data.status = sourceData.status;

        const updatedSource = await tables.updateRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: sourceId,
          data,
        });

        // Update local state
        const index = this.fundingSources.findIndex((s) => s.$id === sourceId);
        if (index !== -1) {
          this.fundingSources[index] = updatedSource;
        }

        errorHandler.notifySuccess('Funding source updated successfully');
        return { success: true, data: updatedSource };
      } catch (error) {
        console.error('Error updating funding source:', error);
        errorHandler.notifyError('Failed to update funding source. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isFundingSourcesLoading = false;
      }
    },

    /**
     * Delete a funding source
     * @param {string} sourceId - Funding source ID to delete
     * @returns {Object} - { success, hasTransactions?, error? }
     */
    async deleteFundingSource(sourceId) {
      this.isFundingSourcesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';

        // Check if source has transactions (deletion safeguard)
        const transactionsCheck = await tables.listRows({
          databaseId: dbId,
          tableId: 'finance_transactions',
          queries: [Query.equal('funding_source_id', sourceId), Query.limit(1)],
        });

        if (transactionsCheck.total > 0) {
          return {
            success: false,
            hasTransactions: true,
            transactionCount: transactionsCheck.total,
            error: 'Funding source has existing transactions',
          };
        }

        // Safe to delete
        await tables.deleteRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: sourceId,
        });

        // Remove from local state
        this.fundingSources = this.fundingSources.filter((s) => s.$id !== sourceId);

        errorHandler.notifySuccess('Funding source deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting funding source:', error);
        errorHandler.notifyError('Failed to delete funding source. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isFundingSourcesLoading = false;
      }
    },

    /**
     * Increment funding source balance (for income transactions)
     * Story 2.4: Increases both total_received and current_balance
     * @param {string} fundingSourceId - Funding source ID
     * @param {number} amount - Amount to increment
     * @param {Object} options - Options object
     * @param {boolean} options.includeTotalReceived - Include total received in update
     */
    async incrementFundingSourceBalance(fundingSourceId, amount, options = {}) {
      const { includeTotalReceived = true } = options;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const fundingSourcesTableId = 'funding_sources';
        const parsedAmount = parseFloat(amount) || 0;

        // Fetch current values
        const fundingSource = await tables.getRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
        });

        const newTotalReceived = includeTotalReceived
          ? (fundingSource.total_received || 0) + parsedAmount
          : fundingSource.total_received;
        const newBalance = fundingSource.current_balance + parsedAmount;
        const nextStatus =
          newBalance <= 0
            ? 'depleted'
            : fundingSource.status === 'depleted'
              ? 'active'
              : fundingSource.status;

        // Update both total_received and current_balance
        await tables.updateRow({
          databaseId: dbId,
          tableId: fundingSourcesTableId,
          rowId: fundingSourceId,
          data: {
            ...(includeTotalReceived ? { total_received: newTotalReceived } : {}),
            current_balance: newBalance,
            status: nextStatus,
          },
        });

        // Update local state
        const index = this.fundingSources.findIndex((s) => s.$id === fundingSourceId);
        if (index !== -1) {
          if (includeTotalReceived) {
            this.fundingSources[index].total_received = newTotalReceived;
          }
          this.fundingSources[index].current_balance = newBalance;
          this.fundingSources[index].status = nextStatus;
        }

        console.log(
          `Funding source ${fundingSource.name} balance incremented: ${fundingSource.current_balance} -> ${newBalance}`,
        );
      } catch (error) {
        console.error('Error incrementing funding source balance:', error);
        errorHandler.notifyError(
          'Transaction saved, but funding source balance update failed. Please update manually.',
        );
      }
    },

    // ========================================
    // Story 2.4: Transaction Funding Impact Helpers
    // ========================================

    async applyTransactionFundingImpact(transaction) {
      const amountFunded = parseFloat(transaction.amount_funded) || 0;

      if (
        !transaction.funding_source_id ||
        amountFunded <= 0 ||
        transaction.status === 'cancelled'
      ) {
        return;
      }

      if (transaction.type === 'income') {
        await this.incrementFundingSourceBalance(transaction.funding_source_id, amountFunded);
      } else if (transaction.type === 'expense') {
        await this.decrementFundingSourceBalance(transaction.funding_source_id, amountFunded);
      }
    },

    async reverseTransactionFundingImpact(transaction) {
      const amountFunded = parseFloat(transaction.amount_funded) || 0;

      if (
        !transaction?.funding_source_id ||
        amountFunded <= 0 ||
        transaction.status === 'cancelled'
      ) {
        return;
      }

      if (transaction.type === 'income') {
        await this.decrementFundingSourceBalance(transaction.funding_source_id, amountFunded, {
          includeTotalReceived: true,
        });
      } else if (transaction.type === 'expense') {
        await this.incrementFundingSourceBalance(transaction.funding_source_id, amountFunded, {
          includeTotalReceived: false,
        });
      }
    },

    // ========================================
    // Story 2.3: Category Management
    // ========================================

    /**
     * Fetch all categories
     */
    async fetchCategories() {
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
     * Fetch a single transaction by ID
     * Story 2.7: Used for cross-linking from inventory detail page
     * @param {string} transactionId - Transaction document ID
     * @returns {Object|null} - Transaction object or null if not found
     */
    async fetchTransactionById(transactionId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        const transaction = await tables.getRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
        });

        return transaction;
      } catch (error) {
        console.error('Error fetching transaction by ID:', error);
        return null;
      }
    },

    /**
     * Create a new transaction
     * Story 2.4: Updated to handle amount_needed/amount_funded and supporting transactions
     * @param {Object} transactionData - Transaction data
     */
    async createTransaction(transactionData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        const transactionId = ID.unique();

        // Story 2.4: Parse amount fields
        const amountFunded = parseFloat(transactionData.amount_funded) || 0;
        const amountNeeded = parseFloat(transactionData.amount_needed) || amountFunded;
        const nextStatus = transactionData.status || 'completed';

        if (amountNeeded < amountFunded) {
          errorHandler.notifyError('Amount needed cannot be less than amount funded.');
          return {
            success: false,
            error: 'Amount needed cannot be less than amount funded',
          };
        }

        // Story 2.4: Validate funding source balance for expenses (hard block)
        if (
          transactionData.type === 'expense' &&
          transactionData.funding_source_id &&
          amountFunded > 0 &&
          nextStatus !== 'cancelled'
        ) {
          const validation = this.validateFundingSourceBalance(
            transactionData.funding_source_id,
            amountFunded,
          );
          if (!validation.valid) {
            errorHandler.notifyError(
              `Insufficient funds in ${validation.sourceName}. Available: ZMW ${validation.currentBalance.toLocaleString()}, Required: ZMW ${amountFunded.toLocaleString()}`,
            );
            return {
              success: false,
              error: 'Insufficient funds',
              validation,
            };
          }
        }

        // Build transaction data object
        const data = {
          type: transactionData.type,
          amount_needed: amountNeeded, // Story 2.4: Total amount required
          amount_funded: amountFunded, // Story 2.4: Amount currently funded
          category_id: transactionData.category_id,
          source_module: transactionData.source_module,
          payment_method: transactionData.payment_method,
          funding_source_id: transactionData.funding_source_id || null,
          date: transactionData.date,
          description: transactionData.description,
          status: nextStatus,
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

        await this.applyTransactionFundingImpact(data);

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
     * Story 2.4: Updated to handle amount_needed/amount_funded
     * @param {string} transactionId - Transaction ID to update
     * @param {Object} transactionData - Updated transaction data
     */
    async updateTransaction(transactionId, transactionData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';
        const existingTransaction = await tables.getRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
        });

        // Story 2.4: Parse amount fields
        const amountFunded = parseFloat(transactionData.amount_funded) || 0;
        const amountNeeded = parseFloat(transactionData.amount_needed) || amountFunded;
        const nextStatus = transactionData.status || 'completed';

        if (amountNeeded < amountFunded) {
          errorHandler.notifyError('Amount needed cannot be less than amount funded.');
          return {
            success: false,
            error: 'Amount needed cannot be less than amount funded',
          };
        }

        if (
          transactionData.type === 'expense' &&
          transactionData.funding_source_id &&
          amountFunded > 0 &&
          nextStatus !== 'cancelled'
        ) {
          let availableBalance =
            this.getFundingSourceById(transactionData.funding_source_id)?.current_balance ?? null;

          if (availableBalance === null) {
            await this.fetchFundingSources(true);
            availableBalance =
              this.getFundingSourceById(transactionData.funding_source_id)?.current_balance ?? null;
          }

          if (availableBalance === null) {
            return { success: false, error: 'Funding source not found' };
          }

          if (
            existingTransaction.status !== 'cancelled' &&
            existingTransaction.funding_source_id === transactionData.funding_source_id
          ) {
            if (existingTransaction.type === 'expense') {
              availableBalance += parseFloat(existingTransaction.amount_funded) || 0;
            } else if (existingTransaction.type === 'income') {
              availableBalance -= parseFloat(existingTransaction.amount_funded) || 0;
            }
          }

          const validation = this.validateFundingSourceBalance(
            transactionData.funding_source_id,
            amountFunded,
            availableBalance,
          );

          if (!validation.valid) {
            errorHandler.notifyError(
              `Insufficient funds in ${validation.sourceName}. Available: ZMW ${validation.currentBalance.toLocaleString()}, Required: ZMW ${amountFunded.toLocaleString()}`,
            );
            return {
              success: false,
              error: 'Insufficient funds',
              validation,
            };
          }
        }

        // Build update data object
        const data = {
          type: transactionData.type,
          amount_needed: amountNeeded,
          amount_funded: amountFunded,
          category_id: transactionData.category_id,
          source_module: transactionData.source_module,
          payment_method: transactionData.payment_method,
          funding_source_id: transactionData.funding_source_id || null,
          date: transactionData.date,
          description: transactionData.description,
          status: nextStatus,
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

        await this.reverseTransactionFundingImpact(existingTransaction);
        await this.applyTransactionFundingImpact(data);

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
     * Story 2.4: Updated to handle cascading updates for supporting transactions
     * @param {string} transactionId - Transaction ID to delete
     * @param {Object} transaction - The transaction object being deleted (for cascading)
     */
    async deleteTransaction(transactionId, transaction = null) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // If transaction not provided, fetch it for cascading logic
        let txToDelete = transaction;
        if (!txToDelete) {
          txToDelete = await tables.getRow({
            databaseId: dbId,
            tableId: transactionsTableId,
            rowId: transactionId,
          });
        }
        const originalTransaction = { ...txToDelete };

        // Soft delete: set status to 'cancelled'
        await tables.updateRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
          data: {
            status: 'cancelled',
          },
        });

        await this.reverseTransactionFundingImpact(originalTransaction);

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
     * Story 2.4: Uses amount_funded and excludes supporting transactions from expense totals
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
        // Story 2.4: Use amount_funded instead of amount
        // Exclude supporting transactions from expense totals (they're already counted in parent's amount_funded)
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryTotals = {};

        transactions.forEach((t) => {
          if (t.type === 'income') {
            totalIncome += t.amount_funded || 0;
          } else if (t.type === 'expense') {
            totalExpenses += t.amount_funded || 0;
            // Track expense categories using category_id
            const categoryKey = t.category_id || 'Uncategorized';
            if (!categoryTotals[categoryKey]) {
              categoryTotals[categoryKey] = 0;
            }
            categoryTotals[categoryKey] += t.amount_funded || 0;
          }
        });

        // Get top 5 expense categories (by category_id)
        const topExpenseCategories = Object.entries(categoryTotals)
          .map(([categoryId, amount]) => ({
            category: this.getCategoryName(categoryId),
            categoryId,
            amount,
          }))
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

    // ==========================================
    // Story 2.4: Transaction Links Actions
    // ==========================================

    /**
     * Create a funding link to add funding to an underfunded transaction
     * Story 2.4: Implements the funding links feature without self-referencing relationships
     * @param {string} parentTransactionId - The expense transaction being funded
     * @param {number} amount - Amount to add
     * @param {string} fundingSourceId - Source of the funds
     * @param {string} notes - Optional notes about the funding
     * @param {string} childTransactionId - Optional: specific transaction providing funds
     */
    async createFundingLink(
      parentTransactionId,
      amount,
      fundingSourceId,
      notes = '',
      childTransactionId = null,
    ) {
      this.isTransactionLinksLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionLinksTableId = 'transaction_links';
        const transactionsTableId = 'finance_transactions';
        const authStore = useAuthStore();
        const recordedBy = authStore.user?.$id;

        // 1. Fetch parent transaction to validate
        const parentTx = await tables.getRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: parentTransactionId,
        });

        if (!parentTx) {
          throw new Error('Parent transaction not found');
        }

        // 2. Validate amount doesn't exceed remaining needed
        const remainingNeeded = (parentTx.amount_needed || 0) - (parentTx.amount_funded || 0);
        if (amount > remainingNeeded) {
          throw new Error(`Amount exceeds remaining needed (${remainingNeeded})`);
        }

        // 3. Validate funding source has sufficient balance
        const fundingSource = this.fundingSources.find((fs) => fs.$id === fundingSourceId);
        if (!fundingSource) {
          throw new Error('Funding source not found');
        }
        if (fundingSource.current_balance < amount) {
          throw new Error(
            `Insufficient balance in funding source (available: ${fundingSource.current_balance})`,
          );
        }
        if (!recordedBy) {
          throw new Error('You must be logged in to add funding');
        }

        // 4. Create the funding link
        const fundingLink = await tables.createRow({
          databaseId: dbId,
          tableId: transactionLinksTableId,
          rowId: ID.unique(),
          data: {
            parent_transaction_id: parentTransactionId,
            ...(childTransactionId ? { child_transaction_id: childTransactionId } : {}),
            funding_source_id: fundingSourceId,
            link_type: 'funding',
            amount: amount,
            recorded_by: recordedBy,
            notes: notes,
            created_at: new Date().toISOString(),
          },
        });

        // 5. Update parent transaction's amount_funded
        const newAmountFunded = (parentTx.amount_funded || 0) + amount;
        const nextParentStatus =
          newAmountFunded >= (parentTx.amount_needed || 0) && parentTx.status === 'pending'
            ? 'completed'
            : parentTx.status;
        await tables.updateRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: parentTransactionId,
          data: {
            amount_funded: newAmountFunded,
            status: nextParentStatus,
          },
        });

        // 6. Decrement funding source balance
        await this.decrementFundingSourceBalance(fundingSourceId, amount);

        // 7. Update local state
        if (!this.transactionLinks[parentTransactionId]) {
          this.transactionLinks[parentTransactionId] = [];
        }
        this.transactionLinks[parentTransactionId].push({
          ...fundingLink,
          fundingSource,
        });

        // 8. Update the transaction in the transactions array
        const txIndex = this.transactions.findIndex((t) => t.$id === parentTransactionId);
        if (txIndex !== -1) {
          this.transactions[txIndex].amount_funded = newAmountFunded;
          this.transactions[txIndex].status = nextParentStatus;
        }

        errorHandler.notifySuccess(`Funding added: ${amount} from ${fundingSource.name}`);
        return { success: true, data: fundingLink };
      } catch (error) {
        console.error('Error creating funding link:', error);
        errorHandler.notifyError(`Failed to add funding: ${error.message}`);
        return { success: false, error: error.message };
      } finally {
        this.isTransactionLinksLoading = false;
      }
    },

    /**
     * Fetch all funding links for a transaction
     * @param {string} transactionId - Transaction ID to fetch links for
     */
    async fetchTransactionLinks(transactionId) {
      this.isTransactionLinksLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionLinksTableId = 'transaction_links';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: transactionLinksTableId,
          queries: [
            Query.equal('parent_transaction_id', transactionId),
            Query.orderDesc('created_at'),
            Query.limit(50),
          ],
        });

        // Store in local state
        this.transactionLinks[transactionId] = response.rows.map((link) => {
          const linkedFundingSource =
            typeof link.funding_source_id === 'object'
              ? link.funding_source_id
              : this.getFundingSourceById(link.funding_source_id);

          return {
            ...link,
            fundingSource: linkedFundingSource || null,
          };
        });

        return { success: true, data: this.transactionLinks[transactionId] };
      } catch (error) {
        console.error('Error fetching transaction links:', error);
        return { success: false, error: error.message };
      } finally {
        this.isTransactionLinksLoading = false;
      }
    },

    /**
     * Get underfunded transactions (where amount_funded < amount_needed)
     * Story 2.4: For Add Funding workflow
     * @param {number} limit - Maximum number of results
     */
    async getUnderfundedTransactions(limit = 50) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const transactionsTableId = 'finance_transactions';

        // Query for expense transactions where amount_funded < amount_needed
        // We need to fetch and filter since Appwrite doesn't support complex comparison queries
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: transactionsTableId,
          queries: [
            Query.equal('type', 'expense'),
            Query.notEqual('status', 'cancelled'),
            Query.limit(limit),
            Query.orderDesc('date'),
          ],
        });

        // Filter to underfunded transactions
        const underfunded = response.rows.filter((tx) => {
          const amountNeeded = tx.amount_needed || 0;
          const amountFunded = tx.amount_funded || 0;
          return amountFunded < amountNeeded;
        });

        this.underfundedTransactions = underfunded;

        return { success: true, data: underfunded };
      } catch (error) {
        console.error('Error fetching underfunded transactions:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Check if user can add funding (has finance role)
     * @param {Object} user - Current user object with roles
     */
    canAddFunding(user) {
      if (!user || !user.roles) return false;
      return user.roles.some(
        (role) =>
          role.category === 'finance' || (role.permissions && role.permissions.includes('*')),
      );
    },

    /**
     * Clear transaction links cache for a transaction
     * @param {string} transactionId
     */
    clearTransactionLinks(transactionId) {
      if (transactionId) {
        delete this.transactionLinks[transactionId];
      } else {
        this.transactionLinks = {};
      }
    },

    // TODO: UNLINKING_FUNDING - Implement unlinkFunding action
    // See: docs/future_enhancements.md
    // async unlinkFunding(linkId, reason) { ... }
  },
});
