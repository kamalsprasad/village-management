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
    currentTransaction: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      total: 0,
    },
    filters: {
      type: null, // 'income', 'expense', or null for all
      category: null,
      dateFrom: null,
      dateTo: null,
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
     * Get income-specific categories
     */
    incomeCategories: () => [
      'Donations',
      'Farm Sales',
      'Grants',
      'Room Rental',
      'School Fees',
      'Training Fees',
      'Other Income',
    ],

    /**
     * Get expense-specific categories
     */
    expenseCategories: () => [
      'Farm Assets',
      'Farm Inputs',
      'School Assets',
      'Staff Reimbursements',
      'Village Assets',
      'Other Expenses',
    ],

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

      // Filter by category
      if (this.filters.category) {
        queries.push(Query.equal('category', this.filters.category));
      }

      // Filter by date range
      if (this.filters.dateFrom) {
        queries.push(Query.greaterThanEqual('date', this.filters.dateFrom));
      }
      if (this.filters.dateTo) {
        queries.push(Query.lessThanEqual('date', this.filters.dateTo));
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

        const newTransaction = await tables.createRow({
          databaseId: dbId,
          tableId: transactionsTableId,
          rowId: transactionId,
          data: {
            type: transactionData.type,
            amount: parseFloat(transactionData.amount),
            category: transactionData.category,
            source_module: transactionData.source_module,
            payment_method: transactionData.payment_method,
            funding_source_id: transactionData.funding_source_id || null,
            date: transactionData.date,
            description: transactionData.description,
            status: transactionData.status || 'completed',
          },
        });

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
     * Set type filter
     * @param {string|null} type - 'income', 'expense', or null
     */
    setTypeFilter(type) {
      this.filters.type = type;
    },

    /**
     * Set category filter
     * @param {string|null} category - Category name or null
     */
    setCategoryFilter(category) {
      this.filters.category = category;
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
     * Clear all filters
     */
    clearFilters() {
      this.filters.type = null;
      this.filters.category = null;
      this.filters.dateFrom = null;
      this.filters.dateTo = null;
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
  },
});
