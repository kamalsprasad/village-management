<!--
  CropForm.vue
  Reusable form component for creating and editing crops.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-form @submit="handleSubmit" class="crop-form">
    <div class="row q-col-gutter-md">
      <!-- Crop Name -->
      <div class="col-12 col-md-6">
        <q-input
          v-model="formData.crop_name"
          label="Crop Name *"
          :rules="[
            (val) => !!val || 'Crop name is required',
            (val) => val.length <= 100 || 'Maximum 100 characters',
          ]"
          maxlength="100"
          outlined
          dense
        />
      </div>

      <!-- Category -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.category"
          :options="categoryOptions"
          option-value="value"
          option-label="label"
          label="Category *"
          :rules="[(val) => !!val || 'Category is required']"
          outlined
          dense
          emit-value
          map-options
        />
      </div>

      <!-- Crop Type -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.crop_type"
          :options="typeOptions"
          option-value="value"
          option-label="label"
          label="Crop Type *"
          :rules="[(val) => !!val || 'Crop type is required']"
          outlined
          dense
          emit-value
          map-options
          @update:model-value="onTypeChange"
        />
      </div>

      <!-- Maturity Days -->
      <div class="col-12 col-md-6">
        <q-input
          v-model.number="formData.maturity_days"
          label="Maturity Days (to first harvest) *"
          type="number"
          :rules="[
            (val) => (val !== null && val !== undefined) || 'Maturity days is required',
            (val) => val > 0 || 'Must be greater than 0',
            (val) => val <= 1825 || 'Maximum is 1825 days (5 years)',
          ]"
          min="1"
          max="1825"
          outlined
          dense
          hint="Days from planting until first harvest"
        />
      </div>

      <!-- Harvest Frequency - Only for Perennials -->
      <div class="col-12 col-md-6" v-if="formData.crop_type === 'Perennial'">
        <q-input
          v-model.number="formData.harvest_frequency"
          label="Harvest Frequency (days)"
          type="number"
          :rules="[
            (val) => !val || val > 0 || 'Must be greater than 0',
            (val) => !val || val <= 365 || 'Maximum is 365 days',
          ]"
          min="1"
          max="365"
          outlined
          dense
          hint="Days between harvests (leave blank for annuals)"
        />
      </div>

      <!-- Typical Yield -->
      <div class="col-12 col-md-6">
        <q-input
          v-model.number="formData.typical_yield_per_hectare"
          label="Typical Yield (kg/hectare)"
          type="number"
          :rules="[(val) => !val || val >= 0 || 'Cannot be negative']"
          min="0"
          max="1000000"
          outlined
          dense
          hint="Average expected yield per hectare"
        />
      </div>

      <!-- Growing Season -->
      <div class="col-12 col-md-6">
        <q-select
          v-model="formData.growing_season"
          :options="seasonOptions"
          option-value="value"
          option-label="label"
          label="Growing Season"
          outlined
          dense
          clearable
          emit-value
          map-options
          hint="Optimal planting season"
        />
      </div>

      <!-- Notes -->
      <div class="col-12">
        <q-input
          v-model="formData.notes"
          label="Notes"
          type="textarea"
          rows="3"
          maxlength="500"
          outlined
          dense
          hint="Additional information about this crop (varieties, growing tips, etc.)"
        />
      </div>

      <!-- Active Toggle (Edit mode only) -->
      <div class="col-12" v-if="isEditMode">
        <q-toggle
          v-model="formData.is_active"
          label="Active (visible in planting forms)"
          color="positive"
        />
        <div class="text-caption text-grey q-ml-sm">
          Inactive crops are hidden when creating new plantings
        </div>
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
import { ref, computed, watch } from 'vue';

const props = defineProps({
  crop: {
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

// Form data
const formData = ref({
  crop_name: '',
  category: null,
  crop_type: 'Annual',
  maturity_days: null,
  harvest_frequency: null,
  typical_yield_per_hectare: null,
  growing_season: null,
  notes: '',
  is_active: true,
});

// Options
const categoryOptions = [
  { label: 'Grain', value: 'Grain' },
  { label: 'Legume', value: 'Legume' },
  { label: 'Vegetable', value: 'Vegetable' },
  { label: 'Root', value: 'Root' },
  { label: 'Fruit', value: 'Fruit' },
  { label: 'Other', value: 'Other' },
];

const typeOptions = [
  { label: 'Annual - Single harvest cycle', value: 'Annual' },
  { label: 'Perennial - Multiple harvest cycles', value: 'Perennial' },
];

const seasonOptions = [
  { label: 'Warm Season', value: 'Warm' },
  { label: 'Wet Season', value: 'Wet' },
  { label: 'Cool Season', value: 'Cool' },
  { label: 'All Year', value: 'All Year' },
];

const isEditMode = computed(() => props.mode === 'edit');

const submitLabel = computed(() => {
  return props.mode === 'create' ? 'Create Crop' : 'Update Crop';
});

// Watch for crop type changes
function onTypeChange(newType) {
  if (newType === 'Annual') {
    formData.value.harvest_frequency = null;
  }
}

// Initialize form data if editing
watch(
  () => props.crop,
  (newCrop) => {
    if (newCrop && props.mode === 'edit') {
      formData.value = {
        crop_name: newCrop.crop_name || '',
        category: newCrop.category || null,
        crop_type: newCrop.crop_type || 'Annual',
        maturity_days: newCrop.maturity_days || null,
        harvest_frequency: newCrop.harvest_frequency || null,
        typical_yield_per_hectare: newCrop.typical_yield_per_hectare || null,
        growing_season: newCrop.growing_season || null,
        notes: newCrop.notes || '',
        is_active: newCrop.is_active !== false,
      };
    }
  },
  { immediate: true },
);

// Handle form submission
function handleSubmit() {
  // Clean up data before submission
  const submitData = {
    ...formData.value,
    // Ensure harvest_frequency is null for annuals
    harvest_frequency:
      formData.value.crop_type === 'Perennial' ? formData.value.harvest_frequency || null : null,
    // Convert empty strings to null for number fields
    maturity_days: formData.value.maturity_days || null,
    typical_yield_per_hectare: formData.value.typical_yield_per_hectare || null,
  };

  // Remove is_active for create mode (defaults to true in backend)
  if (props.mode === 'create') {
    delete submitData.is_active;
  }

  // Remove null optional fields if they were never set
  if (submitData.typical_yield_per_hectare === null) delete submitData.typical_yield_per_hectare;
  if (submitData.growing_season === null) delete submitData.growing_season;
  if (submitData.notes === '') delete submitData.notes;

  emit('submit', submitData);
}
</script>

<style scoped>
.crop-form {
  max-width: 800px;
}
</style>
