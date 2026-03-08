import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const errorHandler = useErrorHandler();

export const useLendingStore = defineStore('lending', {
  state: () => ({
    loans: [],
    currentLoan: null,
    payments: [],
    repaymentSchedule: [],
    isLoading: false,
    lastFetched: null,
    dashboardStats: {
      totalOutstanding: 0,
      activeLoansCount: 0,
      overdueLoansCount: 0,
    },
  }),

  getters: {
    getLoanById: (state) => (id) => state.loans.find((loan) => loan.$id === id),
    activeLoans: (state) => state.loans.filter((loan) => loan.status === 'active'),
    overdueLoans: (state) =>
      state.loans.filter((loan) => {
        if (loan.status !== 'active' || !loan.next_due_date) return false;
        return new Date(loan.next_due_date) < new Date();
      }),
  },

  actions: {
    /**
     * Load all loans with optional filtering
     */
    async fetchLoans(filters = {}) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const queries = [Query.orderDesc('$createdAt')];

        if (filters.status) {
          queries.push(Query.equal('status', filters.status));
        }

        if (filters.borrower_id) {
          queries.push(Query.equal('borrower_id', filters.borrower_id));
        }

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'loans',
          queries,
        });

        this.loans = response.rows;
        this.lastFetched = new Date();
        this.calculateDashboardStats();

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching loans:', error);
        errorHandler.notifyError('Failed to load loans.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch a single loan with its payments and schedule
     */
    async fetchLoanDetails(loanId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Fetch loan
        const loanResponse = await tables.getRow({
          databaseId: dbId,
          tableId: 'loans',
          rowId: loanId,
        });
        this.currentLoan = loanResponse;

        // Fetch payments
        const paymentsResponse = await tables.listRows({
          databaseId: dbId,
          tableId: 'loan_payments',
          queries: [Query.equal('loan_id', loanId), Query.orderDesc('payment_date')],
        });
        this.payments = paymentsResponse.rows;

        // Fetch schedule
        const scheduleResponse = await tables.listRows({
          databaseId: dbId,
          tableId: 'repayment_schedule',
          queries: [Query.equal('loan_id', loanId), Query.orderAsc('installment_number')],
        });
        this.repaymentSchedule = scheduleResponse.rows;

        return { success: true, data: loanResponse };
      } catch (error) {
        console.error('Error fetching loan details:', error);
        errorHandler.notifyError('Failed to load loan details.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new loan
     */
    async createLoan(loanData, scheduleData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Create the loan record
        const newLoan = await tables.createRow({
          databaseId: dbId,
          tableId: 'loans',
          rowId: 'unique()',
          data: loanData,
        });

        // Create repayment schedule records
        for (const installment of scheduleData) {
          await tables.createRow({
            databaseId: dbId,
            tableId: 'repayment_schedule',
            rowId: 'unique()',
            data: {
              ...installment,
              loan_id: newLoan.$id,
            },
          });
        }

        this.loans.unshift(newLoan);
        this.calculateDashboardStats();

        errorHandler.notifySuccess('Loan created successfully');
        return { success: true, data: newLoan };
      } catch (error) {
        console.error('Error creating loan:', error);
        errorHandler.notifyError('Failed to create loan.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Record a payment
     */
    async recordPayment(paymentData, financeTransactionId = null) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const loanId = paymentData.loan_id;

        // 1. Create the payment record
        const paymentRecord = {
          ...paymentData,
        };
        if (financeTransactionId) {
          paymentRecord.finance_transaction_id = financeTransactionId;
        }

        const newPayment = await tables.createRow({
          databaseId: dbId,
          tableId: 'loan_payments',
          rowId: 'unique()',
          data: paymentRecord,
        });

        // 2. Update the loan's outstanding balance
        const loan = this.currentLoan || this.getLoanById(loanId);
        if (!loan) throw new Error('Loan not found');

        const newBalance = Math.max(0, loan.outstanding_balance - paymentData.amount);
        let newStatus = loan.status;

        if (newBalance <= 0) {
          newStatus = 'paid';
        }

        const updatedLoan = await tables.updateRow({
          databaseId: dbId,
          tableId: 'loans',
          rowId: loanId,
          data: {
            outstanding_balance: newBalance,
            status: newStatus,
            // next_due_date would ideally be updated here based on schedule logic
          },
        });

        // Update local state
        if (this.currentLoan && this.currentLoan.$id === loanId) {
          this.currentLoan = updatedLoan;
          this.payments.unshift(newPayment);
        }

        const index = this.loans.findIndex((l) => l.$id === loanId);
        if (index !== -1) {
          this.loans[index] = updatedLoan;
        }

        this.calculateDashboardStats();

        errorHandler.notifySuccess('Payment recorded successfully');
        return { success: true, data: newPayment };
      } catch (error) {
        console.error('Error recording payment:', error);
        errorHandler.notifyError('Failed to record payment.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    calculateDashboardStats() {
      const active = this.activeLoans;
      const overdue = this.overdueLoans;

      this.dashboardStats = {
        totalOutstanding: active.reduce((sum, loan) => sum + (loan.outstanding_balance || 0), 0),
        activeLoansCount: active.length,
        overdueLoansCount: overdue.length,
      };
    },
  },
});
