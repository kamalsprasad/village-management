<!--
  PlotsListPage.vue
  List page for all farm plots with filtering, sorting, and actions.
  
  Story 3.1: Farm Module - Plot Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h5 class="q-my-none">Farm Plots</h5>
        <p class="text-grey q-mt-xs q-mb-none">Manage all farm plots and assignments</p>
      </div>
      <q-btn
        v-if="canWrite"
        color="primary"
        icon="add"
        label="Add Plot"
        @click="$router.push('/farm/plots/add')"
      >
        <q-tooltip>Register a new farm plot.</q-tooltip>
      </q-btn>
    </div>

    <!-- Filters -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-input v-model="searchQuery" label="Search plots" dense outlined clearable>
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="statusFilter"
          :options="statusFilterOptions"
          label="Filter by Status"
          dense
          outlined
          clearable
          emit-value
          map-options
        />
      </div>
    </div>

    <!-- Table -->
    <q-table
      :rows="filteredPlots"
      :columns="columns"
      row-key="$id"
      :loading="farmStore.isPlotsLoading"
      :pagination="pagination"
      @row-click="onRowClick"
    >
      <!-- Loading state -->
      <template #loading>
        <q-inner-loading showing>
          <q-spinner-dots size="50px" color="primary" />
        </q-inner-loading>
      </template>

      <!-- Empty state -->
      <template #no-data>
        <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey">
          <q-icon name="grid_on" size="2em" />
          <span>No plots found. Click "Add Plot" to get started.</span>
        </div>
      </template>

      <!-- Size column -->
      <template #body-cell-size_hectares="{ row }">
        <q-td class="text-right">
          {{ formatSize(row.size_hectares) }}
        </q-td>
      </template>

      <!-- Status column -->
      <template #body-cell-status="{ row }">
        <q-td>
          <PlotStatusBadge :status="row.status" />
        </q-td>
      </template>

      <!-- Crop Manager column -->
      <template #body-cell-crop_manager="{ row }">
        <q-td>
          {{ getCropManagerName(row.crop_manager_id) }}
        </q-td>
      </template>

      <!-- Soil Type column -->
      <template #body-cell-soil_type="{ row }">
        <q-td>
          {{ farmStore.getSoilTypeName(row.soil_type_id) }}
        </q-td>
      </template>

      <!-- Actions column -->
      <template #body-cell-actions="{ row }">
        <q-td class="text-right">
          <q-btn flat round dense icon="visibility" @click.stop="viewPlot(row.$id)">
            <q-tooltip>View</q-tooltip>
          </q-btn>
          <q-btn v-if="canWrite" flat round dense icon="edit" @click.stop="editPlot(row.$id)">
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
          <q-btn
            v-if="canDelete"
            flat
            round
            dense
            color="negative"
            icon="delete"
            @click.stop="confirmDelete(row)"
          >
            <q-tooltip>Delete</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialogOpen" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Delete plot "{{ plotToDelete?.name }}"?</span>
        </q-card-section>
        <q-card-section>
          <p>
            This action cannot be undone. If this plot has planting history, deletion will be
            blocked.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn
            v-close-popup
            flat
            label="Delete"
            color="negative"
            :loading="isDeleting"
            @click="executeDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { useResidentsStore } from 'src/stores/residents-store';
import { usePermissions } from 'src/composables/usePermissions';
import PlotStatusBadge from '../components/PlotStatusBadge.vue';

const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const residentsStore = useResidentsStore();
const { hasPermission } = usePermissions();

// Permissions
const canWrite = computed(() => hasPermission('farm:write'));
const canDelete = computed(() => hasPermission('farm:delete'));

// Filters
const searchQuery = ref('');
const statusFilter = ref(null);

const statusFilterOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Fallow', value: 'Fallow' },
  { label: 'Retired', value: 'Retired' },
];

// Table columns
const columns = [
  {
    name: 'name',
    label: 'Plot Name',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'size_hectares',
    label: 'Size (ha)',
    field: 'size_hectares',
    align: 'right',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'left',
    sortable: true,
  },
  {
    name: 'soil_type',
    label: 'Soil Type',
    field: 'soil_type_id',
    align: 'left',
  },
  {
    name: 'crop_manager',
    label: 'Crop Manager',
    field: 'crop_manager_id',
    align: 'left',
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'right',
  },
];

const pagination = {
  rowsPerPage: 25,
};

// Delete dialog
const deleteDialogOpen = ref(false);
const plotToDelete = ref(null);
const isDeleting = ref(false);

// Computed filtered plots
const filteredPlots = computed(() => {
  let plots = farmStore.plots;

  // Apply status filter
  if (statusFilter.value) {
    plots = plots.filter((p) => p.status === statusFilter.value);
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    plots = plots.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.location_description?.toLowerCase().includes(query),
    );
  }

  return plots;
});

// Load plots on mount
onMounted(async () => {
  await farmStore.fetchPlots();
  if (!farmStore.soilTypesLoaded) {
    await farmStore.fetchSoilTypes();
  }
  // Load residents for crop manager name lookups
  if (residentsStore.residents.length === 0) {
    await residentsStore.fetchResidents(1, 100);
  }
});

function formatSize(size) {
  if (size === null || size === undefined) return '-';
  return Number(size).toFixed(2);
}

function getCropManagerName(managerId) {
  if (!managerId) return 'Unassigned';
  const managerName = residentsStore.getFullNameById(managerId);
  return managerName || 'Failed to load.';
}

function onRowClick(evt, row) {
  viewPlot(row.$id);
}

function viewPlot(plotId) {
  router.push(`/farm/plots/${plotId}`);
}

function editPlot(plotId) {
  router.push(`/farm/plots/${plotId}/edit`);
}

function confirmDelete(plot) {
  plotToDelete.value = plot;
  deleteDialogOpen.value = true;
}

async function executeDelete() {
  if (!plotToDelete.value) return;

  isDeleting.value = true;
  const result = await farmStore.deletePlot(plotToDelete.value.$id);
  isDeleting.value = false;

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: 'Plot deleted successfully',
      position: 'top',
    });
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to delete plot',
      position: 'top',
    });
  }

  plotToDelete.value = null;
}
</script>
