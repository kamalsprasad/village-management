# Story 3.5: Farm Module - Harvest Recording (Entry-Based Unified Model)

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.5  
**Status:** Completed  
**Date:** 2026-04-21  
**Last Updated:** 2026-04-24  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to record harvests incrementally day by day with labor and cost tracking per entry, so that I can accurately track yield, costs, and harvest progress in real-time.

---

## Summary

This story delivers the core harvest recording functionality for the Farm module using a **unified entry-based model**. Every harvest is composed of one or more `harvest_entries`. There is no stored "type" distinction — a single-entry harvest is effectively a one-day harvest, and a multi-entry harvest spans multiple days.

> **⚠️ Course-Corrected from Original Spec**
>
> During implementation the original two-type design (Single Day / Multi-Day Aggregate) was replaced with a single unified entry-based model. Key architectural changes are documented throughout this story.

**Architectural Decisions (as implemented):**

- **Unified Entry-Based Model**: All harvests use `harvest_entries`. "Single Day" vs. "Multi-Day" is implied by entry count — not stored as a `harvest_type` field.
- **One In-Progress Harvest Per Planting**: At most one `In Progress` harvest allowed per planting at a time.
- **Harvest Inline on Planting Detail**: No separate `HarvestDetailPage.vue`. The harvest, its entries, totals, and actions are all displayed inline in `PlantingDetailPage.vue`.
- **Immediate Inventory Integration**: Each entry immediately upserts the aggregated `farm_produce` inventory row. Marking complete has **no** additional inventory side-effect (inventory was already kept current per entry). This effectively subsumes Story 3.7.
- **Entry Deletion with Inventory Reversal**: Individual entries may be deleted (when > 1 entry exists) if inventory has not been consumed by sales. Harvest totals and inventory are reversed atomically.
- **Harvest Deletion with Full Reversal**: The entire harvest (all entries) may be deleted while `In Progress`, provided the full quantity remains in inventory.
- **Auto-Derived Date Range**: `harvest_start_date` and `harvest_end_date` are computed from min/max `entry_date` across all entries and stored on the harvest row.
- **Immutable Completed Harvests**: Once marked `Completed`, no entries can be added and the harvest cannot be deleted.
- **Planting + Plot Status Cascade**: Marking complete triggers `updatePlantingStatus('completed')` which cascades to set the plot to `Fallow` if no other active plantings remain (Story 3.4 logic reused).
- **No Pre-Save Confirmation Dialog**: AC8's pre-save confirmation dialog was dropped in favour of direct submit with strong field-level validation.
- **No Harvest Type Selector Components**: `HarvestTypeSelector.vue`, `SingleDayHarvestForm.vue`, `MultiDayHarvestForm.vue`, and `HarvestConfirmationDialog.vue` were **not created**.
- **No Separate CreateHarvestPage**: Harvest creation uses `HarvestEntryDialog.vue` opened inline from `PlantingDetailPage.vue`. The `/farm/plantings/:id/harvests/new` route redirects back to the planting detail page.
- **Removed schema columns**: `harvest_type`, `harvest_date`, `daily_breakdown` are **not** present in the implemented schema.

---

## Prerequisites

- **Story 3.1** (completed): Plot Management — plots exist with crop assignment
- **Story 3.2** (completed): Crops Database — crop data available for display
- **Story 3.3** (completed): Planting Records — `plantings` table with status tracking
- **Story 3.4** (completed): Planting Status Tracking — `updatePlantingStatus` action exists
- **Database Schema**: Updated `harvests` table and new `harvest_entries` table (see schema changes in DATABASE_SCHEMA.md)

---

## Acceptance Criteria

### AC1: "Record Harvest" Button on Planting Detail Page

> **Status: ✅ Completed (with changes)**

