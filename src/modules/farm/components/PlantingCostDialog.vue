<!--
  PlantingCostDialog.vue

  Reusable create/edit form for additional planting cost entries.
  Supports optional inventory-backed input costs and optional linked
  Finance expenses. Emits the validated payload for the parent to submit.
-->
<template>
  <q-dialog
    v-model="dialogOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="planting-cost-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon :name="isEditMode ? 'edit' : 'add'" class="q-mr-sm" />
          {{ isEditMode ? 'Edit Cost Entry' : 'Add Cost Entry' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="loading" />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll">
        <div v-if="planting" class="text-body2 text-grey-7 q-mb-md">
          <strong>Planting:</strong> {{ cropName }}
          <span v-if="planting.planting_date">
            | <strong>Planted:</strong> {{ formatDate(planting.planting_date) }}</span
          >
        </div>

        <q-form ref="formRef" @submit.prevent="onSubmit" greedy>
          <div class="row q-col-gutter-md">
            <!-- Category -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="formData.category"
                :options="categoryOptions"
                label="Category *"
                emit-value
                map-options
                :rules="[(val) => !!val || 'Category is required']"
                :disable="isEditMode"
              />
            </div>

            <!-- Date -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="formData.date"
                label="Cost Date *"
                type="date"
                :rules="[(val) => !!val || 'Cost date is required']"
              />
            </div>

            <!-- Description -->
            <div class="col-12">
              <q-input
                v-model="formData.description"
                label="Description *"
                type="textarea"
                rows="2"
                maxlength="500"
                counter
                :rules="[
                  (val) => !!val?.trim() || 'Description is required',
                  (val) => (val?.trim()?.length || 0) <= 500 || 'Max 500 characters',
                ]"
              />
            </div>

            <!-- Inventory-backed input cost -->
            <template v-if="formData.category === 'inputs'">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.inventoryItemId"
                  :options="inventoryOptions"
                  option-value="$id"
                  option-label="item_name"
                  emit-value
                  map-options
                  clearable
                  label="Inventory Item"
                  hint="Select an input item to deduct from stock"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model.number="formData.inventoryQuantity"
                  label="Quantity to Deduct"
                  type="number"
                  min="0.01"
                  step="0.01"
                  :suffix="selectedInventoryUnit"
                  :disable="!formData.inventoryItemId"
                  :rules="[
                    (val) =>
                      !formData.inventoryItemId ||
                      (val !== null && val !== undefined && val !== '') ||
                      'Quantity is required when an inventory item is selected',
                    (val) =>
                      !formData.inventoryItemId ||
                      (Number.isFinite(Number(val)) && Number(val) > 0) ||
                      'Quantity must be a finite number greater than zero',
                  ]"
                />
              </div>
            </template>

            <!-- Amount -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="formData.amount"
                label="Amount (ZMW) *"
                type="number"
                step="0.01"
                min="0.01"
                prefix="ZMW"
                :hint="derivedAmountHint"
                :rules="[
                  (val) =>
                    (val !== null && val !== undefined && val !== '') || 'Amount is required',
                  (val) => val > 0 || 'Amount must be greater than zero',
                ]"
                @update:model-value="amountManuallySet = true"
              />
            </div>

            <!-- Linked Finance expense -->
            <div v-if="canUseFinance" class="col-12">
              <q-separator class="q-my-md" />
              <q-checkbox
                v-model="formData.createFinance"
                label="Create linked Finance expense"
                :disable="isEditMode && !!originalFinanceTxId"
              />
              <div v-if="isEditMode && originalFinanceTxId" class="text-caption text-grey q-ml-lg">
                This entry is already linked to a Finance expense. It cannot be unlinked; its
                category, funding source, payment method, amount, and description remain
                synchronized.
              </div>
            </div>

            <template v-if="canUseFinance && formData.createFinance">
              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.financeCategoryId"
                  :options="expenseCategoryOptions"
                  option-value="$id"
                  option-label="name"
                  emit-value
                  map-options
                  label="Finance Category *"
                  :rules="[(val) => !!val || 'Finance category is required']"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.fundingSourceId"
                  :options="fundingSourceOptions"
                  option-value="$id"
                  option-label="name"
                  emit-value
                  map-options
                  clearable
                  label="Funding Source"
                  hint="Optional: deduct from a funding source"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.paymentMethod"
                  :options="paymentMethodOptions"
                  label="Payment Method"
                />
              </div>
            </template>
          </div>

          <!-- Confirmation banner -->
          <q-banner v-if="isFormValid" rounded class="bg-blue-1 text-blue-9 q-mt-md">
            <template #avatar>
              <q-icon name="info" />
            </template>
            <span v-if="isEditMode">
              Update <strong>{{ formData.category }}</strong> cost to
              <strong>ZMW {{ Number(formData.amount || 0).toFixed(2) }}</strong>
              <span v-if="formData.createFinance"> and linked Finance expense</span>.
            </span>
            <span v-else>
              Record a new <strong>{{ formData.category }}</strong> cost of
              <strong>ZMW {{ Number(formData.amount || 0).toFixed(2) }}</strong>
              <span v-if="formData.createFinance"> and create a linked Finance expense</span>.
            </span>
          </q-banner>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn label="Cancel" outline @click="onCancel" :disable="loading" />
        <q-btn
          :label="isEditMode ? 'Save Changes' : 'Add Cost'"
          color="primary"
          @click="onSubmit"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="confirmationOpen" persistent>
    <q-card style="min-width: 340px">
      <q-card-section class="row items-center">
        <q-avatar icon="help" color="primary" text-color="white" />
        <div class="q-ml-sm text-h6">Confirm {{ isEditMode ? 'cost update' : 'new cost' }}</div>
      </q-card-section>
      <q-card-section>
        {{ isEditMode ? 'Update' : 'Create' }}
        <strong>{{ pendingPayload?.category }}</strong> cost of
        <strong>ZMW {{ Number(pendingPayload?.amount || 0).toFixed(2) }}</strong
        >?
        <div v-if="pendingPayload?.createFinance" class="q-mt-sm text-grey-8">
          The linked Finance expense will also be {{ originalFinanceTxId ? 'updated' : 'created' }}.
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          label="Back"
          color="primary"
          :disable="confirmationSubmitting"
          @click="confirmationOpen = false"
        />
        <q-btn
          color="primary"
          :label="isEditMode ? 'Confirm Update' : 'Confirm Add'"
          data-test="confirm-cost-submit"
          :disable="confirmationSubmitting"
          :loading="confirmationSubmitting"
          @click="confirmSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { format } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  planting: { type: Object, required: true },
  crop: { type: Object, default: null },
  entry: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  inventoryItems: { type: Array, default: () => [] },
  financeCategories: { type: Array, default: () => [] },
  fundingSources: { type: Array, default: () => [] },
  financeTransaction: { type: Object, default: null },
  canUseFinance: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'submit']);

