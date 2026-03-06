<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Page Header -->
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="q-my-none">Finance Settings</h4>
          <p class="text-grey-7 q-mb-none">
            Manage income and expense categories for financial transactions
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div
        v-if="financeStore.isCategoriesLoading && !financeStore.categoriesLoaded"
        class="q-pa-md"
      >
        <q-skeleton type="rect" height="200px" class="q-mb-md" />
        <q-skeleton type="rect" height="200px" />
      </div>

      <!-- Categories Content -->
      <template v-else>
        <!-- Income Categories Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">
                  <q-icon name="trending_up" color="positive" class="q-mr-sm" />
                  Income Categories
                </div>
                <div class="text-caption text-grey-7">
                  Categories for recording income transactions
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Category"
                  size="sm"
                  @click="openAddCategoryDialog('income')"
                />
              </div>
            </div>

            <!-- Income Categories List -->
            <div v-if="incomeCategories.length === 0" class="text-grey-7 text-center q-pa-md">
              No income categories found. Add one to get started.
            </div>
            <q-list v-else bordered separator>
              <q-expansion-item
                v-for="category in incomeCategories"
                :key="category.$id"
                expand-separator
                :label="category.name"
                :caption="`${(category.subcategories || []).length} subcategories`"
                icon="folder"
                header-class="text-weight-medium"
              >
                <q-card>
                  <q-card-section>
                    <!-- Subcategories -->
                    <div class="row items-center q-mb-sm">
                      <div class="col text-subtitle2">Subcategories</div>
                      <div class="col-auto">
                        <q-btn
                          flat
                          dense
                          size="sm"
                          icon="add"
                          label="Add"
                          color="primary"
                          @click="openAddSubcategoryDialog(category)"
                        />
                      </div>
                    </div>
                    <div
                      v-if="!category.subcategories || category.subcategories.length === 0"
                      class="text-grey-6 text-caption"
                    >
                      No subcategories defined
                    </div>
                    <q-chip
                      v-for="subcategory in category.subcategories"
                      :key="subcategory"
                      removable
                      color="grey-3"
                      text-color="grey-8"
                      @remove="confirmRemoveSubcategory(category, subcategory)"
                    >
                      {{ subcategory }}
                    </q-chip>
                  </q-card-section>
                  <q-separator />
                  <q-card-actions align="right">
                    <q-btn
                      flat
                      dense
                      icon="edit"
                      label="Edit"
                      color="primary"
                      @click="openEditCategoryDialog(category)"
                    />
                    <q-btn
                      flat
                      dense
                      icon="delete"
                      label="Delete"
                      color="negative"
                      @click="confirmDeleteCategory(category)"
                    />
                  </q-card-actions>
                </q-card>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Expense Categories Section -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">
                  <q-icon name="trending_down" color="negative" class="q-mr-sm" />
                  Expense Categories
                </div>
                <div class="text-caption text-grey-7">
                  Categories for recording expense transactions
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Category"
                  size="sm"
                  @click="openAddCategoryDialog('expense')"
                />
              </div>
            </div>

            <!-- Expense Categories List -->
            <div v-if="expenseCategories.length === 0" class="text-grey-7 text-center q-pa-md">
              No expense categories found. Add one to get started.
            </div>
            <q-list v-else bordered separator>
              <q-expansion-item
                v-for="category in expenseCategories"
                :key="category.$id"
                expand-separator
                :label="category.name"
                :caption="`${(category.subcategories || []).length} subcategories`"
                icon="folder"
                header-class="text-weight-medium"
              >
                <q-card>
                  <q-card-section>
                    <!-- Subcategories -->
                    <div class="row items-center q-mb-sm">
                      <div class="col text-subtitle2">Subcategories</div>
                      <div class="col-auto">
                        <q-btn
                          flat
                          dense
                          size="sm"
                          icon="add"
                          label="Add"
                          color="primary"
                          @click="openAddSubcategoryDialog(category)"
                        />
                      </div>
                    </div>
                    <div
                      v-if="!category.subcategories || category.subcategories.length === 0"
                      class="text-grey-6 text-caption"
                    >
                      No subcategories defined
                    </div>
                    <q-chip
                      v-for="subcategory in category.subcategories"
                      :key="subcategory"
                      removable
                      color="grey-3"
                      text-color="grey-8"
                      @remove="confirmRemoveSubcategory(category, subcategory)"
                    >
                      {{ subcategory }}
                    </q-chip>
                  </q-card-section>
                  <q-separator />
                  <q-card-actions align="right">
                    <q-btn
                      flat
                      dense
                      icon="edit"
                      label="Edit"
                      color="primary"
                      @click="openEditCategoryDialog(category)"
                    />
                    <q-btn
                      flat
                      dense
                      icon="delete"
                      label="Delete"
                      color="negative"
                      @click="confirmDeleteCategory(category)"
                    />
                  </q-card-actions>
                </q-card>
              </q-expansion-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Summary Card -->
        <q-card flat bordered>
          <q-card-section class="text-grey-7">
            <div class="row items-center q-gutter-md">
              <div>
                <q-icon name="info" size="sm" class="q-mr-sm" />
                <span>
                  Total: {{ financeStore.categories.length }} categories ({{
                    incomeCategories.length
                  }}
                  income, {{ expenseCategories.length }} expense)
                </span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Funding Sources Section -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">
                  <q-icon name="account_balance" class="q-mr-sm" />
                  Funding Sources
                </div>
                <div class="text-caption text-grey-7">
                  Manage funding sources and track available balances
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="hasPermission('*')"
                  color="primary"
                  icon="add"
                  label="Add Funding Source"
                  @click="openAddFundingSourceDialog"
                />
                <q-badge v-else-if="hasPermission('finance:read')" color="info" class="q-mr-sm">
                  Read-only view
                </q-badge>
              </div>
            </div>

            <!-- Funding Sources Overview Widget -->
            <FundingSourcesOverviewWidget
              :sources="financeStore.fundingSources"
              :loading="financeStore.isFundingSourcesLoading"
              :show-view-all="false"
              :allow-add-source="hasPermission('*')"
            />

            <!-- Funding Sources Table -->
            <q-table
              :rows="financeStore.fundingSources"
              :columns="fundingSourceColumns"
              row-key="$id"
              flat
              bordered
              :loading="financeStore.isFundingSourcesLoading"
              :pagination="{ rowsPerPage: 10 }"
            >
              <!-- Empty State -->
              <template #no-data>
                <div class="text-grey-7 text-center q-pa-lg">
                  <q-icon name="account_balance" size="3rem" class="q-mb-sm" />
                  <div>No funding sources configured yet.</div>
                  <q-btn
                    v-if="hasPermission('*')"
                    flat
                    color="primary"
                    label="Add Your First Funding Source"
                    class="q-mt-md"
                    @click="openAddFundingSourceDialog"
                  />
                </div>
              </template>
              <!-- Name Column -->
              <template #body-cell-name="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ props.row.name }}</div>
                  <div v-if="props.row.restrictions" class="text-caption text-grey-7">
                    <q-icon name="info" size="xs" class="q-mr-xs" />
                    {{ props.row.restrictions.substring(0, 50)
                    }}{{ props.row.restrictions.length > 50 ? '...' : '' }}
                  </div>
                </q-td>
              </template>

              <!-- Type Column -->
              <template #body-cell-type="props">
                <q-td :props="props">
                  <q-badge
                    outline
                    :color="getFundingTypeColor(props.row.type)"
                    :label="props.row.type"
                  />
                </q-td>
              </template>

              <!-- Balance Column -->
              <template #body-cell-balance="props">
                <q-td :props="props">
                  <div class="text-weight-medium" :class="getBalanceClass(props.row)">
                    {{ formatCurrency(props.row.current_balance) }}
                  </div>
                  <div class="text-caption text-grey-7">
                    of {{ formatCurrency(props.row.total_received) }}
                  </div>
                </q-td>
              </template>

              <!-- Status Column -->
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="getFundingStatusColor(props.row.status)"
                    :label="props.row.status"
                  />
                </q-td>
              </template>

              <!-- Actions Column -->
              <template #body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    round
                    icon="visibility"
                    color="secondary"
                    @click="openFundingSourceDetail(props.row)"
                  >
                    <q-tooltip>View details</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="hasPermission('*')"
                    flat
                    dense
                    round
                    icon="edit"
                    color="primary"
                    @click="openEditFundingSourceDialog(props.row)"
                  >
                    <q-tooltip>Edit</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="hasPermission('*')"
                    flat
                    dense
                    round
                    icon="delete"
                    color="negative"
                    @click="confirmDeleteFundingSource(props.row)"
                  >
                    <q-tooltip>Delete</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </template>
    </div>

    <!-- Add/Edit Category Dialog -->
    <q-dialog v-model="showCategoryDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">
            {{ isEditingCategory ? 'Edit Category' : 'Add Category' }}
          </div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="categoryForm.name"
            label="Category Name *"
            outlined
            class="q-mb-md"
            :rules="[(val) => !!val || 'Category name is required']"
          >
            <template #prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <q-select
            v-model="categoryForm.type"
            :options="categoryTypeOptions"
            label="Category Type *"
            outlined
            :disable="isEditingCategory"
            emit-value
            map-options
            :rules="[(val) => !!val || 'Category type is required']"
          >
            <template #prepend>
              <q-icon :name="categoryForm.type === 'income' ? 'trending_up' : 'trending_down'" />
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" @click="closeCategoryDialog" />
          <q-btn
            label="Save"
            color="primary"
            :loading="financeStore.isCategoriesLoading"
            @click="saveCategory"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Subcategory Dialog -->
    <q-dialog v-model="showSubcategoryDialog" persistent>
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Add Subcategory</div>
          <div class="text-caption text-grey-7">Adding to: {{ selectedCategory?.name }}</div>
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="subcategoryForm.name"
            label="Subcategory Name *"
            outlined
            :rules="[(val) => !!val || 'Subcategory name is required']"
          >
            <template #prepend>
              <q-icon name="subdirectory_arrow_right" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" @click="closeSubcategoryDialog" />
          <q-btn
            label="Add"
            color="primary"
            :loading="financeStore.isCategoriesLoading"
            @click="saveSubcategory"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Story 2.4: Add/Edit Funding Source Dialog -->
    <q-dialog v-model="showFundingSourceDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">
            {{ isEditingFundingSource ? 'Edit Funding Source' : 'Add Funding Source' }}
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-sm">
          <!-- Name -->
          <q-input
            v-model="fundingSourceForm.name"
            label="Source Name *"
            outlined
            :rules="[(val) => !!val || 'Name is required']"
          >
            <template #prepend>
              <q-icon name="label" />
            </template>
          </q-input>

          <!-- Type -->
          <q-select
            v-model="fundingSourceForm.type"
            :options="fundingSourceTypeOptions"
            label="Type *"
            outlined
            emit-value
            map-options
            :rules="[(val) => !!val || 'Type is required']"
          >
            <template #prepend>
              <q-icon name="category" />
            </template>
          </q-select>

          <!-- Initial Amount (only for new sources) -->
          <q-input
            v-if="!isEditingFundingSource"
            v-model.number="fundingSourceForm.total_received"
            label="Initial Amount (ZMW)"
            type="number"
            outlined
            min="0"
            hint="This will be both the total received and current balance"
          >
            <template #prepend>
              <q-icon name="payments" />
            </template>
          </q-input>

          <!-- Date Received -->
          <q-input
            v-model="fundingSourceForm.date_received"
            label="Date Received"
            outlined
            type="date"
          >
            <template #prepend>
              <q-icon name="event" />
            </template>
          </q-input>

          <!-- Status -->
          <q-select
            v-model="fundingSourceForm.status"
            :options="fundingSourceStatusOptions"
            label="Status *"
            outlined
            emit-value
            map-options
          >
            <template #prepend>
              <q-icon name="flag" />
            </template>
          </q-select>

          <!-- Restrictions -->
          <q-input
            v-model="fundingSourceForm.restrictions"
            label="Restrictions / Notes"
            type="textarea"
            outlined
            rows="3"
            hint="Optional: Any usage restrictions or notes about this funding source"
          >
            <template #prepend>
              <q-icon name="note" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey-7" @click="closeFundingSourceDialog" />
          <q-btn
            :label="isEditingFundingSource ? 'Update' : 'Create'"
            color="primary"
            :loading="financeStore.isFundingSourcesLoading"
            @click="saveFundingSource"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';
