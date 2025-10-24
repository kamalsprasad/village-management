# Sustainable Model Village Management System - Epic Breakdown

**Author:** Kamal S. Prasad
**Date:** 2025-10-23
**Project Level:** 3 (Complex System)
**Target Scale:** 50 adults initially, scaling to 1,000 by year 30

---

## Overview

This document provides the detailed epic breakdown for the Sustainable Model Village Management System, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

---

## Complete Epic Summary

**Total Stories: 51 stories**

- **Epic 1:** 11 stories (Project Foundation & Core Infrastructure)
- **Epic 2:** 9 stories (Financial Management and Inventory Tracking)
- **Epic 3:** 11 stories (Farm Management and Agricultural Tracking)
- **Epic 4:** 10 stories (School Management and Educational Accountability)
- **Epic 5:** 10 stories (Village Calendar, Storage, and Optional Modules)

---

## Epic 1: Project Foundation & Core Infrastructure (11 stories)

**Expanded Goal:** Establish the foundational infrastructure for the Sustainable Model Village Management System, including project setup, authentication, role-based access control, village configuration, and core resident/household management.

**Value Delivered:** Village administrators can log in with role-appropriate access, view a functional dashboard, manage residents and households, and configure village settings. The sample data mode (Katete Model Village) provides a realistic preview with 2 years of historical data.

---

### Story 1.1: Project Setup and Quasar + Appwrite Integration

As a **developer**, I want a fully configured Quasar SSR project with Appwrite backend integration, so that I have a solid foundation to build all subsequent features.

**Acceptance Criteria:**

1. Quasar Framework (Vue 3) project initialized with SSR mode enabled
2. Project structure follows Quasar best practices (pages, components, layouts, stores)
3. Appwrite SDK integrated with connection configuration (endpoint, project ID)
4. Environment variables configured for Appwrite credentials (.env file with .env.example template)
5. Basic routing setup with placeholder home page
6. Development server runs successfully on localhost with hot reload
7. README.md includes setup instructions for new developers
8. Git repository initialized with .gitignore configured

**Prerequisites:** None (foundational story)

---

### Story 1.2: Appwrite Project Structure and Database Schema

As a **developer**, I want Appwrite databases, collections, and initial schema configured, so that the backend is ready to store village data with proper relationships.

**Acceptance Criteria:**

1. Appwrite project created with appropriate name and configuration
2. Database created: "village_management"
3. Core collections created with schemas: users, residents, households, roles
4. Collection relationships configured (residents → households)
5. Indexes created for common queries (household_id, role_ids)
6. Appwrite permissions configured for collection-level access control
7. Documentation added to README for database schema

**Prerequisites:** Story 1.1

---

### Story 1.3: Authentication System with Email/Password

As a **village administrator**, I want to log in with email and password, so that I can securely access the village management system.

**Acceptance Criteria:**

1. Login page created with email and password fields
2. Appwrite authentication integrated (email/password method)
3. Login form validates email format and password requirements
4. Successful login redirects to dashboard
5. Failed login shows clear error message
6. "Remember me" functionality stores session
7. Logout functionality clears session and redirects to login
8. Protected routes redirect unauthenticated users to login page
9. Pinia store manages authentication state

**Prerequisites:** Story 1.2

---

### Story 1.4: Role-Based Access Control (RBAC) Foundation

As a **system administrator**, I want a role-based permission system with multi-role support, so that users have appropriate access based on their village responsibilities.

**Acceptance Criteria:**

1. Roles collection seeded with 5 core roles: System Administrator, Village Head, Finance Manager, Resident, Guest
2. User profile includes role_ids[] array supporting multi-role assignment
3. Permission checking utility function: hasPermission(user, permission)
4. Permissions calculated as union of all assigned roles
5. Route guards enforce role-based access
6. UI components conditionally render based on user permissions
7. Appwrite collection permissions configured to respect RBAC rules
8. Admin interface to view user roles (edit functionality deferred to Epic 2)

**Prerequisites:** Story 1.3

---

### Story 1.5: Dashboard Framework and Layout

As a **village administrator**, I want a role-appropriate dashboard when I log in, so that I can quickly access relevant information and navigate the system.

**Acceptance Criteria:**

1. Main layout created with top navigation bar, left sidebar navigation, main content area
2. Dashboard home page with placeholder widget areas
3. Navigation menu shows only modules user has permission to access
4. User menu displays current user name and role(s)
5. Responsive layout works on desktop (1920px), tablet (768px), and mobile (320px)
6. Sidebar collapses on mobile with hamburger menu
7. Dashboard greeting: "Welcome back, [User Name]"
8. Placeholder widgets for: Upcoming Events, Quick Stats, Recent Activity
9. Dashboard loads within 2 seconds on 3G connection

**Prerequisites:** Story 1.4

---

### Story 1.6: Households Management - CRUD Operations

As a **village administrator**, I want to create and manage households, so that I can track where residents live and organize the community structure.

**Acceptance Criteria:**

1. Households list page showing all households (name, type, occupant count, construction date)
2. "Add Household" button opens form with fields: household name, type, construction date, bedrooms, bathrooms, room/unit numbers
3. Successful save creates household in Appwrite
4. Household detail view shows basic information, list of occupants (initially empty), message: "Add residents to populate this household"
5. Edit and delete functionality with appropriate confirmations
6. Household dashboard widget shows total households by type
7. Validation prevents deletion if household has occupants

**Prerequisites:** Story 1.5

---

### Story 1.7: Residents Management - CRUD Operations

As a **village administrator**, I want to add, view, edit, and delete village residents, so that I can maintain an accurate registry of all community members.

