/**
 * Village Calendar Store (Stories 5.1 + 5.2)
 *
 * Aggregation store for the global village calendar. Composes:
 * - School calendar events (school calendar-events-store, table school_calendar_events)
 * - Farm expected-harvest auto-events (farm-store, table plantings + crops/plots
 *   for name resolution)
 * - User-created village events (table village_events, Story 5.2 write path)
 *
 * All events are normalized to a unified shape:
 *   { id, title, start, end, category, systemGenerated, description, location }
 * where start/end are 'YYYY-MM-DD' calendar date strings in the village timezone
 * (inclusive end; consumers rendering to vue-cal add +1 day for its exclusive end).
 * User-created events additionally carry:
 *   { startTime, endTime, isAllDay, isRecurring, recurrenceRule, createdBy, sourceId }
 * and are always systemGenerated: false.
 *
 * Farm harvest auto-events are only emitted for plantings with status in
 * planted|growing|harvesting and a non-null expected_harvest_date. They are
 * marked systemGenerated: true ("System Generated" badge in the UI).
 *
 * Recurring user events (daily/weekly/monthly string rules — no rrule) are
 * expanded in the allEvents getter over a window of today ± 12 months
 * (village timezone), capped at 400 occurrences per series, preserving the
 * multi-day span; each occurrence is anchored to the series start so
 * month-end clamping never compounds. Occurrence ids are
 * `user-<rowId>-<YYYY-MM-DD>`; the base (non-recurring) id is
 * `user-<rowId>`; all carry sourceId = rowId.
 *
 * Filter state (activeCategories) is session-scoped — plain state, never
 * persisted, resets on reload.
 */

import { defineStore } from 'pinia';
import { ID, Query } from 'appwrite';
import {
  addDays,
  addWeeks,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  format,
  parseISO,
} from 'date-fns';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useSettingsStore } from 'src/stores/settings-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useCalendarEventsStore } from 'src/modules/school/stores/calendar-events-store';
import { useFarmStore } from 'src/modules/farm/stores/farm-store';
import { hasPermission } from 'src/utils/permissions';
import { canManageEvent } from '../utils/calendar-permissions';
import {
  toDateStrInTimezone,
  addDaysToDateStr,
  datePickerToStartOfDayISO,
  datePickerToEndOfDayISO,
} from 'src/utils/dateUtils';
import { CALENDAR_CATEGORIES } from '../utils/calendar-categories';

const errorHandler = useErrorHandler();

/** Story 5.2 user-created events table (env override with schema-name fallback). */
const VILLAGE_EVENTS_TABLE_ID =
  import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_EVENTS || 'village_events';

/** Recurrence expansion cap per series (keeps getter cost bounded). */
const MAX_RECURRENCE_OCCURRENCES = 400;

/** Planting statuses that produce an "Expected Harvest" auto-event. */
const HARVEST_EVENT_STATUSES = ['planted', 'growing', 'harvesting'];

/** Relationship columns can arrive as expanded objects or plain IDs. */
function relationId(value) {
  return typeof value === 'object' && value !== null ? value.$id : value;
}

/**
 * Normalize a village_events row into the unified calendar event shape
 * (plus the Story 5.2 user-event fields).
 */
function normalizeUserEvent(row, tz) {
  const start = toDateStrInTimezone(row.start_date, tz);
  const rawEnd = row.end_date ? toDateStrInTimezone(row.end_date, tz) : start;
  // Defensive: console/API-written rows can have end before start or an
  // unparseable end_date — clamp to the start date.
  const end = !rawEnd || rawEnd < start ? start : rawEnd;
  return {
    id: `user-${row.$id}`,
    title: row.title,
    start,
    end,
    category: row.category || 'other',
    systemGenerated: false,
    description: row.description || '',
    location: row.location || '',
    startTime: row.start_time || null,
    endTime: row.end_time || null,
    isAllDay: row.is_all_day !== false,
    isRecurring: !!row.is_recurring,
    recurrenceRule: row.recurrence_rule || null,
    createdBy: row.created_by || null,
    sourceId: row.$id,
  };
}

const RECURRENCE_ADD_FN = {
  daily: addDays,
  weekly: addWeeks,
  monthly: addMonths,
};

