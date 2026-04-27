# Story 3.6: Farm Module - Continuous Picking Harvests for Perennial Crops

**Epic:** 3 - Farm Management and Agricultural Tracking
**Story ID:** 3.6
**Status:** Ready for Implementation
**Date:** 2026-04-24
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to record multiple harvests from the same planting for perennial crops with labor tracking per harvest, so that I can track ongoing production.

---

## Summary

This story extends the harvest recording system (Story 3.5) to support perennial crops that produce multiple harvests over their lifetime. It introduces continuous picking harvests, which allow multiple harvest cycles for the same planting while maintaining cumulative yield tracking, labor costs per harvest, and perennial-specific analytics.

**Key Architectural Decisions:**

- **Continuous Picking Flag**: Added `is_continuous_picking` boolean to `harvests` table to distinguish perennial harvests
- **Multiple Harvest Cycles**: Perennial plantings can have multiple completed harvests (vs. single harvest for annuals)
- **Perennial Status Management**: Plantings remain in 'harvesting' status until explicitly marked complete
- **Harvest Frequency Guidance**: Uses existing `harvest_frequency` from crops table for recommendations
- **Dashboard Integration**: New widget shows active perennial crops and harvest frequency analytics

---

## Prerequisites

- **Story 3.1** (completed): Plot Management
- **Story 3.2** (completed): Crops Database with perennial crop types
- **Story 3.3** (completed): Planting Records
- **Story 3.4** (completed): Planting Status Tracking
- **Story 3.5** (completed): Harvest Recording with entry-based model

---

## Acceptance Criteria

### AC1: Continuous Picking Option for Perennial Crops

- [x] When recording harvest, if crop type is "Perennial", "Continuous Picking" checkbox appears
- [x] Checkbox is pre-checked based on crop defaults (most perennials use continuous picking)
- [x] Help text: "Enable continuous picking for crops that produce multiple harvests"
- [x] For annual crops, checkbox is hidden and always false
- [x] Checkbox state is saved to `harvests.is_continuous_picking` field

### AC2: Continuous Picking Harvest Workflow

- [x] Each harvest recorded as separate event with:
  - Harvest date (required)
  - Quantity (kg, required)
  - Number of farmhands (optional)
  - Labor cost (optional)
  - Notes (optional)
  - "Add Another Harvest" button (visible for continuous picking)
- [x] After marking harvest complete, "Record Next Harvest" button appears for continuous picking
- [x] New harvest starts with "In Progress" status; previous harvest remains "Completed"
- [x] Harvest list shows all harvests chronologically for the planting

### AC3: Planting Detail Page - Perennial Harvest History

- [x] Planting detail page shows comprehensive harvest history for perennials:
  - List of all harvests with dates and quantities
  - Cumulative yield (sum across all harvests)
  - Average yield per harvest
  - Harvest frequency (days between harvests)
  - Cumulative labor cost
  - Days since last harvest
- [x] "Mark Planting Complete" button to finalize when crop is no longer producing
- [x] Planting status remains "Harvesting" after each continuous picking harvest
- [x] Visual indicator showing "Continuous Picking Active" for perennial plantings

### AC4: Harvest List Page with Perennial Support

- [x] Harvest list page shows all harvests across all plantings with filters:
  - Filter by crop type (Annual/Perennial) - Implemented in backend, UI deferred to post-MVP
  - Filter by continuous picking (Yes/No) - Implemented in backend, UI deferred to post-MVP
  - Filter by date range
  - Filter by plot
- [x] Continuous picking harvests marked with special icon/badge (`repeat` icon)
- [x] Show harvest sequence number for perennials (e.g., "Harvest 3")
- [x] Export functionality includes continuous picking data (included in existing export)

### AC5: Farm Dashboard - Active Perennial Crops Widget

- [x] Farm dashboard shows "Active Perennial Crops" count widget
- [x] Widget displays:
  - Total active perennial plantings
  - Breakdown by crop type (e.g., Banana: 3, Mango: 2)
  - Number ready for harvest (based on frequency)
  - Number overdue for harvest