import FundingSourcesOverviewWidget from 'src/modules/finance/components/FundingSourcesOverviewWidget.vue';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const financeStore = useFinanceStore();

// Computed categories
const incomeCategories = computed(() => financeStore.incomeCategories);
const expenseCategories = computed(() => financeStore.expenseCategories);

// Category dialog state
const showCategoryDialog = ref(false);
const isEditingCategory = ref(false);
const categoryForm = ref({
  id: null,
  name: '',
  type: 'income',
});

// Subcategory dialog state
const showSubcategoryDialog = ref(false);
const selectedCategory = ref(null);
const subcategoryForm = ref({
  name: '',
});

// Category type options
const categoryTypeOptions = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
];

// ========================================
// Story 2.4: Funding Source State
// ========================================

const showFundingSourceDialog = ref(false);
const isEditingFundingSource = ref(false);
const fundingSourceForm = ref({
  id: null,
  name: '',
  type: 'grant',
  total_received: 0,
  current_balance: 0,
  date_received: null,
  restrictions: '',
  status: 'active',
});

// Funding source options
const fundingSourceTypeOptions = [
  { label: 'Grant', value: 'grant' },
  { label: 'Donation', value: 'donation' },
  { label: 'Income', value: 'income' },
  { label: 'Loan', value: 'loan' },
];

const fundingSourceStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Depleted', value: 'depleted' },
];

// Funding source table columns
const fundingSourceColumns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'center', sortable: true },
  { name: 'balance', label: 'Balance', field: 'current_balance', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
];

const hasPermission = () => {
  const permissions = authStore.userRoles[0].permissions;
  return permissions.includes('finance_settings') || permissions.includes('*');
};

// Load categories and funding sources on mount
onMounted(async () => {
  await Promise.all([financeStore.fetchCategories(), financeStore.fetchFundingSources()]);
});

// Category Dialog Functions
function openAddCategoryDialog(type) {
  isEditingCategory.value = false;
  categoryForm.value = {
    id: null,
    name: '',
    type: type,
  };
  showCategoryDialog.value = true;
}

function openEditCategoryDialog(category) {
  isEditingCategory.value = true;
  categoryForm.value = {
    id: category.$id,
    name: category.name,
    type: category.type,
  };
  showCategoryDialog.value = true;
}

function closeCategoryDialog() {
  showCategoryDialog.value = false;
  categoryForm.value = { id: null, name: '', type: 'income' };
}

async function saveCategory() {
  if (!categoryForm.value.name) {
    $q.notify({ type: 'warning', message: 'Please enter a category name' });
    return;
  }

  let result;
  if (isEditingCategory.value) {
    result = await financeStore.updateCategory(categoryForm.value.id, {
      name: categoryForm.value.name,
    });
  } else {
    result = await financeStore.addCategory({
      name: categoryForm.value.name,
      type: categoryForm.value.type,
      subcategories: [],
    });
  }

  if (result.success) {
    closeCategoryDialog();
  }
}

