<!--
  CropCategoryBadge.vue
  Category badge component with color coding for crops.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-badge :color="categoryColor" :text-color="textColor" class="crop-category-badge">
    <q-icon v-if="showIcon" :name="categoryIcon" size="xs" class="q-mr-xs" />
    {{ categoryLabel }}
  </q-badge>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  category: {
    type: String,
    required: true,
    validator: (value) =>
      ['Grain', 'Legume', 'Vegetable', 'Root', 'Fruit', 'Other'].includes(value),
  },
  showIcon: {
    type: Boolean,
    default: true,
  },
});

const CATEGORY_CONFIG = {
  Grain: { color: 'amber-7', icon: 'grain', label: 'Grain' },
  Legume: { color: 'green-7', icon: 'grass', label: 'Legume' },
  Vegetable: { color: 'green-5', icon: 'eco', label: 'Vegetable' },
  Root: { color: 'brown-5', icon: 'spa', label: 'Root' },
  Fruit: { color: 'red-5', icon: 'apple', label: 'Fruit' },
  Other: { color: 'grey-6', icon: 'park', label: 'Other' },
};

const categoryColor = computed(() => {
  return CATEGORY_CONFIG[props.category]?.color || 'grey';
});

const categoryIcon = computed(() => {
  return CATEGORY_CONFIG[props.category]?.icon || 'help';
});

const categoryLabel = computed(() => {
  return CATEGORY_CONFIG[props.category]?.label || props.category;
});

const textColor = computed(() => {
  // Use white text for better contrast on darker colors
  const darkColors = ['brown-5', 'red-5', 'green-7', 'amber-7'];
  return darkColors.includes(categoryColor.value) ? 'white' : 'black';
});
</script>

<style scoped>
.crop-category-badge {
  font-weight: 500;
  padding: 4px 8px;
}
</style>
