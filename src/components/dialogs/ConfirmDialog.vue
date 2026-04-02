<template>
  <q-dialog v-model="localModelValue" persistent>
    <q-card style="min-width: 350px; max-width: 450px">
      <q-card-section class="row items-center">
        <div class="text-h6">{{ title }}</div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <p class="text-body2">{{ message }}</p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey-7" v-close-popup />
        <q-btn
          :label="confirmLabel"
          :color="confirmColor"
          @click="onConfirm"
          v-close-popup
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: 'Confirm',
  },
  message: {
    type: String,
    default: 'Are you sure?',
  },
  confirmLabel: {
    type: String,
    default: 'Confirm',
  },
  confirmColor: {
    type: String,
    default: 'primary',
  },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const localModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function onConfirm() {
  emit('confirm');
}
</script>
