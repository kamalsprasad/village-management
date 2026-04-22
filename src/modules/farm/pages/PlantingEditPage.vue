<!--
  PlantingEditPage.vue
  Limited-field edit form for a planting record.
  Crop, plot, planting date, and inputs cost are read-only to preserve the inventory audit trail.

  Story 3.4: Farm Module - Planting Status Tracking and Lifecycle Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner-dots size="50px" color="primary" />
    </div>

    <!-- Not Found -->
    <div v-else-if="!planting" class="flex flex-center q-pa-xl text-grey">
      <div class="text-center">
        <q-icon name="error" size="3em" class="q-mb-md" />
        <div class="text-h6">Planting not found</div>
        <q-btn color="primary" label="Back to Plantings" class="q-mt-md" @click="cancel" />
      </div>
    </div>

    <!-- Form -->
    <template v-else>
      <!-- Header -->
      <div class="row items-center q-mb-md">
        <q-btn icon="arrow_back" flat dense class="q-mr-md" @click="cancel" />
        <div>
          <h5 class="q-my-none">Edit Planting</h5>
          <p class="text-grey q-mt-xs q-mb-none">{{ cropName }} on {{ plotName }}</p>
        </div>
      </div>

      <!-- Info banner -->
      <q-banner rounded class="bg-blue-1 text-blue-9 q-mb-md">
        <template #avatar>
          <q-icon name="info" color="blue" />
        </template>
        Only limited fields can be edited to preserve the inventory audit trail.
      </q-banner>

      <div class="row q-col-gutter-md">
        <!-- Read-only info column -->
        <div class="col-12 col-md-5">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Read-Only Information</div>
              <div class="q-gutter-y-sm text-body2">
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
                  <div class="col-5 text-grey">Plot:</div>
                  <div class="col-7">
                    <router-link v-if="plot" :to="`/farm/plots/${plot.$id}`" class="text-primary">
                      {{ plot.name }}
                    </router-link>
                    <span v-else>{{ plotName }}</span>
                  </div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Planting Date:</div>
                  <div class="col-7">{{ formatDate(planting.planting_date) }}</div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Status:</div>
                  <div class="col-7">
                    <q-badge :color="statusColor">{{ planting.status }}</q-badge>
                    <div class="text-caption text-grey">Use 'Update Status' to change status</div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-5 text-grey">Inputs Cost:</div>
                  <div class="col-7">
                    ZMW {{ (planting.inputs_cost || 0).toFixed(2) }}
                    <div class="text-caption text-grey">
                      Cannot be edited — tied to inventory deduction at time of planting
                    </div>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Editable fields column -->
        <div class="col-12 col-md-7">
          <q-card>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">Editable Fields</div>

              <q-form @submit.prevent="save" class="q-gutter-y-md">
                <!-- Expected Harvest Date -->
                <q-input
                  v-model="form.expected_harvest_date"
                  label="Expected Harvest Date"
                  outlined
                  dense
                  type="date"
                  :error="!!dateError"
                  :error-message="dateError"
                  clearable
                >
                  <template #prepend>
                    <q-icon name="event" />
                  </template>
                </q-input>

                <!-- Labor Cost -->
                <q-input
                  v-model.number="form.labor_cost"
                  label="Labor Cost (ZMW)"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="0.01"
                  :rules="[(v) => v === null || v === '' || v >= 0 || 'Must be 0 or greater']"
                >
                  <template #prepend>
                    <span class="text-grey text-caption">ZMW</span>
                  </template>
                </q-input>

                <!-- Other Costs -->
                <q-input
                  v-model.number="form.other_cost"
                  label="Other Costs (ZMW)"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="0.01"
                  :rules="[(v) => v === null || v === '' || v >= 0 || 'Must be 0 or greater']"
                >
                  <template #prepend>
                    <span class="text-grey text-caption">ZMW</span>
                  </template>
                </q-input>

                <!-- Notes -->
                <q-input
                  v-model="form.notes"
                  label="Notes"
                  outlined
                  dense
                  type="textarea"
                  maxlength="1000"
                  rows="4"
                  :counter="form.notes && form.notes.length > 800"
                  hint="Seed source, vendor, labor details, etc."
                />

                <div class="row justify-end q-gutter-sm q-pt-sm">
                  <q-btn flat label="Cancel" :disable="isSaving" @click="cancel" />
                  <q-btn color="primary" label="Save Changes" :loading="isSaving" type="submit" />
                </div>
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { parseISO } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();

