<!--
  MultiDayHarvestForm.vue
  Form component for multi-day aggregate harvest setup.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <div class="multi-day-harvest-form">
    <div class="text-subtitle1 text-weight-medium q-mb-md">Multi-Day Aggregate Harvest Setup</div>

    <q-form ref="formRef" @submit="onSubmit" greedy>
      <div class="row q-col-gutter-md">
        <!-- Harvest Start Date -->
        <div class="col-12 col-sm-6">
          <q-date
            v-model="formData.harvest_start_date"
            label="Harvest Start Date *"
            :rules="[(val) => !!val || 'Start date is required']"
            :max="maxDate"
            :min="minDate"
            today-btn
          />
        </div>

        <!-- Harvest End Date -->
        <div class="col-12 col-sm-6">
          <q-date
            v-model="formData.harvest_end_date"
            label="Harvest End Date (Optional)"
            :rules="endDateRules"
            :max="maxDate"
            :min="formData.harvest_start_date || minDate"
            clearable
            hint="Can be set later if harvest is still in progress"
          />
        </div>

        <!-- Expected Total Quantity -->
        <div class="col-12 col-sm-6">
          <q-input
            v-model.number="formData.expected_total_quantity"
            label="Expected Total Quantity (kg)"
            type="number"
            step="0.1"
            min="0"
            :rules="[
              (val) =>
                val === null || val === undefined || val >= 0 || 'Quantity must be non-negative',
            ]"
            suffix="kg"
            hint="Expected total harvest quantity (for planning purposes)"
          />
        </div>

        <!-- General Notes -->
        <div class="col-12">
          <q-input
            v-model="formData.notes"
            label="Harvest Notes"
            type="textarea"
            rows="3"
            maxlength="1000"
            counter
            hint="Any notes about this multi-day harvest (e.g., weather conditions, equipment used)"
          />
        </div>
      </div>

      <!-- Info Section -->
      <q-card flat bordered class="q-mt-md bg-blue-1">
        <q-card-section class="q-pa-md">
          <div class="text-body2 text-blue-8">
            <q-icon name="info" class="q-mr-sm" />
            <strong>Multi-Day Harvest Workflow:</strong>
          </div>
          <ul class="text-body2 text-blue-7 q-mt-sm q-mb-none">
            <li>After creating this harvest record, you can add daily entries one at a time</li>
            <li>
              Each entry will track the quantity, labor costs, and other costs for that specific day
            </li>
            <li>Totals will be automatically calculated from all daily entries</li>
            <li>You can mark the harvest as complete when all daily entries are recorded</li>
          </ul>
        </q-card-section>
      </q-card>

      <!-- Form Actions -->
      <div class="row q-mt-lg">
        <div class="col-12">
          <div class="row q-gutter-sm justify-end">
            <q-btn label="Cancel" outline @click="onCancel" />
            <q-btn label="Create Harvest" type="submit" color="primary" :loading="loading" />
          </div>
        </div>
      </div>
    </q-form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { format, parseISO, isAfter } from 'date-fns';

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
  harvest_type: 'Multi-Day Aggregate',
  harvest_start_date: format(new Date(), 'yyyy-MM-dd'),
  harvest_end_date: null,
  expected_total_quantity: null,
  notes: '',
});

// Date validation
const minDate = computed(() => {
  return props.plantingDate ? format(parseISO(props.plantingDate), 'yyyy/MM/dd') : '';
});

const maxDate = computed(() => {
  return format(new Date(), 'yyyy/MM/dd');
});

// End date validation rules
const endDateRules = computed(() => {
  const rules = [];

  if (formData.value.harvest_end_date) {
    rules.push((val) => {
      if (!val) return true;

      const endDate = parseISO(val);
      const startDate = parseISO(formData.value.harvest_start_date);

      if (isAfter(startDate, endDate)) {
        return 'End date must be after or equal to start date';
      }

      return true;
    });
  }

  return rules;
});

// Watch for start date changes to validate end date
watch(
  () => formData.value.harvest_start_date,
  (newStartDate) => {
    if (formData.value.harvest_end_date && newStartDate) {
      const endDate = parseISO(formData.value.harvest_end_date);
      const startDate = parseISO(newStartDate);

      if (isAfter(startDate, endDate)) {
        formData.value.harvest_end_date = null;
      }
    }
  },
);

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
  // eslint-disable-next-line no-unused-vars
  const { expected_total_quantity, ...formRest } = formData.value;
  const submitData = {
    ...formRest,
    // Multi-day harvests start with 0 totals (will be calculated from entries)
    total_quantity_kg: 0,
    total_labor_cost: 0,
    total_other_costs: 0,
    farmhands_count: 0,
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
.multi-day-harvest-form {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
</style>
