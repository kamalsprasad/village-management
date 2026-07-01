/**
 * Intervention Store (Story 4.8)
 *
 * Pinia store for intervention plans and their progress notes.
 * Manages the `interventions` and `intervention_notes` tables.
 *
 * Interventions are persisted, unlike at-risk status (Story 4.7), which is
 * derived and ephemeral. An intervention's `status` is independent of a
 * learner's live at-risk flag — see InterventionDetailPage for how both are
 * surfaced together without conflating them.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const errorHandler = useErrorHandler();

function normalizeId(value) {
  if (!value) return null;
  return typeof value === 'object' ? value.$id : value;
}

export const useInterventionStore = defineStore('intervention', {
  state: () => ({
    interventions: [],
    interventionNotes: [],
    interventionsLoaded: false,
    notesLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Get all interventions for a single learner, most recent first.
     * Used by Story 4.13 (Learner Progress Reports) — keep this getter's
     * name and return shape stable.
     */
    getInterventionsForLearner: (state) => (learnerId) => {
      return state.interventions
        .filter((i) => i.learner_id_normalized === learnerId)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },

    /**
     * All interventions currently Active.
     */
    getActiveInterventions: (state) => {
      return state.interventions.filter((i) => i.status === 'Active');
    },

    /**
     * All interventions assigned to a given teacher (resident ID), most recent first.
     */
    getInterventionsForTeacher: (state) => (teacherResidentId) => {
      return state.interventions
        .filter((i) => i.assigned_teacher_id_normalized === teacherResidentId)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },

    /**
     * Progress notes for a single intervention, newest first.
     */
    getNotesForIntervention: (state) => (interventionId) => {
      return state.interventionNotes
        .filter((n) => n.intervention_id_normalized === interventionId)
        .sort((a, b) => new Date(b.note_date) - new Date(a.note_date));
    },

    /**
     * Total number of intervention plans.
     */
    interventionCount: (state) => state.interventions.length,
  },

  actions: {
    /**
     * Enrich a raw intervention row with normalized relationship IDs.
     */
    enrichIntervention(row) {
      return {
        ...row,
        learner_id_normalized: normalizeId(row.learner_id),
        assigned_teacher_id_normalized: normalizeId(row.assigned_teacher_id),
      };
    },

    /**
     * Enrich a raw intervention note row with normalized relationship IDs.
     */
    enrichNote(row) {
      return {
        ...row,
        intervention_id_normalized: normalizeId(row.intervention_id),
      };
    },

    /**
     * Fetch all intervention plans.
     */
    async fetchInterventions(force = false) {
      if (this.interventionsLoaded && !force) {
        return { success: true, data: this.interventions };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'interventions',
          queries: [Query.limit(500)],
        });

        this.interventions = response.rows.map((row) => this.enrichIntervention(row));
        this.interventionsLoaded = true;
        return { success: true, data: this.interventions };
      } catch (error) {
        console.error('Error fetching interventions:', error);
        errorHandler.notifyError('Could not load interventions. Please check your connection.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch progress notes for a single intervention.
     * Replaces any previously loaded notes for this intervention.
     */
    async fetchNotesForIntervention(interventionId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: 'intervention_notes',
          queries: [
            Query.equal('intervention_id', interventionId),
            Query.limit(200),
            Query.orderAsc('note_date'),
          ],
        });

        const enriched = response.rows.map((row) => this.enrichNote(row));
        // Replace existing notes for this intervention, keep notes for others
        this.interventionNotes = [
          ...this.interventionNotes.filter((n) => n.intervention_id_normalized !== interventionId),
          ...enriched,
        ];
        this.notesLoaded = true;
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error fetching intervention notes:', error);
        errorHandler.notifyError('Failed to load progress notes. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create a new intervention plan.
     */
    async createIntervention(payload) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'interventions',
          rowId: ID.unique(),
          data: payload,
        });

        const enriched = this.enrichIntervention(response);
        this.interventions.unshift(enriched);
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error creating intervention:', error);
        errorHandler.notifyError('Failed to create intervention plan. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing intervention plan.
     */
    async updateIntervention(interventionId, payload) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.updateRow({
          databaseId: dbId,
          tableId: 'interventions',
          rowId: interventionId,
          data: payload,
        });

        const enriched = this.enrichIntervention(response);
        const index = this.interventions.findIndex((i) => i.$id === interventionId);
        if (index !== -1) {
          this.interventions.splice(index, 1, enriched);
        } else {
          this.interventions.unshift(enriched);
        }
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error updating intervention:', error);
        errorHandler.notifyError('Failed to update intervention plan. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete an intervention plan (and its notes, via cascade in the DB).
     */
    async deleteIntervention(interventionId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: 'interventions',
          rowId: interventionId,
        });

        this.interventions = this.interventions.filter((i) => i.$id !== interventionId);
        this.interventionNotes = this.interventionNotes.filter(
          (n) => n.intervention_id_normalized !== interventionId,
        );
        return { success: true };
      } catch (error) {
        console.error('Error deleting intervention:', error);
        errorHandler.notifyError('Failed to delete intervention plan. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Add a progress note to an intervention.
     * Notes are append-only — there is no updateNote() or deleteNote() action.
     */
    async addNote(interventionId, { content, learner_response, author_id }) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.createRow({
          databaseId: dbId,
          tableId: 'intervention_notes',
          rowId: ID.unique(),
          data: {
            intervention_id: interventionId,
            note_date: new Date().toISOString(),
            content,
            learner_response,
            author_id,
          },
        });

        const enriched = this.enrichNote(response);
        this.interventionNotes.unshift(enriched);
        return { success: true, data: enriched };
      } catch (error) {
        console.error('Error adding intervention note:', error);
        errorHandler.notifyError('Failed to add progress note. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});
