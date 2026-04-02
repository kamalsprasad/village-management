<template>
  <div class="stock-level-indicator" :style="{ width: size, height: size }">
    <q-circular-progress
      :value="progressValue"
      :min="0"
      :max="100"
      :color="indicatorColor"
      :track-color="trackColor"
      :size="size"
      :thickness="0.2"
      show-value
      rounded
    >
      <q-icon :name="indicatorIcon" :color="indicatorColor" :size="iconSize" />
    </q-circular-progress>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  quantity: {
    type: Number,
    default: 0,
  },
  reorderThreshold: {
    type: Number,
    default: 10,
  },
  size: {
    type: String,
    default: '80px',
  },
});

const progressValue = computed(() => {
  // Calculate percentage based on quantity vs 2x threshold
  const target = props.reorderThreshold * 2;
  if (target === 0) return 0;
  return Math.min((props.quantity / target) * 100, 100);
});

const indicatorColor = computed(() => {
  if (props.quantity === 0) return 'negative';
  if (props.quantity <= props.reorderThreshold) return 'warning';
  return 'positive';
});

const trackColor = computed(() => {
  return 'grey-3';
});

const indicatorIcon = computed(() => {
  if (props.quantity === 0) return 'error';
  if (props.quantity <= props.reorderThreshold) return 'warning';
  return 'check_circle';
});

const iconSize = computed(() => {
  // Extract numeric value from size string and calculate icon size
  const sizeNum = parseInt(props.size);
  if (isNaN(sizeNum)) return '24px';
  return `${Math.floor(sizeNum * 0.3)}px`;
});
</script>
