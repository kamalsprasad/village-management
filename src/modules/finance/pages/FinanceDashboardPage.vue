<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 q-my-none">Financial Dashboard</h1>
        <div class="text-caption text-grey">
          Overview of village finances, funding, and assets
          <span v-if="dashboardData.summary.lastUpdated" class="q-ml-sm">
            (Updated: {{ formatReportDate(dashboardData.summary.lastUpdated) }})
          </span>
        </div>
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

    <!-- Empty State for Restricted Users -->
    <q-card v-if="isRestricted && dashboardData.recentTransactions.length === 0 && !isLoading" class="q-mb-md bg-grey-1">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="visibility_off" size="4rem" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-8">No Data Available in Your Modules</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          You only have access to view data for: {{ allowedModules.join(', ') }}.
          There are currently no financial records for these areas.
        </div>
      </q-card-section>
    </q-card>

    <!-- Main Grid -->
    <div class="row q-col-gutter-md">
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
          :loading="isLoading" 
        />
      </div>
      <div class="col-12 col-md-6 col-lg-4">
        <top-expense-categories-widget 
          :categories="dashboardData.topExpenseCategories" 
          :loading="isLoading" 
        />
      </div>

      <!-- Bottom Row: Lists & Overviews -->
      <div class="col-12 col-md-6 col-lg-4">
        <recent-transactions-widget 
          :transactions="dashboardData.recentTransactions" 
          :loading="isLoading"
          :read-only="isReadOnly"
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
          <active-loans-widget 
            :summary="dashboardData.loansSummary" 
            :loading="isLoading" 
          />
          <low-stock-alerts-widget 
            :alerts="dashboardData.inventoryAlerts" 
            :loading="isLoading" 
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useDashboardData } from '../composables/useDashboardData';
import { useAuthStore } from 'src/stores/auth-store';
import { formatReportDate } from 'src/services/ReportService';
// We will import ExportService when we implement it
// import { exportDashboardToPDF } from 'src/services/ReportExportService';

// Widget imports
import FinancialSummaryWidget from '../components/FinancialSummaryWidget.vue';
import RecentTransactionsWidget from '../components/RecentTransactionsWidget.vue';
import FundingSourcesWidget from '../components/FundingSourcesWidget.vue';
import ActiveLoansWidget from '../components/ActiveLoansWidget.vue';
import LowStockAlertsWidget from '../components/LowStockAlertsWidget.vue';
import TopExpenseCategoriesWidget from '../components/TopExpenseCategoriesWidget.vue';
import IncomeExpenseTrendWidget from '../components/IncomeExpenseTrendWidget.vue';

const $q = useQuasar();
const authStore = useAuthStore();
const { dashboardData, refresh, isLoading, error, isRestricted, allowedModules } = useDashboardData();

const isExporting = ref(false);

// Read-only check for Village Head
const isReadOnly = computed(() => {
  return authStore.userRoles?.some(r => r.name === 'Village Head') || false;
});

onMounted(() => {
  refresh();
});

const exportDashboard = async () => {
  isExporting.value = true;
  try {
    const { exportDashboardToPDF } = await import('src/services/ReportExportService');
    const villageName = 'Village Management System'; // Ideally from settingsStore
    const userName = authStore.user?.name || 'User';
    
    await exportDashboardToPDF(dashboardData.value, villageName, userName);
    
    $q.notify({
      type: 'positive',
      message: 'Dashboard exported successfully'
    });
  } catch (err) {
    console.error('Error exporting dashboard:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to export dashboard'
    });
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
