<template>
  <q-page>
    <div class="q-pa-md max-width-800 q-mx-auto">
      <div class="row items-center q-mb-md">
        <q-btn flat round icon="arrow_back" to="/lending" class="q-mr-sm" />
        <h5 class="q-my-none">Create New Loan</h5>
      </div>

      <q-form ref="loanForm" @submit="submitLoan">
        <q-stepper v-model="step" vertical color="primary" animated flat bordered>
          <!-- Step 1: Borrower & Purpose -->
          <q-step :name="1" title="Borrower & Purpose" icon="person" :done="step > 1">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <ResidentSearchInput
                  v-model="formData.borrower_id"
                  label="Borrower *"
                  outlined
                  :rules="[(val) => !!val || 'Please select a borrower']"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="formData.purpose"
                  :options="purposeOptions"
                  label="Loan Purpose *"
                  outlined
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Purpose is required']"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="formData.disbursement_date"
                  type="date"
                  label="Disbursement Date *"
                  outlined
                  :rules="[(val) => !!val || 'Date is required']"
                />
              </div>
              <div class="col-12">
                <q-input
                  v-model="formData.collateral_description"
                  type="textarea"
                  label="Collateral Description (Optional)"
                  outlined
                  rows="3"
                />
              </div>
            </div>

            <q-stepper-navigation>
              <q-btn @click="step = 2" color="primary" label="Continue" />
            </q-stepper-navigation>
          </q-step>

          <!-- Step 2: Loan Terms & Calculations -->
          <q-step :name="2" title="Terms & Calculations" icon="calculate" :done="step > 2">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="uiAmount"
                  type="number"
                  label="Principal Amount (ZMW) *"
                  outlined
                  min="0"
                  max="100000"
                  step="0.01"
                  :rules="[
                    (val) => !!val || 'Amount is required',
                    (val) => val > 0 || 'Amount must be greater than 0',
                    (val) => val <= 100000 || 'Maximum loan amount is 100,000 ZMW',
                  ]"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="uiRate"
                  type="number"
                  label="Annual Interest Rate (%) *"
                  outlined
                  min="0"
                  max="50"
                  step="0.01"
                  :rules="[
                    (val) => val !== null || 'Rate is required',
                    (val) => val >= 0 || 'Rate cannot be negative',
                    (val) => val <= 50 || 'Maximum interest rate is 50%',
                  ]"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model.number="formData.term_months"
                  type="number"
                  label="Term (Months) *"
                  outlined
                  min="1"
                  max="60"
                  :rules="[
                    (val) => !!val || 'Term is required',
                    (val) => val >= 1 || 'Minimum term is 1 month',
                    (val) => val <= 60 || 'Maximum term is 60 months',
                  ]"
                />
              </div>
              <div class="col-12 col-md-6">
                <q-select
                  v-model="formData.repayment_frequency"
                  :options="frequencyOptions"
                  label="Repayment Frequency *"
                  outlined
                  emit-value
                  map-options
                  :rules="[(val) => !!val || 'Frequency is required']"
                />
              </div>
            </div>

            <!-- Real-time Preview -->
            <q-card class="bg-grey-2 q-mt-md" flat bordered>
              <q-card-section>
                <div class="text-subtitle2 q-mb-sm">Calculation Preview</div>
                <div class="row q-col-gutter-sm">
                  <div class="col-6 col-md-3">
                    <div class="text-caption text-grey-7">Principal</div>
                    <div class="text-weight-bold">
                      {{ formatCurrency(calculatedValues.principal) }}
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="text-caption text-grey-7">Total Interest</div>
                    <div class="text-weight-bold">
                      {{ formatCurrency(calculatedValues.totalInterest) }}
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="text-caption text-grey-7">Total Repayment</div>
                    <div class="text-weight-bold text-primary">
                      {{ formatCurrency(calculatedValues.totalRepayment) }}
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="text-caption text-grey-7">Payment per Period</div>
                    <div class="text-weight-bold">
                      {{ formatCurrency(calculatedValues.paymentAmount) }}
                    </div>
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-stepper-navigation>
              <q-btn @click="generateScheduleAndContinue" color="primary" label="Review Schedule" />
              <q-btn flat @click="step = 1" color="primary" label="Back" class="q-ml-sm" />
            </q-stepper-navigation>
          </q-step>

          <!-- Step 3: Review Schedule -->
          <q-step :name="3" title="Review Schedule" icon="list_alt">
            <div class="text-subtitle1 q-mb-md">Proposed Repayment Schedule</div>

            <q-table
              :rows="proposedSchedule"
              :columns="scheduleColumns"
              row-key="installment_number"
              flat
              bordered
              dense
              :pagination="{ rowsPerPage: 12 }"
              hide-bottom
            >
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

            <q-stepper-navigation>
              <q-btn
                type="submit"
                color="primary"
                label="Confirm & Create Loan"
                :loading="lendingStore.isLoading"
              />
              <q-btn flat @click="step = 2" color="primary" label="Back" class="q-ml-sm" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </q-form>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useLendingStore } from '../stores/lendingStore';
