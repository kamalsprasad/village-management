<template>
  <div class="stock-adjust-dialog">
    <q-dialog v-model="localModelValue" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">Adjust Stock: {{ item?.item_name }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <!-- Current Stock Info -->
          <div class="row items-center q-mb-md">
            <div class="col">
              <div class="text-caption text-grey-7">Current Stock</div>
              <div class="text-h5">
                {{ item?.quantity }} <span class="text-body2">{{ item?.unit }}</span>
              </div>
            </div>
            <div class="col">
              <div class="text-caption text-grey-7">Reorder Threshold</div>
              <div class="text-h6">{{ item?.reorder_threshold }} {{ item?.unit }}</div>
            </div>
          </div>

          <!-- Adjustment Type -->
          <div class="q-mb-md">
            <div class="text-caption text-grey-7 q-mb-sm">Adjustment Type</div>
            <q-btn-toggle
              v-model="form.type"
              spread
              unelevated
              no-caps
              :options="adjustmentTypeOptions"
              toggle-color="primary"
              color="grey-3"
              text-color="grey-8"
            />
          </div>

          <!-- Quantity -->
          <q-input
            v-model.number="form.quantity"
            :label="quantityLabel"
            type="number"
            outlined
            dense
            :rules="quantityRules"
            min="0"
            class="q-mb-md"
          >
            <template #append>
              <span class="text-caption">{{ item?.unit }}</span>
            </template>
          </q-input>

          <!-- Preview -->
          <div v-if="newQuantity !== null" class="q-mb-md">
            <q-banner :class="previewClass" rounded dense>
              <template #avatar>
                <q-icon :name="previewIcon" />
              </template>
              <div class="text-weight-medium">New Quantity: {{ newQuantity }} {{ item?.unit }}</div>
              <div v-if="newStatus !== item?.status" class="text-caption">
                Status will change to: {{ inventoryStore.getStatusLabel(newStatus) }}
              </div>
            </q-banner>
          </div>

          <!-- Reason -->
          <q-select
            v-model="form.reason"
            :options="reasonOptions"
            label="Reason for Adjustment"
            outlined
            dense
            emit-value
            map-options
            :rules="[(val) => !!val || 'Reason is required']"
            class="q-mb-md"
          />

          <!-- Custom Reason (when Other selected) -->
          <q-input
            v-if="form.reason === 'other'"
            v-model="form.customReason"
            label="Specify Reason"
            outlined
            dense
            :rules="[(val) => !!val || 'Custom reason is required']"
            class="q-mb-md"
          />

          <!-- Notes -->
          <q-input
            v-model="form.notes"
            label="Additional Notes (Optional)"
            type="textarea"
            outlined
            dense
            rows="3"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" v-close-popup />
          <q-btn
            label="Apply Adjustment"
            color="primary"
            :loading="isLoading"
            :disable="!isValid"
            @click="submitAdjustment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useInventoryStore } from 'src/stores/inventory-store';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  item: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'submit']);

const inventoryStore = useInventoryStore();
const isLoading = ref(false);

const localModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const form = ref({
  type: 'add',
  quantity: null,
  reason: '',
  customReason: '',
  notes: '',
});

const adjustmentTypeOptions = [
  { label: 'Add Stock', value: 'add', icon: 'add' },
  { label: 'Remove Stock', value: 'remove', icon: 'remove' },
  { label: 'Set Quantity', value: 'set', icon: 'edit' },
];

const reasonOptions = [
  { label: 'Physical Count / Audit', value: 'physical_count' },
  { label: 'Damaged / Spoiled', value: 'damaged' },
  { label: 'Donation Received', value: 'donation' },
  { label: 'Transfer In', value: 'transfer_in' },
  { label: 'Transfer Out', value: 'transfer_out' },
  { label: 'Consumed / Used', value: 'consumed' },
  { label: 'Other', value: 'other' },
];

const quantityLabel = computed(() => {
  const labels = {
    add: 'Quantity to Add',
    remove: 'Quantity to Remove',
    set: 'New Total Quantity',
  };
  return labels[form.value.type] || 'Quantity';
});

const quantityRules = computed(() => {
  const rules = [
    (val) => (val !== null && val !== undefined) || 'Quantity is required',
    (val) => val >= 0 || 'Quantity must be non-negative',
    (val) => Number.isInteger(val) || 'Quantity must be a whole number',
  ];

  // Add rule for remove to ensure we don't go below zero
  if (form.value.type === 'remove') {
    rules.push((val) => {
      if (!props.item) return true;
      const newQty = props.item.quantity - val;
      return newQty >= 0 || `Cannot remove more than current stock (${props.item.quantity})`;
    });
  }

  return rules;
});

const newQuantity = computed(() => {
  if (!props.item || form.value.quantity === null || form.value.quantity === undefined) {
    return null;
  }

  switch (form.value.type) {
    case 'add':
      return props.item.quantity + form.value.quantity;
    case 'remove':
      return Math.max(0, props.item.quantity - form.value.quantity);
    case 'set':
      return form.value.quantity;
    default:
      return null;
  }
});

const newStatus = computed(() => {
  if (newQuantity.value === null) return null;

  if (newQuantity.value === 0) return 'out_of_stock';
  if (newQuantity.value <= props.item.reorder_threshold) return 'low_stock';
  return 'in_stock';
});

const previewClass = computed(() => {
  if (!newStatus.value) return '';
  const classes = {
    in_stock: 'bg-positive text-white',
    low_stock: 'bg-warning text-dark',
    out_of_stock: 'bg-negative text-white',
  };
  return classes[newStatus.value] || '';
});

const previewIcon = computed(() => {
  if (!newStatus.value) return 'info';
  const icons = {
    in_stock: 'check_circle',
    low_stock: 'warning',
    out_of_stock: 'error',
  };
  return icons[newStatus.value] || 'info';
});

const isValid = computed(() => {
  if (form.value.quantity === null || form.value.quantity === undefined || form.value.quantity < 0)
    return false;
  if (!form.value.reason) return false;
  if (form.value.reason === 'other' && !form.value.customReason) return false;

  // Validate remove doesn't go below zero
  if (form.value.type === 'remove' && props.item) {
    const newQty = props.item.quantity - form.value.quantity;
    if (newQty < 0) return false;
  }

  return true;
});

function submitAdjustment() {
  if (!isValid.value || !props.item) return;

  const reason =
    form.value.reason === 'other'
      ? form.value.customReason
      : reasonOptions.find((r) => r.value === form.value.reason)?.label || form.value.reason;

  emit('submit', {
    itemId: props.item.$id,
    type: form.value.type,
    quantity: form.value.quantity,
    reason: reason,
    notes: form.value.notes,
  });

  localModelValue.value = false;
}

// Reset form when dialog opens
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      form.value = {
        type: 'add',
        quantity: null,
        reason: '',
        customReason: '',
        notes: '',
      };
    }
  },
);
</script>
