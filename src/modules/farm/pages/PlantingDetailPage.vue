<!--
  PlantingDetailPage.vue

  Detail page for a single planting record. This page now also serves as the
  detail view for the planting's harvest (Story 3.5 refactor): since each
  planting has at most one harvest, the harvest and its entries are rendered
  inline here instead of on a separate HarvestDetailPage.

  Stories:
    3.3 Farm Module - Planting Records
    3.4 Planting Status Tracking and Lifecycle Management
    3.5 Harvest Recording (entry-based unified model, inline view)
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
                  <span v-else-if="daysUntilHarvest < 0">{{ Math.abs(daysUntilHarvest) }}d overdue</span>
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

        <!-- Costs + Harvest Column -->
        <div class="col-12 col-md-6">
          <!-- Cost Breakdown Card -->
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Cost Breakdown</div>

              <q-list dense>
                <q-item>
                  <q-item-section>Inputs Cost</q-item-section>
                  <q-item-section side>ZMW {{ (planting.inputs_cost || 0).toFixed(2) }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>Labor Cost</q-item-section>
                  <q-item-section side>ZMW {{ (planting.labor_cost || 0).toFixed(2) }}</q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>Other Costs</q-item-section>
                  <q-item-section side>ZMW {{ (planting.other_cost || 0).toFixed(2) }}</q-item-section>
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

          <!-- Harvest Section -->
          <q-card class="q-mt-md">
            <q-card-section class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-medium">
                <q-icon name="agriculture" class="q-mr-xs" />
                Harvest
                <HarvestStatusBadge v-if="currentHarvest" :status="currentHarvest.status" class="q-ml-sm" />
              </div>

              <!-- No harvest yet: primary CTA -->
              <q-btn
                v-if="canWrite && !currentHarvest && !isTerminalStatus"
                color="positive"
                icon="add"
                label="Record Harvest"
                @click="openCreateDialog"
              />

              <!-- In-progress actions -->
              <div v-else-if="canWrite && currentHarvest?.status === 'In Progress'" class="row q-gutter-xs">
                <q-btn
                  size="sm"
                  color="primary"
                  icon="add"
                  label="Add Entry"
                  @click="openAddEntryDialog"
                />
                <q-btn
                  size="sm"
                  color="positive"
                  icon="check"
                  label="Mark Complete"
                  @click="confirmMarkComplete"
                />
                <q-btn
                  size="sm"
                  color="negative"
                  icon="delete"
                  flat
                  @click="confirmDeleteHarvest"
                >
                  <q-tooltip>Delete entire harvest</q-tooltip>
                </q-btn>
              </div>
            </q-card-section>

            <q-separator />

            <!-- No harvest yet -->
            <q-card-section
              v-if="!currentHarvest"
              class="text-center text-grey-6"
            >
              <q-icon name="agriculture" size="2em" class="q-mb-sm" />
              <div v-if="isTerminalStatus">No harvest was recorded for this planting.</div>
              <div v-else>No harvest recorded yet.</div>
              <div v-if="!isTerminalStatus && canWrite" class="text-caption q-mt-xs">
                Click "Record Harvest" to record the first day's pick.
              </div>
            </q-card-section>

            <!-- Harvest summary + entries -->
            <template v-else>
              <q-card-section>
                <div class="row q-col-gutter-md text-center">
                  <div class="col-4">
                    <div class="text-caption text-grey">Total Quantity</div>
                    <div class="text-h6 text-weight-bold">
                      {{ (currentHarvest.total_quantity_kg || 0).toFixed(1) }} kg
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="text-caption text-grey">Total Cost</div>
                    <div class="text-h6 text-weight-bold">
                      ZMW {{ harvestTotalCost.toFixed(2) }}
                    </div>
                  </div>
                  <div class="col-4">
                    <div class="text-caption text-grey">Avg Cost/kg</div>
                    <div class="text-h6 text-weight-bold">
                      <span v-if="avgCostPerKg !== null">ZMW {{ avgCostPerKg.toFixed(2) }}</span>
                      <span v-else>—</span>
                    </div>
                  </div>
                </div>
                <div class="text-caption text-grey text-center q-mt-sm">
                  {{ harvestDateRangeLabel }}
                  <span v-if="currentHarvest.entries?.length">
                    · {{ currentHarvest.entries.length }}
                    {{ currentHarvest.entries.length === 1 ? 'entry' : 'entries' }}
                  </span>
                </div>
              </q-card-section>

              <q-separator />

              <!-- Entries list -->
              <q-list v-if="sortedEntries.length" separator>
                <q-item v-for="entry in sortedEntries" :key="entry.$id">
                  <q-item-section avatar>
                    <q-icon name="event" color="grey-6" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ formatDate(entry.entry_date) }}
                    </q-item-label>
                    <q-item-label caption>
                      <span class="text-weight-medium">
                        {{ (entry.quantity_kg || 0).toFixed(1) }} kg
                      </span>
                      <span class="text-grey-7">
                        ({{ cumulativeTotals[entry.$id]?.toFixed(1) }} kg cumulative)
                      </span>
                      <span v-if="entry.labor_cost || entry.other_costs" class="text-grey-7">
                        · ZMW {{ ((entry.labor_cost || 0) + (entry.other_costs || 0)).toFixed(2) }} cost
                      </span>
                      <span v-if="entry.farmhands_count" class="text-grey-7">
                        · {{ entry.farmhands_count }} farmhands
                      </span>
                    </q-item-label>
                    <q-item-label v-if="entry.notes" caption class="q-mt-xs">
                      <q-icon name="notes" size="xs" class="q-mr-xs" />{{ entry.notes }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section
                    v-if="canWrite && currentHarvest.status === 'In Progress' && sortedEntries.length > 1"
                    side
                  >
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      icon="close"
                      color="negative"
                      @click="confirmDeleteEntry(entry)"
                    >
                      <q-tooltip>Delete this entry</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-card-section v-else class="text-center text-grey-6">
                No entries. This should not happen — please contact support.
              </q-card-section>

              <!-- Completed harvest footer -->
              <q-card-section
                v-if="currentHarvest.status === 'Completed' && produceInventoryRow"
                class="bg-grey-2 q-pa-sm"
              >
                <div class="text-caption text-grey-8 row items-center">
                  <q-icon name="inventory_2" class="q-mr-xs" />
                  <span>
                    {{ produceInventoryRow.quantity }} kg available in
                    <router-link
                      :to="`/inventory/${produceInventoryRow.$id}`"
                      class="text-primary"
                    >
                      inventory
                    </router-link>
                  </span>
                </div>
              </q-card-section>
            </template>
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

    <!-- Harvest Entry Dialog (dual mode) -->
    <HarvestEntryDialog
      v-if="planting"
      v-model="entryDialogOpen"
      :planting="planting"
      :crop="crop"
      :harvest="currentHarvest"
      :existing-entries="currentHarvest?.entries || []"
      :loading="entrySubmitting"
      @submit="onEntrySubmit"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { usePermissions } from 'src/composables/usePermissions';
import { parseISO, differenceInDays } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';
import UpdateStatusDialog from '../components/UpdateStatusDialog.vue';
import HarvestStatusBadge from '../components/HarvestStatusBadge.vue';
import HarvestEntryDialog from '../components/HarvestEntryDialog.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();
const { hasPermission } = usePermissions();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const isLoading = ref(true);
const statusDialogOpen = ref(false);
const entryDialogOpen = ref(false);
const entrySubmitting = ref(false);
const produceInventoryRow = ref(null);

const plantingId = computed(() => route.params.id);
const planting = computed(() => farmStore.currentPlanting);

// ---------------------------------------------------------------------------
// Permissions + derived planting info
// ---------------------------------------------------------------------------

const canWrite = computed(() => hasPermission('farm:write'));

const isTerminalStatus = computed(() => {
  const s = planting.value?.status?.toLowerCase();
  return s === 'completed' || s === 'failed';
});

const plot = computed(() => {
  if (!planting.value?.plot_id) return null;
  const plotId =
    typeof planting.value.plot_id === 'object'
      ? planting.value.plot_id.$id
      : planting.value.plot_id;
  return farmStore.plots.find((p) => p.$id === plotId);
});

const crop = computed(() => {
  if (!planting.value?.crop_id) return null;
  const cropId =
    typeof planting.value.crop_id === 'object'
      ? planting.value.crop_id.$id
      : planting.value.crop_id;
  return farmStore.crops.find((c) => c.$id === cropId);
});

const cropName = computed(() => {
  const cropId =
    typeof planting.value?.crop_id === 'object'
      ? planting.value.crop_id.$id
      : planting.value?.crop_id;
  return crop.value?.crop_name || farmStore.getCropNameById(cropId);
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

// ---------------------------------------------------------------------------
// Harvest (single, per-planting)
// ---------------------------------------------------------------------------

/**
 * The planting's harvest record (at most one per planting in the new model).
 * Returns `null` if no harvest has been recorded yet.
 */
const currentHarvest = computed(() => {
  if (!planting.value) return null;
  const list = farmStore.harvestsByPlanting(planting.value.$id);
  if (!list.length) return null;
  // Prefer the in-progress one if somehow multiple exist (defensive).
  return list.find((h) => h.status === 'In Progress') || list[0];
});

const sortedEntries = computed(() => {
  const entries = currentHarvest.value?.entries || [];
  return [...entries].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime(),
  );
});

/**
 * Map of entry.$id → cumulative kg up to and including that entry (sorted by
 * entry_date ascending). Used for the "20 kg (35 kg cumulative)" display.
 */
const cumulativeTotals = computed(() => {
  const map = {};
  let running = 0;
  for (const entry of sortedEntries.value) {
    running += parseFloat(entry.quantity_kg) || 0;
    map[entry.$id] = running;
  }
  return map;
});

const harvestTotalCost = computed(() => {
  const h = currentHarvest.value;
  if (!h) return 0;
  return (Number(h.total_labor_cost) || 0) + (Number(h.total_other_costs) || 0);
});

const avgCostPerKg = computed(() => {
  const h = currentHarvest.value;
  if (!h) return null;
  const qty = Number(h.total_quantity_kg) || 0;
  if (qty === 0) return null;
  return harvestTotalCost.value / qty;
});

const harvestDateRangeLabel = computed(() => {
  const h = currentHarvest.value;
  if (!h) return '';
  const start = h.harvest_start_date ? formatDate(h.harvest_start_date) : null;
  const end = h.harvest_end_date ? formatDate(h.harvest_end_date) : null;
  if (!start) return '';
  if (!end || start === end) return start;
  return `${start} — ${end}`;
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

onMounted(async () => {
  await loadPlanting();
});

async function loadPlanting() {
  isLoading.value = true;
  farmStore.clearCurrentPlanting?.();
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
    loaders.push(farmStore.fetchHarvestsByPlanting(result.data.$id));
    await Promise.all(loaders);

    // After harvests are loaded, pull entries for the one that exists (if any)
    const harvestList = farmStore.harvestsByPlanting(result.data.$id);
    if (harvestList.length) {
      await farmStore.fetchHarvestEntries(harvestList[0].$id);

      // If the harvest is completed, fetch the aggregated produce inventory row
      // for the "X kg available in inventory" link.
      if (harvestList[0].status === 'Completed' && result.data.crop_id) {
        const cropId =
          typeof result.data.crop_id === 'object'
            ? result.data.crop_id.$id
            : result.data.crop_id;
        produceInventoryRow.value = await inventoryStore.findFarmProduceRow(
          result.data.$id,
          cropId,
        );
      }
    }
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

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Harvest actions
// ---------------------------------------------------------------------------

function openCreateDialog() {
  entryDialogOpen.value = true;
}

function openAddEntryDialog() {
  entryDialogOpen.value = true;
}

/**
 * Unified submit handler for both create-first-entry and add-entry modes.
 * The dialog doesn't know which mode it's in — it just emits the form payload.
 */
async function onEntrySubmit(entryData) {
  entrySubmitting.value = true;
  try {
    let result;
    if (!currentHarvest.value) {
      // Create mode: build a new harvest from this first entry
      result = await farmStore.createHarvestWithFirstEntry(planting.value.$id, entryData);
    } else {
      // Add-entry mode: append to existing in-progress harvest
      result = await farmStore.addHarvestEntry(currentHarvest.value.$id, entryData);
    }

    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to save harvest entry',
        position: 'top',
        timeout: 6000,
      });
      return;
    }

    $q.notify({
      type: 'positive',
      message: currentHarvest.value ? 'Entry added' : 'Harvest started',
      position: 'top',
    });
    entryDialogOpen.value = false;
  } finally {
    entrySubmitting.value = false;
  }
}

function confirmMarkComplete() {
  $q.dialog({
    title: 'Mark harvest complete?',
    message:
      `The harvest will be finalized and no further entries can be added. ` +
      `The planting status will move to "completed". This cannot be undone.`,
    ok: { label: 'Mark Complete', color: 'positive' },
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await farmStore.markHarvestComplete(currentHarvest.value.$id);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to mark harvest complete',
        position: 'top',
      });
      return;
    }
    $q.notify({ type: 'positive', message: 'Harvest completed', position: 'top' });
    // Re-fetch the inventory row for the completed-view link
    if (crop.value) {
      produceInventoryRow.value = await inventoryStore.findFarmProduceRow(
        planting.value.$id,
        crop.value.$id,
      );
    }
  });
}

