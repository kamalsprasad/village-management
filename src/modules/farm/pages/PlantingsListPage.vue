<!--
  PlantingsListPage.vue
  List page for all planting records with filtering.

  Story 3.3: Farm Module - Planting Records
  Story 3.4: Planting Status Tracking and Lifecycle Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="text-h5 q-my-none">Plantings</h4>
        <p class="text-grey-7 q-mb-none">
          {{ activePlantingsCount }} active
          <span v-if="overdueCount" class="text-negative"> · {{ overdueCount }} overdue </span>
        </p>
      </div>
      <q-btn
        v-if="canWrite"
        color="positive"
        icon="add"
        label="Record Planting"
        @click="openPlotSelector"
      />
    </div>

    <!-- Plot Selector Dialog -->
    <q-dialog v-model="plotSelectorOpen" persistent>
      <q-card style="min-width: 340px">
        <q-card-section>
          <div class="text-h6">Select a Plot</div>
          <div class="text-grey text-caption">Choose the plot to record a planting for</div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="selectedPlotId"
            :options="plotOptions"
            option-value="$id"
            option-label="name"
            emit-value
            map-options
            label="Plot *"
            outlined
            autofocus
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            label="Continue"
            :disable="!selectedPlotId"
            @click="navigateToCreatePlanting"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Filters -->
    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-3">
            <q-select
              v-model="filters.plotId"
              :options="plotOptions"
              option-value="$id"
              option-label="name"
              emit-value
              map-options
              label="Filter by Plot"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filters.cropId"
              :options="cropOptions"
              option-value="$id"
              option-label="crop_name"
              emit-value
              map-options
              label="Filter by Crop"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-3">
            <q-select
              v-model="filters.status"
              :options="statusOptions"
              label="Filter by Status"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-3 text-right">
            <q-btn flat icon="clear" label="Clear Filters" @click="clearFilters" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Plantings Table -->
    <q-card>
      <q-table
        :rows="filteredPlantings"
        :columns="columns"
        row-key="$id"
        :loading="farmStore.isPlantingsLoading || loading"
        :pagination="pagination"
        @row-click="(evt, row) => viewPlanting(row)"
      >
        <!-- Loading state -->
        <template #loading>
          <q-inner-loading showing>
            <q-spinner-dots size="50px" color="primary" />
          </q-inner-loading>
        </template>

        <!-- Custom column renderers -->
        <template #body-cell-plot="{ row }">
          <q-td>
            <router-link :to="`/farm/plots/${row.plot_id}`" class="text-primary">
              {{ getPlotName(row.plot_id) }}
            </router-link>
          </q-td>
        </template>

        <template #body-cell-crop="{ row }">
          <q-td>
            <router-link :to="`/farm/crops/${row.crop_id}`" class="text-primary">
              {{ getCropName(row.crop_id) }}
            </router-link>
          </q-td>
        </template>

        <template #body-cell-status="{ row }">
          <q-td>
            <q-badge :color="getStatusColor(row.status)">{{ row.status }}</q-badge>
          </q-td>
        </template>

        <template #body-cell-investment="{ row }">
          <q-td class="text-right"> ZMW {{ calculateInvestment(row).toFixed(2) }} </q-td>
        </template>

        <template #body-cell-actions="{ row }">
          <q-td class="text-center">
            <q-btn flat dense icon="visibility" color="primary" @click.stop="viewPlanting(row)">
              <q-tooltip>View Details</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canWrite"
              flat
              dense
              icon="swap_horiz"
              color="primary"
              :disable="isTerminal(row.status)"
              @click.stop="openStatusDialog(row)"
            >
              <q-tooltip>{{
                isTerminal(row.status) ? 'No further status changes' : 'Update Status'
              }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <!-- Empty state -->
        <template #no-data>
          <div class="text-center q-pa-lg text-grey">
            <q-icon name="spa" size="3em" class="q-mb-md" />
            <div class="text-h6">No plantings found</div>
            <div class="q-mt-sm">
              <span v-if="hasActiveFilters">Try adjusting your filters</span>
              <span v-else>Start by recording a planting from a plot detail page</span>
            </div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Update Status Dialog -->
    <UpdateStatusDialog
      v-model="statusDialogOpen"
      :planting-id="statusDialogTarget?.$id || ''"
      :current-status="statusDialogTarget?.status || ''"
      @updated="onStatusUpdated"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { formatDate } from 'src/utils/dateUtils';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import UpdateStatusDialog from '../components/UpdateStatusDialog.vue';

const router = useRouter();
const farmStore = useFarmStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('farm:write'));

