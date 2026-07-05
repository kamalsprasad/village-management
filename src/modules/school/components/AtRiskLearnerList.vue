<!--
  AtRiskLearnerList.vue (Story 4.7)
  Shared list of at-risk learners with severity chips and reason summaries.
  Used by AtRiskLearnersWidget (dashboard) and AtRiskLearnersPage (dedicated page).
-->
<template>
  <q-list dense separator>
    <q-item
      v-for="learner in learners"
      :key="learner.learnerId"
      clickable
      :to="`/school/learners/${learner.learnerId}`"
    >
      <q-item-section>
        <q-item-label class="text-weight-medium">{{ learner.learnerName }}</q-item-label>
        <q-item-label caption>
          {{ learner.gradeLevel }} · {{ formatReasons(learner) }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-chip
          :color="learner.severity === 'high' ? 'negative' : 'warning'"
          text-color="white"
          dense
          size="sm"
        >
          {{ learner.severity === 'high' ? 'High' : 'Medium' }}
        </q-chip>
      </q-item-section>
    </q-item>
    <q-item v-if="showViewAll" clickable :to="'/school/at-risk-learners'">
      <q-item-section class="text-center text-primary text-weight-medium">
        View all at-risk learners ({{ totalCount }})
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup>
defineProps({
  learners: {
    type: Array,
    default: () => [],
  },
  showViewAll: {
    type: Boolean,
    default: false,
  },
  totalCount: {
    type: Number,
    default: 0,
  },
});

function formatReasons(learner) {
  if (!learner.reasons || learner.reasons.length === 0) return 'At-risk';
  return learner.reasons.map((r) => r.detail).join(' · ');
}
</script>
