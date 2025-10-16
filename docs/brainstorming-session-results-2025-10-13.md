# Brainstorming Session Results

**Session Date:** 2025-10-13
**Facilitator:** Business Analyst Mary
**Participant:** Kamal

## Executive Summary

**Topic:** Sustainable Model Village Management System - Open-source web application for rural African villages

**Session Goals:** Ensure the village management app is as complete as possible by exploring all aspects: missing features/modules, user experience & workflows, data insights & reporting, integration & automation, scalability & sustainability, and community engagement

**Techniques Used:** Mind Mapping (In Progress)

**Total Ideas Generated:** 50+ (Session in progress)

### Key Themes Identified:

- Modular architecture with plugin extensibility
- Cross-cutting concerns (Equipment, Vendors, IoT, Finance)
- Role-based access and permissions
- Phased development approach (big picture → granular)
- First-time user experience and onboarding
- Sample data for exploration vs. production setup

## Technique Sessions

### Session 1: Mind Mapping - Village Ecosystem (In Progress)

**Focus:** Systematically mapping all village operations, entities, and relationships to identify gaps and opportunities.

#### Core Modules Defined:

**Core Modules (Always Enabled):**
1. **Residents Management** - Village residents with role-based access, multi-role support
2. **Households Management** - Single family, multi-family, guest houses, dormitories, admin buildings; tracks occupants, room assignments, construction details
3. **Finance Module** - Income tracking, expense tracking, budgeting, village lending to residents, financial reports
4. **Inventory Module** - Farm inputs, school supplies, medical supplies (basic), kitchen supplies; stock levels and reorder alerts
5. **Village Calendar** - Single global calendar with category filters (School, Farm, Village, Guests, Equipment, Energy); filters reset each session
6. **Cloud Storage** - Role-based storage quotas (Admin: unlimited, Village Head: 20GB, Teachers: 5GB, Residents: 2GB, Learners: 1GB); personal and shared storage via Appwrite

**Optional Modules (Enable in Setup):**
7. **Farm Management** - Plots, crops, planting schedules, harvest tracking, yields, income; future: irrigation, task assignments, pest tracking
8. **School Management** - Learners, teachers, test scores, teacher evaluations (peer/self/head teacher), attendance (TO BE EXPLORED IN DETAIL)
9. **Guests Management** - Paying guests, trainees (education, farm, village management, volunteer); booking, housing assignment; guests >3 months trigger weekly alerts to Village Management Team for potential resident conversion
10. **Equipment Management** - Village-wide assets (farm tools, school bus, admin vehicles, solar equipment); procurement tracking, warranty info, maintenance schedules, vendor details
11. **Vendors/Suppliers** - Bidirectional relationships (buy from/sell to); contact info, payment terms, quality ratings, contracts, preferred vendor status, transaction history
12. **Energy Management** - Solar microgrid monitoring, production/consumption tracking, real-time data

**Future/Plugin Modules:**
13. **Water Management** - Borehole monitoring, rainwater catchment, water quality (Post-MVP)
14. **Medical/Clinic** - For organizations running full clinics
15. **Custom Modules** - Plugin architecture for extensibility

#### Key Architectural Decisions:

**1. Modular & Extensible Architecture**
- Plugin/module system for custom extensions
- Standard APIs for module interaction with core
- Module registry concept
- Permission system extends to custom modules
- **Noted for Phase 3 Solution Architecture**

**2. IoT Integration Layer (Cross-Cutting)**
- Flexible integration with various IoT devices (weather stations, soil sensors, solar monitors, water sensors)
- Generic sensor data ingestion (REST API, MQTT, webhooks)
- Device type abstraction
- Configurable data mapping
- Real-time alerts and historical data storage
- Not locked to specific modules

**3. Equipment Module (Cross-Cutting)**
- Centralized tracking across all village operations
- Prevents duplication
- Tracks: procurement date, vendor/dealer, warranty info, maintenance history, condition, location
- Serves Farm, School, Admin, Energy, and future modules

**4. Vendors/Suppliers Module (Cross-Cutting)**
- Tracks both suppliers (inputs) and buyers (outputs)
- Supports formal businesses and individual community members
- Integration with Finance and Equipment modules

**5. Finance Module with Village Lending**
- Single module handles all financial operations
- Village acts as micro-lender to residents
- Tracks: loans, repayment schedules, interest, collateral
- Unified financial reporting (P&L, cash flow, balance sheet, donor reports)

**6. Households as Core Entity**
- Essential for village social structure
- Types: Single Family, Multi-Family, Guest House, Dormitory, Admin Building, Other
- Tracks occupants with relationships
- Room/unit numbers for dormitories
- Links to residents and guests
- Future: Individual utility monitoring per household

**7. Guest vs. Resident Definition**
- **Residents (App Users):** Permanent village residents, outside learners attending village school, long-term volunteers (>3 months)
- **Guests (Data Records Only):** Short-term guests/trainees (≤3 months), no app login access
- System alerts Village Management Team when guest stay exceeds 90 days
- Manual conversion process from guest to resident

**8. Unified Guests Module**
- Single module with guest type field (Paying Guest, Education Trainee, Farm Trainee, Village Management Trainee, Volunteer, Researcher, Other)
- Tracks: arrival/departure, duration, housing assignment, payment status, training program, supervisor, progress notes
- Some trainees pay, some don't
- Housed in dormitory-style rooms with shared facilities

**9. Calendar Architecture**
- Single global calendar for all users
- Events tagged by category (School, Farm, Village, Guests, Equipment, Energy, Other)
- Filter UI with checkboxes (filters reset each session)
- Role-based event creation permissions
- Events Coordinator can edit all calendar types

**10. Role-Based Access Control**
- Users can have multiple roles (e.g., Admin + Village Head, Teacher + Farm Manager)
- Permissions are union of all assigned roles
- Calendar visibility based on roles
- Storage quotas based on primary role (adjustable by Admin per user)

#### Development Strategy:

**Phased Approach: Big Picture → Granular**
- Start with foundational features users can test immediately
- Add fine-grained features in later phases
- Example: Farm module starts with plots, crops, harvests, income; later adds irrigation management, task assignments

**MVP Sprint Sequence:**

**Sprint 1: Foundation**
- Appwrite backend setup
- Database schema (core tables)
- First-time setup wizard
- Basic authentication
- Admin + Village Head user creation
- Simple dashboard (empty state)

**Sprint 2: Residents Module**
- Add resident functionality
- Role-based access control
- User profile pages
- Multi-role assignment
- Test with multiple users

**Sprint 3: Households Module**
- Add households (all types)
- Assign occupants
- Room assignments for dormitories
- Household dashboard

**Sprint 4: Farm Module (Basic)**
- Add plots
- Add crops
- Record harvests
- Track income
- View farm dashboard
- **Complete testable workflow achieved**

**Sprint 5+:** School, Guests, Equipment, Vendors, Finance, Energy modules

#### First-Time Setup Experience:

**Critical UX Decision:** Setup wizard designed for immediate testability and real-world onboarding.

**Setup Flow:**

**STEP 1: Welcome & Sample Data Decision**
- Choose: "Explore with Sample Data" OR "Start Fresh with Real Data"
- Sample data moved to Step 1 to avoid wasted user input

**IF "Explore with Sample Data":**

**STEP 2: Sample Village Configuration**
- Village Name: "Katete Model Village" (editable)
- Country: Zambia (editable)
- Currency: ZMW - Zambian Kwacha (editable)
- Time Zone: Africa/Lusaka (editable)

**STEP 3: Initialize Sample Database**
- All modules enabled by default
- 2 years of historical data
- Realistic Zambian context:
  - 15-20 residents with Zambian names
  - 5-6 households (3 single family, 1 dormitory, 1 guest house, 1 admin building)
  - 3 farm plots (Maize Field A, Vegetable Garden, Groundnut Plot)
  - Crops: Maize, Tomatoes, Cabbage, Groundnuts, Sweet Potatoes
  - School: 2 classes (Grade 5, Grade 7), 10 learners, 2 teachers
  - Equipment: Tractor, hoes, school bus, computers, admin vehicle, solar equipment
  - Vendors: Katete Agro Supplies, Eastern Province Cooperative, Zambian Solar Solutions
  - 2 current guests (1 farm trainee, 1 paying guest)
  - Financial records (income, expenses, 1 active loan)
  - Calendar events (school exam, farm planting, community meeting)
  - Energy data (30 days solar production/consumption)

**STEP 4: Display Sample Admin Credentials**
- Admin: `admin@sample.village` / `Admin123!` (fixed password)
- Village Head: `villagehead@sample.village` / `VillageHead123!` (fixed password)
- Warning to change passwords after login

**Dashboard:** Shows persistent banner "🏷️ SAMPLE DATA MODE" with "Start Fresh - Wipe All Data" button

**IF "Start Fresh with Real Data":**

**STEP 2: Village Setup**
- Village Name, Physical Address, Country, Time Zone, Currency

**STEP 3: Create First Household**
- Household address/identifier
- Household Type (Single Family, Multi-Family, Dormitory, Guest House, Admin Building, Other)
- Number of bedrooms, bathrooms
- Construction date (optional)

