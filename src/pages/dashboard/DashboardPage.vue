<template>
  <q-page class="dashboard-page q-pa-md">
    <!-- Welcome Banner -->
    <div class="welcome-banner q-mb-lg">
      <h4 class="text-h4 q-my-none">Welcome back, {{ isClient ? userName : 'User' }}</h4>
      <p class="text-subtitle1 text-grey-7 q-mt-sm q-mb-none">
        Here's what's happening in {{ settingsStore.villageName }} today
      </p>
    </div>

    <!-- Dashboard Widgets Grid -->
    <div class="row q-col-gutter-md">
      <!-- Quick Stats Widget (Full Width) -->
      <div class="col-12">
        <QuickStatsWidget :stats="quickStats" :loading="loading" />
      </div>

      <!-- Community Overview Widget -->
      <div class="col-12 col-md-6">
        <CommunityOverviewWidget />
      </div>

      <!-- Upcoming Events Widget -->
      <div class="col-12 col-md-6 col-lg-4">
        <UpcomingEventsWidget :events="upcomingEvents" :loading="eventsLoading" :max-display="5" />
      </div>

      <!-- Recent Activity Widget -->
      <div class="col-12 col-md-6 col-lg-8">
        <RecentActivityWidget :activities="recentActivity" :loading="loading" :max-display="8" />
      </div>

      <!-- Households Widget -->
      <div class="col-12 col-md-6 col-lg-4">
        <HouseholdsWidget />
      </div>

      <!-- Finance Summary Widget (only for users with finance:read permission) -->
      <div v-if="isClient && hasPermission('finance:read')" class="col-12 col-md-6 col-lg-4">
        <FinanceSummaryWidget />
      </div>

      <!-- Vendors Summary Widget (Story 5.7; only when module enabled + vendors:read) -->
      <div
        v-if="isClient && hasPermission('vendors:read') && settingsStore.vendorsEnabled"
        class="col-12 col-md-6 col-lg-4"
      >
        <VendorsSummaryWidget />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useCalendarStore } from 'src/modules/calendar/stores/calendar-store';
import { getCalendarCategory } from 'src/modules/calendar/utils/calendar-categories';
import UpcomingEventsWidget from 'src/components/dashboard/UpcomingEventsWidget.vue';
import QuickStatsWidget from 'src/components/dashboard/QuickStatsWidget.vue';
import RecentActivityWidget from 'src/components/dashboard/RecentActivityWidget.vue';
import HouseholdsWidget from 'src/components/dashboard/HouseholdsWidget.vue';
import CommunityOverviewWidget from 'src/components/dashboard/CommunityOverviewWidget.vue';
import FinanceSummaryWidget from 'src/components/dashboard/FinanceSummaryWidget.vue';
import VendorsSummaryWidget from 'src/modules/vendors/components/VendorsSummaryWidget.vue';
import { usePermissions } from 'src/composables/usePermissions';
import {
  quickStats as placeholderStats,
  recentActivity as placeholderActivity,
} from 'src/utils/placeholder-data';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const calendarStore = useCalendarStore();
const { hasPermission } = usePermissions();

// Loading state for skeleton loaders
const loading = ref(true);
const isClient = ref(false); // Track client-side hydration for SSR

// Upcoming Events widget — real data from the village calendar store (Story 5.1),
// mapped to the widget's item shape { id, title, date, time, location, type }.
const eventsLoading = computed(() => isClient.value && calendarStore.loading);
const upcomingEvents = computed(() =>
  calendarStore.upcomingEvents(5).map((evt) => ({
    id: evt.id,
    title: evt.title,
    date: evt.start,
    time: evt.isAllDay ? null : evt.startTime,
    location: evt.location || getCalendarCategory(evt.category).label,
    type: evt.category,
  })),
);

// Widget data (using placeholder data for MVP)
const quickStats = ref(null);
const recentActivity = ref([]);

// User name from auth store
const userName = computed(() => {
  return authStore.user?.name || 'User';
});

// Simulate data loading on mount
onMounted(async () => {
  isClient.value = true; // Enable client-side rendering after hydration

  // Defer data loading to avoid blocking initial render
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Fetch real calendar events (client-side only, guarded by isClient above)
  calendarStore.fetchAllEvents();

  // Load placeholder data (will be replaced with real API calls in future stories)
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
