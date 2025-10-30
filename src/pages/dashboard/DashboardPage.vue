<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- Welcome Banner -->
    <div class="welcome-banner q-mb-lg">
      <h4 class="text-h4 q-my-none">Welcome back, {{ userName }}</h4>
      <p class="text-subtitle1 text-grey-7 q-mt-sm q-mb-none">
        Here's what's happening in your village today
      </p>
    </div>

    <!-- Dashboard Widgets Grid -->
    <div class="row q-col-gutter-md">
      <!-- Quick Stats Widget (Full Width) -->
      <div class="col-12">
        <QuickStatsWidget :stats="quickStats" :loading="loading" />
      </div>

      <!-- Upcoming Events Widget -->
      <div class="col-12 col-md-6 col-lg-4">
        <UpcomingEventsWidget :events="upcomingEvents" :loading="loading" :max-display="5" />
      </div>

      <!-- Recent Activity Widget -->
      <div class="col-12 col-md-6 col-lg-8">
        <RecentActivityWidget :activities="recentActivity" :loading="loading" :max-display="8" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import UpcomingEventsWidget from 'src/components/dashboard/UpcomingEventsWidget.vue';
import QuickStatsWidget from 'src/components/dashboard/QuickStatsWidget.vue';
import RecentActivityWidget from 'src/components/dashboard/RecentActivityWidget.vue';
import {
  upcomingEvents as placeholderEvents,
  quickStats as placeholderStats,
  recentActivity as placeholderActivity,
} from 'src/utils/placeholder-data';

const authStore = useAuthStore();

// Loading state for skeleton loaders
const loading = ref(true);

// Widget data (using placeholder data for MVP)
const upcomingEvents = ref([]);
const quickStats = ref(null);
const recentActivity = ref([]);

// User name from auth store
const userName = computed(() => {
  return authStore.user?.name || 'User';
});

// Simulate data loading on mount
onMounted(async () => {
  // Defer data loading to avoid blocking initial render
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Load placeholder data (will be replaced with real API calls in future stories)
  upcomingEvents.value = placeholderEvents;
  quickStats.value = placeholderStats;
  recentActivity.value = placeholderActivity;

  loading.value = false;
});
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
}

.welcome-banner {
  padding: 1rem 0;
}

@media (max-width: 599px) {
  .welcome-banner h4 {
    font-size: 1.5rem;
  }
}
</style>
