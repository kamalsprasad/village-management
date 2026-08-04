<!--
  VendorDetailPage.vue (Story 5.7)

  Vendor info + summary cards (total purchases/sales, transaction count) +
  chronological list of linked finance_transactions and farm_sales, with
  links back to the relevant module detail pages.
-->
<template>
  <q-page padding>
    <div class="vendor-detail-page">
      <div v-if="vendorsStore.isLoading && !vendor" class="q-pa-lg text-center">
        <q-spinner color="primary" size="3em" />
      </div>

      <template v-else-if="vendor">
        <!-- Header -->
        <div class="row items-start justify-between q-mb-md">
          <div class="row items-center">
            <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mr-sm" />
            <div class="q-ml-sm">
              <div class="row items-center q-gutter-sm">
                <h1 class="text-h5 text-weight-bold q-my-none">{{ vendor.name }}</h1>
                <q-badge
                  :color="getVendorTypeColor(vendor.vendor_type)"
                  :label="vendor.vendor_type"
                />
                <q-badge
                  v-if="vendor.is_preferred"
                  color="amber"
                  text-color="black"
                  label="Preferred"
                />
                <q-badge
                  :color="vendor.is_active !== false ? 'positive' : 'grey'"
                  :label="vendor.is_active !== false ? 'Active' : 'Inactive'"
                />
              </div>
              <p class="text-grey-7 q-mt-xs q-mb-none">
                {{ vendor.business_type || 'No business type set' }}
              </p>
            </div>
          </div>
          <q-btn
            v-if="hasPermission('vendors:write')"
            outline
            color="primary"
            icon="edit"
            label="Edit"
            :to="`/vendors/${vendor.$id}/edit`"
          />
        </div>

        <!-- Info card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="row q-col-gutter-md">
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Contact Person</div>
              <div>{{ vendor.contact_person || '—' }}</div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Phone</div>
              <div>{{ vendor.phone || '—' }}</div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Email</div>
              <div>{{ vendor.email || '—' }}</div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Payment Terms</div>
              <div>{{ vendor.payment_terms || '—' }}</div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Quality Rating</div>
              <q-rating
                v-if="vendor.quality_rating"
                :model-value="vendor.quality_rating"
                max="5"
                size="1.2em"
                color="amber"
                readonly
              />
              <div v-else>—</div>
            </div>
            <div class="col-12 col-sm-6 col-md-3">
              <div class="text-caption text-grey-7">Contract Expiry</div>
              <div>{{ vendor.contract_expiry ? vendor.contract_expiry.slice(0, 10) : '—' }}</div>
            </div>
            <div class="col-12" v-if="vendor.address">
              <div class="text-caption text-grey-7">Address</div>
              <div>{{ vendor.address }}</div>
            </div>
            <div class="col-12" v-if="vendor.notes">
              <div class="text-caption text-grey-7">Notes</div>
              <div>{{ vendor.notes }}</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Summary cards -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-sm-4">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <q-icon name="receipt_long" size="32px" color="primary" />
                <div class="text-caption text-grey-7">Transactions</div>
                <div class="text-h5">{{ totals.transactionCount }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-4">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <q-icon name="shopping_cart" size="32px" color="negative" />
                <div class="text-caption text-grey-7">Total Purchases (Expenses)</div>
                <div class="text-h5">{{ formatCurrency(totals.totalPurchases) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-4">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <q-icon name="sell" size="32px" color="positive" />
                <div class="text-caption text-grey-7">Total Sales</div>
                <div class="text-h5">{{ formatCurrency(totals.totalSales) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- History -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Transaction History</div>

            <div v-if="vendorsStore.isLoading" class="text-center q-pa-md">
              <q-spinner color="primary" size="2em" />
            </div>

            <q-list v-else-if="vendorsStore.vendorHistory.length > 0" bordered separator>
              <q-item
                v-for="entry in vendorsStore.vendorHistory"
                :key="`${entry.source}-${entry.id}`"
                clickable
                @click="onHistoryClick(entry)"
              >
                <q-item-section avatar>
                  <q-icon
                    :name="entry.source === 'finance' ? 'account_balance_wallet' : 'agriculture'"
                    :color="entry.source === 'finance' ? 'negative' : 'positive'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ entry.description }}</q-item-label>
                  <q-item-label caption>
                    {{ formatDate(entry.date) }} &bull;
                    {{ entry.source === 'finance' ? 'Finance Expense' : 'Farm Sale' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label
                    :class="entry.amount < 0 ? 'text-negative' : 'text-positive'"
                    class="text-weight-medium"
                  >
                    {{ formatCurrency(Math.abs(entry.amount)) }}
                  </q-item-label>
                  <q-item-label caption>{{ entry.status }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <div v-else class="text-center text-grey-6 q-pa-md">
              <q-icon name="inbox" size="2rem" class="q-mb-sm" />
              <div>No transactions recorded for this vendor yet</div>
            </div>
          </q-card-section>
        </q-card>
      </template>

      <div v-else class="text-center text-grey-6 q-pa-lg">
        <q-icon name="error_outline" size="3rem" class="q-mb-sm" />
        <div>Vendor not found</div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useVendorsStore } from '../stores/vendors-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';
import { getVendorTypeColor } from '../utils/vendor-utils';

const router = useRouter();
const route = useRoute();
const vendorsStore = useVendorsStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(() => vendor.value?.name || 'Vendor');

const vendor = computed(() => vendorsStore.currentVendor);
const totals = computed(() => vendorsStore.vendorTransactionTotals);

function formatCurrency(amount) {
  if (settingsStore.formatCurrency) return settingsStore.formatCurrency(amount || 0);
  return `ZMW ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
}

function onHistoryClick(entry) {
  if (entry.source === 'finance') {
    router.push('/finance/transactions');
  } else {
    router.push(`/farm/sales/${entry.id}`);
  }
}

onMounted(async () => {
  const id = route.params.id;
  if (!id) return;
  await vendorsStore.fetchVendorById(id);
  await vendorsStore.fetchVendorHistory(id);
});
</script>

<style scoped>
.vendor-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
