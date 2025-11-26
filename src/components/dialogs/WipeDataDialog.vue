<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card class="wipe-dialog" style="min-width: 400px; max-width: 500px">
      <q-card-section class="bg-negative text-white">
        <div class="text-h6 flex items-center">
          <q-icon name="warning" size="md" class="q-mr-sm" />
          Wipe All Data
        </div>
      </q-card-section>

      <q-card-section class="q-pt-lg">
        <q-banner class="bg-red-1 text-negative q-mb-md" rounded>
          <template v-slot:avatar>
            <q-icon name="error" color="negative" />
          </template>
          <strong>This action cannot be undone!</strong>
        </q-banner>

        <p class="text-body1 q-mb-md">
          You are about to permanently delete all data from this village management system:
        </p>

        <ul class="q-mb-md text-body2">
          <li>All resident records</li>
          <li>All household records</li>
          <li>Village configuration and settings</li>
          <li>Council member assignments</li>
        </ul>

        <p class="text-body2 text-grey-7 q-mb-lg">
          After wiping, you will be redirected to the setup wizard to start fresh.
        </p>

        <q-input
          v-model="confirmationText"
          outlined
          label="Type DELETE EVERYTHING to confirm"
          :error="confirmationText.length > 0 && !isConfirmationValid"
          error-message="Text must match exactly: DELETE EVERYTHING"
          class="q-mb-md"
        >
          <template v-slot:prepend>
            <q-icon name="keyboard" />
          </template>
        </q-input>

        <p class="text-caption text-grey-6">
          This confirmation is case-sensitive and must match exactly.
        </p>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancel" color="grey-7" v-close-popup @click="handleCancel" />
        <q-btn
          label="Wipe All Data"
          color="negative"
          icon="delete_forever"
          :disable="!isConfirmationValid"
          :loading="isWiping"
          @click="handleConfirm"
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
  loading: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'confirmed', 'cancelled']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const confirmationText = ref('');
// Internal state not needed if we trust parent's loading prop, but good for immediate feedback
const isWiping = computed(() => props.loading);

const CONFIRMATION_PHRASE = 'DELETE EVERYTHING';

const isConfirmationValid = computed(() => {
  return confirmationText.value === CONFIRMATION_PHRASE;
});

// Reset confirmation text when dialog opens
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      confirmationText.value = '';
    }
  },
);

function handleCancel() {
  confirmationText.value = '';
  emit('cancelled');
}

async function handleConfirm() {
  if (!isConfirmationValid.value) return;

  try {
    emit('confirmed');
  } catch (error) {
    console.error('Error during wipe confirmation:', error);
  }
}
</script>

<style lang="scss" scoped>
.wipe-dialog {
  ul {
    padding-left: 20px;
    margin: 0;

    li {
      margin-bottom: 4px;
    }
  }
}
</style>