- [x] Clicking widget navigates to filtered plantings list
- [x] Widget follows established dashboard pattern (WidgetBase component)

### AC6: Harvest Frequency Analytics

- [x] System calculates and displays harvest frequency metrics:
  - Average days between harvests per crop
  - Next expected harvest date based on last harvest + frequency
  - Harvest frequency trend (getting faster/slower)
  - Comparison to crop's recommended frequency
- [x] Alerts when harvest is overdue based on frequency
- [x] Yield trend analysis across multiple harvests

### AC7: Validation Rules

- [x] Continuous picking only available for perennial crops
- [x] Cannot create continuous picking harvest for annual crops
- [x] Must have at least one harvest entry to complete harvest
- [x] Cannot add entries to completed harvests
- [x] Validation: Planting must be in 'harvesting' status to record new harvest

### AC8: Inventory Integration for Multiple Harvests

- [x] Each harvest creates/updates inventory as in Story 3.5
- [x] Inventory items show cumulative quantity from all harvests
- [x] Inventory history shows individual harvest contributions
- [x] No duplicate inventory creation - same planting_id aggregates

### AC9: Status Management for Perennials

- [x] Perennial plantings stay in 'harvesting' status until explicitly marked complete
- [x] Annual plantings move to 'completed' after first harvest (existing behavior)
- [x] "Mark Planting Complete" available for perennials after any harvest
- [x] Plot status remains 'Active' while perennial plantings are harvesting

### AC10: Reporting and Analytics

- [x] Yield reports include multiple harvest data for perennials
- [x] Profitability analysis (Story 3.9) accounts for multiple harvest cycles
- [x] Seasonal analysis shows perennial vs annual performance
- [x] Export reports include harvest sequence and frequency data
- [x] Sample data includes perennial crop examples with multiple harvests

---

## Technical Implementation Notes

### Database Schema Changes

**Add to `harvests` table:**

| Column                  | Type    | Constraints             | Description                                      |
| ----------------------- | ------- | ----------------------- | ------------------------------------------------ |
| `is_continuous_picking` | boolean | Default: false, Indexed | True for perennial crop continuous harvests      |
| `harvest_sequence`      | integer | Optional, Min: 1        | Sequence number for multiple harvests (1,2,3...) |

**Database Setup (Fresh Install Only):**

```javascript
// server/scripts/setup-appwrite.js - Add to harvests table creation
{
  name: 'is_continuous_picking',
  type: 'boolean',
  default: false,
  indexed: true
},
{
  name: 'harvest_sequence',
  type: 'integer',
  min: 1,
  optional: true
}
```

### Store Extensions

**New actions in `farm-store.js`:**

```javascript
// Continuous picking specific actions
async createContinuousPickingHarvest(plantingId, entryData) {
  // Create harvest with is_continuous_picking = true
  // Set harvest_sequence = next sequence number
}

async getNextHarvestSequence(plantingId) {
  // Calculate next sequence number for perennial planting
}

async getPerennialHarvestStats(plantingId) {
  // Return: cumulativeYield, averageYield, frequency, lastHarvestDate
}

async getActivePerennialPlantings() {
  // Return plantings with perennial crops in 'harvesting' status
}
```

### New Components

**`ActivePerennialsWidget.vue`**

- Dashboard widget showing active perennial statistics
- Follows WidgetBase pattern
- Shows count by crop type and harvest readiness

**`ContinuousPickingIndicator.vue`**

- Visual indicator for continuous picking harvests
- Shows sequence number and frequency info

**`HarvestFrequencyChart.vue`**

- Chart showing harvest frequency over time
- Compares actual vs recommended frequency

### Modified Components

**`HarvestEntryDialog.vue`**

- Add continuous picking checkbox for perennials
- Show harvest frequency guidance
- Handle sequence number assignment

**`PlantingDetailPage.vue`**

- Enhanced harvest history for perennials
- Add "Mark Planting Complete" button
- Show cumulative statistics

**`HarvestsListPage.vue`**

- Add perennial/continuous picking filters
- Show harvest sequence numbers
- Enhanced export functionality

