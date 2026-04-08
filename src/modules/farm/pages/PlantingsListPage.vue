<!--
  PlantingsListPage.vue
  List page for all planting records with filtering.
  
  Story 3.3: Farm Module - Planting Records
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h5 class="q-my-none">Plantings</h5>
        <p class="text-grey q-mt-xs q-mb-none">Track all crop plantings across the farm</p>
      </div>
    </div>

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
        :loading="farmStore.isPlantingsLoading"
        :pagination="pagination"
        @row-click="(evt, row) => viewPlanting(row)"
      >
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
          <q-td class="text-right">
            ZMW {{ calculateInvestment(row).toFixed(2) }}
          </q-td>
        </template>

        <template #body-cell-actions="{ row }">
          <q-td class="text-center">
            <q-btn flat dense icon="visibility" color="primary" @click.stop="viewPlanting(row)">
              <q-tooltip>View Details</q-tooltip>
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';

const router = useRouter();
const farmStore = useFarmStore();

// Filters
const filters = ref({
  plotId: null,
  cropId: null,
  status: null,
});

const statusOptions = ['Planted', 'Growing', 'Harvesting', 'Completed', 'Failed'];

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

const filteredPlantings = computed(() => {
  return farmStore.plantings.filter((planting) => {
    if (filters.value.plotId && planting.plot_id !== filters.value.plotId) return false;
    if (filters.value.cropId && planting.crop_id !== filters.value.cropId) return false;
    if (filters.value.status && planting.status !== filters.value.status) return false;
    return true;
  });
});

onMounted(async () => {
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
});

function getPlotName(plotId) {
  const plot = farmStore.plots.find((p) => p.$id === plotId);
  return plot?.name || plotId;
}

function getCropName(cropId) {
  return farmStore.getCropNameById(cropId);
}

function getStatusColor(status) {
  const colors = {
    Planted: 'info',
    Growing: 'positive',
    Harvesting: 'warning',
    Completed: 'positive',
    Failed: 'negative',
  };
  return colors[status] || 'grey';
}

function calculateInvestment(planting) {
  return (
    (planting.seed_cost || 0) +
    (planting.planting_labor_cost || 0) +
    (planting.planting_other_costs || 0)
  );
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function viewPlanting(planting) {
  router.push(`/farm/plantings/${planting.$id}`);
}

function clearFilters() {
  filters.value = {
    plotId: null,
    cropId: null,
    status: null,
  };
}
</script>
