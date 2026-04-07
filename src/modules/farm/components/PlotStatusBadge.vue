<!--
  PlotStatusBadge.vue
  Displays a plot status with appropriate color coding.
  
  Usage:
    <PlotStatusBadge :status="plot.status" />
-->
<template>
  <q-badge
    :color="badgeColor"
    :text-color="badgeTextColor"
    class="text-weight-medium"
  >
    {{ displayStatus }}
  </q-badge>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['Active', 'Fallow', 'Retired'].includes(value),
  },
});

const badgeColor = computed(() => {
  switch (props.status) {
    case 'Active':
      return 'positive';
    case 'Fallow':
      return 'warning';
    case 'Retired':
      return 'grey';
    default:
      return 'grey';
  }
});

const badgeTextColor = computed(() => {
  return props.status === 'Fallow' ? 'black' : 'white';
});

const displayStatus = computed(() => {
  return props.status || 'Unknown';
});
</script>
