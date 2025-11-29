# Story 2.2: Finance Module - Expense Transaction Recording

Status: ready-for-dev

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

- [ ] **Task 1: Update Transaction Form for Expenses (AC: 1, 2)**
  - [ ] Modify `TransactionForm.vue` to handle `type="expense"` specific fields.
  - [ ] Add fields: `subcategory` (text), `vendor` (text), `receipt_number` (text), `payment_status` (select).
  - [ ] Ensure validation logic adapts to expense fields.
  - [ ] Update `finance-store.js` to handle new fields in `createTransaction`.

- [ ] **Task 2: Implement Expense List Filters (AC: 4)**
  - [ ] Update `FinanceTransactionsPage.vue` to support filtering by 'expense' type.
  - [ ] Ensure category filter shows expense categories when expense type is selected.

- [ ] **Task 3: Implement Dashboard Summary Widgets (AC: 5)**
  - [ ] Create `FinanceSummary.vue` widget for the dashboard.
  - [ ] Implement `Total Expenses` calculation in `finance-store.js`.
  - [ ] Implement `Top Categories` calculation in `finance-store.js`.

- [ ] **Task 4: Implement Edit/Delete Functionality (AC: 6)**
  - [ ] Update `TransactionForm.vue` to support edit mode (populate `initialData`).
  - [ ] Implement `updateTransaction` action in `finance-store.js`.
  - [ ] Implement `deleteTransaction` action in `finance-store.js` (soft delete or status='cancelled').
  - [ ] Add Edit/Delete buttons to `FinanceTransactionsPage.vue` table rows.

- [ ] **Task 5: Funding Source Integration (AC: 8)**
  - [ ] Ensure `funding_source_id` is correctly saved for expenses.
  - [ ] Verify backend/store logic decrements funding source balance (if applicable, or just link).

- [ ] **Task 6: Testing & Verification**
  - [ ] Manual test: Record expense, verify in list, verify dashboard summary.
  - [ ] Manual test: Edit expense, verify updates.
  - [ ] Manual test: Delete expense, verify removal/status change.

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

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
