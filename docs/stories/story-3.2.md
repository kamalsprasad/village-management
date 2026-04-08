# Story 3.2: Farm Module - Crops Database and Management

**Epic:** 3 - Farm Management and Agricultural Tracking
**Story ID:** 3.2
**Status:** ready-for-dev
**Date:** 2026-04-08
**Author:** AI Assistant

---

## User Story

As a **System Administrator**, I want to manage the crops database, so that Farm Managers can select from appropriate crops for our region.

---

## Summary

This story establishes the foundational crop reference data for the Farm module. A comprehensive crops database enables Farm Managers to select region-appropriate crops when creating planting records, provides automatic maturity date calculations, and supports yield tracking and profitability analysis. This story delivers CRUD operations for crop management, seeds the database with 27 common Zambian crops, and establishes the data foundation for Stories 3.3 (Planting Records) and 3.9 (Profitability Analysis).

**Key Architectural Decisions:**

- Crops are reference data managed by System Administrators, not end users
- 27 Zambian crops are seeded by default covering grains, legumes, vegetables, root crops, fruits, and perennials
- Crops can be deactivated (soft-delete alternative) to hide from planting forms without breaking historical records
- Crop type (Annual/Perennial) determines harvest workflow availability (Continuous Picking in Story 3.6)
- Crop-to-planting relationship is one-to-many (one crop can have many plantings)

---

## Prerequisites

- **Epic 1 Story 1.4** (done): RBAC Foundation with role-based permissions
- **Epic 1 Story 1.8** (done): Village Configuration and Admin menu structure
- **Story 3.1** (done): Plot Management establishes Farm module infrastructure

---

## Acceptance Criteria

### AC1: Crops Collection Database Schema ✅

- [ ] Crops collection created in Appwrite with complete schema:
  - `crop_name` (string, required, max 100 chars) - Common name of the crop
  - `crop_type` (enum: Annual/Perennial, required) - Determines harvest workflow
  - `maturity_days` (integer, required, min 1, max 730) - Days from planting to harvest
  - `harvest_frequency` (integer, optional, min 1, max 365) - Days between harvests for perennials
  - `typical_yield_per_hectare` (float, optional, min 0) - Expected yield in kg/hectare
  - `growing_season` (enum: Warm/Wet/Cool/All Year, optional) - Optimal planting season
  - `category` (enum: Grain/Legume/Vegetable/Root Crop/Fruit/Other, required) - Crop classification
  - `is_active` (boolean, required, default: true) - Visibility toggle
  - `notes` (string, optional, max 500) - Additional information
- [ ] Proper indexes created: `category`, `crop_type`, `is_active` for efficient filtering
- [ ] Database permissions configured: Admins have full access, Farm Managers have read-only

### AC2: Zambian Crops Seed Data ✅

- [ ] System seeded with 27 Zambian crops organized by category:
  - **Grains (4)**: Maize, Sorghum, Millet, Rice
  - **Legumes (4)**: Groundnuts, Soybeans, Cowpeas, Beans
  - **Vegetables (6)**: Tomatoes, Cabbage, Rape, Onions, Pumpkin, Okra
  - **Root Crops (3)**: Cassava, Sweet Potato, Irish Potato
  - **Fruits (5)**: Banana, Mango, Papaya, Guava, Orange
  - **Perennials (2)**: Moringa, Mulberry
  - **Other (3)**: Sunflower, Sugarcane, Cotton
- [ ] Seeder script `seed-crops.js` created for idempotent seeding (skips existing crops)
- [ ] Each crop has realistic maturity days, yield estimates, and category assignments
- [ ] Run seeder via: `npm run seed:crops`

### AC3: Admin Navigation to Crop Database ✅

- [ ] "Crop Database" menu item added to Farm Settings submenu
- [ ] Menu item visible only to users with `farm:admin` or `admin` permissions
- [ ] Navigation route: `/farm/settings/crops` or `/admin/farm/crops`
- [ ] Menu icon: `grass` or `spa` for visual consistency

### AC4: Crops List Page with Filtering ✅

- [ ] Crops list page accessible at `/farm/crops` or `/farm/settings/crops`
- [ ] List displays all crops in table format with columns:
  - Crop Name
  - Category (with color-coded badge)
  - Type (Annual/Perennial with icon indicator)
  - Maturity (e.g., "90 days")
  - Typical Yield (e.g., "2,500 kg/ha" or "-" if not set)
  - Status (Active/Inactive with toggle)
  - Actions (View, Edit)
