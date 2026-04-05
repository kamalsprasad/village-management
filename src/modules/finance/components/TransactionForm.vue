<template>
  <q-card :style="cardStyle">
    <q-card-section>
      <div class="text-h6">{{ formTitle }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-form @submit="handleSubmit">
        <!-- Story 2.4: Amount Funded (primary input for all transactions) -->
        <q-input
          v-model.number="formData.amount_funded"
          :label="props.type === 'income' ? 'Amount (ZMW) *' : 'Amount Funded (ZMW) *'"
          type="number"
          step="0.01"
          min="0.01"
          outlined
          dense
          :rules="amountFundedRules"
          :error="hasInsufficientFunds"
          :error-message="insufficientFundsMessage"
          class="q-mb-md"
          @update:model-value="onAmountFundedChange"
        >
          <template #prepend>
            <q-icon name="payments" />
          </template>
          <template v-if="props.type === 'expense' && formData.funding_source_id" #hint>
            <span :class="hasInsufficientFunds ? 'text-negative' : 'text-grey-7'">
              Available: {{ formatCurrency(selectedFundingSourceBalance) }}
            </span>
          </template>
        </q-input>

        <!-- Story 2.4: Partial Funding (Expense only) -->
        <template v-if="props.type === 'expense'">
          <!-- Checkbox to enable different amount needed -->
          <q-checkbox
            v-model="formData.differentAmountNeeded"
            label="Different amount needed (partial funding)"
            dense
            class="q-mb-sm"
          />

          <!-- Amount Needed (shown when checkbox is checked) -->
          <q-input
            v-if="formData.differentAmountNeeded"
            v-model.number="formData.amount_needed"
            label="Total Amount Needed (ZMW) *"
            type="number"
            step="0.01"
            :min="formData.amount_funded || 0.01"
            outlined
            dense
            :rules="[
              (val) => !!val || 'Amount needed is required',
              (val) => val >= formData.amount_funded || 'Must be >= amount funded',
            ]"
            class="q-mb-md"
            hint="Total expense amount. You can fund the remaining later."
          >
            <template #prepend>
              <q-icon name="shopping_cart" />
            </template>
          </q-input>
        </template>

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

        <!-- Story 2.7: Add to Inventory Section (expense only, eligible categories) -->
        <template v-if="props.type === 'expense'">
          <!-- Edit mode: show existing linked inventory item (read-only) -->
          <q-banner
            v-if="isEditMode && linkedInventoryItem"
            rounded
            class="bg-blue-1 text-dark q-mb-md"
          >
            <template #avatar>
              <q-icon name="inventory_2" color="primary" />
            </template>
            <div class="text-weight-medium">
              Linked Inventory Item: {{ linkedInventoryItem.item_name }}
            </div>
            <div class="text-caption">
              {{ linkedInventoryItem.quantity }} {{ linkedInventoryItem.unit }} &bull;
              {{ inventoryStore.getStatusLabel(linkedInventoryItem.status) }}
            </div>
            <template #action>
              <q-btn
                flat
                dense
                label="View Item"
                color="primary"
                icon="open_in_new"
                @click="router.push(`/inventory/${linkedInventoryItem.$id}`)"
              />
            </template>
          </q-banner>

          <!-- Edit mode: loading check for linked inventory -->
          <div v-else-if="isEditMode && isCheckingLinkedInventory" class="q-mb-md">
            <q-skeleton type="rect" height="48px" />
          </div>

          <!-- Create mode (or edit with no linked item): show checkbox + fields -->
          <template v-if="showInventoryOption && !linkedInventoryItem">
            <q-checkbox v-model="addToInventory" label="Add to Inventory" dense class="q-mb-sm">
              <q-tooltip> Automatically create an inventory item from this purchase </q-tooltip>
            </q-checkbox>

            <!-- Inventory fields (shown when checkbox is checked) -->
            <div v-if="addToInventory" class="q-pl-lg q-mb-md">
              <q-banner rounded dense class="bg-grey-2 q-mb-sm">
                <template #avatar>
                  <q-icon name="info" color="grey-7" size="xs" />
                </template>
                <span class="text-caption">
                  An inventory item will be created when this expense is saved. Unit cost will be
                  calculated as Amount ÷ Quantity.
                </span>
              </q-banner>

              <q-input
                v-model="inventoryItemName"
                label="Item Name *"
                outlined
                dense
                maxlength="255"
                :rules="[(val) => !!val || 'Item name is required for inventory']"
                class="q-mb-sm"
                :hint="suggestedItemName ? `Suggestion: ${suggestedItemName}` : ''"
              >
                <template #prepend>
                  <q-icon name="label" />
                </template>
              </q-input>

              <div class="row q-col-gutter-sm q-mb-sm">
                <div class="col-6">
                  <q-input
                    v-model.number="inventoryQuantity"
                    label="Quantity *"
                    type="number"
                    outlined
                    dense
                    min="1"
                    :rules="[
                      (val) => (val !== null && val !== undefined) || 'Quantity is required',
                      (val) => val >= 1 || 'Quantity must be at least 1',
                      (val) => Number.isInteger(val) || 'Must be a whole number',
                    ]"
                  >
                    <template #prepend>
                      <q-icon name="numbers" />
                    </template>
                  </q-input>
                </div>
                <div class="col-6">
                  <q-select
                    v-model="inventoryUnit"
                    :options="inventoryUnitOptions"
                    label="Unit *"
                    outlined
                    dense
                    emit-value
                    map-options
                    :rules="[(val) => !!val || 'Unit is required']"
                  >
                    <template #prepend>
                      <q-icon name="straighten" />
                    </template>
                  </q-select>
                </div>
              </div>

              <q-input
                v-model.number="inventoryReorderThreshold"
                label="Reorder Threshold"
                type="number"
                outlined
                dense
                min="0"
                :rules="[
                  (val) => (val !== null && val !== undefined) || 'Reorder threshold is required',
                  (val) => val >= 0 || 'Reorder threshold must be 0 or greater',
                ]"
                hint="Alert when stock falls below this level"
                class="q-mb-sm"
              >
                <template #prepend>
                  <q-icon name="notification_important" />
                </template>
              </q-input>

              <!-- Unit cost preview -->
              <q-banner
                v-if="formData.amount_funded && inventoryQuantity"
                rounded
                dense
                class="bg-green-1 text-dark q-mb-sm"
              >
                <template #avatar>
                  <q-icon name="calculate" color="positive" size="xs" />
                </template>
                <span class="text-caption">
                  Unit cost: {{ formatCurrency(formData.amount_funded / inventoryQuantity) }} ({{
                    formatCurrency(formData.amount_funded)
                  }}
                  ÷ {{ inventoryQuantity }})
                </span>
              </q-banner>
            </div>
          </template>
        </template>

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
import { useRouter } from 'vue-router';
import { format } from 'date-fns';
import { useFinanceStore } from '../stores/finance-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { isInventoryEligible, getInventoryTypeForCategory } from 'src/utils/inventory-categories';

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
const router = useRouter();
const financeStore = useFinanceStore();
const inventoryStore = useInventoryStore();

