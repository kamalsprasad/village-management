<template>
  <q-page padding>
    <!-- Header row with Back button -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/classes" class="q-mr-sm" />
      <div v-if="cls">
        <div class="text-h5 row items-center">
          {{ cls.name }}
          <q-chip outline color="primary" dense square class="q-ml-sm text-weight-bold">
            Year {{ cls.academic_year }}
          </q-chip>
        </div>
        <div class="text-caption text-grey-7 row items-center">
          <span class="q-mr-md"><strong>Grade Level:</strong> {{ cls.grade_level }}</span>
          <span class="q-mr-md"
            ><strong>Class Teacher:</strong> {{ cls.teacher_name || 'No Teacher Assigned' }}</span
          >
          <span><strong>Students Enrolled:</strong> {{ studentCount }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Dashboard row -->
    <div v-if="cls" class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="stats-card">
          <q-card-section class="row items-center q-py-sm">
            <q-icon name="groups" color="primary" size="lg" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">Class Roster</div>
              <div class="text-h5 text-weight-bold text-primary">{{ studentCount }} Students</div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-4">
        <q-card flat bordered class="stats-card">
          <q-card-section class="row items-center q-py-sm">
            <q-icon name="event_available" color="secondary" size="lg" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">Monthly Attendance</div>
              <div class="text-h5 text-weight-bold text-secondary">
                {{ classAttendanceRate }}% Avg
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-4">
        <q-card flat bordered class="stats-card">
          <q-card-section class="row items-center q-py-sm">
            <q-icon name="analytics" color="positive" size="lg" class="q-mr-md" />
            <div>
              <div class="text-caption text-grey-7">Academic Average</div>
              <div class="text-h5 text-weight-bold text-positive">
                {{ rollingAverage > 0 ? rollingAverage + '%' : 'N/A' }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- At-Risk Attendance Alert banner (Story 4.7 — real data via atRiskStore) -->
    <q-banner
      v-if="classAtRiskLearners.length > 0 && !atRiskStore.gracePeriodActive"
      class="bg-warning text-dark q-mb-md rounded-borders"
      rounded
      dense
    >
      <template #avatar>
        <q-icon name="warning" color="warning" />
      </template>
      <div class="text-weight-bold">At-Risk Learners in this class</div>
      <div class="text-caption">
        The following learners have fallen below the 90% attendance or academic thresholds and
        require intervention:
        <span
          v-for="(std, idx) in classAtRiskLearners"
          :key="std.learnerId"
          class="text-weight-medium text-primary cursor-pointer"
          @click="viewLearnerDetail(std.learnerId)"
        >
          {{ std.learnerName }} ({{ formatRiskSummary(std) }}){{
            idx < classAtRiskLearners.length - 1 ? ', ' : ''
          }}
        </span>
      </div>
      <template #action>
        <q-btn
          flat
          dense
          color="primary"
          label="View all at-risk learners"
          :to="'/school/at-risk-learners'"
        />
      </template>
    </q-banner>

    <!-- Grace period notice (Story 4.7) -->
    <q-banner
      v-if="atRiskStore.gracePeriodActive && atRiskStore.termsConfigured"
      class="bg-orange-2 text-dark q-mb-md rounded-borders"
      rounded
      dense
    >
      <template #avatar>
        <q-icon name="schedule" color="orange-8" />
      </template>
      <div class="text-caption">
        At-risk identification is in a 5-school-day grace period.
        {{ atRiskStore.elapsedSchoolDays }}/{{ 5 }} school days elapsed since
        {{ atRiskStore.currentTerm?.term_name || 'the current term' }} started on
        {{ formatDate(atRiskStore.currentTerm?.start_date) }}. Flagging begins after 5 school days.
      </div>
    </q-banner>

    <!-- Main Tabs Card -->
    <q-card v-if="cls" flat bordered>
      <q-tabs
        v-model="tab"
        dense
        class="bg-grey-1 text-grey-7"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="learners" icon="groups" label="Class Learners" />
        <q-tab name="attendance" icon="fact_check" label="Daily Attendance" />
        <q-tab name="performance" icon="school" label="Academic Assessments" />
        <q-tab name="timetable" icon="schedule" label="Weekly Timetable" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- Tab 1: Learners List -->
        <q-tab-panel name="learners" class="q-pa-md">
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Class Student Roster</div>
            <q-space />
            <q-btn
              v-if="canAdmin"
              color="primary"
              dense
              icon="add"
              label="Add Student to Class"
              @click="openEnrollmentDialog"
            />
          </div>

          <q-table
            :rows="classLearners"
            :columns="learnerColumns"
            row-key="$id"
            :pagination="{ rowsPerPage: 15 }"
            flat
            dense
          >
            <!-- Name Custom Slot -->
            <template #body-cell-name="props">
              <q-td
                :props="props"
                class="text-weight-medium text-primary cursor-pointer"
                @click="viewLearnerDetail(props.row.$id)"
              >
                {{ props.value }}
              </q-td>
            </template>

            <!-- Actions Column -->
            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn
                  flat
                  dense
                  round
                  icon="visibility"
                  color="primary"
                  size="sm"
                  @click="viewLearnerDetail(props.row.$id)"
                >
                  <q-tooltip>View Student Profile</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="canAdmin"
                  flat
                  dense
                  round
                  icon="person_remove"
                  color="negative"
                  size="sm"
                  @click="confirmRemoveLearner(props.row)"
                >
                  <q-tooltip>Remove from Class</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab 2: Attendance Roll-Call -->
        <q-tab-panel name="attendance" class="q-pa-md">
          <div class="row q-col-gutter-sm items-center q-mb-md">
            <div class="col-12 col-sm-4 text-subtitle1 text-weight-bold">Attendance Roll-Call</div>
            <q-space class="gt-xs" />
            <div class="col-12 col-sm-4 row items-center justify-end q-gutter-sm">
              <q-input
                v-model="attendanceDate"
                outlined
                dense
                type="date"
                label="Date"
                @update:model-value="loadAttendance"
                style="max-width: 180px"
              />
              <q-btn
                color="secondary"
                icon="done_all"
                label="Mark All Present"
                @click="markAllPresent"
              />
            </div>
          </div>

          <!-- Calendar-aware date validation warning (Story 4.7 AC2) -->
          <q-banner
            v-if="!isAttendanceDateSchoolDay && attendanceDate"
            class="bg-orange-2 text-dark q-mb-md rounded-borders"
            rounded
            dense
          >
            <template #avatar>
              <q-icon name="event_busy" color="orange-8" />
            </template>
            <div class="text-caption">
              {{ formatDate(attendanceDate) }} is not a school day
              <span v-if="attendanceDateReason">({{ attendanceDateReason }})</span>. Attendance
              recorded on this date will still be saved but will not count toward at-risk
              calculations.
            </div>
          </q-banner>

          <div v-if="loadingAttendance" class="text-center q-pa-lg">
            <q-spinner color="primary" size="md" />
            <div class="text-caption q-mt-sm">Loading attendance...</div>
          </div>

          <template v-else>
            <q-table
              :rows="attendanceRows"
              :columns="attendanceColumns"
              row-key="learner_id"
              :pagination="{ rowsPerPage: 50 }"
              flat
              dense
            >
              <!-- Status Column custom picker -->
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-btn-toggle
                    v-model="props.row.status"
                    spread
                    dense
                    unelevated
                    toggle-color="primary"
                    color="grey-3"
                    text-color="grey-8"
                    :options="[
                      { label: 'Present', value: 'Present' },
                      { label: 'Absent', value: 'Absent' },
                      { label: 'Late', value: 'Late' },
                      { label: 'Excused', value: 'Excused' },
                    ]"
                  />
                </q-td>
              </template>

              <!-- Absence Reason slot -->
              <template #body-cell-absence_reason="props">
                <q-td :props="props">
                  <q-input
                    v-model="props.row.absence_reason"
                    dense
                    outlined
                    placeholder="Reason if absent/excused"
                    :disable="props.row.status === 'Present'"
                    style="max-width: 250px"
                  />
                </q-td>
              </template>
            </q-table>

            <div class="text-right q-mt-md">
              <q-btn
                color="primary"
                icon="save"
                label="Save Attendance"
                :loading="savingAttendance"
                @click="saveAttendance"
              />
            </div>
          </template>

          <!-- Attendance History (Story 4.7 AC3 — closes 4.6 AC4) -->
          <q-separator class="q-my-lg" />
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Attendance History</div>
            <q-space />
            <div class="row items-center q-gutter-sm">
              <q-btn flat dense round icon="chevron_left" @click="shiftHistoryMonth(-1)">
                <q-tooltip>Previous month</q-tooltip>
              </q-btn>
              <div
                class="text-subtitle2 text-weight-medium"
                style="min-width: 140px; text-align: center"
              >
                {{ historyMonthLabel }}
              </div>
              <q-btn flat dense round icon="chevron_right" @click="shiftHistoryMonth(1)">
                <q-tooltip>Next month</q-tooltip>
              </q-btn>
              <q-btn flat dense color="primary" icon="refresh" @click="loadAttendanceHistory">
                <q-tooltip>Refresh history</q-tooltip>
              </q-btn>
            </div>
          </div>

          <div v-if="loadingHistory" class="text-center q-pa-md">
            <q-spinner color="primary" size="md" />
            <div class="text-caption q-mt-sm">Loading attendance history...</div>
          </div>

          <q-table
            v-else
            :rows="attendanceHistoryRows"
            :columns="historyColumns"
            row-key="date"
            flat
            dense
            :pagination="{ rowsPerPage: 25 }"
            :no-data-label="
              attendanceHistoryRows.length === 0
                ? `No attendance recorded for ${historyMonthLabel}.`
                : 'No data'
            "
          >
            <template #body-cell-rate="props">
              <q-td :props="props">
                <span v-if="props.value === null" class="text-grey-6">—</span>
                <q-chip
                  v-else
                  :color="getAttendanceRateColor(props.value)"
                  text-color="white"
                  dense
                  square
                >
                  {{ props.value }}%
                </q-chip>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab 3: Academic Performance Assessments -->
        <q-tab-panel name="performance" class="q-pa-md">
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">Recorded Assessments for Class</div>
            <q-space />
            <q-btn
              v-if="canWrite"
              color="primary"
              icon="add_task"
              label="Record Scores"
              :to="`/school/classes/${cls.$id}/record`"
            />
          </div>

          <div
            v-if="classAssessments.length === 0"
            class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders border-dashed"
          >
            <q-icon name="quiz" size="48px" />
            <div>No past assessments found for this class.</div>
            <div v-if="canWrite" class="text-caption q-mt-xs">
              Click "Record Scores" to create your first assessment.
            </div>
          </div>

          <q-table
            v-else
            :rows="classAssessments"
            :columns="assessmentColumns"
            row-key="id"
            flat
            dense
            @row-click="viewAssessmentPerformance"
          >
            <!-- Date custom Slot -->
            <template #body-cell-assessment_date="props">
              <q-td :props="props">
                {{ formatDate(props.value) }}
              </q-td>
            </template>

            <!-- Average custom Slot -->
            <template #body-cell-class_average="props">
              <q-td :props="props" class="text-center">
                <q-chip :color="getAverageColor(props.value)" text-color="white" dense square>
                  {{ props.value }}% Avg
                </q-chip>
              </q-td>
            </template>

            <!-- Actions Column -->
            <template #body-cell-actions="props">
              <q-td :props="props" @click.stop class="text-right">
                <q-btn
                  flat
                  dense
                  round
                  icon="analytics"
                  color="primary"
                  size="sm"
                  @click="viewAssessmentPerformance(null, props.row)"
                >
                  <q-tooltip>View Performance Analysis</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="canWrite"
                  flat
                  dense
                  round
                  icon="edit"
                  color="secondary"
                  size="sm"
                  @click="editAssessment(props.row)"
                >
                  <q-tooltip>Edit Scores</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="canAdmin"
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  size="sm"
                  @click="confirmDeleteAssessment(props.row)"
                >
                  <q-tooltip>Delete Assessment</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Tab 4: Class Timetable -->
        <q-tab-panel name="timetable" class="q-pa-md">
          <ClassTimetablePanel :class-id="route.params.id" :class-data="cls" />
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialog: Add Student to Class -->
    <q-dialog v-model="showEnrollmentDialog" persistent>
      <q-card style="min-width: 450px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Enroll Student in {{ cls.name }}</div>
          <div class="text-caption text-white-5">
            Select a student from the active list to enroll in this class section.
          </div>
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="selectedStudent"
            :options="availableStudentOptions"
            label="Select Active Student *"
            outlined
            dense
            use-input
            fill-input
            hide-selected
            @filter="filterStudents"
            :rules="[(val) => !!val || 'Required']"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey"
                  >No students available (all assigned or inactive)</q-item-section
                >
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat color="grey-7" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            label="Enroll Student"
            :loading="isSubmittingEnrollment"
            @click="enrollStudent"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, date } from 'quasar';
