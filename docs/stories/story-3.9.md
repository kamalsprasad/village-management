# Story 3.9: Farm Module - Profitability Analysis and ROI Calculation

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.9  
**Status:** review  
**Date:** 2026-04-30  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to see profit calculations per plot and per crop type including all costs, so that I can identify which crops are most profitable and make evidence-based planting decisions.

---

## Background and Scope

This story delivers the profitability analytics layer that all previous farm stories have been building toward. Every cost field captured in Stories 3.3–3.8 (seed inputs, planting labor, planting other, harvest labor, harvest other) and every sales record created in Story 3.8 now feeds into a coherent profitability picture across three surfaces:

1. **Plot Detail Page** — per-plot profitability summary replacing the current placeholder
2. **Farm Reports Page** — cross-plot crop performance report with Chart.js visualization
3. **Farm Dashboard** — two new widgets: "Top Performing Crops" and "Plot Profitability"

**Schema Change Required**: This story adds `crop_id` to `farm_sales` as a denormalized FK. This removes the expensive 3-hop query chain (`farm_sales` → `inventory` → `plantings` → `crop_id`) needed to group sales by crop, reducing it to a direct single-field filter. Since this is a brand-new setup, no data migration is required — only `setup-appwrite.js`, `DATABASE_SCHEMA.md`, and `recordSale()` need updating.

**Core Formula (from epics.md AC1):**

```
Net Profit = Total Sales Revenue - (Seed Costs + Planting Labor + Planting Other + Harvest Labor + Harvest Other)
ROI % = (Net Profit / Total Costs) × 100
```

**Failed Plantings**: Included by default (costs without revenue are real losses). A UI toggle lets the Farm Manager exclude failed plantings to see a "successful operations only" view.

**All-Time Scope with Date Range Filter**: Plot detail profitability is all-time by default; a date range picker scopes to a period. The Crop Performance Report shares the same date range filter.

---

## Prerequisites

- **Story 3.1** (completed): Plots — `plot_id`, `size_hectares`
- **Story 3.2** (completed): Crops — `crop_name`, `crop_type` (Annual/Perennial)
- **Story 3.3** (completed): Plantings — `inputs_cost`, `labor_cost`, `other_cost`
- **Story 3.4** (completed): Planting status lifecycle — `status` (Completed, Failed)
- **Story 3.5** (completed): Harvests — `total_labor_cost`, `total_other_costs`, `total_quantity_kg`
- **Story 3.6** (completed): Continuous picking — multiple harvests per planting
- **Story 3.7** (completed): Harvest → inventory pipeline — `inventory.planting_id`, `inventory.crop_id`
- **Story 3.8** (completed): Sales — `farm_sales` table with `inventory_item_id`, `harvest_id`, `finance_transaction_id`, `total_amount`. `calculatePlantingCostsForProfit()` already implemented in `farm-store.js`.
- **`src/services/ReportExportService.js`** (from Story 2.8): PDF + CSV export utilities — reuse for farm reports

---

## Schema Change

### `farm_sales` table — Add `crop_id` column

Add a denormalized `crop_id` relationship to `farm_sales` to enable direct single-query grouping by crop.

**`server/scripts/setup-appwrite.js`** — add to `farm_sales` table definition:

```javascript
{
  key: 'crop_id',
  type: 'relationship',
  relatedCollection: 'crops',
  relationType: 'manyToOne',
  twoWay: false,
  required: false, // false to avoid breaking existing records; populate on all new sales
  onDelete: 'setNull',
}
```

**`DATABASE_SCHEMA.md`** — add row to `farm_sales` table:
| `crop_id` | rel | Optional, manyToOne → crops | Denormalized source crop for direct grouping queries. Populated at sale creation. |

**`farm-store.js` `recordSale()`** — pass `crop_id` when creating the `farm_sales` row:

```javascript
// Resolve crop_id from inventory item at sale time
const cropId = idOf(inventoryItem.crop_id); // already on the inventory row
// Pass to farm_sales creation:
crop_id: cropId || null,
```

> **Note**: `crop_id` is optional/nullable to remain backwards-compatible if a sale is recorded before the column is deployed. The profitability queries handle null `crop_id` gracefully.

---

## Acceptance Criteria

### AC1: Profitability Formula Implementation

- [ ] Core formula correctly implemented across all surfaces:
  ```
  Net Profit = Total Sales Revenue − Total Costs
  Total Costs = Seed Costs + Planting Labor + Planting Other + Harvest Labor + Harvest Other
  ROI % = (Net Profit / Total Costs) × 100  [shows "—" if Total Costs = 0]
  ```
