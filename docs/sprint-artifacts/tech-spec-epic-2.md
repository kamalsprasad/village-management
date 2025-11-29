# Epic Technical Specification: Financial Management and Inventory Tracking

Date: 2025-11-29
Author: Kamal S. Prasad
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 focuses on implementing the financial backbone of the Village Management System. It introduces comprehensive tracking for income and expenses, donor accountability through funding source tracking, a village lending program, and an integrated inventory management system. This epic builds directly on the RBAC and dashboard infrastructure established in Epic 1, enabling the Finance Manager role to operate effectively.

## Objectives and Scope

**In-Scope:**

- **Income & Expense Tracking:** Recording transactions with categories, sources, and payment methods.
- **Funding Sources:** Managing donor funds, allocations, and tracking restrictions.
- **Village Lending:** Loan creation, repayment schedules, and tracking active/overdue loans.
- **Inventory Management:** Core inventory tracking (items, quantities, values) across all modules.
- **Finance-Inventory Integration:** Automatic inventory creation from "Farm Inputs" expenses.
- **Financial Reporting:** Generating standard reports (Income/Expense summaries, Donor usage).
- **Finance Dashboard:** Real-time overview of financial health.

**Out-Scope:**

- **External Payment Gateway Integration:** All transactions are recorded manually; no real-time bank integration.
- **Complex Accounting:** No double-entry bookkeeping enforcement (simplified single-entry with categorization).
- **Payroll Management:** Basic expense recording only; no tax calculation or payslip generation.
- **Asset Depreciation:** Inventory tracks current value but does not auto-depreciate assets.

## System Architecture Alignment

This epic aligns with the modular architecture defined in `architecture.md`.

- **Backend:** Leverages Appwrite Database for `finance_transactions`, `funding_sources`, `loans`, and `inventory` collections.
- **Frontend:** Extends the Quasar SSR application with a new `FinanceModule` and `InventoryModule`.
- **State Management:** Uses Pinia stores (`financeStore`, `inventoryStore`) to manage reactive state and caching.
- **Security:** Relies on the RBAC system (Story 1.4) to restrict access to "Finance Manager" and "Admin" roles.

## Detailed Design

### Services and Modules

| Module               | Responsibility                                                                      | Owner                          |
| :------------------- | :---------------------------------------------------------------------------------- | :----------------------------- |
| **FinanceModule**    | Manages all financial transactions, reporting, and dashboard views.                 | Finance Manager                |
| **InventoryModule**  | Tracks physical assets and stock levels. Interfaces with Finance for purchases.     | Finance Manager / Farm Manager |
| **LendingService**   | Handles loan logic: interest calculation, repayment scheduling, and status updates. | Finance Manager                |
| **ReportingService** | Generates PDF/CSV exports for financial data.                                       | System                         |

### Data Models and Contracts

**Collection: `finance_transactions`**

- `id`: string (primary key)
- `type`: enum ('income', 'expense')
- `amount`: float
- `category`: string (e.g., 'Farm Sales', 'Maintenance')
- `source_module`: string (e.g., 'Farm', 'School')
- `funding_source_id`: string (foreign key to `funding_sources`, nullable)
- `date`: datetime
- `description`: string
- `status`: enum ('pending', 'completed', 'cancelled')

**Collection: `funding_sources`**

- `id`: string
- `name`: string
- `total_allocated`: float
- `current_balance`: float
- `restrictions`: text

**Collection: `loans`**

- `id`: string
- `borrower_id`: string (foreign key to `residents`)
- `principal_amount`: float
- `interest_rate`: float
- `term_months`: integer
- `status`: enum ('active', 'paid', 'defaulted')
- `outstanding_balance`: float

**Collection: `inventory`**

- `id`: string
- `item_name`: string
- `quantity`: integer
- `unit`: string (kg, liters, units)
- `reorder_threshold`: integer
- `linked_expense_id`: string (foreign key to `finance_transactions`, nullable)

### APIs and Interfaces

