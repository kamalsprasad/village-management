# Story 2.6: Inventory Module - Core Inventory Management

**Epic:** 2 - Financial Management and Inventory Tracking  
**Story ID:** 2.6  
**Status:** done  
**Date:** 2025-04-02  
**Last Updated:** 2026-04-02  
**Author:** AI Assistant

---

## User Story

As a **village administrator**, I want to track inventory across all modules, so that I can monitor stock levels and prevent shortages.

---

## Summary

This story implements the core Inventory Management module, providing a centralized system to track physical assets and stock levels across the village. The module supports multiple item types (Farm Inputs, School Supplies, Medical Supplies, Kitchen Supplies, Equipment), tracks quantities with reorder thresholds, and provides role-based visibility for Finance Managers and Farm Managers. This foundational story establishes the inventory system that will be integrated with Finance (Story 2.7) and Farm (Epic 3) modules in subsequent stories.

---

## Prerequisites

- **Story 2.2**: Finance Module - Expense Transaction Recording (for integration foundation)
- **Database**: `inventory` table exists with basic schema (will be extended in this story)
- **RBAC System**: Roles and permissions from Story 1.4

---

## Acceptance Criteria

### AC1: Inventory Database Schema Extension

- [ ] Inventory table columns (as defined in `validate-schema-epic-2.js`):
  - `item_name` (string, required) - Name of the inventory item
  - `item_type` (enum, required) - Category classification:
    - `farm_inputs` - Seeds, fertilizer, tools for farming
    - `farm_produce` - Harvested crops from farm
    - `school_supplies` - Books, stationery, educational materials
    - `medical_supplies` - First aid, medications, health supplies
    - `kitchen_supplies` - Cooking utensils, food storage
    - `equipment` - Machinery, tools, village assets
    - `other` - Miscellaneous items
  - `quantity` (integer, required) - Current stock count
  - `unit` (string, required) - Unit of measurement (kg, liters, units, bags, boxes)
  - `unit_cost` (float, optional) - Cost per unit for valuation
  - `estimated_value` (float, calculated) - `quantity × unit_cost`
  - `status` (enum, required) - Current stock status:
    - `in_stock` - Quantity above reorder threshold
    - `low_stock` - Quantity at or below reorder threshold
    - `out_of_stock` - Quantity is zero
    - `reserved` - Items allocated but not yet consumed
  - `source` (enum, required) - How the item entered inventory:
    - `finance_purchase` - Purchased via Finance module (expense)
    - `farm_harvest` - Harvested from farm plots
    - `manual_entry` - Directly added to inventory
    - `donation` - Received as donation
  - `source_reference_id` (string, optional) - ID of related record (transaction_id for purchases, harvest_id for farm produce)
  - `reorder_threshold` (integer, required) - Minimum quantity before reorder alert triggers
  - `date_added` (datetime, optional) - Deprecated; uses Appwrite `$createdAt` instead
  - `last_updated` (datetime, auto-updated) - Last modification timestamp
  - `transaction_id` (relationship, optional) - Link to finance transaction for audit trail

- [ ] Update `validate-schema-epic-2.js` to include all new columns

### AC2: Navigation Integration

- [ ] Inventory navigation item appears in main sidebar for users with roles: Finance Manager, Farm Manager, Admin
- [ ] Navigation respects RBAC - hidden for roles without inventory permissions
- [ ] Icon: `inventory_2` (Quasar icon)
- [ ] Route: `/inventory`
- [ ] Navigation order: After Finance, before Farm (alphabetical: Finance → Inventory)

### AC3: Inventory List Page

- [ ] Display all inventory items in a Quasar QTable with columns:
  - Item Name (with icon indicator for item type)
  - Type (badge with color coding: farm = green, school = blue, medical = red, etc.)
  - Quantity (with visual indicator: green = in stock, yellow = low stock, red = out of stock)
  - Unit
  - Status (chip/badge)
  - Estimated Value (calculated, formatted with village currency)

- [ ] **Filters**:
  - Item Type dropdown (multi-select)
  - Status dropdown (multi-select)
  - Search by item name
  - Source dropdown (for Finance Manager view)

- [ ] **Role-based visibility**:
  - Finance Manager: Sees ALL inventory items across all types
  - Farm Manager: Sees only `farm_inputs` and `farm_produce` types
  - Admin: Sees ALL inventory items