- [ ] For plantings with **no sales**: Revenue = 0, Net Profit = negative (cost shown as loss)
- [ ] For plantings with **partial sales** (not all inventory sold): Revenue = sum of all `farm_sales.total_amount` for that planting's inventory items
- [ ] For perennial crops with multiple harvest cycles: all harvest costs summed across every harvest for the planting
- [ ] **Failed plantings** included in calculations by default; excluded when "Include failed plantings" toggle is OFF
- [ ] Currency displayed as ZMW throughout, formatted to 2 decimal places

### AC2: Plot Detail Page — Profitability Summary Card

- [ ] `PlotDetailPage.vue`: Replace the placeholder "Profitability data will be available after first harvest" card (lines 252–263) with a functional **Profitability Summary** section
- [ ] Section displays:
  - **Total Revenue** (ZMW) — sum of all `farm_sales.total_amount` for all plantings on this plot
  - **Detailed Cost Breakdown**:
    - Seed / Input Costs (ZMW)
    - Planting Labor Costs (ZMW)
    - Planting Other Costs (ZMW) — with expandable notes if any notes present
    - Harvest Labor Costs (ZMW)
    - Harvest Other Costs (ZMW) — with expandable notes if any notes present
    - **Total Costs** (ZMW, bold)
  - **Net Profit** (ZMW, bold) — color-coded: green if ≥ 0, red if < 0
  - **ROI %** — color-coded matching net profit
  - **Plantings Included** count (e.g., "3 completed, 1 failed")
- [ ] **Date Range Filter**: Date picker pair (From / To) above the summary; recalculates on change. Default: all time (empty = no filter).
- [ ] **"Include Failed Plantings" toggle**: Boolean chip/switch, default ON. When OFF, excludes any planting with `status = 'Failed'` from all calculations.
- [ ] **Loading state**: Show spinner while profitability data is fetching; do not show stale/empty values
- [ ] **Empty state**: If no completed plantings and no sales, show: "No profitability data yet. Complete a harvest and record a sale to see results."
- [ ] **Per-planting breakdown** (expandable `q-expansion-item`): List of each planting contributing to the summary, showing crop name, planting date, revenue, costs, profit for that planting

### AC3: Crop Performance Report — New Farm Reports Page

- [ ] New page `src/modules/farm/pages/FarmReportsPage.vue` at route `/farm/reports`
- [ ] Route added to `src/modules/farm/router.js` with `farm:read` permission guard
- [ ] Navigation entry added to `src/layouts/MainLayout.vue` under the Farm section ("Reports" link)
- [ ] Navigation entry added to `FarmDashboardPage.vue` Quick Navigation cards

**Report: Crop Performance**

- [ ] **Filter Bar** at top of page:
  - Date range (From / To) pickers — defaults to last 12 months
  - Crop type filter: All / Annual / Perennial
  - Specific crop dropdown (multi-select from `farmStore.crops`)
  - "Include Failed Plantings" toggle (default ON)
  - "Generate Report" button that triggers data computation
- [ ] **Crop Performance Table** — one row per crop, columns:
      | Crop Name | Type | Total Plantings | Completed | Failed | Total Harvest (kg) | Total Revenue (ZMW) | Total Seed Costs | Total Planting Labor | Total Planting Other | Total Harvest Labor | Total Harvest Other | Total Costs | Net Profit | Avg Profit/Planting | Avg Yield/Hectare | Success Rate |
- [ ] Table sortable by any column (default: Net Profit descending)
- [ ] Rows color-coded: green row if Net Profit > 0, red if Net Profit < 0, yellow if Net Profit = 0
- [ ] **Summary Statistics** above the table:
  - Most Profitable Crop (crop name + ZMW profit)
  - Highest Yield Crop (crop name + avg kg/ha)
  - Best ROI Crop (crop name + ROI %)
  - Total Farm Revenue (all crops, filtered period)
  - Total Farm Profit
- [ ] **Export buttons**: "Export PDF" and "Export CSV" using `ReportExportService.js`; PDF includes summary stats + table + chart image (if feasible)
- [ ] Report loads within 3 seconds for up to 3 years of data (compute from loaded Pinia state, not extra queries)

### AC4: Farm Reports Page — "Top Performing Crops" Bar Chart

- [ ] Chart.js horizontal bar chart rendered on `FarmReportsPage.vue` below the crop performance table
- [ ] Shows top 5 crops by **Net Profit** (ZMW), bars color-coded by profit/loss (green = positive, red = negative)
- [ ] Chart updates reactively when filters change ("Generate Report" triggers re-render)
- [ ] Chart uses `shallowRef` pattern (consistent with `FinanceReportsPage.vue` / Story 2.8)
- [ ] Chart properly destroyed and re-created on filter change to avoid Chart.js canvas reuse warnings
- [ ] Chart empty state: "No data to display. Adjust filters or record some sales." shown when no data