// Delete Category
function confirmDeleteCategory(category) {
  $q.dialog({
    title: 'Delete Category',
    message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await financeStore.deleteCategory(category.$id);

    if (!result.success && result.hasTransactions) {
      // AC#5: Show warning if category has transactions
      $q.dialog({
        title: 'Cannot Delete Category',
        message: `This category has ${result.transactionCount || 'existing'} transaction(s) associated with it. Please reassign or delete those transactions first before deleting this category.`,
        ok: {
          label: 'OK',
          color: 'primary',
        },
      });
    }
  });
}

// Subcategory Dialog Functions
function openAddSubcategoryDialog(category) {
  selectedCategory.value = category;
  subcategoryForm.value = { name: '' };
  showSubcategoryDialog.value = true;
}

function closeSubcategoryDialog() {
  showSubcategoryDialog.value = false;
  selectedCategory.value = null;
  subcategoryForm.value = { name: '' };
}

async function saveSubcategory() {
  if (!subcategoryForm.value.name) {
    $q.notify({ type: 'warning', message: 'Please enter a subcategory name' });
    return;
  }

  const result = await financeStore.addSubcategory(
    selectedCategory.value.$id,
    subcategoryForm.value.name,
  );

  if (result.success) {
    closeSubcategoryDialog();
  }
}

