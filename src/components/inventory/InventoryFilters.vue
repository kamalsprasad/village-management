<template>
  <div class="inventory-filters">
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">Filters</div>
        <div class="row q-col-gutter-md">
          <!-- Search -->
          <div class="col-12 col-md-3">
            <q-input
              v-model="localFilters.search"
              label="Search by name"
              dense
              outlined
              clearable
              @update:model-value="emitFilters"
            >
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>

          <!-- Item Type Filter -->
          <div class="col-12 col-md-3">
            <q-select
              v-model="localFilters.itemTypes"
              :options="itemTypeOptions"
              label="Item Type"
              dense
              outlined
              multiple
              emit-value
              map-options
              clearable
              @update:model-value="emitFilters"
            />
          </div>

          <!-- Status Filter -->
          <div class="col-12 col-md-3">
            <q-select
              v-model="localFilters.statuses"
              :options="statusOptions"
              label="Status"
              dense
              outlined
              multiple
              emit-value
              map-options
              clearable
              @update:model-value="emitFilters"
            />
          </div>

          <!-- Source Filter (only for Finance Manager/Admin) -->
          <div class="col-12 col-md-3" v-if="canViewAll">
            <q-select
              v-model="localFilters.sources"
              :options="sourceOptions"
              label="Source"
              dense
              outlined
              multiple
              emit-value
              map-options
              clearable
              @update:model-value="emitFilters"
            />
          </div>
        </div>

        <!-- Clear Filters -->
        <div class="row justify-end q-mt-sm">
          <q-btn
            flat
            color="primary"
            label="Clear Filters"
            icon="clear_all"
            @click="clearFilters"
            :disable="!hasActiveFilters"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import { useInventoryStore } from 'src/stores/inventory-store';

const emit = defineEmits(['filter']);

const inventoryStore = useInventoryStore();

const canViewAll = computed(() => inventoryStore.canViewAllItems);

const localFilters = reactive({
  search: '',
  itemTypes: [],
  statuses: [],
  sources: [],
});

const itemTypeOptions = [
  { label: 'Farm Inputs', value: 'farm_inputs' },
  { label: 'Farm Produce', value: 'farm_produce' },
  { label: 'School Supplies', value: 'school_supplies' },
  { label: 'Medical Supplies', value: 'medical_supplies' },
  { label: 'Kitchen Supplies', value: 'kitchen_supplies' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Other', value: 'other' },
];

const statusOptions = [
  { label: 'In Stock', value: 'in_stock' },
  { label: 'Low Stock', value: 'low_stock' },
  { label: 'Out of Stock', value: 'out_of_stock' },
  { label: 'Reserved', value: 'reserved' },
];

const sourceOptions = [
  { label: 'Finance Purchase', value: 'finance_purchase' },
  { label: 'Farm Harvest', value: 'farm_harvest' },
  { label: 'Manual Entry', value: 'manual_entry' },
  { label: 'Donation', value: 'donation' },
];

const hasActiveFilters = computed(() => {
  return (
    localFilters.search ||
    localFilters.itemTypes.length > 0 ||
    localFilters.statuses.length > 0 ||
    localFilters.sources.length > 0
  );
});

function emitFilters() {
  emit('filter', { ...localFilters });
}

function clearFilters() {
  localFilters.search = '';
  localFilters.itemTypes = [];
  localFilters.statuses = [];
  localFilters.sources = [];
  emitFilters();
}

// Sync with store filters
watch(
  () => inventoryStore.filters,
  (newFilters) => {
    localFilters.search = newFilters.search;
    localFilters.itemTypes = [...newFilters.itemTypes];
    localFilters.statuses = [...newFilters.statuses];
    localFilters.sources = [...newFilters.sources];
  },
  { immediate: true },
);
</script>
