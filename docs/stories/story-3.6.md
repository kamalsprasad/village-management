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

- [ ] When recording harvest, if crop type is "Perennial", "Continuous Picking" checkbox appears
- [ ] Checkbox is pre-checked based on crop defaults (most perennials use continuous picking)
- [ ] Help text: "Enable continuous picking for crops that produce multiple harvests"
- [ ] For annual crops, checkbox is hidden and always false
- [ ] Checkbox state is saved to `harvests.is_continuous_picking` field

### AC2: Continuous Picking Harvest Workflow

- [ ] Each harvest recorded as separate event with:
  - Harvest date (required)
  - Quantity (kg, required)
  - Number of farmhands (optional)
  - Labor cost (optional)
  - Notes (optional)
  - "Add Another Harvest" button (visible for continuous picking)
- [ ] After marking harvest complete, "Record Next Harvest" button appears for continuous picking
- [ ] New harvest starts with "In Progress" status; previous harvest remains "Completed"
- [ ] Harvest list shows all harvests chronologically for the planting

### AC3: Planting Detail Page - Perennial Harvest History

- [ ] Planting detail page shows comprehensive harvest history for perennials:
  - List of all harvests with dates and quantities
  - Cumulative yield (sum across all harvests)
  - Average yield per harvest
  - Harvest frequency (days between harvests)
  - Cumulative labor cost
  - Days since last harvest
- [ ] "Mark Planting Complete" button to finalize when crop is no longer producing
- [ ] Planting status remains "Harvesting" after each continuous picking harvest
- [ ] Visual indicator showing "Continuous Picking Active" for perennial plantings

### AC4: Harvest List Page with Perennial Support

- [ ] Harvest list page shows all harvests across all plantings with filters:
  - Filter by crop type (Annual/Perennial)
  - Filter by continuous picking (Yes/No)
  - Filter by date range
  - Filter by plot
- [ ] Continuous picking harvests marked with special icon/badge
- [ ] Show harvest sequence number for perennials (e.g., "Harvest 3 of 5")
- [ ] Export functionality includes continuous picking data

### AC5: Farm Dashboard - Active Perennial Crops Widget

- [ ] Farm dashboard shows "Active Perennial Crops" count widget
- [ ] Widget displays:
  - Total active perennial plantings
  - Breakdown by crop type (e.g., Banana: 3, Mango: 2)
  - Number ready for harvest (based on frequency)
  - Number overdue for harvest
- [ ] Clicking widget navigates to filtered plantings list
- [ ] Widget follows established dashboard pattern (WidgetBase component)

### AC6: Harvest Frequency Analytics

- [ ] System calculates and displays harvest frequency metrics:
  - Average days between harvests per crop
  - Next expected harvest date based on last harvest + frequency
  - Harvest frequency trend (getting faster/slower)
  - Comparison to crop's recommended frequency
- [ ] Alerts when harvest is overdue based on frequency
- [ ] Yield trend analysis across multiple harvests

### AC7: Validation Rules

- [ ] Continuous picking only available for perennial crops
- [ ] Cannot create continuous picking harvest for annual crops
- [ ] Must have at least one harvest entry to complete harvest
- [ ] Cannot add entries to completed harvests
- [ ] Validation: Planting must be in 'harvesting' status to record new harvest

### AC8: Inventory Integration for Multiple Harvests

- [ ] Each harvest creates/updates inventory as in Story 3.5
- [ ] Inventory items show cumulative quantity from all harvests
- [ ] Inventory history shows individual harvest contributions
- [ ] No duplicate inventory creation - same planting_id aggregates

### AC9: Status Management for Perennials

- [ ] Perennial plantings stay in 'harvesting' status until explicitly marked complete
- [ ] Annual plantings move to 'completed' after first harvest (existing behavior)
- [ ] "Mark Planting Complete" available for perennials after any harvest
- [ ] Plot status remains 'Active' while perennial plantings are harvesting

### AC10: Reporting and Analytics

- [ ] Yield reports include multiple harvest data for perennials
- [ ] Profitability analysis (Story 3.9) accounts for multiple harvest cycles
- [ ] Seasonal analysis shows perennial vs annual performance
- [ ] Export reports include harvest sequence and frequency data
- [ ] Sample data includes perennial crop examples with multiple harvests

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

- [ ] Continuous picking harvest creation workflow
- [ ] Harvest sequence numbering accuracy
- [ ] Perennial status management throughout lifecycle
- [ ] Frequency calculations and recommendations
- [ ] Active perennial counting on dashboard
- [ ] Complete perennial lifecycle: planting → multiple harvests → completion
- [ ] Annual vs perennial harvest behavior differences
- [ ] Dashboard widget accuracy and navigation
- [ ] Inventory aggregation across multiple harvests
- [ ] User journey: Plant perennial → harvest continuously → view analytics
- [ ] Frequency alerts and recommendations display
- [ ] Export reports with perennial data inclusion
- [ ] Mobile responsive continuous picking UI

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