- [x] "Record Harvest" button visible on `PlantingDetailPage.vue` for users with `farm:write` permission
- [x] Button hidden when planting has a terminal status (`completed` or `failed`) via `isTerminalStatus` computed
- [x] Button hidden when an existing harvest already exists (enforces one-harvest-at-a-time model)
- [x] Clicking button opens `HarvestEntryDialog` in create mode (inline, no page navigation)
- [x] Planting data pre-loaded from store
- [ ] ~~Button disabled with tooltip for non-harvesting statuses~~ — **Not implemented**: button is simply hidden for terminal statuses; no status-gated tooltip for intermediate statuses.
- [ ] ~~Clicking navigates to `/farm/plantings/:id/harvests/new`~~ — **Changed**: route redirects back to planting detail; dialog opens inline.

### AC2: Harvest Type Selection

> **Status: ❌ Not Implemented (design decision — unified model)**

- [ ] ~~Harvest type selector: "Single Day" / "Multi-Day Aggregate"~~ — **Dropped**: unified entry-based model requires no type selection.
- [ ] ~~"Continuous Picking" option disabled with tooltip~~ — **Dropped**: deferred to Story 3.6 with no placeholder UI.
- [ ] ~~Default selection: "Single Day Harvest"~~ — **Dropped**: no type concept.

### AC3 & AC5: Harvest Entry Form (Unified — replaces both AC3 and AC5)

> **Status: ✅ Completed**

All harvest recording uses the same `HarvestEntryDialog.vue` form in dual mode (create first entry / add subsequent entry):

- [x] **Entry Date** (required): Date picker, defaults to today; min = planting date; max = today
- [x] **Quantity (kg)** (required): Number input, step 0.1; must be > 0
- [x] **Farmhands Count** (optional): Integer input, min 0
- [x] **Labor Cost** (optional): Currency input (ZMW), min 0, defaults to 0
- [x] **Other Costs** (optional): Currency input (ZMW), min 0, defaults to 0
- [x] **Other Costs Notes** (optional): Text area, max 500 chars with counter
- [x] **Entry Notes** (optional): Text area, max 500 chars with counter
- [x] Quasar `greedy` validation prevents submission with missing/invalid required fields
- [x] Dialog resets on each open (watcher on `modelValue`)
- [x] Running total shown in form header when adding entries: "Harvest Total so far: X kg"
- [x] Duplicate date warning banner shown (submission not blocked — allows override)
- [ ] ~~"General Notes" max 1000 chars on harvest-level record~~ — Entry notes are 500 chars; harvest-level notes set via `options.harvestNotes` at creation only.

### AC4: Multi-Day Aggregate — Initial Setup

> **Status: ✅ Completed (model changed)**

- [x] First entry creates harvest parent row with status `In Progress`
- [x] `harvest_start_date` and `harvest_end_date` auto-set from first entry's date; adjusted on each subsequent add/delete
- [x] After first entry, "Add Entry" button appears in the Harvest card on the planting detail page
- [ ] ~~Separate "Harvest Start Date" / "Harvest End Date" pickers~~ — **Dropped**: dates derived from entries, not manually entered.

### AC6: Partial / Incremental Harvest Workflow

> **Status: ✅ Completed (with model changes)**

- [x] First entry creates harvest as `In Progress`; subsequent entries added via "Add Entry" button
- [x] Each entry upserts inventory immediately (cumulative quantity grows with each entry)
- [x] Harvest totals (`total_quantity_kg`, `total_labor_cost`, `total_other_costs`) recomputed from all entries after each add and stored on harvest row
- [x] Entries list on planting detail page shows per-entry: date, quantity, cumulative running total, cost, farmhands, notes
- [x] "Mark Complete" + "Add Entry" + delete-harvest buttons visible for In-Progress harvests
- [x] Individual entry delete ("×") button visible per entry when > 1 entry exists and harvest is In Progress
- [ ] ~~Multiple separate harvest records per planting~~ — **Changed**: only one In-Progress harvest allowed per planting at a time.
- [ ] ~~"Add Another Harvest" button for single-day partial workflow~~ — **Dropped**: add more entries to the existing harvest instead.
- [ ] ~~Harvest detail page shows running totals~~ — **Changed**: detail is inline on planting detail page, not a separate page.

