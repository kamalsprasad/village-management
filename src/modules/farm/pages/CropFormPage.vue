<!--
  CropFormPage.vue
  Add/Edit crop page using CropForm component.
  
  Story 3.2: Farm Module - Crops Database
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" @click="goBack" class="q-mr-sm" />
      <div>
        <h5 class="q-my-none">{{ pageTitle }}</h5>
        <p class="text-grey q-mt-xs q-mb-none">{{ pageSubtitle }}</p>
      </div>
    </div>

    <!-- Form -->
    <div class="row">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card bordered>
          <q-card-section>
            <CropForm
              :crop="existingCrop"
              :mode="mode"
              :is-submitting="isSubmitting"
              @submit="handleSubmit"
              @cancel="goBack"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import CropForm from '../components/CropForm.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const farmStore = useFarmStore();

// Determine mode from route
const mode = computed(() => {
  return route.name === 'farm-crop-edit' ? 'edit' : 'create';
});

const cropId = computed(() => route.params.id);

const pageTitle = computed(() => {
  return mode.value === 'create' ? 'Add New Crop' : 'Edit Crop';
});

const pageSubtitle = computed(() => {
  return mode.value === 'create' 
    ? 'Add a new crop to the database' 
    : 'Update crop information';
});

// State
const existingCrop = ref(null);
const isLoading = ref(false);
const isSubmitting = ref(false);

// Load existing crop data if editing
onMounted(async () => {
  if (mode.value === 'edit' && cropId.value) {
    isLoading.value = true;
    try {
      // Try to find in store first
      const cached = farmStore.crops.find((c) => c.$id === cropId.value);
      if (cached) {
        existingCrop.value = cached;
      } else {
        // Fetch from server
        const result = await farmStore.fetchCropById(cropId.value);
        if (result.success) {
          existingCrop.value = result.data;
        } else {
          $q.notify({
            type: 'negative',
            message: 'Failed to load crop data',
            caption: result.error,
          });
          goBack();
        }
      }
    } finally {
      isLoading.value = false;
    }
  }
});

// Handle form submission
async function handleSubmit(formData) {
  isSubmitting.value = true;

  try {
    let result;

    if (mode.value === 'create') {
      result = await farmStore.createCrop(formData);
      if (result.success) {
        $q.notify({
          type: 'positive',
          message: `Crop "${formData.crop_name}" created successfully`,
        });
        router.push(`/farm/crops/${result.data.$id}`);
      }
    } else {
      result = await farmStore.updateCrop(cropId.value, formData);
      if (result.success) {
        $q.notify({
          type: 'positive',
          message: `Crop "${formData.crop_name}" updated successfully`,
        });
        router.push(`/farm/crops/${cropId.value}`);
      }
    }

    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: `Failed to ${mode.value} crop`,
        caption: result.error,
      });
    }
  } catch (error) {
    console.error('Form submission error:', error);
    $q.notify({
      type: 'negative',
      message: 'An unexpected error occurred',
      caption: error.message,
    });
  } finally {
    isSubmitting.value = false;
  }
}

// Navigation
function goBack() {
  if (mode.value === 'edit' && cropId.value) {
    router.push(`/farm/crops/${cropId.value}`);
  } else {
    router.push('/farm/crops');
  }
}
</script>
