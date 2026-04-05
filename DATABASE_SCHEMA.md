# Database Schema

The Village Management System uses Appwrite's TablesDB for data storage with a normalized schema design. All tables use ID-based relationships to prevent data duplication and maintain referential integrity.

## Core Tables

### users

Stores authentication and user account information.

| Column       | Type     | Constraints                 | Description                           |
| ------------ | -------- | --------------------------- | ------------------------------------- |
| `id`         | string   | Primary Key, Auto-generated | Unique user identifier                |
| `email`      | string   | Required, Unique, Indexed   | User email address for authentication |
| `name`       | string   | Required                    | User's display name                   |
| `created_at` | datetime | Auto-generated              | Account creation timestamp            |
| `updated_at` | datetime | Auto-updated                | Last modification timestamp           |

### residents

Stores comprehensive resident profile information with multi-role support.

| Column         | Type     | Constraints                          | Description                                 |
| -------------- | -------- | ------------------------------------ | ------------------------------------------- |
| `id`           | string   | Primary Key, Auto-generated          | Unique resident identifier                  |
| `first_name`   | string   | Required                             | Resident's first name                       |
| `middle_names` | string   | Optional                             | Resident's middle names (can be null)       |
| `last_name`    | string   | Required                             | Resident's last name                        |
| `dob`          | datetime | Optional                             | Date of birth                               |
| `gender`       | string   | Optional, Enum: Male/Female/Other    | Gender identity                             |
| `contact`      | string   | Optional                             | Contact information (phone/email)           |
| `household_id` | string   | Foreign Key → households.id, Indexed | Reference to household                      |
| `role_ids`     | string[] | Indexed                              | Array of role IDs for multi-role assignment |
| `created_at`   | datetime | Auto-generated                       | Record creation timestamp                   |
| `updated_at`   | datetime | Auto-updated                         | Last modification timestamp                 |

### households

Stores household information and composition.

| Column             | Type     | Constraints                         | Description                  |
| ------------------ | -------- | ----------------------------------- | ---------------------------- |
| `id`               | string   | Primary Key, Auto-generated         | Unique household identifier  |
| `name`             | string   | Required                            | Household name or identifier |
| `head_resident_id` | string   | Foreign Key → residents.id, Indexed | Reference to household head  |
| `address`          | string   | Optional                            | Physical address or location |
| `created_at`       | datetime | Auto-generated                      | Record creation timestamp    |
| `updated_at`       | datetime | Auto-updated                        | Last modification timestamp  |

### roles

Stores role definitions with permissions and storage quotas for RBAC.

| Column          | Type     | Constraints                 | Description                                    |
| --------------- | -------- | --------------------------- | ---------------------------------------------- |
| `id`            | string   | Primary Key, Auto-generated | Unique role identifier                         |
| `name`          | string   | Required, Unique            | Role name (e.g., Admin, Village Head, Teacher) |
| `permissions`   | string[] | Required                    | Array of permission strings                    |
| `storage_quota` | integer  | Required                    | Storage quota in GB                            |
| `created_at`    | datetime | Auto-generated              | Record creation timestamp                      |
| `updated_at`    | datetime | Auto-updated                | Last modification timestamp                    |

## Finance Tables

### finance_transactions

Stores all financial transactions for income and expense tracking.

| Column              | Type     | Constraints                                       | Description                                |
| ------------------- | -------- | ------------------------------------------------- | ------------------------------------------ |
| `id`                | string   | Primary Key, Auto-generated                       | Unique transaction identifier              |
| `type`              | string   | Required, Enum: 'income','expense'                | Transaction type                           |
| `amount_needed`     | double   | Required, Min: 0                                  | Required amount for the transaction        |
| `amount_funded`     | double   | Required, Min: 0                                  | Funded amount for the transaction          |
| `category_id`       | string   | Optional, Foreign Key → finance_categories.id     | Transaction category (relationship)        |
| `source_module`     | string   | Required                                          | Source module (e.g., 'Farm', 'School')     |
| `funding_source_id` | string   | Optional, Foreign Key → funding_sources.id        | Linked funding source                      |
| `date`              | datetime | Required                                          | Transaction date                           |
| `description`       | string   | Required                                          | Transaction description                    |
| `status`            | string   | Required, Enum: 'pending','completed','cancelled' | Transaction status                         |
| `payment_method`    | string   | Required                                          | Payment method (Cash, Bank Transfer, etc.) |
| `subcategory`       | string   | Optional                                          | Transaction subcategory                    |
| `vendor`            | string   | Optional                                          | Vendor name                                |
| `receipt_number`    | string   | Optional                                          | Receipt number                             |
| `payment_status`    | string   | Optional                                          | Payment status                             |
| `loan_id`           | string   | Optional, Foreign Key → loans.id                  | Related loan (if applicable)               |
| `inventory_ids`     | string[] | Optional                                          | Related inventory items                    |
| `created_at`        | datetime | Auto-generated                                    | Record creation timestamp                  |
| `updated_at`        | datetime | Auto-updated                                      | Last modification timestamp                |

### funding_sources

Manages donor funds and their allocations.

