<!--
  CropsListWidget.vue
  Dashboard widget showing crop counts by category.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <WidgetBase
    title="Crops Overview"
    :loading="isLoading"
    :empty="!hasData"
    empty-message="No crops available"
    detail-route="/farm/crops"
    @refresh="loadData"
  >
    <template #content>
      <!-- Category Distribution -->
      <div class="row q-col-gutter-sm">
        <div v-for="stat in categoryStats" :key="stat.category" class="col-6 col-md-4">
          <q-card flat bordered class="full-height">
            <q-card-section class="text-center q-pa-sm">
              <q-icon :name="stat.icon" :color="stat.color" size="2rem" />
              <div class="text-h6 q-mt-sm">{{ stat.count }}</div>
              <div class="text-caption text-grey">{{ stat.label }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Summary -->
      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-6 text-center">
          <div class="text-h5 text-weight-bold">{{ totalCrops }}</div>
          <div class="text-caption text-grey">Total Crops</div>
        </div>
        <div class="col-6 text-center">
          <div class="text-h5 text-weight-bold">{{ activeCrops }}</div>
          <div class="text-caption text-grey">Active Crops</div>
        </div>
      </div>

      <!-- Quick Add (Admin only) -->
      <div v-if="hasPermission('farm:admin')" class="q-mt-md text-center">
        <q-btn
          flat
          dense
          color="primary"
          icon="add"
          label="Add New Crop"
          @click="$router.push('/farm/crops/add')"
        />
      </div>
    </template>
  </WidgetBase>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import { usePermissions } from 'src/composables/usePermissions';
import WidgetBase from 'src/components/common/WidgetBase.vue';

const farmStore = useFarmStore();
const { hasPermission } = usePermissions();

const isLoading = ref(false);

const hasData = computed(() => farmStore.crops.length > 0);

const totalCrops = computed(() => farmStore.crops.length);

const activeCrops = computed(() => farmStore.crops.filter((c) => c.is_active !== false).length);

const categoryStats = computed(() => {
  const categories = [
    { category: 'Grain', icon: 'grain', color: 'amber-7', label: 'Grains' },
    { category: 'Legume', icon: 'grass', color: 'green-7', label: 'Legumes' },
    { category: 'Vegetable', icon: 'eco', color: 'green-5', label: 'Vegetables' },
    { category: 'Root', icon: 'spa', color: 'brown-5', label: 'Roots' },
    { category: 'Fruit', icon: 'apple', color: 'red-5', label: 'Fruits' },
    { category: 'Other', icon: 'park', color: 'grey-6', label: 'Other' },
  ];

  return categories.map((cat) => ({
    ...cat,
    count: farmStore.crops.filter((c) => c.category === cat.category && c.is_active !== false)
      .length,
  }));
});

async function loadData() {
  isLoading.value = true;
  try {
    await farmStore.fetchCrops();
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  if (!farmStore.cropsLoaded) {
    await loadData();
  }
});
</script>