import { useClassStore } from '../stores/class-store';
import { normalizeClassId } from '../utils/school-utils';
import { useLearnerStore } from '../stores/learner-store';
import { useSchoolStore } from '../stores/school-store';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import { toDateStrInTimezone, addDaysToDateStr } from 'src/utils/dateUtils';
import ClassTimetablePanel from '../components/ClassTimetablePanel.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const classStore = useClassStore();
const learnerStore = useLearnerStore();
const schoolStore = useSchoolStore();
const calendarEventsStore = useCalendarEventsStore();
const atRiskStore = useAtRiskStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));

const tab = ref('learners');
const cls = computed(() => classStore.classes.find((c) => c.$id === route.params.id));

const studentCount = computed(() => classStore.getClassSize(route.params.id));
const classLearners = computed(() => classStore.getActiveLearnersByClass(route.params.id));

// Enrollment
const showEnrollmentDialog = ref(false);
const selectedStudent = ref(null);
const isSubmittingEnrollment = ref(false);
const allActiveStudents = ref([]);
const filteredStudentsList = ref([]);

// Attendance
const attendanceDate = ref('');
const loadingAttendance = ref(false);
const savingAttendance = ref(false);
const attendanceRows = ref([]);

// Attendance history (Story 4.7 AC3)
const historyMonthOffset = ref(0); // 0 = current month, -1 = last month, etc.
const loadingHistory = ref(false);
const attendanceHistoryRows = ref([]);

