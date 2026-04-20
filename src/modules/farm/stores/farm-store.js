// Farm Store - State management for farm operations
// Stories 3.1-3.9: Farm Management

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';

export const useFarmStore = defineStore('farm', {
  state: () => ({
    // Plots (Story 3.1)
    plots: [],
    plotsLoaded: false,
    isPlotsLoading: false,
    currentPlot: null,

    // Soil Types (Story 3.1)
    soilTypes: [],
    soilTypesLoaded: false,
    isSoilTypesLoading: false,

    // Crops (Story 3.2)
    crops: [],
    cropsLoaded: false,
    isCropsLoading: false,

    // Plantings (Story 3.3-3.4)
    plantings: [],
    plantingsLoaded: false,
    isPlantingsLoading: false,
    currentPlanting: null,

    // Harvests (Story 3.5-3.6)
    harvests: [],
    harvestsLoaded: false,
    isHarvestsLoading: false,

    // Sales (Story 3.8)
    sales: [],
    salesLoaded: false,
    isSalesLoading: false,

    // Dashboard stats
    stats: {
      totalPlots: 0,
      activePlantings: 0,
      readyForHarvest: 0,
      monthlySales: 0,
    },

    // Filters
    filters: {
      plotId: null,
      cropId: null,
      status: null,
      dateFrom: null,
      dateTo: null,
    },
  }),

  getters: {
    // Plot getters (Story 3.1)
    activePlots: (state) => state.plots.filter((p) => p.status === 'Active'),
    plotsByStatus: (state) => {
      return state.plots.reduce((acc, plot) => {
        acc[plot.status] = (acc[plot.status] || 0) + 1;
        return acc;
      }, {});
    },

    // Crop getters (Story 3.2)
    activeCrops: (state) => state.crops.filter((c) => c.is_active !== false),
    cropsByCategory: (state) => {
      return state.crops.reduce((acc, crop) => {
        acc[crop.category] = acc[crop.category] || [];
        acc[crop.category].push(crop);
        return acc;
      }, {});
    },
    getCropNameById: (state) => (cropId) => {
      if (!cropId) return 'Unknown Crop';
      const crop = state.crops.find((c) => c.$id === cropId);
      return crop?.crop_name || 'Unknown Crop';
    },

    // Planting getters (Story 3.3-3.4)
    plantingsByPlot: (state) => {
      return state.plantings.reduce((acc, planting) => {
        acc[planting.plot_id] = acc[planting.plot_id] || [];
        acc[planting.plot_id].push(planting);
        return acc;
      }, {});
    },
    activePlantings: (state) =>
      state.plantings.filter((p) =>
        ['Planted', 'Growing', 'Harvesting', 'planted', 'growing', 'harvesting'].includes(p.status),
      ),
    readyForHarvest: (state) =>
      state.plantings.filter((p) => {
        if (!['Growing', 'growing'].includes(p.status)) return false;
        const expectedDate = new Date(p.expected_harvest_date);
        const today = new Date();
        const daysDiff = Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7; // Ready within 7 days
      }),

    // Filtered plantings
    filteredPlantings: (state) => {
      return state.plantings.filter((planting) => {
        if (state.filters.plotId && planting.plot_id !== state.filters.plotId) return false;
        if (state.filters.cropId && planting.crop_id !== state.filters.cropId) return false;
        if (state.filters.status && planting.status !== state.filters.status) return false;
        // Date filtering logic can be added here
        return true;
      });
    },

    // Active planting check for a plot (Story 3.3)
    hasActivePlanting: (state) => (plotId) => {
      return state.plantings.some(
        (p) =>
          p.plot_id === plotId &&
          ['Planted', 'Growing', 'Harvesting', 'planted', 'growing', 'harvesting'].includes(
            p.status,
          ),
      );
    },

    // Get active planting for a specific plot
    getActivePlantingForPlot: (state) => (plotId) => {
      const activePlantings = state.plantings.filter(
        (p) =>
          p.plot_id === plotId &&
          ['Planted', 'Growing', 'Harvesting', 'planted', 'growing', 'harvesting'].includes(
            p.status,
          ),
      );
      if (activePlantings.length === 0) return null;
      if (activePlantings.length === 1) return activePlantings[0];

      // Prioritize by status: Harvesting > Growing > Planted
      const statusPriority = {
        Harvesting: 3,
        harvesting: 3,
        Growing: 2,
        growing: 2,
        Planted: 1,
        planted: 1,
      };

      return activePlantings.sort((a, b) => {
        const priorityDiff = statusPriority[b.status] - statusPriority[a.status];
        if (priorityDiff !== 0) return priorityDiff;
        // If same priority, use date (more recent first)
        return new Date(b.planting_date) - new Date(a.planting_date);
      })[0];
    },
  },

  actions: {
    // Plot management (Story 3.1)
    async fetchPlots() {
      this.isPlotsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'plots',
          queries: [Query.limit(100), Query.orderAsc('name')],
        });
        this.plots = response.rows;
        this.plotsLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching plots:', error);
        return { success: false, error: error.message };
      } finally {
        this.isPlotsLoading = false;
      }
    },

    async fetchPlotById(plotId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.getRow({
          databaseId: dbId,
          tableId: 'plots',
          rowId: plotId,
        });
        this.currentPlot = response;
        return { success: true, data: response };
      } catch (error) {
        console.error('Error fetching plot:', error);
        return { success: false, error: error.message };
      }
    },

    async createPlot(plotData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'plots',
          rowId: ID.unique(),
          data: plotData,
        });
        // Add to local state
        this.plots.push(response);
        this.plots.sort((a, b) => a.name.localeCompare(b.name));
        return { success: true, data: response };
      } catch (error) {
        console.error('Error creating plot:', error);
        return { success: false, error: error.message };
      }
    },

    async updatePlot(plotId, plotData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'plots',
          rowId: plotId,
          data: plotData,
        });
        // Update local state
        const index = this.plots.findIndex((p) => p.$id === plotId);
        if (index !== -1) {
          this.plots[index] = response;
        }
        if (this.currentPlot?.$id === plotId) {
          this.currentPlot = response;
        }
        return { success: true, data: response };
      } catch (error) {
        console.error('Error updating plot:', error);
        return { success: false, error: error.message };
      }
    },

    async deletePlot(plotId) {
      try {
        // Check for plantings first
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const plantings = await tables.listRows({
          databaseId: dbId,
          tableId: 'plantings',
          queries: [Query.equal('plot_id', plotId), Query.limit(1)],
        });

        if (plantings.total > 0) {
          return {
            success: false,
            error:
              'Cannot delete plot with planting history. Consider changing status to "Retired" instead.',
          };
        }

        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'plots',
          rowId: plotId,
        });

        // Remove from local state
        this.plots = this.plots.filter((p) => p.$id !== plotId);
        if (this.currentPlot?.$id === plotId) {
          this.currentPlot = null;
        }

        return { success: true };
      } catch (error) {
        console.error('Error deleting plot:', error);
        return { success: false, error: error.message };
      }
    },

    clearCurrentPlot() {
      this.currentPlot = null;
    },

    // Soil Types management (Story 3.1)
    async fetchSoilTypes() {
      this.isSoilTypesLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'soil_types',
          queries: [Query.limit(100), Query.orderAsc('name')],
        });
        this.soilTypes = response.rows;
        this.soilTypesLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching soil types:', error);
        return { success: false, error: error.message };
      } finally {
        this.isSoilTypesLoading = false;
      }
    },

    getSoilTypeName(soilTypeId) {
      if (!soilTypeId) return 'Not specified';
      const soilType = this.soilTypes.find((st) => st.$id === soilTypeId);
      return soilType?.name || 'Not specified';
    },

    // Crop management (Story 3.2)
    async fetchCrops(filters = {}) {
      this.isCropsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const queries = [Query.limit(100), Query.orderAsc('category'), Query.orderAsc('crop_name')];

        // Apply filters
        if (filters.category) {
          queries.push(Query.equal('category', filters.category));
        }
        if (filters.crop_type) {
          queries.push(Query.equal('crop_type', filters.crop_type));
        }
        if (filters.is_active !== undefined) {
          queries.push(Query.equal('is_active', filters.is_active));
        }

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'crops',
          queries,
        });
        this.crops = response.rows;
        this.cropsLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching crops:', error);
        return { success: false, error: error.message };
      } finally {
        this.isCropsLoading = false;
      }
    },

    async fetchCropById(cropId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.getRow({
          databaseId: dbId,
          tableId: 'crops',
          rowId: cropId,
        });
        return { success: true, data: response };
      } catch (error) {
        console.error('Error fetching crop:', error);
        return { success: false, error: error.message };
      }
    },

    async createCrop(cropData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'crops',
          rowId: ID.unique(),
          data: {
            ...cropData,
            is_active: true,
          },
        });
        // Add to local state
        this.crops.push(response);
        this.crops.sort((a, b) => a.crop_name.localeCompare(b.crop_name));
        return { success: true, data: response };
      } catch (error) {
        console.error('Error creating crop:', error);
        return { success: false, error: error.message };
      }
    },

    async updateCrop(cropId, cropData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'crops',
          rowId: cropId,
          data: cropData,
        });
        // Update local state
        const index = this.crops.findIndex((c) => c.$id === cropId);
        if (index !== -1) {
          this.crops[index] = response;
        }
        return { success: true, data: response };
      } catch (error) {
        console.error('Error updating crop:', error);
        return { success: false, error: error.message };
      }
    },

    async toggleCropActive(cropId, isActive) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'crops',
          rowId: cropId,
          data: { is_active: isActive },
        });
        // Update local state
        const index = this.crops.findIndex((c) => c.$id === cropId);
        if (index !== -1) {
          this.crops[index] = response;
        }
        return { success: true, data: response };
      } catch (error) {
        console.error('Error toggling crop active state:', error);
        return { success: false, error: error.message };
      }
    },

    // Planting management (Story 3.3-3.4)
    async fetchPlantings() {
      this.isPlantingsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'plantings',
          queries: [Query.limit(200), Query.orderDesc('planting_date')],
        });
        this.plantings = response.rows;
        this.plantingsLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching plantings:', error);
        return { success: false, error: error.message };
      } finally {
        this.isPlantingsLoading = false;
      }
    },

    async fetchPlantingsByPlot(plotId) {
      this.isPlantingsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'plantings',
          queries: [
            Query.equal('plot_id', plotId),
            Query.limit(100),
            Query.orderDesc('planting_date'),
          ],
        });
        // Merge with existing plantings to maintain cache
        const newPlantings = response.rows.filter(
          (p) => !this.plantings.some((existing) => existing.$id === p.$id),
        );
        this.plantings = [...this.plantings, ...newPlantings];
        this.plantingsLoaded = true; // Set the flag here too!
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching plantings by plot:', error);
        return { success: false, error: error.message };
      } finally {
        this.isPlantingsLoading = false;
      }
    },

    async fetchPlantingById(plantingId) {
      this.isPlantingsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.getRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: plantingId,
        });
        this.currentPlanting = response;
        return { success: true, data: response };
      } catch (error) {
        console.error('Error fetching planting:', error);
        return { success: false, error: error.message };
      } finally {
        this.isPlantingsLoading = false;
      }
    },

    async createPlanting(plantingData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: ID.unique(),
          data: {
            ...plantingData,
            status: plantingData.status || 'Planted',
          },
        });
        // Add to local state
        this.plantings.unshift(response);
        return { success: true, data: response };
      } catch (error) {
        console.error('Error creating planting:', error);
        return { success: false, error: error.message };
      }
    },

    async updatePlanting(plantingId, updateData) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: plantingId,
          data: updateData,
        });
        // Update local state
        const index = this.plantings.findIndex((p) => p.$id === plantingId);
        if (index !== -1) {
          this.plantings[index] = response;
        }
        if (this.currentPlanting?.$id === plantingId) {
          this.currentPlanting = response;
        }
        return { success: true, data: response };
      } catch (error) {
        console.error('Error updating planting:', error);
        return { success: false, error: error.message };
      }
    },

    async deletePlanting(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: plantingId,
        });
        // Remove from local state
        this.plantings = this.plantings.filter((p) => p.$id !== plantingId);
        if (this.currentPlanting?.$id === plantingId) {
          this.currentPlanting = null;
        }
        return { success: true };
      } catch (error) {
        console.error('Error deleting planting:', error);
        return { success: false, error: error.message };
      }
    },

    clearCurrentPlanting() {
      this.currentPlanting = null;
    },

    // Harvest management (Story 3.5-3.6)
    async fetchHarvests() {
      this.isHarvestsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [Query.limit(200), Query.orderDesc('harvest_date')],
        });
        this.harvests = response.rows;
        this.harvestsLoaded = true;
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching harvests:', error);
        return { success: false, error: error.message };
      } finally {
        this.isHarvestsLoading = false;
      }
    },

    // Dashboard stats
    async fetchStats() {
      try {
        // Fetch all necessary data in parallel
        await Promise.all([this.fetchPlots(), this.fetchPlantings()]);

        // Calculate stats
        this.stats.totalPlots = this.plots.length;
        this.stats.activePlantings = this.activePlantings.length;
        this.stats.readyForHarvest = this.readyForHarvest.length;

        // Monthly sales would come from finance module integration
        this.stats.monthlySales = 0; // Placeholder

        return { success: true, data: this.stats };
      } catch (error) {
        console.error('Error fetching farm stats:', error);
        return { success: false, error: error.message };
      }
    },

    // Set filters
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters };
    },

    clearFilters() {
      this.filters = {
        plotId: null,
        cropId: null,
        status: null,
        dateFrom: null,
        dateTo: null,
      };
    },
  },
});
