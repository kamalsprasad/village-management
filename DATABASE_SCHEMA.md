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

## Farm Tables

### plots

Stores farm plot information with soil characteristics and management assignments.

| Column                 | Type     | Constraints                                   | Description                               |
| ---------------------- | -------- | --------------------------------------------- | ----------------------------------------- |
| `id`                   | string   | Primary Key, Auto-generated                   | Unique plot identifier                    |
| `name`                 | string   | Required, max 100                             | Plot name (e.g., "North Field", "Plot A") |
| `size_hectares`        | float    | Required, min 0.01, max 1000                  | Size in hectares                          |
| `location_description` | string   | Optional, max 500                             | Description of location                   |
| `soil_type_id`         | string   | Optional, Foreign Key → soil_types.id         | Reference to soil type                    |
| `status`               | string   | Required, Enum: 'Active', 'Fallow', 'Retired' | Current plot status                       |
| `crop_manager_id`      | string   | Optional, Foreign Key → residents.id          | Assigned Crop Manager                     |
| `created_at`           | datetime | Auto-generated                                | Creation timestamp                        |
| `updated_at`           | datetime | Auto-updated                                  | Modification timestamp                    |

### soil_types

Configurable soil types for the farm module. Administrators can add custom soil types for their region.

| Column              | Type     | Constraints                 | Description                                 |
| ------------------- | -------- | --------------------------- | ------------------------------------------- |
| `id`                | string   | Primary Key, Auto-generated | Unique soil type identifier                 |
| `name`              | string   | Required, Unique            | Soil type name (e.g., "Sandy Loam", "Clay") |
| `description`       | string   | Optional, max 500           | Description and characteristics             |
| `color_code`        | string   | Optional                    | Hex color for visual representation         |
| `is_system_default` | boolean  | Default: false              | System types cannot be deleted              |
| `created_at`        | datetime | Auto-generated              | Creation timestamp                          |
| `updated_at`        | datetime | Auto-updated                | Modification timestamp                      |

**Default Soil Types (seeded):**

- Sandy
- Clay
- Loam
- Silt
- Peaty
- Chalky
- Other

### crops

Stores crop information and characteristics for the crop database.

| Column                      | Type     | Constraints                           | Description                                                        |
| --------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------ |
| `id`                        | string   | Primary Key, Auto-generated           | Unique crop identifier                                             |
| `crop_name`                 | string   | Required                              | Name of the crop                                                   |
| `crop_type`                 | string   | Required, Enum: 'Annual', 'Perennial' | Crop lifecycle type                                                |
| `maturity_days`             | integer  | Required, Min: 1                      | Days from planting to maturity                                     |
| `harvest_frequency`         | integer  | Optional                              | Days between harvests (for perennials)                             |
| `typical_yield_per_hectare` | float    | Optional                              | Average expected yield                                             |
| `growing_season`            | string   | Optional                              | Wet, Dry, or All Year                                              |
| `category`                  | string   | Required                              | Grains, Legumes, Vegetables, Root Crops, Fruits, Perennials, Other |
| `is_active`                 | boolean  | Default: true                         | Active crops appear in planting forms                              |
| `created_at`                | datetime | Auto-generated                        | Creation timestamp                                                 |
| `updated_at`                | datetime | Auto-updated                          | Modification timestamp                                             |

### plantings

Records crop plantings with seed inventory and labor cost tracking.