onMounted(async () => {
  await classStore.fetchClasses();
  await learnerStore.fetchLearners();
  await schoolStore.fetchTestScores();
  await calendarEventsStore.fetchCalendarEvents();
  await atRiskStore.computeAtRisk();

  if (!cls.value) {
    $q.notify({
      type: 'negative',
      message: 'Class not found.',
    });
    router.push('/school/classes');
    return;
  }

  // Default attendance date to today if it's a school day, otherwise walk back
  // to the most recent school day on or before today (Story 4.7 AC2).
  const tz = settingsStore.timezone;
  let candidate = toDateStrInTimezone(new Date().toISOString(), tz);
  // Walk back day-by-day until a school day is found (use a generous safety cap)
  let safety = 0;
  while (!calendarEventsStore.isSchoolDay(candidate, route.params.id) && safety < 60) {
    candidate = addDaysToDateStr(candidate, -1);
    safety++;
  }
  attendanceDate.value = candidate;

  // Load contextual sections
  loadAttendance();
  loadAllActiveStudents();
  loadAttendanceHistory();
});

// Load Learners who aren't currently enrolled in any class
async function loadAllActiveStudents() {
  await learnerStore.fetchLearners();
  allActiveStudents.value = learnerStore.learners
    .filter(
      (l) =>
        l.enrollment_status === 'Active' &&
        !(l.class_id_normalized || normalizeClassId(l.class_id)),
    )
    .map((l) => ({
      label: `${learnerStore.getLearnerName(l)}`,
      value: l.$id,
    }));
  filteredStudentsList.value = allActiveStudents.value;
}

