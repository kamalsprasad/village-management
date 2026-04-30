<!--
  RecentSalesWidget.vue

  Story 3.8: Dashboard widget showing the 5 most recent farm sales along with
  30-day revenue totals. Clicking the header navigates to the sales list page;
  clicking a row navigates to the individual sale detail page.
-->
<template>
  <q-card bordered>
    <q-card-section class="q-pb-none">
      <div class="row items-center justify-between">
        <div
          class="text-subtitle1 text-weight-medium cursor-pointer"
          @click="$router.push('/farm/sales')"
        >
          <q-icon name="point_of_sale" class="q-mr-xs" />
          Recent Sales
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

      <!-- Stats Row -->
      <div v-else>
        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-6">
            <div class="text-caption text-grey">Sales (30d)</div>
            <div class="text-h5 text-weight-bold">{{ thirtyDayCount }}</div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey">Revenue (30d)</div>
            <div class="text-h6 text-weight-bold text-positive">
              ZMW {{ formatCurrency(thirtyDayRevenue) }}
            </div>
          </div>
        </div>

        <q-separator class="q-my-sm" />

        <!-- Sales list (or empty state) -->
        <div v-if="sales.length === 0" class="text-center text-grey q-py-md">
          <q-icon name="point_of_sale" size="2em" class="q-mb-sm" />
          <div class="text-caption">No sales recorded yet</div>
          <q-btn
            flat
            dense
            size="sm"
            color="primary"
            icon="add"
            label="Browse Inventory"
            class="q-mt-sm"
            @click="$router.push('/inventory')"
          />
        </div>

        <q-list v-else dense separator>
          <q-item
            v-for="sale in sales"
            :key="sale.$id"
            clickable
            v-ripple
            @click="$router.push(`/farm/sales/${sale.$id}`)"
          >
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ sale.buyer_name || 'Unknown buyer' }}
              </q-item-label>
              <q-item-label caption>
                {{ Number(sale.quantity_sold).toFixed(2) }} {{ sale.unit || 'kg' }}
                · {{ formatDate(sale.sale_date) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label class="text-weight-medium text-positive">
                ZMW {{ formatCurrency(sale.total_amount) }}
              </q-item-label>
              <q-item-label caption>
                <q-badge
                  :color="sale.payment_status === 'Completed' ? 'positive' : 'warning'"
                  outline
                >
                  {{ sale.payment_status }}
                </q-badge>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-card-section>

    <q-card-actions align="right" v-if="sales.length > 0">
      <q-btn
        flat
        color="primary"
        icon="list"
        label="View All Sales"
        size="sm"
        @click="$router.push('/farm/sales')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import { formatDate } from 'src/utils/dateUtils';

const farmStore = useFarmStore();

const sales = ref([]);
const isLoading = ref(false);

async function refreshData() {
  isLoading.value = true;
  try {
    const result = await farmStore.fetchRecentSales(5);
    sales.value = result.data || [];
    // Also refresh the 30-day totals via fetchSales (stats on farmStore)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await farmStore.fetchSales({ dateFrom: thirtyDaysAgo, limit: 500 });
  } finally {
    isLoading.value = false;
  }
}

const thirtyDayCount = computed(() => (farmStore.sales || []).length);
const thirtyDayRevenue = computed(() =>
  (farmStore.sales || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
);

function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

onMounted(() => {
  refreshData();
});
</script>
