<!--
  RecordSaleDialog.vue

  Story 3.8: Dialog for recording a farm produce sale. Collects the buyer,
  quantity, price, payment details, and notes. Submission is delegated to the
  parent via the `submit` event — the dialog is purely presentational.

  The dialog pre-fills `price_per_unit` from `inventoryItem.unit_cost` when
  available (Story 3.7 sets this from historical sale prices), and enforces
  client-side validation that `quantity_sold <= inventoryItem.quantity`.
-->
<template>
  <q-dialog
    v-model="dialogOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="record-sale-dialog">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon name="point_of_sale" class="q-mr-sm" />
          Record Sale
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="loading" />
      </q-card-section>

      <q-separator />

      <q-card-section class="scroll">
        <!-- Context banner -->
        <div class="text-body2 text-grey-8 q-mb-md">
          <div>
            <strong>Item:</strong> {{ inventoryItem?.item_name }}
          </div>
          <div>
            <strong>Available:</strong>
            {{ availableQty }} {{ inventoryItem?.unit || 'kg' }}
            <span v-if="cropName">· <strong>Crop:</strong> {{ cropName }}</span>
          </div>
        </div>

        <q-form ref="formRef" @submit.prevent="onSubmit" greedy>
          <div class="row q-col-gutter-md">
            <!-- Buyer Name -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="formData.buyer_name"
                label="Buyer Name *"
                maxlength="200"
                hint="Name of buyer (individual, market, or organization)"
                :rules="[(val) => !!val?.trim() || 'Buyer name is required']"
              />
            </div>

            <!-- Sale Date -->
            <div class="col-12 col-sm-6">
              <q-input
                v-model="formData.sale_date"
                label="Sale Date *"
                type="date"
                :rules="[
                  (val) => !!val || 'Sale date is required',
                  (val) => val <= todayStr || 'Sale date cannot be in the future',
                ]"
              />
            </div>

            <!-- Quantity Sold -->
            <div class="col-12 col-sm-4">
              <q-input
                v-model.number="formData.quantity_sold"
                label="Quantity Sold *"
                type="number"
                step="0.01"
                min="0"
                :suffix="inventoryItem?.unit || 'kg'"
                :rules="[
                  (val) =>
                    (val !== null && val !== undefined && val !== '') || 'Quantity is required',
                  (val) => val > 0 || 'Quantity must be greater than 0',
                  (val) =>
                    val <= availableQty ||
                    `Only ${availableQty} ${inventoryItem?.unit || 'kg'} available`,
                ]"
              />
            </div>

            <!-- Price per unit -->
            <div class="col-12 col-sm-4">
              <q-input
                v-model.number="formData.price_per_unit"
                label="Price per Unit *"
                type="number"
                step="0.01"
                min="0"
                prefix="ZMW"
                :suffix="`/ ${inventoryItem?.unit || 'kg'}`"
                :hint="
                  inventoryItem?.unit_cost > 0
                    ? `Suggested from estimated value: ZMW ${Number(inventoryItem.unit_cost).toFixed(2)}`
                    : 'Enter market price per unit'
                "
                :rules="[
                  (val) =>
                    (val !== null && val !== undefined && val !== '') || 'Price is required',
                  (val) => val >= 0 || 'Price cannot be negative',
                ]"
              />
            </div>

            <!-- Total (computed) -->
            <div class="col-12 col-sm-4">
              <q-input
                :model-value="totalAmountDisplay"
                label="Total Amount"
                readonly
                prefix="ZMW"
                hint="Auto-calculated"
                class="total-amount-input"
              />
            </div>

            <!-- Payment Method -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="formData.payment_method"
                :options="paymentMethodOptions"
                label="Payment Method *"
                :rules="[(val) => !!val || 'Payment method is required']"
                emit-value
                map-options
              />
            </div>

            <!-- Payment Status -->
            <div class="col-12 col-sm-6">
              <q-select
                v-model="formData.payment_status"
                :options="paymentStatusOptions"
                label="Payment Status *"
                :rules="[(val) => !!val || 'Payment status is required']"
                emit-value
                map-options
              />
            </div>

            <!-- Notes -->
            <div class="col-12">
              <q-input
                v-model="formData.notes"
                label="Notes"
                type="textarea"
                rows="2"
                maxlength="1000"
                counter
                hint="Optional: delivery details, grade, quality notes"
              />
            </div>
          </div>

          <!-- Zero-price confirmation warning -->
          <q-banner
            v-if="Number(formData.price_per_unit) === 0"
            rounded
            class="bg-orange-1 text-orange-9 q-mt-md"
          >
            <template #avatar>
              <q-icon name="warning" />
            </template>
            You entered a price of ZMW 0. This will record a zero-revenue sale.
            Please confirm this is intentional (e.g. donation in-kind) before submitting.
          </q-banner>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="q-pa-md">
        <q-btn label="Cancel" outline @click="onCancel" :disable="loading" />
        <q-btn
          label="Record Sale"
          color="primary"
          icon="check"
          @click="onSubmit"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Farm-produce inventory row being sold (required). */
  inventoryItem: { type: Object, required: true },
  /** Optional crop display name for context. */
  cropName: { type: String, default: '' },
  /** Submission-in-progress flag from parent. */
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const formRef = ref(null);

const todayStr = new Date().toISOString().split('T')[0];

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const availableQty = computed(() => Number(props.inventoryItem?.quantity) || 0);

const paymentMethodOptions = [
  { label: 'Cash', value: 'Cash' },
  { label: 'Mobile Money', value: 'Mobile Money' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Credit', value: 'Credit' },
  { label: 'Other', value: 'Other' },
];

const paymentStatusOptions = [
  { label: 'Completed', value: 'Completed' },
  { label: 'Pending', value: 'Pending' },
];

const defaultFormData = () => ({
  buyer_name: '',
  sale_date: todayStr,
  quantity_sold: null,
  price_per_unit: Number(props.inventoryItem?.unit_cost) > 0
    ? Number(props.inventoryItem.unit_cost)
    : null,
  payment_method: 'Cash',
  payment_status: 'Completed',
  notes: '',
});

const formData = ref(defaultFormData());

const totalAmount = computed(() => {
  const qty = Number(formData.value.quantity_sold) || 0;
  const price = Number(formData.value.price_per_unit) || 0;
  return Math.round(qty * price * 100) / 100;
});

const totalAmountDisplay = computed(() => totalAmount.value.toFixed(2));

// Reset form whenever dialog opens or inventory item changes
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      formData.value = defaultFormData();
      formRef.value?.resetValidation?.();
    }
  },
);

async function onSubmit() {
  const isValid = await formRef.value.validate();
  if (!isValid) return;

  emit('submit', {
    buyer_name: formData.value.buyer_name.trim(),
    sale_date: formData.value.sale_date,
    quantity_sold: Number(formData.value.quantity_sold),
    price_per_unit: Number(formData.value.price_per_unit),
    total_amount: totalAmount.value,
    payment_method: formData.value.payment_method,
    payment_status: formData.value.payment_status,
    notes: formData.value.notes?.trim() || null,
  });
}

function onCancel() {
  dialogOpen.value = false;
  emit('cancel');
}
</script>

<style scoped>
.record-sale-dialog {
  min-width: 600px;
}

.total-amount-input :deep(.q-field__control) {
  background-color: #f0f7ff;
}

@media (max-width: 600px) {
  .record-sale-dialog {
    min-width: 100%;
  }
}
</style>
