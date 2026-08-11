<template>
  <q-page padding>
    <div class="inventory-list-page">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div>
          <h1 class="text-h5 text-weight-bold q-my-none">Inventory Management</h1>
          <p class="text-grey-7 q-mt-xs q-mb-none">
            Track and manage village assets and stock levels
          </p>
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            outline
            color="secondary"
            icon="download"
            label="Export CSV"
            @click="exportToCSV"
            :disable="filteredItems.length === 0"
          />
          <q-btn
            v-if="canEdit"
            color="primary"
            icon="add"
            label="Add Inventory Item"
            @click="$router.push('/inventory/add')"
          >
            <q-tooltip>Add a new inventory item to track stock.</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="q-pa-md">
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Total Items</div>
                  <div class="text-h4">{{ totalItems }}</div>
                </div>
                <q-icon name="inventory_2" size="48px" color="primary" class="col-auto" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Low Stock</div>
                  <div class="text-h4 text-warning">{{ inventoryStore.lowStockCount }}</div>
                </div>
                <q-icon name="warning" size="48px" color="warning" class="col-auto" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Out of Stock</div>
                  <div class="text-h4 text-negative">{{ inventoryStore.outOfStockCount }}</div>
                </div>
                <q-icon name="error" size="48px" color="negative" class="col-auto" />
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-3" v-if="canViewValues">
            <q-card flat bordered>
              <q-card-section class="row items-center">
                <div class="col">
                  <div class="text-caption text-grey-7">Total Value</div>
                  <div class="text-h5">{{ formatCurrency(totalValue) }}</div>
                </div>
                <q-icon name="attach_money" size="48px" color="positive" class="col-auto" />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Filters -->
        <InventoryFilters class="q-mb-md" @filter="onFilter" />

        <!-- Inventory Table -->
        <q-card flat bordered>
          <q-card-section>
            <InventoryListTable
              :items="filteredItems"
              @row-click="onRowClick"
              @edit="onEdit"
              @adjust="onAdjust"
              @delete="onDelete"
            />
          </q-card-section>

          <!-- Pagination -->
          <q-card-section class="row justify-center" v-if="inventoryStore.totalPages > 1">
            <q-pagination
              v-model="currentPage"
              :max="inventoryStore.totalPages"
              :max-pages="6"
              boundary-numbers
              direction-links
              @update:model-value="onPageChange"
            />
          </q-card-section>
        </q-card>
      </template>

      <!-- Stock Adjustment Dialog -->
      <StockAdjustDialog v-model="showAdjustDialog" :item="selectedItem" @submit="onAdjustSubmit" />

      <!-- Enhanced Delete Confirmation Dialog -->
      <DeleteConfirmDialog
        v-model="showDeleteDialog"
        :item-name="itemToDelete?.item_name || ''"
        :is-loading="inventoryStore.isLoading"
        @confirm="onDeleteConfirm"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInventoryStore } from 'src/stores/inventory-store';
import InventoryListTable from 'src/components/inventory/InventoryListTable.vue';
import InventoryFilters from 'src/components/inventory/InventoryFilters.vue';
import StockAdjustDialog from 'src/components/inventory/StockAdjustDialog.vue';
import DeleteConfirmDialog from 'src/components/dialogs/DeleteConfirmDialog.vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();
const inventoryStore = useInventoryStore();

const currentPage = ref(1);
const loading = ref(true);
const showAdjustDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedItem = ref(null);
const itemToDelete = ref(null);

const canEdit = computed(() => inventoryStore.canEditItems);

const canViewValues = computed(() => inventoryStore.canViewValues);

const totalItems = computed(() => inventoryStore.items.length);
const totalValue = computed(() => inventoryStore.totalInventoryValue);

const filteredItems = computed(() => {
  let items = inventoryStore.visibleItems;

  // Apply client-side filtering
  if (inventoryStore.filters.search) {
    const searchTerm = inventoryStore.filters.search.toLowerCase();
    items = items.filter((item) => item.item_name?.toLowerCase().includes(searchTerm));
  }

  if (inventoryStore.filters.itemTypes.length > 0) {
    items = items.filter((item) => inventoryStore.filters.itemTypes.includes(item.item_type));
  }

  if (inventoryStore.filters.statuses.length > 0) {
    items = items.filter((item) => inventoryStore.filters.statuses.includes(item.status));
  }

  if (inventoryStore.filters.sources.length > 0) {
    items = items.filter((item) => inventoryStore.filters.sources.includes(item.source));
  }

  // Sort: out of stock first, then low stock, then by name
  const statusOrder = { out_of_stock: 0, low_stock: 1, in_stock: 2, reserved: 3 };
  items = [...items].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
    if (statusDiff !== 0) return statusDiff;
    return a.item_name.localeCompare(b.item_name);
  });

  return items;
});

onMounted(async () => {
  loading.value = true;
  try {
    await inventoryStore.fetchItems(1, inventoryStore.pagination.itemsPerPage);
  } finally {
    loading.value = false;
  }
});

function onRowClick(row) {
  router.push(`/inventory/${row.$id}`);
}

function onEdit(row) {
  router.push(`/inventory/${row.$id}/edit`);
}

function onAdjust(row) {
  selectedItem.value = row;
  showAdjustDialog.value = true;
}

async function onAdjustSubmit(adjustment) {
  const result = await inventoryStore.adjustStock(adjustment.itemId, {
    type: adjustment.type,
    quantity: adjustment.quantity,
    reason: adjustment.reason,
    notes: adjustment.notes,
  });

  if (!result.success) {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to adjust stock',
    });
  }
}

function onDelete(row) {
  itemToDelete.value = row;
  showDeleteDialog.value = true;
}

async function onDeleteConfirm({ reason }) {
  if (!itemToDelete.value) return;

  // Log deletion reason if provided
  if (reason) {
    console.log(
      `[AUDIT] Deleting inventory item "${itemToDelete.value.item_name}" (ID: ${itemToDelete.value.$id}). Reason: ${reason}`,
    );
  }

  const result = await inventoryStore.deleteItem(itemToDelete.value.$id);

  if (result.success) {
    router.push('/inventory');
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to delete item',
    });
  }
  itemToDelete.value = null;
}

function onFilter(filters) {
  inventoryStore.setFilters(filters);
  currentPage.value = 1;
  inventoryStore.fetchItems(1, inventoryStore.pagination.itemsPerPage);
}

async function onPageChange(page) {
  await inventoryStore.goToPage(page);
}

function formatCurrency(value) {
  return inventoryStore.formatCurrency(value);
}

function exportToCSV() {
  if (filteredItems.value.length === 0) return;

  const headers = [
    'Item Name',
    'Type',
    'Quantity',
    'Unit',
    'Status',
    'Unit Cost',
    'Estimated Value',
    'Source',
    'Reorder Threshold',
    'Date Added',
    'Notes',
  ];

  const rows = filteredItems.value.map((item) => [
    item.item_name,
    inventoryStore.getItemTypeLabel(item.item_type),
    item.quantity,
    item.unit,
    inventoryStore.getStatusLabel(item.status),
    item.unit_cost || 0,
    item.estimated_value || 0,
    inventoryStore.getSourceLabel(item.source),
    item.reorder_threshold,
    new Date(item.$createdAt).toLocaleDateString(),
    item.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  $q.notify({
    type: 'positive',
    message: `Exported ${filteredItems.value.length} items to CSV`,
  });
}
</script>