import { useLoanCalculations } from '../composables/useLoanCalculations';

const router = useRouter();
const $q = useQuasar();
const settingsStore = useSettingsStore();
const lendingStore = useLendingStore();
const {
  calculateTotalInterest,
  calculatePaymentAmount,
  calculateNumberOfPayments,
  generateRepaymentSchedule,
} = useLoanCalculations();

const step = ref(1);
const loanForm = ref(null);

// UI bound values for floating point representation
const uiAmount = ref(null);
const uiRate = ref(null);

const formData = ref({
  borrower_id: null,
  purpose: 'business',
  disbursement_date: new Date().toISOString().split('T')[0],
  collateral_description: '',
  term_months: 12,
  repayment_frequency: 'monthly',
});

const proposedSchedule = ref([]);

const purposeOptions = [
  { label: 'Farm Inputs', value: 'farm' },
  { label: 'Education', value: 'education' },
  { label: 'Medical', value: 'medical' },
  { label: 'Business', value: 'business' },
  { label: 'Other', value: 'other' },
];

const frequencyOptions = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Bi-weekly', value: 'biweekly' },
  { label: 'Weekly', value: 'weekly' },
];

const scheduleColumns = [
  { name: 'installment_number', label: '#', field: 'installment_number', align: 'left' },
  { name: 'due_date', label: 'Due Date', field: 'due_date', align: 'left' },
  { name: 'amount', label: 'Amount', field: 'amount', align: 'right' },
];

// Computed calculations in Ngwee
const calculatedValues = computed(() => {
  const principal = Math.round((uiAmount.value || 0) * 100);
  const rateBps = Math.round((uiRate.value || 0) * 100);
  const term = formData.value.term_months || 0;
  const frequency = formData.value.repayment_frequency;

  const totalInterest = calculateTotalInterest(principal, rateBps, term);
  const totalRepayment = principal + totalInterest;
  const numPayments = calculateNumberOfPayments(term, frequency);
  const paymentAmount = calculatePaymentAmount(principal, totalInterest, numPayments);

  return {
    principal,
    rateBps,
    totalInterest,
    totalRepayment,
    numPayments,
    paymentAmount,
  };
});

function formatCurrency(amountInNgwee) {
  return settingsStore.formatCurrency(amountInNgwee / 100);
}

function generateScheduleAndContinue() {
  if (!uiAmount.value || !uiRate.value || !formData.value.term_months) {
    $q.notify({ type: 'warning', message: 'Please fill all required calculation fields' });
    return;
  }

  const { principal, totalInterest, numPayments } = calculatedValues.value;

  proposedSchedule.value = generateRepaymentSchedule(
    principal,
    totalInterest,
    numPayments,
    formData.value.repayment_frequency,
    formData.value.disbursement_date,
  );

  step.value = 3;
}

async function submitLoan() {
  const isValid = await loanForm.value.validate();
  if (!isValid) return;

  if (proposedSchedule.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Repayment schedule is empty' });
    return;
  }

  const { principal, rateBps, totalRepayment, paymentAmount } = calculatedValues.value;

  const borrowerId =
    typeof formData.value.borrower_id === 'object'
      ? formData.value.borrower_id.id
      : formData.value.borrower_id;

  const loanData = {
    borrower_id: borrowerId,
    principal_amount: principal,
    interest_rate: rateBps,
    term_months: formData.value.term_months,
    repayment_frequency: formData.value.repayment_frequency,
    collateral_description: formData.value.collateral_description || null,
    purpose: formData.value.purpose,
    disbursement_date: new Date(formData.value.disbursement_date).toISOString(),
    status: 'active',
    outstanding_balance: totalRepayment,
    total_repayment: totalRepayment,
    payment_amount: paymentAmount,
    next_due_date: proposedSchedule.value[0].due_date,
  };

  const result = await lendingStore.createLoan(loanData, proposedSchedule.value);
  if (result.success) {
    router.push(`/lending/${result.data.$id}`);
  }
}
</script>

<style scoped>
.max-width-800 {
  max-width: 800px;
}
</style>