**STEP 4: Create Admin User (as Resident)**
- First Name, Middle Name (optional), Last Name
- Date of Birth, Gender
- Email, Password, Phone
- Role: System Administrator (auto-assigned)
- Household: From Step 3
- Relationship to Household Head: "Head" (auto-assigned)
- Storage Quota: Unlimited (default)

**STEP 5: Create Village Head User**
- Option A: "I am also the Village Head" (assign both roles to same user)
- Option B: "Create separate Village Head user"
  - If separate: Does Village Head live in same household? (Yes/No)
  - If No: Create second household
  - Enter: Name, DOB, Gender, Email, Password, Phone
  - Role: Village Head (auto-assigned)
  - Household assignment
  - Relationship to Household Head
  - Storage Quota: 20GB (default)

**STEP 6: Module Selection**
- Select which optional modules to enable (Farm, School, Guests, Equipment, Vendors, Energy)
- Note: Core modules always enabled
- Can enable/disable later in Settings

**STEP 7: Initialize Database**
- Create all tables/collections
- Set up default roles and permissions
- Apply storage quotas
- Initialize selected modules

**STEP 8: Welcome Dashboard**
- Quick start guide
- Enabled modules display
- Next steps: "Add your first resident", "Set up farm plots", etc.

#### Sample Data Wipe Process:

**Village Setup Table includes:** `is_using_sample_data` boolean field

**When true:**
- Dashboard shows persistent banner: "🏷️ SAMPLE DATA MODE - You're exploring with sample data. Ready to start for real? [Start Fresh - Wipe All Data]"

**"Start Fresh" Action:**
- Warning dialog: "This will DELETE ALL DATA and restart setup. Type 'DELETE EVERYTHING' to confirm."
- On confirm: Wipe all data, set `is_using_sample_data = false`, restart setup wizard

#### Guest Stay Monitoring:

**Alert System:**
- System monitors guest stay duration
- When guest stay > 90 days (3 months):
  - Notification to Village Management Team
  - Alert shows: Guest name, arrival date, days stayed, guest type
  - Actions: View Details, Convert to Resident, Dismiss
- **Dismissed alerts re-appear weekly until resolved**

**Convert to Resident:**
- Pre-fills resident registration form with guest data
- Admin completes: email, password, role assignment, storage quota
- Moves from Guests to Residents module
- Maintains history link

---

### **Session 3: Farm Management Module - COMPLETED**

**Status:** ✅ Fully specified and documented

**Focus Areas:** Harvest tracking workflows, financial integration, and profit calculations

#### **Roles & Permissions:**

**Farm Manager:**
- Overall responsibility for village farm operations
- View all plots, plantings, harvests, and farm finances
- Create/edit/delete plots
- Create/edit plantings for any plot
- Record harvests for any plot
- Mark any harvest as complete
- Assign Crop Managers to plots
- Record farm sales (creates Finance income transactions)
- View all farm analytics and reports
- Configure farm settings (add crops, set defaults)

**Crop Manager:**
- Responsible for specific crop plots (assigned by Farm Manager)
- View all plots (read-only for unassigned plots)
- Edit only assigned plots
- Create/edit plantings for assigned plots
- Record harvests for assigned plots
- Mark harvests complete for assigned plots only
- View all farm finances (read-only)
- Edit finance transactions for their assigned crops only
- View farm analytics and reports
- Cannot assign other Crop Managers
- Cannot edit farm settings

**Finance Manager (New Role):**
- Can initiate farm sales
- View all village finances
- Record all income/expenses across all modules
- Generate all financial reports
- Cannot configure finance settings (Admin only)

**Fallback Rule:**
- If no Crop Manager assigned to plot → Farm Manager acts as Crop Manager

**Admin/Village Head Finance Permissions:**
- Read-only access to Farm module by default
- Can view all plots, plantings, harvests, analytics
- Cannot create/edit/delete unless they also have Farm Manager role
- Multi-role support handles this cleanly

---

#### **Crops Database (Reference Data):**

**Seeded on Setup (Both Sample and Production):**

```
crops:
- crop_id (PK)
- crop_name
- crop_type (annual, perennial)
- maturity_days (for annuals: days until harvest)
- harvest_frequency (for perennials: weekly, monthly, seasonal, annual)
- typical_yield_kg_per_ha (average yield for projections)
- growing_season (wet_season, dry_season, year_round)
- category (grain, vegetable, fruit, legume, tree_crop)
- is_active (boolean)
- created_date
```

**Starter List - Common Zambian Crops:**

**Grains & Cereals:**
1. Maize - Annual, 120 days, wet season, 2,500 kg/ha
2. Sorghum - Annual, 100 days, dry season, 1,500 kg/ha
3. Millet - Annual, 90 days, dry season, 1,200 kg/ha
4. Rice - Annual, 120 days, wet season, 3,000 kg/ha

**Legumes:**
5. Groundnuts (Peanuts) - Annual, 120 days, wet season, 1,800 kg/ha
6. Soybeans - Annual, 110 days, wet season, 2,000 kg/ha
7. Cowpeas - Annual, 80 days, year-round, 1,200 kg/ha
8. Beans (Common) - Annual, 90 days, wet season, 1,500 kg/ha

**Vegetables:**
9. Tomatoes - Annual, 90 days, year-round, 25,000 kg/ha
10. Cabbage - Annual, 75 days, year-round, 30,000 kg/ha
11. Rape (Leafy Green) - Annual, 45 days, year-round, 8,000 kg/ha
12. Onions - Annual, 120 days, dry season, 20,000 kg/ha
13. Okra - Annual, 60 days, wet season, 10,000 kg/ha
14. Pumpkin - Annual, 100 days, wet season, 15,000 kg/ha

**Root Crops:**
15. Sweet Potatoes - Annual, 120 days, wet season, 12,000 kg/ha
16. Cassava - Perennial (12-18 months), year-round, 15,000 kg/ha
17. Irish Potatoes - Annual, 90 days, dry season, 20,000 kg/ha

**Tree Crops & Perennials:**
18. Moringa - Perennial, first harvest 6 months, weekly picking, 5,000 kg/ha/year
19. Papaya - Perennial, first harvest 9 months, weekly picking, 40,000 kg/ha/year
20. Banana - Perennial, first harvest 12 months, monthly picking, 30,000 kg/ha/year
21. Mango - Perennial, first harvest 3 years, seasonal (annual), 10,000 kg/ha/year
22. Orange - Perennial, first harvest 3 years, seasonal (annual), 15,000 kg/ha/year
23. Avocado - Perennial, first harvest 4 years, seasonal (annual), 8,000 kg/ha/year
24. Guava - Perennial, first harvest 2 years, seasonal (biannual), 12,000 kg/ha/year

**Cash Crops:**
25. Cotton - Annual, 150 days, wet season, 2,000 kg/ha
26. Sunflower - Annual, 100 days, dry season, 1,500 kg/ha
27. Tobacco - Annual, 120 days, wet season, 2,500 kg/ha

**Admin can add/edit crops in Farm Module settings**

---

#### **Farm Plots:**

```
farm_plots:
- plot_id (PK)
- plot_name (e.g., "Maize Field A", "Vegetable Garden")
- plot_size_hectares (REQUIRED - used for yield calculations)
- location_description (text)
- soil_type (optional for MVP)
- assigned_crop_manager_id (user_id FK - can be NULL)
- status (active, fallow, retired)
- created_date
- notes
```

**Plot Assignment:**
```
plot_assignments:
- assignment_id (PK)
- plot_id (FK)
- crop_manager_id (user_id FK)
- assigned_by (user_id - Farm Manager)
- assignment_date
- is_active (boolean)
- notes
```

**Business Rule:** One plot can have only ONE active Crop Manager at a time.

---

#### **Planting Records:**

```
plantings:
- planting_id (PK)
- plot_id (FK)
- crop_id (FK)
- planting_date
- expected_first_harvest_date (auto-calculated: planting_date + crop.maturity_days, can be overridden)
- planting_status (planted, growing, harvesting, completed, failed)
- is_perennial (boolean - from crop.crop_type)
- failure_reason (drought, flood, pest, disease, other - only if failed)
- failure_notes (text)
- years_active (for perennials - auto-calculated)
- seeds_used_kg
- seeds_inventory_id (FK - which seed batch was used)
- seeds_cost (auto-calculated: seeds_used_kg × inventory.unit_cost)
- planted_by (user_id)
- created_date
- updated_date
- notes
```

**Lifecycle Patterns:**

**Annual Crops:**
- Plant once → Harvest once (or over multiple days) → Status = completed
- Expected harvest date = planting_date + crop.maturity_days

**Perennial Crops:**
- Plant once → Harvest multiple times over years → Status stays "harvesting"
- Expected harvest date = NULL or manual entry per harvest cycle
- years_active field tracks longevity

**Crop Failure Tracking:**
- Status = "failed"
- Reason required: drought, flood, pest, disease, other
- Notes field for additional context

---

#### **Harvest Tracking:**

**Core Tracking Unit: PLOTS (not individual harvests)**
- Track what's growing on each plot
- Track when plot was harvested
- Track yield per plot
- Link harvests to original planting records
- Cumulative yield tracking per planting cycle

**Harvest Types:**

