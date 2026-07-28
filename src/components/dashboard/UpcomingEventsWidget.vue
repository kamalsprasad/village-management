<template>
  <q-card flat bordered class="upcoming-events-widget">
    <q-card-section>
      <div class="text-h6 q-mb-sm">
        <q-icon name="event" class="q-mr-sm" />
        Upcoming Events
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <q-card-section v-if="loading">
      <q-skeleton v-for="i in 3" :key="i" type="text" class="q-mb-md" />
    </q-card-section>

    <!-- Events List -->
    <q-list v-else-if="events && events.length > 0" separator>
      <q-item v-for="event in displayEvents" :key="event.id" clickable>
        <q-item-section avatar>
          <q-avatar
            :color="getEventColor(event.type)"
            text-color="white"
            :icon="getEventIcon(event.type)"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-medium">{{ event.title }}</q-item-label>
          <q-item-label caption>
            <q-icon name="schedule" size="xs" class="q-mr-xs" />
            {{ formatEventDate(event.date) }} at {{ event.time }}
          </q-item-label>
          <q-item-label caption>
            <q-icon name="place" size="xs" class="q-mr-xs" />
            {{ event.location }}
          </q-item-label>
        </q-item-section>

        <q-item-section v-if="event.attendees != null" side>
          <q-chip size="sm" :color="getEventColor(event.type)" text-color="white" dense>
            {{ event.attendees }} attending
          </q-chip>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Empty State -->
    <q-card-section v-else class="text-center text-grey-6">
      <q-icon name="event_busy" size="3rem" class="q-mb-sm" />
      <div>No upcoming events</div>
    </q-card-section>

    <!-- View All Footer -->
    <q-separator v-if="events && events.length > maxDisplay" />
    <q-card-actions v-if="events && events.length > maxDisplay" align="center">
      <q-btn
        flat
        color="primary"
        label="View All Events"
        icon-right="arrow_forward"
        size="sm"
        :to="{ name: 'village-calendar' }"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  getEventIcon as getFallbackIcon,
  getEventColor as getFallbackColor,
} from 'src/utils/placeholder-data';
import {
  CALENDAR_CATEGORIES,
  getCalendarCategory,
} from 'src/modules/calendar/utils/calendar-categories';
import { useSettingsStore } from 'src/stores/settings-store';
import { toDateStrInTimezone, addDaysToDateStr } from 'src/utils/dateUtils';

const settingsStore = useSettingsStore();

const props = defineProps({
  events: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  maxDisplay: {
    type: Number,
    default: 5,
  },
});

const displayEvents = computed(() => {
  return props.events.slice(0, props.maxDisplay);
});

/**
 * Resolve avatar icon/color from the shared CALENDAR_CATEGORIES map (Story 5.1).
 * Falls back to the legacy placeholder lookup for unknown event types.
 */
function isCalendarCategory(type) {
  return CALENDAR_CATEGORIES.some((c) => c.value === type);
}

function getEventIcon(type) {
  return isCalendarCategory(type) ? getCalendarCategory(type).icon : getFallbackIcon(type);
}

function getEventColor(type) {
  return isCalendarCategory(type) ? getCalendarCategory(type).color : getFallbackColor(type);
}

/**
 * Relative date label in the village timezone (not the browser timezone).
 * Events arrive as 'YYYY-MM-DD' village-tz date strings from the calendar store.
 */
function formatEventDate(date) {
  const tz = settingsStore.timezone;
  const dateStr = String(date).includes('T') ? toDateStrInTimezone(date, tz) : String(date);
  const todayStr = toDateStrInTimezone(new Date().toISOString(), tz);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === addDaysToDateStr(todayStr, 1)) return 'Tomorrow';

  const daysUntil = differenceInCalendarDays(parseISO(dateStr), parseISO(todayStr));
  if (daysUntil > 1 && daysUntil <= 7) return `In ${daysUntil} days`;

  return format(parseISO(dateStr), 'MMM dd, yyyy');
}
</script>

<style scoped>
.upcoming-events-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