- [ ] List supports filtering by category (multi-select dropdown)
- [ ] List supports filtering by type (Annual/Perennial)
- [ ] List supports filtering by growing season
- [ ] List supports text search by crop name
- [ ] "Show Inactive" toggle to include deactivated crops
- [ ] Pagination for lists > 25 crops
- [ ] "Add Crop" button prominently displayed (admin only)

### AC5: Add Crop Form with Complete Field Set ✅

- [ ] "Add Crop" button opens form page/dialog with all fields:
  - **Crop Name** (required, string, max 100 chars)
  - **Category** (required, select: Grain, Legume, Vegetable, Root Crop, Fruit, Other)
  - **Crop Type** (required, select: Annual, Perennial)
  - **Maturity Days** (required, integer, min 1, max 730)
  - **Harvest Frequency** (optional, integer, min 1, max 365, only shown if Perennial)
  - **Typical Yield per Hectare** (optional, float, min 0)
  - **Growing Season** (optional, select: Warm Season, Wet Season, Cool Season, All Year)
  - **Notes** (optional, textarea, max 500 chars)
  - **Active** (toggle, default: true)
- [ ] Form validation prevents submission with missing required fields
- [ ] Form validation prevents negative maturity days
- [ ] Dynamic field visibility: Harvest Frequency only shown for Perennial crops
- [ ] Yield unit always in kg/hectare (currency-neutral)
- [ ] Successful save creates crop in Appwrite `crops` table
- [ ] Success notification displayed after creation
- [ ] List refreshes immediately after save

### AC6: Edit Crop Functionality ✅

- [ ] Edit button opens form pre-populated with existing crop data
- [ ] Edit form uses same validation as Add Crop
- [ ] Changing crop type (Annual ↔ Perennial) handles Harvest Frequency field appropriately
- [ ] Save updates crop record immediately
- [ ] Success notification after update
- [ ] Crop list reflects changes without page reload

### AC7: Crop Deactivation (Soft Delete Alternative) ✅

- [ ] Crops cannot be hard-deleted (preserves referential integrity with plantings)
- [ ] Instead of delete, crops can be "deactivated" (is_active = false)
- [ ] Deactivated crops are hidden from planting forms (Story 3.3)
- [ ] Deactivated crops remain visible in the crop database with "Inactive" status badge
- [ ] Reactivation is possible by toggling is_active back to true
- [ ] Crop detail page shows "Deactivate" button for active crops, "Reactivate" for inactive
- [ ] Cannot deactivate crop with active plantings (show warning with link to plantings)

### AC8: Crop Detail Page with Usage Statistics ✅

- [ ] Crop detail page accessible at `/farm/crops/:id`
- [ ] Page displays crop information in organized sections:
  - **Basic Info**: Name, Category, Type, Status badge
  - **Growing Characteristics**: Maturity days, Harvest frequency (if perennial), Growing season, Typical yield
  - **Usage Statistics** (placeholder for now): "Usage statistics will be available after planting records are created" (Story 3.4)
  - **Notes**: Displayed if present
  - **Recent Plantings**: List of recent plantings using this crop (placeholder - "Planting history coming in Story 3.4")
- [ ] Edit button available for Admin roles
- [ ] Deactivate/Reactivate button with confirmation dialog
- [ ] "Back to Crops" navigation link

### AC9: Crop Selection Integration for Planting Forms (Preparation) ✅

- [ ] Create `CropSelect` component for use in planting forms (Story 3.3)
  - Dropdown populated from crops collection
  - Filters to only `is_active = true` crops
  - Shows crop name, category badge, maturity days
  - Grouped by category for easier selection
  - Search/filter within dropdown
- [ ] Component supports optional filtering by crop_type (for perennial-only workflows)
- [ ] Component emits selected crop object with full details (for maturity date auto-calculation)

### AC10: Performance and Error Handling ✅

- [ ] Crop list loads within 1 second for < 100 crops
- [ ] Form submissions complete within 2 seconds
- [ ] Error states handled gracefully:
  - Network errors show retry option
  - Validation errors display inline
  - Server errors show user-friendly message with error ID
- [ ] Loading states use Quasar skeleton components

---

## Implementation Notes

### Files to Create

| File | Purpose |
|------|---------|
| `server/scripts/seed-crops.js` | Seeder script for 27 Zambian crops |
| `src/modules/farm/components/CropForm.vue` | Reusable add/edit crop form |
| `src/modules/farm/components/CropSelect.vue` | Dropdown component for planting forms |
| `src/modules/farm/components/CropCategoryBadge.vue` | Category badge with color coding |
| `src/modules/farm/components/CropsListWidget.vue` | Dashboard widget showing crop counts by category |
| `src/modules/farm/pages/CropsListPage.vue` | Crop list with filtering |
| `src/modules/farm/pages/CropFormPage.vue` | Add/Edit crop page |
| `src/modules/farm/pages/CropDetailPage.vue` | Crop detail view |