const formRef = ref(null);
const amountManuallySet = ref(false);
const confirmationOpen = ref(false);
const confirmationSubmitting = ref(false);
const pendingPayload = ref(null);

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const categoryOptions = [
  { label: 'Inputs', value: 'inputs' },
  { label: 'Labor', value: 'labor' },
  { label: 'Other', value: 'other' },
];

const paymentMethodOptions = ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Other'];

const formData = ref({
  category: 'inputs',
  date: todayStr(),
  description: '',
  amount: null,
  inventoryItemId: null,
  inventoryQuantity: null,
  createFinance: false,
  financeCategoryId: null,
  fundingSourceId: null,
  paymentMethod: 'Cash',
});

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isEditMode = computed(() => !!props.entry?.$id);

const originalFinanceTxId = computed(() => {
  const tx = props.entry?.finance_transaction_id;
  return typeof tx === 'object' ? tx?.$id : tx;
});

const cropName = computed(() => {
  return props.crop?.crop_name || props.planting?.crop_name || 'Unknown Crop';
});

const inventoryOptions = computed(() => props.inventoryItems || []);

const expenseCategoryOptions = computed(() =>
  (props.financeCategories || []).filter((c) => c.type === 'expense'),
);

const fundingSourceOptions = computed(() => props.fundingSources || []);

const selectedInventoryItem = computed(() => {
  if (!formData.value.inventoryItemId) return null;
  return (props.inventoryItems || []).find((i) => i.$id === formData.value.inventoryItemId);
});

const selectedInventoryUnit = computed(() => {
  return selectedInventoryItem.value?.unit || '';
});

const derivedAmount = computed(() => {
  const qty = parseFloat(formData.value.inventoryQuantity);
  const unitCost = parseFloat(selectedInventoryItem.value?.unit_cost);
  if (
    formData.value.category === 'inputs' &&
    selectedInventoryItem.value &&
    !Number.isNaN(qty) &&
    !Number.isNaN(unitCost)
  ) {
    return Math.round(qty * unitCost * 100) / 100;
  }
  return null;
});

const derivedAmountHint = computed(() => {
  if (derivedAmount.value !== null && !amountManuallySet.value) {
    return `Derived from ${formData.value.inventoryQuantity} ${selectedInventoryUnit.value} @ ZMW ${selectedInventoryItem.value?.unit_cost}`;
  }
  return '';
});

