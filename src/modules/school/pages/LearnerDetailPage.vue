<!--
  LearnerDetailPage.vue (Story 4.1)
  Tabbed learner detail page.
    - Overview: personal, enrollment, guardian info
    - Academics: test scores, performance trends, subject averages
    - Attendance: daily rolls and attendance rate
    - Interventions: support and intervention tracking
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/learners" class="q-mr-sm">
        <q-tooltip>Back to Learners</q-tooltip>
      </q-btn>
      <div>
        <div class="text-h5">
          <q-skeleton v-if="isLoading" type="text" width="200px" />
          <span v-else>{{ learnerName || 'Learner' }}</span>
        </div>
        <div v-if="learner" class="text-caption text-grey-7">
          {{ learnerClassName }} ·
          <EnrollmentStatusBadge :status="learner.enrollment_status" />
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="canAdmin && learner"
        color="primary"
        icon="edit"
        label="Edit"
        :to="`/school/learners/${learner.$id}/edit`"
        class="q-mr-sm"
      />
      <q-btn
        v-if="canWrite && learner"
        outline
        color="primary"
        icon="description"
        label="Progress Report"
        @click="report.showReportDialog.value = true"
        class="q-mr-sm"
      />
      <q-btn
        v-if="canAdmin && learner"
        flat
        color="negative"
        icon="delete"
        label="Delete"
        @click="confirmDelete"
      />
    </div>

    <q-card v-if="isLoading" flat bordered>
      <q-card-section>
        <q-skeleton type="rect" height="300px" />
      </q-card-section>
    </q-card>

    <template v-else-if="learner">
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        class="text-grey-7"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="overview" label="Overview" icon="person" />
        <q-tab name="academics" label="Academics" icon="quiz" />
        <q-tab name="attendance" label="Attendance" icon="event_available" />
        <q-tab name="interventions" label="Interventions" icon="support" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <q-tab-panel name="overview" class="q-pa-none q-pt-md">
          <LearnerOverviewTab
            :learner="learner"
            :resident="resident"
            :learner-name="learnerName"
            :learner-class-name="learnerClassName"
            :learner-risk="learnerRisk"
            :status-label="statusLabel"
            :status-color="statusColor"
            :status-bg-color="statusBgColor"
            :status-icon="statusIcon"
            :household-name="householdName"
            :household-id="householdId"
          />
        </q-tab-panel>

        <q-tab-panel name="academics" class="q-pa-md">
          <LearnerAcademicsTab
            :learner-name="learnerName"
            :learner-scores="learnerScores"
            :subject-averages="subjectAverages"
            :overall-average="overallAverage"
          />
        </q-tab-panel>

        <q-tab-panel name="attendance" class="q-pa-md">
          <LearnerAttendanceTab
            :learner-attendance="learnerAttendance"
            :term-attendance-rate="termAttendanceRate"
            :status-label="statusLabel"
            :status-color="statusColor"
            :status-icon="statusIcon"
          />
        </q-tab-panel>

        <q-tab-panel name="interventions" class="q-pa-md">
          <LearnerInterventionsTab
            :learner-id="learner.$id"
            :learner-name="learnerName"
            :interventions="learnerInterventions"
            :can-write="canWrite"
          />
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <q-card v-else flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-7">
        <q-icon name="person_off" size="48px" class="q-mb-sm" />
        <div>Learner not found.</div>
        <q-btn
          flat
          color="primary"
          label="Back to Learners"
          to="/school/learners"
          class="q-mt-sm"
        />
      </q-card-section>
    </q-card>

    <!-- Progress Report Dialog -->
    <q-dialog v-model="report.showReportDialog.value" persistent>
      <q-card style="min-width: 350px; max-width: 500px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Generate Learner Progress Report</div>
          <q-space />
          <q-btn
            icon="close"
            flat
            round
            dense
            v-close-popup
            :disabled="report.isGeneratingReport.value"
          />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-md">
          <!-- Academic Year Select -->
          <q-select
            v-model="report.selectedYear.value"
            :options="report.yearOptions.value"
            label="Academic Year"
            outlined
            dense
            :disabled="report.isGeneratingReport.value"
          />

          <!-- Term Select -->
          <q-select
            v-model="report.selectedTerm.value"
            :options="report.termOptions.value"
            label="Academic Term"
            outlined
            dense
            :disabled="report.isGeneratingReport.value || !report.selectedYear.value"
          />

          <!-- Comments field -->
          <q-input
            v-model="report.teacherComment.value"
            type="textarea"
            label="Head Teacher's Comments & Recommendations (Optional)"
            placeholder="Add comments, observations, and recommended next steps for this learner..."
            outlined
            dense
            rows="4"
            maxlength="500"
            counter
            :disabled="report.isGeneratingReport.value"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md text-primary">
          <q-btn flat label="Cancel" v-close-popup :disabled="report.isGeneratingReport.value" />
          <q-btn
            color="primary"
            icon="picture_as_pdf"
            label="Generate PDF"
            :loading="report.isGeneratingReport.value"
            @click="onGenerateReport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { tables } from 'src/boot/appwrite';
