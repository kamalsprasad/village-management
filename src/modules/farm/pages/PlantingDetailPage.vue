<!--
  PlantingDetailPage.vue
  Detail page for a single planting record.

  Story 3.3: Farm Module - Planting Records
  Story 3.4: Planting Status Tracking and Lifecycle Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <!-- Content -->
    <template v-else-if="planting">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="goBack" />
          <div>
            <h5 class="q-my-none row items-center q-gutter-sm">
              {{ cropName }}
              <q-badge :color="statusColor">{{ planting.status }}</q-badge>
            </h5>
            <p v-if="plot" class="text-grey q-mt-xs q-mb-none">
              Plot: {{ plot.name }} | Planted: {{ formatDate(planting.planting_date) }}
            </p>
          </div>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            v-if="canWrite"
            color="primary"
            icon="edit"
            label="Edit"
            outline
            @click="editPlanting"
          />
          <q-btn
            v-if="canWrite"
            color="primary"
            icon="swap_horiz"
            label="Update Status"
            :disable="isTerminalStatus"
            @click="openStatusDialog"
          >
            <q-tooltip v-if="isTerminalStatus">No further status changes available</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Status / Progress Section -->
      <div class="q-mb-md">
        <!-- Completed banner -->
        <q-banner
          v-if="planting.status?.toLowerCase() === 'completed'"
          rounded
          class="bg-positive text-white"
        >
          <template #avatar>
            <q-icon name="check_circle" />
          </template>
          Harvest Completed
        </q-banner>

        <!-- Failed banner -->
        <q-banner
          v-else-if="planting.status?.toLowerCase() === 'failed'"
          rounded
          class="bg-negative text-white"
        >
          <template #avatar>
            <q-icon name="cancel" />
          </template>
          <div>
            <div class="text-weight-bold">Planting Failed</div>
            <div v-if="failureInfo" class="text-caption q-mt-xs">
              Reason: {{ failureInfo.reason }}
              <span v-if="failureInfo.additionalNotes"> — {{ failureInfo.additionalNotes }}</span>
            </div>
          </div>
        </q-banner>

        <!-- Progress bar for active plantings -->
        <q-card v-else>
          <q-card-section class="q-py-sm">
            <div class="row items-center q-col-gutter-md">
              <div class="col-12 col-sm-4 text-center">
                <div class="text-caption text-grey">Days Since Planting</div>
                <div class="text-h6 text-weight-bold">{{ daysSincePlanting }}</div>
              </div>
              <div class="col-12 col-sm-4">
                <div v-if="crop && crop.maturity_days">
                  <div class="text-caption text-grey q-mb-xs">
                    Growing Progress ({{ Math.min(progressPercent, 100) }}%)
                  </div>
                  <q-linear-progress
                    :value="progressPercent / 100"
                    :color="progressColor"
                    rounded
                    size="12px"
                  />
                </div>
                <div v-else class="text-caption text-grey text-center">
                  Progress data unavailable — crop details could not be loaded
                </div>
              </div>
              <div class="col-12 col-sm-4 text-center">
                <div class="text-caption text-grey">Days Until Harvest</div>
                <div
                  class="text-h6 text-weight-bold"
                  :class="daysUntilHarvest !== null && daysUntilHarvest < 0 ? 'text-negative' : ''"
                >
                  <span v-if="daysUntilHarvest === null">—</span>
                  <span v-else-if="daysUntilHarvest < 0"
                    >{{ Math.abs(daysUntilHarvest) }}d overdue</span
                  >
                  <span v-else-if="daysUntilHarvest === 0">Today!</span>
                  <span v-else>{{ daysUntilHarvest }}d</span>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Basic Info Card -->
        <div class="col-12 col-md-6">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Planting Information</div>

              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-5 text-grey">Plot:</div>
                  <div class="col-7">
                    <router-link v-if="plot" :to="`/farm/plots/${plot.$id}`" class="text-primary">
                      {{ plot.name }}
                    </router-link>
                    <span v-else>-</span>
                  </div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Crop:</div>
                  <div class="col-7">
                    <router-link v-if="crop" :to="`/farm/crops/${crop.$id}`" class="text-primary">
                      {{ crop.crop_name }}
                    </router-link>
                    <span v-else>{{ cropName }}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Planting Date:</div>
                  <div class="col-7">{{ formatDate(planting.planting_date) }}</div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Expected Harvest:</div>
                  <div class="col-7">
                    {{ formatDate(planting.expected_harvest_date) }}
                    <q-badge
                      v-if="daysUntilHarvest !== null && !isTerminalStatus"
                      :color="harvestBadgeColor"
                      class="q-ml-sm"
                    >
                      {{ daysUntilHarvestText }}
                    </q-badge>
                  </div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Status:</div>
                  <div class="col-7">
                    <q-badge :color="statusColor">{{ planting.status }}</q-badge>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Planting Details Card -->
          <q-card class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Planting Details</div>

              <div class="q-gutter-y-sm">
                <div v-if="planting.area_used_hectares" class="row">
                  <div class="col-5 text-grey">Area Used:</div>
                  <div class="col-7">{{ planting.area_used_hectares }} ha</div>
                </div>

                <div v-if="planting.quantity_planted" class="row">
                  <div class="col-5 text-grey">Qty Planted:</div>
                  <div class="col-7">
                    {{ planting.quantity_planted }} {{ planting.unit || 'kg' }}
                  </div>
                </div>

                <div v-if="displayNotes" class="row">
                  <div class="col-5 text-grey">Notes:</div>
                  <div class="col-7 text-body2" style="white-space: pre-line">
                    {{ displayNotes }}
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Costs Column -->
        <div class="col-12 col-md-6">
          <!-- Cost Breakdown Card -->
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Cost Breakdown</div>

              <q-list dense>
                <q-item>
                  <q-item-section>Inputs Cost</q-item-section>
                  <q-item-section side
                    >ZMW {{ (planting.inputs_cost || 0).toFixed(2) }}</q-item-section
                  >
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

                <q-separator class="q-my-sm" />

                <q-item class="text-weight-bold">
                  <q-item-section>Total Planting Investment</q-item-section>
                  <q-item-section side class="text-primary">
                    ZMW {{ totalInvestment.toFixed(2) }}
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Harvest Info Placeholder -->
          <q-card class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Harvest</div>
              <div v-if="!harvest" class="text-grey text-center q-pa-md">
                <q-icon name="agriculture" size="2em" class="q-mb-sm" />
                <div>No harvest recorded yet</div>
                <div class="text-caption">Harvest recording coming in Story 3.5</div>
              </div>
              <div v-else>
                <router-link :to="`/farm/harvests/${harvest.$id}`" class="text-primary">
                  View Harvest Record
                </router-link>
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
        <div class="text-h6">Planting not found</div>
        <q-btn color="primary" label="Back to Farm" class="q-mt-md" @click="goToFarm" />
      </div>
    </div>

    <!-- Update Status Dialog -->
    <UpdateStatusDialog
      v-if="planting"
      v-model="statusDialogOpen"
      :planting-id="planting.$id"
      :current-status="planting.status"
      @updated="onStatusUpdated"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import { format, parseISO, differenceInDays } from 'date-fns';
