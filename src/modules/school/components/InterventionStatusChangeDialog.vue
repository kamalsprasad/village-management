<!--
  InterventionStatusChangeDialog.vue

  Confirmation dialog for changing an intervention's status from the detail page.
  Collects an outcome when the target status is Resolved or Closed Without Resolution.
-->
<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card style="min-width: 400px; max-width: 500px">
      <q-card-section>
        <div class="text-h6">{{ title }}</div>
        <div class="text-caption text-grey">{{ subtitle }}</div>
      </q-card-section>

      <q-card-section v-if="requiresOutcome">
        <q-input
          v-model="outcomeInput"
          label="Outcome *"
          type="textarea"
          outlined
          maxlength="1000"
          :error="!!errorMessage"
          :error-message="errorMessage"
          autofocus
        />
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="grey" @click="onDialogCancel" />
        <q-btn
          :label="confirmLabel"
          :color="confirmColor"
          :disable="requiresOutcome && !outcomeInput.trim()"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { statusRequiresOutcome } from '../utils/school-constants';

const props = defineProps({
  currentStatus: {
    type: String,
    required: true,
  },
  targetStatus: {
    type: String,
    required: true,
  },
});

// Required by Quasar's dialog plugin so the dialog can be mounted/unmounted
// and emit ok/hide events correctly.
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();

const outcomeInput = ref('');
const errorMessage = ref('');

const requiresOutcome = computed(() => statusRequiresOutcome(props.targetStatus));

const actionLabel = computed(() => {
  if (props.currentStatus === 'Active' && props.targetStatus === 'Paused') return 'Pause';
  if (props.currentStatus === 'Paused' && props.targetStatus === 'Active') return 'Resume';
  if (props.targetStatus === 'Resolved') return 'Resolve';
  if (props.targetStatus === 'Closed Without Resolution') return 'Close';
  return 'Change Status';
});

const targetStatusLabel = computed(() => {
  if (props.targetStatus === 'Closed Without Resolution') return 'Closed Without Resolution';
  return props.targetStatus;
});

const title = computed(() => `${actionLabel.value} Intervention`);

const subtitle = computed(() => {
  return `The intervention will be marked as ${targetStatusLabel.value.toLowerCase()}.`;
});

const confirmLabel = computed(() => actionLabel.value);

const confirmColor = computed(() => {
  if (props.targetStatus === 'Resolved') return 'positive';
  if (props.targetStatus === 'Closed Without Resolution') return 'grey';
  if (props.targetStatus === 'Paused') return 'warning';
  return 'primary';
});

function onConfirm() {
  errorMessage.value = '';

  if (requiresOutcome.value && !outcomeInput.value.trim()) {
    errorMessage.value = 'An outcome is required when resolving or closing an intervention.';
    return;
  }

  onDialogOK({ outcome: outcomeInput.value });
}
</script>
