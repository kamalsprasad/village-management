<!--
  ProgressToGoalWidget.vue (Story 4.12)

  Compact dashboard widget showing the school's current progress toward the
  long-term educational goal. Reuses data from school-goals-store.
-->
<template>
  <q-card flat bordered class="full-height">
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle2 text-weight-medium">
          <q-icon name="trending_up" size="sm" class="q-mr-xs text-deep-orange" />
          Progress to Goal
        </div>
        <q-btn
          flat
          dense
          size="xs"
          icon="open_in_new"
          color="grey"
          to="/school/educational-goals"
        >
          <q-tooltip>View Educational Goals</q-tooltip>
        </q-btn>
      </div>

      <div v-if="isLoading" class="q-pa-sm">
        <q-skeleton type="rect" height="80px" />
      </div>

      <div v-else-if="!activeGoal" class="text-grey-7 text-caption text-center q-pa-sm">
        No goal configured
      </div>

      <div v-else-if="!currentProgress || currentProgress.total === 0" class="text-grey-7 text-caption text-center q-pa-sm">
        No score data yet
      </div>

      <div v-else>
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-h5 text-weight-bold" :class="progressColorClass">
            {{ formatPercent(currentProgress.percentAtTarget) }}
          </div>
          <q-badge :color="statusColor" :label="statusLabel" />
        </div>

        <div class="text-caption text-grey-7 q-mb-sm">
          of learners at benchmark
          <span class="text-weight-medium">(target: {{ formatPercent(currentProgress.targetPercent) }})</span>
        </div>

        <q-linear-progress
          :value="(currentProgress.percentAtTarget || 0) / 100"
          :color="progressColor"
          size="12px"
          rounded
          class="q-mb-sm"
        />

        <div class="text-caption text-grey-7">
          {{ currentProgress.atTarget }} / {{ currentProgress.total }} active learners
          <span class="q-ml-sm">Gap: {{ formatPercent(currentProgress.gap) }}</span>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useSchoolGoalsStore } from '../stores/school-goals-store';

const goalsStore = useSchoolGoalsStore();

const isLoading = computed(() => goalsStore.isLoading);
const activeGoal = computed(() => goalsStore.activeGoal);
const currentProgress = computed(() => goalsStore.getCurrentProgress);

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
}

const statusLabel = computed(() => {
  const status = currentProgress.value?.projectionStatus;
  switch (status) {
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    case 'insufficient_data':
    default:
      return 'Insufficient Data';
  }
});

const statusColor = computed(() => {
  const status = currentProgress.value?.projectionStatus;
  switch (status) {
    case 'on_track':
      return 'positive';
    case 'at_risk':
      return 'negative';
    case 'insufficient_data':
    default:
      return 'grey-7';
  }
});

const progressColor = computed(() => {
  const percent = currentProgress.value?.percentAtTarget || 0;
  const target = currentProgress.value?.targetPercent || 90;
  return percent >= target ? 'positive' : 'primary';
});

const progressColorClass = computed(() => {
  const percent = currentProgress.value?.percentAtTarget || 0;
  const target = currentProgress.value?.targetPercent || 90;
  return percent >= target ? 'text-positive' : 'text-primary';
});

onMounted(() => {
  goalsStore.computeProgress();
});
</script>