| Column            | Type     | Constraints                 | Description                      |
| ----------------- | -------- | --------------------------- | -------------------------------- |
| `id`              | string   | Primary Key, Auto-generated | Unique funding source identifier |
| `name`            | string   | Required, Unique            | Donor or fund name               |
| `total_allocated` | float    | Required, Min: 0            | Total amount allocated to fund   |
| `current_balance` | float    | Required, Min: 0            | Remaining balance in fund        |
| `restrictions`    | text     | Optional                    | Usage restrictions or notes      |
| `created_at`      | datetime | Auto-generated              | Record creation timestamp        |
| `updated_at`      | datetime | Auto-updated                | Last modification timestamp      |

### loans

Stores village lending loan information and repayment details.

| Column                   | Type     | Constraints                                                      | Description                 |
| ------------------------ | -------- | ---------------------------------------------------------------- | --------------------------- |
| `id`                     | string   | Primary Key, Auto-generated                                      | Unique loan identifier      |
| `borrower_id`            | string   | Foreign Key → residents.id, Indexed                              | Loan recipient              |
| `principal_amount`       | float    | Required, Min: 0                                                 | Original loan amount        |
| `interest_rate`          | float    | Required, Min: 0, Max: 50                                        | Annual interest rate (%)    |
| `term_months`            | integer  | Required, Min: 1, Max: 60                                        | Loan duration in months     |
| `repayment_frequency`    | string   | Required, Enum: 'weekly','biweekly','monthly'                    | Payment frequency           |
| `collateral_description` | text     | Optional                                                         | Description of collateral   |
| `purpose`                | string   | Required, Enum: 'farm','education','medical','business','other'  | Loan purpose                |
| `disbursement_date`      | date     | Required                                                         | When funds were given       |
| `status`                 | string   | Required, Enum: 'active','overdue','late','defaulted','paid_off' | Current loan status         |
| `outstanding_balance`    | float    | Required, Min: 0                                                 | Remaining amount to pay     |
| `total_repayment`        | integer  | Required, Calculated                                             | Total amount to be repaid   |
| `payment_amount`         | integer  | Required, Calculated                                             | Amount per payment          |
| `next_due_date`          | date     | Calculated                                                       | Next payment due date       |
| `created_at`             | datetime | Auto-generated                                                   | Record creation timestamp   |
| `updated_at`             | datetime | Auto-updated                                                     | Last modification timestamp |

### loan_payments

Records individual loan payments and links to finance transactions.

| Column                   | Type     | Constraints                           | Description               |
| ------------------------ | -------- | ------------------------------------- | ------------------------- |
| `id`                     | string   | Primary Key, Auto-generated           | Unique payment identifier |
| `loan_id`                | string   | Foreign Key → loans.id, Indexed       | Related loan              |
| `amount`                 | integer  | Required, Min: 0                      | Payment amount            |
| `payment_date`           | date     | Required                              | When payment was made     |
| `payment_method`         | string   | Required                              | Cash, mobile, bank, etc.  |
| `notes`                  | text     | Optional                              | Payment notes             |
| `finance_transaction_id` | string   | Foreign Key → finance_transactions.id | Linked transaction        |
| `created_at`             | datetime | Auto-generated                        | Record creation timestamp |

### repayment_schedule

Stores the calculated repayment schedule for each loan.

| Column               | Type    | Constraints                                | Description                |
| -------------------- | ------- | ------------------------------------------ | -------------------------- |
| `id`                 | string  | Primary Key, Auto-generated                | Unique schedule identifier |
| `loan_id`            | string  | Foreign Key → loans.id, Indexed            | Related loan               |
| `installment_number` | integer | Required                                   | Sequence number            |
| `due_date`           | date    | Required                                   | When payment is due        |
| `amount`             | integer | Required, Min: 0                           | Payment amount             |
| `status`             | string  | Required, Enum: 'pending','paid','overdue' | Payment status             |
| `paid_date`          | date    | Optional                                   | Actual payment date        |
| `payment_id`         | string  | Foreign Key → loan_payments.id, Optional   | Related payment            |

### inventory

Tracks physical village assets, supplies, and harvested goods.

| Column              | Type    | Constraints                                     | Description                         |
| ------------------- | ------- | ----------------------------------------------- | ----------------------------------- |
| `id`                | string  | Primary Key, Auto-generated                     | Unique item identifier              |
| `item_name`         | string  | Required                                        | Name of the item/produce            |
| `quantity`          | integer | Required, Min: 0                                | Current quantity in stock           |
| `unit`              | string  | Required                                        | Unit of measurement (kg, pcs, etc.) |
| `reorder_threshold` | integer | Required, Min: 0                                | Alert threshold for low stock       |
| `transaction_id`    | string  | Optional, Foreign Key → finance_transactions.id | Linked purchase transaction         |

## Relationships

The database uses a normalized schema with ID-based relationships:

