<!--
  SaleDetailPage.vue

  Story 3.8: Detail view for a single farm sale. Displays:
  - Sale information (buyer, quantity, price, total, dates, notes)
  - Cross-module links to inventory item, planting, and finance transaction
  - Profit preview section (revenue - aggregated planting & harvest costs)
  - Partial sales history (other sales for the same harvest)

  Profit math aggregates across ALL harvests for the parent planting
  (not just the sale's linked harvest). This matches how costs are tracked
  at the planting level and is correct for perennial continuous-picking.
  Story 3.9 (Profitability Analysis) will build on this foundation.
-->
<template>
  <q-page padding>
    <div class="sale-detail-page">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mr-sm" />
          <div>
            <h4 class="text-h5 q-my-none">Sale Detail</h4>
            <p class="text-grey-7 q-mb-none">
              <q-badge
                :color="sale?.payment_status === 'Completed' ? 'positive' : 'warning'"
                outline
              >
                {{ sale?.payment_status || '—' }}
              </q-badge>
              · {{ formatDate(sale?.sale_date) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="farmStore.isSalesLoading && !sale" class="flex flex-center q-pa-lg">
        <q-spinner color="primary" size="3em" />
      </div>

      <!-- Content -->
      <div v-else-if="sale" class="row q-col-gutter-md">
        <!-- Left column: main info + profit -->
        <div class="col-12 col-md-8">
          <!-- Sale summary card -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-md">Sale Information</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey">Buyer</div>
                  <div class="text-body1 text-weight-medium">{{ sale.buyer_name || '—' }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey">Sale Date</div>
                  <div class="text-body1">{{ formatDate(sale.sale_date) }}</div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Quantity Sold</div>
                  <div class="text-h6 text-weight-medium">
                    {{ Number(sale.quantity_sold).toFixed(2) }} {{ sale.unit || 'kg' }}
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Price / {{ sale.unit || 'kg' }}</div>
                  <div class="text-h6 text-weight-medium">
                    ZMW {{ formatCurrency(sale.price_per_unit) }}
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Total Revenue</div>
                  <div class="text-h5 text-weight-bold text-positive">
                    ZMW {{ formatCurrency(sale.total_amount) }}
                  </div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey">Payment Method</div>
                  <div class="text-body1">{{ sale.payment_method || '—' }}</div>
                </div>
                <div class="col-12 col-sm-6">
                  <div class="text-caption text-grey">Payment Status</div>
                  <q-badge :color="sale.payment_status === 'Completed' ? 'positive' : 'warning'">
                    {{ sale.payment_status }}
                  </q-badge>
                </div>
                <div class="col-12" v-if="sale.notes">
                  <div class="text-caption text-grey">Notes</div>
                  <div class="text-body2">{{ sale.notes }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Profit Preview Card — only shown when cost data is available via an inventory link -->
          <q-card flat bordered class="q-mb-md" v-if="costs && hasInventoryLink">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-sm">
                Profit Preview
                <q-icon name="info" color="grey" size="xs" class="q-ml-xs">
                  <q-tooltip>
                    Revenue from this sale minus total planting and harvest costs across every
                    harvest cycle for this planting. Story 3.9 will add per-sale cost attribution.
                  </q-tooltip>
                </q-icon>
              </div>

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Revenue (this sale)</div>
                  <div class="text-h6 text-positive">
                    ZMW {{ formatCurrency(sale.total_amount) }}
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Total Costs (planting)</div>
                  <div class="text-h6 text-negative">ZMW {{ formatCurrency(costs.totalCost) }}</div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="text-caption text-grey">Net Profit</div>
                  <div
                    class="text-h5 text-weight-bold"
                    :class="netProfit >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    ZMW {{ formatCurrency(netProfit) }}
                  </div>
                  <div
                    class="text-caption"
                    :class="netProfit >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    ROI: {{ roiPercent }}
                  </div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <!-- Cost breakdown -->
              <div class="text-caption text-grey q-mb-xs">Cost Breakdown</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6 col-sm-4 col-md-2">
                  <div class="text-caption text-grey">Seed / Inputs</div>
                  <div>ZMW {{ formatCurrency(costs.seedCosts) }}</div>
                </div>
                <div class="col-6 col-sm-4 col-md-2">
                  <div class="text-caption text-grey">Planting Labor</div>
                  <div>ZMW {{ formatCurrency(costs.plantingLabor) }}</div>
                </div>
                <div class="col-6 col-sm-4 col-md-2">
                  <div class="text-caption text-grey">Planting Other</div>
                  <div>ZMW {{ formatCurrency(costs.plantingOther) }}</div>
                </div>
                <div class="col-6 col-sm-4 col-md-2">
                  <div class="text-caption text-grey">Harvest Labor</div>
                  <div>ZMW {{ formatCurrency(costs.harvestLabor) }}</div>
                </div>
                <div class="col-6 col-sm-4 col-md-2">
                  <div class="text-caption text-grey">Harvest Other</div>
                  <div>ZMW {{ formatCurrency(costs.harvestOther) }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Partial Sales History -->
          <q-card flat bordered v-if="relatedSales.length > 1">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-md">
                Other Sales for This Inventory Item
              </div>
              <q-list separator dense>
                <q-item
                  v-for="s in relatedSales"
                  :key="s.$id"
                  clickable
                  v-ripple
                  :active="s.$id === sale.$id"
                  @click="$router.push(`/farm/sales/${s.$id}`)"
                >
                  <q-item-section>
                    <q-item-label>
                      {{ s.buyer_name }}
                      <span v-if="s.$id === sale.$id" class="text-caption text-grey"
                        >(this sale)</span
                      >
                    </q-item-label>
                    <q-item-label caption>
                      {{ formatDate(s.sale_date) }} · {{ Number(s.quantity_sold).toFixed(2) }}
                      {{ s.unit || 'kg' }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <span class="text-weight-medium text-positive">
                      ZMW {{ formatCurrency(s.total_amount) }}
                    </span>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- Right column: Cross-module links -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-sm">Linked Records</div>

              <q-list dense>
                <!-- Inventory Item -->
                <q-item
                  v-if="hasInventoryLink"
                  clickable
                  v-ripple
                  @click="$router.push(`/inventory/${inventoryItemId}`)"
                >
                  <q-item-section avatar>
                    <q-icon name="inventory_2" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Inventory Item</q-item-label>
                    <q-item-label caption>{{
                      inventoryItem?.item_name || 'View item'
                    }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-icon name="chevron_right" color="grey" />
                  </q-item-section>
                </q-item>

                <!-- Planting -->
                <q-item
                  v-if="plantingId"
                  clickable
                  v-ripple
                  @click="$router.push(`/farm/plantings/${plantingId}`)"
                >
                  <q-item-section avatar>
                    <q-icon name="agriculture" color="green" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Planting</q-item-label>
                    <q-item-label caption>{{ cropName || 'View planting' }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-icon name="chevron_right" color="grey" />
                  </q-item-section>
                </q-item>

                <!-- Harvest -->
                <q-item v-if="harvestId">
                  <q-item-section avatar>
                    <q-icon name="eco" color="orange" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Source Harvest</q-item-label>
                    <q-item-label caption>
                      {{ harvestDateLabel || `Harvest ${harvestId.slice(-6)}` }}
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <!-- Finance Transaction -->
                <q-item v-if="financeTransactionId" clickable v-ripple @click="goToTransaction">
                  <q-item-section avatar>
                    <q-icon name="receipt_long" color="blue" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>Finance Income</q-item-label>
                    <q-item-label caption>
                      ZMW {{ formatCurrency(sale.total_amount) }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-icon name="chevron_right" color="grey" />
                  </q-item-section>
                </q-item>

                <q-item v-if="!hasInventoryLink && !plantingId && !financeTransactionId">
                  <q-item-section>
                    <q-item-label class="text-grey">No linked records</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Not found -->
      <q-banner v-else class="bg-red-1 text-red-9" rounded>
        <template #avatar>
          <q-icon name="error" />
        </template>
        Sale not found.
      </q-banner>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { formatDate } from 'src/utils/dateUtils';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();
const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(
  () => `${sale.value?.buyer_name || 'Sale'} — ${formatDate(sale.value?.sale_date)}`,
);

const saleId = computed(() => route.params.id);
const sale = computed(() => farmStore.currentSale);

const inventoryItem = ref(null);
const costs = ref(null);
const relatedSales = ref([]);

function idOf(v) {
  if (!v) return null;
  return typeof v === 'object' ? v.$id : v;
}

const inventoryItemId = computed(() => idOf(sale.value?.inventory_item_id));
const harvestId = computed(() => idOf(sale.value?.harvest_id));
const financeTransactionId = computed(() => idOf(sale.value?.finance_transaction_id));
const hasInventoryLink = computed(() => !!inventoryItemId.value);
const plantingId = computed(() => idOf(inventoryItem.value?.planting_id));
const cropName = computed(() => {
  const cropId = idOf(inventoryItem.value?.crop_id);
  if (!cropId) return inventoryItem.value?.item_name || '';
  const crop = (farmStore.crops || []).find((c) => c.$id === cropId);
  return crop?.crop_name || inventoryItem.value?.item_name || '';
});

const harvestDateLabel = computed(() => {
  if (!harvestId.value) return null;
  const h = (farmStore.harvests || []).find((row) => row.$id === harvestId.value);
  if (!h) return null;
  return formatDate(h.harvest_end_date || h.harvest_start_date);
});

const netProfit = computed(() => {
  if (!costs.value) return 0;
  return (Number(sale.value?.total_amount) || 0) - costs.value.totalCost;
});

const roiPercent = computed(() => {
  if (!costs.value || costs.value.totalCost <= 0) return '—';
  const pct = (netProfit.value / costs.value.totalCost) * 100;
  return `${pct.toFixed(1)}%`;
});

function formatCurrency(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function goToTransaction() {
  // Finance module uses a filter on the transaction list instead of a detail page.
  router.push({ path: '/finance', query: { transactionId: financeTransactionId.value } });
}

async function loadAll() {
  const result = await farmStore.fetchSaleById(saleId.value);
  if (!result.success || !result.data) return;

  const row = result.data;
  const invId = idOf(row.inventory_item_id);

  // Load crops in parallel (for cost card + crop name)
  const parallel = [];
  if (!farmStore.cropsLoaded) parallel.push(farmStore.fetchCrops());

  // Fetch the inventory item for cross-links (only if we have a link)
  if (invId) {
    parallel.push(
      inventoryStore.fetchItemById(invId).then((r) => {
        inventoryItem.value = r?.success ? r.data : null;
      }),
    );
    // Related sales (partial sales history)
    parallel.push(
      farmStore.fetchSalesForInventoryItem(invId).then((r) => {
        relatedSales.value = r.data || [];
      }),
    );
  }

  // Load harvest metadata if referenced (for harvest_end_date label)
  const hId = idOf(row.harvest_id);
  if (hId && !farmStore.harvestsLoaded) {
    parallel.push(farmStore.fetchHarvests());
  }

  await Promise.all(parallel);

  // Now that inventory + planting are loaded, compute costs
  const pid = idOf(inventoryItem.value?.planting_id);
  if (pid) {
    costs.value = await farmStore.calculatePlantingCostsForProfit(pid);
  }
  // If no linked planting, leave costs as null — the card is hidden via v-if="costs && hasInventoryLink".
}

onMounted(() => {
  loadAll();
});
</script>

<style scoped>
.sale-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
