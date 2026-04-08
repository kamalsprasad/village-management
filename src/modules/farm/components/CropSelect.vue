<!--
  CropSelect.vue
  Dropdown component for selecting crops in planting forms.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-select
    :model-value="modelValue"
    @update:model-value="onSelect"
    :options="filteredOptions"
    option-value="$id"
    :option-label="(opt) => opt.crop_name || ''"
    :label="label"
    :rules="rules"
    :loading="farmStore.isCropsLoading"
    :clearable="clearable"
    :outlined="outlined"
    :dense="dense"
    emit-value
    map-options
    use-input
    input-debounce="0"
    @filter="filterFn"
    behavior="menu"
  >
    <!-- Selected item display -->
    <template #selected-item="{ opt }">
      <div v-if="opt" class="row items-center">
        <CropCategoryBadge :category="opt.category" show-icon class="q-mr-sm" />
        <span>{{ opt.crop_name }}</span>
        <span class="text-caption text-grey q-ml-sm">({{ opt.maturity_days }} days)</span>
      </div>
    </template>

    <!-- Option display -->
    <template #option="{ itemProps, opt }">
      <q-item v-bind="itemProps">
        <q-item-section>
          <q-item-label class="row items-center">
            <CropCategoryBadge :category="opt.category" show-icon class="q-mr-sm" />
            <span class="text-weight-medium">{{ opt.crop_name }}</span>
          </q-item-label>
          <q-item-label caption class="row items-center q-gutter-x-md">
            <CropTypeIndicator :crop-type="opt.crop_type" :show-tooltip="false" />
            <span>{{ opt.maturity_days }} days to harvest</span>
            <span v-if="opt.typical_yield_per_hectare">
              {{ opt.typical_yield_per_hectare.toLocaleString() }} kg/ha
            </span>
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <!-- Loading state -->
    <template #loading>
      <q-spinner-dots size="20px" color="primary" />
    </template>

    <!-- No options -->
    <template #no-option>
      <q-item>
        <q-item-section class="text-grey"> No crops found </q-item-section>
      </q-item>
    </template>

    <!-- Hint -->
    <template #hint v-if="selectedCrop">
      <span class="text-caption">
        {{ selectedCrop.crop_type }} crop • {{ selectedCrop.maturity_days }} days to harvest
        <span v-if="selectedCrop.harvest_frequency && selectedCrop.crop_type === 'Perennial'">
          • Harvest every {{ selectedCrop.harvest_frequency }} days
        </span>
      </span>
    </template>
  </q-select>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import CropCategoryBadge from './CropCategoryBadge.vue';
import CropTypeIndicator from './CropTypeIndicator.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  label: {
    type: String,
    default: 'Select Crop *',
  },
  rules: {
    type: Array,
    default: () => [(val) => !!val || 'Please select a crop'],
  },
  filterType: {
    type: String,
    default: null, // 'Annual' or 'Perennial' to filter
    validator: (value) => !value || ['Annual', 'Perennial'].includes(value),
  },
  filterCategory: {
    type: String,
    default: null,
  },
  showInactive: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  outlined: {
    type: Boolean,
    default: true,
  },
  dense: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue', 'select']);

const farmStore = useFarmStore();
const filterText = ref('');

// Base options - filtered by type, category, and active status
const baseOptions = computed(() => {
  let crops = [...farmStore.crops]; // Create a copy to prevent mutating store state

  // Only show active crops by default
  if (!props.showInactive) {
    crops = crops.filter((c) => c.is_active !== false);
  }

  // Filter by crop type
  if (props.filterType) {
    crops = crops.filter((c) => c.crop_type === props.filterType);
  }

  // Filter by category
  if (props.filterCategory) {
    crops = crops.filter((c) => c.category === props.filterCategory);
  }

  // Sort by category then name
  return crops.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || '').localeCompare(b.category || '');
    }
    return (a.crop_name || '').localeCompare(b.crop_name || '');
  });
});

// Filtered options based on search text
const filteredOptions = computed(() => {
  if (!filterText.value) {
    return baseOptions.value;
  }
  const query = filterText.value.toLowerCase();
  return baseOptions.value.filter((c) => c.crop_name.toLowerCase().includes(query));
});

// Selected crop details
const selectedCrop = computed(() => {
  if (!props.modelValue) return null;
  return farmStore.crops.find((c) => c.$id === props.modelValue);
});

// Handle selection
function onSelect(value) {
  emit('update:modelValue', value);

  // Also emit full crop object for parent component use
  const crop = farmStore.crops.find((c) => c.$id === value);
  if (crop) {
    emit('select', crop);
  }
}

// Filter function for search
function filterFn(val, update) {
  update(() => {
    filterText.value = val;
  });
}

// Load crops on mount if not already loaded
onMounted(async () => {
  if (!farmStore.cropsLoaded) {
    await farmStore.fetchCrops();
  }
});
</script>