const availableStudentOptions = computed(() => filteredStudentsList.value);

function filterStudents(val, update) {
  if (val === '') {
    update(() => {
      filteredStudentsList.value = allActiveStudents.value;
    });
    return;
  }

  update(() => {
    const needle = val.toLowerCase();
    filteredStudentsList.value = allActiveStudents.value.filter((v) =>
      v.label.toLowerCase().includes(needle),
    );
  });
}

function openEnrollmentDialog() {
  loadAllActiveStudents();
  selectedStudent.value = null;
  showEnrollmentDialog.value = true;
}

async function enrollStudent() {
  if (!selectedStudent.value) return;

  isSubmittingEnrollment.value = true;
  try {
    // Modify learner class_id
    const res = await learnerStore.updateLearner(selectedStudent.value.value, {
      class_id: route.params.id,
    });

    if (res.success) {
      $q.notify({
        type: 'positive',
        message: 'Student enrolled in class successfully.',
      });
      showEnrollmentDialog.value = false;
      await learnerStore.fetchLearners(true); // reload
    }
  } finally {
    isSubmittingEnrollment.value = false;
  }
}

function confirmRemoveLearner(learner) {
  $q.dialog({
    title: 'Remove Student',
    message: `Are you sure you want to remove ${learnerStore.getLearnerName(learner)} from this class section?`,
    cancel: true,
    persistent: true,
    ok: { label: 'Remove Student', color: 'negative' },
  }).onOk(async () => {
    const res = await learnerStore.updateLearner(learner.$id, {
      class_id: null,
    });
    if (res.success) {
      $q.notify({
        type: 'positive',
        message: 'Student removed from class section.',
      });
      await learnerStore.fetchLearners(true); // reload
    }
  });
}

