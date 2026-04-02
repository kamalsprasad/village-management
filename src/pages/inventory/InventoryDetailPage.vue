<template>
  <q-page padding>
    <div class="inventory-detail-page">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div class="row items-center">
          <q-btn flat round icon="arrow_back" @click="goBack" class="q-mr-sm" />
          <div>
            <h1 class="text-h5 text-weight-bold q-my-none">{{ item?.item_name }}</h1>
            <p class="text-grey-7 q-mt-xs q-mb-none">
              <q-badge :color="getItemColor(item?.item_type)" outline>
                {{ inventoryStore.getItemTypeLabel(item?.item_type) }}
              </q-badge>
            </p>
          </div>
        </div>
        <div class="row q-gutter-sm" v-if="canEdit">
          <q-btn
            outline
            color="secondary"
            icon="sync_alt"
            label="Adjust Stock"
            @click="showAdjustDialog = true"
            v-if="canAdjust"
          />
          <q-btn
            outline
            color="primary"
            icon="edit"
            label="Edit"
            @click="$router.push(`/inventory/${itemId}/edit`)"
          />
          <q-btn outline color="negative" icon="delete" label="Delete" @click="confirmDelete" />
        </div>
      </div>

      <!-- Main Content -->
      <div class="row q-col-gutter-md">
        <!-- Left Column: Main Info -->
        <div class="col-12 col-md-8">
          <!-- Stock Level Card -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-sm">Current Stock Level</div>
              <div class="row items-center">
                <div class="col">
                  <div class="text-h3">
                    {{ item?.quantity }}
                    <span class="text-h6 text-grey-7">{{ item?.unit }}</span>
                  </div>
                  <div class="q-mt-sm">
                    <q-chip :color="getStatusColor(item?.status)" text-color="white" size="md">
                      {{ inventoryStore.getStatusLabel(item?.status) }}
                    </q-chip>
                  </div>
                </div>
                <div class="col-auto">
                  <StockLevelIndicator
                    :quantity="item?.quantity"
                    :reorder-threshold="item?.reorder_threshold"
                    size="80px"
                  />
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="q-mt-md">
                <q-linear-progress
                  :value="stockProgress"
                  :color="getStatusColor(item?.status)"
                  size="20px"
                  rounded
                >
                  <div class="absolute-full flex flex-center">
                    <q-badge color="white" text-color="dark" size="xs">
                      {{ Math.round(stockProgress * 100) }}%
                    </q-badge>
                  </div>
                </q-linear-progress>
                <div class="row justify-between text-caption text-grey-7 q-mt-xs">
                  <span>0</span>
                  <span>Reorder at: {{ item?.reorder_threshold }} {{ item?.unit }}</span>
                  <span>Target: {{ targetStock }} {{ item?.unit }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Details Card -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-md">Item Details</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <InfoRow label="Item Name" :value="item?.item_name" />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow
                    label="Item Type"
                    :value="inventoryStore.getItemTypeLabel(item?.item_type)"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow label="Unit" :value="item?.unit" />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow
                    label="Reorder Threshold"
                    :value="`${item?.reorder_threshold} ${item?.unit}`"
                  />
                </div>
                <div class="col-12 col-sm-6" v-if="canViewValues">
                  <InfoRow label="Unit Cost" :value="formatCurrency(item?.unit_cost)" />
                </div>
                <div class="col-12 col-sm-6" v-if="canViewValues">
                  <InfoRow label="Estimated Value" :value="formatCurrency(item?.estimated_value)" />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow label="Source" :value="inventoryStore.getSourceLabel(item?.source)" />
                </div>
                <div class="col-12 col-sm-6" v-if="item?.source_reference_id">
                  <InfoRow label="Reference ID" :value="item?.source_reference_id" />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow label="Date Added" :value="formatDate(item?.$createdAt)" />
                </div>
                <div class="col-12 col-sm-6">
                  <InfoRow label="Last Updated" :value="formatDate(item?.last_updated)" />
                </div>
              </div>

              <div v-if="item?.notes" class="q-mt-md">
                <div class="text-caption text-grey-7">Notes</div>
                <div class="text-body2">{{ item?.notes }}</div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Transaction History (Placeholder) -->
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-md">Transaction History</div>
              <q-banner rounded class="bg-blue-1 text-dark">
                <template #avatar>
                  <q-icon name="info" color="primary" />
                </template>
                <div>Transaction history will be available after Finance and Farm integration.</div>
                <div class="text-caption">
                  Stock adjustments and usage tracking coming in future updates.
                </div>
              </q-banner>
            </q-card-section>
          </q-card>
        </div>

        <!-- Right Column: Alerts & Stats -->
        <div class="col-12 col-md-4">
          <!-- Status Alert Card -->
          <q-card
            v-if="item?.status === 'low_stock' || item?.status === 'out_of_stock'"
            flat
            bordered
            :class="alertCardClass"
            class="q-mb-md"
          >
            <q-card-section>
              <div class="row items-center no-wrap">
                <q-icon :name="alertIcon" size="32px" class="q-mr-md" />
                <div>
                  <div class="text-weight-bold">{{ alertTitle }}</div>
                  <div class="text-body2">{{ alertMessage }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Quick Stats Card -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-sm">Quick Stats</div>
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="text-caption text-grey-7">Days Since Added</div>
                  <div class="text-h6">{{ daysSinceAdded }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-7">Stock Health</div>
                  <div class="text-h6" :class="stockHealthClass">{{ stockHealth }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Actions Card -->
          <q-card flat bordered v-if="canAdjust">
            <q-card-section>
              <div class="text-subtitle2 text-grey-7 q-mb-sm">Quick Actions</div>
              <q-list dense>
                <q-item clickable v-ripple @click="showAdjustDialog = true">
                  <q-item-section avatar>
                    <q-icon name="sync_alt" color="secondary" />
                  </q-item-section>
                  <q-item-section>Adjust Stock</q-item-section>
                </q-item>
                <q-item clickable v-ripple @click="$router.push(`/inventory/${itemId}/edit`)">
                  <q-item-section avatar>
                    <q-icon name="edit" color="primary" />
                  </q-item-section>
                  <q-item-section>Edit Item</q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Stock Adjustment Dialog -->
      <StockAdjustDialog v-model="showAdjustDialog" :item="item" @submit="onAdjustSubmit" />

      <!-- Enhanced Delete Confirmation -->
      <DeleteConfirmDialog
        v-model="showDeleteDialog"
        :item-name="item?.item_name || ''"
        :is-loading="inventoryStore.isLoading"
        @confirm="onDeleteConfirm"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryStore } from 'src/stores/inventory-store';
import StockAdjustDialog from 'src/components/inventory/StockAdjustDialog.vue';
import StockLevelIndicator from 'src/components/inventory/StockLevelIndicator.vue';
import DeleteConfirmDialog from 'src/components/dialogs/DeleteConfirmDialog.vue';
import { useQuasar } from 'quasar';
import { date } from 'quasar';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const inventoryStore = useInventoryStore();

const isLoading = ref(false);
const showAdjustDialog = ref(false);
const showDeleteDialog = ref(false);

const itemId = computed(() => route.params.id);
const item = computed(() => inventoryStore.currentItem);

const canEdit = computed(() => inventoryStore.canEditItems);

const canAdjust = computed(() => {
  if (!item.value) return false;
  return inventoryStore.canAdjustStock(item.value.item_type);
});

const canViewValues = computed(() => inventoryStore.canViewValues);

const stockProgress = computed(() => {
  if (!item.value) return 0;
  const target = item.value.reorder_threshold * 2;
  return Math.min(item.value.quantity / target, 1);
});

const targetStock = computed(() => {
  if (!item.value) return 0;
  return item.value.reorder_threshold * 2;
});

const daysSinceAdded = computed(() => {
  if (!item.value?.$createdAt) return '—';
  const added = new Date(item.value.$createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - added);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

const stockHealth = computed(() => {
  if (!item.value) return '—';
  const ratio = item.value.quantity / (item.value.reorder_threshold || 1);
  if (ratio >= 2) return 'Good';
  if (ratio >= 1) return 'Fair';
  if (item.value.quantity > 0) return 'Low';
  return 'Critical';
});

const stockHealthClass = computed(() => {
  const classes = {
    Good: 'text-positive',
    Fair: 'text-info',
    Low: 'text-warning',
    Critical: 'text-negative',
  };
  return classes[stockHealth.value] || '';
});

const alertCardClass = computed(() => {
  if (item.value?.status === 'out_of_stock') return 'bg-negative text-white';
  if (item.value?.status === 'low_stock') return 'bg-warning text-dark';
  return '';
});

const alertIcon = computed(() => {
  if (item.value?.status === 'out_of_stock') return 'error';
  if (item.value?.status === 'low_stock') return 'warning';
  return 'info';
});

const alertTitle = computed(() => {
  if (item.value?.status === 'out_of_stock') return 'Out of Stock!';
  if (item.value?.status === 'low_stock') return 'Low Stock Alert';
  return '';
});

const alertMessage = computed(() => {
  if (item.value?.status === 'out_of_stock') {
    return `This item is completely out of stock. Order immediately!`;
  }
  if (item.value?.status === 'low_stock') {
    const remaining = item.value?.quantity || 0;
    return `Only ${remaining} ${item.value?.unit} remaining. Consider reordering soon.`;
  }
  return '';
});

// const deleteMessage = computed(() => {
//   return `Are you sure you want to delete "${item.value?.item_name}"? This action cannot be undone.`;
// });

onMounted(async () => {
  await loadItem();
});

async function loadItem() {
  isLoading.value = true;
  const result = await inventoryStore.fetchItemById(itemId.value);
  isLoading.value = false;

  if (!result.success) {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to load item',
    });
    router.push('/inventory');
  }
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

function confirmDelete() {
  showDeleteDialog.value = true;
}

async function onDeleteConfirm({ reason }) {
  // Log deletion reason if provided
  if (reason) {
    console.log(
      `[AUDIT] Deleting inventory item "${item.value?.item_name}" (ID: ${itemId.value}). Reason: ${reason}`,
    );
  }

  const result = await inventoryStore.deleteItem(itemId.value);

  if (result.success) {
    router.push('/inventory');
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to delete item',
    });
  }
}

function goBack() {
  router.push('/inventory');
}

function getItemColor(type) {
  return inventoryStore.getItemTypeColor(type);
}

function getStatusColor(status) {
  return inventoryStore.getStatusColor(status);
}

function formatCurrency(value) {
  return inventoryStore.formatCurrency(value);
}

function formatDate(value) {
  if (!value) return '—';
  return date.formatDate(value, 'MMM D, YYYY h:mm A');
}
</script>

<style scoped>
.inventory-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
