/**
 * Period Slots Store (Story 4.4)
 *
 * Pinia store for school_period_slots: the per-grade daily bell schedule.
 * Each slot defines a named time block (class period, break, lunch, etc.)
 * for a given grade level and academic year.
 *
 * Key consumers:
 * - BellSchedulesSettingsPage: CRUD and reorder for slots
 * - DailyScheduleTimeline: visual timeline of the day
 * - Story 4.5 timetable builder: classSlotsByGradeYear() provides the grid rows
 * - Story 4.5 vue-cal display: slotDurationMinutes() drives proportional rendering
 *
 * Design:
 * - Per-grade, per-year: all classes in "Grade 5" share the same bell schedule.
 * - slot_number determines display order (1, 2, 3…); admin can reorder.
 * - slot_type enum: 'class' | 'break' | 'lunch' | 'assembly' | 'free'
 * - applies_to_days: [] = all school days; ['Monday', 'Friday'] = specific days only.
 * - Times stored as HH:mm strings (24-hour format).
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';

const TABLE_ID = 'school_period_slots';
const errorHandler = useErrorHandler();

/** Display config for each slot type. Used by timeline and settings page. */
export const SLOT_TYPE_CONFIG = {
  class: { label: 'Class Period', color: 'blue-7', bgHex: '#1565C0', icon: 'school' },
  break: { label: 'Break', color: 'green-6', bgHex: '#43A047', icon: 'coffee' },
  lunch: { label: 'Lunch', color: 'orange-7', bgHex: '#F57C00', icon: 'restaurant' },
  assembly: { label: 'Assembly', color: 'teal-6', bgHex: '#00897B', icon: 'groups' },
  free: { label: 'Free/Prep', color: 'grey-6', bgHex: '#757575', icon: 'self_improvement' },
};

export const SLOT_TYPE_OPTIONS = Object.entries(SLOT_TYPE_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  color: cfg.color,
  icon: cfg.icon,
}));

/** Days of the week used for applies_to_days multi-select. */
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Parse an HH:mm time string and return total minutes since midnight.
 * Returns -1 for invalid input.
 * @param {string} timeStr - "08:00" format
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return -1;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return -1;
  return h * 60 + m;
}

