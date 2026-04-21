# Story 3.3: Farm Module - Planting Records with Seed Inventory and Labor Tracking

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.3  
**Status:** Implemented  
**Date:** 2026-04-08  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to record plantings with automatic seed inventory deduction and labor cost tracking, so that I can track what's planted, maintain accurate seed stock levels, and calculate true profitability.

---

## Summary

This story delivers the core planting workflow that connects the Farm module to the Inventory module, establishing the foundation for profitability tracking. When a Farm Manager records a new planting, the system validates seed availability, optionally decrements inventory, captures all cost inputs (seeds, labor, other expenses), and calculates expected harvest dates. This creates the data foundation for Stories 3.4-3.9.

**Key Architectural Decisions:**

- **Inventory Integration**: Seeds can be sourced from existing inventory (auto-decrement) or recorded as new purchases/donations
- **Cost Aggregation**: Labor and other costs are captured as totals for MVP; per-worker tracking deferred to POST-MVP
- **Auto-Calculation**: Expected harvest date calculated from crop maturity days, but overridable for flexibility
- **Plot Status Automation**: Planting creation automatically updates plot status to 'Active'
- **Calendar Integration Deferred**: Automatic calendar event creation deferred to Epic 5 (Story 5.1) - calendar module doesn't exist yet
- **Transaction Integrity**: Client-side rollback implemented for inventory operations (server-side atomicity deferred to POST-MVP Cloud Function)

---

## Prerequisites

- **Story 3.1** (completed): Plot Management - plots exist with status lifecycle
- **Story 3.2** (completed): Crops Database - crops exist with maturity_days for auto-calculation
- **Story 2.6** (completed): Inventory Module - seed inventory items can be tracked and decremented
- **Database Schema**: `plantings` table exists with all required fields per `DATABASE_SCHEMA.md`

---

## Acceptance Criteria

### AC1: "Record New Planting" Button on Plot Detail Page

- [x] "Record New Planting" button prominently displayed on plot detail page (`/farm/plots/:id`) — appears in both the header and the "Current Planting" card
- [x] Button visible only to users with `farm:write` permission (Farm Manager, Admin)
- [x] Button is always enabled — multi-crop plots are supported; existing active plantings show as an informational warning, not a blocker
- [x] Clicking button navigates to planting form at `/farm/plots/:id/plantings/new`
- [x] "Record Planting" button also available from the Plantings list page via a plot-selector dialog

### AC2: Planting Form - Core Fields

- [x] Planting form includes all required fields:
  - **Crop** (required): Dropdown populated from crops table, filtered to `is_active = true`
  - **Planting Date** (required): Date picker, defaults to today
  - **Expected Harvest Date** (auto-calculated, overridable): Date picker pre-filled with `planting_date + crop.maturity_days`
  - **Notes** (optional): Text area for general planting notes
- [x] Crop dropdown shows: "[Crop Name] ([Category]) — [maturity_days] days to harvest"
- [x] Selecting crop auto-updates expected harvest date calculation
- [x] Expected harvest date can be manually overridden
- [x] Form validation prevents submission with missing required fields
- [x] Form validation prevents expected harvest date before planting date

### AC3: Planting Form - Seed Source and Inventory Integration

- [x] **Seed Source** field (required): Radio/toggle options:
  - "From Inventory" - select existing seed inventory item
  - "Purchased Separately" - record new purchase cost
  - "Donated" - record as zero cost with donor notes
- [x] When "From Inventory" selected:
  - Dropdown shows available seed inventory items (DB: `item_type = 'farm_inputs'`, `status = 'in_stock'`, `quantity > 0`)
  - Dropdown shows: "[Item Name] - [Quantity Available] [Unit] @ [Unit Cost]/unit"
  - **Quantity Used** field appears with unit validation
  - System validates sufficient quantity exists before submission
  - **Inputs Cost** auto-calculates: `quantity_used × unit_cost` from inventory
  - **Override** checkbox allows manual cost entry
- [x] When "Purchased Separately" selected: **Inputs Cost** field (currency input)
- [x] When "Donated" selected: inputs cost recorded as 0; details go in Notes field
- [x] Form submission with "From Inventory" decrements inventory quantity automatically (best-effort with rollback)
- [x] If inventory decrement fails, planting is rolled back and error shown
- [x] **Design note**: `seed_inventory_id` is NOT persisted to DB (no column). Seed source details are captured in the `notes` field. Inventory deduction still occurs at submit time.

### AC4: Planting Form - Labor Cost Tracking (Aggregate)