**1. Single Day Harvest:**
- Entire plot harvested in one day
- Small plots, quick harvests
- One harvest record, marked complete immediately

**2. Multi-Day Aggregate Harvest:**
- Large plot harvested over multiple days
- Counts as ONE harvest event
- Examples: Large soy field (3 days), maize field (5 days), moringa for commercial sale
- Daily quantities tracked in harvest_details table
- Farm/Crop Manager marks complete when final day done

**3. Continuous Picking Harvest:**
- Ongoing harvests from same planting over weeks/months
- Each picking is a SEPARATE harvest event
- Examples: Tomatoes (weekly for 3 months), vegetables, moringa for local sale
- All harvest events link back to same planting_id
- Cumulative yield calculated via SUM

**Data Structure:**

```
harvests:
- harvest_id (PK)
- planting_id (FK - links back to planting)
- harvest_type (single_day, multi_day_aggregate, continuous_picking)
- harvest_start_date
- harvest_end_date (for multi-day harvests)
- total_quantity_kg (cumulative)
- harvest_status (in_progress, completed)
- is_available_for_sale (boolean - auto-set to true when completed)
- completed_by (user_id)
- completion_date
- created_by (user_id)
- created_date
- updated_date
- notes

harvest_details (for multi-day tracking):
- detail_id (PK)
- harvest_id (FK)
- harvest_date (specific day)
- quantity_kg (that day's harvest)
- recorded_by (user_id)
- recorded_date
- notes
```

**Harvest Completion Permissions:**
- Farm Manager: Can mark ANY harvest as complete
- Crop Manager: Can mark harvests complete for assigned plots only
- Continuous harvests: Each picking marked complete immediately

**Dashboard View: "Harvest Status by Crop Type"**
- Groups all plots by crop type
- Shows harvest status per plot (not started, in progress, completed)
- Visibility rule: Farm Manager sees full picture before deciding to sell
- No system enforcement - just decision-making visibility

---

#### **Inventory Integration (Automatic):**

**When harvest status = "completed":**

**Appwrite Function Trigger:**
```
1. Create inventory_items record
2. Set item_type = 'farm_produce'
3. Set source_module = 'farm'
4. Set source_reference_id = harvest_id
5. Set quantity_current = harvest.total_quantity_kg
6. Set quantity_original = harvest.total_quantity_kg
7. Set estimated_value = calculated (see below)
8. Set status = 'available_for_sale'
9. Set date_added = harvest.completion_date
```

**Estimated Value Calculation (Hybrid Approach):**
- **Auto-calculate:** AVG(previous_sales.price_per_kg for that crop, last 3-6 months) × harvest.total_quantity_kg
- **Override:** Farm Manager can manually override if auto-calculation is inaccurate
- **Fallback:** If no historical data exists, Farm Manager enters manually
- **Purpose:** Compare estimated income vs. actual income from sales

**Inventory Structure:**
```
inventory_items:
- inventory_id (PK)
- item_type (farm_produce, farm_input, school_supply, medical_supply, kitchen_supply)
- item_name
- source_module (farm, finance, donation)
- source_reference_id (harvest_id, finance_transaction_id, etc.)
- quantity_current
- quantity_original
- unit (kg, tons, liters, pieces, packets)
- unit_cost (for inputs: cost per unit)
- total_cost (for inputs: total purchase cost)
- estimated_value (for farm_produce: auto-calculated with override)
- estimated_value_override (boolean - true if manually set)
- status (in_stock, available_for_sale, reserved, sold, depleted)
- date_added
- location (optional - warehouse tracking Post-MVP)
- notes
- created_by (user_id)
- created_date
- updated_date
```

**No Data Duplication:**
- Inventory references harvest_id for all crop details
- Fetch via GraphQL: inventory → harvest → planting → crop
- Single source of truth

---

#### **Financial Integration:**

**Income Recording: At Point of Sale (Not at Harvest)**
- Harvest completion creates inventory with estimated value
- Actual income recorded when sale happens
- Enables comparison: estimated vs. actual income

**Sale Workflow:**

**Who Can Initiate Sales:**
- Farm Manager (any crop)
- Crop Manager (their assigned crops only)
- Finance Manager (any crop)
- Admin/Village Head (any crop)

**Where Sales Are Recorded:**
- Finance module (single source of truth for all financial transactions)
- Farm module triggers Finance transaction creation

**Sale Process:**
```
1. Inventory shows "500 kg maize available for sale"
2. Authorized user clicks "Record Sale"
3. Sale form:
   - Select buyer (from Vendors module, or enter name for direct sales)
   - Quantity to sell (max = inventory quantity_current)
   - Price per kg (no fixed pricing - enter at time of sale)
   - Total amount (auto-calculated)
   - Payment method (cash, bank_transfer, mobile_money, credit, other)
   - Payment status (paid, pending, partial)
   - Sale date
   - Invoice number (optional)
   - Notes
4. On save:
   - Inventory quantity decrements
   - Sale record created in Farm module
   - Income transaction created in Finance module (automatic)
   - Vendor transaction history updated (if applicable)
```

**Partial Sales:**
- Track each sale separately
- All sales link back to original harvest_id
- Inventory quantity decrements with each sale
- Each sale creates separate Finance income transaction

**Data Structure:**

```
farm_sales:
- sale_id (PK)
- inventory_id (FK)
- harvest_id (FK - trace back to original harvest)
- buyer_id (FK - from Vendors module, can be NULL)
- buyer_name (text - if not in Vendors)
- quantity_sold_kg
- price_per_kg
- total_amount
- payment_method
- payment_status
- amount_paid
- amount_due
- sale_date
- invoice_number (optional)
- sold_by (user_id)
- created_date
- updated_date
- notes

// Triggers on creation:
1. UPDATE inventory_items SET quantity_current -= quantity_sold_kg
2. INSERT INTO finance_transactions (income)
3. UPDATE vendors transaction history (if buyer_id exists)
```

---

#### **Farm Expenses (MVP Scope):**

**Seeds/Seedlings Purchase Workflow:**

**Step 1: Purchase Seeds**
```
Finance Manager buys 50 kg maize seeds from Katete Agro Supplies for 500 ZMW

Actions:
1. Record in Finance module:
   - transaction_type = "expense"
   - category_id = "Farm Expense"
   - subcategory_id = "Seeds"
   - amount = 500 ZMW
   - vendor_id = Katete Agro Supplies
   - description = "50 kg maize seeds"

2. Add to Inventory module (automatic):
   - item_type = "farm_input"
   - item_name = "Maize Seeds"
   - quantity_current = 50 kg
   - quantity_original = 50 kg
   - unit_cost = 10 ZMW/kg
   - total_cost = 500 ZMW
   - source_module = "finance"
   - source_reference_id = finance_transaction_id
   - status = "in_stock"
```

**Step 2: Use Seeds in Planting**
```
Farm Manager plants maize on Plot A, uses 10 kg seeds

Planting form includes:
- Plot: Maize Field A
- Crop: Maize
- Planting date: 2025-10-15
- Seeds used: 10 kg (select from Inventory)

Actions:
1. Create planting record:
   - seeds_used_kg = 10
   - seeds_inventory_id = [inventory_item_id]
   - seeds_cost = 100 ZMW (auto-calculated: 10 kg × 10 ZMW/kg)

2. Update Inventory:
   - quantity_current = 40 kg (50 - 10)
   - If quantity_current = 0, status = "depleted"
```

**Multiple Seed Purchases:**
- Track as separate inventory items (simpler for MVP)
- Farm Manager selects which seed batch to use when planting
- Post-MVP: Auto-FIFO or weighted average costing

**Other Farm Expenses (Post-MVP):**
- Fertilizer, pesticides, equipment maintenance, labor, irrigation, transportation, storage
- All recorded in Finance module with category = "Farm Expense"

---

#### **Finance Module Integration:**

**Finance Categories (Admin-Configurable):**

```
finance_categories:
- category_id (PK)
- category_name (Farm Income, Farm Expense, School Income, etc.)
- category_type (income, expense)
- is_system_default (boolean - can't be deleted if true)
- is_active (boolean)
- sort_order
- created_by (user_id)
- created_date

finance_subcategories:
- subcategory_id (PK)
- category_id (FK)
- subcategory_name (Seeds, Fertilizer, Grains, Vegetables, etc.)
- is_active (boolean)
- sort_order
- created_by (user_id)
- created_date
```

**Default Categories Seeded on Setup:**

**Income Categories:**
- Farm Sales (subcategories: Grains, Vegetables, Fruits, Other)
- School Fees
- Donations
- Grants
- Loan Repayments
- Other Income

**Expense Categories:**
- Farm Expenses (subcategories: Seeds, Fertilizer, Pesticides, Equipment, Labor, Other)
- School Expenses (subcategories: Supplies, Salaries, Maintenance, Other)
- Administrative Expenses
- Loan Disbursements
- Equipment Purchases
- Utilities
- Other Expenses

**Admin can add/edit/archive categories and subcategories**

