<!--
  InterventionStatusBadge.vue (Story 4.8)
  Displays an intervention status with appropriate color coding.

  Usage:
    <InterventionStatusBadge :status="intervention.status" />
-->
<template>
  <q-badge :color="badgeColor" :text-color="badgeTextColor" class="text-weight-medium">
    {{ displayStatus }}
  </q-badge>
</template>

<script setup>
import { computed } from 'vue';
import {
  INTERVENTION_STATUSES,
  getInterventionStatusColor,
  getInterventionStatusTextColor,
} from '../utils/school-constants';

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => INTERVENTION_STATUSES.some((s) => s.value === value),
  },
});

const badgeColor = computed(() => getInterventionStatusColor(props.status));
const badgeTextColor = computed(() => getInterventionStatusTextColor(props.status));

const displayStatus = computed(() => {
  const match = INTERVENTION_STATUSES.find((s) => s.value === props.status);
  return match ? match.label : props.status || 'Unknown';
});
</script>
