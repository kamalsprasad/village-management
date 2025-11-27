<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card class="wipe-dialog" style="min-width: 400px; max-width: 500px">
      <q-card-section class="bg-negative text-white">
        <div class="text-h6 flex items-center">
          <q-icon name="warning" size="md" class="q-mr-sm" />
          Wipe All Data
        </div>
      </q-card-section>

      <!-- Progress View (shown during wipe operation) -->
      <template v-if="isWiping">
        <q-card-section class="q-pt-lg text-center">
          <q-spinner-gears size="64px" color="negative" class="q-mb-md" />

          <p class="text-h6 q-mb-sm">{{ phaseTitle }}</p>
          <p class="text-body2 text-grey-7 q-mb-md">{{ phaseDescription }}</p>

          <q-linear-progress
            :value="phaseProgress"
            size="8px"
            color="negative"
            track-color="grey-3"
            rounded
            class="q-mb-md"
          />

          <div class="phase-steps q-mt-lg">
            <div
              v-for="step in phaseSteps"
              :key="step.id"
              class="phase-step"
              :class="{
                'phase-step--completed': step.completed,
                'phase-step--active': step.active,
                'phase-step--pending': !step.completed && !step.active,
              }"
            >
              <q-icon
                :name="
                  step.completed ? 'check_circle' : step.active ? 'sync' : 'radio_button_unchecked'
                "
                :color="step.completed ? 'positive' : step.active ? 'negative' : 'grey-5'"
                size="sm"
                :class="{ rotating: step.active }"
              />
              <span class="q-ml-sm">{{ step.label }}</span>
            </div>
          </div>

          <p class="text-caption text-grey-6 q-mt-lg">
            Please do not close this dialog or navigate away.
          </p>
        </q-card-section>
      </template>

      <!-- Confirmation View (shown before wipe) -->
      <template v-else>
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
      </template>
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
  currentPhase: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'confirmed', 'cancelled']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const confirmationText = ref('');
const isWiping = computed(() => props.loading);

const CONFIRMATION_PHRASE = 'DELETE EVERYTHING';

const isConfirmationValid = computed(() => {
  return confirmationText.value === CONFIRMATION_PHRASE;
});

// Phase configuration
const PHASES = {
  starting: { title: 'Initializing...', description: 'Preparing to wipe data', progress: 0.05 },
  waiting: { title: 'Queued', description: 'Waiting for server to process request', progress: 0.1 },
  processing: {
    title: 'Wiping Data...',
    description: 'Deleting residents, households, and settings',
    progress: 0.5,
  },
  complete: { title: 'Complete!', description: 'All data has been wiped', progress: 1.0 },
};

const phaseTitle = computed(() => {
  return PHASES[props.currentPhase]?.title || 'Processing...';
});

const phaseDescription = computed(() => {
  return PHASES[props.currentPhase]?.description || 'Please wait...';
});

const phaseProgress = computed(() => {
  return PHASES[props.currentPhase]?.progress || 0.1;
});

// Phase steps for visual progress indicator
const phaseSteps = computed(() => {
  const phase = props.currentPhase;
  const phaseOrder = ['starting', 'waiting', 'processing', 'complete'];
  const currentIndex = phaseOrder.indexOf(phase);

  return [
    {
      id: 'init',
      label: 'Initialize',
      completed: currentIndex > 0,
      active: phase === 'starting',
    },
    {
      id: 'queue',
      label: 'Queue request',
      completed: currentIndex > 1,
      active: phase === 'waiting',
    },
    {
      id: 'delete',
      label: 'Delete data',
      completed: currentIndex > 2,
      active: phase === 'processing',
    },
    {
      id: 'done',
      label: 'Finalize',
      completed: phase === 'complete',
      active: false,
    },
  ];
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

.phase-steps {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 0 24px;
}

.phase-step {
  display: flex;
  align-items: center;
  font-size: 14px;
  transition: opacity 0.3s ease;

  &--completed {
    color: var(--q-positive);
  }

  &--active {
    color: var(--q-negative);
    font-weight: 500;
  }

  &--pending {
    color: #9e9e9e;
    opacity: 0.7;
  }
}

.rotating {
  animation: rotate 1.5s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