**Acceptance Criteria:**

1. Residents list page showing all residents in table format
2. "Add Resident" button opens form with fields: full name, DOB, gender, contact details, household assignment (required), role assignment
3. Form validation prevents submission with missing required fields including household
4. If no households exist, show message: "Please create at least one household before adding residents" with link to Households page
5. Successful save creates resident in Appwrite and shows success message
6. Residents list updates immediately after save
7. Resident is automatically added to selected household's occupants list
8. Click resident name opens detail view with all information
9. Edit button in detail view opens pre-filled form
10. Delete button shows confirmation dialog
11. Deleting resident automatically removes them from household occupants list
12. Search/filter functionality by name, household, or role
13. Pagination for lists >50 residents

**Prerequisites:** Story 1.6, Story 1.4

---

### Story 1.8: Village Configuration and Default Settings

As a **System Administrator**, I want to configure core village information and default settings, so that the system is properly customized for our specific village context.

**Acceptance Criteria:**

1. Village configuration collection created in Appwrite with fields: village_name, address, established_date, default_currency, currency_symbol, timezone, is_using_sample_data
2. Village Settings page accessible from Admin menu
3. Settings page includes sections: Basic Information, Financial Settings, System Settings, Council Members
4. Council Members sub-section: Add/edit/remove council members with positions
5. First-time setup wizard includes village configuration step
6. Village name displays in top navigation bar, dashboard header, all exported reports
7. Currency symbol used throughout Finance module
8. Settings page shows "Last Updated" timestamp
9. Only System Administrator can edit village settings
10. Village Head and other roles have read-only access to view settings

**Prerequisites:** Story 1.4, Story 1.5

---

### Story 1.9: Sample Data Mode - Katete Model Village Seed Data

As a **potential adopter**, I want to explore the system with realistic sample data, so that I can evaluate the platform's capabilities before committing to production use.

**Acceptance Criteria:**

1. First-time setup wizard appears on initial app load
2. Wizard presents two options: "Explore with Sample Data" (prominent), "Start Fresh with Real Data" (deferred to Epic 5)
3. Selecting "Explore with Sample Data" loads Katete Model Village dataset: village configuration, sample council members, 15-20 residents, 5-6 households
4. Village configuration flag set: is_using_sample_data: true
5. Persistent banner displayed on all pages: "🏷️ SAMPLE DATA MODE - Exploring Katete Model Village"
6. Banner includes "Start Fresh - Wipe All Data" button
7. Clicking wipe button shows confirmation dialog: "Type 'DELETE EVERYTHING' to confirm"
8. Successful wipe clears all data and returns to setup wizard
9. Sample data includes realistic names, dates, and relationships

**Prerequisites:** Story 1.6, Story 1.7, Story 1.8

---

### Story 1.10: Dashboard Widgets - Residents and Households Summary

As a **village administrator**, I want to see key statistics about residents and households on my dashboard, so that I have quick visibility into community composition.

**Acceptance Criteria:**

1. Dashboard displays "Community Overview" widget with: total residents count, total households count, households by type chart, recent additions
2. Widget updates in real-time when residents/households are added/edited
3. Click "View All" links navigate to respective list pages
4. Widget is responsive and displays correctly on mobile devices
5. Chart colors follow Quasar theme for visual consistency
6. Widget shows placeholder message if no data exists

**Prerequisites:** Story 1.6, Story 1.7, Story 1.5

---

### Story 1.11: User Profile and Storage Quota Display

As a **village user**, I want to view my profile information and storage quota, so that I understand my role and available storage space.

**Acceptance Criteria:**

1. User menu in top navigation includes "My Profile" link
2. Profile page displays: full name, email, assigned roles, storage quota based on primary role, current storage usage (placeholder), storage usage progress bar
3. Profile page shows message: "Storage functionality coming soon"
4. Profile page includes "Change Password" button (functionality deferred to Epic 2)
5. Profile loads within 1 second
6. Mobile-responsive layout

**Prerequisites:** Story 1.4, Story 1.5

---

**Epic 1 Summary:** 11 stories, 22-33 hours estimated effort. Deliverables: Fully functional Quasar SSR + Appwrite application, authentication and RBAC foundation, village configuration, households and residents management, sample data mode, dashboard framework.

---

## Epic 2: Financial Management and Inventory Tracking (9 stories)

**Expanded Goal:** Enable comprehensive financial tracking across all village operations with integrated inventory management. This epic delivers the financial backbone of the village management system, supporting income/expense tracking, donor accountability, village lending, and inventory management.

**Value Delivered:** Finance Manager can record all financial transactions with complete audit trails, generate donor reports in hours instead of weeks, manage village lending programs, and track inventory across all modules.

---

### Story 2.1: Finance Module - Income Transaction Recording

As a **Finance Manager**, I want to record income transactions with source tracking, so that I can maintain accurate financial records and demonstrate accountability.

**Acceptance Criteria:**

1. Finance navigation item appears for users with Finance Manager role
2. Finance dashboard shows income summary (total income, recent transactions)
3. "Record Income" button opens form with fields: date, amount (ZMW), source module, category, payment method, payment status, description, reference ID
4. Form validation prevents negative amounts and missing required fields
5. Successful save creates income transaction in Appwrite
6. Income list page shows all transactions with filters by date range, source, status
7. Transaction detail view shows complete information
8. Edit and delete functionality with audit logging
9. Finance dashboard updates in real-time after transaction save

**Prerequisites:** Epic 1 (requires RBAC, dashboard framework, village configuration for currency)

---

### Story 2.2: Finance Module - Expense Transaction Recording

