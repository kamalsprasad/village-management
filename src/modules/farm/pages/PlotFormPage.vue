<!--
  PlotFormPage.vue
  Page for creating and editing plots.
  Handles both add (/farm/plots/add) and edit (/farm/plots/:id/edit) modes.
  
  Story 3.1: Farm Module - Plot Management
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mr-md" />
      <div>
        <h4 class="text-h5 q-my-none">{{ pageTitle }}</h4>
        <p class="text-grey-7 q-mb-none">{{ pageSubtitle }}</p>
      </div>
    </div>

    <!-- Form Card -->
    <q-card class="q-pa-md" style="max-width: 800px">
      <PlotForm
        :plot="plot"
        :mode="mode"
        :is-submitting="isSubmitting"
        @submit="handleSubmit"
        @cancel="goBack"
      />
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';
import PlotForm from '../components/PlotForm.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const errorHandler = useErrorHandler();
const farmStore = useFarmStore();

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(() => (mode.value === 'create' ? 'Add Plot' : 'Edit Plot'));

const isSubmitting = ref(false);

const mode = computed(() => {
  return route.name === 'farm-plot-edit' ? 'edit' : 'create';
});

const plotId = computed(() => {
  return route.params.id;
});

const pageTitle = computed(() => {
  return mode.value === 'create' ? 'Add New Plot' : 'Edit Plot';
});

const pageSubtitle = computed(() => {
  return mode.value === 'create' ? 'Create a new farm plot' : 'Update plot information';
});

const plot = computed(() => {
  return farmStore.currentPlot;
});

// Load plot data if editing
onMounted(async () => {
  if (mode.value === 'edit' && plotId.value) {
    const result = await farmStore.fetchPlotById(plotId.value);
    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: 'Failed to load plot: ' + result.error,
        position: 'top',
      });
      router.push('/farm/plots');
    }
  }
});

async function handleSubmit(formData) {
  isSubmitting.value = true;

  try {
    let result;
    if (mode.value === 'create') {
      result = await farmStore.createPlot(formData);
      if (result.success) {
        errorHandler.notifySuccess('Plot created successfully');
        router.push('/farm/plots');
      }
    } else {
      result = await farmStore.updatePlot(plotId.value, formData);
      if (result.success) {
        errorHandler.notifySuccess('Plot updated successfully');
        router.push(`/farm/plots/${plotId.value}`);
      }
    }

    if (!result.success) {
      $q.notify({
        type: 'negative',
        message: result.error || 'An error occurred',
        position: 'top',
      });
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.message || 'An error occurred',
      position: 'top',
    });
  } finally {
    isSubmitting.value = false;
  }
}

function goBack() {
  if (mode.value === 'edit' && plotId.value) {
    router.push(`/farm/plots/${plotId.value}`);
  } else {
    router.push('/farm/plots');
  }
}
</script>
