<!--
  PlotProfitabilityWidget.vue

  Story 3.9: Dashboard widget showing profitability summary for all plots.
  Displays a table with revenue, costs, net profit, and ROI per plot.
  Clicking a row navigates to the plot detail page.
-->
<template>
  <q-card bordered>
    <q-card-section class="q-pb-none">
      <div class="row items-center justify-between">
        <div
          class="text-subtitle1 text-weight-medium cursor-pointer"
          @click="$router.push('/farm/plots')"
        >
          <q-icon name="place" class="q-mr-xs" />
          Plot Profitability
        </div>
        <q-btn flat round dense icon="refresh" :loading="isLoading" @click="refresh">
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-card-section>
      <div v-if="isLoading" class="flex flex-center q-pa-md">
        <q-spinner color="primary" size="2em" />
      </div>

      <div v-else-if="!plotsData.length" class="text-center text-grey q-py-md">
        <q-icon name="place" size="2em" class="q-mb-sm" />
        <div class="text-caption">No plot profitability data yet.</div>
      </div>

      <q-list v-else dense separator>
        <q-item
          v-for="plot in plotsData"
          :key="plot.plotId"
          clickable
          v-ripple
          @click="$router.push(`/farm/plots/${plot.plotId}`)"
        >
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ plot.plotName }}</q-item-label>
            <q-item-label caption>
              {{ plot.plantingsIncluded }} planting{{ plot.plantingsIncluded !== 1 ? 's' : '' }} ·
              Revenue: ZMW {{ fmt(plot.revenue) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side class="text-right">
            <q-item-label
              class="text-weight-medium"
              :class="plot.netProfit >= 0 ? 'text-positive' : 'text-negative'"
            >
              ZMW {{ fmt(plot.netProfit) }}
            </q-item-label>
            <q-item-label caption>
              <q-badge :color="plot.netProfit >= 0 ? 'positive' : 'negative'" outline>
                ROI {{ plot.roiPercent != null ? plot.roiPercent + '%' : '—' }}
              </q-badge>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';

const farmStore = useFarmStore();
const isLoading = ref(true);
const plotsData = ref([]);

async function refresh() {
  isLoading.value = true;
  farmStore.salesLoaded = false;
  farmStore.harvestsLoaded = false;
  await farmStore.ensureProfitabilityDataLoaded();
  plotsData.value = farmStore.computeAllPlotsProfitability();
  isLoading.value = false;
}

function fmt(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

onMounted(async () => {
  await farmStore.ensureProfitabilityDataLoaded();
  plotsData.value = farmStore.computeAllPlotsProfitability();
  isLoading.value = false;
});
</script>
