/**
 * Timetable Store (Story 4.5)
 *
 * Pinia store for class_timetable_entries: the weekly subject grid per class
 * and grade-level templates. Supports template/class split, teacher conflict
 * detection, and date-ranged entries for mid-year changes.
 *
 * Data model:
 *   - is_template = true, class_id = null  → grade-level template
 *   - is_template = false, class_id set    → class-specific schedule
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAcademicTermsStore } from './academic-terms-store';
import { ID, Query } from 'appwrite';

const TABLE_ID = 'class_timetable_entries';
const errorHandler = useErrorHandler();

/** Day sort order used by every timetable getter. */
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Normalize a relationship column value to a string ID or null.
 * Appwrite sometimes returns the related object, sometimes the raw ID.
 * @param {string|object|null} value
 * @returns {string|null}
 */
export function normalizeEntryId(value) {
  if (!value) return null;
  return typeof value === 'object' ? value.$id : value;
}

/**
 * Enrich a raw timetable entry with normalized IDs for safe comparisons.
 * @param {object} entry
 * @returns {object}
 */
export function enrichTimetableEntry(entry) {
  return {
    ...entry,
    class_id_normalized: normalizeEntryId(entry.class_id),
    teacher_id_normalized: normalizeEntryId(entry.teacher_id),
  };
}

/**
 * Determine whether an entry is currently active based on valid_from/valid_to.
 * null valid_from = active from the beginning of time; null valid_to = active now.
 * @param {object} entry
 * @param {string} nowISO
 * @returns {boolean}
 */
function isEntryActive(entry, nowISO = new Date().toISOString()) {
  if (entry.valid_from && entry.valid_from > nowISO) return false;
  if (entry.valid_to && entry.valid_to < nowISO) return false;
  return true;
}

function sortEntries(a, b) {
  const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week);
  if (dayDiff !== 0) return dayDiff;
  return (a.slot_id || '').localeCompare(b.slot_id || '');
}

