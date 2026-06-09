# Database Schema

The Village Management System uses Appwrite's TablesDB for data storage with a normalized schema design. All tables use ID-based relationships to prevent data duplication and maintain referential integrity.

## Core Tables

### users

Stores authentication and user account information. Linked to a resident profile via `resident_id`.

| Column                       | Type    | Constraints                               | Description                                  |
| ---------------------------- | ------- | ----------------------------------------- | -------------------------------------------- |
| `id`                         | string  | Primary Key, Auto-generated               | Unique user identifier                       |
| `email`                      | string  | Required, Unique (idx_users_email_unique) | User email address for authentication        |
| `name`                       | string  | Required, max 255                         | User's display name                          |
| `storage_quota`              | integer | Optional, min 0, max 1000                 | Storage quota in GB (overrides role default) |
| `role_ids`                   | rel[]   | Optional, manyToMany → roles              | Assigned roles                               |
| `resident_id`                | rel     | Optional, oneToOne → residents            | Linked resident profile                      |
| `recorded_transaction_links` | rel[]   | Optional, child of transaction_links      | Transaction links recorded by this user      |

### roles

Stores role definitions with permissions and storage quotas for RBAC.

| Column          | Type     | Constraints                                                           | Description                                    |
| --------------- | -------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| `id`            | string   | Primary Key, Auto-generated                                           | Unique role identifier                         |
| `name`          | string   | Required, max 100                                                     | Role name (e.g., Admin, Village Head, Teacher) |
| `category`      | string   | Required, Enum: 'administration','council','farm','school','resident' | Role category for grouping                     |
| `permissions`   | string[] | Optional, max 100 each                                                | Array of permission strings                    |
| `storage_quota` | integer  | Optional, min 0, max 1000                                             | Storage quota in GB                            |

### residents

Stores comprehensive resident profile information.

| Column         | Type     | Constraints                                             | Description                           |
| -------------- | -------- | ------------------------------------------------------- | ------------------------------------- |
| `id`           | string   | Primary Key, Auto-generated                             | Unique resident identifier            |
| `first_name`   | string   | Required, max 50                                        | Resident's first name                 |
| `middle_names` | string   | Optional, max 255                                       | Resident's middle names (can be null) |
| `last_name`    | string   | Required, max 50                                        | Resident's last name                  |
| `dob`          | datetime | Optional                                                | Date of birth                         |
| `gender`       | string   | Required, Enum: Male/Female/Other                       | Gender identity                       |
| `phone`        | string   | Optional, max 20                                        | Phone number                          |
| `email`        | string   | Optional, email format                                  | Email address                         |
| `room_number`  | string   | Optional, max 25                                        | Room/unit number within household     |
| `notes`        | string   | Optional, max 500                                       | General notes                         |
| `household_id` | rel      | Optional, manyToOne → households (twoWay: resident_ids) | Reference to household                |
| `loans`        | rel[]    | Optional, child of loans.borrower_id                    | Loans taken by this resident          |

**Index:** `idx_residents_household_id` on `(first_name ASC, last_name ASC)`

### households

Stores household information and composition.

| Column              | Type     | Constraints                                                                                       | Description                     |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| `id`                | string   | Primary Key, Auto-generated                                                                       | Unique household identifier     |
| `name`              | string   | Required, max 255                                                                                 | Household name or identifier    |
| `address`           | string   | Optional, max 500                                                                                 | Physical address or location    |
| `construction_date` | datetime | Required                                                                                          | Date the structure was built    |
| `household_type`    | string   | Required, Enum: 'Single Family','Multi-Family','Dormitory','Guest House','Admin Building','Other' | Building type                   |
| `bedrooms`          | integer  | Optional, min 0, max 50                                                                           | Number of bedrooms              |
| `bathrooms`         | integer  | Optional, min 0, max 5                                                                            | Number of bathrooms             |
| `notes`             | string   | Optional, max 500                                                                                 | General notes                   |
| `resident_ids`      | rel[]    | Optional, child of residents.household_id (twoWay)                                                | All residents in this household |
| `head_resident_id`  | rel      | Optional, oneToOne → residents                                                                    | Reference to household head     |

**Index:** `idx_households_name` on `(name ASC)`

### village_settings

Stores global village configuration. One row per village.

