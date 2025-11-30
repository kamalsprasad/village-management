# Story 2.3: Finance Module - Admin-Configurable Categories

Status: review

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

- [x] **Task 1: Database Schema Updates (AC: 7)**
  - [x] Create `finance_categories` table (columns: name, type, subcategories).
  - [x] Update `finance_transactions` table: Change `category` column from Enum to Relationship (Many-to-One) with `finance_categories` table.
  - [x] Create migration/seeding script `seed-finance-categories.js` to populate default categories.
  - [ ] Run seeding script to initialize defaults. _(Manual step required)_

- [x] **Task 2: Finance Store Updates (AC: 6)**
  - [x] Update `finance-store.js` to fetch categories from `finance_categories` table (replace static arrays).
  - [x] Implement `addCategory`, `updateCategory`, `deleteCategory` actions.
  - [x] Implement `addSubcategory`, `removeSubcategory` actions.
  - [x] Ensure `finance_categories` are cached/loaded on app init or module load.

- [x] **Task 3: Finance Settings Page (AC: 1, 2, 3)**
  - [x] Create `FinanceSettingsPage.vue` in `src/pages/admin`.
  - [x] Add "Finance Settings" link to Admin menu.
  - [x] Implement UI for Income and Expense category lists (expandable for subcategories).
  - [x] Implement "Add Category" dialog.
  - [x] Implement "Add Subcategory" dialog.

- [x] **Task 4: Edit/Delete Logic & Safeguards (AC: 4, 5)**
  - [x] Implement Edit dialog for categories.
  - [x] Implement Delete logic: Check for existing transactions before deleting.
  - [x] Show warning/confirmation if transactions exist (or block deletion if strict).

- [x] **Task 5: Integration with Transaction Forms (AC: 6)**
  - [x] Update `TransactionForm.vue` to use the dynamic category list from store.
  - [x] Ensure subcategory selection is available and filtered by selected category.
  - [x] Implemented "Other" option for custom subcategory entry.
  - [x] Verify that new categories appear immediately after addition.

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

- Analyzed existing schema in `validate-schema-epic-2.js` - found category as Enum
- Decided on clean schema approach (no migration needed for fresh environment)
- Implemented subcategory dropdown with "Other" option per user decision
- Placed Finance Settings in Admin section per user decision

### Completion Notes List

- **Schema**: Updated `validate-schema-epic-2.js` to create `finance_categories` table with `name`, `type`, and `subcategories` (array) columns. Replaced `category` enum with `category_id` relationship in `finance_transactions`.
- **Seeding**: Created `seed-finance-categories.js` with 5 income categories and 6 expense categories, each with relevant subcategories.
- **Store**: Added `categories` state, `fetchCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `addSubcategory`, `removeSubcategory` actions. Updated transaction methods to use `category_id`.
- **UI**: Created `FinanceSettingsPage.vue` with expandable category lists, add/edit/delete dialogs, and subcategory management.
- **Navigation**: Added "Finance Settings" to Admin section in `MainLayout.vue`.
- **TransactionForm**: Updated to use dynamic categories from store, added subcategory dropdown with "Other" option for custom entries.
- **Routing**: Added `/admin/finance-settings` route with `*` permission requirement.

### File List

**New Files:**

- `src/pages/admin/FinanceSettingsPage.vue` - Finance Settings admin page
- `server/scripts/seed-finance-categories.js` - Category seeding script

**Modified Files:**

- `server/scripts/validate-schema-epic-2.js` - Added finance_categories table, category_id relationship
- `src/modules/finance/stores/finance-store.js` - Added category management actions
- `src/modules/finance/components/TransactionForm.vue` - Dynamic categories with subcategory dropdown
- `src/layouts/MainLayout.vue` - Added Finance Settings to Admin menu
- `src/router/routes.js` - Added /admin/finance-settings route
- `docs/sprint-status.yaml` - Updated story status

### Learnings from Previous Story

**From Story 2.2 (Status: done)**

- **Static Category List**: The previous implementation used hardcoded categories. This story explicitly replaces that with a dynamic database-driven approach.
- **Schema Limitation**: Appwrite Enums were too rigid. Switching to Relationship for `category` column in `finance_transactions` table is a direct response to this learning.
- **Component Reuse**: `TransactionForm.vue` is already set up to handle categories; we just need to swap the data source.
- **RBAC**: Continue enforcing strict role checks. `FinanceSettingsPage` is an Admin-only area.

[Source: docs/stories/story-2.2.md#Dev-Agent-Record]
