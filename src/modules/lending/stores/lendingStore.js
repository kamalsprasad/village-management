import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';

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

        const queries = [
          Query.orderDesc('$createdAt'),
          Query.select([
            '$id',
            'borrower_id.*',
            'principal_amount',
            'interest_rate',
            'term_months',
            'repayment_frequency',
            'collateral_description',
            'purpose',
            'disbursement_date',
            'status',
            'outstanding_balance',
            'total_repayment',
            'payment_amount',
            'next_due_date',
            '$createdAt',
            '$updatedAt',
          ]),
        ];

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
          queries: [
            Query.select([
              '$id',
              'borrower_id.*',
              'principal_amount',
              'interest_rate',
              'term_months',
              'repayment_frequency',
              'collateral_description',
              'purpose',
              'disbursement_date',
              'status',
              'outstanding_balance',
              'total_repayment',
              'payment_amount',
              'next_due_date',
              '$createdAt',
              '$updatedAt',
            ]),
          ],
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
     * Automatically creates a finance transaction for the repayment
     */
    async recordPayment(paymentData) {
      this.isLoading = true;
      let financeTransactionId = null;

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const loanId = paymentData.loan_id;

        // Get loan details for transaction description
        const loan = this.currentLoan || this.getLoanById(loanId);
        if (!loan) throw new Error('Loan not found');

        const borrowerName = loan.borrower_id
          ? `${loan.borrower_id.first_name || ''} ${loan.borrower_id.last_name || ''}`.trim()
          : 'Unknown Borrower';

        // 1. Create finance transaction for loan repayment
        const financeStore = useFinanceStore();

        // Fetch or find "Loan Repayment" category
        await financeStore.fetchCategories();
        const loanRepaymentCategory = financeStore.incomeCategories.find(
          (cat) => cat.name === 'Loan Repayment',
        );

        if (!loanRepaymentCategory) {
          console.warn('Loan Repayment category not found, transaction will not be created');
        } else {
          // Find Internal - Loan Repayments funding source
          await financeStore.fetchFundingSources();
          const fundingSource = financeStore.fundingSources.find(
            (source) => source.name === 'Internal - Loan Repayments',
          );

          // Create the finance transaction
          const transactionResult = await financeStore.createTransaction({
            type: 'income',
            amount_funded: paymentData.amount / 100, // Convert ngwee to ZMW
            amount_needed: paymentData.amount / 100,
            category_id: loanRepaymentCategory.$id,
            source_module: 'Village',
            payment_method: paymentData.payment_method,
            date: paymentData.payment_date || new Date().toISOString(),
            funding_source_id: fundingSource?.$id || null,
            description: `Payment for loan ${loanId.substring(0, 8)} - ${borrowerName}`,
            status: 'completed',
          });

          if (transactionResult.success) {
            financeTransactionId = transactionResult.data.$id;
          } else {
            console.warn('Failed to create finance transaction:', transactionResult.error);
          }
        }

        // 2. Create the payment record
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

        // 3. Update the loan's outstanding balance
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
        return { success: true, data: newPayment, financeTransactionId };
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
