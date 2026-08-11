<!--
  CropsListPage.vue
  List page for all crops with filtering and search.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h5 class="q-my-none">Crop Database</h5>
        <p class="text-grey q-mt-xs q-mb-none">Manage available crops for your region</p>
      </div>
      <q-btn
        v-if="hasPermission('farm:admin')"
        color="primary"
        icon="add"
        label="Add Crop"
        @click="$router.push('/farm/crops/add')"
      />
    </div>

    <!-- Filters -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-md-4">
        <q-input v-model="searchQuery" label="Search crops" dense outlined clearable debounce="300">
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="categoryFilter"
          :options="categoryOptions"
          label="Filter by Category"
          dense
          outlined
          clearable
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-md-3">
        <q-select
          v-model="typeFilter"
          :options="typeOptions"
          label="Filter by Type"
          dense
          outlined
          clearable
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-md-2">
        <q-toggle v-model="showInactive" label="Show Inactive" class="q-mt-sm" />
      </div>
    </div>

    <!-- Table -->
    <q-table
      :rows="filteredCrops"
      :columns="columns"
      row-key="$id"
      :loading="farmStore.isCropsLoading || loading"
      :pagination="pagination"
      @row-click="onRowClick"
    >
      <!-- Loading state -->
      <template #loading>
        <q-inner-loading showing>
          <q-spinner-dots size="50px" color="primary" />
        </q-inner-loading>
      </template>

      <!-- Empty state -->
      <template #no-data>
        <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey">
          <q-icon name="grass" size="2em" />
          <span
            >No crops found.
            {{ hasPermission('farm:admin') ? "Click 'Add Crop' to get started." : '' }}</span
          >
        </div>
      </template>

      <!-- Crop Name column -->
      <template #body-cell-crop_name="{ row }">
        <q-td>
          <div class="row items-center">
            <span class="text-weight-medium">{{ row.crop_name }}</span>
            <q-icon
              v-if="!row.is_active"
              name="visibility_off"
              size="xs"
              color="grey"
              class="q-ml-sm"
            >
              <q-tooltip>Inactive</q-tooltip>
            </q-icon>
          </div>
        </q-td>
      </template>

      <!-- Category column -->
      <template #body-cell-category="{ row }">
        <q-td>
          <CropCategoryBadge :category="row.category" />
        </q-td>
      </template>

      <!-- Type column -->
      <template #body-cell-crop_type="{ row }">
        <q-td>
          <CropTypeIndicator :crop-type="row.crop_type" />
        </q-td>
      </template>

      <!-- Maturity column -->
      <template #body-cell-maturity_days="{ row }">
        <q-td>
          {{ formatMaturity(row.maturity_days) }}
        </q-td>
      </template>

      <!-- Yield column -->
      <template #body-cell-typical_yield_per_hectare="{ row }">
        <q-td>
          {{ formatYield(row.typical_yield_per_hectare) }}
        </q-td>
      </template>

      <!-- Growing Season column -->
      <template #body-cell-growing_season="{ row }">
        <q-td>
          <q-badge v-if="row.growing_season" :color="getSeasonColor(row.growing_season)" outline>
            {{ row.growing_season }}
          </q-badge>
          <span v-else class="text-grey">-</span>
        </q-td>
      </template>

      <!-- Actions column -->
      <template #body-cell-actions="{ row }">
        <q-td class="text-right">
          <q-btn flat round dense icon="visibility" @click.stop="viewCrop(row.$id)">
            <q-tooltip>View Details</q-tooltip>
          </q-btn>
          <q-btn
            v-if="hasPermission('farm:admin')"
            flat
            round
            dense
            icon="edit"
            @click.stop="editCrop(row.$id)"
          >
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <!-- Stats Summary -->
    <div class="row q-col-gutter-md q-mt-md">
      <div class="col-6 col-md-4 col-lg-2" v-for="stat in categoryStats" :key="stat.category">
        <q-card bordered flat>
          <q-card-section class="row items-center">
            <q-icon :name="stat.icon" :color="stat.color" size="2rem" class="q-mr-md" />
            <div>
              <div class="text-h6">{{ stat.count }}</div>
              <div class="text-caption text-grey">{{ stat.label }}</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import CropCategoryBadge from '../components/CropCategoryBadge.vue';
import CropTypeIndicator from '../components/CropTypeIndicator.vue';

