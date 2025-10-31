import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';
import { useHouseholdsStore } from './households-store';

const errorHandler = useErrorHandler();

export const useResidentsStore = defineStore('residents', {
  state: () => ({
    residents: [],
    currentResident: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      total: 0,
    },
    filters: {
      searchName: '',
      householdId: null,
    },
  }),

  getters: {
    /**
     * Get paginated residents for current page
     */
    paginatedResidents: (state) => state.residents,

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
     * Get full name for a resident
     */
    getFullName: () => (resident) => {
      const parts = [resident.first_name];
      if (resident.middle_names) {
        parts.push(resident.middle_names);
      }
      parts.push(resident.last_name);
      return parts.join(' ');
    },
  },

  actions: {
    /**
     * Build query array based on current filters
     */
    buildQueries(limit, offset) {
      const queries = [Query.limit(limit), Query.offset(offset), Query.orderDesc('$createdAt')];

      // Add name search filter (searches first_name and last_name)
      if (this.filters.searchName) {
        const searchTerm = this.filters.searchName.trim();
        // Note: Appwrite doesn't support OR queries directly, so we'll filter client-side after fetch
        // For now, we'll search by first_name
        queries.push(Query.search('first_name', searchTerm));
      }

      // Add household filter
      if (this.filters.householdId) {
        queries.push(Query.equal('household_id', this.filters.householdId));
      }

      return queries;
    },

    /**
     * Fetch residents with pagination and filters
     * @param {number} page - Page number (1-indexed)
     * @param {number} limit - Items per page (10, 25, 50, 100)
     */
    async fetchResidents(page = 1, limit = 10) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_RESIDENTS;

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build queries with filters
        const queries = this.buildQueries(limit, offset);

        // Fetch residents with pagination and filters
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: residentsCollectionId,
          queries,
        });

        this.residents = response.rows;
        this.pagination.currentPage = page;
        this.pagination.itemsPerPage = limit;
        this.pagination.total = response.total;

        // Enrich with household names
        await this.enrichResidentsWithHouseholdNames();

        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching residents:', error);
        errorHandler.notifyError('Failed to load residents. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Enrich residents with household names by querying households table
     */
    async enrichResidentsWithHouseholdNames() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_HOUSEHOLDS;

        // Get unique household IDs
        const householdIds = [...new Set(this.residents.map((r) => r.household_id).filter(Boolean))];

        if (householdIds.length === 0) {
          return;
        }

        // Fetch households in batch
        const householdsResponse = await tables.listRows({
          databaseId: dbId,
          tableId: householdsCollectionId,
          queries: [Query.equal('$id', householdIds), Query.limit(100)],
        });

        // Create household lookup map
        const householdMap = {};
        householdsResponse.rows.forEach((household) => {
          householdMap[household.$id] = household;
        });

        // Enrich residents with household data
        this.residents = this.residents.map((resident) => ({
          ...resident,
          household: resident.household_id ? householdMap[resident.household_id] : null,
        }));
      } catch (error) {
        console.error('Error enriching residents with household names:', error);
      }
    },

    /**
     * Fetch a single resident by ID
     * @param {string} residentId - Resident document ID
     */
    async fetchResidentById(residentId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_RESIDENTS;

        const resident = await tables.getRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
        });

        // Fetch household details
        if (resident.household_id) {
          const householdsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_HOUSEHOLDS;
          const household = await tables.getRow({
            databaseId: dbId,
            tableId: householdsCollectionId,
            rowId: resident.household_id,
          });

          this.currentResident = {
            ...resident,
            household,
          };
        } else {
          this.currentResident = resident;
        }

        return { success: true, data: this.currentResident };
      } catch (error) {
        console.error('Error fetching resident:', error);
        errorHandler.notifyError('Failed to load resident details. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new resident
     * @param {Object} residentData - Resident data
     */
    async createResident(residentData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_RESIDENTS;

        const residentId = ID.unique();
        const now = new Date().toISOString();

        const newResident = await tables.createRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
          data: {
            first_name: residentData.first_name,
            middle_names: residentData.middle_names || '',
            last_name: residentData.last_name,
            dob: residentData.dob,
            gender: residentData.gender,
            household_id: residentData.household_id,
            room_number: residentData.room_number || '',
            phone: residentData.phone || '',
            email: residentData.email || '',
            notes: residentData.notes || '',
            $createdAt: now,
            $updatedAt: now,
          },
        });

        // Update household occupant count (AC5, AC9)
        await this.syncHouseholdOccupants(residentData.household_id);

        // Refresh the current page to include new resident
        await this.fetchResidents(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Resident created successfully');
        return { success: true, data: newResident };
      } catch (error) {
        console.error('Error creating resident:', error);
        errorHandler.notifyError('Failed to create resident. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing resident
     * @param {string} residentId - Resident document ID
     * @param {Object} residentData - Updated resident data
     */
    async updateResident(residentId, residentData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_RESIDENTS;

        // Get current resident to check if household changed
        const currentResident = await tables.getRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
        });

        const oldHouseholdId = currentResident.household_id;
        const newHouseholdId = residentData.household_id;

        const updatedResident = await tables.updateRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
          data: {
            first_name: residentData.first_name,
            middle_names: residentData.middle_names || '',
            last_name: residentData.last_name,
            dob: residentData.dob,
            gender: residentData.gender,
            household_id: residentData.household_id,
            room_number: residentData.room_number || '',
            phone: residentData.phone || '',
            email: residentData.email || '',
            notes: residentData.notes || '',
            $updatedAt: new Date().toISOString(),
          },
        });

        // Update household occupant counts if household changed (AC7, AC9)
        if (oldHouseholdId !== newHouseholdId) {
          await this.syncHouseholdOccupants(oldHouseholdId);
          await this.syncHouseholdOccupants(newHouseholdId);
        }

        // Refresh the current page
        await this.fetchResidents(this.pagination.currentPage, this.pagination.itemsPerPage);

        // Update currentResident if it's the one being edited
        if (this.currentResident && this.currentResident.$id === residentId) {
          this.currentResident = { ...this.currentResident, ...updatedResident };
        }

        errorHandler.notifySuccess('Resident updated successfully');
        return { success: true, data: updatedResident };
      } catch (error) {
        console.error('Error updating resident:', error);
        errorHandler.notifyError('Failed to update resident. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a resident (with household head check)
     * @param {string} residentId - Resident document ID
     */
    async deleteResident(residentId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const residentsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_RESIDENTS;
        const householdsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_HOUSEHOLDS;

        // Get resident to check household
        const resident = await tables.getRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
        });

        // Check if resident is the sole household head (AC8)
        if (resident.household_id) {
          const household = await tables.getRow({
            databaseId: dbId,
            tableId: householdsCollectionId,
            rowId: resident.household_id,
          });

          if (household.head_resident_id === residentId) {
            // Count other residents in household
            const otherResidentsResponse = await tables.listRows({
              databaseId: dbId,
              tableId: residentsCollectionId,
              queries: [
                Query.equal('household_id', resident.household_id),
                Query.notEqual('$id', residentId),
                Query.limit(1),
              ],
            });

            if (otherResidentsResponse.total === 0) {
              errorHandler.notifyError(
                'Cannot delete resident. This resident is the sole household head. Please reassign the household head first.',
              );
              return {
                success: false,
                error: 'Resident is sole household head',
              };
            }
          }
        }

        const householdId = resident.household_id;

        // Delete resident
        await tables.deleteRow({
          databaseId: dbId,
          tableId: residentsCollectionId,
          rowId: residentId,
        });

        // Update household occupant count (AC8, AC9)
        if (householdId) {
          await this.syncHouseholdOccupants(householdId);
        }

        // Refresh the current page
        await this.fetchResidents(this.pagination.currentPage, this.pagination.itemsPerPage);

        errorHandler.notifySuccess('Resident deleted successfully');
        return { success: true };
      } catch (error) {
        console.error('Error deleting resident:', error);
        errorHandler.notifyError('Failed to delete resident. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Sync household occupant count after resident changes (AC9)
     * This helper ensures dashboard widgets receive updated counts
     * @param {string} householdId - Household ID to sync
     */
    async syncHouseholdOccupants(householdId) {
      if (!householdId) return;

      try {
        // Trigger households store to refresh if needed
        const householdsStore = useHouseholdsStore();
        // The households store will automatically fetch occupant counts when it loads
        // We just need to ensure it refreshes its data
        if (householdsStore.households.length > 0) {
          await householdsStore.enrichHouseholdsWithOccupantCounts();
        }
      } catch (error) {
        console.error('Error syncing household occupants:', error);
      }
    },

    /**
     * Set search filter
     * @param {string} searchName - Name to search for
     */
    setSearchFilter(searchName) {
      this.filters.searchName = searchName;
    },

    /**
     * Set household filter
     * @param {string} householdId - Household ID to filter by
     */
    setHouseholdFilter(householdId) {
      this.filters.householdId = householdId;
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filters.searchName = '';
      this.filters.householdId = null;
    },

    /**
     * Apply filters and refresh list (AC2)
     */
    async applyFilters() {
      // Reset to page 1 when applying filters
      await this.fetchResidents(1, this.pagination.itemsPerPage);
    },

    /**
     * Change page
     * @param {number} page - Page number to navigate to
     */
    async goToPage(page) {
      if (page < 1 || page > this.totalPages) {
        return;
      }
      await this.fetchResidents(page, this.pagination.itemsPerPage);
    },

    /**
     * Change items per page
     * @param {number} itemsPerPage - Number of items per page (10, 25, 50, 100)
     */
    async changeItemsPerPage(itemsPerPage) {
      // Reset to page 1 when changing items per page
      await this.fetchResidents(1, itemsPerPage);
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
     * Clear current resident
     */
    clearCurrentResident() {
      this.currentResident = null;
    },
  },
});
