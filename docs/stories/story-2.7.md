# Story 2.7: Inventory Module - Automatic Inventory from Finance Purchases

**Epic:** 2 - Financial Management and Inventory Tracking
**Story ID:** 2.7
**Status:** done
**Date:** 2026-04-02
**Author:** AI Assistant

---

## User Story

As a **Finance Manager**,
I want inventory items automatically created when I record purchases for inventory-eligible categories,
so that I don't have to enter the same information twice.

---

## Summary

This story integrates the Finance expense workflow (Story 2.2) with the Inventory module (Story 2.6) by adding an "Add to Inventory" checkbox to the expense form when the selected category is inventory-eligible (Farm Inputs, School Supplies, Medical Supplies, Kitchen Supplies, Equipment). When checked, the user provides additional inventory fields (item name, quantity, unit, reorder threshold), and the system automatically creates a linked inventory item upon successful expense save. Bidirectional cross-links enable navigation between the expense transaction and its inventory item for full audit trail visibility.

---

## Prerequisites

- **Story 2.6** (done): Core Inventory Management — inventory store, createItem action, schema, RBAC
- **Story 2.2** (done): Finance Module — Expense Transaction Recording — TransactionForm, createTransaction action
- **Story 2.3** (done): Admin-Configurable Categories — dynamic categories with `$id` and `.name`
- **Story 2.4** (done): Funding Source Tracking — `amount_funded` / `amount_needed` partial funding model

---

## Acceptance Criteria

### AC1: "Add to Inventory" Checkbox on Expense Form

- [x] When recording an **expense** transaction, if the selected category name matches an inventory-eligible category, show an "Add to Inventory" checkbox below the category/subcategory fields
- [x] Inventory-eligible categories (matched by category **name**, not ID):
  - `Farm Inputs` → inventory `item_type: 'farm_inputs'`
  - `School Supplies` → inventory `item_type: 'school_supplies'`
  - `Medical Supplies` → inventory `item_type: 'medical_supplies'`
  - `Kitchen Supplies` → inventory `item_type: 'kitchen_supplies'`
  - `Equipment` → inventory `item_type: 'equipment'`
- [x] Checkbox is unchecked by default
- [x] Checkbox is only visible for **expense** transactions (not income)
- [x] If category changes to a non-eligible category, uncheck and hide the checkbox and clear inventory fields

### AC2: Inventory Fields (Conditional Display)

- [x] When "Add to Inventory" checkbox is checked, display additional fields:
  - **Item Name** (text, required, max 255 chars) — pre-populated with `[Category Name] - [Subcategory]` if subcategory selected, otherwise blank
  - **Quantity** (integer, required, min 1) — number of units purchased
  - **Unit** (dropdown, required) — same options as inventory form: kg, liters, units, bags, boxes, bottles, packets
  - **Reorder Threshold** (integer, required, min 0, default: 10) — minimum stock level before low-stock alert
- [x] All inventory fields are required when checkbox is checked
- [x] Validation prevents form submission if inventory fields are incomplete when checkbox is checked
- [x] When checkbox is unchecked, inventory fields are hidden and their validation is bypassed

### AC3: Automatic Inventory Item Creation on Expense Save

- [x] When expense is saved with "Add to Inventory" checked:
  1. Create expense transaction first (existing `financeStore.createTransaction`)
  2. On success, create inventory item via `inventoryStore.createItem` with:
     - `item_name`: user-provided item name
     - `item_type`: mapped from category name (see AC1 mapping)
     - `quantity`: user-provided quantity
     - `unit`: user-provided unit
     - `unit_cost`: `amount_funded ÷ quantity` (use `amount_funded`, not `amount_needed`)
     - `estimated_value`: `quantity × unit_cost` (auto-calculated by store)
     - `status`: auto-calculated by `calculateStatus(quantity, reorder_threshold)`
     - `source`: `'finance_purchase'`
     - `source_reference_id`: the newly created expense transaction `$id`
     - `reorder_threshold`: user-provided threshold
     - `notes`: `'Auto-created from expense: [description snippet]'`
  3. Show success notification: "Expense recorded and inventory item '[Item Name]' created"