import UpdateStatusDialog from '../components/UpdateStatusDialog.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const { hasPermission } = usePermissions();

const isLoading = ref(true);
const statusDialogOpen = ref(false);
const harvest = ref(null); // Placeholder for Story 3.5

const plantingId = computed(() => route.params.id);
const planting = computed(() => farmStore.currentPlanting);

const canWrite = computed(() => hasPermission('farm:write'));

const isTerminalStatus = computed(() => {
  const s = planting.value?.status?.toLowerCase();
  return s === 'completed' || s === 'failed';
});

const plot = computed(() => {
  if (!planting.value?.plot_id) return null;
  return farmStore.plots.find((p) => p.$id === planting.value.plot_id);
});

const crop = computed(() => {
  if (!planting.value?.crop_id) return null;
  return farmStore.crops.find((c) => c.$id === planting.value.crop_id);
});

const cropName = computed(() => {
  return crop.value?.crop_name || farmStore.getCropNameById(planting.value?.crop_id);
});

const statusColor = computed(() => {
  const colors = {
    planted: 'info',
    growing: 'positive',
    harvesting: 'warning',
    completed: 'positive',
    failed: 'negative',
  };
  return colors[planting.value?.status?.toLowerCase()] || 'grey';
});

const totalInvestment = computed(() => {
  if (!planting.value) return 0;
  return (
    (planting.value.inputs_cost || 0) +
    (planting.value.labor_cost || 0) +
    (planting.value.other_cost || 0)
  );
});