const isFormValid = computed(() => {
  const base =
    !!formData.value.category &&
    !!formData.value.date &&
    !!formData.value.description?.trim() &&
    Number(formData.value.amount) > 0;
  if (!base) return false;
  if (formData.value.inventoryItemId) {
    const quantity = Number(formData.value.inventoryQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return false;
  }
  if (formData.value.createFinance && !formData.value.financeCategoryId) return false;
  return true;
});

// Reset form when dialog opens; derive amount from inventory unless user overrides
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      confirmationSubmitting.value = false;
      amountManuallySet.value = false;
      if (props.entry?.$id) {
        const invItemId =
          typeof props.entry.inventory_item_id === 'object'
            ? props.entry.inventory_item_id?.$id
            : props.entry.inventory_item_id;
        formData.value = {
          category: props.entry.category || 'inputs',
          date: props.entry.cost_date ? props.entry.cost_date.slice(0, 10) : todayStr(),
          description: props.entry.description || '',
          amount: Number(props.entry.amount) || null,
          inventoryItemId: invItemId || null,
          inventoryQuantity: Number(props.entry.inventory_quantity) || null,
          createFinance: !!originalFinanceTxId.value,
          financeCategoryId:
            typeof props.financeTransaction?.category_id === 'object'
              ? props.financeTransaction.category_id?.$id
              : props.financeTransaction?.category_id || null,
          fundingSourceId:
            typeof props.financeTransaction?.funding_source_id === 'object'
              ? props.financeTransaction.funding_source_id?.$id
              : props.financeTransaction?.funding_source_id || null,
          paymentMethod: props.financeTransaction?.payment_method || 'Cash',
        };
        // Wait for derived amount to calculate, then mark as manual so it is preserved
        await nextTick();
        amountManuallySet.value = true;
      } else {
        formData.value = {
          category: 'inputs',
          date: todayStr(),
          description: '',
          amount: null,
          inventoryItemId: null,
          inventoryQuantity: null,
          createFinance: false,
          financeCategoryId: null,
          fundingSourceId: null,
          paymentMethod: 'Cash',
        };
      }
      formRef.value?.resetValidation?.();
    }
  },
  { immediate: true },
);

watch(
  () => props.loading,
  (isLoading, wasLoading) => {
    if (wasLoading && !isLoading && props.modelValue) {
      confirmationSubmitting.value = false;
    }
  },
);

// When inventory selection/quantity changes and user has not manually set the amount, derive it
watch(
  [() => formData.value.inventoryItemId, () => formData.value.inventoryQuantity],
  () => {
    if (
      formData.value.category === 'inputs' &&
      !amountManuallySet.value &&
      derivedAmount.value !== null
    ) {
      formData.value.amount = derivedAmount.value;
    }
  },
  { immediate: true },
);

function onCancel() {
  dialogOpen.value = false;
}

async function onSubmit() {
  const valid = (await formRef.value?.validate?.()) ?? true;
  if (!valid || !isFormValid.value) return;

  const payload = {
    category: formData.value.category,
    date: formData.value.date,
    description: formData.value.description.trim(),
    amount: Number(formData.value.amount),
    inventoryItemId: formData.value.inventoryItemId || null,
    inventoryQuantity: formData.value.inventoryItemId
      ? Number(formData.value.inventoryQuantity)
      : null,
    createFinance: props.canUseFinance && !!formData.value.createFinance,
    financeCategoryId:
      props.canUseFinance && formData.value.createFinance ? formData.value.financeCategoryId : null,
    fundingSourceId:
      props.canUseFinance && formData.value.createFinance
        ? formData.value.fundingSourceId || null
        : null,
    paymentMethod:
      props.canUseFinance && formData.value.createFinance ? formData.value.paymentMethod : null,
  };

  pendingPayload.value = payload;
  confirmationOpen.value = true;
}

function confirmSubmit() {
  if (!pendingPayload.value || confirmationSubmitting.value) return;
  confirmationSubmitting.value = true;
  emit('submit', pendingPayload.value, () => {
    confirmationSubmitting.value = false;
    confirmationOpen.value = false;
    formData.value.amount = 0;
  });
}

defineExpose({
  validate: () => formRef.value?.validate?.(),
  reset: () => formRef.value?.resetValidation?.(),
  formData,
  confirmationOpen,
  confirmationSubmitting,
  onSubmit,
  confirmSubmit,
});
</script>

<style scoped>
.planting-cost-dialog {
  min-width: 600px;
}

@media (max-width: 599px) {
  .planting-cost-dialog {
    min-width: 0 !important;
    max-width: 95vw;
  }
}
</style>
