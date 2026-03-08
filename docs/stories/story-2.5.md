# Story 2.5: Village Lending - Loan Management

**Epic:** 2 - Financial Management and Inventory Tracking  
**Story ID:** 2.5  
**Status:** Ready for Development  
**Date:** 2025-12-08  
**Author:** Kamal S. Prasad

---

## User Story

As a **Finance Manager**, I want to manage village loans to residents, so that we can support community members while tracking repayments and maintaining financial sustainability.

---

## Summary

This story implements a comprehensive village lending system as a self-contained module within the Finance section. The module manages the complete loan lifecycle from application through repayment, with automated calculations for interest and repayment schedules. It integrates with the existing financial transaction system and provides dashboard widgets for loan portfolio oversight.

---

## Acceptance Criteria

### AC1: Navigation Integration

- [x] Finance section navigation includes a single "Lending" menu item in the drawer
- [x] Lending dashboard uses inner tabs/sub-navigation for: "All Loans", "Create Loan", "Reports"
- [x] Navigation respects RBAC (Finance Manager and Admin roles only)

### AC2: Loans List Page

- [x] Displays all loans in a table format
- [x] Columns: Borrower Name, Principal Amount, Interest Rate, Status, Outstanding Balance, Next Due Date
- [x] Search/filter by borrower name, loan status, and date range
- [x] Pagination for large datasets (50 loans per page)
- [x] Click on loan row navigates to loan detail page

### AC3: Loan Creation Form

- [x] "Create Loan" button opens modal/form with fields:
  - Borrower (dropdown/search from residents)
  - Loan Amount (numeric, min: 0, max: 100,000 ZMW)
  - Interest Rate (percentage, min: 0%, max: 50%)
  - Loan Term (months, min: 1, max: 60)
  - Repayment Frequency (dropdown: Monthly, Bi-weekly, Weekly)
  - Collateral Description (textarea, optional)
  - Purpose (dropdown: Farm Inputs, Education, Medical, Business, Other)
  - Disbursement Date (date picker, default: today)
- [x] Form validation ensures all required fields are filled
- [x] Real-time calculation preview shows:
  - Total interest amount
  - Total repayment amount
  - Payment amount per period
  - First payment due date

### AC4: Automatic Calculations

- [x] System uses simple interest formula: Total Interest = Principal × Rate × (Term/12)
- [x] Payment per period = (Principal + Total Interest) / Number of payments
- [x] Repayment schedule generated with due dates based on frequency
- [x] All calculations use ZMW currency with 2 decimal places

### AC5: Loan Detail Page

- [x] Shows comprehensive loan information in card layout
- [x] Sections:
  - Loan Details (borrower, amounts, dates, status)
  - Repayment Schedule (table with all installments)
  - Payment History (chronological list of actual payments)
  - Outstanding Balance (prominently displayed)
- [x] Edit button for loan modification (Admin only)
- [x] "Record Payment" button for active loans

### AC6: Payment Recording

- [x] "Record Payment" button opens payment form
- [x] Fields: Payment Amount, Payment Date, Payment Method, Notes
- [x] System validates:
  - Payment amount doesn't exceed outstanding balance
  - Payment date is not before disbursement date
- [x] Upon recording:
  - Creates finance transaction (income category: "Loan Repayment")
  - Updates loan outstanding balance
  - Marks corresponding installment as paid
  - Updates loan status if fully repaid

### AC7: Overdue Loan Tracking

- [x] Loans with missed payments flagged in red on list page
- [x] "Days Overdue" indicator shows days since missed payment
- [x] Overdue loans appear at top of list (sorted by overdue days)
- [ ] Email notification option for overdue loans (future enhancement)

### AC8: Dashboard Integration

- [x] Finance dashboard widget: "Active Loans"
- [x] Shows:
  - Total outstanding amount
  - Number of active loans
  - Number of overdue loans
  - Quick link to "All Loans" page
- [x] Widget updates in real-time

### AC9: Loan Status Management

- [x] Status options: Active, Fully Repaid, Defaulted
- [x] Status automatically updates:
  - "Fully Repaid" when balance reaches 0
  - "Defaulted" when loan is 90+ days overdue (manual trigger)
- [x] Status changes logged in audit trail

### AC10: Module Separation

- [x] Village Lending implemented as separate module: `src/modules/lending/`
- [x] Module can be disabled dynamically via runtime application setting: `lending_enabled` in database/store
- [x] When disabled:
  - Navigation hides the Lending menu item
  - Routes redirect to dashboard or return unauthorized
  - Dashboard widget hidden
- [x] No cross-dependencies with other finance modules