- **residents → households**: Many-to-one relationship via `residents.household_id` referencing `households.id`
- **households → residents**: One-to-many relationship via `households.head_resident_id` referencing `residents.id`
- **residents → roles**: Many-to-many relationship via `residents.role_ids` array containing role IDs
- **loans → residents**: Many-to-one relationship via `loans.borrower_id` referencing `residents.id`
- **loan_payments → loans**: Many-to-one relationship via `loan_payments.loan_id` referencing `loans.id`
- **repayment_schedule → loans**: Many-to-one relationship via `repayment_schedule.loan_id` referencing `loans.id`
- **loan_payments → finance_transactions**: One-to-one relationship via `loan_payments.finance_transaction_id` referencing `finance_transactions.id`
- **finance_transactions → funding_sources**: Many-to-one relationship via `finance_transactions.funding_source_id` referencing `funding_sources.id`

## Indexes

Indexes are created on frequently queried fields to optimize performance:

| Table                  | Column              | Purpose                                 |
| ---------------------- | ------------------- | --------------------------------------- |
| `users`                | `email`             | Fast user lookup during authentication  |
| `residents`            | `household_id`      | Efficient household member queries      |
| `residents`            | `role_ids`          | Role-based filtering and access control |
| `households`           | `head_resident_id`  | Quick household head lookups            |
| `finance_transactions` | `date`              | Date range queries for reports          |
| `finance_transactions` | `type`              | Filter by income/expense                |
| `finance_transactions` | `funding_source_id` | Filter by funding source                |
| `loans`                | `borrower_id`       | Find all loans for a resident           |
| `loans`                | `status`            | Filter active/paid/defaulted loans      |
| `loans`                | `next_due_date`     | Overdue loan queries                    |
| `loan_payments`        | `loan_id`           | Find all payments for a loan            |
| `loan_payments`        | `payment_date`      | Payment history queries                 |
| `repayment_schedule`   | `loan_id`           | Get full schedule for a loan            |
| `repayment_schedule`   | `due_date`          | Find due/overdue installments           |
| `repayment_schedule`   | `status`            | Filter by payment status                |
| `funding_sources`      | `name`              | Quick donor lookup                      |

## Permissions

Table-level permissions are configured for role-based access control:

- **Read Access**: All authenticated users can read data from all tables
- **Write Access**: Only users with Admin or Village Head roles can create, update, or delete records
- **Row-Level Permissions**: Future enhancement for user-specific data access

## Example Queries

### List all residents in a household

```javascript
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const householdResidents = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.equal('household_id', 'household_123')],
});
```

### Get household with head resident details

```javascript
// First, get the household
const household = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'households',
  rowId: 'household_123',
});

// Then, get the head resident
const headResident = await tables.getRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: household.head_resident_id,
});
```

### Find all residents with a specific role

```javascript
const teachers = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'residents',
  queries: [Query.search('role_ids', 'teacher_role_id')],
});
```

### Create a new resident

```javascript
const newResident = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'residents',
  rowId: 'unique()',
  data: {
    name: 'John Doe',
    dob: '1990-01-15',
    gender: 'Male',
    contact: '+260-97-123-4567',
    household_id: 'household_123',
    role_ids: ['resident_role_id'],
  },
});
```

### Create a new loan

```javascript
const newLoan = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'loans',
  rowId: 'unique()',
  data: {
    borrower_id: 'resident_456',
    principal_amount: 5000.0,
    interest_rate: 10.0,
    term_months: 12,
    repayment_frequency: 'monthly',
    purpose: 'farm',
    disbursement_date: '2025-01-01',
    status: 'active',
    outstanding_balance: 5500.0,
    total_repayment: 5500.0,
    payment_amount: 458.33,
    next_due_date: '2025-02-01',
  },
});
```

### Get all active loans for a resident

```javascript
const residentLoans = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'loans',
  queries: [Query.equal('borrower_id', 'resident_456'), Query.equal('status', 'active')],
});
```

### Find overdue loans

```javascript
const today = new Date().toISOString().split('T')[0];
const overdueLoans = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'loans',
  queries: [Query.equal('status', 'active'), Query.lessThan('next_due_date', today)],
});
```

### Record a loan payment

```javascript
// First create the payment record
const payment = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'loan_payments',
  rowId: 'unique()',
  data: {
    loan_id: 'loan_789',
    amount: 458.33,
    payment_date: '2025-02-01',
    payment_method: 'cash',
    notes: 'Monthly payment',
  },
});

// Then create the linked finance transaction
const transaction = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'finance_transactions',
  rowId: 'unique()',
  data: {
    type: 'income',
    amount: 458.33,
    category: 'Loan Repayment',
    date: '2025-02-01',
    description: 'Loan repayment from John Doe',
    status: 'completed',
  },
});

// Link payment to transaction
await tables.updateRow({
  databaseId: 'villageDB',
  tableId: 'loan_payments',
  rowId: payment.$id,
  data: {
    finance_transaction_id: transaction.$id,
  },
});
```

### Get loan repayment schedule

```javascript
const schedule = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'repayment_schedule',
  queries: [Query.equal('loan_id', 'loan_789'), Query.orderAsc('installment_number')],
});
```

## Database Setup

For detailed instructions on setting up the Appwrite database, see [appwrite_setup/README.md](appwrite_setup/README.md).
