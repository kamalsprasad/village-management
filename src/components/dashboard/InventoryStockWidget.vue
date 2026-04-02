<template>
  <q-card flat bordered class="inventory-stock-widget">
    <q-card-section class="row items-center">
      <div class="text-h6">Inventory Overview</div>
      <q-space />
      <q-btn flat round dense icon="arrow_forward" color="primary" to="/inventory">
        <q-tooltip>View All Inventory</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Summary Stats -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-6 col-sm-3">
          <div class="text-caption text-grey-7">Total Items</div>
          <div class="text-h5">{{ totalItems }}</div>
        </div>
        <div class="col-6 col-sm-3" v-if="canViewValues">
          <div class="text-caption text-grey-7">Total Value</div>
          <div class="text-h6">{{ formatCurrency(totalValue) }}</div>
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-caption text-grey-7">In Stock</div>
          <div class="text-h6 text-positive">{{ inStockCount }}</div>
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-caption text-grey-7">Need Attention</div>
          <div class="text-h6" :class="needAttentionCount > 0 ? 'text-negative' : 'text-positive'">
            {{ needAttentionCount }}
          </div>
        </div>
      </div>

      <!-- Stock by Type Chart -->
      <div v-if="itemsByTypeData.length > 0" class="q-mb-md">
        <div class="text-caption text-grey-7 q-mb-sm">Stock by Type</div>
        <div class="row items-center">
          <div class="col-12 col-sm-8">
            <canvas ref="chartCanvas" height="150"></canvas>
          </div>
          <div class="col-12 col-sm-4">
            <q-list dense>
              <q-item v-for="item in itemsByTypeData" :key="item.type">
                <q-item-section avatar>
                  <q-badge :color="item.color" rounded style="width: 12px; height: 12px" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>{{ item.label }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ item.count }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>

      <!-- Recent Items -->
      <div v-if="recentItems.length > 0">
        <div class="text-caption text-grey-7 q-mb-sm">Recently Added</div>
        <q-list dense>
          <q-item
            v-for="item in recentItems"
            :key="item.$id"
            clickable
            @click="$router.push(`/inventory/${item.$id}`)"
          >
            <q-item-section avatar>
              <q-icon :name="getItemIcon(item.item_type)" :color="getItemColor(item.item_type)" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ item.item_name }}</q-item-label>
              <q-item-label caption>
                {{ item.quantity }} {{ item.unit }} · {{ formatDate(item.$createdAt) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip :color="getStatusColor(item.status)" text-color="white" size="xs" dense>
                {{ getStatusLabel(item.status) }}
              </q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- No Items -->
      <div v-else-if="totalItems === 0" class="text-center q-pa-md">
        <q-icon name="inventory_2" size="48px" color="grey-4" />
        <p class="text-grey-7 q-mt-sm">No inventory items yet</p>
        <q-btn
          color="primary"
          label="Add First Item"
          to="/inventory/add"
          size="sm"
          class="q-mt-sm"
          v-if="canEdit"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, ref, onMounted, watch, nextTick } from 'vue';
//import { useRouter } from 'vue-router';
import { useInventoryStore } from 'src/stores/inventory-store';
import { date } from 'quasar';
import Chart from 'chart.js/auto';

//const router = useRouter();
const inventoryStore = useInventoryStore();

const chartCanvas = ref(null);
let chartInstance = null;

const canViewValues = computed(() => inventoryStore.canViewValues);

const canEdit = computed(() => inventoryStore.canEditItems);

const totalItems = computed(() => inventoryStore.items.length);
const totalValue = computed(() => inventoryStore.totalInventoryValue);
const inStockCount = computed(() => inventoryStore.itemsByStatus.in_stock);
const needAttentionCount = computed(
  () => inventoryStore.itemsByStatus.low_stock + inventoryStore.itemsByStatus.out_of_stock,
);

const itemsByTypeData = computed(() => {
  const colors = {
    farm_inputs: 'green',
    farm_produce: 'light-green',
    school_supplies: 'blue',
    medical_supplies: 'red',
    kitchen_supplies: 'orange',
    equipment: 'purple',
    other: 'grey',
  };

  const grouped = inventoryStore.itemsByType;
  return Object.entries(grouped)
    .filter(([, data]) => data.count > 0)
    .map(([type, data]) => ({
      type,
      label: inventoryStore.getItemTypeLabel(type),
      count: data.count,
      color: colors[type] || 'grey',
    }))
    .sort((a, b) => b.count - a.count);
});

const recentItems = computed(() => {
  return [...inventoryStore.items]
    .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))
    .slice(0, 5);
});

function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return `ZMW ${Number(value).toFixed(0)}`;
  // Note: Widget uses integer formatting, not store's 2-decimal formatCurrency
}

function formatDate(value) {
  if (!value) return '';
  return date.formatDate(value, 'MMM D');
}

function getItemIcon(type) {
  return inventoryStore.getItemTypeIcon(type);
}

function getItemColor(type) {
  return inventoryStore.getItemTypeColor(type);
}

function getStatusColor(status) {
  return inventoryStore.getStatusColor(status);
}

function getStatusLabel(status) {
  const labels = {
    in_stock: 'OK',
    low_stock: 'Low',
    out_of_stock: 'Empty',
    reserved: 'Reserved',
  };
  return labels[status] || status;
}

function renderChart() {
  if (!chartCanvas.value || itemsByTypeData.value.length === 0) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  const data = itemsByTypeData.value;

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => d.count),
          backgroundColor: data.map((d) => {
            const colorMap = {
              green: '#21ba45',
              'light-green': '#8bc34a',
              blue: '#1976d2',
              red: '#f44336',
              orange: '#ff9800',
              purple: '#9c27b0',
              grey: '#9e9e9e',
            };
            return colorMap[d.color] || d.color;
          }),
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

onMounted(async () => {
  if (inventoryStore.hasInventoryAccess) {
    await inventoryStore.fetchItems(1, 100);
    await nextTick();
    renderChart();
  }
});

watch(itemsByTypeData, () => {
  nextTick(() => renderChart());
});
</script>
