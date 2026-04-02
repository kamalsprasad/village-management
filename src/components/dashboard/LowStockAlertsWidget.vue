<template>
  <q-card flat bordered class="low-stock-alerts-widget">
    <q-card-section class="row items-center">
      <div class="text-h6">Inventory Alerts</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="arrow_forward"
        color="primary"
        to="/inventory"
        v-if="totalAlerts > 0"
      >
        <q-tooltip>View Inventory</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Summary Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6">
          <q-card flat bordered class="bg-warning-1">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <q-icon name="warning" color="warning" size="24px" class="q-mr-sm" />
                <div>
                  <div class="text-caption text-grey-7">Low Stock</div>
                  <div class="text-h6 text-warning">{{ lowStockCount }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6">
          <q-card flat bordered class="bg-negative-1">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <q-icon name="error" color="negative" size="24px" class="q-mr-sm" />
                <div>
                  <div class="text-caption text-grey-7">Out of Stock</div>
                  <div class="text-h6 text-negative">{{ outOfStockCount }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Alert List -->
      <div v-if="alertItems.length > 0">
        <div class="text-caption text-grey-7 q-mb-sm">
          Top {{ Math.min(alertItems.length, 5) }} items needing attention:
        </div>
        <q-list dense separator>
          <q-item
            v-for="item in topAlerts"
            :key="item.$id"
            clickable
            @click="$router.push(`/inventory/${item.$id}`)"
          >
            <q-item-section avatar>
              <q-icon
                :name="item.status === 'out_of_stock' ? 'error' : 'warning'"
                :color="item.status === 'out_of_stock' ? 'negative' : 'warning'"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ item.item_name }}</q-item-label>
              <q-item-label caption>
                {{ item.quantity }} {{ item.unit }} remaining
                <span v-if="item.status === 'out_of_stock'" class="text-negative"
                  >(OUT OF STOCK)</span
                >
                <span v-else>(Reorder at {{ item.reorder_threshold }})</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round dense icon="chevron_right" color="grey-6" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- No Alerts -->
      <div v-else class="text-center q-pa-md">
        <q-icon name="check_circle" size="48px" color="positive" />
        <p class="text-grey-7 q-mt-sm q-mb-none">No inventory alerts</p>
        <p class="text-caption text-grey-6">All items are well-stocked</p>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
//import { useRouter } from 'vue-router';
import { useInventoryStore } from 'src/stores/inventory-store';

//const router = useRouter();
const inventoryStore = useInventoryStore();

const lowStockItems = ref([]);
const outOfStockItems = ref([]);

const lowStockCount = computed(() => lowStockItems.value.length);
const outOfStockCount = computed(() => outOfStockItems.value.length);
const totalAlerts = computed(() => lowStockCount.value + outOfStockCount.value);

const alertItems = computed(() => {
  return [...outOfStockItems.value, ...lowStockItems.value];
});

const topAlerts = computed(() => {
  // Sort: out of stock first, then by quantity ascending
  const sorted = [...alertItems.value].sort((a, b) => {
    if (a.status === 'out_of_stock' && b.status !== 'out_of_stock') return -1;
    if (a.status !== 'out_of_stock' && b.status === 'out_of_stock') return 1;
    return a.quantity - b.quantity;
  });
  return sorted.slice(0, 5);
});

onMounted(async () => {
  // Only fetch if user has inventory access
  if (inventoryStore.hasInventoryAccess) {
    const [lowResult, outResult] = await Promise.all([
      inventoryStore.fetchLowStockItems(),
      inventoryStore.fetchOutOfStockItems(),
    ]);
    if (lowResult.success) lowStockItems.value = lowResult.data || [];
    if (outResult.success) outOfStockItems.value = outResult.data || [];
  }
});
</script>

<style scoped>
.bg-warning-1 {
  background-color: rgba(255, 193, 7, 0.1);
}
.bg-negative-1 {
  background-color: rgba(244, 67, 54, 0.1);
}
</style>
