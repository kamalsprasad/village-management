import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { Realtime } from 'appwrite';
import { useFinanceStore } from '../stores/finance-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { useAuthStore } from 'src/stores/auth-store';
import { client } from 'src/boot/appwrite';
import { getAllowedModules, filterByModuleScope } from 'src/utils/report-scope';
import { calculateSummary, groupByCategory } from 'src/services/ReportService';
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from 'date-fns';

export function useDashboardData() {
  const financeStore = useFinanceStore();
  const inventoryStore = useInventoryStore();
  const authStore = useAuthStore();
  const isLoading = ref(false);
  const error = ref(null);
  const dashboardTransactions = ref([]);
  const lastUpdated = ref(null);
  const realtime = new Realtime(client);
  const unsubscribeHandlers = [];
  let realtimeRefreshTimeout = null;

  // Gracefully handle optional lending store
  let lendingStore = null;
  const loadLendingStore = async () => {
    try {
      // Use variable path so Vite doesn't try to resolve at build time
      const lendingPath = 'src/modules/lending/stores/lendingStore.js';
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
    const transactions = dashboardTransactions.value || [];
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

  const currentMonthSummary = computed(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    return calculateSummary(
      scopedTransactions.value.filter((transaction) => {
        if (!transaction?.date) return false;
        try {
          const date = parseISO(transaction.date);
          return date >= start && date <= end;
        } catch {
          return false;
        }
      }),
    );
  });

  const previousMonthSummary = computed(() => {
    const previousMonth = subMonths(new Date(), 1);
    const start = startOfMonth(previousMonth);
    const end = endOfMonth(previousMonth);

    return calculateSummary(
      scopedTransactions.value.filter((transaction) => {
        if (!transaction?.date) return false;
        try {
          const date = parseISO(transaction.date);
          return date >= start && date <= end;
        } catch {
          return false;
        }
      }),
    );
  });

  const calculateChange = (currentValue, previousValue) => {
    if (!previousValue) {
      return currentValue > 0 ? 100 : 0;
    }
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const enrichedSummary = computed(() => {
    const current = currentMonthSummary.value;
    const previous = previousMonthSummary.value;

    return {
      ...current,
      previousPeriod: previous,
      comparisons: {
        incomeChange: calculateChange(current.totalIncome || 0, previous.totalIncome || 0),
        expenseChange: calculateChange(current.totalExpenses || 0, previous.totalExpenses || 0),
        netChange: calculateChange(current.netPosition || 0, previous.netPosition || 0),
      },
      lastUpdated: lastUpdated.value,
    };
  });

  const scopedFundingSources = computed(() => {
    const allFundingSources = financeStore.fundingSources || [];
    if (!isRestricted.value) {
      return allFundingSources;
    }

    const allowedFundingSourceIds = new Set(
      scopedTransactions.value.map((transaction) => transaction.funding_source_id).filter(Boolean),
    );

    return allFundingSources.filter((source) => allowedFundingSourceIds.has(source.$id));
  });

  const computedLoansSummary = computed(() => {
    const loans = lendingStore?.loans || [];
    if (!lendingStore) {
      return defaultLoanSummary;
    }

    const activeLoans = loans.filter((loan) => loan.status === 'active');
    const overdueLoans = activeLoans.filter((loan) => {
      if (!loan.next_due_date) return false;
      return new Date(loan.next_due_date) < new Date();
    });

    const nextPaymentLoan = activeLoans
      .filter((loan) => loan.next_due_date)
      .sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date))[0];

    return {
      totalOutstanding: activeLoans.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0),
      activeCount: activeLoans.length,
      overdueCount: overdueLoans.length,
      nextPaymentDue: nextPaymentLoan
        ? {
            date: nextPaymentLoan.next_due_date,
            amount: nextPaymentLoan.payment_amount || 0,
            borrowerName:
              `${nextPaymentLoan.borrower_id?.first_name || ''} ${nextPaymentLoan.borrower_id?.last_name || ''}`.trim() ||
              'Resident',
          }
        : null,
      topLoans: activeLoans
        .map((loan) => ({
          ...loan,
          id: loan.$id,
          borrowerName:
            `${loan.borrower_id?.first_name || ''} ${loan.borrower_id?.last_name || ''}`.trim() ||
            'Resident',
          daysOverdue:
            loan.next_due_date && new Date(loan.next_due_date) < new Date()
              ? Math.floor((new Date() - new Date(loan.next_due_date)) / (1000 * 60 * 60 * 24))
              : 0,
        }))
        .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0))
        .slice(0, 5),
      moduleEnabled: true,
    };
  });

  const dashboardData = computed(() => {
    const expensesOnly = scopedTransactions.value.filter((t) => t.type === 'expense');
    const topCategories = groupByCategory(expensesOnly, financeStore.categories).sort(
      (a, b) => b.amount - a.amount,
    );

    // Calculate percentage used for funding sources
    const enrichedFundingSources = scopedFundingSources.value.map((s) => {
      const total = s.total_received || 0;
      const balance = s.current_balance || 0;
      const used = Math.max(0, total - balance);
      return {
        ...s,
        percentUsed: total > 0 ? (used / total) * 100 : 0,
      };
    });

    return {
      summary: enrichedSummary.value || defaultSummary,
      recentTransactions: scopedTransactions.value.slice(0, 10),
      trendTransactions: scopedTransactions.value,
      expenseTransactions: expensesOnly,
      categoriesLookup: financeStore.categories || [],
      fundingSources: enrichedFundingSources,
      topExpenseCategories: topCategories,
      inventoryAlerts: [...(inventoryStore.itemsNeedingAttention || [])]
        .sort((a, b) => {
          const aPriority = a.status === 'out_of_stock' ? 0 : 1;
          const bPriority = b.status === 'out_of_stock' ? 0 : 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return (a.quantity || 0) - (b.quantity || 0);
        })
        .slice(0, 5),
      loansSummary: computedLoansSummary.value,
    };
  });

  const refreshIfVisible = async () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (isLoading.value) return;
    await refresh();
  };

  const scheduleRealtimeRefresh = () => {
    if (realtimeRefreshTimeout) {
      clearTimeout(realtimeRefreshTimeout);
    }

    realtimeRefreshTimeout = setTimeout(async () => {
      realtimeRefreshTimeout = null;
      await refreshIfVisible();
    }, 500);
  };

  const subscribeToRealtime = () => {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const inventoryTableId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

    // Manual channel string construction (Channel helper not available in this SDK version)
    const channels = [
      `tablesdb.${dbId}.tables.finance_transactions.rows`,
      `tablesdb.${dbId}.tables.funding_sources.rows`,
      `tablesdb.${dbId}.tables.finance_categories.rows`,
      `tablesdb.${dbId}.tables.${inventoryTableId}.rows`,
      `tablesdb.${dbId}.tables.loans.rows`,
      `tablesdb.${dbId}.tables.loan_payments.rows`,
    ];

    const unsubscribe = realtime.subscribe(channels, () => {
      scheduleRealtimeRefresh();
    });

    unsubscribeHandlers.push(unsubscribe);
  };

  onMounted(() => {
    subscribeToRealtime();
  });

  onBeforeUnmount(() => {
    if (realtimeRefreshTimeout) {
      clearTimeout(realtimeRefreshTimeout);
      realtimeRefreshTimeout = null;
    }

    unsubscribeHandlers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    unsubscribeHandlers.length = 0;
  });

  const refresh = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      await loadLendingStore();

      const [transactionsResult, categoriesResult, fundingSourcesResult, inventoryResult] =
        await Promise.all([
          financeStore.fetchTransactionsForReport(),
          financeStore.categoriesLoaded
            ? Promise.resolve({ success: true, data: financeStore.categories })
            : financeStore.fetchCategories(),
          financeStore.fundingSourcesLoaded
            ? Promise.resolve({ success: true, data: financeStore.fundingSources })
            : financeStore.fetchFundingSources(),
          inventoryStore.fetchAllItems(),
          lendingStore?.fetchLoans
            ? lendingStore.fetchLoans({ status: 'active' })
            : Promise.resolve(),
        ]);

      if (!transactionsResult?.success) {
        throw new Error(transactionsResult?.error || 'Failed to load dashboard transactions');
      }
      if (!categoriesResult?.success) {
        throw new Error(categoriesResult?.error || 'Failed to load finance categories');
      }
      if (!fundingSourcesResult?.success) {
        throw new Error(fundingSourcesResult?.error || 'Failed to load funding sources');
      }
      if (!inventoryResult?.success) {
        throw new Error(inventoryResult?.error || 'Failed to load inventory alerts');
      }

      dashboardTransactions.value = transactionsResult.data || [];
      inventoryStore.items = inventoryResult.data || [];
      lastUpdated.value = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
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
    isLoading,
    error,
    isRestricted,
    allowedModules,
  };
}
