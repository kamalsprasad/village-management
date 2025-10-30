<template>
  <q-card flat bordered class="recent-activity-widget">
    <q-card-section>
      <div class="text-h6 q-mb-sm">
        <q-icon name="history" class="q-mr-sm" />
        Recent Activity
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <q-card-section v-if="loading">
      <q-skeleton v-for="i in 5" :key="i" type="text" class="q-mb-md" />
    </q-card-section>

    <!-- Activity Timeline -->
    <q-timeline v-else-if="activities && activities.length > 0" color="primary" class="q-pa-md">
      <q-timeline-entry
        v-for="activity in displayActivities"
        :key="activity.id"
        :icon="activity.icon"
        :color="activity.color"
      >
        <template #subtitle>
          <div class="text-caption text-grey-7">
            {{ formatActivityTime(activity.timestamp) }} • {{ activity.module }}
          </div>
        </template>

        <div class="text-weight-medium">{{ activity.title }}</div>
        <div class="text-caption text-grey-8">{{ activity.description }}</div>
        <div class="text-caption text-grey-6 q-mt-xs">
          <q-icon name="person" size="xs" class="q-mr-xs" />
          {{ activity.user }}
        </div>
      </q-timeline-entry>
    </q-timeline>

    <!-- Empty State -->
    <q-card-section v-else class="text-center text-grey-6">
      <q-icon name="history_toggle_off" size="3rem" class="q-mb-sm" />
      <div>No recent activity</div>
    </q-card-section>

    <!-- View All Footer -->
    <q-separator v-if="activities && activities.length > maxDisplay" />
    <q-card-actions v-if="activities && activities.length > maxDisplay" align="center">
      <q-btn flat color="primary" label="View All Activity" icon-right="arrow_forward" size="sm" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { formatActivityTime } from 'src/utils/placeholder-data';

const props = defineProps({
  activities: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  maxDisplay: {
    type: Number,
    default: 8,
  },
});

const displayActivities = computed(() => {
  return props.activities.slice(0, props.maxDisplay);
});
</script>

<style scoped>
.recent-activity-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