### Files to Modify

| File | Changes |
|------|---------|
| `src/modules/farm/stores/farm-store.js` | Add CRUD actions for crops |
| `src/modules/farm/router.js` | Add routes for crops pages |
| `src/layouts/MainLayout.vue` | Add Crop Database to Farm Settings menu |
| `server/scripts/setup-appwrite.js` | Add `crops` table to schema setup |
| `DATABASE_SCHEMA.md` | Document crops table |

### Database Schema

**Table: `crops`**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | string | Primary Key | Unique crop identifier |
| `crop_name` | string | Required, max 100 | Common name (e.g., "Maize") |
| `category` | enum | Required | Grain, Legume, Vegetable, Root Crop, Fruit, Other |
| `crop_type` | enum | Required | Annual, Perennial |
| `maturity_days` | integer | Required, min 1, max 730 | Days to maturity |
| `harvest_frequency` | integer | Optional, min 1, max 365 | Days between harvests (perennials) |
| `typical_yield_per_hectare` | float | Optional, min 0 | Expected yield kg/hectare |
| `growing_season` | enum | Optional | Warm, Wet, Cool, All Year |
| `is_active` | boolean | Required, default: true | Visibility toggle |
| `notes` | string | Optional, max 500 | Additional information |
| `created_at` | datetime | Auto | Creation timestamp |
| `updated_at` | datetime | Auto-updated | Modification timestamp |

**Indexes Required:**

- `category` - For filtering by category
- `crop_type` - For filtering by annual/perennial
- `is_active` - For hiding inactive crops in planting forms
- `category_name` - Composite for grouped display

### Category Color Coding

```javascript
const CATEGORY_COLORS = {
  'Grain': { color: 'amber', icon: 'grain' },
  'Legume': { color: 'green', icon: 'grass' },
  'Vegetable': { color: 'green-7', icon: 'eco' },
  'Root Crop': { color: 'brown', icon: 'spa' },
  'Fruit': { color: 'red', icon: 'apple' },
  'Other': { color: 'grey', icon: 'park' },
};
```

### Crop Type Indicators

```javascript
const CROP_TYPE_CONFIG = {
  'Annual': { icon: 'calendar_today', tooltip: 'Annual - Single harvest cycle' },
  'Perennial': { icon: 'event_repeat', tooltip: 'Perennial - Multiple harvest cycles' },
};
```

### Seed Data (27 Zambian Crops)

| Crop | Category | Type | Maturity (days) | Yield (kg/ha) | Season |
|------|----------|------|-----------------|---------------|--------|
| Maize | Grain | Annual | 120 | 3500 | Warm |
| Sorghum | Grain | Annual | 105 | 2500 | Warm |
| Millet | Grain | Annual | 90 | 2000 | Warm |
| Rice | Grain | Annual | 150 | 4500 | Wet |
| Groundnuts | Legume | Annual | 100 | 1800 | Warm |
| Soybeans | Legume | Annual | 110 | 2200 | Warm |
| Cowpeas | Legume | Annual | 75 | 1500 | Warm |
| Beans | Legume | Annual | 80 | 1400 | Warm |
| Tomatoes | Vegetable | Annual | 75 | 25000 | All Year |
| Cabbage | Vegetable | Annual | 90 | 40000 | Cool |
| Rape | Vegetable | Annual | 45 | 8000 | Cool |
| Onions | Vegetable | Annual | 120 | 20000 | Cool |
| Pumpkin | Vegetable | Annual | 100 | 15000 | Warm |
| Okra | Vegetable | Annual | 55 | 10000 | Warm |
| Cassava | Root Crop | Annual | 365 | 12000 | All Year |
| Sweet Potato | Root Crop | Annual | 120 | 14000 | All Year |
| Irish Potato | Root Crop | Annual | 90 | 20000 | Cool |
| Banana | Fruit | Perennial | 365 | 25000 | All Year |
| Mango | Fruit | Perennial | 1825 | 8000 | Warm |
| Papaya | Fruit | Perennial | 270 | 30000 | All Year |
| Guava | Fruit | Perennial | 730 | 10000 | All Year |
| Orange | Fruit | Perennial | 1095 | 12000 | All Year |
| Moringa | Perennial | Perennial | 240 | 8000 | All Year |
| Mulberry | Perennial | Perennial | 365 | 5000 | All Year |
| Sunflower | Other | Annual | 100 | 2000 | Warm |
| Sugarcane | Other | Perennial | 365 | 80000 | All Year |
| Cotton | Other | Annual | 180 | 2500 | Warm |

