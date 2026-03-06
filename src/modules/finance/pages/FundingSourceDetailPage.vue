<template>
  <q-page padding>
    <!-- Back Button & Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat round icon="arrow_back" @click="$router.back()" />
      <div class="col">
        <h4 class="q-my-none q-ml-sm">Funding Source Details</h4>
      </div>
      <q-btn
        color="primary"
        icon="picture_as_pdf"
        label="Generate Report"
        @click="generateReport"
        :loading="generatingReport"
      />
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-end">
          <div class="col-12 col-md-4">
            <q-input
              v-model="reportDateFrom"
              label="Report Start Date"
              type="date"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="reportDateTo"
              label="Report End Date"
              type="date"
              outlined
              dense
              clearable
            />
          </div>
          <div class="col-12 col-md-4 text-right">
            <q-btn flat color="primary" label="Clear Dates" @click="clearReportDateRange" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading State -->
    <template v-if="loading">
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-md-4">
          <q-skeleton type="rect" height="200px" />
        </div>
        <div class="col-12 col-md-4">
          <q-skeleton type="rect" height="200px" />
        </div>
        <div class="col-12 col-md-4">
          <q-skeleton type="rect" height="200px" />
        </div>
      </div>
      <q-skeleton type="rect" height="400px" />
    </template>

    <!-- Content -->
    <template v-else-if="fundingSource">
      <!-- Metrics Cards -->
      <div class="row q-col-gutter-md q-mb-lg">
        <!-- Source Info Card -->
        <div class="col-12 col-md-4">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-h6 q-mb-sm">
                {{ fundingSource.name }}
                <q-badge
                  :color="getStatusColor(fundingSource.status)"
                  :label="fundingSource.status"
                  class="q-ml-sm"
                />
              </div>
              <div class="text-caption text-grey-7 q-mb-md">
                <q-badge
                  outline
                  :color="getTypeColor(fundingSource.type)"
                  :label="fundingSource.type"
                />
                <span v-if="fundingSource.date_received" class="q-ml-sm">
                  Received: {{ formatDate(fundingSource.date_received) }}
                </span>
              </div>
              <div v-if="fundingSource.restrictions" class="text-body2 text-grey-8">
                <q-icon name="info" size="xs" class="q-mr-xs" />
                <strong>Restrictions:</strong> {{ fundingSource.restrictions }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Balance Card -->
        <div class="col-12 col-md-4">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-overline text-grey-7">Current Balance</div>
              <div class="text-h4 q-mb-sm" :class="getBalanceClass(fundingSource)">
                {{ formatCurrency(fundingSource.current_balance) }}
              </div>
              <q-linear-progress
                :value="utilizationRatio"
                :color="getProgressColor(utilizationRatio)"
                size="12px"
                rounded
                class="q-mb-sm"
              />
              <div class="text-caption text-grey-7">
                {{ utilizationPercent }}% of
                {{ formatCurrency(fundingSource.total_received) }} remaining
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Utilization Card -->
        <div class="col-12 col-md-4">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-overline text-grey-7">Funds Utilized</div>
              <div class="text-h4 text-negative q-mb-sm">
                {{ formatCurrency(fundsUtilized) }}
              </div>
              <div class="text-caption text-grey-7">
                Across {{ transactionCount }} transaction(s)
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">
                <span class="text-positive">{{ formatCurrency(totalIncome) }}</span> income |
                <span class="text-negative">{{ formatCurrency(totalExpenses) }}</span> expenses
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Transactions Table -->
      <q-card flat bordered>
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="col">
              <div class="text-h6">
                <q-icon name="receipt_long" class="q-mr-sm" />
                Linked Transactions
              </div>
            </div>
            <div class="col-auto">
              <q-btn
                flat
                dense
                icon="refresh"
                label="Refresh"
                @click="loadTransactions"
                :loading="loadingTransactions"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!loadingTransactions && transactions.length === 0"
            class="text-center text-grey-6 q-pa-xl"
          >
            <q-icon name="receipt_long" size="4rem" class="q-mb-md" />
            <div class="text-h6">No transactions linked to this funding source</div>
            <div class="text-body2 q-mt-sm">
              When you record income or expenses linked to this funding source, they will appear
              here.
            </div>
          </div>

          <!-- Transactions Table -->
          <q-table
            v-else
            :rows="transactions"
            :columns="transactionColumns"
            row-key="$id"
            flat
            bordered
            :loading="loadingTransactions"
            :pagination="{ rowsPerPage: 10 }"
          >
            <!-- Type Column -->
            <template #body-cell-type="props">
              <q-td :props="props">
                <q-badge
                  :color="props.row.type === 'income' ? 'positive' : 'negative'"
                  :label="props.row.type"
                />
              </q-td>
            </template>

            <!-- Amount Column -->
            <template #body-cell-amount="props">
              <q-td :props="props">
                <div :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                  {{ props.row.type === 'income' ? '+' : '-' }}
                  {{ formatCurrency(props.row.amount_funded) }}
                </div>
                <div
                  v-if="props.row.amount_funded < props.row.amount_needed"
                  class="text-caption text-warning"
                >
                  of {{ formatCurrency(props.row.amount_needed) }}
                </div>
              </q-td>
            </template>

            <!-- Date Column -->
            <template #body-cell-date="props">
              <q-td :props="props">
                {{ formatDate(props.row.date) }}
              </q-td>
            </template>

            <!-- Status Column -->
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="getTransactionStatusColor(props.row.status)"
                  :label="props.row.status"
                />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </template>

    <!-- Not Found State -->
    <template v-else>
      <div class="text-center text-grey-6 q-pa-xl">
        <q-icon name="error_outline" size="4rem" class="q-mb-md" />
        <div class="text-h5">Funding Source Not Found</div>
        <div class="text-body1 q-mt-sm">
          The funding source you're looking for doesn't exist or has been deleted.
        </div>
        <q-btn
          color="primary"
          label="Back to Finance"
          @click="$router.push('/finance')"
          class="q-mt-md"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { format } from 'date-fns';
import { useFinanceStore } from '../stores/finance-store';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const route = useRoute();
const $q = useQuasar();
const financeStore = useFinanceStore();

// State
const loading = ref(true);
const loadingTransactions = ref(false);
const generatingReport = ref(false);
const fundingSource = ref(null);
const transactions = ref([]);
const reportDateFrom = ref('');
const reportDateTo = ref('');

// Computed
const utilizationRatio = computed(() => {
  if (!fundingSource.value?.total_received) return 0;
  return fundingSource.value.current_balance / fundingSource.value.total_received;
});

const utilizationPercent = computed(() => Math.round(utilizationRatio.value * 100));

const fundsUtilized = computed(() => {
  if (!fundingSource.value) return 0;
  return fundingSource.value.total_received - fundingSource.value.current_balance;
});

const transactionCount = computed(() => transactions.value.length);

const totalIncome = computed(() => {
  return transactions.value
    .filter((t) => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount_funded || 0), 0);
});