- [x] **Labor Cost** field (optional): Currency input, min 0 — grouped under "Labor Cost" section
- [x] Help text: "Total labor cost for planting activity (farmhands, days worked, etc.)"
- [x] **Design note (schema alignment)**: DB stores only `labor_cost` (aggregated total). Separate `planting_labor_farmhands` and `planting_labor_notes` fields do not exist in the schema. Farmhand count and labor notes should be entered in the general `notes` field. Per-worker tracking deferred to POST-MVP.

### AC5: Planting Form - Other Costs

- [x] **Other Costs** field (optional): Currency input — grouped under "Other Costs" section
- [x] Help text: "Equipment rental, transport, miscellaneous expenses"
- [x] **Design note (schema alignment)**: DB stores only `other_cost` (aggregated total). A separate `planting_other_costs_notes` field does not exist. Cost details should be entered in the general `notes` field.

### AC6: Form Submission and Data Creation

- [x] Successful form submission creates planting record in `plantings` table with:
  - All form fields mapped to schema columns
  - `status` set to `'planted'` (lowercase, matching DB enum)
  - `plot_id` linked to current plot
  - `crop_id` linked to selected crop
  - Cost fields stored for profitability calculation (Story 3.9)
- [x] Plot status automatically updates to `'Active'` upon successful planting creation
- [x] If seed source was "From Inventory", inventory quantity decrements by seeds_used amount
- [x] Success notification: "[Crop] planting recorded on [Plot Name]. Expected harvest: [Date]"
- [x] User redirected to plot detail page showing new planting in "Current Planting" section
- [x] Error handling: If inventory decrement fails after planting created, attempt rollback and show error

### AC7: Active Planting Visibility (Plot Level)

- [x] "Active planting" defined as any planting with status in `['planted', 'growing', 'harvesting']` (lowercase DB enum)
- [x] If a plot has an existing active planting, a **non-blocking informational warning banner** is shown on the create form identifying the active crop with a "View Active" link
- [x] Multi-crop plots are supported — recording a second planting on an occupied plot is allowed; use `area_used_hectares` to track the portion of the plot used
- [x] `failed` plantings do NOT trigger the warning banner
- [x] **Design deviation from original spec**: Blocking validation was removed to support multi-crop plots. Original AC7 blocking behavior superseded by this decision.

### AC8: Calendar Integration (DEFERRED to Epic 5)

- [x] **AC8.1**: Deferred integrations table in implementation notes references Story 5.1
- [x] **AC8.2**: `expected_harvest_date` is stored in the `plantings` table
- [ ] **AC8.3**: When Epic 5 calendar module is implemented, harvest event will be created from this date _(future)_
- [x] **AC8.4**: Deferred integrations documented in Technical Implementation Notes table

### AC9: Planting Display on Plot Detail Page

- [x] Plot detail page "Current Planting" section updated to show actual planting data:
  - Crop name with link to planting detail
  - Planting date and expected harvest date
  - Status badge
  - Investment total with collapsible cost breakdown (inputs/labor/other)
- [ ] "Update Status" button (functionality in Story 3.4)
- [x] "View Details" link to full planting detail page
- [x] Empty state shown when no active plantings exist

### AC10: Planting List and Detail Pages

- [x] Plantings list page accessible at `/farm/plantings`
- [x] List shows all plantings with filters: by plot, by crop, by status
- [x] Columns: Plot, Crop, Planting Date, Expected Harvest, Status, Investment, Actions
- [x] Planting detail page accessible at `/farm/plantings/:id`
- [x] Detail page shows complete planting information including cost breakdown and harvest countdown
- [x] Detail page includes links to: Plot, Crop; Harvest section placeholder for Story 3.5
- [x] Edit button available for Farm Manager/Admin (shows Story 3.4 placeholder notification)

### AC11: Edit Planting Constraints

- [ ] Edit form allows modification of: Notes, Expected harvest date, Labor costs, Other costs _(Story 3.4)_
- [ ] **Cannot edit**: Crop, Plot, Planting date, Seed source, Seeds used (would break inventory/audit trail)
- [ ] If costs need correction, update the relevant cost field with an explanatory note
- [ ] Status changes handled via dedicated "Update Status" workflow (Story 3.4), not general edit

### AC12: Cost Storage for Profitability Analysis

- [x] All cost fields stored in database for Story 3.9 calculations:
  - `inputs_cost` (auto-calculated from inventory or entered manually)
  - `labor_cost` (total aggregate)
  - `other_cost` (miscellaneous expenses)
