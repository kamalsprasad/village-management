# Story 3.5: Farm Module - Harvest Recording (Single Day and Multi-Day Aggregate)

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.5  
**Status:** Ready for Implementation  
**Date:** 2026-04-21  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to record harvests with support for single-day and multi-day aggregate harvesting with labor tracking and partial harvest workflows, so that I can accurately track yield, costs, and harvest progress in real-time.

---

## Summary

This story delivers the core harvest recording functionality for the Farm module. It supports two primary workflows:

1. **Single Day Harvests**: Record a complete harvest that happens on one day with labor and cost tracking
2. **Multi-Day Aggregate Harvests**: Record large plot harvests that span multiple days, with each day's details tracked separately and auto-summed into totals

Key differentiators from the original spec:
- **Partial Harvest Support**: Users can add harvest entries incrementally (500kg today, 300kg tomorrow as the same harvest record)
- **In Progress Status**: Harvests start as "In Progress" and can be marked "Completed" when all entries are recorded
- **Immutable Records**: Once created, harvest records cannot be edited (confirmation dialog ensures accuracy at creation)
- **Entry-Based Cost Tracking**: For multi-day harvests, costs are entered per-entry and auto-summed, not entered as totals

**Architectural Decisions:**
- **Two-Table Design**: `harvests` (parent record) + `harvest_entries` (individual day/partial entries) enables flexible partial harvest recording
- **Immutable Harvests**: No edit functionality prevents data integrity issues for profitability calculations (Story 3.9)
- **Auto-Summed Totals**: `total_quantity_kg`, `total_labor_cost`, `total_other_costs` are computed from entries and stored for efficient querying
- **Confirmation Dialog**: Shows all key values before final submission to compensate for no-edit policy
- **Planting Status Cascade**: Only transitions to "completed" when harvest is explicitly marked "Completed" (not on initial creation)

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

- [ ] "Record Harvest" button visible on `PlantingDetailPage.vue` for users with `farm:write` permission
- [ ] Button enabled only when planting status is `harvesting` (per Story 3.4 status workflow)
- [ ] Button disabled with tooltip "Planting must be in 'Harvesting' status to record harvest" for other statuses
- [ ] Clicking button navigates to harvest form at `/farm/plantings/:id/harvests/new`
- [ ] Planting ID passed as route param, planting data pre-loaded in form

### AC2: Harvest Form - Harvest Type Selection

- [ ] Form shows harvest type selector: "Single Day Harvest" / "Multi-Day Aggregate Harvest"
- [ ] "Continuous Picking" option visible but disabled with tooltip: "Available for perennial crops in Story 3.6"
- [ ] Selecting type updates form fields dynamically without page reload
- [ ] Default selection: "Single Day Harvest"

### AC3: Single Day Harvest Fields

- [ ] **Harvest Date** (required): Date picker, defaults to today
- [ ] **Quantity Harvested** (required): Number input (kg), min: 0, step: 0.1
- [ ] **Farmhands Count** (optional): Integer input, min: 0
- [ ] **Labor Cost** (optional): Currency input (ZMW), min: 0
- [ ] **Other Costs** (optional): Currency input (ZMW), min: 0
- [ ] **Other Costs Notes** (optional): Text area, max 500 chars
- [ ] **General Notes** (optional): Text area, max 1000 chars
- [ ] Form validation prevents submission with missing required fields

### AC4: Multi-Day Aggregate Harvest - Initial Setup

- [ ] **Harvest Start Date** (required): Date picker for first day of harvest
- [ ] **Harvest End Date** (optional initially): Date picker, can be left blank and set later
- [ ] Form creates harvest record with status "In Progress"
- [ ] After initial save, user can add daily entries one at a time
- [ ] "Add Daily Entry" button opens dialog for single day details

### AC5: Multi-Day Daily Entry Form

- [ ] **Entry Date** (required): Date picker, must be between harvest_start_date and harvest_end_date
- [ ] **Quantity (kg)** (required): Number input, min: 0, step: 0.1
- [ ] **Farmhands Count** (optional): Integer input, min: 0
- [ ] **Labor Cost** (optional): Currency input (ZMW), min: 0
- [ ] **Other Costs** (optional): Currency input (ZMW), min: 0
- [ ] **Other Costs Notes** (optional): Text area, max 500 chars
- [ ] **Entry Notes** (optional): Text area, max 500 chars
- [ ] "Save Entry" button adds entry and updates harvest totals
- [ ] After saving entry, user stays on harvest detail page showing updated totals

