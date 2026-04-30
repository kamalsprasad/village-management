<!--
  TopCropsWidget.vue

  Story 3.9: Dashboard widget showing the top 5 crops by net profit.
  Displays a ranked list with revenue, costs, net profit, and ROI badge.
  Links header to /farm/reports for full analysis.
-->
<template>
  <q-card bordered>
    <q-card-section class="q-pb-none">
      <div class="row items-center justify-between">
        <div
          class="text-subtitle1 text-weight-medium cursor-pointer"
          @click="$router.push('/farm/reports')"
        >
          <q-icon name="emoji_events" class="q-mr-xs" />
          Top Performing Crops
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

      <div v-else-if="!topCrops.length" class="text-center text-grey q-py-md">
        <q-icon name="bar_chart" size="2em" class="q-mb-sm" />
        <div class="text-caption">No crop profitability data yet.</div>
        <div class="text-caption">Complete a harvest and record a sale to see results.</div>
      </div>

      <q-list v-else dense separator>
        <q-item v-for="(crop, idx) in topCrops" :key="crop.cropId">
          <q-item-section avatar>
            <q-avatar
              :color="idx === 0 ? 'amber' : idx === 1 ? 'grey-4' : 'brown-3'"
              text-color="white"
              size="sm"
            >
              {{ idx + 1 }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ crop.cropName }}</q-item-label>
            <q-item-label caption>
              {{ crop.totalPlantings }} planting{{ crop.totalPlantings !== 1 ? 's' : '' }} ·
              {{ crop.successRate }}
            </q-item-label>
          </q-item-section>
          <q-item-section side class="text-right">
            <q-item-label
              class="text-weight-medium"
              :class="crop.netProfit >= 0 ? 'text-positive' : 'text-negative'"
            >
              ZMW {{ fmt(crop.netProfit) }}
            </q-item-label>
            <q-item-label caption>
              <q-badge
                :color="crop.netProfit >= 0 ? 'positive' : 'negative'"
                outline
              >
                ROI {{ crop.roiPercent != null ? crop.roiPercent + '%' : '—' }}
              </q-badge>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-card-actions v-if="topCrops.length" align="right">
      <q-btn
        flat
        color="primary"
        icon="bar_chart"
        label="Full Report"
        size="sm"
        @click="$router.push('/farm/reports')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';

const farmStore = useFarmStore();
const isLoading = ref(true);
const topCrops = ref([]);

async function refresh() {
  isLoading.value = true;
  farmStore.salesLoaded = false;
  await farmStore.ensureProfitabilityDataLoaded();
  topCrops.value = farmStore.computeTopCropsByProfit(5);
  isLoading.value = false;
}

function fmt(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

onMounted(async () => {
  await farmStore.ensureProfitabilityDataLoaded();
  topCrops.value = farmStore.computeTopCropsByProfit(5);
  isLoading.value = false;
});
</script>