import { useLearnerStore } from '../stores/learner-store';
import { useSchoolStore } from '../stores/school-store';
import { useClassStore } from '../stores/class-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useInterventionStore } from '../stores/intervention-store';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { usePermissions } from 'src/composables/usePermissions';
import { computeScorePercent } from '../utils/school-utils';
import { normalizeClassId } from '../utils/school-utils';
import { useProgressReport } from '../composables/useProgressReport';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge.vue';
import LearnerOverviewTab from '../components/LearnerOverviewTab.vue';
import LearnerAcademicsTab from '../components/LearnerAcademicsTab.vue';
import LearnerAttendanceTab from '../components/LearnerAttendanceTab.vue';
import LearnerInterventionsTab from '../components/LearnerInterventionsTab.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const learnerStore = useLearnerStore();
const schoolStore = useSchoolStore();
const classStore = useClassStore();
const atRiskStore = useAtRiskStore();
const interventionStore = useInterventionStore();
const academicTermsStore = useAcademicTermsStore();
const teacherStore = useTeacherStore();
const goalsStore = useSchoolGoalsStore();
const { hasPermission } = usePermissions();

const report = useProgressReport();

const canAdmin = computed(() => hasPermission('school:admin'));
const canWrite = computed(() => hasPermission('school:write'));

const activeTab = ref('overview');
const householdName = ref('');
const householdId = ref(null);

const isLoading = computed(() => learnerStore.isCurrentLearnerLoading);
const learner = computed(() => learnerStore.currentLearner);
const resident = computed(() => learner.value?.resident || null);
const learnerName = computed(() =>
  learner.value ? learnerStore.getLearnerName(learner.value) : '',
);

const learnerClassName = computed(() => {
  if (!learner.value) return '';
  const cId = learner.value.class_id_normalized || normalizeClassId(learner.value.class_id);
  const cls = classStore.classes.find((c) => c.$id === cId);
  return cls ? cls.name : '';
});

// Interventions
const learnerInterventions = computed(() => {
  if (!learner.value) return [];
  return interventionStore.getInterventionsForLearner(learner.value.$id);
});

// Academics
const learnerScores = computed(() => {
  if (!learner.value) return [];
  return schoolStore.getLearnerScoreHistory(learner.value.$id);
});

const subjectAverages = computed(() => {
  if (!learner.value) return [];
  const currentYear = new Date().getFullYear();
  return schoolStore.getLearnerSubjectAverages(learner.value.$id, currentYear);
});

const overallAverage = computed(() => {
  if (learnerScores.value.length === 0) return 0;
  const totalPercent = learnerScores.value.reduce((acc, s) => {
    return acc + computeScorePercent(s.score_value, s.max_score);
  }, 0);
  return Math.round(totalPercent / learnerScores.value.length);
});

// Attendance
const learnerAttendance = computed(() => {
  if (!learner.value) return [];
  return classStore.attendance.filter((a) => {
    const lId = typeof a.learner_id === 'object' ? a.learner_id?.$id : a.learner_id;
    return lId === learner.value.$id;
  });
});

// At-risk status (Story 4.7 AC8)
const learnerRisk = computed(() => {
  if (!learner.value) return null;
  return atRiskStore.getLearnerRisk(learner.value.$id);
});