As a **Finance Manager**, I want to record expense transactions with category tracking, so that I can monitor spending and identify cost optimization opportunities.

**Acceptance Criteria:**

1. "Record Expense" button on Finance dashboard opens form with fields: date, amount (ZMW), category, subcategory, payment method, payment status, vendor/supplier, description, receipt/invoice number
2. Form validation prevents negative amounts
3. Successful save creates expense transaction
4. Expense list page with filters by date range, category, status
5. Finance dashboard shows expense summary (total expenses, top categories)
6. Edit and delete with audit logging
7. Category and subcategory management: Admin can add custom categories (cannot delete system defaults)

**Prerequisites:** Story 2.1

---

### Story 2.3: Finance Module - Admin-Configurable Categories

As a **System Administrator**, I want to configure finance categories and subcategories, so that the system adapts to our village's specific financial structure.

**Acceptance Criteria:**

1. Admin menu includes "Finance Settings" option
2. Finance Settings page shows two sections: Income Categories, Expense Categories
3. Each section displays current categories with subcategories in expandable list
4. "Add Category" and "Add Subcategory" buttons with forms
5. System default categories marked with lock icon (cannot be deleted)
6. Custom categories can be edited or deleted (with confirmation if transactions exist)
7. Attempting to delete category with transactions shows warning
8. Changes reflect immediately in income/expense recording forms
9. Seeded default categories include Income (Farm Sales, Guest Payments, Donations, Grants, Loan Repayments) and Expense (Farm Inputs, School Supplies, Equipment, Utilities, Salaries, Maintenance)

**Prerequisites:** Story 2.2

---

### Story 2.4: Finance Module - Funding Source Tracking for Donor Accountability

As a **Finance Manager**, I want to track which funding source each transaction comes from, so that I can generate donor-specific reports showing how their funds were used.

**Acceptance Criteria:**

1. Funding Sources collection created in Appwrite with fields: name, type, donor_name, amount_allocated, date_received, restrictions
2. Admin can add/edit funding sources via Finance Settings
3. Income transaction form includes "Funding Source" dropdown
4. Expense transaction form includes "Funded By" dropdown linking to funding sources
5. Funding source detail page shows: total allocated, total spent, remaining balance, list of all transactions
6. Finance dashboard widget: "Funding Sources Overview" showing all sources with balance bars
7. Validation prevents spending more than allocated amount (shows warning, allows override with Admin approval)
8. Donor report generation: Select funding source → Export PDF with all income/expenses

**Prerequisites:** Story 2.2

---

### Story 2.5: Village Lending - Loan Management

As a **Finance Manager**, I want to manage village loans to residents, so that we can support community members while tracking repayments and maintaining financial sustainability.

**Acceptance Criteria:**

1. Finance navigation includes "Village Lending" submenu
2. Loans list page shows all loans (borrower, amount, status, balance)
3. "Create Loan" button opens form with fields: borrower, loan amount, interest rate, loan term, repayment frequency, collateral description, purpose, disbursement date
4. System auto-calculates: total repayment amount, repayment schedule with due dates, payment amount per period
5. Loan detail page shows: loan information, repayment schedule with status, payment history, outstanding balance
6. "Record Payment" button creates repayment transaction and updates loan balance
7. Overdue loans flagged in red with "Days Overdue" indicator
8. Finance dashboard widget: "Active Loans" showing total outstanding, overdue count
9. Loan status: Active, Fully Repaid, Defaulted

**Prerequisites:** Story 2.1, Epic 1 Story 1.7

---

### Story 2.6: Inventory Module - Core Inventory Management

As a **village administrator**, I want to track inventory across all modules, so that I can monitor stock levels and prevent shortages.

**Acceptance Criteria:**

1. Inventory collection created in Appwrite with fields: item_name, item_type, quantity, unit, unit_cost, estimated_value, status, source, source_reference_id, reorder_threshold, date_added
2. Inventory navigation item visible to Finance Manager, Farm Manager, Admin
3. Inventory list page shows all items with filters by type, status
4. "Add Inventory Item" button opens form with all fields
5. Inventory detail page shows: item information, current stock level with visual indicator, transaction history, estimated total value
6. Manual inventory adjustment: "Adjust Stock" button with reason
7. Low stock alerts: Items below reorder threshold flagged with warning icon
8. Inventory dashboard widget: "Stock Levels" showing items by status with counts
9. Role-based visibility: Finance Manager sees all, Farm Manager sees farm-related only

**Prerequisites:** Story 2.2

---

### Story 2.7: Inventory Module - Automatic Inventory from Finance Purchases

As a **Finance Manager**, I want inventory items automatically created when I record farm input purchases, so that I don't have to enter the same information twice.

**Acceptance Criteria:**

1. When recording expense with category "Farm Inputs", form includes checkbox: "Add to Inventory"
2. If checked, additional fields appear: item name, quantity, unit, reorder threshold
3. Successful expense save automatically creates inventory item with: item type (Farm Inputs), unit cost (expense amount ÷ quantity), status (In Stock), source (Finance Purchase), source reference ID (expense transaction ID)
4. Inventory item links back to expense transaction for audit trail
5. Finance Manager can view linked inventory item from expense detail page
6. Inventory item can view linked expense from inventory detail page
7. Works for other inventory types: School Supplies, Medical Supplies, Kitchen Supplies

**Prerequisites:** Story 2.6, Story 2.2

---

### Story 2.8: Financial Reports - Basic Reports Suite

As a **Finance Manager**, I want to generate standard financial reports, so that I can analyze village finances and report to stakeholders.

**Acceptance Criteria:**

