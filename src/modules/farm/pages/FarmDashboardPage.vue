<!--
  FarmDashboardPage.vue
  Dashboard page for the Farm module with overview widgets and stats.
  
  Story 3.1: Farm Module - Plot Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h5 class="q-my-none">Farm Dashboard</h5>
        <p class="text-grey q-mt-xs q-mb-none">Overview of farm operations and metrics</p>
      </div>
      <q-btn
        color="primary"
        icon="grid_on"
        label="View Plots"
        @click="$router.push('/farm/plots')"
      />
    </div>

    <!-- Stats Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Total Plots</div>
            <div class="text-h4 text-weight-bold">{{ stats.totalPlots }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Active Plots</div>
            <div class="text-h4 text-weight-bold text-positive">{{ activePlotsCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Fallow Plots</div>
            <div class="text-h4 text-weight-bold text-warning">{{ fallowPlotsCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Retired Plots</div>
            <div class="text-h4 text-weight-bold text-grey">{{ retiredPlotsCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Widgets Row -->
    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <PlotsOverviewWidget />
      </div>
      <!-- Future widgets can be added here -->
      <div class="col-12 col-md-6">
        <q-card class="full-height" style="min-height: 300px">
          <q-card-section class="text-center text-grey flex flex-center" style="height: 100%">
            <div>
              <q-icon name="agriculture" size="3em" class="q-mb-md" />
              <div>More dashboard widgets coming in future stories</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Module Navigation -->
    <div class="q-mt-lg">
      <div class="text-subtitle1 text-weight-medium q-mb-md">Quick Navigation</div>
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-6 col-lg-3" v-for="link in moduleLinks" :key="link.name">
          <q-card
            class="cursor-pointer hover-shadow"
            bordered
            clickable
            @click="$router.push(link.route)"
          >
            <q-card-section class="row items-center">
              <q-icon :name="link.icon" size="2rem" class="q-mr-md" :color="link.color" />
              <div>
                <div class="text-subtitle1 text-weight-medium">{{ link.name }}</div>
                <div class="text-caption text-grey">{{ link.description }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import PlotsOverviewWidget from '../components/PlotsOverviewWidget.vue';

const farmStore = useFarmStore();

const stats = computed(() => ({
  totalPlots: farmStore.plots.length,
}));

const activePlotsCount = computed(() => {
  return farmStore.plots.filter(p => p.status === 'Active').length;
});

const fallowPlotsCount = computed(() => {
  return farmStore.plots.filter(p => p.status === 'Fallow').length;
});

const retiredPlotsCount = computed(() => {
  return farmStore.plots.filter(p => p.status === 'Retired').length;
});

const moduleLinks = [
  {
    name: 'Plots',
    description: 'Manage farm plots and assignments',
    route: '/farm/plots',
    icon: 'grid_on',
    color: 'green'
  },
  {
    name: 'Plantings',
    description: 'Track what\'s planted and growing',
    route: '/farm/plantings',
    icon: 'spa',
    color: 'green-7'
  },
  {
    name: 'Harvests',
    description: 'Record and track harvests',
    route: '/farm/harvests',
    icon: 'agriculture',
    color: 'orange'
  },
  {
    name: 'Sales',
    description: 'Farm produce sales and revenue',
    route: '/farm/sales',
    icon: 'point_of_sale',
    color: 'blue'
  }
];

onMounted(async () => {
  if (!farmStore.plotsLoaded) {
    await farmStore.fetchPlots();
  }
});
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
