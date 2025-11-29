<template>
  <q-card flat bordered class="finance-summary-widget">
    <q-card-section>
      <div class="row items-center justify-between">
        <div class="text-h6">
          <q-icon name="account_balance_wallet" class="q-mr-sm" color="primary" />
          Finance Summary
        </div>
        <q-btn flat dense round icon="open_in_new" color="primary" size="sm" to="/finance">
          <q-tooltip>View All Transactions</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <q-card-section v-if="loading">
      <div class="row q-col-gutter-md">
        <div class="col-6">
          <q-skeleton type="rect" height="80px" />
        </div>
        <div class="col-6">
          <q-skeleton type="rect" height="80px" />
        </div>
      </div>
      <q-skeleton type="rect" height="120px" class="q-mt-md" />
    </q-card-section>

    <!-- Summary Content -->
    <q-card-section v-else-if="financeStore.summary.isLoaded">
      <!-- Income/Expense/Balance Cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <!-- Total Income -->
        <div class="col-4">
          <q-card flat bordered class="summary-card bg-positive-1">
            <q-card-section class="q-pa-sm text-center">
              <q-icon name="trending_up" color="positive" size="sm" />
              <div class="text-caption text-grey-7">Income</div>
              <div class="text-subtitle1 text-weight-bold text-positive">
                {{ formatCurrency(financeStore.summary.totalIncome) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Total Expenses -->
        <div class="col-4">
          <q-card flat bordered class="summary-card bg-negative-1">
            <q-card-section class="q-pa-sm text-center">
              <q-icon name="trending_down" color="negative" size="sm" />
              <div class="text-caption text-grey-7">Expenses</div>
              <div class="text-subtitle1 text-weight-bold text-negative">
                {{ formatCurrency(financeStore.summary.totalExpenses) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Net Balance -->
        <div class="col-4">
          <q-card flat bordered class="summary-card" :class="balanceCardClass">
            <q-card-section class="q-pa-sm text-center">
              <q-icon :name="balanceIcon" :color="balanceColor" size="sm" />
              <div class="text-caption text-grey-7">Balance</div>
              <div class="text-subtitle1 text-weight-bold" :class="balanceTextClass">
                {{ formatCurrency(financeStore.summary.netBalance) }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Top Expense Categories -->
      <div v-if="financeStore.summary.topExpenseCategories.length > 0">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Top Expense Categories</div>
        <q-list dense>
          <q-item
            v-for="(cat, index) in financeStore.summary.topExpenseCategories"
            :key="cat.category"
            class="q-pa-none"
          >
            <q-item-section avatar class="q-pr-sm" style="min-width: 24px">
              <q-badge :color="getCategoryColor(index)" :label="index + 1" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ cat.category }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-item-label class="text-weight-medium">
                {{ formatCurrency(cat.amount) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <!-- No Expenses Yet -->
      <div v-else class="text-center text-grey-6 q-pa-md">
        <q-icon name="receipt_long" size="2rem" class="q-mb-sm" />
        <div class="text-caption">No expenses recorded yet</div>
      </div>
    </q-card-section>

    <!-- Empty/Error State -->
    <q-card-section v-else class="text-center text-grey-6">
      <q-icon name="account_balance_wallet" size="3rem" class="q-mb-sm" />
      <div>Unable to load finance summary</div>
      <q-btn flat dense color="primary" label="Retry" class="q-mt-sm" @click="loadSummary" />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';

const financeStore = useFinanceStore();
const loading = ref(true);

// Computed properties for balance styling
const balanceColor = computed(() => {
  if (financeStore.summary.netBalance > 0) return 'positive';
  if (financeStore.summary.netBalance < 0) return 'negative';
  return 'grey';
});

const balanceIcon = computed(() => {
  if (financeStore.summary.netBalance > 0) return 'arrow_upward';
  if (financeStore.summary.netBalance < 0) return 'arrow_downward';
  return 'remove';
});

const balanceCardClass = computed(() => {
  if (financeStore.summary.netBalance > 0) return 'bg-positive-1';
  if (financeStore.summary.netBalance < 0) return 'bg-negative-1';
  return 'bg-grey-2';
});

const balanceTextClass = computed(() => {
  if (financeStore.summary.netBalance > 0) return 'text-positive';
  if (financeStore.summary.netBalance < 0) return 'text-negative';
  return 'text-grey-7';
});

// Format currency (ZMW)
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Get color for category ranking
function getCategoryColor(index) {
  const colors = ['red', 'orange', 'amber', 'blue-grey', 'grey'];
  return colors[index] || 'grey';
}

// Load summary data
async function loadSummary() {
  loading.value = true;
  await financeStore.fetchSummary();
  loading.value = false;
}

onMounted(() => {
  loadSummary();
});
</script>

<style scoped>
.finance-summary-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-card {
  transition: transform 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
}

.bg-positive-1 {
  background-color: rgba(33, 186, 69, 0.08);
}

.bg-negative-1 {
  background-color: rgba(193, 0, 21, 0.08);
}
</style>
