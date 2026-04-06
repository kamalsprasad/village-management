<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Recent Transactions</div>
        <div class="text-caption text-grey">Latest Activity</div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="!readOnly"
          outline
          color="primary"
          label="Record"
          icon="add"
          @click="showTransactionModal = true"
        />
        <q-btn flat color="primary" label="View All" to="/finance/transactions" />
      </div>
    </q-card-section>

    <q-card-section v-if="transactions.length > 0" class="q-pt-none">
      <q-list separator>
        <q-item
          v-for="transaction in transactions"
          :key="transaction.$id"
          clickable
          @click="openTransaction(transaction)"
          class="q-px-none"
        >
          <q-item-section avatar>
            <q-avatar
              :color="transaction.type === 'income' ? 'positive' : 'negative'"
              text-color="white"
              size="sm"
            >
              <q-icon :name="transaction.type === 'income' ? 'arrow_downward' : 'arrow_upward'" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">{{
              getCategoryName(transaction.category_id)
            }}</q-item-label>
            <q-item-label caption lines="1"
              >{{ formatReportDate(transaction.date) }} •
              {{ transaction.source_module }}</q-item-label
            >
          </q-item-section>

          <q-item-section side>
            <q-item-label
              class="text-weight-bold"
              :class="transaction.type === 'income' ? 'text-positive' : 'text-negative'"
            >
              {{ transaction.type === 'income' ? '+' : '-'
              }}{{ formatCurrency(transaction.amount_funded) }}
            </q-item-label>
            <q-item-label caption>
              <q-chip
                size="sm"
                :color="getStatusColor(transaction.status)"
                :text-color="transaction.status === 'pending' ? 'dark' : 'white'"
                dense
              >
                {{ transaction.status }}
              </q-chip>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-card-section v-else-if="!loading" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="receipt_long" size="3rem" class="q-mb-sm" />
      <div>No recent transactions found</div>
      <q-btn
        v-if="!readOnly"
        color="primary"
        outline
        label="Record First Transaction"
        class="q-mt-md"
        @click="showTransactionModal = true"
      />
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>

    <!-- Transaction Form Modal -->
    <q-dialog v-model="showTransactionModal" persistent maximized>
      <q-card class="column full-height">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ selectedTransaction ? 'Edit' : 'Record' }} Transaction</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="closeTransactionModal" />
        </q-card-section>
        <q-card-section class="col q-pt-md">
          <transaction-form
            :initial-data="selectedTransaction"
            @saved="onTransactionSaved"
            @cancel="closeTransactionModal"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref } from 'vue';
import { formatCurrency, formatReportDate } from 'src/services/ReportService';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';
import TransactionForm from './TransactionForm.vue';

const emit = defineEmits(['saved']);

const props = defineProps({
  transactions: {
    type: Array,
    required: true,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
});

const financeStore = useFinanceStore();
const showTransactionModal = ref(false);
const selectedTransaction = ref(null);

const getCategoryName = (categoryId) => {
  return financeStore.getCategoryName(categoryId);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'grey';
    default:
      return 'grey';
  }
};

const openTransaction = (transaction) => {
  if (props.readOnly) return;
  selectedTransaction.value = transaction;
  showTransactionModal.value = true;
};

const closeTransactionModal = () => {
  selectedTransaction.value = null;
  showTransactionModal.value = false;
};

const onTransactionSaved = () => {
  closeTransactionModal();
  emit('saved');
};
</script>