- [ ] **Sorting**: Default sort by status (low stock first), then by item name
- [ ] **Pagination**: 25 items per page with page size selector
- [ ] **Export**: Button to export current filtered view to CSV

### AC4: Add Inventory Item Form

- [ ] "Add Inventory Item" button opens modal dialog or new page `/inventory/add`
- [ ] Form fields with validation:
  - **Item Name** (text, required, max 255 chars)
  - **Item Type** (dropdown, required, enum values from AC1)
  - **Quantity** (number, required, min 0, integer)
  - **Unit** (dropdown with common values + "Other" text option): kg, liters, units, bags, boxes, bottles, packets
  - **Unit Cost** (currency, optional, min 0) - for calculating estimated value
  - **Reorder Threshold** (number, required, min 0, default: 10)
  - **Source** (dropdown, required, enum from AC1)
  - **Source Reference** (conditional display based on source):
    - If `finance_purchase`: dropdown to select expense transaction
    - If `farm_harvest`: dropdown to select harvest record (if available)
    - If `donation`: text field for donor/donation notes
    - If `manual_entry`: no additional field
  - **Notes** (textarea, optional, max 500 chars)

- [ ] **Validation**:
  - All required fields must be filled
  - Quantity must be non-negative integer
  - Unit cost must be non-negative
  - Reorder threshold must be non-negative
  - Show inline error messages

- [ ] **Form submission**:
  - On save: create inventory record, show success notification
  - Navigate back to list page after successful save
  - On error: display error message, stay on form

### AC5: Inventory Detail Page

- [ ] Route: `/inventory/:id`
- [ ] Clicking item name in list navigates to detail page
- [ ] **Information Card** displays:
  - Item name (header)
  - Item type (badge)
  - Current quantity with large display and unit
  - **Stock Level Visual Indicator**:
    - Green progress bar when `quantity > reorder_threshold` (In Stock)
    - Yellow progress bar when `quantity <= reorder_threshold` and `quantity > 0` (Low Stock)
    - Red alert when `quantity == 0` (Out of Stock)
    - Progress bar shows: `quantity / (reorder_threshold × 2)` for visual reference
  - Status badge
  - Unit cost and calculated estimated value
  - Source information with link to related record (if applicable)
  - Date added and last updated timestamps
  - Notes

- [ ] **Transaction History Section** (placeholder for future enhancement):
  - Table showing stock movements (to be populated by Story 2.7 and Epic 3)
  - Columns: Date, Type, Quantity Change, Reason/Balance, User
  - For now, show message: "Transaction history will be available after Finance and Farm integration"

- [ ] **Action Buttons**:
  - "Edit" button opens edit form
  - "Adjust Stock" button opens stock adjustment dialog (AC6)
  - "Back to List" button

### AC6: Manual Stock Adjustment

- [ ] "Adjust Stock" button on detail page opens dialog
- [ ] Adjustment form fields:
  - **Adjustment Type** (radio buttons):
    - `add` - Add to current stock (e.g., received shipment)
    - `remove` - Remove from stock (e.g., consumed, lost, damaged)
    - `set` - Set absolute value (e.g., after physical count)
  - **Quantity** (number, required):
    - For `add/remove`: amount to add/remove (positive integer)
    - For `set`: new absolute quantity (non-negative integer)
  - **Reason** (dropdown + optional text):
    - Predefined: "Physical Count", "Damaged/Spoiled", "Donation Received", "Transfer", "Other"
    - Text field for additional details when "Other" selected
  - **Notes** (textarea, optional)

- [ ] **Validation**:
  - Cannot remove more than current quantity (unless using `set`)
  - Quantity must be positive integer
  - Reason is required

- [ ] **Update Logic**:
  - `add`: `new_quantity = current_quantity + adjustment_quantity`
  - `remove`: `new_quantity = current_quantity - adjustment_quantity`
  - `set`: `new_quantity = adjustment_quantity`
  - Update `last_updated` timestamp
  - Record adjustment in future transaction history table

- [ ] **Notifications**:
  - Success: "Stock updated: [Item Name] now has [X] [unit]"
  - If new quantity <= reorder_threshold: "Warning: [Item Name] is now at low stock level"

### AC7: Low Stock Alerts