- `createTransaction(data: TransactionDTO): Promise<Transaction>`
- `getTransactions(filters: FilterOptions): Promise<Transaction[]>`
- `createLoan(data: LoanDTO): Promise<Loan>`
- `recordRepayment(loanId: string, amount: float): Promise<Transaction>`
- `generateReport(type: ReportType, dateRange: DateRange): Promise<Blob>`

### Workflows and Sequencing

**Expense -> Inventory Workflow:**

1. Finance Manager records an Expense with category "Farm Inputs".
2. UI presents "Add to Inventory" checkbox.
3. If checked, user enters Item Name and Quantity.
4. System creates `finance_transaction` record.
5. System immediately creates `inventory` record linked to the transaction.

## Non-Functional Requirements

### Performance

- **Dashboard Load:** Finance dashboard must load within 2 seconds.
- **Report Generation:** PDF reports for < 1000 transactions must generate within 3 seconds.

### Security

- **Role Access:** Only `Finance Manager` and `Admin` can create/edit financial records.
- **Audit Trail:** All edits/deletes to transactions must be soft-deleted or logged in an audit collection (to be defined in `system_logs`).

### Reliability/Availability

- **Data Integrity:** Transaction totals must always match the sum of individual records.
- **Offline Capability:** Basic viewing of cached data supported; recording transactions requires online connection (MVP).

### Observability

- **Logging:** Critical actions (Loan creation, Large expenses > 5000 ZMW) should trigger system alerts.

## Dependencies and Integrations

- **Appwrite SDK:** Core database interactions.
- **Chart.js / ApexCharts:** For dashboard visualizations (Income vs Expense).
- **jspdf / pdfmake:** For client-side report generation.
- **Epic 1 Dependency:** Requires `users` (Residents) for Loan borrowers and `roles` for RBAC.

## Acceptance Criteria (Authoritative)

1. **Income/Expense Recording:** Users can create, read, update, and delete transactions with all required fields.
2. **Donor Tracking:** Expenses can be linked to a Funding Source, decrementing its balance.
3. **Loan Management:** System calculates repayment schedules correctly; payments update outstanding balance.
4. **Inventory Sync:** Recording a "Farm Input" expense automatically creates the corresponding inventory item.
5. **RBAC Enforcement:** Non-finance users cannot access Finance pages or API endpoints.
6. **Reporting:** Users can export a "Donor Usage Report" showing all transactions for a specific funding source.

## Traceability Mapping

| AC ID | Spec Section    | Component       | Test Idea                                             |
| :---- | :-------------- | :-------------- | :---------------------------------------------------- |
| AC-1  | Data Models     | FinanceModule   | CRUD test for Income transaction                      |
| AC-2  | Workflows       | FinanceModule   | Verify Funding Source balance decreases after Expense |
| AC-3  | Detailed Design | LendingService  | Create loan, record payment, check balance            |
| AC-4  | Workflows       | InventoryModule | Create Expense (Farm Input) -> Check Inventory List   |
| AC-5  | Security        | Router/API      | Login as "Resident" -> Try to access /finance         |

## Risks, Assumptions, Open Questions

**Risks:**

- **Data Migration:** If we change the schema later, migrating financial data is high-risk.
  - _Mitigation:_ Spend extra time on Schema Review (Action Item 3 from Retro).
- **Concurrency:** Two users editing the same Funding Source balance simultaneously.
  - _Mitigation:_ Use Appwrite atomic operations or optimistic locking if available (or accept last-write-wins for MVP).

**Assumptions:**

- Currency is always ZMW (Zambian Kwacha) as per Village Config.
- Inventory items are simple (no complex variants or batch tracking for MVP).

**Open Questions:**

- Do we need to handle partial loan repayments (e.g., paying less than the scheduled amount)? _Assumption: Yes, treat as general credit to balance._

## Test Strategy Summary

- **Manual Testing Only:** All features will be verified manually.
- **Test Cases:** Detailed manual test cases must be documented in `docs/testing.md` for:
  - Financial calculations (Loan repayment, Interest).
  - Workflow triggers (Expense -> Inventory creation).
  - RBAC enforcement (Finance Manager vs. other roles).
- **Regression Testing:** Manual regression testing required before each release.
