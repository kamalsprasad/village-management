# Story 3.8: Farm Module - Sales Recording with Finance and Inventory Integration

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.8  
**Status:** ready-for-dev  
**Date:** 2026-04-30  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to record farm sales with automatic inventory deduction and finance income creation, so that all systems stay synchronized and I can track complete profitability from planting through sale.

---

## Background and Scope

This story completes the farm-to-market value chain by enabling sales recording that simultaneously updates inventory, creates financial records, and maintains full audit trails. It builds on the harvest-to-inventory pipeline established in Story 3.7 and integrates deeply with the Finance module (Epic 2).

**Key Integration Challenge**: This story requires atomic operations across three domains:

1. **Farm**: Create `farm_sales` record linking harvest → inventory → sale
2. **Inventory**: Decrement `farm_produce` quantity, update status if depleted
3. **Finance**: Create income `transaction` with proper categorization

**Partial Sales Complexity**: A single harvest may be sold in multiple transactions (e.g., 500kg harvested, sold as 200kg + 150kg + 150kg to different buyers). The system must track cumulative sales against available inventory.

**Profit Calculation Foundation**: While Story 3.9 delivers full profitability analytics, this story must capture and store all data needed for profit calculations: sale revenue linked to planting costs (seeds, labor) and harvest costs (labor, other).

---

## Prerequisites

- **Story 3.1** (completed): Plot Management - plots exist
- **Story 3.2** (completed): Crops Database - crops with pricing context
- **Story 3.3** (completed): Planting Records - cost tracking (inputs, labor, other)
- **Story 3.4** (completed): Planting Status Tracking - harvest lifecycle
- **Story 3.5** (completed): Harvest Recording - entries with labor/other costs
- **Story 3.6** (completed): Continuous Picking - multiple harvests per planting
- **Story 3.7** (completed): Harvest-to-Inventory Integration - `farm_produce` rows with `crop_id`, `planting_id`
- **Epic 2 Story 2.1** (completed): Finance Income Recording - `createTransaction` action exists
- **Epic 2 Story 2.3** (completed): Finance Categories - "Farm Sales" income category exists
- **Database Schema**: `farm_sales` table exists per `DATABASE_SCHEMA.md`

---

## Acceptance Criteria

### AC1: "Record Sale" Button on Inventory Detail Page

- [ ] "Record Sale" button visible on `InventoryDetailPage.vue` for items with `item_type = 'farm_produce'`
- [ ] Button visible only to users with `farm:write` permission (Farm Manager, Admin)
- [ ] Button hidden when `quantity <= 0` (out of stock)
- [ ] Clicking button opens `RecordSaleDialog.vue` (reusable component pattern like `HarvestEntryDialog`)
- [ ] Dialog pre-fills: inventory item name, available quantity, crop name (from `crop_id` relationship)
- [ ] If inventory has `unit_cost > 0`, dialog suggests `price_per_kg = unit_cost` (editable)

### AC2: Sales Form Fields

- [ ] **Buyer** (required): Text input for buyer name. Note: Vendor module integration deferred to Epic 5.
- [ ] **Quantity Sold** (required): Number input (kg), step 0.1, max = `inventory.quantity` (validation)
- [ ] **Price per kg** (required): Currency input (ZMW), min 0
- [ ] **Total Amount** (auto-calculated): `quantity_sold × price_per_kg`, displayed prominently
- [ ] **Payment Method** (required): Dropdown - "Cash", "Bank Transfer", "Mobile Money", "Credit", "Other"
- [ ] **Payment Status** (required): Dropdown - "Pending", "Completed"
- [ ] **Sale Date** (required): Date picker, defaults to today
- [ ] **Notes** (optional): Text area, max 500 chars
- [ ] Form validation prevents submission with invalid/missing required fields
- [ ] Validation blocks sale if `quantity_sold > available_inventory` with error message

### AC3: Three-Way Automatic Integration on Sale Save

