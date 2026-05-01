<!--
  PlotProfitabilityCard.vue

  Story 3.9: Per-plot profitability summary card.
  Displays revenue, detailed cost breakdown, net profit, ROI, and a per-planting
  breakdown. Supports date range filter and "include failed plantings" toggle.
  Calls ensureProfitabilityDataLoaded() on mount so all required data is fetched.
-->
<template>
  <q-card>
    <q-card-section>
      <div class="row items-center justify-between q-mb-md">
        <div class="text-subtitle1 text-weight-medium">
          <q-icon name="trending_up" class="q-mr-xs" />
          Profitability Summary
        </div>
        <q-btn flat round dense icon="refresh" :loading="isLoading" @click="refresh">
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>

      <!-- Filters -->
      <div class="row q-col-gutter-sm q-mb-md items-center">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="dateFrom"
            dense
            outlined
            label="From"
            type="date"
            clearable
            @update:model-value="recompute"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-input
            v-model="dateTo"
            dense
            outlined
            label="To"
            type="date"
            clearable
            @update:model-value="recompute"
          />
        </div>
        <div class="col-12 col-sm-4">
          <q-toggle
            v-model="includeFailedPlantings"
            label="Include failed plantings"
            color="primary"
            dense
            @update:model-value="recompute"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-center q-pa-lg">
        <q-spinner color="primary" size="2em" />
        <span class="q-ml-sm text-grey">Loading profitability data…</span>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!profitData || profitData.plantingsIncluded === 0"
        class="text-grey q-pa-md text-center"
      >
        <q-icon name="trending_up" size="2em" class="q-mb-sm" />
        <div>No profitability data yet.</div>
        <div class="text-caption">Complete a harvest and record a sale to see results.</div>
      </div>

      <!-- Profitability Summary -->
      <template v-else>
        <!-- KPI Row -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-4">
            <div class="text-caption text-grey">Total Revenue</div>
            <div class="text-h6 text-weight-bold text-positive">
              ZMW {{ fmt(profitData.revenue) }}
            </div>
          </div>
          <div class="col-12 col-sm-4">
            <div class="text-caption text-grey">Net Profit</div>
            <div
              class="text-h6 text-weight-bold"
              :class="profitData.netProfit >= 0 ? 'text-positive' : 'text-negative'"
            >
              ZMW {{ fmt(profitData.netProfit) }}
            </div>
          </div>
          <div class="col-12 col-sm-4">
            <div class="text-caption text-grey">ROI</div>
            <div
              class="text-h6 text-weight-bold"
              :class="profitData.netProfit >= 0 ? 'text-positive' : 'text-negative'"
            >
              {{ profitData.roiPercent != null ? profitData.roiPercent + '%' : '—' }}
            </div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- Cost Breakdown -->
        <div class="text-caption text-grey text-weight-medium q-mb-xs">Cost Breakdown</div>
        <q-list dense>
          <q-item>
            <q-item-section>Seed / Input Costs</q-item-section>
            <q-item-section side>ZMW {{ fmt(profitData.seedCosts) }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>Planting Labor</q-item-section>
            <q-item-section side>ZMW {{ fmt(profitData.plantingLabor) }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>Planting Other</q-item-section>
            <q-item-section side>ZMW {{ fmt(profitData.plantingOther) }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>Harvest Labor</q-item-section>
            <q-item-section side>ZMW {{ fmt(profitData.harvestLabor) }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section>Harvest Other</q-item-section>
            <q-item-section side>ZMW {{ fmt(profitData.harvestOther) }}</q-item-section>
          </q-item>
          <q-separator />
          <q-item>
            <q-item-section class="text-weight-bold">Total Costs</q-item-section>
            <q-item-section side class="text-weight-bold">
              ZMW {{ fmt(profitData.totalCost) }}
            </q-item-section>
          </q-item>
        </q-list>

        <div class="text-caption text-grey q-mt-sm">
          {{ profitData.plantingsIncluded }} planting{{
            profitData.plantingsIncluded !== 1 ? 's' : ''
          }}
          included ({{ profitData.completedCount }} completed, {{ profitData.failedCount }} failed)
        </div>

        <!-- Per-Planting Breakdown (expandable) -->
        <q-expansion-item
          v-if="profitData.plantingBreakdown.length"
          dense
          class="q-mt-md"
          label="Per-Planting Detail"
          icon="list"
          header-class="text-caption text-grey"
        >
          <q-list dense separator class="q-mt-xs">
            <q-item
              v-for="row in profitData.plantingBreakdown"
              :key="row.plantingId"
              clickable
              @click="$router.push(`/farm/plantings/${row.plantingId}`)"
            >
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ row.cropName }}</q-item-label>
                <q-item-label caption>
                  {{ formatDate(row.plantingDate) }} ·
                  <q-badge :color="statusColor(row.status)" outline class="q-ml-xs">{{
                    row.status
                  }}</q-badge>
                </q-item-label>
              </q-item-section>
              <q-item-section side class="text-right">
                <q-item-label class="text-caption text-grey">
                  Rev: ZMW {{ fmt(row.revenue) }}
                </q-item-label>
                <q-item-label
                  class="text-caption text-weight-medium"
                  :class="row.netProfit >= 0 ? 'text-positive' : 'text-negative'"
                >
                  {{ row.netProfit >= 0 ? '+' : '' }}ZMW {{ fmt(row.netProfit) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-expansion-item>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import { formatDate } from 'src/utils/dateUtils';

const props = defineProps({
  plotId: {
    type: String,
    required: true,
  },
});

const farmStore = useFarmStore();
const isLoading = ref(true);
const profitData = ref(null);

const dateFrom = ref('');
const dateTo = ref('');
const includeFailedPlantings = ref(true);

function fmt(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusColor(status) {
  const key = status?.toLowerCase();
  const map = {
    completed: 'positive',
    failed: 'negative',
    harvesting: 'warning',
    growing: 'positive',
    planted: 'info',
  };
  return map[key] || 'grey';
}

function recompute() {
  // AC6: if dateFrom set but dateTo not, default to today
  const effectiveDateTo =
    dateTo.value || (dateFrom.value ? new Date().toISOString().split('T')[0] : undefined);
  profitData.value = farmStore.computePlotProfitability(props.plotId, {
    dateFrom: dateFrom.value || undefined,
    dateTo: effectiveDateTo,
    includeFailedPlantings: includeFailedPlantings.value,
  });
}

async function refresh() {
  isLoading.value = true;
  farmStore.salesLoaded = false;
  farmStore.harvestsLoaded = false;
  await farmStore.ensureProfitabilityDataLoaded();
  recompute();
  isLoading.value = false;
}

onMounted(async () => {
  await farmStore.ensureProfitabilityDataLoaded();
  recompute();
  isLoading.value = false;
});
</script>
