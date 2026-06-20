/**
 * Academic Terms Store (Story 4.3)
 *
 * Pinia store for configurable academic terms (replaces the hard-coded TERMS constant).
 * Manages the school_academic_terms table: term names, ordering, and start/end dates
 * per academic year. Terms are stored once at the school level — all classes share them.
 *
 * Key design choices:
 * - Terms are school-wide (no per-class terms).
 * - term_name is a free string so schools can use "Semester 1", "Quarter 3", etc.
 * - The store is consumed by RecordScoresPage (term dropdown), SchoolCalendarPage
 *   (term boundary bands), and future attendance/at-risk calculations.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useSettingsStore } from 'src/stores/settings-store';
import { toDateStrInTimezone } from 'src/utils/dateUtils';
import { ID, Query } from 'appwrite';

const TABLE_ID = 'school_academic_terms';
const errorHandler = useErrorHandler();

export const useAcademicTermsStore = defineStore('academicTerms', {
  state: () => ({
    academicTerms: [],
    academicTermsLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Returns terms for a given academic year, sorted by term_order ascending.
     */
    termsByYear: (state) => (year) => {
      return state.academicTerms
        .filter((t) => t.academic_year === year)
        .sort((a, b) => a.term_order - b.term_order);
    },

    /**
     * Returns terms for the current calendar year.
     */
    currentYearTerms: (state) => {
      const year = new Date().getFullYear();
      return state.academicTerms
        .filter((t) => t.academic_year === year)
        .sort((a, b) => a.term_order - b.term_order);
    },

    /**
     * Returns a sorted, de-duplicated list of all academic years that have terms.
     */
    availableYears: (state) => {
      const years = [...new Set(state.academicTerms.map((t) => t.academic_year))];
      return years.sort((a, b) => b - a); // Descending
    },

    /**
     * Returns the term record whose [start_date, end_date] range contains the given date.
     * Compares calendar dates in the configured village timezone so boundaries are correct.
     * Returns null if no term contains the date.
     * @param {string|Date} date - ISO string or Date object
     */
    getTermForDate: (state) => (date) => {
      const tz = useSettingsStore().timezone;
      const isoString = typeof date === 'string' ? date : date.toISOString();
      const datePart = toDateStrInTimezone(isoString, tz);
      return (
        state.academicTerms.find((t) => {
          const start = toDateStrInTimezone(t.start_date, tz);
          const end = toDateStrInTimezone(t.end_date, tz);
          return datePart >= start && datePart <= end;
        }) || null
      );
    },
  },

  actions: {
    /**
     * Fetch all academic terms from Appwrite.
     * Uses cached state unless force=true.
     */
    async fetchAcademicTerms(force = false) {
      if (this.academicTermsLoaded && !force) {
        return { success: true, data: this.academicTerms };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [
            Query.limit(500),
            Query.orderAsc('academic_year'),
            Query.orderAsc('term_order'),
          ],
        });
        this.academicTerms = response.rows;
        this.academicTermsLoaded = true;
        return { success: true, data: this.academicTerms };
      } catch (error) {
        console.error('Error fetching academic terms:', error);
        errorHandler.notifyError('Failed to load academic terms. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create or update a term.
     * If termData.$id is set, updates the existing row; otherwise creates a new one.
     * @param {object} termData - { academic_year, term_name, term_order, start_date, end_date, notes? }
     */
    async saveTerm(termData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const { $id, ...writeFields } = termData;

        let savedRow;
        if ($id) {
          savedRow = await tables.updateRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: $id,
            data: writeFields,
          });
          const index = this.academicTerms.findIndex((t) => t.$id === $id);
          if (index !== -1) {
            this.academicTerms.splice(index, 1, savedRow);
          }
        } else {
          savedRow = await tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: writeFields,
          });
          this.academicTerms.push(savedRow);
          // Keep sorted
          this.academicTerms.sort((a, b) => {
            if (a.academic_year !== b.academic_year) return a.academic_year - b.academic_year;
            return a.term_order - b.term_order;
          });
        }

        return { success: true, data: savedRow };
      } catch (error) {
        console.error('Error saving academic term:', error);
        errorHandler.notifyError('Failed to save term. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a term by ID.
     * Note: deleting a term does not affect existing test_scores rows — those store
     * the term name as a literal string and remain valid after deletion.
     */
    async deleteTerm(termId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: TABLE_ID,
          rowId: termId,
        });
        this.academicTerms = this.academicTerms.filter((t) => t.$id !== termId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting academic term:', error);
        errorHandler.notifyError('Failed to delete term. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete all terms for a given academic year.
     * Existing test_scores are NOT affected because term_name is stored literally on each score.
     *
     * @param {number} year
     * @returns {{ success: boolean, deleted: number }}
     */
    async deleteAllTermsForYear(year) {
      const terms = this.termsByYear(year);
      if (terms.length === 0) {
        return { success: true, deleted: 0 };
      }

      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await Promise.all(
          terms.map((t) =>
            tables.deleteRow({
              databaseId: dbId,
              tableId: TABLE_ID,
              rowId: t.$id,
            }),
          ),
        );
        this.academicTerms = this.academicTerms.filter((t) => t.academic_year !== year);
        return { success: true, deleted: terms.length };
      } catch (error) {
        console.error('Error deleting all terms for year:', error);
        errorHandler.notifyError('Failed to delete terms for year. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Copy terms from sourceYear into targetYear, shifting dates forward by 365 days.
     * Existing terms for targetYear are NOT deleted — this only adds the copies.
     * The caller (settings page) is responsible for clearing the target year first if desired.
     *
     * Date shift: always +365 days (simple, admin adjusts manually afterward).
     *
     * @param {number} sourceYear
     * @param {number} targetYear
     * @returns {{ success: boolean, created: number }}
     */
    async copyTermsFromYear(sourceYear, targetYear) {
      const sourceTerms = this.termsByYear(sourceYear);
      if (sourceTerms.length === 0) {
        return { success: false, error: `No terms found for ${sourceYear}.` };
      }

      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const MS_PER_DAY = 86400000;
        const SHIFT_MS = 365 * MS_PER_DAY;

        const createPromises = sourceTerms.map((t) => {
          const newStart = new Date(new Date(t.start_date).getTime() + SHIFT_MS).toISOString();
          const newEnd = new Date(new Date(t.end_date).getTime() + SHIFT_MS).toISOString();
          return tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: {
              academic_year: targetYear,
              term_name: t.term_name,
              term_order: t.term_order,
              start_date: newStart,
              end_date: newEnd,
              notes: t.notes || null,
            },
          });
        });

        const createdRows = await Promise.all(createPromises);
        this.academicTerms.push(...createdRows);
        this.academicTerms.sort((a, b) => {
          if (a.academic_year !== b.academic_year) return a.academic_year - b.academic_year;
          return a.term_order - b.term_order;
        });

        return { success: true, created: createdRows.length };
      } catch (error) {
        console.error('Error copying terms:', error);
        errorHandler.notifyError('Failed to copy terms. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});