| Column                 | Type     | Constraints                                                         | Description                              |
| ---------------------- | -------- | ------------------------------------------------------------------- | ---------------------------------------- |
| `id`                   | string   | Primary Key, Auto-generated                                         | Unique settings identifier               |
| `village_name`         | string   | Required, max 255                                                   | Name of the village                      |
| `address`              | string   | Optional, max 500                                                   | Village physical address                 |
| `established_date`     | datetime | Optional                                                            | Date village was established             |
| `default_currency`     | string   | Required, max 10                                                    | Currency code (e.g., ZMW)                |
| `currency_symbol`      | string   | Required, max 10                                                    | Currency symbol (e.g., K)                |
| `timezone`             | string   | Required, max 50                                                    | IANA timezone string                     |
| `country_code`         | string   | Required, max 10                                                    | ISO country code                         |
| `country_phone_code`   | string   | Required, max 10                                                    | Country dialing code (e.g., +260)        |
| `is_using_sample_data` | boolean  | Required                                                            | Whether sample data is active            |
| `modules_enabled`      | string[] | Optional, max 500 each                                              | List of enabled module names             |
| `yield_unit`           | string   | Required, Enum: 'kg_per_hectare','kg_per_acre','tonnes_per_hectare' | Default yield unit for farm module       |
| `farm_alert_config`    | string   | Optional, max 2000 (JSON)                                           | Story 3.10: Serialized alert config JSON |
| `council_member_ids`   | rel[]    | Optional, oneToMany → residents                                     | Village council members                  |

## Farm Tables

### soil_types

Configurable soil types for the farm module. Administrators can add custom soil types for their region.

| Column              | Type    | Constraints                 | Description                                 |
| ------------------- | ------- | --------------------------- | ------------------------------------------- |
| `id`                | string  | Primary Key, Auto-generated | Unique soil type identifier                 |
| `name`              | string  | Required, max 100           | Soil type name (e.g., "Sandy Loam", "Clay") |
| `description`       | string  | Optional, max 500           | Description and characteristics             |
| `color_code`        | string  | Optional, max 7             | Hex color for visual representation         |
| `is_system_default` | boolean | Required                    | System types cannot be deleted              |

**Index:** `idx_soil_types_name` on `(name ASC)`

**Default Soil Types (seeded):** Sandy, Clay, Loam, Silt, Peaty, Chalky, Other

### plots

Stores farm plot information with soil characteristics and management assignments.

| Column                 | Type   | Constraints                                 | Description                               |
| ---------------------- | ------ | ------------------------------------------- | ----------------------------------------- |
| `id`                   | string | Primary Key, Auto-generated                 | Unique plot identifier                    |
| `name`                 | string | Required, max 100                           | Plot name (e.g., "North Field", "Plot A") |
| `size_hectares`        | double | Required, min 1, max 10,000,000             | Size in hectares                          |
| `location_description` | string | Optional, max 500                           | Description of location                   |
| `status`               | string | Required, Enum: 'Active','Fallow','Retired' | Current plot status                       |
| `soil_type_id`         | rel    | Optional, manyToOne → soil_types            | Reference to soil type                    |
| `crop_manager_id`      | rel    | Optional, manyToOne → residents             | Assigned Crop Manager                     |

**Indexes:** `idx_plots_name` on `(name ASC)`, `idx_plots_status` on `(status ASC)`

### crops

Stores crop information and characteristics for the crop database.

| Column                      | Type    | Constraints                                                         | Description                             |
| --------------------------- | ------- | ------------------------------------------------------------------- | --------------------------------------- |
| `id`                        | string  | Primary Key, Auto-generated                                         | Unique crop identifier                  |
| `crop_name`                 | string  | Required, max 100, Unique (idx_crops_name)                          | Name of the crop                        |
| `category`                  | string  | Required, Enum: 'Grain','Vegetable','Fruit','Legume','Root','Other' | Crop category                           |
| `crop_type`                 | string  | Required, Enum: 'Annual','Perennial'                                | Crop lifecycle type                     |
| `maturity_days`             | integer | Required, min 1, max 1825                                           | Days from planting to maturity          |
| `harvest_frequency`         | integer | Optional, min 1, max 365                                            | Days between harvests (for perennials)  |
| `harvest_frequency_days`    | integer | Optional, min 1, max 365                                            | Alias/alternate harvest frequency field |
| `typical_yield_per_hectare` | double  | Optional, min 0, max 1,000,000                                      | Average expected yield                  |
| `growing_season`            | string  | Optional, Enum: 'Warm','Wet','Cool','All Year'                      | Preferred growing season                |
| `notes`                     | string  | Optional, max 500                                                   | Additional crop notes                   |
| `is_active`                 | boolean | Required                                                            | Active crops appear in planting forms   |

**Indexes:** `idx_crops_category`, `idx_crops_type` on `crop_type`, `idx_crops_active` on `is_active`, `idx_crops_name` (unique) on `crop_name`

### plantings

Records crop plantings with aggregated cost tracking. Costs are stored as integers (ZMW whole numbers). Multiple crops can be planted on the same plot simultaneously; `area_used_hectares` tracks the portion of the plot used. Seed source, vendor, and labor details are captured in the free-text `notes` field.

