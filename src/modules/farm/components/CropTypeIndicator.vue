<!--
  CropTypeIndicator.vue
  Type indicator component for Annual/Perennial crops.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <div class="row items-center text-caption">
    <q-icon :name="typeIcon" :color="typeColor" size="sm" class="q-mr-xs" />
    <span :class="`text-${typeColor}`">{{ typeLabel }}</span>
    <q-tooltip v-if="showTooltip">{{ typeTooltip }}</q-tooltip>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  cropType: {
    type: String,
    required: true,
    validator: (value) => ['Annual', 'Perennial'].includes(value),
  },
  showTooltip: {
    type: Boolean,
    default: true,
  },
});

const TYPE_CONFIG = {
  'Annual': {
    icon: 'calendar_today',
    color: 'blue',
    label: 'Annual',
    tooltip: 'Annual - Single harvest cycle',
  },
  'Perennial': {
    icon: 'event_repeat',
    color: 'purple',
    label: 'Perennial',
    tooltip: 'Perennial - Multiple harvest cycles',
  },
};

const typeIcon = computed(() => TYPE_CONFIG[props.cropType]?.icon || 'help');
const typeColor = computed(() => TYPE_CONFIG[props.cropType]?.color || 'grey');
const typeLabel = computed(() => TYPE_CONFIG[props.cropType]?.label || props.cropType);
const typeTooltip = computed(() => TYPE_CONFIG[props.cropType]?.tooltip || '');
</script>
