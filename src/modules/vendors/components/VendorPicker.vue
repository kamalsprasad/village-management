<!--
  VendorPicker.vue (Story 5.7)

  Reusable vendor picker used by TransactionForm.vue (finance expenses) and
  RecordSaleDialog.vue (farm sales). Wraps a filterable q-select over the
  vendors store with an "Ad-hoc" fallback option that reveals a free-text
  input for buyers/suppliers that are not in the Vendors module yet.

  v-model shape: { id, name, type } where type is 'vendor' | 'external'.
  When ad-hoc text is entered, the emitted object also includes `adHocName`
  (same value as `name`) so callers that need to prepend it elsewhere (e.g.
  finance transaction description) can do so without re-deriving it.
-->
<template>
  <div class="vendor-picker">
    <q-select
      v-model="selectedOption"
      :options="filteredOptions"
      :label="label"
      outlined
      dense
      clearable
      use-input
      input-debounce="200"
      option-value="key"
      option-label="label"
      emit-value
      map-options
      @filter="onFilter"
      @clear="onClear"
    >
      <template #prepend>
        <q-icon name="storefront" />
      </template>

      <template #before-options>
        <q-item clickable v-close-popup @click="onAddVendorClick">
          <q-item-section avatar>
            <q-icon name="add" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-primary">Add Vendor</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator />
      </template>

      <template #option="scope">
        <q-item v-bind="scope.itemProps">
          <q-item-section avatar v-if="scope.opt.isAdHoc">
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ scope.opt.label }}</q-item-label>
            <q-item-label v-if="scope.opt.caption" caption>
              {{ scope.opt.caption }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </template>

      <template #no-option>
        <q-item>
          <q-item-section class="text-grey"> No matching vendors </q-item-section>
        </q-item>
      </template>
    </q-select>

    <q-input
      v-if="showAdHocInput"
      v-model="adHocText"
      :label="adHocLabel"
      outlined
      dense
      class="q-mt-sm"
      @update:model-value="onAdHocTextChange"
    >
      <template #prepend>
        <q-icon name="edit" />
      </template>
    </q-input>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useVendorsStore } from '../stores/vendors-store';

const ADHOC_KEY = '__adhoc__';

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
  // false (default) = supplier picker (finance expenses); true = buyer picker (farm sales)
  buyerMode: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: 'Vendor',
  },
});

const emit = defineEmits(['update:modelValue']);

const router = useRouter();
const vendorsStore = useVendorsStore();

const searchTerm = ref('');
const showAdHocInput = ref(false);
const adHocText = ref('');

const adHocLabel = computed(() =>
  props.buyerMode ? 'Buyer Name (Ad-hoc) *' : 'Vendor/Supplier Name (Ad-hoc)',
);

const relevantVendors = computed(() => {
  const list = props.buyerMode ? vendorsStore.buyers : vendorsStore.suppliers;
  return list.filter((v) => v.is_active !== false);
});

const vendorOptions = computed(() =>
  relevantVendors.value.map((v) => ({
    key: v.$id,
    label: v.name,
    caption: v.business_type || '',
    vendor: v,
    isAdHoc: false,
  })),
);

const adHocOption = {
  key: ADHOC_KEY,
  label: 'Ad-hoc (not in Vendors list)',
  caption: 'Enter a free-text name below',
  isAdHoc: true,
};

const filteredOptions = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  const base = term
    ? vendorOptions.value.filter((o) => o.label.toLowerCase().includes(term))
    : vendorOptions.value;
  return [...base, adHocOption];
});

// Currently selected option key, synced with modelValue
const selectedOption = computed({
  get() {
    if (!props.modelValue) return null;
    if (props.modelValue.type === 'external') return ADHOC_KEY;
    return props.modelValue.id || null;
  },
  set(key) {
    if (!key) {
      onClear();
      return;
    }
    if (key === ADHOC_KEY) {
      showAdHocInput.value = true;
      emit('update:modelValue', {
        id: '',
        name: adHocText.value,
        type: 'external',
        adHocName: adHocText.value,
      });
      return;
    }
    showAdHocInput.value = false;
    const vendor = relevantVendors.value.find((v) => v.$id === key);
    if (vendor) {
      emit('update:modelValue', { id: vendor.$id, name: vendor.name, type: 'vendor' });
    }
  },
});

function onFilter(val, update) {
  update(() => {
    searchTerm.value = val;
  });
}

function onClear() {
  showAdHocInput.value = false;
  adHocText.value = '';
  emit('update:modelValue', null);
}

function onAdHocTextChange(val) {
  adHocText.value = val;
  emit('update:modelValue', {
    id: '',
    name: val,
    type: 'external',
    adHocName: val,
  });
}

function onAddVendorClick() {
  router.push('/vendors/add');
}

// Initialize ad-hoc text when modelValue arrives pre-populated (edit mode)
watch(
  () => props.modelValue,
  (val) => {
    if (val?.type === 'external') {
      showAdHocInput.value = true;
      if (val.name !== adHocText.value) {
        adHocText.value = val.name || '';
      }
    } else if (!val) {
      showAdHocInput.value = false;
      adHocText.value = '';
    }
  },
  { immediate: true },
);

onMounted(() => {
  vendorsStore.fetchVendors();
});
</script>

<style scoped>
.vendor-picker {
  width: 100%;
}
</style>