**Finance Transactions:**
```
finance_transactions:
- transaction_id (PK)
- transaction_type (income, expense)
- category_id (FK)
- subcategory_id (FK)
- amount
- transaction_date
- payment_method (cash, bank_transfer, mobile_money, credit, other)
- payment_status (paid, pending, partial)
- amount_paid (for partial payments)
- amount_due (for pending/partial)
- vendor_id (FK - if applicable)
- source_module (farm, school, finance, other)
- source_reference_id (sale_id, expense_id, etc.)
- description
- invoice_number (optional)
- receipt_number (optional)
- recorded_by (user_id)
- created_date
- updated_date
- notes
```

**Role-Based Finance Visibility:**

| Role | View All Finances | View Farm Only | View School Only | Record Transactions | Edit Transactions | Configure Categories | Generate Reports |
|------|-------------------|----------------|------------------|---------------------|-------------------|---------------------|------------------|
| System Administrator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Village Head | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Finance Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Farm Manager | ❌ | ✅ | ❌ | ✅ (farm only) | ✅ (farm only) | ❌ | ✅ (farm only) |
| Crop Manager | ❌ | ✅ (view all) | ❌ | ✅ (their crops) | ✅ (their crops) | ❌ | ✅ (farm only) |
| Head Teacher | ❌ | ❌ | ✅ | ✅ (school only) | ✅ (school only) | ❌ | ✅ (school only) |

**Notes:**
- Crop Managers can VIEW all farm finances but can only EDIT transactions related to their assigned crops
- Farm/Crop Managers cannot see donations, loans, school finances, or other village finances
- Finance Manager has full visibility across all modules

---

#### **Profit Calculations (MVP):**

**Simple Profit Formula:**
```
Plot Profit = Total Sales Revenue - Seed Costs
```

**Per Plot Profit:**
```sql
SELECT 
  p.plot_name,
  c.crop_name,
  pl.planting_date,
  pl.seeds_cost as seed_cost,
  SUM(fs.total_amount) as total_revenue,
  (SUM(fs.total_amount) - pl.seeds_cost) as profit,
  ((SUM(fs.total_amount) - pl.seeds_cost) / pl.seeds_cost * 100) as roi_percentage
FROM plantings pl
JOIN farm_plots p ON pl.plot_id = p.plot_id
JOIN crops c ON pl.crop_id = c.crop_id
LEFT JOIN harvests h ON pl.planting_id = h.planting_id
LEFT JOIN farm_sales fs ON h.harvest_id = fs.harvest_id
WHERE pl.planting_status IN ('completed', 'harvesting')
GROUP BY pl.planting_id
ORDER BY profit DESC
```

**Per Crop Type Profit:**
```sql
SELECT 
  c.crop_name,
  COUNT(DISTINCT pl.planting_id) as total_plantings,
  SUM(pl.seeds_cost) as total_seed_cost,
  SUM(fs.total_amount) as total_revenue,
  (SUM(fs.total_amount) - SUM(pl.seeds_cost)) as total_profit,
  (SUM(fs.total_amount) - SUM(pl.seeds_cost)) / COUNT(DISTINCT pl.planting_id) as avg_profit_per_planting
FROM crops c
JOIN plantings pl ON c.crop_id = pl.crop_id
LEFT JOIN harvests h ON pl.planting_id = h.planting_id
LEFT JOIN farm_sales fs ON h.harvest_id = fs.harvest_id
WHERE pl.planting_status IN ('completed', 'harvesting')
GROUP BY c.crop_id
ORDER BY total_profit DESC
```

**Profit Display - Contextual Approach (Option D):**

**Farm Module Dashboard:**
- Detailed operational view
- Shows per-plot profitability
- Shows per-crop performance
- Highlights which plots are most profitable
- Crop performance comparisons
- Actionable insights for farm operations

**Finance Module Dashboard:**
- High-level financial view
- Total farm profit contribution to village income
- Farm income trends over time
- Farm revenue as % of total village income
- Financial summary perspective

**Benefits:**
- Not true duplication - different perspectives on same data
- Farm Manager sees operational details
- Finance Manager sees financial summary
- Both valuable in different contexts
- Users with both roles see complementary information

**Post-MVP Enhancements:**
- Add fertilizer costs, labor costs, equipment costs
- Detailed expense tracking per plot
- Comprehensive profit/loss statements
- Budget vs. actual comparisons

---

#### **Vendor Module Integration:**

**MVP Scope:**

**1. Selling TO Vendors (Buyers):**
- Village sells crops to vendors
- Tracked in farm_sales table
- Vendor acts as buyer
- Links to Vendors module for buyer information

**2. Buying FROM Vendors (Suppliers):**
- Village buys seeds from vendors
- Tracked in Finance module (expense)
- Seeds added to Inventory module
- Vendor acts as supplier
- Links to Vendors module for supplier information

**Post-MVP:**
- Direct purchasing workflow from Farm module
- Purchase orders and tracking
- Vendor performance ratings
- Contract management

---

#### **Sample Data for Katete Model Village:**

**Active Plots (6 plots):**
1. Maize Field A - 2 hectares, Crop Manager: John Banda
2. Maize Field B - 1.5 hectares, Crop Manager: John Banda
3. Vegetable Garden - 0.5 hectares (Tomatoes, Cabbage, Rape), Crop Manager: Grace Phiri
4. Groundnut Plot - 1 hectare, Crop Manager: John Banda
5. Moringa Grove - 0.3 hectares (perennial, 2 years active), Crop Manager: Grace Phiri
6. Fruit Orchard - 1 hectare (Mango, Papaya, Orange - mixed), Farm Manager oversees

**Historical Data (2 years):**
- 4 complete maize harvest cycles (2 per year - wet season)
- 8 groundnut harvests
- 50+ vegetable harvests (continuous picking)
- 100+ moringa harvests (weekly picking)
- 6 fruit harvests (seasonal)
- Seed purchases from Katete Agro Supplies
- Sales to Eastern Province Cooperative and local buyers
- Complete financial records (income and expenses)

---

#### **MVP Exclusions (Post-MVP Features):**

- ❌ Quality grading
- ❌ Labor tracking and task assignments
- ❌ Harvest method tracking
- ❌ Weather conditions (manual or IoT)
- ❌ Village consumption tracking
- ❌ Warehouse/storage location tracking
- ❌ Irrigation management
- ❌ Pest tracking
- ❌ Detailed expense tracking (fertilizer, pesticides, equipment, labor)
- ❌ Detailed budgeting
- ❌ Yield projections and comparisons
- ❌ Advanced analytics (yield trends, weather correlations)

---

#### **Appwrite Functions Required:**

**1. Auto-Create Inventory on Harvest Completion**
- Triggers when harvest.status = 'completed'
- Creates inventory_items record
- Calculates estimated_value (hybrid approach)
- Sets status = 'available_for_sale'

**2. Auto-Create Finance Transaction on Sale**
- Triggers when farm_sales record created
- Creates finance_transactions record (income)
- Links back to sale_id
- Updates vendor transaction history

**3. Auto-Update Inventory on Sale**
- Triggers when farm_sales record created
- Decrements inventory.quantity_current
- Updates status to 'depleted' if quantity = 0

**4. Auto-Calculate Expected Harvest Date**
- Triggers when planting record created
- For annuals: planting_date + crop.maturity_days
- For perennials: NULL or manual entry
- Can be overridden by user

**5. Auto-Create Inventory on Seed Purchase**
- Triggers when finance_transactions (expense, category=Seeds) created
- Creates inventory_items record (farm_input)
- Calculates unit_cost
- Sets status = 'in_stock'

---

#### **Analytics & Reporting:**

**Status:** ✅ Fully specified for MVP

---

##### **Farm Dashboard (MVP):**

**Operational Status Widgets:**
- Active plots count
- Plots currently being harvested
- Upcoming harvests (next 7/14/30 days)
- Inventory available for sale

**Financial Summary Widgets:**
- Total farm income (this month, this season, this year)
- Pending sales (unpaid/partial payment)
- Most profitable crop (this season)
- Total profit/loss (this season)

**Alerts & Notifications (Configurable Thresholds):**
- Harvests ready to complete (in_progress > X days)
- Low seed inventory (below reorder threshold)
- Overdue payments from buyers (payment_status = pending, > X days)
- Low profitability plots (profit < threshold)
- Price anomalies (sale price < X% of average)

**Quick Actions:**
- Record new harvest
- Record sale
- Add planting
- View inventory

**Alert Configuration:**
```
alert_settings:
- setting_id (PK)
- alert_type (harvest_ready, upcoming_harvest, low_inventory, overdue_payment, low_profit, price_anomaly)
- threshold_value (numeric)
- threshold_unit (days, kg, percentage, currency)
- is_enabled (boolean)
- configured_by (user_id)
- updated_date
```

**Farm Manager can configure thresholds in Farm Settings**

---

##### **Visualizations (Single Chart with Dropdown):**

**Line Chart Widget (Dropdown Options):**
1. Farm income trends over time
2. Harvest quantities by month
3. Yield per hectare trends over time
4. Yield trends over time (by plot or crop)

**Bar Chart Widget (Dropdown Options):**
1. Revenue by crop type
2. Profit by plot
3. Harvest quantities by crop

**Pie Chart Widget (Dropdown Options):**
1. Revenue distribution by crop
2. Inventory composition
3. Sales by buyer

**Table Widget (Dropdown Options):**
1. Recent harvests
2. Recent sales
3. Plot performance summary

