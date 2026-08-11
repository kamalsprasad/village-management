<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Financial Dashboard</h4>
        <p class="text-grey-7 q-mb-none">
          Overview of village finances, funding, and assets
          <span v-if="dashboardData.summary.lastUpdated" class="q-ml-sm">
            (Updated: {{ formatReportDate(dashboardData.summary.lastUpdated) }})
          </span>
        </p>
      </div>

      <div class="row q-gutter-sm items-center">
        <!-- Access Warning -->
        <q-chip v-if="isRestricted" color="warning" text-color="dark" icon="warning" size="sm">
          Module Restricted View
        </q-chip>

        <q-btn
          color="primary"
          outline
          icon="refresh"
          label="Refresh"
          :loading="isLoading"
          @click="refresh"
        />

        <q-btn
          v-if="!isReadOnly"
          color="primary"
          icon="download"
          label="Export Summary"
          @click="exportDashboard"
          :loading="isExporting"
        />
      </div>
    </div>

    <!-- Error State -->
    <q-banner v-if="error" class="bg-negative text-white q-mb-md" rounded>
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      Failed to load dashboard data: {{ error.message || error }}
      <template v-slot:action>
        <q-btn flat color="white" label="Retry" @click="refresh" />
      </template>
    </q-banner>

    <q-card
      v-else-if="!isLoading && !hasAnyDashboardData && !isRestricted"
      class="q-mb-md bg-grey-1"
    >
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="insights" size="4rem" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-8">No Financial Dashboard Data Yet</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          Start by recording income, expenses, funding sources, inventory, or loans to populate the
          dashboard.
        </div>
      </q-card-section>
    </q-card>

    <!-- Empty State for Restricted Users -->
    <q-card
      v-if="isRestricted && dashboardData.recentTransactions.length === 0 && !isLoading"
      class="q-mb-md bg-grey-1"
    >
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="visibility_off" size="4rem" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-8">No Data Available in Your Modules</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          You only have access to view data for: {{ allowedModules.join(', ') }}. There are
          currently no financial records for these areas.
        </div>
      </q-card-section>
    </q-card>

    <div v-if="isLoading && !hasAnyDashboardData" class="row q-col-gutter-md q-mb-md">
      <div class="col-12">
        <q-skeleton type="rect" height="180px" />
      </div>
      <div class="col-12 col-lg-8">
        <q-skeleton type="rect" height="320px" />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <q-skeleton type="rect" height="320px" />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <q-skeleton type="rect" height="320px" />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <q-skeleton type="rect" height="320px" />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <q-skeleton type="rect" height="150px" class="q-mb-md" />
        <q-skeleton type="rect" height="150px" />
      </div>
    </div>

    <!-- Main Grid -->
    <div v-else class="row q-col-gutter-md">
      <!-- Top Row: Financial Summary (Full width on tablet/mobile, 2/3 on desktop if we wanted, but let's make it full width) -->
      <div class="col-12">
        <financial-summary-widget
          :summary="dashboardData.summary"
          :funding-sources="dashboardData.fundingSources"
          :loading="isLoading"
        />
      </div>

      <!-- Middle Row: Charts -->
      <div class="col-12 col-lg-8">
        <income-expense-trend-widget
          :transactions="dashboardData.trendTransactions"
          :loading="isLoading"
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <top-expense-categories-widget
          :categories="dashboardData.topExpenseCategories"
          :transactions="dashboardData.expenseTransactions"
          :category-lookup="dashboardData.categoriesLookup"
          :loading="isLoading"
        />
      </div>

      <!-- Bottom Row: Lists & Overviews -->
      <div class="col-12 col-md-6 col-lg-4">
        <recent-transactions-widget
          :transactions="dashboardData.recentTransactions"
          :loading="isLoading"
          :read-only="isReadOnly"
          @saved="refresh"
        />
      </div>

      <div class="col-12 col-md-6 col-lg-4">
        <funding-sources-widget
          :sources="dashboardData.fundingSources"
          :loading="isLoading"
          :read-only="isReadOnly"
        />
      </div>

      <div class="col-12 col-md-6 col-lg-4">
        <div class="column q-gutter-y-md h-full">
          <active-loans-widget :summary="dashboardData.loansSummary" :loading="isLoading" />
          <low-stock-alerts-widget :alerts="dashboardData.inventoryAlerts" :loading="isLoading" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useDashboardData } from '../composables/useDashboardData';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { formatReportDate } from 'src/services/ReportService';

// Widget imports
import FinancialSummaryWidget from '../components/FinancialSummaryWidget.vue';
import RecentTransactionsWidget from '../components/RecentTransactionsWidget.vue';
import FundingSourcesWidget from '../components/FundingSourcesWidget.vue';
import ActiveLoansWidget from '../components/ActiveLoansWidget.vue';
import LowStockAlertsWidget from '../components/LowStockAlertsWidget.vue';
import TopExpenseCategoriesWidget from '../components/TopExpenseCategoriesWidget.vue';
import IncomeExpenseTrendWidget from '../components/IncomeExpenseTrendWidget.vue';

const errorHandler = useErrorHandler();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { dashboardData, refresh, isLoading, error, isRestricted, allowedModules } =
  useDashboardData();

const isExporting = ref(false);

// Read-only check for Village Head
const isReadOnly = computed(() => {
  return authStore.userRoles?.some((r) => r.name === 'Village Head') || false;
});

const hasAnyDashboardData = computed(() => {
  return (
    (dashboardData.value.recentTransactions?.length || 0) > 0 ||
    (dashboardData.value.fundingSources?.length || 0) > 0 ||
    (dashboardData.value.topExpenseCategories?.length || 0) > 0 ||
    (dashboardData.value.inventoryAlerts?.length || 0) > 0 ||
    (dashboardData.value.loansSummary?.activeCount || 0) > 0
  );
});

onMounted(() => {
  refresh();
});

const exportDashboard = async () => {
  isExporting.value = true;
  try {
    const { exportDashboardToPDF } = await import('src/services/ReportExportService');
    const villageName = settingsStore.villageName;
    const userName = authStore.user?.name || 'User';

    await exportDashboardToPDF(dashboardData.value, villageName, userName);

    errorHandler.notifySuccess('Dashboard exported successfully');
  } catch (err) {
    console.error('Error exporting dashboard:', err);
    errorHandler.notifyError('Failed to export dashboard');
  } finally {
    isExporting.value = false;
  }
};
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
