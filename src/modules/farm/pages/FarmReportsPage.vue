<!--
  FarmReportsPage.vue

  Story 3.9: Farm Crop Performance Report.
  Displays crop-level profitability table, bar chart (net profit by crop),
  and allows CSV/PDF export. Follows the FinanceReportsPage pattern.
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="bar_chart" class="q-mr-sm" />
          Farm Reports
        </div>
        <div class="text-caption text-grey">Crop profitability & performance analysis</div>
      </div>
      <q-btn
        flat
        dense
        icon="arrow_back"
        label="Farm"
        color="primary"
        @click="$router.push('/farm')"
      />
    </div>

    <!-- Filter Bar -->
    <q-card class="q-mb-md">
      <q-card-section class="q-pb-sm">
        <div class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-3 col-md-2">
            <q-input v-model="dateFrom" dense outlined label="From" type="date" clearable />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-input v-model="dateTo" dense outlined label="To" type="date" clearable />
          </div>
          <div class="col-12 col-sm-3 col-md-2">
            <q-select
              v-model="selectedCropType"
              dense
              outlined
              label="Crop Type"
              :options="cropTypeOptions"
              clearable
            />
          </div>
          <div class="col-12 col-sm-3 col-md-3">
            <q-toggle
              v-model="includeFailedPlantings"
              label="Include failed plantings"
              color="primary"
              dense
            />
          </div>
          <div class="col-auto">
            <q-btn
              color="primary"
              icon="search"
              label="Run"
              @click="runReport"
              :loading="isLoading"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <span class="q-ml-md text-grey">Computing profitability data…</span>
    </div>

    <template v-else>
      <!-- KPI Row -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-6 col-md-3">
          <q-card flat bordered>
            <q-card-section class="q-pa-md">
              <div class="text-caption text-grey">Total Revenue</div>
              <div class="text-h6 text-positive text-weight-bold">
                ZMW {{ fmt(summaryTotals.revenue) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered>
            <q-card-section class="q-pa-md">
              <div class="text-caption text-grey">Total Costs</div>
              <div class="text-h6 text-weight-bold">ZMW {{ fmt(summaryTotals.costs) }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered>
            <q-card-section class="q-pa-md">
              <div class="text-caption text-grey">Net Profit</div>
              <div
                class="text-h6 text-weight-bold"
                :class="summaryTotals.profit >= 0 ? 'text-positive' : 'text-negative'"
              >
                ZMW {{ fmt(summaryTotals.profit) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered>
            <q-card-section class="q-pa-md">
              <div class="text-caption text-grey">Overall ROI</div>
              <div
                class="text-h6 text-weight-bold"
                :class="summaryTotals.profit >= 0 ? 'text-positive' : 'text-negative'"
              >
                {{ summaryTotals.roi }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- No data state -->
      <div v-if="!cropData.length" class="text-center text-grey q-pa-xl">
        <q-icon name="bar_chart" size="3em" class="q-mb-md" />
        <div class="text-h6">No data for selected filters</div>
        <div class="text-caption">Try broadening the date range or changing crop type filter.</div>
      </div>

      <template v-else>
        <!-- Chart -->
        <q-card class="q-mb-md">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Net Profit by Crop</div>
            </div>
            <div style="position: relative; height: 280px">
              <canvas ref="chartCanvas"></canvas>
            </div>
          </q-card-section>
        </q-card>

        <!-- Export Buttons -->
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-auto">
            <q-btn
              outline
              color="primary"
              icon="download"
              label="Export CSV"
              :loading="isExportingCSV"
              @click="handleExportCSV"
            />
          </div>
          <div class="col-auto">
            <q-btn
              outline
              color="primary"
              icon="picture_as_pdf"
              label="Export PDF"
              :loading="isExportingPDF"
              @click="handleExportPDF"
            />
          </div>
        </div>

        <!-- Crop Performance Table -->
        <q-card>
          <q-card-section class="q-pb-none">
            <div class="text-subtitle1 text-weight-medium">Crop Performance Table</div>
          </q-card-section>
          <q-table
            :rows="cropData"
            :columns="tableColumns"
            row-key="cropId"
            flat
            dense
            :rows-per-page-options="[0]"
            hide-pagination
            class="q-mt-sm"
          >
            <template #body-cell-netProfit="slotProps">
              <q-td :class="slotProps.row.netProfit >= 0 ? 'text-positive' : 'text-negative'">
                ZMW {{ fmt(slotProps.row.netProfit) }}
              </q-td>
            </template>
            <template #body-cell-roiPercent="slotProps">
              <q-td
                :class="
                  slotProps.row.netProfit >= 0
                    ? 'text-positive text-weight-medium'
                    : 'text-negative text-weight-medium'
                "
              >
                {{ slotProps.row.roiPercent != null ? slotProps.row.roiPercent + '%' : '—' }}
              </q-td>
            </template>
            <template #body-cell-totalRevenue="slotProps">
              <q-td>ZMW {{ fmt(slotProps.row.totalRevenue) }}</q-td>
            </template>
            <template #body-cell-totalCost="slotProps">
              <q-td>ZMW {{ fmt(slotProps.row.totalCost) }}</q-td>
            </template>
            <template #body-cell-avgProfitPerPlanting="slotProps">
              <q-td>ZMW {{ fmt(slotProps.row.avgProfitPerPlanting) }}</q-td>
            </template>
          </q-table>
        </q-card>
      </template>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, shallowRef, onMounted, nextTick } from 'vue';
import { useFarmStore } from '../stores/farm-store';
import { useQuasar } from 'quasar';
import { exportFarmReportToPDF, exportToCSV } from 'src/services/ReportExportService.js';

const farmStore = useFarmStore();
const $q = useQuasar();

const isLoading = ref(true);
const isExportingCSV = ref(false);
const isExportingPDF = ref(false);

const dateFrom = ref('');
const dateTo = ref('');
const selectedCropType = ref(null);
const includeFailedPlantings = ref(true);

const cropTypeOptions = ['Annual', 'Perennial'];

const cropData = ref([]);

// Chart.js shallowRef pattern (same as FinanceReportsPage)
const chartCanvas = ref(null);
const chartInstance = shallowRef(null);

// --------------------------------------------------------------------------
// Table column config
// --------------------------------------------------------------------------
const tableColumns = [
  { name: 'cropName', label: 'Crop', field: 'cropName', align: 'left', sortable: true },
  { name: 'cropType', label: 'Type', field: 'cropType', align: 'left', sortable: true },
  {
    name: 'totalPlantings',
    label: 'Plantings',
    field: 'totalPlantings',
    align: 'right',
    sortable: true,
  },
  { name: 'completed', label: 'Done', field: 'completed', align: 'right', sortable: true },
  { name: 'failed', label: 'Failed', field: 'failed', align: 'right', sortable: true },
  {
    name: 'totalHarvestKg',
    label: 'Harvest (kg)',
    field: 'totalHarvestKg',
    align: 'right',
    sortable: true,
    format: (v) => Number(v).toFixed(1),
  },
  {
    name: 'totalRevenue',
    label: 'Revenue (ZMW)',
    field: 'totalRevenue',
    align: 'right',
    sortable: true,
  },
  { name: 'totalCost', label: 'Total Costs', field: 'totalCost', align: 'right', sortable: true },
  { name: 'netProfit', label: 'Net Profit', field: 'netProfit', align: 'right', sortable: true },
  { name: 'roiPercent', label: 'ROI %', field: 'roiPercent', align: 'right', sortable: true },
  {
    name: 'avgProfitPerPlanting',
    label: 'Avg Profit/Planting',
    field: 'avgProfitPerPlanting',
    align: 'right',
    sortable: true,
  },
  {
    name: 'avgYieldPerHectare',
    label: 'Yield/Ha (kg)',
    field: 'avgYieldPerHectare',
    align: 'right',
    sortable: true,
    format: (v) => (v != null ? v : '—'),
  },
  {
    name: 'successRate',
    label: 'Success Rate',
    field: 'successRate',
    align: 'right',
  },
];

// --------------------------------------------------------------------------
// Computed summary totals
// --------------------------------------------------------------------------
const summaryTotals = computed(() => {
  const revenue = cropData.value.reduce((s, r) => s + (r.totalRevenue || 0), 0);
  const costs = cropData.value.reduce((s, r) => s + (r.totalCost || 0), 0);
  const profit = revenue - costs;
  const roi = costs > 0 ? ((profit / costs) * 100).toFixed(1) + '%' : '—';
  return { revenue, costs, profit, roi };
});

// --------------------------------------------------------------------------
// Data loading
// --------------------------------------------------------------------------
async function runReport() {
  isLoading.value = true;
  await farmStore.ensureProfitabilityDataLoaded();

  cropData.value = farmStore.computeCropPerformance({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
    cropType: selectedCropType.value || undefined,
    includeFailedPlantings: includeFailedPlantings.value,
  });

  isLoading.value = false;
  await nextTick();
  renderChart();
}

// --------------------------------------------------------------------------
// Chart rendering (Chart.js shallowRef pattern)
// --------------------------------------------------------------------------
async function renderChart() {
  if (!chartCanvas.value || !cropData.value.length) return;

  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }

  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);

  const labels = cropData.value.map((c) => c.cropName);
  const profits = cropData.value.map((c) => c.netProfit);

  chartInstance.value = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Net Profit (ZMW)',
          data: profits,
          backgroundColor: profits.map((p) =>
            p >= 0 ? 'rgba(46, 125, 50, 0.7)' : 'rgba(198, 40, 40, 0.7)',
          ),
          borderColor: profits.map((p) => (p >= 0 ? '#2e7d32' : '#c62828')),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ZMW ${Number(ctx.raw).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => 'ZMW ' + Number(v).toLocaleString('en-US'),
          },
        },
      },
    },
  });
}

