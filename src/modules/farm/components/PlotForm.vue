<!--
  PlotForm.vue
  Reusable form component for creating and editing plots.
  Used by PlotFormPage for both add and edit operations.
  
  Usage:
    <PlotForm
      :plot="existingPlot" (null for create mode)
      mode="create | edit"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
-->
<template>
  <q-form @submit="handleSubmit" class="plot-form">
    <div class="row q-col-gutter-md">
      <!-- Plot Name -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.name"
          label="Plot Name *"
          :rules="[
            (val) => !!val || 'Plot name is required',
            (val) => val.length <= 100 || 'Maximum 100 characters',
          ]"
          maxlength="100"
          outlined
          dense
        />
      </div>

      <!-- Size -->
      <div class="col-12 col-md-6">
        <q-input
          v-model.number="formData.size_hectares"
          label="Size (hectares) *"
          type="number"
          :rules="[
            (val) => (val !== null && val !== undefined) || 'Size is required',
            (val) => val > 0 || 'Size must be greater than 0',
            (val) => val <= 1000 || 'Maximum size is 1000 hectares',
          ]"
          min="0.01"
          max="1000"
          step="0.01"
          outlined
          dense
        />
      </div>

      <!-- Location Description -->
      <div class="col-12">
        <q-input
          v-model="formData.location_description"
          label="Location Description"
          type="textarea"
          rows="2"
          maxlength="500"
          outlined
          dense
        />
      </div>

      <!-- Soil Type -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.soil_type_id"
          :options="soilTypeOptions"
          option-value="value"
          option-label="label"
          label="Soil Type"
          outlined
          dense
          clearable
          emit-value
          map-options
        />
      </div>

      <!-- Status -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.status"
          :options="statusOptions"
          option-value="value"
          option-label="label"
          label="Status *"
          :rules="[(val) => !!val || 'Status is required']"
          outlined
          dense
          emit-value
          map-options
        />
      </div>

      <!-- Crop Manager -->
      <div class="col-12 col-md-6">
        <ResidentSearchInput
          v-model="formData.crop_manager_id"
          label="Assigned Crop Manager"
          hint="Search for a resident by name"
        />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="row justify-end q-gutter-sm q-mt-lg">
      <q-btn label="Cancel" color="grey" flat @click="$emit('cancel')" />
      <q-btn :label="submitLabel" type="submit" color="primary" :loading="isSubmitting" />
    </div>
  </q-form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';

const props = defineProps({
  plot: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value),
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const farmStore = useFarmStore();

// Form data
const formData = ref({
  name: '',
  size_hectares: null,
  location_description: '',
  soil_type_id: null,
  status: 'Active',
  crop_manager_id: null,
});

// Options
const statusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Fallow', value: 'Fallow' },
  { label: 'Retired', value: 'Retired' },
];

const soilTypeOptions = computed(() => {
  return farmStore.soilTypes.map((type) => ({
    label: type.name,
    value: type.$id,
  }));
});

const submitLabel = computed(() => {
  return props.mode === 'create' ? 'Create Plot' : 'Update Plot';
});

// Initialize form data if editing
onMounted(async () => {
  // Load soil types if not already loaded
  if (!farmStore.soilTypesLoaded) {
    await farmStore.fetchSoilTypes();
  }

  if (props.plot && props.mode === 'edit') {
    formData.value = {
      name: props.plot.name || '',
      size_hectares: props.plot.size_hectares || null,
      location_description: props.plot.location_description || '',
      soil_type_id: props.plot.soil_type_id || null,
      status: props.plot.status || 'Active',
      crop_manager_id: props.plot.crop_manager_id || null,
    };
  }
});

function handleSubmit() {
  emit('submit', { ...formData.value });
}
</script>

<style scoped>
.plot-form {
  max-width: 800px;
}
</style>
