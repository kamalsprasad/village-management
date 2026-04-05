/**
 * Report Service - Pure Utility Functions
 *
 * Story 2.8: Shared reporting calculations and aggregation logic.
 * All functions are pure (no Pinia/store dependency) to maximize
 * testability and reuse (e.g., by Story 2.9 dashboard widgets).
 *
 * Data fetching is handled by the finance store's fetchTransactionsForReport
 * action. This module only transforms/aggregates already-fetched data.
 */

import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

// ============================================================
// Report Type Definitions
// ============================================================

/**
 * Report type configuration used by the reports page UI.
 * @type {Array<{id: string, title: string, description: string, icon: string, color: string}>}
 */
export const REPORT_TYPES = [
  {
    id: 'income-summary',
    title: 'Income Summary',
    description: 'Total income grouped by category, module, and time period',
    icon: 'trending_up',
    color: 'positive',
  },
  {
    id: 'expense-summary',
    title: 'Expense Summary',
    description: 'Total expenses grouped by category, module, and funding source',
    icon: 'trending_down',
    color: 'negative',
  },
  {
    id: 'profit-loss',
    title: 'Profit & Loss Statement',
    description: 'Income vs expenses comparison and net surplus/deficit',
    icon: 'account_balance',
    color: 'primary',
  },
  {
    id: 'cash-flow',
    title: 'Cash Flow Report',
    description: 'Inflows vs outflows over time with net cash movement',
    icon: 'swap_vert',
    color: 'info',
  },
  {
    id: 'balance-sheet',
    title: 'Financial Position Summary',
    description: 'MVP simplified balance sheet using current available data',
    icon: 'balance',
    color: 'secondary',
  },
  {
    id: 'donor-fund-usage',
    title: 'Donor Fund Usage',
    description: 'Funding source utilization summary and transaction detail',
    icon: 'volunteer_activism',
    color: 'accent',
  },
];

// ============================================================
// Shared Helpers
// ============================================================

/**
 * Format currency amount in ZMW.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format a date string for display.
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export function formatReportDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'dd MMM yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get month key from a date string (e.g., "2026-01").
 * @param {string} dateString
 * @returns {string}
 */
function getMonthKey(dateString) {
  try {
    return format(parseISO(dateString), 'yyyy-MM');
  } catch {
    return 'unknown';
  }
}

/**
 * Get month label from a month key (e.g., "Jan 2026").
 * @param {string} monthKey - Format "yyyy-MM"
 * @returns {string}
 */
function getMonthLabel(monthKey) {
  try {
    return format(parseISO(monthKey + '-01'), 'MMM yyyy');
  } catch {
    return monthKey;
  }
}

/**
 * Generate all month keys in a date range for consistent chart axes.
 * @param {string} dateFrom - ISO date string
 * @param {string} dateTo - ISO date string
 * @param {Array} transactions - Array of transactions to determine date range if missing
 * @returns {string[]} Array of month keys
 */
function getAllMonthKeys(dateFrom, dateTo, transactions = []) {
  let start = dateFrom ? parseISO(dateFrom) : null;
  let end = dateTo ? parseISO(dateTo) : null;

  if (!start || !end) {
    if (!transactions || !transactions.length) return [];

    // Find min and max dates from transactions
    const dates = transactions.map((t) => new Date(t.date).getTime()).filter((t) => !isNaN(t));

    if (!dates.length) return [];

    if (!start) start = new Date(Math.min(...dates));
    if (!end) end = new Date(Math.max(...dates));
  }

  try {
    return eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) }).map((d) =>
      format(d, 'yyyy-MM'),
    );
  } catch {
    return [];
  }
}

/**
 * Group transactions by a field and sum amount_funded.
 * @param {Array} transactions
 * @param {string} field - Field name to group by
 * @param {Function} [labelFn] - Optional function to resolve display label from field value
 * @returns {Array<{key: string, label: string, total: number, count: number}>}
 */