| Column                       | Type     | Constraints                                                                     | Description                            |
| ---------------------------- | -------- | ------------------------------------------------------------------------------- | -------------------------------------- |
| `id`                         | string   | Primary Key, Auto-generated                                                     | Unique planting identifier             |
| `plot_id`                    | string   | Required, Foreign Key → plots.id, Indexed                                       | Reference to plot                      |
| `crop_id`                    | string   | Required, Foreign Key → crops.id, Indexed                                       | Reference to crop                      |
| `planting_date`              | date     | Required                                                                        | When crop was planted                  |
| `expected_harvest_date`      | date     | Calculated                                                                      | Auto-calculated from crop maturity     |
| `seed_inventory_id`          | string   | Optional, Foreign Key → inventory.id                                            | Seed source from inventory             |
| `seed_cost`                  | float    | Optional, Min: 0                                                                | Cost of seeds if purchased separately  |
| `seed_source`                | string   | Optional, Enum: 'From Inventory', 'Purchased Separately', 'Donated'             | Origin of seeds                        |
| `planting_labor_farmhands`   | integer  | Optional, Min: 0                                                                | Number of workers for planting         |
| `planting_labor_cost`        | float    | Optional, Min: 0                                                                | Total labor cost for planting          |
| `planting_labor_notes`       | string   | Optional                                                                        | Notes about labor                      |
| `planting_other_costs`       | float    | Optional, Min: 0                                                                | Miscellaneous costs (fertilizer, etc.) |
| `planting_other_costs_notes` | string   | Optional                                                                        | Notes about other costs                |
| `status`                     | string   | Required, Enum: 'Planted', 'Growing', 'Harvesting', 'Completed', 'Failed'       | Current status                         |
| `failure_reason`             | string   | Optional, Enum: 'Drought', 'Pests', 'Disease', 'Flooding', 'Poor Soil', 'Other' | Reason if failed                       |
| `created_at`                 | datetime | Auto-generated                                                                  | Creation timestamp                     |
| `updated_at`                 | datetime | Auto-updated                                                                    | Modification timestamp                 |

### harvests

Records harvest data with labor cost tracking for profitability analysis.

| Column                      | Type     | Constraints                                                               | Description                          |
| --------------------------- | -------- | ------------------------------------------------------------------------- | ------------------------------------ |
| `id`                        | string   | Primary Key, Auto-generated                                               | Unique harvest identifier            |
| `planting_id`               | string   | Required, Foreign Key → plantings.id, Indexed                             | Reference to planting                |
| `harvest_type`              | string   | Required, Enum: 'Single Day', 'Multi-Day Aggregate', 'Continuous Picking' | Harvest type                         |
| `harvest_date`              | date     | Required (for single day)                                                 | Harvest date                         |
| `harvest_start_date`        | date     | Optional                                                                  | Start date for multi-day             |
| `harvest_end_date`          | date     | Optional                                                                  | End date for multi-day               |
| `total_quantity_kg`         | float    | Required, Min: 0                                                          | Total harvest quantity               |
| `daily_breakdown`           | object[] | Optional                                                                  | Array of daily details for multi-day |
| `harvest_labor_farmhands`   | integer  | Optional, Min: 0                                                          | Workers for harvest                  |
| `harvest_labor_cost`        | float    | Optional, Min: 0                                                          | Labor cost for harvest               |
| `harvest_other_costs`       | float    | Optional, Min: 0                                                          | Miscellaneous costs                  |
| `harvest_other_costs_notes` | string   | Optional                                                                  | Notes about other costs              |
| `status`                    | string   | Required, Enum: 'In Progress', 'Completed'                                | Current status                       |
| `inventory_item_id`         | string   | Optional, Foreign Key → inventory.id                                      | Auto-created inventory reference     |
| `created_at`                | datetime | Auto-generated                                                            | Creation timestamp                   |
| `updated_at`                | datetime | Auto-updated                                                              | Modification timestamp               |

### farm_sales

Links farm produce sales to inventory, harvests, and finance transactions.

| Column                   | Type     | Constraints                                     | Description                    |
| ------------------------ | -------- | ----------------------------------------------- | ------------------------------ |
| `id`                     | string   | Primary Key, Auto-generated                     | Unique sale identifier         |
| `inventory_item_id`      | string   | Required, Foreign Key → inventory.id            | Sold inventory item            |
| `harvest_id`             | string   | Required, Foreign Key → harvests.id             | Source harvest                 |
| `finance_transaction_id` | string   | Required, Foreign Key → finance_transactions.id | Linked income transaction      |
| `buyer`                  | string   | Required                                        | Buyer name or identifier       |
| `quantity_sold`          | float    | Required, Min: 0                                | Quantity sold in kg            |
| `price_per_kg`           | float    | Required, Min: 0                                | Price per kilogram             |
| `total_amount`           | float    | Required, Min: 0                                | Total sale amount              |
| `payment_method`         | string   | Required                                        | Cash, Mobile Money, Bank, etc. |
| `payment_status`         | string   | Required, Enum: 'Pending', 'Completed'          | Payment status                 |
| `sale_date`              | date     | Required                                        | Date of sale                   |
| `notes`                  | string   | Optional                                        | Additional notes               |
| `created_at`             | datetime | Auto-generated                                  | Creation timestamp             |
| `updated_at`             | datetime | Auto-updated                                    | Modification timestamp         |

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

