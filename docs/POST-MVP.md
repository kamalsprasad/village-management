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

---
