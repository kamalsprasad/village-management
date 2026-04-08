<!--
  PlantingDetailPage.vue
  Detail page for a single planting record.
  
  Story 3.3: Farm Module - Planting Records
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
      <div class="row items-center justify-between q-mb-lg">
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
            @click="editPlanting"
          />
        </div>
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
                    <q-badge v-if="daysUntilHarvest !== null" :color="harvestBadgeColor" class="q-ml-sm">
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
                <div v-if="planting.notes" class="row">
                  <div class="col-5 text-grey">Notes:</div>
                  <div class="col-7">{{ planting.notes }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Seed Information Card -->
          <q-card class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Seed Information</div>

              <div class="q-gutter-y-sm">
                <div class="row">
                  <div class="col-5 text-grey">Source:</div>
                  <div class="col-7">{{ planting.seed_source || 'Not specified' }}</div>
                </div>

                <div v-if="planting.seed_inventory_id && inventoryItem" class="row">
                  <div class="col-5 text-grey">From Inventory:</div>
                  <div class="col-7">
                    <router-link :to="`/inventory/${inventoryItem.$id}`" class="text-primary">
                      {{ inventoryItem.item_name }}
                    </router-link>
                  </div>
                </div>

                <div v-if="planting.seeds_used" class="row">
                  <div class="col-5 text-grey">Quantity Used:</div>
                  <div class="col-7">
                    {{ planting.seeds_used }} {{ inventoryItem?.unit || 'units' }}
                  </div>
                </div>

                <div class="row">
                  <div class="col-5 text-grey">Seed Cost:</div>
                  <div class="col-7">ZMW {{ (planting.seed_cost || 0).toFixed(2) }}</div>
                </div>

                <div v-if="planting.seed_vendor" class="row">
                  <div class="col-5 text-grey">Vendor:</div>
                  <div class="col-7">{{ planting.seed_vendor }}</div>
                </div>

                <div v-if="planting.seed_notes" class="row">
                  <div class="col-5 text-grey">Notes:</div>
                  <div class="col-7">{{ planting.seed_notes }}</div>
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
                  <q-item-section>Seed Cost</q-item-section>
                  <q-item-section side>ZMW {{ (planting.seed_cost || 0).toFixed(2) }}</q-item-section>
                </q-item>

                <q-item>
                  <q-item-section>
                    Labor Cost
                    <span v-if="planting.planting_labor_farmhands" class="text-grey text-caption">
                      ({{ planting.planting_labor_farmhands }} farmhands)
                    </span>
                  </q-item-section>
                  <q-item-section side>
                    ZMW {{ (planting.planting_labor_cost || 0).toFixed(2) }}
                  </q-item-section>
                </q-item>

                <q-item>
                  <q-item-section>
                    Other Costs
                    <span v-if="planting.planting_other_costs_notes" class="text-grey text-caption">
                      ({{ planting.planting_other_costs_notes }})
                    </span>
                  </q-item-section>
                  <q-item-section side>
                    ZMW {{ (planting.planting_other_costs || 0).toFixed(2) }}
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

          <!-- Labor Details Card -->
          <q-card v-if="hasLaborDetails" class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Labor Details</div>

              <div class="q-gutter-y-sm">
                <div v-if="planting.planting_labor_farmhands" class="row">
                  <div class="col-5 text-grey">Farmhands:</div>
                  <div class="col-7">{{ planting.planting_labor_farmhands }}</div>
                </div>
                <div v-if="planting.planting_labor_notes" class="row">
                  <div class="col-5 text-grey">Notes:</div>
                  <div class="col-7">{{ planting.planting_labor_notes }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Other Costs Details Card -->
          <q-card v-if="hasOtherCostsDetails" class="q-mt-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Other Expenses</div>

              <div class="q-gutter-y-sm">
                <div v-if="planting.planting_other_costs" class="row">
                  <div class="col-5 text-grey">Amount:</div>
                  <div class="col-7">ZMW {{ planting.planting_other_costs.toFixed(2) }}</div>
                </div>
                <div v-if="planting.planting_other_costs_notes" class="row">
                  <div class="col-5 text-grey">Details:</div>
                  <div class="col-7">{{ planting.planting_other_costs_notes }}</div>
                </div>
              </div>
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
                <!-- Harvest details will go here -->
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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { usePermissions } from 'src/composables/usePermissions';
import { format, parseISO, differenceInDays } from 'date-fns';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();
const { hasPermission } = usePermissions();

const isLoading = ref(true);
const inventoryItem = ref(null);
const harvest = ref(null); // Placeholder for future harvest integration

const plantingId = computed(() => route.params.id);
const planting = computed(() => farmStore.currentPlanting);

const canWrite = computed(() => hasPermission('farm:write'));

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
    Planted: 'info',
    Growing: 'positive',
    Harvesting: 'warning',
    Completed: 'positive',
    Failed: 'negative',
  };
  return colors[planting.value?.status] || 'grey';
});

const totalInvestment = computed(() => {
  if (!planting.value) return 0;
  return (
    (planting.value.seed_cost || 0) +
    (planting.value.planting_labor_cost || 0) +
    (planting.value.planting_other_costs || 0)
  );
});

const hasLaborDetails = computed(() => {
  return planting.value?.planting_labor_farmhands || planting.value?.planting_labor_notes;
});

const hasOtherCostsDetails = computed(() => {
  return planting.value?.planting_other_costs || planting.value?.planting_other_costs_notes;
});

const daysUntilHarvest = computed(() => {
  if (!planting.value?.expected_harvest_date) return null;
  try {
    const today = new Date();
    const harvestDate = parseISO(planting.value.expected_harvest_date);
    return differenceInDays(harvestDate, today);
  } catch {
    return null;
  }
});

const daysUntilHarvestText = computed(() => {
  const days = daysUntilHarvest.value;
  if (days === null) return '';
  if (days < 0) return `${days} days overdue`;
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

    // Load related data
    if (planting.value?.plot_id && !farmStore.plotsLoaded) {
      await farmStore.fetchPlots();
    }
    if (planting.value?.crop_id && !farmStore.cropsLoaded) {
      await farmStore.fetchCrops();
    }

    // Load inventory item if referenced
    if (planting.value?.seed_inventory_id) {
      try {
        const invResult = await inventoryStore.fetchItemById(planting.value.seed_inventory_id);
        if (invResult.success) {
          inventoryItem.value = invResult.data;
        }
      } catch (e) {
        console.warn('Failed to load inventory item:', e);
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
  // Edit functionality will be implemented in Story 3.4
  $q.notify({
    type: 'info',
    message: 'Edit functionality coming in Story 3.4',
    position: 'top',
  });
}
</script>
