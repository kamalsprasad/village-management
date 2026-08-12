import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useVendorsStore } from 'src/modules/vendors/stores/vendors-store';
import { mockTables } from 'test/helpers/appwrite-mock';

const vendor = (over = {}) => ({
  $id: 'v1',
  name: 'Acme Corp',
  vendor_type: 'supplier',
  business_type: 'LLC',
  contact_person: 'John',
  phone: '555-0100',
  email: 'acme@test.com',
  is_active: true,
  is_preferred: false,
  ...over,
});

describe('vendors-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useVendorsStore();
    vi.clearAllMocks();
  });

  describe('fetchVendors', () => {
    it('fetches vendors and updates state', async () => {
      const vendors = [vendor()];
      mockTables.listRows.mockResolvedValue({ rows: vendors });

      const result = await store.fetchVendors();

      expect(result.success).toBe(true);
      expect(store.vendors).toEqual(vendors);
      expect(store.vendorsLoaded).toBe(true);
    });

    it('returns cached data without fetching when already loaded', async () => {
      store.vendorsLoaded = true;
      store.vendors = [vendor()];

      const result = await store.fetchVendors();

      expect(result.success).toBe(true);
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('forces refresh when force=true', async () => {
      store.vendorsLoaded = true;
      const newVendors = [vendor({ $id: 'v2' })];
      mockTables.listRows.mockResolvedValue({ rows: newVendors });

      const result = await store.fetchVendors(true);

      expect(result.success).toBe(true);
      expect(mockTables.listRows).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchVendors();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchVendorById', () => {
    it('fetches a single vendor and sets currentVendor', async () => {
      const v = vendor();
      mockTables.getRow.mockResolvedValue(v);

      const result = await store.fetchVendorById('v1');

      expect(result.success).toBe(true);
      expect(store.currentVendor).toEqual(v);
    });

    it('returns error on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchVendorById('v1');

      expect(result.success).toBe(false);
    });
  });

  describe('createVendor', () => {
    it('creates a vendor and adds to state', async () => {
      const newVendor = vendor({ $id: 'v-new' });
      mockTables.createRow.mockResolvedValue(newVendor);

      const result = await store.createVendor({
        name: 'Acme Corp',
        vendor_type: 'supplier',
        phone: '555-0100',
      });

      expect(result.success).toBe(true);
      expect(store.vendors.find((v) => v.$id === 'v-new')).toBeDefined();
    });

    it('returns error when name is missing', async () => {
      const result = await store.createVendor({ vendor_type: 'supplier' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name is required/);
    });

    it('returns error when vendor_type is missing', async () => {
      const result = await store.createVendor({ name: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Vendor type is required/);
    });

    it('defaults is_active to true when not specified', async () => {
      mockTables.createRow.mockResolvedValue(vendor());

      await store.createVendor({ name: 'Test', vendor_type: 'supplier' });

      expect(mockTables.createRow.mock.calls[0][0].data.is_active).toBe(true);
    });

    it('returns error on table failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('db error'));

      const result = await store.createVendor({ name: 'Test', vendor_type: 'supplier' });

      expect(result.success).toBe(false);
    });
  });

  describe('updateVendor', () => {
    it('updates a vendor and syncs local state', async () => {
      store.vendors = [vendor({ $id: 'v1', name: 'Old' })];
      const updated = vendor({ $id: 'v1', name: 'New' });
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateVendor('v1', { name: 'New' });

      expect(result.success).toBe(true);
      expect(store.vendors[0].name).toBe('New');
    });

    it('updates currentVendor if it matches', async () => {
      store.currentVendor = vendor({ $id: 'v1' });
      const updated = vendor({ $id: 'v1', name: 'Updated' });
      mockTables.updateRow.mockResolvedValue(updated);

      await store.updateVendor('v1', { name: 'Updated' });

      expect(store.currentVendor.name).toBe('Updated');
    });

    it('only includes provided fields in update payload', async () => {
      mockTables.updateRow.mockResolvedValue(vendor());

      await store.updateVendor('v1', { name: 'New Name' });

      const data = mockTables.updateRow.mock.calls[0][0].data;
      expect(data.name).toBe('New Name');
      expect(data.vendor_type).toBeUndefined();
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updateVendor('v1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('deleteVendor', () => {
    it('deletes a vendor and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.vendors = [vendor({ $id: 'v1' })];

      const result = await store.deleteVendor('v1');

      expect(result.success).toBe(true);
      expect(store.vendors).toHaveLength(0);
    });

    it('clears currentVendor if deleted', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.currentVendor = vendor({ $id: 'v1' });

      await store.deleteVendor('v1');

      expect(store.currentVendor).toBeNull();
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deleteVendor('v1');

      expect(result.success).toBe(false);
    });
  });

  describe('fetchVendorHistory', () => {
    it('returns error when vendorId is missing', async () => {
      const result = await store.fetchVendorHistory(null);

      expect(result.success).toBe(false);
      expect(store.vendorHistory).toEqual([]);
    });

    it('merges finance and farm sales entries sorted by date desc', async () => {
      mockTables.listRows
        .mockResolvedValueOnce({
          rows: [
            {
              $id: 't1',
              date: '2025-01-01',
              type: 'expense',
              amount_funded: 100,
              description: 'Purchase',
              status: 'completed',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              $id: 's1',
              sale_date: '2025-02-01',
              quantity_sold: 50,
              unit: 'kg',
              price_per_unit: 5,
              total_amount: 250,
              payment_status: 'paid',
            },
          ],
        });

      const result = await store.fetchVendorHistory('v1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // Sorted by date desc — sale (Feb) should come before finance (Jan)
      expect(result.data[0].source).toBe('farm_sale');
      expect(result.data[1].source).toBe('finance');
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchVendorHistory('v1');

      expect(result.success).toBe(false);
    });
  });
});