1. Finance navigation includes "Reports" submenu
2. Reports page lists available reports: Income Summary, Expense Summary, Profit & Loss Statement, Cash Flow Report, Balance Sheet, Donor Fund Usage
3. Each report includes: date range selector, filter options, "Generate Report" button
4. Generated reports display in-browser with: summary statistics at top, detailed table of transactions, charts visualizing key metrics (Chart.js)
5. Export options: PDF, Excel (CSV), Print
6. Reports load within 3 seconds for 1 year of data
7. Role-based access: Finance Manager sees all, module managers see their module only
8. Village Head has read-only access to all reports

**Prerequisites:** Story 2.1, Story 2.2, Story 2.4

---

### Story 2.9: Finance Dashboard - Comprehensive Financial Overview

As a **Finance Manager**, I want a comprehensive financial dashboard, so that I can quickly assess village financial health and identify issues.

**Acceptance Criteria:**

1. Finance dashboard displays widgets: Financial Summary, Recent Transactions, Funding Sources, Active Loans, Low Stock Alerts, Top Expense Categories, Income vs Expenses Trend
2. All widgets update in real-time when transactions are added/edited
3. Click widget title navigates to detailed view
4. Dashboard loads within 2 seconds
5. Mobile-responsive layout stacks widgets vertically
6. Village Head sees read-only version of dashboard
7. Export dashboard summary to PDF for meetings

**Prerequisites:** Story 2.1-2.8

---

**Epic 2 Summary:** 9 stories, 18-27 hours estimated effort. Deliverables: Complete financial management system, donor accountability with funding source tracking, village lending program, inventory management with automatic creation from purchases, comprehensive financial reports suite, financial dashboard.

---

## Epic 3: Farm Management and Agricultural Tracking (11 stories)

**Expanded Goal:** Enable systematic farm management from seed purchase through harvest to sale, with profitability analysis (including labor costs) and yield tracking. Transform memory-based farming into data-driven agricultural operations.

**Value Delivered:** Farm Manager can track complete crop lifecycles, calculate profit per plot and per crop type (including seed and labor costs), analyze yield trends, and make evidence-based planting decisions.

---

### Story 3.1: Farm Module - Plot Management

As a **Farm Manager**, I want to create and manage farm plots, so that I can organize agricultural operations and assign responsibilities.

**Acceptance Criteria:**

1. Farm navigation item appears for users with Farm Manager or Admin roles
2. Farm dashboard shows overview: total plots, active plots, fallow plots
3. Plots list page displays all plots (name, size, status, assigned Crop Manager)
4. "Add Plot" button opens form with fields: plot name, size in hectares, location description, soil type, status, assigned Crop Manager
5. Plot detail page shows: basic information, current planting, planting history, profitability summary
6. Edit and delete functionality (validation: cannot delete plot with active plantings)
7. Plot status: Active, Fallow, Retired
8. Farm dashboard widget: "Plots Overview" showing plots by status with pie chart
9. Only one Crop Manager can be assigned per plot at a time

**Prerequisites:** Epic 1 Story 1.7, Epic 1 Story 1.4

---

### Story 3.2: Farm Module - Crops Database and Management

As a **System Administrator**, I want to manage the crops database, so that Farm Managers can select from appropriate crops for our region.

**Acceptance Criteria:**

1. Crops collection created in Appwrite with fields: crop_name, crop_type (Annual/Perennial), maturity_days, harvest_frequency, typical_yield_per_hectare, growing_season, category, is_active
2. System seeded with 27 Zambian crops: Grains (Maize, Sorghum, Millet, Rice), Legumes (Groundnuts, Soybeans, Cowpeas, Beans), Vegetables (Tomatoes, Cabbage, Rape, Onions, Pumpkin), Root Crops (Cassava, Sweet Potato, Irish Potato), Fruits (Banana, Mango, Papaya, Guava, Orange), Perennials (Moringa, Mulberry), Other (Sunflower, Sugarcane)
3. Admin can access "Crop Database" from Farm Settings
4. Crop management page shows all crops with filters by type, category, season
5. "Add Crop" button opens form with all fields
6. Edit functionality for existing crops
7. Cannot delete crops with existing planting records (show warning)
8. Can deactivate crops (is_active = false) to hide from planting forms
9. Crop detail page shows usage statistics

**Prerequisites:** Story 3.1

---

### Story 3.3: Farm Module - Planting Records with Seed Inventory and Labor Tracking

As a **Farm Manager**, I want to record plantings with automatic seed inventory deduction and labor cost tracking, so that I can track what's planted, maintain accurate seed stock levels, and calculate true profitability.

**Acceptance Criteria:**

1. "Record New Planting" button on plot detail page opens form with fields: crop, planting date, expected harvest date (auto-calculated, overridable), seeds used (quantity, unit, cost), seed source (From Inventory/Purchased Separately/Donated), number of farmhands, labor cost for planting, labor notes
2. If seed source is "From Inventory": system validates sufficient quantity, automatically decrements inventory, links planting to inventory item
3. If seed source is "Purchased Separately" or "Donated": records seed cost for profitability calculation
4. System auto-calculates expected harvest date: planting_date + crop.maturity_days
5. Planting status automatically set to "Planted", plot status changes to "Active"
6. Calendar automatically creates event: "[Crop] - Expected Harvest" on expected harvest date
7. Validation: Cannot plant on plot with existing active planting

**Prerequisites:** Story 3.2, Epic 2 Story 2.6

---

### Story 3.4: Farm Module - Planting Status Tracking and Lifecycle Management

As a **Farm Manager**, I want to track planting status throughout the growing cycle, so that I can monitor crop progress and identify issues early.

**Acceptance Criteria:**