- [ ] **Visual Indicators on List Page**:
  - Warning icon (yellow triangle) next to items with `quantity <= reorder_threshold` and `quantity > 0`
  - Alert icon (red circle) next to items with `quantity == 0`
  - Status column shows colored chips: green (in_stock), yellow (low_stock), red (out_of_stock)

- [ ] **Dashboard Widget (Preparation)**:
  - Create `LowStockAlertsWidget.vue` component (to be integrated into Finance Dashboard in Story 2.9)
  - Shows count of items at low stock level
  - Shows count of items out of stock
  - List of top 5 items needing attention (sorted by urgency: out of stock first, then low stock)
  - Each item shows: name, current quantity, reorder threshold, "View" link

- [ ] **Automatic Status Updates**:
  - Status field auto-updates based on quantity vs reorder_threshold:
    - `in_stock`: `quantity > reorder_threshold`
    - `low_stock`: `quantity <= reorder_threshold` and `quantity > 0`
    - `out_of_stock`: `quantity == 0`

### AC8: Inventory Dashboard Widget

- [ ] Create `InventoryStockWidget.vue` component
- [ ] Displays summary cards:
  - Total Items in Stock (count)
  - Low Stock Items (count with yellow warning color)
  - Out of Stock Items (count with red alert color)
  - Total Estimated Inventory Value (sum of all `estimated_value`)

- [ ] **Stock by Type Chart**:
  - Doughnut/pie chart showing distribution of items by `item_type`
  - Colors mapped to item types
  - Legend with counts

- [ ] **Recent Activity** (placeholder):
  - Shows last 5 inventory additions/adjustments
  - For now, shows items recently added (sorted by `$createdAt` desc)

- [ ] **Integration Points**:
  - Widget will be integrated into Finance Dashboard (Story 2.9)
  - Widget will be integrated into Farm Dashboard (Epic 3)

### AC9: Edit and Delete Functionality

- [ ] **Edit Inventory Item**:
  - "Edit" button on detail page opens edit form
  - All fields from AC4 are editable EXCEPT:
    - `source` and `source_reference_id` (locked after creation for audit trail)
    - `date_added` (system field)
  - Quantity can be edited directly or use Adjust Stock (AC6) - clarify in UI
  - Save updates `last_updated` timestamp

- [ ] **Delete Inventory Item**:
  - "Delete" button on detail page with confirmation dialog
  - Warning if item has linked transactions (from future stories)
  - Soft delete or hard delete with cascade warning
  - Confirmation requires typing item name: "Type '[Item Name]' to confirm deletion"
  - Log deletion with reason

### AC10: Role-Based Access Control

- [ ] **Finance Manager**:
  - Full CRUD access to ALL inventory items
  - Can view and manage inventory from all sources
  - Access to estimated values and cost information

- [ ] **Farm Manager**:
  - Read-only access to `farm_inputs` and `farm_produce` types
  - Cannot view other item types (school, medical, kitchen supplies)
  - Cannot see unit costs or estimated values (financial data hidden)
  - Can perform stock adjustments for farm-related items

- [ ] **Admin**:
  - Full access to all inventory items
  - Can manage all settings and perform all actions

- [ ] **Other Roles**:
  - Village Head: Read-only view of all inventory (for oversight)
  - Other roles: No inventory access

---

## Technical Implementation Notes

### Database Schema Updates Required

Update `server/scripts/validate-schema-epic-2.js` to extend the INVENTORY table:

```javascript
// --- Inventory (Story 2.6: Core Inventory Management) ---
console.log('📦 Configuring Inventory...');
await createColumn(TABLES.INVENTORY, 'string', 'item_name', 255, true);
await createColumn(TABLES.INVENTORY, 'enum', 'item_type', null, true, false, [
  'farm_inputs',
  'farm_produce',
  'school_supplies',
  'medical_supplies',
  'kitchen_supplies',
  'equipment',
  'other',
]);
await createColumn(TABLES.INVENTORY, 'integer', 'quantity', null, true);
await createColumn(TABLES.INVENTORY, 'string', 'unit', 20, true);
await createColumn(TABLES.INVENTORY, 'float', 'unit_cost', null, false);
await createColumn(TABLES.INVENTORY, 'float', 'estimated_value', null, false); // Calculated
await createColumn(TABLES.INVENTORY, 'enum', 'status', null, true, false, [
  'in_stock',
  'low_stock',
  'out_of_stock',
  'reserved',
]);
await createColumn(TABLES.INVENTORY, 'enum', 'source', null, true, false, [
  'finance_purchase',
  'farm_harvest',
  'manual_entry',
  'donation',
]);
await createColumn(TABLES.INVENTORY, 'string', 'source_reference_id', 255, false);
await createColumn(TABLES.INVENTORY, 'integer', 'reorder_threshold', null, true);
await createColumn(TABLES.INVENTORY, 'datetime', 'date_added', null, false); // Uses $createdAt instead
await createColumn(TABLES.INVENTORY, 'datetime', 'last_updated', null, true);
await createColumn(TABLES.INVENTORY, 'string', 'notes', 1000, false);
```

