/**
 * Village Calendar Store (Story 5.1)
 *
 * Read-only aggregation store for the global village calendar. Composes
 * existing data sources — it does NOT duplicate fetch logic:
 * - School calendar events (school calendar-events-store, table school_calendar_events)
 * - Farm expected-harvest auto-events (farm-store, table plantings + crops/plots
 *   for name resolution)
 *
 * All events are normalized to a unified shape:
 *   { id, title, start, end, category, systemGenerated, description, location }
 * where start/end are 'YYYY-MM-DD' calendar date strings in the village timezone
 * (inclusive end; consumers rendering to vue-cal add +1 day for its exclusive end).
 *
 * Farm harvest auto-events are only emitted for plantings with status in
 * planted|growing|harvesting and a non-null expected_harvest_date. They are
 * marked systemGenerated: true ("System Generated" badge in the UI).
 *
 * Filter state (activeCategories) is session-scoped — plain state, never
 * persisted, resets on reload.
 */

import { defineStore } from 'pinia';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useSettingsStore } from 'src/stores/settings-store';
import { useCalendarEventsStore } from 'src/modules/school/stores/calendar-events-store';
import { useFarmStore } from 'src/modules/farm/stores/farm-store';
import { toDateStrInTimezone } from 'src/utils/dateUtils';
import { CALENDAR_CATEGORIES } from '../utils/calendar-categories';

const errorHandler = useErrorHandler();

/** Planting statuses that produce an "Expected Harvest" auto-event. */
const HARVEST_EVENT_STATUSES = ['planted', 'growing', 'harvesting'];

/** Relationship columns can arrive as expanded objects or plain IDs. */
function relationId(value) {
  return typeof value === 'object' && value !== null ? value.$id : value;
}

export const useCalendarStore = defineStore('villageCalendar', {
  state: () => ({
    loading: false,
    error: null,
    loaded: false,
    // Session-scoped category filter — initialized to all 7 categories.
    activeCategories: CALENDAR_CATEGORIES.map((c) => c.value),
  }),

  getters: {
    /**
     * All events from every source, normalized to the unified shape and
     * sorted by start date. Story 5.2 user-created events will slot in here
     * as additional entries.
     */
    allEvents: () => {
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

      return events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    },

    /** Events of the currently checked categories only. */
    filteredEvents() {
      return this.allEvents.filter((e) => this.activeCategories.includes(e.category));
    },

    /**
     * Upcoming events across ALL categories (not affected by the calendar
     * page's filter panel): end >= today in the village timezone, soonest first.
     * Used by the dashboard Upcoming Events widget.
     */
    upcomingEvents() {
      return (limit = 5) => {
        const tz = useSettingsStore().timezone;
        const today = toDateStrInTimezone(new Date().toISOString(), tz);
        return this.allEvents.filter((e) => e.end >= today).slice(0, limit);
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
        ]);
        // Underlying stores resolve with { success: false } instead of throwing.
        const failed = results.find((r) => !r?.success);
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
