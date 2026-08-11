<!--
  CreatePlantingPage.vue
  Form for recording new plantings with seed inventory and labor tracking.
  
  Story 3.3: Farm Module - Planting Records with Seed Inventory and Labor Tracking
  Plot is locked from route param (:id). Plot selection happens before navigation
  (via plot detail page button or plantings list dialog).
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

    <!-- Form Content -->
    <template v-else>
      <!-- Header -->
      <div class="row items-center q-mb-lg">
        <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mr-md" />
        <div>
          <h5 class="q-my-none">Record New Planting</h5>
          <p v-if="plot" class="text-grey q-mt-xs q-mb-none">
            Plot: <strong>{{ plot.name }}</strong> ({{ formatSize(plot.size_hectares) }} ha total)
          </p>
        </div>
      </div>

      <!-- Active planting warning banner (non-blocking — multiple crops allowed) -->
      <q-banner v-if="hasActivePlanting" class="bg-warning text-dark q-mb-md" rounded dense>
        <template #avatar><q-icon name="info" /></template>
        This plot has an active planting ({{ activePlantingCropName }}). Recording another planting
        is allowed for multi-crop plots — use <em>Area Used</em> to track the portion of the plot.
        <template #action>
          <q-btn flat dense label="View Active" @click="viewActivePlanting" />
        </template>
      </q-banner>

      <q-form @submit.prevent="handleSubmit">
        <div class="row q-col-gutter-md">
          <!-- Left Column: Core Details + Labor -->
          <div class="col-12 col-md-6">
            <!-- Planting Details Card -->
            <q-card>
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Planting Details</div>

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
                />

                <q-input
                  v-model="form.planting_date"
                  type="date"
                  label="Planting Date *"
                  :error="!!errors.planting_date"
                  :error-message="errors.planting_date"
                  outlined
                  class="q-mb-md"
                />

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

                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-6">
                    <q-input
                      v-model.number="form.area_used_hectares"
                      type="number"
                      label="Area Used (ha)"
                      outlined
                      min="0"
                      :max="plot?.size_hectares || undefined"
                      hint="Portion of plot used for this crop"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.quantity_planted"
                      type="number"
                      label="Quantity Planted"
                      outlined
                      min="0"
                    >
                      <template #append>
                        <q-select
                          v-model="form.unit"
                          :options="unitOptions"
                          dense
                          borderless
                          style="min-width: 90px"
                        />
                      </template>
                    </q-input>
                  </div>
                </div>

                <q-input
                  v-model="form.notes"
                  type="textarea"
                  label="Notes"
                  outlined
                  rows="3"
                  hint="Observations, vendor details, donor name, special conditions, etc."
                />
              </q-card-section>
            </q-card>

            <!-- Labor Cost Card -->
            <q-card class="q-mt-md">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Labor Cost</div>
                <q-input
                  v-model.number="form.labor_cost"
                  type="number"
                  label="Labor Cost (ZMW)"
                  outlined
                  min="0"
                  prefix="ZMW"
                  hint="Total labor cost for planting activity (farmhands, days worked, etc.)"
                />
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column: Seed Source + Other Costs + Summary -->
          <div class="col-12 col-md-6">
            <!-- Seed / Inputs Source Card -->
            <q-card>
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Seed / Inputs Source</div>

                <q-option-group
                  v-model="form.seed_source"
                  :options="seedSourceOptions"
                  color="primary"
                  inline
                  class="q-mb-md"
                />

                <!-- From Inventory -->
                <template v-if="isFromInventory">
                  <q-select
                    v-model="form.seed_inventory_id"
                    :options="enhancedInventoryOptions"
                    option-value="$id"
                    option-label="displayLabel"
                    emit-value
                    map-options
                    label="Select Seed/Input Item *"
                    :error="!!errors.seed_inventory_id"
                    :error-message="errors.seed_inventory_id"
                    outlined
                    class="q-mb-md"
                  />

                  <q-input
                    v-model.number="form.seeds_used"
                    type="number"
                    label="Quantity Used *"
                    :error="!!errors.seeds_used"
                    :error-message="errors.seeds_used"
                    outlined
                    class="q-mb-md"
                    :suffix="selectedInventory?.unit || ''"
                    hint="Will be deducted from inventory stock"
                  />

                  <div class="row items-center q-mb-md">
                    <q-input
                      v-model.number="form.inputs_cost"
                      type="number"
                      label="Inputs Cost (ZMW)"
                      outlined
                      class="col"
                      prefix="ZMW"
                      :disable="!form.inputs_cost_override"
                      hint="Seeds + fertilizer + other inputs"
                    />
                    <q-checkbox
                      v-model="form.inputs_cost_override"
                      label="Override"
                      class="q-ml-sm"
                    />
                  </div>

                  <q-banner
                    v-if="!form.inputs_cost_override && calculatedInputsCost > 0"
                    dense
                    class="bg-blue-1 text-blue-9 q-mb-sm"
                  >
                    <template #avatar><q-icon name="calculate" color="blue" /></template>
                    Auto-calculated: {{ selectedInventory?.unit_cost }} × {{ form.seeds_used }} =
                    ZMW {{ calculatedInputsCost.toFixed(2) }}
                  </q-banner>
                </template>

                <!-- Purchased Separately -->
                <template v-if="isPurchased">
                  <q-input
                    v-model.number="form.inputs_cost"
                    type="number"
                    label="Inputs Cost (ZMW) *"
                    :error="!!errors.inputs_cost"
                    :error-message="errors.inputs_cost"
                    outlined
                    class="q-mb-md"
                    prefix="ZMW"
                    hint="Total cost of purchased seeds + any other inputs"
                  />
                </template>

                <!-- Donated -->
                <template v-if="isDonated">
                  <q-banner dense class="bg-green-1 text-green-9">
                    <template #avatar><q-icon name="volunteer_activism" color="green" /></template>
                    Inputs cost recorded as ZMW 0. Add donor/source details in Notes.
                  </q-banner>
                </template>
              </q-card-section>
            </q-card>

            <!-- Other Costs Card -->
            <q-card class="q-mt-md">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">Other Costs</div>
                <q-input
                  v-model.number="form.other_cost"
                  type="number"
                  label="Other Costs (ZMW)"
                  outlined
                  min="0"
                  prefix="ZMW"
                  hint="Equipment rental, transport, miscellaneous expenses"
                />
              </q-card-section>
            </q-card>

            <!-- Investment Summary Card -->
            <q-card class="q-mt-md bg-primary text-white">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium">Total Planting Investment</div>
                <div class="text-h4 q-mt-sm">ZMW {{ totalPlantingInvestment.toFixed(2) }}</div>
                <div class="text-caption q-mt-xs">
                  Inputs: ZMW {{ (form.inputs_cost || 0).toFixed(2) }} + Labor: ZMW
                  {{ (form.labor_cost || 0).toFixed(2) }} + Other: ZMW
                  {{ (form.other_cost || 0).toFixed(2) }}
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
import { useFarmStore } from '../stores/farm-store';
import { usePlantingForm, SEED_SOURCES } from '../composables/usePlantingForm';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();
const farmStore = useFarmStore();
const errorHandler = useErrorHandler();

