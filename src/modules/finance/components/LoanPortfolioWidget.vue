<template>
  <div class="row q-col-gutter-md q-mb-md">
    <!-- Total Outstanding -->
    <div class="col-12 col-sm-6 col-md-3">
      <q-card class="bg-primary text-white">
        <q-card-section>
          <div class="text-subtitle2">Total Outstanding</div>
          <div class="text-h5">{{ formatCurrency(stats.totalOutstanding) }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption">
            <q-icon name="payments" size="xs" class="q-mr-xs" />
            Active loans portfolio
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Active Loans Count -->
    <div class="col-12 col-sm-6 col-md-3">
      <q-card class="bg-positive text-white">
        <q-card-section>
          <div class="text-subtitle2">Active Loans</div>
          <div class="text-h5">{{ stats.activeCount }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption">
            <q-icon name="account_balance" size="xs" class="q-mr-xs" />
            Currently disbursed
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Overdue Loans -->
    <div class="col-12 col-sm-6 col-md-3">
      <q-card :class="stats.overdueCount > 0 ? 'bg-negative text-white' : 'bg-grey-8 text-white'">
        <q-card-section>
          <div class="text-subtitle2">Overdue Loans</div>
          <div class="text-h5">{{ stats.overdueCount }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption">
            <q-icon name="warning" size="xs" class="q-mr-xs" />
            {{ stats.overdueCount > 0 ? 'Requires attention' : 'All loans current' }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Quick Link -->
    <div class="col-12 col-sm-6 col-md-3">
      <q-card class="cursor-pointer hover-shadow" @click="$router.push('/lending')">
        <q-card-section>
          <div class="text-subtitle2 text-primary">Village Lending</div>
          <div class="text-h5 text-primary">
            <q-icon name="open_in_new" class="q-mr-sm" />
            Manage
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div class="text-caption text-grey">
            <q-icon name="arrow_forward" size="xs" class="q-mr-xs" />
            View all loans &amp; payments
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useLendingStore } from 'src/modules/lending/stores/lendingStore';

const lendingStore = useLendingStore();

const stats = ref({
  totalOutstanding: 0,
  activeCount: 0,
  overdueCount: 0,
});

const formatCurrency = computed(() => {
  return (amount) => {
    if (amount === null || amount === undefined) return 'K 0.00';
    const symbol = 'K';
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100); // Convert ngwee to ZMW
    return `${symbol} ${formatted}`;
  };
});

async function loadStats() {
  await lendingStore.fetchLoans();

  const loans = lendingStore.loans;
  const activeLoans = loans.filter((l) => l.status === 'active');
  const overdueLoans = loans.filter((l) => {
    if (l.status !== 'active') return false;
    if (!l.next_due_date) return false;
    return new Date(l.next_due_date) < new Date();
  });

  const totalOutstanding = activeLoans.reduce(
    (sum, loan) => sum + (loan.outstanding_balance || 0),
    0
  );

  stats.value = {
    totalOutstanding,
    activeCount: activeLoans.length,
    overdueCount: overdueLoans.length,
  };
}

onMounted(() => {
  loadStats();
});
</script>

<style scoped>
.hover-shadow:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.2s ease;
}
</style>