| Column            | Type     | Constraints                                 | Description                      |
| ----------------- | -------- | ------------------------------------------- | -------------------------------- |
| `id`              | string   | Primary Key, Auto-generated                 | Unique funding source identifier |
| `name`            | string   | Required, Unique                            | Donor or fund name               |
| `type`            | string   | Enum: 'grant', 'donation', 'income', 'loan' | Type of funding source           |
| `total_received`  | float    | Required, Min: 0                            | Total amount received            |
| `current_balance` | float    | Required, Min: 0                            | Remaining balance in fund        |
| `restrictions`    | text     | Optional                                    | Usage restrictions or notes      |
| `status`          | string   | Enum: 'active', 'inactive', 'depleted'      | Current status                   |
| `date_received`   | datetime | Optional                                    | When funds were received         |
| `created_at`      | datetime | Auto-generated                              | Record creation timestamp        |
| `updated_at`      | datetime | Auto-updated                                | Last modification timestamp      |

### finance_categories

Stores income and expense categories for transaction classification.

| Column              | Type     | Constraints                         | Description                         |
| ------------------- | -------- | ----------------------------------- | ----------------------------------- |
| `id`                | string   | Primary Key, Auto-generated         | Unique category identifier          |
| `name`              | string   | Required                            | Category name                       |
| `type`              | string   | Required, Enum: 'income', 'expense' | Category type                       |
| `subcategories`     | string[] | Optional                            | Array of subcategory names          |
| `is_system_default` | boolean  | Optional, Default: false            | System categories cannot be deleted |
| `created_at`        | datetime | Auto-generated                      | Record creation timestamp           |
| `updated_at`        | datetime | Auto-updated                        | Last modification timestamp         |

### transaction_links

Links transactions for funding relationships (workaround for Appwrite self-referencing relationship limitation).

| Column                  | Type     | Constraints                                     | Description                     |
| ----------------------- | -------- | ----------------------------------------------- | ------------------------------- |
| `id`                    | string   | Primary Key, Auto-generated                     | Unique link identifier          |
| `parent_transaction_id` | string   | Required, Foreign Key → finance_transactions.id | The expense being funded        |
| `child_transaction_id`  | string   | Optional, Foreign Key → finance_transactions.id | Optional income providing funds |
| `funding_source_id`     | string   | Optional, Foreign Key → funding_sources.id      | Source of funds                 |
| `link_type`             | string   | Required, Enum: 'funding'                       | Type of link                    |
| `amount`                | float    | Required, Min: 0                                | Amount linked                   |
| `recorded_by`           | string   | Required, Foreign Key → users.id                | Who created the link            |
| `notes`                 | text     | Optional                                        | Notes about the link            |
| `created_at`            | datetime | Auto-generated                                  | Record creation timestamp       |

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

| Column                | Type     | Constraints                                                                               | Description                                                                                                          |
| --------------------- | -------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                  | string   | Primary Key, Auto-generated                                                               | Unique item identifier                                                                                               |
| `item_name`           | string   | Required                                                                                  | Name of the item/produce                                                                                             |
| `item_type`           | string   | Required                                                                                  | Type: 'Farm Inputs', 'School Supplies', 'Medical Supplies', 'Kitchen Supplies', 'Farm Produce', 'Equipment', 'Other' |
| `quantity`            | integer  | Required, Min: 0                                                                          | Current quantity in stock                                                                                            |
| `unit`                | string   | Required                                                                                  | Unit of measurement (kg, pcs, etc.)                                                                                  |
| `unit_cost`           | float    | Optional, Min: 0                                                                          | Cost per unit                                                                                                        |
| `estimated_value`     | float    | Optional, Min: 0                                                                          | Total estimated value                                                                                                |
| `status`              | string   | Required, Enum: 'In Stock', 'Low Stock', 'Out of Stock', 'Reserved', 'Available for Sale' | Current status                                                                                                       |
| `source`              | string   | Required                                                                                  | Source: 'Finance Purchase', 'Farm Harvest', 'Donation', 'Other'                                                      |
| `source_reference_id` | string   | Optional                                                                                  | ID of source (expense transaction, harvest, etc.)                                                                    |
| `reorder_threshold`   | integer  | Required, Min: 0                                                                          | Alert threshold for low stock                                                                                        |
| `transaction_id`      | string   | Optional, Foreign Key → finance_transactions.id                                           | Linked purchase transaction                                                                                          |
| `date_added`          | datetime | Required                                                                                  | When item was added to inventory                                                                                     |
| `created_at`          | datetime | Auto-generated                                                                            | Record creation timestamp                                                                                            |
| `updated_at`          | datetime | Auto-updated                                                                              | Last modification timestamp                                                                                          |

