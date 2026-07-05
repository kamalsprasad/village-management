<!--
  EnrollmentStatusBadge.vue (Story 4.1)
  Displays a learner enrollment status with appropriate color coding.

  Usage:
    <EnrollmentStatusBadge :status="learner.enrollment_status" />
-->
<template>
  <q-badge :color="badgeColor" :text-color="badgeTextColor" class="text-weight-medium">
    {{ displayStatus }}
  </q-badge>
</template>

<script setup>
import { computed } from 'vue';
import { ENROLLMENT_STATUSES, getStatusColor } from '../utils/school-constants';

const props = defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ENROLLMENT_STATUSES.some((s) => s.value === value),
  },
});

const badgeColor = computed(() => getStatusColor(props.status));

const badgeTextColor = computed(() => {
  const match = ENROLLMENT_STATUSES.find((s) => s.value === props.status);
  return match ? match.textColor : 'white';
});

const displayStatus = computed(() => {
  return props.status || 'Unknown';
});
</script>