const isLoading = ref(true);
const isSaving = ref(false);

const plantingId = computed(() => route.params.id);
const planting = computed(() => farmStore.currentPlanting);

const form = ref({
  expected_harvest_date: '',
  labor_cost: null,
  other_cost: null,
  notes: '',
});

const plot = computed(() => {
  if (!planting.value?.plot_id) return null;
  return farmStore.plots.find((p) => p.$id === planting.value.plot_id);
});

const crop = computed(() => {
  if (!planting.value?.crop_id) return null;
  return farmStore.crops.find((c) => c.$id === planting.value.crop_id);
});

const cropName = computed(
  () => crop.value?.crop_name || farmStore.getCropNameById(planting.value?.crop_id),
);
const plotName = computed(() => plot.value?.name || planting.value?.plot_id || '');

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

const dateError = computed(() => {
  if (!form.value.expected_harvest_date || !planting.value?.planting_date) return null;
  try {
    const harvest = parseISO(form.value.expected_harvest_date);
    const planting_date = parseISO(planting.value.planting_date);
    if (harvest < planting_date) {
      return 'Expected harvest date must be on or after the planting date';
    }
  } catch {
    return null;
  }
  return null;
});

onMounted(async () => {
  isLoading.value = true;
  farmStore.clearCurrentPlanting();
  try {
    // If currentPlanting is already the right one, skip fetch
    if (farmStore.currentPlanting?.$id !== plantingId.value) {
      const result = await farmStore.fetchPlantingById(plantingId.value);
      if (!result.success) {
        $q.notify({ type: 'negative', message: 'Failed to load planting', position: 'top' });
        return;
      }
    }

    const loaders = [];
    if (!farmStore.plotsLoaded) loaders.push(farmStore.fetchPlots());
    if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
    if (loaders.length) await Promise.all(loaders);

    prefillForm();
  } finally {
    isLoading.value = false;
  }
});

function prefillForm() {
  if (!planting.value) return;
  let notes = planting.value.notes || '';
  // Strip structured failure reason prefix so user doesn't accidentally delete audit data
  const failureMatch = notes.match(/^\[FAILURE:\s*[^\]]+\](.*?)($|\n)/s);
  if (failureMatch) {
    notes = notes.slice(failureMatch[0].length).trim();
  }
  form.value = {
    expected_harvest_date: planting.value.expected_harvest_date
      ? planting.value.expected_harvest_date.substring(0, 10)
      : '',
    labor_cost: planting.value.labor_cost ?? null,
    other_cost: planting.value.other_cost ?? null,
    notes,
  };
}

async function save() {
  if (dateError.value) return;

  isSaving.value = true;
  try {
    const updateData = {
      labor_cost:
        form.value.labor_cost !== null && form.value.labor_cost !== ''
          ? Number(form.value.labor_cost)
          : 0,
      other_cost:
        form.value.other_cost !== null && form.value.other_cost !== ''
          ? Number(form.value.other_cost)
          : 0,
      notes: form.value.notes || null,
    };

    if (form.value.expected_harvest_date) {
      updateData.expected_harvest_date = new Date(form.value.expected_harvest_date).toISOString();
    } else {
      updateData.expected_harvest_date = null;
    }

    const result = await farmStore.updatePlanting(plantingId.value, updateData);

    if (result.success) {
      $q.notify({ type: 'positive', message: 'Planting updated successfully', position: 'top' });
      router.push(`/farm/plantings/${plantingId.value}`);
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to save changes',
        position: 'top',
      });
    }
  } catch (err) {
    console.error('Error saving planting:', err);
    $q.notify({ type: 'negative', message: 'An unexpected error occurred', position: 'top' });
  } finally {
    isSaving.value = false;
  }
}

function cancel() {
  router.push(`/farm/plantings/${plantingId.value}`);
}
</script>