- [ ] Successful sale triggers THREE atomic operations:
  1. **Inventory Decrement**: Call `inventoryStore.adjustStock(itemId, { type: 'remove', quantity: soldQty })`
  2. **Finance Income**: Call `financeStore.createTransaction({ type: 'income', ... })` with:
     - `source_module: 'Farm'`
     - `category_id`: ID of "Farm Sales" income category
     - `description`: "Sale of [Crop Name] to [Buyer] - [Quantity]kg @ [Price]/kg"
     - `amount_needed` = `amount_funded` = total sale amount
     - `payment_method`, `payment_status`, `date` from form
  3. **Farm Sales Record**: Create row in `farm_sales` table with:
     - `inventory_item_id`: inventory row ID
     - `harvest_id`: resolved via `inventory.planting_id` → `harvests` lookup (most recent completed harvest for planting)
     - `finance_transaction_id`: ID from created finance transaction
     - All form fields: buyer, quantity_sold, price_per_kg, total_amount, payment_method, payment_status, sale_date, notes

- [ ] All three operations succeed or all fail (client-side rollback pattern)
- [ ] If inventory adjustment fails: do not create finance transaction or farm_sales record.
- [ ] If finance creation fails: reverse inventory adjustment, do not create farm_sales
- [ ] Success notification: "✅ Sale recorded: [Quantity]kg [Crop] to [Buyer] for ZMW [Amount]"
- [ ] Error notification on failure with specific error message

### AC4: Sale Detail Page

- [ ] Sale detail page accessible at `/farm/sales/:id`
- [ ] Display all sale information from `farm_sales` record
- [ ] **Cross-Module Links**:
  - Link to `InventoryDetailPage` for the sold item
  - Link to `PlantingDetailPage` (via planting lookup from inventory)
  - Link to Finance transaction detail (if finance module has detail view, otherwise show summary)
- [ ] **Profit Preview Section** (foundation for Story 3.9):
  - Display sale revenue (total_amount)
  - Display cost breakdown: Seed Costs, Planting Labor, Planting Other, Harvest Labor, Harvest Other
  - Display net profit: `revenue - total costs`
  - Display ROI percentage: `(profit / total costs) × 100`
  - Note: For perennials with multiple harvests, sum costs across all harvests for the planting
- [ ] **Partial Sale History**: If multiple sales exist for same harvest, show list of all sales with dates/quantities

### AC5: Partial Sales Support

- [ ] Multiple sale records can reference the same harvest/inventory
- [ ] Each sale independently decrements inventory quantity
- [ ] Inventory status automatically updates if quantity reaches 0 (`'out_of_stock'`)
- [ ] `InventoryDetailPage` shows "Sales History" subsection listing all `farm_sales` for this item
- [ ] Each inventory item displays: "X kg sold (Y sales) / Z kg harvested / A kg remaining"
- [ ] Validation prevents any sale that would result in negative inventory

### AC6: Farm Dashboard - Recent Sales Widget

- [ ] `FarmDashboardPage.vue` gets "Recent Sales" widget
- [ ] Widget shows last 5 `farm_sales` records:
  - Crop name, buyer, quantity, total amount (ZMW), sale date
- [ ] Widget displays total sales count and total revenue (last 30 days)
- [ ] Clicking widget title navigates to `/farm/sales` (sales list page - create basic version)
- [ ] Clicking individual sale row navigates to sale detail page
- [ ] Widget follows `WidgetBase.vue` pattern
- [ ] Empty state: "No sales recorded yet" with "Record Sale" button linking to inventory

### AC7: Sales List Page

- [ ] Basic sales list page at `/farm/sales`
- [ ] Columns: Sale Date, Crop, Buyer, Quantity, Total Amount, Payment Status
- [ ] Filters: Date range, Crop, Payment Status
- [ ] Sortable by date (default: newest first)
- [ ] Pagination for >25 sales
- [ ] Click row navigates to sale detail

### AC8: Validation and Edge Cases

- [ ] **Insufficient Inventory**: Block sale with error if `quantity_sold > available`
- [ ] **Zero-Price Guard**: Warn if `price_per_kg = 0` but allow with confirmation
- [ ] **Already Sold Out**: "Record Sale" button disabled on inventory with `quantity = 0`
- [ ] **Finance Category Missing**: If "Farm Sales" category not found, show warning and defer income creation (document in POST-MVP.md)
- [ ] **Harvest Lookup Failure**: If inventory has no linked planting/harvest, sale can still proceed but log warning
- [ ] **Concurrent Sale Race Condition**: Document in POST-MVP.md that client-side validation may allow overselling if two users submit simultaneously (true fix requires Cloud Function)