### Pinia Store Structure

Create `src/stores/inventory-store.js`:

```javascript
// State
{
  items: [],           // All inventory items
  loading: false,
  filters: {
    itemTypes: [],
    statuses: [],
    search: ''
  },
  currentItem: null,   // Selected item for detail view
  lowStockCount: 0,
  outOfStockCount: 0
}

// Actions
{
  fetchItems(filters),      // Load inventory with optional filters
  fetchItemById(id),        // Load single item detail
  createItem(data),         // Add new inventory item
  updateItem(id, data),     // Edit inventory item
  deleteItem(id),          // Delete inventory item
  adjustStock(id, adjustment), // Manual stock adjustment
  getLowStockItems(),       // Get items needing reorder
  getItemsByType(type),     // Filter by item type
  calculateEstimatedValue(quantity, unitCost)
}

// Getters
{
  filteredItems,
  itemsByType,
  lowStockItems,
  totalInventoryValue,
  canEditItem: (role, itemType) => boolean,
  canViewItem: (role, itemType) => boolean
}
```

### Route Structure

```javascript
// src/router/routes.js
{
  path: '/inventory',
  component: () => import('layouts/MainLayout.vue'),
  children: [
    { path: '', component: () => import('pages/inventory/InventoryListPage.vue'), meta: { requiresAuth: true, permissions: ['view_inventory'] } },
    { path: 'add', component: () => import('pages/inventory/InventoryFormPage.vue'), meta: { requiresAuth: true, permissions: ['manage_inventory'] } },
    { path: ':id', component: () => import('pages/inventory/InventoryDetailPage.vue'), meta: { requiresAuth: true, permissions: ['view_inventory'] } },
    { path: ':id/edit', component: () => import('pages/inventory/InventoryFormPage.vue'), meta: { requiresAuth: true, permissions: ['manage_inventory'] } }
  ]
}
```

### Component Architecture

```
src/components/inventory/
├── InventoryListTable.vue      # Main list table with filters
├── InventoryFilters.vue        # Filter panel
├── InventoryForm.vue           # Add/Edit form
├── InventoryDetailCard.vue     # Detail view card
├── StockAdjustDialog.vue       # Stock adjustment modal
├── StockLevelIndicator.vue     # Visual stock level bar
├── InventoryTypeBadge.vue      # Item type colored badge
├── LowStockAlertsWidget.vue    # Dashboard widget for alerts
└── InventoryStockWidget.vue    # Dashboard summary widget

src/pages/inventory/
├── InventoryListPage.vue       # List page layout
├── InventoryFormPage.vue       # Add/Edit page layout
└── InventoryDetailPage.vue     # Detail page layout
```

### Key Implementation Details

1. **Status Auto-Calculation**: Implement as a computed property or before-save hook:

   ```javascript
   function calculateStatus(quantity, reorderThreshold) {
     if (quantity === 0) return 'out_of_stock';
     if (quantity <= reorderThreshold) return 'low_stock';
     return 'in_stock';
   }
   ```

2. **Estimated Value Calculation**:

   ```javascript
   estimated_value = quantity * (unit_cost || 0);
   ```

3. **Permission-Based Filtering in Store**:

   ```javascript
   // Filter items based on user permissions (uses src/utils/permissions.js)
   get visibleItems() {
     const authStore = useAuthStore();
     const user = authStore.user;
     const roles = authStore.userRoles;
     // Full access: inventory:read, inventory:write, finance:read, or * (admin)
     if (checkAnyPerm(user, roles, ['inventory:read', 'inventory:write', 'finance:read'])) {
       return this.items;
     }
     // Farm-only access
     if (checkPerm(user, roles, 'farm:read')) {
       return this.items.filter(item => FARM_TYPES.includes(item.item_type));
     }
     return [];
   }
   ```