## Relationships

The database uses a normalized schema with ID-based relationships:

- **residents → households**: Many-to-one relationship via `residents.household_id` referencing `households.id`
- **households → residents**: One-to-many relationship via `households.head_resident_id` referencing `residents.id`
- **residents → roles**: Many-to-many relationship via `residents.role_ids` array containing role IDs
- **plots → soil_types**: Many-to-one via `plots.soil_type_id` referencing `soil_types.id`
- **plots → residents**: Many-to-one via `plots.crop_manager_id` referencing `residents.id` (Crop Manager assignment)
- **plantings → plots**: Many-to-one via `plantings.plot_id` referencing `plots.id`
- **plantings → crops**: Many-to-one via `plantings.crop_id` referencing `crops.id`
- **plantings → inventory**: Many-to-one via `plantings.seed_inventory_id` referencing `inventory.id`
- **harvests → plantings**: Many-to-one via `harvests.planting_id` referencing `plantings.id`
- **harvests → inventory**: One-to-one via `harvests.inventory_item_id` referencing `inventory.id`
- **farm_sales → inventory**: Many-to-one via `farm_sales.inventory_item_id` referencing `inventory.id`
- **farm_sales → harvests**: Many-to-one via `farm_sales.harvest_id` referencing `harvests.id`
- **farm_sales → finance_transactions**: Many-to-one via `farm_sales.finance_transaction_id` referencing `finance_transactions.id`
- **loans → residents**: Many-to-one relationship via `loans.borrower_id` referencing `residents.id`
- **loan_payments → loans**: Many-to-one relationship via `loan_payments.loan_id` referencing `loans.id`
- **repayment_schedule → loans**: Many-to-one relationship via `repayment_schedule.loan_id` referencing `loans.id`
- **loan_payments → finance_transactions**: One-to-one relationship via `loan_payments.finance_transaction_id` referencing `finance_transactions.id`
- **finance_transactions → funding_sources**: Many-to-one relationship via `finance_transactions.funding_source_id` referencing `funding_sources.id`
- **finance_transactions → finance_categories**: Many-to-one relationship via `finance_transactions.category_id` referencing `finance_categories.id`
- **transaction_links → finance_transactions**: Many-to-one via `transaction_links.parent_transaction_id` and `transaction_links.child_transaction_id`

## Indexes

Indexes are created on frequently queried fields to optimize performance:

| Table                  | Column                  | Purpose                                        |
| ---------------------- | ----------------------- | ---------------------------------------------- |
| `users`                | `email`                 | Fast user lookup during authentication         |
| `residents`            | `household_id`          | Efficient household member queries             |
| `residents`            | `role_ids`              | Role-based filtering and access control        |
| `households`           | `head_resident_id`      | Quick household head lookups                   |
| `plots`                | `status`                | Filter plots by status (Active/Fallow/Retired) |
| `plots`                | `crop_manager_id`       | Find plots by assigned manager                 |
| `plantings`            | `plot_id`               | Find plantings for a plot                      |
| `plantings`            | `crop_id`               | Find plantings for a crop                      |
| `plantings`            | `status`                | Filter by planting status                      |
| `harvests`             | `planting_id`           | Find harvests for a planting                   |
| `crops`                | `category`              | Filter crops by category                       |
| `crops`                | `is_active`             | Filter active crops                            |
| `finance_transactions` | `date`                  | Date range queries for reports                 |
| `finance_transactions` | `type`                  | Filter by income/expense                       |
| `finance_transactions` | `funding_source_id`     | Filter by funding source                       |
| `loans`                | `borrower_id`           | Find all loans for a resident                  |
| `loans`                | `status`                | Filter active/paid/defaulted loans             |
| `loans`                | `next_due_date`         | Overdue loan queries                           |
| `loan_payments`        | `loan_id`               | Find all payments for a loan                   |
| `loan_payments`        | `payment_date`          | Payment history queries                        |
| `repayment_schedule`   | `loan_id`               | Get full schedule for a loan                   |
| `repayment_schedule`   | `due_date`              | Find due/overdue installments                  |
| `repayment_schedule`   | `status`                | Filter by payment status                       |
| `funding_sources`      | `name`                  | Quick donor lookup                             |
| `finance_categories`   | `type`                  | Filter categories by income/expense            |
| `finance_categories`   | `name`                  | Quick category lookup                          |
| `transaction_links`    | `parent_transaction_id` | Find all funding for a transaction             |
| `transaction_links`    | `funding_source_id`     | Find all links for a funding source            |

