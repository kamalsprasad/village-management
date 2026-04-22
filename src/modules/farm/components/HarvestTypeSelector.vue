<!--
  HarvestTypeSelector.vue
  Component for selecting harvest type with validation and tooltips.

  Story 3.5: Farm Module - Harvest Recording
-->
<template>
  <div class="harvest-type-selector">
    <div class="text-subtitle1 text-weight-medium q-mb-md">
      Harvest Type
    </div>
    
    <q-option-group
      v-model="selectedType"
      :options="typeOptions"
      color="primary"
      class="q-gutter-md"
    />
    
    <div v-if="selectedType" class="q-mt-md">
      <div class="text-body2 text-grey-7">
        {{ getTypeDescription(selectedType) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: 'Single Day',
  },
});

const emit = defineEmits(['update:modelValue']);

const selectedType = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const typeOptions = [
  {
    value: 'Single Day',
    label: 'Single Day Harvest',
    description: 'Complete harvest that happens on one day',
  },
  {
    value: 'Multi-Day Aggregate',
    label: 'Multi-Day Aggregate Harvest',
    description: 'Large plot harvests that span multiple days with daily tracking',
  },
  {
    value: 'Continuous Picking',
    label: 'Continuous Picking',
    description: 'Ongoing harvest for perennial crops (available in Story 3.6)',
    disable: true,
  },
];

function getTypeDescription(type) {
  const option = typeOptions.find(opt => opt.value === type);
  return option ? option.description : '';
}

// Watch for changes and validate
watch(selectedType, (newType) => {
  if (newType === 'Continuous Picking') {
    // Reset to single day if continuous picking is selected (disabled option)
    selectedType.value = 'Single Day';
  }
});
</script>

<style scoped>
.harvest-type-selector {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.q-option-group :deep(.q-option) {
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
}

.q-option-group :deep(.q-option--active) {
  border-color: var(--q-primary);
  background: var(--q-primary-lighten-4);
}
</style>
