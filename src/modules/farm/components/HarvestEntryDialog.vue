<!--
  HarvestEntryDialog.vue

  Dual-mode dialog for recording a harvest entry:
    - Create mode  (harvest === null): caller will use this entry to create a
      new harvest parent record. Title reads "Record First Harvest Entry".
    - Add mode     (harvest is present): entry is appended to the existing
      in-progress harvest. Title reads "Add Harvest Entry".

  The dialog is purely presentational — it emits a `submit` event with the
  form payload and leaves store interaction to the parent.

  Story 3.5: Farm Module - Harvest Recording (refactored)
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
          <q-icon :name="isCreateMode ? 'eco' : 'add_circle'" class="q-mr-sm" />
          {{ isCreateMode ? 'Record First Harvest Entry' : 'Add Harvest Entry' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="loading" />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll">
        <div v-if="planting" class="text-body2 text-grey-7 q-mb-md">
          <strong>Crop:</strong> {{ cropName }}
          <span v-if="plantingDateLabel"> | <strong>Planted:</strong> {{ plantingDateLabel }}</span>
          <span v-if="runningTotalKg !== null">
            | <strong>Harvest Total so far:</strong> {{ runningTotalKg }} kg
          </span>
        </div>

        <q-form ref="formRef" @submit.prevent="onSubmit" greedy>
          <div class="row q-col-gutter-md">
            <!-- Entry Date -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="formData.entry_date"
                label="Entry Date *"
                type="date"
                :rules="[
                  (val) => !!val || 'Entry date is required',
                  (val) => !minDateStr || val >= minDateStr || `Cannot be before ${minDateStr}`,
                  (val) => !maxDateStr || val <= maxDateStr || `Cannot be after ${maxDateStr}`,
                ]"
                :hint="dateHint"
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
                  (val) => (val !== null && val !== undefined && val !== '') || 'Quantity is required',
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
                    val === null || val === undefined || val === '' || val >= 0 ||
                    'Count must be non-negative',
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
                    val === null || val === undefined || val === '' || val >= 0 ||
                    'Cost must be non-negative',
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
                    val === null || val === undefined || val === '' || val >= 0 ||
                    'Cost must be non-negative',
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
        <q-btn
          :label="isCreateMode ? 'Start Harvest' : 'Save Entry'"
          color="primary"
          @click="onSubmit"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { format } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Required in both modes — provides crop_id, planting_date, etc. */
  planting: { type: Object, required: true },
  /** Crop row for display. Optional; dialog falls back to planting.crop_name. */
  crop: { type: Object, default: null },
  /** Null in create mode; the in-progress harvest row in add-entry mode. */
  harvest: { type: Object, default: null },
  /** Existing entries (for duplicate-date warning and running total). */
  existingEntries: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const formRef = ref(null);
const isCreateMode = computed(() => !props.harvest);

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const formData = ref({
  entry_date: todayStr(),
  quantity_kg: null,
  farmhands_count: null,
  labor_cost: 0,
  other_costs: 0,
  other_costs_notes: '',
  notes: '',
});

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Date bounds: min is planting date (can't harvest before planting);
// max is today (can't record a future harvest).
const minDateStr = computed(() => {
  const pd = props.planting?.planting_date;
  if (!pd) return null;
  // Accept either ISO datetime or 'yyyy-MM-dd'
  return pd.slice(0, 10);
});

const maxDateStr = computed(() => todayStr());

const dateHint = computed(() => {
  if (minDateStr.value) {
    return `Between ${minDateStr.value} and ${maxDateStr.value}`;
  }
  return `On or before ${maxDateStr.value}`;
});

const cropName = computed(() => {
  return props.crop?.crop_name || props.planting?.crop_name || 'Unknown Crop';
});

const plantingDateLabel = computed(() => {
  return props.planting?.planting_date ? formatDate(props.planting.planting_date) : null;
});

const runningTotalKg = computed(() => {
  if (!props.existingEntries.length) return null;
  return props.existingEntries.reduce(
    (sum, e) => sum + (parseFloat(e.quantity_kg) || 0),
    0,
  );
});

const hasDuplicateDate = computed(() => {
  if (!formData.value.entry_date || !props.existingEntries.length) return false;
  const target = formData.value.entry_date;
  return props.existingEntries.some((entry) => {
    const entryDate = (entry.entry_date || '').slice(0, 10);
    return entryDate === target;
  });
});

// Reset form whenever the dialog is opened
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      formData.value = {
        entry_date: todayStr(),
        quantity_kg: null,
        farmhands_count: null,
        labor_cost: 0,
        other_costs: 0,
        other_costs_notes: '',
        notes: '',
      };
      // Clear any residual validation state
      formRef.value?.resetValidation?.();
    }
  },
);

async function onSubmit() {
  const isValid = await formRef.value.validate();
  if (!isValid) return;

  const submitData = {
    entry_date: formData.value.entry_date,
    quantity_kg: parseFloat(formData.value.quantity_kg),
    labor_cost: parseFloat(formData.value.labor_cost) || 0,
    other_costs: parseFloat(formData.value.other_costs) || 0,
    farmhands_count: parseInt(formData.value.farmhands_count, 10) || null,
    other_costs_notes: formData.value.other_costs_notes || null,
    notes: formData.value.notes || null,
  };

  emit('submit', submitData);
}

function onCancel() {
  dialogOpen.value = false;
  emit('cancel');
}

defineExpose({
  validate: () => formRef.value?.validate(),
  reset: () => formRef.value?.resetValidation(),
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