- [x] If expense save succeeds but inventory creation fails:
  - Show warning: "Expense saved, but inventory creation failed. Please add the item manually."
  - Do NOT roll back the expense transaction (expense is the primary record)
  - Log the error for debugging

### AC4: Bidirectional Cross-Link — Inventory Detail → Expense

- [x] On `InventoryDetailPage.vue`, when `source === 'finance_purchase'` and `source_reference_id` is set:
  - Display "Source Transaction" section showing the linked expense reference ID
  - Provide a clickable link/button: "View Expense Transaction"
  - Link navigates to `/finance` with a filter or highlight for that transaction (since no transaction detail page exists yet)
  - If transaction cannot be found (deleted), show: "Linked transaction not found"

### AC5: Visual Indicator on Transaction List — Expense → Inventory

- [x] On `FinanceTransactionsPage.vue`, for expense transactions that have linked inventory items:
  - Show a small `inventory_2` icon or chip next to the transaction row
  - On click or hover, show tooltip: "Linked inventory item: [Item Name]"
  - Clicking the icon navigates to `/inventory/[inventoryItemId]`
- [x] To determine linkage: query inventory items where `source === 'finance_purchase'` AND `source_reference_id === transaction.$id`

### AC6: Edit Mode Behavior

- [x] When editing an existing expense that already has a linked inventory item:
  - The "Add to Inventory" checkbox should NOT appear (item already created)
  - Instead, show read-only info: "Linked Inventory Item: [Item Name]" with a link to `/inventory/[id]`
  - Editing the expense amount does NOT auto-update the inventory item's unit_cost (to preserve audit trail)
- [x] When editing an expense that does NOT have a linked inventory item:
  - Show the "Add to Inventory" checkbox as normal (allowing late inventory creation)

### AC7: Multi-Category Support

- [x] The "Add to Inventory" feature works for ALL inventory-eligible categories, not just "Farm Inputs":
  - Farm Inputs, School Supplies, Medical Supplies, Kitchen Supplies, Equipment
- [x] Each category maps to the correct `item_type` enum value per the mapping in AC1
- [x] Custom categories added by admin do NOT trigger the "Add to Inventory" checkbox unless they match one of the predefined eligible names

---

## Tasks / Subtasks

