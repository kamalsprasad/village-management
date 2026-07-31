import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

const VENDORS_TABLE = 'vendors';
const FINANCE_TABLE = 'finance_transactions';
const FARM_SALES_TABLE = 'farm_sales';

/**
 * Vendors Store (Story 5.7)
 *
 * Manages vendor/supplier master data and cross-module transaction history
 * (finance_transactions.vendor_id and farm_sales.buyer_id where buyer_type='vendor').
 * Follows the pattern established in finance-store.js / farm-store.js.
 */
export const useVendorsStore = defineStore('vendors', {
  state: () => ({
    vendors: [],
    vendorsLoaded: false,
    isLoading: false,
    currentVendor: null,
    vendorHistory: [],
  }),

  getters: {
    /**
     * Active vendors only
     */
    activeVendors: (state) => state.vendors.filter((v) => v.is_active !== false),

    /**
     * Vendors that are Suppliers or Both
     */
    suppliers: (state) =>
      state.vendors.filter((v) => v.vendor_type === 'Supplier' || v.vendor_type === 'Both'),

    /**
     * Vendors that are Buyers or Both
     */
    buyers: (state) =>
      state.vendors.filter((v) => v.vendor_type === 'Buyer' || v.vendor_type === 'Both'),

    /**
     * Vendors marked as 'Both' supplier and buyer
     */
    both: (state) => state.vendors.filter((v) => v.vendor_type === 'Both'),

    /**
     * Resolve a vendor's display name from its ID
     */
    getVendorNameById: (state) => (vendorId) => {
      if (!vendorId) return '';
      const vendor = state.vendors.find((v) => v.$id === vendorId);
      return vendor ? vendor.name : '';
    },

    /**
     * Get a vendor object by ID from local state
     */
    getVendorById: (state) => (vendorId) => {
      if (!vendorId) return null;
      return state.vendors.find((v) => v.$id === vendorId) || null;
    },

    /**
     * Aggregate transaction totals from the currently loaded vendorHistory:
     * total transactions, total purchases (expenses), total sales (farm_sales)
     */
    vendorTransactionTotals: (state) => {
      let totalPurchases = 0;
      let totalSales = 0;
      state.vendorHistory.forEach((entry) => {
        if (entry.source === 'finance') {
          // entry.amount is negative for expenses (see fetchVendorHistory); use
          // the absolute value so the "Total Purchases" card shows a positive magnitude.
          totalPurchases += Math.abs(Number(entry.amount)) || 0;
        } else if (entry.source === 'farm_sale') {
          totalSales += Number(entry.amount) || 0;
        }
      });
      return {
        transactionCount: state.vendorHistory.length,
        totalPurchases,
        totalSales,
      };
    },
  },

  actions: {
    /**
     * Fetch all active vendors, ordered by name.
     * @param {boolean} force - Re-fetch even if already loaded
     */
    async fetchVendors(force = false) {
      if (this.vendorsLoaded && !force) {
        return { success: true, data: this.vendors };
      }

      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: VENDORS_TABLE,
          queries: [Query.orderAsc('name'), Query.limit(200)],
        });

        this.vendors = response.rows;
        this.vendorsLoaded = true;

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching vendors:', error);
        errorHandler.notifyError('Failed to load vendors. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Load a single vendor into currentVendor
     * @param {string} id - Vendor $id
     */
    async fetchVendorById(id) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const vendor = await tables.getRow({
          databaseId: dbId,
          tableId: VENDORS_TABLE,
          rowId: id,
        });

        this.currentVendor = vendor;
        return { success: true, data: vendor };
      } catch (error) {
        console.error('Error fetching vendor:', error);
        errorHandler.notifyError('Failed to load vendor. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new vendor
     * @param {Object} data - Vendor fields
     */
    async createVendor(data) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        if (!data?.name?.trim()) {
          errorHandler.notifyError('Vendor name is required.');
          return { success: false, error: 'Vendor name is required' };
        }
        if (!data?.vendor_type) {
          errorHandler.notifyError('Vendor type is required.');
          return { success: false, error: 'Vendor type is required' };
        }

        const payload = {
          name: data.name.trim(),
          vendor_type: data.vendor_type,
          business_type: data.business_type || null,
          contact_person: data.contact_person || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          payment_terms: data.payment_terms || null,
          quality_rating: data.quality_rating != null ? Number(data.quality_rating) : null,
          is_preferred: !!data.is_preferred,
          is_active: data.is_active !== undefined ? !!data.is_active : true,
          notes: data.notes || null,
          contract_expiry: data.contract_expiry || null,
        };

        const newVendor = await tables.createRow({
          databaseId: dbId,
          tableId: VENDORS_TABLE,
          rowId: ID.unique(),
          data: payload,
        });

        this.vendors.push(newVendor);
        this.vendors.sort((a, b) => a.name.localeCompare(b.name));

        errorHandler.notifySuccess(`Vendor "${newVendor.name}" created successfully`);
        return { success: true, data: newVendor };
      } catch (error) {
        console.error('Error creating vendor:', error);
        errorHandler.notifyError('Failed to create vendor. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing vendor
     * @param {string} id - Vendor $id
     * @param {Object} data - Updated fields
     */
    async updateVendor(id, data) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const payload = {};
        if (data.name !== undefined) payload.name = data.name?.trim();
        if (data.vendor_type !== undefined) payload.vendor_type = data.vendor_type;
        if (data.business_type !== undefined) payload.business_type = data.business_type || null;
        if (data.contact_person !== undefined) payload.contact_person = data.contact_person || null;
        if (data.phone !== undefined) payload.phone = data.phone || null;
        if (data.email !== undefined) payload.email = data.email || null;
        if (data.address !== undefined) payload.address = data.address || null;
        if (data.payment_terms !== undefined) payload.payment_terms = data.payment_terms || null;
        if (data.quality_rating !== undefined)
          payload.quality_rating = data.quality_rating != null ? Number(data.quality_rating) : null;
        if (data.is_preferred !== undefined) payload.is_preferred = !!data.is_preferred;
        if (data.is_active !== undefined) payload.is_active = !!data.is_active;
        if (data.notes !== undefined) payload.notes = data.notes || null;
        if (data.contract_expiry !== undefined)
          payload.contract_expiry = data.contract_expiry || null;

        const updatedVendor = await tables.updateRow({
          databaseId: dbId,
          tableId: VENDORS_TABLE,
          rowId: id,
          data: payload,
        });

        const index = this.vendors.findIndex((v) => v.$id === id);
        if (index !== -1) {
          this.vendors[index] = updatedVendor;
        }
        if (this.currentVendor?.$id === id) {
          this.currentVendor = updatedVendor;
        }

        errorHandler.notifySuccess('Vendor updated successfully');
        return { success: true, data: updatedVendor };
      } catch (error) {
        console.error('Error updating vendor:', error);
        errorHandler.notifyError('Failed to update vendor. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a vendor
     * @param {string} id - Vendor $id
     */
    async deleteVendor(id) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        await tables.deleteRow({
          databaseId: dbId,
          tableId: VENDORS_TABLE,
          rowId: id,
        });

        this.vendors = this.vendors.filter((v) => v.$id !== id);
        if (this.currentVendor?.$id === id) {
          this.currentVendor = null;
        }

        errorHandler.notifySuccess('Vendor deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting vendor:', error);
        errorHandler.notifyError('Failed to delete vendor. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch a vendor's transaction history: linked finance_transactions
     * (vendor_id = vendorId) merged with linked farm_sales
     * (buyer_id = vendorId AND buyer_type = 'vendor'), sorted by date desc.
     * @param {string} vendorId - Vendor $id
     */
    async fetchVendorHistory(vendorId) {
      if (!vendorId) {
        this.vendorHistory = [];
        return { success: false, error: 'Vendor ID is required' };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const [financeResponse, salesResponse] = await Promise.all([
          tables.listRows({
            databaseId: dbId,
            tableId: FINANCE_TABLE,
            queries: [
              Query.equal('vendor_id', vendorId),
              Query.orderDesc('date'),
              Query.limit(100),
            ],
          }),
          tables.listRows({
            databaseId: dbId,
            tableId: FARM_SALES_TABLE,
            queries: [
              Query.equal('buyer_id', vendorId),
              Query.equal('buyer_type', 'vendor'),
              Query.orderDesc('sale_date'),
              Query.limit(100),
            ],
          }),
        ]);

        const financeEntries = (financeResponse.rows || []).map((tx) => ({
          source: 'finance',
          id: tx.$id,
          date: tx.date,
          type: tx.type,
          amount: tx.type === 'income' ? tx.amount_funded : -Math.abs(tx.amount_funded),
          description: tx.description,
          status: tx.status,
          raw: tx,
        }));

        const salesEntries = (salesResponse.rows || []).map((sale) => ({
          source: 'farm_sale',
          id: sale.$id,
          date: sale.sale_date,
          type: 'sale',
          amount: sale.total_amount,
          description: `Farm sale: ${sale.quantity_sold}${sale.unit || 'kg'} @ ${sale.price_per_unit}`,
          status: sale.payment_status,
          raw: sale,
        }));

        const merged = [...financeEntries, ...salesEntries].sort(
          (a, b) => new Date(b.date) - new Date(a.date),
        );

        this.vendorHistory = merged;
        return { success: true, data: merged };
      } catch (error) {
        console.error('Error fetching vendor history:', error);
        errorHandler.notifyError('Failed to load vendor transaction history.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});