const router = useRouter();
const farmStore = useFarmStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

// Table columns
const columns = [
  {
    name: 'crop_name',
    label: 'Crop Name',
    field: 'crop_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'category',
    label: 'Category',
    field: 'category',
    align: 'center',
    sortable: true,
  },
  {
    name: 'crop_type',
    label: 'Type',
    field: 'crop_type',
    align: 'center',
    sortable: true,
  },
  {
    name: 'maturity_days',
    label: 'Maturity',
    field: 'maturity_days',
    align: 'center',
    sortable: true,
  },
  {
    name: 'typical_yield_per_hectare',
    label: 'Typical Yield',
    field: 'typical_yield_per_hectare',
    align: 'center',
    sortable: true,
  },
  {
    name: 'growing_season',
    label: 'Season',
    field: 'growing_season',
    align: 'center',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'right',
  },
];

// Pagination
const pagination = ref({
  rowsPerPage: 25,
});

// Filters
const searchQuery = ref('');
const categoryFilter = ref(null);
const typeFilter = ref(null);
const showInactive = ref(false);

// Loading state (covers initial onMounted fetch)
const loading = ref(true);

// Filter options
const categoryOptions = [
  { label: 'Grain', value: 'Grain' },
  { label: 'Legume', value: 'Legume' },
  { label: 'Vegetable', value: 'Vegetable' },
  { label: 'Root', value: 'Root' },
  { label: 'Fruit', value: 'Fruit' },
  { label: 'Other', value: 'Other' },
];

const typeOptions = [
  { label: 'Annual', value: 'Annual' },
  { label: 'Perennial', value: 'Perennial' },
];

// Filtered crops
const filteredCrops = computed(() => {
  let crops = farmStore.crops;

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    crops = crops.filter((c) => c.crop_name.toLowerCase().includes(query));
  }

  // Category filter
  if (categoryFilter.value) {
    crops = crops.filter((c) => c.category === categoryFilter.value);
  }

  // Type filter
  if (typeFilter.value) {
    crops = crops.filter((c) => c.crop_type === typeFilter.value);
  }

  // Active/Inactive filter
  if (!showInactive.value) {
    crops = crops.filter((c) => c.is_active !== false);
  }

  return crops;
});

// Category stats for summary cards
const categoryStats = computed(() => {
  const categories = [
    { category: 'Grain', icon: 'grain', color: 'amber-7', label: 'Grains' },
    { category: 'Legume', icon: 'grass', color: 'green-7', label: 'Legumes' },
    { category: 'Vegetable', icon: 'eco', color: 'green-5', label: 'Vegetables' },
    { category: 'Root', icon: 'spa', color: 'brown-5', label: 'Roots' },
    { category: 'Fruit', icon: 'apple', color: 'red-5', label: 'Fruits' },
    { category: 'Other', icon: 'park', color: 'grey-6', label: 'Other' },
  ];

  return categories.map((cat) => ({
    ...cat,
    count: farmStore.crops.filter((c) => c.category === cat.category && c.is_active !== false)
      .length,
  }));
});

// Helper functions
function formatMaturity(days) {
  if (!days) return '-';
  return `${days} days`;
}

function formatYield(yieldValue) {
  if (!yieldValue) return '-';
  const unit = settingsStore.yieldUnit;

  if (unit === 'tonnes_per_hectare') {
    return `${(yieldValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t/ha`;
  } else if (unit === 'kg_per_acre') {
    return `${(yieldValue * 0.404686).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg/acre`;
  }

  return `${yieldValue.toLocaleString()} kg/ha`;
}

function getSeasonColor(season) {
  const colors = {
    Warm: 'orange',
    Wet: 'blue',
    Cool: 'cyan',
    'All Year': 'green',
  };
  return colors[season] || 'grey';
}

// Actions
function onRowClick(evt, row) {
  viewCrop(row.$id);
}

function viewCrop(cropId) {
  router.push(`/farm/crops/${cropId}`);
}

function editCrop(cropId) {
  router.push(`/farm/crops/${cropId}/edit`);
}

// Load data on mount
onMounted(async () => {
  loading.value = true;
  try {
    if (!farmStore.cropsLoaded) {
      await farmStore.fetchCrops();
    }
  } finally {
    loading.value = false;
  }
});
</script>
