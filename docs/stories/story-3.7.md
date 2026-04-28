# Story 3.7: Farm Module - Harvest-to-Inventory Polish, Estimated Value Pricing, and Sale Readiness

**Epic:** 3 - Farm Management and Agricultural Tracking
**Story ID:** 3.7
**Status:** Draft
**Date:** 2026-04-28
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want harvested produce to appear in inventory with a meaningful estimated sale price and a clear link back to its origin, so that I can confidently move produce to market and track its true value without manually re-entering data.

---

## Background and Scope Clarification

> **⚠️ Important: This story's original scope (epics.md AC1) was substantially pre-empted.**
>
> Story 3.5 introduced an **immediate per-entry inventory upsert** model — the `farm_produce` inventory row is created on the **first harvest entry** and kept current as entries are added/deleted. Marking a harvest "Completed" has no additional inventory side-effect (inventory is already accurate). This effectively replaced the "automatic inventory creation on harvest completion" trigger described in the original epics spec.
>
> **What remains for this story** is the _quality_ and _completeness_ of that inventory row and its surrounding UX:
>
> 1. **Estimated value** is currently derived from the weighted-average harvest entry cost (cost of production), not a meaningful sale price. Story 3.8 (Sales Recording) needs `unit_cost` to reflect a realistic **market price per kg** so that `estimated_value` is a useful pre-sale valuation.
> 2. **Historical average price logic** (query last 5 `farm_sales` for same `crop_id`, derive average `price_per_kg`) is unimplemented.
> 3. **No user prompt** exists when there is no price history — `unit_cost` silently defaults to 0.
> 4. **The inventory row name** (`item_name`) has no enforced convention — currently whatever the store sets.
> 5. **No visible link** from the Planting/Harvest detail surface to the resulting inventory item (beyond the small footer link added in Story 3.5 AC7).
> 6. **Perennial/continuous-picking produce**: the epics spec (AC4) mentioned "each harvest creates separate inventory item or option to aggregate". Story 3.6 always aggregates into one row per planting. This story codifies the single-aggregate approach as the final design and surfaces it clearly to the user.
> 7. **Farm dashboard inventory levels widget** exists in the inventory module but is not surfaced on the Farm Dashboard.

This story resolves all of the above so that Story 3.8 (Sales Recording) can trust `unit_cost`/`estimated_value` on the inventory row as a reliable starting price and all cross-links between harvest ↔ inventory are in place.

---

## Prerequisites

- **Story 3.1** (completed): Plot Management
- **Story 3.2** (completed): Crops Database
- **Story 3.3** (completed): Planting Records
- **Story 3.4** (completed): Planting Status Tracking
- **Story 3.5** (completed): Harvest Recording — `createOrUpdateFarmProduceFromHarvest` in `inventory-store.js`; inventory row created per entry; `findFarmProduceRow(plantingId)` available
- **Story 3.6** (completed): Continuous Picking — single aggregated row per planting for perennials; `is_continuous_picking` and `harvest_sequence` on harvests
- **Epic 2 Story 2.6** (completed): Inventory Module — `inventory` table and `InventoryDetailPage.vue` exist
- **`farm_sales` table** exists in DB schema (created in initial setup for Story 3.8)

---

## Acceptance Criteria

### AC1: Inventory Item Naming Convention

- [ ] Every farm produce inventory row created from a harvest follows the convention:
  - **Annual crop** (single harvest): `[Crop Name] – [Plot Name] [Season Label]`
    - Example: `Maize – North Field 2025/26 Wet Season`
  - **Perennial crop** (aggregated, continuous picking): `[Crop Name] – [Plot Name] (Ongoing)`
    - Example: `Banana – Orchard Plot (Ongoing)`
- [ ] The `[Season Label]` for annuals is derived from the harvest `harvest_end_date`:
  - If month is May–October (dry season): `[Year] Dry Season`
  - If month is November–April (wet season): `[Year]/[Year+1] Wet Season`