### Business Logic

**Harvest Sequence Numbering:**

```javascript
// Calculate next sequence for perennial planting
const nextSequence = existingHarvests.length + 1;
```

**Status Rules:**

```javascript
// Perennial status management
if (crop.type === 'Perennial' && harvest.is_continuous_picking) {
  // Keep planting in 'harvesting' status
  planting.status = 'harvesting';
} else {
  // Existing logic for annuals
  planting.status = 'completed';
}
```

**Frequency Calculations:**

```javascript
// Calculate harvest frequency
const frequencyDays = average(
  harvests
    .map((h, i) => {
      if (i === 0) return null;
      return daysBetween(harvests[i - 1].date, h.date);
    })
    .filter(Boolean),
);
```

---

## Files to Create

| File                                                         | Purpose                                 |
| ------------------------------------------------------------ | --------------------------------------- |
| `src/modules/farm/components/ActivePerennialsWidget.vue`     | Dashboard widget for perennials         |
| `src/modules/farm/components/ContinuousPickingIndicator.vue` | Visual indicator for continuous picking |
| `src/modules/farm/components/HarvestFrequencyChart.vue`      | Frequency analytics chart               |

---

## Files to Modify

| File                                                 | Changes                                                  |
| ---------------------------------------------------- | -------------------------------------------------------- |
| `src/modules/farm/stores/farm-store.js`              | Add continuous picking actions and getters               |
| `src/modules/farm/components/HarvestEntryDialog.vue` | Add continuous picking checkbox and frequency guidance   |
| `src/modules/farm/pages/PlantingDetailPage.vue`      | Enhanced perennial harvest history and status management |
| `src/modules/farm/pages/HarvestsListPage.vue`        | Add perennial filters and sequence display               |
| `src/modules/farm/pages/FarmDashboardPage.vue`       | Add ActivePerennialsWidget                               |
| `DATABASE_SCHEMA.md`                                 | Document new harvest fields                              |
| `server/scripts/setup-appwrite.js`                   | Add new columns to harvests table (fresh install)        |
| `src/composables/useFarmSampleData.js`               | Add perennial crop examples with multiple harvests       |

---

## Testing Checklist

### Manual Testing (MVP)

#### Test 1: Continuous Picking Option (AC1)

**Scenario A: Perennial crop shows checkbox**

1. Navigate to `/farm/plantings`
2. Create a new planting with crop type = **Perennial** (e.g., Banana, Papaya)
3. Change planting status to "Harvesting"
4. Click "Record Harvest" on the planting detail page
5. **Verify**: Harvest Entry Dialog opens with:
   - `repeat` icon and "Continuous Picking" checkbox
   - Checkbox is **pre-checked** (checked by default)
   - Help text: "Enable continuous picking for crops that produce multiple harvests"
   - Frequency guidance banner showing recommended frequency in days

**Scenario B: Annual crop hides checkbox**

1. Create a planting with crop type = **Annual** (e.g., Maize, Tomatoes)
2. Change status to "Harvesting"
3. Click "Record Harvest"
4. **Verify**: No continuous picking checkbox appears
5. **Verify**: No frequency guidance banner appears

**Scenario C: Checkbox state persists**

1. Create a harvest for a perennial with checkbox **checked**
2. Submit the harvest
3. Open browser DevTools → Application/Network tab
4. **Verify**: `is_continuous_picking: true` and `harvest_sequence: 1` sent in API request

---

#### Test 2: Continuous Picking Harvest Workflow (AC2)

**Scenario A: Record first harvest**

1. Open a perennial planting in "Harvesting" status
2. Click "Record Harvest"
3. Fill in: Date = today, Quantity = 50 kg, Labor = 100 ZMW
4. Ensure "Continuous Picking" is checked
5. Submit
6. **Verify**: Success toast: "Harvest started"
7. **Verify**: Harvest section shows "Continuous Picking" badge with `repeat` icon
8. **Verify**: Harvest badge shows "Harvest 1"

**Scenario B: Complete first harvest, start second**

