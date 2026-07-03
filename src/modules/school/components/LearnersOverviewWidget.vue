<!--
  LearnersOverviewWidget.vue (Story 4.1)
  School dashboard widget: total active learners, per-grade counts, and
  the 5 most recent enrollments.
-->
<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Learners Overview</div>
      <q-space />
      <q-btn flat dense round icon="refresh" :loading="learnerStore.isLoading" @click="refresh">
        <q-tooltip>Refresh</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section v-if="learnerStore.isLoading && !learnerStore.learnersLoaded">
      <q-skeleton type="rect" height="120px" />
    </q-card-section>

    <q-card-section v-else-if="learnerStore.learners.length === 0">
      <div class="text-grey-7 text-center q-pa-md">
        No learners enrolled yet. Click "Enroll Learner" to get started.
      </div>
    </q-card-section>

    <template v-else>
      <q-card-section class="row q-col-gutter-md">
        <div class="col-6 col-sm-4">
          <div class="text-caption text-grey-7">Active Learners</div>
          <div class="text-h4 text-primary">{{ learnerStore.activeLearners.length }}</div>
        </div>
        <div class="col-6 col-sm-8">
          <div class="text-caption text-grey-7 q-mb-xs">By Class</div>
          <div class="row q-gutter-xs">
            <q-chip
              v-for="(count, classId) in learnerStore.activeLearnersByClass"
              :key="classId"
              dense
              size="sm"
              color="primary"
              text-color="white"
            >
              {{ classNameMap[classId] || classId }}: {{ count }}
            </q-chip>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="text-caption text-grey-7 q-mb-sm">Recent Enrollments</div>
        <q-list dense separator>
          <q-item
            v-for="learner in learnerStore.recentEnrollments"
            :key="learner.$id"
            clickable
            :to="`/school/learners/${learner.$id}`"
          >
            <q-item-section>
              <q-item-label>{{ learnerStore.getLearnerName(learner) || 'Unknown' }}</q-item-label>
              <q-item-label caption>
                {{
                  classNameMap[learner.class_id_normalized || learner.class_id] ||
                  classNameMap[normalizeClassId(learner.class_id)] ||
                  '—'
                }}
                · {{ formatDate(learner.enrollment_date) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <EnrollmentStatusBadge :status="learner.enrollment_status" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </template>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { normalizeClassId, useClassStore } from '../stores/class-store';
import EnrollmentStatusBadge from './EnrollmentStatusBadge.vue';

const learnerStore = useLearnerStore();
const classStore = useClassStore();

const classNameMap = computed(() => {
  const map = {};
  classStore.classes.forEach((c) => {
    map[c.$id] = c.name;
  });
  return map;
});

function formatDate(isoString) {
  if (!isoString) return '—';
  return date.formatDate(isoString, 'DD MMM YYYY');
}

function refresh() {
  learnerStore.fetchLearners(true);
  classStore.fetchClasses();
}

onMounted(() => {
  if (!learnerStore.learnersLoaded) {
    learnerStore.fetchLearners();
  }
  classStore.fetchClasses();
});
</script>
