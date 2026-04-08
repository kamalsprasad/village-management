# Story 3.3: Farm Module - Planting Records with Seed Inventory and Labor Tracking

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.3  
**Status:** Ready for Implementation  
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

- [ ] "Record New Planting" button prominently displayed on plot detail page (`/farm/plots/:id`)
- [ ] Button visible only to users with `farm:write` permission (Farm Manager, Admin)
- [ ] Button disabled with tooltip if plot already has an active planting
- [ ] Clicking button navigates to planting form at `/farm/plots/:id/plantings/new` or opens modal

### AC2: Planting Form - Core Fields

- [ ] Planting form includes all required fields:
  - **Crop** (required): Dropdown populated from crops table, filtered to `is_active = true`
  - **Planting Date** (required): Date picker, defaults to today
  - **Expected Harvest Date** (auto-calculated, overridable): Date picker pre-filled with `planting_date + crop.maturity_days`
  - **Notes** (optional): Text area for general planting notes
- [ ] Crop dropdown shows: "[Crop Name] ([Category]) - [maturity_days] days to harvest"
- [ ] Selecting crop auto-updates expected harvest date calculation
- [ ] Expected harvest date can be manually overridden (for seasonal adjustments, weather delays)
- [ ] Form validation prevents submission with missing required fields
- [ ] Form validation prevents expected harvest date before planting date

### AC3: Planting Form - Seed Source and Inventory Integration

- [ ] **Seed Source** field (required): Radio/toggle options:
  - "From Inventory" - select existing seed inventory item
  - "Purchased Separately" - record new purchase cost
  - "Donated" - record as zero cost with donor notes
- [ ] When "From Inventory" selected:
  - Dropdown shows available seed inventory items (type = 'Farm Inputs', status = 'In Stock')
  - Dropdown shows: "[Item Name] - [Quantity Available] [Unit] @ [Unit Cost]/unit"
  - **Seeds Used** field appears: Quantity input with unit validation
  - System validates sufficient quantity exists before submission
  - **Seed Cost** auto-calculates: `quantity_used × unit_cost` from inventory
  - **Seed Cost Override** checkbox allows manual override (for old/expired stock valuation)
- [ ] When "Purchased Separately" selected:
  - **Seed Cost** field (required): Currency input
  - **Seed Vendor/Supplier** field (optional): Text input
  - **Seed Notes** field (optional): Text area
- [ ] When "Donated" selected:
  - **Donor Name** field (optional): Text input
  - **Seed Notes** field (optional): Text area
  - Seed cost recorded as 0 for profitability calculation
- [ ] Form submission with "From Inventory" decrements inventory quantity automatically
- [ ] If inventory decrement fails, planting creation is blocked with error message
- [ ] Inventory item links to planting via `seed_inventory_id` field

### AC4: Planting Form - Labor Cost Tracking (Aggregate)

- [ ] **Number of Farmhands** field (optional): Integer input, min 0
- [ ] **Labor Cost for Planting** field (optional): Currency input, min 0
- [ ] **Labor Notes** field (optional): Text area for task description, worker names, hours, etc.
- [ ] Fields grouped visually under "Labor Costs" section with info icon explaining aggregate tracking
- [ ] Help text: "Record total labor cost for this planting. Per-worker tracking available in future updates."
- [ ] Both fields optional individually, but if farmhands > 0, labor cost should be entered (validation warning, not blocking)

### AC5: Planting Form - Other Costs

- [ ] **Other Costs Amount** field (optional): Currency input for miscellaneous expenses
- [ ] **Other Costs Notes** field (optional): Text area for details (fertilizer, pesticides, equipment rental, etc.)
- [ ] Fields grouped visually under "Other Costs" section
- [ ] Help text: "Additional costs like fertilizer, pesticides, equipment rental, etc."

### AC6: Form Submission and Data Creation

- [ ] Successful form submission creates planting record in `plantings` table with:
  - All form fields mapped to schema columns
  - `status` set to "Planted"
  - `plot_id` linked to current plot
  - `crop_id` linked to selected crop
  - Cost fields stored for profitability calculation (Story 3.9)
- [ ] Plot status automatically updates to "Active" upon successful planting creation
- [ ] If seed source was "From Inventory", inventory quantity decrements by seeds_used amount
- [ ] Success notification: "[Crop] planting recorded on [Plot Name]. Expected harvest: [Date]"
- [ ] User redirected to plot detail page showing new planting in "Current Planting" section
- [ ] Error handling: If inventory decrement fails after planting created, attempt rollback and show error

### AC7: Active Planting Validation (Plot Level)

- [ ] System prevents creating new planting on plot with existing active planting
- [ ] "Active planting" defined as any planting with status in `['Planted', 'Growing', 'Harvesting']`
- [ ] Attempting to plant on occupied plot shows error: "Cannot create new planting: [Plot Name] already has an active [Crop] planting (status: [Status]). Mark existing planting as Completed or Failed first."
- [ ] Error message includes link to existing planting detail page
- [ ] Failed plantings (status = 'Failed') do NOT block new plantings, but plot status should be 'Fallow'
- [ ] Validation runs both client-side (immediate feedback) and server-side (data integrity)

