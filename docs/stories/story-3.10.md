# Story 3.10: Farm Module - Yield Analysis, Trend Reporting, and Configurable Alerts

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.10  
**Status:** draft  
**Date:** 2026-05-04  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to analyze yield per hectare, track trends over time, compare performance between seasons and plots, and receive configurable alerts for important farm events, so that I can optimize planting strategies and take timely action on problems.

---

## Background and Scope

This story is the final Epic 3 delivery. It combines the original Story 3.10 (Yield Analysis) and Story 3.11 (Configurable Alerts and Dashboard Completion) into a single story per the project owner's decision.

**What's already built (do NOT re-implement):**

Story 3.9 (`FarmReportsPage.vue`) already delivers:
- `avgYieldPerHectare` column in the Crop Performance table
- "Highest Yield Crop" summary card
- `avgYieldPerHectare` in CSV and PDF export

**What this story adds:**

1. **Plot Detail — Yield Analysis section**: Per-planting yield/ha history, average, trend chart, comparison to `crops.typical_yield_per_hectare`
2. **Farm Reports Page — Yield Report tab**: Second tab on the existing `FarmReportsPage.vue` with Yield Trend line chart, season comparison table, plot-to-plot benchmarking, and underperforming planting alerts
3. **Farm Dashboard — "Yield Trends" widget**: New line chart widget showing average yield/ha over the last 6 completed plantings
4. **Farm Settings — Configurable Alerts**: Alert thresholds and Farm Settings page, `alerts` Appwrite collection/table
5. **Alerts infrastructure**: Alerts list page, active alerts widget on Farm Dashboard, alert-generating logic for 5 alert types
6. **Farm Dashboard completion**: All widgets functional, final nav polish

**No schema changes to existing tables.** One new `farm_alerts` table is required for persistent alerts.

**Season Derivation Rule (Zambia, no season field on plantings):**

All season labeling is derived client-side from `planting_date`:
- **Wet Season**: planting_date month is November (11) through April (4) → label `"[Year]/[Year+1] Wet Season"` (e.g., `"2025/2026 Wet Season"`)
- **Dry Season**: planting_date month is May (5) through October (10) → label `"[Year] Dry Season"` (e.g., `"2025 Dry Season"`)

This derivation is a pure utility function — implement as `getSeason(plantingDate)` in `src/modules/farm/utils/farm-utils.js`.

---

## Prerequisites

- **Story 3.1** (done): Plots — `size_hectares`, `name`
- **Story 3.2** (done): Crops — `typical_yield_per_hectare`, `crop_type`, `growing_season`
- **Story 3.3** (done): Plantings — `area_used_hectares`, `planting_date`, `inputs_cost`, `labor_cost`, `other_cost`
- **Story 3.4** (done): Planting status — `status` (Completed, Failed)
- **Story 3.5** (done): Harvests — `total_quantity_kg`, `harvest_start_date`, `harvest_end_date`
- **Story 3.6** (done): Continuous picking — multiple harvests per planting
- **Story 3.7** (done): Harvest → Inventory — `inventory.planting_id`, `inventory.crop_id`
- **Story 3.8** (done): Farm sales — `farm_sales` table, `recordSale`, `fetchSales`
- **Story 3.9** (done): Profitability — `computePlotProfitability`, `computeCropPerformance`, `ensureProfitabilityDataLoaded`, `FarmReportsPage.vue` with Crop Performance tab, `PlotProfitabilityCard.vue`, `TopCropsWidget.vue`, `PlotProfitabilityWidget.vue`
- **`src/services/ReportExportService.js`** (from Story 2.8): PDF + CSV export utilities

---

## Schema Change

### New `farm_alerts` table

Add this table to `server/scripts/setup-appwrite.js` and document in `DATABASE_SCHEMA.md`.

```javascript
// In setup-appwrite.js farm tables section
{
  tableId: 'farm_alerts',
  name: 'farm_alerts',
  columns: [
    { key: 'alert_type',    type: 'string', required: true,  size: 50 },
    // Values: 'low_inventory' | 'upcoming_harvest' | 'overdue_harvest'
    //         | 'crop_failure' | 'underperforming_yield'
    { key: 'severity',      type: 'string', required: true,  size: 20 },
    // Values: 'info' | 'warning' | 'critical'
    { key: 'title',         type: 'string', required: true,  size: 200 },
    { key: 'message',       type: 'string', required: false, size: 1000 },
    { key: 'is_read',       type: 'boolean', required: true, default: false },
    { key: 'is_dismissed',  type: 'boolean', required: true, default: false },
    { key: 'triggered_at',  type: 'datetime', required: true },
    // Polymorphic reference — stores the $id of the related entity
    { key: 'related_entity_id',   type: 'string', required: false, size: 36 },
    { key: 'related_entity_type', type: 'string', required: false, size: 50 },
    // Values: 'plot' | 'planting' | 'harvest' | 'inventory'
  ],
  indexes: [
    { key: 'idx_alerts_is_read',    type: 'key',  attributes: ['is_read'] },
    { key: 'idx_alerts_alert_type', type: 'key',  attributes: ['alert_type'] },
    { key: 'idx_alerts_triggered',  type: 'key',  attributes: ['triggered_at'] },
  ],
}
```

> **Note**: There is no `farm_alert_settings` table. Alert thresholds are stored in `village_settings` (or `village_config`) as a JSON blob field `farm_alert_config`, or alternatively in Appwrite as a single document in a `settings` collection. See AC9 for implementation choice.

---

## Acceptance Criteria

### AC1: Yield Calculation Utility — `getSeason(date)` and `computeYieldPerHectare(harvest, planting, plot)`

- [ ] `getSeason(plantingDate)` added to `src/modules/farm/utils/farm-utils.js`:
  - Input: ISO date string or Date object
  - Returns: `{ label: string, type: 'wet' | 'dry', year: number }`
  - Wet Season (Nov–Apr): `label = "[startyear]/[endyear] Wet Season"`, e.g. `"2025/2026 Wet Season"`
  - Dry Season (May–Oct): `label = "[year] Dry Season"`, e.g. `"2025 Dry Season"`
  - Year for Wet Season: use the November year as `startyear`
- [ ] `computeYieldPerHectare(harvest, planting, plot)` added to `farm-utils.js`:
  - Uses `planting.area_used_hectares` if set and > 0, else falls back to `plot.size_hectares`
  - Returns `null` if hectares = 0 (do not divide by zero)
  - Returns `(harvest.total_quantity_kg / hectares)` rounded to 1 decimal