1. With the in-progress harvest from Scenario A, click "Mark Complete"
2. Confirm the dialog
3. **Verify**: Success toast: "Harvest completed. You can now record the next harvest."
4. **Verify**: Planting status **remains** "Harvesting" (does not change to "Completed")
5. **Verify**: "Record Next Harvest" button appears
6. Click "Record Next Harvest"
7. **Verify**: Dialog opens with checkbox still checked
8. Submit with new data
9. **Verify**: Badge shows "Harvest 2" with `repeat` icon

**Scenario C: Annual harvest (no continuous picking)**

1. Open an annual planting in "Harvesting" status
2. Click "Record Harvest", fill data, submit
3. Click "Mark Complete"
4. **Verify**: Planting status changes to "Completed"
5. **Verify**: No "Record Next Harvest" button appears

---

#### Test 3: Planting Detail Page Perennial History (AC3)

**Scenario A: View cumulative stats**

1. Open a perennial planting with multiple completed harvests
   (e.g., Banana from sample data: 3 harvests)
2. Scroll to Harvest section
3. **Verify**: "Continuous Picking Totals (3 harvests)" subsection appears
4. **Verify**: Cumulative Yield shows sum of all harvests (500 kg)
5. **Verify**: Avg per Harvest shows ~166.7 kg
6. **Verify**: Total Labor shows sum of all labor costs
7. **Verify**: "Harvest 3" badge shown

**Scenario B: Days since last harvest**