---

## Technical Requirements

### Module Structure

```
src/modules/lending/
├── components/
│   ├── LoanList.vue
│   ├── LoanForm.vue
│   ├── LoanDetail.vue
│   ├── PaymentForm.vue
│   └── RepaymentSchedule.vue
├── composables/
│   ├── useLoans.js
│   ├── useLoanCalculations.js
│   └── useLendingPermissions.js
├── stores/
│   └── lendingStore.js
├── pages/
│   ├── LendingIndex.vue
│   ├── AllLoans.vue
│   ├── CreateLoan.vue
│   └── LoanDetail.vue
├── types/
│   └── loan.types.js
└── index.js
```

### Database Schema Additions

#### Collection: `loans`

| Column                   | Type     | Constraints                                                     | Description                 |
| ------------------------ | -------- | --------------------------------------------------------------- | --------------------------- |
| `id`                     | string   | Primary Key, Auto-generated                                     | Unique loan identifier      |
| `borrower_id`            | string   | Foreign Key → residents.id, Indexed                             | Loan recipient              |
| `principal_amount`       | float    | Required, Min: 0                                                | Original loan amount        |
| `interest_rate`          | float    | Required, Min: 0, Max: 50                                       | Annual interest rate (%)    |
| `term_months`            | integer  | Required, Min: 1, Max: 60                                       | Loan duration in months     |
| `repayment_frequency`    | string   | Required, Enum: 'weekly','biweekly','monthly'                   | Payment frequency           |
| `collateral_description` | text     | Optional                                                        | Description of collateral   |
| `purpose`                | string   | Required, Enum: 'farm','education','medical','business','other' | Loan purpose                |
| `disbursement_date`      | date     | Required                                                        | When funds were given       |
| `status`                 | string   | Required, Enum: 'active','paid','defaulted'                     | Current loan status         |
| `outstanding_balance`    | float    | Required, Min: 0                                                | Remaining amount to pay     |
| `total_repayment`        | float    | Required, Calculated                                            | Total amount to be repaid   |
| `payment_amount`         | float    | Required, Calculated                                            | Amount per payment          |
| `next_due_date`          | date     | Calculated                                                      | Next payment due date       |
| `created_at`             | datetime | Auto-generated                                                  | Record creation timestamp   |
| `updated_at`             | datetime | Auto-updated                                                    | Last modification timestamp |

#### Collection: `loan_payments`

| Column                   | Type     | Constraints                           | Description               |
| ------------------------ | -------- | ------------------------------------- | ------------------------- |
| `id`                     | string   | Primary Key, Auto-generated           | Unique payment identifier |
| `loan_id`                | string   | Foreign Key → loans.id, Indexed       | Related loan              |
| `amount`                 | float    | Required, Min: 0                      | Payment amount            |
| `payment_date`           | date     | Required                              | When payment was made     |
| `payment_method`         | string   | Required                              | Cash, mobile, bank, etc.  |
| `notes`                  | text     | Optional                              | Payment notes             |
| `finance_transaction_id` | string   | Foreign Key → finance_transactions.id | Linked transaction        |
| `created_at`             | datetime | Auto-generated                        | Record creation timestamp |

#### Collection: `repayment_schedule`

| Column               | Type    | Constraints                                | Description                |
| -------------------- | ------- | ------------------------------------------ | -------------------------- |
| `id`                 | string  | Primary Key, Auto-generated                | Unique schedule identifier |
| `loan_id`            | string  | Foreign Key → loans.id, Indexed            | Related loan               |
| `installment_number` | integer | Required                                   | Sequence number            |
| `due_date`           | date    | Required                                   | When payment is due        |
| `amount`             | float   | Required, Min: 0                           | Payment amount             |
| `status`             | string  | Required, Enum: 'pending','paid','overdue' | Payment status             |
| `paid_date`          | date    | Optional                                   | Actual payment date        |
| `payment_id`         | string  | Foreign Key → loan_payments.id, Optional   | Related payment            |

### API Endpoints

```javascript
// Loan CRUD
GET    /api/loans              // List all loans with filters
POST   /api/loans              // Create new loan
GET    /api/loans/:id          // Get loan details
PUT    /api/loans/:id          // Update loan (Admin only)
DELETE /api/loans/:id          // Delete loan (Admin only, soft delete)

// Loan Operations
POST   /api/loans/:id/payments // Record payment
GET    /api/loans/:id/schedule // Get repayment schedule
POST   /api/loans/:id/status   // Update loan status

// Reports
GET    /api/loans/reports/portfolio // Loan portfolio report
GET    /api/loans/reports/overdue   // Overdue loans report
```

