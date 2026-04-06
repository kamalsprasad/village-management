import { computed, ref } from 'vue';
import { debounce } from 'quasar';
import { useFinanceStore } from '../stores/finance-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { useAuthStore } from 'src/stores/auth-store';
import { getAllowedModules, filterByModuleScope } from 'src/utils/report-scope';
import { calculateSummary, groupByCategory } from 'src/services/ReportService';

export function useDashboardData() {
  const financeStore = useFinanceStore();
  const inventoryStore = useInventoryStore();
  const authStore = useAuthStore();
  const isLoading = ref(false);
  const error = ref(null);

  // Gracefully handle optional lending store
  let lendingStore = null;
  const loadLendingStore = async () => {
    try {
      // Use variable path so Vite doesn't try to resolve at build time
      const lendingPath = 'src/modules/lending/stores/lending-store';
      const lendingModule = await import(/* @vite-ignore */ lendingPath);
      if (lendingModule && lendingModule.useLendingStore) {
        lendingStore = lendingModule.useLendingStore();
      }
    } catch {
      // Lending module not enabled or not found
      console.log('Lending module not available');
    }
  };

  // Determine allowed modules for the current user
  const allowedModules = computed(() => getAllowedModules(authStore.userRoles));

  // Is the user restricted to specific modules?
  const isRestricted = computed(() => allowedModules.value !== null);

  // Filter transactions based on module access
  const scopedTransactions = computed(() => {
    const transactions = financeStore.transactions || [];
    return filterByModuleScope(transactions, authStore.userRoles);
  });

  // Default empty states
  const defaultSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    netPosition: 0,
    previousPeriod: null,
  };

  const defaultLoanSummary = {
    totalOutstanding: 0,
    activeCount: 0,
    overdueCount: 0,
    nextPaymentDue: null,
    topLoans: [],
    moduleEnabled: false,
  };

  const dashboardData = computed(() => {
    // We compute summary and categories on the fly from the scoped transactions
    const summary = calculateSummary(scopedTransactions.value);
    const expensesOnly = scopedTransactions.value.filter((t) => t.type === 'expense');
    const topCategories = groupByCategory(expensesOnly).sort((a, b) => b.amount - a.amount);

    // Filter funding sources if restricted
    let scopedFundingSources = financeStore.fundingSources || [];
    // Currently funding sources aren't strictly tied to a source_module in the schema,
    // but we'll include them if the user has finance access.

    // Calculate percentage used for funding sources
    const enrichedFundingSources = scopedFundingSources.map((s) => {
      const total = s.total_received || 0;
      const balance = s.current_balance || 0;
      const used = Math.max(0, total - balance);
      return {
        ...s,
        percentUsed: total > 0 ? (used / total) * 100 : 0,
      };
    });

    return {
      summary: summary || defaultSummary,
      recentTransactions: scopedTransactions.value.slice(0, 10),
      fundingSources: enrichedFundingSources,
      topExpenseCategories: topCategories,
      inventoryAlerts: inventoryStore.itemsNeedingAttention?.slice(0, 5) || [],
      loansSummary: lendingStore?.portfolioSummary || defaultLoanSummary,
    };
  });

  // Debounced refresh for expensive aggregations
  // We don't want to re-fetch from network on every local mutation, just re-calculate
  const debouncedRefresh = debounce(() => {
    // Force reactivity update by triggering computed
    const current = financeStore.transactions;
    if (current && current.length > 0) {
      // Small mutation to trigger deep watcher internally if needed, but Vue's computed
      // should handle this automatically when the store state changes.
    }
  }, 500);

  const refresh = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await loadLendingStore();
      await Promise.all([
        financeStore.fetchDashboardData({ forceRefresh: true }),
        inventoryStore.fetchItemsNeedingAttention
          ? inventoryStore.fetchItemsNeedingAttention()
          : Promise.resolve(),
        lendingStore?.fetchPortfolioSummary
          ? lendingStore.fetchPortfolioSummary()
          : Promise.resolve(),
      ]);
    } catch (e) {
      error.value = e;
      console.error('Error refreshing dashboard:', e);
    } finally {
      isLoading.value = false;
    }
  };

  return {
    dashboardData,
    refresh,
    debouncedRefresh,
    isLoading,
    error,
    isRestricted,
    allowedModules,
  };
}
