<!--
  FarmProduceWidget.vue

  Story 3.7: Dashboard widget showing farm produce inventory summary.
  Displays:
  - Total items
  - Total estimated value
  - In-stock items
  - Ready for sale items (in_stock with quantity > 0)
-->
<template>
  <q-card bordered>
    <q-card-section class="q-pb-none">
      <div class="row items-center justify-between">
        <div class="text-subtitle1 text-weight-medium">
          <q-icon name="inventory_2" class="q-mr-xs" />
          Farm Produce Inventory
        </div>
        <q-btn
          flat
          round
          dense
          icon="refresh"
          :loading="isLoading"
          @click="refreshData"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-card-section>
      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-center q-pa-md">
        <q-spinner color="primary" size="2em" />
      </div>

      <!-- Stats Grid -->
      <div v-else class="row q-col-gutter-md">
        <div class="col-6">
          <div class="text-caption text-grey">Total Items</div>
          <div class="text-h5 text-weight-bold">{{ totalItems }}</div>
        </div>
        <div class="col-6">
          <div class="text-caption text-grey">Ready for Sale</div>
          <div class="text-h5 text-weight-bold text-positive">{{ readyForSale }}</div>
        </div>
        <div class="col-6">
          <div class="text-caption text-grey">In Stock</div>
          <div class="text-h6 text-weight-medium">{{ inStockItems }}</div>
        </div>
        <div class="col-6">
          <div class="text-caption text-grey">Low/Out of Stock</div>
          <div class="text-h6 text-weight-medium" :class="lowStockClass">{{ lowStockItems }}</div>
        </div>
      </div>

      <!-- Total Value Banner -->
      <q-banner v-if="totalValue > 0" rounded class="bg-green-1 text-dark q-mt-md">
        <template #avatar>
          <q-icon name="attach_money" color="positive" />
        </template>
        <div class="text-weight-medium">
          Total Estimated Value: ZMW {{ totalValue.toFixed(2) }}
        </div>
      </q-banner>

      <!-- Empty State -->
      <div v-else-if="!isLoading && totalItems === 0" class="text-center text-grey q-py-md">
        <q-icon name="inventory_2" size="2em" class="q-mb-sm" />
        <div class="text-caption">No farm produce in inventory</div>
        <div class="text-caption">
          Complete a harvest to create inventory items
        </div>
      </div>
    </q-card-section>

    <!-- Action Footer -->
    <q-card-actions align="right" v-if="totalItems > 0">
      <q-btn
        flat
        color="primary"
        icon="visibility"
        label="View Inventory"
        size="sm"
        @click="$router.push('/inventory')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInventoryStore } from 'src/stores/inventory-store';

const inventoryStore = useInventoryStore();

const isLoading = ref(false);

const totalItems = computed(() => inventoryStore.farmProduceItems?.length || 0);

const readyForSale = computed(() => {
  return (inventoryStore.farmProduceItems || []).filter(
    (item) => item.status === 'in_stock' && (item.quantity || 0) > 0
  ).length;
});

const inStockItems = computed(() => {
  return (inventoryStore.farmProduceItems || []).filter(
    (item) => item.status === 'in_stock'
  ).length;
});

const lowStockItems = computed(() => {
  return (inventoryStore.farmProduceItems || []).filter(
    (item) => item.status === 'low_stock' || item.status === 'out_of_stock'
  ).length;
});

const lowStockClass = computed(() => {
  return lowStockItems.value > 0 ? 'text-negative' : 'text-grey';
});

const totalValue = computed(() => {
  return (inventoryStore.farmProduceItems || []).reduce((sum, item) => {
    return sum + (Number(item.estimated_value) || 0);
  }, 0);
});

async function refreshData() {
  isLoading.value = true;
  await inventoryStore.fetchFarmProduceItems();
  isLoading.value = false;
}

onMounted(() => {
  refreshData();
});
</script>