### AC9: Sample Data Updates

- [ ] `useFarmSampleData.js` updated to include sample farm sales:
  - At least 3 sales for different crops
  - Mix of payment methods and statuses
  - Sales referencing existing harvests from sample data
- [ ] Sample sales use realistic ZMW prices:
  - Maize: 2.00-2.50 ZMW/kg
  - Tomatoes: 3.00-4.00 ZMW/kg
  - Groundnuts: 7.00-9.00 ZMW/kg
- [ ] Sample data demonstrates partial sales (one harvest sold in 2+ transactions)

---

## Technical Implementation Notes

### Database Schema (farm_sales table)

Per `DATABASE_SCHEMA.md` line 200-219:

```javascript
// farm_sales table columns
{
  inventory_item_id: 'string (required, FK → inventory.id)',
  harvest_id: 'string (required, FK → harvests.id)',
  finance_transaction_id: 'string (required, FK → finance_transactions.id)',
  buyer: 'string (required)',
  quantity_sold: 'float (required, Min: 0)',
  price_per_kg: 'float (required, Min: 0)',
  total_amount: 'float (required, Min: 0)',
  payment_method: 'string (required)',
  payment_status: 'string (required, Enum: Pending/Completed)',
  sale_date: 'date (required)',
  notes: 'string (optional)'
}
```

### Three-Way Transaction Integrity Pattern

The sale creation must follow this rollback-capable pattern:

```javascript
// In farm-store.js: recordSale(saleData)
async recordSale({ inventoryItem, saleFormData }) {
  const results = { inventory: null, finance: null, farmSale: null };

  try {
    // Step 1: Decrement inventory (validate sufficient quantity)
    results.inventory = await inventoryStore.adjustStock(
      inventoryItem.$id,
      { type: 'remove', quantity: saleFormData.quantity_sold }
    );
    if (!results.inventory.success) throw new Error('Inventory adjustment failed');

    // Step 2: Create finance income transaction
    results.finance = await financeStore.createTransaction({
      type: 'income',
      category_id: await this.getFarmSalesCategoryId(), // fetch or cache
      source_module: 'Farm',
      amount_needed: saleFormData.total_amount,
      amount_funded: saleFormData.total_amount,
      payment_method: saleFormData.payment_method,
      payment_status: saleFormData.payment_status,
      date: saleFormData.sale_date,
      description: `Sale of ${cropName} to ${saleFormData.buyer} - ${saleFormData.quantity_sold}kg @ ${saleFormData.price_per_kg}/kg`,
    });
    if (!results.finance.success) {
      // Rollback inventory
      await inventoryStore.adjustStock(inventoryItem.$id,
        { type: 'add', quantity: saleFormData.quantity_sold });
      throw new Error('Finance transaction failed');
    }

    // Step 3: Create farm_sales record linking everything
    results.farmSale = await this.createFarmSaleRecord({
      inventory_item_id: inventoryItem.$id,
      harvest_id: await this.resolveHarvestForInventory(inventoryItem), // lookup harvest via planting
      finance_transaction_id: results.finance.data.$id,
      ...saleFormData
    });
    if (!results.farmSale.success) {
      // Rollback both (best effort - document limitation)
      await financeStore.deleteTransaction(results.finance.data.$id); // if exists
      await inventoryStore.adjustStock(inventoryItem.$id,
        { type: 'add', quantity: saleFormData.quantity_sold });
      throw new Error('Farm sale record failed');
    }

    return { success: true, data: results.farmSale.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Harvest Resolution Helper

Inventory items have `planting_id` but not direct `harvest_id`. To link sales to harvests:

```javascript
// In farm-store.js
async resolveHarvestForInventory(inventoryItem) {
  // Find most recent completed harvest for the planting
  const harvests = await this.fetchHarvestsForPlanting(inventoryItem.planting_id);
  const completedHarvests = harvests.filter(h => h.status === 'Completed');
  if (completedHarvests.length === 0) return null;

  // Return the harvest that most likely produced this inventory
  // For perennials: return the most recent completed harvest
  // (cumulative inventory model means we can't attribute specific kg to specific harvest)
  return completedHarvests.sort((a, b) =>
    new Date(b.harvest_end_date) - new Date(a.harvest_end_date)
  )[0].$id;
}
```

### Cost Aggregation for Profit Preview

```javascript
// Calculate costs for profit preview (AC4)
async calculatePlantingCostsForProfit(plantingId) {
  const planting = await this.fetchPlantingById(plantingId);
  const harvests = await this.fetchHarvestsForPlanting(plantingId);

  return {
    seedCosts: planting.inputs_cost || 0,
    plantingLabor: planting.labor_cost || 0,
    plantingOther: planting.other_cost || 0,
    harvestLabor: harvests.reduce((sum, h) => sum + (h.total_labor_cost || 0), 0),
    harvestOther: harvests.reduce((sum, h) => sum + (h.total_other_costs || 0), 0),
  };
}
```

### Finance Category Resolution

```javascript
// Cache farm sales category ID
async getFarmSalesCategoryId() {
  if (this._farmSalesCategoryId) return this._farmSalesCategoryId;

  const financeStore = useFinanceStore();
  await financeStore.fetchCategories();
  const category = financeStore.incomeCategories.find(c =>
    c.name.toLowerCase().includes('farm') && c.name.toLowerCase().includes('sale')
  );

  this._farmSalesCategoryId = category?.$id || null;
  return this._farmSalesCategoryId;
}
```

---

## Files to Create

| File                                                | Purpose                            |
| --------------------------------------------------- | ---------------------------------- |
| `src/modules/farm/components/RecordSaleDialog.vue`  | Sale recording form dialog         |
| `src/modules/farm/pages/SaleDetailPage.vue`         | Sale detail with profit preview    |
| `src/modules/farm/pages/SalesListPage.vue`          | Basic sales list page              |
| `src/modules/farm/components/RecentSalesWidget.vue` | Farm Dashboard recent sales widget |

## Files to Modify

| File                                             | Changes                                                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/farm/stores/farm-store.js`          | Add `recordSale()`, `resolveHarvestForInventory()`, `fetchSalesForPlanting()`, `calculatePlantingCostsForProfit()` actions |
| `src/modules/farm/pages/InventoryDetailPage.vue` | Add "Record Sale" button (AC1), "Sales History" section (AC5)                                                              |
| `src/modules/farm/pages/FarmDashboardPage.vue`   | Add `RecentSalesWidget` (AC6)                                                                                              |
| `src/modules/farm/router.js`                     | Add routes for `/farm/sales` and `/farm/sales/:id`                                                                         |
| `src/composables/useFarmSampleData.js`           | Add sample farm sales (AC9)                                                                                                |
| `DATABASE_SCHEMA.md`                             | Document `farm_sales` table relationships if not already present                                                           |
| `docs/POST-MVP.md`                               | Add: Vendor integration, Cloud Function for atomic sales, per-sale FIFO cost tracking                                      |