### Farm Store Extensions

Extend `farm-store.js` with crop-related actions:

```javascript
// Crop-related state
const crops = ref([]);
const cropsLoaded = ref(false);
const isCropsLoading = ref(false);

// Actions
async fetchCrops(filters = {}) { ... }
async fetchCropById(cropId) { ... }
async createCrop(cropData) { ... }
async updateCrop(cropId, cropData) { ... }
async toggleCropActive(cropId, isActive) { ... }

// Getters
const activeCrops = computed(() => crops.value.filter(c => c.is_active));
const cropsByCategory = computed(() => { ... });
const getCropNameById = (id) => { ... };
```

### Navigation Integration

Add to Farm Settings submenu in `MainLayout.vue`:

```javascript
{
  label: 'Crop Database',
  icon: 'grass',
  route: '/farm/crops',
  permission: 'farm:admin',
  description: 'Manage available crops'
}
```

### Permission Requirements

| Permission | Description | Roles |
|------------|-------------|-------|
| `farm:read` | View crops list | Farm Manager, Admin, Crop Manager |
| `farm:admin` | Create/edit/deactivate crops | Admin, System Administrator |

### CropSelect Component API

```vue
<template>
  <CropSelect
    v-model="selectedCropId"
    :filter-type="'Annual'" <!-- Optional: filter to only Annual/Perennial -->
    :filter-category="'Grain'" <!-- Optional: filter to specific category -->
    :show-inactive="false" <!-- Always false for planting forms -->
    @select="handleCropSelect"
  />
</template>
```

Props:
- `modelValue` (String): Selected crop ID
- `filterType` (String, optional): 'Annual' or 'Perennial' to filter
- `filterCategory` (String, optional): Category to filter by
- `showInactive` (Boolean, default: false): Show inactive crops

Emits:
- `update:modelValue`: When selection changes
- `select`: Full crop object when selected (for maturity date calculation)

---

## Areas of Concern and Recommendations

### Concern 1: Referential Integrity with Plantings

**Issue:** Once crops have planting records, they cannot be deleted. This is by design, but we need to handle the "deactivate" constraint properly.

**Recommendation:** 
- In AC7, check for active plantings before allowing deactivation
- If crop has active plantings, show: "Cannot deactivate crop with active plantings. Complete or fail existing plantings first."
- Historical plantings don't block deactivation (they remain linked but crop becomes unavailable for new plantings)

### Concern 2: Yield Data Accuracy

**Issue:** Typical yield per hectare varies significantly by soil type, rainfall, and farming practices.

**Recommendation:**
- The `typical_yield_per_hectare` field is for planning/estimation only
- Add note in UI: "This is an average estimate. Actual yields may vary."
- In Story 3.9 (Profitability), actual yields from harvests will be tracked separately
- Consider adding yield range (min/max) in future iterations

### Concern 3: Perennial Crop Maturity Complexity

**Issue:** Perennials like Mango have complex maturity - first fruiting takes years, but then produce annually.

**Recommendation:**
- Current `maturity_days` represents time to first harvest for simplicity
- For perennials, this will trigger the first harvest date calculation
- `harvest_frequency` then determines subsequent harvests
- Document this clearly in the form: "Days until first harvest"

### Concern 4: Growing Season Variations

**Issue:** Zambia has regional variations in growing seasons (Zone A, B, C).

**Recommendation:**
- Current simplified season model (Warm/Wet/Cool/All Year) is sufficient for MVP
- In future (Story 3.11), could add region-specific recommendations
- The growing season is advisory only - doesn't block off-season planting

---

## Testing Checklist

### Manual Testing Scenarios

1. **Seed Script Execution**
   - [ ] Run `npm run seed:crops` successfully
   - [ ] Verify 27 crops created with correct data
   - [ ] Run seeder again - verify idempotent (no duplicates)
   - [ ] Verify each crop has correct category, type, and maturity

2. **Navigation Access Control**
   - [ ] Login as Admin → verify Crop Database menu item visible
   - [ ] Login as Farm Manager → verify Crop Database visible (read-only)
   - [ ] Login as Crop Manager → verify no Crop Database access

3. **Crop CRUD Operations**
   - [ ] Create new crop with all fields filled
   - [ ] Create crop with only required fields
   - [ ] Attempt to create crop with missing name → verify validation error
   - [ ] Attempt to create crop with maturity = 0 → verify validation error
   - [ ] Edit existing crop, change type from Annual to Perennial
   - [ ] Verify Harvest Frequency field appears for Perennial
   - [ ] Deactivate crop with no plantings → verify success
   - [ ] Reactivate deactivated crop → verify appears in list

