<template>
  <q-card class="full-height">
    <q-card-section>
      <div class="text-h6">Financial Summary</div>
      <div class="text-caption text-grey">Current Month</div>
    </q-card-section>

    <q-card-section>
      <div class="row q-col-gutter-md">
        <!-- Total Income -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card
            flat
            bordered
            class="bg-grey-1 cursor-pointer"
            @click="goToTransactions('income')"
          >
            <q-card-section>
              <div class="text-subtitle2 text-grey-8">Total Income</div>
              <div class="text-h5 text-weight-bold text-positive">
                {{ formatCurrency(summary.totalIncome) }}
              </div>
              <div class="text-caption q-mt-xs text-grey-6 row items-center">
                <q-icon :name="getTrendIcon(summary.comparisons?.incomeChange)" class="q-mr-xs" />
                {{ formatComparison(summary.comparisons?.incomeChange) }} vs last month
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Total Expenses -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card
            flat
            bordered
            class="bg-grey-1 cursor-pointer"
            @click="goToTransactions('expense')"
          >
            <q-card-section>
              <div class="text-subtitle2 text-grey-8">Total Expenses</div>
              <div class="text-h5 text-weight-bold text-negative">
                {{ formatCurrency(summary.totalExpenses) }}
              </div>
              <div class="text-caption q-mt-xs text-grey-6 row items-center">
                <q-icon
                  :name="getTrendIcon(summary.comparisons?.expenseChange, true)"
                  class="q-mr-xs"
                />
                {{ formatComparison(summary.comparisons?.expenseChange) }} vs last month
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Net Position -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card
            flat
            bordered
            :class="[netPositionClass, 'cursor-pointer']"
            @click="goToTransactions()"
          >
            <q-card-section>
              <div class="text-subtitle2" :class="netPositionTextClass">Net Position</div>
              <div class="text-h5 text-weight-bold" :class="netPositionTextClass">
                {{ formatCurrency(Math.abs(summary.netPosition || 0)) }}
              </div>
              <div class="text-caption q-mt-xs row items-center" :class="netPositionTextClass">
                <q-icon :name="getTrendIcon(summary.comparisons?.netChange)" class="q-mr-xs" />
                {{ summary.netPosition >= 0 ? 'Surplus' : 'Deficit' }} •
                {{ formatComparison(summary.comparisons?.netChange) }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Cash on Hand (Funding Sources) -->
        <div class="col-12 col-sm-6 col-md-3">
          <q-card
            flat
            bordered
            class="bg-primary text-white cursor-pointer"
            @click="goToFundingSettings"
          >
            <q-card-section>
              <div class="text-subtitle2 text-blue-2">Cash on Hand</div>
              <div class="text-h5 text-weight-bold">
                {{ formatCurrency(totalCashOnHand) }}
              </div>
              <div class="text-caption q-mt-xs text-blue-2 row items-center">
                <q-icon name="account_balance" class="q-mr-xs" />
                Across {{ activeFundingSourcesCount }} active funds
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { formatCurrency } from 'src/services/ReportService';

const props = defineProps({
  summary: {
    type: Object,
    required: true,
    default: () => ({
      totalIncome: 0,
      totalExpenses: 0,
      netPosition: 0,
      incomeCount: 0,
      expenseCount: 0,
    }),
  },
  fundingSources: {
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

const netPositionClass = computed(() => {
  const net = props.summary.netPosition || 0;
  if (net > 0) return 'bg-green-1 border-positive';
  if (net < 0) return 'bg-red-1 border-negative';
  return 'bg-grey-1';
});

const netPositionTextClass = computed(() => {
  const net = props.summary.netPosition || 0;
  if (net > 0) return 'text-positive';
  if (net < 0) return 'text-negative';
  return 'text-grey-8';
});

const totalCashOnHand = computed(() => {
  return props.fundingSources.reduce((sum, source) => {
    return sum + (source.current_balance || 0);
  }, 0);
});

const activeFundingSourcesCount = computed(() => {
  return props.fundingSources.filter((s) => s.status === 'active').length;
});

const getTrendIcon = (change, reverse = false) => {
  const value = Number(change || 0);
  if (value === 0) return 'trending_flat';
  if (reverse) {
    return value <= 0 ? 'trending_down' : 'trending_up';
  }
  return value >= 0 ? 'trending_up' : 'trending_down';
};

const formatComparison = (change) => {
  const value = Number(change || 0);
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const goToTransactions = (type = null) => {
  const query = {};
  if (type) {
    query.type = type;
  }
  router.push({ path: '/finance/transactions', query });
};

const goToFundingSettings = () => {
  router.push('/admin/finance-settings');
};
</script>

<style scoped>
.border-positive {
  border-color: var(--q-positive) !important;
}
.border-negative {
  border-color: var(--q-negative) !important;
}
</style>
