<!--
  LearnerInterventionsTab.vue
  Interventions tab for LearnerDetailPage: intervention plans list with create button.
-->
<template>
  <div class="row items-center q-mb-md">
    <div class="text-subtitle1">Intervention Plans</div>
    <q-space />
    <q-btn
      v-if="canWrite"
      color="primary"
      icon="add"
      label="Create Intervention Plan"
      :to="`/school/interventions/create?learnerId=${learnerId}`"
    />
  </div>

  <div v-if="interventions.length === 0" class="text-center q-pa-xl text-grey-7">
    <q-icon name="support" size="48px" class="q-mb-sm" />
    <div>No interventions recorded for {{ learnerName }}.</div>
    <q-btn
      v-if="canWrite"
      flat
      color="primary"
      label="Create Intervention Plan"
      class="q-mt-sm"
      :to="`/school/interventions/create?learnerId=${learnerId}`"
    />
  </div>

  <InterventionSummaryCard
    v-for="intervention in interventions"
    :key="intervention.$id"
    :intervention="intervention"
  />
</template>

<script setup>
import InterventionSummaryCard from './InterventionSummaryCard.vue';

defineProps({
  learnerId: { type: String, required: true },
  learnerName: { type: String, default: '' },
  interventions: { type: Array, default: () => [] },
  canWrite: { type: Boolean, default: false },
});
</script>
