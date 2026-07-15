<!--
  AtRiskLearnersWidget.vue (Story 4.7 AC5)
  School dashboard widget: at-risk learner count + top 5 at-risk learners list.
  Shows grace-period state, no-terms-configured warning, and empty state.
-->
<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">At-Risk Learners</div>
      <q-space />
      <q-badge
        v-if="atRiskStore.atRiskCount > 0"
        color="negative"
        text-color="white"
        :label="atRiskStore.atRiskCount"
      />
      <q-btn flat dense round icon="refresh" :loading="atRiskStore.isLoading" @click="refresh">
        <q-tooltip>Refresh</q-tooltip>
      </q-btn>
    </q-card-section>

    <!-- Loading -->
    <q-card-section v-if="atRiskStore.isLoading && atRiskStore.lastComputedAt === null">
      <q-skeleton type="rect" height="120px" />
    </q-card-section>

    <!-- Grace period active -->
    <q-card-section v-else-if="atRiskStore.gracePeriodActive && atRiskStore.termsConfigured">
      <q-banner class="bg-orange-2 text-dark rounded-borders" rounded dense>
        <template #avatar>
          <q-icon name="schedule" color="orange-8" />
        </template>
        <div class="text-caption">
          At-risk identification is in a 5-school-day grace period.
          {{ atRiskStore.elapsedSchoolDays }}/5 school days elapsed since
          {{ atRiskStore.currentTerm?.term_name || 'the current term' }} started on
          {{ formatDate(atRiskStore.currentTerm?.start_date) }}. Flagging begins after 5 school
          days.
        </div>
      </q-banner>
    </q-card-section>

    <!-- No terms configured warning -->
    <q-card-section v-else-if="!atRiskStore.termsConfigured">
      <q-banner class="bg-warning text-dark rounded-borders" rounded dense>
        <template #avatar>
          <q-icon name="warning" color="warning" />
        </template>
        <div class="text-caption">
          No academic terms configured. At-risk flags ignore the 5-day grace period.
          <router-link to="/school/settings" class="text-primary text-weight-medium">
            Configure terms in School Settings.
          </router-link>
        </div>
      </q-banner>
      <q-separator class="q-mt-md" />
      <AtRiskLearnerList
        :learners="topAtRisk"
        :show-view-all="atRiskStore.atRiskCount > 5"
        :total-count="atRiskStore.atRiskCount"
      />
    </q-card-section>

    <!-- No learners at risk -->
    <q-card-section v-else-if="atRiskStore.atRiskCount === 0">
      <div class="text-positive text-center q-pa-md">
        <q-icon name="check_circle" size="32px" class="q-mb-sm" />
        <div class="text-subtitle2">No learners currently meet the at-risk criteria.</div>
      </div>
    </q-card-section>

    <!-- At-risk learners list -->
    <template v-else>
      <AtRiskLearnerList
        :learners="topAtRisk"
        :show-view-all="atRiskStore.atRiskCount > 5"
        :total-count="atRiskStore.atRiskCount"
      />
    </template>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { date } from 'quasar';
import { useAtRiskStore } from '../stores/at-risk-store';
import AtRiskLearnerList from './AtRiskLearnerList.vue';

const atRiskStore = useAtRiskStore();

const topAtRisk = computed(() => atRiskStore.atRiskLearners.slice(0, 5));

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return date.formatDate(isoStr, 'DD MMM YYYY');
}

function refresh() {
  atRiskStore.refresh();
}

onMounted(() => {
  if (atRiskStore.lastComputedAt === null) {
    atRiskStore.computeAtRisk();
  }
});
</script>
