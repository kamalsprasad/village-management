<template>
  <q-card style="min-width: 450px; max-width: 500px">
    <q-card-section>
      <div class="text-h6">
        <q-icon name="add_circle" color="positive" class="q-mr-sm" />
        Add Funding to Transaction
      </div>
      <div class="text-caption text-grey-7 q-mt-xs">
        Add additional funding to complete this expense
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <!-- Transaction Info -->
      <q-banner class="bg-info text-white q-mb-md rounded-borders">
        <template #avatar>
          <q-icon name="info" color="white" />
        </template>
        <div class="text-body2">
          <strong>{{ transaction?.description }}</strong>
        </div>
        <div class="text-caption">
          Currently funded: {{ formatCurrency(currentAmountFunded) }} of
          {{ formatCurrency(transaction?.amount_needed || 0) }}
        </div>
        <div class="text-caption">
          Remaining needed: {{ formatCurrency(remainingNeeded) }}
        </div>
      </q-banner>

      <q-form @submit="handleSubmit">
        <!-- Funding Source -->
        <q-select
          v-model="formData.fundingSourceId"
          :options="fundingSourceOptions"
          label="Funding Source *"
          outlined
          dense
          option-value="value"
          option-label="label"
          emit-value
          map-options
          :rules="[(val) => !!val || 'Funding source is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="account_balance" />
          </template>
        </q-select>

        <!-- Selected Source Balance Display -->
        <div
          v-if="selectedFundingSource"
          class="text-caption q-mb-md"
          :class="hasInsufficientBalance ? 'text-negative' : 'text-grey-7'"
        >
          Available balance: {{ formatCurrency(selectedFundingSource.current_balance) }}
          <span v-if="hasInsufficientBalance" class="text-negative text-weight-bold">
            (Insufficient)
          </span>
        </div>

        <!-- Amount to Add -->
        <q-input
          v-model.number="formData.amount"
          label="Amount to Add (ZMW) *"
          type="number"
          step="0.01"
          :min="0.01"
          :max="remainingNeeded"
          outlined
          dense
          :rules="amountRules"
          :error="hasInsufficientBalance"
          :error-message="
            hasInsufficientBalance
              ? 'Selected funding source has insufficient balance'
              : ''
          "
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="payments" />
          </template>
          <template #hint>
            Max: {{ formatCurrency(remainingNeeded) }}
          </template>
        </q-input>

        <!-- Notes -->
        <q-input
          v-model="formData.notes"
          label="Notes (Optional)"
          type="textarea"
          outlined
          dense
          rows="2"
          class="q-mb-md"
          hint="Any notes about this funding addition"
        >
          <template #prepend>
            <q-icon name="note" />
          </template>
        </q-input>
      </q-form>
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Cancel" color="grey-7" @click="$emit('cancelled')" />
      <q-btn
        label="Add Funding"
        color="positive"
        :loading="loading"
        :disable="!isValid"
        @click="handleSubmit"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFinanceStore } from '../stores/finance-store';

const props = defineProps({
  transaction: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['saved', 'cancelled']);

const financeStore = useFinanceStore();
const loading = ref(false);

// Form data
const formData = ref({
  fundingSourceId: null,
  amount: null,
  notes: '',
});

// Computed
const currentAmountFunded = computed(() => props.transaction?.amount_funded || 0);
const amountNeeded = computed(() => props.transaction?.amount_needed || currentAmountFunded.value);
const remainingNeeded = computed(() => amountNeeded.value - currentAmountFunded.value);

// Funding source options (only active sources with balance)
const fundingSourceOptions = computed(() => {
  return financeStore.activeFundingSources
    .filter((source) => source.current_balance > 0)
    .map((source) => ({
      label: `${source.name} (Balance: ${formatCurrency(source.current_balance)})`,
      value: source.$id,
    }));
});

// Selected funding source
const selectedFundingSource = computed(() => {
  if (!formData.value.fundingSourceId) return null;
  return financeStore.getFundingSourceById(formData.value.fundingSourceId);
});

// Check if selected source has sufficient balance
const hasInsufficientBalance = computed(() => {
  if (!selectedFundingSource.value || !formData.value.amount) return false;
  return formData.value.amount > selectedFundingSource.value.current_balance;
});

// Amount validation rules
const amountRules = [
  (val) => !!val || 'Amount is required',
  (val) => val > 0 || 'Amount must be positive',
  (val) => val <= remainingNeeded.value || `Cannot exceed remaining needed (${formatCurrency(remainingNeeded.value)})`,
];

// Form validity
const isValid = computed(() => {
  if (!formData.value.fundingSourceId) return false;
  if (!formData.value.amount || formData.value.amount <= 0) return false;
  if (formData.value.amount > remainingNeeded.value) return false;
  if (hasInsufficientBalance.value) return false;
  return true;
});

// Load funding sources on mount
onMounted(async () => {
  if (!financeStore.fundingSourcesLoaded) {
    await financeStore.fetchFundingSources();
  }
});

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

// Handle form submission
async function handleSubmit() {
  if (!isValid.value) return;

  loading.value = true;
  try {
    const result = await financeStore.createFundingLink(
      props.transaction.$id,
      formData.value.amount,
      formData.value.fundingSourceId,
      formData.value.notes,
      null // No child transaction for direct funding
    );

    if (result.success) {
      emit('saved', result.data);
      // Reset form
      formData.value = {
        fundingSourceId: null,
        amount: null,
        notes: '',
      };
    }
  } finally {
    loading.value = false;
  }
}
</script>
