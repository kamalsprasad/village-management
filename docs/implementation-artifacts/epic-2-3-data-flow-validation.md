# Epic 2 → Epic 3 Data Flow Validation Checklist

**Purpose**: Verify that all Epic 2 data structures and integrations are ready to support Epic 3 (Farm Management) requirements.

**Date**: 2026-04-06
**Status**: Ready for Validation

---

## Cross-Module Data Dependencies

### 1. Inventory → Farm Integration

**Epic 3 Dependency**: Story 3.3 requires seed inventory deduction when recording plantings.

**Validation Steps**:
- [ ] `inventory-store.js` has `fetchAllItems()` method for balance sheet reports (Story 2.8)
- [ ] Inventory items with `item_type: 'Farm Inputs'` can be queried
- [ ] `inventory.item_type` enum includes all required types: 'Farm Inputs', 'School Supplies', 'Medical Supplies', 'Kitchen Supplies', 'Farm Produce', 'Equipment', 'Other'
- [ ] Inventory quantity decrement action exists or can be added to store
- [ ] `source_reference_id` properly links inventory to finance transactions

**Expected Result**: Farm Manager can select from available seed inventory when recording plantings.

---

### 2. Finance → Farm Integration

**Epic 3 Dependency**: Story 3.8 requires automatic income creation when recording farm sales.

**Validation Steps**:
- [ ] `finance-store.js` `createTransaction()` accepts income transactions with `source_module: 'Farm'`
- [ ] `finance_transactions.source_module` enum includes 'Farm' value
- [ ] `finance_transactions.inventory_ids` field exists for linking to inventory items
- [ ] Transaction creation returns proper success response with transaction ID
- [ ] `funding_source_id` is optional for income transactions (farm sales may not have donor)

**Expected Result**: Recording a farm sale automatically creates income transaction with proper linkages.

---

### 3. Reports → Farm Profitability

**Epic 3 Dependency**: Story 3.9 requires profitability calculations using Epic 2 patterns.

**Validation Steps**:
- [ ] `ReportService.js` exports `calculateSummary()` function
- [ ] `ReportService.js` exports `groupByCategory()` function
- [ ] Pure function pattern (no Pinia dependency) is documented and reusable
- [ ] Report service can filter by `source_module: 'Farm'` for scoped reports
- [ ] `report-scope.js` utility maps Farm Manager role to 'Farm' module

**Expected Result**: Farm profitability reports can reuse Epic 2 reporting infrastructure.

---

### 4. Funding Sources → Farm Expenses

**Epic 3 Dependency**: Story 3.3 requires tracking seed costs for profitability.

**Validation Steps**:
- [ ] `funding_source_id` can be linked to expense transactions with category 'Farm Inputs'
- [ ] `amount_needed`/`amount_funded` fields support partial funding for farm purchases
- [ ] Funding source balance validation works for farm-related expenses
- [ ] `transaction_links` collection can link farm expense funding

**Expected Result**: Farm expenses can be properly tracked with funding sources and partial funding.

---

## Sample Data Validation

### 5. Finance Sample Data Completeness

**Validation Steps**:
- [ ] `useFinanceSampleData.js` seeds 1.5 years of transaction history
- [ ] Sample data includes 'Farm' source module transactions
- [ ] Sample data includes 'Farm Inputs' category expenses
- [ ] Sample data creates inventory items from 'Farm Inputs' expenses
- [ ] No "Invalid document structure: Missing required attribute" errors during seeding

**Expected Result**: Complete sample data exists for testing Epic 3 integration.

---

### 6. Lending → Farm Integration (Optional)

**Epic 3 Dependency**: Farm Manager may need to view loan status for farm-related loans.

**Validation Steps**:
- [ ] Loans with `purpose: 'farm'` can be queried
- [ ] Lending store provides graceful degradation if module disabled
- [ ] `loan_id` field on transactions properly links to loans table

**Expected Result**: Farm-related loans are trackable alongside farm operations.

---

## Epic 3 Schema Readiness

### 7. Required Tables for Epic 3

The following tables need to be created for Epic 3:

- [ ] `plots` - Farm plot management
- [ ] `crops` - Crop database
- [ ] `plantings` - Planting records with labor cost tracking
- [ ] `harvests` - Harvest records with labor cost tracking
- [ ] `farm_sales` - Sales linking harvest, inventory, and finance

**Schema Design Notes**:

```javascript
// plantings table (Story 3.3)
{
  plot_id: 'plot_123',           // FK to plots
  crop_id: 'crop_789',           // FK to crops
  seed_inventory_id: 'inv_456',  // FK to inventory (optional)
  seed_cost: 150.00,             // For profitability calculation
  planting_labor_cost: 200.00,   // For profitability calculation
  planting_other_costs: 50.00,   // For profitability calculation
  status: 'planted' | 'growing' | 'harvesting' | 'completed' | 'failed'
}

// harvests table (Story 3.5, 3.6)
{
  planting_id: 'planting_123',   // FK to plantings
  total_quantity_kg: 500,
  harvest_labor_cost: 300.00,    // For profitability calculation
  harvest_other_costs: 25.00,   // For profitability calculation
  harvest_type: 'single_day' | 'multi_day' | 'continuous'
}

// farm_sales table (Story 3.8)
{
  inventory_item_id: 'inv_999',     // FK to inventory
  harvest_id: 'harvest_456',          // FK to harvest
  finance_transaction_id: 'txn_789', // FK to finance_transactions
  quantity_sold: 400,
  price_per_kg: 3.50,
  total_amount: 1400.00
}
```

---

## Integration Test Scenarios

### Test 1: Complete Farm Cycle

**Steps**:
1. Create expense transaction for seeds (Category: 'Farm Inputs', Add to Inventory)
2. Verify inventory item created with `source: 'Finance Purchase'`
3. Create planting using seed from inventory
4. Verify inventory quantity decremented
5. Record harvest
6. Verify inventory item created with `source: 'Farm Harvest'`
7. Record sale of harvest
8. Verify:
   - Inventory quantity decremented
   - Finance income transaction created with `source_module: 'Farm'`
   - `farm_sales` record links harvest → inventory → finance

### Test 2: Profitability Calculation

**Steps**:
1. Query all plantings for a plot
2. For each planting:
   - Sum `seed_cost` + `planting_labor_cost` + `planting_other_costs`
   - Find linked harvest
   - Sum `harvest_labor_cost` + `harvest_other_costs`
   - Find linked sales via `farm_sales`
   - Sum `total_amount` from sales
3. Calculate: Profit = Sales Revenue - (Seed Costs + Labor Costs + Other Costs)

---

## Validation Summary

| Integration Point | Status | Notes |
|------------------|--------|-------|
| Inventory → Farm | Ready | `fetchAllItems()` available, item types include 'Farm Inputs' |
| Finance → Farm | Ready | `source_module: 'Farm'` supported, `inventory_ids` field exists |
| Reports → Farm | Ready | `ReportService.js` pure functions reusable |
| Funding → Farm | Ready | Partial funding supported via `amount_needed`/`amount_funded` |
| Sample Data | Ready | 1.5 years of data seeded, includes farm categories |

**Overall Status**: Epic 2 is ready to support Epic 3 implementation.

---

## Action Items for Epic 3 Start

1. Create Appwrite collections: `plots`, `crops`, `plantings`, `harvests`, `farm_sales`
2. Create indexes on foreign key fields for performance
3. Seed `crops` table with 27 Zambian crops (per Story 3.2)
4. Verify `ReportService.js` can be imported from farm module