**Benefits:**
- Cleaner dashboard (less clutter)
- Flexible analysis (user chooses view)
- Reusable chart components

---

##### **Plot Performance Metrics (MVP):**

**Yield Metrics:**
- Total yield (kg) per planting cycle
- Yield per hectare (kg/ha)
- Yield trends over time (line chart)

**Financial Metrics:**
- Total revenue per plot
- Seed cost per plot
- Profit per plot
- ROI per plot
- Revenue per hectare

**Operational Metrics:**
- Number of planting cycles completed
- Average days from planting to harvest
- Harvest frequency (for perennials)

**Display Locations:**
- Dashboard: Line chart widget (yield trends overview)
- Plot Detail View: Detailed yield trend chart for specific plot
- Reports: Plot performance summary table

**Post-MVP:**
- Yield vs. expected (compare to crops.typical_yield_kg_per_ha)
- Yield variance (% above/below expected)
- Success rate (completed vs. failed plantings)
- Plot A vs. Plot B comparisons

---

##### **Crop Performance Analysis (MVP):**

**Aggregate Performance:**
- Total area planted (hectares)
- Total harvest quantity (kg)
- Average yield per hectare
- Total revenue
- Total profit
- Average profit per hectare

**Comparative Analysis:**
- Best performing plot (for this crop)
- Worst performing plot (for this crop)

**Display Locations:**
- Dashboard: Bar/pie chart widgets (crop comparisons)
- Crop Detail View: Detailed yield trend chart for all plots of that crop
- Reports: Crop performance summary

**Post-MVP:**
- Yield consistency (standard deviation)
- Revenue trends over time
- Historical trends (year-over-year)
- Seasonal patterns (wet vs. dry season)

---

##### **Time-Based Analysis (MVP):**

**Time Periods:**
- This month
- This season (admin-configurable)
- This year

**Seasons Configuration (Admin-Configurable):**
```
seasons:
- season_id (PK)
- season_name (Wet Season, Dry Season, Planting Season)
- start_month
- start_day
- end_month
- end_day
- is_active (boolean)
- created_by (user_id)
- created_date
```

**Default Zambian Seasons:**
- Wet Season: January 15 - April 30
- Dry Season: May 1 - August 31
- Planting Season: September 1 - December 31

**Admin can add/edit/archive seasons in System Settings**

**Post-MVP:**
- Custom date ranges
- Best/worst seasons historically
- Seasonal comparisons (wet vs. dry performance)
- Year-over-year seasonal trends

---

##### **Financial Reports (MVP - 8 Reports):**

**Tier 1 - Essential (5 Reports):**

**1. Farm Income Summary**
- Total income by period (this month, this season, this year)
- Simple aggregation of all farm sales
- Displays: Total revenue, number of sales, average sale amount

**2. Income by Crop Type**
- Revenue breakdown by crop
- Shows which crops generate most income
- Sortable by revenue (descending)
- Displays: Crop name, total revenue, number of sales, % of total farm income

**3. Profit/Loss by Plot**
- Per-plot profitability analysis
- Formula: Total Sales Revenue - Seed Costs
- Displays: Plot name, crop, revenue, seed cost, profit, ROI %
- Sortable by profit

**4. Profit/Loss by Crop Type**
- Aggregate profit across all plots of same crop
- Displays: Crop name, total plantings, total revenue, total seed cost, total profit, avg profit per planting
- Sortable by total profit

**5. Payment Status Report**
- Shows paid vs. pending sales
- Highlights overdue payments
- Displays: Buyer, sale date, amount, payment status, days overdue (if pending)
- Filterable by payment status
- Critical for cash flow management

**Tier 2 - Valuable (3 Reports):**

**6. Seed Expenses by Period**
- Track seed costs over time
- Displays: Period, total seed purchases, total amount spent, avg cost per kg
- Breakdown by crop type

**7. Expected vs. Actual Income (Variance Analysis)**
- Compare inventory estimated_value to actual sales revenue
- Displays: Crop, estimated value, actual revenue, variance (amount), variance (%)
- Identifies pricing accuracy
- Helps refine future estimates

**8. Income by Buyer**
- Buyer performance analysis
- Displays: Buyer name, total purchases, total amount paid, avg price per kg, payment reliability (% paid on time)
- Sortable by total amount
- Informs buyer relationship management

**Report Display:**
- Default: View in browser (HTML tables/charts)
- On-demand: Export to PDF, Excel, CSV (print-friendly format)

**Post-MVP Reports:**
- Break-even analysis (when did plot become profitable?)
- Average price trends over time
- Expenses per plot / cost per hectare (when tracking more expenses)
- Advanced cash flow reports (accounts receivable aging)
- Scheduled/automated reports (email weekly/monthly)

---

##### **Comparative Analytics (MVP):**

**Plot Comparisons:**
- Which plots are most profitable? (Profit/Loss by Plot report)
- Which plots have highest yields? (Plot Performance Metrics)

**Crop Comparisons:**
- Which crops generate most revenue? (Income by Crop Type report)
- Which crops have best profit margins? (Profit/Loss by Crop Type report)

**Buyer Comparisons:**
- Which buyers pay best prices? (Income by Buyer report)
- Which buyers pay on time? (Payment Status Report)
- Which buyers purchase most volume? (Income by Buyer report)

**Post-MVP:**
- Temporal comparisons (this season vs. last season)
- Reliability analysis (crop failure rates)
- Recommendations (should we plant more/less of X crop?)
- Multi-year trends

---

##### **Predictive & Planning Analytics (MVP):**

**Harvest Projections:**
- Expected harvests in next 30/60/90 days
- Based on active plantings with expected_first_harvest_date
- Displays: Plot, crop, expected harvest date, expected quantity (from crops.typical_yield_kg_per_ha × plot_size_hectares)
- Expected income (expected quantity × historical avg price per kg)

**Inventory Projections:**
- Current inventory (available for sale)
- Plus expected harvests (next 30 days)
- Equals projected sales capacity
- Helps plan buyer commitments

**Seed Planning:**
- Current seed inventory levels
- Reorder alerts (configurable threshold)
- Displays: Seed type, current quantity, reorder threshold, status (OK, Low, Critical)

**Post-MVP:**
- Advanced revenue forecasting (seasonal models)
- Storage capacity planning
- Multi-season planting recommendations
- Predictive yield modeling (ML-based)

---

##### **Yield Analysis (MVP):**

**Basic Tracking:**
- Actual yield per plot (kg)
- Actual yield per hectare (kg/ha)
- Compare to typical yield (from crops.typical_yield_kg_per_ha)
- Variance: (actual - typical) / typical × 100%

**Yield Trends Over Time:**
- Line chart showing yield per hectare over time
- For specific plot: Historical yield across multiple planting cycles
- For specific crop: Aggregate yield across all plots over time
- Identifies improving/declining performance

**Display Locations (Option D - All of the Above):**
1. **Dashboard Line Chart Widget:** Quick overview, dropdown option "Yield trends over time"
2. **Plot Detail View:** Detailed yield trend chart for that specific plot
3. **Crop Performance Report:** Aggregate yield trend chart for all plots of that crop

**Post-MVP:**
- Yield by season (wet vs. dry season comparison)
- Yield by plot age (for perennials - does yield improve over years?)
- Identify underperforming plots (automated recommendations)
- Correlation with weather data (IoT integration)
- Soil quality impact analysis
- Input impact analysis (fertilizer, irrigation effects)
- Predictive yield modeling (ML-based forecasting)

---

##### **Role-Based Analytics Access (MVP):**

**Farm Manager:**
- ✅ All farm analytics and reports
- ✅ All plots, all crops
- ✅ Full financial visibility (farm finances only)
- ✅ Can export reports (PDF, CSV, Excel)
- ✅ Can configure alert thresholds

**Crop Manager:**
- ✅ All farm analytics (not restricted to assigned plots)
- ✅ All farm finances (view all, edit only their crops)
- ✅ Can export reports for their crops
- ❌ Cannot configure alert thresholds (Farm Manager only)

**Village Head / Admin:**
- ✅ High-level farm summary
- ✅ Total farm contribution to village income
- ✅ Read-only access to all farm analytics

**Finance Manager:**
- ✅ Farm financial reports (all 8 reports)
- ✅ Integration with village-wide financial reports
- ✅ Can export financial reports

**Post-MVP:**
- Strategic insights dashboard (which modules generate most income?)
- Cross-module comparative analytics
- Village-wide performance benchmarking

---

##### **Data Export (MVP):**

**Export Formats:**
- PDF (formatted reports with charts)
- Excel (XLSX with formatted tables)
- CSV (raw data for external analysis)

**Export Scope:**
- Current view/report only
- Respects current filters and date ranges

**Export Triggers:**
- User clicks "Export" button on any report
- Generated on-demand (not pre-generated)
- Print-friendly formatting

**Post-MVP:**
- JSON (API integration for external systems)
- Custom date range export
- All data export (full database dump)
- Scheduled exports (automated email delivery)
- Bulk export (multiple reports at once)

---

##### **Benchmarking (MVP):**

**Internal Benchmarking Only:**
- Compare plots within same village
- Compare seasons within same village (this season vs. last season)
- Historical performance tracking (year-over-year)
- Identify best/worst performing plots and crops