### AC5: Farm Dashboard — Two New Widgets

**Widget 1: "Top Performing Crops"**

- [ ] New component `src/modules/farm/components/TopCropsWidget.vue`
- [ ] Follows `WidgetBase.vue` pattern (consistent with existing farm widgets)
- [ ] Shows top 5 crops by total net profit (all-time, all plots)
- [ ] Each row: crop name, total profit (ZMW), color-coded badge (green/red)
- [ ] Small horizontal bar chart or progress bars showing relative profit magnitude
- [ ] Clicking widget title navigates to `/farm/reports`
- [ ] Empty state: "Record sales to see top performing crops"
- [ ] Added to `FarmDashboardPage.vue` in the widgets row

**Widget 2: "Plot Profitability"**

- [ ] New component `src/modules/farm/components/PlotProfitabilityWidget.vue`
- [ ] Table listing all plots with columns: Plot Name, Net Profit (ZMW), ROI %
- [ ] Color-coded rows: green (profit > 0), red (loss), yellow (break-even: |profit| < 10)
- [ ] Clicking a plot row navigates to `/farm/plots/:id` (plot detail page)
- [ ] Widget header shows total farm net profit (ZMW) across all plots
- [ ] Empty state: "No profit data yet. Complete plantings and record sales."
- [ ] Added to `FarmDashboardPage.vue` in the widgets row

### AC6: Profitability Filters (shared behavior)

- [ ] **Date range filter** applies to: planting_date for cost attribution, sale_date for revenue attribution
- [ ] If `dateFrom` is set but `dateTo` is not: filter from `dateFrom` to today
- [ ] If neither date is set: all-time (no filter)
- [ ] Date filter applied client-side against already-loaded Pinia state for instant recalculation
- [ ] **Crop filter** (on Farm Reports page) filters rows shown in the table; does not affect other crops' totals
- [ ] **"Include Failed Plantings" toggle**: persists within a session (does not need to persist across page loads)

### AC7: Store — New Profitability Actions

The following new actions must be added to `src/modules/farm/stores/farm-store.js`:

- [ ] **`computePlotProfitability(plotId, opts)`** — synchronous (uses loaded state); returns `{ revenue, seedCosts, plantingLabor, plantingOther, harvestLabor, harvestOther, totalCost, netProfit, roiPercent, plantingsIncluded }`. `opts` supports `{ dateFrom, dateTo, includeFailedPlantings }`.

- [ ] **`computeCropPerformance(opts)`** — synchronous (uses loaded state); returns array of crop performance objects (one per crop), each containing all metrics from AC3 table. `opts` supports `{ dateFrom, dateTo, cropIds, cropType, includeFailedPlantings }`.

- [ ] **`computeAllPlotsProfitability(opts)`** — calls `computePlotProfitability` for every plot; returns array sorted by `netProfit` descending. Used by `PlotProfitabilityWidget`.

- [ ] **`computeTopCropsByProfit(limit, opts)`** — calls `computeCropPerformance` and returns top `limit` (default 5) crops sorted by `netProfit` descending.

- [ ] **`ensureProfitabilityDataLoaded()`** — ensures `plots`, `plantings`, `harvests`, `sales`, `crops`, and inventory items (farm_produce only) are all loaded. Called by each profitability page/widget on mount. Uses existing `farmStore.xLoaded` flags to skip already-fetched data.

> **Important**: `calculatePlantingCostsForProfit(plantingId)` already exists in `farm-store.js` and is async (fetches from Appwrite). The new `computePlotProfitability` is **synchronous** and operates on already-loaded Pinia state — do not remove or replace `calculatePlantingCostsForProfit`; it is still used by `SaleDetailPage.vue` for the per-sale profit preview.

### AC8: Revenue Resolution Logic

The following resolution chain must be implemented correctly to map plantings to their sales revenue:

```javascript
// In farm-store.js
computeRevenueForPlanting(plantingId) {
  // Find all inventory items for this planting
  const invItems = this.inventoryItems.filter(item => {
    const pid = typeof item.planting_id === 'object' ? item.planting_id?.$id : item.planting_id;
    return pid === plantingId;
  });
  const invItemIds = new Set(invItems.map(i => i.$id));

  // Sum all sales for those inventory items
  return this.sales
    .filter(sale => {
      const iid = typeof sale.inventory_item_id === 'object'
        ? sale.inventory_item_id?.$id
        : sale.inventory_item_id;
      return invItemIds.has(iid);
    })
    .reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
}
```