export const useCalendarStore = defineStore('villageCalendar', {
  state: () => ({
    loading: false,
    error: null,
    loaded: false,
    // Session-scoped category filter — initialized to all 7 categories.
    activeCategories: CALENDAR_CATEGORIES.map((c) => c.value),
    // Story 5.2: raw village_events rows (user-created events)
    userEvents: [],
  }),

  getters: {
    /**
     * All events from every source, normalized to the unified shape and
     * sorted by start date. User-created events are normalized and recurring
     * series are expanded into per-occurrence entries (see module docblock).
     */
    allEvents() {
      const settingsStore = useSettingsStore();
      const eventsStore = useCalendarEventsStore();
      const farmStore = useFarmStore();
      const tz = settingsStore.timezone;
      const events = [];

      // School calendar events
      eventsStore.calendarEvents.forEach((evt) => {
        const start = toDateStrInTimezone(evt.start_date, tz);
        events.push({
          id: `school-${evt.$id}`,
          title: evt.title,
          start,
          end: evt.end_date ? toDateStrInTimezone(evt.end_date, tz) : start,
          category: 'school',
          systemGenerated: false,
          description: evt.notes || '',
          location: 'School',
        });
      });

      // Farm expected-harvest auto-events (System Generated)
      farmStore.plantings.forEach((planting) => {
        if (!planting.expected_harvest_date) return;
        if (!HARVEST_EVENT_STATUSES.includes(String(planting.status || '').toLowerCase())) return;

        const cropId = relationId(planting.crop_id);
        const plotId = relationId(planting.plot_id);
        const cropName =
          (typeof planting.crop_id === 'object' ? planting.crop_id?.crop_name : null) ||
          farmStore.getCropNameById(cropId);
        const plotName =
          (typeof planting.plot_id === 'object' ? planting.plot_id?.name : null) ||
          farmStore.plots.find((p) => p.$id === plotId)?.name ||
          '';

        const dateStr = toDateStrInTimezone(planting.expected_harvest_date, tz);
        events.push({
          id: `farm-harvest-${planting.$id}`,
          title: `Expected Harvest: ${cropName}`,
          start: dateStr,
          end: dateStr,
          category: 'farm',
          systemGenerated: true,
          description: plotName ? `Plot: ${plotName}` : '',
          location: plotName,
        });
      });

      // Story 5.2: user-created village events (+ recurrence expansion)
      const horizonStr = toDateStrInTimezone(addMonths(new Date(), 12).toISOString(), tz);
      const lookbackStr = toDateStrInTimezone(addMonths(new Date(), -12).toISOString(), tz);
      this.userEvents.forEach((row) => {
        const base = normalizeUserEvent(row, tz);
        if (!base.start) return;

        const addFn = RECURRENCE_ADD_FN[base.recurrenceRule];
        if (!base.isRecurring || !addFn) {
          events.push(base);
          return;
        }

        // Recurring series: each occurrence is anchored to the series start
        // (addFn(seriesStart, i)) so date-fns month-end clamping (Jan 31 ->
        // Feb 28) never compounds across iterations. Expansion starts at the
        // first occurrence on/after the 12-month lookback so long-running
        // series don't spend the MAX_RECURRENCE_OCCURRENCES cap on long-past
        // dates. Multi-day span (inclusive end - start) is preserved.
        const span = Math.max(
          0,
          differenceInCalendarDays(parseISO(base.end), parseISO(base.start)),
        );
        const seriesStart = parseISO(base.start);
        const lookback = parseISO(lookbackStr);
        let startIndex = 0;
        if (lookback > seriesStart) {
          if (base.recurrenceRule === 'daily') {
            startIndex = differenceInCalendarDays(lookback, seriesStart);
          } else if (base.recurrenceRule === 'weekly') {
            startIndex = differenceInCalendarWeeks(lookback, seriesStart);
          } else {
            startIndex = differenceInCalendarMonths(lookback, seriesStart);
          }
        }
        let emitted = 0;
        for (let i = startIndex; emitted < MAX_RECURRENCE_OCCURRENCES; i++) {
          const occStart = format(addFn(seriesStart, i), 'yyyy-MM-dd');
          if (occStart > horizonStr) break;
          events.push({
            ...base,
            id: `user-${row.$id}-${occStart}`,
            start: occStart,
            end: addDaysToDateStr(occStart, span),
          });
          emitted++;
        }
        // A series whose occurrences all lie beyond the horizon (e.g. starts
        // >12 months out) must still be visible and manageable in the UI.
        if (emitted === 0) {
          events.push(base);
        }
      });

      return events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    },

    /** Events of the currently checked categories only. */
    filteredEvents() {
      return this.allEvents.filter((e) => this.activeCategories.includes(e.category));
    },

    /**
     * Upcoming events across ALL categories (not affected by the calendar
     * page's filter panel): end >= today in the village timezone, soonest
     * first, deduplicated per recurring series (soonest occurrence only) so
     * a daily series can't crowd out every other event.
     * Used by the dashboard Upcoming Events widget.
     */
    upcomingEvents() {
      return (limit = 5) => {
        const tz = useSettingsStore().timezone;
        const today = toDateStrInTimezone(new Date().toISOString(), tz);
        const seenSeries = new Set();
        return this.allEvents
          .filter((e) => {
            if (e.end < today) return false;
            const seriesKey = e.sourceId || e.id;
            if (seenSeries.has(seriesKey)) return false;
            seenSeries.add(seriesKey);
            return true;
          })
          .slice(0, limit);
      };
    },
  },

  actions: {
    /**
     * Fetch all calendar data sources. Reuses the school calendar-events-store
     * and farm-store fetch actions via Promise.all.
     * Call only after client mount (SSR-safe).
     */
    async fetchAllEvents(force = false) {
      if (this.loaded && !force) {
        return { success: true };
      }
      this.loading = true;
      this.error = null;
      const eventsStore = useCalendarEventsStore();
      const farmStore = useFarmStore();
      try {
        const results = await Promise.all([
          eventsStore.fetchCalendarEvents(force),
          farmStore.fetchPlantings(),
          farmStore.fetchCrops(),
          farmStore.fetchPlots(),
          this.fetchUserEvents(),
        ]);
        // Underlying stores resolve with { success: false } instead of throwing.
        // The user-events result (last) is intentionally NON-fatal: on
        // deployments where the village_events table doesn't exist yet,
        // school/farm events must still render (fetchUserEvents already
        // notified the error itself).
        const failed = results.slice(0, 4).find((r) => !r?.success);
        if (failed) {
          throw new Error(failed.error || 'Failed to load calendar data');
        }
        this.loaded = true;
        return { success: true };
      } catch (error) {
        console.error('Error fetching village calendar events:', error);
        this.error = error.message;
        errorHandler.notifyError('Failed to load village calendar events. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * Story 5.2: Fetch all user-created village events.
     * Call only after client mount (SSR-safe).
     */
    async fetchUserEvents() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: VILLAGE_EVENTS_TABLE_ID,
          queries: [Query.limit(500), Query.orderAsc('start_date')],
        });
        this.userEvents = response.rows;
        return { success: true, data: this.userEvents };
      } catch (error) {
        console.error('Error fetching village events:', error);
        this.error = error.message;
        errorHandler.notifyError('Failed to load village events. Please try again.');
        return { success: false, error: error.message };
      }
    },

    /**
     * Build the village_events row payload from form data.
     * Dates arrive as 'YYYY-MM-DD' picker strings and are converted to ISO
     * datetimes anchored to the village timezone.
     */
    buildEventPayload(eventData) {
      const tz = useSettingsStore().timezone;
      const isAllDay = !!eventData.is_all_day;
      const isRecurring = !!eventData.is_recurring;
      return {
        title: eventData.title,
        category: eventData.category,
        start_date: datePickerToStartOfDayISO(eventData.start_date, tz),
        end_date: datePickerToEndOfDayISO(eventData.end_date || eventData.start_date, tz),
        start_time: isAllDay ? null : eventData.start_time || null,
        end_time: isAllDay ? null : eventData.end_time || null,
        is_all_day: isAllDay,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring ? eventData.recurrence_rule : null,
        location: eventData.location || '',
        description: eventData.description || '',
        notify_user_ids: eventData.notify_user_ids || [],
        system_generated: false, // always — the badge is for Farm harvest auto-events
      };
    },

    /**
     * Defense-in-depth write guards. UI gating (hasPermission/canManageEvent)
     * is the primary control; these checks mirror it in the store so direct
     * action calls can't bypass it. Note: table-level permissions are the
     * platform-wide `("any")` posture — true server-side enforcement is
     * tracked as deferred platform work.
     */
    guardCreate() {
      const authStore = useAuthStore();
      const userId = authStore.user?.$id;
      if (!userId) {
        errorHandler.notifyError('You must be signed in to manage events.');
        return null;
      }
      if (!hasPermission(authStore.user, authStore.userRoles, 'calendar:write')) {
        errorHandler.notifyError('You do not have permission to manage calendar events.');
        return null;
      }
      return userId;
    },

    guardManage(eventId) {
      const userId = this.guardCreate();
      if (!userId) return false;
      const authStore = useAuthStore();
      const row = this.userEvents.find((r) => r.$id === eventId);
      const eventLike = {
        sourceId: row?.$id || eventId,
        createdBy: row?.created_by || null,
        systemGenerated: row?.system_generated === true,
      };
      if (!canManageEvent(eventLike, userId, authStore.userRoles)) {
        errorHandler.notifyError('You do not have permission to modify this event.');
        return false;
      }
      return true;
    },

    /**
     * Story 5.2: Create a user-created village event.
     * @param {object} eventData - form payload from EventFormDialog
     */
    async createEvent(eventData) {
      const userId = this.guardCreate();
      if (!userId) {
        return { success: false, error: 'Not permitted' };
      }
      this.loading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const data = {
          ...this.buildEventPayload(eventData),
          created_by: userId,
        };
        const row = await tables.createRow({
          databaseId: dbId,
          tableId: VILLAGE_EVENTS_TABLE_ID,
          rowId: ID.unique(),
          data,
        });
        errorHandler.notifySuccess('Event created.');
        await this.fetchUserEvents();
        return { success: true, data: row };
      } catch (error) {
        console.error('Error creating village event:', error);
        errorHandler.notifyError('Failed to create event. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * Story 5.2: Update an existing village event by row ID.
     * Editing a recurring series edits all occurrences (single row).
     */
    async updateEvent(eventId, eventData) {
      if (!this.guardManage(eventId)) {
        return { success: false, error: 'Not permitted' };
      }
      this.loading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const data = this.buildEventPayload(eventData);
        const row = await tables.updateRow({
          databaseId: dbId,
          tableId: VILLAGE_EVENTS_TABLE_ID,
          rowId: eventId,
          data,
        });
        errorHandler.notifySuccess('Event updated.');
        await this.fetchUserEvents();
        return { success: true, data: row };
      } catch (error) {
        console.error('Error updating village event:', error);
        errorHandler.notifyError('Failed to update event. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /**
     * Story 5.2: Delete a village event by row ID.
     */
    async deleteEvent(eventId) {
      if (!this.guardManage(eventId)) {
        return { success: false, error: 'Not permitted' };
      }
      this.loading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: VILLAGE_EVENTS_TABLE_ID,
          rowId: eventId,
        });
        errorHandler.notifySuccess('Event deleted.');
        await this.fetchUserEvents();
        return { success: true };
      } catch (error) {
        console.error('Error deleting village event:', error);
        errorHandler.notifyError('Failed to delete event. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.loading = false;
      }
    },

    /** Check every category (Show All). */
    showAllCategories() {
      this.activeCategories = CALENDAR_CATEGORIES.map((c) => c.value);
    },

    /** Uncheck every category (Hide All). */
    hideAllCategories() {
      this.activeCategories = [];
    },

    /** Toggle a single category checkbox. */
    toggleCategory(value, active) {
      const set = new Set(this.activeCategories);
      if (active) {
        set.add(value);
      } else {
        set.delete(value);
      }
      // Preserve canonical category order.
      this.activeCategories = CALENDAR_CATEGORIES.map((c) => c.value).filter((v) => set.has(v));
    },
  },
});
