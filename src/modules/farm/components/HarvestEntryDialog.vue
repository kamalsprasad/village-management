<!--
  HarvestEntryDialog.vue
  Dialog component for adding daily entries to multi-day harvests.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-dialog
    v-model="dialogOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="harvest-entry-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon name="add_circle" class="q-mr-sm" />
          Add Daily Harvest Entry
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll">
        <div v-if="harvest" class="text-body2 text-grey-7 q-mb-md">
          <strong>Harvest:</strong> {{ getCropName(harvest.crop_name) }} | <strong>Period:</strong>
          {{ formatDate(harvest.harvest_start_date) }}
          <span v-if="harvest.harvest_end_date">- {{ formatDate(harvest.harvest_end_date) }}</span>
        </div>

        <q-form ref="formRef" @submit="onSubmit" greedy>
          <div class="row q-col-gutter-md">
            <!-- Entry Date -->
            <div class="col-12 col-sm-6">
              <q-date
                v-model="formData.entry_date"
                label="Entry Date *"
                :rules="[(val) => !!val || 'Entry date is required']"
                :min="minDate"
                :max="maxDate"
                :options="dateOptions"
                today-btn
              />
            </div>

            <!-- Quantity -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="formData.quantity_kg"
                label="Quantity (kg) *"
                type="number"
                step="0.1"
                min="0"
                :rules="[
                  (val) => (val !== null && val !== undefined) || 'Quantity is required',
                  (val) => val > 0 || 'Quantity must be greater than 0',
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
                :rules="[
                  (val) =>
                    val === null || val === undefined || val >= 0 || 'Count must be non-negative',
                ]"
                hint="Number of workers for this entry"
              />
            </div>

            <!-- Labor Cost -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="formData.labor_cost"
                label="Labor Cost (ZMW)"
                type="number"
                step="0.01"
                min="0"
                :rules="[
                  (val) =>
                    val === null || val === undefined || val >= 0 || 'Cost must be non-negative',
                ]"
                prefix="ZMW"
                hint="Labor cost for this entry"
              />
            </div>

            <!-- Other Costs -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="formData.other_costs"
                label="Other Costs (ZMW)"
                type="number"
                step="0.01"
                min="0"
                :rules="[
                  (val) =>
                    val === null || val === undefined || val >= 0 || 'Cost must be non-negative',
                ]"
                prefix="ZMW"
                hint="Other costs for this entry"
              />
            </div>

            <!-- Other Costs Notes -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="formData.other_costs_notes"
                label="Other Costs Notes"
                type="textarea"
                rows="2"
                maxlength="500"
                counter
                hint="Details about other costs"
              />
            </div>

            <!-- Entry Notes -->
            <div class="col-12">
              <q-input
                v-model="formData.notes"
                label="Entry Notes"
                type="textarea"
                rows="2"
                maxlength="500"
                counter
                hint="Notes specific to this day's harvest"
              />
            </div>
          </div>

          <!-- Warning for duplicate date -->
          <q-banner v-if="hasDuplicateDate" rounded class="bg-orange-1 text-orange-9 q-mt-md">
            <template #avatar>
              <q-icon name="warning" />
            </template>
            An entry already exists for {{ formatDate(formData.entry_date) }}. You can still add
            this entry, but please verify this is correct.
          </q-banner>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn label="Cancel" outline @click="onCancel" :disable="loading" />
        <q-btn label="Save Entry" color="primary" @click="onSubmit" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  harvest: {
    type: Object,
    required: true,
  },
  existingEntries: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const formRef = ref(null);

// Form data
const formData = ref({
  entry_date: format(new Date(), 'yyyy-MM-dd'),
  quantity_kg: null,
  farmhands_count: null,
  labor_cost: 0,
  other_costs: 0,
  other_costs_notes: '',
  notes: '',
});

// Dialog state
const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Date validation
const minDate = computed(() => {
  return props.harvest?.harvest_start_date
    ? format(parseISO(props.harvest.harvest_start_date), 'yyyy/MM/dd')
    : '';
});

const maxDate = computed(() => {
  const endDate = props.harvest?.harvest_end_date;
  if (endDate) {
    return format(parseISO(endDate), 'yyyy/MM/dd');
  }
  return format(new Date(), 'yyyy/MM/dd');
});

// Date options function to disable invalid dates
function dateOptions(date) {
  const entryDate = new Date(date);
  const startDate = props.harvest?.harvest_start_date
    ? new Date(props.harvest.harvest_start_date)
    : null;
  const endDate = props.harvest?.harvest_end_date
    ? new Date(props.harvest.harvest_end_date)
    : new Date();

  if (startDate && isBefore(entryDate, startDate)) return false;
  if (isAfter(entryDate, endDate)) return false;

  return true;
}

// Check for duplicate date
const hasDuplicateDate = computed(() => {
  if (!formData.value.entry_date || !props.existingEntries.length) return false;

  return props.existingEntries.some((entry) => {
    return entry.entry_date === formData.value.entry_date;
  });
});

// Initialize form data when dialog opens
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      formData.value = {
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        quantity_kg: null,
        farmhands_count: null,
        labor_cost: 0,
        other_costs: 0,
        other_costs_notes: '',
        notes: '',
      };
    }
  },
);

async function onSubmit() {
  const isValid = await formRef.value.validate();
  if (!isValid) return;

  // Prepare data for submission
  const submitData = {
    ...formData.value,
    // Ensure numeric fields are properly formatted
    quantity_kg: parseFloat(formData.value.quantity_kg),
    labor_cost: parseFloat(formData.value.labor_cost) || 0,
    other_costs: parseFloat(formData.value.other_costs) || 0,
    farmhands_count: parseInt(formData.value.farmhands_count) || null,
  };

  emit('submit', submitData);
}

function onCancel() {
  dialogOpen.value = false;
  emit('cancel');
}

// Helper functions

function getCropName(cropName) {
  return cropName || 'Unknown Crop';
}

// Expose validation method
defineExpose({
  validate: () => formRef.value?.validate(),
  reset: () => formRef.value?.reset(),
});
</script>

<style scoped>
.harvest-entry-dialog {
  min-width: 600px;
}

@media (max-width: 600px) {
  .harvest-entry-dialog {
    min-width: 100%;
  }
}
</style>
