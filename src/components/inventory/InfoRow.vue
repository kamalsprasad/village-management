<template>
  <div class="info-row q-mb-sm">
    <div class="text-caption text-grey-7">{{ label }}</div>
    <div class="text-body2 text-weight-medium">{{ displayValue }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    default: '—',
  },
});

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return '—';
  }
  return props.value;
});
</script>

<style scoped>
.info-row {
  min-height: 40px;
}
</style>