### AC6: Partial Harvest Recording (In Progress Workflow)

- [ ] For both Single Day and Multi-Day types, user can initially save harvest as "In Progress"
- [ ] **Single Day Partial Workflow**: 
  - User can create harvest with partial quantity (e.g., 500kg of expected 1000kg)
  - "Add Another Harvest" button appears on planting detail page for same planting
  - Multiple harvest records per planting are supported
- [ ] **Multi-Day Partial Workflow**:
  - Harvest status remains "In Progress" as daily entries are added
  - Totals auto-update with each entry addition
  - "Mark Complete" button available when all days are recorded
- [ ] Harvest detail page shows running totals and entry list
- [ ] Planting detail page shows all linked harvests with status badges

### AC7: Mark Harvest Complete

- [ ] "Mark Complete" button visible on harvest detail page for "In Progress" harvests
- [ ] Button triggers confirmation dialog showing:
  - Total quantity harvested
  - Total labor cost
  - Total other costs
  - Number of entries (for multi-day)
- [ ] Confirmation dialog requires explicit "Confirm" action (cannot accidentally click)
- [ ] On confirm: harvest status changes to "Completed"
- [ ] On confirm: planting status automatically changes to "completed" (via `updatePlantingStatus`)
- [ ] On confirm: plot status cascades to "Fallow" if no other active plantings (via Story 3.4 logic)
- [ ] Once "Completed", harvest record is immutable (no edit, no add entries)

### AC8: Confirmation Dialog Before Initial Save

- [ ] Before creating harvest (initial save), show confirmation dialog with all entered values:
  - Harvest type
  - Date(s)
  - Quantity/expected total
  - Labor cost
  - Other costs
  - Notes preview
- [ ] Dialog shows warning: "Harvest records cannot be edited after creation. Please verify all values are correct."
- [ ] "Back to Edit" and "Confirm and Save" buttons
- [ ] User must explicitly confirm to proceed

### AC9: Validation Rules

- [ ] Cannot record harvest if planting status is "failed" or "completed"
- [ ] Harvest date must be ≥ planting date
- [ ] Multi-day: harvest_start_date ≤ harvest_end_date (if end date provided)
- [ ] Multi-day entry: entry_date must be within harvest date range
- [ ] Quantity must be positive number (> 0)
- [ ] All cost fields must be non-negative

### AC10: Harvest List and Detail Pages

- [ ] Harvest list page at `/farm/harvests` showing all harvests with filters
- [ ] List columns: Harvest Date, Crop, Plot, Type, Total Quantity, Status
- [ ] Filters: by date range, by crop, by plot, by status (In Progress/Completed)
- [ ] Harvest detail page at `/farm/harvests/:id` showing:
  - Harvest information (type, dates, totals)
  - Linked planting info (crop name, plot name)
  - List of entries (for multi-day) with per-entry details
  - Cost breakdown summary
  - Status badge with action buttons (Mark Complete, Add Entry)
- [ ] Detail page shows warning banner: "This harvest record is permanent and cannot be edited" at top

### AC11: Planting Detail Page - Harvest Display

- [ ] Planting detail page shows "Harvests" section listing all linked harvests
- [ ] Each harvest row shows: date, quantity, status badge
- [ ] "Record Another Harvest" button appears if planting status is "harvesting"
- [ ] If planting status is "completed", show "Harvest Complete" summary instead of list
- [ ] Clicking harvest navigates to harvest detail page

### AC12: Farm Dashboard - Harvest Widget

- [ ] Farm dashboard shows "Recent Harvests" widget with last 5 completed harvests
- [ ] Widget shows: Crop, Plot, Date, Quantity
- [ ] Widget shows count of "In Progress" harvests with alert badge
- [ ] Click "View All" navigates to harvest list page
- [ ] Click "In Progress" badge filters list to show only in-progress harvests

### AC13: Error Handling and Edge Cases