function groupAndSum(transactions, field, labelFn) {
  const groups = {};
  for (const t of transactions) {
    const key = t[field] || 'Unknown';
    if (!groups[key]) {
      groups[key] = { key, total: 0, count: 0 };
    }
    groups[key].total += t.amount_funded || 0;
    groups[key].count += 1;
  }
  return Object.values(groups)
    .map((g) => ({
      ...g,
      label: labelFn ? labelFn(g.key) : g.key,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Group transactions by month and sum amount_funded.
 * @param {Array} transactions
 * @param {string[]} [allMonthKeys] - Optional full list of month keys for zero-filling
 * @returns {Array<{monthKey: string, label: string, total: number, count: number}>}
 */
function groupByMonth(transactions, allMonthKeys = []) {
  const groups = {};
  // Initialize all months with zero if provided
  for (const mk of allMonthKeys) {
    groups[mk] = { monthKey: mk, label: getMonthLabel(mk), total: 0, count: 0 };
  }
  for (const t of transactions) {
    const mk = getMonthKey(t.date);
    if (!groups[mk]) {
      groups[mk] = { monthKey: mk, label: getMonthLabel(mk), total: 0, count: 0 };
    }
    groups[mk].total += t.amount_funded || 0;
    groups[mk].count += 1;
  }
  return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

// ============================================================
// Report Generators
// ============================================================

/**
 * Generate Income Summary report data.
 * @param {Array} transactions - All scoped transactions (already filtered by role/status)
 * @param {Object} options - { categories, dateFrom, dateTo }
 * @returns {Object} Report data
 */
export function generateIncomeSummary(transactions, options = {}) {
  const { categories = [], dateFrom, dateTo } = options;
  const income = transactions.filter((t) => t.type === 'income');
  const totalIncome = income.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const allMonths = getAllMonthKeys(dateFrom, dateTo, income);

  const categoryLookup = (id) => {
    const cat = categories.find((c) => c.$id === id);
    return cat ? cat.name : 'Uncategorized';
  };

  return {
    reportType: 'income-summary',
    totalIncome,
    transactionCount: income.length,
    byCategory: groupAndSum(income, 'category_id', categoryLookup),
    byModule: groupAndSum(income, 'source_module'),
    byMonth: groupByMonth(income, allMonths),
    transactions: income,
  };
}

/**
 * Generate Expense Summary report data.
 * @param {Array} transactions - All scoped transactions
 * @param {Object} options - { categories, fundingSources, dateFrom, dateTo }
 * @returns {Object} Report data
 */
export function generateExpenseSummary(transactions, options = {}) {
  const { categories = [], fundingSources = [], dateFrom, dateTo } = options;
  const expenses = transactions.filter((t) => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const allMonths = getAllMonthKeys(dateFrom, dateTo, expenses);

  const categoryLookup = (id) => {
    const cat = categories.find((c) => c.$id === id);
    return cat ? cat.name : 'Uncategorized';
  };
  const fundingSourceLookup = (id) => {
    const fs = fundingSources.find((s) => s.$id === id);
    return fs ? fs.name : 'Unlinked';
  };

  return {
    reportType: 'expense-summary',
    totalExpenses,
    transactionCount: expenses.length,
    byCategory: groupAndSum(expenses, 'category_id', categoryLookup),
    byModule: groupAndSum(expenses, 'source_module'),
    byFundingSource: groupAndSum(expenses, 'funding_source_id', fundingSourceLookup),
    byMonth: groupByMonth(expenses, allMonths),
    transactions: expenses,
  };
}

/**
 * Generate Profit & Loss report data.
 * @param {Array} transactions - All scoped transactions
 * @param {Object} options - { categories, dateFrom, dateTo }
 * @returns {Object} Report data
 */
export function generateProfitLoss(transactions, options = {}) {
  const { categories = [], dateFrom, dateTo } = options;
  const allMonths = getAllMonthKeys(dateFrom, dateTo, transactions);

  const income = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const totalIncome = income.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const netResult = totalIncome - totalExpenses;

  const categoryLookup = (id) => {
    const cat = categories.find((c) => c.$id === id);
    return cat ? cat.name : 'Uncategorized';
  };

  return {
    reportType: 'profit-loss',
    totalIncome,
    totalExpenses,
    netResult,
    isProfit: netResult >= 0,
    incomeByCategory: groupAndSum(income, 'category_id', categoryLookup),
    expenseByCategory: groupAndSum(expenses, 'category_id', categoryLookup),
    incomeByMonth: groupByMonth(income, allMonths),
    expenseByMonth: groupByMonth(expenses, allMonths),
  };
}

/**
 * Generate Cash Flow report data.
 * @param {Array} transactions - All scoped transactions
 * @param {Object} options - { dateFrom, dateTo }
 * @returns {Object} Report data
 */
export function generateCashFlow(transactions, options = {}) {
  const { dateFrom, dateTo } = options;
  const allMonths = getAllMonthKeys(dateFrom, dateTo, transactions);

  const income = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');

  const inflowsByMonth = groupByMonth(income, allMonths);
  const outflowsByMonth = groupByMonth(expenses, allMonths);

  // Merge into a single series with net movement
  const cashFlow = allMonths.map((mk) => {
    const inflow = inflowsByMonth.find((m) => m.monthKey === mk);
    const outflow = outflowsByMonth.find((m) => m.monthKey === mk);
    const inflowTotal = inflow ? inflow.total : 0;
    const outflowTotal = outflow ? outflow.total : 0;
    return {
      monthKey: mk,
      label: getMonthLabel(mk),
      inflow: inflowTotal,
      outflow: outflowTotal,
      net: inflowTotal - outflowTotal,
    };
  });

  // Running cumulative balance
  let cumulative = 0;
  for (const month of cashFlow) {
    cumulative += month.net;
    month.cumulative = cumulative;
  }

  const totalInflow = income.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const totalOutflow = expenses.reduce((sum, t) => sum + (t.amount_funded || 0), 0);

  return {
    reportType: 'cash-flow',
    totalInflow,
    totalOutflow,
    netCashMovement: totalInflow - totalOutflow,
    byMonth: cashFlow,
  };
}

/**
 * Generate simplified Balance Sheet / Financial Position Summary.
 *
 * MVP limitations:
 * - Not full double-entry accounting
 * - Assets derived from funding source balances and optional inventory value
 * - Liabilities may be zero if no debt is modeled
 * - Net position = assets - liabilities
 *
 * @param {Object} data - { fundingSources, inventoryItems, lendingData }
 * @returns {Object} Report data
 */
export function generateBalanceSheet(data = {}) {
  const { fundingSources = [], inventoryItems = [] } = data;

  // Assets: Funding source current balances
  const fundingSourceAssets = fundingSources
    .filter((fs) => fs.status === 'active' && (fs.current_balance || 0) > 0)
    .map((fs) => ({
      name: fs.name,
      type: fs.type,
      value: fs.current_balance || 0,
    }));
  const totalFundingBalances = fundingSourceAssets.reduce((sum, a) => sum + a.value, 0);

  // Assets: Inventory estimated value (unit_cost * quantity for active items)
  let totalInventoryValue = 0;
  const inventoryAssets = [];
  for (const item of inventoryItems) {
    if (item.status !== 'disposed' && item.unit_cost && item.quantity) {
      const value = item.unit_cost * item.quantity;
      totalInventoryValue += value;
      inventoryAssets.push({
        name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unit_cost,
        value,
      });
    }
  }

  const totalAssets = totalFundingBalances + totalInventoryValue;

  // Liabilities: Not currently modeled in MVP
  const totalLiabilities = 0;
  const liabilities = [];

  const netPosition = totalAssets - totalLiabilities;

  return {
    reportType: 'balance-sheet',
    isMVPSimplified: true,
    assets: {
      fundingSources: fundingSourceAssets,
      totalFundingBalances,
      inventory: inventoryAssets,
      totalInventoryValue,
      total: totalAssets,
    },
    liabilities: {
      items: liabilities,
      total: totalLiabilities,
    },
    netPosition,
    disclaimer:
      'This is an MVP Simplified Financial Position Summary. It does not represent a full double-entry balance sheet. Assets are derived from funding source balances and inventory estimates. Formal liabilities, receivables, and equity accounts are not yet modeled.',
  };
}

/**
 * Generate Donor Fund Usage report data for a specific funding source.
 * @param {Array} transactions - All scoped transactions
 * @param {Object} fundingSource - The funding source object
 * @param {Object} options - { categories, dateFrom, dateTo }
 * @returns {Object} Report data
 */
export function generateDonorFundUsage(transactions, fundingSource, options = {}) {
  const { categories = [], dateFrom, dateTo } = options;

  if (!fundingSource) {
    return {
      reportType: 'donor-fund-usage',
      error: 'No funding source selected',
      fundingSource: null,
      totalAllocated: 0,
      totalSpent: 0,
      remainingBalance: 0,
      utilizationRate: 0,
      transactions: [],
      byCategory: [],
      byMonth: [],
    };
  }

  const allMonths = getAllMonthKeys(dateFrom, dateTo, transactions);

  // Filter to transactions linked to this funding source
  const linked = transactions.filter((t) => t.funding_source_id === fundingSource.$id);
  const linkedExpenses = linked.filter((t) => t.type === 'expense');
  const linkedIncome = linked.filter((t) => t.type === 'income');

  const totalSpent = linkedExpenses.reduce((sum, t) => sum + (t.amount_funded || 0), 0);
  const totalReceived = linkedIncome.reduce((sum, t) => sum + (t.amount_funded || 0), 0);

  const categoryLookup = (id) => {
    const cat = categories.find((c) => c.$id === id);
    return cat ? cat.name : 'Uncategorized';
  };

  return {
    reportType: 'donor-fund-usage',
    fundingSource: {
      name: fundingSource.name,
      type: fundingSource.type,
      totalReceived: fundingSource.total_received || 0,
      currentBalance: fundingSource.current_balance || 0,
      restrictions: fundingSource.restrictions || 'None',
      status: fundingSource.status,
    },
    totalAllocated: fundingSource.total_received || 0,
    totalSpent,
    totalReceived,
    remainingBalance: fundingSource.current_balance || 0,
    utilizationRate:
      fundingSource.total_received > 0
        ? ((totalSpent / fundingSource.total_received) * 100).toFixed(1)
        : 0,
    byCategory: groupAndSum(linkedExpenses, 'category_id', categoryLookup),
    byMonth: groupByMonth(linkedExpenses, allMonths),
    transactions: linked,
  };
}

// ============================================================
// Flat Row Generators for CSV/PDF Export
// ============================================================

/**
 * Flatten transactions into export-ready rows.
 * @param {Array} transactions
 * @param {Object} options - { categories, fundingSources }
 * @returns {Array<Object>}
 */
export function flattenTransactionsForExport(transactions, options = {}) {
  const { categories = [], fundingSources = [] } = options;

  return transactions.map((t) => {
    const cat = categories.find((c) => c.$id === t.category_id);
    const fs = fundingSources.find((s) => s.$id === t.funding_source_id);
    return {
      Date: t.date ? format(parseISO(t.date), 'yyyy-MM-dd') : '',
      Type: t.type || '',
      Category: cat ? cat.name : 'Uncategorized',
      Description: t.description || '',
      'Amount Funded': t.amount_funded || 0,
      'Amount Needed': t.amount_needed || 0,
      'Funding Source': fs ? fs.name : '',
      'Source Module': t.source_module || '',
      Status: t.status || '',
    };
  });
}

/**
 * Flatten grouped summary data for CSV/PDF export.
 * @param {Array} groupedData - Output from groupAndSum
 * @param {string} groupLabel - Column header for the group key
 * @returns {Array<Object>}
 */
export function flattenGroupedForExport(groupedData, groupLabel = 'Category') {
  return groupedData.map((g) => ({
    [groupLabel]: g.label,
    Total: g.total,
    'Transaction Count': g.count,
  }));
}
