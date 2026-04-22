<!--
  RecentHarvestsWidget.vue
  Dashboard widget showing recent harvests and in-progress count.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-card flat bordered class="recent-harvests-widget">
    <q-card-section class="row items-center justify-between q-pa-md">
      <div class="text-subtitle1 text-weight-medium">Recent Harvests</div>
      <div class="row items-center q-gutter-sm">
        <q-badge
          v-if="inProgressCount > 0"
          color="orange"
          class="cursor-pointer"
          @click="goToInProgressHarvests"
        >
          <q-icon name="pending" class="q-mr-xs" />
          {{ inProgressCount }} In Progress
        </q-badge>
        <q-btn flat dense color="primary" icon="refresh" @click="refreshData" :loading="loading">
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <!-- Empty State -->
    <q-card-section v-else-if="recentHarvests.length === 0" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="agriculture" size="2em" class="q-mb-sm" />
      <div class="text-body1">No harvests recorded yet</div>
      <div class="text-caption">Start by recording your first harvest</div>
    </q-card-section>

    <!-- Recent Harvests List -->
    <q-list v-else separator>
      <q-item
        v-for="harvest in recentHarvests"
        :key="harvest.$id"
        clickable
        @click="goToHarvest(harvest.$id)"
        class="harvest-item"
      >
        <q-item-section>
          <div class="text-weight-medium">{{ getCropName(harvest.planting_id) }}</div>
          <div class="text-caption text-grey-7">
            {{ getPlotName(harvest.planting_id) }} | {{ getHarvestDateDisplay(harvest) }}
          </div>
        </q-item-section>
        <q-item-section side>
          <div class="text-right">
            <div class="text-weight-medium">{{ harvest.total_quantity_kg }} kg</div>
            <HarvestStatusBadge :status="harvest.status" size="sm" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Footer Actions -->
    <q-card-actions align="right" class="q-pa-md">
      <q-btn flat color="primary" label="View All" @click="goToHarvestsList" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { formatDate } from 'src/utils/dateUtils';

// Components
import HarvestStatusBadge from './HarvestStatusBadge.vue';

const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();

// State
const loading = ref(false);

// Computed
const recentHarvests = computed(() => {
  return farmStore.recentHarvests;
});

const inProgressCount = computed(() => {
  return farmStore.inProgressHarvests.length;
});

// Load data
async function loadData() {
  try {
    loading.value = true;

    // Load harvests if not already loaded
    if (!farmStore.harvestsLoaded) {
      await farmStore.fetchHarvests();
    }

    // Also ensure plantings, crops, and plots are loaded for display names
    const loaders = [];
    if (!farmStore.plantingsLoaded) loaders.push(farmStore.fetchPlantings());
    if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
    if (!farmStore.plotsLoaded) loaders.push(farmStore.fetchPlots());

    if (loaders.length > 0) {
      await Promise.all(loaders);
    }
  } catch (error) {
    console.error('Error loading recent harvests:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load harvest data',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

function refreshData() {
  loadData();
}

// Navigation functions
function goToHarvest(harvestId) {
  router.push(`/farm/harvests/${harvestId}`);
}

function goToHarvestsList() {
  router.push('/farm/harvests');
}

function goToInProgressHarvests() {
  router.push('/farm/harvests');
  // The list page will automatically filter to show in-progress harvests
}

// Helper functions
function getCropName(plantingId) {
  const planting = farmStore.plantings.find((p) => p.$id === plantingId);
  return planting ? farmStore.getCropNameById(planting.crop_id) : 'Unknown';
}

function getPlotName(plantingId) {
  const planting = farmStore.plantings.find((p) => p.$id === plantingId);
  if (!planting) return 'Unknown';
  const plot = farmStore.plots.find((p) => p.$id === planting.plot_id);
  return plot?.name || 'Unknown';
}

function getHarvestDateDisplay(harvest) {
  if (harvest.harvest_type === 'Single Day') {
    return formatDate(harvest.harvest_date);
  } else {
    const start = formatDate(harvest.harvest_start_date);
    const end = harvest.harvest_end_date ? formatDate(harvest.harvest_end_date) : 'Ongoing';
    return `${start} - ${end}`;
  }
}

// Initialize
onMounted(() => {
  loadData();
});

// Expose refresh method for parent components
defineExpose({
  refresh: refreshData,
});
</script>

<style scoped>
.recent-harvests-widget {
  height: 100%;
  min-height: 300px;
}

.harvest-item:hover {
  background-color: #f5f5f5;
}

.harvest-item :deep(.q-item__section--avatar) {
  min-width: auto;
}

.harvest-item :deep(.q-item__section--side) {
  min-width: 80px;
}

.text-caption {
  font-size: 11px;
}
</style>