### AC7: Mark Harvest Complete

> **Status: ✅ Completed**

- [x] "Mark Complete" button visible in Harvest card header when `status === 'In Progress'` and user has `farm:write`
- [x] `$q.dialog` confirmation shown: "The harvest will be finalized and no further entries can be added. The planting status will move to 'completed'. This cannot be undone."
- [x] On confirm: harvest `status` → `'Completed'` in DB and local state
- [x] On confirm: `updatePlantingStatus(plantingId, 'completed')` called
- [x] On confirm: plot cascades to `Fallow` if no other active plantings (via Story 3.4 logic)
- [x] Once Completed: Add Entry, Mark Complete, and delete buttons hidden; entries immutable
- [x] "X kg available in inventory" footer link shown after completion
- [ ] ~~Confirmation dialog shows structured summary (qty, costs, entry count)~~ — **Partial**: plain text confirmation message only, no formatted summary card.

### AC8: Pre-Save Confirmation Dialog

> **Status: ❌ Not Implemented (design decision)**

- [ ] ~~Confirmation dialog before creating harvest~~ — **Dropped**: direct submit with field-level validation deemed sufficient.
- [ ] ~~"Harvest records cannot be edited after creation" warning~~ — **N/A**: entries are mutable (deletable) while In Progress; only Completed harvests are fully immutable.
- [ ] ~~"Back to Edit" / "Confirm and Save" buttons~~ — **Dropped**.

### AC9: Validation Rules

> **Status: ✅ Mostly Completed**

- [x] Cannot record harvest if planting has terminal status (button hidden for `completed`/`failed`)
- [x] Entry date ≥ planting date (enforced via `minDateStr` in dialog)
- [x] Entry date ≤ today (enforced via `maxDateStr`)
- [x] Quantity must be > 0 (blocked on submit)
- [x] All cost fields must be ≥ 0 (non-negative validation rules)
- [x] Cannot add entry to a Completed harvest (blocked in store action; error shown via `$q.notify`)
- [ ] ~~Multi-day: harvest_start_date ≤ harvest_end_date~~ — **N/A**: dates derived from entries, not manually entered.
- [ ] ~~Entry date within declared harvest date range~~ — **Changed**: only planting date lower bound + today upper bound enforced; no pre-declared range.

### AC10: Harvest List Page

> **Status: ✅ Completed (with changes)**

- [x] Harvest list page at `/farm/harvests` (`HarvestsListPage.vue`)
- [x] Columns: Harvest Date (range), Crop, Plot, Total Quantity, Status
- [x] Filters: by date range, by crop, by plot, by status
- [x] Summary stat cards: Total Harvests, In Progress count, Completed count, Total Quantity (kg)
- [x] "Filter to In Progress" quick-filter button on the list header
- [x] Row click navigates to `/farm/plantings/:plantingId` (planting detail page with inline harvest)
- [x] "View Planting & Harvest" action button per row
- [ ] ~~`HarvestDetailPage.vue` at `/farm/harvests/:id`~~ — **Not created**: `/farm/harvests/:id` redirects to harvests list. Harvest detail is inline on planting detail.
- [ ] ~~"Harvest type" column~~ — **Dropped**: no type field in schema.
- [ ] ~~Warning banner "This record is permanent and cannot be edited"~~ — **Not implemented** on list page.

### AC11: Planting Detail Page — Harvest Display

> **Status: ✅ Completed (with changes)**