const totalExpenses = computed(() => {
  return transactions.value
    .filter((t) => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount_funded || 0), 0);
});

// Transaction table columns
const transactionColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'center' },
  { name: 'description', label: 'Description', field: 'description', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount_funded', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
];

// Load data on mount
onMounted(async () => {
  await loadFundingSource();
});

// Load funding source
async function loadFundingSource() {
  loading.value = true;
  try {
    const sourceId = route.params.id;
    await financeStore.fetchFundingSources(true);
    fundingSource.value = financeStore.getFundingSourceById(sourceId);

    if (fundingSource.value) {
      await loadTransactions();
    }
  } catch (error) {
    console.error('Error loading funding source:', error);
    $q.notify({ type: 'negative', message: 'Failed to load funding source' });
  } finally {
    loading.value = false;
  }
}

// Load transactions for this funding source
async function loadTransactions() {
  loadingTransactions.value = true;
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const sourceId = route.params.id;

    const response = await tables.listRows({
      databaseId: dbId,
      tableId: 'finance_transactions',
      queries: [
        Query.equal('funding_source_id', sourceId),
        Query.orderDesc('date'),
        Query.limit(100),
      ],
    });

    transactions.value = response.rows;
  } catch (error) {
    console.error('Error loading transactions:', error);
    $q.notify({ type: 'negative', message: 'Failed to load transactions' });
  } finally {
    loadingTransactions.value = false;
  }
}

// Generate report (placeholder - will integrate with DonorReportService)
async function generateReport() {
  generatingReport.value = true;
  try {
    // Import the service dynamically
    const { DonorReportService } = await import('src/services/DonorReportService');
    const service = new DonorReportService();
    await service.generateFundingSourceReport(fundingSource.value, transactions.value, {
      dateFrom: reportDateFrom.value ? new Date(reportDateFrom.value).toISOString() : null,
      dateTo: reportDateTo.value
        ? new Date(`${reportDateTo.value}T23:59:59.999`).toISOString()
        : null,
      generatedAt: new Date().toISOString(),
    });
    $q.notify({ type: 'positive', message: 'Report generated successfully' });
  } catch (error) {
    console.error('Error generating report:', error);
    $q.notify({
      type: 'negative',
      message: error.message || 'Failed to generate report.',
    });
  } finally {
    generatingReport.value = false;
  }
}

function clearReportDateRange() {
  reportDateFrom.value = '';
  reportDateTo.value = '';
}

// Helper functions
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return format(new Date(dateStr), 'MMM d, yyyy');
}

function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'positive';
    case 'inactive':
      return 'grey';
    case 'depleted':
      return 'negative';
    default:
      return 'grey';
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'grant':
      return 'primary';
    case 'donation':
      return 'secondary';
    case 'income':
      return 'positive';
    case 'loan':
      return 'warning';
    default:
      return 'grey';
  }
}

function getBalanceClass(source) {
  if (!source.total_received || source.total_received === 0) return '';
  const ratio = source.current_balance / source.total_received;
  if (ratio > 0.5) return 'text-positive';
  if (ratio > 0.2) return 'text-warning';
  return 'text-negative';
}

function getProgressColor(ratio) {
  if (ratio > 0.5) return 'positive';
  if (ratio > 0.2) return 'warning';
  return 'negative';
}

function getTransactionStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'negative';
    default:
      return 'grey';
  }
}
</script>