- [x] **Task 1: Category-to-Inventory Type Mapping Utility** (AC: #1, #7)
  - [x] Create mapping constant in a shared location (e.g., `src/utils/inventory-categories.js`)
  - [x] Export `INVENTORY_ELIGIBLE_CATEGORIES` map and `isInventoryEligible(categoryName)` helper
  - [x] Export `getInventoryTypeForCategory(categoryName)` helper

- [x] **Task 2: Update TransactionForm.vue — Add Inventory Checkbox & Fields** (AC: #1, #2)
  - [x] Add reactive state for: `addToInventory` (boolean), `inventoryItemName`, `inventoryQuantity`, `inventoryUnit`, `inventoryReorderThreshold`
  - [x] Add computed `isInventoryEligible` based on resolved category name
  - [x] Add conditional UI block with checkbox and fields below subcategory section
  - [x] Add validation rules for inventory fields when checkbox is checked
  - [x] Pre-populate item name from category + subcategory when available
  - [x] Reset inventory fields when category changes or checkbox unchecked

- [x] **Task 3: Update TransactionForm.vue — Submit Handler Integration** (AC: #3)
  - [x] Import `useInventoryStore` in TransactionForm.vue
  - [x] After successful `financeStore.createTransaction`, if `addToInventory` is true:
    - Call `inventoryStore.createItem(...)` with mapped fields
    - Handle success/failure separately from expense
  - [x] Show appropriate success/warning notifications

- [x] **Task 4: Edit Mode — Linked Inventory Detection** (AC: #6)
  - [x] When `initialData` is set (edit mode), check if an inventory item exists with `source_reference_id === initialData.$id`
  - [x] If linked item exists: show read-only link instead of checkbox
  - [x] If no linked item: show checkbox as normal
  - [x] When no linked item exists and user checks "Add to Inventory" during edit, create the linked inventory item on save

- [x] **Task 5: InventoryDetailPage.vue — Source Transaction Link** (AC: #4)
  - [x] In the detail card, when `source === 'finance_purchase'` and `source_reference_id` exists:
    - [x] Display linked expense reference ID in the source transaction section
    - [x] Display "Source: Finance Purchase" with a "View Transaction" link
    - [x] Link goes to `/finance` with query param or highlight for the linked transaction

- [x] **Task 6: FinanceTransactionsPage.vue — Inventory Link Indicator** (AC: #5)
- [x] Add method to check if a transaction has a linked inventory item
- [x] Use a batch query or cache: `inventoryStore.fetchItemsBySourceRef(transactionIds)`
- [x] Display `inventory_2` icon on rows with linked items
- [x] Make icon clickable → navigate to inventory detail

- [x] **Task 7: Update seed-roles.js — Add Inventory Permissions** (Prerequisite fix)
  - [x] Add `inventory:read`, `inventory:write` to Finance Manager role
  - [x] Add `farm:read`, `farm:write` to Farm Manager role
  - [x] Add `inventory:read`, `finance:read` to Village Head role
  - [x] Document manual update steps for MVP environments using the existing seed script behavior

---

## Review Findings

- **Resolved: Item name pre-population**
  - `TransactionForm.vue` now prefills `inventoryItemName` from the category/subcategory suggestion when `Add to Inventory` is enabled and the field is empty.

- **Resolved: Inventory field validation completeness**
  - `TransactionForm.vue` now requires `reorder_threshold` and validates that it is `0` or greater.

- **Resolved: Clear inventory fields on uncheck**
  - `TransactionForm.vue` now resets inventory-specific fields when `Add to Inventory` is unchecked.

- **Resolved: Late inventory creation in edit mode**
  - `TransactionForm.vue` now allows linked inventory creation after a successful expense update when no inventory item is already linked.

- **Resolved: Inventory detail cross-link completeness**
  - `InventoryDetailPage.vue` now shows the linked expense reference ID and routes to `/finance` with `transactionId` in the query string.

- **MVP note: role seeding behavior**
  - Existing roles are still not updated automatically by `seed-roles.js`.
  - For MVP, this is acceptable as long as environments needing the new permissions are seeded fresh or updated manually.

---

## Dev Notes

### Critical Implementation Details

1. **Category Name Resolution**: Categories are dynamic DB records (`finance_categories` collection). The form uses `category_id` (Appwrite `$id`). To check eligibility:

   ```javascript
   const category = financeStore.getCategoryById(formData.category_id);
   const isEligible = category ? isInventoryEligible(category.name) : false;
   ```

2. **Unit Cost Calculation**: Use `amount_funded` (actual paid amount), NOT `amount_needed`:

   ```javascript
   const unitCost = formData.amount_funded / inventoryQuantity;
   ```

3. **Do NOT send `date_added`**: Story 2.6 deprecated this field. The inventory store's `createItem` already omits it. Uses Appwrite `$createdAt` instead.

4. **Error Handling Strategy**: Expense is the primary record. If inventory creation fails after expense succeeds, do NOT roll back. Notify user to add inventory manually. This avoids complex two-phase commit logic.

5. **Inventory Store Import**: `TransactionForm.vue` currently only imports `useFinanceStore`. Add `useInventoryStore` import for the inventory creation call.

6. **ESLint Compliance**: Story 2.6 debugging session fixed several ESLint issues:
   - Do NOT use `(state)` parameter in getters that don't reference it (use `() =>` instead)
   - Do NOT declare `props` with `const props = defineProps(...)` unless `props` is actually referenced
   - All store permission getters use `checkPerm`/`checkAnyPerm` from `src/utils/permissions.js` — do NOT use role-string matching

### Category Mapping Constant

```javascript
// src/utils/inventory-categories.js
export const INVENTORY_ELIGIBLE_CATEGORIES = {
  'Farm Inputs': 'farm_inputs',
  'School Supplies': 'school_supplies',
  'Medical Supplies': 'medical_supplies',
  'Kitchen Supplies': 'kitchen_supplies',
  Equipment: 'equipment',
};

export function isInventoryEligible(categoryName) {
  return categoryName in INVENTORY_ELIGIBLE_CATEGORIES;
}

export function getInventoryTypeForCategory(categoryName) {
  return INVENTORY_ELIGIBLE_CATEGORIES[categoryName] || null;
}
```

### Existing Inventory Store API (Story 2.6 — Reuse, Do NOT Reinvent)

The `createItem` action at `src/stores/inventory-store.js:366` already handles:

- Auto-calculating `status` via `calculateStatus(quantity, reorder_threshold)`
- Auto-calculating `estimated_value` via `calculateEstimatedValue(quantity, unit_cost)`
- Setting `last_updated` timestamp
- Refreshing the items list after creation

Call it directly:

```javascript
const result = await inventoryStore.createItem({
  item_name: inventoryItemName,
  item_type: getInventoryTypeForCategory(category.name),
  quantity: inventoryQuantity,
  unit: inventoryUnit,
  unit_cost: amountFunded / inventoryQuantity,
  source: 'finance_purchase',
  source_reference_id: newTransaction.$id,
  reorder_threshold: inventoryReorderThreshold,
  notes: `Auto-created from expense: ${description.substring(0, 100)}`,
});
```

### Linked Inventory Lookup for Transaction List (AC5)

Add a new action to inventory store for batch lookup:

```javascript
async fetchItemsBySourceRefs(transactionIds) {
  // Query inventory where source_reference_id is in transactionIds
  // Returns map: { transactionId: inventoryItem }
}
```

Or for simpler implementation, query per-page when transactions load.

### Project Structure Notes

Files to create:

- `src/utils/inventory-categories.js` — shared mapping constant

Files to modify:

- `src/modules/finance/components/TransactionForm.vue` — add checkbox, fields, submit integration
- `src/modules/finance/pages/FinanceTransactionsPage.vue` — add inventory link indicator
- `src/pages/inventory/InventoryDetailPage.vue` — add source transaction link
- `src/stores/inventory-store.js` — add `fetchItemsBySourceRefs` action (optional batch lookup)
- `server/scripts/seed-roles.js` — add missing inventory/farm permissions

Files to NOT modify:

- `src/stores/inventory-store.js` `createItem` action — already correct, reuse as-is
- `server/scripts/validate-schema-epic-2.js` — schema already has all needed columns

### Previous Story Intelligence (Story 2.6)

Key lessons from Story 2.6 implementation and code review:

1. **Props pattern**: Use `defineProps({...})` without `const props =` assignment unless you reference `props.xxx` in script. If referencing, use `const props = defineProps(...)`.
2. **Reactive state mutation**: Never `.sort()` on Pinia state directly — spread-clone first: `[...items].sort(...)`.
3. **Permission system**: All RBAC checks use `checkPerm(user, roles, permission)` and `checkAnyPerm(user, roles, [permissions])` from `src/utils/permissions.js`. Do NOT use role name strings.
4. **Store getters that don't use `state`**: Use `() =>` not `(state) =>` to avoid ESLint unused-variable errors.
5. **DeleteConfirmDialog**: Must set `localModelValue.value = false` after confirm emit.
6. **`date_added` is deprecated**: Do not send it. The `createItem` already has it commented out.
7. **Dashboard widgets**: Use dedicated fetch methods with local refs, not `fetchItems(1, 100)` which overwrites store state.

### References

- [Source: docs/epics.md#Story-2.7] — Epic acceptance criteria
- [Source: docs/sprint-artifacts/tech-spec-epic-2.md#Workflows] — Expense → Inventory workflow
- [Source: docs/stories/story-2.6.md#Code-Review-Findings] — 2.6 code review learnings
- [Source: docs/stories/story-2.6.md#Integration-Points] — 2.7 integration expectations
- [Source: docs/architecture.md] — Quasar/Vue3/Pinia/Appwrite stack
- [Source: src/modules/finance/components/TransactionForm.vue] — Current expense form
- [Source: src/stores/inventory-store.js:366-413] — createItem action
- [Source: src/modules/finance/stores/finance-store.js:879-965] — createTransaction action
- [Source: server/scripts/seed-finance-categories.js:84-93] — Category names and subcategories

---

## Testing Checklist

### Manual Testing Scenarios

1. **Happy Path — Farm Inputs**:
   - [ ] Record expense with category "Farm Inputs"
   - [ ] Verify "Add to Inventory" checkbox appears
   - [ ] Check the checkbox, fill item name, quantity (50), unit (kg), threshold (10)
   - [ ] Save expense
   - [ ] Verify expense created in finance transactions
   - [ ] Verify inventory item created with correct `item_type: 'farm_inputs'`
   - [ ] Verify `unit_cost = amount_funded / 50`
   - [ ] Verify `source: 'finance_purchase'` and `source_reference_id` matches expense ID
   - [ ] Verify success notification mentions both expense and inventory

2. **Multi-Category Support**:
   - [ ] Repeat test with "School Supplies" → verify `item_type: 'school_supplies'`
   - [ ] Repeat test with "Equipment" → verify `item_type: 'equipment'`
   - [ ] Select "Utilities" (non-eligible) → verify checkbox does NOT appear

3. **Checkbox Toggle Behavior**:
   - [ ] Check "Add to Inventory", fill fields, then uncheck → verify fields hidden, form submits without inventory
   - [ ] Change category from "Farm Inputs" to "Utilities" → verify checkbox disappears and fields clear
   - [ ] Change category from "Utilities" to "School Supplies" → verify checkbox appears

4. **Validation**:
   - [ ] Check "Add to Inventory" but leave item name blank → verify validation error
   - [ ] Check "Add to Inventory" but set quantity to 0 → verify validation error
   - [ ] Check "Add to Inventory" and fill all fields → verify form submits

5. **Error Recovery**:
   - [ ] Simulate inventory creation failure (e.g., bad data) → verify expense still saved, warning shown
   - [ ] Verify user can manually add inventory item after failure

6. **Cross-Links**:
   - [ ] After creating linked expense+inventory: go to inventory detail → verify "Source Transaction" link visible
   - [ ] Click the source transaction link → verify navigates to finance page
   - [ ] On finance transaction list → verify inventory icon shows on linked transactions
   - [ ] Click inventory icon → verify navigates to inventory detail

7. **Edit Mode**:
   - [ ] Edit expense that already has linked inventory → verify checkbox NOT shown, read-only link shown instead
   - [ ] Edit expense without linked inventory → verify checkbox IS shown

8. **Partial Funding**:
   - [ ] Create expense with `amount_funded: 500`, `amount_needed: 1000`, add to inventory (qty: 50)
   - [ ] Verify `unit_cost = 500 / 50 = 10` (uses amount_funded, not amount_needed)

---

## Estimated Effort

- **Story Points**: 5
- **Estimated Hours**: 5-7 hours
- **Complexity**: Medium (integration between two existing modules)
- **Primary Skills**: Vue/Quasar frontend, Pinia state management, cross-module integration

---

## Definition of Done

- [ ] All acceptance criteria (AC1-AC7) implemented and tested
- [ ] "Add to Inventory" checkbox appears for all eligible expense categories
- [ ] Inventory item auto-created on expense save with correct field mapping
- [ ] Bidirectional cross-links working (inventory→expense and expense→inventory)
- [ ] Edit mode correctly detects existing linked inventory
- [ ] Seed roles updated with inventory permissions
- [ ] Manual testing completed per testing checklist
- [ ] No console errors or ESLint warnings
- [ ] Mobile-responsive layout verified

---

## Related Documents

- [Epics Document](../epics.md) - Story 2.7 specification source
- [Architecture Document](../architecture.md) - Technical patterns and conventions
- [Tech Spec Epic 2](../sprint-artifacts/tech-spec-epic-2.md) - Epic 2 technical specification
- [Story 2.6](./story-2.6.md) - Core Inventory Management (prerequisite)
- [Story 2.2](./story-2.2.md) - Expense Transaction Recording (prerequisite)
- [Story 2.3](./story-2.3.md) - Admin-Configurable Categories (category system)
- [Story 2.4](./story-2.4.md) - Funding Source Tracking (partial funding model)
- [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) - Database schema documentation

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