4. **Stock Adjustment Logic**:

   ```javascript
   async adjustStock(itemId, { type, quantity, reason, notes }) {
     const item = await this.fetchItemById(itemId);
     let newQuantity;

     switch (type) {
       case 'add': newQuantity = item.quantity + quantity; break;
       case 'remove': newQuantity = item.quantity - quantity; break;
       case 'set': newQuantity = quantity; break;
     }

     if (newQuantity < 0) throw new Error('Cannot reduce below zero');

     const newStatus = calculateStatus(newQuantity, item.reorder_threshold);

     await this.updateItem(itemId, {
       quantity: newQuantity,
       status: newStatus,
       last_updated: new Date().toISOString()
     });

     // Log adjustment (for future transaction history)
   }
   ```

### Permissions Required

Add to RBAC system (if not already defined):

```javascript
// Permissions for Inventory (colon format matching app convention)
// Uses existing permission system from src/utils/permissions.js
const INVENTORY_PERMISSIONS = {
  READ: 'inventory:read', // Can see inventory list/detail
  WRITE: 'inventory:write', // Can add/edit/delete items
  FARM_READ: 'farm:read', // Farm manager: view farm items only
  FARM_WRITE: 'farm:write', // Farm manager: adjust farm stock
  FINANCE_READ: 'finance:read', // Can see costs/estimated values
};

// Role mappings (seed-roles.js must include these permissions)
const ROLE_PERMISSIONS = {
  finance_manager: ['inventory:read', 'inventory:write', 'finance:read'],
  farm_manager: ['farm:read', 'farm:write'], // Limited to farm types
  admin: ['*'], // Wildcard grants all
  village_head: ['inventory:read', 'finance:read'], // Read-only oversight
};
```

---

## Integration Points

### Story 2.7 (Next Story): Automatic Inventory from Finance Purchases

- Finance expense form will include "Add to Inventory" checkbox
- When checked, inventory item auto-created with `source: 'finance_purchase'`
- `source_reference_id` links to expense transaction
- This story's form must support the `finance_purchase` source type

### Epic 3: Farm Management

- Farm harvests will auto-create inventory with `source: 'farm_harvest'`
- Planting records will deduct from `farm_inputs` inventory
- Farm Manager role will have restricted view (farm types only)

### Story 2.9: Finance Dashboard

- `InventoryStockWidget` will be integrated into Finance Dashboard
- Shows stock levels by type and low stock alerts

---

## Testing Checklist

### Manual Testing Scenarios

1. **Create Inventory Items**:
   - [ ] Add item with all required fields
   - [ ] Verify status auto-calculates to "in_stock" when quantity > threshold
   - [ ] Verify estimated value calculates correctly
   - [ ] Try to submit without required fields - verify validation errors

2. **Stock Adjustments**:
   - [ ] Add stock to existing item
   - [ ] Remove stock (verify cannot go below zero)
   - [ ] Set absolute quantity
   - [ ] Verify status updates after adjustment (e.g., in_stock → low_stock)

3. **Role-Based Access**:
   - [ ] Login as Finance Manager: verify see all items, can edit all
   - [ ] Login as Farm Manager: verify only see farm_inputs and farm_produce
   - [ ] Login as Admin: verify full access
   - [ ] Login as Resident: verify no inventory menu visible

4. **Low Stock Alerts**:
   - [ ] Create item with quantity = reorder_threshold
   - [ ] Verify shows low_stock status and warning icon
   - [ ] Adjust stock to 0
   - [ ] Verify shows out_of_stock status and alert icon

5. **Filters**:
   - [ ] Filter by item type
   - [ ] Filter by status
   - [ ] Search by name
   - [ ] Combine multiple filters

---

## Open Questions for Implementation

1. **Transaction History Table**: Should we create the `inventory_transactions` table now (to record all adjustments) or defer to a later story? **Recommendation**: Create basic structure now with:
   - `inventory_id`, `transaction_type` (add/remove/set/adjust), `quantity_change`, `previous_quantity`, `new_quantity`, `reason`, `user_id`, `timestamp`

2. **Farm Manager Permissions**: Should Farm Manager be able to CREATE new inventory items, or only adjust stock? **Recommendation**: Allow creating `farm_produce` items (harvests) but not `farm_inputs` (purchased items).

