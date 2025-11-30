# Story 2.3: Finance Module - Admin-Configurable Categories

Status: ready-for-dev

## Story

As a **System Administrator**,
I want to **configure finance categories and subcategories**,
so that **the system adapts to our village's specific financial structure**.

## Acceptance Criteria

1. **Finance Settings Access**: Admin menu includes "Finance Settings" option. [Source: docs/epics.md#319]
2. **Category Management UI**: Finance Settings page shows two sections: Income Categories, Expense Categories. Each section displays current categories with subcategories in expandable list. [Source: docs/epics.md#320-321]
3. **Add Functionality**: "Add Category" and "Add Subcategory" buttons with forms. [Source: docs/epics.md#322]
4. **Edit/Delete Custom Categories**: Categories can be edited or deleted (with confirmation if transactions exist). [Source: docs/epics.md#324]
5. **Deletion Safeguards**: Attempting to delete category with transactions shows warning. [Source: docs/epics.md#325]
6. **Real-time Updates**: Changes reflect immediately in income/expense recording forms. [Source: docs/epics.md#326]
7. **Default Seeding**: Seeded default categories include Income (Farm Sales, Guest Payments, Donations, Grants, Loan Repayments) and Expense (Farm Inputs, School Supplies, Equipment, Utilities, Salaries, Maintenance). [Source: docs/epics.md#327]

## Tasks / Subtasks

- [ ] **Task 1: Database Schema Updates (AC: 7)**
  - [ ] Create `finance_categories` table (columns: name, type, subcategories).
  - [ ] Update `finance_transactions` table: Change `category` column from Enum to Relationship (Many-to-One) with `finance_categories` table.
  - [ ] Create migration/seeding script `seed-finance-categories.js` to populate default categories.
  - [ ] Run seeding script to initialize defaults.

- [ ] **Task 2: Finance Store Updates (AC: 6)**
  - [ ] Update `finance-store.js` to fetch categories from `finance_categories` table (replace static arrays).
  - [ ] Implement `addCategory`, `updateCategory`, `deleteCategory` actions.
  - [ ] Implement `addSubcategory`, `removeSubcategory` actions.
  - [ ] Ensure `finance_categories` are cached/loaded on app init or module load.

- [ ] **Task 3: Finance Settings Page (AC: 1, 2, 3)**
  - [ ] Create `FinanceSettingsPage.vue` in `src/modules/finance/pages`.
  - [ ] Add "Finance Settings" link to Admin menu (or Finance menu for Admin role).
  - [ ] Implement UI for Income and Expense category lists (expandable for subcategories).
  - [ ] Implement "Add Category" dialog.
  - [ ] Implement "Add Subcategory" dialog.

- [ ] **Task 4: Edit/Delete Logic & Safeguards (AC: 4, 5)**
  - [ ] Implement Edit dialog for categories.
  - [ ] Implement Delete logic: Check for existing transactions before deleting.
  - [ ] Show warning/confirmation if transactions exist (or block deletion if strict).

- [ ] **Task 5: Integration with Transaction Forms (AC: 6)**
  - [ ] Update `TransactionForm.vue` to use the dynamic category list from store.
  - [ ] Ensure subcategory selection is available and filtered by selected category.
  - [ ] Verify that new categories appear immediately after addition.

- [ ] **Task 6: Testing & Verification**
  - [ ] Manual test: Add new category, verify in Transaction Form.
  - [ ] Manual test: Add subcategory, verify in Transaction Form.
  - [ ] Manual test: Try to delete category with transactions (should warn).
  - [ ] Manual test: Verify default categories are present.

## Dev Notes

- **Schema Strategy**:
  - We are moving away from Appwrite Enums for `category` to allow dynamic updates. We will use a **Relationship** attribute.
  - `finance_transactions` table:
    - `category`: Relationship (Many-to-One) to `finance_categories`.
  - `finance_categories` table structure:
    - `name`: String
    - `type`: Enum (income, expense)
    - `subcategories`: String[] (Array of strings - stored as JSON or array type supported by TablesDB)
- **Hydration & SSR**:
  - We have experienced hydration mismatches in the past (e.g., Story 1.10).
  - Ensure `FinanceSettingsPage` handles data loading gracefully. If fetching data in `onMounted`, ensure the initial state matches the server-rendered state (usually empty or loading).
  - Use `<ClientOnly>` wrapper if using any non-SSR friendly libraries or if the component relies heavily on client-side only data that might differ from server.
  - Verify that `finance-store.js` state hydration works correctly with Quasar's `preFetch` or `initialState` if used.
- **RBAC**:
  - Only `Admin` (or `System Administrator`) should access `FinanceSettingsPage`.
  - `Finance Manager` should only _view_ categories in the form, not manage them.
  - Ensure `finance_categories` table has read permission for `Finance Manager` and `Admin`, write permission for `Admin`.

### Project Structure Notes

- New page: `src/modules/finance/pages/FinanceSettingsPage.vue`
- Script: `server/scripts/seed-finance-categories.js`
- Store update: `src/modules/finance/stores/finance-store.js`

### References

- [Source: docs/epics.md#313] (Story 2.3 Requirements)
- [Source: docs/stories/story-2.2.md#Dev-Agent-Record] (Previous Story Learnings)

## Dev Agent Record

### Context Reference

- [Context File](docs/stories/story-2.3.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Learnings from Previous Story

**From Story 2.2 (Status: done)**

- **Static Category List**: The previous implementation used hardcoded categories. This story explicitly replaces that with a dynamic database-driven approach.
- **Schema Limitation**: Appwrite Enums were too rigid. Switching to Relationship for `category` column in `finance_transactions` table is a direct response to this learning.
- **Component Reuse**: `TransactionForm.vue` is already set up to handle categories; we just need to swap the data source.
- **RBAC**: Continue enforcing strict role checks. `FinanceSettingsPage` is an Admin-only area.

[Source: docs/stories/story-2.2.md#Dev-Agent-Record]