// Remove Subcategory
function confirmRemoveSubcategory(category, subcategoryName) {
  $q.dialog({
    title: 'Remove Subcategory',
    message: `Remove "${subcategoryName}" from ${category.name}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    await financeStore.removeSubcategory(category.$id, subcategoryName);
  });
}

// ========================================
// Story 2.4: Funding Source Functions
// ========================================

function openAddFundingSourceDialog() {
  isEditingFundingSource.value = false;
  fundingSourceForm.value = {
    id: null,
    name: '',
    type: 'grant',
    total_received: 0,
    current_balance: 0,
    date_received: new Date().toISOString().split('T')[0],
    restrictions: '',
    status: 'active',
  };
  showFundingSourceDialog.value = true;
}

function openFundingSourceDetail(source) {
  router.push({ name: 'funding-source-detail', params: { id: source.$id } });
}

function openEditFundingSourceDialog(source) {
  isEditingFundingSource.value = true;
  fundingSourceForm.value = {
    id: source.$id,
    name: source.name,
    type: source.type,
    total_received: source.total_received,
    current_balance: source.current_balance,
    date_received: source.date_received
      ? new Date(source.date_received).toISOString().split('T')[0]
      : null,
    restrictions: source.restrictions || '',
    status: source.status,
  };
  showFundingSourceDialog.value = true;
}

function closeFundingSourceDialog() {
  showFundingSourceDialog.value = false;
  fundingSourceForm.value = {
    id: null,
    name: '',
    type: 'grant',
    total_received: 0,
    current_balance: 0,
    date_received: null,
    restrictions: '',
    status: 'active',
  };
}

async function saveFundingSource() {
  if (!fundingSourceForm.value.name) {
    $q.notify({ type: 'warning', message: 'Please enter a source name' });
    return;
  }

  if (!fundingSourceForm.value.type) {
    $q.notify({ type: 'warning', message: 'Please select a type' });
    return;
  }

  let result;
  if (isEditingFundingSource.value) {
    result = await financeStore.updateFundingSource(fundingSourceForm.value.id, {
      name: fundingSourceForm.value.name,
      type: fundingSourceForm.value.type,
      date_received: fundingSourceForm.value.date_received
        ? new Date(fundingSourceForm.value.date_received).toISOString()
        : null,
      restrictions: fundingSourceForm.value.restrictions || null,
      status: fundingSourceForm.value.status,
    });
  } else {
    const initialAmount = parseFloat(fundingSourceForm.value.total_received) || 0;
    result = await financeStore.addFundingSource({
      name: fundingSourceForm.value.name,
      type: fundingSourceForm.value.type,
      total_received: initialAmount,
      current_balance: initialAmount, // Same as total_received for new sources
      date_received: fundingSourceForm.value.date_received
        ? new Date(fundingSourceForm.value.date_received).toISOString()
        : null,
      restrictions: fundingSourceForm.value.restrictions || null,
      status: fundingSourceForm.value.status,
    });
  }

  if (result.success) {
    closeFundingSourceDialog();
  }
}

function confirmDeleteFundingSource(source) {
  $q.dialog({
    title: 'Delete Funding Source',
    message: `Are you sure you want to delete "${source.name}"? This action cannot be undone.`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await financeStore.deleteFundingSource(source.$id);

    if (!result.success && result.hasTransactions) {
      $q.dialog({
        title: 'Cannot Delete Funding Source',
        message: `This funding source has ${result.transactionCount || 'existing'} transaction(s) associated with it. Please reassign or delete those transactions first.`,
        ok: {
          label: 'OK',
          color: 'primary',
        },
      });
    }
  });
}

// Helper functions for funding source display
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getFundingTypeColor(type) {
  switch (type) {
    case 'grant':
      return 'primary';
    case 'donation':
      return 'secondary';
    case 'income':
      return 'positive';
    case 'loan':
      return 'warning';
    default:
      return 'grey';
  }
}

function getFundingStatusColor(status) {
  switch (status) {
    case 'active':
      return 'positive';
    case 'inactive':
      return 'grey';
    case 'depleted':
      return 'negative';
    default:
      return 'grey';
  }
}

function getBalanceClass(source) {
  if (!source.total_received || source.total_received === 0) return '';
  const ratio = source.current_balance / source.total_received;
  if (ratio > 0.5) return 'text-positive';
  if (ratio > 0.2) return 'text-warning';
  return 'text-negative';
}
</script>
