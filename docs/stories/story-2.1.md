# Story 2.1: Finance Module - Income Transaction Recording

Status: ready-for-dev

## Story

As a **Finance Manager**,
I want to **record income transactions with detailed source tracking**,
so that **I can maintain an accurate and auditable financial record of all village revenue**.

## Acceptance Criteria

1. **Database Schema**: `finance_transactions` and `funding_sources` collections are created in Appwrite with all required attributes (amount, type, category, source, date, etc.) and indexes using the latest `TablesDB` API patterns. [Source: docs/sprint-artifacts/tech-spec-epic-2.md#55-74]
2. **Module Infrastructure**: Finance module structure is initialized at `src/modules/finance` with proper routing and state management setup. [Source: docs/architecture.md#modular-structure]
3. **Income Recording UI**: Users can access a "Record Transaction" dialog from the Finance Transactions list. The form includes: Amount, Category (e.g., Farm Sales, Grants), Source Module (e.g., Farm, Guest House), Funding Source (optional), Date, Description, and Payment Method. [Source: docs/ux-specification.md#finance-module]
4. **Validation & Logic**: System validates that amount is positive and required fields are present. "Income" is set as the transaction type automatically.
5. **RBAC Enforcement**: Only users with `finance:write` permission (Finance Manager, Admin) can see the "Record Income" button and submit transactions. [Source: docs/PRD.md#121]
6. **Navigation**: "Finance" item appears in the main navigation menu for authorized users only. [Source: docs/ux-specification.md#navigation-structure]

## Tasks / Subtasks

- [ ] **Task 1: Implement Database Schema (AC: 1)**
  - [ ] Review and finalize `server/scripts/validate-schema-epic-2.js` to ensure `finance_transactions` and `funding_sources` definitions match Tech Spec.
  - [ ] Execute schema validation script to create tables and columns in Appwrite.
  - [ ] Verify indexes are correctly created for querying by date, type, and category.

- [ ] **Task 2: Initialize Finance Module Structure (AC: 2, 6)**
  - [ ] Create `src/modules/finance` directory structure (pages, components, stores, router).
  - [ ] Create `src/modules/finance/router.js` and register in main router.
  - [ ] Create `FinanceLayout.vue` or use `MainLayout` with Finance-specific context.
  - [ ] Update `MainLayout.vue` to include "Finance" navigation link (guarded by `finance:read`).

- [ ] **Task 3: Implement Finance Store (AC: 2)**
  - [ ] Create `src/modules/finance/stores/finance-store.js` using Pinia.
  - [ ] Implement actions for `createTransaction` and `fetchTransactions`.
  - [ ] Implement state for caching recent transactions.

- [ ] **Task 4: Create Transactions List Page (AC: 3)**
  - [ ] Create `src/modules/finance/pages/FinanceTransactionsPage.vue`.
  - [ ] Implement list view of transactions (using `QTable` or `QList`).
  - [ ] Add "Record Income" button (FAB on mobile, Button on desktop) that opens `TransactionForm` in a `QDialog`.
  - [ ] Configure `QDialog` to be maximized on mobile (using `useQuasar().screen.lt.sm`).

- [ ] **Task 5: Create Transaction Form Component (AC: 3, 4)**
  - [ ] Create `src/modules/finance/components/TransactionForm.vue`.
  - [ ] Implement form with Quasar components (`QInput`, `QSelect`, `QDate`, `QBtn`) inside a `QCard`.
  - [ ] Add props: `type` (default 'income'), `initialData` (for future edit support).
  - [ ] Add emits: `saved`, `cancelled`.
  - [ ] Add client-side validation for required fields and positive amounts.

- [ ] **Task 6: Apply RBAC & Error Handling (AC: 5)**
  - [ ] Apply `requiresPermission: 'finance:read'` to the transactions list route.
  - [ ] Wrap "Record Income" button in `PermissionGuard` with `finance:write`.
  - [ ] Use `useErrorHandler` for API failure scenarios.

## Dev Notes

- **Appwrite TablesDB API**: Ensure we are using the latest `node-appwrite` SDK methods for schema definitions. The `validate-schema-epic-2.js` script is the source of truth for this.
- **Modular Architecture**: This is the first distinct "Module" implementation (Epic 2). Follow the pattern of keeping module-specific code within `src/modules/finance` to maintain separation of concerns.
- **RBAC**: Re-use the `hasPermission` logic from Story 1.4. Finance Manager role should have `finance:*` or specific `finance:write` permissions.
- **State Management**: `finance-store.js` should handle all async API calls. Avoid direct API calls from components.
- **Dialog Pattern**: Follow the pattern from Story 1.7 (Residents) for the `TransactionForm` dialog. Use `v-model` for visibility control and emit events for success/cancel. Ensure the dialog is maximized on mobile for better UX.

### Learnings from Previous Story

**From Story 1.11 (Status: done)**

- **SSR Hydration**: Ensure any data fetched during SSR is properly hydrated or fetched on client if user-specific. For Finance, most data is authenticated-user specific, so standard `onMounted` or `asyncData` patterns (if using preFetch) apply.
- **Responsive Design**: Continue using Quasar's grid system (`col-12 col-md-6`) for forms to ensure they look good on mobile and desktop.
- **Component Patterns**: Use `QCard` for form containers and `QSkeleton` for loading states.

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#55-74] (Data Models)
- [Source: docs/ux-specification.md#finance-module] (UX/UI)
- [Source: docs/PRD.md#108-119] (Functional Requirements)
- [Source: server/scripts/validate-schema-epic-2.js] (Schema Script)

## Dev Agent Record

### Context Reference

[2-1-finance-module-income-transaction-recording.context.xml](docs/stories/2-1-finance-module-income-transaction-recording.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