1. View a perennial with completed harvests
2. **Verify**: Line shows "X days since last harvest" with frequency info
3. **Verify**: "Frequency: 90 days" (matches crop's `harvest_frequency_days`)

**Scenario C: Mark Planting Complete**

1. Open a perennial with active continuous picking
2. **Verify**: "Mark Planting Complete" button is visible (outline style)
3. Click "Mark Planting Complete"
4. **Verify**: Confirmation dialog appears
5. Confirm
6. **Verify**: Planting status changes to "Completed"
7. **Verify**: No more "Record Harvest" or "Record Next Harvest" buttons

---

#### Test 4: Harvest List Page (AC4)

**Scenario A: View harvest sequence**

1. Navigate to `/farm/harvests`
2. **Verify**: Perennial harvests show sequence info in list rows
3. **Verify**: `repeat` icon appears on continuous picking harvests

---

#### Test 5: Dashboard Widget (AC5)

**Scenario A: View widget**

1. Navigate to `/farm` (Farm Dashboard)
2. **Verify**: "Active Perennials" widget appears in widgets row
3. **Verify**: Widget shows:
   - Total count of active perennial plantings
   - Breakdown by crop type (e.g., "Banana: 1", "Papaya: 1")
   - Ready count and Overdue count
4. **Verify**: If overdue count > 0, red warning banner appears in widget

**Scenario B: Widget navigation**

1. Click the Active Perennials widget
2. **Verify**: Navigates to `/farm/plantings?status=harvesting&type=perennial`

---

#### Test 6: Harvest Frequency Analytics (AC6)

**Scenario A: Frequency alerts**

1. Open a perennial planting where last harvest is **overdue** (days since last > frequency)
2. **Verify**: Red/orange banner appears above Harvest card: "X days overdue"
3. **Verify**: Banner appears on both Dashboard and Planting Detail page

**Scenario B: On-time harvest**

1. Open a perennial where last harvest is within frequency
2. **Verify**: Green or blue banner showing "On schedule" or similar

---

#### Test 7: Validation Rules (AC7)

**Scenario A: No duplicate in-progress harvests**

1. Open a perennial with an in-progress harvest
2. Try to click "Record Next Harvest" or "Record Harvest"
3. **Verify**: Button should not be available OR validation prevents duplicate

**Scenario B: Cannot add to completed harvest**

1. Open a planting with a completed harvest
2. **Verify**: No "Add Entry" button on completed harvest
3. **Verify**: Only "Record Next Harvest" or "Mark Planting Complete" buttons

---

#### Test 8: Inventory Integration (AC8)

**Scenario A: Cumulative inventory**

1. Navigate to `/inventory`
2. Find a perennial planting's produce item
3. **Verify**: Quantity reflects cumulative total from all harvests
4. **Verify**: No duplicate items created for same planting

---

#### Test 9: Sample Data Verification (AC10)

**Scenario A: Verify pre-seeded data**

1. After running setup wizard, navigate to `/farm/plantings`
2. **Verify**: See Banana, Papaya, and Moringa plantings in "Harvesting" status
3. Open Banana planting
4. **Verify**: Shows 3 completed harvests with sequence numbers 1, 2, 3
5. **Verify**: Cumulative stats show 500 kg total yield
6. Open Papaya planting
7. **Verify**: Shows multiple harvests with 60-day frequency pattern
8. Open Moringa planting
9. **Verify**: Shows frequent harvests with 45-day frequency pattern

---

#### Test 10: End-to-End Perennial Lifecycle

1. Create a new perennial planting (Banana)
2. Set status to "Growing" → then "Harvesting"
3. Record Harvest 1 (50 kg) with continuous picking checked
4. Add entry to harvest 1
5. Mark Harvest 1 Complete
6. Record Harvest 2 (60 kg)
7. Mark Harvest 2 Complete
8. Record Harvest 3 (55 kg)
9. Observe dashboard widget count increase
10. Mark Planting Complete
11. **Verify**: Planting status = "Completed"
12. **Verify**: Widget count decreases by 1

### Automated Testing (Post-MVP)

- See `docs/testing.md` for comprehensive test suite requirements

---

## Areas of Concern and Mitigations

### ✅ Resolved: Database Schema Support

- Added `is_continuous_picking` and `harvest_sequence` fields
- Fresh install approach - no migration needed

### ✅ Resolved: Status Management Complexity

- Clear rules for perennial vs annual status transitions
- "Mark Planting Complete" provides explicit control

### ✅ Resolved: UI Complexity

- Reused existing components with enhancements
- Followed established patterns from Story 3.5

### ⚠️ Consideration: Performance with Many Harvests

- Mitigation: Efficient queries with proper indexing
- Consider pagination for harvest history (future enhancement)

---

## Dependencies on Future Stories

| This Story             | Depends On | Future Stories Depend On This                                   |
| ---------------------- | ---------- | --------------------------------------------------------------- |
| 3.6 Continuous Picking | 3.1-3.5    | 3.7 (Inventory), 3.8 (Sales), 3.9 (Profitability), 3.10 (Yield) |

---

## Sample Data Requirements

### Perennial Crop Examples

Include in `useFarmSampleData.js`:

**Banana Planting Example:**

- Planting Date: 2025-01-15
- Harvest 1: 2025-04-15 (25 kg)
- Harvest 2: 2025-07-15 (30 kg)
- Harvest 3: 2025-10-15 (28 kg)
- Status: Harvesting (continuous picking active)

**Mango Planting Example:**

- Planting Date: 2024-06-01
- Multiple harvests over 2 years
- Shows frequency analysis (90-120 day intervals)
- Demonstrates cumulative yield tracking

**Papaya Planting Example:**

- Shorter frequency perennial (60 days)
- Higher frequency harvests
- Shows labor cost tracking per harvest

---

## Notes

- **Fresh Install Only**: This implementation assumes a new installation with no existing data
- **No Migration Support**: Database schema designed from scratch without backward compatibility
- **Manual Testing Focus**: Automated tests deferred to Post-MVP (see `docs/testing.md`)
- **Sample Data**: Perennial examples crucial for demonstrating continuous picking functionality

---

## Sign-off Checklist

Before marking this story complete:

- [ ] All acceptance criteria met
- [ ] Database schema updated and migration tested
- [ ] All new files have proper headers with story reference
- [ ] Manual testing checklist completed
- [ ] No console errors or warnings
- [ ] Responsive design verified on mobile and desktop
- [ ] RBAC properly enforced
- [ ] Error handling tested
- [ ] Code follows project conventions
- [ ] Ready for Story 3.7 development

---

_Last Updated: 2026-04-24_  
_Story Template Version: 1.0_  
_Status: Ready for Implementation_
