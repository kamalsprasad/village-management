<!--
  PlantingDetailPage.vue

  Detail page for a single planting record. This page now also serves as the
  detail view for the planting's harvest (Story 3.5 refactor): since each
  planting has at most one harvest, the harvest and its entries are rendered
  inline here instead of on a separate HarvestDetailPage.

  Story 3.6 adds support for multiple harvests per planting for perennial crops
  with continuous picking.

  Stories:
    3.3 Farm Module - Planting Records
    3.4 Planting Status Tracking and Lifecycle Management
    3.5 Harvest Recording (entry-based unified model, inline view)
    3.6 Continuous Picking Harvests for Perennial Crops
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

        <!-- Costs + Harvest Column -->
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
                  <q-item-section side
                    >ZMW {{ (planting.labor_cost || 0).toFixed(2) }}</q-item-section
                  >
                </q-item>
                <q-item>
                  <q-item-section>Other Costs</q-item-section>
                  <q-item-section side
                    >ZMW {{ (planting.other_cost || 0).toFixed(2) }}</q-item-section
                  >
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

          <!-- Story 3.6: Frequency Alert for Perennials -->
          <q-banner
            v-if="frequencyAlert && isPerennial && !isTerminalStatus"
            rounded
            class="q-mb-md"
            :class="{
              'bg-red-1 text-red-9': frequencyAlert.type === 'negative',
              'bg-orange-1 text-orange-9': frequencyAlert.type === 'warning',
              'bg-green-1 text-green-9': frequencyAlert.type === 'positive',
              'bg-blue-1 text-blue-9': frequencyAlert.type === 'info',
            }"
          >
            <template #avatar>
              <q-icon
                :name="
                  frequencyAlert.type === 'negative'
                    ? 'warning'
                    : frequencyAlert.type === 'positive'
                      ? 'check_circle'
                      : 'info'
                "
              />
            </template>
            {{ frequencyAlert.message }}
            <span v-if="daysSinceLastHarvest !== null" class="text-caption q-ml-sm">
              ({{ daysSinceLastHarvest }} days since last harvest)
            </span>
          </q-banner>

          <!-- Harvest Section -->
          <q-card class="q-mt-md">
            <q-card-section class="row items-center justify-between">
              <div class="text-subtitle1 text-weight-medium">
                <q-icon name="agriculture" class="q-mr-xs" />
                Harvest
                <HarvestStatusBadge
                  v-if="currentHarvest"
                  :status="currentHarvest.status"
                  class="q-ml-sm"
                />
                <!-- Story 3.6: Continuous Picking Indicator -->
                <q-badge v-if="isPerennial && isContinuousPicking" color="primary" class="q-ml-sm">
                  <q-icon name="repeat" size="xs" class="q-mr-xs" />
                  Continuous Picking
                </q-badge>
                <!-- Story 3.6: Harvest Sequence Number -->
                <q-badge
                  v-if="isPerennial && currentHarvest?.harvest_sequence"
                  color="grey"
                  class="q-ml-sm"
                >
                  Harvest {{ currentHarvest.harvest_sequence }}
                </q-badge>
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
              <div
                v-else-if="canWrite && currentHarvest?.status === 'In Progress'"
                class="row q-gutter-xs"
              >
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
                <q-btn size="sm" color="negative" icon="delete" flat @click="confirmDeleteHarvest">
                  <q-tooltip>Delete entire harvest</q-tooltip>
                </q-btn>
              </div>

              <!-- Story 3.6: Completed continuous picking - Record Next Harvest -->
              <div
                v-else-if="
                  canWrite &&
                  currentHarvest?.status === 'Completed' &&
                  isPerennial &&
                  isContinuousPicking &&
                  !isTerminalStatus
                "
                class="row q-gutter-xs"
              >
                <q-btn
                  size="sm"
                  color="positive"
                  icon="add"
                  label="Record Next Harvest"
                  @click="openCreateDialog"
                />
                <q-btn
                  size="sm"
                  color="primary"
                  outline
                  icon="check_circle"
                  label="Mark Planting Complete"
                  @click="openFinalizeDialog"
                />
              </div>

              <!-- Story 3.6: Perennial without continuous picking active - Mark Complete only -->
              <div
                v-else-if="
                  canWrite &&
                  currentHarvest?.status === 'Completed' &&
                  isPerennial &&
                  !isTerminalStatus &&
                  (!isContinuousPicking || !hasCompletedHarvests)
                "
              >
                <q-btn
                  size="sm"
                  color="primary"
                  outline
                  icon="check_circle"
                  label="Mark Planting Complete"
                  @click="openFinalizeDialog"
                />
              </div>
            </q-card-section>

            <q-separator />

            <!-- No harvest yet -->
            <q-card-section v-if="!currentHarvest" class="text-center text-grey-6">
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

                <!-- Story 3.6: Cumulative stats for perennials with multiple harvests -->
                <div v-if="isPerennial && hasCompletedHarvests" class="q-mt-md q-pt-md border-top">
                  <div class="text-caption text-weight-medium text-primary q-mb-xs">
                    <q-icon name="repeat" size="xs" class="q-mr-xs" />
                    Continuous Picking Totals ({{ completedHarvests.length }} harvests)
                  </div>
                  <div class="row q-col-gutter-md text-center">
                    <div class="col-4">
                      <div class="text-caption text-grey">Cumulative Yield</div>
                      <div class="text-h6 text-weight-bold text-primary">
                        {{ cumulativeYield.toFixed(1) }} kg
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="text-caption text-grey">Avg per Harvest</div>
                      <div class="text-h6 text-weight-bold">
                        {{ (cumulativeYield / completedHarvests.length).toFixed(1) }} kg
                      </div>
                    </div>
                    <div class="col-4">
                      <div class="text-caption text-grey">Total Labor</div>
                      <div class="text-h6 text-weight-bold">
                        ZMW {{ cumulativeLaborCost.toFixed(2) }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="daysSinceLastHarvest !== null"
                    class="text-caption text-grey text-center q-mt-xs"
                  >
                    {{ daysSinceLastHarvest }} days since last harvest
                    <span v-if="crop?.harvest_frequency_days">
                      · Frequency: {{ crop.harvest_frequency_days }} days
                    </span>
                  </div>
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
                        · ZMW
                        {{ ((entry.labor_cost || 0) + (entry.other_costs || 0)).toFixed(2) }} cost
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
                    v-if="
                      canWrite &&
                      currentHarvest.status === 'In Progress' &&
                      sortedEntries.length > 1
                    "
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
                    <router-link :to="`/inventory/${produceInventoryRow.$id}`" class="text-primary">
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
      :is-perennial="isPerennial"
      :is-subsequent-harvest="hasCompletedHarvests"
      :harvest-frequency="crop?.harvest_frequency_days"
      :days-since-last-harvest="daysSinceLastHarvest"
      @submit="onEntrySubmit"
    />

    <!-- Story 3.6: Confirm Mark Planting Complete Dialog -->
    <q-dialog v-model="finalizeDialogOpen" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="check_circle" color="positive" text-color="white" />
          <span class="q-ml-sm">Mark planting as complete?</span>
        </q-card-section>
        <q-card-section>
          <p>
            This will finalize the planting and mark any in-progress harvest as completed. This
            action cannot be undone.
          </p>
          <p v-if="currentHarvest?.status === 'In Progress'" class="text-warning">
            <q-icon name="info" />
            The current harvest will also be marked as completed.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn
            flat
            label="Mark Complete"
            color="positive"
            @click="onFinalizePlanting"
            :loading="finalizing"
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
  // Prefer the in-progress one if exists, otherwise most recent by date
  const inProgress = list.find((h) => h.status === 'In Progress');
  if (inProgress) return inProgress;
  // Return most recent harvest by start date
  return [...list].sort(
    (a, b) => new Date(b.harvest_start_date).getTime() - new Date(a.harvest_start_date).getTime(),
  )[0];
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
// Story 3.6: Perennial / Continuous Picking
// ---------------------------------------------------------------------------

const finalizeDialogOpen = ref(false);
const finalizing = ref(false);

// Check if this is a perennial crop
const isPerennial = computed(() => {
  return crop.value?.crop_type === 'Perennial';
});

// Get all harvests for this planting (for perennials)
const allPlantingHarvests = computed(() => {
  if (!planting.value) return [];
  return farmStore.harvestsByPlanting(planting.value.$id);
});

// Get completed harvests for this planting
const completedHarvests = computed(() => {
  return allPlantingHarvests.value.filter((h) => h.status === 'Completed');
});

// Check if there are completed harvests (for subsequent harvest UI)
const hasCompletedHarvests = computed(() => {
  return completedHarvests.value.length > 0;
});

// Check if current harvest is continuous picking
const isContinuousPicking = computed(() => {
  return currentHarvest.value?.is_continuous_picking || false;
});

// Calculate days since last harvest for perennials
const daysSinceLastHarvest = computed(() => {
  if (completedHarvests.value.length === 0) return null;
  const lastHarvest = [...completedHarvests.value].sort(
    (a, b) =>
      new Date(b.harvest_end_date || b.harvest_start_date) -
      new Date(a.harvest_end_date || a.harvest_start_date),
  )[0];
  const lastDate = new Date(lastHarvest.harvest_end_date || lastHarvest.harvest_start_date);
  return Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
});

// Calculate cumulative yield across all harvests
const cumulativeYield = computed(() => {
  return completedHarvests.value.reduce(
    (sum, h) => sum + (parseFloat(h.total_quantity_kg) || 0),
    0,
  );
});

// Calculate cumulative labor cost across all harvests
const cumulativeLaborCost = computed(() => {
  return completedHarvests.value.reduce((sum, h) => sum + (parseFloat(h.total_labor_cost) || 0), 0);
});

// Frequency alert for perennials
const frequencyAlert = computed(() => {
  if (!isPerennial.value || !crop.value?.harvest_frequency_days) return null;

  const frequency = crop.value.harvest_frequency_days;
  const daysSince = daysSinceLastHarvest.value;

  if (daysSince === null) {
    return {
      type: 'info',
      message: `Recommended harvest frequency: every ${frequency} days`,
    };
  }

  const daysOverdue = daysSince - frequency;

  if (daysOverdue > 7) {
    return {
      type: 'negative',
      message: `Overdue for harvest by ${daysOverdue} days!`,
    };
  } else if (daysOverdue > 0) {
    return {
      type: 'warning',
      message: `Harvest is ${daysOverdue} days overdue`,
    };
  } else if (daysOverdue >= -7) {
    return {
      type: 'positive',
      message: `Ready for harvest (${Math.abs(daysOverdue)} days until next recommended)`,
    };
  } else {
    return {
      type: 'info',
      message: `Next harvest recommended in ${Math.abs(daysOverdue)} days`,
    };
  }
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
      if (harvestList[0].status === 'Completed') {
        produceInventoryRow.value = await inventoryStore.findFarmProduceRow(result.data.$id);
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
 * Story 3.6: Handles continuous picking flag for perennial crops.
 */
async function onEntrySubmit(entryData) {
  entrySubmitting.value = true;
  // Story 3.6: Create mode if no harvest OR if current harvest is completed
  const isCreateMode = !currentHarvest.value || currentHarvest.value?.status === 'Completed';
  try {
    let result;
    if (isCreateMode) {
      // Story 3.6: Get next harvest sequence for perennials with continuous picking
      let harvestSequence = 1;
      if (isPerennial.value && entryData.is_continuous_picking) {
        harvestSequence = await farmStore.getNextHarvestSequence(planting.value.$id);
      }

      // Create mode: build a new harvest from this first entry
      // Include continuous picking data for perennials
      const harvestOptions = {
        harvestNotes: entryData.notes || null,
        isContinuousPicking: entryData.is_continuous_picking || false,
        harvestSequence: harvestSequence,
      };

      result = await farmStore.createHarvestWithFirstEntry(
        planting.value.$id,
        entryData,
        harvestOptions,
      );
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
      message: isCreateMode ? 'Harvest started' : 'Entry added',
      position: 'top',
    });
    entryDialogOpen.value = false;
  } finally {
    entrySubmitting.value = false;
  }
}

function confirmMarkComplete() {
  // Story 3.6: Different messaging for perennials with continuous picking
  const isPerennialCrop = isPerennial.value;
  const isContinuous = isContinuousPicking.value;

  let title = 'Mark harvest complete?';
  let message =
    `The harvest will be finalized and no further entries can be added. ` +
    `The planting status will move to "completed". This cannot be undone.`;

  // Story 3.6: For perennials with continuous picking, show different message
  if (isPerennialCrop && isContinuous) {
    title = 'Complete this harvest?';
    message =
      `This will mark the current harvest as completed. ` +
      `The planting will remain in "harvesting" status for the next harvest cycle. ` +
      `You can record the next harvest or mark the planting as complete when finished.`;
  }

  $q.dialog({
    title,
    message,
    ok: { label: 'Mark Complete', color: 'positive' },
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    // Story 3.6: Pass continuous picking flag for perennials
    const isContinuousHarvest = isPerennialCrop && isContinuous;
    const result = await farmStore.markHarvestComplete(currentHarvest.value.$id, {
      isContinuousPicking: isContinuousHarvest,
    });

    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to mark harvest complete',
        position: 'top',
      });
      return;
    }
    if (result.warning) {
      $q.notify({
        type: 'warning',
        message: result.warning,
        position: 'top',
        timeout: 8000,
      });
    }

    // Story 3.6: Different success message for continuous picking
    if (result.isContinuousPicking) {
      $q.notify({
        type: 'positive',
        message: 'Harvest completed. You can now record the next harvest.',
        position: 'top',
      });
    } else {
      $q.notify({ type: 'positive', message: 'Harvest completed', position: 'top' });
    }

    // Re-fetch the inventory row for the completed-view link
    produceInventoryRow.value = await inventoryStore.findFarmProduceRow(planting.value.$id);
  });
}

/**
 * Story 3.6: Open the finalize planting dialog for perennials
 */
function openFinalizeDialog() {
  finalizeDialogOpen.value = true;
}

/**
 * Story 3.6: Finalize a perennial planting (mark as complete)
 */
async function onFinalizePlanting() {
  finalizing.value = true;
  try {
    const result = await farmStore.finalizePerennialPlanting(planting.value.$id);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to finalize planting',
        position: 'top',
      });
      return;
    }
    $q.notify({
      type: 'positive',
      message: 'Planting marked as complete',
      position: 'top',
    });
    finalizeDialogOpen.value = false;
  } finally {
    finalizing.value = false;
  }
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

<style scoped>
.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