4. **List Page Functionality**
   - [ ] Verify all 27 seeded crops display
   - [ ] Filter by category = Grain → verify 4 crops shown
   - [ ] Filter by type = Perennial → verify 7 crops shown (Banana, Mango, Papaya, Guava, Orange, Moringa, Mulberry, Sugarcane)
   - [ ] Search by name "maize" → verify Maize shown
   - [ ] Toggle "Show Inactive" → verify deactivated crops appear

5. **CropSelect Component**
   - [ ] Component shows only active crops by default
   - [ ] Crops grouped by category in dropdown
   - [ ] Selecting crop emits full crop object with maturity_days
   - [ ] Category badges display correctly

6. **Detail Page**
   - [ ] All crop information displays correctly
   - [ ] Maturity days shows formatted as "90 days"
   - [ ] Yield shows formatted as "2,500 kg/ha" or "-" if not set
   - [ ] Deactivate/Reactivate button works
   - [ ] "Back to Crops" link works

7. **Performance**
   - [ ] List loads < 1 second with 27 crops
   - [ ] Form submission completes < 2 seconds
   - [ ] CropSelect dropdown loads quickly

---

## Open Questions

1. **Q: Should crop names be unique?**
   - **Recommendation:** Yes, enforce unique crop names at database level. Having two "Maize" entries would be confusing.

2. **Q: What happens when we need to add crops not in the 27 seed list?**
   - **Recommendation:** Admin can add any crop via the "Add Crop" form. The 27 are just sensible defaults for Zambia.

3. **Q: Should we support crop varieties (e.g., "Maize - SC 627")?**
   - **Recommendation:** For MVP, no. Use the Notes field to specify varieties. In future, could add a varieties table.

4. **Q: Can multiple villages share the same crop database?**
   - **Recommendation:** Yes, crops are reference data stored at system level. The crop database is not village-specific.

---

## Story Context for Next Stories

### Story 3.3: Planting Records

- Will use `CropSelect` component to choose crops
- `maturity_days` will auto-calculate expected harvest date
- `crop_type` determines if Continuous Picking is available
- Only `is_active = true` crops appear in planting forms

### Story 3.6: Continuous Picking Harvests

- Only enabled for crops with `crop_type = Perennial`
- `harvest_frequency` determines recommended harvest intervals
- Plantings track cumulative yield across multiple harvests

### Story 3.9: Profitability Analysis

- Crop detail "Usage Statistics" will show:
  - Total plantings of this crop
  - Average actual yield vs typical_yield_per_hectare
  - Success rate (completed vs failed plantings)
  - Total revenue from this crop type

---

## Estimated Effort

- **Story Points:** 5
- **Estimated Hours:** 6-10 hours
- **Complexity:** Medium

**Breakdown:**

- Database schema and seed script: 1.5 hours
- Store methods (CRUD): 1 hour
- Crops list page with filtering: 1.5 hours
- Add/Edit forms with validation: 1.5 hours
- CropSelect component: 1 hour
- Detail page: 1 hour
- Navigation integration: 0.5 hours

---

## References

- [Source: docs/epics.md#481] - Story 3.2 acceptance criteria in epics
- [Source: docs/stories/story-3.1.md] - Farm module patterns established
- [Source: docs/implementation-artifacts/dashboard-widget-pattern.md] - Widget pattern
- Zambian crop data sources: Ministry of Agriculture crop calendars, FAO crop profiles

---

## Sign-off Checklist

Before marking this story complete:

- [ ] All acceptance criteria met
- [ ] Database schema documented in DATABASE_SCHEMA.md
- [ ] Seeder script tested and runs successfully
- [ ] All new files have proper headers with story reference
- [ ] Manual testing checklist completed
- [ ] No console errors or warnings
- [ ] Responsive design verified on mobile and desktop
- [ ] RBAC properly enforced (only admins can modify crops)
- [ ] Error handling tested (network errors, validation errors)
- [ ] Code follows project conventions (imports, naming, formatting)
- [ ] Ready for Story 3.3 development

---

## Implementation Verification

After implementation, verify:

1. Run `npm run seed:crops` - all 27 crops created
2. Navigate to Farm → Crop Database - list loads with all crops
3. Click Add Crop - form opens with all fields
4. Create a test crop - appears in list immediately
5. Deactivate test crop - hidden from list unless "Show Inactive" checked
6. Edit Maize - change maturity days - updates successfully
7. Verify CropSelect component works (can be tested in isolation)
