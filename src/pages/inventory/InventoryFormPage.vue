<template>
  <q-page padding>
    <div class="inventory-form-page">
      <!-- Header -->
      <div class="row items-center q-mb-md">
        <q-btn flat round icon="arrow_back" @click="goBack" class="q-mr-sm" />
        <div>
          <h1 class="text-h5 text-weight-bold q-my-none">
            {{ isEdit ? 'Edit Inventory Item' : 'Add Inventory Item' }}
          </h1>
        </div>
      </div>

      <q-card flat bordered>
        <q-card-section>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <div class="row q-col-gutter-md">
              <!-- Item Name -->
              <div class="col-12 col-md-6">
                <q-input
                  v-model="form.item_name"
                  label="Item Name *"
                  outlined
                  :rules="[(val) => !!val || 'Item name is required']"
                  maxlength="255"
                  counter
                />
              </div>

              <!-- Item Type -->
              <div class="col-12 col-md-6">
                <q-select
                  v-model="form.item_type"
                  :options="itemTypeOptions"
                  label="Item Type *"
                  outlined
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Item type is required']"
                />
              </div>

              <!-- Quantity -->
              <div class="col-12 col-md-4">
                <q-input
                  v-model.number="form.quantity"
                  label="Quantity *"
                  type="number"
                  outlined
                  min="0"
                  :rules="[
                    (val) => (val !== null && val !== undefined) || 'Quantity is required',
                    (val) => val >= 0 || 'Quantity must be non-negative',
                    (val) => Number.isInteger(val) || 'Quantity must be a whole number',
                  ]"
                />
              </div>

              <!-- Unit -->
              <div class="col-12 col-md-4">
                <q-select
                  v-model="form.unit"
                  :options="unitOptions"
                  label="Unit *"
                  outlined
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Unit is required']"
                />
              </div>

              <!-- Reorder Threshold -->
              <div class="col-12 col-md-4">
                <q-input
                  v-model.number="form.reorder_threshold"
                  label="Reorder Threshold *"
                  type="number"
                  outlined
                  min="0"
                  hint="Alert when stock falls below this level"
                  :rules="[
                    (val) => (val !== null && val !== undefined) || 'Reorder threshold is required',
                    (val) => val >= 0 || 'Threshold must be non-negative',
                  ]"
                />
              </div>

              <!-- Unit Cost -->
              <div class="col-12 col-md-6" v-if="canViewValues">
                <q-input
                  v-model.number="form.unit_cost"
                  label="Unit Cost (ZMW)"
                  type="number"
                  outlined
                  min="0"
                  step="0.01"
                  hint="Optional - for valuation purposes"
                >
                  <template #prepend>
                    <span class="text-caption">ZMW</span>
                  </template>
                </q-input>
              </div>

              <!-- Source (Locked in Edit Mode) -->
              <div class="col-12 col-md-6">
                <q-select
                  v-model="form.source"
                  :options="sourceOptions"
                  label="Source *"
                  outlined
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Source is required']"
                  hint="How did this item enter inventory?"
                  :disable="isEdit"
                />
                <div v-if="isEdit" class="text-caption text-orange-8 q-mt-xs">
                  <q-icon name="lock" size="xs" /> Source cannot be changed after creation (audit
                  trail)
                </div>
              </div>

              <!-- Source Reference (conditional, locked in Edit Mode) -->
              <div class="col-12" v-if="showSourceReference">
                <q-input
                  v-model="form.source_reference_id"
                  :label="sourceReferenceLabel"
                  outlined
                  hint="Optional reference ID to link to purchase or harvest record"
                  :disable="isEdit"
                />
                <div v-if="isEdit" class="text-caption text-orange-8 q-mt-xs">
                  <q-icon name="lock" size="xs" /> Reference cannot be changed after creation
                </div>
              </div>

              <!-- Notes -->
              <div class="col-12">
                <q-input
                  v-model="form.notes"
                  label="Notes"
                  type="textarea"
                  outlined
                  rows="3"
                  maxlength="1000"
                  counter
                  hint="Additional information about this item"
                />
              </div>
            </div>

            <!-- Estimated Value Preview -->
            <div v-if="canViewValues && estimatedValue > 0" class="q-mt-md">
              <q-banner rounded class="bg-blue-1 text-dark">
                <template #avatar>
                  <q-icon name="calculate" color="primary" />
                </template>
                <div class="text-weight-medium">
                  Estimated Value: {{ formatCurrency(estimatedValue) }}
                </div>
                <div class="text-caption">Calculated as Quantity × Unit Cost</div>
              </q-banner>
            </div>

            <!-- Status Preview -->
            <div class="q-mt-md">
              <q-banner rounded :class="statusClass">
                <template #avatar>
                  <q-icon :name="statusIcon" />
                </template>
                <div class="text-weight-medium">Status: {{ calculatedStatusLabel }}</div>
                <div class="text-caption">
                  Based on quantity ({{ form.quantity }}) vs threshold ({{
                    form.reorder_threshold
                  }})
                </div>
              </q-banner>
            </div>

            <!-- Actions -->
            <div class="row justify-end q-gutter-sm q-mt-lg">
              <q-btn flat label="Cancel" color="grey-7" @click="goBack" />
              <q-btn
                :label="isEdit ? 'Update Item' : 'Create Item'"
                type="submit"
                color="primary"
                :loading="isLoading"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryStore } from 'src/stores/inventory-store';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const inventoryStore = useInventoryStore();

