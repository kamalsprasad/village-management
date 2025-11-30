<template>
  <q-card :style="cardStyle">
    <q-card-section>
      <div class="text-h6">{{ formTitle }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-form @submit="handleSubmit">
        <!-- Amount -->
        <q-input
          v-model.number="formData.amount"
          label="Amount (ZMW) *"
          type="number"
          step="0.01"
          min="0.01"
          outlined
          dense
          :rules="[
            (val) => !!val || 'Amount is required',
            (val) => val > 0 || 'Amount must be positive',
          ]"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="payments" />
          </template>
        </q-input>

        <!-- Category (Story 2.3: Dynamic from database) -->
        <q-select
          v-model="formData.category_id"
          :options="categoryOptions"
          label="Category *"
          outlined
          dense
          option-value="value"
          option-label="label"
          emit-value
          map-options
          :loading="financeStore.isCategoriesLoading"
          :rules="[(val) => !!val || 'Category is required']"
          class="q-mb-md"
          @update:model-value="onCategoryChange"
        >
          <template #prepend>
            <q-icon name="category" />
          </template>
        </q-select>

        <!-- Subcategory (Story 2.3: Dropdown + Other option) -->
        <q-select
          v-if="subcategoryOptions.length > 0 || formData.category_id"
          v-model="formData.subcategory"
          :options="subcategoryOptionsWithOther"
          label="Subcategory (Optional)"
          outlined
          dense
          clearable
          option-value="value"
          option-label="label"
          emit-value
          map-options
          class="q-mb-md"
          @update:model-value="onSubcategoryChange"
        >
          <template #prepend>
            <q-icon name="label" />
          </template>
        </q-select>

        <!-- Custom Subcategory Input (shown when "Other" is selected) -->
        <q-input
          v-if="showCustomSubcategory"
          v-model="formData.customSubcategory"
          label="Custom Subcategory *"
          outlined
          dense
          class="q-mb-md"
          hint="Enter a custom subcategory name"
          :rules="[(val) => !!val || 'Please enter a custom subcategory']"
        >
          <template #prepend>
            <q-icon name="edit" />
          </template>
        </q-input>

        <!-- Source Module -->
        <q-select
          v-model="formData.source_module"
          :options="financeStore.sourceModules"
          label="Source Module *"
          outlined
          dense
          :rules="[(val) => !!val || 'Source module is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="source" />
          </template>
        </q-select>

        <!-- Payment Method -->
        <q-select
          v-model="formData.payment_method"
          :options="financeStore.paymentMethods"
          label="Payment Method *"
          outlined
          dense
          :rules="[(val) => !!val || 'Payment method is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="credit_card" />
          </template>
        </q-select>

        <!-- Date -->
        <q-input
          v-model="formData.date"
          label="Date *"
          outlined
          dense
          type="date"
          :rules="[(val) => !!val || 'Date is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="event" />
          </template>
        </q-input>

        <!-- Funding Source (Optional) -->
        <q-select
          v-model="formData.funding_source_id"
          :options="fundingSourceOptions"
          label="Funding Source (Optional)"
          outlined
          dense
          clearable
          option-value="value"
          option-label="label"
          emit-value
          map-options
          class="q-mb-md"
          :hint="fundingSourceHint"
        >
          <template #prepend>
            <q-icon name="account_balance" />
          </template>
        </q-select>

        <!-- Expense-specific fields -->
        <template v-if="props.type === 'expense'">
          <!-- Vendor/Supplier -->
          <q-input
            v-model="formData.vendor"
            label="Vendor/Supplier (Optional)"
            outlined
            dense
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="store" />
            </template>
          </q-input>

          <!-- Receipt/Invoice Number -->
          <q-input
            v-model="formData.receipt_number"
            label="Receipt/Invoice Number (Optional)"
            outlined
            dense
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="receipt" />
            </template>
          </q-input>

          <!-- Payment Status -->
          <q-select
            v-model="formData.payment_status"
            :options="paymentStatusOptions"
            label="Payment Status *"
            outlined
            dense
            :rules="[(val) => !!val || 'Payment status is required for expenses']"
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="paid" />
            </template>
          </q-select>
        </template>

        <!-- Description -->
        <q-input
          v-model="formData.description"
          label="Description *"
          outlined
          dense
          type="textarea"
          rows="3"
          :rules="[(val) => !!val || 'Description is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="description" />
          </template>
        </q-input>

        <!-- Status -->
        <q-select
          v-model="formData.status"
          :options="statusOptions"
          label="Status"
          outlined
          dense
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="flag" />
          </template>
        </q-select>

        <!-- Form Actions -->
        <div class="row q-gutter-sm justify-end q-mt-md">
          <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
          <q-btn
            type="submit"
            :label="isEditMode ? 'Update' : 'Save'"
            color="primary"
            :loading="financeStore.isLoading"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { format } from 'date-fns';
