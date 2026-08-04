<!--
  VendorFormPage.vue (Story 5.7)

  Add/Edit form for vendors. Handles both /vendors/add and /vendors/:id/edit.
-->
<template>
  <q-page padding>
    <div class="vendor-form-page">
      <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mb-md" />
      <div class="row items-center q-mb-md">
        <h1 class="text-h5 text-weight-bold q-my-none q-ml-sm">
          {{ isEditMode ? 'Edit Vendor' : 'Add Vendor' }}
        </h1>
      </div>

      <q-card flat bordered>
        <q-card-section>
          <q-form ref="formRef" @submit.prevent="onSubmit" greedy>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formData.name"
                  label="Vendor Name *"
                  outlined
                  dense
                  maxlength="200"
                  :rules="[(val) => !!val?.trim() || 'Name is required']"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.vendor_type"
                  :options="VENDOR_TYPE_OPTIONS"
                  label="Vendor Type *"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Vendor type is required']"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-select
                  v-model="formData.business_type"
                  :options="BUSINESS_TYPE_OPTIONS"
                  label="Business Type"
                  outlined
                  dense
                  clearable
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formData.contact_person"
                  label="Contact Person"
                  outlined
                  dense
                  maxlength="100"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-input v-model="formData.phone" label="Phone" outlined dense maxlength="30" />
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formData.email"
                  label="Email"
                  type="email"
                  outlined
                  dense
                  :rules="[(val) => !val || /.+@.+\..+/.test(val) || 'Invalid email']"
                />
              </div>

              <div class="col-12">
                <q-input
                  v-model="formData.address"
                  label="Address"
                  outlined
                  dense
                  maxlength="500"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formData.payment_terms"
                  label="Payment Terms"
                  outlined
                  dense
                  maxlength="255"
                  hint="e.g. Net 30, Cash on delivery"
                />
              </div>

              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7 q-mb-xs">Quality Rating</div>
                <q-rating
                  v-model="formData.quality_rating"
                  max="5"
                  size="2em"
                  color="amber"
                  icon="star_border"
                  icon-selected="star"
                />
              </div>

              <div class="col-12 col-sm-6">
                <q-input
                  v-model="formData.contract_expiry"
                  label="Contract Expiry"
                  type="date"
                  outlined
                  dense
                />
              </div>

              <div class="col-12 col-sm-6 row items-center q-gutter-md">
                <q-checkbox v-model="formData.is_preferred" label="Preferred vendor" />
                <q-checkbox v-model="formData.is_active" label="Active" />
              </div>

              <div class="col-12">
                <q-input
                  v-model="formData.notes"
                  label="Notes"
                  type="textarea"
                  rows="3"
                  outlined
                  dense
                  maxlength="1000"
                  counter
                />
              </div>
            </div>

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn label="Cancel" outline @click="router.back()" :disable="isSubmitting" />
              <q-btn
                type="submit"
                color="primary"
                :label="isEditMode ? 'Save Changes' : 'Add Vendor'"
                :loading="isSubmitting"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useVendorsStore } from '../stores/vendors-store';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';
import { VENDOR_TYPE_OPTIONS, BUSINESS_TYPE_OPTIONS } from '../utils/vendor-utils';

const router = useRouter();
const route = useRoute();
const vendorsStore = useVendorsStore();

const formRef = ref(null);
const isSubmitting = ref(false);

const vendorId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!vendorId.value);

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(() => (isEditMode.value ? 'Edit Vendor' : 'Add Vendor'));

const defaultFormData = () => ({
  name: '',
  vendor_type: null,
  business_type: null,
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  payment_terms: '',
  quality_rating: null,
  contract_expiry: '',
  is_preferred: false,
  is_active: true,
  notes: '',
});

const formData = ref(defaultFormData());

async function loadVendor() {
  if (!vendorId.value) return;
  const result = await vendorsStore.fetchVendorById(vendorId.value);
  if (!result.success || !result.data) {
    // Load failed (not found / network / permission) — bail to the list rather
    // than rendering an empty form the user could "save" into a duplicate.
    router.replace('/vendors');
    return;
  }
  const v = result.data;
  formData.value = {
    name: v.name || '',
    vendor_type: v.vendor_type || null,
    business_type: v.business_type || null,
    contact_person: v.contact_person || '',
    phone: v.phone || '',
    email: v.email || '',
    address: v.address || '',
    payment_terms: v.payment_terms || '',
    quality_rating: v.quality_rating ?? null,
    contract_expiry: v.contract_expiry ? v.contract_expiry.slice(0, 10) : '',
    is_preferred: !!v.is_preferred,
    is_active: v.is_active !== false,
    notes: v.notes || '',
  };
}

async function onSubmit() {
  const isValid = await formRef.value.validate();
  if (!isValid) return;

  isSubmitting.value = true;
  try {
    const payload = {
      ...formData.value,
      contract_expiry: formData.value.contract_expiry || null,
    };

    let result;
    if (isEditMode.value) {
      result = await vendorsStore.updateVendor(vendorId.value, payload);
    } else {
      result = await vendorsStore.createVendor(payload);
    }

    if (result.success) {
      router.push(`/vendors/${result.data.$id}`);
    }
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await loadVendor();
});
</script>

<style scoped>
.vendor-form-page {
  max-width: 900px;
  margin: 0 auto;
}
</style>
