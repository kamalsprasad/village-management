<!--
  YieldTrendsWidget.vue

  Story 3.10: Dashboard widget showing a bar chart of avg yield/ha per season
  across all completed plantings. Reuses Chart.js shallowRef pattern from Story 3.9.
-->
<template>
  <q-card>
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div>
          <div class="text-subtitle2 text-weight-medium">
            <q-icon name="show_chart" size="sm" class="q-mr-xs text-teal" />
            Yield Trends
          </div>
          <div class="text-caption text-grey">Last 6 completed plantings</div>
        </div>
        <q-btn
          flat
          dense
          size="xs"
          icon="open_in_new"
          color="grey"
          @click="$router.push('/farm/reports?tab=yield')"
        >
          <q-tooltip>View Full Yield Report</q-tooltip>
        </q-btn>
      </div>

      <div v-if="isLoading" class="q-pa-md">
        <q-skeleton type="rect" height="140px" />
      </div>

      <div v-else-if="!chartData.labels.length" class="text-grey text-caption text-center q-pa-md">
        No completed plantings yet
      </div>

      <template v-else>
        <!-- Summary pills -->
        <div class="row q-col-gutter-sm q-mb-sm">
          <div class="col-6">
            <div class="text-caption text-grey">Best Season</div>
            <div class="text-body2 text-weight-bold text-teal ellipsis">
              {{ bestSeason || '—' }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption text-grey">Avg Yield/ha</div>
            <div class="text-body2 text-weight-bold text-primary">
              {{ overallAvgYield != null ? overallAvgYield + ' kg/ha' : '—' }}
            </div>
          </div>
        </div>

        <div :style="{ position: 'relative', height: '140px' }">
          <canvas ref="canvasRef"></canvas>
        </div>
      </template>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue';
import { useFarmStore } from '../stores/farm-store';

const farmStore = useFarmStore();
const canvasRef = ref(null);
const chartInstance = shallowRef(null);
const isLoading = ref(true);

const allYields = ref([]);

const chartData = computed(() => {
  // Last 6 completed plantings, chronological order
  const rows = allYields.value
    .filter((r) => r.yieldPerHectare !== null)
    .sort((a, b) => new Date(b.plantingDate) - new Date(a.plantingDate))
    .slice(0, 6)
    .reverse();
  const labels = rows.map((r) => {
    const d = new Date(r.plantingDate);
    const shortDate = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    return `${r.cropName} ${shortDate}`;
  });
  const values = rows.map((r) => r.yieldPerHectare);
  const typical =
    rows.length && rows.every((r) => r.cropId === rows[0].cropId) ? rows[0].typicalYield : null;
  return { labels, values, rows, typical };
});

const bestSeason = computed(() => {
  const { labels, values } = chartData.value;
  if (!labels.length) return null;
  const maxIdx = values.indexOf(Math.max(...values));
  return labels[maxIdx] || null;
});

const overallAvgYield = computed(() => {
  const rows = allYields.value.filter((r) => r.yieldPerHectare !== null);
  if (!rows.length) return null;
  const totalKg = rows.reduce((s, r) => s + r.totalHarvestKg, 0);
  const totalHa = rows.reduce((s, r) => s + r.areaHectares, 0);
  return totalHa > 0 ? Math.round((totalKg / totalHa) * 10) / 10 : null;
});

async function renderChart() {
  if (!canvasRef.value || !chartData.value.labels.length) return;
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }

  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);

  const { labels, values, rows, typical } = chartData.value;

  const datasets = [
    {
      label: 'Yield/ha (kg)',
      data: values,
      borderColor: '#00695c',
      backgroundColor: 'rgba(0, 150, 136, 0.15)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#00695c',
      fill: true,
      tension: 0.3,
    },
  ];

  if (typical) {
    datasets.push({
      label: 'Typical Yield',
      data: values.map(() => typical),
      borderColor: '#9e9e9e',
      borderWidth: 1,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  chartInstance.value = new Chart(canvasRef.value, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: !!typical },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const r = rows[idx];
              return `${r.cropName} — ${r.season}`;
            },
            label: (ctx) => {
              if (ctx.dataset.label === 'Typical Yield') {
                return ` Typical: ${ctx.raw} kg/ha`;
              }
              return ` Yield: ${ctx.raw} kg/ha`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 8 }, maxRotation: 45 },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            font: { size: 9 },
            callback: (v) => v + ' kg',
          },
          border: { display: false },
        },
      },
      layout: { padding: { top: 4, bottom: 4, left: 4, right: 4 } },
    },
  });
}

onMounted(async () => {
  await farmStore.ensureYieldDataLoaded();
  allYields.value = farmStore.computeAllPlantingYields();
  isLoading.value = false;
  await new Promise((r) => setTimeout(r, 0)); // let Vue render the canvas
  renderChart();
});

onBeforeUnmount(() => {
  chartInstance.value?.destroy();
  chartInstance.value = null;
});
</script>
