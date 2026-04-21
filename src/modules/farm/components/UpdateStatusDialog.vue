<!--
  UpdateStatusDialog.vue
  Shared dialog for updating planting status through the lifecycle workflow.

  Story 3.4: Farm Module - Planting Status Tracking and Lifecycle Management
-->
<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 380px; max-width: 480px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Update Planting Status</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup :disable="isSaving" />
      </q-card-section>

      <q-card-section>
        <!-- Current status display -->
        <div class="q-mb-md">
          <span class="text-grey text-caption">Current status: </span>
          <q-badge :color="getStatusColor(currentStatus)" class="q-ml-xs">
            {{ currentStatus }}
          </q-badge>
        </div>

        <!-- Next status selection -->
        <div class="text-caption text-weight-medium q-mb-sm">Select new status:</div>
        <q-option-group
          v-model="selectedStatus"
          :options="nextStatusOptions"
          color="primary"
          class="q-mb-md"
        />

        <!-- Failure reason section — shown only when 'failed' is selected -->
        <transition name="fade">
          <div v-if="selectedStatus === 'failed'" class="q-mt-sm">
            <q-separator class="q-mb-md" />
            <div class="text-caption text-negative text-weight-medium q-mb-sm">
              Failure Details (required)
            </div>
            <q-select
              v-model="failureReason"
              :options="failureReasonOptions"
              label="Failure Reason *"
              outlined
              dense
              :error="showValidation && !failureReason"
              error-message="Failure reason is required"
              class="q-mb-sm"
            />
            <q-input
              v-model="additionalNotes"
              label="Additional Notes"
              type="textarea"
              outlined
              dense
              maxlength="500"
              :counter="additionalNotes.length > 400"
              rows="3"
              hint="Optional — describe what happened"
            />
          </div>
        </transition>
      </q-card-section>

      <q-card-actions align="right" class="q-pt-none q-pb-md q-px-md">
        <q-btn flat label="Cancel" :disable="isSaving" v-close-popup />
        <q-btn
          color="primary"
          :label="selectedStatus === 'failed' ? 'Mark as Failed' : 'Save Status'"
          :color="selectedStatus === 'failed' ? 'negative' : 'primary'"
          :loading="isSaving"
          :disable="!selectedStatus"
          @click="saveStatus"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  plantingId: {
    type: String,
    required: true,
  },
  currentStatus: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue', 'updated']);

const $q = useQuasar();
const farmStore = useFarmStore();

const isSaving = ref(false);
const selectedStatus = ref(null);
const failureReason = ref(null);
const additionalNotes = ref('');
const showValidation = ref(false);

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const ALLOWED_TRANSITIONS = {
  planted: ['growing', 'failed'],
  growing: ['harvesting', 'failed'],
  harvesting: ['completed', 'failed'],
};

const STATUS_LABELS = {
  growing: 'Growing',
  harvesting: 'Harvesting',
  completed: 'Completed',
  failed: 'Failed',
};

const nextStatusOptions = computed(() => {
  const allowed = ALLOWED_TRANSITIONS[props.currentStatus?.toLowerCase()] || [];
  return allowed.map((s) => ({
    label: STATUS_LABELS[s] || s,
    value: s,
  }));
});

const failureReasonOptions = ['Drought', 'Pests', 'Disease', 'Flooding', 'Poor Soil', 'Other'];

function getStatusColor(status) {
  const colors = {
    planted: 'info',
    growing: 'positive',
    harvesting: 'warning',
    completed: 'positive',
    failed: 'negative',
  };
  return colors[status?.toLowerCase()] || 'grey';
}

// Reset form when dialog opens
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      selectedStatus.value = null;
      failureReason.value = null;
      additionalNotes.value = '';
      showValidation.value = false;
    }
  },
);

// Clear failure fields when switching away from 'failed'
watch(selectedStatus, (val) => {
  if (val !== 'failed') {
    failureReason.value = null;
    additionalNotes.value = '';
    showValidation.value = false;
  }
});

async function saveStatus() {
  if (!selectedStatus.value) return;

  if (selectedStatus.value === 'failed' && !failureReason.value) {
    showValidation.value = true;
    return;
  }

  isSaving.value = true;
  try {
    const result = await farmStore.updatePlantingStatus(
      props.plantingId,
      selectedStatus.value,
      {
        failureReason: failureReason.value,
        additionalNotes: additionalNotes.value,
      },
    );

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: `Planting status updated to ${STATUS_LABELS[selectedStatus.value] || selectedStatus.value}`,
        position: 'top',
      });
      isOpen.value = false;
      emit('updated', selectedStatus.value);
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to update status',
        position: 'top',
      });
    }
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.',
      position: 'top',
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