- [ ] **Duplicate Entry Date**: Warn if multi-day entry date already exists (allow override with confirmation)
- [ ] **Planting Status Mismatch**: If planting status changes to "failed" while harvest is "In Progress", show alert: "This planting has been marked as failed. Please mark this harvest as complete or delete it."
- [ ] **Concurrent Access**: If another user adds an entry while viewing, show refresh button to update totals
- [ ] **Zero Quantity Entry**: Block entry creation with quantity = 0

### AC14: Permission Enforcement

- [ ] Farm Manager can record harvest for any planting
- [ ] Crop Manager can record harvest for assigned plots only (same scoping as Story 3.4 — MVP without plot filtering)
- [ ] Users without `farm:write` cannot see "Record Harvest" buttons
- [ ] Users without `farm:write` cannot access harvest form routes

---

## Technical Implementation Notes

### Database Schema (Updated)

**Table: `harvests`**

| Column               | Type     | Constraints                                                      | Description                                |
| -------------------- | -------- | ---------------------------------------------------------------- | ------------------------------------------ |
| `id`                 | string   | Primary Key, Auto-generated                                      | Unique harvest identifier                  |
| `planting_id`        | string   | Required, Foreign Key → plantings.id, Indexed                    | Reference to planting                      |
| `harvest_type`       | string   | Required, Enum: 'Single Day', 'Multi-Day Aggregate'              | Type of harvest                            |
| `harvest_date`       | datetime | Optional                                                         | Single day harvest date                    |
| `harvest_start_date` | datetime | Optional                                                         | Multi-day start date                       |
| `harvest_end_date`   | datetime | Optional                                                         | Multi-day end date                         |
| `total_quantity_kg`  | float    | Required, Min: 0                                                 | Total harvested quantity (auto-summed)     |
| `total_labor_cost`   | float    | Optional, Min: 0, Default: 0                                     | Total labor cost (auto-summed)             |
| `total_other_costs`  | float    | Optional, Min: 0, Default: 0                                     | Total other costs (auto-summed)            |
| `daily_breakdown`    | object[] | Optional                                                         | Summary of daily entries (cached)          |
| `status`             | string   | Required, Enum: 'In Progress', 'Completed', Default: 'In Progress' | Harvest status                             |
| `notes`              | string   | Optional, Max: 1000                                              | General harvest notes                      |
| `created_at`         | datetime | Auto-generated                                                   | Creation timestamp                         |
| `updated_at`         | datetime | Auto-updated                                                     | Modification timestamp                     |

**Table: `harvest_entries`**

| Column              | Type     | Constraints                                   | Description                          |
| ------------------- | -------- | --------------------------------------------- | ------------------------------------ |
| `id`                | string   | Primary Key, Auto-generated                   | Unique entry identifier              |
| `harvest_id`        | string   | Required, Foreign Key → harvests.id, Indexed  | Parent harvest record                |
| `entry_date`        | datetime | Required                                      | Date of this harvest entry           |
| `quantity_kg`       | float    | Required, Min: 0                              | Quantity harvested this entry        |
| `farmhands_count`   | integer  | Optional, Min: 0                              | Workers for this entry               |
| `labor_cost`        | float    | Optional, Min: 0, Default: 0                    | Labor cost for this entry (ZMW)      |
| `other_costs`       | float    | Optional, Min: 0, Default: 0                    | Other costs for this entry (ZMW)     |
| `other_costs_notes` | string   | Optional, Max: 500                            | Notes about other costs              |
| `notes`             | string   | Optional, Max: 500                            | Entry-specific notes                 |
| `created_at`        | datetime | Auto-generated                                | Creation timestamp                   |
| `updated_at`        | datetime | Auto-updated                                  | Modification timestamp               |

### New Store Actions

Add to `src/modules/farm/stores/farm-store.js`:

```javascript
// Harvest actions
async createHarvest(harvestData) { 
  // Create harvest record with initial status 'In Progress'
  // Returns { success, data: harvest }
}

async fetchHarvestsByPlanting(plantingId) {
  // Fetch all harvests for a planting
  // Returns { success, data: harvests[] }
}

async fetchHarvestById(harvestId) {
  // Fetch single harvest with entries populated
  // Returns { success, data: harvest }
}

async addHarvestEntry(harvestId, entryData) {
  // Create entry and update harvest totals
  // Recalculate and update: total_quantity_kg, total_labor_cost, total_other_costs
  // Update daily_breakdown summary
  // Returns { success, data: entry }
}

async markHarvestComplete(harvestId) {
  // 1. Update harvest status to 'Completed'
  // 2. Call updatePlantingStatus to transition planting to 'completed'
  // 3. Cascade plot status update (via Story 3.4 logic)
  // Returns { success, data: harvest }
}

async deleteHarvest(harvestId) {
  // Only allowed for 'In Progress' harvests with no entries
  // Returns { success }
}
```

