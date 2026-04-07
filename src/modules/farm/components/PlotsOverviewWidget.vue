<!--
  PlotsOverviewWidget.vue
  Dashboard widget showing plot distribution by status as a pie chart.
  
  Story 3.1: Farm Module - Plot Management
-->
<template>
  <WidgetBase
    title="Plots Overview"
    :loading="isLoading"
    :empty="!hasData"
    empty-message="No plots to display"
    :detail-route="'/farm/plots'"
    @refresh="loadData"
  >
    <template #content>
      <div class="row justify-center items-center" style="min-height: 200px">
        <ClientOnly>
          <div style="width: 100%; max-width: 250px; margin: 0 auto">
            <canvas ref="chartRef" height="200"></canvas>
          </div>
        </ClientOnly>
      </div>

      <!-- Legend -->
      <div class="row q-col-gutter-sm justify-center q-mt-md">
        <div
          v-for="(item, index) in chartData"
          :key="item.label"
          class="col-auto row items-center text-caption"
        >
          <div
            class="q-mr-xs"
            :style="{
              width: '12px',
              height: '12px',
              backgroundColor: CHART_COLORS[index],
              borderRadius: '50%',
            }"
          ></div>
          <span class="text-weight-medium q-mr-xs">{{ item.label }}</span>
          <span class="text-grey-7">({{ item.value }})</span>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="row q-col-gutter-md q-mt-md justify-center">
        <div class="col-auto text-center">
          <div class="text-h6 text-weight-bold">{{ totalPlots }}</div>
          <div class="text-caption text-grey">Total Plots</div>
        </div>
      </div>
    </template>
  </WidgetBase>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import WidgetBase from 'src/components/common/WidgetBase.vue';
import ClientOnly from 'src/components/layout/ClientOnly.vue';

const farmStore = useFarmStore();

const chartRef = ref(null);
const chartInstance = shallowRef(null);
const isLoading = ref(false);

// Chart colors matching plot status badges
const CHART_COLORS = [
  '#21ba45', // Active - green/positive
  '#f2c037', // Fallow - amber/warning
  '#9e9e9e', // Retired - grey
];

const hasData = computed(() => {
  return totalPlots.value > 0;
});

const totalPlots = computed(() => {
  return farmStore.plots.length;
});

const chartData = computed(() => {
  const active = farmStore.plots.filter(p => p.status === 'Active').length;
  const fallow = farmStore.plots.filter(p => p.status === 'Fallow').length;
  const retired = farmStore.plots.filter(p => p.status === 'Retired').length;

  return [
    { label: 'Active', value: active },
    { label: 'Fallow', value: fallow },
    { label: 'Retired', value: retired },
  ].filter(item => item.value > 0);
});

async function loadData() {
  isLoading.value = true;
  if (!farmStore.plotsLoaded) {
    await farmStore.fetchPlots();
  }
  isLoading.value = false;
  renderChart();
}

const renderChart = async () => {
  if (!chartRef.value || !hasData.value) return;

  // Dynamically import Chart.js only when needed on the client
  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (chartInstance.value) {
      chartInstance.value.destroy();
    }

    const ctx = chartRef.value.getContext('2d');

    const labels = chartData.value.map((c) => c.label);
    const data = chartData.value.map((c) => c.value);

    chartInstance.value = new Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: CHART_COLORS.slice(0, data.length),
            borderWidth: 1,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false, // We render our own custom HTML legend
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error('Error rendering pie chart:', error);
  }
};

watch(
  () => farmStore.plots,
  () => {
    renderChart();
  },
  { deep: true }
);

// Initial render needs slight delay to ensure canvas is mounted within ClientOnly
onMounted(() => {
  loadData();
  setTimeout(renderChart, 100);
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
});
</script>
