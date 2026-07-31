<!--
  VendorsListPage.vue (Story 5.7)

  Paginated/filterable list of vendors/suppliers. Filters by vendor type and
  free-text search on name/contact person. Row click navigates to the vendor
  detail page.
-->
<template>
  <q-page padding>
    <div class="vendors-list-page">
      <!-- Header -->
      <div class="row items-center justify-between q-mb-md">
        <div>
          <h1 class="text-h5 text-weight-bold q-my-none">Vendors &amp; Suppliers</h1>
          <p class="text-grey-7 q-mt-xs q-mb-none">
            Manage suppliers, buyers, and their transaction history
          </p>
        </div>
        <q-btn
          v-if="hasPermission('vendors:write')"
          color="primary"
          icon="add"
          label="Add Vendor"
          to="/vendors/add"
        />
      </div>

      <!-- Stats -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-6 col-sm-3">
          <q-card flat bordered>
            <q-card-section class="text-center">
              <div class="text-caption text-grey-7">Total</div>
              <div class="text-h5">{{ vendorsStore.vendors.length }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-sm-3">
          <q-card flat bordered>
            <q-card-section class="text-center">
              <div class="text-caption text-grey-7">Suppliers</div>
              <div class="text-h5 text-blue">{{ vendorsStore.suppliers.length }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-sm-3">
          <q-card flat bordered>
            <q-card-section class="text-center">
              <div class="text-caption text-grey-7">Buyers</div>
              <div class="text-h5 text-orange">{{ vendorsStore.buyers.length }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-sm-3">
          <q-card flat bordered>
            <q-card-section class="text-center">
              <div class="text-caption text-grey-7">Active</div>
              <div class="text-h5 text-positive">{{ vendorsStore.activeVendors.length }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Filters -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <q-input v-model="search" label="Search by name or contact" outlined dense clearable>
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <q-select
              v-model="typeFilter"
              :options="['Supplier', 'Buyer', 'Both']"
              label="Vendor Type"
              outlined
              dense
              clearable
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Table -->
      <q-card flat bordered>
        <q-table
          :rows="filteredVendors"
          :columns="columns"
          row-key="$id"
          :loading="vendorsStore.isLoading"
          flat
          @row-click="onRowClick"
        >
          <template #no-data>
            <div class="full-width text-center text-grey-6 q-pa-md">
              <q-icon name="storefront" size="2rem" class="q-mb-sm" />
              <div>No vendors recorded yet. Click "Add Vendor" to create one.</div>
            </div>
          </template>

          <template #body-cell-vendor_type="props">
            <q-td :props="props">
              <q-badge :color="getVendorTypeColor(props.value)" :label="props.value" />
            </q-td>
          </template>

          <template #body-cell-quality_rating="props">
            <q-td :props="props">
              <q-rating
                v-if="props.value"
                :model-value="props.value"
                max="5"
                size="1em"
                color="amber"
                readonly
              />
              <span v-else class="text-grey-6">—</span>
            </q-td>
          </template>

          <template #body-cell-is_active="props">
            <q-td :props="props">
              <q-badge
                :color="props.value ? 'positive' : 'grey'"
                :label="props.value ? 'Active' : 'Inactive'"
              />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useVendorsStore } from '../stores/vendors-store';
import { getVendorTypeColor } from '../utils/vendor-utils';
import { usePermissions } from 'src/composables/usePermissions';

const router = useRouter();
const vendorsStore = useVendorsStore();
const { hasPermission } = usePermissions();

const search = ref('');
const typeFilter = ref(null);

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'vendor_type', label: 'Type', field: 'vendor_type', align: 'left', sortable: true },
  {
    name: 'business_type',
    label: 'Business',
    field: 'business_type',
    align: 'left',
    sortable: true,
  },
  { name: 'phone', label: 'Phone', field: 'phone', align: 'left' },
  { name: 'quality_rating', label: 'Rating', field: 'quality_rating', align: 'center' },
  { name: 'is_active', label: 'Status', field: 'is_active', align: 'center' },
];

const filteredVendors = computed(() => {
  let list = vendorsStore.vendors;

  if (typeFilter.value) {
    list = list.filter((v) => v.vendor_type === typeFilter.value);
  }

  if (search.value?.trim()) {
    const term = search.value.trim().toLowerCase();
    list = list.filter(
      (v) => v.name?.toLowerCase().includes(term) || v.contact_person?.toLowerCase().includes(term),
    );
  }

  return list;
});

function onRowClick(evt, row) {
  router.push(`/vendors/${row.$id}`);
}

onMounted(async () => {
  await vendorsStore.fetchVendors();
});
</script>

<style scoped>
.vendors-list-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