- [x] Costs displayed on planting detail page in organized "Cost Breakdown" section
- [x] Running total shown: "Total Planting Investment: [Sum of all costs]"

### AC13: Error Handling and Edge Cases

- [x] **Insufficient Inventory**: Validated in `usePlantingForm.validate()` — blocks submission with message showing available vs requested quantity
- [x] **Inventory Decrement Failure**: Planting rolled back (`deletePlanting`) and error shown to user
- [x] **Transaction Rollback Logging**: `console.error` on both decrement failure and rollback failure
- [x] **Zero-Quantity Inventory**: Items with `quantity = 0` excluded from inventory dropdown filter
- [ ] **Deleted Inventory Item**: Not applicable — `seed_inventory_id` is not persisted; no FK to break

### AC14: Performance and UX

- [x] Parallel data loads on mount (plot, plantings, crops, inventory in parallel)
- [x] Auto-calculation of harvest date happens instantly via Vue `watch` on crop selection
- [x] Loading states shown during initial load and form submission
- [x] Mobile-responsive two-column layout (col-12 col-md-6)
- [ ] Touch targets minimum 44px _(not explicitly verified)_
- [ ] Form submission within 3 seconds _(depends on network/Appwrite response time)_

---

## Technical Implementation Notes

### Database Schema Compliance

Per `DATABASE_SCHEMA.md` and `setup-appwrite.js`, planting records use the `plantings` table with **aggregated cost fields**:

```javascript
// Core relationship fields
plot_id: string (required, FK to plots.id)
crop_id: string (required, FK to crops.id)

// Dates
planting_date: datetime (required)
expected_harvest_date: datetime (optional, calculated/overridden)

// Quantity
quantity_planted: integer (optional, min 1)
unit: string (optional, default 'kg')
area_used_hectares: float (optional, min 0) // portion of plot used

// Aggregated costs (no per-source breakdown in DB)
inputs_cost: integer (optional)  // seeds + fertilizer + other inputs
labor_cost: integer (optional)   // total labor cost
other_cost: integer (optional)   // miscellaneous expenses

// Notes (single field — captures seed source context, labor details, etc.)
notes: string (optional)

// Status (all lowercase)
status: enum ['planned', 'planted', 'growing', 'harvesting', 'completed', 'failed'] (default: 'planned')
```

**Note**: `seed_inventory_id`, `seeds_used`, `seed_cost`, `seed_source`, `planting_labor_farmhands`, `planting_labor_notes`, `planting_other_costs_notes`, and `failure_reason` do **not** exist as DB columns. Seed source details and labor notes are captured in the `notes` field. Inventory deduction occurs at submit time (no FK persisted).

### Inventory Integration Flow

```javascript
// Pseudo-code for planting creation with inventory
async function createPlanting(formData) {
  const plantingData = {
    /* form fields */
  };

  if (formData.seed_source === 'From Inventory') {
    // 1. Validate inventory availability
    const inventory = await inventoryStore.fetchItemById(formData.seed_inventory_id);
    if (inventory.quantity < formData.seeds_used) {
      throw new Error('Insufficient inventory');
    }

    // 2. Calculate seed cost from unit_cost
    plantingData.seed_cost = formData.override_cost
      ? formData.manual_cost
      : inventory.unit_cost * formData.seeds_used;
  }

  try {
    // 3. Create planting record
    const planting = await farmStore.createPlanting(plantingData);

    // 4. Decrement inventory if applicable
    if (formData.seed_source === 'From Inventory') {
      try {
        await inventoryStore.adjustStock(formData.seed_inventory_id, {
          type: 'remove',
          quantity: formData.seeds_used,
          reason: `Used in planting ${planting.$id}`,
        });
      } catch (inventoryError) {
        // 5. Rollback: Delete planting if inventory fails
        console.error('Inventory decrement failed, rolling back planting:', inventoryError);
        await farmStore.deletePlanting(planting.$id);
        throw new Error('Failed to update inventory. Planting creation cancelled.');
      }
    }

    // 6. Update plot status to Active
    await farmStore.updatePlot(formData.plot_id, { status: 'Active' });

    return { success: true, data: planting };
  } catch (error) {
    console.error('Planting creation failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Deferred Integrations

| Feature                         | Deferred To             | Notes                                        |
| ------------------------------- | ----------------------- | -------------------------------------------- |
| Calendar event creation         | Story 5.1               | Data exists in `expected_harvest_date` field |
| Per-worker labor tracking       | POST-MVP.md             | Aggregate tracking sufficient for MVP        |
| Server-side atomic transactions | POST-MVP Cloud Function | Client-side rollback for MVP                 |
| Automatic yield predictions     | Story 3.10              | Use `typical_yield_per_hectare` from crop    |

### Store Methods Required

Add to `farm-store.js`:

```javascript
// Planting actions (Story 3.3)
async createPlanting(plantingData) { /* implementation */ }
async fetchPlantingsByPlot(plotId) { /* filter by plot */ }
async fetchPlantingById(plantingId) { /* single planting */ }
async updatePlanting(plantingId, updateData) { /* limited updates */ }
async deletePlanting(plantingId) { /* with validation */ }

