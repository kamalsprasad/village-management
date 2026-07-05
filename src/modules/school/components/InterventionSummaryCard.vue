<!--
  InterventionSummaryCard.vue (Story 4.8)
  Compact card summarizing a single intervention plan. Used in
  InterventionsListPage, LearnerDetailPage's Interventions tab, and
  MyInterventionsWidget.

  Usage:
    <InterventionSummaryCard :intervention="intervention" />
-->
<template>
  <q-card flat bordered class="q-mb-sm">
    <q-card-section>
      <div class="row items-center q-col-gutter-sm">
        <div class="col-12 col-sm-auto">
          <div class="text-subtitle2">{{ learnerName }}</div>
          <div class="text-caption text-grey-7">{{ intervention.intervention_type }}</div>
        </div>
        <q-space />
        <div class="col-12 col-sm-auto">
          <InterventionStatusBadge :status="intervention.status" />
        </div>
      </div>

      <div class="row q-col-gutter-sm q-mt-sm text-caption text-grey-8">
        <div class="col-6 col-sm-3">
          <div class="text-grey-6">Assigned Teacher</div>
          <div>{{ teacherName }}</div>
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-grey-6">Started</div>
          <div>{{ startDateLabel }}</div>
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-grey-6">Duration</div>
          <div>{{ durationLabel }}</div>
        </div>
        <div class="col-6 col-sm-3">
          <div class="text-grey-6">Progress Notes</div>
          <div>{{ notesCount }}</div>
        </div>
      </div>

      <q-chip
        v-if="noLongerAtRisk"
        dense
        color="positive"
        text-color="white"
        icon="check_circle"
        class="q-mt-sm"
      >
        Learner no longer flagged at-risk
      </q-chip>

      <div class="row justify-end q-mt-sm">
        <q-btn
          flat
          dense
          color="primary"
          label="View Details"
          :to="`/school/interventions/${intervention.$id}`"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useInterventionStore } from '../stores/intervention-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import InterventionStatusBadge from './InterventionStatusBadge.vue';

const props = defineProps({
  intervention: {
    type: Object,
    required: true,
  },
});

const learnerStore = useLearnerStore();
const teacherStore = useTeacherStore();
const interventionStore = useInterventionStore();
const atRiskStore = useAtRiskStore();

const learnerName = computed(() => {
  const learner = learnerStore.learners.find(
    (l) => l.$id === props.intervention.learner_id_normalized,
  );
  return learner ? learnerStore.getLearnerName(learner) : 'Unknown Learner';
});

const teacherName = computed(() => {
  if (!props.intervention.assigned_teacher_id_normalized) return 'Unassigned';
  const match = teacherStore.teacherAssignments.find(
    (a) => a.teacher_id_normalized === props.intervention.assigned_teacher_id_normalized,
  );
  return match ? match.teacher_name : 'Unknown Teacher';
});

const startDateLabel = computed(() => {
  if (!props.intervention.start_date) return '—';
  return date.formatDate(new Date(props.intervention.start_date), 'DD MMM YYYY');
});

const durationLabel = computed(() => {
  if (!props.intervention.end_date) return 'No end date';
  return date.formatDate(new Date(props.intervention.end_date), 'DD MMM YYYY');
});

const notesCount = computed(() => {
  return interventionStore.getNotesForIntervention(props.intervention.$id).length;
});

const noLongerAtRisk = computed(() => {
  // Only show once at-risk has actually been computed at least once —
  // otherwise an empty atRiskLearners list would look like "no longer at-risk"
  // for every learner by default.
  if (props.intervention.status !== 'Active' || !atRiskStore.lastComputedAt) return false;
  return !atRiskStore.getLearnerRisk(props.intervention.learner_id_normalized);
});
</script>
