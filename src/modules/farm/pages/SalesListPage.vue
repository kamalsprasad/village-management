<!--
  SalesListPage.vue

  Story 3.8: Paginated list of farm sales with filters (date range, payment
  status, crop). Each row links to the sale detail page. Mirrors the pattern
  of HarvestsListPage.vue for consistency.
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h5 class="q-my-none">Farm Sales</h5>
        <p class="text-grey q-mt-xs q-mb-none">Recorded produce sales across all crops</p>
      </div>
      <q-btn
        color="primary"
        icon="inventory_2"
        label="Browse Produce"
        outline
        @click="$router.push('/inventory')"
      />
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-sm-3">
            <q-input
              v-model="filters.dateFrom"
              label="From"
              type="date"
              clearable
              dense
              outlined
            />
          </div>
          <div class="col-12 col-sm-3">
            <q-input
              v-model="filters.dateTo"
              label="To"
              type="date"
              clearable
              dense
              outlined
            />
          </div>
          <div class="col-12 col-sm-3">
            <q-select
              v-model="filters.paymentStatus"
              :options="paymentStatusOptions"
              label="Payment Status"
              clearable
              dense
              outlined
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-sm-3">
            <q-select
              v-model="filters.cropId"
              :options="cropOptions"
              label="Crop"
              clearable
              dense
              outlined
              emit-value
              map-options
            />
          </div>
        </div>
        <div class="row q-mt-sm">
          <q-btn flat color="grey-8" icon="refresh" label="Reset" dense @click="resetFilters" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Summary -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Total Sales</div>
            <div class="text-h5 text-weight-bold">{{ filteredSales.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Total Revenue</div>
            <div class="text-h6 text-weight-bold text-positive">
              ZMW {{ formatCurrency(totalRevenue) }}
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Total Quantity</div>
            <div class="text-h6 text-weight-bold">
              {{ totalQuantity.toFixed(2) }} kg
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card bordered>
          <q-card-section>
            <div class="text-caption text-grey">Pending</div>
            <div class="text-h6 text-weight-bold text-warning">{{ pendingCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Sales Table -->
    <q-card flat bordered>
      <q-table
        :rows="filteredSales"
        :columns="columns"
        row-key="$id"
        :loading="farmStore.isSalesLoading"
        :pagination="{ rowsPerPage: 25, sortBy: 'sale_date', descending: true }"
        flat
        @row-click="onRowClick"
      >
        <template #body-cell-sale_date="slotProps">
          <q-td :props="slotProps">{{ formatDate(slotProps.row.sale_date) }}</q-td>
        </template>
        <template #body-cell-crop="slotProps">
          <q-td :props="slotProps">{{ resolveCropName(slotProps.row) }}</q-td>
        </template>
        <template #body-cell-quantity="slotProps">
          <q-td :props="slotProps">
            {{ Number(slotProps.row.quantity_sold).toFixed(2) }} {{ slotProps.row.unit || 'kg' }}
          </q-td>
        </template>
        <template #body-cell-total="slotProps">
          <q-td :props="slotProps">
            <span class="text-positive text-weight-medium">
              ZMW {{ formatCurrency(slotProps.row.total_amount) }}
            </span>
          </q-td>
        </template>
        <template #body-cell-payment_status="slotProps">
          <q-td :props="slotProps">
            <q-badge
              :color="slotProps.row.payment_status === 'Completed' ? 'positive' : 'warning'"
            >
              {{ slotProps.row.payment_status }}
            </q-badge>
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center text-grey q-pa-lg">
            <q-icon name="point_of_sale" size="3em" class="q-mb-sm" />
            <div>No sales match the current filters</div>
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { formatDate } from 'src/utils/dateUtils';

const router = useRouter();
const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();

// Local cache of inventory items by $id for crop/item-name lookups
const inventoryByInventoryId = ref({});

const paymentStatusOptions = [
  { label: 'Completed', value: 'Completed' },
  { label: 'Pending', value: 'Pending' },
];

const filters = ref({
  dateFrom: null,
  dateTo: null,
  paymentStatus: null,
  cropId: null,
});

const columns = [
  {
    name: 'sale_date',
    label: 'Date',
    field: 'sale_date',
    align: 'left',
    sortable: true,
  },
  {
    name: 'crop',
    label: 'Crop / Item',
    field: (row) => resolveCropName(row),
    align: 'left',
    sortable: true,
  },
  {
    name: 'buyer_name',
    label: 'Buyer',
    field: 'buyer_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'quantity',
    label: 'Quantity',
    field: 'quantity_sold',
    align: 'right',
    sortable: true,
  },
  {
    name: 'total',
    label: 'Total',
    field: 'total_amount',
    align: 'right',
    sortable: true,
  },
  {
    name: 'payment_method',
    label: 'Method',
    field: 'payment_method',
    align: 'left',
  },
  {
    name: 'payment_status',
    label: 'Status',
    field: 'payment_status',
    align: 'center',
  },
];

const cropOptions = computed(() =>
  (farmStore.crops || []).map((c) => ({ label: c.crop_name, value: c.$id })),
);

const filteredSales = computed(() => {
  let rows = farmStore.sales || [];
  if (filters.value.paymentStatus) {
    rows = rows.filter((r) => r.payment_status === filters.value.paymentStatus);
  }
  if (filters.value.cropId) {
    rows = rows.filter((r) => {
      const invId = idOf(r.inventory_item_id);
      const inv = inventoryByInventoryId.value[invId];
      return idOf(inv?.crop_id) === filters.value.cropId;
    });
  }
  if (filters.value.dateFrom) {
    rows = rows.filter(
      (r) => (r.sale_date || '').slice(0, 10) >= filters.value.dateFrom,
    );
  }
  if (filters.value.dateTo) {
    rows = rows.filter(
      (r) => (r.sale_date || '').slice(0, 10) <= filters.value.dateTo,
    );
  }
  return rows;
});

const totalRevenue = computed(() =>
  filteredSales.value.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0),
);
const totalQuantity = computed(() =>
  filteredSales.value.reduce((sum, s) => sum + (Number(s.quantity_sold) || 0), 0),
);
const pendingCount = computed(
  () => filteredSales.value.filter((s) => s.payment_status === 'Pending').length,
);

function idOf(v) {
  if (!v) return null;
  return typeof v === 'object' ? v.$id : v;
}

function resolveCropName(sale) {
  const invId = idOf(sale.inventory_item_id);
  const inv = inventoryByInventoryId.value[invId];
  if (!inv) return '—';
  const cropId = idOf(inv.crop_id);
  const crop = (farmStore.crops || []).find((c) => c.$id === cropId);
  return crop?.crop_name || inv.item_name || '—';
}

function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resetFilters() {
  filters.value = { dateFrom: null, dateTo: null, paymentStatus: null, cropId: null };
}

function onRowClick(evt, row) {
  router.push(`/farm/sales/${row.$id}`);
}

onMounted(async () => {
  // Load prerequisite reference data in parallel
  const loaders = [];
  if (!farmStore.cropsLoaded) loaders.push(farmStore.fetchCrops());
  loaders.push(farmStore.fetchSales({ limit: 500 }));
  // Fetch farm produce inventory for crop lookups
  loaders.push(inventoryStore.fetchFarmProduceItems());
  await Promise.all(loaders);

  // Build lookup table
  const map = {};
  for (const item of inventoryStore.farmProduceItems || []) {
    map[item.$id] = item;
  }
  inventoryByInventoryId.value = map;
});
</script>
