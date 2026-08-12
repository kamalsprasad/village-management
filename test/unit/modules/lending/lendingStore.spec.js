import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLendingStore } from 'src/modules/lending/stores/lendingStore';
import { mockTables } from 'test/helpers/appwrite-mock';

const loan = (over = {}) => ({
  $id: 'loan-1',
  borrower_id: { $id: 'r1', first_name: 'John', last_name: 'Doe' },
  principal_amount: 5000,
  interest_rate: 10,
  term_months: 12,
  repayment_frequency: 'monthly',
  collateral_description: 'Motorbike',
  purpose: 'Business expansion',
  disbursement_date: '2025-01-15T12:00:00Z',
  status: 'active',
  outstanding_balance: 4500,
  total_repayment: 500,
  payment_amount: 450,
  next_due_date: '2025-02-15',
  ...over,
});

describe('lendingStore', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useLendingStore();
    vi.clearAllMocks();
  });

  describe('fetchLoans', () => {
    it('fetches loans and updates state', async () => {
      const loans = [loan()];
      mockTables.listRows.mockResolvedValue({ rows: loans });

      const result = await store.fetchLoans();

      expect(result.success).toBe(true);
      expect(store.loans).toEqual(loans);
      expect(store.lastFetched).toBeInstanceOf(Date);
    });

    it('applies status filter', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });

      await store.fetchLoans({ status: 'active' });

      expect(mockTables.listRows).toHaveBeenCalled();
    });

    it('applies borrower_id filter', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });

      await store.fetchLoans({ borrower_id: 'r1' });

      expect(mockTables.listRows).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchLoans();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchLoanDetails', () => {
    it('fetches loan with payments and schedule', async () => {
      const loanRow = loan();
      const payments = [{ $id: 'p1', amount: 500, payment_date: '2025-02-15' }];
      const schedule = [{ $id: 's1', installment_number: 1, amount_due: 450 }];

      mockTables.getRow.mockResolvedValue(loanRow);
      mockTables.listRows
        .mockResolvedValueOnce({ rows: payments }) // payments
        .mockResolvedValueOnce({ rows: schedule }); // schedule

      const result = await store.fetchLoanDetails('loan-1');

      expect(result.success).toBe(true);
      expect(store.currentLoan).toEqual(loanRow);
      expect(store.payments).toEqual(payments);
      expect(store.repaymentSchedule).toEqual(schedule);
    });

    it('returns error on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchLoanDetails('loan-1');

      expect(result.success).toBe(false);
    });
  });

  describe('createLoan', () => {
    it('creates a loan and repayment schedule', async () => {
      const newLoan = loan({ $id: 'loan-new' });
      mockTables.createRow.mockResolvedValue(newLoan);

      const scheduleData = [
        { installment_number: 1, amount_due: 450 },
        { installment_number: 2, amount_due: 450 },
      ];

      const result = await store.createLoan(
        { principal_amount: 5000, status: 'active' },
        scheduleData,
      );

      expect(result.success).toBe(true);
      // createRow called 3 times: 1 loan + 2 schedule rows
      expect(mockTables.createRow).toHaveBeenCalledTimes(3);
      expect(store.loans[0]).toEqual(newLoan);
    });

    it('returns error on loan creation failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('db error'));

      const result = await store.createLoan({}, []);

      expect(result.success).toBe(false);
    });
  });

  describe('calculateDashboardStats', () => {
    it('computes stats from current loans', () => {
      store.loans = [
        loan({ $id: 'l1', status: 'active', outstanding_balance: 1000 }),
        loan({ $id: 'l2', status: 'active', outstanding_balance: 2000 }),
        loan({ $id: 'l3', status: 'paid', outstanding_balance: 0 }),
      ];

      store.calculateDashboardStats();

      expect(store.dashboardStats.activeLoansCount).toBe(2);
      expect(store.dashboardStats.totalOutstanding).toBe(3000);
    });
  });
});