- [x] "Harvest" card inline on planting detail page showing current harvest (or empty state)
- [x] `HarvestStatusBadge` in card header with In Progress / Completed color coding
- [x] Harvest summary: Total Quantity, Total Cost, Avg Cost/kg, date range, entry count
- [x] Entries list with per-entry date, quantity, cumulative total, cost, farmhands, notes
- [x] Action buttons: "Record Harvest" (no harvest), "Add Entry" + "Mark Complete" + delete-harvest (In Progress)
- [x] Entry-level delete ("×") for In-Progress harvests with > 1 entry
- [x] Completed harvest footer: "X kg available in inventory" link to inventory row
- [x] Empty state shown for terminal plantings without harvest: "No harvest was recorded for this planting."
- [ ] ~~"Record Another Harvest" button for multiple harvests per planting~~ — **Dropped**: one-harvest-at-a-time model.
- [ ] ~~Clicking harvest navigates to harvest detail page~~ — **N/A**: harvest is displayed inline.

### AC12: Farm Dashboard — Harvest Widget

> **Status: ✅ Completed**

- [x] `RecentHarvestsWidget.vue` on Farm Dashboard showing last 5 completed harvests (sorted by `harvest_end_date` desc)
- [x] Widget shows: Crop name, Plot name, date range, Quantity (kg), status badge
- [x] In-Progress count badge; clicking navigates to `/farm/harvests`
- [x] "View All" button navigates to `/farm/harvests`
- [x] Refresh button to reload harvest data
- [x] Click on a harvest row navigates to planting detail page
- [ ] ~~Click "In Progress" badge auto-applies filter on list page~~ — **Partial**: navigates to list page but does not auto-apply the filter (user clicks the filter button manually).

### AC13: Error Handling and Edge Cases

> **Status: ✅ Mostly Completed**

- [x] **Duplicate Entry Date**: Warning banner in dialog when `entry_date` matches existing entry; submission not blocked (override allowed)
- [x] **Zero Quantity**: Blocked by `val > 0` validation rule on form submit
- [x] **Add entry to Completed harvest**: Blocked in store action; error surfaced via `$q.notify`
- [x] **Inventory insufficient for entry delete**: Blocked with descriptive error message (shows current vs. required qty)
- [x] **Inventory insufficient for harvest delete**: Blocked with descriptive error message
- [x] **In-Progress harvest already exists**: `createHarvestWithFirstEntry` returns error if one exists for the planting
- [x] **Rollback on failure**: Entry and harvest rows deleted if inventory upsert fails during creation
- [ ] ~~Planting status mismatch alert ("planting marked failed while harvest in progress")~~ — **Not implemented**: button is hidden for terminal statuses; no proactive runtime alert.
- [ ] ~~Concurrent access refresh button~~ — **Not implemented**: page reload required to see concurrent changes.

### AC14: Permission Enforcement

> **Status: ✅ Completed**

- [x] `canWrite` computed (`hasPermission('farm:write')`) gates all write action buttons (Record Harvest, Add Entry, Mark Complete, delete)
- [x] `farm:read` required for `harvests-list` route
- [x] `farm:write` required to perform any mutation (enforced both in UI and store logic)
- [ ] ~~Dedicated `create-harvest` route with `farm:write` guard~~ — **N/A**: no separate create route; dialog-based creation is permission-gated in the UI.

---

## Technical Implementation Notes

### Database Schema (As Implemented)

**Table: `harvests`**

| Column               | Type     | Constraints                                                        | Description                                |
| -------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `id`                 | string   | Primary Key, Auto-generated                                        | Unique harvest identifier                  |
| `planting_id`        | string   | Required, Foreign Key → plantings.id, Indexed                      | Reference to planting                      |
| `harvest_start_date` | datetime | Optional (set from first entry)                                    | Min `entry_date` across all entries        |
| `harvest_end_date`   | datetime | Optional (updated on each add/delete)                              | Max `entry_date` across all entries        |
| `total_quantity_kg`  | float    | Required, Min: 0                                                   | Sum of all `entry.quantity_kg`             |
| `total_labor_cost`   | float    | Optional, Min: 0, Default: 0                                       | Sum of all `entry.labor_cost`              |
| `total_other_costs`  | float    | Optional, Min: 0, Default: 0                                       | Sum of all `entry.other_costs`             |
| `status`             | string   | Required, Enum: 'In Progress', 'Completed', Default: 'In Progress' | Harvest status                             |
| `notes`              | string   | Optional, Max: 1000                                                | Harvest-level notes (set at creation only) |
| `created_at`         | datetime | Auto-generated                                                     | Creation timestamp                         |
| `updated_at`         | datetime | Auto-updated                                                       | Modification timestamp                     |

