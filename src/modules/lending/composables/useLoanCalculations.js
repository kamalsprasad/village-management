import { addMonths, addWeeks, isWeekend, nextMonday } from 'date-fns';

export function useLoanCalculations() {
  /**
   * Calculate total interest using simple interest formula
   * Total Interest = Principal × (Rate/10000) × (Term/12)
   * Note: rate is in basis points (e.g., 500 = 5.00%)
   * @param {number} principal - Principal amount in ngwee
   * @param {number} rateBps - Interest rate in basis points (1/100th of a percent)
   * @param {number} termMonths - Loan term in months
   * @returns {number} Total interest in ngwee
   */
  const calculateTotalInterest = (principal, rateBps, termMonths) => {
    // Math.round to avoid floating point issues with currency
    return Math.round(principal * (rateBps / 10000) * (termMonths / 12));
  };

  /**
   * Calculate payment amount per period
   * @param {number} principal - Principal amount in ngwee
   * @param {number} totalInterest - Total interest in ngwee
   * @param {number} numPayments - Total number of payments
   * @returns {number} Payment amount per period in ngwee
   */
  const calculatePaymentAmount = (principal, totalInterest, numPayments) => {
    if (numPayments === 0) return 0;
    return Math.round((principal + totalInterest) / numPayments);
  };

  /**
   * Determine the total number of payments based on term and frequency
   */
  const calculateNumberOfPayments = (termMonths, frequency) => {
    switch (frequency) {
      case 'weekly':
        return termMonths * 4; // Approximation
      case 'biweekly':
        return termMonths * 2;
      case 'monthly':
      default:
        return termMonths;
    }
  };

  /**
   * Generate the repayment schedule array
   */
  const generateRepaymentSchedule = (
    principal,
    totalInterest,
    numPayments,
    frequency,
    disbursementDate,
  ) => {
    const schedule = [];
    const paymentAmount = calculatePaymentAmount(principal, totalInterest, numPayments);
    let currentDate = new Date(disbursementDate);

    let remainingTotal = principal + totalInterest;

    for (let i = 1; i <= numPayments; i++) {
      // Calculate next date
      switch (frequency) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
        default:
          currentDate = addMonths(currentDate, 1);
          break;
      }

      // Skip weekends (move to next Monday)
      if (isWeekend(currentDate)) {
        currentDate = nextMonday(currentDate);
      }

      // Handle last payment rounding differences
      let amount = paymentAmount;
      if (i === numPayments) {
        amount = remainingTotal; // Whatever is left
      }

      schedule.push({
        installment_number: i,
        due_date: currentDate.toISOString(),
        amount: amount,
        status: 'pending',
      });

      remainingTotal -= amount;
    }

    return schedule;
  };

  return {
    calculateTotalInterest,
    calculatePaymentAmount,
    calculateNumberOfPayments,
    generateRepaymentSchedule,
  };
}