// Story 2.7: Inventory integration state
const addToInventory = ref(false);
const inventoryItemName = ref('');
const inventoryQuantity = ref(null);
const inventoryUnit = ref('');
const inventoryReorderThreshold = ref(10);
const linkedInventoryItem = ref(null); // For edit mode: existing linked item
const isCheckingLinkedInventory = ref(false);

// Story 2.7: Unit options (same as InventoryFormPage.vue)
const inventoryUnitOptions = [
  { label: 'Kilograms (kg)', value: 'kg' },
  { label: 'Liters (L)', value: 'liters' },
  { label: 'Units/Pieces', value: 'units' },
  { label: 'Bags', value: 'bags' },
  { label: 'Boxes', value: 'boxes' },
  { label: 'Bottles', value: 'bottles' },
  { label: 'Packets', value: 'packets' },
];

// Form data (Story 2.4: Updated for partial funding)
const formData = ref({
  amount_funded: null, // Story 2.4: Primary amount input
  amount_needed: null, // Story 2.4: Total amount needed (for partial funding)
  differentAmountNeeded: false, // Story 2.4: Checkbox for partial funding
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

// Load categories and funding sources on mount
onMounted(async () => {
  await Promise.all([financeStore.fetchCategories(), financeStore.fetchFundingSources()]);
});

// Story 2.4: Selected funding source balance
const selectedFundingSourceBalance = computed(() => {
  if (!formData.value.funding_source_id) return 0;
  const source = financeStore.getFundingSourceById(formData.value.funding_source_id);
  return source ? source.current_balance : 0;
});

const effectiveFundingSourceBalance = computed(() => {
  let availableBalance = selectedFundingSourceBalance.value;

  if (
    props.type === 'expense' &&
    isEditMode.value &&
    props.initialData?.type === 'expense' &&
    props.initialData?.status !== 'cancelled' &&
    props.initialData?.funding_source_id &&
    props.initialData.funding_source_id === formData.value.funding_source_id
  ) {
    availableBalance += parseFloat(
      props.initialData.amount_funded || props.initialData.amount || 0,
    );
  }

  return availableBalance;
});

// Story 2.4: Check if amount exceeds funding source balance (hard block)
const hasInsufficientFunds = computed(() => {
  if (props.type !== 'expense') return false;
  if (!formData.value.funding_source_id) return false;
  if (!formData.value.amount_funded) return false;

  return formData.value.amount_funded > effectiveFundingSourceBalance.value;
});

// Story 2.4: Insufficient funds error message
const insufficientFundsMessage = computed(() => {
  if (!hasInsufficientFunds.value) return '';
  const shortfall = formData.value.amount_funded - effectiveFundingSourceBalance.value;
  return `Insufficient funds. Short by ${formatCurrency(shortfall)}`;
});

// Story 2.4: Amount funded validation rules
const amountFundedRules = computed(() => [
  (val) => !!val || 'Amount is required',
  (val) => val > 0 || 'Amount must be positive',
  () => !hasInsufficientFunds.value || insufficientFundsMessage.value,
]);

// Story 2.4: Handle amount funded change - sync amount_needed if not different
function onAmountFundedChange(value) {
  if (!formData.value.differentAmountNeeded) {
    formData.value.amount_needed = value;
  }
}

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

// Story 2.7: Resolve selected category name for inventory eligibility
const selectedCategoryName = computed(() => {
  if (!formData.value.category_id) return '';
  const category = financeStore.getCategoryById(formData.value.category_id);
  return category ? category.name : '';
});

// Story 2.7: Check if current category is inventory-eligible (expense only)
const showInventoryOption = computed(() => {
  if (props.type !== 'expense') return false;
  if (!selectedCategoryName.value) return false;
  return isInventoryEligible(selectedCategoryName.value);
});

// Story 2.7: Auto-generate suggested inventory item name
const suggestedItemName = computed(() => {
  const catName = selectedCategoryName.value;
  const sub = formData.value.subcategory;
  if (catName && sub && sub !== '__OTHER__') {
    return `${catName} - ${sub}`;
  }
  return '';
});

// Handle category change - reset subcategory and inventory fields
function onCategoryChange() {
  formData.value.subcategory = '';
  formData.value.customSubcategory = '';
  // Story 2.7: Reset inventory fields when category changes
  addToInventory.value = false;
  resetInventoryFields();
}

// Story 2.7: Reset inventory fields to defaults
function resetInventoryFields() {
  inventoryItemName.value = '';
  inventoryQuantity.value = null;
  inventoryUnit.value = '';
  inventoryReorderThreshold.value = 10;
}

// Handle subcategory change
function onSubcategoryChange(value) {
  if (value !== OTHER_SUBCATEGORY_VALUE) {
    formData.value.customSubcategory = '';
  }
  // Story 2.7: Auto-suggest item name when subcategory changes
  if (addToInventory.value && suggestedItemName.value && !inventoryItemName.value) {
    inventoryItemName.value = suggestedItemName.value;
  }
}

// Story 2.7: Prefill or clear inventory fields when checkbox changes
watch(addToInventory, (enabled) => {
  if (enabled) {
    if (!inventoryItemName.value && suggestedItemName.value) {
      inventoryItemName.value = suggestedItemName.value;
    }
    return;
  }

  resetInventoryFields();
});

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

// Watch for initialData changes (edit mode) - Story 2.4: Updated for amount_funded/amount_needed
watch(
  () => props.initialData,
  async (newData) => {
    if (newData) {
      // Determine if subcategory is a predefined one or custom
      const category = newData.category_id
        ? financeStore.getCategoryById(newData.category_id)
        : null;
      const predefinedSubcategories = category?.subcategories || [];
      const isCustomSubcategory =
        newData.subcategory && !predefinedSubcategories.includes(newData.subcategory);

      // Story 2.4: Check if this has different amount needed
      const amountFunded = newData.amount_funded || newData.amount || 0;
      const amountNeeded = newData.amount_needed || amountFunded;
      const hasDifferentAmount = amountNeeded > amountFunded;

      formData.value = {
        amount_funded: amountFunded, // Story 2.4: Use amount_funded
        amount_needed: amountNeeded, // Story 2.4: Use amount_needed
        differentAmountNeeded: hasDifferentAmount,
        category_id: newData.category_id || null,
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

      // Story 2.7: Check for existing linked inventory item in edit mode
      if (newData.$id && props.type === 'expense') {
        isCheckingLinkedInventory.value = true;
        try {
          const linked = await inventoryStore.fetchItemsBySourceRefs([newData.$id]);
          linkedInventoryItem.value = linked[newData.$id] || null;
        } catch (err) {
          console.error('Failed to check linked inventory:', err);
          linkedInventoryItem.value = null;
        } finally {
          isCheckingLinkedInventory.value = false;
        }
      }
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

// Reset form to defaults (Story 2.4: Updated for partial funding)
function resetForm() {
  formData.value = {
    amount_funded: null, // Story 2.4: Use amount_funded
    amount_needed: null, // Story 2.4: Use amount_needed
    differentAmountNeeded: false,
    category_id: null,
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
  // Story 2.7: Reset inventory state
  addToInventory.value = false;
  resetInventoryFields();
  linkedInventoryItem.value = null;
}

// Handle form submission (Story 2.4: Updated for partial funding, Story 2.7: Inventory integration)
async function handleSubmit() {
  // Story 2.4: Block submission if insufficient funds
  if (hasInsufficientFunds.value) {
    $q.notify({
      type: 'negative',
      message: insufficientFundsMessage.value,
    });
    return;
  }

  // Determine final subcategory value
  let finalSubcategory = formData.value.subcategory;
  if (formData.value.subcategory === OTHER_SUBCATEGORY_VALUE) {
    finalSubcategory = formData.value.customSubcategory;
  }

  // Story 2.4: Calculate amount_needed
  // If differentAmountNeeded is checked, use the entered amount_needed
  // Otherwise, amount_needed equals amount_funded
  const amountFunded = formData.value.amount_funded;
  const amountNeeded = formData.value.differentAmountNeeded
    ? formData.value.amount_needed
    : amountFunded;

  // Prepare data for submission
  const submitData = {
    type: props.type,
    amount_funded: amountFunded, // Story 2.4: Use amount_funded
    amount_needed: amountNeeded, // Story 2.4: Use amount_needed
    category_id: formData.value.category_id,
    source_module: formData.value.source_module,
    payment_method: formData.value.payment_method,
    date: new Date(formData.value.date).toISOString(),
    funding_source_id: formData.value.funding_source_id || null,
    description: formData.value.description,
    status: formData.value.status,
    subcategory: finalSubcategory || null,
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
    // Story 2.7: Auto-create inventory item if checkbox is checked
    if (
      addToInventory.value &&
      showInventoryOption.value &&
      (!isEditMode.value || !linkedInventoryItem.value)
    ) {
      const unitCost = amountFunded / inventoryQuantity.value;
      const itemType = getInventoryTypeForCategory(selectedCategoryName.value);
      const descSnippet = (formData.value.description || '').substring(0, 100);

      try {
        const invResult = await inventoryStore.createItem({
          item_name: inventoryItemName.value,
          item_type: itemType,
          quantity: inventoryQuantity.value,
          unit: inventoryUnit.value,
          unit_cost: Math.round(unitCost * 100) / 100,
          transaction_id: result.data.$id,
          reorder_threshold: inventoryReorderThreshold.value,
          notes: `Auto-created from expense: ${descSnippet}`,
        });

        if (invResult.success) {
          $q.notify({
            type: 'positive',
            message: `Expense recorded and inventory item "${inventoryItemName.value}" created`,
          });
        } else {
          $q.notify({
            type: 'warning',
            message: 'Expense saved, but inventory creation failed. Please add the item manually.',
            timeout: 5000,
          });
        }
      } catch (err) {
        console.error('Inventory auto-creation failed:', err);
        $q.notify({
          type: 'warning',
          message: 'Expense saved, but inventory creation failed. Please add the item manually.',
          timeout: 5000,
        });
      }
    }

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