3. **Currency Formatting**: Should inventory values use the village currency symbol from village configuration? **Answer**: Yes, use `currency_symbol` from village config (Story 1.8).

4. **Inventory Categories**: The epics mention "Farm Inputs, School Supplies, Medical Supplies, Kitchen Supplies" - should these be configurable like finance categories? **Recommendation**: Keep as enum for now; make configurable in Epic 5 if needed.

---

## Story Context for Next Stories

### Story 2.7: Automatic Inventory from Finance Purchases

Will build on this story by:

- Adding "Add to Inventory" checkbox to expense form (category = Farm Inputs)
- Auto-creating inventory items with proper linking
- Showing linked inventory on expense detail page

### Epic 3 Stories (Farm Management)

Will integrate with inventory:

- Planting records deduct seeds from `farm_inputs`
- Harvests add to `farm_produce`
- Sales deduct from `farm_produce`

---

## Estimated Effort

- **Story Points**: 5
- **Estimated Hours**: 6-8 hours
- **Complexity**: Medium
- **Primary Skills**: Vue/Quasar frontend, Appwrite database, Pinia state management

---

## Code Review Findings (2026-04-02)

### Critical Fixes Applied

1. **InventoryListTable props disabled** — `defineProps` was commented out; table ignored parent's filtered/sorted items. Re-enabled props and wired `:rows` to `props.items`.
2. **`date_added` field conflict** — Schema required it but store didn't send it. Changed to optional; all UI references now use Appwrite's `$createdAt`.

### High-Severity Fixes Applied

3. **Reactive state mutation** — `filteredItems` in `InventoryListPage` called `.sort()` on Pinia state in-place. Fixed with spread clone: `[...items].sort(...)`.
4. **RBAC used nonexistent `primary_role`/`userRole`** — All role-string checks replaced with permission-based system via `src/utils/permissions.js`. Store getters now internally call `checkPerm`/`checkAnyPerm`. Components no longer pass `userRole` args. Unused `authStore` imports removed from 7 files.
5. **DeleteConfirmDialog stayed open** — Added `localModelValue.value = false` after confirm emit.
6. **Edit payload included locked fields** — `source` and `source_reference_id` now only included in create payloads, stripped in edit mode.

### Medium-Severity Fixes Applied

7. **StockAdjustDialog rejected quantity 0** — `isValid` now uses explicit `null`/`undefined` checks instead of falsy check, allowing "Set to 0" after physical count.
8. **Dashboard widgets overwrote store state** — `LowStockAlertsWidget` now uses dedicated `fetchLowStockItems()`/`fetchOutOfStockItems()` with local refs instead of `fetchItems(1, 100)`.
9. **Duplicate helper functions** — `getItemTypeColor`, `getItemTypeIcon`, `getStatusColor`, `formatCurrency` centralized as store actions. Components delegate to store.

### Low-Severity Fixes Applied

10. **Route order fragility** — Added comment noting `inventory/add` must precede `inventory/:id`.
11. **Blob URL memory leak** — Added `URL.revokeObjectURL(url)` in CSV export.

### Known Issues (Not Fixed)

- **Seed roles** (`server/scripts/seed-roles.js`) don't yet include `inventory:read`, `inventory:write`, `farm:read`, `farm:write` permissions. Only System Administrator (`*`) can access inventory until roles are updated.
- **Commented-out code** left as-is per user decision (to be cleaned up after `date_added` resolution).

---

## Definition of Done

- [ ] All acceptance criteria (AC1-AC10) implemented and tested
- [ ] Inventory database schema updated and validated
- [ ] Inventory store created with all actions and getters
- [ ] All UI components created and styled with Quasar
- [ ] Role-based access control working correctly
- [ ] Navigation integrated with permission checks
- [ ] Low stock alerts functioning
- [ ] Manual testing completed
- [ ] Code reviewed (if applicable)
- [ ] No console errors or warnings
- [ ] Mobile-responsive layout verified

---

## Related Documents

- [Epics Document](../epics.md) - Story 2.6 specification source
- [Architecture Document](../architecture.md) - Technical patterns and conventions
- [Tech Spec Epic 2](../sprint-artifacts/tech-spec-epic-2.md) - Epic 2 technical specification
- [Story 2.2](./story-2.2.md) - Expense Transaction Recording (prerequisite)
- [DATABASE_SCHEMA.md](../../DATABASE_SCHEMA.md) - Database schema documentation