- [ ] Both functions exported and unit-testable (pure functions, no store dependency)

### AC2: Plot Detail Page — Yield Analysis Section

- [ ] `PlotDetailPage.vue` receives a new **"Yield Analysis"** card below the existing Profitability card (or as a new tab if the page already has tabs — follow existing layout patterns)
- [ ] Yield Analysis card shows:
  - **Yield per Planting table**: one row per *completed* planting on this plot, sorted by `planting_date` ascending, columns:
    | Planting Date | Crop | Season | Harvest Qty (kg) | Area (ha) | Yield (kg/ha) | Typical Yield (kg/ha) | vs. Typical |
  - **"vs. Typical"** column: `(actual / typical × 100)%` shown as colored percentage chip — green if ≥ 90%, yellow if 50–89%, red if < 50%
  - If crop has no `typical_yield_per_hectare` (null/0): show `"—"` in Typical and vs. Typical columns
  - **Average Yield (kg/ha)**: computed across all rows in the table, displayed in a summary stat chip above the table
  - **Yield Trend Chart**: Chart.js line chart showing yield/ha over time (x-axis = planting date, y-axis = kg/ha) with a dashed reference line at the crop's `typical_yield_per_hectare` (shown if all rows are the same crop; hidden if multiple crops)
  - Typical yield reference line only shown if there is exactly one unique crop in the table
- [ ] Empty state: "No completed harvests recorded for this plot yet."
- [ ] Loading state: spinner while `ensureYieldDataLoaded()` fetches
- [ ] Chart uses `shallowRef` and is destroyed on `onUnmounted` (consistent with Story 3.9 / `FarmReportsPage.vue`)

### AC3: Farm Reports Page — Add "Yield Analysis" Tab

- [ ] `FarmReportsPage.vue` gains a **second tab** "Yield Analysis" alongside the existing "Crop Performance" tab
  - **Do NOT remove or modify** the existing Crop Performance tab
  - Use `q-tabs` / `q-tab-panels` for the two-tab structure
  - Default selected tab remains "Crop Performance" to preserve existing behavior
- [ ] Yield Analysis tab contains a **Filter Bar** (same style as Crop Performance filter bar):
  - Season filter: dropdown listing all unique seasons derived from `planting_date` across all plantings
  - Plot filter: multi-select from `farmStore.plots`
  - Crop type filter: All / Annual / Perennial
  - Specific crop multi-select (same component as Crop Performance tab)
  - "Generate Report" button
- [ ] **Season Comparison Table**: one row per season × crop combination, columns:
  | Season | Crop | Plots | Total Plantings | Total Harvest (kg) | Total Area (ha) | Avg Yield (kg/ha) | Typical (kg/ha) | % of Typical | Best Plot | Worst Plot |
  - Rows color-coded: green if `avgYield ≥ 90%` of typical, yellow if `50–89%`, red if `< 50%`
  - If no typical yield: no color coding for that row
- [ ] **Plot Yield Benchmarking Table**: one row per plot, columns:
  | Plot Name | Avg Yield/Ha (all time) | Best Crop (by yield/ha) | Best Season | Plantings Count | Trend |
  - "Trend" column: ↑ (green) if last 3 plantings avg yield > preceding 3, ↓ (red) if lower, → (grey) if no change or insufficient data
- [ ] **Export buttons**: "Export PDF" and "Export CSV" for the Yield Analysis tab using `ReportExportService.js`

### AC4: Farm Store — New Yield Computation Actions

Add to `src/modules/farm/stores/farm-store.js`:

- [ ] **`computePlotYieldHistory(plotId)`** — synchronous (uses loaded state):
  ```javascript
  // Returns array sorted by planting_date ascending:
  // [{ plantingId, plantingDate, season, cropName, cropId, typicalYield,
  //    totalHarvestKg, areaHectares, yieldPerHectare, vsTypicalPct }]
  ```
  - Uses `getSeason(planting.planting_date)` from `farm-utils.js`
  - Only includes plantings with `status = 'Completed'` and at least one harvest
  - `areaHectares` = `planting.area_used_hectares || plot.size_hectares`
  - `yieldPerHectare` = `computeYieldPerHectare(harvest, planting, plot)`
  - `typicalYield` = `crop.typical_yield_per_hectare || null`
  - `vsTypicalPct` = `typicalYield ? Math.round((yieldPerHectare / typicalYield) * 100) : null`

- [ ] **`computeSeasonComparison(opts)`** — synchronous:
  ```javascript
  // opts: { season, plotIds, cropIds, cropType }
  // Returns array of { season, cropName, cropId, plotCount, totalPlantings,
  //                   totalHarvestKg, totalHectares, avgYieldPerHectare,
  //                   typicalYield, vsTypicalPct, bestPlotName, worstPlotName }
  ```

- [ ] **`computePlotYieldBenchmarks()`** — synchronous:
  ```javascript
  // Returns array of { plotId, plotName, avgYieldPerHectare, bestCropName,
  //                   bestSeasonLabel, plantingsCount, trend: 'up'|'down'|'stable'|'insufficient' }
  // trend: compare avg of last 3 completed plantings' yield/ha vs avg of the 3 before that
  ```

- [ ] **`computeAllPlantingYields()`** — synchronous: returns flat array of all plantings (completed) with yield/ha computed. Used for underperformance alert generation.

- [ ] **`ensureYieldDataLoaded()`** — async: ensures `plots`, `plantings`, `harvests`, `crops` are loaded. Reuses `ensureProfitabilityDataLoaded()` loaders (or calls it directly if crops+plots+plantings+harvests are a subset):
  ```javascript
  async ensureYieldDataLoaded() {
    const loaders = [];
    if (!this.plotsLoaded)     loaders.push(this.fetchPlots());
    if (!this.plantingsLoaded) loaders.push(this.fetchPlantings());
    if (!this.harvestsLoaded)  loaders.push(this.fetchHarvests());
    if (!this.cropsLoaded)     loaders.push(this.fetchCrops());
    if (loaders.length) await Promise.all(loaders);
  }
  ```
  > Check whether `ensureProfitabilityDataLoaded()` already covers these; if so, call it instead of duplicating.

### AC5: Farm Dashboard — "Yield Trends" Widget

