<!-- Farm Index Page - Landing page for Farm module -->
<!-- Story 3.1: Farm Module - Plot Management -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h5 class="q-my-none">Farm Management</h5>
        <p class="text-grey q-mt-xs q-mb-none">Manage plots, crops, plantings, and harvests</p>
      </div>
      <q-btn
        v-if="hasFarmManagerRole"
        color="primary"
        icon="add"
        label="New Planting"
        @click="showNewPlantingDialog"
      />
    </div>

    <!-- Quick Stats Row -->
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
            <div class="text-caption text-grey">Active Plantings</div>
            <div class="text-h4 text-weight-bold text-positive">{{ stats.activePlantings }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Ready for Harvest</div>
            <div class="text-h4 text-weight-bold text-warning">{{ stats.readyForHarvest }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">This Month's Sales</div>
            <div class="text-h4 text-weight-bold text-primary">
              {{ formatCurrency(stats.monthlySales) }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Widget Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <PlotsOverviewWidget />
      </div>
    </div>

    <!-- Module Navigation -->
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
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFarmStore } from './stores/farm-store';
import PlotsOverviewWidget from './components/PlotsOverviewWidget.vue';

const $q = useQuasar();
const farmStore = useFarmStore();

const stats = ref({
  totalPlots: 0,
  activePlantings: 0,
  readyForHarvest: 0,
  monthlySales: 0,
});

const hasFarmManagerRole = computed(() => {
  // Check user roles
  return true; // TODO: Implement proper role check
});

const moduleLinks = [
  {
    name: 'Plots',
    description: 'Manage farm plots and assignments',
    route: '/farm/plots',
    icon: 'grid_on',
    color: 'green',
  },
  {
    name: 'Plantings',
    description: "Track what's planted and growing",
    route: '/farm/plantings',
    icon: 'spa',
    color: 'green-7',
  },
  {
    name: 'Harvests',
    description: 'Record and track harvests',
    route: '/farm/harvests',
    icon: 'agriculture',
    color: 'orange',
  },
  {
    name: 'Sales',
    description: 'Farm produce sales and revenue',
    route: '/farm/sales',
    icon: 'point_of_sale',
    color: 'blue',
  },
];

function formatCurrency(value) {
  return 'ZMW ' + (value || 0).toLocaleString();
}

function showNewPlantingDialog() {
  $q.dialog({
    title: 'New Planting',
    message: 'Planting form will be implemented in Story 3.3',
    ok: true,
  });
}

onMounted(async () => {
  // Load initial stats
  await farmStore.fetchStats();
  stats.value = farmStore.stats;
});
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
