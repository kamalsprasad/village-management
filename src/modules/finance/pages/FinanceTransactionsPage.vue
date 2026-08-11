<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="text-h5 q-my-none">Finance Transactions</h4>
          <p class="text-grey-7 q-mb-none">Record and manage village income and expenses</p>
        </div>
        <div class="col-auto q-gutter-sm">
          <q-btn
            v-if="isClient && hasPermission('finance:write')"
            color="positive"
            icon="add"
            label="Record Income"
            @click="openAddDialog('income')"
          >
            <q-tooltip>Log a new income transaction.</q-tooltip>
          </q-btn>
          <q-btn
            v-if="isClient && hasPermission('finance:write')"
            color="negative"
            icon="remove"
            label="Record Expense"
            @click="openAddDialog('expense')"
          >
            <q-tooltip>Log a new expense transaction.</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Filter Toolbar -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row q-col-gutter-md items-center">
            <!-- Type Filter (Income/Expense) -->
            <div class="col-12 col-md-3">
              <q-btn-toggle
                v-model="selectedType"
                toggle-color="primary"
                :options="[
                  { label: 'All', value: null },
                  { label: 'Income', value: 'income' },
                  { label: 'Expense', value: 'expense' },
                ]"
                spread
                unelevated
                @update:model-value="applyFilters"
              />
            </div>

            <!-- Category Filter -->
            <div class="col-12 col-md-4">
              <q-select
                v-model="selectedCategory"
                :options="categoryOptions"
                outlined
                dense
                clearable
                placeholder="Filter by category..."
                option-label="name"
                emit-value
                map-options
                @update:model-value="applyFilters"
              >
                <template #prepend>
                  <q-icon name="category" />
                </template>
              </q-select>
            </div>

            <!-- Date Range -->
            <div class="col-12 col-md-3">
              <q-input v-model="dateRange" outlined dense placeholder="Date range..." readonly>
                <template #prepend>
                  <q-icon name="event" />
                </template>
                <template #append>
                  <q-icon name="close" class="cursor-pointer" @click="clearDateRange" />
                </template>
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="dateRangeModel" range @update:model-value="onDateRangeChange">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-input>
            </div>

            <!-- Status Filter -->
            <div class="col-12 col-md-2">
              <q-select
                v-model="selectedStatus"
                :options="statusFilterOptions"
                outlined
                dense
                clearable
                placeholder="Status..."
                emit-value
                map-options
                @update:model-value="applyFilters"
              >
                <template #prepend>
                  <q-icon name="flag" />
                </template>
              </q-select>
            </div>

            <!-- Clear Filters -->
            <div class="col-auto">
              <q-btn outline color="primary" label="Clear" icon="clear" @click="clearAllFilters" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Story 2.5: Loan Portfolio Widget -->
      <LoanPortfolioWidget v-if="settingsStore.lendingEnabled" />

      <!-- Loading State -->
      <div v-if="financeStore.isLoading && financeStore.transactions.length === 0" class="q-pa-md">
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
      </div>

      <!-- Empty-State Banner (Story 5.11) -->
      <q-banner
        v-else-if="financeStore.pagination.total === 0"
        class="bg-info text-white q-mb-md"
        rounded
      >
        <template #avatar>
          <q-icon name="info" color="white" />
        </template>
        No transactions recorded. Record your first income or expense.
        <template #action>
          <q-btn
            v-if="isClient && hasPermission('finance:write')"
            flat
            color="white"
            label="Record Income"
            @click="openAddDialog('income')"
          />
        </template>
      </q-banner>

      <!-- Transactions Table -->
      <q-card v-else flat bordered>
        <q-table
          :rows="financeStore.paginatedTransactions"
          :columns="columns"
          row-key="$id"
          flat
          :loading="financeStore.isLoading"
          hide-pagination
          :pagination="{ rowsPerPage: 0 }"
          :row-class="getRowClass"
        >
          <!-- Custom column: type (Story 2.4: Add supporting transaction badge, Story 2.7: Inventory link) -->
          <template #body-cell-type="props">
            <q-td :props="props">
              <div class="row items-center no-wrap q-gutter-xs">
                <q-chip
                  :color="props.value === 'income' ? 'positive' : 'negative'"
                  text-color="white"
                  dense
                  size="sm"
                >
                  {{ props.value === 'income' ? 'Income' : 'Expense' }}
                </q-chip>
                <!-- Story 2.7: Inventory link indicator -->
                <q-btn
                  v-if="getLinkedInventory(props.row.$id)"
                  flat
                  dense
                  round
                  icon="inventory_2"
                  color="teal"
                  size="xs"
                  aria-label="View linked inventory item"
                  @click.stop="router.push(`/inventory/${getLinkedInventory(props.row.$id).$id}`)"
                >
                  <q-tooltip>
                    Linked inventory: {{ getLinkedInventory(props.row.$id).item_name }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>

          <!-- Custom column: amount (Story 2.4: Show amount_funded vs amount_needed) -->
          <template #body-cell-amount="props">
            <q-td :props="props">
              <div :class="props.row.type === 'income' ? 'text-positive' : 'text-negative'">
                {{ props.row.type === 'income' ? '+' : '-' }}
                {{ formatCurrency(props.row.amount_funded) }}
              </div>
              <div
                v-if="props.row.amount_funded < props.row.amount_needed"
                class="text-caption text-warning"
              >
                of {{ formatCurrency(props.row.amount_needed) }}
              </div>
              <q-badge
                v-if="props.row.type === 'expense'"
                class="q-mt-xs"
                :color="getFundingStatusColor(props.row)"
                :label="getFundingStatusLabel(props.row)"
              />
            </q-td>
          </template>

          <!-- Custom column: category -->
          <template #body-cell-category="props">
            <q-td :props="props">
              {{ getCategoryName(props.row.category_id) }}
            </q-td>
          </template>

          <!-- Custom column: date -->
          <template #body-cell-date="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <!-- Custom column: status -->
          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="getStatusColor(props.value)" :label="capitalizeFirst(props.value)" />
            </q-td>
          </template>

          <!-- Custom column: actions -->
          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                round
                icon="visibility"
                color="primary"
                size="sm"
                @click="viewTransaction(props.row)"
              >
                <q-tooltip>View Details</q-tooltip>
              </q-btn>
              <q-btn
                v-if="hasPermission('finance:write') && props.row.status !== 'cancelled'"
                flat
                dense
                round
                icon="edit"
                color="secondary"
                size="sm"
                @click="editTransaction(props.row)"
              >
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <!-- Story 2.4: Add Funding button for underfunded transactions -->
              <q-btn
                v-if="hasPermission('finance:write') && isUnderfunded(props.row)"
                flat
                dense
                round
                icon="add_circle"
                color="positive"
                size="sm"
                @click="openAddFundingDialog(props.row)"
              >
                <q-tooltip>Add Funding</q-tooltip>
              </q-btn>
              <q-btn
                v-if="hasPermission('finance:write') && props.row.status !== 'cancelled'"
                flat
                dense
                round
                icon="delete"
                color="negative"
                size="sm"
                @click="confirmDelete(props.row)"
              >
                <q-tooltip>Delete</q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="full-width row flex-center text-grey q-pa-lg">
              <q-icon name="account_balance_wallet" size="48px" class="q-mb-md" />
              <div class="text-h6">No transactions found</div>
              <div class="text-caption">
                {{
                  hasActiveFilters
                    ? 'Try adjusting your filters'
                    : 'Record your first transaction to get started'
                }}
              </div>
            </div>
          </template>
        </q-table>

        <!-- Pagination Controls -->
        <q-separator />
        <div class="row items-center justify-between q-pa-md">
          <div class="col-auto">
            <div class="row items-center q-gutter-sm">
              <span class="text-caption">Rows per page:</span>
              <q-select
                v-model="itemsPerPage"
                :options="[10, 25, 50, 100]"
                dense
                outlined
                style="width: 80px"
                @update:model-value="changeItemsPerPage"
              />
            </div>
          </div>
          <div class="col-auto">
            <span class="text-caption q-mr-md">
              {{ paginationLabel }}
            </span>
            <q-btn
              flat
              dense
              round
              icon="chevron_left"
              :disable="!financeStore.hasPreviousPage"
              @click="financeStore.previousPage()"
            />
            <q-btn
              flat
              dense
              round
              icon="chevron_right"
              :disable="!financeStore.hasNextPage"
              @click="financeStore.nextPage()"
            />
          </div>
        </div>
      </q-card>

      <!-- Add Transaction Dialog -->
      <q-dialog
        v-model="showAddDialog"
        persistent
        :maximized="$q.screen.lt.sm"
        transition-show="slide-up"
        transition-hide="slide-down"
      >
        <transaction-form
          :type="dialogTransactionType"
          @saved="handleSaved"
          @cancelled="handleCancelled"
        />
      </q-dialog>

      <!-- View Transaction Dialog -->
      <q-dialog v-model="showViewDialog">
        <q-card style="min-width: 400px">
          <q-card-section>
            <div class="text-h6">Transaction Details</div>
          </q-card-section>

          <q-card-section v-if="selectedTransaction" class="q-pt-none">
            <q-list>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Type</q-item-label>
                  <q-item-label>
                    <q-chip
                      :color="selectedTransaction.type === 'income' ? 'positive' : 'negative'"
                      text-color="white"
                      dense
                      size="sm"
                    >
                      {{ capitalizeFirst(selectedTransaction.type) }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Amount</q-item-label>
                  <q-item-label
                    :class="
                      selectedTransaction.type === 'income' ? 'text-positive' : 'text-negative'
                    "
                    class="text-h6"
                  >
                    {{ selectedTransaction.type === 'income' ? '+' : '-' }}
                    {{ formatCurrency(selectedTransaction.amount_funded) }}
                  </q-item-label>
                  <q-item-label
                    v-if="selectedTransaction.amount_funded < selectedTransaction.amount_needed"
                    caption
                    class="text-warning"
                  >
                    of {{ formatCurrency(selectedTransaction.amount_needed) }} required
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Category</q-item-label>
                  <q-item-label>{{
                    getCategoryName(selectedTransaction.category_id)
                  }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Source Module</q-item-label>
                  <q-item-label>{{ selectedTransaction.source_module }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Payment Method</q-item-label>
                  <q-item-label>{{ selectedTransaction.payment_method }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Date</q-item-label>
                  <q-item-label>{{ formatDate(selectedTransaction.date) }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Description</q-item-label>
                  <q-item-label>{{ selectedTransaction.description }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selectedTransaction.funding_source_id">
                <q-item-section>
                  <q-item-label caption>Funding Source</q-item-label>
                  <q-item-label>{{
                    getFundingSourceName(selectedTransaction.funding_source_id)
                  }}</q-item-label>
                  <q-item-label caption>
                    Balance:
                    {{
                      formatCurrency(getFundingSourceBalance(selectedTransaction.funding_source_id))
                    }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selectedTransaction.amount_funded < selectedTransaction.amount_needed">
                <q-item-section>
                  <q-item-label caption>Funding Status</q-item-label>
                  <q-item-label class="text-warning">
                    Underfunded:
                    {{
                      formatCurrency(
                        selectedTransaction.amount_needed - selectedTransaction.amount_funded,
                      )
                    }}
                    remaining
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selectedTransaction.subcategory">
                <q-item-section>
                  <q-item-label caption>Subcategory</q-item-label>
                  <q-item-label>{{ selectedTransaction.subcategory }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selectedTransaction.receipt_number">
                <q-item-section>
                  <q-item-label caption>Receipt/Invoice Number</q-item-label>
                  <q-item-label>{{ selectedTransaction.receipt_number }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="selectedTransaction.payment_status">
                <q-item-section>
                  <q-item-label caption>Payment Status</q-item-label>
                  <q-item-label>
                    <q-badge
                      :color="getPaymentStatusColor(selectedTransaction.payment_status)"
                      :label="capitalizeFirst(selectedTransaction.payment_status)"
                    />
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section>
                  <q-item-label caption>Status</q-item-label>
                  <q-item-label>
                    <q-badge
                      :color="getStatusColor(selectedTransaction.status)"
                      :label="capitalizeFirst(selectedTransaction.status)"
                    />
                  </q-item-label>
                </q-item-section>
              </q-item>

              <!-- Story 2.7: Linked inventory item -->
              <q-item v-if="selectedTransaction && getLinkedInventory(selectedTransaction.$id)">
                <q-item-section>
                  <q-item-label caption>Linked Inventory Item</q-item-label>
                  <q-item-label>
                    <q-chip
                      color="teal"
                      text-color="white"
                      dense
                      size="sm"
                      icon="inventory_2"
                      clickable
                      @click="
                        router.push(`/inventory/${getLinkedInventory(selectedTransaction.$id).$id}`)
                      "
                    >
                      {{ getLinkedInventory(selectedTransaction.$id).item_name }}
                    </q-chip>
                  </q-item-label>
                  <q-item-label caption>
                    {{ getLinkedInventory(selectedTransaction.$id).quantity }}
                    {{ getLinkedInventory(selectedTransaction.$id).unit }} &bull;
                    {{
                      inventoryStore.getStatusLabel(
                        getLinkedInventory(selectedTransaction.$id).status,
                      )
                    }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Close" color="primary" v-close-popup />
          </q-card-actions>
        </q-card>
      </q-dialog>

      <!-- Edit Transaction Dialog -->
      <q-dialog
        v-model="showEditDialog"
        persistent
        :maximized="$q.screen.lt.sm"
        transition-show="slide-up"
        transition-hide="slide-down"
      >
        <transaction-form
          v-if="editingTransaction"
          :type="editingTransaction.type"
          :initial-data="editingTransaction"
          @saved="handleEditSaved"
          @cancelled="handleEditCancelled"
        />
      </q-dialog>

      <!-- Story 2.4: Add Funding Dialog for underfunded transactions -->
      <q-dialog v-model="showAddFundingDialog" persistent>
        <add-funding-dialog
          v-if="transactionToFund"
          :transaction="transactionToFund"
          @saved="handleFundingAdded"
          @cancelled="showAddFundingDialog = false"
        />
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useRouter, useRoute } from 'vue-router';
import { format, parseISO } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';
import { useFinanceStore } from '../stores/finance-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useInventoryStore } from 'src/stores/inventory-store';
import { usePermissions } from 'src/composables/usePermissions';
import TransactionForm from '../components/TransactionForm.vue';
import AddFundingDialog from '../components/AddFundingDialog.vue';
import LoanPortfolioWidget from '../components/LoanPortfolioWidget.vue';

const $q = useQuasar();
const errorHandler = useErrorHandler();
const router = useRouter();
const route = useRoute();
const financeStore = useFinanceStore();
const settingsStore = useSettingsStore();
const inventoryStore = useInventoryStore();
const { hasPermission } = usePermissions();

const isClient = ref(false); // Track client-side hydration for SSR

// Story 2.7: Map of transactionId -> linked inventory item
const linkedInventoryMap = ref({});

const showAddDialog = ref(false);
const showViewDialog = ref(false);
const selectedTransaction = ref(null);
const itemsPerPage = ref(10);
const selectedType = ref(null);
const selectedCategory = ref(null);
const dateRangeModel = ref(null);
const dialogTransactionType = ref('income'); // Type for add dialog
const selectedStatus = ref(null);
const showEditDialog = ref(false);
const editingTransaction = ref(null);

// Story 2.4: Add Funding dialog state
const showAddFundingDialog = ref(false);
const transactionToFund = ref(null);

// Story 2.7: Fetch linked inventory items for current page of transactions
async function refreshLinkedInventory() {
  const transactions = financeStore.paginatedTransactions;
  const expenseIds = transactions.filter((t) => t.type === 'expense').map((t) => t.$id);

  if (expenseIds.length > 0) {
    linkedInventoryMap.value = await inventoryStore.fetchItemsBySourceRefs(expenseIds);
  } else {
    linkedInventoryMap.value = {};
  }
}

// Story 2.7: Get linked inventory item for a transaction
function getLinkedInventory(transactionId) {
  return linkedInventoryMap.value[transactionId] || null;
}

// Story 2.7: Watch for transaction list changes to refresh linked inventory
watch(
  () => financeStore.paginatedTransactions,
  () => {
    refreshLinkedInventory();
  },
);

// Helper function for category display
function getCategoryName(categoryId) {
  return financeStore.getCategoryName(categoryId);
}

// Helper functions for funding source display
function getFundingSourceName(fundingSourceId) {
  const source = financeStore.getFundingSourceById(fundingSourceId);
  return source ? source.name : 'Unknown';
}

function getFundingSourceBalance(fundingSourceId) {
  const source = financeStore.getFundingSourceById(fundingSourceId);
  return source ? source.current_balance : 0;
}

// Status filter options
const statusFilterOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

// Table columns definition (Story 2.4: Updated to use amount_funded)
const columns = [
  {
    name: 'date',
    required: true,
    label: 'Date',
    align: 'left',
    field: 'date',
    sortable: true,
  },
  {
    name: 'type',
    label: 'Type',
    align: 'left',
    field: 'type',
    sortable: true,
  },
  {
    name: 'category',
    label: 'Category',
    align: 'left',
    field: 'category',
    sortable: true,
  },
  {
    name: 'description',
    label: 'Description',
    align: 'left',
    field: 'description',
    style: 'max-width: 200px; overflow: hidden; text-overflow: ellipsis;',
  },
  {
    name: 'amount',
    label: 'Amount',
    align: 'right',
    field: (row) => row.amount_funded || row.amount, // Story 2.4: Use amount_funded
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    align: 'center',
    field: 'status',
  },
  {
    name: 'actions',
    label: 'Actions',
    align: 'center',
    field: 'actions',
  },
];

// Story 2.4: Check if a transaction is underfunded
function isUnderfunded(row) {
  if (row.type !== 'expense') return false;
  if (row.status === 'cancelled') return false;
  const amountFunded = row.amount_funded || 0;
  const amountNeeded = row.amount_needed || amountFunded;
  return amountFunded < amountNeeded;
}

function getFundingStatusLabel(row) {
  if (row.type !== 'expense') return 'N/A';
  return isUnderfunded(row) ? 'Partially Funded' : 'Fully Funded';
}

function getFundingStatusColor(row) {
  if (row.type !== 'expense') return 'grey';
  return isUnderfunded(row) ? 'warning' : 'positive';
}

// Story 2.4: Get row class for table styling
function getRowClass(row) {
  if (isUnderfunded(row)) {
    return 'bg-warning-1'; // Light yellow/warning background for underfunded
  }
  return '';
}

// Category options based on selected type
const categoryOptions = computed(() => {
  if (selectedType.value === 'income') {
    return financeStore.incomeCategories;
  } else if (selectedType.value === 'expense') {
    return financeStore.expenseCategories;
  }
  // Return all categories when no type filter
  return [...financeStore.incomeCategories, ...financeStore.expenseCategories];
});

// Date range display string
const dateRange = computed(() => {
  if (!dateRangeModel.value) return '';
  if (typeof dateRangeModel.value === 'string') {
    return formatDate(dateRangeModel.value);
  }
  if (dateRangeModel.value.from && dateRangeModel.value.to) {
    return `${formatDateShort(dateRangeModel.value.from)} - ${formatDateShort(dateRangeModel.value.to)}`;
  }
  return '';
});

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return (
    selectedType.value || selectedCategory.value || dateRangeModel.value || selectedStatus.value
  );
});

// Pagination label
const paginationLabel = computed(() => {
  const start =
    (financeStore.pagination.currentPage - 1) * financeStore.pagination.itemsPerPage + 1;
  const end = Math.min(
    financeStore.pagination.currentPage * financeStore.pagination.itemsPerPage,
    financeStore.pagination.total,
  );
  if (financeStore.pagination.total === 0) return '0 of 0';
  return `${start}-${end} of ${financeStore.pagination.total}`;
});

// Format currency (ZMW)
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date short (for date range)
function formatDateShort(dateString) {
  if (!dateString) return '';
  try {
    // Handle YYYY/MM/DD format from QDate
    const normalized = dateString.replace(/\//g, '-');
    return format(parseISO(normalized), 'dd/MM/yy');
  } catch {
    return dateString;
  }
}

// Capitalize first letter
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Get status color
function getStatusColor(status) {
  switch (status) {
    case 'completed':
      return 'positive';
    case 'pending':
      return 'warning';
    case 'cancelled':
      return 'negative';
    default:
      return 'grey';
  }
}

// Get payment status color (for expenses)
function getPaymentStatusColor(status) {
  switch (status) {
    case 'paid':
      return 'positive';
    case 'unpaid':
      return 'negative';
    case 'partial':
      return 'warning';
    default:
      return 'grey';
  }
}

// View transaction details
function viewTransaction(transaction) {
  selectedTransaction.value = transaction;
  showViewDialog.value = true;
}

// Edit transaction
function editTransaction(transaction) {
  editingTransaction.value = transaction;
  showEditDialog.value = true;
}

// Handle edit saved
function handleEditSaved() {
  showEditDialog.value = false;
  editingTransaction.value = null;
}

// Handle edit cancelled
function handleEditCancelled() {
  showEditDialog.value = false;
  editingTransaction.value = null;
}

// Story 2.4: Open Add Funding dialog
function openAddFundingDialog(transaction) {
  transactionToFund.value = transaction;
  showAddFundingDialog.value = true;
}

// Story 2.4: Handle funding added successfully
function handleFundingAdded() {
  showAddFundingDialog.value = false;
  transactionToFund.value = null;
  // Refresh transactions to show updated amounts
  financeStore.fetchTransactions(financeStore.pagination.currentPage, itemsPerPage.value);
  errorHandler.notifySuccess('Funding added successfully');
}

// Confirm delete transaction
function confirmDelete(transaction) {
  $q.dialog({
    title: 'Delete Transaction',
    message: `Are you sure you want to delete this ${transaction.type} transaction of ${formatCurrency(transaction.amount)}? This action will mark the transaction as cancelled.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    await financeStore.deleteTransaction(transaction.$id);
  });
}

// Handle date range change
function onDateRangeChange(value) {
  if (value && value.from && value.to) {
    // Convert to ISO format for API
    const fromDate = value.from.replace(/\//g, '-') + 'T00:00:00.000Z';
    const toDate = value.to.replace(/\//g, '-') + 'T23:59:59.999Z';
    financeStore.setDateRangeFilter(fromDate, toDate);
    financeStore.applyFilters();
  }
}

// Clear date range
function clearDateRange() {
  dateRangeModel.value = null;
  financeStore.setDateRangeFilter(null, null);
  financeStore.applyFilters();
}

// Apply filters
async function applyFilters() {
  financeStore.setTypeFilter(selectedType.value);
  // Handle category filter - selectedCategory can be an object (with $id) or null
  const categoryId = selectedCategory.value?.$id || null;
  financeStore.setCategoryFilter(categoryId);
  financeStore.setStatusFilter(selectedStatus.value);
  await financeStore.applyFilters();
}

// Clear all filters
async function clearAllFilters() {
  selectedType.value = null;
  selectedCategory.value = null;
  dateRangeModel.value = null;
  selectedStatus.value = null;
  financeStore.clearFilters();
  await financeStore.fetchTransactions(1, itemsPerPage.value);
}

// Change items per page
function changeItemsPerPage(newValue) {
  financeStore.changeItemsPerPage(newValue);
}

// Open add dialog with specific transaction type
function openAddDialog(type) {
  dialogTransactionType.value = type;
  showAddDialog.value = true;
}

// Handle form saved
function handleSaved() {
  showAddDialog.value = false;
}

// Handle form cancelled
function handleCancelled() {
  showAddDialog.value = false;
}

async function applyRouteQueryFilters() {
  const { type } = route.query;

  if (!type) {
    return;
  }

  selectedType.value = type === 'income' || type === 'expense' ? type : null;
  selectedCategory.value = null;
  selectedStatus.value = null;
  dateRangeModel.value = null;
  await applyFilters();
}

onMounted(async () => {
  isClient.value = true; // Enable client-side rendering after hydration
  // Load categories first (needed for display)
  await financeStore.fetchCategories();
  // Load transactions
  await financeStore.fetchTransactions(1, itemsPerPage.value);
  // Load funding sources for form dropdown
  await financeStore.fetchFundingSources();
  await applyRouteQueryFilters();
});

watch(
  () => route.query,
  async () => {
    await applyRouteQueryFilters();
  },
  { deep: true },
);
</script>

<style scoped>
/* Story 2.4: Row highlighting for underfunded transactions */
:deep(.bg-warning-1) {
  background-color: rgba(255, 193, 7, 0.08) !important;
}
</style>
