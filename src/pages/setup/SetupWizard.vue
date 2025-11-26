<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="setup-wizard-page flex flex-center">
        <div class="setup-container q-pa-lg">
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
                    15-20 sample residents
                    <br />
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    5-6 households
                    <br />
                    <q-icon name="check_circle" size="xs" color="positive" class="q-mr-xs" />
                    Council members configured
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
            <q-linear-progress
              :value="seedingProgress"
              color="primary"
              class="q-mb-md"
              style="max-width: 400px; margin: 0 auto"
            />
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
import { useSampleData } from 'src/composables/useSampleData';

const router = useRouter();
const { seedSampleData, isSeeding, seedingProgress, seedingStatus } = useSampleData();

const selectedOption = ref(null);

function selectOption(option) {
  if (option === 'fresh') return; // Disabled option
  selectedOption.value = option;
}

async function handleLoadSampleData() {
  selectedOption.value = 'sample';

  const result = await seedSampleData();

  if (result.success) {
    // Redirect to dashboard after successful seeding
    router.push('/');
  }
  // Error handling is done inside seedSampleData via useErrorHandler
}
</script>

<style lang="scss" scoped>
.setup-wizard-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
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