> ❌ **Removed from original spec**: `harvest_type`, `harvest_date`, `daily_breakdown`

**Table: `harvest_entries`**

| Column              | Type     | Constraints                                  | Description                      |
| ------------------- | -------- | -------------------------------------------- | -------------------------------- |
| `id`                | string   | Primary Key, Auto-generated                  | Unique entry identifier          |
| `harvest_id`        | string   | Required, Foreign Key → harvests.id, Indexed | Parent harvest record            |
| `entry_date`        | datetime | Required                                     | Date of this harvest entry       |
| `quantity_kg`       | float    | Required, Min: 0                             | Quantity harvested this entry    |
| `farmhands_count`   | integer  | Optional, Min: 0                             | Workers for this entry           |
| `labor_cost`        | float    | Optional, Min: 0, Default: 0                 | Labor cost for this entry (ZMW)  |
| `other_costs`       | float    | Optional, Min: 0, Default: 0                 | Other costs for this entry (ZMW) |
| `other_costs_notes` | string   | Optional, Max: 500                           | Notes about other costs          |
| `notes`             | string   | Optional, Max: 500                           | Entry-specific notes             |
| `created_at`        | datetime | Auto-generated                               | Creation timestamp               |
| `updated_at`        | datetime | Auto-updated                                 | Modification timestamp           |

### Store Actions (Implemented in `src/modules/farm/stores/farm-store.js`)

```javascript
// Harvest state: harvests[], harvestsLoaded, isHarvestsLoading

async fetchHarvests()                         // All harvests — used by list page + dashboard widget
async fetchHarvestsByPlanting(plantingId)     // Harvests for one planting; merges into local state
async fetchHarvestById(harvestId)             // Harvest + entries; merges into local state
async fetchHarvestEntries(harvestId)          // Refresh entries only without replacing harvest row

async createHarvestWithFirstEntry(plantingId, entryData, options)
  // Creates harvest parent + first entry + upserts inventory atomically.
  // Rolls back on partial failure. Blocks if in-progress harvest already exists.

async addHarvestEntry(harvestId, entryData)
  // Creates entry → refetches all entries → recomputes totals → updates harvest row → upserts inventory.
  // Rolls back entry + re-syncs totals if inventory upsert fails.

async deleteHarvestEntry(harvestId, entryId)
  // Reverses inventory first → deletes entry → updates harvest totals + date range.
  // Blocked if only 1 entry remains (use deleteHarvest instead).
  // Blocked if inventory quantity < entry quantity.

async markHarvestComplete(harvestId)
  // Sets status = 'Completed' → calls updatePlantingStatus('completed') → plot cascade.
  // No inventory side-effect (inventory already current from per-entry upserts).

async deleteHarvest(harvestId)
  // Deletes all entries → reverses full inventory → deletes harvest row.
  // Blocked if Completed or inventory < total_quantity_kg.

// Internal helpers
async _resolveHarvestContext(plantingId)   // Resolves planting + crop objects
async _rollbackHarvestRow(harvestId)
async _rollbackEntryRow(entryId)
_computeHarvestTotals(entries)             // { total_quantity_kg, total_labor_cost, total_other_costs }
```

### Store Getters (Implemented)

```javascript
harvestsByPlanting: (state) => (plantingId) => { ... }  // Handles object-ref planting_id
inProgressHarvests: (state) => state.harvests.filter((h) => h.status === 'In Progress')
completedHarvests:  (state) => state.harvests.filter((h) => h.status === 'Completed')
recentHarvests:     (state) => completedHarvests sorted by harvest_end_date desc, top 5
```