// Attendance implementation
async function loadAttendance() {
  loadingAttendance.value = true;
  try {
    await classStore.fetchAttendance(route.params.id, attendanceDate.value);

    // Map class learners with their recorded attendance state
    attendanceRows.value = classLearners.value.map((learner) => {
      const match = classStore.attendance.find((a) => {
        const lId = typeof a.learner_id === 'object' ? a.learner_id?.$id : a.learner_id;
        return lId === learner.$id;
      });

      return {
        learner_id: learner.$id,
        learner_name: learnerStore.getLearnerName(learner),
        status: match ? match.status : 'Present', // default present
        absence_reason: match ? match.absence_reason || '' : '',
        notes: match ? match.notes || '' : '',
        $id: match ? match.$id : null,
      };
    });
  } finally {
    loadingAttendance.value = false;
  }
}

function markAllPresent() {
  attendanceRows.value.forEach((r) => {
    r.status = 'Present';
    r.absence_reason = '';
  });
}

async function saveAttendance() {
  savingAttendance.value = true;
  try {
    const res = await classStore.saveAttendance(
      route.params.id,
      attendanceDate.value,
      attendanceRows.value,
    );
    if (res.success) {
      $q.notify({
        type: 'positive',
        message: 'Daily attendance saved successfully.',
      });
      loadAttendance();
      await atRiskStore.refresh();
    }
  } finally {
    savingAttendance.value = false;
  }
}

// At-risk learners in this class (Story 4.7 AC7 — real data via atRiskStore)
const classAtRiskLearners = computed(() => {
  if (atRiskStore.gracePeriodActive) return [];
  const classId = route.params.id;
  return atRiskStore.atRiskLearners.filter(
    (l) => l.classId === classId || l.classId === normalizeClassId(classId),
  );
});

