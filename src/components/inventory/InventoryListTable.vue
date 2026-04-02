<template>
  <div class="inventory-list-table">
    <q-table
      :rows="items"
      :columns="columns"
      row-key="$id"
      flat
      bordered
      :loading="inventoryStore.isLoading"
      :pagination="pagination"
      @row-click="onRowClick"
    >
      <!-- Item Name with Icon -->
      <template #body-cell-item_name="{ row }">
        <q-td>
          <div class="row items-center q-gutter-sm">
            <q-icon
              :name="getItemIcon(row.item_type)"
              :color="getItemColor(row.item_type)"
              size="sm"
            />
            <span class="text-weight-medium">{{ row.item_name }}</span>
          </div>
        </q-td>
      </template>

      <!-- Item Type Badge -->
      <template #body-cell-item_type="{ row }">
        <q-td>
          <q-badge :color="getItemColor(row.item_type)" outline>
            {{ inventoryStore.getItemTypeLabel(row.item_type) }}
          </q-badge>
        </q-td>
      </template>

      <!-- Quantity with Status Indicator -->
      <template #body-cell-quantity="{ row }">
        <q-td>
          <div class="row items-center q-gutter-sm">
            <q-icon v-if="row.status === 'low_stock'" name="warning" color="warning" size="xs" />
            <q-icon
              v-else-if="row.status === 'out_of_stock'"
              name="error"
              color="negative"
              size="xs"
            />
            <span :class="getQuantityClass(row.status)">
              {{ row.quantity }}
            </span>
            <span class="text-grey-7">{{ row.unit }}</span>
          </div>
        </q-td>
      </template>

      <!-- Status Chip -->
      <template #body-cell-status="{ row }">
        <q-td>
          <q-chip :color="getStatusColor(row.status)" text-color="white" size="sm" dense>
            {{ inventoryStore.getStatusLabel(row.status) }}
          </q-chip>
        </q-td>
      </template>

      <!-- Estimated Value -->
      <template #body-cell-estimated_value="{ row }">
        <q-td>
          <span v-if="canViewValues" class="text-weight-medium">
            {{ formatCurrency(row.estimated_value) }}
          </span>
          <span v-else class="text-grey-6">—</span>
        </q-td>
      </template>

      <!-- Source -->
      <template #body-cell-source="{ row }">
        <q-td>
          <q-badge v-if="row.source" color="grey-7" outline size="sm">
            {{ inventoryStore.getSourceLabel(row.source) }}
          </q-badge>
        </q-td>
      </template>

      <!-- Actions -->
      <template #body-cell-actions="{ row }">
        <q-td class="text-right">
          <q-btn
            flat
            round
            dense
            color="primary"
            icon="edit"
            @click.stop="$emit('edit', row)"
            v-if="canEdit"
          >
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="secondary"
            icon="sync_alt"
            @click.stop="$emit('adjust', row)"
            v-if="canAdjustStock(row)"
          >
            <q-tooltip>Adjust Stock</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            color="negative"
            icon="delete"
            @click.stop="$emit('delete', row)"
            v-if="canEdit"
          >
            <q-tooltip>Delete</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <!-- No Data -->
      <template #no-data>
        <div class="text-center q-pa-md">
          <q-icon name="inventory_2" size="48px" color="grey-4" />
          <p class="text-grey-6 q-mt-sm">No inventory items found</p>
        </div>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useInventoryStore } from 'src/stores/inventory-store';

const { items } = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['row-click', 'edit', 'adjust', 'delete']);

const inventoryStore = useInventoryStore();

const canEdit = computed(() => inventoryStore.canEditItems);

const canViewValues = computed(() => inventoryStore.canViewValues);

const columns = [
  {
    name: 'item_name',
    label: 'Item Name',
    field: 'item_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'item_type',
    label: 'Type',
    field: 'item_type',
    align: 'left',
    sortable: true,
  },
  {
    name: 'quantity',
    label: 'Quantity',
    field: 'quantity',
    align: 'left',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'status',
    align: 'left',
    sortable: true,
  },
  {
    name: 'estimated_value',
    label: 'Est. Value',
    field: 'estimated_value',
    align: 'right',
    sortable: true,
  },
  {
    name: 'source',
    label: 'Source',
    field: 'source',
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'right',
  },
];

const pagination = {
  rowsPerPage: 0, // Use computed pagination from store
};

function onRowClick(evt, row) {
  emit('row-click', row);
}

function canAdjustStock(item) {
  return inventoryStore.canAdjustStock(item.item_type);
}

function getItemIcon(type) {
  return inventoryStore.getItemTypeIcon(type);
}

function getItemColor(type) {
  return inventoryStore.getItemTypeColor(type);
}

function getQuantityClass(status) {
  const classes = {
    in_stock: 'text-positive',
    low_stock: 'text-warning',
    out_of_stock: 'text-negative text-weight-bold',
    reserved: 'text-info',
  };
  return classes[status] || '';
}

function getStatusColor(status) {
  return inventoryStore.getStatusColor(status);
}

function formatCurrency(value) {
  return inventoryStore.formatCurrency(value);
}
</script>
