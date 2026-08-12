import { describe, it, expect } from 'vitest';
import {
  REPORT_TYPES,
  formatCurrency,
  formatReportDate,
  groupByCategory,
  calculateSummary,
  generateIncomeSummary,
  generateExpenseSummary,
  generateProfitLoss,
  generateCashFlow,
  generateBalanceSheet,
  generateDonorFundUsage,
  flattenTransactionsForExport,
} from 'src/services/ReportService';

const tx = (over = {}) => ({
  type: 'income',
  amount_funded: 100,
  amount_needed: 0,
  category_id: 'cat-1',
  source_module: 'Farm',
  funding_source_id: null,
  date: '2025-01-15T12:00:00.000Z',
  description: 'Sale',
  status: 'completed',
  ...over,
});

const categories = [
  { $id: 'cat-1', name: 'Donations' },
  { $id: 'cat-2', name: 'Supplies' },
];

describe('ReportService', () => {
  describe('REPORT_TYPES', () => {
    it('exports the expected report types', () => {
      const ids = REPORT_TYPES.map((r) => r.id);
      expect(ids).toContain('income-summary');
      expect(ids).toContain('expense-summary');
      expect(ids).toContain('profit-loss');
      expect(ids).toContain('cash-flow');
      expect(ids).toContain('balance-sheet');
      expect(ids).toContain('donor-fund-usage');
    });

    it('every report type has required fields', () => {
      for (const r of REPORT_TYPES) {
        expect(r.id).toBeTruthy();
        expect(r.title).toBeTruthy();
        expect(r.icon).toBeTruthy();
        expect(r.color).toBeTruthy();
      }
    });
  });

  describe('formatCurrency', () => {
    it('formats a number as currency with the amount present', () => {
      const out = formatCurrency(1000);
      expect(out).toContain('1,000.00');
    });

    it('treats null/undefined as 0', () => {
      expect(formatCurrency(null)).toMatch(/0/);
      expect(formatCurrency(undefined)).toMatch(/0/);
    });
  });

  describe('formatReportDate', () => {
    it('returns N/A for falsy input', () => {
      expect(formatReportDate(null)).toBe('N/A');
      expect(formatReportDate('')).toBe('N/A');
    });

    it('formats an ISO date', () => {
      expect(formatReportDate('2025-01-15T12:00:00.000Z')).toMatch(/15 Jan 2025/);
    });

    it('returns the raw string on parse failure', () => {
      expect(formatReportDate('garbage')).toBe('garbage');
    });
  });

  describe('groupByCategory', () => {
    it('groups and sums by category_id', () => {
      const out = groupByCategory(
        [
          tx({ category_id: 'cat-1', amount_funded: 100 }),
          tx({ category_id: 'cat-1', amount_funded: 50 }),
          tx({ category_id: 'cat-2', amount_funded: 30 }),
        ],
        categories,
      );
      const c1 = out.find((g) => g.id === 'cat-1');
      const c2 = out.find((g) => g.id === 'cat-2');
      expect(c1.amount).toBe(150);
      expect(c1.name).toBe('Donations');
      expect(c2.amount).toBe(30);
      expect(c2.name).toBe('Supplies');
    });

    it('labels a missing category_id as Uncategorized', () => {
      // groupAndSum uses t[field] || 'Unknown', so a missing category_id
      // becomes the 'Unknown' key which is labelled 'Uncategorized'.
      const out = groupByCategory([tx({ category_id: undefined })], categories);
      const c = out.find((g) => g.id === 'Unknown');
      expect(c.name).toBe('Uncategorized');
    });

    it('uses the raw id as the name for an unrecognized non-Unknown category', () => {
      const out = groupByCategory([tx({ category_id: 'cat-x' })], categories);
      const c = out.find((g) => g.id === 'cat-x');
      expect(c.name).toBe('cat-x');
    });

    it('handles empty transactions', () => {
      expect(groupByCategory([])).toEqual([]);
    });
  });

  describe('calculateSummary', () => {
    it('sums income and expenses and computes net position', () => {
      const out = calculateSummary([
        tx({ type: 'income', amount_funded: 500 }),
        tx({ type: 'income', amount_funded: 250 }),
        tx({ type: 'expense', amount_funded: 300 }),
      ]);
      expect(out.totalIncome).toBe(750);
      expect(out.totalExpenses).toBe(300);
      expect(out.netPosition).toBe(450);
      expect(out.incomeCount).toBe(2);
      expect(out.expenseCount).toBe(1);
    });

    it('skips cancelled transactions', () => {
      const out = calculateSummary([
        tx({ type: 'income', amount_funded: 500 }),
        tx({ type: 'income', amount_funded: 100, status: 'cancelled' }),
      ]);
      expect(out.totalIncome).toBe(500);
      expect(out.incomeCount).toBe(1);
    });

    it('treats missing amount_funded as 0', () => {
      const out = calculateSummary([tx({ type: 'income', amount_funded: undefined })]);
      expect(out.totalIncome).toBe(0);
      expect(out.incomeCount).toBe(1);
    });

    it('returns zeros for empty input', () => {
      const out = calculateSummary([]);
      expect(out.totalIncome).toBe(0);
      expect(out.totalExpenses).toBe(0);
      expect(out.netPosition).toBe(0);
    });
  });

  describe('generateIncomeSummary', () => {
    it('only includes income transactions', () => {
      const out = generateIncomeSummary([
        tx({ type: 'income', amount_funded: 200 }),
        tx({ type: 'expense', amount_funded: 999 }),
      ]);
      expect(out.reportType).toBe('income-summary');
      expect(out.totalIncome).toBe(200);
      expect(out.transactionCount).toBe(1);
      expect(out.transactions).toHaveLength(1);
    });

    it('groups by category with name lookup', () => {
      const out = generateIncomeSummary([tx({ category_id: 'cat-1', amount_funded: 100 })], {
        categories,
      });
      expect(out.byCategory[0].label).toBe('Donations');
    });
  });

  describe('generateExpenseSummary', () => {
    it('only includes expense transactions', () => {
      const out = generateExpenseSummary([
        tx({ type: 'expense', amount_funded: 300 }),
        tx({ type: 'income', amount_funded: 999 }),
      ]);
      expect(out.totalExpenses).toBe(300);
      expect(out.transactionCount).toBe(1);
    });

    it('groups by funding source with lookup', () => {
      const fundingSources = [{ $id: 'fs-1', name: 'UNICEF' }];
      const out = generateExpenseSummary(
        [tx({ type: 'expense', funding_source_id: 'fs-1', amount_funded: 100 })],
        { fundingSources },
      );
      expect(out.byFundingSource[0].label).toBe('UNICEF');
    });
  });

  describe('generateProfitLoss', () => {
    it('computes net result and isProfit flag', () => {
      const out = generateProfitLoss([
        tx({ type: 'income', amount_funded: 500 }),
        tx({ type: 'expense', amount_funded: 300 }),
      ]);
      expect(out.totalIncome).toBe(500);
      expect(out.totalExpenses).toBe(300);
      expect(out.netResult).toBe(200);
      expect(out.isProfit).toBe(true);
    });

    it('isProfit is false when expenses exceed income', () => {
      const out = generateProfitLoss([
        tx({ type: 'income', amount_funded: 100 }),
        tx({ type: 'expense', amount_funded: 300 }),
      ]);
      expect(out.isProfit).toBe(false);
    });
  });

  describe('generateCashFlow', () => {
    it('computes inflows, outflows, and cumulative', () => {
      const out = generateCashFlow(
        [
          tx({ type: 'income', amount_funded: 500, date: '2025-01-15T12:00:00Z' }),
          tx({ type: 'expense', amount_funded: 200, date: '2025-01-20T12:00:00Z' }),
        ],
        { dateFrom: '2025-01-01', dateTo: '2025-02-01' },
      );
      expect(out.totalInflow).toBe(500);
      expect(out.totalOutflow).toBe(200);
      expect(out.netCashMovement).toBe(300);
      // cumulative on the last month equals net movement
      const last = out.byMonth[out.byMonth.length - 1];
      expect(last.cumulative).toBe(300);
    });
  });

  describe('generateBalanceSheet', () => {
    it('sums active funding source balances and inventory value', () => {
      const out = generateBalanceSheet({
        fundingSources: [
          { name: 'UNICEF', type: 'donor', status: 'active', current_balance: 1000 },
          { name: 'Old', type: 'donor', status: 'inactive', current_balance: 999 },
        ],
        inventoryItems: [
          { item_name: 'Seeds', unit_cost: 5, quantity: 10, unit: 'kg', status: 'in_stock' },
          { item_name: 'Old', unit_cost: 5, quantity: 10, unit: 'kg', status: 'disposed' },
        ],
      });
      expect(out.assets.totalFundingBalances).toBe(1000);
      expect(out.assets.totalInventoryValue).toBe(50);
      expect(out.assets.total).toBe(1050);
      expect(out.netPosition).toBe(1050);
      expect(out.isMVPSimplified).toBe(true);
    });

    it('handles empty inputs', () => {
      const out = generateBalanceSheet({});
      expect(out.assets.total).toBe(0);
      expect(out.netPosition).toBe(0);
    });
  });

  describe('generateDonorFundUsage', () => {
    it('returns an error object when no funding source is provided', () => {
      const out = generateDonorFundUsage([], null);
      expect(out.error).toBe('No funding source selected');
      expect(out.totalSpent).toBe(0);
    });

    it('filters to transactions linked to the funding source', () => {
      const fs = {
        $id: 'fs-1',
        name: 'UNICEF',
        type: 'donor',
        total_received: 1000,
        current_balance: 700,
        status: 'active',
      };
      const out = generateDonorFundUsage(
        [
          tx({ type: 'expense', funding_source_id: 'fs-1', amount_funded: 300 }),
          tx({ type: 'expense', funding_source_id: 'fs-2', amount_funded: 999 }),
          tx({ type: 'income', funding_source_id: 'fs-1', amount_funded: 1000 }),
        ],
        fs,
      );
      expect(out.totalSpent).toBe(300);
      expect(out.totalReceived).toBe(1000);
      expect(out.remainingBalance).toBe(700);
      expect(out.utilizationRate).toBe('30.0');
      expect(out.transactions).toHaveLength(2);
    });

    it('utilizationRate is 0 when total_received is 0', () => {
      const fs = {
        $id: 'fs-1',
        name: 'X',
        type: 'donor',
        total_received: 0,
        current_balance: 0,
        status: 'active',
      };
      const out = generateDonorFundUsage([], fs);
      expect(out.utilizationRate).toBe(0);
    });
  });

  describe('flattenTransactionsForExport', () => {
    it('flattens transactions with category and funding source names', () => {
      const fundingSources = [{ $id: 'fs-1', name: 'UNICEF' }];
      const out = flattenTransactionsForExport(
        [tx({ category_id: 'cat-1', funding_source_id: 'fs-1' })],
        { categories, fundingSources },
      );
      expect(out[0].Category).toBe('Donations');
      expect(out[0]['Funding Source']).toBe('UNICEF');
      expect(out[0]['Amount Funded']).toBe(100);
      expect(out[0].Date).toBe('2025-01-15');
    });

    it('uses Uncategorized for unknown category', () => {
      const out = flattenTransactionsForExport([tx({ category_id: 'cat-x' })], { categories });
      expect(out[0].Category).toBe('Uncategorized');
    });

    it('handles empty transactions', () => {
      expect(flattenTransactionsForExport([])).toEqual([]);
    });
  });
});
