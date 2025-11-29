# Story 2.2: Finance Module - Expense Transaction Recording

Status: review

<!-- ... -->

### Context Reference

[Context XML](file:///c:/Users/Kamal/OneDrive/App%20Development/Village/village-app/docs/stories/story-2.2.context.xml)

## Story

As a **Finance Manager**,
I want to **record expense transactions with category tracking**,
so that **I can monitor spending and identify cost optimization opportunities**.

## Acceptance Criteria

1. **Expense Recording UI**: Users can access a "Record Expense" dialog (or toggle in existing form). The form includes: Date, Amount (ZMW), Category, Subcategory (optional/free text for now), Payment Method, Payment Status, Vendor/Supplier, Description, and Receipt/Invoice Number. [Source: docs/epics.md#301]
2. **Validation**: System prevents negative amounts. Required fields (Amount, Category, Date, Payment Method) must be populated. [Source: docs/epics.md#302]
3. **Data Persistence**: Successful save creates an `expense` transaction in `finance_transactions` collection. [Source: docs/epics.md#303]
4. **Expense List**: Finance Transactions list supports filtering by 'expense' type, date range, category, and status. [Source: docs/epics.md#304]
5. **Dashboard Summary**: Finance dashboard displays expense summary (Total Expenses, Top Categories). [Source: docs/epics.md#305]
6. **Edit/Delete**: Users can edit and delete expense transactions (audit logging deferred to system logs, but soft delete or status change supported). [Source: docs/epics.md#306]
7. **Category Management**: Admin can add custom categories. (Note: Full management UI is Story 2.3, but basic support for custom categories in dropdown or store is needed). [Source: docs/epics.md#307]
8. **Funding Source Link**: Expenses can be linked to a Funding Source (decrementing its balance is handled in backend/store). [Source: docs/sprint-artifacts/tech-spec-epic-2.md#143]

## Tasks / Subtasks

- [x] **Task 1: Update Transaction Form for Expenses (AC: 1, 2)**
  - [x] Modify `TransactionForm.vue` to handle `type="expense"` specific fields.
  - [x] Add fields: `subcategory` (text), `vendor` (text), `receipt_number` (text), `payment_status` (select).
  - [x] Ensure validation logic adapts to expense fields.
  - [x] Update `finance-store.js` to handle new fields in `createTransaction`.
  - [x] Update schema script with new columns (user to run manually).

- [x] **Task 2: Implement Expense List Filters (AC: 4)**
  - [x] Update `FinanceTransactionsPage.vue` to support filtering by 'expense' type.
  - [x] Ensure category filter shows expense categories when expense type is selected.
  - [x] Added status filter to hide/show cancelled transactions.

- [x] **Task 3: Implement Dashboard Summary Widgets (AC: 5)**
  - [x] Create `FinanceSummaryWidget.vue` widget for the dashboard.
  - [x] Implement `Total Expenses` calculation in `finance-store.js` (`fetchSummary` action).
  - [x] Implement `Top Categories` calculation in `finance-store.js`.
  - [x] Added widget to `DashboardPage.vue` with `finance:read` permission guard.

- [x] **Task 4: Implement Edit/Delete Functionality (AC: 6)**
  - [x] Update `TransactionForm.vue` to support edit mode (populate `initialData`).
  - [x] Implement `updateTransaction` action in `finance-store.js`.
  - [x] Implement `deleteTransaction` action in `finance-store.js` (soft delete via status='cancelled').
  - [x] Add Edit/Delete buttons to `FinanceTransactionsPage.vue` table rows.
  - [x] Added confirmation dialog for delete action.

- [x] **Task 5: Funding Source Integration (AC: 8)**
  - [x] Ensure `funding_source_id` is correctly saved for expenses.
  - [x] Implemented `decrementFundingSourceBalance` action in store (client-side for MVP).
  - [x] Created technical debt documentation for future Cloud Function implementation.

- [ ] **Task 6: Testing & Verification**
  - [ ] Manual test: Record expense, verify in list, verify dashboard summary.
  - [ ] Manual test: Edit expense, verify updates.
  - [ ] Manual test: Delete expense, verify removal/status change.
  - [ ] Manual test: Verify funding source balance decrements after expense.

## Dev Notes

- **Architecture**: Continue using the modular structure in `src/modules/finance`.
- **Component Reuse**: `TransactionForm.vue` should be made flexible enough to handle both Income and Expense types without becoming too complex. Use `v-if` for type-specific fields.
- **State Management**: `finance-store.js` needs to be robust. Ensure `fetchTransactions` handles filtering efficiently (client-side filtering of cached data is acceptable for MVP scale, or server-side if API supports it).
- **RBAC**: Ensure `finance:write` permission is checked for all create/edit/delete actions.

### Learnings from Previous Story

**From Story 2.1 (Status: done)**

- **Component Reuse**: `TransactionForm.vue` was designed to support `type` prop. We should leverage this.
- **Security**: `validate-schema-epic-2.js` had issues with public access. Ensure any new collections or fields are protected.
- **Date Handling**: Use local date for forms to avoid off-by-one errors.
- **Store**: `finance-store.js` already has `incomeCategories` and `expenseCategories` getters. Ensure these are populated correctly.

[Source: docs/stories/story-2.1.md#Dev-Agent-Record]

### Project Structure Notes

- Alignment with `src/modules/finance` pattern.
- No new modules needed.

### References

- [Source: docs/epics.md#295] (Story 2.2 Requirements)
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#55] (Data Models)
- [Source: src/modules/finance/components/TransactionForm.vue] (Existing Form)

## Dev Agent Record

### Context Reference

[story-2.2.context.xml](docs/stories/story-2.2.context.xml)

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

- 2025-11-29: Analyzed story requirements and identified 5 key design decisions
- 2025-11-29: Confirmed all decisions with user before implementation

### Completion Notes List

- 2025-11-29: Implemented expense-specific fields in TransactionForm.vue (subcategory, vendor, receipt_number, payment_status)
- 2025-11-29: Updated schema script with new columns (user to run manually)
- 2025-11-29: Added "Record Expense" button alongside "Record Income" in transactions page
- 2025-11-29: Added status filter to transaction list (pending/completed/cancelled)
- 2025-11-29: Created FinanceSummaryWidget.vue for dashboard with permission guard
- 2025-11-29: Implemented fetchSummary action for total income/expenses/balance and top categories
- 2025-11-29: Implemented updateTransaction and deleteTransaction (soft delete) in store
- 2025-11-29: Added Edit/Delete buttons to table rows with confirmation dialog
- 2025-11-29: Implemented decrementFundingSourceBalance for expense-funding source linking
- 2025-11-29: Created comprehensive technical debt documentation for Cloud Function migration
- 2025-11-29: All linting passed

### File List

**New Files:**

- `src/components/dashboard/FinanceSummaryWidget.vue` - Dashboard widget for finance summary
- `docs/technical-debt/funding-source-balance-cloud-function.md` - Cloud Function migration docs

**Modified Files:**

- `server/scripts/validate-schema-epic-2.js` - Added expense-specific columns
- `src/modules/finance/components/TransactionForm.vue` - Added expense fields and edit support
- `src/modules/finance/stores/finance-store.js` - Added update/delete/summary/balance actions
- `src/modules/finance/pages/FinanceTransactionsPage.vue` - Added expense button, edit/delete, status filter
- `src/pages/dashboard/DashboardPage.vue` - Added FinanceSummaryWidget

### Technical Debt

**[HIGH PRIORITY] Funding Source Balance - Cloud Function Migration**

The current implementation updates funding source balances client-side, which is not atomic and could lead to race conditions in concurrent environments. A detailed migration plan has been documented at:

`docs/technical-debt/funding-source-balance-cloud-function.md`

This includes:

- Complete Appwrite Cloud Function implementation
- Event triggers for create/update/delete
- Reconciliation script for fixing discrepancies
- Step-by-step deployment instructions

### Schema Changes Required

Before testing, run the schema validation script to add new columns:

```bash
cd server
node scripts/validate-schema-epic-2.js
```

New columns added to `finance_transactions`:

- `subcategory` (string, optional)
- `vendor` (string, optional)
- `receipt_number` (string, optional)
- `payment_status` (enum: paid/unpaid/partial, optional)
