<!--
  CropDetailPage.vue
  Detail page showing crop information with management options.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-page class="q-pa-md" v-if="crop">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div class="row items-center">
        <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mr-sm" />
        <div>
          <div class="row items-center">
            <h4 class="text-h5 q-my-none">{{ crop.crop_name }}</h4>
            <q-badge v-if="!crop.is_active" color="grey" class="q-ml-md">Inactive</q-badge>
          </div>
          <p class="text-grey-7 q-mb-none">
            <CropCategoryBadge :category="crop.category" />
            <CropTypeIndicator :crop-type="crop.crop_type" class="q-ml-sm" />
          </p>
        </div>
      </div>
      <div class="row q-gutter-sm" v-if="hasPermission('farm:admin')">
        <q-btn
          :label="crop.is_active ? 'Deactivate' : 'Reactivate'"
          :color="crop.is_active ? 'negative' : 'positive'"
          :icon="crop.is_active ? 'visibility_off' : 'visibility'"
          outline
          @click="toggleActive"
          :loading="isToggling"
        />
        <q-btn color="primary" icon="edit" label="Edit" @click="editCrop" />
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Basic Information -->
      <div class="col-12 col-md-6">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Basic Information</div>
            <div class="row q-col-gutter-y-md">
              <div class="col-12">
                <div class="text-caption text-grey">Crop Name</div>
                <div class="text-body1">{{ crop.crop_name }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey">Category</div>
                <div class="text-body1">
                  <CropCategoryBadge :category="crop.category" />
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey">Type</div>
                <div class="text-body1">
                  <CropTypeIndicator :crop-type="crop.crop_type" />
                </div>
              </div>
              <div class="col-12" v-if="crop.notes">
                <div class="text-caption text-grey">Notes</div>
                <div class="text-body1">{{ crop.notes }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Growing Characteristics -->
      <div class="col-12 col-md-6">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Growing Characteristics</div>
            <div class="row q-col-gutter-y-md">
              <div class="col-6">
                <div class="text-caption text-grey">Maturity</div>
                <div class="text-body1">{{ formatMaturity(crop.maturity_days) }}</div>
              </div>
              <div class="col-6" v-if="crop.crop_type === 'Perennial' && crop.harvest_frequency">
                <div class="text-caption text-grey">Harvest Frequency</div>
                <div class="text-body1">Every {{ crop.harvest_frequency }} days</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey">Typical Yield</div>
                <div class="text-body1">{{ formatYield(crop.typical_yield_per_hectare) }}</div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey">Growing Season</div>
                <div class="text-body1">
                  <q-badge
                    v-if="crop.growing_season"
                    :color="getSeasonColor(crop.growing_season)"
                    outline
                  >
                    {{ crop.growing_season }}
                  </q-badge>
                  <span v-else class="text-grey">Not specified</span>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Usage Statistics (Placeholder for Story 3.9) -->
      <div class="col-12">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Usage Statistics</div>
            <div class="text-center q-pa-md text-grey">
              <q-icon name="insights" size="3em" class="q-mb-sm" />
              <div>Usage statistics will be available after planting records are created</div>
              <div class="text-caption q-mt-sm">(Story 3.9: Profitability Analysis)</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Recent Plantings (Placeholder for Story 3.4) -->
      <div class="col-12">
        <q-card bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Recent Plantings</div>
            <div class="text-center q-pa-md text-grey">
              <q-icon name="agriculture" size="3em" class="q-mb-sm" />
              <div>Planting history will appear here once plantings are recorded</div>
              <div class="text-caption q-mt-sm">(Story 3.4: Planting History)</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Deactivate/Reactivate Confirmation Dialog -->
    <q-dialog v-model="toggleDialogOpen" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar
            :icon="crop.is_active ? 'visibility_off' : 'visibility'"
            :color="crop.is_active ? 'negative' : 'positive'"
            text-color="white"
          />
          <span class="q-ml-sm text-h6"
            >{{ crop.is_active ? 'Deactivate' : 'Reactivate' }} Crop?</span
          >
        </q-card-section>
        <q-card-section>
          <p v-if="crop.is_active">
            Deactivating "{{ crop.crop_name }}" will hide it from planting forms. Existing plantings
            will not be affected.
          </p>
          <p v-else>
            Reactivating "{{ crop.crop_name }}" will make it available in planting forms again.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn
            flat
            :label="crop.is_active ? 'Deactivate' : 'Reactivate'"
            :color="crop.is_active ? 'negative' : 'positive'"
            :loading="isToggling"
            @click="confirmToggle"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>

  <!-- Loading State -->
  <q-page class="q-pa-md flex flex-center" v-else-if="isLoading">
    <q-spinner-dots size="50px" color="primary" />
  </q-page>

  <!-- Error State -->
  <q-page class="q-pa-md" v-else>
    <q-banner class="bg-negative text-white">
      <template #avatar>
        <q-icon name="error" />
      </template>
      Failed to load crop data
      <template #action>
        <q-btn flat label="Go Back" @click="goBack" />
      </template>
    </q-banner>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';
import CropCategoryBadge from '../components/CropCategoryBadge.vue';
import CropTypeIndicator from '../components/CropTypeIndicator.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(() => crop.value?.crop_name || 'Crop');

const cropId = route.params.id;
const crop = ref(null);
const isLoading = ref(true);
const isToggling = ref(false);
const toggleDialogOpen = ref(false);

// Helper functions
function formatMaturity(days) {
  if (!days) return 'Not specified';
  return `${days} days to first harvest`;
}

function formatYield(yieldValue) {
  if (!yieldValue) return 'Not specified';
  const unit = settingsStore.yieldUnit;

  if (unit === 'tonnes_per_hectare') {
    return `${(yieldValue / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} tonnes/hectare`;
  } else if (unit === 'kg_per_acre') {
    return `${(yieldValue * 0.404686).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg/acre`;
  }

  return `${yieldValue.toLocaleString()} kg/hectare`;
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
function goBack() {
  router.push('/farm/crops');
}

function editCrop() {
  router.push(`/farm/crops/${cropId}/edit`);
}

function toggleActive() {
  toggleDialogOpen.value = true;
}

async function confirmToggle() {
  isToggling.value = true;
  try {
    const newState = !crop.value.is_active;
    const result = await farmStore.toggleCropActive(cropId, newState);

    if (result.success) {
      crop.value = result.data;
      toggleDialogOpen.value = false;
      $q.notify({
        type: 'positive',
        message: `Crop "${crop.value.crop_name}" ${newState ? 'reactivated' : 'deactivated'} successfully`,
      });
    } else {
      $q.notify({
        type: 'negative',
        message: `Failed to ${newState ? 'reactivate' : 'deactivate'} crop`,
        caption: result.error,
      });
    }
  } catch (error) {
    console.error('Toggle error:', error);
    $q.notify({
      type: 'negative',
      message: 'An unexpected error occurred',
    });
  } finally {
    isToggling.value = false;
  }
}

// Load crop data
onMounted(async () => {
  isLoading.value = true;
  try {
    // Try to find in store first
    const cached = farmStore.crops.find((c) => c.$id === cropId);
    if (cached) {
      crop.value = cached;
    } else {
      // Fetch from server
      const result = await farmStore.fetchCropById(cropId);
      if (result.success) {
        crop.value = result.data;
      } else {
        $q.notify({
          type: 'negative',
          message: 'Failed to load crop data',
          caption: result.error,
        });
      }
    }
  } finally {
    isLoading.value = false;
  }
});
</script>