### Store Getters

```javascript
const harvestsByPlanting = computed(() => (plantingId) => {
  return harvests.value.filter(h => h.planting_id === plantingId);
});

const inProgressHarvests = computed(() => {
  return harvests.value.filter(h => h.status === 'In Progress');
});

const completedHarvests = computed(() => {
  return harvests.value.filter(h => h.status === 'Completed');
});
```

### Router Configuration

Add to `src/modules/farm/router.js`:

```javascript
{
  path: 'plantings/:id/harvests/new',
  name: 'create-harvest',
  component: () => import('./pages/CreateHarvestPage.vue'),
  meta: {
    requiresAuth: true,
    requiresPermission: 'farm:write',
  },
},
{
  path: 'harvests',
  name: 'harvests-list',
  component: () => import('./pages/HarvestsListPage.vue'),
  meta: {
    requiresAuth: true,
    requiresPermission: 'farm:read',
  },
},
{
  path: 'harvests/:id',
  name: 'harvest-detail',
  component: () => import('./pages/HarvestDetailPage.vue'),
  meta: {
    requiresAuth: true,
    requiresPermission: 'farm:read',
  },
},
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/modules/farm/pages/CreateHarvestPage.vue` | Harvest creation form with type selector |
| `src/modules/farm/pages/HarvestDetailPage.vue` | Harvest detail with entries list and actions |
| `src/modules/farm/pages/HarvestsListPage.vue` | All harvests list with filters |
| `src/modules/farm/components/HarvestTypeSelector.vue` | Harvest type selection component |
| `src/modules/farm/components/SingleDayHarvestForm.vue` | Single day form fields |
| `src/modules/farm/components/MultiDayHarvestForm.vue` | Multi-day setup and entry form |
| `src/modules/farm/components/HarvestEntryDialog.vue` | Dialog for adding daily entries |
| `src/modules/farm/components/HarvestConfirmationDialog.vue` | Pre-save confirmation dialog |
| `src/modules/farm/components/HarvestStatusBadge.vue` | Status badge component |
| `src/modules/farm/components/RecentHarvestsWidget.vue` | Dashboard widget |

### Files to Modify

| File | Changes |
|------|---------|
| `src/modules/farm/stores/farm-store.js` | Add harvest actions and getters |
| `src/modules/farm/pages/PlantingDetailPage.vue` | Add "Record Harvest" button and harvests list section |
| `src/modules/farm/pages/FarmDashboardPage.vue` | Add RecentHarvestsWidget |
| `src/modules/farm/router.js` | Add harvest routes |

---

## Data Flow for Partial Harvest Recording

### Scenario 1: Single Day Partial (Two harvests for one planting)

```
Planting: Maize, 1000kg expected
├─ Harvest 1 (Single Day, Completed)
│  ├─ harvest_date: 2026-04-15
│  ├─ total_quantity_kg: 600
│  ├─ status: Completed
│  └─ No entries (single day)
│
└─ Harvest 2 (Single Day, In Progress → Completed)
   ├─ harvest_date: 2026-04-16
   ├─ total_quantity_kg: 400
   ├─ status: Completed
   └─ No entries

Planting total harvested: 1000kg
```

### Scenario 2: Multi-Day Aggregate

```
Harvest (Multi-Day Aggregate, In Progress)
├─ harvest_start_date: 2026-04-10
├─ harvest_end_date: 2026-04-12
├─ status: In Progress
├─ total_quantity_kg: 1550 (auto-summed)
├─ total_labor_cost: 450 (auto-summed)
│
├─ Entry 1
│  ├─ entry_date: 2026-04-10
│  ├─ quantity_kg: 500
│  ├─ farmhands_count: 3
│  ├─ labor_cost: 150
│  └─ other_costs: 20
│
├─ Entry 2
│  ├─ entry_date: 2026-04-11
│  ├─ quantity_kg: 550
│  ├─ farmhands_count: 4
│  ├─ labor_cost: 200
│  └─ other_costs: 30
│
└─ Entry 3
   ├─ entry_date: 2026-04-12
   ├─ quantity_kg: 500
   ├─ farmhands_count: 3
   ├─ labor_cost: 100
   └─ other_costs: 0
```