const plotId = computed(() => route.params.id);
const plot = computed(() => farmStore.currentPlot);

const breadcrumbItems = computed(() => [
  ...(route.meta.breadcrumb || []),
  { label: plot.value?.name || 'Plot', to: `/farm/plots/${route.params.id}` },
]);
const currentLabel = 'Record New Planting';

const isLoading = ref(true);
const loadError = ref(null);

const {
  form,
  isSubmitting,
  errors,
  selectedInventory,
  availableSeedInventory,
  isFromInventory,
  isPurchased,
  isDonated,
  calculatedInputsCost,
  totalPlantingInvestment,
  submit,
  loadData,
  formatInventoryOption,
  getDaysUntilHarvest,
} = usePlantingForm(plotId.value);

const hasActivePlanting = computed(
  () => plotId.value && farmStore.plantingsLoaded && farmStore.hasActivePlanting(plotId.value),
);

const activePlantingCropName = computed(() => {
  const active = farmStore.getActivePlantingForPlot(plotId.value);
  return active ? farmStore.getCropNameById(active.crop_id) : '';
});

const daysUntilHarvest = computed(() => getDaysUntilHarvest());

const cropOptions = computed(() =>
  farmStore.activeCrops.map((crop) => ({
    ...crop,
    displayLabel: `${crop.crop_name} (${crop.category}) — ${crop.maturity_days} days`,
  })),
);

const enhancedInventoryOptions = computed(() =>
  availableSeedInventory.value.map((item) => ({
    ...item,
    displayLabel: formatInventoryOption(item),
  })),
);

const seedSourceOptions = [
  { label: 'From Inventory', value: SEED_SOURCES.FROM_INVENTORY },
  { label: 'Purchased', value: SEED_SOURCES.PURCHASED_SEPARATELY },
  { label: 'Donated', value: SEED_SOURCES.DONATED },
];

const unitOptions = ['kg', 'g', 'seedlings', 'cuttings', 'bundles', 'bags', 'litres', 'units'];

onMounted(loadPageData);

async function loadPageData() {
  isLoading.value = true;
  loadError.value = null;
  try {
    const plotResult = await farmStore.fetchPlotById(plotId.value);
    if (!plotResult.success) {
      loadError.value = 'Failed to load plot data';
      return;
    }
    await Promise.all([farmStore.fetchPlantingsByPlot(plotId.value), loadData()]);
  } catch (error) {
    loadError.value = error.message || 'Failed to load data';
    errorHandler.handleError(error, 'Failed to load data');
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  const result = await submit();
  if (result.success) {
    errorHandler.notifySuccess(
      `${farmStore.getCropNameById(form.value.crop_id)} planting recorded on ${plot.value?.name}. Expected harvest: ${form.value.expected_harvest_date || 'TBD'}.`,
    );
    router.push(`/farm/plots/${plotId.value}`);
  } else {
    errorHandler.notifyError(result.error || 'Failed to record planting');
  }
}

function goBackToPlot() {
  router.push(`/farm/plots/${plotId.value}`);
}

function viewActivePlanting() {
  const active = farmStore.getActivePlantingForPlot(plotId.value);
  if (active?.$id) router.push(`/farm/plantings/${active.$id}`);
}

function formatSize(size) {
  if (size === null || size === undefined) return '-';
  return Number(size).toFixed(2);
}
</script>
