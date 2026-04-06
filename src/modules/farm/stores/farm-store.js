// Farm Store - State management for farm operations
// Stories 3.1-3.9: Farm Management

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

export const useFarmStore = defineStore('farm', {
  state: () => ({
    // Plots (Story 3.1)
    plots: [],
    plotsLoaded: false,
    isPlotsLoading: false,

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
      monthlySales: 0
    },

    // Filters
    filters: {
      plotId: null,
      cropId: null,
      status: null,
      dateFrom: null,
      dateTo: null
    }
  }),

  getters: {
    // Plot getters (Story 3.1)
    activePlots: (state) => state.plots.filter(p => p.status === 'Active'),
    plotsByStatus: (state) => {
      return state.plots.reduce((acc, plot) => {
        acc[plot.status] = (acc[plot.status] || 0) + 1;
        return acc;
      }, {});
    },

    // Crop getters (Story 3.2)
    activeCrops: (state) => state.crops.filter(c => c.is_active !== false),
    cropsByCategory: (state) => {
      return state.crops.reduce((acc, crop) => {
        acc[crop.category] = acc[crop.category] || [];
        acc[crop.category].push(crop);
        return acc;
      }, {});
    },

    // Planting getters (Story 3.3-3.4)
    plantingsByPlot: (state) => {
      return state.plantings.reduce((acc, planting) => {
        acc[planting.plot_id] = acc[planting.plot_id] || [];
        acc[planting.plot_id].push(planting);
        return acc;
      }, {});
    },
    activePlantings: (state) => state.plantings.filter(p =>
      ['planted', 'growing', 'harvesting'].includes(p.status)
    ),
    readyForHarvest: (state) => state.plantings.filter(p => {
      if (p.status !== 'growing') return false;
      const expectedDate = new Date(p.expected_harvest_date);
      const today = new Date();
      const daysDiff = Math.ceil((expectedDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7; // Ready within 7 days
    }),

    // Filtered plantings
    filteredPlantings: (state) => {
      return state.plantings.filter(planting => {
        if (state.filters.plotId && planting.plot_id !== state.filters.plotId) return false;
        if (state.filters.cropId && planting.crop_id !== state.filters.cropId) return false;
        if (state.filters.status && planting.status !== state.filters.status) return false;
        // Date filtering logic can be added here
        return true;
      });
    }
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
          queries: [Query.limit(100), Query.orderAsc('name')]
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

    // Crop management (Story 3.2)
    async fetchCrops() {
      this.isCropsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'crops',
          queries: [Query.limit(100), Query.orderAsc('category'), Query.orderAsc('crop_name')]
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

    // Planting management (Story 3.3-3.4)
    async fetchPlantings() {
      this.isPlantingsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'plantings',
          queries: [Query.limit(200), Query.orderDesc('planting_date')]
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

    // Harvest management (Story 3.5-3.6)
    async fetchHarvests() {
      this.isHarvestsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [Query.limit(200), Query.orderDesc('harvest_date')]
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
        await Promise.all([
          this.fetchPlots(),
          this.fetchPlantings()
        ]);

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
        dateTo: null
      };
    }
  }
});