- [ ] This resolution handles both string and object-typed FK references (consistent with existing store patterns)
- [ ] If `inventoryItems` (farm_produce) are not loaded, `ensureProfitabilityDataLoaded()` loads them via `inventoryStore.fetchItems({ itemType: 'farm_produce' })`
- [ ] Alternative resolution via `sale.crop_id` (after the schema change): used for the Crop Performance Report to group by crop without iterating through inventory items

### AC9: Sample Data Updates

- [ ] `src/composables/useFarmSampleData.js`: Backfill `crop_id` on all sample `farm_sales` records to match the new schema column
- [ ] Verify all 3+ sample sales already seeded in Story 3.8 will have their `crop_id` populated in the updated seeding logic
- [ ] Sample data must exercise the profitability widgets: at least 2 plots with different profit profiles (one profitable, one at-loss or break-even), and at least 2 different crops with sales

---

## Technical Implementation Notes

### Data Loading Strategy

All profitability computations are **synchronous** once data is loaded. The page/widget mounts trigger `ensureProfitabilityDataLoaded()` which parallelises any missing fetches:

```javascript
async ensureProfitabilityDataLoaded() {
  const inventoryStore = useInventoryStore();
  const loaders = [];
  if (!this.plotsLoaded)     loaders.push(this.fetchPlots());
  if (!this.plantingsLoaded) loaders.push(this.fetchPlantings());
  if (!this.harvestsLoaded)  loaders.push(this.fetchHarvests());
  if (!this.cropsLoaded)     loaders.push(this.fetchCrops());
  if (!this.salesLoaded)     loaders.push(this.fetchSales());
  // Farm produce inventory items (needed for revenue-per-planting resolution)
  if (!inventoryStore.farmProduceLoaded) {
    loaders.push(inventoryStore.fetchItems({ itemType: 'farm_produce', limit: 500 }));
  }
  if (loaders.length) await Promise.all(loaders);
}
```

> Note: Check whether `inventoryStore` already has a `farmProduceLoaded` flag or if you need to use the generic `itemsLoaded` flag. If `fetchItems` is not filterable by type, use `fetchAllItems()` (added in Story 2.8) and filter client-side.

### `computePlotProfitability` Implementation Pattern

```javascript
computePlotProfitability(plotId, { dateFrom, dateTo, includeFailedPlantings = true } = {}) {
  const inventoryStore = useInventoryStore();
  const plotPlantings = (this.plantingsByPlot[plotId] || []).filter(p => {
    if (!includeFailedPlantings && p.status?.toLowerCase() === 'failed') return false;
    if (dateFrom && new Date(p.planting_date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(p.planting_date) > new Date(dateTo)) return false;
    return true;
  });

  let revenue = 0, seedCosts = 0, plantingLabor = 0, plantingOther = 0;
  let harvestLabor = 0, harvestOther = 0;

  for (const planting of plotPlantings) {
    revenue += this.computeRevenueForPlanting(planting.$id);

    seedCosts     += Number(planting.inputs_cost) || 0;
    plantingLabor += Number(planting.labor_cost)  || 0;
    plantingOther += Number(planting.other_cost)  || 0;

    const plantingHarvests = this.harvestsByPlanting(planting.$id);
    for (const h of plantingHarvests) {
      harvestLabor += Number(h.total_labor_cost)  || 0;
      harvestOther += Number(h.total_other_costs) || 0;
    }
  }

  const totalCost = seedCosts + plantingLabor + plantingOther + harvestLabor + harvestOther;
  const netProfit = revenue - totalCost;
  const roiPercent = totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : null;

  return {
    revenue, seedCosts, plantingLabor, plantingOther,
    harvestLabor, harvestOther, totalCost, netProfit,
    roiPercent,
    plantingsIncluded: plotPlantings.length,
    completedCount: plotPlantings.filter(p => p.status?.toLowerCase() === 'completed').length,
    failedCount: plotPlantings.filter(p => p.status?.toLowerCase() === 'failed').length,
  };
},
```

### `computeCropPerformance` Implementation Pattern

