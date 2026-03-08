<template>
  <q-page>
    <div class="q-pa-md max-width-1000 q-mx-auto">
      <!-- Loading State -->
      <div v-if="lendingStore.isLoading && !loan" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
      </div>

      <template v-else-if="loan">
        <!-- Header -->
        <div class="row items-center q-mb-md">
          <q-btn flat round icon="arrow_back" to="/lending" class="q-mr-sm" />
          <div class="col">
            <h5 class="q-my-none">Loan Details</h5>
            <div class="text-subtitle2 text-grey-7">ID: {{ loan.$id }}</div>
          </div>
          <div class="col-auto">
            <q-chip :color="getStatusColor(loan.status)" text-color="white">
              {{ loan.status.toUpperCase() }}
            </q-chip>
          </div>
        </div>

        <div class="row q-col-gutter-md">
          <!-- Left Column: Summary & Borrower -->
          <div class="col-12 col-md-4">
            <q-card flat bordered class="q-mb-md">
              <q-card-section>
                <div class="text-subtitle2 text-grey-7">Outstanding Balance</div>
                <div class="text-h4 text-primary q-mb-md">
                  {{ formatCurrency(loan.outstanding_balance) }}
                </div>
                
                <div class="text-subtitle2 text-grey-7">Original Principal</div>
                <div class="text-h6">{{ formatCurrency(loan.principal_amount) }}</div>
              </q-card-section>
              
              <q-separator />
              
              <q-card-section>
                <q-btn 
                  v-if="loan.status === 'active'"
                  color="primary" 
                  icon="payment" 
                  label="Record Payment" 
                  class="full-width" 
                  @click="showPaymentDialog = true"
                />
              </q-card-section>
            </q-card>

            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6 q-mb-md">Details</div>
                
                <q-list dense>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Borrower</q-item-label>
                      <q-item-label>{{ borrowerName }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Purpose</q-item-label>
                      <q-item-label class="text-capitalize">{{ loan.purpose }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Interest Rate</q-item-label>
                      <q-item-label>{{ (loan.interest_rate / 100).toFixed(2) }}%</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Disbursement Date</q-item-label>
                      <q-item-label>{{ settingsStore.formatDateTime(loan.disbursement_date, 'PP') }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>
                      <q-item-label caption>Term</q-item-label>
                      <q-item-label>{{ loan.term_months }} months</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="loan.collateral_description">
                    <q-item-section>
                      <q-item-label caption>Collateral</q-item-label>
                      <q-item-label>{{ loan.collateral_description }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </div>

          <!-- Right Column: Tabs for Schedule & Payments -->
          <div class="col-12 col-md-8">
            <q-card flat bordered>
              <q-tabs
                v-model="tab"
                dense
                class="text-grey"
                active-color="primary"
                indicator-color="primary"
                align="justify"
                narrow-indicator
              >
                <q-tab name="schedule" label="Repayment Schedule" />
                <q-tab name="payments" label="Payment History" />
              </q-tabs>

              <q-separator />

              <q-tab-panels v-model="tab" animated>
                <!-- Schedule Panel -->
                <q-tab-panel name="schedule" class="q-pa-none">
                  <q-table
                    :rows="lendingStore.repaymentSchedule"
                    :columns="scheduleColumns"
                    row-key="$id"
                    flat
                    :pagination="{ rowsPerPage: 15 }"
                  >
                    <template #body-cell-status="props">
                      <q-td :props="props">
                        <q-chip :color="getScheduleStatusColor(props.value)" text-color="white" dense size="sm">
                          {{ props.value.toUpperCase() }}
                        </q-chip>
                      </q-td>
                    </template>
                    <template #body-cell-amount="props">
                      <q-td :props="props">
                        {{ formatCurrency(props.value) }}
                      </q-td>
                    </template>
                    <template #body-cell-due_date="props">
                      <q-td :props="props">
                        {{ settingsStore.formatDateTime(props.value, 'PP') }}
                      </q-td>
                    </template>
                  </q-table>
                </q-tab-panel>

                <!-- Payments Panel -->
                <q-tab-panel name="payments" class="q-pa-none">
                  <div v-if="lendingStore.payments.length === 0" class="q-pa-md text-center text-grey">
                    No payments recorded yet.
                  </div>
                  <q-list v-else separator>
                    <q-item v-for="payment in lendingStore.payments" :key="payment.$id">
                      <q-item-section avatar>
                        <q-avatar color="green-1" text-color="positive" icon="done" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold">{{ formatCurrency(payment.amount) }}</q-item-label>
                        <q-item-label caption>{{ settingsStore.formatDateTime(payment.payment_date, 'PPpp') }}</q-item-label>
                        <q-item-label caption v-if="payment.notes">{{ payment.notes }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-chip size="sm" outline>{{ payment.payment_method }}</q-chip>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-tab-panel>
              </q-tab-panels>
            </q-card>
          </div>
        </div>
      </template>

      <!-- Record Payment Dialog -->
      <q-dialog v-model="showPaymentDialog" persistent>
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Record Payment</div>
          </q-card-section>

          <q-card-section>
            <q-form ref="paymentForm" @submit="submitPayment">
              <q-input
                v-model.number="paymentData.uiAmount"
                type="number"
                label="Amount (ZMW) *"
                outlined
                min="0"
                :max="(loan?.outstanding_balance || 0) / 100"
                step="0.01"
                class="q-mb-md"
                :rules="[
                  val => !!val || 'Amount is required',
                  val => val > 0 || 'Amount must be greater than 0',
                  val => val <= (loan?.outstanding_balance || 0) / 100 || 'Amount exceeds outstanding balance'
                ]"
              />

              <q-input
                v-model="paymentData.date"
                type="date"
                label="Payment Date *"
                outlined
                class="q-mb-md"
                :rules="[val => !!val || 'Date is required']"
              />

              <q-select
                v-model="paymentData.method"
                :options="['Cash', 'Mobile Money', 'Bank Transfer']"
                label="Payment Method *"
                outlined
                class="q-mb-md"
                :rules="[val => !!val || 'Method is required']"
              />

              <q-input
                v-model="paymentData.notes"
                type="textarea"
                label="Notes (Optional)"
                outlined
                rows="2"
                class="q-mb-md"
              />

              <div class="row justify-end q-gutter-sm">
                <q-btn flat label="Cancel" color="grey-7" v-close-popup />
                <q-btn type="submit" label="Record Payment" color="primary" :loading="lendingStore.isLoading" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLendingStore } from '../stores/lendingStore';
import { useSettingsStore } from 'src/stores/settings-store';
import { useResidentsStore } from 'src/stores/residents-store';

const route = useRoute();
const lendingStore = useLendingStore();
const settingsStore = useSettingsStore();
const residentsStore = useResidentsStore();

const tab = ref('schedule');
const showPaymentDialog = ref(false);
const paymentForm = ref(null);

const paymentData = ref({
  uiAmount: null,
  date: new Date().toISOString().split('T')[0],
  method: 'Cash',
  notes: ''
});

const scheduleColumns = [
  { name: 'installment_number', label: '#', field: 'installment_number', align: 'left' },
  { name: 'due_date', label: 'Due Date', field: 'due_date', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
];

onMounted(async () => {
  await residentsStore.fetchResidents();
  await lendingStore.fetchLoanDetails(route.params.id);
  if (loan.value) {
    // default payment amount to scheduled amount or remaining balance
    paymentData.value.uiAmount = Math.min(
      loan.value.payment_amount / 100, 
      loan.value.outstanding_balance / 100
    );
  }
});

const loan = computed(() => lendingStore.currentLoan);

const borrowerName = computed(() => {
  if (!loan.value) return '';
  const borrowerId = loan.value.borrower_id;
  if (typeof borrowerId === 'object' && borrowerId.$id) {
    return [borrowerId.first_name, borrowerId.last_name].filter(Boolean).join(' ');
  }
  const resident = residentsStore.getResidentById(borrowerId);
  if (resident) {
    return [resident.first_name, resident.last_name].filter(Boolean).join(' ');
  }
  return 'Unknown Borrower';
});

function formatCurrency(amountInNgwee) {
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

function getScheduleStatusColor(status) {
  switch (status) {
    case 'paid': return 'positive';
    case 'pending': return 'warning';
    case 'overdue': return 'negative';
    default: return 'grey';
  }
}

async function submitPayment() {
  const isValid = await paymentForm.value.validate();
  if (!isValid) return;

  const amountInNgwee = Math.round(paymentData.value.uiAmount * 100);

  const payload = {
    loan_id: loan.value.$id,
    amount: amountInNgwee,
    payment_date: new Date(paymentData.value.date).toISOString(),
    payment_method: paymentData.value.method,
    notes: paymentData.value.notes || null,
  };

  const result = await lendingStore.recordPayment(payload);
  
  if (result.success) {
    showPaymentDialog.value = false;
    // We should ideally mark the schedule as paid here, but we will rely on 
    // fetchLoanDetails to refresh state in a real app or add logic in the store
    await lendingStore.fetchLoanDetails(route.params.id);
    
    // Reset payment form
    paymentData.value = {
      uiAmount: Math.min(loan.value.payment_amount / 100, loan.value.outstanding_balance / 100),
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      notes: ''
    };
  }
}
</script>

<style scoped>
.max-width-1000 {
  max-width: 1000px;
}
</style>
