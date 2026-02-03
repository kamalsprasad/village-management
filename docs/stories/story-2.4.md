# Story 2.4: Finance Module - Funding Source Tracking for Donor Accountability

Status: Approved

## Story

As a **Finance Manager**,
I want to **track which funding source each transaction comes from**,
so that **I can generate donor-specific reports showing how their funds were used**.

## Acceptance Criteria

1. **Funding Sources Collection**: Create `funding_sources` collection with fields: name, type, total_received, current_balance, date_received, restrictions, status. [Source: docs/epics.md#339]
2. **Management UI**: Admin can add/edit funding sources via Finance Settings page. [Source: docs/epics.md#340]
3. **Income Integration**: Income transaction form includes "Funding Source" dropdown to attribute incoming funds. When income is recorded, both `total_received` and `current_balance` increase. [Source: docs/epics.md#341]
4. **Expense Integration**: Expense transaction form includes "Funded By" dropdown to link expenses to a source. Supports partial funding with `amount_needed` and `amount_funded` fields. [Source: docs/epics.md#342]
5. **Detail View**: Funding source detail page shows total received, total spent, remaining balance (current_balance), restrictions, and transaction list. [Source: docs/epics.md#343]
6. **Settings Widget**: "Funding Sources Overview" widget on Finance Settings page showing balance bars for active sources. [Source: docs/epics.md#344]
7. **Spending Validation**: Hard block when `amount_funded` exceeds `current_balance` of selected funding source. No override allowed - user must reduce amount or choose different source. [Source: docs/epics.md#345]
8. **Donor Reporting**: Generate PDF report for specific funding source showing all related income/expenses. [Source: docs/epics.md#346]
9. **Partial Funding System**: Support expenses where `amount_needed > amount_funded`. Users can create funding links to add additional funding to underfunded transactions without editing the original transaction. Visual indicators show underfunded transactions and funding link history. [Source: docs/epics.md#345]
   - **Implementation**: Uses `transaction_links` table to track funding relationships (avoids Appwrite self-referencing limitation)
   - Users with finance role can add funding links to underfunded transactions
   - Each link records amount, funding source, and maintains complete audit trail
   - Transaction `amount_funded` automatically updates when links are created

## Tasks / Subtasks

- [ ] **Task 1: Database Schema & Seeding (AC: 1, 4)**
  - [ ] Update `funding_sources` table in `validate-schema-epic-2.js`:
    - `name`: String (required, existing)
    - `type`: Enum (grant, donation, income, loan) - NEW
    - `total_received`: Float (renamed from `total_allocated`) - tracks lifetime funds
    - `current_balance`: Float (existing) - tracks available funds
    - `date_received`: DateTime - NEW
    - `restrictions`: Text (existing)
    - `status`: Enum (active, inactive, depleted) - NEW
  - [ ] Update `finance_transactions` table in `validate-schema-epic-2.js`:
    - Replace `amount` with `amount_needed` (Float) and `amount_funded` (Float)
    - ~~Add `parent_transaction_id`: Relationship (Many-to-One, self-referential) - for supporting transactions~~
    - ~~Appwrite auto-creates `child_transaction_ids` (One-to-Many) on the inverse side~~
    - **UPDATE**: Self-referencing relationships removed - Appwrite doesn't support them
    - Keep existing `funding_source_id`: Relationship (Many-to-One) to `funding_sources`
  - [ ] Create seeding script `seed-funding-sources.js` with default sources.
  - [ ] Run seeding script.

- [ ] **Task 2: Store Updates (AC: 3, 4, 7)**
  - [ ] Update `finance-store.js` to manage funding sources:
    - `fetchFundingSources()` - load all sources
    - `addFundingSource(data)` - create new source
    - `updateFundingSource(id, data)` - update source
    - `deleteFundingSource(id)` - delete source (if no linked transactions)
  - [ ] Update transaction actions for new amount fields:
    - `createTransaction()` - handle `amount_needed`, `amount_funded`
    - `updateTransaction()` - update transaction amounts
    - `deleteTransaction()` - handle transaction deletion
  - [ ] Implement balance update logic:
    - Income: `total_received += amount`, `current_balance += amount`
    - Expense: `current_balance -= amount_funded`
    - Funding Link: update parent's `amount_funded`, deduct from funding source balance
  - [ ] Implement balance update logic:
    - Income: `total_received += amount`, `current_balance += amount`
    - Expense: `current_balance -= amount_funded`
  - [ ] Implement validation: hard block if `amount_funded > current_balance`

- [ ] **Task 3: Settings UI (AC: 2, 6)**
  - [ ] Add "Funding Sources" section to `FinanceSettingsPage.vue`:
    - List all funding sources with status indicators
    - Add/Edit dialog with all fields
    - Delete with confirmation (blocked if has transactions)
  - [ ] Create `FundingSourcesOverviewWidget.vue` for Settings page:
    - Bar charts showing utilization (current_balance / total_received)
    - Color coding: green (>50%), yellow (20-50%), red (<20%)
  - [ ] Ensure only Admin can add/edit/delete (Finance Manager has read-only view)

- [ ] **Task 4: Transaction Form Integration (AC: 3, 4, 7)**
  - [ ] Update `TransactionForm.vue` for income transactions:
    - Show "Funding Source" dropdown
    - Hide `amount_needed` field (auto-equals `amount_funded`)
  - [ ] Update `TransactionForm.vue` for expense transactions:
    - Show "Funding Source" dropdown
    - Show `amount_funded` field (primary input)
    - Show `amount_needed` field (disabled by default, auto-equals `amount_funded`)
    - Add checkbox "Different amount needed" to enable `amount_needed` editing
    - `amount_needed` must be >= `amount_funded` when checkbox enabled
    - Hard block if `amount_funded > current_balance` of selected source
  - [ ] Add "Add Funding" button on transaction detail page for underfunded transactions:
    - Only visible when `amount_funded < amount_needed` and user has finance role
    - Opens dialog with fields: funding source, amount to add, notes
    - Validates amount doesn't exceed remaining needed (`amount_needed - amount_funded`)
    - Validates funding source has sufficient balance
    - Creates funding link and updates transaction on save
  - [ ] ~~Add supporting transaction flow~~:
    - ~~Add checkbox "This funds another transaction"~~
    - ~~When checked, show searchable dropdown of underfunded transactions (filter by `amount_funded < amount_needed`)~~
    - ~~Search by transaction description~~
    - ~~When supporting, enforce `amount_needed == amount_funded` (no partial on supporting)~~
    - ~~On save, update parent transaction's `amount_funded`~~
    - **REMOVED**: Not supported by Appwrite self-referencing relationships

- [ ] **Task 5: Funding Source Detail Page (AC: 5)**
  - [ ] Create `FundingSourceDetailPage.vue` (route: `/finance/funding/:id`)
  - [ ] Display key metrics card:
    - Total Received (lifetime)
    - Total Spent (sum of linked expense amount_funded)
    - Current Balance
    - Status (active/inactive/depleted)
    - Restrictions (if any)
  - [ ] Display transaction history table filtered by this source
  - [ ] Add "Generate Report" button (links to Task 6)
  - [ ] Add route to `src/modules/finance/router.js`

- [ ] **Task 6: Reporting (AC: 8)**
  - [x] Install `jspdf` and `jspdf-autotable` packages.
  - [ ] Create `src/services/DonorReportService.js`:
    - `generateFundingSourceReport(fundingSource, transactions, options)`
    - Report layout: Header (Village Name, Report Date), Source Info, Financial Summary, Transaction Table, Footer
  - [ ] Add "Generate Report" button on Funding Source Detail page
  - [ ] Support date range filtering for report

- [ ] **Task 7: Visual Indicators & Polish (AC: 9 - Modified)**
  - [ ] Add row highlighting in transaction tables for underfunded transactions (`amount_funded < amount_needed`)
  - [ ] Add badge/chip showing funding status on transaction rows
  - [ ] ~~Add tooltip showing funding breakdown on hover~~
  - **Note**: Supporting transactions removed due to Appwrite limitation. Underfunded transactions must be manually edited to add more funding.

- [ ] **Task 8: Testing & Verification**
  - [ ] Manual Test: Create Funding Source (all field types)
  - [ ] Manual Test: Record Income to Source (verify `total_received` and `current_balance` increase)
  - [ ] Manual Test: Record Expense from Source (verify `current_balance` decrease)
  - [ ] Manual Test: Verify Hard Block when exceeding balance
  - [ ] Manual Test: Create partially funded expense (`amount_needed > amount_funded`)
  - [ ] ~~Manual Test: Create supporting transaction (verify parent's `amount_funded` updates)~~
  - [ ] ~~Manual Test: Delete supporting transaction (verify parent's `amount_funded` decrements)~~
  - [ ] Manual Test: Verify underfunded transaction highlighting
  - [ ] Manual Test: Generate PDF Report

## Dev Notes

### Schema Strategy

**`funding_sources` table:**
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `name` | String(255) | Yes | Donor/source name |
| `type` | Enum | Yes | Values: `grant`, `donation`, `income`, `loan` |
| `total_received` | Float | Yes | Lifetime total funds received (only increases) |
| `current_balance` | Float | Yes | Available funds (increases with income, decreases with expenses) |
| `date_received` | DateTime | No | When funds were first received |
| `restrictions` | String(1000) | No | Usage restrictions text |
| `status` | Enum | Yes | Values: `active`, `inactive`, `depleted` |

**`finance_transactions` table updates:**
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `amount_needed` | Float | Yes | Total expense amount required |
| `amount_funded` | Float | Yes | Amount currently funded from source |
| ~~`parent_transaction_id`~~ | ~~Relationship (Many-to-One, self)~~ | ~~No~~ | ~~Points to transaction this supports~~ **REMOVED - Not supported by Appwrite** |
| ~~`child_transaction_ids`~~ | ~~Relationship (One-to-Many)~~ | ~~Auto~~ | ~~Appwrite auto-creates inverse~~ **REMOVED** |
| `funding_source_id` | Relationship (Many-to-One) | No | Links to funding source |

**`transaction_links` table:**
| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `parent_transaction_id` | Relationship (Many-to-One) | Yes | Transaction receiving the funding |
| `child_transaction_id` | Relationship (Many-to-One) | Yes | Transaction providing the funding |
| `link_type` | Enum | Yes | Values: `funding`, `refund`, `transfer` |
| `amount` | Float | Yes | Amount of funding added via this link |
| `recorded_by` | Relationship (Many-to-One) to users | Yes | User who created the link |
| `notes` | String(500) | No | Optional notes about this funding |
| `created_at` | DateTime | Auto | When the link was created |

**Note:** `amount` column is replaced by `amount_needed` and `amount_funded`. For income and fully-funded expenses, these values are equal.

### Appwrite Limitation - RESOLVED

Self-referencing relationships are not supported by Appwrite as of the current version (see [GitHub Issue #9471](https://github.com/appwrite/appwrite/issues/9471)). This prevented the original implementation of the "supporting transaction" feature where one transaction could fund another transaction directly.

**Solution Implemented**: Created a separate `transaction_links` collection to track funding relationships without using self-referencing relationships.

**Benefits of this approach**:

- Clean audit trail of all funding additions
- No self-referencing relationship issues
- Supports multiple link types (funding, refund, transfer)
- Records who added funding and when
- Can be extended with soft-delete for unlinking (see future_enhancements.md)

**How it works**:

1. Original expense created with `amount_needed=1000`, `amount_funded=600`
2. Finance Manager clicks "Add Funding" on underfunded transaction
3. System creates `transaction_links` record linking to parent transaction
4. Parent transaction's `amount_funded` is automatically updated
5. Complete history available via funding links table

### Balance Update Logic

```
INCOME TRANSACTION:
  funding_source.total_received += amount_funded
  funding_source.current_balance += amount_funded

EXPENSE TRANSACTION (initial creation):
  funding_source.current_balance -= amount_funded

FUNDING LINK CREATION (adding funding to underfunded transaction):
  parent_transaction.amount_funded += link.amount
  funding_source.current_balance -= link.amount
  funding_link.recorded_by = current_user
  funding_link.created_at = now()
```

~~EXPENSE TRANSACTION (supporting):~~
~~funding_source.current_balance -= amount_funded~~
~~parent_transaction.amount_funded += this.amount_funded~~

~~DELETE SUPPORTING TRANSACTION:~~
~~funding_source.current_balance += deleted.amount_funded~~
~~parent_transaction.amount_funded -= deleted.amount_funded~~

~~EDIT SUPPORTING TRANSACTION:~~
~~# Reverse old, apply new~~
~~funding_source.current_balance += old.amount_funded~~
~~parent_transaction.amount_funded -= old.amount_funded~~
~~funding_source.current_balance -= new.amount_funded~~
~~parent_transaction.amount_funded += new.amount_funded~~

**Note:** Supporting transaction logic removed due to Appwrite self-referencing relationship limitation.

### RBAC

| Collection        | Read                         | Write             |
| ----------------- | ---------------------------- | ----------------- |
| `funding_sources` | `team:finance`, `role:admin` | `role:admin` only |

Finance Manager needs Read access to select sources in forms, but cannot Create/Edit/Delete sources.

### Validation Rules

1. **Hard block on overspend**: `amount_funded > funding_source.current_balance` → Block, show error
2. **Amount needed >= Amount funded**: When "Different amount needed" is checked
3. ~~**Supporting transaction amount equality**: When supporting another transaction, `amount_needed == amount_funded` (enforced)~~ **REMOVED**
4. ~~**No nested supporting**: Supporting transactions cannot have children (flat structure)~~ **REMOVED**

### Reporting

- Use `jspdf` + `jspdf-autotable` for client-side PDF generation
- Report includes: Village Name, Funding Source details, Date Range, Transaction Table, Totals

### UI/UX Notes

- **Income form**: Simple - just funding source dropdown and single amount field
- **Expense form**:
  - Default: `amount_funded` input, `amount_needed` auto-equals (disabled)
  - Checkbox enables `amount_needed` editing for partial funding
  - ~~Checkbox for "funds another transaction" shows searchable dropdown~~ **REMOVED**
- **Visual indicators**:
  - Underfunded rows highlighted (yellow/orange background)
  - Badge showing "Partially Funded" or "Fully Funded"
  - Funding source balance shown in dropdown hint

### Project Structure Notes

**New Files:**

- `src/modules/finance/pages/FundingSourceDetailPage.vue` - Detail view for funding source
- `src/modules/finance/components/FundingSourcesOverviewWidget.vue` - Widget for Settings page
- `src/services/DonorReportService.js` - PDF report generation
- `server/scripts/seed-funding-sources.js` - Default funding sources

**Modified Files:**

- `server/scripts/validate-schema-epic-2.js` - Schema updates
- `src/modules/finance/stores/finance-store.js` - CRUD and balance logic
- `src/modules/finance/components/TransactionForm.vue` - Partial funding UI
- `src/pages/admin/FinanceSettingsPage.vue` - Funding sources management
- `src/modules/finance/pages/FinanceTransactionsPage.vue` - Visual indicators
- `src/modules/finance/router.js` - New routes

### Impact on Future Stories

**Story 2.8 (Financial Reports):**

- Reports must use `amount_funded` for expense totals
- Exclude supporting transactions from top-level expense counts (already counted in parent's `amount_funded`)
- Consider adding "Funding Source" filter to reports

**Story 2.9 (Finance Dashboard):**

- Consider moving `FundingSourcesOverviewWidget` to dashboard
- Dashboard totals must use corrected amount calculations

### References

- [Source: docs/epics.md#333] (Story 2.4 Requirements)
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#53] (Data Models)
- [Source: docs/technical-debt/funding-source-balance-cloud-function.md] (Future: Atomic balance updates)

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