```javascript
computeCropPerformance({ dateFrom, dateTo, cropIds, cropType, includeFailedPlantings = true } = {}) {
  const result = {};

  for (const planting of this.plantings) {
    const cropId = typeof planting.crop_id === 'object' ? planting.crop_id?.$id : planting.crop_id;
    if (!cropId) continue;

    // Apply filters
    if (cropIds?.length && !cropIds.includes(cropId)) continue;
    if (!includeFailedPlantings && planting.status?.toLowerCase() === 'failed') continue;
    if (dateFrom && new Date(planting.planting_date) < new Date(dateFrom)) continue;
    if (dateTo && new Date(planting.planting_date) > new Date(dateTo)) continue;

    const crop = this.crops.find(c => c.$id === cropId);
    if (cropType && crop?.crop_type !== cropType) continue;

    if (!result[cropId]) {
      result[cropId] = {
        cropId, cropName: crop?.crop_name || 'Unknown', cropType: crop?.crop_type,
        totalPlantings: 0, completed: 0, failed: 0,
        totalHarvestKg: 0, totalRevenue: 0,
        seedCosts: 0, plantingLabor: 0, plantingOther: 0,
        harvestLabor: 0, harvestOther: 0,
        totalHectares: 0, // for yield/ha calculation
      };
    }

    const r = result[cropId];
    r.totalPlantings++;
    if (planting.status?.toLowerCase() === 'completed') r.completed++;
    if (planting.status?.toLowerCase() === 'failed') r.failed++;

    r.totalRevenue   += this.computeRevenueForPlanting(planting.$id);
    r.seedCosts      += Number(planting.inputs_cost) || 0;
    r.plantingLabor  += Number(planting.labor_cost)  || 0;
    r.plantingOther  += Number(planting.other_cost)  || 0;

    // Plot size for yield/ha
    const plotId = typeof planting.plot_id === 'object' ? planting.plot_id?.$id : planting.plot_id;
    const plot = this.plots.find(p => p.$id === plotId);
    r.totalHectares += Number(plot?.size_hectares) || 0;

    const plantingHarvests = this.harvestsByPlanting(planting.$id);
    for (const h of plantingHarvests) {
      r.totalHarvestKg += Number(h.total_quantity_kg) || 0;
      r.harvestLabor   += Number(h.total_labor_cost)  || 0;
      r.harvestOther   += Number(h.total_other_costs) || 0;
    }
  }

  return Object.values(result).map(r => {
    const totalCost = r.seedCosts + r.plantingLabor + r.plantingOther + r.harvestLabor + r.harvestOther;
    const netProfit = r.totalRevenue - totalCost;
    return {
      ...r, totalCost, netProfit,
      roiPercent: totalCost > 0 ? ((netProfit / totalCost) * 100).toFixed(1) : null,
      avgProfitPerPlanting: r.totalPlantings > 0 ? netProfit / r.totalPlantings : 0,
      avgYieldPerHectare: r.totalHectares > 0 ? r.totalHarvestKg / r.totalHectares : 0,
      successRate: r.totalPlantings > 0
        ? ((r.completed / r.totalPlantings) * 100).toFixed(0) + '%' : '—',
    };
  }).sort((a, b) => b.netProfit - a.netProfit);
},
```

### Chart.js Pattern (consistent with Story 2.8 FinanceReportsPage)

```javascript
// In FarmReportsPage.vue <script setup>
import { shallowRef, watch, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';

const topCropsChartRef = ref(null); // template ref: <canvas ref="topCropsChartRef">
const topCropsChart = shallowRef(null);

function renderTopCropsChart(cropData) {
  if (topCropsChart.value) {
    topCropsChart.value.destroy();
    topCropsChart.value = null;
  }
  if (!topCropsChartRef.value || !cropData.length) return;

  topCropsChart.value = new Chart(topCropsChartRef.value, {
    type: 'bar',
    data: {
      labels: cropData.map((c) => c.cropName),
      datasets: [
        {
          label: 'Net Profit (ZMW)',
          data: cropData.map((c) => c.netProfit),
          backgroundColor: cropData.map((c) =>
            c.netProfit >= 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(244, 67, 54, 0.7)',
          ),
        },
      ],
    },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } },
  });
}

onUnmounted(() => {
  if (topCropsChart.value) topCropsChart.value.destroy();
});
```

### PDF Export via ReportExportService

```javascript
// In FarmReportsPage.vue
import { ReportExportService } from 'src/services/ReportExportService';

function exportPDF() {
  ReportExportService.exportToPDF({
    title: 'Farm Crop Performance Report',
    subtitle: `Period: ${dateFrom.value || 'All Time'} — ${dateTo.value || 'Present'}`,
    summaryStats: [
      { label: 'Most Profitable Crop', value: topCrop.value?.cropName || '—' },
      { label: 'Total Farm Revenue', value: `ZMW ${formatCurrency(totalRevenue.value)}` },
      { label: 'Total Farm Profit', value: `ZMW ${formatCurrency(totalProfit.value)}` },
    ],
    columns: ['Crop', 'Plantings', 'Revenue', 'Total Costs', 'Net Profit', 'ROI %'],
    rows: cropPerformance.value.map((c) => [
      c.cropName,
      c.totalPlantings,
      formatCurrency(c.totalRevenue),
      formatCurrency(c.totalCost),
      formatCurrency(c.netProfit),
      c.roiPercent ? c.roiPercent + '%' : '—',
    ]),
  });
}
```

