<!--
  CreateHarvestPage.vue
  Page for creating new harvest records with type selection and forms.

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
        <div class="text-h6 q-mb-md">Error Loading Planting</div>
        <div class="text-body1 text-grey-7 q-mb-md">{{ error }}</div>
        <q-btn color="primary" label="Back to Planting" @click="goBack" />
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="planting">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="goBack" />
          <div>
            <h5 class="q-my-none">Record Harvest</h5>
            <p class="text-grey q-mt-xs q-mb-none">
              {{ cropName }} | {{ plotName }} | Planted: {{ formatDate(planting.planting_date) }}
            </p>
          </div>
        </div>
        <HarvestStatusBadge :status="planting.status" />
      </div>

      <!-- Validation Warning -->
      <q-banner v-if="!canRecordHarvest" rounded class="bg-orange-1 text-orange-9 q-mb-md">
        <template #avatar>
          <q-icon name="warning" />
        </template>
        <div class="text-weight-bold">Cannot Record Harvest</div>
        <div>
          Planting must be in 'Harvesting' status to record harvest. Current status:
          {{ planting.status }}
        </div>
      </q-banner>

      <!-- Harvest Creation Form -->
      <div v-if="canRecordHarvest" class="row q-col-gutter-md">
        <!-- Left Column - Type Selection -->
        <div class="col-12 col-lg-4">
          <HarvestTypeSelector v-model="harvestType" />
        </div>

        <!-- Right Column - Form -->
        <div class="col-12 col-lg-8">
          <!-- Single Day Form -->
          <SingleDayHarvestForm
            v-if="harvestType === 'Single Day'"
            ref="singleDayFormRef"
            :planting-date="planting.planting_date"
            :initial-data="singleDayData"
            :loading="loading"
            @submit="onSingleDaySubmit"
            @cancel="goBack"
          />

          <!-- Multi-Day Form -->
          <MultiDayHarvestForm
            v-else-if="harvestType === 'Multi-Day Aggregate'"
            ref="multiDayFormRef"
            :planting-date="planting.planting_date"
            :initial-data="multiDayData"
            :loading="loading"
            @submit="onMultiDaySubmit"
            @cancel="goBack"
          />
        </div>
      </div>
    </template>

    <!-- Confirmation Dialog -->
    <HarvestConfirmationDialog
      v-model="showConfirmation"
      :harvest-data="pendingHarvest"
      :planting-info="plantingInfo"
      :loading="loading"
      @confirm="onConfirmHarvest"
      @back="onBackToEdit"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import { formatDate } from 'src/utils/dateUtils';
//import { format, parseISO } from 'date-fns';

// Components
import HarvestTypeSelector from '../components/HarvestTypeSelector.vue';
import HarvestStatusBadge from '../components/HarvestStatusBadge.vue';
import SingleDayHarvestForm from '../components/SingleDayHarvestForm.vue';
import MultiDayHarvestForm from '../components/MultiDayHarvestForm.vue';
import HarvestConfirmationDialog from '../components/HarvestConfirmationDialog.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const { hasPermission } = usePermissions();

// State
const isLoading = ref(true);
const loading = ref(false);
const error = ref(null);
const planting = ref(null);
const harvestType = ref('Single Day');

// Form data
const singleDayData = ref({});
const multiDayData = ref({});

// Dialog state
const showConfirmation = ref(false);
const pendingHarvest = ref(null);

// Form refs
const singleDayFormRef = ref(null);
const multiDayFormRef = ref(null);

// Computed
const canRecordHarvest = computed(() => {
  return planting.value?.status?.toLowerCase() === 'harvesting';
});

const cropName = computed(() => {
  return farmStore.getCropNameById(planting.value?.crop_id);
});

const plotName = computed(() => {
  const plot = farmStore.plots.find((p) => p.$id === planting.value?.plot_id);
  return plot?.name || 'Unknown Plot';
});

const plantingInfo = computed(() => ({
  cropName: cropName.value,
  plotName: plotName.value,
  plantingDate: planting.value?.planting_date,
}));

// Load planting data
async function loadPlanting() {
  try {
    isLoading.value = true;
    error.value = null;

    const plantingId = route.params.id;
    if (!plantingId) {
      error.value = 'No planting ID provided';
      return;
    }

    // Fetch planting details
    const result = await farmStore.fetchPlantingById(plantingId);
    if (!result.success) {
      error.value = result.error || 'Failed to load planting';
      return;
    }

    planting.value = result.data;

    // Ensure required data is loaded
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops();
    }
    if (!farmStore.plotsLoaded) {
      await farmStore.fetchPlots();
    }
  } catch (err) {
    console.error('Error loading planting:', err);
    error.value = 'Failed to load planting data';
  } finally {
    isLoading.value = false;
  }
}

// Form submission handlers
async function onSingleDaySubmit(formData) {
  pendingHarvest.value = formData;
  showConfirmation.value = true;
}

async function onMultiDaySubmit(formData) {
  pendingHarvest.value = formData;
  showConfirmation.value = true;
}

// Confirmation handlers
async function onConfirmHarvest() {
  try {
    loading.value = true;

    const harvestData = {
      ...pendingHarvest.value,
      planting_id: planting.value.$id,
    };

    const result = await farmStore.createHarvest(harvestData);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create harvest');
    }

    $q.notify({
      type: 'positive',
      message: 'Harvest created successfully!',
      position: 'top',
    });

    // Navigate to harvest detail page
    router.push(`/farm/harvests/${result.data.$id}`);
  } catch (err) {
    console.error('Error creating harvest:', err);
    $q.notify({
      type: 'negative',
      message: err.message || 'Failed to create harvest',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
}

function onBackToEdit() {
  showConfirmation.value = false;
  // Focus back to the appropriate form
  if (harvestType.value === 'Single Day') {
    singleDayFormRef.value?.validate();
  } else {
    multiDayFormRef.value?.validate();
  }
}

// Navigation
function goBack() {
  router.push(`/farm/plantings/${planting.value?.$id}`);
}

// Permission check
function checkPermissions() {
  if (!hasPermission('farm:write')) {
    router.push('/farm/dashboard');
    $q.notify({
      type: 'negative',
      message: 'You do not have permission to record harvests',
      position: 'top',
    });
  }
}

// Initialize
onMounted(async () => {
  checkPermissions();
  await loadPlanting();
});
</script>

<style scoped>
.q-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
