<!--
  VendorsSummaryWidget.vue (Story 5.7)

  Dashboard widget: active vendor counts by type + link to the vendors list.
-->
<template>
  <q-card flat bordered class="vendors-summary-widget">
    <q-card-section>
      <div class="row items-center justify-between">
        <div class="text-h6">
          <q-icon name="storefront" class="q-mr-sm" color="primary" />
          Vendors Summary
        </div>
        <q-btn flat dense round icon="open_in_new" color="primary" size="sm" to="/vendors">
          <q-tooltip>View All Vendors</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section v-if="loading">
      <q-skeleton type="rect" height="100px" />
    </q-card-section>

    <q-card-section v-else>
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12">
          <div class="text-center q-mb-sm">
            <div class="text-caption text-grey-7">Active Vendors</div>
            <div class="text-h4 text-weight-bold">{{ vendorsStore.activeVendors.length }}</div>
          </div>
        </div>
      </div>

      <div class="row q-col-gutter-sm">
        <div class="col-4">
          <q-card flat bordered class="summary-card bg-blue-1">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-caption text-grey-7">Suppliers</div>
              <div class="text-subtitle1 text-weight-bold text-blue">
                {{ vendorsStore.suppliers.length }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-4">
          <q-card flat bordered class="summary-card bg-orange-1">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-caption text-grey-7">Buyers</div>
              <div class="text-subtitle1 text-weight-bold text-orange">
                {{ vendorsStore.buyers.length }}
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-4">
          <q-card flat bordered class="summary-card bg-purple-1">
            <q-card-section class="q-pa-sm text-center">
              <div class="text-caption text-grey-7">Both</div>
              <div class="text-subtitle1 text-weight-bold text-purple">
                {{ vendorsStore.both.length }}
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div v-if="vendorsStore.vendors.length === 0" class="text-center text-grey-6 q-pa-md">
        <q-icon name="storefront" size="2rem" class="q-mb-sm" />
        <div class="text-caption">No vendors recorded yet</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useVendorsStore } from '../stores/vendors-store';

const vendorsStore = useVendorsStore();
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  await vendorsStore.fetchVendors();
  loading.value = false;
});
</script>

<style scoped>
.vendors-summary-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.summary-card {
  transition: transform 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
}
</style>