> Verify the exact API signature of `ReportExportService.js` before implementing — review `src/services/ReportExportService.js` (created in Story 2.8) to match the actual method signature.

---

## Files to Create

| File                                                      | Purpose                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/modules/farm/pages/FarmReportsPage.vue`              | Crop performance report page with filter bar, table, Chart.js, PDF/CSV export |
| `src/modules/farm/components/TopCropsWidget.vue`          | Dashboard widget: top 5 crops by net profit                                   |
| `src/modules/farm/components/PlotProfitabilityWidget.vue` | Dashboard widget: all plots profit/loss table                                 |

---

## Files to Modify

| File                                           | Changes                                                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/scripts/setup-appwrite.js`             | Add `crop_id` relationship column to `farm_sales` table definition                                                                                                                                                                                                           |
| `DATABASE_SCHEMA.md`                           | Document `crop_id` in `farm_sales` table; update Relationships section                                                                                                                                                                                                       |
| `src/modules/farm/stores/farm-store.js`        | Add `computePlotProfitability`, `computeCropPerformance`, `computeAllPlotsProfitability`, `computeTopCropsByProfit`, `ensureProfitabilityDataLoaded`, `computeRevenueForPlanting`; update `recordSale()` to pass `crop_id`; update state comment header to include Story 3.9 |
| `src/modules/farm/pages/PlotDetailPage.vue`    | Replace profitability placeholder (lines 252–263) with functional `ProfitabilitySummaryCard` component or inline implementation with date filter + failed toggle                                                                                                             |
| `src/modules/farm/pages/FarmDashboardPage.vue` | Add `TopCropsWidget` and `PlotProfitabilityWidget` to widgets row; add "Reports" to `moduleLinks` nav cards; import new widgets                                                                                                                                              |
| `src/modules/farm/router.js`                   | Add `/farm/reports` route with `farm:read` permission guard                                                                                                                                                                                                                  |
| `src/layouts/MainLayout.vue`                   | Add "Reports" nav entry under Farm section                                                                                                                                                                                                                                   |
| `src/composables/useFarmSampleData.js`         | Backfill `crop_id` on all sample `farm_sales` records to match new schema column                                                                                                                                                                                             |

---

## Areas of Concern and Mitigations

### ⚠️ Concern 1: Inventory Items Not Loaded for Revenue Resolution

**Problem**: `computeRevenueForPlanting()` requires `inventoryStore.items` (farm_produce rows) to be loaded to map `planting_id` → `inventory_item_id` → `farm_sales.total_amount`. If inventory items haven't been fetched (e.g., user navigates directly to Plot Detail), profitability shows ZMW 0 revenue even though sales exist.

**Mitigation**: `ensureProfitabilityDataLoaded()` must include a fetch of farm_produce inventory items. Verify whether `inventoryStore` has a `farmProduceLoaded` flag or use a flag check on item type. If `inventory-store.js` doesn't support filtered fetches by `itemType`, use `fetchAllItems()` (added in Story 2.8) and filter client-side. Callers (plot detail, reports page, dashboard widgets) all call `ensureProfitabilityDataLoaded()` on mount.

### ⚠️ Concern 2: `computePlotProfitability` Uses `plantingsByPlot` Getter — String vs. Object FK

**Problem**: `plantingsByPlot` getter in `farm-store.js` (line 100–104) uses `planting.plot_id` directly as a string key for the reduce. But Appwrite may return `plot_id` as an object `{ $id, ... }` for relationship fields depending on query depth. If so, the `plantingsByPlot[plotId]` lookup returns `undefined`.

**Mitigation**: Normalize `plot_id` in `computePlotProfitability` the same way other getters handle it:

```javascript
const plotPlantings = this.plantings.filter((p) => {
  const pid = typeof p.plot_id === 'object' ? p.plot_id?.$id : p.plot_id;
  return pid === plotId;
});
```

Verify whether the existing `plantingsByPlot` getter already handles this — if not, fix the getter as a prerequisite. Do not silently get wrong results.

### ⚠️ Concern 3: Large Dataset Performance