### Router Configuration (Implemented)

```javascript
// farm/router.js — harvest routes as implemented
{ path: 'farm/harvests',     name: 'harvests-list', component: HarvestsListPage, meta: { requiresPermission: 'farm:read' } },
{ path: 'farm/harvests/:id', redirect: () => ({ name: 'harvests-list' }) },                    // legacy compat
{ path: 'farm/plantings/:id/harvests/new', redirect: (to) => `/farm/plantings/${to.params.id}` }, // legacy compat
```

### Inventory Integration (in `src/stores/inventory-store.js`)

Implemented as part of this story — not deferred to Story 3.7:

```javascript
async createOrUpdateFarmProduceFromHarvest({ planting, crop, entry, harvestTotals })
  // Upserts farm_produce row by planting_id + item_type='farm_produce'.
  // Creates on first entry; increments quantity on subsequent entries.
  // unit_cost = weighted average (total_cost / total_qty) across full harvest.

async reverseFarmProduceFromHarvest({ planting, crop, entry, updatedHarvestTotals })
  // Decrements inventory by entry.quantity_kg.
  // Returns { success: false, reason: 'insufficient' } if inventory < entry qty.

async findFarmProduceRow(plantingId)
  // Finds existing farm_produce row by planting_id.

_deriveInventoryStatus(quantity, reorderThreshold)
  // Returns 'in_stock' | 'low_stock' | 'out_of_stock'
```

### Files Created

| File                                                            | Purpose                                                | Status                                     |
| --------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `src/modules/farm/pages/HarvestsListPage.vue`                   | All harvests list with filters and stats               | ✅ Created                                 |
| `src/modules/farm/components/HarvestEntryDialog.vue`            | Dual-mode dialog (create / add entry)                  | ✅ Created                                 |
| `src/modules/farm/components/HarvestStatusBadge.vue`            | Status badge (In Progress / Completed)                 | ✅ Created                                 |
| `src/modules/farm/components/RecentHarvestsWidget.vue`          | Dashboard widget — recent harvests + in-progress count | ✅ Created                                 |
| ~~`src/modules/farm/pages/CreateHarvestPage.vue`~~              | ~~Harvest creation form~~                              | ❌ Not created (dialog-based)              |
| ~~`src/modules/farm/pages/HarvestDetailPage.vue`~~              | ~~Harvest detail page~~                                | ❌ Not created (inline on planting detail) |
| ~~`src/modules/farm/components/HarvestTypeSelector.vue`~~       | ~~Type selector~~                                      | ❌ Not created (unified model)             |
| ~~`src/modules/farm/components/SingleDayHarvestForm.vue`~~      | ~~Single day form~~                                    | ❌ Not created (unified form)              |
| ~~`src/modules/farm/components/MultiDayHarvestForm.vue`~~       | ~~Multi-day form~~                                     | ❌ Not created (unified form)              |
| ~~`src/modules/farm/components/HarvestConfirmationDialog.vue`~~ | ~~Pre-save confirmation~~                              | ❌ Not created (dropped)                   |

### Files Modified

| File                                            | Changes                                                                                                                       | Status  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| `src/modules/farm/stores/farm-store.js`         | Added harvest state, all actions, and getters                                                                                 | ✅ Done |
| `src/modules/farm/pages/PlantingDetailPage.vue` | Inline harvest card, entries list, all action buttons                                                                         | ✅ Done |
| `src/modules/farm/pages/FarmDashboardPage.vue`  | Added `RecentHarvestsWidget`, harvest alerts section                                                                          | ✅ Done |
| `src/modules/farm/router.js`                    | Added `harvests-list` route and two legacy redirect routes                                                                    | ✅ Done |
| `src/stores/inventory-store.js`                 | Added `createOrUpdateFarmProduceFromHarvest`, `reverseFarmProduceFromHarvest`, `findFarmProduceRow`, `_deriveInventoryStatus` | ✅ Done |