function formatRiskSummary(learner) {
  const parts = [];
  if (learner.attendanceRate !== null && learner.attendanceRate !== undefined) {
    parts.push(`Attendance ${learner.attendanceRate}%`);
  }
  if (learner.lowestSubject) {
    parts.push(`${learner.lowestSubject.subject} ${learner.lowestSubject.average}%`);
  }
  return parts.join(' · ') || 'At-risk';
}

// Calendar-aware date validation (Story 4.7 AC2)
const isAttendanceDateSchoolDay = computed(() => {
  if (!attendanceDate.value) return true;
  return calendarEventsStore.isSchoolDay(attendanceDate.value, route.params.id);
});

const attendanceDateReason = computed(() => {
  if (!attendanceDate.value) return '';
  // Find the covering closed event to provide a reason
  const tz = settingsStore.timezone;
  const datePart = toDateStrInTimezone(attendanceDate.value, tz);
  const dayOfWeek = new Date(datePart + 'T12:00:00Z').getUTCDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
  const covering = calendarEventsStore.calendarEvents.find((e) => {
    if (e.is_school_day) return false;
    const eStart = toDateStrInTimezone(e.start_date, tz);
    const eEnd = toDateStrInTimezone(e.end_date, tz);
    return datePart >= eStart && datePart <= eEnd;
  });
  return covering ? covering.title : '';
});

// Attendance history (Story 4.7 AC3)
const historyMonthLabel = computed(() => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + historyMonthOffset.value, 1);
  return date.formatDate(d, 'MMMM YYYY');
});

function shiftHistoryMonth(delta) {
  historyMonthOffset.value += delta;
  loadAttendanceHistory();
}

async function loadAttendanceHistory() {
  loadingHistory.value = true;
  try {
    const now = new Date();
    const monthDate = new Date(now.getFullYear(), now.getMonth() + historyMonthOffset.value, 1);
    const startDate = date.formatDate(monthDate, 'YYYY-MM-01');
    const endDate = date.formatDate(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0),
      'YYYY-MM-DD',
    );
    const res = await classStore.fetchAttendanceForClassRange(route.params.id, startDate, endDate);
    if (res.success) {
      // Group by attendance_date
      const byDate = {};
      for (const rec of res.data) {
        const dateKey = toDateStrInTimezone(rec.attendance_date, settingsStore.timezone);
        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: dateKey, present: 0, late: 0, absent: 0, excused: 0, total: 0 };
        }
        byDate[dateKey].total++;
        switch (rec.status) {
          case 'Present':
            byDate[dateKey].present++;
            break;
          case 'Late':
            byDate[dateKey].late++;
            break;
          case 'Absent':
            byDate[dateKey].absent++;
            break;
          case 'Excused':
            byDate[dateKey].excused++;
            break;
        }
      }
      attendanceHistoryRows.value = Object.values(byDate)
        .map((d) => {
          const rate = d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : null;
          return {
            date: d.date,
            present: d.present,
            late: d.late,
            absent: d.absent,
            excused: d.excused,
            rate,
          };
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1));
    } else {
      attendanceHistoryRows.value = [];
    }
  } finally {
    loadingHistory.value = false;
  }
}

function getAttendanceRateColor(rate) {
  if (rate >= 90) return 'positive';
  if (rate >= 75) return 'warning';
  return 'negative';
}

// Reload history when switching to the attendance tab (lazy load)
watch(tab, (newTab) => {
  if (
    newTab === 'attendance' &&
    attendanceHistoryRows.value.length === 0 &&
    !loadingHistory.value
  ) {
    loadAttendanceHistory();
  }
});

// Academics tab calculations
const classAssessments = computed(() => classStore.getClassAssessments(route.params.id));