---

## Concerns and Mitigations

### ⚠️ Concern 1: No Edit Policy May Frustrate Users

**Risk**: Users may make data entry errors and need correction ability.

**Mitigation**: 
- Strong confirmation dialog before save (AC8)
- Clear warning banners on detail pages
- Delete capability for "In Progress" harvests with no entries (start over)
- Document that corrections should be handled by creating a new entry with negative values in Story 3.9 (profitability analysis) if needed

### ⚠️ Concern 2: Multiple Harvests Per Planting May Confuse

**Risk**: Users may not understand when to create new harvest vs add entry.

**Mitigation**:
- UI guidance: "Create a new harvest record if this is a separate harvest event. Add an entry if this is part of an existing multi-day harvest."
- Different button labels: "Record New Harvest" vs "Add to Current Harvest"
- Clear visual grouping on planting detail page

### ⚠️ Concern 3: Concurrent Entry Addition Race Condition

**Risk**: Two users adding entries to same harvest simultaneously could cause total calculation issues.

**Mitigation**:
- Totals recalculated from entries on each fetch (server-side aggregation)
- `daily_breakdown` is cache/summary, not source of truth
- Entries table is source of truth, totals derived

---

## Testing Checklist

### Unit Tests

- [ ] `createHarvest`: creates with status 'In Progress'
- [ ] `addHarvestEntry`: updates totals correctly
- [ ] `markHarvestComplete`: transitions planting status
- [ ] Totals auto-calculation: sum of entries matches stored totals
- [ ] Validation: blocks harvest creation for failed plantings

### Integration Tests

- [ ] Full single day workflow: create → confirm → complete
- [ ] Multi-day workflow: create → add 3 entries → mark complete
- [ ] Partial harvest: two single-day harvests for one planting
- [ ] Planting status cascade: harvest complete → planting complete → plot fallow

### E2E Tests

- [ ] User journey: Planting detail → Record Harvest → Single Day → Confirm → View Detail → Mark Complete
- [ ] User journey: Multi-day harvest with 2 entries → verify totals
- [ ] Attempt to edit completed harvest (should be blocked)
- [ ] Confirmation dialog verification before save

### Permission Tests

- [ ] Farm Manager can create harvest for any planting
- [ ] Unauthorized user cannot access harvest routes

---

## Deferred Integrations

| Feature | Deferred To | Notes |
|---------|-------------|-------|
| Continuous Picking harvest type | Story 3.6 | UI disabled, reserved for perennials |
| Automatic inventory creation | Story 3.7 | Hook into markHarvestComplete |
| Profitability calculations | Story 3.9 | Uses harvest cost data |
| Yield analysis | Story 3.10 | Uses harvest quantity data |
| Edit functionality | POST-MVP | Design decision: immutable records |
| Harvest photos | POST-MVP | Add file upload to harvest record |

---

## Dependencies on Future Stories

| This Story | Depends On | Future Stories Depend On This |
|------------|------------|------------------------------|
| 3.5 Harvest Recording | 3.1, 3.2, 3.3, 3.4 | 3.6 (Continuous Picking), 3.7 (Inventory Integration), 3.9 (Profitability) |

---

## Open Issues / TODOs

- [ ] **TODO-1**: In Story 3.9, implement negative adjustment entries if cost corrections needed
- [ ] **TODO-2**: Consider adding `harvest_entries` to sample data seeder for testing
- [ ] **TODO-3**: Add harvest-related notifications ("Harvest marked complete", "Entry added")

---

## Sign-off

- [ ] Story reviewed and approved by Product Owner
- [ ] Database schema updated (DATABASE_SCHEMA.md, setup-appwrite.js)
- [ ] Technical approach validated (two-table design, immutable records)
- [ ] Dependencies confirmed available (Stories 3.1-3.4 completed)
- [ ] Acceptance criteria understood by Developer
- [ ] Estimated effort: 6-8 hours

---

_Last Updated: 2026-04-21_  
_Story Template Version: 1.0_  
_Status: Ready for Implementation_
