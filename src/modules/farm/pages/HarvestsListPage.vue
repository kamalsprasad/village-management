<!--
  HarvestsListPage.vue
  List page showing all harvests with filters and search functionality.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h5 class="q-my-none">Harvests</h5>
        <p class="text-grey q-mt-xs q-mb-none">Manage and view all harvest records</p>
      </div>
      <q-btn
        v-if="canWrite"
        color="primary"
        icon="add"
        label="New Harvest"
        @click="goToNewHarvest"
      />
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="q-pa-md">
        <div class="row q-col-gutter-md">
          <!-- Date Range Filter -->
          <div class="col-12 col-sm-6 col-md-3">
            <q-date v-model="filters.dateFrom" label="From Date" clearable max-date="today" />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-date v-model="filters.dateTo" label="To Date" clearable max-date="today" />
          </div>

          <!-- Crop Filter -->
          <div class="col-12 col-sm-6 col-md-2">
            <q-select
              v-model="filters.cropId"
              :options="cropOptions"
              label="Crop"
              clearable
              emit-value
              map-options
              options-dense
            />
          </div>

          <!-- Plot Filter -->
          <div class="col-12 col-sm-6 col-md-2">
            <q-select
              v-model="filters.plotId"
              :options="plotOptions"
              label="Plot"
              clearable
              emit-value
              map-options
              options-dense
            />
          </div>

          <!-- Status Filter -->
          <div class="col-12 col-sm-6 col-md-2">
            <q-select
              v-model="filters.status"
              :options="statusOptions"
              label="Status"
              clearable
              emit-value
              map-options
              options-dense
            />
          </div>
        </div>

        <!-- Filter Actions -->
        <div class="row q-mt-md">
          <div class="col-12">
            <div class="row q-gutter-sm">
              <q-btn
                color="primary"
                label="Apply Filters"
                @click="applyFilters"
                :loading="loading"
              />
              <q-btn outline label="Clear Filters" @click="clearFilters" />
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary Stats -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="text-center">
          <q-card-section class="q-pa-md">
            <div class="text-h4 text-primary">{{ totalHarvests }}</div>
            <div class="text-caption text-grey-7">Total Harvests</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="text-center">
          <q-card-section class="q-pa-md">
            <div class="text-h4 text-orange">{{ inProgressCount }}</div>
            <div class="text-caption text-grey-7">In Progress</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="text-center">
          <q-card-section class="q-pa-md">
            <div class="text-h4 text-green">{{ completedCount }}</div>
            <div class="text-caption text-grey-7">Completed</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="text-center">
          <q-card-section class="q-pa-md">
            <div class="text-h4 text-blue-grey">{{ totalQuantity }}</div>
            <div class="text-caption text-grey-7">Total Quantity (kg)</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Harvests List -->
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-subtitle1 text-weight-medium">
            Harvest Records ({{ filteredHarvests.length }})
          </div>
          <q-btn
            v-if="inProgressCount > 0"
            size="sm"
            color="orange"
            icon="pending"
            :label="`${inProgressCount} In Progress`"
            @click="filterInProgress"
          />
        </div>
      </q-card-section>

      <q-separator />

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner-dots size="50px" color="primary" />
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredHarvests.length === 0" class="text-center text-grey-6 q-pa-xl">
        <q-icon name="agriculture" size="3em" class="q-mb-md" />
        <div class="text-h6">No harvests found</div>
        <div class="text-body2 q-mt-sm">
          {{
            hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Start by recording your first harvest'
          }}
        </div>
        <q-btn
          v-if="!hasActiveFilters && canWrite"
          color="primary"
          label="Record First Harvest"
          class="q-mt-md"
          @click="goToNewHarvest"
        />
      </div>

      <!-- Harvests Table -->
      <q-table
        v-else
        :rows="filteredHarvests"
        :columns="columns"
        row-key="$id"
        flat
        bordered
        :pagination="{ rowsPerPage: 25 }"
        @row-click="onRowClick"
      >
        <!-- Date Column -->
        <template #body-cell-date="props">
          <q-td :props="props">
            {{ getHarvestDateDisplay(props.row) }}
          </q-td>
        </template>

        <!-- Crop Column -->
        <template #body-cell-crop="props">
          <q-td :props="props">
            {{ getCropName(props.row.planting_id) }}
          </q-td>
        </template>

        <!-- Plot Column -->
        <template #body-cell-plot="props">
          <q-td :props="props">
            {{ getPlotName(props.row.planting_id) }}
          </q-td>
        </template>

        <!-- Type Column -->
        <template #body-cell-type="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.harvest_type === 'Single Day' ? 'blue' : 'purple'"
              text-color="white"
              size="sm"
            >
              {{ props.row.harvest_type }}
            </q-chip>
          </q-td>
        </template>

        <!-- Quantity Column -->
        <template #body-cell-quantity="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.total_quantity_kg }} kg</div>
          </q-td>
        </template>

        <!-- Status Column -->
        <template #body-cell-status="props">
          <q-td :props="props">
            <HarvestStatusBadge :status="props.row.status" />
          </q-td>
        </template>

        <!-- Actions Column -->
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn
              flat
              dense
              color="primary"
              icon="visibility"
              @click.stop="viewHarvest(props.row.$id)"
            >
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import { format, parseISO } from 'date-fns';