---

## Areas of Concern and Mitigations

### ⚠️ Concern 1: Three-Way Transaction Integrity

**Problem**: If inventory decrements, finance transaction creates, but farm_sales fails, we have orphaned financial records and incorrect inventory.

**Mitigation**: Implement client-side rollback as shown in Technical Notes. Document in POST-MVP.md that true atomicity requires a Cloud Function.

### ⚠️ Concern 2: Harvest Attribution for Perennials

**Problem**: Perennials aggregate all harvests into one inventory row. When selling, we can't attribute the sale to a specific harvest cycle.

**Mitigation**: Link sale to the most recent completed harvest (implemented in `resolveHarvestForInventory`). Document this limitation. For MVP, profit calculations attribute all sales to the planting's total costs (which is accurate for the aggregate view).

### ⚠️ Concern 3: Concurrent Sale Race Condition

**Problem**: Two Farm Managers could simultaneously sell the last 100kg of inventory, both passing validation, resulting in -100kg inventory.

**Mitigation**: Client-side validation catches most cases. For MVP, accept this rare edge case. POST-MVP.md documents Cloud Function solution with server-side validation.

### ⚠️ Concern 4: Finance Category Dependency

**Problem**: "Farm Sales" income category may not exist in all deployments (depends on Story 2.3 seeding).

**Mitigation**: Fetch category dynamically; if missing, log warning and create transaction without category_id (or with uncategorized). POST-MVP.md tracks auto-creation of missing categories.

