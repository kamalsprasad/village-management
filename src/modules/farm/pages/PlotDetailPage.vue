<!--
  PlotDetailPage.vue
  Detail page for a single farm plot showing comprehensive information.
  
  Story 3.1: Farm Module - Plot Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <!-- Content -->
    <template v-else-if="plot">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-lg">
        <div class="row items-center">
          <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="goBack" />
          <div>
            <h5 class="q-my-none row items-center q-gutter-sm">
              {{ plot.name }}
              <PlotStatusBadge :status="plot.status" />
            </h5>
            <p class="text-grey q-mt-xs q-mb-none">{{ formatSize(plot.size_hectares) }} hectares</p>
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="canWrite"
            color="positive"
            icon="add"
            label="Record Planting"
            @click="createPlanting"
          />
          <q-btn v-if="canWrite" color="primary" icon="edit" label="Edit" @click="editPlot" />
          <q-btn
            v-if="canDelete"
            color="negative"
            icon="delete"
            label="Delete"
            outline
            @click="confirmDelete"
          />
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Basic Info Card -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Basic Information</div>

              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-4 text-grey">Location:</div>
                  <div class="col-8">{{ plot.location_description || 'Not specified' }}</div>
                </div>
                <div class="row">
                  <div class="col-4 text-grey">Soil Type:</div>
                  <div class="col-8">{{ farmStore.getSoilTypeName(plot.soil_type_id) }}</div>
                </div>
                <div class="row">
                  <div class="col-4 text-grey">Status:</div>
                  <div class="col-8">
                    <PlotStatusBadge :status="plot.status" />
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Management Card -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Management</div>

              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-4 text-grey">Crop Manager:</div>
                  <div class="col-8">
                    <template v-if="plot.crop_manager_id">
                      <router-link :to="`/residents/${plot.crop_manager_id}`" class="text-primary">
                        {{ getCropManagerName(plot.crop_manager_id) }}
                      </router-link>
                    </template>
                    <span v-else class="text-grey">Unassigned</span>
                  </div>
                </div>
                <div class="row">
                  <div class="col-4 text-grey">Created:</div>
                  <div class="col-8">{{ formatDate(plot.$createdAt) }}</div>
                </div>
                <div class="row">
                  <div class="col-4 text-grey">Last Updated:</div>
                  <div class="col-8">{{ formatDate(plot.$updatedAt) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Current Planting -->
        <div class="col-12">
          <q-card>
            <q-card-section>
              <div class="row items-center justify-between q-mb-md">
                <div class="text-subtitle1 text-weight-medium">Current Planting</div>
                <q-btn
                  v-if="canWrite"
                  size="sm"
                  color="positive"
                  icon="add"
                  label="Record Planting"
                  @click="createPlanting"
                />
              </div>

              <!-- Active Plantings Display -->
              <div v-if="activePlantings.length > 0" class="q-gutter-y-md">
                <div v-for="planting in activePlantings" :key="planting.$id" class="q-gutter-y-md">
                  <q-separator v-if="activePlantings.length > 1" />
                  <div class="row items-center">
                    <div class="col">
                      <router-link
                        :to="`/farm/plantings/${planting.$id}`"
                        class="text-h6 text-primary"
                      >
                        {{ getCropName(planting.crop_id) }}
                      </router-link>
                      <q-badge :color="getStatusColor(planting.status)" class="q-ml-sm">
                        {{ planting.status }}
                      </q-badge>
                    </div>
                  </div>

                  <div class="row q-col-gutter-md">
                    <div class="col-6 col-md-3">
                      <div class="text-grey text-caption">Planted</div>
                      <div>{{ formatDate(planting.planting_date) }}</div>
                    </div>
                    <div class="col-6 col-md-3">
                      <div class="text-grey text-caption">Expected Harvest</div>
                      <div>{{ formatDate(planting.expected_harvest_date) }}</div>
                    </div>
                    <div class="col-6 col-md-3">
                      <div class="text-grey text-caption">Investment</div>
                      <div>ZMW {{ calculateInvestment(planting).toFixed(2) }}</div>
                    </div>
                    <div class="col-6 col-md-3 text-right">
                      <q-btn
                        flat
                        color="primary"
                        icon="visibility"
                        label="View Details"
                        :to="`/farm/plantings/${planting.$id}`"
                      />
                    </div>
                  </div>

                  <!-- Cost Breakdown (Collapsible) -->
                  <q-expansion-item
                    icon="payments"
                    label="Cost Breakdown"
                    caption="Click to expand"
                    dense
                  >
                    <q-list dense>
                      <q-item>
                        <q-item-section>Inputs Cost</q-item-section>
                        <q-item-section side>
                          ZMW {{ (planting.inputs_cost || 0).toFixed(2) }}
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>Labor Cost</q-item-section>
                        <q-item-section side>
                          ZMW {{ (planting.labor_cost || 0).toFixed(2) }}
                        </q-item-section>
                      </q-item>
                      <q-item>
                        <q-item-section>Other Costs</q-item-section>
                        <q-item-section side>
                          ZMW {{ (planting.other_cost || 0).toFixed(2) }}
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-expansion-item>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="text-grey q-pa-md text-center">
                <q-icon name="spa" size="2em" class="q-mb-sm" />
                <div>No active planting</div>
                <div class="text-caption q-mt-sm">
                  Click "Record Planting" to start tracking crops on this plot
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Planting History -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Planting History</div>

              <div v-if="plotPlantings.length > 0">
                <q-list separator>
                  <q-item
                    v-for="planting in completedPlantings"
                    :key="planting.$id"
                    clickable
                    :to="`/farm/plantings/${planting.$id}`"
                  >
                    <q-item-section>
                      <q-item-label>{{ getCropName(planting.crop_id) }}</q-item-label>
                      <q-item-label caption>
                        Planted: {{ formatDate(planting.planting_date) }}
                        <span v-if="planting.status === 'Failed'" class="text-negative">
                          (Failed)
                        </span>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge :color="getStatusColor(planting.status)">
                        {{ planting.status }}
                      </q-badge>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-if="completedPlantings.length === 0" class="text-grey text-center q-pa-sm">
                  No completed or failed plantings yet
                </div>
              </div>

              <div v-else class="text-grey q-pa-md text-center">
                <q-icon name="history" size="2em" class="q-mb-sm" />
                <div>No planting history yet</div>
                <div class="text-caption">History will appear once plantings are recorded</div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Profitability Summary (Placeholder) -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Profitability Summary</div>
              <div class="text-grey q-pa-md text-center">
                <q-icon name="trending_up" size="2em" class="q-mb-sm" />
                <div>Profitability data will be available after first harvest</div>
                <div class="text-caption">Profitability analysis coming in Story 3.9</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="flex flex-center q-pa-xl text-grey">
      <div class="text-center">
        <q-icon name="error" size="3em" class="q-mb-md" />
        <div class="text-h6">Plot not found</div>
        <q-btn color="primary" label="Back to Plots" class="q-mt-md" @click="goBack" />
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="deleteDialogOpen" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="negative" text-color="white" />
          <span class="q-ml-sm">Delete plot "{{ plot?.name }}"?</span>
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
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useResidentsStore } from 'src/stores/residents-store';
import { format } from 'date-fns';
import PlotStatusBadge from '../components/PlotStatusBadge.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const residentsStore = useResidentsStore();
const { hasPermission } = usePermissions();

const isLoading = ref(true);
const isDeleting = ref(false);
const deleteDialogOpen = ref(false);

const plotId = computed(() => route.params.id);
const plot = computed(() => farmStore.currentPlot);

const canWrite = computed(() => hasPermission('farm:write'));
const canDelete = computed(() => hasPermission('farm:delete'));

// Planting-related computed properties
const activePlantings = computed(() => {
  if (!plotId.value || !farmStore.plantingsLoaded) return [];
  return plotPlantings.value.filter((p) =>
    ['Planted', 'Growing', 'Harvesting', 'planted', 'growing', 'harvesting'].includes(p.status),
  );
});

const plotPlantings = computed(() => {
  if (!plotId.value || !farmStore.plantingsLoaded) return [];
  return farmStore.plantingsByPlot[plotId.value] || [];
});

const completedPlantings = computed(() => {
  return plotPlantings.value.filter((p) =>
    ['Completed', 'Failed', 'completed', 'failed'].includes(p.status),
  );
});

onMounted(async () => {
  await loadPlot();
  if (!farmStore.soilTypesLoaded) {
    await farmStore.fetchSoilTypes();
  }
  // Ensure residents are loaded for crop manager names
  if (residentsStore.residents.length === 0) {
    await residentsStore.fetchResidents(1, 100);
  }
  // Load plantings for this plot
  await farmStore.fetchPlantingsByPlot(plotId.value);
});

async function loadPlot() {
  isLoading.value = true;
  const result = await farmStore.fetchPlotById(plotId.value);
  if (!result.success) {
    $q.notify({
      type: 'negative',
      message: 'Failed to load plot: ' + result.error,
      position: 'top',
    });
  }
  isLoading.value = false;
}

function formatSize(size) {
  if (size === null || size === undefined) return '-';
  return Number(size).toFixed(2);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function getCropManagerName(managerId) {
  if (!managerId) return 'Unassigned';
  const managerName = residentsStore.getFullNameById(managerId);
  return managerName || managerId;
}

function goBack() {
  router.push('/farm/plots');
}

function createPlanting() {
  router.push(`/farm/plots/${plotId.value}/plantings/new`);
}

function editPlot() {
  router.push(`/farm/plots/${plotId.value}/edit`);
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

function confirmDelete() {
  deleteDialogOpen.value = true;
}

async function executeDelete() {
  isDeleting.value = true;
  const result = await farmStore.deletePlot(plotId.value);
  isDeleting.value = false;

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: 'Plot deleted successfully',
      position: 'top',
    });
    goBack();
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to delete plot',
      position: 'top',
    });
  }
}
</script>