## Permissions

Table-level permissions are configured for role-based access control:

- **Read Access**: All authenticated users can read data from all tables
- **Write Access**: Only users with Admin or Village Head roles can create, update, or delete records
- **Row-Level Permissions**: Future enhancement for user-specific data access

## Example Queries

### Query plots with soil type and crop manager

```javascript
const plots = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'plots',
  queries: [Query.equal('status', 'Active'), Query.orderAsc('name')],
});

// Enrich with soil type and crop manager names
const enrichedPlots = await Promise.all(
  plots.rows.map(async (plot) => {
    const [soilType, cropManager] = await Promise.all([
      plot.soil_type_id
        ? tables.getRow({
            databaseId: 'villageDB',
            tableId: 'soil_types',
            rowId: plot.soil_type_id,
          })
        : null,
      plot.crop_manager_id
        ? tables.getRow({
            databaseId: 'villageDB',
            tableId: 'residents',
            rowId: plot.crop_manager_id,
          })
        : null,
    ]);
    return {
      ...plot,
      soil_type_name: soilType?.name || 'Not specified',
      crop_manager_name: cropManager
        ? `${cropManager.first_name} ${cropManager.last_name}`
        : 'Unassigned',
    };
  }),
);
```

### Create a new plot

```javascript
const newPlot = await tables.createRow({
  databaseId: 'villageDB',
  tableId: 'plots',
  rowId: 'unique()',
  data: {
    name: 'North Field',
    size_hectares: 2.5,
    location_description: 'North side of the village, near the river',
    soil_type_id: 'soil_loam_123',
    status: 'Active',
    crop_manager_id: 'resident_456',
  },
});
```

### Find plots by assigned crop manager

```javascript
const managerPlots = await tables.listRows({
  databaseId: 'villageDB',
  tableId: 'plots',
  queries: [Query.equal('crop_manager_id', 'resident_456')],
});
```

### Query plots by status for dashboard statistics

```javascript
const [activePlots, fallowPlots, retiredPlots] = await Promise.all([
  tables.listRows({
    databaseId: 'villageDB',
    tableId: 'plots',
    queries: [Query.equal('status', 'Active')],
  }),
  tables.listRows({
    databaseId: 'villageDB',
    tableId: 'plots',
    queries: [Query.equal('status', 'Fallow')],
  }),
  tables.listRows({
    databaseId: 'villageDB',
    tableId: 'plots',
    queries: [Query.equal('status', 'Retired')],
  }),
]);

const stats = {
  total: activePlots.total + fallowPlots.total + retiredPlots.total,
  active: activePlots.total,
  fallow: fallowPlots.total,
  retired: retiredPlots.total,
};
```

### Check if plot has plantings before deletion

```javascript
async function canDeletePlot(plotId) {
  const plantings = await tables.listRows({
    databaseId: 'villageDB',
    tableId: 'plantings',
    queries: [Query.equal('plot_id', plotId)],
  });

  return plantings.total === 0;
}

// Usage
const canDelete = await canDeletePlot('plot_123');
if (canDelete) {
  await tables.deleteRow({
    databaseId: 'villageDB',
    tableId: 'plots',
    rowId: 'plot_123',
  });
}
```

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