function confirmDeleteHarvest() {
  const h = currentHarvest.value;
  if (!h) return;
  const entryCount = h.entries?.length || 0;
  const qty = (h.total_quantity_kg || 0).toFixed(1);

  $q.dialog({
    title: 'Delete this harvest?',
    message:
      `This will permanently delete the harvest, all ${entryCount} of its ` +
      `entries, and reverse ${qty} kg from inventory. This action cannot be undone.` +
      `\n\nIf any of this produce has been sold or transferred, the deletion ` +
      `will be blocked.`,
    ok: { label: 'Delete Harvest', color: 'negative' },
    cancel: true,
    persistent: true,
    html: false,
  }).onOk(async () => {
    const result = await farmStore.deleteHarvest(h.$id);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to delete harvest',
        position: 'top',
        timeout: 8000,
      });
      return;
    }
    $q.notify({ type: 'positive', message: 'Harvest deleted', position: 'top' });
    produceInventoryRow.value = null;
  });
}

function confirmDeleteEntry(entry) {
  const qty = (parseFloat(entry.quantity_kg) || 0).toFixed(1);
  $q.dialog({
    title: 'Delete this entry?',
    message:
      `Removes ${qty} kg recorded on ${formatDate(entry.entry_date)} from this harvest ` +
      `and reverses it from inventory.` +
      `\n\nIf any of this produce has already been sold, the deletion will be blocked.`,
    ok: { label: 'Delete Entry', color: 'negative' },
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await farmStore.deleteHarvestEntry(currentHarvest.value.$id, entry.$id);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to delete entry',
        position: 'top',
        timeout: 8000,
      });
      return;
    }
    $q.notify({ type: 'positive', message: 'Entry deleted', position: 'top' });
  });
}
</script>