import { useFinanceStore } from '../stores/finance-store';

// Special value for "Other" option
const OTHER_SUBCATEGORY_VALUE = '__OTHER__';

const props = defineProps({
  type: {
    type: String,
    default: 'income',
    validator: (val) => ['income', 'expense'].includes(val),
  },
  initialData: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['saved', 'cancelled']);

const $q = useQuasar();
const financeStore = useFinanceStore();

// Form data (Story 2.3: Updated to use category_id)
const formData = ref({
  amount: null,
  category_id: null, // Story 2.3: Changed from category string to category_id
  source_module: '',
  payment_method: '',
  date: format(new Date(), 'yyyy-MM-dd'), // Default to today (Local Time)
  funding_source_id: null,
  description: '',
  status: 'completed',
  // Subcategory fields (Story 2.3: Dropdown + Other)
  subcategory: '',
  customSubcategory: '', // For "Other" option
  // Expense-specific fields
  vendor: '',
  receipt_number: '',
  payment_status: 'paid',
});

// Track if "Other" subcategory is selected
const showCustomSubcategory = computed(
  () => formData.value.subcategory === OTHER_SUBCATEGORY_VALUE,
);

// Load categories on mount
onMounted(async () => {
  await financeStore.fetchCategories();
});

// Computed properties
const isEditMode = computed(() => !!props.initialData?.$id);

const formTitle = computed(() => {
  if (isEditMode.value) {
    return `Edit ${props.type === 'income' ? 'Income' : 'Expense'}`;
  }
  return `Record ${props.type === 'income' ? 'Income' : 'Expense'}`;
});

// Card style - responsive width
const cardStyle = computed(() => {
  if ($q.screen.lt.sm) {
    return 'width: 100%; height: 100%;';
  }
  return 'min-width: 500px; max-width: 600px;';
});

// Category options based on transaction type (Story 2.3: Dynamic from database)
const categoryOptions = computed(() => {
  const categories =
    props.type === 'income' ? financeStore.incomeCategories : financeStore.expenseCategories;

  return categories.map((cat) => ({
    label: cat.name,
    value: cat.$id,
  }));
});

// Subcategory options based on selected category
const subcategoryOptions = computed(() => {
  if (!formData.value.category_id) return [];

  const category = financeStore.getCategoryById(formData.value.category_id);
  if (!category || !category.subcategories) return [];

  return category.subcategories.map((sub) => ({
    label: sub,
    value: sub,
  }));
});

// Subcategory options with "Other" option appended
const subcategoryOptionsWithOther = computed(() => {
  const options = [...subcategoryOptions.value];
  if (options.length > 0) {
    options.push({ label: 'Other (Custom)', value: OTHER_SUBCATEGORY_VALUE });
  }
  return options;
});

// Handle category change - reset subcategory
function onCategoryChange() {
  formData.value.subcategory = '';
  formData.value.customSubcategory = '';
}

// Handle subcategory change
function onSubcategoryChange(value) {
  if (value !== OTHER_SUBCATEGORY_VALUE) {
    formData.value.customSubcategory = '';
  }
}

// Funding source options for dropdown
const fundingSourceOptions = computed(() => {
  return financeStore.fundingSources.map((source) => ({
    label: `${source.name} (Balance: ${formatCurrency(source.current_balance)})`,
    value: source.$id,
  }));
});

// Status options
const statusOptions = ['pending', 'completed', 'cancelled'];

// Payment status options (for expenses)
const paymentStatusOptions = [
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Partial', value: 'partial' },
];

// Funding source hint based on transaction type
const fundingSourceHint = computed(() => {
  return props.type === 'expense'
    ? 'Select the fund this expense will be deducted from'
    : 'Select if this income is associated with a specific fund';
});

// Format currency for display
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Watch for initialData changes (edit mode) - Story 2.3: Updated for category_id
watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      // Determine if subcategory is a predefined one or custom
      const category = newData.category_id
        ? financeStore.getCategoryById(newData.category_id)
        : null;
      const predefinedSubcategories = category?.subcategories || [];
      const isCustomSubcategory =
        newData.subcategory && !predefinedSubcategories.includes(newData.subcategory);

      formData.value = {
        amount: newData.amount,
        category_id: newData.category_id || null, // Story 2.3: Use category_id
        source_module: newData.source_module,
        payment_method: newData.payment_method,
        date: newData.date ? newData.date.split('T')[0] : '',
        funding_source_id: newData.funding_source_id || null,
        description: newData.description,
        status: newData.status || 'completed',
        // Subcategory handling
        subcategory: isCustomSubcategory ? OTHER_SUBCATEGORY_VALUE : newData.subcategory || '',
        customSubcategory: isCustomSubcategory ? newData.subcategory : '',
        // Expense-specific fields
        vendor: newData.vendor || '',
        receipt_number: newData.receipt_number || '',
        payment_status: newData.payment_status || 'paid',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

// Reset form to defaults (Story 2.3: Updated for category_id)
function resetForm() {
  formData.value = {
    amount: null,
    category_id: null, // Story 2.3: Use category_id
    source_module: '',
    payment_method: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    funding_source_id: null,
    description: '',
    status: 'completed',
    // Subcategory fields
    subcategory: '',
    customSubcategory: '',
    // Expense-specific fields
    vendor: '',
    receipt_number: '',
    payment_status: 'paid',
  };
}

// Handle form submission (Story 2.3: Updated for category_id and subcategory)
async function handleSubmit() {
  // Determine final subcategory value
  let finalSubcategory = formData.value.subcategory;
  if (formData.value.subcategory === OTHER_SUBCATEGORY_VALUE) {
    finalSubcategory = formData.value.customSubcategory;
  }

  // Prepare data for submission
  const submitData = {
    type: props.type,
    amount: formData.value.amount,
    category_id: formData.value.category_id, // Story 2.3: Use category_id relationship
    source_module: formData.value.source_module,
    payment_method: formData.value.payment_method,
    date: new Date(formData.value.date).toISOString(),
    funding_source_id: formData.value.funding_source_id || null,
    description: formData.value.description,
    status: formData.value.status,
    subcategory: finalSubcategory || null, // Story 2.3: Subcategory for all transaction types
  };

  // Add expense-specific fields only for expenses
  if (props.type === 'expense') {
    submitData.vendor = formData.value.vendor || null;
    submitData.receipt_number = formData.value.receipt_number || null;
    submitData.payment_status = formData.value.payment_status;
  }

  let result;
  if (isEditMode.value) {
    result = await financeStore.updateTransaction(props.initialData.$id, submitData);
  } else {
    result = await financeStore.createTransaction(submitData);
  }

  if (result.success) {
    resetForm();
    emit('saved', result.data);
  }
}

// Handle cancel
function handleCancel() {
  resetForm();
  emit('cancelled');
}
</script>