1. Planting status field with values: Planted, Growing, Harvesting, Completed, Failed
2. Planting detail page shows: current status with visual indicator, days since planting, days until expected harvest, progress bar, status change history
3. "Update Status" button allows manual status changes with workflow: Planted → Growing → Harvesting → Completed, or any status → Failed
4. If status changed to "Failed": form requires failure reason (Drought, Pests, Disease, Flooding, Poor Soil, Other) and optional notes, plot status changes to "Fallow"
5. Farm dashboard widget: "Planting Status" showing counts by status
6. Alerts on Farm dashboard: "Ready for Harvest", "Overdue Harvest" (>7 days past expected)
7. Planting list page with filters by status, crop, plot, date range
8. Only Farm Manager can update status for any plot; Crop Manager can update only assigned plots

**Prerequisites:** Story 3.3

---

### Story 3.5: Farm Module - Harvest Recording (Single Day and Multi-Day Aggregate)

As a **Farm Manager**, I want to record harvests with support for single-day and multi-day aggregate harvesting with labor tracking, so that I can accurately track yield and costs.

**Acceptance Criteria:**

1. "Record Harvest" button on planting detail page opens form with harvest type: Single Day, Multi-Day Aggregate, Continuous Picking (Continuous Picking in Story 3.6)
2. Single Day Harvest: harvest date, quantity harvested (kg), number of farmhands, labor cost for harvesting, notes
3. Multi-Day Aggregate Harvest: harvest start/end date, daily harvest details table (date, quantity, farmhands, labor cost per day), total quantity auto-calculated
4. Harvest record stores: linked planting_id, harvest type, total quantity (kg), harvest date(s), status, daily breakdown, harvest_labor_farmhands, harvest_labor_cost
5. Planting status automatically changes to "Completed"
6. Validation: Cannot record harvest if planting status is "Failed"
7. Farm Manager can record harvest for any plot; Crop Manager only for assigned plots

**Prerequisites:** Story 3.4

---

### Story 3.6: Farm Module - Continuous Picking Harvests for Perennial Crops

As a **Farm Manager**, I want to record multiple harvests from the same planting for perennial crops with labor tracking per harvest, so that I can track ongoing production.

**Acceptance Criteria:**

1. When recording harvest, if crop type is "Perennial", "Continuous Picking" option enabled
2. Continuous Picking Harvest: each harvest recorded as separate event with harvest date, quantity (kg), number of farmhands, labor cost, notes, "Add Another Harvest" button
3. Planting detail page shows: list of all harvests with dates and quantities, cumulative yield, average yield per harvest, harvest frequency, cumulative labor cost
4. Planting status remains "Harvesting" after each continuous picking harvest
5. "Mark Planting Complete" button to finalize when crop is no longer producing
6. Harvest list page shows all harvests across all plantings with filters
7. Farm dashboard shows "Active Perennial Crops" count
8. Validation: Continuous picking only available for perennial crops

**Prerequisites:** Story 3.5

---

### Story 3.7: Farm Module - Automatic Inventory Creation on Harvest Completion

As a **Farm Manager**, I want harvested produce automatically added to inventory, so that I can track available stock for sale without duplicate data entry.

**Acceptance Criteria:**

1. When harvest status changes to "Completed": system automatically creates inventory item with item name "[Crop Name] - Harvest [Date]", item type (Farm Produce), quantity (total harvest quantity in kg), unit (kg), estimated value (quantity × historical average price or manual override), status (Available for Sale), source (Farm Harvest), source reference ID (harvest_id)
2. Historical average price calculation: query last 5 sales of same crop, calculate average price per kg, if no historical data: prompt Farm Manager for estimated price
3. Harvest detail page shows link to created inventory item
4. For continuous picking harvests: each harvest creates separate inventory item or option to aggregate
5. Notification to Farm Manager: "Harvest completed. [X] kg [Crop] added to inventory."
6. Farm dashboard updates: inventory levels widget refreshes

**Prerequisites:** Story 3.6, Epic 2 Story 2.6

---

### Story 3.8: Farm Module - Sales Recording with Finance and Inventory Integration

As a **Farm Manager**, I want to record farm sales with automatic inventory deduction and finance income creation, so that all systems stay synchronized.

**Acceptance Criteria:**

1. "Record Sale" button on inventory item detail page (for Farm Produce items)
2. Sales form includes fields: buyer, quantity sold, price per kg, total amount (auto-calculated), payment method, payment status, sale date, notes
3. Successful sale triggers three automatic actions: Inventory decrements quantity, Finance creates income transaction (amount, source module: Farm Sales, category, reference ID), Sales Record creates farm_sales record linking harvest, inventory, and finance transaction
4. Sale detail page shows: sale information, links to inventory item, finance income transaction, original harvest, profit calculation (sale revenue - seed costs - labor costs)
5. Partial sales supported: multiple sale records per harvest
6. Farm dashboard widget: "Recent Sales" showing last 5 sales
7. Validation: Cannot sell more than available inventory quantity

**Prerequisites:** Story 3.7, Epic 2 Story 2.1

---

### Story 3.9: Farm Module - Profitability Analysis and ROI Calculation

As a **Farm Manager**, I want to see profit calculations per plot and per crop type including all costs, so that I can identify which crops are most profitable.

**Acceptance Criteria:**