| Column                  | Type     | Constraints                                                                     | Description                                    |
| ----------------------- | -------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| `id`                    | string   | Primary Key, Auto-generated                                                     | Unique planting identifier                     |
| `planting_date`         | datetime | Required                                                                        | When crop was planted                          |
| `quantity_planted`      | integer  | Optional, min 1, max 1,000,000,000                                              | Quantity of seeds/seedlings/cuttings planted   |
| `unit`                  | string   | Optional, max 20                                                                | Unit for quantity_planted (kg, seedlings, etc) |
| `expected_harvest_date` | datetime | Optional, auto-calculated from crop maturity days                               | Expected harvest date                          |
| `actual_harvest_date`   | datetime | Optional                                                                        | Actual harvest date (set when harvested)       |
| `area_used_hectares`    | double   | Optional, min 0, max 100,000                                                    | Portion of plot used (supports multi-crop)     |
| `inputs_cost`           | integer  | Optional, min 0                                                                 | Total inputs cost: seeds + fertilizer (ZMW)    |
| `labor_cost`            | integer  | Optional, min 0                                                                 | Total labor cost for planting activity (ZMW)   |
| `other_cost`            | integer  | Optional, min 0                                                                 | Miscellaneous costs (ZMW)                      |
| `notes`                 | string   | Optional, max 1000                                                              | Free-text: seed source, vendor, labor details  |
| `status`                | string   | Required, Enum: 'planned','planted','growing','harvesting','completed','failed' | Current planting status (lowercase)            |
| `plot_id`               | rel      | Optional, manyToOne → plots                                                     | Reference to plot                              |
| `crop_id`               | rel      | Optional, manyToOne → crops                                                     | Reference to crop                              |

**Indexes:** `idx_plantings_date` on `(planting_date DESC)`, `idx_plantings_status` on `(status ASC)`

### harvests

Records harvest events for plantings. Each harvest is composed of one or more `harvest_entries` (daily picks). A harvest is "Single Day" when it has exactly one entry and has been marked complete; "Multi-Day" when it has multiple entries. The type is **derived**, not stored. Only one `In Progress` harvest is allowed per planting at a time (enforced in UI).

| Column               | Type     | Constraints                                                       | Description                                               |
| -------------------- | -------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `id`                 | string   | Primary Key, Auto-generated                                       | Unique harvest identifier                                 |
| `harvest_date`       | datetime | Optional                                                          | Legacy field (kept in DB; use harvest_start_date)         |
| `harvest_start_date` | datetime | Optional                                                          | First entry date (derived, maintained by store)           |
| `harvest_end_date`   | datetime | Optional                                                          | Last entry date (derived, maintained by store)            |
| `total_quantity_kg`  | double   | Required, min 0                                                   | Total harvested quantity (sum of entries)                 |
| `total_labor_cost`   | double   | Optional, min 0                                                   | Total labor cost (sum of entries)                         |
| `total_other_costs`  | double   | Optional, min 0                                                   | Total other costs (sum of entries)                        |
| `daily_breakdown`    | string[] | Optional, max 10000 each                                          | Legacy field (kept in DB; entries table is authoritative) |
| `status`             | string   | Required, Enum: 'In Progress','Completed', Default: 'In Progress' | Harvest status                                            |
| `notes`              | string   | Optional, max 1000                                                | General harvest notes                                     |
| `planting_id`        | rel      | Optional, manyToOne → plantings                                   | Reference to planting                                     |

**Note:** `harvest_date` and `daily_breakdown` remain in the DB for backwards compatibility but are not used by current application logic. `harvest_entries` is authoritative for daily data.

### harvest_entries

Individual harvest entries for multi-day and partial harvest recording. Each entry represents one day's harvest or a partial harvest addition to an in-progress harvest.

| Column              | Type     | Constraints                    | Description                      |
| ------------------- | -------- | ------------------------------ | -------------------------------- |
| `id`                | string   | Primary Key, Auto-generated    | Unique entry identifier          |
| `entry_date`        | datetime | Required                       | Date of this harvest entry       |
| `quantity_kg`       | double   | Required, min 0                | Quantity harvested this entry    |
| `farmhands_count`   | integer  | Optional, min 0                | Workers for this entry           |
| `labor_cost`        | double   | Optional, min 0, default 0     | Labor cost for this entry (ZMW)  |
| `other_costs`       | double   | Optional, min 0, default 0     | Other costs for this entry (ZMW) |
| `other_costs_notes` | string   | Optional, max 500              | Notes about other costs          |
| `notes`             | string   | Optional, max 500              | Entry-specific notes             |
| `harvest_id`        | rel      | Required, manyToOne → harvests | Parent harvest record            |

