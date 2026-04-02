<template>
  <q-dialog v-model="localModelValue" persistent>
    <q-card style="min-width: 400px; max-width: 450px">
      <q-card-section class="row items-center bg-negative text-white">
        <q-icon name="warning" size="32px" class="q-mr-md" />
        <div class="text-h6">Delete {{ itemName }}</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-banner rounded class="bg-orange-1 text-dark q-mb-md">
          <template #avatar>
            <q-icon name="error_outline" color="warning" />
          </template>
          <div class="text-weight-medium">Warning: This action cannot be undone!</div>
          <div class="text-caption">
            Deleting this inventory item will permanently remove it from the system.
          </div>
        </q-banner>

        <p class="text-body2 q-mb-md">
          To confirm deletion, please type the item name exactly as shown below:
        </p>

        <div class="text-h6 text-center q-mb-md text-weight-bold text-grey-8">"{{ itemName }}"</div>

        <q-input
          v-model="confirmText"
          label="Type item name to confirm"
          outlined
          dense
          :error="showError"
          :error-message="errorMessage"
          @keyup.enter="onConfirm"
          autocomplete="off"
        />

        <!-- Deletion Reason -->
        <q-input
          v-model="reason"
          label="Reason for deletion (Optional)"
          type="textarea"
          outlined
          dense
          rows="2"
          class="q-mt-md"
          hint="This will be logged for audit purposes"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey-7" v-close-popup @click="reset" />
        <q-btn
          label="Delete Item"
          color="negative"
          :disable="!isValid"
          :loading="isLoading"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  itemName: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const confirmText = ref('');
const reason = ref('');
const showError = ref(false);
const errorMessage = ref('');

const localModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isValid = computed(() => {
  return confirmText.value.trim() === props.itemName.trim();
});

function onConfirm() {
  if (!isValid.value) {
    showError.value = true;
    errorMessage.value = 'Item name does not match. Please type exactly as shown.';
    return;
  }

  showError.value = false;
  emit('confirm', { reason: reason.value });
  localModelValue.value = false;
  reset();
}

function reset() {
  confirmText.value = '';
  reason.value = '';
  showError.value = false;
  errorMessage.value = '';
}

// Reset when dialog opens
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      reset();
    }
  },
);
</script>