export const useTimetableStore = defineStore('timetable', {
  state: () => ({
    timetableEntries: [],
    timetableLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Returns entries that are currently active based on valid_from/valid_to.
     */
    activeEntries: (state) => {
      const now = new Date().toISOString();
      return state.timetableEntries.filter((e) => isEntryActive(e, now));
    },

    /**
     * Active template entries for a grade and academic year.
     * @param {string} gradeLevel
     * @param {number} academicYear
     * @returns {object[]}
     */
    templateByGradeYear: (state) => (gradeLevel, academicYear) => {
      const now = new Date().toISOString();
      return state.timetableEntries
        .filter(
          (e) =>
            e.is_template === true &&
            e.grade_level === gradeLevel &&
            e.academic_year === academicYear &&
            isEntryActive(e, now),
        )
        .sort(sortEntries);
    },

    /**
     * Active class-specific entries for a class and academic year.
     * @param {string} classId
     * @param {number} academicYear
     * @returns {object[]}
     */
    classTimetable: (state) => (classId, academicYear) => {
      const now = new Date().toISOString();
      return state.timetableEntries
        .filter(
          (e) =>
            e.is_template === false &&
            e.class_id_normalized === classId &&
            e.academic_year === academicYear &&
            isEntryActive(e, now),
        )
        .sort(sortEntries);
    },

    /**
     * Active class-specific entries assigned to a teacher for a given year.
     * @param {string} teacherId
     * @param {number} academicYear
     * @returns {object[]}
     */
    teacherSchedule: (state) => (teacherId, academicYear) => {
      const now = new Date().toISOString();
      return state.timetableEntries
        .filter(
          (e) =>
            e.is_template === false &&
            e.teacher_id_normalized === teacherId &&
            e.academic_year === academicYear &&
            isEntryActive(e, now),
        )
        .sort(sortEntries);
    },

    /**
     * Pre-built conflict index for active class entries.
     * Key: `${teacherId}:${dayOfWeek}:${slotId}:${academicYear}`
     * Value: array of entries.
     */
    conflictIndex: (state) => {
      const now = new Date().toISOString();
      const index = new Map();
      state.timetableEntries.forEach((e) => {
        if (e.is_template === true) return;
        if (!e.teacher_id_normalized) return;
        if (!isEntryActive(e, now)) return;
        const key = `${e.teacher_id_normalized}:${e.day_of_week}:${e.slot_id}:${e.academic_year}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(e);
      });
      return index;
    },

    /**
     * Returns a conflicting entry for the same teacher/day/slot/year, or null.
     * @param {string} teacherId
     * @param {string} dayOfWeek
     * @param {string} slotId
     * @param {number} academicYear
     * @param {string|null} excludeEntryId
     * @returns {object|null}
     */
    hasConflict:
      (state) =>
      (teacherId, dayOfWeek, slotId, academicYear, excludeEntryId = null) => {
        if (!teacherId) return null;
        const now = new Date().toISOString();
        return (
          state.timetableEntries.find((e) => {
            if (excludeEntryId && e.$id === excludeEntryId) return false;
            if (e.is_template === true) return false;
            if (!isEntryActive(e, now)) return false;
            if (e.teacher_id_normalized !== teacherId) return false;
            if (e.day_of_week !== dayOfWeek) return false;
            if (e.slot_id !== slotId) return false;
            if (e.academic_year !== academicYear) return false;
            return true;
          }) || null
        );
      },
  },

  actions: {
    /**
     * Fetch all timetable entries from Appwrite.
     * Uses cached state unless force=true.
     */
    async fetchTimetableEntries(force = false) {
      if (this.timetableLoaded && !force) {
        return { success: true, data: this.timetableEntries };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [Query.limit(5000)],
        });
        this.timetableEntries = response.rows.map((row) => enrichTimetableEntry(row));
        this.timetableLoaded = true;
        return { success: true, data: this.timetableEntries };
      } catch (error) {
        console.error('Error fetching timetable entries:', error);
        errorHandler.notifyError('Failed to load timetable entries. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Replace all template entries for a grade/year with a new set.
     * @param {string} gradeLevel
     * @param {number} academicYear
     * @param {object[]} entries - Array of { slot_id, day_of_week, subject, teacher_id, notes }
     */
    async saveTemplateEntries(gradeLevel, academicYear, entries) {
      this.isLoading = true;
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      let existing = [];
      try {
        const validFrom = await this.defaultValidFrom(academicYear);
        existing = this.templateByGradeYear(gradeLevel, academicYear);

        // IMPORTANT: Appwrite TablesDB does not support multi-row transactions.
        // If delete succeeds and create fails, the database will be in an
        // intermediate (empty) state. We re-fetch on failure to keep the UI
        // consistent, but previously saved data cannot be recovered without a
        // backend transaction API.

        // 1. Delete existing template entries
        const deleteResults = await Promise.allSettled(
          existing.map((e) =>
            tables.deleteRow({ databaseId: dbId, tableId: TABLE_ID, rowId: e.$id }),
          ),
        );
        const deleteFailed = deleteResults.some((r) => r.status === 'rejected');
        if (deleteFailed) throw new Error('Failed to delete existing template entries.');

        // 2. Create new entries
        const createResults = await Promise.allSettled(
          entries.map((entry) =>
            tables.createRow({
              databaseId: dbId,
              tableId: TABLE_ID,
              rowId: ID.unique(),
              data: {
                is_template: true,
                class_id: null,
                grade_level: gradeLevel,
                academic_year: academicYear,
                slot_id: entry.slot_id,
                day_of_week: entry.day_of_week,
                subject: entry.subject || null,
                teacher_id: entry.teacher_id || null,
                notes: entry.notes || null,
                valid_from: validFrom,
                valid_to: null,
              },
            }),
          ),
        );
        const createFailed = createResults.some((r) => r.status === 'rejected');
        if (createFailed) throw new Error('Failed to create new template entries.');

        const created = createResults.map((r) => enrichTimetableEntry(r.value));

        // 3. Only update local state after full success
        this.timetableEntries = this.timetableEntries.filter(
          (e) =>
            !(
              e.is_template === true &&
              e.grade_level === gradeLevel &&
              e.academic_year === academicYear
            ),
        );
        this.timetableEntries.push(...created);
        return { success: true, data: created };
      } catch (error) {
        console.error('Error saving template entries:', error);
        errorHandler.notifyError('Failed to save template. Please try again.');
        // Resync local state with the database
        await this.fetchTimetableEntries(true);
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Apply the grade template to a class: copies template entries into class-specific entries.
     * @param {string} classId
     * @param {string} gradeLevel
     * @param {number} academicYear
     */
    async applyTemplateToClass(classId, gradeLevel, academicYear) {
      this.isLoading = true;
      try {
        const existing = this.classTimetable(classId, academicYear);
        if (existing.length > 0) {
          return {
            success: false,
            error: 'This class already has a timetable. Use "Reset to Template" to overwrite it.',
          };
        }

        const template = this.templateByGradeYear(gradeLevel, academicYear);
        if (template.length === 0) {
          return { success: false, error: `No template found for ${gradeLevel} ${academicYear}.` };
        }

        const result = await this.saveclassEntries(
          classId,
          academicYear,
          template.map((e) => ({
            slot_id: e.slot_id,
            day_of_week: e.day_of_week,
            subject: e.subject,
            teacher_id: e.teacher_id_normalized,
            notes: e.notes,
          })),
          gradeLevel,
        );
        return result;
      } catch (error) {
        console.error('Error applying template to class:', error);
        errorHandler.notifyError('Failed to apply template. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Replace all class-specific entries for a class/year with a new set.
     * @param {string} classId
     * @param {number} academicYear
     * @param {object[]} entries - Array of { slot_id, day_of_week, subject, teacher_id, notes }
     * @param {string|null} gradeLevel - Optional; used when called internally (applyTemplate)
     */
    async saveclassEntries(classId, academicYear, entries, gradeLevel = null) {
      this.isLoading = true;
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      let existing = [];
      try {
        const validFrom = await this.defaultValidFrom(academicYear);
        const resolvedGrade =
          gradeLevel || this.classTimetable(classId, academicYear)[0]?.grade_level || null;
        if (!resolvedGrade) {
          throw new Error('Could not resolve grade level for class timetable entries.');
        }
        existing = this.classTimetable(classId, academicYear);

        // IMPORTANT: Appwrite TablesDB does not support multi-row transactions.
        // If delete succeeds and create fails, the database will be in an
        // intermediate (empty) state. We re-fetch on failure to keep the UI
        // consistent, but previously saved data cannot be recovered without a
        // backend transaction API.

        // 1. Delete existing class entries
        const deleteResults = await Promise.allSettled(
          existing.map((e) =>
            tables.deleteRow({ databaseId: dbId, tableId: TABLE_ID, rowId: e.$id }),
          ),
        );
        const deleteFailed = deleteResults.some((r) => r.status === 'rejected');
        if (deleteFailed) throw new Error('Failed to delete existing class timetable entries.');

        // 2. Create new entries
        const createResults = await Promise.allSettled(
          entries.map((entry) =>
            tables.createRow({
              databaseId: dbId,
              tableId: TABLE_ID,
              rowId: ID.unique(),
              data: {
                is_template: false,
                class_id: classId,
                grade_level: resolvedGrade,
                academic_year: academicYear,
                slot_id: entry.slot_id,
                day_of_week: entry.day_of_week,
                subject: entry.subject || null,
                teacher_id: entry.teacher_id || null,
                notes: entry.notes || null,
                valid_from: validFrom,
                valid_to: null,
              },
            }),
          ),
        );
        const createFailed = createResults.some((r) => r.status === 'rejected');
        if (createFailed) throw new Error('Failed to create new class timetable entries.');

        const created = createResults.map((r) => enrichTimetableEntry(r.value));

        // 3. Only update local state after full success
        this.timetableEntries = this.timetableEntries.filter(
          (e) =>
            !(
              e.is_template === false &&
              e.class_id_normalized === classId &&
              e.academic_year === academicYear
            ),
        );
        this.timetableEntries.push(...created);
        return { success: true, data: created };
      } catch (error) {
        console.error('Error saving class entries:', error);
        errorHandler.notifyError('Failed to save timetable. Please try again.');
        // Resync local state with the database
        await this.fetchTimetableEntries(true);
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Reset a class timetable to the grade template.
     * @param {string} classId
     * @param {string} gradeLevel
     * @param {number} academicYear
     */
    async resetClassToTemplate(classId, gradeLevel, academicYear) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const existing = this.classTimetable(classId, academicYear);

        const deleteResults = await Promise.allSettled(
          existing.map((e) =>
            tables.deleteRow({ databaseId: dbId, tableId: TABLE_ID, rowId: e.$id }),
          ),
        );
        const deleteFailed = deleteResults.some((r) => r.status === 'rejected');
        if (deleteFailed) throw new Error('Failed to delete existing class timetable entries.');

        // 2. Reapply template
        const result = await this.applyTemplateToClass(classId, gradeLevel, academicYear);
        return result;
      } catch (error) {
        console.error('Error resetting class to template:', error);
        errorHandler.notifyError('Failed to reset timetable. Please try again.');
        // Resync local state with the database
        await this.fetchTimetableEntries(true);
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a single timetable entry.
     * @param {string} entryId
     */
    async deleteEntry(entryId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({ databaseId: dbId, tableId: TABLE_ID, rowId: entryId });
        this.timetableEntries = this.timetableEntries.filter((e) => e.$id !== entryId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting timetable entry:', error);
        errorHandler.notifyError('Failed to delete timetable entry. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Determine a sensible default valid_from for a given academic year.
     * Uses the start_date of the first term for the year; falls back to null.
     * null valid_from means "from the start of the year" per the schema docs.
     * @param {number} academicYear
     * @returns {string|null} ISO datetime string
     */
    async defaultValidFrom(academicYear) {
      try {
        const termsStore = useAcademicTermsStore();
        await termsStore.fetchAcademicTerms();
        const terms = termsStore.termsByYear(academicYear);
        if (terms.length > 0) {
          return terms[0].start_date;
        }
      } catch (e) {
        console.warn('Could not resolve academic term start date for valid_from:', e);
      }
      return null;
    },
  },
});
