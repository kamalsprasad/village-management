<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Income vs Expenses Trend</div>
        <div class="text-caption text-grey">{{ periodLabel }}</div>
      </div>
      <div class="row items-center q-gutter-sm">
        <q-btn-toggle
          v-model="selectedPeriod"
          dense
          unelevated
          toggle-color="primary"
          :options="periodOptions"
        />
        <q-btn flat color="primary" label="View Full Report" @click="goToReport" />
      </div>
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
import { ref, watch, onMounted, onBeforeUnmount, shallowRef, computed } from 'vue';
import { useRouter } from 'vue-router';
import ClientOnly from 'src/components/layout/ClientOnly.vue';
import {
  format,
  parseISO,
  startOfMonth,
  subMonths,
  eachMonthOfInterval,
  startOfYear,
} from 'date-fns';

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();
const chartRef = ref(null);
const chartInstance = shallowRef(null);
const selectedPeriod = ref('6m');

const periodOptions = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '12M', value: '12m' },
  { label: 'YTD', value: 'ytd' },
];

const periodLabel = computed(() => {
  switch (selectedPeriod.value) {
    case '3m':
      return 'Last 3 Months';
    case '12m':
      return 'Last 12 Months';
    case 'ytd':
      return 'Year to Date';
    default:
      return 'Last 6 Months';
  }
});

const generateTrendData = () => {
  const transactions = props.transactions || [];

  const end = new Date();
  const monthWindow = {
    '3m': 2,
    '6m': 5,
    '12m': 11,
  };
  const start =
    selectedPeriod.value === 'ytd'
      ? startOfYear(end)
      : startOfMonth(subMonths(end, monthWindow[selectedPeriod.value] ?? 5));

  const monthKeys = eachMonthOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM'));

  const incomeData = new Array(monthKeys.length).fill(0);
  const expenseData = new Array(monthKeys.length).fill(0);

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
    netData: incomeData.map((income, index) => income - expenseData[index]),
  };
};

const goToReport = () => {
  router.push({
    path: '/finance/reports',
    query: {
      report: 'profit-loss',
    },
  });
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
          {
            label: 'Net Position',
            data: data.netData,
            borderColor: '#1976D2',
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            fill: false,
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
  () => [props.transactions, selectedPeriod.value],
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
