<template>
  <div>
    <!-- Dashboard Stats Widget -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-card class="bg-primary text-white">
          <q-card-section>
            <div class="text-h6">Total Outstanding</div>
            <div class="text-h4">{{ formatCurrency(lendingStore.dashboardStats.totalOutstanding) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-blue-8 text-white">
          <q-card-section>
            <div class="text-h6">Active Loans</div>
            <div class="text-h4">{{ lendingStore.dashboardStats.activeLoansCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card class="bg-negative text-white" :class="{ 'bg-orange-8': lendingStore.dashboardStats.overdueLoansCount === 0 }">
          <q-card-section>
            <div class="text-h6">Overdue Loans</div>
            <div class="text-h4">{{ lendingStore.dashboardStats.overdueLoansCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters & Search -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input
            v-model="searchQuery"
            dense
            outlined
            placeholder="Search borrower name..."
            clearable
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-md-3">
          <q-select
            v-model="statusFilter"
            :options="statusOptions"
            dense
            outlined
            emit-value
            map-options
            label="Status"
            clearable
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Loans Table -->
    <q-table
      :rows="filteredLoans"
      :columns="columns"
      row-key="$id"
      :loading="lendingStore.isLoading"
      :pagination="initialPagination"
      flat
      bordered
      @row-click="onRowClick"
      class="cursor-pointer"
    >
      <template #body-cell-status="props">
        <q-td :props="props">
          <q-chip
            :color="getStatusColor(props.value)"
            text-color="white"
            dense
            size="sm"
          >
            {{ props.value.toUpperCase() }}
          </q-chip>
          <q-badge v-if="isOverdue(props.row)" color="negative" floating rounded>!</q-badge>
        </q-td>
      </template>

      <template #body-cell-principal_amount="props">
        <q-td :props="props">
          {{ formatCurrency(props.value) }}
        </q-td>
      </template>

      <template #body-cell-outstanding_balance="props">
        <q-td :props="props" :class="{ 'text-negative text-weight-bold': isOverdue(props.row) }">
          {{ formatCurrency(props.value) }}
        </q-td>
      </template>
      
      <template #body-cell-interest_rate="props">
        <q-td :props="props">
          {{ (props.value / 100).toFixed(2) }}%
        </q-td>
      </template>

      <template #body-cell-next_due_date="props">
        <q-td :props="props" :class="{ 'text-negative text-weight-bold': isOverdue(props.row) }">
          <span v-if="props.value">{{ settingsStore.formatDateTime(props.value, 'PP') }}</span>
          <span v-else class="text-grey">-</span>
          
          <q-tooltip v-if="isOverdue(props.row)" class="bg-negative">
            {{ getDaysOverdue(props.row) }} days overdue
          </q-tooltip>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLendingStore } from '../stores/lendingStore';
import { useSettingsStore } from 'src/stores/settings-store';
import { useResidentsStore } from 'src/stores/residents-store';
import { differenceInDays } from 'date-fns';

const router = useRouter();
const lendingStore = useLendingStore();
const settingsStore = useSettingsStore();
const residentsStore = useResidentsStore();

const searchQuery = ref('');
const statusFilter = ref(null);

const initialPagination = {
  sortBy: 'next_due_date',
  descending: false,
  page: 1,
  rowsPerPage: 20
};

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Fully Repaid', value: 'paid' },
  { label: 'Defaulted', value: 'defaulted' }
];

const columns = [
  { 
    name: 'borrower', 
    label: 'Borrower', 
    field: row => getBorrowerName(row.borrower_id), 
    sortable: true, 
    align: 'left' 
  },
  { 
    name: 'principal_amount', 
    label: 'Principal', 
    field: 'principal_amount', 
    sortable: true, 
    align: 'right' 
  },
  { 
    name: 'interest_rate', 
    label: 'Rate', 
    field: 'interest_rate', 
    sortable: true, 
    align: 'right' 
  },
  { 
    name: 'status', 
    label: 'Status', 
    field: 'status', 
    sortable: true, 
    align: 'center' 
  },
  { 
    name: 'outstanding_balance', 
    label: 'Balance', 
    field: 'outstanding_balance', 
    sortable: true, 
    align: 'right' 
  },
  { 
    name: 'next_due_date', 
    label: 'Next Due', 
    field: 'next_due_date', 
    sortable: true, 
    align: 'right' 
  }
];

onMounted(async () => {
  await residentsStore.fetchResidents(); // Need residents for names
  await lendingStore.fetchLoans();
});

const filteredLoans = computed(() => {
  let filtered = lendingStore.loans;

  // Filter by status
  if (statusFilter.value) {
    filtered = filtered.filter(loan => loan.status === statusFilter.value);
  }

  // Filter by search query (borrower name)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(loan => {
      const name = getBorrowerName(loan.borrower_id).toLowerCase();
      return name.includes(query);
    });
  }

  // Sort to bring overdue loans to the top if no strict sort is applied
  return filtered.sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    if (aOverdue && bOverdue) {
      // both overdue, sort by days overdue (most overdue first)
      return getDaysOverdue(b) - getDaysOverdue(a);
    }
    return 0;
  });
});

function getBorrowerName(borrowerId) {
  if (!borrowerId) return 'Unknown';
  // Check if borrower_id is populated object from Appwrite
  if (typeof borrowerId === 'object' && borrowerId.$id) {
    return [borrowerId.first_name, borrowerId.last_name].filter(Boolean).join(' ');
  }
  // Fallback to store lookup
  const resident = residentsStore.getResidentById(borrowerId);
  if (resident) {
    return [resident.first_name, resident.last_name].filter(Boolean).join(' ');
  }
  return 'Loading...';
}

function formatCurrency(amountInNgwee) {
  // Assuming amount is stored in integer cents/ngwee
  return settingsStore.formatCurrency(amountInNgwee / 100);
}

function getStatusColor(status) {
  switch (status) {
    case 'paid': return 'positive';
    case 'active': return 'primary';
    case 'defaulted': return 'negative';
    default: return 'grey';
  }
}

function isOverdue(loan) {
  if (loan.status !== 'active' || !loan.next_due_date) return false;
  return new Date(loan.next_due_date) < new Date();
}

function getDaysOverdue(loan) {
  if (!isOverdue(loan)) return 0;
  return differenceInDays(new Date(), new Date(loan.next_due_date));
}

function onRowClick(evt, row) {
  router.push(`/lending/${row.$id}`);
}
</script>