### farm_sales

Records farm produce sales with three-way integration to harvests, inventory, and finance transactions (Story 3.8). A sale automatically decrements linked inventory and creates a linked income transaction in `finance_transactions`. Story 3.9 added `crop_id` as a denormalized FK to enable direct crop-grouping queries for profitability reports without the 3-hop chain (farm_sales → inventory → plantings → crops).

**Buyer fields:** `buyer_name` is the primary field captured via the UI. `buyer_type` and `buyer_id` are reserved placeholders for future Vendor Module integration (Epic 5). For MVP, sales default to `buyer_type='external'` and `buyer_id=''`. See `docs/POST-MVP.md` for the migration plan.

| Column                   | Type     | Constraints                                                     | Description                                                                                   |
| ------------------------ | -------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`                     | string   | Primary Key, Auto-generated                                     | Unique sale identifier                                                                        |
| `harvest_id`             | rel      | Optional, manyToOne → harvests                                  | Source harvest                                                                                |
| `inventory_item_id`      | rel      | Optional, manyToOne → inventory (onDelete: restrict)            | Sold inventory item (Story 3.8)                                                               |
| `finance_transaction_id` | rel      | Optional, manyToOne → finance_transactions (onDelete: restrict) | Linked income transaction (Story 3.8)                                                         |
| `crop_id`                | rel      | Optional, manyToOne → crops (onDelete: setNull)                 | Denormalized source crop for direct grouping queries (Story 3.9). Populated at sale creation. |
| `buyer_type`             | string   | Required, Enum: 'household','external','market','cooperative'   | Type of buyer (MVP: hard-coded 'external')                                                    |
| `buyer_id`               | string   | Optional, max 50                                                | ID of buyer for household/vendor lookup (MVP: empty string)                                   |
| `buyer_name`             | string   | Required, max 200                                               | Name of buyer (primary user-facing field)                                                     |
| `sale_date`              | datetime | Required                                                        | Date of sale                                                                                  |
| `quantity_sold`          | float    | Required, min 0, max 1,000,000,000,000                          | Quantity sold (supports 2 decimal places)                                                     |
| `unit`                   | string   | Required, max 20, default: 'kg'                                 | Unit of measurement (kg, pcs, etc.)                                                           |
| `price_per_unit`         | float    | Required, min 0, max 1,000,000,000,000                          | Price per unit in ZMW (2 decimal places)                                                      |
| `total_amount`           | float    | Required, min 0, max 1,000,000,000,000                          | Total sale amount in ZMW (2 decimal places)                                                   |
| `payment_status`         | string   | Required, Enum: 'Pending','Completed'                           | Payment status                                                                                |
| `payment_method`         | string   | Optional, max 50                                                | Cash, Mobile Money, Bank Transfer, Cheque, Credit, Other                                      |
| `notes`                  | string   | Optional, max 1000                                              | Additional notes                                                                              |

**Indexes:** `idx_farm_sales_date` on `(sale_date DESC)`, `idx_farm_sales_buyer` on `(buyer_type ASC, buyer_id ASC)`

### farm_alerts

Reserved for future persistent alert storage (Story 3.10 POST-MVP). Not used in MVP — alerts are generated in-memory. Schema defined now to support migration to persistent storage later.

| Column                | Type     | Constraints             | Description                  |
| --------------------- | -------- | ----------------------- | ---------------------------- |
| `alert_type`          | string   | Required, max 50        | Alert type slug              |
| `severity`            | string   | Required, max 20        | critical / warning / info    |
| `title`               | string   | Required, max 255       | Human-readable alert title   |
| `message`             | string   | Optional, max 1000      | Detailed alert message       |
| `related_entity_type` | string   | Optional, max 50        | planting / inventory / etc.  |
| `related_entity_id`   | string   | Optional, max 50        | ID of related entity         |
| `triggered_at`        | datetime | Required                | When the alert was triggered |
| `is_read`             | boolean  | Required, default false | Read state per user          |
| `dismissed_at`        | datetime | Optional                | When the alert was dismissed |

**Indexes:** `idx_farm_alerts_user` on `(user_id ASC)`, `idx_farm_alerts_type` on `(alert_type ASC)`, `idx_farm_alerts_triggered` on `(triggered_at DESC)`

## Finance Tables

### finance_transactions

Stores all financial transactions for income and expense tracking.

| Column                   | Type     | Constraints                                                            | Description                                                  |
| ------------------------ | -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `id`                     | string   | Primary Key, Auto-generated                                            | Unique transaction identifier                                |
| `type`                   | string   | Required, Enum: 'expense','income','transfer'                          | Transaction type                                             |
| `amount_needed`          | double   | Required                                                               | Required amount for the transaction                          |
| `amount_funded`          | double   | Required                                                               | Funded amount for the transaction                            |
| `payment_method`         | string   | Required, Enum: 'Bank Transfer','Cash','Cheque','Mobile Money','Other' | Payment method                                               |
| `source_module`          | string   | Required, max 50                                                       | Source module (e.g., 'Farm', 'School')                       |
| `date`                   | datetime | Required                                                               | Transaction date                                             |
| `description`            | string   | Required, max 500                                                      | Transaction description                                      |
| `status`                 | string   | Required, max 20                                                       | Transaction status (e.g., 'pending','completed','cancelled') |
| `subcategory`            | string   | Optional, max 100                                                      | Transaction subcategory                                      |
| `vendor`                 | string   | Optional, max 255                                                      | Vendor name                                                  |
| `receipt_number`         | string   | Optional, max 100                                                      | Receipt number                                               |
| `payment_status`         | string   | Optional, Enum: 'paid','unpaid','partial'                              | Payment status                                               |
| `inventory_items`        | rel[]    | Optional, child of inventory.transaction_id (twoWay)                   | Inventory item linked to this transaction                    |
| `category_id`            | rel      | Optional, manyToOne → finance_categories (twoWay: transaction_ids)     | Transaction category                                         |
| `funding_source_id`      | rel      | Optional, manyToOne → funding_sources (twoWay: transaction_ids)        | Linked funding source                                        |
| `loan_id`                | rel      | Optional, manyToOne → loans (twoWay: transaction_ids)                  | Related loan (if applicable)                                 |
| `inventory_ids`          | rel[]    | Optional, oneToMany → inventory                                        | Related inventory items                                      |
| `funding_links_received` | rel[]    | Optional, child of transaction_links.parent_transaction_id             | Funding links where this is the expense                      |
| `funding_links_provided` | rel[]    | Optional, child of transaction_links.child_transaction_id              | Funding links where this provides funds                      |

### funding_sources

Manages donor funds and their allocations.

| Column                 | Type     | Constraints                                                        | Description                         |
| ---------------------- | -------- | ------------------------------------------------------------------ | ----------------------------------- |
| `id`                   | string   | Primary Key, Auto-generated                                        | Unique funding source identifier    |
| `name`                 | string   | Required                                                           | Donor or fund name                  |
| `type`                 | string   | Enum: 'grant','donation','income','loan'                           | Type of funding source              |
| `total_received`       | double   | Required                                                           | Total amount received               |
| `current_balance`      | double   | Required                                                           | Remaining balance in fund           |
| `date_received`        | datetime | Optional                                                           | When funds were received            |
| `restrictions`         | string   | Optional, max 1000                                                 | Usage restrictions or notes         |
| `status`               | string   | Required, Enum: 'active','inactive','depleted'                     | Current status                      |
| `transaction_ids`      | rel[]    | Optional, child of finance_transactions.funding_source_id (twoWay) | Transactions using this source      |
| `funding_links_source` | rel[]    | Optional, child of transaction_links.funding_source_id (twoWay)    | Transaction links using this source |

### finance_categories

Stores income and expense categories for transaction classification.

| Column              | Type     | Constraints                                                  | Description                         |
| ------------------- | -------- | ------------------------------------------------------------ | ----------------------------------- |
| `id`                | string   | Primary Key, Auto-generated                                  | Unique category identifier          |
| `name`              | string   | Required                                                     | Category name                       |
| `type`              | string   | Required, Enum: 'income','expense'                           | Category type                       |
| `subcategories`     | string[] | Optional                                                     | Array of subcategory names          |
| `is_system_default` | boolean  | Optional, Default: false                                     | System categories cannot be deleted |
| `transaction_ids`   | rel[]    | Optional, child of finance_transactions.category_id (twoWay) | Transactions in this category       |

### transaction_links

Links transactions for funding relationships (workaround for Appwrite self-referencing relationship limitation).

| Column                  | Type     | Constraints                                                                 | Description               |
| ----------------------- | -------- | --------------------------------------------------------------------------- | ------------------------- |
| `id`                    | string   | Primary Key, Auto-generated                                                 | Unique link identifier    |
| `amount`                | double   | Required                                                                    | Amount linked             |
| `notes`                 | string   | Optional, max 500                                                           | Notes about the link      |
| `created_at`            | datetime | Required                                                                    | Record creation timestamp |
| `parent_transaction_id` | rel      | Optional, manyToOne → finance_transactions (twoWay: funding_links_received) | The expense being funded  |
| `child_transaction_id`  | rel      | Optional, manyToOne → finance_transactions (twoWay: funding_links_provided) | Income providing funds    |
| `funding_source_id`     | rel      | Optional, manyToOne → funding_sources (twoWay: funding_links_source)        | Source of funds           |
| `recorded_by`           | rel      | Optional, manyToOne → users (twoWay: recorded_transaction_links)            | Who created the link      |

**Note:** `link_type` field is not present in the live DB; all links are implicitly of type 'funding'.

### loans

Stores village lending loan information and repayment details.

| Column                   | Type     | Constraints                                                          | Description                              |
| ------------------------ | -------- | -------------------------------------------------------------------- | ---------------------------------------- |
| `id`                     | string   | Primary Key, Auto-generated                                          | Unique loan identifier                   |
| `principal_amount`       | double   | Required                                                             | Original loan amount                     |
| `interest_rate`          | double   | Required                                                             | Annual interest rate (%)                 |
| `term_months`            | integer  | Required                                                             | Loan duration in months                  |
| `repayment_frequency`    | string   | Required, Enum: 'weekly','biweekly','monthly','quarterly','annually' | Payment frequency                        |
| `purpose`                | string   | Required, Enum: 'farm','business','medical','education','other'      | Loan purpose                             |
| `collateral_description` | string   | Optional, max 500                                                    | Description of collateral                |
| `disbursement_date`      | datetime | Optional                                                             | When funds were given                    |
| `total_repayment`        | double   | Required                                                             | Total amount to be repaid                |
| `payment_amount`         | double   | Required                                                             | Amount per payment                       |
| `next_due_date`          | datetime | Optional                                                             | Next payment due date                    |
| `status`                 | string   | Required, Enum: 'active','overdue','late','defaulted','paid_off'     | Current loan status                      |
| `outstanding_balance`    | double   | Required                                                             | Remaining amount to pay                  |
| `borrower_id`            | rel      | Optional, manyToOne → residents (twoWay: loans)                      | Loan recipient                           |
| `transaction_ids`        | rel[]    | Optional, child of finance_transactions.loan_id (twoWay)             | Finance transactions linked to this loan |
| `repayment_schedules`    | rel[]    | Optional, child of repayment_schedule.loan_id (twoWay)               | Repayment schedule entries               |
| `loan_payments`          | rel[]    | Optional, child of loan_payments.loan_id (twoWay)                    | Payment records                          |

### loan_payments

Records individual loan payments.

| Column                   | Type     | Constraints                                                            | Description               |
| ------------------------ | -------- | ---------------------------------------------------------------------- | ------------------------- |
| `id`                     | string   | Primary Key, Auto-generated                                            | Unique payment identifier |
| `amount`                 | double   | Required                                                               | Payment amount            |
| `payment_date`           | datetime | Required                                                               | When payment was made     |
| `payment_method`         | string   | Required, Enum: 'Bank Transfer','Cash','Cheque','Mobile Money','Other' | Payment method            |
| `notes`                  | string   | Optional, max 500                                                      | Payment notes             |
| `loan_id`                | rel      | Optional, manyToOne → loans (twoWay: loan_payments)                    | Related loan              |
| `finance_transaction_id` | rel      | Optional, manyToOne → finance_transactions                             | Linked transaction        |

### repayment_schedule

Stores the calculated repayment schedule for each loan.

| Column               | Type     | Constraints                                               | Description                |
| -------------------- | -------- | --------------------------------------------------------- | -------------------------- |
| `id`                 | string   | Primary Key, Auto-generated                               | Unique schedule identifier |
| `installment_number` | integer  | Required                                                  | Sequence number            |
| `due_date`           | datetime | Required                                                  | When payment is due        |
| `amount`             | double   | Required                                                  | Payment amount             |
| `status`             | string   | Required, Enum: 'pending','paid','overdue','partial'      | Payment status             |
| `paid_date`          | datetime | Optional                                                  | Actual payment date        |
| `notes`              | string   | Optional, max 500                                         | Schedule notes             |
| `loan_id`            | rel      | Optional, manyToOne → loans (twoWay: repayment_schedules) | Related loan               |

**Note:** `payment_id` FK to loan_payments is not present in the live DB.

### inventory

Tracks physical village assets, supplies, and harvested goods.

| Column                | Type     | Constraints                                                                                                              | Description                                                                                                                          |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                  | string   | Primary Key, Auto-generated                                                                                              | Unique item identifier                                                                                                               |
| `item_name`           | string   | Required, max 255                                                                                                        | Name of the item/produce                                                                                                             |
| `item_type`           | string   | Required, Enum: 'farm_inputs','farm_produce','school_supplies','medical_supplies','kitchen_supplies','equipment','other' | Item type (snake_case)                                                                                                               |
| `quantity`            | integer  | Required                                                                                                                 | Current quantity in stock                                                                                                            |
| `unit`                | string   | Required, max 20                                                                                                         | Unit of measurement (kg, pcs, etc.)                                                                                                  |
| `unit_cost`           | double   | Optional                                                                                                                 | Cost per unit                                                                                                                        |
| `estimated_value`     | double   | Optional                                                                                                                 | Total estimated value                                                                                                                |
| `status`              | string   | Required, Enum: 'in_stock','low_stock','out_of_stock','reserved'                                                         | Current status (snake_case). Note: 'available_for_sale' not in live DB enum.                                                         |
| `source`              | string   | Required, Enum: 'finance_purchase','farm_harvest','manual_entry','donation'                                              | Source of item. Note: 'other' not in live DB; use 'manual_entry'.                                                                    |
| `source_reference_id` | string   | Optional, max 255                                                                                                        | ID of source (expense transaction, harvest, etc.)                                                                                    |
| `reorder_threshold`   | integer  | Required                                                                                                                 | Alert threshold for low stock                                                                                                        |
| `date_added`          | datetime | Optional                                                                                                                 | When item was added to inventory                                                                                                     |
| `last_updated`        | datetime | Required                                                                                                                 | Last time this record was updated                                                                                                    |
| `notes`               | string   | Optional, max 1000                                                                                                       | General notes                                                                                                                        |
| `planting_id`         | rel      | Optional, manyToOne → plantings                                                                                          | Source planting (farm produce only). Enables (planting, crop) inventory aggregation for harvest entries.                             |
| `transaction_id`      | rel      | Optional, manyToOne → finance_transactions (twoWay: inventory_items)                                                     | Linked purchase transaction                                                                                                          |
| `crop_id`             | rel      | Optional, manyToOne → crops                                                                                              | Source crop (farm produce only). **Required** for farm_produce rows. Paired with `planting_id` to locate the aggregated produce row. |

**Story 3.7 Naming Convention:**

- Annual crops: `[Crop Name] – [Plot Name] [Season Label]` (e.g., "Maize – North Field 2025/26 Wet Season")
- Perennial crops (ongoing): `[Crop Name] – [Plot Name] (Ongoing)` (e.g., "Banana – Orchard Plot (Ongoing)")
- Perennial crops (complete): `[Crop Name] – [Plot Name] (Complete)` (e.g., "Banana – Orchard Plot (Complete)")
- Season labels (Zambia): May-Oct = "[Year] Dry Season", Nov-Apr = "[Year]/[Year+1] Wet Season"

**Farm Produce Aggregation Rule (Story 3.5):** When a harvest entry is recorded, the store finds or creates exactly one inventory row keyed by `(planting_id, crop_id, item_type = 'farm_produce')` and increments its quantity. `unit_cost` stores the market price from historical sales (if available) or user-provided estimate.

## School Tables

### learners

Stores learner enrollment records for the School module (Story 4.1). Learners are village residents with school-specific attributes — personal data (name, DOB, gender, household) is never duplicated; it is always read from the linked `residents` row. **One learner row per resident, ever**: status changes (promotion, graduation, re-enrollment) mutate the single row, preserving a stable learner ID for test scores, attendance, and interventions in Stories 4.2+. Uniqueness is enforced in the school store (Appwrite does not support indexes on relationship columns).

| Column                    | Type     | Constraints                                                                                  | Description                                    |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `resident_id`             | rel      | Required, manyToOne → residents, onDelete: restrict                                          | Linked resident (source of personal info)      |
| `grade_level`             | enum     | Required: 'Early Childhood', 'Grade 1'–'Grade 12'                                            | Current grade level                            |
| `enrollment_date`         | datetime | Required                                                                                     | Date of (initial) enrollment                   |
| `enrollment_status`       | enum     | Required: 'Active', 'Inactive', 'Graduated', 'Transferred', 'Dropped Out'. Default: 'Active' | Current enrollment status                      |
| `status_effective_date`   | datetime | Optional                                                                                     | Effective date of most recent status change    |
| `parent_guardian_name`    | string   | Optional, max 255                                                                            | Parent/guardian full name (free text)          |
| `parent_guardian_phone`   | string   | Optional, max 20                                                                             | Parent/guardian phone                          |
| `emergency_contact_name`  | string   | Optional, max 255                                                                            | Emergency contact full name (free text)        |
| `emergency_contact_phone` | string   | Optional, max 20                                                                             | Emergency contact phone                        |
| `medical_notes`           | string   | Optional, max 1000                                                                           | Medical conditions, allergies, etc.            |
| `notes`                   | string   | Optional, max 1000                                                                           | Additional notes (incl. status change history) |

**Indexes:** `idx_learners_grade` on `(grade_level ASC)`, `idx_learners_status` on `(enrollment_status ASC)`

## Relationships

All relationships use Appwrite's native relationship columns (type `rel`). Key relationships:

**Core:**

- **users ↔ roles**: manyToMany via `users.role_ids`
- **users → residents**: oneToOne via `users.resident_id`
- **users ↔ transaction_links**: manyToOne (child side) via `transaction_links.recorded_by` / `users.recorded_transaction_links`
- **residents ↔ households**: manyToOne via `residents.household_id` / `households.resident_ids` (twoWay)
- **households → residents**: oneToOne via `households.head_resident_id` (household head)
- **village_settings → residents**: oneToMany via `village_settings.council_member_ids`

**Farm:**

- **plots → soil_types**: manyToOne via `plots.soil_type_id`
- **plots → residents**: manyToOne via `plots.crop_manager_id`
- **plantings → plots**: manyToOne via `plantings.plot_id`
- **plantings → crops**: manyToOne via `plantings.crop_id`
- **harvests → plantings**: manyToOne via `harvests.planting_id`
- **harvest_entries → harvests**: manyToOne via `harvest_entries.harvest_id`
- **farm_sales → harvests**: manyToOne via `farm_sales.harvest_id`
- **farm_sales → crops**: manyToOne via `farm_sales.crop_id` (denormalized, Story 3.9)
- **inventory → plantings**: manyToOne via `inventory.planting_id` (farm produce only)
- **inventory → crops**: manyToOne via `inventory.crop_id` (farm produce only)

**School:**

- **learners → residents**: manyToOne via `learners.resident_id` (onDelete: restrict — residents with learner records cannot be deleted)

**Finance:**

- **finance_transactions → finance_categories**: manyToOne via `finance_transactions.category_id` / `finance_categories.transaction_ids` (twoWay)
- **finance_transactions → funding_sources**: manyToOne via `finance_transactions.funding_source_id` / `funding_sources.transaction_ids` (twoWay)
- **finance_transactions → loans**: manyToOne via `finance_transactions.loan_id` / `loans.transaction_ids` (twoWay)
- **inventory ↔ finance_transactions**: manyToOne via `inventory.transaction_id` / `finance_transactions.inventory_items` (twoWay)
- **finance_transactions → inventory**: oneToMany via `finance_transactions.inventory_ids`
- **transaction_links → finance_transactions** (parent): manyToOne via `transaction_links.parent_transaction_id` / `finance_transactions.funding_links_received` (twoWay)
- **transaction_links → finance_transactions** (child): manyToOne via `transaction_links.child_transaction_id` / `finance_transactions.funding_links_provided` (twoWay)
- **transaction_links → funding_sources**: manyToOne via `transaction_links.funding_source_id` / `funding_sources.funding_links_source` (twoWay)
- **loans → residents**: manyToOne via `loans.borrower_id` / `residents.loans` (twoWay)
- **loan_payments → loans**: manyToOne via `loan_payments.loan_id` / `loans.loan_payments` (twoWay)
- **loan_payments → finance_transactions**: manyToOne via `loan_payments.finance_transaction_id`
- **repayment_schedule → loans**: manyToOne via `repayment_schedule.loan_id` / `loans.repayment_schedules` (twoWay)

## Indexes

Live indexes as configured in Appwrite:

| Table        | Index Key                    | Type   | Columns                         |
| ------------ | ---------------------------- | ------ | ------------------------------- |
| `users`      | `idx_users_email_unique`     | unique | `email`                         |
| `residents`  | `idx_residents_household_id` | key    | `first_name ASC, last_name ASC` |
| `households` | `idx_households_name`        | key    | `name ASC`                      |
| `soil_types` | `idx_soil_types_name`        | key    | `name ASC`                      |
| `plots`      | `idx_plots_name`             | key    | `name ASC`                      |
| `plots`      | `idx_plots_status`           | key    | `status ASC`                    |
| `crops`      | `idx_crops_category`         | key    | `category ASC`                  |
| `crops`      | `idx_crops_type`             | key    | `crop_type ASC`                 |
| `crops`      | `idx_crops_active`           | key    | `is_active ASC`                 |
| `crops`      | `idx_crops_name`             | unique | `crop_name ASC`                 |
| `plantings`  | `idx_plantings_date`         | key    | `planting_date DESC`            |
| `plantings`  | `idx_plantings_status`       | key    | `status ASC`                    |
| `farm_sales` | `idx_farm_sales_date`        | key    | `sale_date DESC`                |
| `farm_sales` | `idx_farm_sales_buyer`       | key    | `buyer_type ASC, buyer_id ASC`  |
| `learners`   | `idx_learners_grade`         | key    | `grade_level ASC`               |
| `learners`   | `idx_learners_status`        | key    | `enrollment_status ASC`         |

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
