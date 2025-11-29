# Epic 2 Schema: Financial Management & Inventory

This diagram visualizes the data models and relationships for the Financial Management and Inventory Tracking epic.

```mermaid
erDiagram
    %% Core Finance Entities
    FINANCE_TRANSACTION {
        string id PK
        enum type "income, expense"
        float amount
        string category
        string source_module
        string funding_source_id FK "Nullable"
        datetime date
        string description
        enum status "pending, completed, cancelled"
    }

    FUNDING_SOURCE {
        string id PK
        string name
        float total_allocated
        float current_balance
        string restrictions
    }

    %% Lending Entities
    LOAN {
        string id PK
        string borrower_id FK "Ref: Residents"
        float principal_amount
        float interest_rate
        int term_months
        enum status "active, paid, defaulted"
        float outstanding_balance
    }

    %% Inventory Entities
    INVENTORY {
        string id PK
        string item_name
        int quantity
        string unit
        int reorder_threshold
        string linked_expense_id FK "Ref: FinanceTransaction, Nullable"
    }

    %% External Entities (from Epic 1)
    RESIDENT {
        string id PK
        string name
    }

    %% Relationships
    FUNDING_SOURCE ||--o{ FINANCE_TRANSACTION : "funds"
    FINANCE_TRANSACTION ||--o| INVENTORY : "creates (if Farm Input)"
    RESIDENT ||--o{ LOAN : "borrows"
```

## Key Relationships & Constraints

1.  **Funding Source Tracking:**
    - `FINANCE_TRANSACTION` links to `FUNDING_SOURCE` via `funding_source_id`.
    - **Constraint:** When an expense is recorded with a `funding_source_id`, the `current_balance` of that source must be decremented.

2.  **Inventory Integration:**
    - `INVENTORY` links to `FINANCE_TRANSACTION` via `linked_expense_id`.
    - **Workflow:** An expense with category "Farm Inputs" triggers the creation of an `INVENTORY` item. The `linked_expense_id` provides traceability back to the cost.

3.  **Lending:**
    - `LOAN` links to `RESIDENT` (from Epic 1) via `borrower_id`.
    - **Workflow:** Loan repayments will be recorded as `FINANCE_TRANSACTION` (Income) records, likely linked back to the `LOAN` (we might need a `loan_id` on transaction or a separate join table, but for MVP, a `reference_id` or description in Transaction might suffice, or we add `loan_id` to Transaction schema).

    > _Self-Correction:_ The ERD highlights a potential missing link. How do we link a Repayment Transaction back to the Loan?
    > _Recommendation:_ Add `related_entity_id` and `related_entity_type` to `FINANCE_TRANSACTION` for polymorphic associations (Loans, etc.), OR explicitly add `loan_id`. Given Appwrite's NoSQL nature, explicit nullable fields or a generic reference ID is common. Let's stick to `reference_id` in Transaction for now, or add `loan_id` if we want strict FKs.

```mermaid
classDiagram
    class FinanceTransaction {
        +String id
        +String type
        +Float amount
        +String funding_source_id
        +String related_reference_id
        +String related_reference_type
    }
    note for FinanceTransaction "related_reference_id can point to Loan ID"
```