export const usePeriodSlotsStore = defineStore('periodSlots', {
  state: () => ({
    periodSlots: [],
    periodSlotsLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Returns all slots for a given grade and academic year, sorted by slot_number.
     * @param {string} gradeLevel
     * @param {number} academicYear
     * @returns {object[]}
     */
    slotsByGradeYear: (state) => (gradeLevel, academicYear) => {
      return state.periodSlots
        .filter((s) => s.grade_level === gradeLevel && s.academic_year === academicYear)
        .sort((a, b) => a.slot_number - b.slot_number);
    },

    /**
     * Returns only class-type slots for a grade/year, sorted by slot_number.
     * This is the subset used by the Story 4.5 timetable subject grid.
     * @param {string} gradeLevel
     * @param {number} academicYear
     * @returns {object[]}
     */
    classSlotsByGradeYear: (state) => (gradeLevel, academicYear) => {
      return state.periodSlots
        .filter(
          (s) =>
            s.grade_level === gradeLevel &&
            s.academic_year === academicYear &&
            s.slot_type === 'class',
        )
        .sort((a, b) => a.slot_number - b.slot_number);
    },

    /**
     * Computes the duration of a slot in minutes from its start_time and end_time strings.
     * Returns 0 for invalid or missing times.
     * @param {object} slot
     * @returns {number}
     */
    slotDurationMinutes: () => (slot) => {
      if (!slot?.start_time || !slot?.end_time) return 0;
      const start = timeToMinutes(slot.start_time);
      const end = timeToMinutes(slot.end_time);
      if (start < 0 || end < 0 || end <= start) return 0;
      return end - start;
    },

    /**
     * Returns a sorted, de-duplicated list of all grade levels that have slots in the store.
     * @returns {string[]}
     */
    gradesWithSlots: (state) => {
      return [...new Set(state.periodSlots.map((s) => s.grade_level))].sort();
    },

    /**
     * Returns a sorted list of all academic years that have slots in the store.
     * @returns {number[]}
     */
    availableYears: (state) => {
      return [...new Set(state.periodSlots.map((s) => s.academic_year))].sort((a, b) => b - a);
    },
  },

  actions: {
    /**
     * Fetch ALL period slots from Appwrite.
     * Suitable for the settings page which needs all grades.
     * Uses cached state unless force=true.
     */
    async fetchPeriodSlots(force = false) {
      if (this.periodSlotsLoaded && !force) {
        return { success: true, data: this.periodSlots };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [Query.limit(1000), Query.orderAsc('grade_level'), Query.orderAsc('slot_number')],
        });
        this.periodSlots = response.rows;
        this.periodSlotsLoaded = true;
        return { success: true, data: this.periodSlots };
      } catch (error) {
        console.error('Error fetching period slots:', error);
        errorHandler.notifyError('Failed to load period slots. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch period slots for a specific grade and academic year only.
     * More efficient than fetchPeriodSlots() when only one grade/year is needed.
     * Merges results into the shared state so getters stay consistent.
     * Used by Story 4.5 timetable builder to avoid loading all grades.
     *
     * @param {string} gradeLevel
     * @param {number} academicYear
     */
    async fetchPeriodSlotsForGradeYear(gradeLevel, academicYear) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [
            Query.equal('grade_level', gradeLevel),
            Query.equal('academic_year', academicYear),
            Query.orderAsc('slot_number'),
            Query.limit(200),
          ],
        });
        // Merge: remove any existing rows for this grade/year, then add fresh ones.
        this.periodSlots = [
          ...this.periodSlots.filter(
            (s) => !(s.grade_level === gradeLevel && s.academic_year === academicYear),
          ),
          ...response.rows,
        ];
        return { success: true, data: response.rows };
      } catch (error) {
        console.error('Error fetching period slots for grade/year:', error);
        errorHandler.notifyError('Failed to load bell schedule. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create or update a period slot.
     * If slotData.$id is set, updates the existing row; otherwise creates a new one.
     * @param {object} slotData
     */
    async savePeriodSlot(slotData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const { $id, ...writeFields } = slotData;

        // Normalize applies_to_days: ensure it's always an array
        if (!writeFields.applies_to_days || writeFields.applies_to_days.length === 0) {
          if ($id) {
            writeFields.applies_to_days = []; // Clear on update
          } else {
            delete writeFields.applies_to_days; // Omit on create (defaults to empty)
          }
        }

        let savedRow;
        if ($id) {
          savedRow = await tables.updateRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: $id,
            data: writeFields,
          });
          const index = this.periodSlots.findIndex((s) => s.$id === $id);
          if (index !== -1) {
            this.periodSlots.splice(index, 1, savedRow);
          }
        } else {
          savedRow = await tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: writeFields,
          });
          this.periodSlots.push(savedRow);
        }

        return { success: true, data: savedRow };
      } catch (error) {
        console.error('Error saving period slot:', error);
        errorHandler.notifyError('Failed to save slot. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a period slot by ID.
     * Note: Story 4.5 timetable entries reference slot IDs as strings.
     * The caller is responsible for checking references before deleting.
     * @param {string} slotId
     */
    async deletePeriodSlot(slotId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: TABLE_ID,
          rowId: slotId,
        });
        this.periodSlots = this.periodSlots.filter((s) => s.$id !== slotId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting period slot:', error);
        errorHandler.notifyError('Failed to delete slot. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Renumber slot_number for a given grade/year in the provided order.
     * Fires parallel updateRow calls for every slot in the list.
     * Called automatically after each up/down reorder press (auto-save behavior).
     *
     * @param {string} gradeLevel
     * @param {number} academicYear
     * @param {string[]} orderedSlotIds — slot $id values in the desired new order
     * @returns {{ success: boolean }}
     */
    async reorderSlots(gradeLevel, academicYear, orderedSlotIds) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // Build the update promises: slot_number = index + 1
        const updates = orderedSlotIds.map((slotId, index) =>
          tables.updateRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: slotId,
            data: { slot_number: index + 1 },
          }),
        );

        const updatedRows = await Promise.all(updates);

        // Reflect new slot_numbers in local state
        updatedRows.forEach((row) => {
          const index = this.periodSlots.findIndex((s) => s.$id === row.$id);
          if (index !== -1) {
            this.periodSlots.splice(index, 1, row);
          }
        });

        return { success: true };
      } catch (error) {
        console.error('Error reordering period slots:', error);
        errorHandler.notifyError('Failed to save slot order. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Copy all period slots from a source grade+year to a target grade+year.
     * Deletes existing slots for the target grade+year first.
     *
     * @param {string} sourceGrade
     * @param {number} sourceYear
     * @param {string} targetGrade
     * @param {number} targetYear
     * @returns {{ success: boolean, created: number }}
     */
    async copySchedule(sourceGrade, sourceYear, targetGrade, targetYear) {
      const sourceSlots = this.slotsByGradeYear(sourceGrade, sourceYear);
      if (sourceSlots.length === 0) {
        return { success: false, error: `No slots found for ${sourceGrade} ${sourceYear}.` };
      }

      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

        // 1. Delete existing target slots
        const existingTarget = this.slotsByGradeYear(targetGrade, targetYear);
        if (existingTarget.length > 0) {
          await Promise.all(
            existingTarget.map((s) =>
              tables.deleteRow({ databaseId: dbId, tableId: TABLE_ID, rowId: s.$id }),
            ),
          );
          this.periodSlots = this.periodSlots.filter(
            (s) => !(s.grade_level === targetGrade && s.academic_year === targetYear),
          );
        }

        // 2. Create copies with updated grade/year
        const createPromises = sourceSlots.map((s) =>
          tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: {
              grade_level: targetGrade,
              academic_year: targetYear,
              slot_number: s.slot_number,
              label: s.label,
              slot_type: s.slot_type,
              start_time: s.start_time,
              end_time: s.end_time,
              applies_to_days: s.applies_to_days || [],
              notes: s.notes || null,
            },
          }),
        );

        const createdRows = await Promise.all(createPromises);
        this.periodSlots.push(...createdRows);

        return { success: true, created: createdRows.length };
      } catch (error) {
        console.error('Error copying schedule:', error);
        errorHandler.notifyError('Failed to copy schedule. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});
