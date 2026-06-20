/**
 * Calendar Events Store (Story 4.3)
 *
 * Pinia store for school calendar events: public holidays, school holidays,
 * professional development days, exam blocks, early dismissals, assemblies, etc.
 *
 * Key consumers:
 * - SchoolCalendarPage: displays events on the vue-cal monthly grid
 * - CalendarEventsSettingsPage: CRUD for events
 * - Future (Story 4.6): isSchoolDay() gating attendance entry
 * - Future (Story 4.7): schoolDaysBetween() for at-risk grace period
 *
 * Design: events are school-wide by default. affected_class_ids (string array)
 * allows optional per-class scoping without relationship complexity.
 */

import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useSettingsStore } from 'src/stores/settings-store';
import { getDayOfWeekInTimezone, toDateStrInTimezone, addDaysToDateStr } from 'src/utils/dateUtils';
import { ID, Query } from 'appwrite';

const TABLE_ID = 'school_calendar_events';
const errorHandler = useErrorHandler();

/** Events where is_school_day=false mean the school is CLOSED on that day. */
export const CLOSED_EVENT_TYPES = ['public_holiday', 'school_holiday', 'pd_day'];

export const useCalendarEventsStore = defineStore('calendarEvents', {
  state: () => ({
    calendarEvents: [],
    calendarEventsLoaded: false,
    isLoading: false,
  }),

  getters: {
    /**
     * Returns events whose date range overlaps with [startDate, endDate].
     * Both params should be ISO date strings or Date objects.
     * Used by SchoolCalendarPage to scope events to the visible month.
     * Comparison is done in the configured village timezone using calendar dates.
     */
    eventsBetween: (state) => (startDate, endDate) => {
      const tz = useSettingsStore().timezone;
      const from = toDateStrInTimezone(startDate, tz);
      const to = toDateStrInTimezone(endDate, tz);
      return state.calendarEvents.filter((e) => {
        const eStart = toDateStrInTimezone(e.start_date, tz);
        const eEnd = toDateStrInTimezone(e.end_date, tz);
        // Overlaps if event starts before range end AND ends after range start
        return eStart <= to && eEnd >= from;
      });
    },

    /**
     * Returns events for a given academic year (by start_date calendar year).
     * Uses the village timezone date so the year is correct for the configured location.
     */
    eventsByYear: (state) => (year) => {
      const tz = useSettingsStore().timezone;
      const yearStr = String(year);
      return state.calendarEvents.filter(
        (e) => toDateStrInTimezone(e.start_date, tz).slice(0, 4) === yearStr,
      );
    },

    /**
     * Determines whether a given date is a school day.
     *
     * Rules:
     * 1. Weekends (Sat/Sun) are never school days.
     * 2. If a calendar event covers the date AND is_school_day=false → not a school day.
     * 3. If the date has an event with is_school_day=true (e.g. early dismissal) →
     *    still counts as a school day (school is open, just modified).
     * 4. All other weekdays are school days by default (no event = school day).
     *
     * @param {string|Date} date
     * @param {string|null} classId - optional, checks affected_class_ids scoping
     * @returns {boolean}
     */
    isSchoolDay:
      (state) =>
      (date, classId = null) => {
        const tz = useSettingsStore().timezone;
        const datePart =
          typeof date === 'string'
            ? toDateStrInTimezone(date, tz)
            : toDateStrInTimezone(date.toISOString(), tz);
        const dayOfWeek = getDayOfWeekInTimezone(datePart, tz);

        // Rule 1: weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) return false;

        // Check for closing events on this date
        const coveringClosedEvent = state.calendarEvents.find((e) => {
          if (e.is_school_day) return false; // open-but-modified events don't close school

          const eStart = toDateStrInTimezone(e.start_date, tz);
          const eEnd = toDateStrInTimezone(e.end_date, tz);
          if (datePart < eStart || datePart > eEnd) return false;

          // Check class scoping: if affected_class_ids is non-empty AND classId is provided,
          // the event only closes school for those specific classes.
          const affectedIds = e.affected_class_ids;
          if (affectedIds && affectedIds.length > 0 && classId) {
            return affectedIds.includes(classId);
          }
          // School-wide (no scoping or no classId context) → applies
          return true;
        });

        return !coveringClosedEvent;
      },

    /**
     * Count the number of school days between two dates (inclusive).
     * Used by Story 4.7 for the 5-school-day attendance grace period.
     *
     * @param {string|Date} startDate
     * @param {string|Date} endDate
     * @param {string|null} classId - optional
     * @returns {number}
     */
    schoolDaysBetween:
      () =>
      (startDate, endDate, classId = null) => {
        const store = useCalendarEventsStore();
        const tz = useSettingsStore().timezone;
        let count = 0;
        let current = toDateStrInTimezone(startDate, tz);
        const end = toDateStrInTimezone(endDate, tz);

        while (current <= end) {
          if (store.isSchoolDay(current, classId)) {
            count++;
          }
          current = addDaysToDateStr(current, 1);
        }
        return count;
      },
  },

  actions: {
    /**
     * Fetch all calendar events from Appwrite.
     * Uses cached state unless force=true.
     */
    async fetchCalendarEvents(force = false) {
      if (this.calendarEventsLoaded && !force) {
        return { success: true, data: this.calendarEvents };
      }
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: TABLE_ID,
          queries: [Query.limit(500), Query.orderAsc('start_date')],
        });
        this.calendarEvents = response.rows;
        this.calendarEventsLoaded = true;
        return { success: true, data: this.calendarEvents };
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        errorHandler.notifyError('Failed to load school calendar events. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create or update a calendar event.
     * If eventData.$id is set, updates the existing row; otherwise creates a new one.
     * @param {object} eventData
     */
    async saveEvent(eventData) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const { $id, ...writeFields } = eventData;

        // Normalize: ensure end_date >= start_date (single-day: end_date = start_date)
        if (!writeFields.end_date) {
          writeFields.end_date = writeFields.start_date;
        }
        // is_school_day defaults to false (closed) if not explicitly set
        if (writeFields.is_school_day === undefined || writeFields.is_school_day === null) {
          writeFields.is_school_day = false;
        }
        // Normalize affected_class_ids: always keep an array when updating so the
        // database clears any previously-set scoping; omit only on create.
        if (!writeFields.affected_class_ids || writeFields.affected_class_ids.length === 0) {
          if ($id) {
            writeFields.affected_class_ids = [];
          } else {
            delete writeFields.affected_class_ids;
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
          const index = this.calendarEvents.findIndex((e) => e.$id === $id);
          if (index !== -1) {
            this.calendarEvents.splice(index, 1, savedRow);
          }
        } else {
          savedRow = await tables.createRow({
            databaseId: dbId,
            tableId: TABLE_ID,
            rowId: ID.unique(),
            data: writeFields,
          });
          this.calendarEvents.push(savedRow);
          this.calendarEvents.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        }

        return { success: true, data: savedRow };
      } catch (error) {
        console.error('Error saving calendar event:', error);
        errorHandler.notifyError('Failed to save calendar event. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Delete a calendar event by ID.
     */
    async deleteEvent(eventId) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: TABLE_ID,
          rowId: eventId,
        });
        this.calendarEvents = this.calendarEvents.filter((e) => e.$id !== eventId);
        return { success: true };
      } catch (error) {
        console.error('Error deleting calendar event:', error);
        errorHandler.notifyError('Failed to delete calendar event. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },
  },
});