**Display:**
- Comparative tables and charts
- Ranking views (top 5 plots, top 3 crops)
- Performance badges (best performer, most improved)

**Post-MVP:**
- Multi-village comparisons (if multiple villages use system)
- Regional averages (Zambian maize yields, etc.)
- Best practices sharing (what do high-performing villages do differently?)
- Anonymous data aggregation (privacy-preserving benchmarks)
- External data integration (government agricultural statistics)

---

##### **Appwrite Functions Required (Analytics):**

**1. Calculate Yield Trends**
- Scheduled function (runs daily)
- Aggregates historical yield data per plot and crop
- Stores pre-calculated trends for fast dashboard loading
- Updates when new harvests are recorded

**2. Generate Expected Harvest Projections**
- Scheduled function (runs daily)
- Queries active plantings with upcoming expected_first_harvest_date
- Calculates expected quantities and income
- Caches results for dashboard display

**3. Calculate Alert Conditions**
- Scheduled function (runs hourly or daily)
- Checks all alert conditions against thresholds
- Generates notifications for Farm Manager
- Marks alerts as "seen" or "dismissed"

**4. Pre-Aggregate Financial Reports**
- Scheduled function (runs nightly)
- Pre-calculates common report queries for fast loading
- Stores aggregated data in cache
- Invalidates cache when new sales/expenses recorded

---

##### **Post-MVP Analytics Enhancements:**

**Advanced Visualizations:**
- Heat maps (plot performance across farm)
- Scatter plots (yield vs. profit correlation)
- Gantt charts (planting and harvest timeline)
- Geographic maps (if GPS coordinates tracked)

**Predictive Analytics:**
- ML-based yield forecasting
- Price prediction models
- Optimal planting time recommendations
- Crop rotation suggestions

**Prescriptive Analytics:**
- "What-if" scenario modeling (what if we plant more maize?)
- Resource optimization (maximize profit given constraints)
- Risk analysis (crop failure probability)

**External Integrations:**
- Weather data correlation
- Market price feeds
- Government agricultural data
- Satellite imagery analysis

**Mobile Analytics:**
- Offline-capable dashboards
- Push notifications for alerts
- Voice-activated queries
- SMS-based reports

---

### **Session 2: School Management Branch - COMPLETED**

**Status:** ✅ Fully specified and documented

#### **Academic Structure:**

**Grade Levels:**
- Initial: Pre-K through Grade 9 (10 grade levels)
- Future expansion: Grades 10-12 (admin can add dynamically)
- Admin control: Can add new grade levels as needed

**Sections:**
- Initial: One section per grade
- Expandable: Admin can add sections with flexible naming (5A, 5B, Grade 5 Red, etc.)
- Capacity: Default 30 learners per section (admin configurable)
- Warning displayed when over capacity (not enforced)

**Academic Year/Terms:**
- Default: Zambian system (3 terms)
  - Term 1: January 15 - April 30
  - Term 2: May 15 - August 31
  - Term 3: September 15 - December 15
- Admin configurable: Can modify term structure, start/end dates, term names

**Subjects:**
- Core subjects: Math, English, Science, Social Studies, Chichewa, Life Skills
- All subjects independent (no parent-child relationships)
- Science, Biology, Chemistry, Physics are separate subjects
- Admin can add subjects via dropdown with "+ Add Subject" option
- Grade-specific subjects supported

**Curriculum & Standards:**
- Excluded from MVP - no curriculum tracking

#### **Learner Management:**

**Data Architecture (GraphQL):**
```
Learners Table:
- learner_id (PK)
- resident_id (FK → Residents table)
- student_id_number (auto-generated: YYYY-NNN, resets yearly)
- enrollment_date
- current_grade_id (FK)
- current_section_id (FK)
- times_repeated_current_grade (integer)
- status (active, graduated, transferred, withdrawn, retained)
- notes (health, family, behavior info - Post-MVP)
- created_date
```

**Data Fetched via GraphQL Relationships:**
- From Residents: Name, DOB, Gender, Household
- From Households: Address, household head, occupants
- Health info: From notes field (Post-MVP)
- Family info: Via household relationships

**Student ID Generation:**
- Auto-generated format: YYYY-NNN (e.g., 2025-001, 2025-002)
- Resets each academic year
- Sequential numbering per year
- Appwrite Function triggers on enrollment

**Enrollment Process:**
1. Resident exists in system (or created first)
2. Admin/Head Teacher clicks "Enroll as Learner"
3. System auto-generates student ID
4. Admin selects: Grade Level, Section, Enrollment Date
5. Learner record created with status "Active"

**Outside Learners:**
- Registered as residents from day 1 (no 3-month wait)
- Identified by `resident_type = "Outside Learner"` in Residents table
- Subject to school fees

**MVP Learner Features:**
- ✅ Enrollment info (date, grade, section, student ID)
- ✅ Test scores (subject, date, score, assessment type, term)
- ✅ Attendance (daily tracking, absence reasons, tardiness)
- ✅ Academic records and analytics
- ✅ Grade promotion/retention tracking

**Post-MVP:**
- Health info (allergies, medical conditions, vaccinations)
- Behavior/conduct tracking
- Progress reports and parent-teacher conference notes

#### **Teacher Management:**

**Data Architecture:**
```
Teachers Table:
- teacher_id (PK)
- resident_id (FK → Residents table)
- hire_date
- employment_type (full-time, part-time, volunteer)
- salary (link to Finance module)
- contract_end_date (optional)
- notes (teaching certs, specialized training - Post-MVP)
- status (active, on-leave, terminated)
- created_date

Teaching Assignments Table:
- assignment_id (PK)
- teacher_id (FK)
- subject_id (FK)
- grade_level (FK)
- section_id (FK)
- academic_year_id (FK)
- term_id (FK)
```

**Teacher Evaluations:**

**Self-Evaluations:**
- Frequency: Termly (3 times per year)
- Criteria: Admin-configurable (Teaching Effectiveness, Student Engagement, Classroom Management, etc.)
- Format: Structured form with 1-5 numeric ratings + open-ended reflection
- Scoring: 1=Poor, 2=Below Average, 3=Satisfactory, 4=Good, 5=Excellent

**Peer Evaluations:**
- Frequency: Termly
- Requirement: Each teacher must receive minimum 5 peer evaluations per term
- Process: Round-robin system, all teachers evaluate each other
- Assignment: Head Teacher or Deputy Head Teacher assigns evaluation pairs
- Attributed: Teachers know who evaluated them
- Visibility: Teachers can see their evaluations (full transparency)
- Criteria: Admin-configurable (same scale as self-evaluations)

**Head Teacher Evaluations:**
- Frequency: Termly
- Process: Head Teacher evaluates all teachers
- Criteria: Classroom observations, performance ratings, feedback, coaching notes
- Head Teacher and school admins also receive evaluations (peer + self)

**Evaluation Criteria Configuration:**
```
evaluation_criteria:
- criteria_id (PK)
- criteria_name (Teaching Effectiveness, Student Engagement, etc.)
- description
- sort_order
- is_active
- applies_to (self, peer, head_teacher, student - future)
```

**MVP Teacher Features:**
- ✅ Basic profile (via resident_id)
- ✅ Teaching assignments (subjects, grades, sections)
- ✅ Self-evaluations (termly, admin-configurable criteria)
- ✅ Peer evaluations (round-robin, attributed, minimum 5 per term)
- ✅ Head Teacher evaluations (termly)
- ✅ Numeric scoring (1-5 scale)

**Post-MVP:**
- Qualifications (education, certifications)
- Professional development tracking
- Student feedback (Grade 7+)

#### **Academic Performance & Reporting:**

**Report Cards:**
- Generated on-demand (not scheduled/stored)
- Displayed in web browser (HTML/PDF preview)
- Downloadable as PDF
- No automatic notifications (flag set to false by default)
- Accessible from parent/guardian dashboard

**Report Card Contents:**
- Student info (name, student ID, grade, section)
- Term/academic year
- Grades per subject (score, percentage, letter grade)
- Teacher comments per subject (all subject teachers contribute)
- Attendance summary
- Overall GPA/average
- School logo and signature lines

**Report Card Comments:**
```
report_card_comments:
- comment_id (PK)
- learner_id (FK)
- teacher_id (FK)
- subject_id (FK)
- academic_year_id (FK)
- term_id (FK)
- comment_text
- created_date
- updated_date
```

**Analytics:**
- ✅ Student-level reports (report cards, progress reports, transcripts)
- ✅ Class-level analytics (averages, pass/fail rates, attendance)
- ✅ School-wide analytics (enrollment trends, performance comparisons)
- ✅ Comparative analytics (year-over-year, cohort tracking)

#### **Grade Promotion:**

**Automatic Promotion (Appwrite Function):**
- Runs at end of academic year (scheduled task)
- Evaluates passing criteria per subject
- Promotes passing students automatically
- Retains failing students
- Auto-assigns sections (balanced distribution)
- Generates promotion/retention reports
- No automatic notifications (manual process)

**Passing Criteria (Admin-Configurable):**
- Default rules:
  - Math: ≥ 50%
  - English: ≥ 50%
  - Other subjects: ≥ 40%
  - Must pass ALL subjects to be promoted

