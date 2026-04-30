<!--
  FarmDashboardPage.vue
  Dashboard page for the Farm module with overview widgets and stats.

  Story 3.1: Farm Module - Plot Management
  Story 3.4: Planting Status Tracking and Lifecycle Management
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
            <div class="text-h4 text-weight-bold">{{ farmStore.plots.length }}</div>
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
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-6 col-lg-3">
        <PlotsOverviewWidget />
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <PlantingStatusWidget />
      </div>
      <!-- Story 3.6: Active Perennials Widget -->
      <div class="col-12 col-md-6 col-lg-3">
        <ActivePerennialsWidget />
      </div>
      <div class="col-12 col-md-6 col-lg-3">
        <RecentHarvestsWidget />
      </div>
      <!-- Story 3.7: Farm Produce Inventory Widget -->
      <div class="col-12 col-md-6 col-lg-3">
        <FarmProduceWidget />
      </div>
      <!-- Story 3.8: Recent Sales Widget -->
      <div class="col-12 col-md-6 col-lg-3">
        <RecentSalesWidget />
      </div>
      <!-- Story 3.9: Top Performing Crops Widget -->
      <div class="col-12 col-md-6">
        <TopCropsWidget />
      </div>
      <!-- Story 3.9: Plot Profitability Widget -->
      <div class="col-12 col-md-6">
        <PlotProfitabilityWidget />
      </div>
    </div>

    <!-- Harvest Alerts Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <!-- Ready for Harvest -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-expansion-item
            :default-opened="$q.screen.gt.sm"
            :header-class="readyForHarvest.length ? 'text-positive' : ''"
          >
            <template #header>
              <q-item-section avatar>
                <q-icon name="agriculture" :color="readyForHarvest.length ? 'positive' : 'grey'" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Ready for Harvest
                  <q-badge v-if="readyForHarvest.length" color="positive" class="q-ml-sm">{{
                    readyForHarvest.length
                  }}</q-badge>
                </q-item-label>
              </q-item-section>
            </template>

            <q-list separator>
              <q-item
                v-for="p in readyForHarvest"
                :key="p.$id"
                clickable
                @click="$router.push(`/farm/plantings/${p.$id}`)"
              >
                <q-item-section>
                  <q-item-label
                    >{{ getCropName(p.crop_id) }} on {{ getPlotName(p.plot_id) }}</q-item-label
                  >
                  <q-item-label caption>
                    Harvest expected {{ formatDate(p.expected_harvest_date) }}
                    <span class="text-positive">
                      · {{ getDaysLabel(p.expected_harvest_date) }}</span
                    >
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" color="grey" />
                </q-item-section>
              </q-item>
              <q-item v-if="readyForHarvest.length === 0">
                <q-item-section class="text-grey text-caption text-center q-py-sm">
                  No harvests due in the next 7 days
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
        </q-card>
      </div>

      <!-- Overdue Harvest -->
      <div class="col-12 col-md-6">
        <q-card>
          <q-expansion-item
            :default-opened="$q.screen.gt.sm"
            :header-class="overdueHarvest.length ? 'text-negative' : ''"
          >
            <template #header>
              <q-item-section avatar>
                <q-icon name="warning" :color="overdueHarvest.length ? 'negative' : 'grey'" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  Overdue Harvest
                  <q-badge v-if="overdueHarvest.length" color="negative" class="q-ml-sm">{{
                    overdueHarvest.length
                  }}</q-badge>
                </q-item-label>
              </q-item-section>
            </template>

            <q-list separator>
              <q-item
                v-for="p in overdueHarvest"
                :key="p.$id"
                clickable
                @click="$router.push(`/farm/plantings/${p.$id}`)"
              >
                <q-item-section>
                  <q-item-label
                    >{{ getCropName(p.crop_id) }} on {{ getPlotName(p.plot_id) }}</q-item-label
                  >
                  <q-item-label caption class="text-negative">
                    Was due {{ formatDate(p.expected_harvest_date) }} ·
                    {{ getOverdueLabel(p.expected_harvest_date) }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-icon name="chevron_right" color="grey" />
                </q-item-section>
              </q-item>
              <q-item v-if="overdueHarvest.length === 0">
                <q-item-section class="text-grey text-caption text-center q-py-sm">
                  No overdue harvests
                </q-item-section>
              </q-item>
            </q-list>
          </q-expansion-item>
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
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { parseISO, differenceInDays } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';
import PlotsOverviewWidget from '../components/PlotsOverviewWidget.vue';
import PlantingStatusWidget from '../components/PlantingStatusWidget.vue';
import RecentHarvestsWidget from '../components/RecentHarvestsWidget.vue';
// Story 3.6: Active Perennials Widget
import ActivePerennialsWidget from '../components/ActivePerennialsWidget.vue';
// Story 3.7: Farm Produce Inventory Widget
import FarmProduceWidget from '../components/FarmProduceWidget.vue';
// Story 3.8: Recent Sales Widget
import RecentSalesWidget from '../components/RecentSalesWidget.vue';
// Story 3.9: Profitability widgets
import TopCropsWidget from '../components/TopCropsWidget.vue';
import PlotProfitabilityWidget from '../components/PlotProfitabilityWidget.vue';

const $q = useQuasar();
const farmStore = useFarmStore();

const activePlotsCount = computed(
  () => farmStore.plots.filter((p) => p.status === 'Active').length,
);
const fallowPlotsCount = computed(
  () => farmStore.plots.filter((p) => p.status === 'Fallow').length,
);
const retiredPlotsCount = computed(
  () => farmStore.plots.filter((p) => p.status === 'Retired').length,
);

const activePlantingStatuses = ['planted', 'growing', 'harvesting'];

const readyForHarvest = computed(() => {
  const today = new Date();
  const in7 = new Date();
  in7.setDate(today.getDate() + 7);
  return farmStore.plantings.filter((p) => {
    if (!activePlantingStatuses.includes(p.status?.toLowerCase())) return false;
    if (!p.expected_harvest_date) return false;
    const d = new Date(p.expected_harvest_date);
    return d >= today && d <= in7;
  });
});

const overdueHarvest = computed(() => {
  const today = new Date();
  return farmStore.plantings.filter((p) => {
    if (!activePlantingStatuses.includes(p.status?.toLowerCase())) return false;
    if (!p.expected_harvest_date) return false;
    return new Date(p.expected_harvest_date) < today;
  });
});

function getCropName(cropId) {
  return farmStore.getCropNameById(cropId);
}

function getPlotName(plotId) {
  return farmStore.plots.find((p) => p.$id === plotId)?.name || plotId;
}

function getDaysLabel(dateString) {
  if (!dateString) return '';
  try {
    const days = differenceInDays(parseISO(dateString), new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `in ${days} days`;
  } catch {
    return '';
  }
}

function getOverdueLabel(dateString) {
  if (!dateString) return '';
  try {
    const days = Math.abs(differenceInDays(parseISO(dateString), new Date()));
    return `${days} day${days !== 1 ? 's' : ''} overdue`;
  } catch {
    return '';
  }
}

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
  {
    name: 'Reports',
    description: 'Crop profitability & ROI analysis',
    route: '/farm/reports',
    icon: 'bar_chart',
    color: 'teal',
  },
];

onMounted(async () => {
  const loaders = [];
  if (!farmStore.plotsLoaded) loaders.push(farmStore.fetchPlots());
  if (!farmStore.plantingsLoaded) loaders.push(farmStore.fetchPlantings());
  if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
  if (!farmStore.harvestsLoaded) loaders.push(farmStore.fetchHarvests());
  if (loaders.length) await Promise.all(loaders);
});
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