### Calculations Module

```javascript
// src/modules/lending/composables/useLoanCalculations.js
export function useLoanCalculations() {
  const calculateTotalInterest = (principal, rate, termMonths) => {
    return principal * (rate / 100) * (termMonths / 12);
  };

  const calculatePaymentAmount = (principal, totalInterest, numPayments) => {
    return (principal + totalInterest) / numPayments;
  };

  const generateRepaymentSchedule = (loan) => {
    // Generate array of payment dates based on frequency
    // Return schedule with due dates and amounts
  };

  const calculateOutstandingBalance = (loan, payments) => {
    // Calculate remaining balance after payments
  };
}
```

---

## Implementation Details

### Configuration for Module Separation

```javascript
// src/stores/settings-store.js
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    lendingEnabled: true, // Fetched from Appwrite database
    // ...
  }),
});

// src/router/routes.js
// Router guards check if module is enabled
const routes = [
  {
    path: '/lending',
    component: () => import('src/modules/lending/pages/LendingIndex.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'lending:read',
      requiresSetting: 'lendingEnabled', // Custom meta to check settingsStore
    },
    children: [
      // Inner routes for tabs
    ],
  },
];
```

### Integration Points

1. **Finance Transactions**: Loan repayments create income transactions
2. **Residents**: Borrower selection from resident database
3. **Dashboard**: Loan portfolio widget
4. **RBAC**: Permission checks for Finance Manager role
5. **Audit Log**: Status changes and payment recordings

### Offline Support

- View loan list and details offline (cached data)
- Record payments requires online connection (MVP)
- Sync queue for payment recordings when offline

---

## Design Considerations

### UX/UI

- Clean, card-based layout for loan details
- Progress bars showing repayment progress
- Color-coded status indicators (green: paid, yellow: due soon, red: overdue)
- Mobile-responsive tables with horizontal scroll
- Print-friendly loan statements

### Security

- All loan operations require Finance Manager or Admin role
- Audit trail for all loan status changes
- Validation prevents duplicate payments
- Sensitive operations require confirmation

### Performance

- Lazy loading of loan list pages
- Efficient queries with proper indexes
- Caching of active loan data
- Background calculation for repayment schedules

---

## Testing Requirements

### Manual Test Cases

1. **Loan Creation Flow**
   - Create loan with valid data
   - Verify calculations are correct
   - Check repayment schedule generation
   - Test form validation

2. **Payment Recording**
   - Record full payment
   - Record partial payment
   - Record early payment
   - Verify transaction creation

3. **Status Management**
   - Automatic status update on full repayment
   - Manual status change to defaulted
   - Verify overdue calculations

4. **Module Separation**
   - Disable module via config
   - Verify navigation hides lending
   - Verify routes return 404
   - Check dashboard widget hidden

5. **Permissions**
   - Test with Finance Manager role
   - Test with Resident role (should fail)
   - Test with Admin role

---

## Dependencies

### Prerequisites

- Story 2.1: Income Transaction Recording (for payment transactions)
- Epic 1 Story 1.7: Residents Management (for borrower selection)

### Technical Dependencies

- Appwrite SDK (database operations)
- Quasar Framework (UI components)
- Pinia (state management)
- date-fns (date calculations)
- Chart.js (dashboard widget)

---

## Risks and Mitigations

1. **Calculation Errors**
   - Risk: Incorrect interest calculations
   - Mitigation: Unit tests for calculation functions, peer review

2. **Data Consistency**
   - Risk: Loan balance mismatch with payments
   - Mitigation: Transactional operations, regular reconciliation

3. **Module Coupling**
   - Risk: Tight coupling with finance module
   - Mitigation: Clear interfaces, event-based communication

4. **Performance**
   - Risk: Slow loading with many loans
   - Mitigation: Pagination, efficient queries, caching

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and follows project standards
- [ ] Module can be enabled/disabled via config
- [ ] Database schema created and indexed
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Responsive design works on mobile
- [ ] Accessibility standards met (WCAG 2.1 AA)

---

## Post-Implementation Tasks

1. Monitor loan portfolio performance
2. Collect user feedback on usability
3. Plan enhancements:
   - Loan application workflow
   - Automated overdue notifications
   - Loan analytics and reporting
   - Bulk loan operations

---

## Notes

- Currency format: ZMW with 2 decimal places (e.g., ZMW 1,234.56)
- Interest calculation uses simple interest (not compound)
- No penalty fees for late payments (MVP)
- Collateral tracking is text-based only (no document upload)
- All dates use village timezone
- Module designed for easy extraction into separate microservice if needed
