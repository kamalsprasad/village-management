import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFarmStore } from 'src/modules/farm/stores/farm-store';
import { mockTables } from 'test/helpers/appwrite-mock';
import { makePlot, makeCrop, makePlanting } from 'test/helpers/fixtures';

const mockInventoryStore = vi.hoisted(() => ({
  adjustStock: vi.fn(),
  farmInputItems: [],
}));

const mockFinanceStore = vi.hoisted(() => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  fetchTransactionById: vi.fn(),
  fetchCategories: vi.fn(),
  fetchFundingSources: vi.fn(),
  activeFundingSources: [],
}));

vi.mock('src/stores/inventory-store', () => ({
  useInventoryStore: () => mockInventoryStore,
}));

vi.mock('src/modules/finance/stores/finance-store', () => ({
  useFinanceStore: () => mockFinanceStore,
}));

describe('farm-store', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFarmStore();
    vi.clearAllMocks();
  });

  // ================================================================
  // Plot CRUD
  // ================================================================

  describe('fetchPlots', () => {
    it('fetches plots and updates state', async () => {
      const plots = [makePlot(), makePlot({ $id: 'plot-2', plot_name: 'South Field' })];
      mockTables.listRows.mockResolvedValue({ rows: plots });

      const result = await store.fetchPlots();

      expect(result.success).toBe(true);
      expect(store.plots).toEqual(plots);
      expect(store.plotsLoaded).toBe(true);
      expect(store.isPlotsLoading).toBe(false);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      const result = await store.fetchPlots();

      expect(result.success).toBe(false);
      expect(store.isPlotsLoading).toBe(false);
    });
  });

  describe('fetchPlotById', () => {
    it('fetches a single plot and sets currentPlot', async () => {
      const plot = makePlot();
      mockTables.getRow.mockResolvedValue(plot);

      const result = await store.fetchPlotById('plot-1');

      expect(result.success).toBe(true);
      expect(store.currentPlot).toEqual(plot);
    });

    it('returns error on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchPlotById('plot-1');

      expect(result.success).toBe(false);
    });
  });

  describe('createPlot', () => {
    it('creates a plot and adds to local state', async () => {
      const newPlot = makePlot({ $id: 'new-plot', plot_name: 'New Field' });
      mockTables.createRow.mockResolvedValue(newPlot);

      const result = await store.createPlot({ plot_name: 'New Field', area_hectares: 2 });

      expect(result.success).toBe(true);
      expect(store.plots.find((p) => p.$id === 'new-plot')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('db error'));

      const result = await store.createPlot({ plot_name: 'New' });

      expect(result.success).toBe(false);
    });
  });

  describe('updatePlot', () => {
    it('updates a plot and syncs local state', async () => {
      const existing = makePlot({ $id: 'plot-1', plot_name: 'Old Name' });
      store.plots = [existing];
      const updated = { ...existing, plot_name: 'New Name' };
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updatePlot('plot-1', { plot_name: 'New Name' });

      expect(result.success).toBe(true);
      expect(store.plots[0].plot_name).toBe('New Name');
    });

    it('updates currentPlot if it matches', async () => {
      store.currentPlot = makePlot({ $id: 'plot-1' });
      const updated = { ...store.currentPlot, plot_name: 'Updated' };
      mockTables.updateRow.mockResolvedValue(updated);

      await store.updatePlot('plot-1', { plot_name: 'Updated' });

      expect(store.currentPlot.plot_name).toBe('Updated');
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updatePlot('plot-1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('deletePlot', () => {
    it('deletes a plot with no plantings', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockResolvedValue();
      store.plots = [makePlot({ $id: 'plot-1' })];

      const result = await store.deletePlot('plot-1');

      expect(result.success).toBe(true);
      expect(store.plots).toHaveLength(0);
    });

    it('prevents deletion when plot has plantings', async () => {
      mockTables.listRows.mockResolvedValue({ total: 1, rows: [makePlanting()] });

      const result = await store.deletePlot('plot-1');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/planting history/);
    });

    it('clears currentPlot if deleted', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockResolvedValue();
      store.currentPlot = makePlot({ $id: 'plot-1' });

      await store.deletePlot('plot-1');

      expect(store.currentPlot).toBeNull();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockResolvedValue({ total: 0, rows: [] });
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deletePlot('plot-1');

      expect(result.success).toBe(false);
    });
  });

  describe('clearCurrentPlot', () => {
    it('clears currentPlot', () => {
      store.currentPlot = makePlot();
      store.clearCurrentPlot();
      expect(store.currentPlot).toBeNull();
    });
  });

  // ================================================================
  // Soil Types
  // ================================================================

  describe('fetchSoilTypes', () => {
    it('fetches soil types and updates state', async () => {
      const soilTypes = [{ $id: 'soil-1', name: 'Loam' }];
      mockTables.listRows.mockResolvedValue({ rows: soilTypes });

      const result = await store.fetchSoilTypes();

      expect(result.success).toBe(true);
      expect(store.soilTypes).toEqual(soilTypes);
      expect(store.soilTypesLoaded).toBe(true);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchSoilTypes();

      expect(result.success).toBe(false);
    });
  });

  describe('getSoilTypeName', () => {
    it('returns soil type name when found', () => {
      store.soilTypes = [{ $id: 'soil-1', name: 'Loam' }];
      expect(store.getSoilTypeName('soil-1')).toBe('Loam');
    });

    it('returns "Not specified" when not found', () => {
      expect(store.getSoilTypeName('unknown')).toBe('Not specified');
    });

    it('returns "Not specified" for falsy id', () => {
      expect(store.getSoilTypeName(null)).toBe('Not specified');
      expect(store.getSoilTypeName(undefined)).toBe('Not specified');
    });
  });

  // ================================================================
  // Crop CRUD
  // ================================================================

  describe('fetchCrops', () => {
    it('fetches crops and updates state', async () => {
      const crops = [makeCrop()];
      mockTables.listRows.mockResolvedValue({ rows: crops });

      const result = await store.fetchCrops();

      expect(result.success).toBe(true);
      expect(store.crops).toEqual(crops);
      expect(store.cropsLoaded).toBe(true);
    });

    it('applies category filter', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });

      await store.fetchCrops({ category: 'cereal' });

      expect(mockTables.listRows).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchCrops();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchCropById', () => {
    it('fetches a single crop', async () => {
      const crop = makeCrop();
      mockTables.getRow.mockResolvedValue(crop);

      const result = await store.fetchCropById('crop-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(crop);
    });

    it('returns error on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchCropById('crop-1');

      expect(result.success).toBe(false);
    });
  });

  describe('createCrop', () => {
    it('creates a crop with is_active=true and adds to state', async () => {
      const newCrop = makeCrop({ $id: 'new-crop' });
      mockTables.createRow.mockResolvedValue(newCrop);

      const result = await store.createCrop({ crop_name: 'Maize', category: 'cereal' });

      expect(result.success).toBe(true);
      expect(mockTables.createRow.mock.calls[0][0].data.is_active).toBe(true);
      expect(store.crops.find((c) => c.$id === 'new-crop')).toBeDefined();
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.createCrop({ crop_name: 'Test' });

      expect(result.success).toBe(false);
    });
  });

  describe('updateCrop', () => {
    it('updates a crop and syncs local state', async () => {
      const existing = makeCrop({ $id: 'crop-1', crop_name: 'Old' });
      store.crops = [existing];
      const updated = { ...existing, crop_name: 'New' };
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updateCrop('crop-1', { crop_name: 'New' });

      expect(result.success).toBe(true);
      expect(store.crops[0].crop_name).toBe('New');
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.updateCrop('crop-1', {});

      expect(result.success).toBe(false);
    });
  });

  describe('toggleCropActive', () => {
    it('toggles crop active state', async () => {
      const existing = makeCrop({ $id: 'crop-1', is_active: true });
      store.crops = [existing];
      const updated = { ...existing, is_active: false };
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.toggleCropActive('crop-1', false);

      expect(result.success).toBe(true);
      expect(mockTables.updateRow.mock.calls[0][0].data.is_active).toBe(false);
      expect(store.crops[0].is_active).toBe(false);
    });

    it('returns error on failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('fail'));

      const result = await store.toggleCropActive('crop-1', true);

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // Planting CRUD
  // ================================================================

  describe('fetchPlantings', () => {
    it('fetches plantings and updates state', async () => {
      const plantings = [makePlanting()];
      mockTables.listRows.mockResolvedValue({ rows: plantings });

      const result = await store.fetchPlantings();

      expect(result.success).toBe(true);
      expect(store.plantings).toEqual(plantings);
      expect(store.plantingsLoaded).toBe(true);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchPlantings();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchPlantingById', () => {
    it('fetches a planting and sets currentPlanting', async () => {
      const planting = makePlanting();
      mockTables.getRow.mockResolvedValue(planting);

      const result = await store.fetchPlantingById('plant-1');

      expect(result.success).toBe(true);
      expect(store.currentPlanting).toEqual(planting);
    });

    it('handles object plantingId', async () => {
      const planting = makePlanting();
      mockTables.getRow.mockResolvedValue(planting);

      await store.fetchPlantingById({ $id: 'plant-1' });

      expect(mockTables.getRow.mock.calls[0][0].rowId).toBe('plant-1');
    });

    it('returns error on failure', async () => {
      mockTables.getRow.mockRejectedValue(new Error('not found'));

      const result = await store.fetchPlantingById('plant-1');

      expect(result.success).toBe(false);
    });
  });

  describe('createPlanting', () => {
    it('creates a planting with default status and adds to state', async () => {
      const newPlanting = makePlanting({ $id: 'new-plant' });
      mockTables.createRow.mockResolvedValue(newPlanting);

      const result = await store.createPlanting({ plot_id: 'plot-1', crop_id: 'crop-1' });

      expect(result.success).toBe(true);
      expect(mockTables.createRow.mock.calls[0][0].data.status).toBe('planted');
      expect(store.plantings[0]).toEqual(newPlanting);
    });

    it('preserves provided status', async () => {
      mockTables.createRow.mockResolvedValue(makePlanting());

      await store.createPlanting({ status: 'growing' });

      expect(mockTables.createRow.mock.calls[0][0].data.status).toBe('growing');
    });

    it('returns error on failure', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));

      const result = await store.createPlanting({});

      expect(result.success).toBe(false);
    });
  });

  describe('updatePlanting', () => {
    it('updates a planting and syncs local state', async () => {
      const existing = makePlanting({ $id: 'plant-1', status: 'planted' });
      store.plantings = [existing];
      const updated = { ...existing, status: 'growing' };
      mockTables.updateRow.mockResolvedValue(updated);

      const result = await store.updatePlanting('plant-1', { status: 'growing' });

      expect(result.success).toBe(true);
      expect(store.plantings[0].status).toBe('growing');
    });

    it('updates currentPlanting if it matches', async () => {
      store.currentPlanting = makePlanting({ $id: 'plant-1' });
      const updated = { ...store.currentPlanting, status: 'growing' };
      mockTables.updateRow.mockResolvedValue(updated);

      await store.updatePlanting('plant-1', { status: 'growing' });

      expect(store.currentPlanting.status).toBe('growing');
    });

    it('returns conflict error on 409', async () => {
      mockTables.updateRow.mockRejectedValue({ code: 409, message: 'conflict' });

      const result = await store.updatePlanting('plant-1', {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/refresh and try again/);
    });

    it('returns regular error on non-conflict failure', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('network'));

      const result = await store.updatePlanting('plant-1', {});

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/network/);
    });
  });

  describe('deletePlanting', () => {
    it('deletes a planting and removes from state', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.plantings = [makePlanting({ $id: 'plant-1' })];

      const result = await store.deletePlanting('plant-1');

      expect(result.success).toBe(true);
      expect(store.plantings).toHaveLength(0);
    });

    it('clears currentPlanting if deleted', async () => {
      mockTables.deleteRow.mockResolvedValue();
      store.currentPlanting = makePlanting({ $id: 'plant-1' });

      await store.deletePlanting('plant-1');

      expect(store.currentPlanting).toBeNull();
    });

    it('returns error on failure', async () => {
      mockTables.deleteRow.mockRejectedValue(new Error('fail'));

      const result = await store.deletePlanting('plant-1');

      expect(result.success).toBe(false);
    });
  });

  describe('clearCurrentPlanting', () => {
    it('clears currentPlanting', () => {
      store.currentPlanting = makePlanting();
      store.clearCurrentPlanting();
      expect(store.currentPlanting).toBeNull();
    });
  });

  // ================================================================
  // Harvest fetch
  // ================================================================

  describe('fetchHarvests', () => {
    it('fetches harvests and updates state', async () => {
      const harvests = [{ $id: 'h1', total_quantity_kg: 100 }];
      mockTables.listRows.mockResolvedValue({ rows: harvests });

      const result = await store.fetchHarvests();

      expect(result.success).toBe(true);
      expect(store.harvests).toEqual(harvests);
      expect(store.harvestsLoaded).toBe(true);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchHarvests();

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // Sales fetch
  // ================================================================

  describe('fetchSales', () => {
    it('fetches sales and updates state', async () => {
      const sales = [{ $id: 's1', quantity_sold: 50, price_per_kg: 5 }];
      mockTables.listRows.mockResolvedValue({ rows: sales });

      const result = await store.fetchSales();

      expect(result.success).toBe(true);
      expect(store.sales).toEqual(sales);
      expect(store.salesLoaded).toBe(true);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchSales();

      expect(result.success).toBe(false);
    });
  });

  describe('fetchRecentSales', () => {
    it('fetches recent sales', async () => {
      const sales = [{ $id: 's1', quantity_sold: 50 }];
      mockTables.listRows.mockResolvedValue({ rows: sales });

      const result = await store.fetchRecentSales(5);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sales);
    });

    it('returns error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('fail'));

      const result = await store.fetchRecentSales(5);

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // Filters
  // ================================================================

  describe('setFilters', () => {
    it('merges filters', () => {
      store.setFilters({ plotId: 'plot-1', status: 'growing' });
      expect(store.filters.plotId).toBe('plot-1');
      expect(store.filters.status).toBe('growing');
    });
  });

  describe('clearFilters', () => {
    it('clears all filters', () => {
      store.filters = {
        plotId: 'p1',
        cropId: 'c1',
        status: 'growing',
        dateFrom: '2025-01',
        dateTo: '2025-02',
      };
      store.clearFilters();
      expect(store.filters.plotId).toBeNull();
      expect(store.filters.cropId).toBeNull();
      expect(store.filters.status).toBeNull();
    });
  });

  // ================================================================
  // Planting Additional Cost Entries
  // ================================================================

  describe('getPlantingCostTotals', () => {
    it('returns initial cost fields when no ledger entries exist', () => {
      const planting = makePlanting({ inputs_cost: 100, labor_cost: 50, other_cost: 25 });
      const totals = store.getPlantingCostTotals(planting);
      expect(totals.inputs).toBe(100);
      expect(totals.labor).toBe(50);
      expect(totals.other).toBe(25);
      expect(totals.total).toBe(175);
    });

    it('adds additional cost entries to initial fields', () => {
      const planting = makePlanting({ inputs_cost: 100, labor_cost: 50, other_cost: 25 });
      store.plantingCostEntries = [
        { planting_id: planting.$id, category: 'inputs', amount: 40 },
        { planting_id: planting.$id, category: 'labor', amount: 20 },
        { planting_id: planting.$id, category: 'other', amount: 10 },
      ];
      const totals = store.getPlantingCostTotals(planting);
      expect(totals.inputs).toBe(140);
      expect(totals.labor).toBe(70);
      expect(totals.other).toBe(35);
      expect(totals.total).toBe(245);
    });
  });

  describe('canRecordAdditionalCost', () => {
    it('allows cost entries for active planting statuses', () => {
      for (const status of ['planned', 'planted', 'growing', 'harvesting']) {
        expect(store.canRecordAdditionalCost({ status })).toBe(true);
      }
    });

    it('blocks cost entries for closed planting statuses', () => {
      for (const status of ['completed', 'failed']) {
        expect(store.canRecordAdditionalCost({ status })).toBe(false);
      }
    });
  });

  describe('fetchPlantingCostEntries', () => {
    it('fetches entries and updates state', async () => {
      const entries = [{ $id: 'ce-1', planting_id: 'plant-1', category: 'inputs', amount: 10 }];
      mockTables.listRows.mockResolvedValue({ rows: entries });

      const result = await store.fetchPlantingCostEntries('plant-1');

      expect(result.success).toBe(true);
      expect(store.plantingCostEntries).toEqual(entries);
      expect(mockTables.listRows.mock.calls[0][0].tableId).toBe('planting_cost_entries');
    });
  });

  describe('createPlantingCostEntry', () => {
    it('creates a standalone cost entry', async () => {
      const planting = makePlanting();
      store.plantings = [planting];
      const created = {
        $id: 'ce-1',
        planting_id: planting.$id,
        category: 'labor',
        amount: 50,
      };
      mockTables.createRow.mockResolvedValue(created);

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'labor',
        date: '2026-08-20',
        description: 'Weeding',
        amount: 50,
      });

      expect(result.success).toBe(true);
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('rejects invalid category', async () => {
      const planting = makePlanting();
      store.plantings = [planting];

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'invalid',
        date: '2026-08-20',
        description: 'x',
        amount: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid cost category/);
    });

    it('rejects closed plantings', async () => {
      const planting = makePlanting({ status: 'completed' });
      store.plantings = [planting];

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'labor',
        date: '2026-08-20',
        description: 'x',
        amount: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/completed or failed/);
    });

    it('deducts inventory and creates linked entry', async () => {
      const planting = makePlanting();
      store.plantings = [planting];
      mockInventoryStore.adjustStock.mockResolvedValue({ success: true, data: {} });
      const created = {
        $id: 'ce-1',
        planting_id: planting.$id,
        category: 'inputs',
        amount: 100,
      };
      mockTables.getRow.mockResolvedValue({ item_name: 'Seed', quantity: 50, unit: 'kg' });
      mockTables.createRow.mockResolvedValue(created);

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'inputs',
        date: '2026-08-20',
        description: 'Seed purchase',
        amount: 100,
        inventoryItemId: 'inv-1',
        inventoryQuantity: 10,
      });

      expect(result.success).toBe(true);
      expect(mockInventoryStore.adjustStock).toHaveBeenCalledWith('inv-1', {
        type: 'remove',
        quantity: 10,
      });
    });

    it.each([0, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects selected inventory with non-positive or non-finite quantity %s',
      async (inventoryQuantity) => {
        const planting = makePlanting();
        store.plantings = [planting];

        const result = await store.createPlantingCostEntry(planting.$id, {
          category: 'inputs',
          date: '2026-08-20',
          description: 'Seed',
          amount: 100,
          inventoryItemId: 'inv-1',
          inventoryQuantity,
        });

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/finite number greater than zero/);
        expect(mockInventoryStore.adjustStock).not.toHaveBeenCalled();
      },
    );

    it('propagates Finance create failure', async () => {
      const planting = makePlanting();
      store.plantings = [planting];
      mockFinanceStore.createTransaction.mockResolvedValue({
        success: false,
        error: 'Finance service unavailable',
      });

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'labor',
        date: '2026-08-20',
        description: 'Weeding',
        amount: 50,
        createFinance: true,
        financeCategoryId: 'fc-1',
      });

      expect(result).toMatchObject({ success: false, error: 'Finance service unavailable' });
      expect(mockTables.createRow).not.toHaveBeenCalled();
    });

    it('reports an inventory rollback failure after Finance create fails', async () => {
      const planting = makePlanting();
      store.plantings = [planting];
      mockTables.getRow.mockResolvedValue({ item_name: 'Seed', quantity: 50, unit: 'kg' });
      mockInventoryStore.adjustStock
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'rollback unavailable' });
      mockFinanceStore.createTransaction.mockResolvedValue({
        success: false,
        error: 'Finance create failed',
      });

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'inputs',
        date: '2026-08-20',
        description: 'Seed',
        amount: 100,
        inventoryItemId: 'inv-1',
        inventoryQuantity: 10,
        createFinance: true,
        financeCategoryId: 'fc-1',
      });

      expect(result.success).toBe(false);
      expect(result.consistencyWarning).toBe(true);
      expect(result.error).toMatch(/rollback unavailable/);
    });

    it('creates finance transaction when createFinance is true', async () => {
      const planting = makePlanting();
      store.plantings = [planting];
      mockFinanceStore.createTransaction.mockResolvedValue({
        success: true,
        data: { $id: 'tx-1' },
      });
      const created = { $id: 'ce-1', planting_id: planting.$id, category: 'labor', amount: 50 };
      mockTables.createRow.mockResolvedValue(created);

      const result = await store.createPlantingCostEntry(planting.$id, {
        category: 'labor',
        date: '2026-08-20',
        description: 'Weeding',
        amount: 50,
        createFinance: true,
        financeCategoryId: 'fc-1',
      });

      expect(result.success).toBe(true);
      expect(mockFinanceStore.createTransaction).toHaveBeenCalled();
    });
  });

  describe('updatePlantingCostEntry', () => {
    it('fully synchronizes inventory when switching linked items', async () => {
      store.plantings = [makePlanting({ $id: 'plant-1' })];
      mockTables.getRow.mockResolvedValue({
        $id: 'ce-1',
        planting_id: 'plant-1',
        category: 'inputs',
        amount: 50,
        cost_date: '2026-08-20T12:00:00.000Z',
        description: 'Seed',
        inventory_item_id: 'inv-old',
        inventory_quantity: 5,
      });
      mockInventoryStore.adjustStock.mockResolvedValue({ success: true });
      mockTables.updateRow.mockResolvedValue({ $id: 'ce-1', planting_id: 'plant-1' });

      const result = await store.updatePlantingCostEntry('ce-1', {
        category: 'inputs',
        date: '2026-08-21',
        description: 'Different seed',
        amount: 60,
        inventoryItemId: 'inv-new',
        inventoryQuantity: 3,
        createFinance: false,
      });

      expect(result.success).toBe(true);
      expect(mockInventoryStore.adjustStock).toHaveBeenNthCalledWith(1, 'inv-old', {
        type: 'add',
        quantity: 5,
      });
      expect(mockInventoryStore.adjustStock).toHaveBeenNthCalledWith(2, 'inv-new', {
        type: 'remove',
        quantity: 3,
      });
    });

    it('rejects zero inventory quantity when updating a selected item', async () => {
      store.plantings = [makePlanting({ $id: 'plant-1' })];
      mockTables.getRow.mockResolvedValue({
        $id: 'ce-1',
        planting_id: 'plant-1',
        category: 'inputs',
        amount: 50,
        cost_date: '2026-08-20T12:00:00.000Z',
        description: 'Seed',
      });

      const result = await store.updatePlantingCostEntry('ce-1', {
        category: 'inputs',
        date: '2026-08-21',
        description: 'Seed',
        amount: 50,
        inventoryItemId: 'inv-1',
        inventoryQuantity: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/finite number greater than zero/);
      expect(mockInventoryStore.adjustStock).not.toHaveBeenCalled();
    });

    it('adds a Finance link during edit', async () => {
      store.plantings = [makePlanting({ $id: 'plant-1' })];
      mockTables.getRow.mockResolvedValue({
        $id: 'ce-1',
        planting_id: 'plant-1',
        category: 'labor',
        amount: 50,
        cost_date: '2026-08-20T12:00:00.000Z',
        description: 'Labor',
      });
      mockFinanceStore.createTransaction.mockResolvedValue({
        success: true,
        data: { $id: 'tx-2' },
      });
      mockTables.updateRow.mockResolvedValue({
        $id: 'ce-1',
        planting_id: 'plant-1',
        finance_transaction_id: 'tx-2',
      });

      const result = await store.updatePlantingCostEntry('ce-1', {
        category: 'labor',
        date: '2026-08-20',
        description: 'Labor',
        amount: 50,
        createFinance: true,
        financeCategoryId: 'fc-1',
        paymentMethod: 'Cash',
      });

      expect(result.success).toBe(true);
      expect(mockFinanceStore.createTransaction).toHaveBeenCalled();
      expect(mockTables.updateRow.mock.calls.at(-1)[0].data.finance_transaction_id).toBe('tx-2');
    });
  });

  describe('deletePlantingCostEntry', () => {
    it('restores inventory, cancels finance, and deletes entry', async () => {
      const original = {
        $id: 'ce-1',
        planting_id: 'plant-1',
        category: 'inputs',
        amount: 50,
        inventory_item_id: 'inv-1',
        inventory_quantity: 5,
        finance_transaction_id: 'tx-1',
      };
      store.plantings = [makePlanting({ $id: 'plant-1' })];
      mockTables.getRow.mockResolvedValueOnce(original);
      mockTables.getRow.mockResolvedValueOnce({ item_name: 'Seed', quantity: 10, unit: 'kg' });
      mockInventoryStore.adjustStock.mockResolvedValue({ success: true, data: {} });
      mockFinanceStore.fetchTransactionById.mockResolvedValue({ $id: 'tx-1', amount: 50 });
      mockFinanceStore.deleteTransaction.mockResolvedValue({ success: true });
      mockTables.deleteRow.mockResolvedValue();

      const result = await store.deletePlantingCostEntry('ce-1');

      expect(result.success).toBe(true);
      expect(mockInventoryStore.adjustStock).toHaveBeenCalledWith('inv-1', {
        type: 'add',
        quantity: 5,
      });
      expect(mockFinanceStore.deleteTransaction).toHaveBeenCalledWith('tx-1', expect.any(Object));
      expect(mockTables.deleteRow).toHaveBeenCalled();
    });
  });
});