---

## Data Flow

### Creating First Harvest Entry

```
PlantingDetailPage: "Record Harvest" → opens HarvestEntryDialog (create mode)
  ↓ onEntrySubmit (no currentHarvest)
  ↓ farmStore.createHarvestWithFirstEntry(plantingId, entryData)
    1. _resolveHarvestContext → planting + crop objects
    2. Check no in-progress harvest exists for this planting
    3. Create harvests row (status: 'In Progress', start_date = end_date = entry_date)
    4. Create harvest_entries row
    5. inventoryStore.createOrUpdateFarmProduceFromHarvest → upsert farm_produce
    6. Rollback entry + harvest rows if any step fails
    7. Update local state (harvests array prepended)
```

### Adding Subsequent Entries

```
PlantingDetailPage: "Add Entry" → opens HarvestEntryDialog (add mode)
  ↓ onEntrySubmit (currentHarvest present)
  ↓ farmStore.addHarvestEntry(harvestId, entryData)
    1. _resolveHarvestContext
    2. Create harvest_entries row
    3. Fetch all entries for harvest → recompute totals via _computeHarvestTotals
    4. Update harvests row (new totals + new start/end date range)
    5. inventoryStore.createOrUpdateFarmProduceFromHarvest (increments quantity)
    6. Rollback entry + re-sync prior totals if inventory upsert fails
    7. Update local state
```

### Marking Complete

```
PlantingDetailPage: "Mark Complete" → $q.dialog confirm
  ↓ farmStore.markHarvestComplete(harvestId)
    1. Update harvests row: status = 'Completed'
    2. updatePlantingStatus(plantingId, 'completed')
       → updatePlanting → cascades plot to Fallow if no other active plantings
    3. Update local state
  ↓ inventoryStore.findFarmProduceRow(plantingId) → display inventory link
```

---

## Concerns and Mitigations (Updated)

### ✅ Concern 1: Data Correction Without Edit

**Risk**: Users make data entry errors and cannot correct.

**Actual resolution**: Entries can be **deleted** (if inventory allows), effectively allowing re-entry. Entire harvest can be deleted and re-created. Inventory reversal on delete ensures no phantom stock. Once `Completed`, full immutability is enforced.

### ✅ Concern 2: Totals Consistency / Race Condition

**Resolution**: Totals are recomputed from a fresh `listRows` fetch of all entries after every `addHarvestEntry` call. The DB row is the authoritative source — cached local state is overwritten.

### ⚠️ Concern 3: Concurrent Access (Deferred)

Still unaddressed. No refresh button on the planting detail page. Users must reload the page to see concurrent changes by other users.

---

## Testing Checklist

### Unit Tests

- [ ] `createHarvestWithFirstEntry`: creates harvest + entry + inventory; rolls back on failure
- [ ] `addHarvestEntry`: recomputes totals from DB entries; extends date range correctly
- [ ] `deleteHarvestEntry`: reverses inventory; blocked when only 1 entry remains
- [ ] `deleteHarvest`: deletes all entries, reverses inventory, removes harvest; blocked when Completed or insufficient inventory
- [ ] `markHarvestComplete`: transitions planting status; cascades plot to Fallow
- [ ] `_computeHarvestTotals`: correctly sums qty/labor/other from entry array
- [ ] `createOrUpdateFarmProduceFromHarvest`: creates on first call; increments on subsequent; weighted-average unit_cost
- [ ] `reverseFarmProduceFromHarvest`: blocks when inventory < entry qty

### Integration Tests

- [ ] Single entry workflow: create → inventory upserted → mark complete → planting/plot cascade
- [ ] Multi-entry workflow: create → add 2 more entries → verify totals match sum → mark complete
- [ ] Entry deletion: add 2 entries → delete first → verify totals updated and inventory reversed
- [ ] Harvest deletion: create → delete → inventory cleared
- [ ] Block: attempt to add entry to Completed harvest returns error

