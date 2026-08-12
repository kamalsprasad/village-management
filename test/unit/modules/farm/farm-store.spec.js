import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFarmStore } from 'src/modules/farm/stores/farm-store';
import { mockTables } from 'test/helpers/appwrite-mock';
import { makePlot, makeCrop, makePlanting } from 'test/helpers/fixtures';

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
});
