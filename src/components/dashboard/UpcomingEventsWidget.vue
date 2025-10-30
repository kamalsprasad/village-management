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
          <q-avatar :color="getEventColor(event.type)" text-color="white" :icon="getEventIcon(event.type)" />
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

        <q-item-section side>
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
      <q-btn flat color="primary" label="View All Events" icon-right="arrow_forward" size="sm" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { getEventIcon, getEventColor } from 'src/utils/placeholder-data';

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

function formatEventDate(date) {
  const eventDate = new Date(date);
  if (isToday(eventDate)) return 'Today';
  if (isTomorrow(eventDate)) return 'Tomorrow';
  
  const daysUntil = differenceInDays(eventDate, new Date());
  if (daysUntil <= 7) return `In ${daysUntil} days`;
  
  return format(eventDate, 'MMM dd, yyyy');
}
</script>

<style scoped>
.upcoming-events-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
