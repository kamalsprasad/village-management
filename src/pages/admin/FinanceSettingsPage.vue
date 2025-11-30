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
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';

const $q = useQuasar();
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

// Load categories on mount
onMounted(async () => {
  await financeStore.fetchCategories();
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
</script>
