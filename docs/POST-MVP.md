# Post-MVP Improvements & Upgrades

This document tracks deferred improvements, upgrades, and refactoring items that are not required for MVP but should be considered for future development.

---

## Charting

### Migrate from direct Chart.js to vue-chartjs

- **Current state**: Charts use Chart.js directly with canvas refs and manual lifecycle management (`onMounted`/`onUnmounted` for create/destroy)
- **Improvement**: Migrate to [vue-chartjs](https://vue-chartjs.org/) for cleaner Vue 3 integration, reactive props, and automatic cleanup
- **Benefits**: Less boilerplate, reactive chart updates, built-in SSR handling, better DX
- **Effort**: Low-Medium
- **Added**: Story 2.8

---

## Reporting

### Refactor DonorReportService to use shared ReportExportService

- **Current state**: `DonorReportService.js` has its own PDF generation logic independent of the shared `ReportExportService.js`
- **Improvement**: Refactor to use shared PDF utilities from `ReportExportService` for consistency
- **Benefits**: Single source of truth for PDF formatting, consistent headers/footers/styling across all reports
- **Risk**: Must not break existing Funding Source detail page PDF generation
- **Effort**: Low
- **Added**: Story 2.8

---

## Seeding

### Server-Side Data Seeding via Cloud Function

- **Current state**: Sample data generation (including 1.5 years of financial history) runs client-side, making numerous API calls which can be slow and subject to network interruptions.
- **Improvement**: Move the entire sample data generation logic into an Appwrite Cloud Function written in Node.js. The "Load Sample Data" button would just trigger this function execution.
- **Benefits**: Significantly faster execution (runs directly on server), no client-side rate limits, resilient to network drops, cleaner client codebase.
- **Effort**: Medium
- **Added**: Story 2.8

---

## Farm Module

### Per-Worker Labor Cost Tracking

- **Current state**: Planting and harvest labor costs are tracked as aggregate totals (`planting_labor_farmhands` count + `planting_labor_cost` total)
- **Improvement**: Track individual worker contributions with resident linkage for detailed labor accountability and potential payroll integration
- **Schema change**: Replace aggregate fields with `labor_entries[]` array containing `{worker_id, hours_worked, hourly_rate, total_cost, task_description}`
- **Benefits**: Worker accountability, detailed cost breakdown, payroll system integration, labor efficiency analysis per worker
- **Effort**: Medium (requires schema migration and UI updates)
- **Added**: Story 3.3 (deferred from MVP requirements)

---

### FIFO Cost Basis for Harvest Inventory Sales

- **Current state**: Harvest entries flow produce into an aggregated inventory row per `(planting_id, crop_id)`. When a sale occurs, cost basis is derived using a weighted-average of all entries on that planting at report time.
- **Improvement**: Implement FIFO (First-In-First-Out) cost basis tracking so that sales consume the oldest harvest entry's cost first, producing more accurate per-sale margin reporting.
- **Schema change**: Likely requires a consumption ledger linking sales to entries, or batch-level inventory rows instead of aggregated rows.
- **Benefits**: Precise per-sale gross margin, better seasonal price analysis, accurate cost-of-goods-sold accounting.
- **Risk**: Increased model complexity; only worth it if reporting demands precision beyond weighted-average.
- **Effort**: Medium-High
- **Added**: Story 3.5 (Harvest Recording refactor)

---

## Architecture & Design (Story 3.5)

### Decouple Farm Store from Inventory Store

- **Current state**: `farm-store.js` directly calls `inventoryStore.createOrUpdateFarmProduceFromHarvest()`, `reverseFarmProduceFromHarvest()`, and `deleteFarmProduceForHarvest()`. This creates a hard dependency from farm → inventory.
- **Improvement**: Introduce an event bus or callback-based hook pattern where the farm store emits harvest events (`entryAdded`, `entryDeleted`, `harvestDeleted`, `harvestCompleted`) and the inventory store subscribes to them. This decouples the two modules.
- **Benefits**: Farm module can be tested without inventory, inventory schema changes don't break farm code, easier to swap inventory backends.
- **Effort**: Medium
- **Added**: Story 3.5 (code review)

### Batch Harvest+Entries Fetch

- **Current state**: `fetchHarvestById` fetches the harvest row, then fetches entries in a second sequential call. The planting detail page requires both.
- **Improvement**: Add a Cloud Function or backend aggregation endpoint that returns a harvest with all its entries in a single query. Alternatively, use Appwrite's nested document fetching if/when available.
- **Benefits**: Fewer round trips, faster page loads, reduced cascade failure risk.
- **Effort**: Low-Medium
- **Added**: Story 3.5 (code review)

### Server-Side Validation for One In-Progress Harvest Per Planting

- **Current state**: The check is client-side only (`this.harvests.find(...)`). Two concurrent users could both create an in-progress harvest for the same planting.
- **Improvement**: Add a unique composite constraint or Cloud Function pre-creation check that enforces at most one `In Progress` harvest per `planting_id` at the database level.
- **Benefits**: Eliminates race condition, data integrity guaranteed regardless of client state.
- **Effort**: Low
- **Added**: Story 3.5 (code review)

### Atomic Harvest Sequence Number Allocation (Continuous Picking)

- **Current state**: `getNextHarvestSequence` in `farm-store.js` reads max `harvest_sequence` then adds 1 client-side. Two concurrent "Record Next Harvest" requests for the same perennial planting could allocate the same sequence number, producing duplicates.
- **Improvement**: Allocate sequence numbers via a Cloud Function that performs read+increment atomically, or use a unique composite index on `(planting_id, harvest_sequence)` so duplicates fail at the DB layer and the client retries.
- **Benefits**: Guaranteed monotonic, unique sequence per planting regardless of concurrency.
- **Effort**: Low
- **Added**: Story 3.6 (code review)

### Wire Up `type=perennial` Filter in PlantingsListPage

- **Current state**: `ActivePerennialsWidget` was originally designed to navigate to `/farm/plantings?status=harvesting&type=perennial`, but `PlantingsListPage.vue` does not read `route.query` so the type filter is silently ignored. The widget link has been simplified to `?status=harvesting` only.
- **Improvement**: Read `route.query.type` on mount in `PlantingsListPage.vue` and add a "Crop Type" filter (Annual/Perennial) to the page UI. Restore the `type=perennial` query param in the widget link.
- **Benefits**: Users can quickly drill into perennial-only plantings from the dashboard.
- **Effort**: Low
- **Added**: Story 3.6 (code review)

### HarvestsListPage Perennial Filters & Sequence Display

- **Current state**: `HarvestsListPage.vue` does not surface continuous-picking metadata. Perennial harvests show no sequence number, no `repeat` icon, and there is no filter to isolate continuous-picking harvests.
- **Improvement**: Add columns/badges for `is_continuous_picking` and `harvest_sequence`, plus filter controls on the list page.
- **Benefits**: Faster auditing of perennial harvest cycles across all plantings.
- **Effort**: Low
- **Added**: Story 3.6 (deferred from MVP)

### Historical Price Query Optimization (Story 3.7)

- **Current state**: `fetchHistoricalPriceForCrop()` performs a 3-step query chain: crop → plantings → harvests → farm_sales (last 5). This requires 3 round trips to Appwrite due to no cross-table joins.
- **Improvement**: Add `crop_id` directly to the `farm_sales` table as a denormalized field, populated at sale creation time. This enables a single-query lookup: `Query.equal('crop_id', cropId)` + `Query.orderDesc('sale_date')` + `Query.limit(5)`.
- **Alternative**: Create a Cloud Function that performs the 3-step aggregation server-side and caches results.
- **Benefits**: Single query instead of 3, faster price lookup, simpler client code.
- **Migration**: Backfill existing `farm_sales` records with `crop_id` by joining through `harvests` → `plantings`.
- **Effort**: Low (schema change + backfill script)
- **Added**: Story 3.7 (Historical price lookup)

### Vendor Module Integration for Farm Sales (Story 3.8)

- **Current state**: `farm_sales.buyer_name` is a free-text field. `buyer_type` is hard-coded to `'external'` and `buyer_id` to empty string. No formal vendor/buyer tracking exists.
- **Improvement**: When the Vendor Module (Epic 5) is built, wire the sales form to a vendor picker that populates:
  - `buyer_type`: dynamic enum based on actual buyer (household/external/market/cooperative)
  - `buyer_id`: FK to `vendors` or `households` table
  - `buyer_name`: denormalized for display/reporting stability
- **Benefits**: Vendor-specific reporting, buyer history, household sales tracking, price-per-vendor analytics.
- **Migration**: Existing sales rows keep `buyer_type='external'` and `buyer_id=''`; new sales use the picker.
- **Effort**: Medium (depends on Vendor Module scope)
- **Added**: Story 3.8

### Atomic Three-Way Sale Integration via Cloud Function (Story 3.8)

- **Current state**: Sale recording performs three sequential client-side operations (inventory decrement → finance transaction create → farm_sales record create) with best-effort client-side rollback on failure. This is vulnerable to:
  - Race conditions (two users selling last units simultaneously)
  - Partial failures if the browser crashes mid-flow
  - Rollback failures leaving orphaned finance transactions
- **Improvement**: Move the full three-way flow to an Appwrite Cloud Function that wraps the operations in a try/catch and uses compensating writes on failure. The function validates inventory quantity server-side before any writes.
- **Benefits**: True atomicity, race-condition safety, simpler client code, server-side audit log.
- **Effort**: Medium
- **Added**: Story 3.8

### Per-Sale FIFO Cost Tracking for Accurate Profit (Story 3.8)

- **Current state**: Profit calculation attributes total planting + harvest costs to each sale (or divides evenly). For perennials with many harvest cycles sold over time, this is imprecise.
- **Improvement**: Track cost-of-goods-sold (COGS) per sale using FIFO accounting against harvest batches. Each sale "consumes" cost basis from the oldest unsold harvest kg.
- **Benefits**: Accurate per-sale profit; supports tax/accounting standards.
- **Effort**: High (new `harvest_cost_batches` table + allocation logic)
- **Added**: Story 3.8

### Auto-Seed "Farm Sales" Income Category (Story 3.8)

- **Current state**: Sale creation looks up an income category whose name contains "farm" and "sale". If missing, the finance transaction is created without a `category_id`, producing uncategorized income.
- **Improvement**: Seed a `Farm Sales` income category in `setup-appwrite.js` (or auto-create on first sale) marked as `is_system_default=true` so it cannot be deleted.
- **Effort**: Low
- **Added**: Story 3.8

---

## Farm Alerts (Story 3.10)

### Persistent Alert Storage

- **Current state**: Alerts are generated in-memory on each page load. Dismissed/read state is lost on refresh. No notification history.
- **Improvement**: Persist alerts to a `farm_alerts` Appwrite collection. Store `is_read` and `dismissed_at` per alert per user. Enable push/email notifications via Appwrite Functions.
- **Effort**: Medium
- **Added**: Story 3.10

### Alert Email Notifications

- **Current state**: `email_enabled` toggle exists in the alert config UI but has no implementation.
- **Improvement**: Wire `email_enabled` to an Appwrite Function that sends daily or triggered email digests of critical alerts.
- **Effort**: Medium
- **Added**: Story 3.10

### Alert-to-Calendar Event Integration

- **Current state**: Upcoming harvest alerts are displayed in the farm alerts widget/page but do not create calendar events.
- **Improvement**: When an upcoming harvest alert is generated, optionally create a corresponding event in the village calendar (Epic 5) with the expected harvest date.
- **Effort**: Low
- **Added**: Story 3.10

### Alert Deduplication and Snooze

- **Current state**: Alerts are regenerated on every page load with no deduplication. There is no way to snooze an alert without dismissing it entirely.
- **Improvement**: Add alert fingerprinting (hash of type + entity + date range) to prevent duplicate alerts within a time window. Add a "Snooze for 24h" action that temporarily suppresses an alert.
- **Effort**: Low
- **Added**: Story 3.10

### Yield Trend Chart on PlotDetailPage

- **Current state**: `PlotDetailPage` shows a tabular yield history but no chart.
- **Improvement**: Add a `YieldTrendsWidget` mini-chart (or reuse the component) embedded in the plot detail yield card to visualize per-season trend inline.
- **Effort**: Low
- **Added**: Story 3.10

---
