<!--
  EstimatedPriceDialog.vue

  Story 3.7: Dialog for entering estimated price when no historical sales exist.
  Shown before harvest completion to set unit_cost on the farm_produce inventory row.
-->
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card class="q-pa-md" style="min-width: 400px; max-width: 500px">
      <q-card-section class="row items-center">
        <q-avatar icon="attach_money" color="primary" text-color="white" />
        <div class="q-ml-md">
          <div class="text-h6">Set Estimated Price</div>
          <div class="text-caption text-grey">No historical sales found for this crop</div>
        </div>
      </q-card-section>

      <q-separator class="q-my-sm" />

      <q-card-section>
        <p class="text-body2 q-mb-md">
          Please provide an estimated price per kg for this produce. This will be used to calculate
          the inventory value and as a reference for future sales.
        </p>

        <q-input
          v-model="priceInput"
          label="Price per kg (ZMW)"
          type="number"
          prefix="ZMW"
          outlined
          :error="!!errorMessage"
          :error-message="errorMessage"
          autofocus
          @keyup.enter="onSubmit"
        >
          <template #hint>
            <div class="row items-center q-gutter-x-sm">
              <span>Quantity: {{ quantity }} kg</span>
              <q-separator vertical />
              <span v-if="calculatedValue > 0">
                Total value: ZMW {{ calculatedValue.toFixed(2) }}
              </span>
            </div>
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Skip" color="grey" @click="onSkip" />
        <q-btn
          label="Set Price"
          color="primary"
          :disable="!isValidPrice"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';

const props = defineProps({
  quantity: {
    type: Number,
    default: 0,
  },
  cropName: {
    type: String,
    default: 'this crop',
  },
});

const emit = defineEmits(['submit', 'skip', 'hide', 'ok']);

// Quasar dialog plugin
const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

// Local state
const priceInput = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

// Computed
const priceValue = computed(() => {
  const val = parseFloat(priceInput.value);
  return isNaN(val) ? 0 : val;
});

const isValidPrice = computed(() => {
  return priceValue.value > 0;
});

const calculatedValue = computed(() => {
  return priceValue.value * props.quantity;
});

// Methods
function onSubmit() {
  if (!isValidPrice.value) {
    errorMessage.value = 'Please enter a valid price greater than 0';
    return;
  }

  errorMessage.value = '';
  isSubmitting.value = true;

  // Emit the price value
  emit('submit', {
    price: priceValue.value,
    estimatedValue: calculatedValue.value,
  });

  // Close dialog with the price
  onDialogOK({
    price: priceValue.value,
    estimatedValue: calculatedValue.value,
  });
}

function onSkip() {
  emit('skip');
  onDialogCancel();
}
</script>
