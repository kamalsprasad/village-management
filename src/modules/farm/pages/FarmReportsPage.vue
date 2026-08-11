<!--
  FarmReportsPage.vue

  Story 3.9: Farm Crop Performance Report.
  Story 3.10: Yield Analysis tab — season comparison, plot benchmarks, export.
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Farm Reports</h4>
        <p class="text-grey-7 q-mb-none">Crop profitability & performance analysis</p>
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

    <!-- Tabs -->
    <q-tabs
      v-model="activeTab"
      dense
      align="left"
      class="q-mb-md text-grey"
      active-color="primary"
      indicator-color="primary"
    >
      <q-tab name="performance" icon="bar_chart" label="Crop Performance" />
      <q-tab name="yield" icon="show_chart" label="Yield Analysis" />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated keep-alive>
      <!-- ================================================================
           TAB 1: Crop Performance (Story 3.9 — verbatim)
           ================================================================ -->
      <q-tab-panel name="performance" class="q-pa-none">
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
              <div class="col-12 col-sm-6 col-md-3">
                <q-select
                  v-model="selectedCrops"
                  dense
                  outlined
                  label="Specific Crops"
                  :options="cropSelectOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  multiple
                  clearable
                  use-chips
                />
              </div>
              <div class="col-12 col-sm-3 col-md-2">
                <q-toggle
                  v-model="includeFailedPlantings"
                  label="Include failed"
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

          <!-- Named summary highlight cards -->
          <div v-if="cropData.length" class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-4">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Most Profitable Crop</div>
                  <div class="text-subtitle1 text-weight-bold text-positive">
                    {{ highlights.mostProfitable?.cropName || '—' }}
                  </div>
                  <div class="text-caption">
                    {{
                      highlights.mostProfitable
                        ? 'ZMW ' + fmt(highlights.mostProfitable.netProfit)
                        : ''
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-4">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Highest Yield Crop</div>
                  <div class="text-subtitle1 text-weight-bold text-primary">
                    {{ highlights.highestYield?.cropName || '—' }}
                  </div>
                  <div class="text-caption">
                    {{
                      highlights.highestYield
                        ? highlights.highestYield.avgYieldPerHectare + ' kg/ha'
                        : ''
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-4">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Best ROI Crop</div>
                  <div class="text-subtitle1 text-weight-bold text-teal">
                    {{ highlights.bestROI?.cropName || '—' }}
                  </div>
                  <div class="text-caption">
                    {{
                      highlights.bestROI?.roiPercent != null
                        ? highlights.bestROI.roiPercent + '%'
                        : ''
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- No data state -->
          <div v-if="!cropData.length" class="text-center text-grey q-pa-xl">
            <q-icon name="bar_chart" size="3em" class="q-mb-md" />
            <div class="text-h6">No data for selected filters</div>
            <div class="text-caption">
              Try broadening the date range or changing crop type filter.
            </div>
          </div>

          <template v-else>
            <!-- Chart -->
            <q-card class="q-mb-md">
              <q-card-section>
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-subtitle1 text-weight-medium">Net Profit by Crop (Top 5)</div>
                </div>
                <div :style="{ position: 'relative', height: chartHeight + 'px' }">
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
                :row-class="
                  (row) =>
                    row.netProfit > 0
                      ? 'bg-green-1'
                      : row.netProfit < -0.005
                        ? 'bg-red-1'
                        : 'bg-yellow-1'
                "
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
      </q-tab-panel>

      <!-- ================================================================
           TAB 2: Yield Analysis (Story 3.10)
           ================================================================ -->
      <q-tab-panel name="yield" class="q-pa-none">
        <!-- Yield Filters -->
        <q-card class="q-mb-md">
          <q-card-section class="q-pb-sm">
            <div class="row q-col-gutter-sm items-end">
              <div class="col-12 col-sm-4 col-md-3">
                <q-select
                  v-model="yieldFilterSeason"
                  dense
                  outlined
                  label="Season"
                  :options="yieldSeasonOptions"
                  clearable
                />
              </div>
              <div class="col-12 col-sm-4 col-md-3">
                <q-select
                  v-model="yieldFilterCropType"
                  dense
                  outlined
                  label="Crop Type"
                  :options="cropTypeOptions"
                  clearable
                />
              </div>
              <div class="col-12 col-sm-4 col-md-3">
                <q-select
                  v-model="yieldFilterPlots"
                  dense
                  outlined
                  label="Plots"
                  :options="plotSelectOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  multiple
                  clearable
                  use-chips
                />
              </div>
              <div class="col-12 col-sm-4 col-md-3">
                <q-select
                  v-model="yieldFilterCrops"
                  dense
                  outlined
                  label="Specific Crops"
                  :options="cropSelectOptions"
                  option-value="value"
                  option-label="label"
                  emit-value
                  map-options
                  multiple
                  clearable
                  use-chips
                />
              </div>
              <div class="col-auto">
                <q-btn
                  color="primary"
                  icon="search"
                  label="Run"
                  @click="runYieldReport"
                  :loading="isYieldLoading"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Yield Loading -->
        <div v-if="isYieldLoading" class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
          <span class="q-ml-md text-grey">Computing yield data…</span>
        </div>

        <template v-else>
          <!-- Yield KPI Row -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6 col-md-3">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Season Rows</div>
                  <div class="text-h6 text-weight-bold">{{ seasonData.length }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-6 col-md-3">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Total Plantings</div>
                  <div class="text-h6 text-weight-bold">
                    {{ seasonData.reduce((s, r) => s + r.totalPlantings, 0) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-6 col-md-3">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Total Harvest (kg)</div>
                  <div class="text-h6 text-weight-bold text-positive">
                    {{
                      seasonData
                        .reduce((s, r) => s + r.totalHarvestKg, 0)
                        .toLocaleString('en-US', { maximumFractionDigits: 0 })
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-6 col-md-3">
              <q-card flat bordered>
                <q-card-section class="q-pa-md">
                  <div class="text-caption text-grey">Best Avg Yield/ha</div>
                  <div class="text-h6 text-weight-bold text-primary">
                    {{
                      seasonData.length
                        ? Math.max(...seasonData.map((r) => r.avgYieldPerHectare || 0)) + ' kg/ha'
                        : '—'
                    }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div v-if="underperformingCount > 0" class="q-mb-md">
            <q-banner dense class="bg-negative text-white rounded-borders">
              <q-icon name="warning" class="q-mr-sm" />
              {{ underperformingCount }} planting{{ underperformingCount > 1 ? 's' : '' }}
              underperforming (&lt; 50% typical yield)
            </q-banner>
          </div>

          <div v-if="!seasonData.length" class="text-center text-grey q-pa-xl">
            <q-icon name="show_chart" size="3em" class="q-mb-md" />
            <div class="text-h6">No yield data for selected filters</div>
            <div class="text-caption">Complete a planting and record a harvest to see results.</div>
          </div>

          <template v-else>
            <!-- Season Comparison Table -->
            <q-card class="q-mb-md">
              <q-card-section class="q-pb-none">
                <div class="row items-center justify-between">
                  <div class="text-subtitle1 text-weight-medium">Season × Crop Comparison</div>
                  <div class="row q-gutter-sm">
                    <q-btn
                      outline
                      size="sm"
                      color="primary"
                      icon="download"
                      label="CSV"
                      :loading="isYieldExportingCSV"
                      @click="handleYieldExportCSV"
                    />
                    <q-btn
                      outline
                      size="sm"
                      color="primary"
                      icon="picture_as_pdf"
                      label="PDF"
                      :loading="isYieldExportingPDF"
                      @click="handleYieldExportPDF"
                    />
                  </div>
                </div>
              </q-card-section>
              <q-table
                :rows="seasonData"
                :columns="seasonColumns"
                row-key="key"
                flat
                dense
                :rows-per-page-options="[10, 25, 0]"
                class="q-mt-sm"
              >
                <template #body-cell-vsTypicalPct="{ value }">
                  <q-td class="text-right">
                    <template v-if="value !== null">
                      <q-badge
                        :color="value >= 90 ? 'positive' : value >= 50 ? 'warning' : 'negative'"
                        outline
                      >
                        {{
                          value >= 90
                            ? 'On Target'
                            : value >= 50
                              ? 'Below Average'
                              : 'Underperforming'
                        }}
                        {{ value }}%
                      </q-badge>
                    </template>
                    <span v-else class="text-grey">—</span>
                  </q-td>
                </template>
              </q-table>
            </q-card>

            <!-- Plot Benchmarks Table -->
            <q-card>
              <q-card-section class="q-pb-none">
                <div class="text-subtitle1 text-weight-medium">Plot Yield Benchmarks</div>
              </q-card-section>
              <q-table
                :rows="benchmarkData"
                :columns="benchmarkColumns"
                row-key="plotId"
                flat
                dense
                :rows-per-page-options="[0]"
                hide-pagination
                class="q-mt-sm"
              >
                <template #body-cell-trend="{ value }">
                  <q-td class="text-center">
                    <q-icon
                      :name="
                        value === 'up'
                          ? 'trending_up'
                          : value === 'down'
                            ? 'trending_down'
                            : value === 'stable'
                              ? 'trending_flat'
                              : 'remove'
                      "
                      :color="value === 'up' ? 'positive' : value === 'down' ? 'negative' : 'grey'"
                      size="sm"
                    />
                    <q-tooltip>{{ trendLabel(value) }}</q-tooltip>
                  </q-td>
                </template>
              </q-table>
            </q-card>
          </template>
        </template>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useQuasar } from 'quasar';
import { exportFarmReportToPDF, exportToCSV } from 'src/services/ReportExportService.js';

const farmStore = useFarmStore();
const $q = useQuasar();
const route = useRoute();

// Story 3.10: active tab (supports ?tab=yield deep-link from PlotDetailPage)
const activeTab = ref(route.query.tab === 'yield' ? 'yield' : 'performance');

// Story 3.10: Yield tab state
const isYieldLoading = ref(false);
const isYieldExportingCSV = ref(false);
const isYieldExportingPDF = ref(false);
const yieldFilterSeason = ref(null);
const yieldFilterCropType = ref(null);
const yieldFilterPlots = ref([]);
const yieldFilterCrops = ref([]);
const seasonData = ref([]);
const benchmarkData = ref([]);
const underperformingCount = ref(0);

const isLoading = ref(true);
const isExportingCSV = ref(false);
const isExportingPDF = ref(false);

const dateFrom = ref('');
const dateTo = ref('');
const selectedCropType = ref(null);
const includeFailedPlantings = ref(true);

const cropTypeOptions = ['Annual', 'Perennial'];
const selectedCrops = ref([]);

const cropSelectOptions = computed(() =>
  farmStore.crops.map((c) => ({ label: c.crop_name, value: c.$id })),
);

const plotSelectOptions = computed(() =>
  farmStore.plots.map((p) => ({ label: p.name, value: p.$id })),
);

// Derive unique season labels from all planting yields
const yieldSeasonOptions = computed(() => {
  const all = farmStore.computeAllPlantingYields();
  return [...new Set(all.map((r) => r.season))].sort();
});

const cropData = ref([]);

// Chart.js shallowRef pattern (same as FinanceReportsPage)
const chartCanvas = ref(null);
const chartInstance = shallowRef(null);

const chartHeight = computed(() => {
  const count = Math.min(cropData.value.length, 5);
  return Math.max(200, count * 55 + 40);
});

// --------------------------------------------------------------------------
// Story 3.10: Yield Analysis column config
// --------------------------------------------------------------------------
const seasonColumns = [
  { name: 'season', label: 'Season', field: 'season', align: 'left', sortable: true },
  { name: 'cropName', label: 'Crop', field: 'cropName', align: 'left', sortable: true },
  {
    name: 'plotCount',
    label: 'Plots',
    field: 'plotCount',
    align: 'right',
    sortable: true,
  },
  {
    name: 'totalPlantings',
    label: 'Plantings',
    field: 'totalPlantings',
    align: 'right',
    sortable: true,
  },
  {
    name: 'totalHarvestKg',
    label: 'Total Yield (kg)',
    field: 'totalHarvestKg',
    align: 'right',
    sortable: true,
    format: (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }),
  },
  {
    name: 'totalHectares',
    label: 'Hectares',
    field: 'totalHectares',
    align: 'right',
    sortable: true,
    format: (v) => Number(v).toFixed(2),
  },
  {
    name: 'avgYieldPerHectare',
    label: 'Avg Yield/ha',
    field: 'avgYieldPerHectare',
    align: 'right',
    sortable: true,
    format: (v) => (v != null ? v : '—'),
  },
  {
    name: 'typicalYield',
    label: 'Typical (kg/ha)',
    field: 'typicalYield',
    align: 'right',
    format: (v) => v || '—',
  },
  {
    name: 'vsTypicalPct',
    label: 'vs Typical',
    field: 'vsTypicalPct',
    align: 'right',
    sortable: true,
  },
  {
    name: 'bestPlotName',
    label: 'Best Plot',
    field: 'bestPlotName',
    align: 'left',
    format: (v) => v || '—',
  },
  {
    name: 'worstPlotName',
    label: 'Worst Plot',
    field: 'worstPlotName',
    align: 'left',
    format: (v) => v || '—',
  },
];

const benchmarkColumns = [
  { name: 'plotName', label: 'Plot', field: 'plotName', align: 'left', sortable: true },
  {
    name: 'plantingsCount',
    label: 'Plantings',
    field: 'plantingsCount',
    align: 'right',
    sortable: true,
  },
  {
    name: 'avgYieldPerHectare',
    label: 'Avg Yield/ha',
    field: 'avgYieldPerHectare',
    align: 'right',
    sortable: true,
    format: (v) => (v ? v + ' kg/ha' : '—'),
  },
  {
    name: 'bestCropName',
    label: 'Best Crop',
    field: 'bestCropName',
    align: 'left',
    format: (v) => v || '—',
  },
  {
    name: 'bestSeasonLabel',
    label: 'Best Season',
    field: 'bestSeasonLabel',
    align: 'left',
    format: (v) => v || '—',
  },
  { name: 'trend', label: 'Trend', field: 'trend', align: 'center' },
];

function trendLabel(v) {
  return v === 'up'
    ? 'Improving'
    : v === 'down'
      ? 'Declining'
      : v === 'stable'
        ? 'Stable'
        : 'Insufficient data';
}

// --------------------------------------------------------------------------
// Story 3.10: Yield data loading
// --------------------------------------------------------------------------
async function runYieldReport() {
  isYieldLoading.value = true;
  await farmStore.ensureYieldDataLoaded();
  seasonData.value = farmStore.computeSeasonComparison({
    season: yieldFilterSeason.value || undefined,
    cropType: yieldFilterCropType.value || undefined,
    plotIds: yieldFilterPlots.value.length ? yieldFilterPlots.value : undefined,
    cropIds: yieldFilterCrops.value.length ? yieldFilterCrops.value : undefined,
  });
  benchmarkData.value = farmStore.computePlotYieldBenchmarks();
  isYieldLoading.value = false;
}

async function handleYieldExportCSV() {
  isYieldExportingCSV.value = true;
  try {
    const rows = seasonData.value.map((r) => ({
      Season: r.season,
      Crop: r.cropName,
      Plantings: r.totalPlantings,
      'Total Yield (kg)': r.totalHarvestKg,
      Hectares: r.totalHectares,
      'Avg Yield/ha': r.avgYieldPerHectare ?? '',
      'Typical (kg/ha)': r.typicalYield ?? '',
      'vs Typical (%)': r.vsTypicalPct ?? '',
      'Best Plot': r.bestPlotName ?? '',
    }));
    exportToCSV(rows, `farm-yield-analysis-${new Date().toISOString().split('T')[0]}`);
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Export failed: ' + err.message, position: 'top' });
  } finally {
    isYieldExportingCSV.value = false;
  }
}

async function handleYieldExportPDF() {
  isYieldExportingPDF.value = true;
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Farm Yield Analysis Report', 14, 16);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.autoTable({
      startY: 28,
      head: [
        [
          'Season',
          'Crop',
          'Plantings',
          'Total Yield (kg)',
          'Avg Yield/ha',
          'Typical (kg/ha)',
          'vs Typical %',
        ],
      ],
      body: seasonData.value.map((r) => [
        r.season,
        r.cropName,
        r.totalPlantings,
        Number(r.totalHarvestKg).toLocaleString('en-US', { maximumFractionDigits: 0 }),
        r.avgYieldPerHectare ?? '—',
        r.typicalYield ?? '—',
        r.vsTypicalPct != null ? r.vsTypicalPct + '%' : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 150, 136] },
    });
    doc.save(`farm-yield-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    $q.notify({ type: 'negative', message: 'PDF export failed: ' + err.message, position: 'top' });
  } finally {
    isYieldExportingPDF.value = false;
  }
}

// --------------------------------------------------------------------------
// Table column config (Crop Performance — Story 3.9)
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

const highlights = computed(() => {
  if (!cropData.value.length) return {};
  const sorted = [...cropData.value];
  const mostProfitable = [...sorted].sort((a, b) => b.netProfit - a.netProfit)[0];
  const highestYield = [...sorted].sort(
    (a, b) => (b.avgYieldPerHectare || 0) - (a.avgYieldPerHectare || 0),
  )[0];
  const bestROI = [...sorted]
    .filter((r) => r.roiPercent != null)
    .sort((a, b) => parseFloat(b.roiPercent) - parseFloat(a.roiPercent))[0];
  return { mostProfitable, highestYield, bestROI };
});

// --------------------------------------------------------------------------
// Data loading
// --------------------------------------------------------------------------
async function runReport() {
  isLoading.value = true;
  await farmStore.ensureProfitabilityDataLoaded();

  // AC6: if dateFrom is set but dateTo is not, default dateTo to today
  const effectiveDateTo =
    dateTo.value || (dateFrom.value ? new Date().toISOString().split('T')[0] : undefined);

  cropData.value = farmStore.computeCropPerformance({
    dateFrom: dateFrom.value || undefined,
    dateTo: effectiveDateTo,
    cropType: selectedCropType.value || undefined,
    cropIds: selectedCrops.value.length ? selectedCrops.value : undefined,
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

  // Show top 5 by absolute profit for readability
  const chartItems = [...cropData.value]
    .sort((a, b) => Math.abs(b.netProfit) - Math.abs(a.netProfit))
    .slice(0, 5)
    .sort((a, b) => b.netProfit - a.netProfit); // descending profit within top 5

  const labels = chartItems.map((c) => c.cropName || 'Unknown');
  const profits = chartItems.map((c) => c.netProfit);

  chartInstance.value = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Net Profit (ZMW)',
          data: profits,
          backgroundColor: profits.map((p) =>
            p >= 0 ? 'rgba(46, 175, 80, 0.75)' : 'rgba(239, 83, 80, 0.75)',
          ),
          borderColor: profits.map((p) => (p >= 0 ? '#2e7d32' : '#c62828')),
          borderWidth: 1,
          barThickness: 28,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw);
              const prefix = val >= 0 ? '+' : '';
              return ` ${prefix}ZMW ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: {
            callback: (v) =>
              'ZMW ' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 }),
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { weight: '600', size: 13 },
            color: '#424242',
          },
          border: { display: false },
        },
      },
      layout: {
        padding: { left: 8, right: 16, top: 8, bottom: 8 },
      },
    },
    plugins: [
      {
        id: 'dataLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
              const value = dataset.data[index];
              const text =
                'ZMW ' +
                Number(value).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
              ctx.fillStyle = value >= 0 ? '#1b5e20' : '#b71c1c';
              ctx.font = 'bold 12px sans-serif';
              ctx.textAlign = value >= 0 ? 'left' : 'right';
              ctx.textBaseline = 'middle';
              const xOffset = value >= 0 ? 6 : -6;
              ctx.fillText(text, bar.x + xOffset, bar.y);
            });
          });
        },
      },
    ],
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

onMounted(async () => {
  runReport();
  // Pre-load yield data so tab switch is instant
  await farmStore.ensureYieldDataLoaded();
  seasonData.value = farmStore.computeSeasonComparison();
  benchmarkData.value = farmStore.computePlotYieldBenchmarks();
  // Pre-compute underperforming count from all plantings
  const allYields = farmStore.computeAllPlantingYields();
  underperformingCount.value = allYields.filter(
    (r) => r.vsTypicalPct !== null && r.vsTypicalPct < 50,
  ).length;
  // If deep-linked to yield tab, mark load complete
  if (activeTab.value === 'yield') isYieldLoading.value = false;
});

onBeforeUnmount(() => {
  chartInstance.value?.destroy();
  chartInstance.value = null;
});
</script>