const statusLabel = computed(() => {
  if (atRiskStore.gracePeriodActive && atRiskStore.termsConfigured) {
    return 'Grace period active';
  }
  if (learnerRisk.value) {
    return `At Risk — ${learnerRisk.value.reasons.map((r) => r.detail).join(', ')}`;
  }
  return 'Good Standing';
});

const statusColor = computed(() => {
  if (atRiskStore.gracePeriodActive && atRiskStore.termsConfigured) return 'orange-8';
  if (learnerRisk.value) {
    return learnerRisk.value.severity === 'high' ? 'negative' : 'warning';
  }
  return 'positive';
});

const statusBgColor = computed(() => {
  if (atRiskStore.gracePeriodActive && atRiskStore.termsConfigured) return 'orange-1';
  if (learnerRisk.value) {
    return learnerRisk.value.severity === 'high' ? 'red-1' : 'orange-1';
  }
  return 'green-1';
});

const statusIcon = computed(() => {
  if (atRiskStore.gracePeriodActive && atRiskStore.termsConfigured) return 'schedule';
  if (learnerRisk.value) return 'warning';
  return 'check_circle';
});

const termAttendanceRate = computed(() => {
  if (!learnerRisk.value || learnerRisk.value.attendanceRate === null) return null;
  return learnerRisk.value.attendanceRate;
});

// ── Data loading ────────────────────────────────────────────────────────

async function loadHousehold() {
  householdName.value = '';
  householdId.value = null;
  const householdRef = resident.value?.household_id;
  if (!householdRef) return;

  if (typeof householdRef === 'object') {
    householdId.value = householdRef.$id;
    householdName.value = householdRef.name || '';
    return;
  }
  householdId.value = householdRef;
  try {
    const household = await tables.getRow({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
      rowId: householdRef,
    });
    householdName.value = household.name || '';
  } catch (error) {
    console.error('LearnerDetailPage: failed to load household', error);
  }
}

async function loadLearner() {
  await learnerStore.fetchLearnerById(route.params.id);
  const l = learnerStore.currentLearner;

  // If Appwrite didn't expand the resident_id relationship, fetch it directly
  if (l && !l.resident && l.resident_id_normalized) {
    try {
      const r = await tables.getRow({
        databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS,
        rowId: l.resident_id_normalized,
      });
      const parts = [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' ');
      learnerStore.patchCurrentLearner({
        resident: r,
        resident_full_name: parts,
      });
    } catch (e) {
      console.error('LearnerDetailPage: failed to load resident', e);
    }
  }

  await loadHousehold();
}

// ── Actions ─────────────────────────────────────────────────────────────

function onGenerateReport() {
  report.generateReport({
    learner: learner.value,
    resident: resident.value,
    learnerName: learnerName.value,
    learnerClassName: learnerClassName.value,
    householdName: householdName.value,
    learnerInterventions: learnerInterventions.value,
  });
}

function confirmDelete() {
  $q.dialog({
    title: 'Delete Learner Record',
    message: `Are you sure you want to delete the learner record for ${learnerName.value || 'this learner'}? This cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative' },
  }).onOk(async () => {
    const result = await learnerStore.deleteLearner(learner.value.$id);
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Learner record deleted.' });
      router.push('/school/learners');
    }
  });
}

// ── Lifecycle ───────────────────────────────────────────────────────────

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) loadLearner();
  },
);

onMounted(async () => {
  await loadLearner();
  await classStore.fetchClasses();
  if (learner.value && learner.value.class_id) {
    await classStore.fetchAttendance(learner.value.class_id, new Date().toISOString().slice(0, 10));
  }
  await Promise.all([
    schoolStore.fetchTestScores(),
    atRiskStore.computeAtRisk(),
    interventionStore.fetchInterventions(),
    academicTermsStore.fetchAcademicTerms(),
    teacherStore.fetchTeacherAssignments(),
    goalsStore.computeProgress(),
  ]);

  // Load notes for this learner's interventions so InterventionSummaryCard
  // can display an accurate progress notes count.
  await Promise.all(
    learnerInterventions.value.map((i) => interventionStore.fetchNotesForIntervention(i.$id)),
  );

  // Set default values for report selects
  report.initDefaults(learner.value);
});
</script>