**Promotion Criteria Configuration:**
```
promotion_criteria:
- criteria_id (PK)
- academic_year_id (FK)
- subject_id (FK)
- passing_percentage (decimal)
- is_core_subject (boolean)
- created_by (user_id)
- created_date
```

**Grade Retention:**
- Students who don't pass repeat the grade
- Intervention administered first time learner repeats (not tracked in system)
- Tracking via `times_repeated_current_grade` field

**Grade Promotions Audit:**
```
grade_promotions:
- promotion_id (PK)
- learner_id (FK)
- from_grade_id (FK)
- to_grade_id (FK) - NULL if retained
- academic_year_id (FK)
- promotion_type (promoted, retained, manual_promoted, manual_retained)
- promotion_date
- reason (passed_all, failed_core_subjects, manual_decision)
- notes
```

**Section Assignment on Promotion:**
- Auto-assigned on promotion (balanced distribution)
- Can be changed by: Head Teacher, Deputy Head Teacher, Guidance Counselor
- Algorithm: Round-robin or balanced distribution considering capacity

**Section Assignments Audit:**
```
section_assignments:
- assignment_id (PK)
- learner_id (FK)
- section_id (FK)
- academic_year_id (FK)
- assignment_date
- assigned_by (user_id)
- assignment_type (auto_promotion, manual_assignment, transfer)
- previous_section_id (FK)
- reason
```

#### **School Fees:**

**Fee Structure:**
- Fees set per term
- Different rates for Primary vs. Secondary
- Admin configurable (can change amounts per term/year)
- **Permanent village residents:** FREE (no fees)
- **Outside learners:** Pay fees (identified by `resident_type`)
- Installment payments allowed

**Fee Configuration:**
```
fee_configuration:
- config_id (PK)
- academic_year_id (FK)
- term_id (FK)
- level_type (Primary, Secondary)
- fee_amount (decimal)
- created_by (user_id)
- created_date
- is_active
```

**Fee Tracking:**
```
school_fees:
- fee_id (PK)
- learner_id (FK)
- academic_year_id (FK)
- term_id (FK)
- fee_amount (decimal)
- payment_status (unpaid, partial, paid, overdue)
- amount_paid (decimal)
- balance_due (decimal)
- due_date
- payment_date
- payment_method (cash, bank_transfer, mobile_money)
- has_installment_plan (boolean)
- notes

fee_installments:
- installment_id (PK)
- fee_id (FK)
- installment_number
- amount_due (decimal)
- due_date
- amount_paid (decimal)
- payment_date
- status (pending, paid, overdue)
```

**Payment Reminders:**
- Sent manually by Head Teacher or Deputy Head Teacher (not automated)
- System highlights learners needing reminders (e.g., "Last reminder: 7 days ago")
- Tracking required: date, time, method, sender

**Fee Reminder Log:**
```
fee_reminder_log:
- reminder_id (PK)
- fee_id (FK)
- learner_id (FK)
- sent_by (user_id)
- sent_date
- sent_time
- communication_method (email, SMS, phone_call, in_person, letter)
- notes
- days_since_last_reminder (calculated)
```

#### **Roles & Permissions:**

**New Role Added:**
- **Guidance Counselor** - Same permissions as Head Teacher

**Updated Roles List:**
- System Administrator
- Village Head, Deputy Village Head
- Head Teacher, Deputy Head Teacher
- **Guidance Counselor** (NEW)
- Teacher
- Farm Manager, Farm Worker
- Events Coordinator
- Resident (base role)
- Learner (extends Resident)

**Parent/Guardian Access:**
- Any resident CAN be an app user (optional)
- Access to personal data: household info, health records, test scores (their children)
- Dashboard shows "Your Children" section with learner info
- Can view and download report cards
- Acknowledges digital divide (connectivity, devices, digital literacy)

#### **Integration with Other Modules:**

**Residents Module:**
- Teachers linked via resident_id
- Learners linked via resident_id
- Parents/guardians via household relationships
- `resident_type` field identifies Outside Learners

**Households Module:**
- Family relationships
- Emergency contacts
- Address information

**Finance Module:**
- Teacher salaries
- School fee income
- School expenses

**Equipment Module:**
- School bus, computers, projectors, lab equipment

**Calendar Module:**
- School events (exams, holidays, parent meetings)
- Category: "School"

**Inventory Module:**
- School supplies (paper, pens, chalk, textbooks)

#### **Library Module:**

- **Separate Module** (serves both school and village)
- **Post-MVP** - will design later
- **NOT linked to Inventory module**
- Features: Book catalog, borrowing system, overdue tracking
- Links to Residents (borrowers)

#### **Admin Configuration:**

**Per-Module Settings Pattern:**
- Each module manages its own configurable items
- In-context additions: Dropdown with "+ Add New" option
- Dedicated settings page per module

**School Module Settings:**
- Manage Grade Levels (add/edit/archive)
- Manage Subjects (add/edit/archive)
- Configure Academic Year/Terms
- Set Fee Structure
- Configure Evaluation Criteria
- Set Promotion Criteria
- Set Section Capacity Defaults

**Global System Settings Module:**
- Village info (name, address, timezone, currency, date formats)
- Notification preferences
- Backup schedules
- User role definitions and permissions
- System-wide defaults
- Email/SMS configuration

#### **Appwrite Functions Required:**

1. **Auto-Generate Student IDs**
   - Triggers on learner enrollment
   - Generates YYYY-NNN format
   - Resets counter each year

2. **Generate Report Card (On-Demand)**
   - User clicks "View Report Card" button
   - Fetches learner info, test scores, teacher comments, attendance
   - Generates HTML/PDF on-the-fly
   - Returns to browser for display/download
   - Updates metadata (generated_count, last_generated_date)

3. **Auto-Promote Students (Scheduled)**
   - Runs at end of academic year
   - Evaluates passing criteria per subject
   - Promotes passing students
   - Retains failing students
   - Auto-assigns sections (with capacity warnings)
   - Generates promotion/retention reports
   - No automatic notifications

4. **Fee Reminder Tracker (Dashboard Helper)**
   - Calculates days since last reminder
   - Highlights overdue fees needing follow-up
   - Updates dashboard for Head/Deputy Head Teacher

#### **Post-MVP Features:**

- Library module (separate design)
- Health records (detailed tracking)
- Behavior/conduct system
- Professional development tracking
- Student feedback on teachers (Grade 7+)
- Cafeteria/meals tracking
- Timetable/schedule management
- Advanced resource management

---

## Idea Categorization

### Immediate Opportunities

_Ideas ready to implement now_

1. **First-Time Setup Wizard with Sample Data** - Critical for user onboarding and testing
2. **Core 6 Modules** (Residents, Households, Finance, Inventory, Calendar, Cloud Storage) - Foundation for all operations
3. **Role-Based Access Control with Multi-Role Support** - Essential security and permissions framework
4. **Phased Development Approach** (Big Picture → Granular) - Enables faster user testing and feedback
5. **School Management Complete Specification** - Fully designed and ready for implementation
6. **Guest Stay Monitoring (90-day alerts)** - Simple but valuable workflow automation
7. **Student ID Auto-Generation** - Clean technical solution with Appwrite Functions
8. **Report Card On-Demand Generation** - High-value feature for parents and teachers

### Future Innovations

_Ideas requiring development/research_

1. **IoT Integration Layer** - Generic sensor data ingestion for weather, soil, solar, water monitoring
2. **Plugin/Module Architecture** - Extensibility for custom village-specific needs
3. **Advanced Harvest Analytics** - Yield predictions, weather correlations, historical trends
4. **Library Module** - Separate system serving both school and village community
5. **Health Records System** - Detailed tracking for learners and residents
6. **Professional Development Tracking** - Teacher certification and training management
7. **Student Feedback on Teachers** (Grade 7+) - Comprehensive evaluation system
8. **Individual Household Utility Monitoring** - Per-household energy/water consumption tracking

### Moonshots

_Ambitious, transformative concepts_

1. **AI-Powered Crop Yield Predictions** - Machine learning based on historical data + IoT sensors
2. **Mobile-First Progressive Web App** - Offline-capable app for low-connectivity environments
3. **Inter-Village Network** - Data sharing and best practices across multiple villages
4. **Blockchain-Based Financial Transparency** - Immutable audit trail for donor reporting
5. **Automated Drone Monitoring** - Aerial crop health assessment and land surveying
6. **Village Marketplace Platform** - E-commerce for village products reaching external buyers

### Insights and Learnings

_Key realizations from the session_

1. **Sample Data is Critical for Adoption** - Moving sample data choice to Step 1 prevents wasted user effort and enables immediate exploration
2. **Cross-Cutting Concerns Need Dedicated Modules** - Equipment, Vendors, and Finance serve multiple modules; centralizing prevents duplication
3. **Guest vs. Resident Definition Matters** - Clear 3-month threshold with conversion workflow prevents system bloat
4. **School Module Complexity Requires Deep Dive** - Academic management is feature-rich and needed detailed specification session
5. **Phased Development Reduces Risk** - Starting with testable workflows (e.g., Farm: plots → crops → harvest → income) enables early validation
6. **Digital Divide is Real** - Parent/guardian app access is optional; system must work without assuming universal connectivity
7. **Modular Architecture Enables Flexibility** - Villages can enable only modules they need; reduces cognitive load and setup time
8. **Appwrite Functions Handle Automation** - Student IDs, grade promotion, report generation leverage serverless functions effectively

