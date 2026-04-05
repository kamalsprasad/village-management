import { ref } from 'vue';
import { tables } from 'src/boot/appwrite';
import { ID } from 'appwrite';

/**
 * Composable for seeding finance sample data (Epic 2)
 *
 * Generates 1.5 years of realistic financial data, including:
 * - Finance Categories
 * - Funding Sources
 * - Finance Transactions (Income/Expense)
 * - Loans, Repayment Schedules, and Loan Payments
 *
 * Designed to be called from useSampleData.js after residents are created.
 */
export function useFinanceSampleData() {
  const isFinanceSeeding = ref(false);
  const financeSeedingProgress = ref(0);
  const financeSeedingStatus = ref('');

  // Generate an array of dates representing the last 18 months
  const generateMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 18; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d);
    }
    return months;
  };

  const seedFinanceData = async (residentIds) => {
    isFinanceSeeding.value = true;
    financeSeedingProgress.value = 0;
    financeSeedingStatus.value = 'Preparing finance data...';

    try {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

      // 1. Create Finance Categories
      financeSeedingStatus.value = 'Creating finance categories...';
      const categories = await createCategories(dbId);
      financeSeedingProgress.value = 0.1;

      // 2. Create Funding Sources
      financeSeedingStatus.value = 'Creating funding sources...';
      const fundingSources = await createFundingSources(dbId);
      financeSeedingProgress.value = 0.2;

      // 3. Generate 1.5 years of Transactions
      financeSeedingStatus.value = 'Generating 1.5 years of transactions...';
      const months = generateMonths();
      const transactions = [];

      for (let i = 0; i < months.length; i++) {
        const monthDate = months[i];
        const monthlyTransactions = generateMonthlyTransactions(
          monthDate,
          categories,
          fundingSources,
        );
        transactions.push(...monthlyTransactions);
        financeSeedingProgress.value = 0.2 + (i / months.length) * 0.4; // Up to 60%
      }

      // Batch insert transactions (Chunking to avoid rate limits/timeouts)
      financeSeedingStatus.value = 'Saving transactions to database...';
      await batchInsert(dbId, 'finance_transactions', transactions);
      financeSeedingProgress.value = 0.7;

      // 4. Generate Loans & Repayments
      financeSeedingStatus.value = 'Creating loans and repayment schedules...';
      const { loans, schedules, payments, loanTransactions } = generateLoansData(
        residentIds,
        categories,
      );

      // Insert Loans
      const createdLoans = await batchInsert(dbId, 'loans', loans);

      // Map generated Loan IDs to Schedules and Payments
      const finalSchedules = schedules.map((s) => {
        // Need to find which original loan this schedule belongs to
        // We stored a temporary index in the generator to map it back
        const actualLoanId = createdLoans.find((cl) => cl.tempIndex === s.loanTempIndex).$id;
        return { ...s.data, loan_id: actualLoanId };
      });

      const finalPayments = payments.map((p) => {
        const actualLoanId = createdLoans.find((cl) => cl.tempIndex === p.loanTempIndex).$id;
        return { ...p.data, loan_id: actualLoanId };
      });

      financeSeedingProgress.value = 0.8;

      // Insert Schedules
      await batchInsert(dbId, 'repayment_schedule', finalSchedules);
      financeSeedingProgress.value = 0.85;

      // Insert Loan Transactions First (to get IDs for payments)
      const createdLoanTransactions = await batchInsert(
        dbId,
        'finance_transactions',
        loanTransactions.map((lt) => lt.data),
      );

      // Link Transactions to Payments
      const linkedPayments = finalPayments.map((p, index) => {
        return {
          ...p,
          finance_transaction_id: createdLoanTransactions[index].$id,
        };
      });

      // Insert Payments
      await batchInsert(dbId, 'loan_payments', linkedPayments);

      financeSeedingProgress.value = 1.0;
      financeSeedingStatus.value = 'Finance data seeded successfully!';
      return { success: true };
    } catch (error) {
      console.error('Error seeding finance data:', error);
      financeSeedingStatus.value = 'Error loading finance data';
      return { success: false, error: error.message };
    } finally {
      isFinanceSeeding.value = false;
    }
  };

  // --- Helpers ---

  const createCategories = async (dbId) => {
    const catsToCreate = [
      {
        name: 'Community Contributions',
        type: 'income',
        subcategories: ['Monthly Fee', 'Special Levy'],
      },
      {
        name: 'Grants & Donations',
        type: 'income',
        subcategories: ['Government Grant', 'NGO Donation'],
      },
      { name: 'Farming Revenue', type: 'income', subcategories: ['Crop Sales', 'Livestock'] },
      { name: 'Loan Repayment', type: 'income', subcategories: ['Principal', 'Interest'] },
      {
        name: 'Infrastructure Maintenance',
        type: 'expense',
        subcategories: ['Water Pump', 'Solar Panels', 'Road Repair'],
      },
      {
        name: 'Education Support',
        type: 'expense',
        subcategories: ['School Supplies', 'Teacher Allowance'],
      },
      { name: 'Health Clinic', type: 'expense', subcategories: ['Medicines', 'Equipment'] },
      { name: 'Administration', type: 'expense', subcategories: ['Office Supplies', 'Travel'] },
      { name: 'Loan Disbursement', type: 'expense', subcategories: ['Agriculture', 'Business'] },
    ];

    const createdCats = await Promise.all(
      catsToCreate.map((cat) =>
        tables.createRow({
          databaseId: dbId,
          tableId: 'finance_categories',
          rowId: ID.unique(),
          data: cat,
        }),
      ),
    );
    return createdCats;
  };

  const createFundingSources = async (dbId) => {
    const sourcesToCreate = [
      {
        name: 'Village General Fund',
        type: 'income',
        total_received: 50000,
        current_balance: 15500,
        date_received: new Date(new Date().setMonth(new Date().getMonth() - 18))
          .toISOString()
          .split('T')[0],
        status: 'active',
      },
      {
        name: 'Water Sanitation Grant 2024',
        type: 'grant',
        total_received: 120000,
        current_balance: 45000,
        date_received: new Date(new Date().setMonth(new Date().getMonth() - 14))
          .toISOString()
          .split('T')[0],
        restrictions: 'Strictly for water infrastructure repair and maintenance',
        status: 'active',
      },
      {
        name: 'Rotary Education Initiative',
        type: 'donation',
        total_received: 30000,
        current_balance: 0,
        date_received: new Date(new Date().setMonth(new Date().getMonth() - 12))
          .toISOString()
          .split('T')[0],
        restrictions: 'School supplies and teacher allowances',
        status: 'depleted',
      },
      {
        name: 'Micro-Finance Seed Fund',
        type: 'grant',
        total_received: 80000,
        current_balance: 32000,
        date_received: new Date(new Date().setMonth(new Date().getMonth() - 16))
          .toISOString()
          .split('T')[0],
        restrictions: 'For issuing village loans',
        status: 'active',
      },
    ];

    const createdSources = await Promise.all(
      sourcesToCreate.map((source) =>
        tables.createRow({
          databaseId: dbId,
          tableId: 'funding_sources',
          rowId: ID.unique(),
          data: source,
        }),
      ),
    );
    return createdSources;
  };

  const generateMonthlyTransactions = (monthDate, categories, fundingSources) => {
    const transactions = [];
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getCatId = (name) => categories.find((c) => c.name === name)?.$id;
    const getSourceId = (name) => fundingSources.find((s) => s.name === name)?.$id;

    // Helper to generate a random date in this month
    const randomDateInMonth = () => {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      return new Date(Date.UTC(year, month, day)).toISOString();
    };

    // 1. Regular Income: Community Contributions
    transactions.push({
      type: 'income',
      amount_needed: 2500,
      amount_funded: Math.round(2500 + Math.random() * 500),
      payment_method: 'Cash',
      category_id: getCatId('Community Contributions'),
      source_module: 'Village',
      funding_source_id: getSourceId('Village General Fund'),
      date: randomDateInMonth(),
      description: `Monthly household contributions collection for ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      status: 'completed',
    });

    // 2. Regular Expense: Administration
    transactions.push({
      type: 'expense',
      amount_needed: Math.round(800 + Math.random() * 200),
      amount_funded: Math.round(800 + Math.random() * 200),
      payment_method: 'Bank Transfer',
      category_id: getCatId('Administration'),
      source_module: 'Village',
      funding_source_id: getSourceId('Village General Fund'),
      date: randomDateInMonth(),
      description: 'Monthly office supplies and transport allowance',
      status: 'completed',
    });

    // 3. Periodic Expense: Infrastructure Maintenance (Water/Solar)
    if (Math.random() > 0.5) {
      // 50% chance each month
      const amount = Math.round(1500 + Math.random() * 3000);
      transactions.push({
        type: 'expense',
        amount_needed: amount,
        amount_funded: amount,
        payment_method: 'Bank Transfer',
        category_id: getCatId('Infrastructure Maintenance'),
        source_module: 'Village',
        funding_source_id: getSourceId('Water Sanitation Grant 2024'),
        date: randomDateInMonth(),
        description: 'Routine maintenance on communal water pump',
        status: 'completed',
      });
    }

    // 4. Periodic Expense: Education Support
    if (
      monthDate.getTime() > new Date(new Date().setMonth(new Date().getMonth() - 12)).getTime() &&
      Math.random() > 0.4
    ) {
      const amount = Math.round(2000 + Math.random() * 1000);
      transactions.push({
        type: 'expense',
        amount_needed: amount,
        amount_funded: amount,
        payment_method: 'Cash',
        category_id: getCatId('Education Support'),
        source_module: 'School',
        funding_source_id: getSourceId('Rotary Education Initiative'),
        date: randomDateInMonth(),
        description: 'Teacher allowances and student supplies',
        status: 'completed',
      });
    }

    // 5. Seasonal Income: Farming Revenue (Higher in harvest months: May-July)
    if (month >= 4 && month <= 6) {
      const amount = Math.round(5000 + Math.random() * 8000);
      transactions.push({
        type: 'income',
        amount_needed: amount,
        amount_funded: amount,
        payment_method: 'Mobile Money',
        category_id: getCatId('Farming Revenue'),
        source_module: 'Farm',
        funding_source_id: getSourceId('Village General Fund'),
        date: randomDateInMonth(),
        description: 'Maize and groundnut harvest sales',
        status: 'completed',
      });
    }

    return transactions;
  };

  const generateLoansData = (residentIds, categories) => {
    const loans = [];
    const schedules = [];
    const payments = [];
    const loanTransactions = [];

    const getCatId = (name) => categories.find((c) => c.name === name)?.$id;
    const today = new Date();

    // We will create 3 loans.
    // 1. Fully Paid (from 15 months ago, 6 month term)
    // 2. Active, On Track (from 6 months ago, 12 month term)
    // 3. Active, Overdue (from 8 months ago, 12 month term)

    if (residentIds.length < 3) return { loans, schedules, payments, loanTransactions }; // Safety

    // Loan 1: Fully Paid
    const l1StartDate = new Date(today.getFullYear(), today.getMonth() - 15, 5);
    const l1Principal = 3000;
    const l1Interest = 10;
    const l1Term = 6;
    const l1Total = Math.round(l1Principal * (1 + l1Interest / 100));
    const l1Payment = Math.round(l1Total / l1Term);

    loans.push({
      tempIndex: 0,
      data: {
        borrower_id: residentIds[0],
        principal_amount: l1Principal,
        interest_rate: l1Interest,
        term_months: l1Term,
        repayment_frequency: 'monthly',
        collateral_description: '2 Cows',
        purpose: 'farm',
        disbursement_date: l1StartDate.toISOString().split('T')[0],
        status: 'paid_off',
        outstanding_balance: 0,
        total_repayment: l1Total,
        payment_amount: l1Payment,
        next_due_date: null,
      },
    });

    // Loan 2: Active, On Track
    const l2StartDate = new Date(today.getFullYear(), today.getMonth() - 6, 12);
    const l2Principal = 5000;
    const l2Interest = 12;
    const l2Term = 12;
    const l2Total = Math.round(l2Principal * (1 + l2Interest / 100));
    const l2Payment = Math.round(l2Total / l2Term);
    const l2MonthsPassed = 6;
    const l2Outstanding = l2Total - l2Payment * l2MonthsPassed;

    loans.push({
      tempIndex: 1,
      data: {
        borrower_id: residentIds[1],
        principal_amount: l2Principal,
        interest_rate: l2Interest,
        term_months: l2Term,
        repayment_frequency: 'monthly',
        collateral_description: 'Bicycle and farming equipment',
        purpose: 'business',
        disbursement_date: l2StartDate.toISOString().split('T')[0],
        status: 'active',
        outstanding_balance: l2Outstanding,
        total_repayment: l2Total,
        payment_amount: l2Payment,
        next_due_date: new Date(today.getFullYear(), today.getMonth() + 1, 12)
          .toISOString()
          .split('T')[0],
      },
    });

    // Loan 3: Active, Overdue
    const l3StartDate = new Date(today.getFullYear(), today.getMonth() - 8, 20);
    const l3Principal = 2000;
    const l3Interest = 15;
    const l3Term = 12;
    const l3Total = Math.round(l3Principal * (1 + l3Interest / 100));
    const l3Payment = Math.round(l3Total / l3Term);
    const l3MonthsPaid = 4; // Missed last 4 months
    const l3Outstanding = l3Total - l3Payment * l3MonthsPaid;

    loans.push({
      tempIndex: 2,
      data: {
        borrower_id: residentIds[2],
        principal_amount: l3Principal,
        interest_rate: l3Interest,
        term_months: l3Term,
        repayment_frequency: 'monthly',
        collateral_description: 'Goats',
        purpose: 'medical',
        disbursement_date: l3StartDate.toISOString().split('T')[0],
        status: 'active',
        outstanding_balance: l3Outstanding,
        total_repayment: l3Total,
        payment_amount: l3Payment,
        next_due_date: new Date(today.getFullYear(), today.getMonth() - 3, 20)
          .toISOString()
          .split('T')[0], // Overdue
      },
    });

    // Generate schedules and payments for all 3 loans
    const generateSchedules = (loanTempIdx, startDate, term, paymentAmount, monthsPaid) => {
      for (let i = 1; i <= term; i++) {
        const dueDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + i,
          startDate.getDate(),
        );
        const isPaid = i <= monthsPaid;
        const isOverdue = !isPaid && dueDate < today;

        let status = 'pending';
        if (isPaid) status = 'paid';
        if (isOverdue) status = 'overdue';

        schedules.push({
          loanTempIndex: loanTempIdx,
          data: {
            installment_number: i,
            due_date: dueDate.toISOString().split('T')[0],
            amount: paymentAmount,
            status: status,
            paid_date: isPaid ? dueDate.toISOString().split('T')[0] : null,
          },
        });

        if (isPaid) {
          payments.push({
            loanTempIndex: loanTempIdx,
            data: {
              amount: paymentAmount,
              payment_date: dueDate.toISOString().split('T')[0],
              payment_method: 'Cash',
              notes: `Installment ${i}/${term}`,
            },
          });

          loanTransactions.push({
            loanTempIndex: loanTempIdx,
            data: {
              type: 'income',
              amount_needed: paymentAmount,
              amount_funded: paymentAmount,
              payment_method: 'Cash',
              category_id: getCatId('Loan Repayment'),
              source_module: 'Finance',
              date: dueDate.toISOString(),
              description: `Loan repayment installment ${i}`,
              status: 'completed',
            },
          });
        }
      }
    };

    generateSchedules(0, l1StartDate, l1Term, l1Payment, l1Term); // Fully paid
    generateSchedules(1, l2StartDate, l2Term, l2Payment, l2MonthsPassed); // On track
    generateSchedules(2, l3StartDate, l3Term, l3Payment, l3MonthsPaid); // Overdue

    return { loans, schedules, payments, loanTransactions };
  };

  const batchInsert = async (dbId, tableId, items, batchSize = 10) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map((item, idx) =>
        tables
          .createRow({
            databaseId: dbId,
            tableId: tableId,
            rowId: ID.unique(),
            data: item.data || item,
          })
          .catch((err) => {
            console.error(
              `Error inserting into ${tableId}, batch item ${i + idx}:`,
              item.data || item,
            );
            throw err;
          }),
      );

      const batchResults = await Promise.all(batchPromises);
      // We map back the tempIndex so we can link them later
      batchResults.forEach((res, idx) => {
        if (batch[idx].tempIndex !== undefined) {
          res.tempIndex = batch[idx].tempIndex;
        }
      });

      results.push(...batchResults);

      // Small delay between batches to prevent rate limiting
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    return results;
  };

  return {
    seedFinanceData,
    isFinanceSeeding,
    financeSeedingProgress,
    financeSeedingStatus,
  };
}
