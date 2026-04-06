<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Active Loans</div>
        <div class="text-caption text-grey">Portfolio Overview</div>
      </div>
      <q-btn flat color="primary" label="View All" to="/lending" />
    </q-card-section>

    <q-card-section v-if="!summary.moduleEnabled">
      <div class="text-center text-grey-6 q-pa-xl">
        <q-icon name="account_balance" size="3rem" class="q-mb-sm" />
        <div>Lending module is not enabled</div>
      </div>
    </q-card-section>

    <template v-else>
      <q-card-section v-if="summary.activeCount > 0" class="q-pt-none">
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-6">
            <q-card flat bordered class="bg-grey-1">
              <q-card-section class="q-pa-sm text-center">
                <div class="text-caption text-grey-8">Outstanding</div>
                <div class="text-subtitle1 text-weight-bold text-primary">
                  {{ formatCurrency(summary.totalOutstanding) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6">
            <q-card flat bordered :class="summary.overdueCount > 0 ? 'bg-red-1 border-negative' : 'bg-grey-1'">
              <q-card-section class="q-pa-sm text-center">
                <div class="text-caption" :class="summary.overdueCount > 0 ? 'text-negative' : 'text-grey-8'">Overdue</div>
                <div class="text-subtitle1 text-weight-bold" :class="summary.overdueCount > 0 ? 'text-negative' : 'text-grey-8'">
                  {{ summary.overdueCount }} Loans
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-list separator class="q-mt-sm">
          <q-item-label header class="q-px-none q-pb-sm">Top Active Loans</q-item-label>
          <q-item v-for="loan in topLoans" :key="loan.id" clickable :to="`/lending/${loan.id}`" class="q-px-none">
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ loan.borrowerName || 'Resident' }}</q-item-label>
              <q-item-label caption lines="1">
                {{ formatCurrency(loan.principal_amount) }} Original
              </q-item-label>
            </q-item-section>
            
            <q-item-section side>
              <q-item-label class="text-primary text-weight-bold">
                {{ formatCurrency(loan.outstanding_balance) }}
              </q-item-label>
              <q-item-label caption>
                <q-chip v-if="loan.status === 'overdue'" size="sm" color="negative" text-color="white" dense>
                  Overdue
                </q-chip>
                <span v-else class="text-positive">Active</span>
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section v-else-if="!loading" class="text-center text-grey-6 q-pa-xl">
        <q-icon name="check_circle_outline" size="3rem" class="q-mb-sm" />
        <div>No active loans at this time</div>
      </q-card-section>
    </template>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { formatCurrency } from 'src/services/ReportService';

const props = defineProps({
  summary: {
    type: Object,
    required: true,
    default: () => ({
      totalOutstanding: 0,
      activeCount: 0,
      overdueCount: 0,
      nextPaymentDue: null,
      topLoans: [],
      moduleEnabled: false
    })
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const topLoans = computed(() => {
  return props.summary.topLoans || [];
});
</script>

<style scoped>
.border-negative {
  border-color: var(--q-negative) !important;
}
</style>
