<!--
  HarvestDetailPage.vue
  Detail page for a single harvest record with entries list and actions.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-center q-pa-xl">
      <div class="text-center">
        <q-icon name="error" size="3em" color="negative" class="q-mb-md" />
        <div class="text-h6 q-mb-md">Error Loading Harvest</div>
        <div class="text-body1 text-grey-7 q-mb-md">{{ error }}</div>
        <q-btn color="primary" label="Back to Harvests" @click="goToHarvestsList" />
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="harvest">
      <!-- Warning Banner -->
      <q-banner rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template #avatar>
          <q-icon name="info" />
        </template>
        This harvest record is permanent and cannot be edited.
      </q-banner>

      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="goBack" />
          <div>
            <h5 class="q-my-none row items-center q-gutter-sm">
              {{ cropName }} Harvest
              <HarvestStatusBadge :status="harvest.status" />
            </h5>
            <p class="text-grey q-mt-xs q-mb-none">
              Plot: {{ plotName }} | {{ harvest.harvest_type }}
            </p>
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="canWrite && harvest.status === 'In Progress'"
            color="primary"
            icon="add"
            label="Add Entry"
            outline
            @click="openEntryDialog"
            :disable="harvest.harvest_type === 'Single Day'"
          >
            <q-tooltip v-if="harvest.harvest_type === 'Single Day'">
              Single day harvests cannot have additional entries
            </q-tooltip>
          </q-btn>
          <q-btn
            v-if="canWrite && harvest.status === 'In Progress'"
            color="positive"
            icon="check"
            label="Mark Complete"
            @click="confirmMarkComplete"
            :loading="loading"
          />
          <q-btn
            v-if="canWrite && harvest.status === 'In Progress' && !hasEntries"
            color="negative"
            icon="delete"
            label="Delete"
            outline
            @click="confirmDelete"
            :loading="loading"
          />
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Harvest Information -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Harvest Information</div>
              
              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-5 text-grey">Type:</div>
                  <div class="col-7">{{ harvest.harvest_type }}</div>
                </div>
                
                <div v-if="harvest.harvest_type === 'Single Day'" class="row">
                  <div class="col-5 text-grey">Harvest Date:</div>
                  <div class="col-7">{{ formatDate(harvest.harvest_date) }}</div>
                </div>
                
                <div v-else class="row">
                  <div class="col-5 text-grey">Start Date:</div>
                  <div class="col-7">{{ formatDate(harvest.harvest_start_date) }}</div>
                </div>
                
                <div v-if="harvest.harvest_type === 'Multi-Day Aggregate' && harvest.harvest_end_date" class="row">
                  <div class="col-5 text-grey">End Date:</div>
                  <div class="col-7">{{ formatDate(harvest.harvest_end_date) }}</div>
                </div>
                
                <div class="row">
                  <div class="col-5 text-grey">Status:</div>
                  <div class="col-7">
                    <HarvestStatusBadge :status="harvest.status" />
                  </div>
                </div>
                
                <div v-if="harvest.notes" class="row">
                  <div class="col-5 text-grey">Notes:</div>
                  <div class="col-7 text-body2" style="white-space: pre-line">
                    {{ harvest.notes }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Linked Planting -->
          <q-card class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Linked Planting</div>
              
              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-5 text-grey">Crop:</div>
                  <div class="col-7">
                    <router-link :to="`/farm/crops/${planting?.crop_id}`" class="text-primary">
                      {{ cropName }}
                    </router-link>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-5 text-grey">Plot:</div>
                  <div class="col-7">
                    <router-link :to="`/farm/plots/${planting?.plot_id}`" class="text-primary">
                      {{ plotName }}
                    </router-link>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-5 text-grey">Planting Date:</div>
                  <div class="col-7">{{ formatDate(planting?.planting_date) }}</div>
                </div>
                
                <div class="row">
                  <div class="col-5 text-grey">Expected Harvest:</div>
                  <div class="col-7">{{ formatDate(planting?.expected_harvest_date) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Totals and Entries -->
        <div class="col-12 col-md-6">
          <!-- Cost Breakdown -->
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Cost Breakdown</div>
              
              <q-list dense>
                <q-item>
                  <q-item-section>Total Quantity</q-item-section>
                  <q-item-section side>
                    {{ harvest.total_quantity_kg }} kg
                  </q-item-section>
                </q-item>
                
                <q-item>
                  <q-item-section>Labor Cost</q-item-section>
                  <q-item-section side>
                    ZMW {{ (harvest.total_labor_cost || 0).toFixed(2) }}
                  </q-item-section>
                </q-item>
                
                <q-item>
                  <q-item-section>Other Costs</q-item-section>
                  <q-item-section side>
                    ZMW {{ (harvest.total_other_costs || 0).toFixed(2) }}
                  </q-item-section>
                </q-item>
                
                <q-separator class="q-my-sm" />
                
                <q-item class="text-weight-bold">
                  <q-item-section>Total Cost</q-item-section>
                  <q-item-section side class="text-primary">
                    ZMW {{ totalCost.toFixed(2) }}
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Multi-Day Entries -->
          <q-card v-if="harvest.harvest_type === 'Multi-Day Aggregate'" class="q-mt-md">
            <q-card-section class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-medium">Daily Entries</div>
              <q-btn
                v-if="canWrite && harvest.status === 'In Progress'"
                size="sm"
                color="primary"
                icon="add"
                label="Add Entry"
                @click="openEntryDialog"
              />
            </q-card-section>
            
            <q-separator />
            
            <q-list v-if="entries.length > 0">
              <q-item v-for="entry in entries" :key="entry.$id">
                <q-item-section>
                  <div class="text-weight-medium">{{ formatDate(entry.entry_date) }}</div>
                  <div class="text-caption text-grey-7">
                    Quantity: {{ entry.quantity_kg }}kg | 
                    Labor: ZMW {{ (entry.labor_cost || 0).toFixed(2) }} |
                    Other: ZMW {{ (entry.other_costs || 0).toFixed(2) }}
                  </div>
                  <div v-if="entry.notes" class="text-caption text-grey-6 q-mt-xs">
                    {{ entry.notes }}
                  </div>
                </q-item-section>
                <q-item-section side>
                  <div class="text-right">
                    <div class="text-weight-medium">{{ entry.quantity_kg }} kg</div>
                    <div class="text-caption text-grey-7">
                      ZMW {{ calculateEntryCost(entry).toFixed(2) }}
                    </div>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            
            <q-card-section v-else class="text-center text-grey-6">
              <q-icon name="event_busy" size="2em" class="q-mb-sm" />
              <div>No entries recorded yet</div>
              <div class="text-caption">Add daily entries to track harvest progress</div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="flex flex-center q-pa-xl text-grey">
      <div class="text-center">
        <q-icon name="error" size="3em" class="q-mb-md" />
        <div class="text-h6">Harvest not found</div>
        <q-btn color="primary" label="Back to Harvests" class="q-mt-md" @click="goToHarvestsList" />
      </div>
    </div>

    <!-- Entry Dialog -->
    <HarvestEntryDialog
      v-model="showEntryDialog"
      :harvest="harvest"
      :existing-entries="entries"
      :loading="loading"
      @submit="onAddEntry"
      @cancel="closeEntryDialog"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import { format, parseISO } from 'date-fns';

// Components
import HarvestStatusBadge from '../components/HarvestStatusBadge.vue';
import HarvestEntryDialog from '../components/HarvestEntryDialog.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const { canWrite } = usePermissions();

// State
const isLoading = ref(true);
const loading = ref(false);
const error = ref(null);
const harvest = ref(null);
const planting = ref(null);

// Dialog state
const showEntryDialog = ref(false);

// Computed
const entries = computed(() => {
  return harvest.value?.entries || [];
});

const hasEntries = computed(() => {
  return entries.value.length > 0;
});

const totalCost = computed(() => {
  const laborCost = parseFloat(harvest.value?.total_labor_cost) || 0;
  const otherCost = parseFloat(harvest.value?.total_other_costs) || 0;
  return laborCost + otherCost;
});

const cropName = computed(() => {
  return farmStore.getCropNameById(planting.value?.crop_id);
});

const plotName = computed(() => {
  const plot = farmStore.plots.find(p => p.$id === planting.value?.plot_id);
  return plot?.name || 'Unknown Plot';
});

// Load harvest data
async function loadHarvest() {
  try {
    isLoading.value = true;
    error.value = null;

    const harvestId = route.params.id;
    if (!harvestId) {
      error.value = 'No harvest ID provided';
      return;
    }

    // Fetch harvest details
    const result = await farmStore.fetchHarvestById(harvestId);
    if (!result.success) {
      error.value = result.error || 'Failed to load harvest';
      return;
    }

    harvest.value = result.data;

    // Fetch linked planting
    if (harvest.value.planting_id) {
      const plantingResult = await farmStore.fetchPlantingById(harvest.value.planting_id);
      if (plantingResult.success) {
        planting.value = plantingResult.data;
      }
    }

    // Ensure required data is loaded
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops();
    }
    if (!farmStore.plotsLoaded) {
      await farmStore.fetchPlots();
    }

  } catch (err) {
    console.error('Error loading harvest:', err);
    error.value = 'Failed to load harvest data';
  } finally {
    isLoading.value = false;
  }
}

// Entry management
function openEntryDialog() {
  showEntryDialog.value = true;
}

function closeEntryDialog() {
  showEntryDialog.value = false;
}

async function onAddEntry(entryData) {
  try {
    loading.value = true;

    const result = await farmStore.addHarvestEntry(harvest.value.$id, entryData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add entry');
    }

    // Update local harvest data
    harvest.value = {
      ...harvest.value,
      ...result.data.harvestUpdate,
      entries: result.data.entries
    };

    $q.notify({
      type: 'positive',
      message: 'Entry added successfully!',
      position: 'top',
    });

    closeEntryDialog();

  } catch (err) {
    console.error('Error adding entry:', err);
    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to add entry',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

// Harvest completion
function confirmMarkComplete() {
  $q.dialog({
    title: 'Mark Harvest Complete',
    message: `
      <div class="q-mb-md">
        Are you sure you want to mark this harvest as complete?
      </div>
      <div class="q-gutter-y-sm">
        <div><strong>Total Quantity:</strong> {{ harvest.value.total_quantity_kg }} kg</div>
        <div><strong>Total Labor Cost:</strong> ZMW {{ (harvest.value.total_labor_cost || 0).toFixed(2) }}</div>
        <div><strong>Total Other Costs:</strong> ZMW {{ (harvest.value.total_other_costs || 0).toFixed(2) }}</div>
        <div><strong>Number of Entries:</strong> {{ entries.value.length }}</div>
      </div>
      <div class="q-mt-md text-orange-7">
        This will also mark the linked planting as completed.
      </div>
    `,
    html: true,
    persistent: true,
    ok: {
      label: 'Mark Complete',
      color: 'positive',
    },
    cancel: {
      label: 'Cancel',
      color: 'grey',
    },
  }).onOk(() => {
    markHarvestComplete();
  });
}

async function markHarvestComplete() {
  try {
    loading.value = true;

    const result = await farmStore.markHarvestComplete(harvest.value.$id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to mark harvest complete');
    }

    // Update local harvest data
    harvest.value = { ...harvest.value, ...result.data };

    $q.notify({
      type: 'positive',
      message: 'Harvest marked as complete!',
      position: 'top',
    });

  } catch (err) {
    console.error('Error marking harvest complete:', err);
    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to mark harvest complete',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

// Delete harvest
function confirmDelete() {
  $q.dialog({
    title: 'Delete Harvest',
    message: 'Are you sure you want to delete this harvest? This action cannot be undone.',
    persistent: true,
    ok: {
      label: 'Delete',
      color: 'negative',
    },
    cancel: {
      label: 'Cancel',
      color: 'grey',
    },
  }).onOk(() => {
    deleteHarvest();
  });
}

async function deleteHarvest() {
  try {
    loading.value = true;

    const result = await farmStore.deleteHarvest(harvest.value.$id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete harvest');
    }

    $q.notify({
      type: 'positive',
      message: 'Harvest deleted successfully!',
      position: 'top',
    });

    // Navigate back to planting detail
    if (planting.value) {
      router.push(`/farm/plantings/${planting.value.$id}`);
    } else {
      goToHarvestsList();
    }

  } catch (err) {
    console.error('Error deleting harvest:', err);
    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to delete harvest',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

// Navigation
function goBack() {
  if (planting.value) {
    router.push(`/farm/plantings/${planting.value.$id}`);
  } else {
    goToHarvestsList();
  }
}

function goToHarvestsList() {
  router.push('/farm/harvests');
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return '';
  return format(parseISO(dateString), 'MMM dd, yyyy');
}

function calculateEntryCost(entry) {
  const laborCost = parseFloat(entry.labor_cost) || 0;
  const otherCost = parseFloat(entry.other_costs) || 0;
  return laborCost + otherCost;
}

// Permission check
function checkPermissions() {
  if (!canWrite.value) {
    router.push('/farm/dashboard');
    $q.notify({
      type: 'negative',
      message: 'You do not have permission to view harvest details',
      position: 'top',
    });
  }
}

// Initialize
onMounted(async () => {
  checkPermissions();
  await loadHarvest();
});
</script>

<style scoped>
.q-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
