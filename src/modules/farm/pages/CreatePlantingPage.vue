<!--
  CreatePlantingPage.vue
  Form for recording new plantings with seed inventory and labor tracking.
  
  Story 3.3: Farm Module - Planting Records with Seed Inventory and Labor Tracking
-->
<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <!-- Error State -->
    <div v-else-if="loadError" class="flex flex-center q-pa-xl text-negative">
      <div class="text-center">
        <q-icon name="error" size="3em" class="q-mb-md" />
        <div class="text-h6">Failed to load data</div>
        <div class="q-mt-sm">{{ loadError }}</div>
        <q-btn color="primary" label="Retry" class="q-mt-md" @click="loadPageData" />
      </div>
    </div>

    <!-- Active Planting Warning -->
    <div v-else-if="hasActivePlanting" class="flex flex-center q-pa-xl">
      <q-card class="text-center q-pa-lg" style="max-width: 500px">
        <q-card-section>
          <q-icon name="warning" size="3em" color="warning" class="q-mb-md" />
          <div class="text-h6">Active Planting Exists</div>
          <p class="q-mt-sm">
            {{ plot?.name }} already has an active
            <strong>{{ activePlanting?.crop?.crop_name || 'crop' }}</strong>
            planting (status: {{ activePlanting?.status }}).
          </p>
          <p>Mark the existing planting as Completed or Failed before creating a new one.</p>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn flat color="primary" label="View Active Planting" @click="viewActivePlanting" />
          <q-btn flat label="Back to Plot" @click="goBackToPlot" />
        </q-card-actions>
      </q-card>
    </div>

    <!-- Form Content -->
    <template v-else>
      <!-- Header -->
      <div class="row items-center q-mb-lg">
        <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="goBackToPlot" />
        <div>
          <h5 class="q-my-none">Record New Planting</h5>
          <p v-if="plot" class="text-grey q-mt-xs q-mb-none">
            Plot: {{ plot.name }} ({{ formatSize(plot.size_hectares) }} hectares)
          </p>
        </div>
      </div>

      <q-form @submit="handleSubmit">
        <div class="row q-col-gutter-md">
          <!-- Core Fields Column -->
          <div class="col-12 col-md-6">
            <q-card>
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Planting Details</div>

                <!-- Crop Selection -->
                <q-select
                  v-model="form.crop_id"
                  :options="cropOptions"
                  option-value="$id"
                  option-label="displayLabel"
                  emit-value
                  map-options
                  label="Crop *"
                  :error="!!errors.crop_id"
                  :error-message="errors.crop_id"
                  outlined
                  class="q-mb-md"
                  :rules="[(val) => !!val || 'Crop is required']"
                />

                <!-- Planting Date -->
                <q-input
                  v-model="form.planting_date"
                  type="date"
                  label="Planting Date *"
                  :error="!!errors.planting_date"
                  :error-message="errors.planting_date"
                  outlined
                  class="q-mb-md"
                />

                <!-- Expected Harvest Date -->
                <q-input
                  v-model="form.expected_harvest_date"
                  type="date"
                  label="Expected Harvest Date *"
                  :error="!!errors.expected_harvest_date"
                  :error-message="errors.expected_harvest_date"
                  outlined
                  class="q-mb-md"
                  hint="Auto-calculated from crop maturity days, but can be overridden"
                >
                  <template v-if="daysUntilHarvest !== null" #append>
                    <q-badge :color="daysUntilHarvest < 0 ? 'negative' : 'info'">
                      {{ daysUntilHarvest < 0 ? daysUntilHarvest : '+' + daysUntilHarvest }} days
                    </q-badge>
                  </template>
                </q-input>

                <!-- Notes -->
                <q-input
                  v-model="form.notes"
                  type="textarea"
                  label="Notes"
                  outlined
                  rows="3"
                  hint="General planting notes, observations, etc."
                />
              </q-card-section>
            </q-card>

            <!-- Labor Costs Card -->
            <q-card class="q-mt-md">
              <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                  <div class="text-subtitle1 text-weight-medium">Labor Costs</div>
                  <q-icon name="info" color="grey" size="sm">
                    <q-tooltip
                      >Record total labor cost for this planting. Per-worker tracking available in
                      future updates.</q-tooltip
                    >
                  </q-icon>
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-6">
                    <q-input
                      v-model.number="form.planting_labor_farmhands"
                      type="number"
                      label="Number of Farmhands"
                      outlined
                      min="0"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.planting_labor_cost"
                      type="number"
                      label="Labor Cost (ZMW)"
                      outlined
                      min="0"
                      prefix="ZMW"
                    />
                  </div>
                </div>

                <q-banner v-if="errors.laborWarning" class="q-mt-sm bg-warning text-dark" dense>
                  <template #avatar>
                    <q-icon name="warning" />
                  </template>
                  {{ errors.laborWarning }}
                </q-banner>

                <q-input
                  v-model="form.planting_labor_notes"
                  type="textarea"
                  label="Labor Notes"
                  outlined
                  rows="2"
                  class="q-mt-sm"
                  hint="Task description, worker names, hours worked, etc."
                />
              </q-card-section>
            </q-card>
          </div>

          <!-- Seed & Costs Column -->
          <div class="col-12 col-md-6">
            <!-- Seed Source Card -->
            <q-card>
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Seed Source</div>

                <!-- Seed Source Selection -->
                <q-option-group
                  v-model="form.seed_source"
                  :options="seedSourceOptions"
                  color="primary"
                  inline
                  class="q-mb-md"
                />

                <!-- From Inventory Fields -->
                <template v-if="isFromInventory">
                  <q-select
                    v-model="form.seed_inventory_id"
                    :options="availableSeedInventory"
                    option-value="$id"
                    option-label="displayLabel"
                    emit-value
                    map-options
                    label="Select Seed Inventory *"
                    :error="!!errors.seed_inventory_id"
                    :error-message="errors.seed_inventory_id"
                    outlined
                    class="q-mb-md"
                  />

                  <q-input
                    v-model.number="form.seeds_used"
                    type="number"
                    label="Seeds Used *"
                    :error="!!errors.seeds_used"
                    :error-message="errors.seeds_used"
                    outlined
                    class="q-mb-md"
                    :suffix="selectedInventory?.unit || ''"
                  />

                  <!-- Calculated vs Override Seed Cost -->
                  <div class="row items-center q-mb-md">
                    <q-input
                      v-model.number="form.seed_cost"
                      type="number"
                      label="Seed Cost (ZMW)"
                      outlined
                      class="col"
                      prefix="ZMW"
                      :disable="!form.seed_cost_override"
                    />
                    <q-checkbox
                      v-model="form.seed_cost_override"
                      label="Override cost"
                      class="q-ml-sm"
                    />
                  </div>

                  <q-banner
                    v-if="!form.seed_cost_override && calculatedSeedCost > 0"
                    dense
                    class="bg-info"
                  >
                    <template #avatar>
                      <q-icon name="calculate" />
                    </template>
                    Auto-calculated: {{ selectedInventory?.unit_cost }} × {{ form.seeds_used }} =
                    ZMW {{ calculatedSeedCost.toFixed(2) }}
                  </q-banner>
                </template>

                <!-- Purchased Separately Fields -->
                <template v-if="isPurchased">
                  <q-input
                    v-model.number="form.seed_cost"
                    type="number"
                    label="Seed Cost (ZMW) *"
                    :error="!!errors.seed_cost"
                    :error-message="errors.seed_cost"
                    outlined
                    class="q-mb-md"
                    prefix="ZMW"
                  />

                  <q-input
                    v-model="form.seed_vendor"
                    label="Vendor/Supplier"
                    outlined
                    class="q-mb-md"
                  />

                  <q-input
                    v-model="form.seed_notes"
                    type="textarea"
                    label="Purchase Notes"
                    outlined
                    rows="2"
                  />
                </template>

                <!-- Donated Fields -->
                <template v-if="isDonated">
                  <q-input v-model="form.seed_donor" label="Donor Name" outlined class="q-mb-md" />

                  <q-input
                    v-model="form.seed_notes"
                    type="textarea"
                    label="Donation Notes"
                    outlined
                    rows="2"
                    hint="Seed cost will be recorded as ZMW 0"
                  />
                </template>
              </q-card-section>
            </q-card>

            <!-- Other Costs Card -->
            <q-card class="q-mt-md">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Other Costs</div>

                <q-input
                  v-model.number="form.planting_other_costs"
                  type="number"
                  label="Other Costs (ZMW)"
                  outlined
                  class="q-mb-md"
                  prefix="ZMW"
                  hint="Fertilizer, pesticides, equipment rental, etc."
                />

                <q-input
                  v-model="form.planting_other_costs_notes"
                  type="textarea"
                  label="Cost Details"
                  outlined
                  rows="2"
                  hint="Breakdown of other expenses"
                />
              </q-card-section>
            </q-card>

            <!-- Cost Summary Card -->
            <q-card class="q-mt-md bg-primary text-white">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium">Total Planting Investment</div>
                <div class="text-h4 q-mt-sm">ZMW {{ totalPlantingInvestment.toFixed(2) }}</div>
                <div class="text-caption q-mt-xs">
                  Seed: ZMW {{ finalSeedCost.toFixed(2) }} + Labor: ZMW
                  {{ (form.planting_labor_cost || 0).toFixed(2) }} + Other: ZMW
                  {{ (form.planting_other_costs || 0).toFixed(2) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Submit Buttons -->
        <div class="row justify-end q-mt-lg q-gutter-sm">
          <q-btn flat label="Cancel" @click="goBackToPlot" />
          <q-btn
            type="submit"
            color="primary"
            label="Record Planting"
            icon="save"
            :loading="isSubmitting"
          />
        </div>
      </q-form>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePlantingForm, SEED_SOURCES } from '../composables/usePlantingForm';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();

const plotId = computed(() => route.params.id);
const plot = computed(() => farmStore.currentPlot);

const isLoading = ref(true);
const loadError = ref(null);

// Initialize form composable
const {
  form,
  isSubmitting,
  errors,
  selectedInventory,
  availableSeedInventory,
  isFromInventory,
  isPurchased,
  isDonated,
  calculatedSeedCost,
  finalSeedCost,
  totalPlantingInvestment,
  submit,
  loadData,
  formatInventoryOption,
  getDaysUntilHarvest,
} = usePlantingForm(plotId.value);

// Computed for template
const hasActivePlanting = computed(() => {
  if (!plotId.value || !farmStore.plantingsLoaded) return false;
  return farmStore.hasActivePlanting(plotId.value);
});

const activePlanting = computed(() => {
  if (!plotId.value) return null;
  return farmStore.getActivePlantingForPlot(plotId.value);
});

const daysUntilHarvest = computed(() => getDaysUntilHarvest());

const cropOptions = computed(() => {
  return farmStore.activeCrops.map((crop) => ({
    ...crop,
    displayLabel: `${crop.crop_name} (${crop.category}) - ${crop.maturity_days} days to harvest`,
  }));
});

const seedSourceOptions = [
  { label: 'From Inventory', value: SEED_SOURCES.FROM_INVENTORY },
  { label: 'Purchased Separately', value: SEED_SOURCES.PURCHASED_SEPARATELY },
  { label: 'Donated', value: SEED_SOURCES.DONATED },
];

// Enhance inventory options with display label
const enhancedInventoryOptions = computed(() => {
  return availableSeedInventory.value.map((item) => ({
    ...item,
    displayLabel: formatInventoryOption(item),
  }));
});

onMounted(async () => {
  await loadPageData();
});

async function loadPageData() {
  isLoading.value = true;
  loadError.value = null;

  try {
    // Load plot data
    const plotResult = await farmStore.fetchPlotById(plotId.value);
    if (!plotResult.success) {
      loadError.value = 'Failed to load plot data';
      return;
    }

    // Load plantings for this plot to check active status
    await farmStore.fetchPlantingsByPlot(plotId.value);

    // Load form dependencies (crops, inventory)
    await loadData();

    // Enhance inventory options
    form.value.availableInventory = enhancedInventoryOptions.value;
  } catch (error) {
    console.error('Error loading page data:', error);
    loadError.value = error.message || 'Failed to load data';
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  const result = await submit();

  if (result.success) {
    const cropName = farmStore.getCropNameById(form.value.crop_id);
    $q.notify({
      type: 'positive',
      message: `${cropName} planting recorded on ${plot.value?.name}. Expected harvest: ${form.value.expected_harvest_date}`,
      position: 'top',
    });
    router.push(`/farm/plots/${plotId.value}`);
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to record planting',
      position: 'top',
    });
  }
}

function goBackToPlot() {
  router.push(`/farm/plots/${plotId.value}`);
}

function viewActivePlanting() {
  if (activePlanting.value?.$id) {
    router.push(`/farm/plantings/${activePlanting.value.$id}`);
  }
}

function formatSize(size) {
  if (size === null || size === undefined) return '-';
  return Number(size).toFixed(2);
}
</script>