### AC8: Calendar Integration (DEFERRED to Epic 5)

- [ ] **AC8.1**: Planting form includes placeholder comment: `// TODO: Calendar integration deferred to Story 5.1`
- [ ] **AC8.2**: Expected harvest date is stored in `plantings.expected_harvest_date` field
- [ ] **AC8.3**: When Epic 5 calendar module is implemented, harvest event will be created from this date
- [ ] **AC8.4**: Documentation updated to reference this deferred integration

### AC9: Planting Display on Plot Detail Page

- [ ] Plot detail page "Current Planting" section updated to show actual planting data:
  - Crop name with link to crop detail
  - Planting date
  - Expected harvest date with countdown (e.g., "Expected harvest in 45 days")
  - Status badge (Planted/Growing/Harvesting)
  - Quick stats: Seeds used, labor cost, other costs (collapsed by default, expandable)
- [ ] "Update Status" button visible (functionality in Story 3.4)
- [ ] "View Planting Details" link to full planting detail page
- [ ] Empty state removed once planting exists

### AC10: Planting List and Detail Pages

- [ ] Plantings list page accessible at `/farm/plantings`
- [ ] List shows all plantings with filters: by plot, by crop, by status, by date range
- [ ] Columns: Plot, Crop, Planting Date, Expected Harvest, Status, Actions
- [ ] Planting detail page accessible at `/farm/plantings/:id`
- [ ] Detail page shows complete planting information including all cost breakdowns
- [ ] Detail page includes links to: Plot, Crop, Inventory item (if applicable), associated Harvest (when exists)
- [ ] Edit button available for Farm Manager/Admin (limited editing - see constraints)

### AC11: Edit Planting Constraints

- [ ] Edit form allows modification of: Notes, Expected harvest date, Labor costs, Other costs
- [ ] **Cannot edit**: Crop, Plot, Planting date, Seed source, Seeds used (would break inventory/audit trail)
- [ ] If seed costs need correction, use "Other Costs" adjustment field with explanatory note
- [ ] Status changes handled via dedicated "Update Status" workflow (Story 3.4), not general edit

### AC12: Cost Storage for Profitability Analysis

- [ ] All cost fields stored in database for Story 3.9 calculations:
  - `seed_cost` (calculated or entered)
  - `planting_labor_farmhands`
  - `planting_labor_cost`
  - `planting_other_costs`
  - `planting_other_costs_notes`
- [ ] Costs displayed on planting detail page in organized "Cost Breakdown" section
- [ ] Running total shown: "Total Planting Investment: [Sum of all costs]"

### AC13: Error Handling and Edge Cases

- [ ] **Insufficient Inventory**: If seeds_used > available quantity, show error: "Insufficient [Seed Name] in inventory. Available: [X] [unit], Requested: [Y] [unit]. Please record purchase or reduce quantity."
- [ ] **Inventory Decrement Failure**: If planting created but inventory update fails, attempt to delete planting (rollback) and show error
- [ ] **Transaction Rollback Logging**: Log rollback attempts for debugging (console.error)
- [ ] **Zero-Quantity Inventory**: If inventory item exists but quantity = 0, show "Out of Stock" warning
- [ ] **Deleted Inventory Item**: If linked inventory item is deleted, planting record preserved but shows "[Seed Name] (inventory item deleted)"

### AC14: Performance and UX

- [ ] Form loads within 2 seconds (crops dropdown, inventory dropdown)
- [ ] Auto-calculation of harvest date happens instantly on crop selection
- [ ] Form submission completes within 3 seconds
- [ ] Mobile-responsive layout works on 320px+ screens
- [ ] Touch targets minimum 44px
- [ ] Loading states shown during submission

---

## Technical Implementation Notes

### Database Schema Compliance

Per `DATABASE_SCHEMA.md`, planting records use the `plantings` table:

```javascript
// Core relationship fields
plot_id: string (required, FK to plots.id)
crop_id: string (required, FK to crops.id)

// Dates
planting_date: date (required)
expected_harvest_date: date (calculated/overridden)

// Seed tracking
seed_inventory_id: string (optional, FK to inventory.id)
seeds_used: float (optional, min 0)  // Quantity used (kg, grams, etc.)
seed_cost: float (optional, min 0)
seed_source: enum ['From Inventory', 'Purchased Separately', 'Donated']

// Labor tracking (aggregate for MVP)
planting_labor_farmhands: integer (optional, min 0)
planting_labor_cost: float (optional, min 0)
planting_labor_notes: string (optional)

// Other costs
planting_other_costs: float (optional, min 0)
planting_other_costs_notes: string (optional)

// Status
status: enum ['Planted', 'Growing', 'Harvesting', 'Completed', 'Failed'] (default: 'Planted')
failure_reason: enum ['Drought', 'Pests', 'Disease', 'Flooding', 'Poor Soil', 'Other'] (optional)
```

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

_Last Updated: 2026-04-08_  
_Story Template Version: 1.0_
