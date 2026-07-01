<!--
  MyInterventionsWidget.vue (Story 4.8)
  School dashboard widget: shows the logged-in teacher's Active/Paused
  interventions. Renders nothing if the current user is not a teacher
  (i.e. has no entry in teacher_assignments).
-->
<template>
  <q-card v-if="isTeacher" flat bordered>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">My Interventions</div>
      <q-space />
      <q-btn flat dense round icon="refresh" :loading="interventionStore.isLoading" @click="refresh">
        <q-tooltip>Refresh</q-tooltip>
      </q-btn>
    </q-card-section>

    <!-- Loading -->
    <q-card-section v-if="interventionStore.isLoading && !interventionStore.interventionsLoaded">
      <q-skeleton type="rect" height="120px" />
    </q-card-section>

    <!-- Empty state -->
    <q-card-section v-else-if="myInterventions.length === 0">
      <div class="text-center q-pa-md text-grey-7">
        No active interventions assigned to you.
      </div>
    </q-card-section>

    <!-- List -->
    <q-list v-else separator>
      <q-item v-for="intervention in myInterventions" :key="intervention.$id" clickable :to="`/school/interventions/${intervention.$id}`">
        <q-item-section>
          <q-item-label>{{ learnerName(intervention.learner_id_normalized) }}</q-item-label>
          <q-item-label caption>
            {{ intervention.intervention_type }} · Started {{ daysSinceStart(intervention.start_date) }} days ago
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-chip
            v-if="atRiskStore.getLearnerRisk(intervention.learner_id_normalized)"
            dense
            size="sm"
            color="negative"
            text-color="white"
          >
            At Risk
          </q-chip>
          <q-chip v-else dense size="sm" color="positive" text-color="white">Good Standing</q-chip>
        </q-item-section>
      </q-item>
    </q-list>

    <q-card-section v-if="myInterventions.length > 0" class="q-pt-none">
      <router-link to="/school/interventions" class="text-primary text-caption">
        View All Interventions
      </router-link>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useTeacherStore } from '../stores/teacher-store';
import { useInterventionStore } from '../stores/intervention-store';
import { useLearnerStore } from '../stores/learner-store';
import { useAtRiskStore } from '../stores/at-risk-store';

const teacherStore = useTeacherStore();
const interventionStore = useInterventionStore();
const learnerStore = useLearnerStore();
const atRiskStore = useAtRiskStore();

const isTeacher = computed(() => !!teacherStore.currentTeacherResidentId);

const myInterventions = computed(() => {
  if (!teacherStore.currentTeacherResidentId) return [];
  return interventionStore
    .getInterventionsForTeacher(teacherStore.currentTeacherResidentId)
    .filter((i) => i.status === 'Active' || i.status === 'Paused')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);
});

function learnerName(learnerId) {
  const learner = learnerStore.learners.find((l) => l.$id === learnerId);
  return learner ? learnerStore.getLearnerName(learner) : 'Unknown Learner';
}

function daysSinceStart(startDate) {
  if (!startDate) return 0;
  const diffMs = Date.now() - new Date(startDate).getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

function refresh() {
  interventionStore.fetchInterventions(true);
}

onMounted(async () => {
  await Promise.all([
    teacherStore.fetchTeacherAssignments(),
    interventionStore.fetchInterventions(),
    learnerStore.fetchLearners(),
  ]);
  if (!atRiskStore.lastComputedAt) {
    await atRiskStore.computeAtRisk();
  }
});
</script>
