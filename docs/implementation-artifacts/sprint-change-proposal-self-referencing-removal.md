# Sprint Change Proposal: Remove Self-Referencing Relationships

**Date:** 2026-02-02  
**Triggered By:** Appwrite does not support self-referencing relationships ([GitHub Issue #9471](https://github.com/appwrite/appwrite/issues/9471))

---

## Issue Summary

During implementation of Story 2.4 (Funding Source Tracking), we discovered that Appwrite's database does not support self-referencing relationships. This limitation prevents the implementation of the "supporting transaction" feature where one transaction could fund another transaction (parent-child relationship within the same collection).

The original design included:
- A `parent_transaction_id` relationship field on `finance_transactions`
- "Supporting transactions" that could add funding to partially-funded expenses
- Cascading updates when supporting transactions were created, modified, or deleted

**Evidence:**
- Appwrite GitHub Issue #9471 confirms self-referencing relationships are not supported
- Attempting to create such relationships fails at the API level

---

## Impact Analysis

### Affected Epics
- **Epic 2**: Finance Module (specifically Story 2.4)

### Affected Stories
- **Story 2.4**: Finance Module - Funding Source Tracking for Donor Accountability
  - Supporting transaction feature removed
  - Partial funding still supported via manual editing

### Artifact Conflicts
- **story-2.4.md**: Updated to reflect removed functionality
- **validate-schema-epic-2.js**: Removed self-referencing relationship creation
- **finance-store.js**: Removed supporting transaction logic
- **TransactionForm.vue**: Removed supporting transaction UI
- **FinanceTransactionsPage.vue**: Removed supporting transaction badges and styling
- **FundingSourceDetailPage.vue**: Removed parent_transaction_id filtering
- **DonorReportService.js**: Removed supporting transaction categorization

### Technical Impact
- **Positive**: Simpler codebase, fewer edge cases to handle
- **Negative**: Users must manually edit partially-funded transactions to add more funding (less convenient UX)

---

## Recommended Approach

### Decision: Direct Adjustment

We will remove the supporting transaction feature entirely while keeping the partial funding capability intact.

### Rationale
1. Appwrite limitation is a hard blocker - cannot implement as originally designed
2. Workaround using a separate linking table would add complexity for minimal gain
3. Manual editing of partially-funded transactions is an acceptable UX compromise
4. Core functionality (tracking funding sources, partial funding, reports) remains intact

### Effort Estimate
- **Completed**: ~30 minutes (code removal and documentation updates)
- **No additional effort required**

### Risk Assessment
- **Low Risk**: Feature was not yet in production; removal is clean
- **Mitigation**: Partial funding still works; users can edit transactions manually

---

## Detailed Change Proposals

### 1. Database Schema (`validate-schema-epic-2.js`)

**OLD:**
```javascript
// SELF REFERRING RELATIONSHIP IS BROKEN IN APPWRITE
await createRelationshipColumn(
  TABLES.TRANSACTIONS,
  TABLES.TRANSACTIONS,
  RelationshipType.ManyToOne,
  true,
  'parent_transaction_id',
  'child_transaction_ids',
  'setNull',
);
```

**NEW:**
*Removed entirely*

### 2. Finance Store (`finance-store.js`)

**Removed:**
- `isSupportingTransaction` getter
- `underfundedTransactions` getter
- `updateParentTransactionFunding()` action
- `fetchUnderfundedTransactions()` action
- References in `createTransaction()`, `updateTransaction()`, `deleteTransaction()`
- `parent_transaction_id` filter in `fetchSummary()`

### 3. Transaction Form (`TransactionForm.vue`)

**Removed:**
- "This funds another transaction" checkbox
- Parent transaction selector dropdown
- `isSupportingTransaction` and `parent_transaction_id` form data properties
- `underfundedTransactionOptions` computed property
- `filterUnderfundedTransactions()` function

### 4. Transaction Pages

**FinanceTransactionsPage.vue:**
- Removed supporting transaction badge (q-badge with "supporting" label)
- Removed `bg-info-1` row styling for supporting transactions
- Removed `parent_transaction_id` check from `isUnderfunded()`

**FundingSourceDetailPage.vue:**
- Removed supporting transaction badge
- Removed `!t.parent_transaction_id` filter from `totalExpenses` computed

### 5. Donor Report Service (`DonorReportService.js`)

**Changed:**
- Expense filter: removed `&& !t.parent_transaction_id`
- Transaction table: replaced "Primary/Supporting" column with "Status"

### 6. Documentation (`story-2.4.md`)

**Updated:**
- Acceptance Criteria #9: Marked as removed with explanation
- Task 1: Removed self-referencing relationship from schema
- Task 2: Removed supporting transaction store logic
- Task 4: Removed supporting transaction form flow
- Task 7: Updated visual indicators section
- Task 8: Removed supporting transaction test cases
- Dev Notes: Added "Appwrite Limitation" section with alternate approach

---

## Implementation Handoff

### Scope Classification: **Minor**

The changes have been completed and are ready for:
- Code review
- Testing of partial funding functionality
- Verification that no self-referencing relationship code remains

### Deliverables
1. All code changes committed
2. Documentation updated
3. This Sprint Change Proposal document

### Success Criteria
- [ ] Schema script runs without errors (no self-referencing relationship)
- [ ] Partial funding still works (amount_needed > amount_funded)
- [ ] No console errors related to parent_transaction_id
- [ ] Documentation accurately reflects current functionality

---

## Alternate Solution (Future Enhancement)

If supporting transactions are needed in the future, consider:

1. **Separate Collection Approach**: Create a `transaction_links` collection with:
   - `parent_transaction_id` (relationship to transactions)
   - `child_transaction_id` (relationship to transactions)
   - `link_type` (enum: 'supporting', 'refund', etc.)

2. **Manual Workflow**: Enhance the partial funding workflow with:
   - "Add Funding" button on underfunded transactions
   - Opens edit dialog pre-filled with current values
   - User increases amount_funded and selects additional funding source

---

## Summary

The self-referencing relationship feature has been successfully removed from the codebase. The core Funding Source Tracking functionality remains intact with partial funding support. Users will need to manually edit partially-funded transactions to add additional funding, which is an acceptable UX trade-off given the Appwrite limitation.

**Status: ✅ COMPLETE**
