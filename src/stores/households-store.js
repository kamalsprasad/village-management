import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

export const useHouseholdsStore = defineStore('households', {
  state: () => ({
    households: [],
    currentHousehold: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      total: 0,
    },
  }),

  getters: {
    /**
     * Get paginated households for current page
     */
    paginatedHouseholds: (state) => state.households,

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
  },

  actions: {
    /**
     * Fetch households with pagination
     * @param {number} page - Page number (1-indexed)
     * @param {number} limit - Items per page (10, 25, 50, 100)
     */
    async fetchHouseholds(page = 1, limit = 10) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS;

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Fetch households with pagination
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: householdsCollectionId,
          queries: [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')],
        });

        this.households = response.rows;
        this.pagination.currentPage = page;
        this.pagination.itemsPerPage = limit;
        this.pagination.total = response.total;

        // Fetch occupant counts for each household
        await this.enrichHouseholdsWithOccupantCounts();

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching households:', error);
        errorHandler.notifyError('Failed to load households. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Enrich households with occupant counts by querying residents table
     */
    async enrichHouseholdsWithOccupantCounts() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;

        // For each household, count residents
        const enrichedHouseholds = await Promise.all(
          this.households.map(async (household) => {
            try {
              const residentsResponse = await tables.listRows({
                databaseId: dbId,
                tableId: residentsCollectionId,
                queries: [Query.equal('household_id', household.$id), Query.limit(1)],
              });

              return {
                ...household,
                occupant_count: residentsResponse.total,
              };
            } catch (error) {
              console.error(`Error counting occupants for household ${household.$id}:`, error);
              return {
                ...household,
                occupant_count: 0,
              };
            }
          }),
        );

        this.households = enrichedHouseholds;
      } catch (error) {
        console.error('Error enriching households with occupant counts:', error);
      }
    },

    /**
     * Fetch a single household by ID
     * @param {string} householdId - Household document ID
     */
    async fetchHouseholdById(householdId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS;

        const household = await tables.getRow({
          databaseId: dbId,
          tableId: householdsCollectionId,
          rowId: householdId,
        });

        // Fetch occupant count
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
        const residentsResponse = await tables.listRows({
          databaseId: dbId,
          tableId: residentsCollectionId,
          queries: [Query.equal('household_id', householdId)],
        });

        this.currentHousehold = {
          ...household,
          occupant_count: residentsResponse.total,
          occupants: residentsResponse.rows,
        };

        return { success: true, data: this.currentHousehold };
      } catch (error) {
        console.error('Error fetching household:', error);
        errorHandler.notifyError('Failed to load household details. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new household
     * @param {Object} householdData - Household data
     */
    async createHousehold(householdData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS;

        const householdId = ID.unique();
        const now = new Date().toISOString();

        const newHousehold = await tables.createRow({
          databaseId: dbId,
          tableId: householdsCollectionId,
          rowId: householdId,
          data: {
            name: householdData.name,
            household_type: householdData.household_type,
            construction_date: householdData.construction_date || null,
            bedrooms: householdData.bedrooms || 0,
            bathrooms: householdData.bathrooms || 0,
            notes: householdData.notes || '',
            head_resident_id: householdData.head_resident_id || null,
            $createdAt: now,
            $updatedAt: now,
          },
        });

        // Refresh the current page to include new household
        await this.fetchHouseholds(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Household created successfully');
        return { success: true, data: newHousehold };
      } catch (error) {
        console.error('Error creating household:', error);
        errorHandler.notifyError('Failed to create household. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing household
     * @param {string} householdId - Household document ID
     * @param {Object} householdData - Updated household data
     */
    async updateHousehold(householdId, householdData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS;

        const updatedHousehold = await tables.updateRow({
          databaseId: dbId,
          tableId: householdsCollectionId,
          rowId: householdId,
          data: {
            name: householdData.name,
            household_type: householdData.household_type,
            construction_date: householdData.construction_date || null,
            bedrooms: householdData.bedrooms || 0,
            bathrooms: householdData.bathrooms || 0,
            notes: householdData.notes || '',
            head_resident_id: householdData.head_resident_id || null,
            $updatedAt: new Date().toISOString(),
          },
        });

        // Refresh the current page
        await this.fetchHouseholds(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentHousehold if it's the one being edited
        if (this.currentHousehold && this.currentHousehold.$id === householdId) {
          this.currentHousehold = { ...this.currentHousehold, ...updatedHousehold };
        }

        errorHandler.notifySuccess('Household updated successfully');
        return { success: true, data: updatedHousehold };
      } catch (error) {
        console.error('Error updating household:', error);
        errorHandler.notifyError('Failed to update household. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a household (only if no occupants)
     * @param {string} householdId - Household document ID
     */
    async deleteHousehold(householdId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;

        // Check if household has occupants (AC7)
        const residentsResponse = await tables.listRows({
          databaseId: dbId,
          tableId: residentsCollectionId,
          queries: [Query.equal('household_id', householdId), Query.limit(1)],
        });

        if (residentsResponse.total > 0) {
          errorHandler.notifyError(
            `Cannot delete household. It has ${residentsResponse.total} occupant(s). Please reassign or remove residents first.`,
          );
          return {
            success: false,
            error: 'Household has occupants',
            occupantCount: residentsResponse.total,
          };
        }

        // Delete household
        await tables.deleteRow({
          databaseId: dbId,
          tableId: householdsCollectionId,
          rowId: householdId,
        });

        // Refresh the current page
        await this.fetchHouseholds(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Household deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting household:', error);
        errorHandler.notifyError('Failed to delete household. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
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
      await this.fetchHouseholds(page, this.pagination.itemsPerPage);
    },

    /**
     * Change items per page
     * @param {number} itemsPerPage - Number of items per page (10, 25, 50, 100)
     */
    async changeItemsPerPage(itemsPerPage) {
      // Reset to page 1 when changing items per page
      await this.fetchHouseholds(1, itemsPerPage);
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
     * Clear current household
     */
    clearCurrentHousehold() {
      this.currentHousehold = null;
    },
  },
});
