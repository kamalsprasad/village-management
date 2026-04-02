import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from './auth-store';
import {
  hasPermission as checkPerm,
  hasAnyPermission as checkAnyPerm,
} from 'src/utils/permissions';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

// Helper to calculate inventory status based on quantity and threshold
function calculateStatus(quantity, reorderThreshold) {
  if (quantity === 0) return 'out_of_stock';
  if (quantity <= reorderThreshold) return 'low_stock';
  return 'in_stock';
}

// Helper to calculate estimated value
function calculateEstimatedValue(quantity, unitCost) {
  return quantity * (unitCost || 0);
}

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
        const now = new Date().toISOString();

        // Calculate status based on quantity and threshold
        const status = calculateStatus(itemData.quantity, itemData.reorder_threshold);

        // Calculate estimated value
        const estimatedValue = calculateEstimatedValue(itemData.quantity, itemData.unit_cost);

        const newItem = await tables.createRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
          data: {
            item_name: itemData.item_name,
            item_type: itemData.item_type,
            quantity: itemData.quantity,
            unit: itemData.unit,
            unit_cost: itemData.unit_cost || 0,
            estimated_value: estimatedValue,
            status: status,
            source: itemData.source || 'manual_entry',
            source_reference_id: itemData.source_reference_id || null,
            reorder_threshold: itemData.reorder_threshold || 10,
            //date_added: now,
            last_updated: now,
            notes: itemData.notes || '',
          },
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Inventory item created successfully');
        return { success: true, data: newItem };
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
     * @param {string} itemId - Inventory document ID
     * @param {Object} itemData - Updated inventory data
     */
    async updateItem(itemId, itemData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const inventoryCollectionId = import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory';

        // Recalculate status and value if quantity changed
        const quantity =
          itemData.quantity !== undefined ? itemData.quantity : this.currentItem?.quantity;
        const unitCost =
          itemData.unit_cost !== undefined ? itemData.unit_cost : this.currentItem?.unit_cost;
        const reorderThreshold =
          itemData.reorder_threshold !== undefined
            ? itemData.reorder_threshold
            : this.currentItem?.reorder_threshold;

        const status = calculateStatus(quantity, reorderThreshold);
        const estimatedValue = calculateEstimatedValue(quantity, unitCost);

        const updatedItem = await tables.updateRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
          data: {
            item_name: itemData.item_name,
            item_type: itemData.item_type,
            quantity: quantity,
            unit: itemData.unit,
            unit_cost: unitCost,
            estimated_value: estimatedValue,
            status: status,
            reorder_threshold: reorderThreshold,
            notes: itemData.notes || '',
            last_updated: new Date().toISOString(),
          },
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentItem if it's the one being edited
        if (this.currentItem && this.currentItem.$id === itemId) {
          this.currentItem = { ...this.currentItem, ...updatedItem };
        }

        errorHandler.notifySuccess('Inventory item updated successfully');
        return { success: true, data: updatedItem };
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

        // Calculate new status and value
        const status = calculateStatus(newQuantity, item.reorder_threshold);
        const estimatedValue = calculateEstimatedValue(newQuantity, item.unit_cost);

        const updatedItem = await tables.updateRow({
          databaseId: dbId,
          tableId: inventoryCollectionId,
          rowId: itemId,
          data: {
            quantity: newQuantity,
            status: status,
            estimated_value: estimatedValue,
            last_updated: new Date().toISOString(),
          },
        });

        // Refresh the list
        await this.fetchItems(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentItem if it's the one being adjusted
        if (this.currentItem && this.currentItem.$id === itemId) {
          this.currentItem = { ...this.currentItem, ...updatedItem };
        }

        // Show appropriate notification
        if (status === 'low_stock') {
          errorHandler.notifyWarning(
            `Stock updated: ${item.item_name} is now at low stock level (${newQuantity} ${item.unit})`,
          );
        } else if (status === 'out_of_stock') {
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
            Query.equal('source', 'finance_purchase'),
            Query.equal('source_reference_id', transactionIds),
            Query.limit(transactionIds.length),
          ],
        });

        const map = {};
        for (const item of response.rows || []) {
          if (item.source_reference_id) {
            map[item.source_reference_id] = item;
          }
        }
        return map;
      } catch (error) {
        console.error('Error fetching linked inventory items:', error);
        return {};
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