// --------------------------------------------------------------------------
// Export handlers
// --------------------------------------------------------------------------
async function handleExportCSV() {
  isExportingCSV.value = true;
  try {
    const rows = cropData.value.map((c) => ({
      Crop: c.cropName,
      Type: c.cropType,
      Plantings: c.totalPlantings,
      Completed: c.completed,
      Failed: c.failed,
      'Harvest (kg)': Number(c.totalHarvestKg).toFixed(1),
      'Revenue (ZMW)': Number(c.totalRevenue).toFixed(2),
      'Total Costs': Number(c.totalCost).toFixed(2),
      'Net Profit': Number(c.netProfit).toFixed(2),
      'ROI %': c.roiPercent != null ? c.roiPercent : '',
      'Avg Profit/Planting': Number(c.avgProfitPerPlanting).toFixed(2),
      'Yield/Ha (kg)': c.avgYieldPerHectare ?? '',
      'Success Rate': c.successRate,
    }));
    const dateStr = new Date().toISOString().split('T')[0];
    exportToCSV(rows, `farm-crop-performance-${dateStr}`);
  } catch (err) {
    $q.notify({ type: 'negative', message: 'CSV export failed: ' + err.message, position: 'top' });
  } finally {
    isExportingCSV.value = false;
  }
}

async function handleExportPDF() {
  isExportingPDF.value = true;
  try {
    const summaryStats = [
      { label: 'Total Revenue', value: 'ZMW ' + fmt(summaryTotals.value.revenue) },
      { label: 'Total Costs', value: 'ZMW ' + fmt(summaryTotals.value.costs) },
      { label: 'Net Profit', value: 'ZMW ' + fmt(summaryTotals.value.profit) },
      { label: 'Overall ROI', value: summaryTotals.value.roi },
    ];
    await exportFarmReportToPDF({
      cropData: cropData.value,
      summaryStats,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
    });
  } catch (err) {
    $q.notify({ type: 'negative', message: 'PDF export failed: ' + err.message, position: 'top' });
  } finally {
    isExportingPDF.value = false;
  }
}

function fmt(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

onMounted(() => {
  runReport();
});
</script>
