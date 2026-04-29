import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { deriveProduceName } from 'src/modules/farm/utils/farm-utils';
import { ID, Query } from 'appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from './auth-store';
import {
  hasPermission as checkPerm,
  hasAnyPermission as checkAnyPerm,
} from 'src/utils/permissions';

const errorHandler = useErrorHandler();

// Role-based visibility for farm types
const FARM_TYPES = ['farm_inputs', 'farm_produce'];

export const useInventoryStore = defineStore('inventory', {
  state: () => ({
    items: [],
    currentItem: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      itemsPerPage: 25,
      total: 0,
    },
    filters: {
      itemTypes: [],
      statuses: [],
      search: '',
      sources: [],
    },
    lowStockCount: 0,
    outOfStockCount: 0,
    // Story 3.7: Dedicated farm produce items for dashboard widget
    farmProduceItems: [],
  }),

  getters: {
    /**
     * Get paginated items for current page
     */
    paginatedItems: (state) => state.items,

    /**
     * Get total pages based on total count and items per page
     */
    totalPages: (state) => {
      return Math.ceil(state.pagination.total / state.pagination.itemsPerPage);
    },

    /**
     * Check if there are more pages to load
     */
    hasNextPage: (state) => {
      return (
        state.pagination.currentPage <
        Math.ceil(state.pagination.total / state.pagination.itemsPerPage)
      );
    },

    /**
     * Check if there is a previous page
     */
    hasPreviousPage: (state) => {
      return state.pagination.currentPage > 1;
    },

    /**
     * Get items filtered by current filters (client-side for additional filtering)
     */
    filteredItems: (state) => {
      let result = state.items;

      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        result = result.filter((item) => item.item_name?.toLowerCase().includes(searchTerm));
      }

      if (state.filters.itemTypes.length > 0) {
        result = result.filter((item) => state.filters.itemTypes.includes(item.item_type));
      }

      if (state.filters.statuses.length > 0) {
        result = result.filter((item) => state.filters.statuses.includes(item.status));
      }

      if (state.filters.sources.length > 0) {
        result = result.filter((item) => state.filters.sources.includes(item.source));
      }

      return result;
    },

    /**
     * Get low stock items
     */
    lowStockItems: (state) => {
      return state.items.filter((item) => item.status === 'low_stock');
    },

    /**
     * Get out of stock items
     */
    outOfStockItems: (state) => {
      return state.items.filter((item) => item.status === 'out_of_stock');
    },

    /**
     * Get items needing attention (low or out of stock)
     */
    itemsNeedingAttention: (state) => {
      return state.items.filter(
        (item) => item.status === 'out_of_stock' || item.status === 'low_stock',
      );
    },

    /**
     * Get total inventory value
     */
    totalInventoryValue: (state) => {
      return state.items.reduce((sum, item) => sum + (item.estimated_value || 0), 0);
    },

    /**
     * Get items grouped by type for charts
     */
    itemsByType: (state) => {
      const grouped = {};
      state.items.forEach((item) => {
        if (!grouped[item.item_type]) {
          grouped[item.item_type] = { count: 0, value: 0 };
        }
        grouped[item.item_type].count += 1;
        grouped[item.item_type].value += item.estimated_value || 0;
      });
      return grouped;
    },

    /**
     * Get items grouped by status for charts
     */
    itemsByStatus: (state) => {
      const grouped = { in_stock: 0, low_stock: 0, out_of_stock: 0, reserved: 0 };
      state.items.forEach((item) => {
        if (grouped[item.status] !== undefined) {
          grouped[item.status] += 1;
        }
      });
      return grouped;
    },

    /**
     * Check if user can view a specific item based on permissions
     */
    canViewItem: () => (item) => {
      if (!item) return false;
      const authStore = useAuthStore();
      const user = authStore.user;
      const roles = authStore.userRoles;
      if (checkAnyPerm(user, roles, ['inventory:read', 'inventory:write', 'finance:read']))
        return true;
      if (checkPerm(user, roles, 'farm:read') && FARM_TYPES.includes(item.item_type)) return true;
      return false;
    },

    /**
     * Check if user can edit items (requires inventory:write)
     */
    canEditItems: () => {
      const authStore = useAuthStore();
      return checkPerm(authStore.user, authStore.userRoles, 'inventory:write');
    },

    /**
     * Check if user can adjust stock for a given item type
     */
    canAdjustStock: () => (itemType) => {
      const authStore = useAuthStore();
      const user = authStore.user;
      const roles = authStore.userRoles;
      if (checkPerm(user, roles, 'inventory:write')) return true;
      if (checkPerm(user, roles, 'farm:write') && FARM_TYPES.includes(itemType)) return true;
      return false;
    },

    /**
     * Check if user can view financial values (requires finance:read)
     */
    canViewValues: () => {
      const authStore = useAuthStore();
      return checkPerm(authStore.user, authStore.userRoles, 'finance:read');
    },

    /**
     * Check if user can see all item types (not just farm subset)
     */
    canViewAllItems: () => {
      const authStore = useAuthStore();
      return checkAnyPerm(authStore.user, authStore.userRoles, [
        'inventory:read',
        'inventory:write',
        'finance:read',
      ]);
    },

    /**
     * Check if user has any inventory access
     */
    hasInventoryAccess: () => {
      const authStore = useAuthStore();
      return checkAnyPerm(authStore.user, authStore.userRoles, ['inventory:read', 'farm:read']);
    },

    /**
     * Get visible items based on user permissions
     */
    visibleItems: (state) => {
      const authStore = useAuthStore();
      const user = authStore.user;
      const roles = authStore.userRoles;

      if (checkAnyPerm(user, roles, ['inventory:read', 'inventory:write', 'finance:read'])) {
        return state.items;
      }
      if (checkPerm(user, roles, 'farm:read')) {
        return state.items.filter((item) => FARM_TYPES.includes(item.item_type));
      }
      return [];
    },
  },

  actions: {
    /**
     * Build query array based on current filters
     */
    buildQueries(limit, offset) {
      // const queries = [Query.limit(limit), Query.offset(offset), Query.orderDesc('date_added')];
      const queries = [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')];

      // Add item type filter
      if (this.filters.itemTypes.length === 1) {
        queries.push(Query.equal('item_type', this.filters.itemTypes[0]));
      } else if (this.filters.itemTypes.length > 1) {
        // Appwrite doesn't support OR queries directly, filter client-side
      }

      // Add status filter
      if (this.filters.statuses.length === 1) {
        queries.push(Query.equal('status', this.filters.statuses[0]));
      } else if (this.filters.statuses.length > 1) {
        // Appwrite doesn't support OR queries directly, filter client-side
      }

      // Add source filter
      if (this.filters.sources.length === 1) {
        queries.push(Query.equal('source', this.filters.sources[0]));
      }

      return queries;
    },

    /**
     * Fetch all items (bypassing pagination limit). Used for reports (Balance Sheet).
     * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
     */
    async fetchAllItems() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        let allItems = [];
        let offset = 0;
        let hasMore = true;
        const limit = 5000;

        while (hasMore) {
          const response = await tables.listRows({
            databaseId: dbId,
            tableId: inventoryCollectionId,
            queries: [Query.limit(limit), Query.offset(offset)],
          });

          allItems.push(...response.rows);

          if (allItems.length >= response.total || response.rows.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        return { success: true, data: allItems };
      } catch (error) {
        console.error('Error fetching all inventory items:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Fetch inventory items with pagination and filters
     * @param {number} page - Page number (1-indexed)
     * @param {number} limit - Items per page
     */
    async fetchItems(page = 1, limit = 25) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const offset = (page - 1) * limit;
        const queries = this.buildQueries(limit, offset);

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries,
        });

        // Filter items based on permissions
        const authStore = useAuthStore();
        const user = authStore.user;
        const roles = authStore.userRoles;

        let items = response.rows || [];
        if (!checkAnyPerm(user, roles, ['inventory:read', 'inventory:write', 'finance:read'])) {
          if (checkPerm(user, roles, 'farm:read')) {
            items = items.filter((item) => FARM_TYPES.includes(item.item_type));
          } else {
            items = [];
          }
        }

        this.items = items;
        this.pagination.currentPage = page;
        this.pagination.itemsPerPage = limit;
        this.pagination.total = response.total;

        // Update alert counts
        this.updateAlertCounts();

        return { success: true, data: items };
      } catch (error) {
        console.error('Error fetching inventory:', error);
        errorHandler.notifyError('Failed to load inventory. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch a single inventory item by ID
     * @param {string} itemId - Inventory document ID
     */
    async fetchItemById(itemId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const item = await tables.getRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
        });

        // Check permission-based access
        const authStore = useAuthStore();
        const user = authStore.user;
        const roles = authStore.userRoles;

        if (!checkAnyPerm(user, roles, ['inventory:read', 'inventory:write', 'finance:read'])) {
          if (!checkPerm(user, roles, 'farm:read') || !FARM_TYPES.includes(item.item_type)) {
            throw new Error('Access denied: Cannot view this item type');
          }
        }

        this.currentItem = item;
        return { success: true, data: item };
      } catch (error) {
        console.error('Error fetching inventory item:', error);
        errorHandler.notifyError('Failed to load item details. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new inventory item
     * @param {Object} itemData - Inventory item data
     */
    async createItem(itemData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const itemId = ID.unique();

        const response = await tables.createRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
          data: {
            item_name: itemData.item_name,
            quantity: itemData.quantity,
            unit: itemData.unit,
            transaction_id: itemData.source_reference_id || itemData.transaction_id || null,
            reorder_threshold: itemData.reorder_threshold || 10,
          },
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Inventory item created successfully');
        return { success: true, data: response };
      } catch (error) {
        console.error('Error creating inventory item:', error);
        errorHandler.notifyError('Failed to create inventory item. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing inventory item
     * @param {string} id - Inventory document ID
     * @param {Object} itemData - Updated inventory item data
     */
    async updateItem(id, itemData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        // Build update object with only fields that match our schema
        const updateData = {};
        if (itemData.item_name !== undefined) updateData.item_name = itemData.item_name;
        if (itemData.quantity !== undefined) updateData.quantity = itemData.quantity;
        if (itemData.unit !== undefined) updateData.unit = itemData.unit;
        if (itemData.reorder_threshold !== undefined)
          updateData.reorder_threshold = itemData.reorder_threshold;

        // Story 3.7: Support unit_cost and estimated_value updates
        if (itemData.unit_cost !== undefined) updateData.unit_cost = itemData.unit_cost;
        if (itemData.estimated_value !== undefined)
          updateData.estimated_value = itemData.estimated_value;

        // Handle source reference / transaction ID
        const txId =
          itemData.source_reference_id !== undefined
            ? itemData.source_reference_id
            : itemData.transaction_id;
        if (txId !== undefined) updateData.transaction_id = txId || null;

        await tables.updateRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: id,
          data: updateData,
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentItem if it's the one being edited
        if (this.currentItem && this.currentItem.$id === id) {
          this.currentItem = { ...this.currentItem, ...updateData };
        }

        errorHandler.notifySuccess('Inventory item updated successfully');
        return { success: true, data: this.currentItem || updateData };
      } catch (error) {
        console.error('Error updating inventory item:', error);
        errorHandler.notifyError('Failed to update inventory item. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Adjust stock quantity for an item
     * @param {string} itemId - Inventory document ID
     * @param {Object} adjustment - Adjustment details
     * @param {string} adjustment.type - 'add', 'remove', or 'set'
     * @param {number} adjustment.quantity - Quantity to adjust
     * @param {string} adjustment.reason - Reason for adjustment
     * @param {string} adjustment.notes - Additional notes
     */
    async adjustStock(itemId, adjustment) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        // Fetch current item
        const item = await tables.getRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
        });

        let newQuantity;
        switch (adjustment.type) {
          case 'add':
            newQuantity = item.quantity + adjustment.quantity;
            break;
          case 'remove':
            newQuantity = item.quantity - adjustment.quantity;
            if (newQuantity < 0) {
              throw new Error('Cannot reduce stock below zero');
            }
            break;
          case 'set':
            newQuantity = adjustment.quantity;
            if (newQuantity < 0) {
              throw new Error('Quantity cannot be negative');
            }
            break;
          default:
            throw new Error('Invalid adjustment type');
        }

        const updatedItem = await tables.updateRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
          data: {
            quantity: newQuantity,
          },
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentItem if it's the one being adjusted
        if (this.currentItem && this.currentItem.$id === itemId) {
          this.currentItem = { ...this.currentItem, ...updatedItem };
        }

        // Show appropriate notification
        if (newQuantity <= item.reorder_threshold && newQuantity > 0) {
          errorHandler.notifyWarning(
            `Stock updated: ${item.item_name} is now at low stock level (${newQuantity} ${item.unit})`,
          );
        } else if (newQuantity === 0) {
          errorHandler.notifyError(`Stock updated: ${item.item_name} is now OUT OF STOCK`);
        } else {
          errorHandler.notifySuccess(
            `Stock updated: ${item.item_name} now has ${newQuantity} ${item.unit}`,
          );
        }

        return { success: true, data: updatedItem };
      } catch (error) {
        console.error('Error adjusting stock:', error);
        errorHandler.notifyError(error.message || 'Failed to adjust stock. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete an inventory item
     * @param {string} itemId - Inventory document ID
     */
    async deleteItem(itemId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        await tables.deleteRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Inventory item deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        errorHandler.notifyError('Failed to delete inventory item. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Find the aggregated farm produce inventory row for a given planting.
     * Returns the row if it exists, otherwise null.
     * @param {string} plantingId
     * @returns {Promise<Object|null>}
     */
    async findFarmProduceRow(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries: [
            Query.equal('planting_id', plantingId),
            Query.equal('item_type', 'farm_produce'),
            Query.limit(1),
          ],
        });

        return response.rows?.[0] || null;
      } catch (error) {
        console.error('Error finding farm produce row:', error);
        return null;
      }
    },

    /**
     * Derive inventory status from quantity and reorder threshold.
     * @private
     */
    _deriveInventoryStatus(quantity, reorderThreshold) {
      if (quantity <= 0) return 'out_of_stock';
      if (quantity <= (reorderThreshold || 0)) return 'low_stock';
      return 'in_stock';
    },

    /**
     * Upsert the aggregated farm produce inventory row when a harvest entry is recorded.
     *
     * Behavior:
     *  - Finds existing row by (planting_id, item_type='Farm Produce').
     *  - If found: increments quantity by entry.quantity_kg; recomputes weighted-average
     *    unit_cost from the provided harvest totals; updates estimated_value and status.
     *  - If not found: creates a new row with quantity = entry.quantity_kg.
     *
     * @param {Object} params
     * @param {Object} params.planting - planting row ({ $id, ... })
     * @param {Object} params.crop     - crop row ({ $id, crop_name, ... })
     * @param {Object} params.entry    - the newly-created harvest_entry row
     * @param {Object} params.harvestTotals - { total_quantity_kg, total_labor_cost, total_other_costs }
     *   Aggregated totals across ALL entries of the parent harvest (including this one).
     * @returns {Promise<{success:boolean, data?:Object, error?:string}>}
     */
    async createOrUpdateFarmProduceFromHarvest({ planting, crop, plot, entry, harvestTotals }) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        if (!planting?.$id || !crop?.$id || !entry?.quantity_kg) {
          return { success: false, error: 'Missing required planting/crop/entry data' };
        }

        const existing = await this.findFarmProduceRow(planting.$id);

        // Weighted-average unit cost across full harvest so far
        const totalHarvestQty = Number(harvestTotals?.total_quantity_kg) || 0;
        const totalHarvestCost =
          (Number(harvestTotals?.total_labor_cost) || 0) +
          (Number(harvestTotals?.total_other_costs) || 0);
        const unitCost = totalHarvestQty > 0 ? totalHarvestCost / totalHarvestQty : 0;

        const entryQty = Number(entry.quantity_kg) || 0;
        const nowIso = new Date().toISOString();

        if (existing) {
          const newQuantity = (Number(existing.quantity) || 0) + entryQty;
          const estimatedValue = Math.round(newQuantity * unitCost * 100) / 100;
          const status = this._deriveInventoryStatus(newQuantity, existing.reorder_threshold);

          console.log('Updating inventory item', {
            existing,
            newQuantity,
            unitCost,
            estimatedValue,
            status,
          });

          const updated = await tables.updateRow({
            databaseId: dbId,
            tableId: inventoryCollectionId,
            rowId: existing.$id,
            data: {
              quantity: newQuantity,
              unit_cost: Math.round(unitCost * 100) / 100,
              estimated_value: estimatedValue,
              status,
              last_updated: nowIso,
            },
          });

          // Refresh local items list if present
          const idx = this.items.findIndex((i) => i.$id === updated.$id);
          if (idx !== -1) this.items[idx] = updated;

          return { success: true, data: updated };
        }

        // Create new farm produce row
        // Story 3.7: Use naming convention with plot and season
        const itemName = deriveProduceName(crop, plot, entry?.entry_date);

        const newItem = {
          item_name: itemName,
          crop_id: crop.$id,
          item_type: 'farm_produce',
          quantity: entryQty,
          unit: 'kg',
          unit_cost: Math.round(unitCost * 100) / 100,
          estimated_value: Math.round(entryQty * unitCost * 100) / 100,
          status: this._deriveInventoryStatus(entryQty, 0),
          source: 'farm_harvest',
          source_reference_id:
            (typeof entry.harvest_id === 'object' ? entry.harvest_id?.$id : entry.harvest_id) ||
            null,
          planting_id: planting.$id,

          reorder_threshold: 0,
          date_added: nowIso,
          last_updated: nowIso,
        };

        const created = await tables.createRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: ID.unique(),
          data: newItem,
        });

        this.items.unshift(created);
        return { success: true, data: created };
      } catch (error) {
        console.error('Error upserting farm produce inventory:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Reverse a harvest entry's contribution to farm produce inventory.
     *
     * Behavior:
     *  - Finds the aggregated row by (planting_id).
     *  - If current quantity < entry.quantity_kg: returns { success: false, reason: 'insufficient' }.
     *    This indicates produce has been sold/transferred and reversal is not possible.
     *  - Otherwise decrements quantity by entry.quantity_kg and recomputes unit_cost from
     *    the remaining harvest totals (caller provides updatedHarvestTotals after removing
     *    the entry's contribution).
     *  - If the resulting quantity is 0 AND no sales history exists, caller may delete the row
     *    separately (not handled here to keep action single-purpose).
     *
     * @param {Object} params
     * @param {Object} params.planting
     * @param {Object} params.crop
     * @param {Object} params.entry - the entry being deleted
     * @param {Object} params.updatedHarvestTotals - { total_quantity_kg, total_labor_cost, total_other_costs }
     *   Totals AFTER subtracting this entry.
     * @returns {Promise<{success:boolean, data?:Object, error?:string, reason?:string}>}
     */
    async reverseFarmProduceFromHarvest({ planting, crop, entry, updatedHarvestTotals }) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        if (!planting?.$id || !crop?.$id || !entry?.quantity_kg) {
          return { success: false, error: 'Missing required planting/crop/entry data' };
        }

        const existing = await this.findFarmProduceRow(planting.$id);
        if (!existing) {
          return { success: false, error: 'Inventory row not found for this planting' };
        }

        const currentQty = Number(existing.quantity) || 0;
        const entryQty = Number(entry.quantity_kg) || 0;

        if (currentQty < entryQty) {
          return {
            success: false,
            reason: 'insufficient',
            error:
              'Cannot delete entry: produce has already been sold or transferred. ' +
              `Inventory has ${currentQty}kg remaining but entry recorded ${entryQty}kg.`,
          };
        }

        const newQuantity = currentQty - entryQty;
        const remainingQty = Number(updatedHarvestTotals?.total_quantity_kg) || 0;
        const remainingCost =
          (Number(updatedHarvestTotals?.total_labor_cost) || 0) +
          (Number(updatedHarvestTotals?.total_other_costs) || 0);
        const newUnitCost = remainingQty > 0 ? remainingCost / remainingQty : 0;
        const estimatedValue = Math.round(newQuantity * newUnitCost * 100) / 100;
        const status = this._deriveInventoryStatus(newQuantity, existing.reorder_threshold);

        const updated = await tables.updateRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: existing.$id,
          data: {
            quantity: newQuantity,
            unit_cost: Math.round(newUnitCost * 100) / 100,
            estimated_value: estimatedValue,
            status,
            last_updated: new Date().toISOString(),
          },
        });

        const idx = this.items.findIndex((i) => i.$id === updated.$id);
        if (idx !== -1) this.items[idx] = updated;

        return { success: true, data: updated };
      } catch (error) {
        console.error('Error reversing farm produce inventory:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Handle inventory reversal when an entire harvest is deleted.
     * Checks if the aggregated inventory row has enough quantity to reverse,
     * then either decrements the quantity or deletes the row entirely.
     *
     * @param {Object} harvest - The harvest object being deleted (needs total_quantity_kg)
     * @param {Object} planting - The planting object (needs $id)
     * @returns {Promise<{success:boolean, data?:Object, error?:string, reason?:string}>}
     */
    async deleteFarmProduceForHarvest(harvest, planting) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const inventoryRow = await this.findFarmProduceRow(planting.$id);
        const harvestQty = Number(harvest.total_quantity_kg) || 0;

        if (inventoryRow && Number(inventoryRow.quantity) < harvestQty) {
          return {
            success: false,
            reason: 'insufficient',
            error:
              'Cannot delete harvest: some of its produce has already been sold or transferred. ' +
              `Inventory has ${inventoryRow.quantity}kg on hand but harvest recorded ${harvestQty}kg.`,
          };
        }

        if (!inventoryRow) {
          return { success: true, data: { deletedInventoryRow: false } };
        }

        const newQty = Number(inventoryRow.quantity) - harvestQty;
        if (newQty > 0) {
          try {
            const updated = await tables.updateRow({
              databaseId: dbId,
              tableId: inventoryCollectionId,
              rowId: inventoryRow.$id,
              data: {
                quantity: newQty,
                status: this._deriveInventoryStatus(newQty, inventoryRow.reorder_threshold),
                estimated_value:
                  Math.round(newQty * (Number(inventoryRow.unit_cost) || 0) * 100) / 100,
                last_updated: new Date().toISOString(),
              },
            });

            const idx = this.items.findIndex((i) => i.$id === updated.$id);
            if (idx !== -1) this.items[idx] = updated;

            return { success: true, data: { deletedInventoryRow: false, newQuantity: newQty } };
          } catch (e) {
            return { success: false, error: `Failed to decrement inventory: ${e.message}` };
          }
        } else {
          try {
            await tables.deleteRow({
              databaseId: dbId,
              tableId: inventoryCollectionId,
              rowId: inventoryRow.$id,
            });
            this.items = this.items.filter((i) => i.$id !== inventoryRow.$id);
            return { success: true, data: { deletedInventoryRow: true } };
          } catch (e) {
            return { success: false, error: `Failed to delete inventory row: ${e.message}` };
          }
        }
      } catch (error) {
        console.error('Error in deleteFarmProduceForHarvest:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Delete the aggregated farm produce row for a planting if it exists
     * and has full quantity remaining (no sales). Used when a harvest is deleted
     * and all its entries have been reversed.
     *
     * @param {string} plantingId
     * @returns {Promise<{success:boolean, error?:string}>}
     */
    async deleteFarmProduceRowIfEmpty(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const existing = await this.findFarmProduceRow(plantingId);
        if (!existing) return { success: true };

        if ((Number(existing.quantity) || 0) > 0) {
          return {
            success: false,
            error: 'Cannot delete produce inventory row: still has quantity on hand',
          };
        }

        await tables.deleteRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: existing.$id,
        });

        this.items = this.items.filter((i) => i.$id !== existing.$id);
        return { success: true };
      } catch (error) {
        console.error('Error deleting empty farm produce row:', error);
        return { success: false, error: error.message };
      }
    },

    // ==========================================================================
    // Story 3.7: Farm Produce Historical Price & Fetch Actions
    // ==========================================================================

    /**
     * Fetch historical price for a crop from last 5 farm sales.
     *
     * Query chain: farm_sales → harvests → plantings → crops
     * - Find all plantings for this crop
     * - Find all harvests for those plantings
     * - Find all farm_sales for those harvests (last 5 by sale_date)
     * - Calculate weighted average price_per_kg
     *
     * @param {string} cropId - The crop $id to look up
     * @returns {Promise<{success:boolean, price:number|null, saleCount:number, error?:string}>}
     *   price: weighted average price per kg, or null if no sales
     *   saleCount: number of historical sales found (0-5)
     */
    async fetchHistoricalPriceForCrop(cropId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Step 1: Find all plantings for this crop
        const plantingsRes = await tables.listRows({
          databaseId: dbId,
          tableId: 'plantings',
          queries: [Query.equal('crop_id', cropId), Query.limit(100)],
        });
        const plantings = plantingsRes.rows || [];
        if (plantings.length === 0) {
          return { success: true, price: null, saleCount: 0 };
        }

        const plantingIds = plantings.map((p) => p.$id);

        // Step 2: Find all harvests for those plantings
        const harvestQueries = plantingIds.map((id) => Query.equal('planting_id', id));
        const harvestsRes = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [
            harvestQueries.length === 1 ? harvestQueries[0] : Query.or(harvestQueries),
            Query.limit(100),
          ],
        });
        const harvests = harvestsRes.rows || [];
        if (harvests.length === 0) {
          return { success: true, price: null, saleCount: 0 };
        }

        const harvestIds = harvests.map((h) => h.$id);

        // Step 3: Find last 5 farm_sales for those harvests
        const salesQueries = harvestIds.map((id) => Query.equal('harvest_id', id));
        const salesRes = await tables.listRows({
          databaseId: dbId,
          tableId: 'farm_sales',
          queries: [
            salesQueries.length === 1 ? salesQueries[0] : Query.or(salesQueries),
            Query.orderDesc('sale_date'),
            Query.limit(5),
          ],
        });
        const sales = salesRes.rows || [];

        if (sales.length === 0) {
          return { success: true, price: null, saleCount: 0 };
        }

        // Calculate weighted average price per kg
        let totalValue = 0;
        let totalQty = 0;
        for (const sale of sales) {
          const qty = Number(sale.quantity_sold) || 0;
          const price = Number(sale.price_per_kg) || 0;
          totalValue += qty * price;
          totalQty += qty;
        }

        const weightedPrice = totalQty > 0 ? totalValue / totalQty : null;

        return {
          success: true,
          price: weightedPrice ? Math.round(weightedPrice * 100) / 100 : null,
          saleCount: sales.length,
        };
      } catch (error) {
        console.error('Error fetching historical price:', error);
        return { success: false, price: null, saleCount: 0, error: error.message };
      }
    },

    /**
     * Fetch all farm_produce inventory items for the dashboard widget.
     *
     * @returns {Promise<{success:boolean, items:Array, error?:string}>}
     */
    async fetchFarmProduceItems() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries: [Query.equal('item_type', 'farm_produce'), Query.limit(100)],
        });

        const items = response.rows || [];

        // Story 3.7: Update dedicated farm produce state
        this.farmProduceItems = items;

        // Also update general items list
        this.items = [...this.items.filter((i) => i.item_type !== 'farm_produce'), ...items];

        return { success: true, items };
      } catch (error) {
        console.error('Error fetching farm produce items:', error);
        return { success: false, items: [], error: error.message };
      }
    },

    /**
     * Fetch inventory items linked to specific finance transaction IDs
     * Story 2.7: Used for batch lookup of linked inventory from transaction list
     * @param {string[]} transactionIds - Array of finance transaction $id values
     * @returns {Object} - Map of { transactionId: inventoryItem }
     */
    async fetchItemsBySourceRefs(transactionIds) {
      if (!transactionIds || transactionIds.length === 0) return {};

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries: [
            Query.equal('transaction_id', transactionIds),
            Query.limit(transactionIds.length),
          ],
        });

        const map = {};
        for (const item of response.rows || []) {
          // With relationship fields, it might be an object or string depending on Appwrite version
          const txId =
            typeof item.transaction_id === 'object' && item.transaction_id !== null
              ? item.transaction_id.$id
              : item.transaction_id;

          if (txId) {
            map[txId] = item;
          }
        }
        return map;
      } catch (error) {
        console.error('Error fetching linked inventory items:', error);
        return {}; // Return empty map on error to not break the UI
      }
    },

    /**
     * Update low stock and out of stock counts
     */
    updateAlertCounts() {
      this.lowStockCount = this.items.filter((item) => item.status === 'low_stock').length;
      this.outOfStockCount = this.items.filter((item) => item.status === 'out_of_stock').length;
    },

    /**
     * Fetch low stock items for dashboard widget
     */
    async fetchLowStockItems() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries: [
            Query.equal('status', 'low_stock'),
            Query.limit(10),
            //Query.orderDesc('date_added'),
            Query.orderDesc('$createdAt'),
          ],
        });

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching low stock items:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Fetch out of stock items for dashboard widget
     */
    async fetchOutOfStockItems() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          queries: [
            Query.equal('status', 'out_of_stock'),
            Query.limit(10),
            //Query.orderDesc('date_added'),
            Query.orderDesc('$createdAt'),
          ],
        });

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching out of stock items:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Change page
     * @param {number} page - Page number to navigate to
     */
    async goToPage(page) {
      if (page < 1 || page > this.totalPages) {
        return;
      }
      await this.fetchItems(page, this.pagination.itemsPerPage);
    },

    /**
     * Change items per page
     * @param {number} itemsPerPage - Number of items per page
     */
    async changeItemsPerPage(itemsPerPage) {
      await this.fetchItems(1, itemsPerPage);
    },

    /**
     * Go to next page
     */
    async nextPage() {
      if (this.hasNextPage) {
        await this.goToPage(this.pagination.currentPage + 1);
      }
    },

    /**
     * Go to previous page
     */
    async previousPage() {
      if (this.hasPreviousPage) {
        await this.goToPage(this.pagination.currentPage - 1);
      }
    },

    /**
     * Set filters
     * @param {Object} filters - Filter values
     */
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filters = {
        itemTypes: [],
        statuses: [],
        search: '',
        sources: [],
      };
    },

    /**
     * Clear current item
     */
    clearCurrentItem() {
      this.currentItem = null;
    },

    /**
     * Get item type display label
     */
    getItemTypeLabel(type) {
      const labels = {
        farm_inputs: 'Farm Inputs',
        farm_produce: 'Farm Produce',
        school_supplies: 'School Supplies',
        medical_supplies: 'Medical Supplies',
        kitchen_supplies: 'Kitchen Supplies',
        equipment: 'Equipment',
        other: 'Other',
      };
      return labels[type] || type;
    },

    /**
     * Get status display label
     */
    getStatusLabel(status) {
      const labels = {
        in_stock: 'In Stock',
        low_stock: 'Low Stock',
        out_of_stock: 'Out of Stock',
        reserved: 'Reserved',
      };
      return labels[status] || status;
    },

    /**
     * Get source display label
     */
    getSourceLabel(source) {
      const labels = {
        finance_purchase: 'Finance Purchase',
        farm_harvest: 'Farm Harvest',
        manual_entry: 'Manual Entry',
        donation: 'Donation',
      };
      return labels[source] || source;
    },

    /**
     * Get color for item type badge/icon
     */
    getItemTypeColor(type) {
      const colors = {
        farm_inputs: 'green',
        farm_produce: 'light-green',
        school_supplies: 'blue',
        medical_supplies: 'red',
        kitchen_supplies: 'orange',
        equipment: 'purple',
        other: 'grey',
      };
      return colors[type] || 'grey';
    },

    /**
     * Get icon for item type
     */
    getItemTypeIcon(type) {
      const icons = {
        farm_inputs: 'agriculture',
        farm_produce: 'spa',
        school_supplies: 'school',
        medical_supplies: 'local_hospital',
        kitchen_supplies: 'restaurant',
        equipment: 'handyman',
        other: 'inventory_2',
      };
      return icons[type] || 'inventory_2';
    },

    /**
     * Get color for stock status
     */
    getStatusColor(status) {
      const colors = {
        in_stock: 'positive',
        low_stock: 'warning',
        out_of_stock: 'negative',
        reserved: 'info',
      };
      return colors[status] || 'grey';
    },

    /**
     * Format currency value
     */
    formatCurrency(value) {
      if (value === null || value === undefined) return '\u2014';
      return `ZMW ${Number(value).toFixed(2)}`;
    },
  },
});