// Plot selector dialog state
const plotSelectorOpen = ref(false);
const selectedPlotId = ref(null);

// Status dialog state
const statusDialogOpen = ref(false);
const statusDialogTarget = ref(null);

// Filters
const filters = ref({
  plotId: null,
  cropId: null,
  status: null,
});

// Loading state (covers the sequential onMounted fetches)
const loading = ref(true);

const statusOptions = ['planted', 'growing', 'harvesting', 'completed', 'failed'];

const pagination = ref({
  rowsPerPage: 25,
});

const columns = [
  { name: 'plot', label: 'Plot', field: 'plot_id', align: 'left', sortable: true },
  { name: 'crop', label: 'Crop', field: 'crop_id', align: 'left', sortable: true },
  {
    name: 'planting_date',
    label: 'Planting Date',
    field: 'planting_date',
    align: 'left',
    sortable: true,
    format: (val) => formatDate(val),
  },
  {
    name: 'expected_harvest',
    label: 'Expected Harvest',
    field: 'expected_harvest_date',
    align: 'left',
    sortable: true,
    format: (val) => formatDate(val),
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  {
    name: 'investment',
    label: 'Investment',
    field: (row) => calculateInvestment(row),
    align: 'right',
    sortable: true,
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
];

// Computed
const plotOptions = computed(() => {
  return farmStore.plots;
});

const cropOptions = computed(() => {
  return farmStore.crops;
});

const hasActiveFilters = computed(() => {
  return filters.value.plotId || filters.value.cropId || filters.value.status;
});

const activePlantingsCount = computed(() => {
  return farmStore.plantings.filter((p) =>
    ['planted', 'growing', 'harvesting'].includes(p.status?.toLowerCase()),
  ).length;
});

const overdueCount = computed(() => {
  const today = new Date();
  return farmStore.plantings.filter((p) => {
    if (!['planted', 'growing', 'harvesting'].includes(p.status?.toLowerCase())) return false;
    if (!p.expected_harvest_date) return false;
    return new Date(p.expected_harvest_date) < today;
  }).length;
});

const filteredPlantings = computed(() => {
  return farmStore.plantings.filter((planting) => {
    if (filters.value.plotId && planting.plot_id !== filters.value.plotId) return false;
    if (filters.value.cropId && planting.crop_id !== filters.value.cropId) return false;
    if (filters.value.status && planting.status?.toLowerCase() !== filters.value.status)
      return false;
    return true;
  });
});

onMounted(async () => {
  loading.value = true;
  try {
    // Load plantings
    if (!farmStore.plantingsLoaded) {
      await farmStore.fetchPlantings();
    }
    // Load supporting data
    if (!farmStore.plotsLoaded) {
      await farmStore.fetchPlots();
    }
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops();
    }
  } finally {
    loading.value = false;
  }
});

function getPlotName(plotId) {
  const plot = farmStore.plots.find((p) => p.$id === plotId);
  return plot?.name || plotId;
}

function getCropName(cropId) {
  return farmStore.getCropNameById(cropId);
}

function getStatusColor(status) {
  const key = status?.toLowerCase();
  const colors = {
    planted: 'info',
    growing: 'positive',
    harvesting: 'warning',
    completed: 'positive',
    failed: 'negative',
  };
  return colors[key] || 'grey';
}

function calculateInvestment(planting) {
  return (planting.inputs_cost || 0) + (planting.labor_cost || 0) + (planting.other_cost || 0);
}

function openPlotSelector() {
  selectedPlotId.value = null;
  plotSelectorOpen.value = true;
}

function navigateToCreatePlanting() {
  if (!selectedPlotId.value) return;
  plotSelectorOpen.value = false;
  router.push(`/farm/plots/${selectedPlotId.value}/plantings/new`);
}

function viewPlanting(planting) {
  router.push(`/farm/plantings/${planting.$id}`);
}

function isTerminal(status) {
  const s = status?.toLowerCase();
  return s === 'completed' || s === 'failed';
}

function openStatusDialog(planting) {
  statusDialogTarget.value = planting;
  statusDialogOpen.value = true;
}

function onStatusUpdated() {
  statusDialogTarget.value = null;
}

function clearFilters() {
  filters.value = {
    plotId: null,
    cropId: null,
    status: null,
  };
}
</script>
