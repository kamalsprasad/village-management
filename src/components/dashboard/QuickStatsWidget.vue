<template>
  <q-card flat bordered class="quick-stats-widget">
    <q-card-section>
      <div class="text-h6 q-mb-sm">
        <q-icon name="dashboard" class="q-mr-sm" />
        Quick Stats
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <q-card-section v-if="loading">
      <div class="row q-col-gutter-md">
        <div v-for="i in 4" :key="i" class="col-6">
          <q-skeleton type="rect" height="80px" />
        </div>
      </div>
    </q-card-section>

    <!-- Stats Grid -->
    <q-card-section v-else-if="stats">
      <div class="row q-col-gutter-sm">
        <!-- Households -->
        <div v-if="stats.households" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Households</div>
                  <div class="text-h5 text-weight-bold">{{ stats.households.total }}</div>
                  <div class="text-caption" :class="getTrendClass(stats.households.trend)">
                    <q-icon :name="getTrendIcon(stats.households.trend)" size="xs" />
                    {{ stats.households.change }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="home" size="2rem" color="primary" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Residents -->
        <div v-if="stats.residents" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Residents</div>
                  <div class="text-h5 text-weight-bold">{{ stats.residents.total }}</div>
                  <div class="text-caption" :class="getTrendClass(stats.residents.trend)">
                    <q-icon :name="getTrendIcon(stats.residents.trend)" size="xs" />
                    {{ stats.residents.change }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="people" size="2rem" color="blue" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Total Income -->
        <div v-if="stats.finance" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Total Income</div>
                  <div class="text-h6 text-weight-bold">
                    {{ formatCurrency(stats.finance.totalIncome, stats.finance.currency) }}
                  </div>
                  <div class="text-caption text-positive">
                    <q-icon name="trending_up" size="xs" />
                    {{ stats.finance.change }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="trending_up" size="2rem" color="positive" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Total Expenses -->
        <div v-if="stats.finance" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Total Expenses</div>
                  <div class="text-h6 text-weight-bold">
                    {{ formatCurrency(stats.finance.totalExpenses, stats.finance.currency) }}
                  </div>
                  <div class="text-caption text-negative">
                    <q-icon name="trending_down" size="xs" />
                    {{ stats.finance.change }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="trending_down" size="2rem" color="negative" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Finance Balance -->
        <div v-if="stats.finance" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Balance</div>
                  <div class="text-h6 text-weight-bold">
                    {{ formatCurrency(stats.finance.balance, stats.finance.currency) }}
                  </div>
                  <div class="text-caption" :class="getTrendClass(stats.finance.trend)">
                    <q-icon :name="getTrendIcon(stats.finance.trend)" size="xs" />
                    {{ stats.finance.change }}
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="account_balance_wallet" size="2rem" color="positive" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Active Loans -->
        <div v-if="stats.lending" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Active Loans</div>
                  <div class="text-h5 text-weight-bold">{{ stats.lending.activeLoans }}</div>
                  <div class="text-caption text-grey-7">
                    {{ stats.lending.repaymentRate }}% repayment
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="account_balance" size="2rem" color="orange" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Farm Plots -->
        <div v-if="stats.farm" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Active Plots</div>
                  <div class="text-h5 text-weight-bold">{{ stats.farm.activePlots }}</div>
                  <div class="text-caption" :class="getTrendClass(stats.farm.trend)">
                    <q-icon :name="getTrendIcon(stats.farm.trend)" size="xs" />
                    {{ stats.farm.yieldTrend }}% yield
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="agriculture" size="2rem" color="green" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- School Students -->
        <div v-if="stats.school" class="col-6 col-sm-6 col-md-4">
          <q-card flat bordered class="stat-card">
            <q-card-section class="q-pa-sm">
              <div class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Students</div>
                  <div class="text-h5 text-weight-bold">{{ stats.school.totalStudents }}</div>
                  <div class="text-caption text-grey-7">
                    {{ stats.school.attendance }}% attendance
                  </div>
                </div>
                <div class="col-auto">
                  <q-icon name="school" size="2rem" color="purple" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </q-card-section>

    <!-- Empty State -->
    <q-card-section v-else class="text-center text-grey-6">
      <q-icon name="bar_chart" size="3rem" class="q-mb-sm" />
      <div>No statistics available</div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

function formatCurrency(amount, currency = 'ZMW') {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getTrendIcon(trend) {
  if (trend === 'up') return 'trending_up';
  if (trend === 'down') return 'trending_down';
  return 'trending_flat';
}

function getTrendClass(trend) {
  if (trend === 'up') return 'text-positive';
  if (trend === 'down') return 'text-negative';
  return 'text-grey-7';
}
</script>

<style scoped>
.quick-stats-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.stat-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
