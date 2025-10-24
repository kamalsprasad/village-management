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
