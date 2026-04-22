<!--
  HarvestStatusBadge.vue
  Status badge component for harvest records with color coding.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <q-badge
    :color="statusColor"
    :text-color="statusTextColor"
    class="harvest-status-badge"
  >
    <q-icon
      :name="statusIcon"
      size="14px"
      class="q-mr-xs"
    />
    {{ status }}
  </q-badge>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value),
  },
});

const statusColor = computed(() => {
  switch (props.status?.toLowerCase()) {
    case 'in progress':
      return 'orange';
    case 'completed':
      return 'green';
    default:
      return 'grey';
  }
});

const statusTextColor = computed(() => {
  switch (props.status?.toLowerCase()) {
    case 'in progress':
      return 'white';
    case 'completed':
      return 'white';
    default:
      return 'white';
  }
});

const statusIcon = computed(() => {
  switch (props.status?.toLowerCase()) {
    case 'in progress':
      return 'pending';
    case 'completed':
      return 'check_circle';
    default:
      return 'help';
  }
});
</script>

<style scoped>
.harvest-status-badge {
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
