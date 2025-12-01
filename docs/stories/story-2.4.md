# Story 2.4: Finance Module - Funding Source Tracking for Donor Accountability

Status: ready-for-dev

## Story

As a **Finance Manager**,
I want to **track which funding source each transaction comes from**,
so that **I can generate donor-specific reports showing how their funds were used**.

## Acceptance Criteria

1. **Funding Sources Collection**: Create `funding_sources` collection with fields: name, type, donor_name, amount_allocated, date_received, restrictions. [Source: docs/epics.md#339]
2. **Management UI**: Admin can add/edit funding sources via Finance Settings page. [Source: docs/epics.md#340]
3. **Income Integration**: Income transaction form includes "Funding Source" dropdown to attribute incoming funds. [Source: docs/epics.md#341]
4. **Expense Integration**: Expense transaction form includes "Funded By" dropdown to link expenses to a source. [Source: docs/epics.md#342]
5. **Detail View**: Funding source detail page shows total allocated, total spent, remaining balance, and transaction list. [Source: docs/epics.md#343]
6. **Dashboard Widget**: "Funding Sources Overview" widget on Finance Dashboard showing balance bars. [Source: docs/epics.md#344]
7. **Spending Validation**: Prevent/Warn when spending exceeds allocated amount (allow override with Admin approval). [Source: docs/epics.md#345]
8. **Donor Reporting**: Generate PDF report for specific funding source showing all related income/expenses. [Source: docs/epics.md#346]

## Tasks / Subtasks

- [ ] **Task 1: Database Schema & Seeding (AC: 1)**
  - [ ] Create `funding_sources` table in `validate-schema-epic-2.js`.
  - [ ] Update `finance_transactions` table to include `funding_source` relationship (Many-to-One).
  - [ ] Create seeding script `seed-funding-sources.js` with default sources (e.g., "General Village Fund", "Global Village Grant").
  - [ ] Run seeding script.

- [ ] **Task 2: Store Updates (AC: 7)**
  - [ ] Update `finance-store.js` to fetch and manage funding sources.
  - [ ] Implement `addFundingSource`, `updateFundingSource`, `deleteFundingSource` actions.
  - [ ] Implement getters for funding source balances (allocated vs spent).
  - [ ] Implement validation logic to check balance before expense recording.

- [ ] **Task 3: Settings UI (AC: 2)**
  - [ ] Add "Funding Sources" tab to `FinanceSettingsPage.vue`.
  - [ ] Implement Add/Edit dialogs for funding sources.
  - [ ] Ensure only Admin can access this tab.

- [ ] **Task 4: Transaction Form Integration (AC: 3, 4)**
  - [ ] Update `TransactionForm.vue` to include "Funding Source" dropdown.
  - [ ] For Income: Selection attributes funds to the source.
  - [ ] For Expense: Selection deducts funds from the source.
  - [ ] Add visual warning if selected source has insufficient balance (for expenses).

- [ ] **Task 5: Funding Source Detail & Dashboard (AC: 5, 6)**
  - [ ] Create `FundingSourceDetailPage.vue` (route: `/finance/funding/:id`).
  - [ ] Display key metrics: Allocated, Spent, Remaining, Restrictions.
  - [ ] Display transaction history table filtered by this source.
  - [ ] Create `FundingSourcesWidget.vue` for Finance Dashboard (bar charts of utilization).

- [ ] **Task 6: Reporting (AC: 8)**
  - [x] Install `jspdf` and `jspdf-autotable` packages.
  - [ ] Create `DonorReportService.js` to generate PDF reports.
  - [ ] Add "Generate Report" button on Funding Source Detail page.
  - [ ] Implement report layout: Header, Financial Summary, Transaction Table, Footer.

- [ ] **Task 7: Testing & Verification**
  - [ ] Manual Test: Create Funding Source.
  - [ ] Manual Test: Record Income to Source (verify balance increase).
  - [ ] Manual Test: Record Expense from Source (verify balance decrease).
  - [ ] Manual Test: Verify Overdraft Warning.
  - [ ] Manual Test: Generate PDF Report.

## Dev Notes

- **Schema Strategy**:
  - `funding_sources` table:
    - `name`: String (required)
    - `type`: Enum (grant, donation, income, loan)
    - `donor_name`: String
    - `amount_allocated`: Float (default 0)
    - `date_received`: Date
    - `restrictions`: Text (optional)
  - `finance_transactions` table:
    - `funding_source`: Relationship (Many-to-One) to `funding_sources`.
- **RBAC**:
  - `funding_sources` table:
    - Read: `team:finance`, `role:admin`
    - Write: `role:admin`
  - Finance Manager needs Read access to select sources in forms, but should not Create/Edit sources (Admin only).
- **Validation Logic**:
  - When recording expense, calculate `remaining = allocated - spent`.
  - If `amount > remaining`, show warning.
  - AC mentions "allow override with Admin approval". For MVP, we will implement a "Soft Block" (Warning dialog with "Proceed Anyway" button logged in audit trail) or require an Admin override code. Given the complexity, we'll start with a **Warning Dialog** that requires explicit confirmation.
- **Reporting**:
  - Use `jspdf` for client-side generation to avoid server overhead.
  - Ensure report includes Village Name and Date Range.

### Project Structure Notes

- New Page: `src/modules/finance/pages/FundingSourceDetailPage.vue`
- New Component: `src/modules/finance/components/FundingSourcesWidget.vue`
- New Service: `src/services/DonorReportService.js`
- Script: `server/scripts/seed-funding-sources.js`

### References

- [Source: docs/epics.md#333] (Story 2.4 Requirements)
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#53] (Data Models)

## Dev Agent Record

### Context Reference

[story-2.4.context.xml](docs/stories/story-2.4.context.xml)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Learnings from Previous Story

**From Story 2.3 (Status: done)**

- **Schema**: We successfully moved from Enums to Relationships for Categories. We will apply the same pattern here for `funding_source` in `finance_transactions`.
- **RBAC**: Story 2.3 highlighted the importance of strict permissions. We must ensure `funding_sources` is write-protected for Admins only, even though Finance Managers use it daily.
- **Hydration**: `FinanceSettingsPage` required careful handling of SSR. `FundingSourceDetailPage` will likely face similar challenges, especially with charts/widgets. Use `<ClientOnly>` where appropriate.
- **Component Reuse**: `TransactionForm.vue` is becoming complex. We should be careful when adding the Funding Source dropdown to ensure it doesn't clutter the UI or complicate the validation logic further.

[Source: docs/stories/story-2.3.md#Dev-Agent-Record]