### E2E Tests

- [ ] Planting detail → Record Harvest → fill form → Start Harvest → verify entry + inventory updated
- [ ] Add Entry → verify running total and cumulative display correct
- [ ] Mark Complete → confirm dialog → verify status badges change → inventory link appears
- [ ] Attempt to interact with completed harvest (add/delete buttons should be absent)
- [ ] Delete entry (when 2 exist) → verify totals and inventory updated
- [ ] Delete entire harvest → planting shows no harvest and inventory cleared

### Permission Tests

- [x] `farm:write` required for all write action buttons (verified via `canWrite` computed)
- [x] `farm:read` required for `harvests-list` route

---

## Deferred Integrations

| Feature                                    | Deferred To   | Notes                                                   |
| ------------------------------------------ | ------------- | ------------------------------------------------------- |
| Continuous Picking harvest type            | Story 3.6     | No placeholder UI; simply not implemented               |
| Profitability calculations                 | Story 3.9     | Uses per-entry cost data already stored                 |
| Yield analysis                             | Story 3.10    | Uses per-entry quantity data already stored             |
| ~~Automatic inventory creation~~           | ~~Story 3.7~~ | **Subsumed** — implemented per-entry in this story      |
| Harvest type UI distinction (Single/Multi) | POST-MVP      | Unified model is simpler; type implied by entry count   |
| Pre-save confirmation dialog               | POST-MVP      | Direct submit with validation deemed sufficient         |
| Separate harvest detail page               | POST-MVP      | Inline display covers MVP needs                         |
| Edit functionality (entry correction)      | POST-MVP      | Delete + re-add is the current workaround               |
| Harvest photos                             | POST-MVP      | File upload to harvest record                           |
| Concurrent access refresh                  | POST-MVP      | Page reload currently required                          |
| Planting-failed-while-in-progress alert    | POST-MVP      | Button hidden for terminal statuses; no proactive alert |

---

## Dependencies

| This Story            | Depends On         | Future Stories Depend On This                               |
| --------------------- | ------------------ | ----------------------------------------------------------- |
| 3.5 Harvest Recording | 3.1, 3.2, 3.3, 3.4 | 3.6 (Continuous Picking), 3.9 (Profitability), 3.10 (Yield) |

> Note: Story 3.7 (Inventory Integration) is **subsumed** — inventory is created and maintained per harvest entry in this story.

---

## Open Issues / TODOs

- [ ] **TODO-1**: In Story 3.9, use per-entry cost data for profitability analysis; cost correction workflow may require negative-value entries or a correction pattern
- [ ] **TODO-2**: Add `harvest_entries` to the farm sample data seeder (`useFarmSampleData.js`) for realistic test data
- [ ] **TODO-3**: Add harvest-related `$q.notify` banners (currently only "Harvest started" / "Entry added" — consider in-page toasts for Mark Complete cascade results)
- [ ] **TODO-4**: Add a refresh button to `PlantingDetailPage.vue` harvest section to handle concurrent edits by other users (deferred from AC13)
- [ ] **TODO-5**: Auto-apply "In Progress" filter when navigating from the RecentHarvestsWidget badge to `HarvestsListPage` (deferred from AC12)

---

## Sign-off

- [x] Story reviewed and implementation completed
- [x] Database schema updated (DATABASE_SCHEMA.md, setup-appwrite.js) — `harvests` and `harvest_entries` tables created
- [x] Technical approach validated: unified entry-based model, inline harvest on planting detail, immediate inventory integration
- [x] Dependencies confirmed available (Stories 3.1–3.4 completed)
- [x] Course corrections documented throughout story with clear ✅/❌/~~strikethrough~~ indicators
- [ ] Story reviewed and approved by Product Owner

---

_Last Updated: 2026-04-24_  
_Story Template Version: 1.0_  
_Status: Completed_
