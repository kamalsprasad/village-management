<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Top Expense Categories</div>
        <div class="text-caption text-grey">By Total Amount</div>
      </div>
      <q-btn flat color="primary" label="View Full Report" to="/finance/reports" />
    </q-card-section>

    <q-card-section v-if="categories && categories.length > 0" class="q-pt-none" style="min-height: 250px;">
      <div class="row justify-center items-center h-full">
        <ClientOnly>
          <div style="width: 100%; max-width: 300px; margin: 0 auto;">
            <canvas ref="chartRef" height="250"></canvas>
          </div>
        </ClientOnly>
      </div>

      <!-- Legend -->
      <div class="row q-col-gutter-sm justify-center q-mt-md">
        <div 
          v-for="(category, index) in topCategories" 
          :key="category.id" 
          class="col-auto row items-center text-caption"
        >
          <div 
            class="q-mr-xs" 
            :style="{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: CHART_COLORS[index % CHART_COLORS.length], 
              borderRadius: '50%' 
            }"
          ></div>
          <span class="text-weight-medium q-mr-xs">{{ category.name }}</span>
          <span class="text-grey-7">{{ formatCurrency(category.amount) }}</span>
        </div>
      </div>
    </q-card-section>

    <q-card-section v-else-if="!loading" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="pie_chart" size="3rem" class="q-mb-sm" />
      <div>No expense data available for this period</div>
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { formatCurrency } from 'src/services/ReportService';
import ClientOnly from 'src/components/layout/ClientOnly.vue';

const props = defineProps({
  categories: {
    type: Array,
    required: true,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const chartRef = ref(null);
const chartInstance = shallowRef(null);

// Chart.js colors (consistent with ReportService/ReportsPage)
const CHART_COLORS = [
  '#1976D2', // primary
  '#26A69A', // secondary
  '#9C27B0', // accent
  '#F2C037', // warning
  '#C10015', // negative
  '#31CCEC', // info
  '#009688', // teal
  '#FF9800', // orange
  '#795548', // brown
  '#607D8B', // blue-grey
];

const topCategories = computed(() => {
  // Sort descending by amount and take top 5
  return [...props.categories]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
});

const renderChart = async () => {
  if (!chartRef.value || topCategories.value.length === 0) return;

  // Dynamically import Chart.js only when needed on the client
  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (chartInstance.value) {
      chartInstance.value.destroy();
    }

    const ctx = chartRef.value.getContext('2d');
    
    const labels = topCategories.value.map(c => c.name);
    const data = topCategories.value.map(c => c.amount);

    chartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length),
          borderWidth: 1,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // We render our own custom HTML legend below
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                let label = context.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed !== null) {
                  label += new Intl.NumberFormat('en-ZM', { 
                    style: 'currency', 
                    currency: 'ZMW',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(context.parsed);
                }
                return label;
              }
            }
          }
        },
        cutout: '60%' // Doughnut hole size
      }
    });
  } catch (error) {
    console.error('Error rendering doughnut chart:', error);
  }
};

watch(() => props.categories, () => {
  renderChart();
}, { deep: true });

// Initial render needs slight delay to ensure canvas is mounted within ClientOnly
onMounted(() => {
  setTimeout(renderChart, 100);
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
});
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
