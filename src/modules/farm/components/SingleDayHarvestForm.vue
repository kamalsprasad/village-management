<!--
  SingleDayHarvestForm.vue
  Form component for single day harvest recording.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <div class="single-day-harvest-form">
    <div class="text-subtitle1 text-weight-medium q-mb-md">
      Single Day Harvest Details
    </div>

    <q-form ref="formRef" @submit="onSubmit" greedy>
      <div class="row q-col-gutter-md">
        <!-- Harvest Date -->
        <div class="col-12 col-sm-6">
          <q-date
            v-model="formData.harvest_date"
            label="Harvest Date *"
            :rules="[val => !!val || 'Harvest date is required']"
            :max="maxDate"
            :min="minDate"
            today-btn
          />
        </div>

        <!-- Quantity Harvested -->
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.total_quantity_kg"
            label="Quantity Harvested (kg) *"
            type="number"
            step="0.1"
            min="0"
            :rules="[
              val => val !== null && val !== undefined || 'Quantity is required',
              val => val > 0 || 'Quantity must be greater than 0'
            ]"
            suffix="kg"
          />
        </div>

        <!-- Farmhands Count -->
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.farmhands_count"
            label="Farmhands Count"
            type="number"
            min="0"
            :rules="[val => val === null || val === undefined || val >= 0 || 'Count must be non-negative']"
            hint="Number of workers who helped with the harvest"
          />
        </div>

        <!-- Labor Cost -->
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.total_labor_cost"
            label="Labor Cost (ZMW)"
            type="number"
            step="0.01"
            min="0"
            :rules="[val => val === null || val === undefined || val >= 0 || 'Cost must be non-negative']"
            prefix="ZMW"
            hint="Total labor cost for the harvest"
          />
        </div>

        <!-- Other Costs -->
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.total_other_costs"
            label="Other Costs (ZMW)"
            type="number"
            step="0.01"
            min="0"
            :rules="[val => val === null || val === undefined || val >= 0 || 'Cost must be non-negative']"
            prefix="ZMW"
            hint="Transport, equipment, and other costs"
          />
        </div>

        <!-- Other Costs Notes -->
        <div class="col-12">
          <q-input
            v-model="formData.other_costs_notes"
            label="Other Costs Notes"
            type="textarea"
            rows="2"
            maxlength="500"
            counter
            hint="Details about other costs (e.g., transport, equipment rental)"
          />
        </div>

        <!-- General Notes -->
        <div class="col-12">
          <q-input
            v-model="formData.notes"
            label="General Notes"
            type="textarea"
            rows="3"
            maxlength="1000"
            counter
            hint="Any additional notes about this harvest"
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="row q-mt-lg">
        <div class="col-12">
          <div class="row q-gutter-sm justify-end">
            <q-btn
              label="Cancel"
              outline
              @click="onCancel"
            />
            <q-btn
              label="Continue"
              type="submit"
              color="primary"
              :loading="loading"
            />
          </div>
        </div>
      </div>
    </q-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { format, parseISO } from 'date-fns';

const props = defineProps({
  plantingDate: {
    type: String,
    required: true,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const formRef = ref(null);

// Form data
const formData = ref({
  harvest_type: 'Single Day',
  harvest_date: format(new Date(), 'yyyy-MM-dd'),
  total_quantity_kg: null,
  farmhands_count: null,
  total_labor_cost: 0,
  total_other_costs: 0,
  other_costs_notes: '',
  notes: '',
});

// Date validation
const minDate = computed(() => {
  return props.plantingDate ? format(parseISO(props.plantingDate), 'yyyy/MM/dd') : '';
});

const maxDate = computed(() => {
  return format(new Date(), 'yyyy/MM/dd');
});

// Initialize form data
onMounted(() => {
  if (props.initialData && Object.keys(props.initialData).length > 0) {
    formData.value = { ...formData.value, ...props.initialData };
  }
});

async function onSubmit() {
  const isValid = await formRef.value.validate();
  if (!isValid) return;

  // Prepare data for submission
  const submitData = {
    ...formData.value,
    // Ensure numeric fields are properly formatted
    total_quantity_kg: parseFloat(formData.value.total_quantity_kg),
    total_labor_cost: parseFloat(formData.value.total_labor_cost) || 0,
    total_other_costs: parseFloat(formData.value.total_other_costs) || 0,
    farmhands_count: parseInt(formData.value.farmhands_count) || null,
  };

  emit('submit', submitData);
}

function onCancel() {
  emit('cancel');
}

// Expose validation method
defineExpose({
  validate: () => formRef.value?.validate(),
  reset: () => formRef.value?.reset(),
});
</script>

<style scoped>
.single-day-harvest-form {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
</style>