1. Profit calculation formula: Total Sales Revenue - (Seed Costs + Planting Labor Costs + Harvest Labor Costs)
2. Plot detail page "Profitability Summary": total revenue, cost breakdown (seed costs, planting labor, harvest labor, total costs), net profit, ROI percentage
3. Crop performance report: group all plantings by crop type, show total plantings, total harvests, total revenue, total seed costs, total planting labor costs, total harvest labor costs, total costs, average profit per planting, average yield per hectare, success rate
4. Farm dashboard widget: "Top Performing Crops" bar chart showing top 5 crops by total profit
5. Farm dashboard widget: "Plot Profitability" table showing all plots with profit/loss, color-coded
6. Profitability filters: date range, specific crop, specific plot
7. Export profitability reports to PDF

**Prerequisites:** Story 3.8

---

### Story 3.10: Farm Module - Yield Analysis and Trend Reporting

As a **Farm Manager**, I want to analyze yield per hectare and track trends over time, so that I can optimize planting strategies.

**Acceptance Criteria:**

1. Yield calculation: Total Harvest Quantity (kg) ÷ Plot Size (hectares)
2. Plot detail page "Yield Analysis": yield per hectare for each completed planting, average yield per hectare, yield trend chart, comparison to typical yield
3. Crop performance report includes yield metrics: average yield per hectare across all plots, best/worst performing plot, yield consistency
4. Farm dashboard widget: "Yield Trends" line chart showing average yield per hectare over last 6 plantings
5. Season comparison report: compare yield between wet/dry seasons, show which crops perform better in which season
6. Yield alerts: flag plantings with yield <50% of typical yield as "Underperforming"
7. Internal benchmarking: plot-to-plot comparison for same crop
8. Export yield reports to PDF/Excel

**Prerequisites:** Story 3.9

---

### Story 3.11: Farm Module - Configurable Alerts and Farm Dashboard Completion

As a **Farm Manager**, I want configurable alerts for farm operations, so that I'm notified of important events and can take timely action.

**Acceptance Criteria:**

1. Farm Settings page includes "Alerts Configuration" section
2. Configurable alert types: Low Inventory (trigger when farm input inventory falls below threshold), Upcoming Harvests (notify X days before expected harvest date), Overdue Harvests (notify when harvest is X days overdue), Crop Failures (immediate notification), Underperforming Plots (notify when yield <50% of typical)
3. Alert delivery methods: dashboard notification badge, in-app notification panel, email notifications (optional)
4. Alerts list page shows: all alerts with timestamp, alert type and severity, action button, mark as read/unread, filter by type/severity/date range
5. Farm dashboard shows "Active Alerts" widget: count of unread alerts by severity, list of top 5 most critical alerts
6. Calendar integration: upcoming harvest alerts create calendar events
7. Farm Manager can configure alert thresholds
8. Crop Managers receive alerts only for assigned plots
9. Farm dashboard completion: all widgets functional, loads within 2 seconds, mobile-responsive

**Prerequisites:** Story 3.10

---

**Epic 3 Summary:** 11 stories, 22-33 hours estimated effort. Deliverables: Complete farm management system with plots, crops, plantings, harvests, sales, automatic integration with Inventory and Finance modules, profitability analysis including labor costs, yield analysis and trend reporting, configurable alerts, comprehensive farm dashboard.

---

## Epic 4: School Management and Educational Accountability (10 stories)

**Expanded Goal:** Enable systematic tracking of learner performance and teacher effectiveness to support early intervention for struggling learners and meaningful teacher accountability.

**Value Delivered:** Head Teacher can identify struggling learners early, implement and track interventions, conduct meaningful teacher evaluations (peer reviews with consequences), and demonstrate measurable educational outcomes to donors.

---

### Story 4.1: School Module - Learner Enrollment from Residents

As a **Head Teacher**, I want to enroll learners by selecting from residents table, so that learner data is pre-populated and consistent.

**Acceptance Criteria:** 1. School navigation appears for Head Teacher, Teacher, Admin roles 2. "Enroll Learner" button: select resident (dropdown), auto-populated fields (name, DOB, gender, household - read-only), additional fields (grade level, enrollment date, parent/guardian, medical notes, emergency contact) 3. Validation: Resident can only be enrolled once 4. Learner detail page shows: personal info, grade, enrollment status, academic performance, test scores, attendance, interventions 5. Grade promotion, enrollment status changes, search/filter learners

**Prerequisites:** Epic 1 Story 1.6, 1.7

---

### Story 4.2: School Module - Test Score Recording (Bulk Entry by Grade)

As a **Teacher**, I want to record test scores for entire grade in spreadsheet format, so that I can efficiently track learner academic performance.

**Acceptance Criteria:** 1. "Record Scores for Class" button 2. Select grade, subject, assessment type, test date 3. Spreadsheet-style table: columns (Learner Name, Score - editable, Notes), Tab navigation, visual validation 4. "Save All Scores" button 5. Learner detail shows test scores (view only), filters, averages, performance trend chart 6. Class performance view with averages, distribution chart

**Prerequisites:** Story 4.1

---

### Story 4.3: School Module - Attendance Tracking (Bulk Entry by Grade)

As a **Teacher**, I want to record daily attendance for my class in spreadsheet format.

**Acceptance Criteria:** 1. "Record Attendance" page 2. Select date, grade 3. Spreadsheet table: columns (Learner Name, Status dropdown, Reason), "Mark All Present" button 4. Attendance history: calendar view, color-coded, statistics 5. Class attendance report, dashboard widget

**Prerequisites:** Story 4.1

---

### Story 4.4: School Module - At-Risk Learner Identification (90% Attendance Threshold)

As a **Head Teacher**, I want to automatically identify struggling learners.

**Acceptance Criteria:** 1. At-risk criteria: Academic (<50% any subject, <60% overall), Attendance (<90%) 2. Attendance intervention trigger: does NOT trigger until after first 5 school days, system tracks school year start date, alerts suppressed for first 5 days 3. "At-Risk Learners" dashboard widget and dedicated page 4. Automatic alerts to Head Teacher 5. At-risk status updates automatically