// Components
import HarvestStatusBadge from '../components/HarvestStatusBadge.vue';

const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const { canWrite } = usePermissions();

// State
const loading = ref(false);
const filters = ref({
  dateFrom: null,
  dateTo: null,
  cropId: null,
  plotId: null,
  status: null,
});

// Table columns
const columns = [
  {
    name: 'date',
    label: 'Harvest Date',
    field: 'harvest_date',
    align: 'left',
    sortable: true,
  },
  {
    name: 'crop',
    label: 'Crop',
    field: 'crop_id',
    align: 'left',
    sortable: false,
  },
  {
    name: 'plot',
    label: 'Plot',
    field: 'plot_id',
    align: 'left',
    sortable: false,
  },
  {
    name: 'type',
    label: 'Type',
    field: 'harvest_type',
    align: 'left',
    sortable: true,
  },
  {
    name: 'quantity',
    label: 'Total Quantity',
    field: 'total_quantity_kg',
    align: 'right',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'center',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'center',
    sortable: false,
  },
];

// Computed
const harvests = computed(() => farmStore.harvests);

const filteredHarvests = computed(() => {
  let filtered = [...harvests.value];

  // Date range filter
  if (filters.value.dateFrom || filters.value.dateTo) {
    filtered = filtered.filter((harvest) => {
      const harvestDate = getHarvestDate(harvest);

      if (filters.value.dateFrom && harvestDate < parseISO(filters.value.dateFrom)) {
        return false;
      }

      if (filters.value.dateTo && harvestDate > parseISO(filters.value.dateTo)) {
        return false;
      }

      return true;
    });
  }

  // Crop filter
  if (filters.value.cropId) {
    filtered = filtered.filter((harvest) => {
      const planting = farmStore.plantings.find((p) => p.$id === harvest.planting_id);
      return planting?.crop_id === filters.value.cropId;
    });
  }

  // Plot filter
  if (filters.value.plotId) {
    filtered = filtered.filter((harvest) => {
      const planting = farmStore.plantings.find((p) => p.$id === harvest.planting_id);
      return planting?.plot_id === filters.value.plotId;
    });
  }

  // Status filter
  if (filters.value.status) {
    filtered = filtered.filter((harvest) => harvest.status === filters.value.status);
  }

  return filtered;
});

const hasActiveFilters = computed(() => {
  return Object.values(filters.value).some((value) => value !== null);
});

// Filter options
const cropOptions = computed(() => {
  return farmStore.activeCrops.map((crop) => ({
    label: crop.crop_name,
    value: crop.$id,
  }));
});

const plotOptions = computed(() => {
  return farmStore.plots.map((plot) => ({
    label: plot.name,
    value: plot.$id,
  }));
});

const statusOptions = [
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Completed', value: 'Completed' },
];

// Summary stats
const totalHarvests = computed(() => filteredHarvests.value.length);

const inProgressCount = computed(() => {
  return filteredHarvests.value.filter((h) => h.status === 'In Progress').length;
});

const completedCount = computed(() => {
  return filteredHarvests.value.filter((h) => h.status === 'Completed').length;
});

const totalQuantity = computed(() => {
  return filteredHarvests.value
    .reduce((total, harvest) => {
      return total + (parseFloat(harvest.total_quantity_kg) || 0);
    }, 0)
    .toFixed(0);
});

// Load data
async function loadData() {
  try {
    loading.value = true;

    // Load all necessary data in parallel
    const loaders = [];
    if (!farmStore.harvestsLoaded) loaders.push(farmStore.fetchHarvests());
    if (!farmStore.plantingsLoaded) loaders.push(farmStore.fetchPlantings());
    if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
    if (!farmStore.plotsLoaded) loaders.push(farmStore.fetchPlots());

    await Promise.all(loaders);
  } catch (error) {
    console.error('Error loading harvests:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load harvests data',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

// Filter functions
function applyFilters() {
  // Filters are reactive, just trigger a notification
  $q.notify({
    type: 'positive',
    message: 'Filters applied',
    position: 'top',
  });
}

function clearFilters() {
  filters.value = {
    dateFrom: null,
    dateTo: null,
    cropId: null,
    plotId: null,
    status: null,
  };
}

function filterInProgress() {
  filters.value.status = 'In Progress';
}

// Navigation functions
function goToNewHarvest() {
  // Navigate to plantings list so user can select which planting to harvest
  router.push('/farm/plantings');
}

function viewHarvest(harvestId) {
  router.push(`/farm/harvests/${harvestId}`);
}

function onRowClick(evt, row) {
  viewHarvest(row.$id);
}

// Helper functions
function getHarvestDate(harvest) {
  if (harvest.harvest_type === 'Single Day') {
    return parseISO(harvest.harvest_date);
  } else {
    return parseISO(harvest.harvest_start_date);
  }
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

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
}

// Initialize
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.q-page {
  max-width: 1400px;
  margin: 0 auto;
}

.q-table :deep(.q-table tbody tr) {
  cursor: pointer;
}

.q-table :deep(.q-table tbody tr:hover) {
  background-color: #f5f5f5;
}
</style>