// Getter for active planting check
hasActivePlanting: (state) => (plotId) => {
  return state.plantings.some(p =>
    p.plot_id === plotId &&
    ['Planted', 'Growing', 'Harvesting'].includes(p.status)
  );
}
```

### Router Updates

Add to `src/modules/farm/router.js`:

```javascript
{
  path: 'plots/:id/plantings/new',
  name: 'create-planting',
  component: () => import('./pages/CreatePlantingPage.vue'),
  meta: { permission: 'farm:write' }
},
{
  path: 'plantings',
  name: 'plantings-list',
  component: () => import('./pages/PlantingsListPage.vue'),
  meta: { permission: 'farm:read' }
},
{
  path: 'plantings/:id',
  name: 'planting-detail',
  component: () => import('./pages/PlantingDetailPage.vue'),
  meta: { permission: 'farm:read' }
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Planting form validation (required fields, date logic)
- [ ] Harvest date calculation (various crop maturity_days)
- [ ] Seed cost calculation (inventory unit_cost × quantity)
- [ ] Active planting detection logic
- [ ] Inventory decrement success/failure handling

### Integration Tests

- [ ] Complete planting workflow: Form → Creation → Inventory Update → Plot Status Update
- [ ] Insufficient inventory error handling
- [ ] Rollback behavior when inventory update fails
- [ ] Plot with active planting blocks new planting
- [ ] Plot with failed planting allows new planting

### E2E Tests

- [ ] User journey: Navigate to plot → Record planting → Verify inventory decremented → Verify plot shows planting
- [ ] Mobile form submission
- [ ] Permission-based access (Crop Manager cannot create, Farm Manager can)

---

## Questions & Clarifications

**Q1: Should we track seed quantity used in specific units (kg, grams, seeds)?**  
A: Use the unit from the inventory item. If inventory item is "Maize Seeds - 50 kg", then planting records "10 kg used". Store numeric value only in planting record, unit reference comes from inventory relationship.

**Q2: What if the crop is perennial and doesn't have a single harvest date?**  
A: Perennial crops (type = 'Perennial') use `expected_harvest_date` for FIRST harvest expectation. Continuous picking harvests (Story 3.6) handle ongoing production. The maturity_days for perennials indicates time to first production.

**Q3: Can a planting be created retroactively (past date)?**  
A: Yes, planting_date can be in the past for data migration/catch-up scenarios. Expected harvest date calculation should handle past planting dates (will show negative days or "overdue" status).

---

## Dependencies on Future Stories

| This Story           | Depends On                          | Future Story Depends On This                                  |
| -------------------- | ----------------------------------- | ------------------------------------------------------------- |
| 3.3 Planting Records | 3.1 Plots, 3.2 Crops, 2.6 Inventory | 3.4 Status Tracking, 3.5 Harvest Recording, 3.9 Profitability |

---

## Open Issues / TODOs

- [ ] **TODO-1**: Implement calendar event creation when Story 5.1 (Calendar module) is complete
- [ ] **TODO-2**: Consider server-side Cloud Function for atomic inventory+planting transaction (POST-MVP)
- [ ] **TODO-3**: Add per-worker labor tracking when implementing POST-MVP enhancement

---

## Sign-off

- [ ] Story reviewed and approved by Product Owner
- [ ] Technical approach validated by Architect
- [ ] Dependencies confirmed available (Stories 3.1, 3.2, 2.6)
- [ ] Acceptance criteria understood by Developer
- [ ] Estimated effort: 4-6 hours

---

_Last Updated: 2026-04-20_  
_Story Template Version: 1.0_  
_Implemented: 2026-04-20 — Schema aligned to actual Appwrite DB (aggregated cost fields). Multi-crop support added. See implementation notes for design deviations from original spec._