**Prerequisites:** Story 4.2, 4.3

---

### Story 4.5: School Module - Intervention Planning and Progress Tracking

As a **Head Teacher**, I want to create and track intervention plans for struggling learners.

**Acceptance Criteria:** 1. "Create Intervention Plan" button: learner, intervention type, assigned teacher, focus areas, frequency, schedule, success criteria 2. Intervention detail page: progress notes, status, outcome 3. Teacher dashboard: "My Interventions" widget 4. Intervention effectiveness tracking

**Prerequisites:** Story 4.4

---

### Story 4.6: School Module - Peer Review with Enhanced Categories and Checked Status

As a **Teacher**, I want to conduct peer evaluations with comprehensive rating categories.

**Acceptance Criteria:** 1. Peer Review form: 10 rating categories (1-5 scale): Teaching Effectiveness, Classroom Management, Collaboration, Innovation, Professionalism, Gender-Equitable Teaching, Student-Centered Teaching, Movement Around Classroom, Checking for Understanding, Monitoring Student Work 2. Overall rating (auto-calculated average of 10 categories) 3. Peer review process: Teacher submits (status: Submitted), Head Teacher dashboard shows "New Peer Reviews" widget, Head Teacher marks as "Checked", status flow: Draft → Submitted → Checked 4. Teacher can view peer review after Head Teacher marks as "Checked"

**Prerequisites:** Epic 1 Story 1.7

---

### Story 4.7: School Module - Self-Evaluation and Head Teacher Evaluation

As a **Teacher**, I want to complete self-evaluations. As a **Head Teacher**, I want to conduct formal evaluations of teachers.

**Acceptance Criteria:** 1. Self-Evaluation: same 10 rating categories, goals, challenges, support needed 2. Head Teacher Evaluation: same categories + Impact on Learner Outcomes, recommendation (Exceeds Expectations/Meets Expectations/Needs Improvement/Unsatisfactory) 3. Teacher profile shows combined evaluation summary: weighted (Peer 30%, Self 20%, Head Teacher 50%) 4. School dashboard widget: "Teacher Performance Overview"

**Prerequisites:** Story 4.6

---

### Story 4.8: School Module - Collaborative Teaching Practices Documentation

As a **Teacher**, I want to document collaborative teaching practices.

**Acceptance Criteria:** 1. Teaching practice entry form: title, subject, grade, practice type, description, materials, implementation steps, outcomes, effectiveness rating 2. Teaching practices library: list view, filters, search 3. Practice detail page: comments, "I've tried this" button, adoption tracking 4. Export to PDF

**Prerequisites:** Story 4.6

---

### Story 4.9: School Module - Progress Toward Long-Term Educational Goal (90% in 90th Percentile)

As a **Head Teacher**, I want to track progress toward the goal of 90% of learners in 90th percentile by year 10.

**Acceptance Criteria:** 1. School Settings: Long-Term Goal Configuration 2. Goal tracking calculations: current %, progress, years remaining, required improvement rate, projected outcome 3. "Educational Goals" dashboard page: goal progress chart, key metrics, breakdown by grade/subject 4. Quarterly goal review report 5. School dashboard widget: "Progress to Goal"

**Prerequisites:** Story 4.2

---

### Story 4.10: School Module - Learner Progress Reports and School Dashboard Completion

As a **Head Teacher**, I want to generate comprehensive learner progress reports.

**Acceptance Criteria:** 1. "Generate Progress Report" button: select term, report type, include sections 2. Generated report: header, academic performance, attendance, interventions, teacher comments, next steps 3. Export to PDF, bulk report generation 4. School dashboard completion: all widgets functional, loads within 2 seconds, mobile-responsive

**Prerequisites:** Story 4.2, 4.3, 4.5, 4.9

---

**Epic 4 Summary:** 10 stories, 20-30 hours. Deliverables: School management (learners from residents, bulk test scores/attendance), at-risk identification (90% attendance, 5-day delay), interventions, teacher evaluations (10 categories, checked status), teaching practices, progress tracking, learner reports.

---

## Epic 5: Village Calendar, Storage, and Optional Modules (10 stories)

**Expanded Goal:** Complete the integrated village management platform with shared calendar, cloud storage, and optional modules.

**Value Delivered:** Village has complete operational visibility with shared calendar, document management, and optional modules (Guests, Equipment, Vendors, Energy).

---

### Story 5.1: Village Calendar - Global Calendar with Category Filtering

As a **village user**, I want to see all village events in a single calendar with filtering.

**Acceptance Criteria:** 1. Calendar views: month, week, day, agenda 2. Events color-coded by category: School, Farm, Village, Guests, Equipment, Energy, Other 3. Filter UI with checkboxes, "Show All" / "Hide All" toggles 4. Event detail popup 5. Automatic event creation: Farm (expected harvests), Equipment (maintenance reminders) 6. Calendar dashboard widget: "Upcoming Events"

**Prerequisites:** Epic 1

---

### Story 5.2: Village Calendar - Role-Based Event Creation and Editing

As a **module manager**, I want to create and edit calendar events for my area.

**Acceptance Criteria:** 1. "Create Event" button 2. Event form: title, category, date, time, recurring, location, description, notify users 3. Role-based permissions: Farm Manager (Farm), Head Teacher (School), Village Head (Village), Events Coordinator (ALL), Admin (all) 4. Event editing/deletion with confirmation 5. Automatic events marked as "System Generated"

**Prerequisites:** Story 5.1

---