- [ ] The `item_name` is set when the **first harvest entry** is created (i.e., when the inventory row is first upserted by `createOrUpdateFarmProduceFromHarvest`)
- [ ] If the `item_name` already exists on an existing row (subsequent entries for the same planting), it is **not overwritten**
- [ ] The season/naming logic lives in a shared helper `deriveProduceName(crop, plot, harvestDate)` in `src/modules/farm/utils/farm-utils.js` (create file if it doesn't exist)
- [ ] `_resolveHarvestContext` in `farm-store.js` is extended to also fetch the plot object via `fetchPlotById(planting.plot_id)` and return it in the context result (needed by `deriveProduceName` for the plot name)
- [ ] `DATABASE_SCHEMA.md` and `useFarmSampleData.js` updated so sample inventory names match this convention
- [ ] **Note on `item_type` casing:** The stored value is `'farm_produce'` (snake_case lowercase). All code, widget filters, and queries must use `'farm_produce'` — not `'Farm Produce'`. `DATABASE_SCHEMA.md` must be updated to reflect this canonical value.
- [ ] **Note on `crop_id`:** When creating a new farm produce row, `crop_id: crop.$id` **must** be set on the new object in `createOrUpdateFarmProduceFromHarvest`. It is currently missing from the live implementation and is required for the AC4 Source section in `InventoryDetailPage`.

### AC2: Estimated Sale Value — Historical Price Calculation

- [ ] `fetchHistoricalPriceForCrop(cropId)` is called in **two places only** — never on every entry add:
  1. Inside `createOrUpdateFarmProduceFromHarvest` **only when creating a new row** (i.e., no existing row found for the planting — first entry only)
  2. Inside `PlantingDetailPage.vue`'s `markComplete()` handler, immediately before showing the completion confirmation (to determine whether to show the price prompt)
- [ ] The price logic when creating a new inventory row:
  1. Call `fetchHistoricalPriceForCrop(cropId)` → if `saleCount ≥ 1`: set `unit_cost = avgPrice`
  2. If `saleCount === 0`: set `unit_cost = 0` (price prompt will be shown at Mark Complete)
- [ ] For **subsequent entries** on an existing inventory row: `unit_cost` is **not recalculated** — the existing value is preserved
- [ ] `estimated_value` is always recomputed as `quantity × unit_cost` on every inventory upsert
- [ ] The historical price query is encapsulated in `inventoryStore.fetchHistoricalPriceForCrop(cropId)` returning `{ avgPrice, saleCount }` — returns `{ avgPrice: 0, saleCount: 0 }` when no data
- [ ] The query is lightweight: max 5 rows, filtered by `crop_id` chain (see Technical Notes for query approach)
- [ ] If the historical query fails (network error), the system falls back to retaining the existing `unit_cost` value on the row (no regression on price)

### AC3: Price Prompt When No Historical Data (Mark Complete Flow)

- [ ] The price prompt flow is orchestrated entirely in **`PlantingDetailPage.vue`'s `markComplete()` handler** — NOT inside `farm-store.js` (stores cannot call `$q.dialog`). The sequence is:
  1. `PlantingDetailPage.vue` calls `inventoryStore.fetchHistoricalPriceForCrop(cropId)`
  2. If `saleCount === 0`: show `EstimatedPriceDialog.vue` **before** the existing `$q.dialog` completion confirmation
  3. User provides price or skips → `PlantingDetailPage.vue` calls `farmStore.markHarvestComplete(harvestId)`
  4. On success, if user provided a price: `PlantingDetailPage.vue` calls `inventoryStore.updateItem(rowId, { unit_cost: price, estimated_value: qty * price })`
     - **Note:** If `inventoryStore.updateItem` does not yet include `unit_cost` and `estimated_value` in its known schema fields, add them to the update data builder in that action (or use a direct `tables.updateRow` call as a fallback)
  5. If `saleCount > 0`: skip price dialog and proceed directly to the existing completion confirmation
- [ ] `EstimatedPriceDialog.vue` props: `cropName: String`, `modelValue: Boolean`. Emits: `update:modelValue`, `confirm(price: Number)`, `skip`
  - Label: "No previous sales found for [Crop Name]. What is your estimated sale price per kg? (ZMW)"
  - Currency input, min 0, with help text: "This will be used to estimate the inventory value. You can update it when you record the actual sale."
  - Buttons: "Set Price & Complete Harvest" (positive) and "Skip (use 0)" (flat, grey)
- [ ] On dialog **dismissed** (X / backdrop click): treat as "Skip (use 0)" — harvest can still be completed
- [ ] For **perennial crops** with a prior completed harvest cycle: `saleCount > 0` from their own prior cycles — price dialog skipped automatically
- [ ] The dialog is only shown for the **Mark Complete** action, not on individual entry adds

### AC4: Harvest ↔ Inventory Bi-Directional Links

- [ ] **Planting Detail Page** (`PlantingDetailPage.vue`) — in the Harvest card, the existing footer link `"X kg available in inventory"` is enhanced:
  - Shows crop-produce item name (not just the quantity)
  - Shows current inventory status badge (UI label mapped from stored snake_case status: `'in_stock'` → "Available for Sale", `'low_stock'` → "Low Stock", `'out_of_stock'` → "Out of Stock")
  - If `unit_cost > 0`: shows `"Estimated Value: ZMW [amount]"`
  - If `unit_cost === 0`: shows `"⚠️ No sale price set — open inventory to set estimated value"`
  - Link navigates to `InventoryDetailPage` for the linked item
- [ ] The footer link is visible for **both** In Progress and Completed harvests (not just Completed as in Story 3.5 AC7)
- [ ] **Inventory Detail Page** (`InventoryDetailPage.vue`, existing) — for `item_type = 'farm_produce'` items (`v-if="item.item_type === 'farm_produce'"`):
  - A "Source" section displays: Source Planting link (→ `PlantingDetailPage`), Crop name, Plot name
  - This uses the existing `planting_id` and `crop_id` on the inventory row
  - Lazy-load the planting and plot on `onMounted` using `farmStore.fetchPlantingById(item.planting_id)` and `farmStore.fetchPlotById(planting.plot_id)` — both actions exist from Stories 3.1/3.3
  - If `planting_id` is null (manually added inventory), this section is hidden
  - If the linked planting no longer exists, show "Source planting no longer available" (non-breaking)
- [ ] Both links are non-breaking: if the linked record no longer exists, show "Source planting no longer available" instead of an error

### AC5: Perennial Aggregate Model — Final Design

- [ ] The design decision is codified: **one aggregated inventory row per planting** for perennial crops (not one per harvest cycle)
- [ ] The Planting Detail Page perennial harvest history shows:
  - A single "Produce in Inventory" link reflecting the cumulative quantity across all harvest cycles
  - Cumulative quantity is always `sum of all harvest_entries.quantity_kg` for the planting (already maintained by Story 3.5/3.6)
- [ ] The `item_name` for perennials uses the `(Ongoing)` suffix (from AC1) to signal that quantity grows over time
- [ ] When a perennial planting status is set to `'completed'` (via `updatePlantingStatus(plantingId, 'completed')` in `farm-store.js`):
  - Detect that the planting's crop is `Perennial` inside `updatePlantingStatus` after the status update succeeds
  - If perennial: fetch the inventory row via `inventoryStore.findFarmProduceRow(plantingId)` and update its `item_name` from `[Crop] – [Plot] (Ongoing)` → `[Crop] – [Plot] [Season Label of last harvest_end_date]` using `derivePerennialCompleteName`
  - Status: if `quantity > 0`, the inventory status is left unchanged (remains `'in_stock'` — not forced to `'out_of_stock'`)
  - The price prompt (`EstimatedPriceDialog.vue`) for `unit_cost === 0` on perennial complete is shown in `PlantingDetailPage.vue` (same pattern as AC3) — triggered by the UI action that calls `updatePlantingStatus`, not inside the store
- [ ] This design decision is documented in a comment in `farm-store.js` and in `DATABASE_SCHEMA.md`

### AC6: Farm Dashboard — Farm Produce Inventory Widget

- [ ] `FarmDashboardPage.vue` gets a new **"Farm Produce"** widget (`FarmProduceWidget.vue`) showing:
  - Total farm produce inventory items (count of rows with `item_type = 'farm_produce'`)
  - Total estimated value (sum of `estimated_value` across all farm produce rows)
  - A list of up to 5 items sorted by `estimated_value` descending, each showing: item name, quantity (kg), estimated value (ZMW)
  - Items with `unit_cost === 0` shown with a `⚠️` badge: "No price set"
  - Items with `status = 'in_stock'` (or `'low_stock'`) shown with appropriate chips — green for `'in_stock'`, yellow for `'low_stock'`
- [ ] Clicking the widget title navigates to `/inventory?type=farm_produce`
- [ ] Clicking an individual item row navigates to its `InventoryDetailPage`
- [ ] Widget uses a dedicated `inventoryStore.fetchFarmProduceItems()` action (to be added in `inventory-store.js`) that queries only `item_type = 'farm_produce'`, storing results in a separate `farmProduceItems` state slice — **do not reuse `fetchAllItems`** (that is the Finance Balance Sheet method and loads all inventory types)
- [ ] Widget computed: `farmProduceItems` (from `inventoryStore.farmProduceItems`), `totalEstimatedValue`, `itemsWithNoPrice`
- [ ] Widget follows the existing `WidgetBase` component pattern established in Epic 2/3
- [ ] Widget is mobile-responsive

### AC7: In-App Notification on Harvest Completion

- [ ] When `markHarvestComplete` succeeds, a `$q.notify` toast is shown in **`PlantingDetailPage.vue`** (not in the store):
  - If inventory row found: `"✅ Harvest completed. Inventory updated: [quantity] kg [Crop Name] available."`
  - The notification includes a clickable "View in Inventory" action button that navigates to the inventory detail page
- [ ] For perennial crops completing a harvest cycle (not marking planting complete): `"✅ Harvest #[N] completed. Cumulative produce: [total] kg [Crop Name] available."`
- [ ] These replace/extend the existing "Harvest completed" plain notify from Story 3.5 AC7

### AC8: Validation and Edge Cases

- [ ] **Zero-quantity harvest**: if `total_quantity_kg === 0` when Mark Complete is clicked, block completion with error: "Cannot complete a harvest with zero quantity. Add at least one entry."
- [ ] **Inventory row missing** (deleted externally): `markHarvestComplete` proceeds normally; the completion notification skips the inventory link with a warning: "Harvest completed but inventory record not found. Check inventory manually."
- [ ] **Price dialog dismissed** (user closes without choosing): treated the same as "Skip (use 0)" — harvest can still be completed
- [ ] **Multiple concurrent harvests for same crop** (different plantings): each gets its own inventory row (by `planting_id`); historical price query aggregates across all plantings of the same crop — this is correct behaviour
- [ ] **`item_name` rename on perennial complete**: if the inventory row is already linked to a sale, the rename still occurs (name change does not affect sale records which link by `inventory_item_id`)

### AC9: Sample Data Update

- [ ] `useFarmSampleData.js` updated so all `farm_produce` inventory rows in sample data use the AC1 naming convention
- [ ] Sample data includes at least one completed annual harvest **with** a historical sale (so the price lookup path is exercised) and at least one completed harvest **without** prior sales (so the zero-price/prompt path is exercised)
- [ ] The `unit_cost` on sample produce rows reflects realistic ZMW market prices (not 0):
  - Maize: ~2.00 ZMW/kg
  - Tomatoes: ~3.50 ZMW/kg
  - Groundnuts: ~8.00 ZMW/kg
  - Banana: ~2.50 ZMW/kg
  - Papaya: ~4.00 ZMW/kg

---

## Technical Implementation Notes

### Historical Price Query Strategy

Appwrite does not support cross-table JOINs. The historical price lookup requires a two-step approach:

```javascript
// inventoryStore.fetchHistoricalPriceForCrop(cropId)
async fetchHistoricalPriceForCrop(cropId) {
  // Step 1: Find all planting IDs for this crop (limit 50 for performance)
  const plantingsResult = await tables.listRows({
    databaseId: DB_ID,
    tableId: 'plantings',
    queries: [Query.equal('crop_id', cropId), Query.limit(50)],
  });
  const plantingIds = plantingsResult.rows.map((p) => p.$id);
  if (plantingIds.length === 0) return { avgPrice: 0, saleCount: 0 };

  // Step 2: Find harvests for those plantings (limit 20)
  const harvestsResult = await tables.listRows({
    databaseId: DB_ID,
    tableId: 'harvests',
    queries: [Query.equal('planting_id', plantingIds), Query.limit(20)],
  });
  const harvestIds = harvestsResult.rows.map((h) => h.$id);
  if (harvestIds.length === 0) return { avgPrice: 0, saleCount: 0 };

  // Step 3: Find the 5 most recent farm_sales for those harvests
  const salesResult = await tables.listRows({
    databaseId: DB_ID,
    tableId: 'farm_sales',
    queries: [
      Query.equal('harvest_id', harvestIds),
      Query.orderDesc('sale_date'),
      Query.limit(5),
    ],
  });
  const sales = salesResult.rows;
  if (sales.length === 0) return { avgPrice: 0, saleCount: 0 };

  const avgPrice = sales.reduce((sum, s) => sum + s.price_per_kg, 0) / sales.length;
  return { avgPrice: Math.round(avgPrice * 100) / 100, saleCount: sales.length };
}
```

> **Performance note**: This is a 3-step sequential query. For MVP scale (tens of plantings per crop), this is acceptable. For production scale, consider a Cloud Function or denormalized `avg_price_per_crop` cache table. Document in `POST-MVP.md`.

### `deriveProduceName(crop, plot, harvestDate)` Helper

```javascript
// src/modules/farm/utils/farm-utils.js
export function deriveProduceName(crop, plot, harvestDate) {
  const cropName = crop?.crop_name || 'Unknown Crop';
  const plotName = plot?.name || 'Unknown Plot';
  if (crop?.crop_type === 'Perennial') {
    return `${cropName} – ${plotName} (Ongoing)`;
  }
  // Derive season label from harvest date
  // Pin to noon UTC to avoid timezone drift across season boundaries
  const dateStr = harvestDate
    ? (typeof harvestDate === 'string' ? harvestDate : harvestDate.toISOString()).split('T')[0]
    : new Date().toISOString().split('T')[0];
  const date = new Date(dateStr + 'T12:00:00Z');
  const month = date.getUTCMonth() + 1; // 1-12, UTC-safe
  const year = date.getUTCFullYear();
  const seasonLabel =
    month >= 5 && month <= 10
      ? `${year} Dry Season`
      : month >= 11
        ? `${year}/${year + 1} Wet Season`
        : `${year - 1}/${year} Wet Season`;
  return `${cropName} – ${plotName} ${seasonLabel}`;
}

export function derivePerennialCompleteName(crop, plot, lastHarvestDate) {
  // Used when a perennial planting is marked complete
  const cropName = crop?.crop_name || 'Unknown Crop';
  const plotName = plot?.name || 'Unknown Plot';
  // Pin to noon UTC to avoid timezone drift across season boundaries
  const dateStr = lastHarvestDate
    ? (typeof lastHarvestDate === 'string' ? lastHarvestDate : lastHarvestDate.toISOString()).split(
        'T',
      )[0]
    : new Date().toISOString().split('T')[0];
  const date = new Date(dateStr + 'T12:00:00Z');
  const month = date.getUTCMonth() + 1; // UTC-safe
  const year = date.getUTCFullYear();
  const seasonLabel =
    month >= 5 && month <= 10
      ? `${year} Dry Season`
      : month >= 11
        ? `${year}/${year + 1} Wet Season`
        : `${year - 1}/${year} Wet Season`;
  return `${cropName} – ${plotName} ${seasonLabel}`;
}
```

### `createOrUpdateFarmProduceFromHarvest` Changes

The existing function in `inventory-store.js` needs the following changes:

1. Accept `plot` as an additional context parameter (already fetchable via `_resolveHarvestContext` extension — see Concern 1)
2. When **creating a new row** (no existing row found): call `fetchHistoricalPriceForCrop(cropId)` to set `unit_cost`; set `item_name` via `deriveProduceName(crop, plot, harvestDate)`; set `crop_id: crop.$id` (**currently missing from the live implementation**)
3. When **updating an existing row**: preserve `item_name` and `unit_cost` — do NOT overwrite either
4. `estimated_value` is always recomputed as `quantity × unit_cost` on every upsert

The function signature becomes:

```javascript
async createOrUpdateFarmProduceFromHarvest({ planting, crop, plot, entry, harvestTotals })
```

**New row must include `crop_id`:**

```javascript
const newItem = {
  item_name: deriveProduceName(crop, plot, entry.entry_date),
  item_type: 'farm_produce', // snake_case — canonical stored value
  crop_id: crop.$id, // REQUIRED — was missing; needed for AC4 Source section
  planting_id: planting.$id,
  quantity: entryQty,
  unit: 'kg',
  unit_cost: Math.round(unitCost * 100) / 100,
  estimated_value: Math.round(entryQty * unitCost * 100) / 100,
  status: this._deriveInventoryStatus(entryQty, 0), // returns 'in_stock'/'low_stock'/'out_of_stock'
  source: 'farm_harvest',
  source_reference_id: harvestId,
  reorder_threshold: 0,
  date_added: nowIso,
};
```

### New Component: `EstimatedPriceDialog.vue`

```
src/modules/farm/components/EstimatedPriceDialog.vue
```

- Quasar `q-dialog` wrapping `q-card`
- Props: `cropName: String`, `modelValue: Boolean`
- Emits: `update:modelValue`, `confirm(price: Number)`, `skip`
- Currency input with ZMW prefix, min 0, greedy validation
- "Set Price & Complete Harvest" (positive, `farm:write` required) + "Skip (use 0)" (flat, grey) buttons

### New Component: `FarmProduceWidget.vue`

```
src/modules/farm/components/FarmProduceWidget.vue
```

- Follows `WidgetBase.vue` pattern (see `docs/implementation-artifacts/dashboard-widget-pattern.md`)
- Reads `inventoryStore.farmProduceItems` (dedicated state slice — **not** `inventoryStore.items`)
- Calls `inventoryStore.fetchFarmProduceItems()` on mount (new action to be added to `inventory-store.js`)
- Computed: `farmProduceItems`, `totalEstimatedValue`, `itemsWithNoPrice`
- Filters: `item_type === 'farm_produce'` (snake_case)

### New Utility File: `farm-utils.js`

```
src/modules/farm/utils/farm-utils.js
```

- Exports: `deriveProduceName`, `derivePerennialCompleteName`
- Pure functions — no store imports — so they can be used in both `farm-store.js` and components

---

## Files to Create

| File                                                   | Purpose                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `src/modules/farm/components/EstimatedPriceDialog.vue` | Price prompt shown before Mark Complete when no price history |
| `src/modules/farm/components/FarmProduceWidget.vue`    | Farm Dashboard widget showing farm produce inventory          |
| `src/modules/farm/utils/farm-utils.js`                 | `deriveProduceName`, `derivePerennialCompleteName` helpers    |

---

## Files to Modify

| File                                                  | Changes                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/stores/inventory-store.js`                       | Add `fetchHistoricalPriceForCrop(cropId)`; add `fetchFarmProduceItems()` action + `farmProduceItems` state slice; update `createOrUpdateFarmProduceFromHarvest` to accept `plot`, call `deriveProduceName`, set `crop_id`, call price lookup on new rows only, never overwrite `item_name`/`unit_cost` on update |
| `src/modules/farm/stores/farm-store.js`               | Extend `_resolveHarvestContext` to also fetch `plot`; pass `plot` to `createOrUpdateFarmProduceFromHarvest`; add perennial item_name rename logic inside `updatePlantingStatus` when `newStatus === 'completed'` and crop is Perennial                                                                           |
| `src/modules/farm/pages/PlantingDetailPage.vue`       | Orchestrate price prompt flow in `markComplete()` handler (AC3); enhance harvest footer link (AC4): show item name, status badge, estimated value, price-missing warning; show link for In Progress harvests too; update `markHarvestComplete` notify to use revised message (AC7)                               |
| `src/modules/farm/pages/FarmDashboardPage.vue`        | Add `FarmProduceWidget` (AC6)                                                                                                                                                                                                                                                                                    |
| `src/modules/inventory/pages/InventoryDetailPage.vue` | Add "Source" section for Farm Produce items showing planting/crop/plot links (AC4)                                                                                                                                                                                                                               |
| `src/composables/useFarmSampleData.js`                | Update `item_name` on all farm produce rows to follow AC1 convention; add realistic `unit_cost` values (AC9)                                                                                                                                                                                                     |
| `DATABASE_SCHEMA.md`                                  | Document naming convention, perennial aggregate design decision, `unit_cost` market-price semantics                                                                                                                                                                                                              |
| `docs/POST-MVP.md`                                    | Add: historical price Cloud Function optimization; FIFO cost basis (already present); per-sale average price cache                                                                                                                                                                                               |

---

## Areas of Concern and Potential Problems

### ⚠️ Concern 1: `_resolveHarvestContext` Does Not Currently Fetch the Plot

**Problem:** `farm-store.js`'s `_resolveHarvestContext(plantingId)` resolves the planting and crop objects, but does NOT fetch the plot. `deriveProduceName` requires the `plot.name`. If we don't fetch the plot, the item name degrades to `[Crop] – Unknown Plot [Season]`.

**Mitigation:** Extend `_resolveHarvestContext` to also fetch the plot via `fetchPlotById(planting.plot_id)` — this adds one more Appwrite call per harvest entry add. For MVP it's acceptable. The plot object can be cached in `this.plots` (already loaded on the Farm Dashboard), so the fetch will often be a cache hit.

**Recommendation:** Extend `_resolveHarvestContext`; document the extra call in a comment.

---

### ⚠️ Concern 2: The 3-Step Historical Price Query Is Called on Every Entry Add

**Problem:** `createOrUpdateFarmProduceFromHarvest` is called on every `addHarvestEntry` call. The 3-step price query (plantings → harvests → farm_sales) would fire on every single entry, which is wasteful — especially for a multi-day harvest with 10+ entries.

**Recommendation:** Call `fetchHistoricalPriceForCrop` **only** in these two cases:

1. When the **first** entry is created (i.e., `harvestTotals.total_quantity_kg === entry.quantity_kg` — meaning there was no prior quantity)
2. When the user explicitly clicks **Mark Complete**

For subsequent `addHarvestEntry` calls (after the first), skip the price lookup and preserve the existing `unit_cost`. This reduces the query to at most 2 calls per harvest lifecycle.

---

### ⚠️ Concern 3: Appwrite `Query.equal` Does Not Support Arrays Larger Than ~100 Items

**Problem:** `fetchHistoricalPriceForCrop` queries `harvests` using `Query.equal('planting_id', plantingIds)` — an array filter. If the crop has been planted many times (>100 plantings), this array may exceed Appwrite's filter limit.

**Recommendation:** Apply `Query.limit(50)` on the plantings query (already in the pseudo-code above). 50 plantings → up to 20 harvests → up to 5 sales is well within bounds for MVP scale. Document the scalability ceiling in `POST-MVP.md`.

---

### ⚠️ Concern 4: `InventoryDetailPage.vue` Does Not Currently Resolve `planting_id` to a Planting Object

**Problem:** The existing `InventoryDetailPage.vue` (built in Epic 2) works generically for all inventory types. It does not know about farm concepts (planting, plot, crop). Adding farm-specific sections requires conditional rendering (`v-if="item.item_type === 'Farm Produce'"`) plus store actions to fetch the linked planting and plot by ID.

**Recommendation:** Use a `v-if` guard; lazy-load the planting + plot data in the `onMounted` of the page only when `item.item_type === 'Farm Produce'`. Use `farmStore.fetchPlantingById` (already exists from Story 3.3) and `farmStore.fetchPlotById` (already exists from Story 3.1). No new store actions needed.

---

### ⚠️ Concern 5: Perennial Item Name Rename on Planting Complete May Conflict with In-Flight Sales

**Problem:** If a farm sale has been recorded for the inventory item (Story 3.8 work), renaming `item_name` from `(Ongoing)` to `[Season]` is cosmetic — it does not affect `farm_sales.inventory_item_id` FK integrity. However, if `item_name` is displayed in the sale record's detail view (Story 3.8), the renamed item will look different from what the user saw when they recorded the sale.

**Impact:** Low — cosmetic inconsistency only.
**Recommendation:** Accept this for MVP. Story 3.8 should link to the inventory item by ID, not by name. No action required for this story.

---

### ⚠️ Concern 6: Zero-Quantity Guard for Mark Complete Already Partially Exists

**Problem:** Story 3.5 AC7 added a `$q.dialog` confirmation before mark complete but does **not** currently guard against `total_quantity_kg === 0`. It is possible to mark complete a harvest with zero total quantity (though unlikely in practice — the form requires `quantity_kg > 0` per entry).

**Recommendation:** Add the guard in `markHarvestComplete` in `farm-store.js` (AC8): check `harvest.total_quantity_kg > 0` before proceeding; return an error if not. This is a low-risk defensive guard.

---

## Testing Checklist

### Manual Testing

#### Test 1: Item Naming (AC1)

**Scenario A: Annual crop harvest name**

1. Record a harvest for a Maize planting on "North Field" with entries in February
2. Mark harvest complete
3. Navigate to `/inventory`
4. Find the Farm Produce item — **Verify**: name is `Maize – North Field 2024/25 Wet Season` (or appropriate year)

**Scenario B: Perennial crop harvest name**

1. Open a Banana planting (perennial) on "Orchard Plot"
2. Record harvest entry (continuous picking)
3. Navigate to `/inventory`
4. **Verify**: item name is `Banana – Orchard Plot (Ongoing)`
5. Click "Mark Planting Complete" on the planting
6. Navigate back to `/inventory` — **Verify**: item name renamed to `Banana – Orchard Plot [Season Label]`

**Scenario C: Dry season**

1. Record a harvest for any crop with entries in July
2. **Verify**: item name ends with `[Year] Dry Season`

---

#### Test 2: Historical Price Calculation (AC2)

**Scenario A: Historical sale exists**

1. Use sample data (which includes at least one farm sale for Maize at ~2.00 ZMW/kg)
2. Record a new Maize harvest entry
3. Mark complete
4. Navigate to inventory item
5. **Verify**: `unit_cost` ≈ 2.00 ZMW/kg (matches sample data sale price)
6. **Verify**: `estimated_value` = quantity × unit_cost (not zero)

**Scenario B: No historical sales**

1. Record a harvest for a crop with no prior sales (e.g., Sorghum — not in sample sales data)
2. Mark complete
3. **Verify**: Price prompt dialog appears (AC3)

---

#### Test 3: Price Prompt Dialog (AC3)

**Scenario A: Set price**

1. Complete harvest for crop with no sale history
2. **Verify**: `EstimatedPriceDialog` appears with crop name
3. Enter price: 5.00 ZMW
4. Click "Set Price & Complete Harvest"
5. **Verify**: Harvest status → Completed
6. **Verify**: inventory `unit_cost` = 5.00 ZMW
7. **Verify**: `estimated_value` = quantity × 5.00

**Scenario B: Skip price**

1. Complete harvest for crop with no sale history
2. Click "Skip (use 0)"
3. **Verify**: Harvest completed; `unit_cost` = 0; `estimated_value` = 0
4. **Verify**: Inventory footer link shows ⚠️ warning

**Scenario C: Dialog dismissed (X button)**

1. Complete harvest for crop with no sale history
2. Close dialog via X
3. **Verify**: Harvest is still completed (skip behaviour)
4. **Verify**: `unit_cost` = 0

---

#### Test 4: Harvest ↔ Inventory Links (AC4)

**Scenario A: Footer link on In Progress harvest**

1. Open a planting with an In Progress harvest (at least one entry added)
2. **Verify**: Harvest footer shows inventory link (not just for Completed)
3. **Verify**: Link shows item name, quantity, status badge

**Scenario B: Zero price warning**

1. Open an inventory item with `unit_cost = 0`
2. **Verify**: Harvest footer on planting shows `⚠️ No sale price set`

**Scenario C: Inventory Detail → Source Planting**

1. Navigate to `/inventory`
2. Click a Farm Produce item
3. **Verify**: "Source" section shows: linked planting name/link, crop name, plot name
4. Click planting link — **Verify**: navigates to `PlantingDetailPage`

---

#### Test 5: Farm Dashboard Widget (AC6)

**Scenario A: Widget visible**

1. Navigate to `/farm` (Farm Dashboard)
2. **Verify**: "Farm Produce" widget appears
3. **Verify**: Shows total item count, total estimated value
4. **Verify**: Lists up to 5 items by estimated value (desc)
5. **Verify**: Items with `unit_cost = 0` show ⚠️ badge

**Scenario B: No price items**

1. Navigate to widget
2. Items with no price should show yellow/orange "No price set" badge

**Scenario C: Widget navigation**

1. Click widget title — **Verify**: navigates to `/inventory?type=Farm+Produce`
2. Click individual item row — **Verify**: navigates to inventory detail

---

#### Test 6: Completion Notification (AC7)

**Scenario A: Annual harvest**

1. Mark an annual harvest complete
2. **Verify**: Toast notification appears: "✅ Harvest completed. [X] kg [Crop] added to inventory."
3. **Verify**: "View in Inventory" action button in toast navigates to inventory item

**Scenario B: Perennial harvest cycle**

1. Complete a perennial harvest (not "Mark Planting Complete")
2. **Verify**: Toast: "✅ Harvest #2 completed. Cumulative produce: [X] kg [Crop]."

---

#### Test 7: Edge Cases (AC8)

**Scenario A: Zero quantity guard**

1. Record a harvest for any planting; add one entry (e.g., 5 kg)
2. Delete that entry (using the "Delete Entry" button) — this leaves `total_quantity_kg = 0`
3. Attempt to click "Mark Complete"
4. **Verify**: Error shown: "Cannot complete a harvest with zero quantity. Add at least one entry."

**Scenario B: Missing inventory row**

1. Simulate deleted inventory row (manual DB delete during testing)
2. Mark harvest complete
3. **Verify**: Harvest is still completed; toast shows "Harvest completed but inventory record not found."

---

#### Test 8: Sample Data (AC9)

1. Run setup wizard → "Explore with Sample Data"
2. Navigate to `/inventory` → filter by Farm Produce
3. **Verify**: All farm produce items follow the naming convention (no "Unknown Crop" or generic names)
4. **Verify**: At least one item has `unit_cost > 0`
5. **Verify**: Items show `Available for Sale` status

---

### Automated Testing (Post-MVP)

- `deriveProduceName` pure function unit tests: annual dry/wet season, perennial, edge cases (null inputs)
- `fetchHistoricalPriceForCrop`: mock Appwrite responses — no data, 1 sale, 5 sales
- `createOrUpdateFarmProduceFromHarvest`: verify `item_name` not overwritten on update; verify `unit_cost` set from history
- `markHarvestComplete`: zero-quantity guard; price dialog triggered correctly; notify action includes link

---

## Dependencies on Future Stories

| This Story           | Depends On | Future Stories Depend On This                                                                                                                               |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.7 Inventory Polish | 3.1–3.6    | 3.8 (Sales — needs reliable `unit_cost` as starting price); 3.9 (Profitability — uses `estimated_value`); 3.10 (Yield — uses inventory for stock reporting) |

---

## Deferred to POST-MVP

| Feature                                                                    | Reason                                                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cloud Function for historical price (3-step query)                         | Acceptable at MVP scale; document in `POST-MVP.md`                                              |
| Average price cache table per crop                                         | Optimization; not needed for MVP scale                                                          |
| Multiple inventory rows per perennial harvest cycle (one per cycle option) | Epics spec mentioned this; single aggregate row is simpler and sufficient; add to `POST-MVP.md` |
| FIFO cost basis (already in POST-MVP.md)                                   | Already tracked from Story 3.5                                                                  |

---

## Sample Data Requirements

`useFarmSampleData.js` update summary:

- All farm produce `item_name` values updated to AC1 convention
- Maize/Tomatoes/Groundnuts produce rows: `unit_cost` set to realistic ZMW prices (per AC9)
- Banana/Papaya/Moringa produce rows: `unit_cost` set to realistic prices
- At least one produce row should remain with `unit_cost = 0` to demonstrate the ⚠️ warning state (e.g., Sorghum, if present in sample data)

---

## Sign-off Checklist

Before marking this story complete:

- [ ] All acceptance criteria met (or explicitly deferred with documentation)
- [ ] `deriveProduceName` tested with dry/wet season boundary months (April, May, October, November)
- [ ] `fetchHistoricalPriceForCrop` tested with zero, one, and five historical sales
- [ ] All new files have proper module headers
- [ ] `DATABASE_SCHEMA.md` updated with naming convention and perennial design note
- [ ] `POST-MVP.md` updated with price query optimization item
- [ ] `useFarmSampleData.js` produces item names that match the convention
- [ ] Manual testing checklist completed
- [ ] No console errors or warnings
- [ ] Mobile responsive: `FarmProduceWidget` and `EstimatedPriceDialog` verified on 320px
- [ ] RBAC enforced: price dialog only accessible to `farm:write` users
- [ ] Verify `crop_id` is set on all newly created farm produce inventory rows (not null in DB)
- [ ] Verify `item_type = 'farm_produce'` (snake_case) on all farm produce rows — not `'Farm Produce'`
- [ ] Verify `FarmProduceWidget` uses `inventoryStore.farmProduceItems` (not `items`)
- [ ] Verify price prompt is in `PlantingDetailPage.vue`, not `farm-store.js`
- [ ] Ready for Story 3.8 (Sales Recording)

---

_Last Updated: 2026-04-28 (revised after review)_
_Story Template Version: 1.0_
_Status: Ready for Implementation_

---

## Senior Developer Review

**Reviewer:** Senior Dev Agent (Adversarial Review)
**Date:** 2026-04-28
**Story Status at Review:** Draft

---

### Overall Assessment

**VERDICT: REVISIONS REQUIRED** — The story is well-structured and the scope clarification is accurate and honest. The core intent is sound. However, several ACs contain contradictions with the actual codebase, an untested assumption about Appwrite query capabilities, a semantic mismatch that will cause a runtime bug, and a missing RBAC consideration. These must be resolved before implementation begins.

---

### Critical Findings (Must Fix)

#### CRIT-1: `item_type` Casing Mismatch — AC1, AC6 Will Produce Runtime Bugs

**Evidence from code:**

```@c:\Users\Kamal\village-management\src\stores\inventory-store.js:607
Query.equal('item_type', 'farm_produce'),
```

```@c:\Users\Kamal\village-management\src\stores\inventory-store.js:695
item_type: 'farm_produce',
```

The `inventory-store.js` consistently writes and queries `item_type = 'farm_produce'` (snake_case, lowercase). However, `DATABASE_SCHEMA.md` documents the enum as `'Farm Produce'` (Title Case). The story ACs use both values interchangeably:

- **AC6** reads: `item_type === 'Farm Produce'` (Title Case) — but the store writes `'farm_produce'`
- **AC4** reads: `item_type = 'Farm Produce'` — same mismatch
- The `FarmProduceWidget` filter `item_type === 'Farm Produce'` will return **zero results** at runtime against actual DB rows

**Required fix:** The story must pick **one canonical casing** and enforce it everywhere. Since existing live data uses `'farm_produce'`, the correct path is:

1. Use `'farm_produce'` in all AC code examples and widget filters
2. Update `DATABASE_SCHEMA.md` in the "Files to Modify" list to correct the schema documentation to reflect the actual stored value
3. Add a note in AC1 that `item_type = 'farm_produce'` (not `'Farm Produce'`) is the stored value

Similarly, `_deriveInventoryStatus` returns `'in_stock'` / `'low_stock'` / `'out_of_stock'` (snake_case), but the `DATABASE_SCHEMA.md` and several AC bullet points reference `'Available for Sale'`, `'Low Stock'`, `'Out of Stock'` (Title Case with spaces). AC6's `status = 'Available for Sale'` guard will **never match** against actual inventory rows.

**Required fix:** AC5, AC6 must use `'in_stock'` or whatever `_deriveInventoryStatus` actually returns. Alternatively, if farm produce should use different status values (like `'Available for Sale'`), that logic needs to be explicitly added to `_deriveInventoryStatus` — but this must be called out as a deliberate schema change.

---

#### CRIT-2: AC3 Price Dialog is a UI Concern Placed in a Store Action — Architectural Violation

**Evidence from code:**

```@c:\Users\Kamal\village-management\src\modules\farm\stores\farm-store.js:1356-1403
async markHarvestComplete(harvestId, { isContinuousPicking = false } = {}) {
```

The current `markHarvestComplete` is a **pure store action** — it has no `$q` reference, no dialog, no router. The existing notify call lives in `PlantingDetailPage.vue` (line 1159), not in the store.

AC3 states: "Before the existing `$q.dialog` confirmation, check `inventoryStore.fetchHistoricalPriceForCrop(cropId)`" — implying the price dialog fires from within the store. But stores cannot call `$q.dialog` directly (Quasar instance is not accessible from Pinia stores without injection).

**Required fix:** AC3 must clarify that the price prompt flow is orchestrated in **`PlantingDetailPage.vue`'s `markComplete()` handler** (or a new `useHarvestComplete.js` composable), not inside `markHarvestComplete` in the store. The correct sequence is:

1. `PlantingDetailPage.vue` calls `fetchHistoricalPriceForCrop(cropId)` → if 0 sales, shows `EstimatedPriceDialog`
2. User provides price (or skips)
3. `PlantingDetailPage.vue` calls `farmStore.markHarvestComplete(harvestId)`
4. After success, if user provided a price, `PlantingDetailPage.vue` calls `inventoryStore.updateItem(rowId, { unit_cost: price, estimated_value: qty * price })`

The story's "Files to Modify" table says `farm-store.js` gets the "price prompt trigger" — this is incorrect and will cause an architecture violation. Update to `PlantingDetailPage.vue`.

---

#### CRIT-3: AC2 Contradicts the Concern 2 Recommendation Within the Same Story

**AC2 states:** "When `createOrUpdateFarmProduceFromHarvest` is called (on every entry add), the system attempts to compute a market-based `unit_cost`..."

**Concern 2 says:** "Call `fetchHistoricalPriceForCrop` only on first entry and on Mark Complete."

These directly contradict each other. The implementer will follow AC2 (it's in the ACs section) and call the 3-step query on every entry add, causing the performance problem that Concern 2 warns about. The ACs are the implementation spec — they must be correct.

**Required fix:** AC2 must be rewritten to match the Concern 2 recommendation:

- First bullet: "The historical price lookup is called **only when the inventory row does not yet exist** (i.e., first entry) and when `markHarvestComplete` is triggered"
- Remove "on every entry add" from AC2

---

### Major Findings (Should Fix)

#### MAJ-1: AC1 Example Mismatch — Annual Name Format Inconsistency

AC1 defines the annual name format as: `[Crop Name] – [Plot Name] [Season Label]`

The example given is: `Maize – North Field 2025/26` — but the `[Season Label]` for wet season is `2025/26 Wet Season`, not just `2025/26`. The example is missing "Wet Season" / "Dry Season" from the label.

The `deriveProduceName` code snippet in Technical Notes does produce `Maize – North Field 2024/25 Wet Season` (correct), but AC1's example contradicts it. The implementer will be confused about which is authoritative.

**Required fix:** Update the AC1 example to `Maize – North Field 2025/26 Wet Season` to match the code snippet.

---

#### MAJ-2: AC5 — `markPlantingComplete` Does Not Exist in `farm-store.js`

The "Files to Modify" table says: "add perennial-complete item_name rename on `markPlantingComplete`". However, the farm store has `updatePlantingStatus(plantingId, newStatus)` (Story 3.4), not a dedicated `markPlantingComplete` action.

Similarly, the test in **Test 1 Scenario B** says "Click 'Mark Planting Complete' on the planting" — this UI affordance may not exist as a standalone button separate from `updatePlantingStatus`.

**Required fix:** Clarify in AC5 and the Files to Modify table whether:
(a) A new `markPlantingComplete` action is added to `farm-store.js`, or
(b) The inventory item_name rename logic is added inside `updatePlantingStatus` when `newStatus === 'completed'` for a perennial planting

Option (b) is more consistent with the existing architecture.

---

#### MAJ-3: AC6 Widget Calls `fetchAllItems` — Inventory Scope Problem

AC6 states: "Widget loads from `inventoryStore.items` (uses cached data if loaded; calls `fetchAllItems` if not)."

`fetchAllItems` fetches **all inventory items** (all types), which is used by the Finance Reports Balance Sheet. Loading all inventory just to filter `farm_produce` on the Farm Dashboard is expensive and may conflict with the Finance module's pagination expectations.

The existing `inventoryStore.items` state is the paginated list, not all items. `fetchAllItems` bypasses pagination and loads everything into a separate flow (it was added in Story 2.8 for Balance Sheet).

**Required fix:** Consider adding a `fetchFarmProduceItems()` action to `inventory-store.js` that queries only `item_type = 'farm_produce'`, storing results in a separate `farmProduceItems` state slice. This avoids polluting `inventoryStore.items` with an unfiltered full load. Alternatively, document that `fetchAllItems` is called and results are filtered client-side — but then document the state management implication clearly.

---

#### MAJ-4: `crop_id` Field Missing from `createOrUpdateFarmProduceFromHarvest` New Row

**Evidence from code:**

```@c:\Users\Kamal\village-management\src\stores\inventory-store.js:692-706
// Create new farm produce row
const newItem = {
  item_name: crop.crop_name || 'Farm Produce',
  item_type: 'farm_produce',
  quantity: entryQty,
  unit: 'kg',
  unit_cost: Math.round(unitCost * 100) / 100,
  estimated_value: Math.round(entryQty * unitCost * 100) / 100,
  status: this._deriveInventoryStatus(entryQty, 0),
  source: 'farm_harvest',
  source_reference_id: ...,
  planting_id: planting.$id,
  reorder_threshold: 0,
  date_added: nowIso,
```

The new row sets `planting_id` but **does NOT set `crop_id`**. The `DATABASE_SCHEMA.md` states `crop_id` is needed for the `(planting_id, crop_id)` aggregation pair. AC4's "Source" section in InventoryDetailPage needs `crop_id` to display the crop name. Without it, the link is broken.

**Required fix:** AC1's implementation note for `createOrUpdateFarmProduceFromHarvest` must explicitly call out that `crop_id: crop.$id` must be added to the `newItem` object. Add to the sign-off checklist: "Verify `crop_id` is set on newly created farm produce rows."

---

### Minor Findings (Nice to Fix)

#### MIN-1: AC7 Notify Message Says "Added to Inventory" — Incorrect for Subsequent Entries

AC7 notification text: `"✅ Harvest completed. [quantity] kg [Crop Name] added to inventory."`

The inventory row is not first created at completion — it was created on the first entry. By completion, the inventory has already been accumulating. "Added to inventory" implies creation, which is misleading. The quantity shown is the total cumulative quantity, not the "new" amount.

**Suggested text:** `"✅ Harvest completed. Inventory updated: [quantity] kg [Crop Name] available."` — more accurate.

---

#### MIN-2: Season Boundary — `deriveProduceName` Uses `new Date(harvestDate)` Without Timezone Guard

The code: `const date = harvestDate ? new Date(harvestDate) : new Date();`

If `harvestDate` is stored as an ISO string with UTC time (e.g., `"2025-10-31T22:00:00.000Z"`), parsing it in a UTC+2 timezone gives October 31, but in UTC-5 it gives November 1 — crossing the dry/wet season boundary. The helper needs to extract the **date portion only** (before the `T`) to avoid timezone drift.

**Suggested fix:** `const date = new Date((harvestDate || new Date().toISOString()).split('T')[0] + 'T12:00:00Z');` — pin to noon UTC to ensure the date is stable across timezones.

---

#### MIN-3: Sign-off Checklist Missing a Key Item — `crop_id` Populated on New Rows

The sign-off checklist does not include verifying that `crop_id` is populated on newly created farm produce rows (see MAJ-4). Add: `[ ] Verify inventory rows created by harvest entries have crop_id set`.

---

#### MIN-4: Test 7 Scenario A Is Not Reproducible Without DevTools Manipulation

The test says "Using DevTools, temporarily set `total_quantity_kg` to 0 in local state" — this is too brittle for a reliable regression check. Since the zero-quantity guard is in the store, a better test approach is to create a planting, start a harvest, and then delete all its entries (which currently leaves `total_quantity_kg = 0`) and then try to mark complete.

**Suggested alternative:** Document the test as: "Record a harvest, add one entry (e.g., 5kg), delete that entry, then attempt Mark Complete." This exercises the zero-quantity guard without DevTools manipulation.

---

### Positive Observations

- The scope clarification section is precise and honest — explicitly acknowledging what Story 3.5 subsumed avoids implementer confusion.
- Concern 2 (3-step query on every entry) identifies the most impactful performance trap, and the mitigation is correctly specified.
- The decision to codify the single-aggregate perennial model in AC5 is architecturally sound — prevents scope creep from the original epics "separate item per cycle" idea.
- The `deriveProduceName` helper as a pure function in `farm-utils.js` (no store imports) is the correct pattern and enables easy unit testing.
- `fetchHistoricalPriceForCrop` being in `inventory-store.js` (not `farm-store.js`) is the right boundary — price history is an inventory domain concern.
- The fallback behaviour for network errors on price lookup (AC2 last bullet) is well-specified and correct.

---

### Summary of Required Changes to Story Before Implementation

| ID     | Severity | AC Affected          | Action Required                                                                                               |
| ------ | -------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| CRIT-1 | Critical | AC1, AC5, AC6        | Standardize `item_type` to `'farm_produce'`; fix status values to `'in_stock'` / `'low_stock'` throughout ACs |
| CRIT-2 | Critical | AC3, Files to Modify | Move price dialog orchestration to `PlantingDetailPage.vue`, not `farm-store.js`                              |
| CRIT-3 | Critical | AC2                  | Rewrite to match Concern 2 — price query only on first entry and on Mark Complete                             |
| MAJ-1  | Major    | AC1                  | Fix example: `Maize – North Field 2025/26 Wet Season`                                                         |
| MAJ-2  | Major    | AC5, Files to Modify | Clarify `markPlantingComplete` vs `updatePlantingStatus`                                                      |
| MAJ-3  | Major    | AC6                  | Address `fetchAllItems` scope — add `fetchFarmProduceItems()` or document state impact                        |
| MAJ-4  | Major    | AC1, Sign-off        | `crop_id` must be explicitly set in new farm produce row; add to sign-off checklist                           |
| MIN-1  | Minor    | AC7                  | Update notify message to "Inventory updated" not "added to inventory"                                         |
| MIN-2  | Minor    | Technical Notes      | Timezone guard on `deriveProduceName` date parse                                                              |
| MIN-3  | Minor    | Sign-off             | Add `crop_id` check to sign-off checklist                                                                     |
| MIN-4  | Minor    | Test 7               | Replace DevTools manipulation test with entry-delete-then-complete scenario                                   |

_Review completed by: Senior Dev Agent_