## Action Planning

### Top 3 Priority Ideas

#### #1 Priority: Complete MVP Sprint Sequence (Foundation → Residents → Households → Farm)

**Rationale:**
- Delivers a testable end-to-end workflow quickly (add plots → plant crops → record harvest → track income)
- Validates core architecture decisions before building additional modules
- Provides immediate value to early adopters and enables real-world feedback
- Establishes patterns for subsequent module development
- Demonstrates the phased "big picture → granular" approach in practice

**Next Steps:**
1. Create detailed user stories for Sprints 1-4 (Foundation, Residents, Households, Farm Basic)
2. Design database schema for core tables (villages, residents, households, farm_plots, crops, harvests)
3. Set up Appwrite project with authentication, database, and storage
4. Implement Sprint 1: Setup wizard, authentication, admin dashboard skeleton
5. Implement Sprint 2: Residents module with role-based access control
6. Implement Sprint 3: Households module with all household types
7. Implement Sprint 4: Farm module basic workflow (plots → crops → harvests → income)
8. Conduct user testing with sample data and gather feedback

**Resources Needed:**
- Appwrite Cloud account (or self-hosted instance)
- Frontend framework: React + TailwindCSS + shadcn/ui
- Developer time: 6-8 weeks for Sprints 1-4
- Test users: 2-3 village staff members for feedback
- Documentation: API specs, user guides, admin guides

**Timeline:**
- **Week 1-2:** Database schema design + Appwrite setup + Sprint 1 (Foundation)
- **Week 3:** Sprint 2 (Residents module)
- **Week 4:** Sprint 3 (Households module)
- **Week 5-6:** Sprint 4 (Farm module basic workflow)
- **Week 7:** User testing and bug fixes
- **Week 8:** Documentation and handoff preparation

#### #2 Priority: Implement First-Time Setup Wizard with Sample Data

**Rationale:**
- Critical for user adoption and onboarding experience
- Sample data enables immediate exploration without data entry burden
- Reduces barrier to entry for evaluators, donors, and new village administrators
- Provides realistic context (Zambian village scenario) that resonates with target users
- Allows testing of all features without manual setup effort
- "Start Fresh" wipe functionality enables smooth transition from exploration to production

**Next Steps:**
1. Design multi-step wizard UI/UX with clear progress indicators
2. Create comprehensive sample data generator script (Zambian context)
3. Implement Step 1: Sample vs. Real Data decision point
4. Implement Sample Data path: Village config → Initialize database → Display credentials
5. Implement Real Data path: Village setup → First household → Admin user → Village Head → Module selection
6. Build sample data generator for all modules (2 years historical data)
7. Implement persistent banner in dashboard for sample data mode
8. Build "Start Fresh - Wipe All Data" confirmation flow with data deletion
9. Test both paths thoroughly with different user scenarios

**Resources Needed:**
- UI/UX design for wizard flow (Figma mockups recommended)
- Sample data: Realistic Zambian names, locations, crops, financial data
- Appwrite Functions for data generation and deletion
- Developer time: 2-3 weeks
- Cultural consultant: Verify Zambian context authenticity (optional but valuable)

**Timeline:**
- **Week 1:** UI/UX design + Sample data script development
- **Week 2:** Wizard implementation (both paths)
- **Week 3:** Sample data generator + Wipe functionality + Testing

#### #3 Priority: Design Database Schema and Appwrite Backend Architecture

**Rationale:**
- Foundation for all development work; must be done correctly from the start
- Prevents costly refactoring later due to schema design flaws
- Establishes relationships between modules (GraphQL-style references)
- Defines security rules, permissions, and role-based access patterns
- Enables parallel development once schema is locked
- Critical for data integrity, scalability, and performance

**Next Steps:**
1. Document complete database schema for all MVP modules (Core + Optional)
2. Define table relationships and foreign key constraints
3. Map out GraphQL-style data fetching patterns (avoid duplication)
4. Design role-based permissions matrix (who can read/write what)
5. Create Appwrite collections with proper indexes
6. Set up Appwrite Functions for automation (student IDs, grade promotion, report generation)
7. Define storage bucket structure and quota enforcement
8. Document API patterns and naming conventions
9. Create database migration strategy for future schema changes
10. Build data validation rules and constraints

**Resources Needed:**
- Database design tools: dbdiagram.io or similar ER diagram tool
- Appwrite documentation and best practices
- Developer time: 2-3 weeks
- Code review: Senior developer or database architect (if available)
- Documentation: Schema diagrams, API specs, permission matrix

**Timeline:**
- **Week 1:** Core modules schema (Residents, Households, Finance, Inventory, Calendar, Storage)
- **Week 2:** Optional modules schema (Farm, School, Guests, Equipment, Vendors, Energy)
- **Week 3:** Appwrite implementation + Functions setup + Testing + Documentation

## Reflection and Follow-up

### What Worked Well

- **Systematic Mind Mapping Approach:** Breaking down the village ecosystem into discrete modules revealed gaps and cross-cutting concerns effectively
- **Deep Dive on School Module:** Dedicating an entire session to school management uncovered complexity that would have been missed in surface-level planning
- **Phased Development Strategy:** The "big picture → granular" approach provides clear roadmap and enables early user testing
- **Sample Data Decision:** Moving sample data choice to Step 1 was a breakthrough insight that improves UX significantly
- **Cross-Cutting Concerns Identification:** Recognizing Equipment, Vendors, and Finance as shared services prevents future architectural problems
- **Real-World Context:** Grounding sample data in Zambian village reality makes the system relatable and authentic

### Areas for Further Exploration

1. **Energy Management Module Details** - Solar microgrid monitoring, IoT integration patterns, real-time dashboards
2. **Finance Module Deep Dive** - Village lending workflows, loan approval process, repayment tracking, donor reporting
3. **Equipment Maintenance Workflows** - Scheduling, vendor coordination, warranty tracking, condition assessment
4. **IoT Integration Architecture** - Generic sensor framework, data ingestion patterns, alert systems
5. **Offline-First Capabilities** - Progressive Web App design for low-connectivity environments
6. **Mobile Responsiveness** - Touch-optimized UI for tablet and phone access
7. **Multi-Language Support** - English + Chichewa (or other local languages)
8. **Data Export and Backup** - Automated backups, manual exports, disaster recovery
9. **Audit Logging** - Track all data changes for accountability and troubleshooting
10. **Performance Optimization** - Caching strategies, lazy loading, pagination for large datasets

### Recommended Follow-up Techniques

1. **User Story Mapping** - For each sprint, create detailed user stories with acceptance criteria
2. **Wireframing/Prototyping** - Visual mockups of key screens (setup wizard, dashboards, data entry forms)
3. **Technical Spike** - Proof-of-concept for Appwrite Functions (student ID generation, report card PDF)
4. **Stakeholder Interviews** - Validate assumptions with actual village administrators and teachers
5. **Competitive Analysis** - Review similar systems (FarmOS, OpenEMIS, village management tools)
6. **Risk Assessment** - Identify technical, operational, and adoption risks with mitigation strategies

### Questions That Emerged

1. **Deployment Model:** Self-hosted vs. Appwrite Cloud? What are cost implications for villages?
2. **Data Ownership:** Who owns the data? What happens if village stops using the system?
3. **Training Requirements:** How much training do village staff need? What support materials are needed?
4. **Internet Connectivity:** What's the minimum viable connectivity? How does offline mode work?
5. **Mobile Device Access:** Do village staff have smartphones/tablets? What's the device strategy?
6. **Localization:** Beyond English, what languages are needed? How is translation managed?
7. **Scalability:** Can one instance serve multiple villages? Or one instance per village?
8. **Licensing:** Open-source license choice (MIT, GPL, Apache)? Commercial use restrictions?
9. **Community Contributions:** How do external developers contribute modules? Plugin marketplace?
10. **Long-Term Maintenance:** Who maintains the codebase? Funding model for ongoing development?

### Next Session Planning

**Suggested Topics:**
1. **Product Brief Generation** - Transform brainstorming results into formal Product Requirements Document
2. **Solution Architecture Design** - Technical architecture diagrams, tech stack decisions, deployment architecture
3. **Database Schema Workshop** - Detailed ER diagrams for all modules with relationships and constraints
4. **UI/UX Design Session** - Wireframes for key workflows (setup wizard, dashboards, data entry)
5. **Risk Assessment and Mitigation** - Identify blockers and develop contingency plans

**Recommended Timeframe:**
- **Next 2-3 days:** Product Brief generation (while brainstorming is fresh)
- **Following week:** Solution Architecture and Database Schema design
- **Week after:** UI/UX wireframing and user story mapping

**Preparation Needed:**
- Review this brainstorming document thoroughly
- Gather any existing village management documentation or processes
- Identify 2-3 potential test users for early feedback
- Research Appwrite capabilities and limitations
- Review similar open-source projects for inspiration
- Prepare questions for stakeholder validation interviews

---

_Session facilitated using the BMAD CIS brainstorming framework_