### Story 5.3: Cloud Storage - Role-Based Storage Quotas and Personal Folders

As a **village user**, I want personal cloud storage with a quota based on my role.

**Acceptance Criteria:** 1. Storage quotas: Admin (Unlimited), Village Head (20 GB), Deputy (10 GB), Finance/Farm/Head Teacher (5-10 GB), Crop Manager/Resident (2 GB), Learner (1 GB), Guest (500 MB) 2. Storage page: usage display, progress bar, warning if >90% 3. Personal folder: private, upload files, file operations (download, delete, rename, move), search 4. File upload: drag-and-drop, multiple files, progress indicator, quota validation

**Prerequisites:** Epic 1 Story 1.10

---

### Story 5.4: Cloud Storage - Shared Folders and Module-Based Access

As a **module manager**, I want shared storage folders for my team.

**Acceptance Criteria:** 1. Shared folders: Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only 2. Shared folder permissions: read-only, read-write, role-based access 3. File sharing workflow: "Share to Folder" from personal folder 4. Storage settings (Admin): view all users' usage, adjust quotas, storage reports

**Prerequisites:** Story 5.3

---

### Story 5.5: Guests Management Module (Optional - No 90-Day Alert/Conversion)

As a **Village Head**, I want to track guests staying in the village.

**Acceptance Criteria:** 1. Guests module enabled via module settings 2. Guests list, "Add Guest" form: name, guest type, arrival/departure dates, housing, payment details, training details 3. Guest detail page: basic info, housing, payment history, training progress, duration, status 4. Guest payments integration with Finance 5. Calendar integration: arrival/departure events

**Prerequisites:** Epic 1 Story 1.6, Epic 2 Story 2.1

---

### Story 5.6: Equipment Management Module (Optional)

As a **Village Head**, I want to track village-wide equipment and assets.

**Acceptance Criteria:** 1. Equipment module enabled via settings 2. Equipment list, "Add Equipment" form: name, type, serial number, procurement details, location, assigned to, condition, maintenance schedule 3. Equipment detail page: maintenance history, "Record Maintenance" button 4. Maintenance reminders: alerts 7 days before, calendar events 5. Equipment dashboard widget 6. Finance integration: procurement and maintenance costs

**Prerequisites:** Epic 2 Story 2.2

---

### Story 5.7: Vendors/Suppliers Management Module (Optional)

As a **Finance Manager**, I want to track vendors and suppliers.

**Acceptance Criteria:** 1. Vendors module enabled via settings 2. Vendors list, "Add Vendor" form: name, vendor type (Supplier/Buyer/Both), business type, contact info, payment terms, quality rating 3. Vendor detail page: transaction history, performance metrics 4. Vendor selection integration: Farm sales buyer dropdown, Finance expenses vendor dropdown 5. Vendor transaction history automatically updated 6. Vendors dashboard widget

**Prerequisites:** Epic 2 Story 2.2, Epic 3 Story 3.8

---

### Story 5.8: Energy Management Module (Optional) - Solar Microgrid Monitoring

As a **Village Head**, I want to monitor solar microgrid production and consumption.

**Acceptance Criteria:** 1. Energy module enabled via settings 2. Energy dashboard: real-time metrics (production, consumption, battery status, net balance), visual indicators 3. 30-day rolling historical data: line chart, daily balance, peak times 4. Energy data collection: IoT integration or manual entry 5. Energy alerts: low battery, high consumption, system offline 6. Energy reports: daily/monthly summaries, export to PDF/Excel 7. Calendar integration: maintenance events

**Prerequisites:** Epic 1

---

### Story 5.9: Module Management and Configuration

As a **System Administrator**, I want to enable/disable optional modules.

**Acceptance Criteria:** 1. Admin menu: "Module Management" 2. Module Management page: Core Modules (always enabled), Optional Modules (can be enabled/disabled) 3. For each module: name, description, status, toggle switch, "Configure" button 4. Enabling module: navigation appears, widgets visible 5. Disabling module: confirmation, navigation hidden, data preserved 6. Module dependencies: warning if disabling module that others depend on 7. First-time setup wizard updated: "Select Modules" step

**Prerequisites:** All previous stories

---

### Story 5.10: System Completion - Final Dashboard Integration and Production Setup

As a **village user**, I want a polished, cohesive system with all modules integrated.

**Acceptance Criteria:** 1. Main dashboard completion: role-based widgets, all functional, loads within 2 seconds 2. Navigation polish: clean menu, active page highlighted, breadcrumbs, quick search 3. Notifications system: bell icon, count badge, notification panel, filter by type, mark as read 4. UX polish: consistent UI, loading states, error handling, success confirmations, accessibility 5. Performance optimization: <3 seconds on 3G, lazy loading, caching 6. Mobile responsiveness: all pages functional on mobile (320px+), touch-friendly (44px minimum) 7. Help and documentation: help icon, contextual tooltips, user guide, FAQ 8. System health monitoring (Admin): database size, storage usage, active users, error logs 9. Final testing checklist: all user journeys tested, RBAC enforced, data integrity validated, all integrations working, sample data mode functional 10. Production setup wizard: "Start Fresh with Real Data" option, guides through village config, first household, admin user, Village Head user, module selection, initial data entry, sets is_using_sample_data = false

**Prerequisites:** All previous stories in all epics

---

**Epic 5 Summary:** 10 stories, 20-30 hours. Deliverables: Village calendar, cloud storage with shared folders, Guests Management (no 90-day alert/conversion), Equipment Management, Vendors Management, Energy Management, module management system, polished production-ready system, production setup wizard.

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**
As a [user type], I want [goal/desire], so that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
