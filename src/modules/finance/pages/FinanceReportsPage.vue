<template>
  <q-page padding>
    <div>
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="text-h5 q-my-none">Financial Reports</h4>
          <p class="text-grey-7 q-mb-none">Generate and export standard financial reports</p>
        </div>
      </div>

      <!-- Report Type Selector -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="rt in reportTypes" :key="rt.id" class="col-12 col-sm-6 col-md-4 col-lg-2">
          <q-card
            flat
            bordered
            :class="[
              'cursor-pointer report-selector-card',
              selectedReportType === rt.id ? 'selected-report' : '',
            ]"
            @click="selectReport(rt.id)"
          >
            <q-card-section class="text-center q-pa-sm">
              <q-icon :name="rt.icon" :color="rt.color" size="28px" />
              <div class="text-subtitle2 q-mt-xs">{{ rt.title }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md items-end">
            <!-- Date From -->
            <div class="col-12 col-md-3">
              <q-input
                v-model="filters.dateFrom"
                label="From Date"
                type="date"
                outlined
                dense
                clearable
              />
            </div>
            <!-- Date To -->
            <div class="col-12 col-md-3">
              <q-input
                v-model="filters.dateTo"
                label="To Date"
                type="date"
                outlined
                dense
                clearable
              />
            </div>

            <!-- Category Filter (not for balance sheet) -->
            <div v-if="showCategoryFilter" class="col-12 col-md-3">
              <q-select
                v-model="filters.categoryId"
                :options="categoryOptions"
                outlined
                dense
                clearable
                label="Category"
                option-label="name"
                option-value="$id"
                emit-value
                map-options
              />
            </div>

            <!-- Funding Source Filter (donor report only) -->
            <div v-if="selectedReportType === 'donor-fund-usage'" class="col-12 col-md-3">
              <q-select
                v-model="filters.fundingSourceId"
                :options="fundingSourceOptions"
                outlined
                dense
                clearable
                label="Funding Source"
                option-label="name"
                option-value="$id"
                emit-value
                map-options
              />
            </div>

            <!-- Source Module Filter (if user has multi-module access) -->
            <div v-if="showModuleFilter" class="col-12 col-md-2">
              <q-select
                v-model="filters.sourceModule"
                :options="moduleOptions"
                outlined
                dense
                clearable
                label="Module"
                emit-value
                map-options
              />
            </div>

            <!-- Status Filter -->
            <div v-if="showStatusFilter" class="col-12 col-md-2">
              <q-select
                v-model="filters.status"
                :options="statusOptions"
                outlined
                dense
                clearable
                label="Status"
                emit-value
                map-options
              />
            </div>
          </div>

          <!-- Action Buttons Row -->
          <div class="row q-mt-md q-gutter-sm">
            <q-btn
              color="primary"
              icon="play_arrow"
              label="Generate Report"
              :loading="isGenerating"
              @click="generateReport"
            />
            <q-btn
              outline
              color="primary"
              icon="clear"
              label="Reset Filters"
              @click="resetFilters"
            />
            <q-space />
            <!-- Export buttons (visible only when report is generated) -->
            <template v-if="reportData">
              <q-btn
                outline
                color="secondary"
                icon="picture_as_pdf"
                label="PDF"
                :loading="isExporting"
                @click="exportPDF"
              />
              <q-btn outline color="secondary" icon="table_chart" label="CSV" @click="exportCSV" />
              <q-btn outline color="secondary" icon="print" label="Print" @click="handlePrint" />
            </template>
          </div>

          <!-- Date validation error -->
          <div v-if="dateError" class="text-negative text-caption q-mt-sm">
            {{ dateError }}
          </div>
        </q-card-section>
      </q-card>

      <!-- Loading State -->
      <div v-if="isGenerating" class="q-pa-xl text-center">
        <q-spinner-dots size="40px" color="primary" />
        <div class="text-grey q-mt-sm">Generating report...</div>
      </div>

      <!-- Error State -->
      <q-banner v-else-if="reportError" class="bg-negative text-white q-mb-md" rounded>
        <template #avatar>
          <q-icon name="error" />
        </template>
        {{ reportError }}
      </q-banner>

      <!-- Empty State (no report generated yet) -->
      <div v-else-if="!reportData" class="q-pa-xl text-center text-grey print-hide">
        <q-icon name="assessment" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">Select a report and click Generate</div>
        <div class="text-caption">Choose a report type above, set your filters, then generate</div>
      </div>

      <!-- ============================================================ -->
      <!-- REPORT OUTPUT SECTION -->
      <!-- ============================================================ -->
      <div v-else class="report-output">
        <!-- Report Title (for print) -->
        <div class="print-only text-center q-mb-md">
          <h5 class="q-my-none">{{ currentReportConfig.title }}</h5>
          <div class="text-caption">
            {{ filters.dateFrom || 'Start' }} to {{ filters.dateTo || 'Present' }}
          </div>
        </div>

        <!-- ==================== INCOME SUMMARY ==================== -->
        <template v-if="selectedReportType === 'income-summary'">
          <!-- KPI Cards -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Income</div>
                  <div class="text-h5 text-positive">
                    {{ fmtCurrency(reportData.totalIncome) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Transactions</div>
                  <div class="text-h5">{{ reportData.transactionCount }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Categories</div>
                  <div class="text-h5">{{ reportData.byCategory.length }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Chart + Category Breakdown -->
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-7">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Income Trend</div>
                  <div v-if="isClient" style="height: 280px">
                    <canvas ref="incomeTrendChart"></canvas>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-5">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">By Category</div>
                  <div v-if="isClient" style="height: 280px">
                    <canvas ref="incomeCategoryChart"></canvas>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Detail Tables -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Category Breakdown</div>
              <q-table
                :rows="reportData.byCategory"
                :columns="groupedColumns"
                row-key="key"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Module Breakdown</div>
              <q-table
                :rows="reportData.byModule"
                :columns="groupedColumns"
                row-key="key"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              />
            </q-card-section>
          </q-card>
        </template>

        <!-- ==================== EXPENSE SUMMARY ==================== -->
        <template v-else-if="selectedReportType === 'expense-summary'">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Expenses</div>
                  <div class="text-h5 text-negative">
                    {{ fmtCurrency(reportData.totalExpenses) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Transactions</div>
                  <div class="text-h5">{{ reportData.transactionCount }}</div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Funding Sources</div>
                  <div class="text-h5">{{ reportData.byFundingSource.length }}</div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-7">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Expense Trend</div>
                  <div v-if="isClient" style="height: 280px">
                    <canvas ref="expenseTrendChart"></canvas>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-5">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">By Category</div>
                  <div v-if="isClient" style="height: 280px">
                    <canvas ref="expenseCategoryChart"></canvas>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Category Breakdown</div>
              <q-table
                :rows="reportData.byCategory"
                :columns="groupedColumns"
                row-key="key"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              />
            </q-card-section>
          </q-card>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Funding Source Breakdown</div>
              <q-table
                :rows="reportData.byFundingSource"
                :columns="groupedColumns"
                row-key="key"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              />
            </q-card-section>
          </q-card>
        </template>

        <!-- ==================== PROFIT & LOSS ==================== -->
        <template v-else-if="selectedReportType === 'profit-loss'">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Income</div>
                  <div class="text-h5 text-positive">
                    {{ fmtCurrency(reportData.totalIncome) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Expenses</div>
                  <div class="text-h5 text-negative">
                    {{ fmtCurrency(reportData.totalExpenses) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">
                    {{ reportData.isProfit ? 'Net Surplus' : 'Net Deficit' }}
                  </div>
                  <div
                    class="text-h5"
                    :class="reportData.isProfit ? 'text-positive' : 'text-negative'"
                  >
                    {{ fmtCurrency(Math.abs(reportData.netResult)) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Income vs Expenses</div>
                  <div v-if="isClient" style="height: 300px">
                    <canvas ref="plComparisonChart"></canvas>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Income by Category</div>
                  <q-table
                    :rows="reportData.incomeByCategory"
                    :columns="groupedColumns"
                    row-key="key"
                    flat
                    dense
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                  />
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Expenses by Category</div>
                  <q-table
                    :rows="reportData.expenseByCategory"
                    :columns="groupedColumns"
                    row-key="key"
                    flat
                    dense
                    hide-pagination
                    :pagination="{ rowsPerPage: 0 }"
                  />
                </q-card-section>
              </q-card>
            </div>
          </div>
        </template>

        <!-- ==================== CASH FLOW ==================== -->
        <template v-else-if="selectedReportType === 'cash-flow'">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Inflows</div>
                  <div class="text-h5 text-positive">
                    {{ fmtCurrency(reportData.totalInflow) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Outflows</div>
                  <div class="text-h5 text-negative">
                    {{ fmtCurrency(reportData.totalOutflow) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Net Cash Movement</div>
                  <div
                    class="text-h5"
                    :class="reportData.netCashMovement >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    {{ fmtCurrency(reportData.netCashMovement) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Cash Flow Over Time</div>
              <div v-if="isClient" style="height: 300px">
                <canvas ref="cashFlowChart"></canvas>
              </div>
            </q-card-section>
          </q-card>

          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Monthly Detail</div>
              <q-table
                :rows="reportData.byMonth"
                :columns="cashFlowColumns"
                row-key="monthKey"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              />
            </q-card-section>
          </q-card>
        </template>

        <!-- ==================== BALANCE SHEET ==================== -->
        <template v-else-if="selectedReportType === 'balance-sheet'">
          <!-- MVP Disclaimer Banner -->
          <q-banner class="bg-warning text-dark q-mb-md" rounded>
            <template #avatar>
              <q-icon name="info" />
            </template>
            {{ reportData.disclaimer }}
          </q-banner>

          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Assets</div>
                  <div class="text-h5 text-positive">
                    {{ fmtCurrency(reportData.assets.total) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Total Liabilities</div>
                  <div class="text-h5 text-negative">
                    {{ fmtCurrency(reportData.liabilities.total) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered>
                <q-card-section class="text-center">
                  <div class="text-caption text-grey">Net Position</div>
                  <div
                    class="text-h5"
                    :class="reportData.netPosition >= 0 ? 'text-positive' : 'text-negative'"
                  >
                    {{ fmtCurrency(reportData.netPosition) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <!-- Assets: Funding Sources -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Assets - Funding Source Balances</div>
              <q-table
                :rows="reportData.assets.fundingSources"
                :columns="fundingAssetColumns"
                row-key="name"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              >
                <template #bottom-row>
                  <q-tr class="text-weight-bold">
                    <q-td>Total</q-td>
                    <q-td></q-td>
                    <q-td align="right">{{
                      fmtCurrency(reportData.assets.totalFundingBalances)
                    }}</q-td>
                  </q-tr>
                </template>
                <template #no-data>
                  <div class="text-grey text-center q-pa-sm">No active funding sources</div>
                </template>
              </q-table>
            </q-card-section>
          </q-card>

          <!-- Assets: Inventory -->
          <q-card v-if="reportData.assets.inventory.length > 0" flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Assets - Inventory (Estimated Value)</div>
              <q-table
                :rows="reportData.assets.inventory"
                :columns="inventoryAssetColumns"
                row-key="name"
                flat
                dense
                hide-pagination
                :pagination="{ rowsPerPage: 0 }"
              >
                <template #bottom-row>
                  <q-tr class="text-weight-bold">
                    <q-td>Total</q-td>
                    <q-td></q-td>
                    <q-td></q-td>
                    <q-td align="right">{{
                      fmtCurrency(reportData.assets.totalInventoryValue)
                    }}</q-td>
                  </q-tr>
                </template>
              </q-table>
            </q-card-section>
          </q-card>

          <!-- Balance Sheet Chart -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 q-mb-sm">Asset Composition</div>
              <div v-if="isClient" style="height: 280px">
                <canvas ref="balanceSheetChart"></canvas>
              </div>
            </q-card-section>
          </q-card>
        </template>

        <!-- ==================== DONOR FUND USAGE ==================== -->
        <template v-else-if="selectedReportType === 'donor-fund-usage'">
          <template v-if="reportData.error">
            <q-banner class="bg-warning text-dark q-mb-md" rounded>
              <template #avatar>
                <q-icon name="warning" />
              </template>
              {{ reportData.error }}. Please select a funding source and generate again.
            </q-banner>
          </template>
          <template v-else>
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-3">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-caption text-grey">Total Received</div>
                    <div class="text-h6 text-positive">
                      {{ fmtCurrency(reportData.totalAllocated) }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-caption text-grey">Total Spent</div>
                    <div class="text-h6 text-negative">
                      {{ fmtCurrency(reportData.totalSpent) }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-caption text-grey">Remaining</div>
                    <div class="text-h6">
                      {{ fmtCurrency(reportData.remainingBalance) }}
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card flat bordered>
                  <q-card-section class="text-center">
                    <div class="text-caption text-grey">Utilization</div>
                    <div class="text-h6">{{ reportData.utilizationRate }}%</div>
                    <q-linear-progress
                      :value="reportData.utilizationRate / 100"
                      color="primary"
                      class="q-mt-xs"
                    />
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <!-- Funding Source Info -->
            <q-card v-if="reportData.fundingSource" flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Funding Source Details</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-auto">
                    <q-chip dense>{{ reportData.fundingSource.type }}</q-chip>
                  </div>
                  <div class="col-auto">
                    <q-chip dense>Status: {{ reportData.fundingSource.status }}</q-chip>
                  </div>
                  <div v-if="reportData.fundingSource.restrictions !== 'None'" class="col-auto">
                    <q-chip dense color="warning" text-color="dark">
                      Restrictions: {{ reportData.fundingSource.restrictions }}
                    </q-chip>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-6">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle2 q-mb-sm">Spending by Category</div>
                    <div v-if="isClient" style="height: 260px">
                      <canvas ref="donorCategoryChart"></canvas>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-6">
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle2 q-mb-sm">Spending Over Time</div>
                    <div v-if="isClient" style="height: 260px">
                      <canvas ref="donorTrendChart"></canvas>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Category Breakdown</div>
                <q-table
                  :rows="reportData.byCategory"
                  :columns="groupedColumns"
                  row-key="key"
                  flat
                  dense
                  hide-pagination
                  :pagination="{ rowsPerPage: 0 }"
                />
              </q-card-section>
            </q-card>
          </template>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useRoute } from 'vue-router';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { useFinanceStore } from '../stores/finance-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import {
  REPORT_TYPES,
  formatCurrency,
  generateIncomeSummary,
  generateExpenseSummary,
  generateProfitLoss,
  generateCashFlow,
  generateBalanceSheet,
  generateDonorFundUsage,
  flattenTransactionsForExport,
  flattenGroupedForExport,
} from 'src/services/ReportService';
import { exportToCSV, exportToPDF, printReport } from 'src/services/ReportExportService';
import { filterByModuleScope, getAvailableModuleOptions } from 'src/utils/report-scope';

// Chart.js is loaded lazily (see ensureChart()) so it isn't part of this page's
// own static bundle -- it becomes a shared on-demand chunk instead.
let ChartCtor = null;
async function ensureChart() {
  if (!ChartCtor) {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    ChartCtor = Chart;
  }
  return ChartCtor;
}

const $q = useQuasar();
const financeStore = useFinanceStore();
const inventoryStore = useInventoryStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const route = useRoute();

const isClient = ref(false);

// ============================================================
// State
// ============================================================

const reportTypes = REPORT_TYPES;
const selectedReportType = ref('income-summary');
const reportData = ref(null);
const reportError = ref(null);
const isGenerating = ref(false);
const isExporting = ref(false);

const filters = ref({
  dateFrom: null,
  dateTo: null,
  categoryId: null,
  fundingSourceId: null,
  sourceModule: null,
  status: null,
});

// Chart instances for cleanup - shallowRef prevents Vue 3 from deep-proxying Chart.js instances
const chartInstances = shallowRef({});

// Chart canvas refs
const incomeTrendChart = ref(null);
const incomeCategoryChart = ref(null);
const expenseTrendChart = ref(null);
const expenseCategoryChart = ref(null);
const plComparisonChart = ref(null);
const cashFlowChart = ref(null);
const balanceSheetChart = ref(null);
const donorCategoryChart = ref(null);
const donorTrendChart = ref(null);

// ============================================================
// Computed
// ============================================================

const currentReportConfig = computed(() => {
  return reportTypes.find((r) => r.id === selectedReportType.value) || reportTypes[0];
});

const categoryOptions = computed(() => {
  return financeStore.categories;
});

const fundingSourceOptions = computed(() => {
  return financeStore.fundingSources;
});

const moduleOptions = computed(() => {
  const available = getAvailableModuleOptions(authStore.userRoles);
  return available.map((m) => ({ label: m, value: m }));
});

const showModuleFilter = computed(() => {
  // Show module filter if user has access to multiple modules
  const available = getAvailableModuleOptions(authStore.userRoles);
  return available.length > 1;
});

const showCategoryFilter = computed(() => {
  return selectedReportType.value !== 'balance-sheet' && selectedReportType.value !== 'cash-flow';
});

const showStatusFilter = computed(() => {
  return selectedReportType.value !== 'balance-sheet';
});

const statusOptions = [
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
];

const dateError = computed(() => {
  if (filters.value.dateFrom && filters.value.dateTo) {
    if (filters.value.dateFrom > filters.value.dateTo) {
      return 'From date must be before To date';
    }
  }
  return null;
});

// ============================================================
// Table Column Definitions
// ============================================================

const groupedColumns = [
  { name: 'label', label: 'Name', align: 'left', field: 'label', sortable: true },
  {
    name: 'total',
    label: 'Total',
    align: 'right',
    field: 'total',
    sortable: true,
    format: (val) => formatCurrency(val),
  },
  { name: 'count', label: 'Count', align: 'center', field: 'count', sortable: true },
];

const cashFlowColumns = [
  { name: 'label', label: 'Month', align: 'left', field: 'label' },
  {
    name: 'inflow',
    label: 'Inflows',
    align: 'right',
    field: 'inflow',
    format: (val) => formatCurrency(val),
  },
  {
    name: 'outflow',
    label: 'Outflows',
    align: 'right',
    field: 'outflow',
    format: (val) => formatCurrency(val),
  },
  {
    name: 'net',
    label: 'Net',
    align: 'right',
    field: 'net',
    format: (val) => formatCurrency(val),
  },
  {
    name: 'cumulative',
    label: 'Cumulative',
    align: 'right',
    field: 'cumulative',
    format: (val) => formatCurrency(val),
  },
];

const fundingAssetColumns = [
  { name: 'name', label: 'Funding Source', align: 'left', field: 'name' },
  { name: 'type', label: 'Type', align: 'left', field: 'type' },
  {
    name: 'value',
    label: 'Balance',
    align: 'right',
    field: 'value',
    format: (val) => formatCurrency(val),
  },
];

const inventoryAssetColumns = [
  { name: 'name', label: 'Item', align: 'left', field: 'name' },
  {
    name: 'quantity',
    label: 'Qty',
    align: 'center',
    field: (row) => `${row.quantity} ${row.unit || ''}`,
  },
  {
    name: 'unitCost',
    label: 'Unit Cost',
    align: 'right',
    field: 'unitCost',
    format: (val) => formatCurrency(val),
  },
  {
    name: 'value',
    label: 'Est. Value',
    align: 'right',
    field: 'value',
    format: (val) => formatCurrency(val),
  },
];

// ============================================================
// Methods
// ============================================================

const fmtCurrency = formatCurrency;

function selectReport(reportId) {
  selectedReportType.value = reportId;
  // Don't clear report data on selection change - user may want to compare
}

async function applyRouteReportSelection() {
  const reportId = route.query.report;
  if (!reportId || typeof reportId !== 'string') {
    return;
  }

  const exists = reportTypes.some((report) => report.id === reportId);
  if (!exists) {
    return;
  }

  selectedReportType.value = reportId;
  await generateReport();
}

function resetFilters() {
  filters.value = {
    dateFrom: null,
    dateTo: null,
    categoryId: null,
    fundingSourceId: null,
    sourceModule: null,
    status: null,
  };
  reportData.value = null;
  reportError.value = null;
  destroyAllCharts();
}

async function generateReport() {
  if (dateError.value) return;

  isGenerating.value = true;
  reportError.value = null;
  reportData.value = null;
  destroyAllCharts();

  try {
    // Ensure lookup data is loaded
    await Promise.all([
      financeStore.categoriesLoaded ? Promise.resolve() : financeStore.fetchCategories(),
      financeStore.fundingSourcesLoaded ? Promise.resolve() : financeStore.fetchFundingSources(),
    ]);

    const reportType = selectedReportType.value;

    if (reportType === 'balance-sheet') {
      // Balance sheet doesn't need transactions, just current state
      await generateBalanceSheetReport();
    } else {
      // All other reports need transactions
      await generateTransactionReport(reportType);
    }

    // Render charts after data is set and DOM updates
    await nextTick();
    if (isClient.value) {
      renderCharts();
    }
  } catch (error) {
    console.error('Error generating report:', error);
    reportError.value = 'Failed to generate report. Please try again.';
  } finally {
    isGenerating.value = false;
  }
}

async function generateTransactionReport(reportType) {
  // Build fetch options
  const fetchOptions = {};
  if (filters.value.dateFrom) {
    fetchOptions.dateFrom = startOfDay(parseISO(filters.value.dateFrom)).toISOString();
  }
  if (filters.value.dateTo) {
    fetchOptions.dateTo = endOfDay(parseISO(filters.value.dateTo)).toISOString();
  }
  // Default to completed unless user explicitly selects a status
  if (filters.value.status) {
    fetchOptions.status = filters.value.status;
  } else {
    fetchOptions.status = ['completed'];
  }
  if (reportType === 'donor-fund-usage' && filters.value.fundingSourceId) {
    fetchOptions.fundingSourceId = filters.value.fundingSourceId;
  }

  const result = await financeStore.fetchTransactionsForReport(fetchOptions);
  if (!result.success) {
    reportError.value = result.error || 'Failed to fetch transactions';
    return;
  }

  let transactions = result.data || [];

  // Apply module scope filtering (RBAC)
  transactions = filterByModuleScope(transactions, authStore.userRoles);

  // Apply client-side source module filter if user selected one
  if (filters.value.sourceModule) {
    transactions = transactions.filter((t) => t.source_module === filters.value.sourceModule);
  }

  // Apply client-side category filter
  if (filters.value.categoryId) {
    transactions = transactions.filter((t) => t.category_id === filters.value.categoryId);
  }

  const reportOptions = {
    categories: financeStore.categories,
    fundingSources: financeStore.fundingSources,
    dateFrom: filters.value.dateFrom,
    dateTo: filters.value.dateTo,
  };

  if (reportType === 'income-summary') {
    reportData.value = generateIncomeSummary(transactions, reportOptions);
  } else if (reportType === 'expense-summary') {
    reportData.value = generateExpenseSummary(transactions, reportOptions);
  } else if (reportType === 'profit-loss') {
    reportData.value = generateProfitLoss(transactions, reportOptions);
  } else if (reportType === 'cash-flow') {
    reportData.value = generateCashFlow(transactions, reportOptions);
  } else if (reportType === 'donor-fund-usage') {
    const selectedFS = financeStore.fundingSources.find(
      (fs) => fs.$id === filters.value.fundingSourceId,
    );
    reportData.value = generateDonorFundUsage(transactions, selectedFS, reportOptions);
  }

  if (
    reportData.value &&
    !reportData.value.error &&
    reportType !== 'donor-fund-usage' &&
    transactions.length === 0
  ) {
    // Allow empty reports to render with zero values
  }
}

async function generateBalanceSheetReport() {
  // Fetch inventory items for the balance sheet
  let inventoryItems = [];
  try {
    // Fetch all items directly bypassing pagination limits
    const result = await inventoryStore.fetchAllItems();
    if (result.success) {
      inventoryItems = result.data || [];
    } else {
      inventoryItems = inventoryStore.items || [];
    }
  } catch {
    // Inventory fetch failure is non-fatal for balance sheet
    console.warn('Could not fetch inventory items for balance sheet');
  }

  reportData.value = generateBalanceSheet({
    fundingSources: financeStore.fundingSources,
    inventoryItems,
  });
}

// ============================================================
// Chart Rendering
// ============================================================

function destroyAllCharts() {
  for (const key of Object.keys(chartInstances.value)) {
    if (chartInstances.value[key]) {
      chartInstances.value[key].destroy();
    }
  }
  chartInstances.value = {};
}

async function createChart(canvasRef, config, key) {
  if (!canvasRef) return;
  // Destroy existing chart on this canvas
  if (chartInstances.value[key]) {
    chartInstances.value[key].destroy();
  }
  const Chart = await ensureChart();
  chartInstances.value[key] = new Chart(canvasRef.getContext('2d'), {
    ...config,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      ...config.options,
    },
  });
}

function renderCharts() {
  const data = reportData.value;
  if (!data) return;

  const type = selectedReportType.value;

  if (type === 'income-summary') {
    renderBarChart(incomeTrendChart.value, data.byMonth, 'Income', '#21BA45', 'incomeTrend');
    renderPieChart(incomeCategoryChart.value, data.byCategory, 'incomeCat');
  } else if (type === 'expense-summary') {
    renderBarChart(expenseTrendChart.value, data.byMonth, 'Expenses', '#C10015', 'expenseTrend');
    renderPieChart(expenseCategoryChart.value, data.byCategory, 'expenseCat');
  } else if (type === 'profit-loss') {
    renderPLChart(plComparisonChart.value, data);
  } else if (type === 'cash-flow') {
    renderCashFlowChart(cashFlowChart.value, data);
  } else if (type === 'balance-sheet') {
    renderBalanceSheetPieChart(balanceSheetChart.value, data);
  } else if (type === 'donor-fund-usage' && !data.error) {
    renderPieChart(donorCategoryChart.value, data.byCategory, 'donorCat');
    renderBarChart(donorTrendChart.value, data.byMonth, 'Spending', '#C10015', 'donorTrend');
  }
}

const chartColors = [
  '#1976D2',
  '#21BA45',
  '#F2C037',
  '#C10015',
  '#9C27B0',
  '#FF9800',
  '#00BCD4',
  '#795548',
  '#607D8B',
  '#E91E63',
];

function renderBarChart(canvas, monthData, label, color, key) {
  if (!canvas || !monthData) return;
  createChart(
    canvas,
    {
      type: 'bar',
      data: {
        labels: monthData.map((m) => m.label),
        datasets: [
          {
            label,
            data: monthData.map((m) => m.total),
            backgroundColor: color + '99',
            borderColor: color,
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    },
    key,
  );
}

function renderPieChart(canvas, groupedData, key) {
  if (!canvas || !groupedData || groupedData.length === 0) return;
  const top = groupedData.slice(0, 10);
  createChart(
    canvas,
    {
      type: 'doughnut',
      data: {
        labels: top.map((g) => g.label),
        datasets: [
          {
            data: top.map((g) => g.total),
            backgroundColor: chartColors.slice(0, top.length),
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
        },
      },
    },
    key,
  );
}

function renderPLChart(canvas, data) {
  if (!canvas) return;
  const months = data.incomeByMonth.map((m) => m.label);
  createChart(
    canvas,
    {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Income',
            data: data.incomeByMonth.map((m) => m.total),
            backgroundColor: '#21BA4599',
            borderColor: '#21BA45',
            borderWidth: 1,
          },
          {
            label: 'Expenses',
            data: data.expenseByMonth.map((m) => m.total),
            backgroundColor: '#C1001599',
            borderColor: '#C10015',
            borderWidth: 1,
          },
        ],
      },
    },
    'plComparison',
  );
}

function renderCashFlowChart(canvas, data) {
  if (!canvas) return;
  createChart(
    canvas,
    {
      type: 'line',
      data: {
        labels: data.byMonth.map((m) => m.label),
        datasets: [
          {
            label: 'Inflows',
            data: data.byMonth.map((m) => m.inflow),
            borderColor: '#21BA45',
            backgroundColor: '#21BA4520',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Outflows',
            data: data.byMonth.map((m) => m.outflow),
            borderColor: '#C10015',
            backgroundColor: '#C1001520',
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Cumulative',
            data: data.byMonth.map((m) => m.cumulative),
            borderColor: '#1976D2',
            backgroundColor: '#1976D220',
            fill: true,
            tension: 0.3,
            borderDash: [5, 5],
          },
        ],
      },
    },
    'cashFlow',
  );
}

function renderBalanceSheetPieChart(canvas, data) {
  if (!canvas) return;
  const segments = [];
  if (data.assets.totalFundingBalances > 0) {
    segments.push({ label: 'Funding Balances', value: data.assets.totalFundingBalances });
  }
  if (data.assets.totalInventoryValue > 0) {
    segments.push({ label: 'Inventory (Est.)', value: data.assets.totalInventoryValue });
  }
  if (segments.length === 0) {
    segments.push({ label: 'No Assets', value: 0 });
  }
  createChart(
    canvas,
    {
      type: 'doughnut',
      data: {
        labels: segments.map((s) => s.label),
        datasets: [
          {
            data: segments.map((s) => s.value),
            backgroundColor: chartColors.slice(0, segments.length),
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        },
      },
    },
    'balanceSheet',
  );
}

// ============================================================
// Export Actions
// ============================================================

async function exportPDF() {
  if (!reportData.value) return;
  isExporting.value = true;
  try {
    await exportToPDF(reportData.value, {
      title: currentReportConfig.value.title,
      dateFrom: filters.value.dateFrom,
      dateTo: filters.value.dateTo,
      villageName: settingsStore.villageName,
      categories: financeStore.categories,
      fundingSources: financeStore.fundingSources,
    });
  } catch (error) {
    console.error('PDF export failed:', error);
    $q.notify({ type: 'negative', message: 'PDF export failed. ' + error.message });
  } finally {
    isExporting.value = false;
  }
}

function exportCSV() {
  if (!reportData.value) return;

  const data = reportData.value;
  const type = selectedReportType.value;
  const filename = `${type}_${filters.value.dateFrom || 'all'}_${filters.value.dateTo || 'all'}`;

  if (type === 'income-summary' || type === 'expense-summary') {
    if (data.transactions && data.transactions.length > 0) {
      const rows = flattenTransactionsForExport(data.transactions, {
        categories: financeStore.categories,
        fundingSources: financeStore.fundingSources,
      });
      exportToCSV(rows, filename);
    } else {
      $q.notify({ type: 'warning', message: 'No data to export' });
    }
  } else if (type === 'profit-loss') {
    // Export summary rows
    const rows = [
      ...flattenGroupedForExport(data.incomeByCategory, 'Income Category'),
      { 'Income Category': '--- EXPENSES ---', Total: '', 'Transaction Count': '' },
      ...data.expenseByCategory.map((g) => ({
        'Income Category': g.label,
        Total: g.total,
        'Transaction Count': g.count,
      })),
      { 'Income Category': '--- SUMMARY ---', Total: '', 'Transaction Count': '' },
      { 'Income Category': 'Total Income', Total: data.totalIncome, 'Transaction Count': '' },
      { 'Income Category': 'Total Expenses', Total: data.totalExpenses, 'Transaction Count': '' },
      { 'Income Category': 'Net Result', Total: data.netResult, 'Transaction Count': '' },
    ];
    exportToCSV(rows, filename);
  } else if (type === 'cash-flow') {
    const rows = data.byMonth.map((m) => ({
      Month: m.label,
      Inflows: m.inflow,
      Outflows: m.outflow,
      Net: m.net,
      Cumulative: m.cumulative,
    }));
    exportToCSV(rows, filename);
  } else if (type === 'balance-sheet') {
    const rows = [
      ...data.assets.fundingSources.map((a) => ({
        Section: 'Assets - Funding',
        Name: a.name,
        Value: a.value,
      })),
      ...data.assets.inventory.map((a) => ({
        Section: 'Assets - Inventory',
        Name: a.name,
        Value: a.value,
      })),
      { Section: 'Total Assets', Name: '', Value: data.assets.total },
      { Section: 'Total Liabilities', Name: '', Value: data.liabilities.total },
      { Section: 'Net Position', Name: '', Value: data.netPosition },
    ];
    exportToCSV(rows, filename);
  } else if (type === 'donor-fund-usage') {
    if (data.transactions && data.transactions.length > 0) {
      const rows = flattenTransactionsForExport(data.transactions, {
        categories: financeStore.categories,
        fundingSources: financeStore.fundingSources,
      });
      exportToCSV(rows, filename);
    } else {
      $q.notify({ type: 'warning', message: 'No data to export' });
    }
  }
}

function handlePrint() {
  printReport();
}

// ============================================================
// Lifecycle
// ============================================================

onMounted(async () => {
  isClient.value = true;

  // Pre-load lookup data
  if (!financeStore.categoriesLoaded) {
    financeStore.fetchCategories();
  }
  if (!financeStore.fundingSourcesLoaded) {
    financeStore.fetchFundingSources();
  }

  await applyRouteReportSelection();
});

onUnmounted(() => {
  destroyAllCharts();
});

// Re-render charts when report type changes and data exists
watch(selectedReportType, async () => {
  if (reportData.value) {
    destroyAllCharts();
    await nextTick();
    if (isClient.value) {
      renderCharts();
    }
  }
});

watch(
  () => route.query.report,
  async () => {
    await applyRouteReportSelection();
  },
);
</script>

<style scoped>
.report-selector-card {
  transition: all 0.2s ease;
}
.report-selector-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.selected-report {
  border-color: var(--q-primary) !important;
  border-width: 2px;
  background-color: rgba(25, 118, 210, 0.05);
}

/* Print styles */
@media print {
  .print-hide {
    display: none !important;
  }
  .print-only {
    display: block !important;
  }
  .q-drawer,
  .q-header,
  .q-footer,
  .report-selector-card,
  .q-btn {
    display: none !important;
  }
  .q-page {
    padding: 0 !important;
  }
}

.print-only {
  display: none;
}
</style>
