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
        @click="showReportDialog = true"
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
        <!-- Overview Tab -->
        <q-tab-panel name="overview" class="q-pa-none q-pt-md">
          <div class="row q-col-gutter-md">
            <!-- At-Risk Status Card (Story 4.7 AC8) -->
            <div class="col-12">
              <q-card flat bordered :class="`bg-${statusBgColor}`">
                <q-card-section class="row items-center">
                  <q-icon :name="statusIcon" size="32px" :color="statusColor" class="q-mr-md" />
                  <div class="col">
                    <div class="text-caption text-grey-7">At-Risk Status</div>
                    <div class="text-subtitle1 text-weight-bold" :class="`text-${statusColor}`">
                      {{ statusLabel }}
                    </div>
                    <div v-if="learnerRisk" class="text-caption text-grey-7 q-mt-xs">
                      <span v-for="(r, idx) in learnerRisk.reasons" :key="idx">
                        {{ r.detail }}{{ idx < learnerRisk.reasons.length - 1 ? ' · ' : '' }}
                      </span>
                    </div>
                  </div>
                  <q-btn
                    v-if="learnerRisk"
                    flat
                    dense
                    color="primary"
                    label="View all at-risk"
                    to="/school/at-risk-learners"
                  />
                </q-card-section>
              </q-card>
            </div>

            <!-- Personal Info (read-only, from resident) -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Personal Information</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    From the resident registry (read-only)
                  </div>
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Full Name</q-item-label>
                        <q-item-label>{{ learnerName || '—' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Date of Birth</q-item-label>
                        <q-item-label>{{ formatDate(resident?.dob) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Gender</q-item-label>
                        <q-item-label>{{ resident?.gender || '—' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      :clickable="!!householdId"
                      :to="householdId ? `/households/${householdId}` : undefined"
                    >
                      <q-item-section>
                        <q-item-label caption>Household</q-item-label>
                        <q-item-label :class="{ 'text-primary': !!householdId }">
                          {{ householdName || '—' }}
                          <q-icon v-if="householdId" name="open_in_new" size="xs" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- Enrollment Info -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Enrollment Information</div>
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Class</q-item-label>
                        <q-item-label>{{ learnerClassName || '—' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Enrollment Date</q-item-label>
                        <q-item-label>{{ formatDate(learner.enrollment_date) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Status</q-item-label>
                        <q-item-label>
                          <EnrollmentStatusBadge :status="learner.enrollment_status" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="learner.status_effective_date">
                      <q-item-section>
                        <q-item-label caption>Status Effective Date</q-item-label>
                        <q-item-label>{{ formatDate(learner.status_effective_date) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- Guardian Info -->
            <div class="col-12">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Guardian & Medical Information</div>
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Parent/Guardian</div>
                      <div>{{ learner.parent_guardian_name || '—' }}</div>
                      <div class="text-caption">{{ learner.parent_guardian_phone || '' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Emergency Contact</div>
                      <div>{{ learner.emergency_contact_name || '—' }}</div>
                      <div class="text-caption">{{ learner.emergency_contact_phone || '' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Medical Notes</div>
                      <div>{{ learner.medical_notes || '—' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Additional Notes</div>
                      <div>{{ learner.notes || '—' }}</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Academics Tab (Story 4.2) -->
        <q-tab-panel name="academics" class="q-pa-md">
          <div v-if="learnerScores.length === 0" class="text-center q-pa-xl text-grey-7">
            <q-icon name="quiz" size="48px" class="q-mb-sm" />
            <div>No test scores recorded for {{ learnerName }}.</div>
            <div class="text-caption">Once teacher records test scores, they will appear here.</div>
          </div>

          <div v-else>
            <!-- Academics Header Metrics -->
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-sm-6">
                <q-card flat bordered class="bg-grey-1">
                  <q-card-section class="row items-center">
                    <div class="col">
                      <div class="text-caption text-grey-7">Overall Academic Average</div>
                      <div
                        class="text-h4 text-weight-bold"
                        :class="getScoreColorClass(overallAverage)"
                      >
                        {{ overallAverage }}%
                      </div>
                    </div>
                    <q-icon name="trending_up" size="36px" color="primary" class="opacity-5" />
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-6">
                <q-card flat bordered class="bg-grey-1">
                  <q-card-section class="row items-center">
                    <div class="col">
                      <div class="text-caption text-grey-7">Total Assessments</div>
                      <div class="text-h4 text-weight-bold text-primary">
                        {{ learnerScores.length }}
                      </div>
                    </div>
                    <q-icon name="assignment" size="36px" color="primary" class="opacity-5" />
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="row q-col-gutter-md q-mb-md">
              <!-- SVG Trend Line Chart -->
              <div class="col-12 col-md-6" v-if="chronologicalScores.length >= 2">
                <q-card flat bordered class="full-height">
                  <q-card-section>
                    <div class="text-subtitle2 text-weight-bold q-mb-sm">
                      Performance Trend Over Time
                    </div>
                    <div style="width: 100%; overflow-x: auto">
                      <svg
                        viewBox="0 0 500 150"
                        style="width: 100%; min-width: 400px; height: auto"
                      >
                        <!-- Grid lines -->
                        <line x1="20" y1="20" x2="480" y2="20" stroke="#f0f0f0" stroke-width="1" />
                        <line
                          x1="20"
                          y1="52.5"
                          x2="480"
                          y2="52.5"
                          stroke="#f0f0f0"
                          stroke-width="1"
                        />
                        <line x1="20" y1="85" x2="480" y2="85" stroke="#f0f0f0" stroke-width="1" />
                        <line
                          x1="20"
                          y1="117.5"
                          x2="480"
                          y2="117.5"
                          stroke="#f0f0f0"
                          stroke-width="1"
                        />
                        <line
                          x1="20"
                          y1="130"
                          x2="480"
                          y2="130"
                          stroke="#cccccc"
                          stroke-width="1.5"
                        />

                        <!-- Grid labels -->
                        <text x="5" y="24" font-size="8" fill="#999">100%</text>
                        <text x="5" y="89" font-size="8" fill="#999">50%</text>
                        <text x="5" y="134" font-size="8" fill="#999">0%</text>

                        <!-- Trend line -->
                        <path :d="svgPath" fill="none" stroke="var(--q-primary)" stroke-width="2" />

                        <!-- Points -->
                        <g v-for="(pt, idx) in svgPoints" :key="idx">
                          <circle
                            :cx="pt.x"
                            :cy="pt.y"
                            r="4"
                            :fill="
                              pt.percent < 50 ? '#db2828' : pt.percent < 60 ? '#f2c037' : '#21ba45'
                            "
                          >
                            <title>{{ pt.label }}</title>
                          </circle>
                        </g>
                      </svg>
                    </div>
                  </q-card-section>
                </q-card>
              </div>

              <!-- Subject Averages list -->
              <div :class="chronologicalScores.length >= 2 ? 'col-12 col-md-6' : 'col-12'">
                <q-card flat bordered class="full-height">
                  <q-card-section>
                    <div class="text-subtitle2 text-weight-bold q-mb-sm">Subject Performance</div>
                    <div
                      v-if="subjectAverages.length === 0"
                      class="text-grey-6 text-center q-pa-md"
                    >
                      No current subject data.
                    </div>
                    <q-list v-else dense separator>
                      <q-item v-for="avg in subjectAverages" :key="avg.subject">
                        <q-item-section>
                          <q-item-label class="text-weight-medium">{{ avg.subject }}</q-item-label>
                          <q-item-label caption>{{ avg.test_count }} tests recorded</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip
                            dense
                            square
                            :class="getScoreColorClass(avg.average)"
                            class="text-weight-bold bg-grey-1"
                          >
                            {{ avg.average }}%
                          </q-chip>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <!-- Detailed Test Scores Table -->
            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle2 text-weight-bold q-mb-sm">Assessment History</div>
                <q-table
                  :rows="learnerScores"
                  :columns="academicsColumns"
                  row-key="$id"
                  :pagination="{ rowsPerPage: 10 }"
                  flat
                  dense
                >
                  <!-- Date formatted -->
                  <template #body-cell-date="props">
                    <q-td :props="props">
                      {{ formatDate(props.value) }}
                    </q-td>
                  </template>

                  <!-- Percentage Chip -->
                  <template #body-cell-percent="props">
                    <q-td :props="props">
                      <q-chip
                        dense
                        square
                        text-color="white"
                        :color="
                          computeScorePercent(props.row.score_value, props.row.max_score) < 50
                            ? 'negative'
                            : computeScorePercent(props.row.score_value, props.row.max_score) < 60
                              ? 'warning'
                              : 'positive'
                        "
                      >
                        {{ computeScorePercent(props.row.score_value, props.row.max_score) }}%
                      </q-chip>
                    </q-td>
                  </template>
                </q-table>
              </q-card-section>
            </q-card>
          </div>
        </q-tab-panel>

        <!-- Attendance Tab (Story 4.3 - Fully Functional!) -->
        <q-tab-panel name="attendance" class="q-pa-md">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-6">
              <q-card flat bordered class="bg-grey-1">
                <q-card-section class="row items-center">
                  <div class="col">
                    <div class="text-caption text-grey-7">Attendance Rate</div>
                    <div
                      v-if="termAttendanceRate !== null"
                      class="text-h4 text-weight-bold"
                      :class="termAttendanceRate >= 90 ? 'text-positive' : 'text-negative'"
                    >
                      {{ termAttendanceRate }}%
                    </div>
                    <div v-else class="text-subtitle1 text-grey-7">No attendance recorded yet</div>
                  </div>
                  <q-icon name="event_available" size="36px" color="primary" class="opacity-5" />
                </q-card-section>
              </q-card>
            </div>
            <div class="col-12 col-sm-6">
              <q-card flat bordered class="bg-grey-1">
                <q-card-section class="row items-center">
                  <div class="col">
                    <div class="text-caption text-grey-7">Status Alert</div>
                    <div class="text-subtitle1 text-weight-bold" :class="`text-${statusColor}`">
                      {{ statusLabel }}
                    </div>
                  </div>
                  <q-icon :name="statusIcon" size="36px" :color="statusColor" class="opacity-5" />
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div
            v-if="learnerAttendance.length === 0"
            class="text-center q-pa-lg text-grey-6 bg-grey-1 rounded-borders border-dashed"
          >
            <q-icon name="fact_check" size="36px" />
            <div class="text-subtitle2 text-weight-bold">
              No active daily rolls logged for this student.
            </div>
            <div class="text-caption">
              Head over to the Class Detail page to record or view daily attendance.
            </div>
          </div>

          <q-table
            v-else
            :rows="learnerAttendance"
            :columns="attendanceColumns"
            row-key="$id"
            flat
            dense
          >
            <!-- Status Badge Column -->
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="
                    props.value === 'Present'
                      ? 'positive'
                      : props.value === 'Absent'
                        ? 'negative'
                        : 'warning'
                  "
                  text-color="white"
                  dense
                  square
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Interventions Tab (Story 4.8) -->
        <q-tab-panel name="interventions" class="q-pa-md">
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1">Intervention Plans</div>
            <q-space />
            <q-btn
              v-if="hasPermission('school:write')"
              color="primary"
              icon="add"
              label="Create Intervention Plan"
              :to="`/school/interventions/create?learnerId=${learner.$id}`"
            />
          </div>

          <div v-if="learnerInterventions.length === 0" class="text-center q-pa-xl text-grey-7">
            <q-icon name="support" size="48px" class="q-mb-sm" />
            <div>No interventions recorded for {{ learnerName }}.</div>
            <q-btn
              v-if="hasPermission('school:write')"
              flat
              color="primary"
              label="Create Intervention Plan"
              class="q-mt-sm"
              :to="`/school/interventions/create?learnerId=${learner.$id}`"
            />
          </div>

          <InterventionSummaryCard
            v-for="intervention in learnerInterventions"
            :key="intervention.$id"
            :intervention="intervention"
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
    <q-dialog v-model="showReportDialog" persistent>
      <q-card style="min-width: 350px; max-width: 500px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Generate Learner Progress Report</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disabled="isGeneratingReport" />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-md">
          <!-- Academic Year Select -->
          <q-select
            v-model="selectedYear"
            :options="yearOptions"
            label="Academic Year"
            outlined
            dense
            :disabled="isGeneratingReport"
          />

          <!-- Term Select -->
          <q-select
            v-model="selectedTerm"
            :options="termOptions"
            label="Academic Term"
            outlined
            dense
            :disabled="isGeneratingReport || !selectedYear"
          />

          <!-- Comments field -->
          <q-input
            v-model="teacherComment"
            type="textarea"
            label="Head Teacher's Comments & Recommendations (Optional)"
            placeholder="Add comments, observations, and recommended next steps for this learner…"
            outlined
            dense
            rows="4"
            maxlength="500"
            counter
            :disabled="isGeneratingReport"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md text-primary">
          <q-btn flat label="Cancel" v-close-popup :disabled="isGeneratingReport" />
          <q-btn
            color="primary"
            icon="picture_as_pdf"
            label="Generate PDF"
            :loading="isGeneratingReport"
            @click="generateReport"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, date } from 'quasar';
import { tables } from 'src/boot/appwrite';
import { useLearnerStore } from '../stores/learner-store';
import { useSchoolStore } from '../stores/school-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useInterventionStore } from '../stores/intervention-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { exportLearnerProgressToPDF } from 'src/services/ReportExportService';
import { computeLearnerOverallAverage } from '../utils/school-goal-utils';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge.vue';
import InterventionSummaryCard from '../components/InterventionSummaryCard.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const learnerStore = useLearnerStore();
const schoolStore = useSchoolStore();
const atRiskStore = useAtRiskStore();
const interventionStore = useInterventionStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const canWrite = computed(() => hasPermission('school:write'));

const academicTermsStore = useAcademicTermsStore();
const calendarEventsStore = useCalendarEventsStore();
const teacherStore = useTeacherStore();
const goalsStore = useSchoolGoalsStore();
const settingsStore = useSettingsStore();

// Dialog state
const showReportDialog = ref(false);
const isGeneratingReport = ref(false);
const selectedYear = ref(null);
const selectedTerm = ref(null);
const teacherComment = ref('');

// Options for Year & Term selects
const yearOptions = computed(() => {
  return academicTermsStore.availableYears.map((y) => ({ label: String(y), value: y }));
});

const termOptions = computed(() => {
  if (!selectedYear.value) return [];
  const yearValue =
    typeof selectedYear.value === 'object' ? selectedYear.value?.value : selectedYear.value;
  return academicTermsStore.currentYearTerms
    .filter((t) => t.academic_year === yearValue)
    .map((t) => ({
      label: t.term_name,
      value: t.term_name,
      start_date: t.start_date,
      end_date: t.end_date,
    }));
});

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
  const classId = learner.value.class_id_normalized || normalizeClassId(learner.value.class_id);
  const cls = classStore.classes.find((c) => c.$id === classId);
  return cls ? cls.name : '';
});

// Interventions Tab (Story 4.8)
const learnerInterventions = computed(() => {
  if (!learner.value) return [];
  return interventionStore.getInterventionsForLearner(learner.value.$id);
});

function formatDate(isoString) {
  if (!isoString) return '—';
  const [y, m, d] = isoString.slice(0, 10).split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  return date.formatDate(localDate, 'DD MMM YYYY');
}

// Academics Tab Calculations (Story 4.2)
import { computeScorePercent, getScoreColorClass } from '../utils/school-utils';
import { normalizeClassId, useClassStore } from '../stores/class-store';

const classStore = useClassStore();

const academicsColumns = [
  { name: 'date', label: 'Date', field: 'assessment_date', align: 'left', sortable: true },
  { name: 'subject', label: 'Subject', field: 'subject', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'assessment_type', align: 'left', sortable: true },
  { name: 'term', label: 'Term', field: 'term', align: 'left', sortable: true },
  {
    name: 'score',
    label: 'Score',
    align: 'left',
    field: (row) => `${row.score_value}/${row.max_score}`,
  },
  { name: 'percent', label: 'Percentage', align: 'center', sortable: true },
  { name: 'notes', label: 'Teacher Notes', field: 'notes', align: 'left' },
];

const learnerScores = computed(() => {
  if (!learner.value) return [];
  return schoolStore.getLearnerScoreHistory(learner.value.$id);
});

const chronologicalScores = computed(() => {
  return [...learnerScores.value].reverse(); // oldest first for trend chart
});

// Attendance calculations for tab (Story 4.3)
const attendanceColumns = [
  {
    name: 'date',
    label: 'Date',
    field: 'attendance_date',
    align: 'left',
    sortable: true,
    format: (val) => formatDate(val),
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'absence_reason', label: 'Absence Reason', field: 'absence_reason', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
];

const learnerAttendance = computed(() => {
  if (!learner.value) return [];
  return classStore.attendance.filter((a) => {
    const lId = typeof a.learner_id === 'object' ? a.learner_id?.$id : a.learner_id;
    return lId === learner.value.$id;
  });
});

// At-risk status from the at-risk store (Story 4.7 AC8)
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
  // Map semantic Quasar colors to palette tints (bg-positive-1 is not a valid Quasar class)
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

// Term-bounded attendance rate from the at-risk store (more accurate than the current-day-only rate)
const termAttendanceRate = computed(() => {
  if (!learnerRisk.value || learnerRisk.value.attendanceRate === null) return null;
  return learnerRisk.value.attendanceRate;
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

const svgPath = computed(() => {
  const scores = chronologicalScores.value;
  if (scores.length < 2) return '';

  const width = 500;
  const height = 150;
  const padding = 20;

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * usableWidth;
    const percent = computeScorePercent(score.score_value, score.max_score);
    const y = padding + ((100 - percent) / 100) * usableHeight;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
});

const svgPoints = computed(() => {
  const scores = chronologicalScores.value;
  if (scores.length === 0) return [];

  const width = 500;
  const height = 150;
  const padding = 20;

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * usableWidth;
    const percent = computeScorePercent(score.score_value, score.max_score);
    const y = padding + ((100 - percent) / 100) * usableHeight;
    return {
      x,
      y,
      percent,
      label: `${score.subject}: ${percent}%`,
    };
  });
});

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

async function generateReport() {
  if (!selectedYear.value || !selectedTerm.value) {
    $q.notify({ type: 'warning', message: 'Please select an academic year and term' });
    return;
  }

  isGeneratingReport.value = true;
  try {
    const yearValue =
      typeof selectedYear.value === 'object' ? selectedYear.value?.value : selectedYear.value;
    const termValue =
      typeof selectedTerm.value === 'object' ? selectedTerm.value?.value : selectedTerm.value;
    const termStart = selectedTerm.value?.start_date;
    const termEnd = selectedTerm.value?.end_date;

    // 1. Fetch term attendance
    const attResult = await classStore.fetchAttendanceForLearner(
      learner.value.$id,
      termStart,
      termEnd,
    );
    const attendanceRecords = attResult?.data || [];

    // 2. Count total school days for term
    const totalSchoolDays = calendarEventsStore.countSchoolDaysBetween(termStart, termEnd);

    // 3. Compute overall average for the year/term combination
    const learnerOverallAverage = computeLearnerOverallAverage(
      schoolStore.testScores,
      learner.value.$id,
      yearValue,
      termValue,
    );

    // 4. Generate and download PDF
    await exportLearnerProgressToPDF({
      learner: learner.value,
      resident: resident.value
        ? {
            full_name: learnerName.value,
            dob: resident.value.dob,
            household_name: householdName.value,
          }
        : null,
      className: learnerClassName.value,
      testScores: schoolStore.testScores,
      attendanceRecords,
      totalSchoolDays,
      interventions: learnerInterventions.value,
      activeGoal: goalsStore.activeGoal,
      learnerOverallAverage,
      teacherComment: teacherComment.value,
      termName: termValue,
      academicYear: yearValue,
      villageName: settingsStore.villageName,
      teacherAssignments: teacherStore.teacherAssignments,
      returnBytes: false,
    });

    $q.notify({ type: 'positive', message: 'Progress report downloaded.' });
    showReportDialog.value = false;
  } catch (error) {
    console.error('Error generating learner progress report:', error);
    $q.notify({ type: 'negative', message: 'Failed to generate progress report PDF' });
  } finally {
    isGeneratingReport.value = false;
  }
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
    academicTermsStore.fetchTerms(),
    teacherStore.fetchTeacherAssignments(),
    goalsStore.computeProgress(),
  ]);

  // Load notes for this learner's interventions so InterventionSummaryCard
  // can display an accurate progress notes count.
  await Promise.all(
    learnerInterventions.value.map((i) => interventionStore.fetchNotesForIntervention(i.$id)),
  );

  // Set default values for report selects
  if (academicTermsStore.availableYears.length > 0) {
    const currentYear = new Date().getFullYear();
    const defaultYear = academicTermsStore.availableYears.includes(currentYear)
      ? currentYear
      : academicTermsStore.availableYears[0];
    selectedYear.value = { label: String(defaultYear), value: defaultYear };

    const yearTerms = academicTermsStore.currentYearTerms.filter(
      (t) => t.academic_year === defaultYear,
    );
    if (yearTerms.length > 0) {
      // Find the most recent term with recorded scores for this learner
      const scoredTerms = schoolStore.testScores
        .filter(
          (s) => s.learner_id_normalized === learner.value?.$id && s.academic_year === defaultYear,
        )
        .map((s) => s.term);
      const scoredTermSet = new Set(scoredTerms);
      const matchedTerm = yearTerms.find((t) => scoredTermSet.has(t.term_name)) || yearTerms[0];

      selectedTerm.value = {
        label: matchedTerm.term_name,
        value: matchedTerm.term_name,
        start_date: matchedTerm.start_date,
        end_date: matchedTerm.end_date,
      };
    }
  }
});
</script>