- [ ] New component `src/modules/farm/components/YieldTrendsWidget.vue`
- [ ] Follows `WidgetBase.vue` / existing widget pattern (consistent with `TopCropsWidget`, `PlotProfitabilityWidget`)
- [ ] Shows a Chart.js line chart: x-axis = last 6 completed plantings (across all plots, sorted by `planting_date`), y-axis = average yield/ha for that planting
  - Data: `computeAllPlantingYields()` sorted by `planting_date` descending, take last 6 completed, reverse to chronological order
  - Line color: primary Quasar theme color
  - Each point labeled with crop name (via `tooltip.callbacks.label`)
- [ ] Widget header: "Yield Trends" with subtitle "Last 6 completed plantings"
- [ ] Clicking widget title navigates to `/farm/reports` (opens on Yield Analysis tab via query param `?tab=yield`)
- [ ] Empty state: "Complete harvests to see yield trends"
- [ ] Added to `FarmDashboardPage.vue` widgets row (additive — do not remove any existing Story 3.9 widgets)

### AC6: Underperforming Yield Flagging

- [ ] Plantings (on PlotDetailPage yield table and on FarmReportsPage Yield Analysis tab) where `vsTypicalPct < 50` are flagged with a red **"Underperforming"** badge/chip
- [ ] Plantings where `vsTypicalPct` is between 50 and 89 are flagged with a yellow **"Below Average"** chip
- [ ] Plantings at ≥ 90% of typical yield show a green **"On Target"** chip
- [ ] If no `typical_yield_per_hectare` on the crop: no badge shown (show `"—"`)
- [ ] Farm Reports → Yield Analysis tab shows a summary count: `"X plantings underperforming (< 50% typical yield)"`

### AC7: Farm Settings Page — Alerts Configuration