// Parse [FAILURE: reason] prefix from notes when status is failed
const failureInfo = computed(() => {
  if (planting.value?.status !== 'failed') return null;
  const notes = planting.value?.notes || '';
  const match = notes.match(/^\[FAILURE:\s*([^\]]+)\](.*?)(\n|$)/s);
  if (!match) return null;
  return {
    reason: match[1].trim(),
    additionalNotes: match[2].trim(),
    remainingNotes: notes.replace(match[0], '').trim(),
  };
});

// Notes to display — strips the [FAILURE:...] prefix line to avoid duplication
const displayNotes = computed(() => {
  if (!planting.value?.notes) return null;
  if (failureInfo.value) {
    return failureInfo.value.remainingNotes || null;
  }
  return planting.value.notes;
});

const daysSincePlanting = computed(() => {
  if (!planting.value?.planting_date) return 0;
  try {
    return Math.max(0, differenceInDays(new Date(), parseISO(planting.value.planting_date)));
  } catch {
    return 0;
  }
});

const daysUntilHarvest = computed(() => {
  if (!planting.value?.expected_harvest_date) return null;
  try {
    return differenceInDays(parseISO(planting.value.expected_harvest_date), new Date());
  } catch {
    return null;
  }
});

const progressPercent = computed(() => {
  if (!crop.value?.maturity_days || !daysSincePlanting.value) return 0;
  return Math.round((daysSincePlanting.value / crop.value.maturity_days) * 100);
});

const progressColor = computed(() => {
  const days = daysUntilHarvest.value;
  if (days === null) return 'primary';
  if (days < 0) return 'negative';
  if (days <= 7) return 'warning';
  return 'positive';
});

const daysUntilHarvestText = computed(() => {
  const days = daysUntilHarvest.value;
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
});

const harvestBadgeColor = computed(() => {
  const days = daysUntilHarvest.value;
  if (days === null) return 'grey';
  if (days < 0) return 'negative';
  if (days <= 7) return 'warning';
  return 'positive';
});

onMounted(async () => {
  await loadPlanting();
});

async function loadPlanting() {
  isLoading.value = true;
  farmStore.clearCurrentPlanting();
  try {
    const result = await farmStore.fetchPlantingById(plantingId.value);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: 'Failed to load planting: ' + result.error,
        position: 'top',
      });
      return;
    }

    // Load related data in parallel
    const loaders = [];
    if (!farmStore.plotsLoaded) loaders.push(farmStore.fetchPlots());
    if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
    if (loaders.length) await Promise.all(loaders);
  } catch (error) {
    console.error('Error loading planting:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to load planting details',
      position: 'top',
    });
  } finally {
    isLoading.value = false;
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    return format(parseISO(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function goBack() {
  if (plot.value) {
    router.push(`/farm/plots/${plot.value.$id}`);
  } else {
    router.push('/farm/plantings');
  }
}

function goToFarm() {
  router.push('/farm');
}

function editPlanting() {
  router.push(`/farm/plantings/${plantingId.value}/edit`);
}

function openStatusDialog() {
  statusDialogOpen.value = true;
}

function onStatusUpdated() {
  // currentPlanting is already updated reactively by the store action
}
</script>
