<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Income vs Expenses Trend</div>
        <div class="text-caption text-grey">Last 6 Months</div>
      </div>
      <q-btn flat color="primary" label="View Full Report" to="/finance/reports" />
    </q-card-section>

    <q-card-section class="q-pt-none" style="min-height: 250px">
      <div class="row justify-center items-center h-full">
        <ClientOnly>
          <div style="width: 100%; height: 250px">
            <canvas ref="chartRef"></canvas>
          </div>
        </ClientOnly>
      </div>
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import ClientOnly from 'src/components/layout/ClientOnly.vue';
import { format, parseISO, startOfMonth, subMonths, eachMonthOfInterval } from 'date-fns';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
});

// Since we're using ReportService logic, we'll pull from the finance store directly for this chart
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';
const financeStore = useFinanceStore();

const chartRef = ref(null);
const chartInstance = shallowRef(null);

const generateTrendData = () => {
  const transactions = financeStore.transactions || [];

  // Last 6 months
  const end = new Date();
  const start = startOfMonth(subMonths(end, 5));

  const monthKeys = eachMonthOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM'));

  const incomeData = new Array(6).fill(0);
  const expenseData = new Array(6).fill(0);

  transactions.forEach((t) => {
    if (t.status === 'cancelled') return;

    try {
      const tMonth = format(parseISO(t.date), 'yyyy-MM');
      const idx = monthKeys.indexOf(tMonth);

      if (idx !== -1) {
        if (t.type === 'income') {
          incomeData[idx] += t.amount_funded || 0;
        } else if (t.type === 'expense') {
          expenseData[idx] += t.amount_funded || 0;
        }
      }
    } catch {
      // Ignore invalid dates
    }
  });

  return {
    labels: monthKeys.map((k) => format(parseISO(k + '-01'), 'MMM yyyy')),
    incomeData,
    expenseData,
  };
};

const renderChart = async () => {
  if (!chartRef.value) return;

  const data = generateTrendData();

  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    if (chartInstance.value) {
      chartInstance.value.destroy();
    }

    const ctx = chartRef.value.getContext('2d');

    chartInstance.value = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Income',
            data: data.incomeData,
            borderColor: '#21BA45', // positive
            backgroundColor: 'rgba(33, 186, 69, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Expenses',
            data: data.expenseData,
            borderColor: '#C10015', // negative
            backgroundColor: 'rgba(193, 0, 21, 0.05)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              boxWidth: 8,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += new Intl.NumberFormat('en-ZM', {
                    style: 'currency',
                    currency: 'ZMW',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(context.parsed.y);
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return value >= 1000 ? value / 1000 + 'k' : value;
              },
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });
  } catch (error) {
    console.error('Error rendering trend chart:', error);
  }
};

watch(
  () => financeStore.transactions,
  () => {
    renderChart();
  },
  { deep: true },
);

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