const rollingAverage = computed(() => {
  const ass = classAssessments.value;
  if (ass.length === 0) return 0;
  const tot = ass.reduce((sum, a) => sum + a.class_average, 0);
  return Math.round(tot / ass.length);
});

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return date.formatDate(isoStr, 'DD MMM YYYY');
}

function getAverageColor(avg) {
  if (avg < 50) return 'negative';
  if (avg < 60) return 'warning';
  return 'positive';
}

function viewAssessmentPerformance(evt, row) {
  const dStr = row.assessment_date.slice(0, 10);
  router.push(
    `/school/classes/${route.params.id}/performance?subject=${encodeURIComponent(row.subject)}&assessmentType=${encodeURIComponent(
      row.assessment_type,
    )}&term=${encodeURIComponent(row.term)}&year=${row.academic_year}&date=${dStr}`,
  );
}

function editAssessment(row) {
  const dStr = row.assessment_date.slice(0, 10);
  router.push(
    `/school/classes/${route.params.id}/record?subject=${encodeURIComponent(row.subject)}&assessmentType=${encodeURIComponent(
      row.assessment_type,
    )}&term=${encodeURIComponent(row.term)}&year=${row.academic_year}&date=${dStr}&maxScore=${
      row.max_score
    }`,
  );
}

function confirmDeleteAssessment(row) {
  $q.dialog({
    title: 'Delete Assessment',
    message: `Are you sure you want to delete all recorded scores for ${row.subject} (${row.assessment_type}) on ${formatDate(row.assessment_date)}? This cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete All', color: 'negative' },
  }).onOk(async () => {
    const result = await schoolStore.deleteAssessment(row);
    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Assessment scores deleted successfully.',
      });
    }
  });
}

// Column layouts
const learnerColumns = [
  {
    name: 'name',
    label: 'Learner Name',
    field: 'resident_full_name',
    align: 'left',
    sortable: true,
  },
  { name: 'age', label: 'Age', field: 'age', align: 'center', sortable: true },
  { name: 'gender', label: 'Gender', field: 'gender', align: 'center' },
  {
    name: 'parent_guardian',
    label: 'Parent / Guardian',
    field: 'parent_guardian_name',
    align: 'left',
  },
  { name: 'phone', label: 'Guardian Phone', field: 'parent_guardian_phone', align: 'left' },
  { name: 'actions', label: 'Actions', align: 'right' },
];

const attendanceColumns = [
  { name: 'name', label: 'Learner Name', field: 'learner_name', align: 'left', sortable: true },
  { name: 'status', label: 'Attendance Status', align: 'center' },
  { name: 'absence_reason', label: 'Absence Reason', field: 'absence_reason', align: 'left' },
];

const historyColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'present', label: 'Present', field: 'present', align: 'center' },
  { name: 'late', label: 'Late', field: 'late', align: 'center' },
  { name: 'absent', label: 'Absent', field: 'absent', align: 'center' },
  { name: 'excused', label: 'Excused', field: 'excused', align: 'center' },
  { name: 'rate', label: 'Class Rate', field: 'rate', align: 'center', sortable: true },
];

const assessmentColumns = [
  {
    name: 'assessment_date',
    label: 'Date',
    field: 'assessment_date',
    align: 'left',
    sortable: true,
  },
  { name: 'subject', label: 'Subject', field: 'subject', align: 'left', sortable: true },
  {
    name: 'assessment_type',
    label: 'Type',
    field: 'assessment_type',
    align: 'left',
    sortable: true,
  },
  { name: 'learner_count', label: 'Students Assessed', field: 'learner_count', align: 'center' },
  {
    name: 'class_average',
    label: 'Class Average',
    field: 'class_average',
    align: 'center',
    sortable: true,
  },
  { name: 'actions', label: 'Actions', align: 'right' },
];

function viewLearnerDetail(id) {
  router.push(`/school/learners/${id}`);
}
</script>

<style scoped>
.stats-card {
  border-radius: 8px;
}
</style>
