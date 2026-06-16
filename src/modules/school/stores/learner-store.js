/**
 * Learner Store (Story 4.1 / 4.2 Split)
 *
 * Pinia store for learner enrollment records.
 *
 * Data model: ONE learner row per resident, ever.
 * Status changes (promotion, graduation, re-enrollment) mutate the single row,
 * preserving a stable learner ID for test scores, attendance, and interventions.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

/**
 * Normalize a relationship value to its row ID.
 * Appwrite returns relationship columns as embedded objects on reads,
 * but accepts plain IDs on writes.
 * @param {Object|string|null} value - Relationship value
 * @returns {string|null} Row ID
 */
function normalizeId(value) {
  if (!value) return null;
  return typeof value === 'object' ? value.$id : value;
}

/**
 * Build full name from resident object parts (mirrors residents-store)
 * @param {Object} resident - Resident with first_name, middle_names, last_name
 * @returns {string} Full name
 */
function buildResidentFullName(resident) {
  if (!resident || typeof resident !== 'object') return '';
  const parts = [resident.first_name];
  if (resident.middle_names) {
    parts.push(resident.middle_names);
  }
  parts.push(resident.last_name);
  return parts.filter(Boolean).join(' ');
}

export const useLearnerStore = defineStore('learner', {
  state: () => ({
    learners: [],
    learnersLoaded: false,
    isLoading: false,
    currentLearner: null,
    isCurrentLearnerLoading: false,
    filters: {
      classIds: [], // Multi-select class filter
      statuses: [], // Multi-select status filter
      searchQuery: '',
    },
  }),

  getters: {
    /**
     * Learners with an Active enrollment status
     */
    activeLearners: (state) => state.learners.filter((l) => l.enrollment_status === 'Active'),

    /**
     * Count of active learners per class
     * @returns {Object<string, number>} Map of class ID -> count
     */
    activeLearnersByClass() {
      return this.activeLearners.reduce((acc, learner) => {
        const classId = learner.class_id_normalized || learner.class_id;
        if (classId) {
          acc[classId] = (acc[classId] || 0) + 1;
        }
        return acc;
      }, {});
    },

    /**
     * Last 5 enrollments by enrollment date (most recent first)
     */
    recentEnrollments: (state) => {
      return [...state.learners]
        .sort((a, b) => new Date(b.enrollment_date) - new Date(a.enrollment_date))
        .slice(0, 5);
    },

    /**
     * Learners filtered by class, status, and name search (client-side)
     */
    filteredLearners: (state) => {
      let result = state.learners;

      if (state.filters.classIds.length > 0) {
        result = result.filter((l) => {
          const classId = l.class_id_normalized || l.class_id;
          return state.filters.classIds.includes(classId);
        });
      }

      if (state.filters.statuses.length > 0) {
        result = result.filter((l) => state.filters.statuses.includes(l.enrollment_status));
      }

      if (state.filters.searchQuery && state.filters.searchQuery.trim()) {
        const term = state.filters.searchQuery.trim().toLowerCase();
        result = result.filter((l) => {
          const name = (l.resident_full_name || '').toLowerCase();
          return name.includes(term);
        });
      }

      return result;
    },

    /**
     * Get full name for a learner's linked resident
     * @returns {Function} (learner) => string
     */
    getLearnerName: () => (learner) => {
      if (!learner) return '';
      if (learner.resident_full_name) return learner.resident_full_name;
      return buildResidentFullName(learner.resident_id);
    },
  },

  actions: {
    /**
     * Enrich a learner row with denormalized display fields from the
     * embedded resident relationship (resident_full_name, resident object).
     * @param {Object} learner - Raw learner row from Appwrite
     * @returns {Object} Enriched learner
     */
    enrichLearner(learner) {
      const resident = typeof learner.resident_id === 'object' ? learner.resident_id : null;
      return {
        ...learner,
        resident: resident,
        resident_id_normalized: normalizeId(learner.resident_id),
        resident_full_name: buildResidentFullName(resident),
        class_id_normalized: normalizeId(learner.class_id),
      };
    },

    /**
     * Fetch all learners
     * @param {boolean} force - Refetch even if already loaded
     */
    async fetchLearners(force = false) {
      if (this.learnersLoaded && !force) {
        return { success: true, data: this.learners };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'learners',
          queries: [Query.limit(500), Query.orderDesc('enrollment_date')],
        });
        let learners = response.rows.map((row) => this.enrichLearner(row));

        // If relationships weren't expanded, batch-fetch residents
        const missingIds = learners
          .filter((l) => !l.resident_full_name && l.resident_id_normalized)
          .map((l) => l.resident_id_normalized);

        if (missingIds.length > 0) {
          const residentsMap = new Map();
          const tableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
          const res = await tables.listRows({
            databaseId: dbId,
            tableId,
            queries: [Query.equal('$id', missingIds), Query.limit(missingIds.length)],
          });
          res.rows.forEach((r) => residentsMap.set(r.$id, r));

          learners = learners.map((l) => {
            if (l.resident_full_name) return l;
            const resident = residentsMap.get(l.resident_id_normalized);
            if (!resident) return l;
            return {
              ...l,
              resident,
              resident_full_name: buildResidentFullName(resident),
            };
          });
        }

        this.learners = learners;
        this.learnersLoaded = true;
        return { success: true, data: this.learners };
      } catch (error) {
        console.error('Error fetching learners:', error);
        errorHandler.notifyError('Failed to load learners. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch a single learner by ID
     * @param {string} learnerId - Learner row ID
     */
    async fetchLearnerById(learnerId) {
      this.isCurrentLearnerLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.getRow({
          databaseId: dbId,
          tableId: 'learners',
          rowId: learnerId,
        });
        this.currentLearner = this.enrichLearner(response);
        return { success: true, data: this.currentLearner };
      } catch (error) {
        console.error('Error fetching learner:', error);
        errorHandler.notifyError('Failed to load learner details. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isCurrentLearnerLoading = false;
      }
    },

    /**
     * Check whether a resident already has a learner record (Option A:
     * one learner row per resident, ever).
     * @param {string} residentId - Resident row ID
     * @returns {Object|null} Existing learner row (enriched) or null
     */
    async checkExistingEnrollment(residentId) {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: 'learners',
        queries: [Query.equal('resident_id', residentId), Query.limit(1)],
      });
      return response.rows.length > 0 ? this.enrichLearner(response.rows[0]) : null;
    },

    /**
     * Enroll a new learner
     * Validates that the resident has no existing learner record.
     * @param {Object} data - Learner data (resident_id, class_id, enrollment_date, ...)
     */
    async enrollLearner(data) {
      this.isLoading = true;
      try {
        // Option A validation: one learner row per resident, ever
        const existing = await this.checkExistingEnrollment(data.resident_id);
        if (existing) {
          const name = this.getLearnerName(existing) || 'This resident';
          const status = existing.enrollment_status;
          return {
            success: false,
            duplicate: true,
            existingLearner: existing,
            error:
              status === 'Active'
                ? `${name} is already enrolled as an active learner.`
                : `${name} has a previous enrollment (${status}). Edit the existing record to re-enroll.`,
          };
        }

        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'learners',
          rowId: ID.unique(),
          data: {
            ...data,
            enrollment_status: data.enrollment_status || 'Active',
          },
        });
        const enriched = this.enrichLearner(response);
        this.learners.unshift(enriched);
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error enrolling learner:', error);
        errorHandler.notifyError('Failed to enroll learner. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update a learner record (class reassignment, status changes, edits)
     * @param {string} learnerId - Learner row ID
     * @param {Object} data - Fields to update
     */
    async updateLearner(learnerId, data) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'learners',
          rowId: learnerId,
          data: data,
        });
        let enriched = this.enrichLearner(response);
        // Preserve resident data if Appwrite response didn't expand the relationship
        if (!enriched.resident_full_name) {
          const existing = this.learners.find((l) => l.$id === learnerId) || this.currentLearner;
          if (existing?.$id === learnerId && existing.resident) {
            enriched = {
              ...enriched,
              resident: existing.resident,
              resident_full_name: existing.resident_full_name,
              resident_id_normalized: existing.resident_id_normalized,
            };
          }
        }
        const index = this.learners.findIndex((l) => l.$id === learnerId);
        if (index !== -1) {
          this.learners.splice(index, 1, enriched);
        }
        if (this.currentLearner && this.currentLearner.$id === learnerId) {
          this.currentLearner = enriched;
        }
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error updating learner:', error);
        errorHandler.notifyError('Failed to update learner. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a learner record (hard delete, Admin/Head Teacher only — enforced in UI)
     * @param {string} learnerId - Learner row ID
     */
    async deleteLearner(learnerId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'learners',
          rowId: learnerId,
        });
        this.learners = this.learners.filter((l) => l.$id !== learnerId);
        if (this.currentLearner && this.currentLearner.$id === learnerId) {
          this.currentLearner = null;
        }
        return { success: true };
      } catch (error) {
        console.error('Error deleting learner:', error);
        errorHandler.notifyError('Failed to delete learner. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Patch the current learner with additional fields (e.g., manually loaded
     * resident data when Appwrite didn't expand the relationship).
     * @param {Object} patch - Fields to merge into currentLearner
     */
    patchCurrentLearner(patch) {
      if (!this.currentLearner) return;
      this.currentLearner = { ...this.currentLearner, ...patch };
    },

    /**
     * Reset list filters
     */
    resetFilters() {
      this.filters.classIds = [];
      this.filters.statuses = [];
      this.filters.searchQuery = '';
    },
  },
});