- [ ] New page `src/modules/farm/pages/FarmSettingsPage.vue` at route `/farm/settings`
  - Route requires `farm:admin` permission (same as Crop DB admin routes)
  - Linked from `FarmDashboardPage.vue` Quick Navigation cards (additive link)
  - Linked from `MainLayout.vue` Farm section nav (if a "Farm Settings" entry doesn't exist — check first)
- [ ] Farm Settings page has an **"Alerts Configuration"** section with a `q-list` of configurable alert types:

  | Alert Type | Configurable Threshold | Default |
  |---|---|---|
  | **Low Farm Input Inventory** | Trigger when any farm input item falls below N kg/units | 10 |
  | **Upcoming Harvest** | Notify X days before expected harvest date | 7 |
  | **Overdue Harvest** | Notify when harvest is X days past expected date | 7 |
  | **Underperforming Yield** | Notify when yield is < N % of typical yield | 50 |

  - Each threshold is an editable number input inline in the list
  - A boolean toggle "Enable" for each alert type
  - "Save Alert Settings" button persists the config (see AC8 for storage)
- [ ] **Alert Delivery Methods** section:
  - In-App Notifications: always enabled (read-only toggle, always ON)
  - Email Notifications: toggle (default OFF); if toggled ON, show informational chip: "Email requires SMTP configuration — see docs/POST-MVP.md"
  - Do NOT implement email sending in this story; the toggle is stored but email is deferred to POST-MVP

### AC8: Alert Settings Storage

Two options exist for storing alert thresholds. **Use Option A:**

**Option A** (recommended): Store alert config as a single Appwrite document in the existing `village_config` collection under a new field `farm_alert_config` (JSON string, optional). If `village_config` cannot store arbitrary JSON fields, create a simple key-value document in `settings` collection keyed `'farm_alert_config'`.

- [ ] `useFarmAlertStore.js` (Pinia store, new file) or add to `farm-store.js` as `alertConfig` state:
  ```javascript
  // Default config — used if nothing is saved
  const DEFAULT_ALERT_CONFIG = {
    low_inventory:         { enabled: true,  threshold: 10 },
    upcoming_harvest:      { enabled: true,  threshold: 7 },
    overdue_harvest:       { enabled: true,  threshold: 7 },
    underperforming_yield: { enabled: true,  threshold: 50 },
    email_enabled:         false,
  };
  ```
- [ ] `fetchAlertConfig()` — loads from Appwrite (or returns defaults if not set)
- [ ] `saveAlertConfig(config)` — upserts to Appwrite
- [ ] `FarmSettingsPage` calls `fetchAlertConfig` on mount, binds form to local copy, saves on button click
- [ ] If using `village_config`, verify the existing `village-settings-store.js` or `village-config` store to avoid conflicts. Do not duplicate village config loading — reuse existing patterns.

> **Decision point for implementer**: Check `src/stores/` for existing village config store. If `village_config` has a `settings` object or JSON field, prefer adding `farm_alert_config` there. If not, create a minimal `farm_alert_config` document in a `app_settings` collection (or reuse the existing one if it exists).

### AC9: Alert Generation Logic

- [ ] New action `generateFarmAlerts()` in `farm-store.js` (or `useFarmAlertStore.js`):
  - Computes alerts by scanning loaded Pinia state (synchronous after data load)
  - Returns array of alert objects (does NOT write to Appwrite — alerts are generated fresh each evaluation)
  - **Alert type implementations:**

    **1. Upcoming Harvest** (`alert_type: 'upcoming_harvest'`, `severity: 'info'`):
    ```
    For each planting with status = 'Planted' or 'Growing':
      daysUntil = diff(expected_harvest_date, today) in days
      if daysUntil >= 0 && daysUntil <= config.upcoming_harvest.threshold:
        title: "[Crop] on [Plot] — Harvest in [daysUntil] days"
        related_entity_type: 'planting', related_entity_id: planting.$id
    ```

    **2. Overdue Harvest** (`alert_type: 'overdue_harvest'`, `severity: 'warning'`):
    ```
    For each planting with status = 'Growing' or 'Harvesting':
      daysOverdue = diff(today, expected_harvest_date) in days  [positive = overdue]
      if daysOverdue > config.overdue_harvest.threshold:
        title: "[Crop] on [Plot] — Harvest [daysOverdue] days overdue"
        severity: daysOverdue > 14 ? 'critical' : 'warning'
        related_entity_type: 'planting'
    ```

    **3. Low Farm Input Inventory** (`alert_type: 'low_inventory'`, `severity: 'warning'`):
    ```
    Requires inventoryStore.items to be loaded (farm_inputs type only)
    For each item with item_type = 'farm_inputs':
      if item.quantity <= config.low_inventory.threshold:
        title: "Low Stock: [item_name] — [quantity] [unit] remaining"
        severity: item.quantity <= 0 ? 'critical' : 'warning'
        related_entity_type: 'inventory', related_entity_id: item.$id
    ```

    **4. Underperforming Yield** (`alert_type: 'underperforming_yield'`, `severity: 'warning'`):
    ```
    For each completed planting with a computed yieldPerHectare:
      if crop.typical_yield_per_hectare > 0 &&
         (yieldPerHectare / typical) * 100 < config.underperforming_yield.threshold:
        title: "[Crop] on [Plot] — Yield [X]% of typical ([actual] vs [typical] kg/ha)"
        related_entity_type: 'planting'
    ```

    **5. Crop Failure** (`alert_type: 'crop_failure'`, `severity: 'critical'`):
    ```
    For each planting with status changed to 'Failed' in the last 30 days:
      title: "Crop Failure: [Crop] on [Plot] — [failure_reason]"
      related_entity_type: 'planting'
    ```
    > Note: "last 30 days" filter: check `planting.updated_at` or `planting.failure_date` if available. If no failure timestamp exists, show all Failed plantings (Farm Manager may see old ones — acceptable for MVP).

- [ ] `generateFarmAlerts()` respects the `enabled` flag per alert type — disabled types produce no alerts
- [ ] Alerts are **not persisted** to Appwrite in this story (generation is always fresh from state). The `farm_alerts` table is created in the schema for future use (persistent alerts, email delivery) but all alert display is from the generated in-memory array. Document the persistent-alerts migration path in `POST-MVP.md`.

### AC10: Active Alerts Widget on Farm Dashboard

- [ ] New component `src/modules/farm/components/FarmAlertsWidget.vue`
- [ ] Shows up to 5 most critical unread alerts (sorted: critical first, then warning, then info, then by triggered_at descending)
- [ ] Each alert row shows:
  - Severity icon: `error` (red) for critical, `warning` (yellow/orange) for warning, `info` (blue) for info
  - Alert title (truncated at 80 chars with tooltip for full text)
  - Formatted relative time ("2 days ago", "Today")
  - "View" button navigating to the `related_entity_type`/`related_entity_id` (e.g., `/farm/plantings/:id` for planting alerts, `/inventory/:id` for inventory alerts)
- [ ] Widget header: "Active Alerts" with a count badge showing total unread critical+warning alerts
- [ ] Widget footer: "View All Alerts" link to `/farm/alerts` list page
- [ ] Empty state: "No active alerts — farm operations running normally" (with green checkmark icon)
- [ ] Added to `FarmDashboardPage.vue` widgets row, spanning full width (`col-12`) if alert count > 0, else `col-12 col-md-6`

### AC11: Alerts List Page

- [ ] New page `src/modules/farm/pages/FarmAlertsPage.vue` at route `/farm/alerts`
  - Route requires `farm:read` permission
  - Link in `MainLayout.vue` Farm section nav (only show if count > 0 as badge, link always visible)
- [ ] Table columns: Severity (icon + label), Type, Title, Triggered At, Related Entity (link), Actions
- [ ] Filters: Alert Type, Severity, Date Range (triggered_at)
- [ ] Actions per row: "Mark as Read" (in-memory only, dismisses from active display), "Go to [Entity]"
- [ ] "Mark All as Read" button above the table
- [ ] **Alert regeneration**: "Refresh Alerts" button at top of page triggers `generateFarmAlerts()` and refreshes the list
- [ ] Read/unread state is **session-only** (in-memory, not persisted for MVP) — alerts regenerate fresh on each page load

### AC12: Farm Dashboard Completion

This AC marks the final completion of the Farm Dashboard.

- [ ] **All widgets functional and visible:**
  - Row 1: `PlotsOverviewWidget`, `PlantingStatusWidget`, `ActivePerennialsWidget`, `RecentHarvestsWidget`
  - Row 2: `FarmProduceWidget`, `RecentSalesWidget`, `TopCropsWidget` (3.9), `PlotProfitabilityWidget` (3.9)
  - Row 3: `YieldTrendsWidget` (new), `FarmAlertsWidget` (new)
  - All existing widgets preserved; new widgets added additively
- [ ] **Dashboard loads within 2 seconds** on a warm Appwrite connection with sample data
  - Achieve by parallelizing all widget data loads (`Promise.all` of independent fetches)
  - Each widget must show a loading skeleton (`q-skeleton`) while fetching, not a blank space
- [ ] **Mobile-responsive**: all widgets stack to `col-12` on mobile (320px+), no horizontal overflow
- [ ] **Quick Navigation cards** updated: add "Farm Settings" and "Alerts" cards to `moduleLinks` array in `FarmDashboardPage.vue`
- [ ] **Navigation polish**: `MainLayout.vue` Farm section nav verified to include all routes:
  - Farm Dashboard, Plots, Crops Database, Plantings, Harvests, Sales, Reports, Alerts, Farm Settings
  - No duplicate entries; correct permission guards (`farm:read` vs `farm:admin`)

### AC13: Sample Data Updates

- [ ] `src/composables/useFarmSampleData.js` updated to ensure sample data exercises all new features:
  - At least 2 plantings with `area_used_hectares` set (for accurate yield/ha — some already exist)
  - At least 1 planting where actual yield < 50% of `typical_yield_per_hectare` (for "Underperforming" demo)
    - Example: a failed/poor maize crop yielding 500 kg/ha against typical 3500 kg/ha
  - At least 2 plantings from different seasons (one Wet, one Dry) for season comparison demo
  - Sample data must produce at least 1 alert in each category when `generateFarmAlerts()` runs:
    - At least 1 planting with `status = 'Growing'` and `expected_harvest_date` within 7 days of the sample data's "today" reference OR overdue by 7+ days
    - At least 1 farm input inventory item with quantity ≤ 10
    - **Note**: Review existing sample data first — `p_tomato_harvesting` may already satisfy upcoming harvest; `p_groundnut_growing` may satisfy growing status. Add a planting with `expected_harvest_date = today + 5 days` using a relative date to ensure the upcoming harvest alert always fires

---

## Technical Implementation Notes

### Tab Navigation in FarmReportsPage

```vue
<!-- In FarmReportsPage.vue — wrap existing content in tabs -->
<q-tabs v-model="activeTab" dense align="left" class="q-mb-md">
  <q-tab name="crop_performance" label="Crop Performance" icon="bar_chart" />
  <q-tab name="yield_analysis"   label="Yield Analysis"  icon="show_chart" />
</q-tabs>

<q-tab-panels v-model="activeTab" animated>
  <q-tab-panel name="crop_performance">
    <!-- EXISTING crop performance content — move here verbatim -->
  </q-tab-panel>
  <q-tab-panel name="yield_analysis">
    <!-- NEW yield analysis content -->
  </q-tab-panel>
</q-tab-panels>
```

Support deep-linking via query param: on mount, if `route.query.tab === 'yield'`, set `activeTab = 'yield_analysis'`. This allows the YieldTrendsWidget to link directly to the yield tab.

### `getSeason` Implementation

```javascript
// src/modules/farm/utils/farm-utils.js — add export

/**
 * Derive the Zambian agricultural season from a planting date.
 * Wet Season: Nov–Apr. Dry Season: May–Oct.
 *
 * @param {string|Date} plantingDate
 * @returns {{ label: string, type: 'wet'|'dry', startYear: number }}
 */
export function getSeason(plantingDate) {
  const d = typeof plantingDate === 'string' ? new Date(plantingDate) : plantingDate;
  const month = d.getMonth() + 1; // 1-indexed
  const year  = d.getFullYear();

  if (month >= 11 || month <= 4) {
    // Wet Season: Nov of startYear → Apr of endYear
    const startYear = month >= 11 ? year : year - 1;
    return {
      label: `${startYear}/${startYear + 1} Wet Season`,
      type: 'wet',
      startYear,
    };
  } else {
    // Dry Season: May–Oct of same year
    return {
      label: `${year} Dry Season`,
      type: 'dry',
      startYear: year,
    };
  }
}
```

### `computePlotYieldHistory` Implementation Pattern

```javascript
// In farm-store.js
computePlotYieldHistory(plotId) {
  const plot = this.plots.find(p => p.$id === plotId);
  if (!plot) return [];

  return this.plantings
    .filter(p => {
      const pid = typeof p.plot_id === 'object' ? p.plot_id?.$id : p.plot_id;
      return pid === plotId && p.status?.toLowerCase() === 'completed';
    })
    .sort((a, b) => new Date(a.planting_date) - new Date(b.planting_date))
    .map(planting => {
      const cropId = typeof planting.crop_id === 'object'
        ? planting.crop_id?.$id : planting.crop_id;
      const crop = this.crops.find(c => c.$id === cropId);

      const plantingHarvests = this.harvestsByPlanting(planting.$id);
      const totalKg = plantingHarvests.reduce(
        (sum, h) => sum + (Number(h.total_quantity_kg) || 0), 0
      );

      const areaHa = Number(planting.area_used_hectares || plot.size_hectares || 0);
      const yieldPerHa = (areaHa > 0 && totalKg > 0)
        ? Math.round((totalKg / areaHa) * 10) / 10
        : null;

      const typicalYield = Number(crop?.typical_yield_per_hectare || 0) || null;
      const vsTypicalPct = (typicalYield && yieldPerHa !== null)
        ? Math.round((yieldPerHa / typicalYield) * 100)
        : null;

      const season = getSeason(planting.planting_date);

      return {
        plantingId:       planting.$id,
        plantingDate:     planting.planting_date,
        season:           season.label,
        cropName:         crop?.crop_name || 'Unknown',
        cropId,
        typicalYield,
        totalHarvestKg:   totalKg,
        areaHectares:     areaHa,
        yieldPerHectare:  yieldPerHa,
        vsTypicalPct,
      };
    })
    .filter(r => r.totalHarvestKg > 0); // exclude zero-harvest completions
},
```

### `generateFarmAlerts` Implementation Pattern

```javascript
// In farm-store.js (or useFarmAlertStore.js)
generateFarmAlerts(config = DEFAULT_ALERT_CONFIG) {
  const alerts = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Upcoming Harvest
  if (config.upcoming_harvest?.enabled) {
    const threshold = config.upcoming_harvest.threshold ?? 7;
    for (const p of this.plantings) {
      if (!['Planted', 'Growing'].includes(p.status)) continue;
      if (!p.expected_harvest_date) continue;
      const harvestDate = new Date(p.expected_harvest_date);
      harvestDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((harvestDate - today) / 86400000);
      if (daysUntil >= 0 && daysUntil <= threshold) {
        const plotId  = typeof p.plot_id  === 'object' ? p.plot_id?.$id  : p.plot_id;
        const cropId  = typeof p.crop_id  === 'object' ? p.crop_id?.$id  : p.crop_id;
        const plot    = this.plots.find(pl => pl.$id === plotId);
        const crop    = this.crops.find(c  => c.$id  === cropId);
        alerts.push({
          alert_type: 'upcoming_harvest',
          severity: 'info',
          title: `${crop?.crop_name || 'Crop'} on ${plot?.name || 'plot'} — Harvest in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
          related_entity_type: 'planting',
          related_entity_id: p.$id,
          triggered_at: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Overdue Harvest
  if (config.overdue_harvest?.enabled) {
    const threshold = config.overdue_harvest.threshold ?? 7;
    for (const p of this.plantings) {
      if (!['Growing', 'Harvesting'].includes(p.status)) continue;
      if (!p.expected_harvest_date) continue;
      const harvestDate = new Date(p.expected_harvest_date);
      harvestDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.round((today - harvestDate) / 86400000);
      if (daysOverdue > threshold) {
        const plotId  = typeof p.plot_id  === 'object' ? p.plot_id?.$id  : p.plot_id;
        const cropId  = typeof p.crop_id  === 'object' ? p.crop_id?.$id  : p.crop_id;
        const plot    = this.plots.find(pl => pl.$id === plotId);
        const crop    = this.crops.find(c  => c.$id  === cropId);
        alerts.push({
          alert_type: 'overdue_harvest',
          severity: daysOverdue > 14 ? 'critical' : 'warning',
          title: `${crop?.crop_name || 'Crop'} on ${plot?.name || 'plot'} — Harvest ${daysOverdue} days overdue`,
          related_entity_type: 'planting',
          related_entity_id: p.$id,
          triggered_at: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Low Farm Input Inventory
  if (config.low_inventory?.enabled) {
    const inventoryStore = useInventoryStore();
    const threshold = config.low_inventory.threshold ?? 10;
    const inputs = inventoryStore.items.filter(i => i.item_type === 'farm_inputs');
    for (const item of inputs) {
      if ((Number(item.quantity) || 0) <= threshold) {
        alerts.push({
          alert_type: 'low_inventory',
          severity: (Number(item.quantity) || 0) <= 0 ? 'critical' : 'warning',
          title: `Low Stock: ${item.item_name} — ${item.quantity} ${item.unit} remaining`,
          related_entity_type: 'inventory',
          related_entity_id: item.$id,
          triggered_at: new Date().toISOString(),
        });
      }
    }
  }

  // 4. Underperforming Yield
  if (config.underperforming_yield?.enabled) {
    const threshold = config.underperforming_yield.threshold ?? 50;
    const yieldHistory = this.computeAllPlantingYields();
    for (const r of yieldHistory) {
      if (r.vsTypicalPct !== null && r.vsTypicalPct < threshold) {
        const plot = this.plots.find(pl => pl.$id === (
          typeof this.plantings.find(p => p.$id === r.plantingId)?.plot_id === 'object'
            ? this.plantings.find(p => p.$id === r.plantingId)?.plot_id?.$id
            : this.plantings.find(p => p.$id === r.plantingId)?.plot_id
        ));
        alerts.push({
          alert_type: 'underperforming_yield',
          severity: 'warning',
          title: `${r.cropName} on ${plot?.name || 'plot'} — Yield ${r.vsTypicalPct}% of typical (${r.yieldPerHectare} vs ${r.typicalYield} kg/ha)`,
          related_entity_type: 'planting',
          related_entity_id: r.plantingId,
          triggered_at: new Date().toISOString(),
        });
      }
    }
  }

  // 5. Crop Failure (last 30 days)
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  for (const p of this.plantings.filter(p => p.status === 'Failed')) {
    // Use $updatedAt (Appwrite system field) if available, otherwise include all Failed
    const updatedAt = p.$updatedAt ? new Date(p.$updatedAt) : null;
    if (updatedAt && updatedAt < thirtyDaysAgo) continue;

    const plotId = typeof p.plot_id === 'object' ? p.plot_id?.$id : p.plot_id;
    const cropId = typeof p.crop_id === 'object' ? p.crop_id?.$id : p.crop_id;
    const plot   = this.plots.find(pl => pl.$id === plotId);
    const crop   = this.crops.find(c  => c.$id  === cropId);
    alerts.push({
      alert_type: 'crop_failure',
      severity: 'critical',
      title: `Crop Failure: ${crop?.crop_name || 'Crop'} on ${plot?.name || 'plot'}${p.failure_reason ? ' — ' + p.failure_reason : ''}`,
      related_entity_type: 'planting',
      related_entity_id: p.$id,
      triggered_at: p.$updatedAt || new Date().toISOString(),
    });
  }

  return alerts;
},
```

### Alert Config Storage (Village Config approach)

```javascript
// Option: Store as JSON in village_config.farm_alert_config
// Check src/stores/village-settings-store.js for existing pattern

// If village_config supports arbitrary fields, add:
async fetchAlertConfig() {
  try {
    const config = await villageConfigStore.getConfig();
    const raw = config?.farm_alert_config;
    return raw ? JSON.parse(raw) : { ...DEFAULT_ALERT_CONFIG };
  } catch {
    return { ...DEFAULT_ALERT_CONFIG };
  }
},

async saveAlertConfig(alertConfig) {
  await villageConfigStore.updateConfig({
    farm_alert_config: JSON.stringify(alertConfig),
  });
},
```

> **Implementer**: Check `src/stores/` for `village-settings-store.js`, `village-config-store.js`, or similar. If `village_config` collection has a size-limited string field that can't hold JSON, use a separate `app_settings` collection document with `key = 'farm_alert_config'` and `value = JSON.stringify(config)`.

### Chart.js Pattern for Yield Trends Line Chart

```javascript
// In YieldTrendsWidget.vue
import { shallowRef, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';

const chartRef = ref(null);
const chart = shallowRef(null);

function renderChart(data) {
  if (chart.value) { chart.value.destroy(); chart.value = null; }
  if (!chartRef.value || !data.length) return;

  chart.value = new Chart(chartRef.value, {
    type: 'line',
    data: {
      labels: data.map(d => `${d.cropName} (${d.season.split(' ')[0]})`),
      datasets: [{
        label: 'Yield (kg/ha)',
        data: data.map(d => d.yieldPerHectare),
        borderColor: 'rgba(33, 150, 243, 0.9)',
        backgroundColor: 'rgba(33, 150, 243, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw} kg/ha`,
          },
        },
      },
      scales: {
        y: { beginAtZero: false, title: { display: true, text: 'kg/ha' } },
      },
    },
  });
}

onUnmounted(() => { if (chart.value) chart.value.destroy(); });
```

---

## Files to Create

| File | Purpose |
|---|---|
| `src/modules/farm/pages/FarmSettingsPage.vue` | Farm Settings page with Alerts Configuration section |
| `src/modules/farm/pages/FarmAlertsPage.vue` | Alerts list page with filters and mark-as-read |
| `src/modules/farm/components/YieldTrendsWidget.vue` | Dashboard widget: yield/ha line chart (last 6 plantings) |
| `src/modules/farm/components/FarmAlertsWidget.vue` | Dashboard widget: top 5 active alerts |

---

## Files to Modify

| File | Changes |
|---|---|
| `server/scripts/setup-appwrite.js` | Add `farm_alerts` table definition |
| `DATABASE_SCHEMA.md` | Document `farm_alerts` table; add `getSeason()` derivation note |
| `src/modules/farm/utils/farm-utils.js` | Add `getSeason()` and `computeYieldPerHectare()` exports |
| `src/modules/farm/stores/farm-store.js` | Add `computePlotYieldHistory`, `computeSeasonComparison`, `computePlotYieldBenchmarks`, `computeAllPlantingYields`, `ensureYieldDataLoaded`, `generateFarmAlerts`, `fetchAlertConfig`, `saveAlertConfig`; add `alertConfig` state |
| `src/modules/farm/pages/PlotDetailPage.vue` | Add Yield Analysis card/section below Profitability card |
| `src/modules/farm/pages/FarmReportsPage.vue` | Add second "Yield Analysis" tab with season comparison and plot benchmarking tables; support `?tab=yield` deep link |
| `src/modules/farm/pages/FarmDashboardPage.vue` | Add `YieldTrendsWidget` and `FarmAlertsWidget`; add Farm Settings and Alerts to `moduleLinks` quick nav |
| `src/modules/farm/router.js` | Add `/farm/settings` (farm:admin) and `/farm/alerts` (farm:read) routes |
| `src/layouts/MainLayout.vue` | Add Farm Settings and Alerts nav entries under Farm section |
| `src/composables/useFarmSampleData.js` | Ensure at least 1 underperforming planting, 2 different seasons, and upcoming-harvest trigger in sample data |
| `docs/POST-MVP.md` | Add: persistent alert storage, email delivery, alert dismissal persistence, alert-to-calendar event integration |
| `docs/sprint-status.yaml` | Update `3-10-...` from `backlog` to `in-progress`; remove/update `3-11-...` entry (3.11 is now absorbed into 3.10) |

---

## Areas of Concern and Mitigations

### ⚠️ Concern 1: FarmReportsPage Refactor Risk — Tab Wrapping Existing Content

**Problem**: Story 3.9 built `FarmReportsPage.vue` with the Crop Performance content at the root level (not inside a tab panel). Wrapping it in a `q-tab-panels` requires restructuring the template significantly. Any mistake risks breaking the existing Crop Performance report.

**Mitigation**: 
1. Read the full `FarmReportsPage.vue` before modifying.
2. Move the existing filter bar + table + chart into a `<q-tab-panel name="crop_performance">` block **verbatim** without any other changes.
3. Only add the new `<q-tab-panel name="yield_analysis">` for new content.
4. Test: navigate to `/farm/reports` after modification and verify Crop Performance still works identically.
5. Use `activeTab = 'crop_performance'` as the `v-model` default to preserve default behavior.

### ⚠️ Concern 2: `generateFarmAlerts` Depends on Multiple Stores

**Problem**: Alert generation for `low_inventory` requires `inventoryStore.items` to be loaded (farm_inputs type). If inventory hasn't been fetched, the low inventory alert will never fire even if stock is critically low.

**Mitigation**: 
- `FarmAlertsWidget.vue` and `FarmAlertsPage.vue` must call a composite data loader that includes inventory farm inputs alongside farm data.
- Add to `ensureYieldDataLoaded()` (or a new `ensureAlertsDataLoaded()`):
  ```javascript
  if (!inventoryStore.farmInputsLoaded) {
    loaders.push(inventoryStore.fetchItems({ itemType: 'farm_inputs' }));
  }
  ```
- Check whether `inventoryStore` has a `farmInputsLoaded` flag or use a generic check.

### ⚠️ Concern 3: Alert Config Storage — Village Config Field Size

**Problem**: If `village_config.farm_alert_config` is stored as a `string` column with a size limit (e.g., 255 chars), the JSON config blob may exceed it.

**Mitigation**: The default config serializes to ~200 chars — should fit in a 255-char field. If size is 1000+, no issue. Check `setup-appwrite.js` for `village_config` column definitions. If the column doesn't exist yet, add it with `size: 2000`. If village_config uses a different storage mechanism, use the `app_settings` key-value fallback documented in AC8.

### ⚠️ Concern 4: `computeAllPlantingYields` Used by Both Alerts and Plot Detail

**Problem**: Both `generateFarmAlerts` (for underperforming yield alerts) and `computePlotYieldHistory` iterate plantings. Duplicating the yield computation logic risks inconsistency.

**Mitigation**: Implement `computeAllPlantingYields()` as the base computation that iterates ALL completed plantings (across all plots). Then `computePlotYieldHistory(plotId)` filters the result of `computeAllPlantingYields()` by plot. Do NOT have two independent implementations of the same logic.

```javascript
computeAllPlantingYields() {
  // Returns same shape as computePlotYieldHistory but for ALL plots
  return this.plantings
    .filter(p => p.status?.toLowerCase() === 'completed')
    .map(planting => {
      // ... same derivation as computePlotYieldHistory ...
    })
    .filter(r => r.totalHarvestKg > 0);
},

computePlotYieldHistory(plotId) {
  return this.computeAllPlantingYields()
    .filter(r => {
      const p = this.plantings.find(pl => pl.$id === r.plantingId);
      const pid = typeof p?.plot_id === 'object' ? p?.plot_id?.$id : p?.plot_id;
      return pid === plotId;
    })
    .sort((a, b) => new Date(a.plantingDate) - new Date(b.plantingDate));
},
```

### ⚠️ Concern 5: Sprint Status File — 3.11 Key Mismatch

**Problem**: `docs/sprint-status.yaml` contains `3-11-farm-module-agronomic-insights-and-recommendations` — but `epics.md` says 3.11 is "Configurable Alerts and Farm Dashboard Completion". These are now absorbed into 3.10. The 3-11 sprint key must be updated/removed and the epic summary in `epics.md` updated to reflect 10 stories instead of 11.

**Mitigation**: 
- In `docs/sprint-status.yaml`: change `3-10` from `backlog` to `in-progress`; mark `3-11` as `optional` or remove it.
- In `docs/epics.md`: update the Epic 3 story count from 11 to 10 in the summary header.
- Do NOT remove Story 3.11 content from `epics.md` — leave it as a reference but add a note: "Merged into Story 3.10".

### ⚠️ Concern 6: `expected_harvest_date` May Be String or Date Object

**Problem**: `planting.expected_harvest_date` from Appwrite is an ISO datetime string. The upcoming/overdue alert calculations require accurate day-level comparison. Timezone issues can cause off-by-one errors.

**Mitigation**: Use `date-fns` consistently for date math (already installed per `architecture.md`). The `differenceInCalendarDays` function handles timezone-safe day comparisons:
```javascript
import { differenceInCalendarDays, parseISO } from 'date-fns';
const harvestDate = parseISO(p.expected_harvest_date);
const daysUntil = differenceInCalendarDays(harvestDate, today);
```
Use this pattern instead of raw millisecond math in the alert generator.

---

## Testing Checklist

### Yield Analysis

**Test 1: getSeason Utility**
1. Call `getSeason('2025-11-15')` → expect `{ label: '2025/2026 Wet Season', type: 'wet' }`
2. Call `getSeason('2025-03-01')` → expect `{ label: '2024/2025 Wet Season', type: 'wet' }` (April is still wet, March of 2025 belongs to 2024/2025 wet season)
3. Call `getSeason('2025-07-10')` → expect `{ label: '2025 Dry Season', type: 'dry' }`
4. Call `getSeason('2025-04-30')` → expect `{ label: '2024/2025 Wet Season', type: 'wet' }`

**Test 2: Plot Detail — Yield Analysis Card**
1. Navigate to a plot with at least 2 completed plantings
2. Verify Yield Analysis card appears below Profitability card
3. Verify table shows correct `yieldPerHectare` = `total_kg / area_ha` (spot check with sample data)
4. Verify "Underperforming" badge on rows where actual < 50% typical
5. Verify line chart renders with correct number of data points

**Test 3: Yield Analysis Tab — Season Comparison**
1. Navigate to `/farm/reports`, click "Yield Analysis" tab
2. Click "Generate Report"
3. Verify Season Comparison table shows rows grouped by season × crop
4. Verify color coding: red for < 50% typical, yellow for 50–89%, green for ≥ 90%
5. Verify "Export CSV" downloads a CSV with season comparison data

**Test 4: Plot Yield Benchmarking**
1. On Yield Analysis tab, verify Plot Benchmarking table shows all plots
2. Verify Trend column: ↑/↓/→ based on last 3 vs prior 3 plantings
3. For a plot with only 1 completed planting: verify Trend shows "—" (insufficient data)

### Alerts

**Test 5: Alert Generation — Upcoming Harvest**
1. Ensure sample data has a planting with `expected_harvest_date` within 7 days
2. Navigate to `/farm/alerts`
3. Click "Refresh Alerts"
4. Verify "Upcoming Harvest" alert appears with correct crop/plot name and days count

**Test 6: Alert Generation — Overdue Harvest**
1. Ensure sample data has a planting in status "Growing" with `expected_harvest_date` > 7 days ago
2. Refresh alerts
3. Verify "Overdue Harvest" warning appears; verify "critical" severity if > 14 days

**Test 7: Alert Generation — Low Inventory**
1. Ensure sample data has a farm input item with quantity ≤ 10
2. Refresh alerts
3. Verify "Low Stock" warning appears with correct item name and quantity

**Test 8: Alert Generation — Underperforming Yield**
1. Ensure sample data has a completed planting with yield < 50% of typical
2. Refresh alerts
3. Verify "Underperforming Yield" warning appears with correct percentage

**Test 9: Alert Generation — Crop Failure**
1. Ensure sample data has at least 1 planting with `status = 'Failed'`
2. Refresh alerts
3. Verify "Crop Failure" critical alert appears

**Test 10: Alerts Widget on Dashboard**
1. Navigate to Farm Dashboard
2. Verify FarmAlertsWidget is visible
3. Verify it shows up to 5 alerts sorted critical-first
4. Click "Go to [Entity]" — verify correct navigation (e.g., to planting detail)
5. Click "View All Alerts" — verify navigates to `/farm/alerts`

**Test 11: Alert Config — Settings Page**
1. Navigate to `/farm/settings`
2. Verify all 4 alert types listed with toggle and threshold input
3. Change "Upcoming Harvest" threshold from 7 to 3
4. Click "Save Alert Settings"
5. Navigate away and back — verify threshold persisted (still 3)
6. Generate alerts — verify upcoming harvest now only fires within 3 days

### Farm Dashboard Completion

**Test 12: All Widgets Present**
1. Navigate to Farm Dashboard
2. Verify 10 widgets visible: PlotsOverview, PlantingStatus, ActivePerennials, RecentHarvests, FarmProduce, RecentSales, TopCrops, PlotProfitability, YieldTrends, FarmAlerts
3. None show a persistent error state
4. All show loading skeleton (q-skeleton) on initial load, then content

**Test 13: Mobile Responsiveness**
1. Open Farm Dashboard at 375px viewport width
2. Verify all widgets stack to full width
3. Verify no horizontal scrolling
4. Verify touch targets ≥ 44px for all buttons

**Test 14: Quick Navigation Cards**
1. Verify "Farm Settings" and "Alerts" cards in Quick Navigation section
2. Verify all existing nav cards still present (Plots, Crops, Plantings, etc.)

---

## Dependencies on Other Stories

| This Story | Depends On | Notes |
|---|---|---|
| 3.10 (combined) | 3.1–3.9 (all farm) | Final Epic 3 story |
| 3.10 | 2.6 (inventory) | Needed for low inventory alerts |
| 3.10 | 1.8 (village config) | Needed for alert config storage |
| Future 5.1 (Calendar) | 3.10 | Alerts should eventually create calendar events |

---

## POST-MVP Items

The following items should be added to `docs/POST-MVP.md`:

1. **Persistent alert storage in `farm_alerts` table** — `generateFarmAlerts()` currently generates ephemeral in-memory alerts. The `farm_alerts` table created in this story supports future persistent storage: save generated alerts with deduplication (alert type + entity ID + date), allow dismissal that persists across sessions, support alert history/audit log.

2. **Alert-to-calendar event integration** — Upcoming harvest alerts should optionally create calendar events (Story 5.1 prerequisite). When calendar module is live, add a "Create Calendar Event" button on harvest alerts.

3. **Email notification delivery** — The email toggle in Farm Settings is stored but not wired. Future: integrate with SMTP via Appwrite Email service or a Cloud Function. Email should throttle to 1 per alert type per day.

4. **Alert deduplication and snooze** — Current implementation regenerates all alerts fresh on each page load. Add deduplication (don't show same alert twice if already dismissed) and snooze functionality (remind again in X days).

5. **`getSeason` localization** — The Wet/Dry season derivation is hardcoded for Zambia (Eastern Province). Future: make season boundaries configurable in Farm Settings so other regions can adapt.

6. **Yield benchmarking against regional data** — Currently benchmarks only against `typical_yield_per_hectare` from the crops database. Future: integrate external benchmark data (e.g., Zambia Ministry of Agriculture averages by region/year) for more meaningful comparison.

---

## References

- `docs/epics.md` lines 635–671: Story 3.10 and 3.11 original acceptance criteria
- `docs/PRD.md` FR-10: Farm Management - Analytics and Reporting
- `src/modules/farm/pages/FarmReportsPage.vue`: Existing Crop Performance tab — extend without breaking
- `src/modules/farm/stores/farm-store.js` `computeCropPerformance`: Pattern for synchronous store computation
- `src/modules/farm/utils/farm-utils.js`: Add `getSeason()` here
- `src/modules/farm/components/TopCropsWidget.vue`: Widget pattern for `YieldTrendsWidget`
- `src/modules/farm/components/PlotProfitabilityWidget.vue`: Widget pattern for `FarmAlertsWidget`
- `src/modules/farm/pages/PlotDetailPage.vue`: Profitability card pattern for new Yield Analysis card
- `src/services/ReportExportService.js`: PDF/CSV export — review API before use
- `DATABASE_SCHEMA.md`: crops table — `typical_yield_per_hectare`, `growing_season` fields
- `docs/POST-MVP.md`: Existing deferred items for context

---

_Last Updated: 2026-05-04_  
_Story Template Version: 1.0_  
_Status: **draft**_