const isLoading = ref(false);
const form = ref({
  item_name: '',
  item_type: '',
  quantity: 0,
  unit: '',
  reorder_threshold: 10,
  unit_cost: null,
  source: 'manual_entry',
  source_reference_id: '',
  notes: '',
});

const itemId = computed(() => route.params.id);
const isEdit = computed(() => !!itemId.value);

const canViewValues = computed(() => inventoryStore.canViewValues);

const itemTypeOptions = [
  { label: 'Farm Inputs', value: 'farm_inputs' },
  { label: 'Farm Produce', value: 'farm_produce' },
  { label: 'School Supplies', value: 'school_supplies' },
  { label: 'Medical Supplies', value: 'medical_supplies' },
  { label: 'Kitchen Supplies', value: 'kitchen_supplies' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Other', value: 'other' },
];

const unitOptions = [
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Liters (L)', value: 'liters' },
  { label: 'Units/Pieces', value: 'units' },
  { label: 'Bags', value: 'bags' },
  { label: 'Boxes', value: 'boxes' },
  { label: 'Bottles', value: 'bottles' },
  { label: 'Packets', value: 'packets' },
  { label: 'Other', value: 'other' },
];

const sourceOptions = [
  { label: 'Manual Entry', value: 'manual_entry' },
  { label: 'Finance Purchase', value: 'finance_purchase' },
  { label: 'Farm Harvest', value: 'farm_harvest' },
  { label: 'Donation', value: 'donation' },
];

const showSourceReference = computed(() => {
  return ['finance_purchase', 'farm_harvest'].includes(form.value.source);
});

const sourceReferenceLabel = computed(() => {
  const labels = {
    finance_purchase: 'Transaction Reference ID (Optional)',
    farm_harvest: 'Harvest Record ID (Optional)',
  };
  return labels[form.value.source] || 'Reference ID';
});

const estimatedValue = computed(() => {
  return (form.value.quantity || 0) * (form.value.unit_cost || 0);
});

const calculatedStatus = computed(() => {
  const qty = form.value.quantity || 0;
  const threshold = form.value.reorder_threshold || 0;

  if (qty === 0) return 'out_of_stock';
  if (qty <= threshold) return 'low_stock';
  return 'in_stock';
});

const calculatedStatusLabel = computed(() => {
  return inventoryStore.getStatusLabel(calculatedStatus.value);
});

const statusClass = computed(() => {
  const classes = {
    in_stock: 'bg-positive text-white',
    low_stock: 'bg-warning text-dark',
    out_of_stock: 'bg-negative text-white',
  };
  return classes[calculatedStatus.value] || 'bg-grey-3';
});

const statusIcon = computed(() => {
  const icons = {
    in_stock: 'check_circle',
    low_stock: 'warning',
    out_of_stock: 'error',
  };
  return icons[calculatedStatus.value] || 'info';
});

onMounted(async () => {
  if (isEdit.value) {
    await loadItem();
  }
});

async function loadItem() {
  const result = await inventoryStore.fetchItemById(itemId.value);
  if (result.success) {
    const item = result.data;
    form.value = {
      item_name: item.item_name || '',
      item_type: item.item_type || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      reorder_threshold: item.reorder_threshold || 10,
      unit_cost: item.unit_cost || null,
      source: item.source || 'manual_entry',
      source_reference_id: item.source_reference_id || '',
      notes: item.notes || '',
    };
  } else {
    $q.notify({
      type: 'negative',
      message: 'Failed to load item',
    });
    router.push('/inventory');
  }
}

async function onSubmit() {
  isLoading.value = true;

  try {
    const itemData = {
      item_name: form.value.item_name,
      item_type: form.value.item_type,
      quantity: form.value.quantity,
      unit: form.value.unit,
      reorder_threshold: form.value.reorder_threshold,
      unit_cost: form.value.unit_cost,
      notes: form.value.notes,
    };

    let result;
    if (isEdit.value) {
      result = await inventoryStore.updateItem(itemId.value, itemData);
    } else {
      // Only include source fields on creation (locked after for audit trail)
      itemData.source = form.value.source;
      itemData.source_reference_id = form.value.source_reference_id || null;
      result = await inventoryStore.createItem(itemData);
    }

    if (result.success) {
      router.push('/inventory');
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to save item',
      });
    }
  } finally {
    isLoading.value = false;
  }
}

function goBack() {
  router.push('/inventory');
}

function formatCurrency(value) {
  return inventoryStore.formatCurrency(value);
}
</script>