**Problem**: `computeCropPerformance` iterates over all plantings × all harvests. With 2+ years of data (say, 100 plantings × 5 harvests each × 3 sales each = 500+ records), the synchronous in-memory computation should still be fast (< 50ms), but the parallel `ensureProfitabilityDataLoaded()` fetches may be slow if 500+ records need loading.

**Mitigation**: `fetchSales()` defaults to `limit: 100`. Check whether the default limit is sufficient for all-time data. If > 100 sales exist, implement cursor-based pagination in `fetchSales()` (the same pattern used in `fetchTransactionsForReport()` in `finance-store.js` from Story 2.8) or increase the default limit to 500 for the profitability load path. Document this in POST-MVP.md.

### ⚠️ Concern 4: `crop_id` on `farm_sales` — null for Pre-Schema Sales

**Problem**: The schema change adds `crop_id` to `farm_sales` as optional. Any sales recorded before this column is deployed will have `crop_id = null`. `computeCropPerformance` falls back to the inventory-join resolution path for null `crop_id` rows, but the `inventoryItems` must be loaded for that fallback to work.

**Mitigation**: Since this is a brand-new setup with no existing data, all sales will have `crop_id` populated at creation. For safety, the fallback resolution via `inventory → planting → crop` should still be implemented and tested. Document the fallback behavior.

### ⚠️ Concern 5: `harvestsByPlanting` Getter Requires Harvests Loaded

**Problem**: `computePlotProfitability` calls `this.harvestsByPlanting(plantingId)` (a store getter). If `this.harvests` array is empty (not yet fetched), all harvest costs return 0, silently undercounting costs.

**Mitigation**: `ensureProfitabilityDataLoaded()` must fetch harvests before any computation runs. The loading state on the profitability card/page must persist until `ensureProfitabilityDataLoaded()` resolves — do not render computed results with a partial dataset.

### ⚠️ Concern 6: `ReportExportService` API Compatibility

**Problem**: `ReportExportService.js` was written for the Finance reports in Story 2.8. Its exact method signatures and expected data shapes may not match farm data structures.

**Mitigation**: Read `src/services/ReportExportService.js` before implementing the export buttons. Adapt the farm data format to match the service's expected inputs rather than calling it with mismatched parameters. If the service is too Finance-specific, create a thin wrapper or use it as a template for `FarmReportExportService.js` (document in POST-MVP.md as refactor candidate).

---

## Testing Checklist

### Manual Testing — Plot Profitability

**Test 1: Plot with Sales — Positive Profit**

1. Navigate to a plot that has at least one completed planting with sales recorded
2. Verify **Profitability Summary** section replaces the placeholder text
3. Verify revenue = sum of all sales on this plot
4. Verify costs match: seed + planting labor + planting other + harvest labor + harvest other
5. Verify net profit = revenue - costs
6. Verify ROI % = (profit / costs) × 100, formatted to 1 decimal
7. Verify color-coded green for positive profit

**Test 2: Plot with Costs but No Sales — Loss Display**

1. Navigate to a plot that has completed plantings but no farm sales
2. Verify Revenue = ZMW 0.00
3. Verify Net Profit = negative (equal to total costs)
4. Verify displayed in red

**Test 3: Date Range Filter**

1. Navigate to a plot with multi-year planting history
2. Set date range to current year only
3. Verify profitability excludes plantings from prior years
4. Clear date range
5. Verify all plantings included again

**Test 4: Include/Exclude Failed Plantings Toggle**

1. Navigate to a plot with at least one failed planting
2. Note the profitability with toggle ON
3. Toggle OFF ("Include Failed Plantings")
4. Verify failed planting's costs are excluded from total costs
5. Verify total costs decrease by exactly the failed planting's cost

**Test 5: Per-Planting Breakdown Expansion**

1. Expand the per-planting detail section on plot profitability
2. Verify each row shows: crop name, planting date, revenue, costs, profit
3. Verify sum of all rows' revenue = total revenue on summary
4. Verify sum of all rows' costs = total costs on summary

### Manual Testing — Crop Performance Report

**Test 6: Generate Report — All Crops**

1. Navigate to `/farm/reports`
2. Click "Generate Report" with no filters
3. Verify table shows a row for each crop that has at least one planting
4. Verify columns: crop name, type, plantings, completed, failed, harvest kg, revenue, all cost categories, net profit, ROI, avg profit/planting, yield/ha, success rate
5. Verify "Most Profitable Crop" summary card shows correct crop name

**Test 7: Filter by Crop Type**

1. Set Crop Type filter = "Annual"
2. Generate Report
3. Verify only annual crops appear in table (no perennials)
4. Verify summary stats recalculate based on filtered data only

**Test 8: Failed Plantings Toggle on Reports Page**