### ⚠️ Concern 5: Vendor Module Future Integration

**Problem**: Buyer is currently free text. Epic 5 will add Vendors module with formal vendor tracking.

**Mitigation**: Design `buyer` field as string (not FK) to support free text. POST-MVP.md documents future migration to `vendor_id` relationship when Vendors module exists.

---

## Testing Checklist

### Manual Testing - Core Sale Flow

**Test 1: Record Single Sale**

1. Navigate to Inventory → Farm Produce item with quantity > 0
2. Click "Record Sale"
3. Fill: Buyer = "Test Buyer", Quantity = 50kg, Price = 2.50 ZMW/kg
4. Verify total auto-calculates to 125 ZMW
5. Submit
6. **Verify**: Success toast appears
7. **Verify**: Inventory quantity reduced by 50kg
8. **Verify**: Finance transaction created (check Finance module)
9. **Verify**: Sale appears in Recent Sales widget

**Test 2: Partial Sales**

1. Find inventory item with 100kg available
2. Record Sale 1: 40kg
3. **Verify**: Inventory now shows 60kg
4. Record Sale 2: 30kg
5. **Verify**: Inventory now shows 30kg
6. **Verify**: Sales History shows both transactions
7. Attempt Sale 3: 40kg (more than available)
8. **Verify**: Validation error blocks submission

**Test 3: Sale Detail Profit Preview**

1. Open sale detail page for completed sale
2. **Verify**: Sale revenue displayed correctly
3. **Verify**: Cost breakdown shows: Seed, Planting Labor, Planting Other, Harvest Labor, Harvest Other
4. **Verify**: Net profit = revenue - total costs
5. **Verify**: ROI percentage calculated correctly
6. **Verify**: Links to inventory, planting, and finance transaction work

**Test 4: Insufficient Inventory Guard**

1. Find item with 10kg remaining
2. Open Record Sale dialog
3. Enter quantity: 15kg
4. Submit
5. **Verify**: Error message: "Cannot sell 15kg. Only 10kg available in inventory."

**Test 5: Dashboard Widget**

1. Navigate to Farm Dashboard
2. **Verify**: Recent Sales widget shows last 5 sales
3. **Verify**: Total revenue (last 30 days) displayed
4. Click widget title
5. **Verify**: Navigates to Sales List page
6. Click individual sale
7. **Verify**: Navigates to Sale Detail page

### Integration Testing

**Test 6: Rollback Validation**

1. Temporarily break finance transaction creation (e.g., invalid category_id)
2. Attempt to record sale
3. **Verify**: Inventory quantity unchanged (rollback worked)
4. **Verify**: Error message shown to user
5. Restore finance functionality

**Test 7: Sample Data Verification**

1. Fresh install with sample data
2. Navigate to Farm → Sales
3. **Verify**: See 3+ pre-populated sales
4. **Verify**: Sales reference existing harvests from sample data
5. **Verify**: Inventory quantities reflect sales (e.g., 500kg harvested - 200kg sold = 300kg remaining)

---

## Dependencies on Future Stories

| This Story          | Depends On       | Future Stories Depend On This                                                  |
| ------------------- | ---------------- | ------------------------------------------------------------------------------ |
| 3.8 Sales Recording | 3.1-3.7, 2.1-2.3 | 3.9 (Profitability Analysis), 3.10 (Yield Analysis), 5.3 (Vendors integration) |

---

## References

- `DATABASE_SCHEMA.md` line 200-219: `farm_sales` table definition
- `docs/epics.md` line 598-612: Story 3.8 original requirements
- `docs/PRD.md` line 173-184: FR-9 Farm Management - Sales and Financial Integration
- `src/stores/inventory-store.js`: `adjustStock()` pattern for AC3
- `src/modules/finance/stores/finance-store.js`: `createTransaction()` pattern for AC3
- `src/modules/farm/stores/farm-store.js`: Store patterns from Stories 3.1-3.7
- `src/modules/farm/components/HarvestEntryDialog.vue`: Component pattern for `RecordSaleDialog`
- `src/modules/farm/components/FarmProduceWidget.vue`: Widget pattern for `RecentSalesWidget`

---

_Last Updated: 2026-04-30_  
_Story Template Version: 1.0_  
_Status: **ready-for-dev**_
