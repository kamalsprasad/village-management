// Farm Store - State management for farm operations
// Stories 3.1-3.9: Farm Management

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';
import { useInventoryStore } from 'src/stores/inventory-store';

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
        // if (state.filters.cropId && planting.crop_id !== state.filters.cropId) return false;
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

    // Harvest getters (Story 3.5)
    harvestsByPlanting: (state) => (plantingId) => {
      return state.harvests.filter((h) => {
        const hPlantingId = typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
        return hPlantingId === plantingId;
      });
    },

    inProgressHarvests: (state) => {
      return state.harvests.filter((h) => h.status === 'In Progress');
    },

    completedHarvests: (state) => {
      return state.harvests.filter((h) => h.status === 'Completed');
    },

    recentHarvests: (state) => {
      return state.harvests
        .filter((h) => h.status === 'Completed')
        .sort((a, b) => {
          // Sort by end date (final pick day) descending; fall back to start date
          const dateA = a.harvest_end_date || a.harvest_start_date;
          const dateB = b.harvest_end_date || b.harvest_start_date;
          return new Date(dateB) - new Date(dateA);
        })
        .slice(0, 5);
    },

    // Story 3.6: Continuous Picking getters
    // Get all completed harvests for a planting (for perennials with multiple harvests)
    completedHarvestsByPlanting: (state) => (plantingId) => {
      return state.harvests.filter((h) => {
        const hPlantingId = typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
        return hPlantingId === plantingId && h.status === 'Completed';
      });
    },

    // Check if a planting has multiple harvests (continuous picking)
    hasMultipleHarvests: (state) => (plantingId) => {
      const plantingHarvests = state.harvests.filter((h) => {
        const hPlantingId = typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
        return hPlantingId === plantingId;
      });
      return plantingHarvests.length > 1;
    },

    // Get active perennial plantings (in 'harvesting' status)
    activePerennialPlantings: (state) => {
      return state.plantings.filter((p) => {
        const isHarvesting = ['harvesting', 'Harvesting'].includes(p.status);
        if (!isHarvesting) return false;
        // Check if crop is perennial
        const crop = state.crops.find((c) => c.$id === p.crop_id);
        return crop?.crop_type === 'Perennial';
      });
    },

    // Get all active perennial plantings with their harvest stats
    activePerennialsWithStats: (state) => {
      return state.plantings
        .filter((p) => {
          const isHarvesting = ['harvesting', 'Harvesting'].includes(p.status);
          if (!isHarvesting) return false;
          const crop = state.crops.find((c) => c.$id === p.crop_id);
          return crop?.crop_type === 'Perennial';
        })
        .map((p) => {
          const crop = state.crops.find((c) => c.$id === p.crop_id);
          const harvests = state.harvests.filter((h) => {
            const hPlantingId =
              typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
            return hPlantingId === p.$id;
          });
          const completedHarvests = harvests.filter((h) => h.status === 'Completed');
          const inProgressHarvest = harvests.find((h) => h.status === 'In Progress');

          // Calculate stats
          const cumulativeYield = completedHarvests.reduce(
            (sum, h) => sum + (parseFloat(h.total_quantity_kg) || 0),
            0,
          );
          const harvestCount = completedHarvests.length;

          // Calculate days since last harvest
          let daysSinceLastHarvest = null;
          if (completedHarvests.length > 0) {
            const lastHarvest = completedHarvests.sort(
              (a, b) =>
                new Date(b.harvest_end_date || b.harvest_start_date) -
                new Date(a.harvest_end_date || a.harvest_start_date),
            )[0];
            const lastDate = new Date(
              lastHarvest.harvest_end_date || lastHarvest.harvest_start_date,
            );
            daysSinceLastHarvest = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
          }

          // Story 3.6: Centralized harvest readiness logic
          // - Ready: at/past frequency, within 7-day grace period, no in-progress harvest
          // - Overdue: more than 7 days past frequency, no in-progress harvest
          // - Plantings with an active in-progress harvest are NEITHER ready nor overdue
          const harvestFrequency = crop?.harvest_frequency_days || null;
          const OVERDUE_GRACE_DAYS = 7;
          const daysOverdue =
            harvestFrequency && daysSinceLastHarvest !== null
              ? daysSinceLastHarvest - harvestFrequency
              : null;
          const isReadyForHarvest =
            harvestFrequency &&
            daysOverdue !== null &&
            daysOverdue >= 0 &&
            daysOverdue <= OVERDUE_GRACE_DAYS &&
            !inProgressHarvest;
          const isOverdue =
            harvestFrequency &&
            daysOverdue !== null &&
            daysOverdue > OVERDUE_GRACE_DAYS &&
            !inProgressHarvest;

          return {
            planting: p,
            crop,
            harvestCount,
            cumulativeYield,
            daysSinceLastHarvest,
            harvestFrequency,
            isReadyForHarvest,
            isOverdue,
            hasInProgressHarvest: !!inProgressHarvest,
          };
        });
    },

    // Group active perennials by crop type for dashboard
    activePerennialsByCrop: (state) => {
      const perennials = state.plantings.filter((p) => {
        const isHarvesting = ['harvesting', 'Harvesting'].includes(p.status);
        if (!isHarvesting) return false;
        const crop = state.crops.find((c) => c.$id === p.crop_id);
        return crop?.crop_type === 'Perennial';
      });

      return perennials.reduce((acc, p) => {
        const crop = state.crops.find((c) => c.$id === p.crop_id);
        const cropName = crop?.crop_name || 'Unknown';
        acc[cropName] = (acc[cropName] || 0) + 1;
        return acc;
      }, {});
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
        // Replace or insert: update existing records and append new ones
        const fetchedIds = new Set(response.rows.map((p) => p.$id));
        const retained = this.plantings.filter((p) => !fetchedIds.has(p.$id));
        this.plantings = [...retained, ...response.rows];
        this.plantingsLoaded = true;
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
        const rowId = typeof plantingId === 'object' ? plantingId.$id : plantingId;
        const response = await tables.getRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: rowId,
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
            status: plantingData.status || 'planted',
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
        const rowId = typeof plantingId === 'object' ? plantingId.$id : plantingId;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'plantings',
          rowId: rowId,
          data: updateData,
        });
        // Update local state
        const index = this.plantings.findIndex((p) => p.$id === rowId);
        if (index !== -1) {
          this.plantings[index] = response;
        }
        if (this.currentPlanting?.$id === rowId) {
          this.currentPlanting = response;
        }
        return { success: true, data: response };
      } catch (error) {
        console.error('Error updating planting:', error);
        const isConflict =
          error.code === 409 || error.type?.includes('conflict') || error.response?.status === 409;
        return {
          success: false,
          error: isConflict
            ? 'This planting was recently updated. Please refresh and try again.'
            : error.message,
        };
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

    // Story 3.4: Status lifecycle management
    async updatePlantingStatus(
      plantingId,
      newStatus,
      { failureReason = null, additionalNotes = '' } = {},
    ) {
      const ALLOWED_TRANSITIONS = {
        planted: ['growing', 'failed', 'completed'],
        growing: ['harvesting', 'failed', 'completed'],
        harvesting: ['completed', 'failed'],
      };

      let current = this.plantings.find((p) => p.$id === plantingId) || this.currentPlanting;

      // If not found in local state, fetch from database
      if (!current) {
        const rowId = typeof plantingId === 'object' ? plantingId.$id : plantingId;
        const fetchResult = await this.fetchPlantingById(rowId);
        if (fetchResult.success) {
          current = fetchResult.data;
        }
      }

      const currentStatus = current?.status?.toLowerCase();
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

      // Allow 'completed' transition even if current status is undefined (data quality issue)
      if (!allowed.includes(newStatus) && !(newStatus === 'completed' && !currentStatus)) {
        return {
          success: false,
          error: `Invalid status transition: ${currentStatus} → ${newStatus}`,
        };
      }

      // Build updated notes with failure prefix if needed
      let updatedNotes = current?.notes || '';
      if (newStatus === 'failed' && failureReason) {
        const prefix = additionalNotes
          ? `[FAILURE: ${failureReason}] ${additionalNotes}`
          : `[FAILURE: ${failureReason}]`;
        updatedNotes = updatedNotes ? `${prefix}\n${updatedNotes}` : prefix;
      }

      const result = await this.updatePlanting(plantingId, {
        status: newStatus,
        notes: updatedNotes,
      });

      if (!result.success) return result;

      // Cascade plot status to Fallow if no other active plantings remain (best-effort)
      const plotId = current?.plot_id;
      if (plotId && ['completed', 'failed'].includes(newStatus)) {
        const otherActive = this.plantings.filter(
          (p) =>
            p.plot_id === plotId &&
            p.$id !== plantingId &&
            ['planted', 'growing', 'harvesting'].includes(p.status?.toLowerCase()),
        );
        if (otherActive.length === 0) {
          try {
            await this.updatePlot(plotId, { status: 'Fallow' });
          } catch (err) {
            console.error('Plot status cascade failed (non-blocking):', err);
          }
        }
      }

      return result;
    },

    // ---------------------------------------------------------------------------
    // Harvest management (Story 3.5 refactor — unified entry-based model)
    //
    // Business rules:
    //  - A harvest is a parent record composed of one or more harvest_entries.
    //  - Type ("Single Day" / "Multi-Day") is derived from entries.length, not stored.
    //  - Only one In Progress harvest is allowed per planting at a time.
    //  - Every entry upserts the aggregated farm-produce inventory row for the
    //    (planting, crop) tuple. Marking a harvest complete has NO inventory side-effect.
    //  - Entries are immutable. Deletion is allowed only if inventory still has
    //    enough quantity to reverse (no sales/transfers have consumed it).
    // ---------------------------------------------------------------------------

    async fetchHarvests() {
      this.isHarvestsLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [Query.limit(200), Query.orderDesc('$createdAt')],
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

    async fetchHarvestsByPlanting(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [
            Query.equal('planting_id', plantingId),
            Query.orderDesc('$createdAt'),
            Query.limit(50),
          ],
        });

        // Replace existing harvests for this planting in local state
        const otherHarvests = this.harvests.filter((h) => {
          const hPlantingId =
            typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
          return hPlantingId !== plantingId;
        });
        this.harvests = [...otherHarvests, ...response.rows];

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching harvests by planting:', error);
        return { success: false, error: error.message };
      }
    },

    async fetchHarvestById(harvestId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const harvestResponse = await tables.getRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: harvestId,
        });

        // Always fetch entries — every harvest is entry-based now
        const entriesResponse = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvest_entries',
          queries: [
            Query.equal('harvest_id', harvestId),
            Query.orderAsc('entry_date'),
            Query.limit(100),
          ],
        });

        const harvestWithEntries = {
          ...harvestResponse,
          entries: entriesResponse.rows,
        };

        const index = this.harvests.findIndex((h) => h.$id === harvestId);
        if (index !== -1) {
          this.harvests[index] = harvestWithEntries;
        } else {
          this.harvests.push(harvestWithEntries);
        }

        return { success: true, data: harvestWithEntries };
      } catch (error) {
        console.error('Error fetching harvest by ID:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Fetch entries for a given harvest without replacing the harvest record.
     * @param {string} harvestId
     */
    async fetchHarvestEntries(harvestId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvest_entries',
          queries: [
            Query.equal('harvest_id', harvestId),
            Query.orderAsc('entry_date'),
            Query.limit(200),
          ],
        });

        const index = this.harvests.findIndex((h) => h.$id === harvestId);
        if (index !== -1) {
          this.harvests[index] = { ...this.harvests[index], entries: response.rows };
        }

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching harvest entries:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Internal helper: resolve (planting, crop, plot) context for inventory operations.
     * Prefers cached store data; falls back to fresh fetches if missing.
     * Story 3.7: Extended to also fetch plot for naming convention.
     * @private
     */
    async _resolveHarvestContext(plantingId) {
      let planting = this.plantings.find((p) => p.$id === plantingId);
      if (!planting) {
        const res = await this.fetchPlantingById(plantingId);
        if (!res.success) return { success: false, error: res.error };
        planting = res.data;
      }

      let crop = this.crops.find((c) => c.$id === planting.crop_id);
      if (!crop) {
        if (!this.cropsLoaded) {
          await this.fetchCrops();
          crop = this.crops.find((c) => c.$id === planting.crop_id);
        }
      }
      if (!crop) {
        return { success: false, error: 'Crop not found for planting' };
      }

      // Story 3.7: Fetch plot for naming convention
      let plot = this.plots.find((p) => p.$id === planting.plot_id);
      if (!plot) {
        if (!this.plotsLoaded) {
          await this.fetchPlots();
          plot = this.plots.find((p) => p.$id === planting.plot_id);
        }
      }
      if (!plot) {
        return { success: false, error: 'Plot not found for planting' };
      }

      return { success: true, planting, crop, plot };
    },

    /**
     * Atomically create a harvest parent record with its first entry and the
     * aggregated farm-produce inventory row.
     *
     * Best-effort rollback: if any step after harvest creation fails, previously
     * created rows are deleted so no orphans remain.
     *
     * Story 3.6: Added support for continuous picking perennials.
     *
     * @param {string} plantingId
     * @param {Object} entryData - { entry_date, quantity_kg, farmhands_count, labor_cost,
     *                               other_costs, other_costs_notes, notes }
     * @param {Object} [options] - { harvestNotes?: string, isContinuousPicking?: boolean, harvestSequence?: number }
     */
    async createHarvestWithFirstEntry(plantingId, entryData, options = {}) {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const inventoryStore = useInventoryStore();

      // 1. Resolve planting + crop + plot context
      const ctx = await this._resolveHarvestContext(plantingId);
      if (!ctx.success) return { success: false, error: ctx.error };
      const { planting, crop, plot } = ctx;

      // 2. Defensive check: ensure no in-progress harvest already exists for this planting
      // Story 3.6: For continuous picking perennials, we allow multiple completed harvests
      // but still only one in-progress harvest at a time
      const existingInProgress = this.harvests.find((h) => {
        const hPlantingId = typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
        return hPlantingId === plantingId && h.status === 'In Progress';
      });
      if (existingInProgress) {
        return {
          success: false,
          error: 'An in-progress harvest already exists for this planting',
        };
      }

      const quantityKg = parseFloat(entryData.quantity_kg) || 0;
      const laborCost = parseFloat(entryData.labor_cost) || 0;
      const otherCosts = parseFloat(entryData.other_costs) || 0;

      // 3. Create harvest parent row
      // Story 3.6: Include continuous picking fields if provided
      let harvestRow;
      try {
        const harvestData = {
          planting_id: plantingId,
          harvest_start_date: entryData.entry_date,
          harvest_end_date: entryData.entry_date,
          total_quantity_kg: quantityKg,
          total_labor_cost: laborCost,
          total_other_costs: otherCosts,
          status: 'In Progress',
          notes: options.harvestNotes || null,
        };

        // Story 3.6: Add continuous picking fields for perennials
        if (options.isContinuousPicking) {
          harvestData.is_continuous_picking = true;
          harvestData.harvest_sequence = options.harvestSequence || 1;
        }

        harvestRow = await tables.createRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: ID.unique(),
          data: harvestData,
        });
      } catch (error) {
        console.error('Error creating harvest:', error);
        return { success: false, error: error.message };
      }

      // 4. Create first entry
      let entryRow;
      try {
        entryRow = await tables.createRow({
          databaseId: dbId,
          tableId: 'harvest_entries',
          rowId: ID.unique(),
          data: {
            harvest_id: harvestRow.$id,
            entry_date: entryData.entry_date,
            quantity_kg: quantityKg,
            farmhands_count: entryData.farmhands_count || null,
            labor_cost: laborCost,
            other_costs: otherCosts,
            other_costs_notes: entryData.other_costs_notes || null,
            notes: entryData.notes || null,
          },
        });
      } catch (error) {
        console.error('Error creating first entry, rolling back harvest:', error);
        await this._rollbackHarvestRow(harvestRow.$id);
        return { success: false, error: error.message };
      }

      // 5. Upsert inventory row
      const invResult = await inventoryStore.createOrUpdateFarmProduceFromHarvest({
        planting,
        crop,
        plot,
        entry: entryRow,
        harvestTotals: {
          total_quantity_kg: quantityKg,
          total_labor_cost: laborCost,
          total_other_costs: otherCosts,
        },
      });

      if (!invResult.success) {
        console.error('Inventory upsert failed, rolling back entry + harvest:', invResult.error);
        await this._rollbackEntryRow(entryRow.$id);
        await this._rollbackHarvestRow(harvestRow.$id);
        return {
          success: false,
          error: `Inventory update failed: ${invResult.error}. Harvest not created.`,
        };
      }

      // 6. Update local state
      const harvestWithEntries = { ...harvestRow, entries: [entryRow] };
      this.harvests.unshift(harvestWithEntries);

      return { success: true, data: harvestWithEntries };
    },

    async _rollbackHarvestRow(harvestId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({ databaseId: dbId, tableId: 'harvests', rowId: harvestId });
      } catch (e) {
        console.error('Rollback of harvest row failed:', e.message);
      }
    },

    async _rollbackEntryRow(entryId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({ databaseId: dbId, tableId: 'harvest_entries', rowId: entryId });
      } catch (e) {
        console.error('Rollback of entry row failed:', e.message);
      }
    },

    /**
     * Add a subsequent entry to an existing in-progress harvest.
     * Updates harvest totals, extends end_date if needed, and upserts inventory.
     *
     * @param {string} harvestId
     * @param {Object} entryData
     */
    async addHarvestEntry(harvestId, entryData) {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const inventoryStore = useInventoryStore();

      const harvest = this.harvests.find((h) => h.$id === harvestId);
      if (!harvest) return { success: false, error: 'Harvest not found in local state' };
      if (harvest.status !== 'In Progress') {
        return { success: false, error: 'Cannot add entries to a completed harvest' };
      }

      const ctx = await this._resolveHarvestContext(harvest.planting_id);
      if (!ctx.success) return { success: false, error: ctx.error };
      const { planting, crop, plot } = ctx;

      // 1. Create the entry
      let entryRow;
      try {
        entryRow = await tables.createRow({
          databaseId: dbId,
          tableId: 'harvest_entries',
          rowId: ID.unique(),
          data: {
            harvest_id: harvestId,
            entry_date: entryData.entry_date,
            quantity_kg: parseFloat(entryData.quantity_kg) || 0,
            farmhands_count: entryData.farmhands_count || null,
            labor_cost: parseFloat(entryData.labor_cost) || 0,
            other_costs: parseFloat(entryData.other_costs) || 0,
            other_costs_notes: entryData.other_costs_notes || null,
            notes: entryData.notes || null,
          },
        });
      } catch (error) {
        console.error('Error creating harvest entry:', error);
        return { success: false, error: error.message };
      }

      // 2. Fetch all entries to recompute totals
      const entriesResponse = await tables.listRows({
        databaseId: dbId,
        tableId: 'harvest_entries',
        queries: [Query.equal('harvest_id', harvestId), Query.limit(200)],
      });
      const entries = entriesResponse.rows;

      const totals = this._computeHarvestTotals(entries);
      const newEndDate = entries.reduce((max, e) => {
        const t = new Date(e.entry_date).getTime();
        return t > max ? t : max;
      }, 0);
      const newStartDate = entries.reduce((min, e) => {
        const t = new Date(e.entry_date).getTime();
        return t < min || min === 0 ? t : min;
      }, 0);

      // 3. Update harvest with new totals and date range
      let harvestUpdate;
      try {
        harvestUpdate = await tables.updateRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: harvestId,
          data: {
            total_quantity_kg: totals.total_quantity_kg,
            total_labor_cost: totals.total_labor_cost,
            total_other_costs: totals.total_other_costs,
            harvest_start_date: new Date(newStartDate).toISOString(),
            harvest_end_date: new Date(newEndDate).toISOString(),
          },
        });
      } catch (error) {
        console.error('Failed to update harvest totals, rolling back entry:', error);
        await this._rollbackEntryRow(entryRow.$id);
        return { success: false, error: error.message };
      }

      // 4. Upsert inventory
      const invResult = await inventoryStore.createOrUpdateFarmProduceFromHarvest({
        planting,
        crop,
        plot,
        entry: entryRow,
        harvestTotals: totals,
      });

      if (!invResult.success) {
        // Roll back entry + re-sync harvest totals to pre-entry state
        console.error('Inventory upsert failed, rolling back entry:', invResult.error);
        await this._rollbackEntryRow(entryRow.$id);
        const priorEntries = entries.filter((e) => e.$id !== entryRow.$id);
        const priorTotals = this._computeHarvestTotals(priorEntries);
        try {
          await tables.updateRow({
            databaseId: dbId,
            tableId: 'harvests',
            rowId: harvestId,
            data: {
              total_quantity_kg: priorTotals.total_quantity_kg,
              total_labor_cost: priorTotals.total_labor_cost,
              total_other_costs: priorTotals.total_other_costs,
            },
          });
        } catch (e) {
          console.error('Rollback of harvest totals failed; data may be inconsistent:', e.message);
        }
        return { success: false, error: `Inventory update failed: ${invResult.error}` };
      }

      // 5. Update local state
      const harvestIndex = this.harvests.findIndex((h) => h.$id === harvestId);
      if (harvestIndex !== -1) {
        this.harvests[harvestIndex] = {
          ...this.harvests[harvestIndex],
          ...harvestUpdate,
          entries,
        };
      }

      return { success: true, data: { entry: entryRow, harvest: harvestUpdate, entries } };
    },

    /**
     * Delete an individual harvest entry.
     * Blocked if inventory does not have enough quantity remaining to reverse
     * (meaning produce has already been sold or transferred).
     *
     * @param {string} harvestId
     * @param {string} entryId
     */
    async deleteHarvestEntry(harvestId, entryId) {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const inventoryStore = useInventoryStore();

      const harvest = this.harvests.find((h) => h.$id === harvestId);
      if (!harvest) return { success: false, error: 'Harvest not found' };
      if (harvest.status !== 'In Progress') {
        return { success: false, error: 'Cannot delete entries from a completed harvest' };
      }

      const ctx = await this._resolveHarvestContext(harvest.planting_id);
      if (!ctx.success) return { success: false, error: ctx.error };
      const { planting, crop, plot } = ctx;

      // Fetch current entries to locate the one being deleted and compute updated totals
      const entriesResponse = await tables.listRows({
        databaseId: dbId,
        tableId: 'harvest_entries',
        queries: [Query.equal('harvest_id', harvestId), Query.limit(200)],
      });
      const entries = entriesResponse.rows;
      const entry = entries.find((e) => e.$id === entryId);
      if (!entry) return { success: false, error: 'Entry not found' };

      if (entries.length <= 1) {
        return {
          success: false,
          error: 'Cannot delete the only entry of a harvest. Delete the entire harvest instead.',
        };
      }

      const remainingEntries = entries.filter((e) => e.$id !== entryId);
      const updatedTotals = this._computeHarvestTotals(remainingEntries);

      // 1. Check inventory reversibility and perform reversal FIRST.
      //    If we deleted the entry first and reversal failed, we'd be in an inconsistent state.
      const reverseResult = await inventoryStore.reverseFarmProduceFromHarvest({
        planting,
        crop,
        entry,
        updatedHarvestTotals: updatedTotals,
      });

      if (!reverseResult.success) {
        return { success: false, error: reverseResult.error, reason: reverseResult.reason };
      }

      // 2. Delete the entry row
      try {
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'harvest_entries',
          rowId: entryId,
        });
      } catch (error) {
        // Try to re-apply inventory (best-effort) since entry delete failed
        console.error(
          'Entry delete failed after inventory reversal; re-applying inventory:',
          error,
        );
        await inventoryStore.createOrUpdateFarmProduceFromHarvest({
          planting,
          crop,
          plot,
          entry,
          harvestTotals: this._computeHarvestTotals(entries),
        });
        return { success: false, error: error.message };
      }

      // 3. Update harvest totals + dates
      const newEndDate = remainingEntries.length
        ? new Date(
            remainingEntries.reduce((max, e) => Math.max(max, new Date(e.entry_date).getTime()), 0),
          ).toISOString()
        : null;
      const newStartDate = remainingEntries.length
        ? new Date(
            remainingEntries.reduce((min, e) => {
              const t = new Date(e.entry_date).getTime();
              return min === 0 || t < min ? t : min;
            }, 0),
          ).toISOString()
        : null;

      let harvestUpdate;
      try {
        harvestUpdate = await tables.updateRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: harvestId,
          data: {
            total_quantity_kg: updatedTotals.total_quantity_kg,
            total_labor_cost: updatedTotals.total_labor_cost,
            total_other_costs: updatedTotals.total_other_costs,
            harvest_start_date: newStartDate,
            harvest_end_date: newEndDate,
          },
        });
      } catch (error) {
        console.error('Failed to update harvest totals after entry delete:', error);
        // Non-fatal: totals can be re-synced; surface a warning.
        return {
          success: true,
          data: { entries: remainingEntries },
          warning: 'Entry deleted but harvest totals may be stale until next refresh',
        };
      }

      const harvestIndex = this.harvests.findIndex((h) => h.$id === harvestId);
      if (harvestIndex !== -1) {
        this.harvests[harvestIndex] = {
          ...this.harvests[harvestIndex],
          ...harvestUpdate,
          entries: remainingEntries,
        };
      }

      return { success: true, data: { entries: remainingEntries, harvest: harvestUpdate } };
    },

    _computeHarvestTotals(entries = []) {
      return entries.reduce(
        (acc, e) => {
          acc.total_quantity_kg += parseFloat(e.quantity_kg) || 0;
          acc.total_labor_cost += parseFloat(e.labor_cost) || 0;
          acc.total_other_costs += parseFloat(e.other_costs) || 0;
          return acc;
        },
        { total_quantity_kg: 0, total_labor_cost: 0, total_other_costs: 0 },
      );
    },

    async markHarvestComplete(harvestId, { isContinuousPicking = false } = {}) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        const harvest = this.harvests.find((h) => h.$id === harvestId);
        if (!harvest) {
          return { success: false, error: 'Harvest not found' };
        }

        // Story 3.6: Check if this is a continuous picking harvest for a perennial
        const shouldKeepPlantingActive = isContinuousPicking || harvest.is_continuous_picking;

        const harvestUpdate = await tables.updateRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: harvestId,
          data: { status: 'Completed' },
        });

        const harvestIndex = this.harvests.findIndex((h) => h.$id === harvestId);
        if (harvestIndex !== -1) {
          this.harvests[harvestIndex] = { ...this.harvests[harvestIndex], ...harvestUpdate };
        }

        // Story 3.6: Only transition planting to 'completed' for annuals
        // Perennials with continuous picking stay in 'harvesting' status
        if (!shouldKeepPlantingActive) {
          const plantingResult = await this.updatePlantingStatus(harvest.planting_id, 'completed');
          if (!plantingResult.success) {
            console.warn('Failed to update planting status to completed:', plantingResult.error);
            return {
              success: true,
              data: harvestUpdate,
              warning: `Harvest marked complete, but planting status update failed: ${plantingResult.error}. Please refresh and update manually.`,
            };
          }
        }

        return {
          success: true,
          data: harvestUpdate,
          isContinuousPicking: shouldKeepPlantingActive,
        };
      } catch (error) {
        console.error('Error marking harvest complete:', error);
        return { success: false, error: error.message };
      }
    },

    // ==========================================================================
    // Story 3.6: Continuous Picking Harvests for Perennials
    // ==========================================================================

    /**
     * Get the next harvest sequence number for a planting.
     * Used for perennial crops with continuous picking.
     * @param {string} plantingId
     * @returns {Promise<number>} Next sequence number (1-based)
     */
    async getNextHarvestSequence(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [
            Query.equal('planting_id', plantingId),
            Query.limit(100),
            Query.orderDesc('harvest_sequence'),
          ],
        });

        const harvests = response.rows || [];
        const maxSequence = harvests.reduce((max, h) => {
          const seq = parseInt(h.harvest_sequence, 10);
          return seq > max ? seq : max;
        }, 0);

        return maxSequence + 1;
      } catch (error) {
        console.error('Error getting next harvest sequence:', error);
        return 1; // Default to 1 on error
      }
    },

    /**
     * Get comprehensive harvest statistics for a perennial planting.
     * @param {string} plantingId
     * @returns {Promise<Object>} Harvest stats including cumulative yield, frequency, etc.
     */
    async getPerennialHarvestStats(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'harvests',
          queries: [
            Query.equal('planting_id', plantingId),
            Query.equal('status', 'Completed'),
            Query.limit(100),
            Query.orderAsc('harvest_start_date'),
          ],
        });

        const harvests = response.rows || [];
        if (harvests.length === 0) {
          return {
            cumulativeYield: 0,
            averageYield: 0,
            harvestCount: 0,
            averageFrequencyDays: null,
            lastHarvestDate: null,
            cumulativeLaborCost: 0,
            cumulativeOtherCosts: 0,
          };
        }

        // Calculate cumulative and average metrics
        const cumulativeYield = harvests.reduce(
          (sum, h) => sum + (parseFloat(h.total_quantity_kg) || 0),
          0,
        );
        const cumulativeLaborCost = harvests.reduce(
          (sum, h) => sum + (parseFloat(h.total_labor_cost) || 0),
          0,
        );
        const cumulativeOtherCosts = harvests.reduce(
          (sum, h) => sum + (parseFloat(h.total_other_costs) || 0),
          0,
        );

        // Calculate average frequency between harvests
        let averageFrequencyDays = null;
        if (harvests.length > 1) {
          const intervals = [];
          for (let i = 1; i < harvests.length; i++) {
            const prevDate = new Date(
              harvests[i - 1].harvest_start_date || harvests[i - 1].harvest_end_date,
            );
            const currDate = new Date(
              harvests[i].harvest_start_date || harvests[i].harvest_end_date,
            );
            const daysDiff = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
            if (daysDiff > 0) intervals.push(daysDiff);
          }
          if (intervals.length > 0) {
            averageFrequencyDays = Math.round(
              intervals.reduce((a, b) => a + b, 0) / intervals.length,
            );
          }
        }

        const lastHarvest = harvests[harvests.length - 1];
        const lastHarvestDate = lastHarvest.harvest_end_date || lastHarvest.harvest_start_date;

        return {
          cumulativeYield,
          averageYield: cumulativeYield / harvests.length,
          harvestCount: harvests.length,
          averageFrequencyDays,
          lastHarvestDate,
          cumulativeLaborCost,
          cumulativeOtherCosts,
          harvests,
        };
      } catch (error) {
        console.error('Error getting perennial harvest stats:', error);
        return {
          cumulativeYield: 0,
          averageYield: 0,
          harvestCount: 0,
          averageFrequencyDays: null,
          lastHarvestDate: null,
          cumulativeLaborCost: 0,
          cumulativeOtherCosts: 0,
          error: error.message,
        };
      }
    },

    /**
     * Finalize a perennial planting (mark as completed).
     * Also marks any in-progress harvest as completed.
     * @param {string} plantingId
     */
    async finalizePerennialPlanting(plantingId) {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Find and complete any in-progress harvest for this planting
        const plantingHarvests = this.harvests.filter((h) => {
          const hPlantingId =
            typeof h.planting_id === 'object' ? h.planting_id?.$id : h.planting_id;
          return hPlantingId === plantingId && h.status === 'In Progress';
        });

        for (const harvest of plantingHarvests) {
          await tables.updateRow({
            databaseId: dbId,
            tableId: 'harvests',
            rowId: harvest.$id,
            data: { status: 'Completed' },
          });

          const harvestIndex = this.harvests.findIndex((h) => h.$id === harvest.$id);
          if (harvestIndex !== -1) {
            this.harvests[harvestIndex] = { ...this.harvests[harvestIndex], status: 'Completed' };
          }
        }

        // Transition planting to 'completed'
        const result = await this.updatePlantingStatus(plantingId, 'completed');
        return result;
      } catch (error) {
        console.error('Error finalizing perennial planting:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Delete an in-progress harvest and all its entries.
     * Blocked if the aggregated inventory row has been partially consumed
     * (cannot fully reverse produce that has been sold).
     *
     * @param {string} harvestId
     */
    async deleteHarvest(harvestId) {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const inventoryStore = useInventoryStore();

      const harvest = this.harvests.find((h) => h.$id === harvestId);
      if (!harvest) return { success: false, error: 'Harvest not found' };
      if (harvest.status !== 'In Progress') {
        return {
          success: false,
          error: 'Only In Progress harvests can be deleted',
        };
      }

      const ctx = await this._resolveHarvestContext(harvest.planting_id);
      if (!ctx.success) return { success: false, error: ctx.error };
      const { planting } = ctx;

      // 1. Reverse inventory first (via inventory store). This is a best-effort
      //    approach: if entry deletion fails later, inventory will be out of sync
      //    until the page is refreshed. Fail-fast if inventory is not reversible.
      const invResult = await inventoryStore.deleteFarmProduceForHarvest(harvest, planting);
      if (!invResult.success) {
        return invResult; // passes through reason:'insufficient' and error message
      }

      // 2. Fetch all entries (authoritative source — don't trust cached state)
      const entriesResponse = await tables.listRows({
        databaseId: dbId,
        tableId: 'harvest_entries',
        queries: [Query.equal('harvest_id', harvestId), Query.limit(200)],
      });
      const entries = entriesResponse.rows;

      // 3. Delete each entry (manual cascade — works regardless of schema-level cascade)
      for (const entry of entries) {
        try {
          await tables.deleteRow({
            databaseId: dbId,
            tableId: 'harvest_entries',
            rowId: entry.$id,
          });
        } catch (error) {
          console.error(`Failed to delete entry ${entry.$id}:`, error);
          return {
            success: false,
            error: `Failed to delete entry ${entry.$id}: ${error.message}`,
          };
        }
      }

      // 4. Delete the harvest row itself
      try {
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'harvests',
          rowId: harvestId,
        });
      } catch (error) {
        console.error('Error deleting harvest row:', error);
        return { success: false, error: error.message };
      }

      // 6. Update local state
      this.harvests = this.harvests.filter((h) => h.$id !== harvestId);

      return { success: true, data: { deletedEntryCount: entries.length } };
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