1. Note total costs with toggle ON
2. Toggle to OFF
3. Verify total costs decrease (if any failed plantings exist in filter scope)

**Test 9: Chart Rendering**

1. Generate report with data
2. Verify horizontal bar chart renders with up to 5 bars
3. Verify green bars for profitable crops, red bars for loss-making
4. Change filters and regenerate
5. Verify chart updates (old chart destroyed, new chart rendered)

**Test 10: CSV Export**

1. Generate report
2. Click "Export CSV"
3. Verify CSV download with correct headers and data rows

**Test 11: PDF Export**

1. Generate report
2. Click "Export PDF"
3. Verify PDF opens/downloads with title, summary stats, and table

### Manual Testing — Dashboard Widgets

**Test 12: TopCropsWidget**

1. Navigate to Farm Dashboard
2. Verify "Top Performing Crops" widget visible
3. Verify up to 5 crops listed with net profit values
4. Verify color-coded profit indicators
5. Click widget title → verify navigates to `/farm/reports`
6. Empty state: wipe sales data, verify "Record sales to see top performing crops" shown

**Test 13: PlotProfitabilityWidget**

1. Navigate to Farm Dashboard
2. Verify "Plot Profitability" widget visible
3. Verify all plots listed with profit/ROI
4. Click a plot row → verify navigates to `/farm/plots/:id`
5. Verify widget header shows total farm net profit

### Integration Testing

**Test 14: Schema Change — crop_id on farm_sales**

1. Record a new sale via the normal Record Sale flow
2. Navigate to Appwrite console → `farm_sales` table
3. Verify the new sale row has `crop_id` populated with correct crop ID
4. Verify old sample data sales (from Story 3.8 seeding) also have `crop_id` populated

**Test 15: Sample Data Profitability**

1. Fresh install with sample data
2. Navigate to Farm Dashboard
3. Verify both profitability widgets show data (not empty state)
4. Navigate to a plot detail page
5. Verify profitability summary shows non-zero values
6. Navigate to `/farm/reports` and generate report
7. Verify at least 2 crops in table with different profit profiles

---

## Dependencies on Other Stories

| This Story                 | Depends On                                         | Future Stories Depend On This                                                             |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 3.9 Profitability Analysis | 3.1–3.8 (all farm data); 2.8 (ReportExportService) | 3.10 (Yield Analysis — extends Farm Reports page), 3.11 (Alerts — uses profit thresholds) |

---

## POST-MVP Items

The following items should be added to `docs/POST-MVP.md`:

1. **Denormalize `plot_id` onto `farm_sales`** — enables direct plot-level sales queries without join through inventory → planting → plot. Low effort, same pattern as `crop_id` added in this story.
2. **Increase `fetchSales()` limit / cursor pagination** — default `limit: 100` may truncate data for large deployments (>100 sales). Mirror the cursor-based pagination from `fetchTransactionsForReport()` (Story 2.8).
3. **Cache profitability computations** — `computeCropPerformance` is O(plantings × harvests). For large datasets, memoize results keyed by filter hash and invalidate on new sale/planting/harvest. Low effort with `computed()` or a simple JS Map cache.
4. **FarmReportExportService refactor** — consolidate farm and finance PDF export logic into shared utilities in `ReportExportService.js` if farm export ends up duplicating finance export patterns.
5. **`plantingsByPlot` getter FK normalization** — if `planting.plot_id` can return as object type, fix the existing getter to normalize it (affects PlotDetailPage current planting display too).

---

## References

- `docs/epics.md` lines 616–632: Story 3.9 original acceptance criteria
- `src/modules/farm/stores/farm-store.js` lines 1792–1848: `calculatePlantingCostsForProfit` (async version — do not remove)
- `src/modules/farm/pages/PlotDetailPage.vue` lines 251–263: Profitability placeholder to replace
- `src/modules/farm/pages/SaleDetailPage.vue`: Profit preview pattern (single-sale view) — reference for formatting
- `src/modules/finance/pages/FinanceReportsPage.vue`: Chart.js `shallowRef` pattern + filter bar pattern
- `src/services/ReportExportService.js`: PDF/CSV export utilities — review API before use
- `src/modules/farm/components/RecentSalesWidget.vue`: Widget pattern to follow for new dashboard widgets
- `DATABASE_SCHEMA.md` lines 417–419: `farm_sales` → `harvests`, `inventory` → `plantings` relationships
- `docs/POST-MVP.md`: Historical Price Query Optimization (related `crop_id` denorm item)

---

_Last Updated: 2026-04-30_  
_Story Template Version: 1.0_  
_Status: **review**_
