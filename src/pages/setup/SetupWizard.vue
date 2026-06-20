<template>
  <q-layout view="lHh Lpr lFf" key="setup-wizard-layout">
    <q-page-container>
      <q-page
        class="setup-wizard-page flex flex-center"
        style="background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)"
        key="setup-wizard-page"
      >
        <div class="setup-container q-pa-lg" style="max-width: 900px; width: 100%">
          <!-- Welcome Header -->
          <div class="text-center q-mb-xl">
            <q-icon name="home_work" size="64px" color="primary" class="q-mb-md" />
            <h1 class="text-h4 text-weight-bold q-mb-sm">Welcome to Village Management System</h1>
            <p class="text-subtitle1 text-grey-7">
              Choose how you'd like to get started with your village management platform.
            </p>
          </div>

          <!-- Option Cards -->
          <div class="row q-col-gutter-lg justify-center">
            <!-- Explore with Sample Data Card -->
            <div class="col-12 col-md-5">
              <q-card
                class="setup-card sample-data-card cursor-pointer"
                :class="{ 'card-selected': selectedOption === 'sample' }"
                @click="selectOption('sample')"
              >
                <q-badge floating color="positive" label="Recommended" />
                <q-card-section class="text-center q-pa-lg">
                  <q-icon name="science" size="48px" color="primary" class="q-mb-md" />
                  <div class="text-h6 text-weight-bold q-mb-sm">Explore with Sample Data</div>
                  <p class="text-body2 text-grey-7 q-mb-md">
                    Load the Katete Model Village dataset with realistic sample households and
                    residents. Perfect for exploring features and evaluating the platform.
                  </p>
                  <div class="text-caption text-grey-6">
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    80+ sample residents across 8 families
                    <br />
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    18 months of finance history
                    <br />
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    Farm plots, plantings & harvests
                    <br />
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    52 learners, timetables & test scores
                  </div>
                </q-card-section>
                <q-card-actions class="justify-center q-pb-lg">
                  <q-btn
                    color="primary"
                    label="Load Sample Data"
                    icon="download"
                    :loading="isSeeding"
                    :disable="isSeeding"
                    @click.stop="handleLoadSampleData"
                  />
                </q-card-actions>
              </q-card>
            </div>

            <!-- Start Fresh Card (Disabled) -->
            <div class="col-12 col-md-5">
              <q-card class="setup-card fresh-start-card disabled-card">
                <q-card-section class="text-center q-pa-lg">
                  <q-icon name="add_home_work" size="48px" color="grey-5" class="q-mb-md" />
                  <div class="text-h6 text-weight-bold text-grey-6 q-mb-sm">
                    Start Fresh with Real Data
                  </div>
                  <p class="text-body2 text-grey-5 q-mb-md">
                    Begin with an empty database and enter your own village information from
                    scratch.
                  </p>
                  <q-chip color="grey-4" text-color="grey-7" icon="schedule" size="sm">
                    Coming in future update
                  </q-chip>
                </q-card-section>
                <q-card-actions class="justify-center q-pb-lg">
                  <q-btn color="grey-5" label="Start Fresh" icon="add" disable flat />
                </q-card-actions>
              </q-card>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div v-if="isSeeding" class="text-center q-mt-xl">
            <q-spinner-dots color="primary" size="48px" class="q-mb-md" />
            <p class="text-body2 text-grey-7">{{ seedingStatus }}</p>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { functions } from 'src/boot/appwrite';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const errorHandler = useErrorHandler();

const selectedOption = ref(null);
const isSeeding = ref(false);
const seedingStatus = ref('');

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_TIME_MS = 10 * 60 * 1000; // 10 minutes

function selectOption(option) {
  if (option === 'fresh') return;
  selectedOption.value = option;
}

async function handleLoadSampleData() {
  selectedOption.value = 'sample';

  const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_SEED_DATA;
  if (!functionId) {
    errorHandler.notifyError(
      'Seed function not configured. Please set VITE_APPWRITE_FUNCTION_SEED_DATA.',
    );
    return;
  }

  if (!authStore.user?.$id) {
    errorHandler.notifyError('You must be logged in to perform this action.');
    return;
  }

  isSeeding.value = true;
  seedingStatus.value = 'Starting sample data seeding...';

  try {
    const execution = await functions.createExecution(
      functionId,
      JSON.stringify({ userId: authStore.user.$id }),
      true,
    );

    seedingStatus.value = 'Seeding in progress — this may take a few minutes...';

    const result = await pollExecutionStatus(functionId, execution.$id);

    if (result.success) {
      await settingsStore.loadSettings();
      errorHandler.notifySuccess('Sample data loaded successfully!');
      router.push('/');
    } else {
      errorHandler.notifyError(result.error || 'Failed to seed sample data.');
    }
  } catch (err) {
    console.error('seedAllData execution error:', err);
    errorHandler.notifyError('Failed to start seeding. Please try again.');
  } finally {
    isSeeding.value = false;
    seedingStatus.value = '';
  }
}

async function pollExecutionStatus(functionId, executionId) {
  const startTime = Date.now();
  let lastStatus = '';

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const execution = await functions.getExecution(functionId, executionId);
      const status = execution.status;

      if (status !== lastStatus) {
        lastStatus = status;
        if (status === 'waiting') seedingStatus.value = 'Waiting for function to start...';
        else if (status === 'processing')
          seedingStatus.value = 'Seeding sample data on the server...';
      }

      if (status === 'completed') {
        const body = execution.responseBody || '';
        if (!body || body.trim() === '') return { success: true };
        try {
          const parsed = JSON.parse(body);
          return parsed.success
            ? { success: true, data: parsed }
            : { success: false, error: parsed.error || 'Seeding failed.' };
        } catch {
          return { success: true };
        }
      }

      if (status === 'failed') {
        const errMsg = execution.responseBody || execution.errors || 'Function execution failed.';
        return { success: false, error: errMsg };
      }
    } catch (pollErr) {
      console.warn('Poll error (retrying):', pollErr.message);
    }
  }

  return { success: false, error: 'Seeding timed out after 10 minutes.' };
}
</script>

<style lang="scss" scoped>
.setup-wizard-page {
  min-height: 100vh;
}

.setup-container {
  max-width: 900px;
  width: 100%;
}

.setup-card {
  transition: all 0.3s ease;
  border: 2px solid transparent;
  height: 100%;

  &:hover:not(.disabled-card) {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  &.card-selected {
    border-color: var(--q-primary);
  }
}

.sample-data-card {
  background: white;
}

.disabled-card {
  background: #f5f5f5;
  cursor: not-allowed;
  opacity: 0.8;
}
</style>
