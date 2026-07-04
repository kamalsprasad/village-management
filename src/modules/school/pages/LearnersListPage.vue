<!--
  LearnersListPage.vue (Story 4.1)
  Learner list with class/status filters, name search, sorting, and pagination.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Learners</div>
        <div class="text-caption text-grey-7">
          {{ learnerStore.filteredLearners.length }} of {{ learnerStore.learners.length }} learners
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="canWrite"
        color="primary"
        icon="person_add"
        label="Enroll Learner"
        @click="$router.push('/school/learners/enroll')"
        class="q-mr-sm"
      />
      <q-btn
        v-if="canWrite"
        outline
        color="primary"
        icon="picture_as_pdf"
        label="Progress Reports"
        @click="showBulkReportDialog = true"
      />
    </div>

    <!-- Filters (AC7) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="learnerStore.filters.searchQuery"
            label="Search by name"
            outlined
            dense
            clearable
            debounce="200"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-select
            v-model="learnerStore.filters.classIds"
            :options="classOptions"
            label="Class"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-6 col-sm-3">
          <q-select
            v-model="learnerStore.filters.statuses"
            :options="statusOptions"
            label="Status"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-btn flat color="grey-7" label="Clear Filters" @click="learnerStore.resetFilters()" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Learners Table (AC3) -->
    <q-table
      :rows="sortedLearners"
      :columns="columns"
      row-key="$id"
      :loading="learnerStore.isLoading"
      :pagination="{ rowsPerPage: 25 }"
      flat
      bordered
      @row-click="(evt, row) => $router.push(`/school/learners/${row.$id}`)"
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <span class="text-weight-medium">{{ props.value || 'Unknown' }}</span>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          <EnrollmentStatusBadge :status="props.value" />
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" @click.stop>
          <q-btn
            flat
            dense
            round
            icon="visibility"
            size="sm"
            :to="`/school/learners/${props.row.$id}`"
          >
            <q-tooltip>View Details</q-tooltip>
          </q-btn>
          <q-btn
            v-if="canAdmin"
            flat
            dense
            round
            icon="edit"
            size="sm"
            :to="`/school/learners/${props.row.$id}/edit`"
          >
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width text-center q-pa-lg text-grey-7">
          <template v-if="learnerStore.learners.length === 0">
            No learners enrolled yet.
            <span v-if="canWrite">Click "Enroll Learner" to get started.</span>
          </template>
          <template v-else> No learners match the current filters. </template>
        </div>
      </template>
    </q-table>

    <!-- Bulk Progress Reports Dialog -->
    <q-dialog v-model="showBulkReportDialog" persistent>
      <q-card style="min-width: 350px; max-width: 500px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-weight-bold">Bulk Progress Reports (ZIP)</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup :disabled="isGeneratingBulkReports" />
        </q-card-section>

        <q-card-section class="q-pt-md q-gutter-md">
          <!-- Grade / Class Selector -->
          <q-select
            v-model="selectedBulkClass"
            :options="activeClassOptions"
            label="Select Class / Grade"
            outlined
            dense
            :disabled="isGeneratingBulkReports"
          />

          <!-- Year Select -->
          <q-select
            v-model="selectedBulkYear"
            :options="bulkYearOptions"
            label="Academic Year"
            outlined
            dense
            :disabled="isGeneratingBulkReports"
          />

          <!-- Term Select -->
          <q-select
            v-model="selectedBulkTerm"
            :options="bulkTermOptions"
            label="Academic Term"
            outlined
            dense
            :disabled="isGeneratingBulkReports || !selectedBulkYear"
          />

          <!-- Class note -->
          <q-input
            v-model="bulkClassNote"
            type="textarea"
            label="Class-level note / Comments (Optional)"
            placeholder="This comments will be included in ALL reports in this batch…"
            outlined
            dense
            rows="3"
            maxlength="300"
            counter
            :disabled="isGeneratingBulkReports"
          />

          <!-- Progress indicators -->
          <div v-if="isGeneratingBulkReports" class="q-mt-md">
            <div class="text-caption text-weight-medium text-primary q-mb-xs">
              Generating report {{ bulkProgressCount }} of {{ bulkProgressTotal }}…
            </div>
            <q-linear-progress
              :value="bulkProgressCount / bulkProgressTotal"
              color="primary"
              size="10px"
              rounded
              track-color="grey-3"
            />
          </div>
          <div v-else-if="selectedBulkClass" class="text-caption text-grey-7">
            This will generate {{ selectedBulkClassCount }} progress reports as a ZIP file.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pb-md q-px-md text-primary">
          <q-btn flat label="Cancel" v-close-popup :disabled="isGeneratingBulkReports" />
          <q-btn
            color="primary"
            icon="picture_as_pdf"
            label="Generate ZIP"
            :disabled="
              !selectedBulkClass ||
              !selectedBulkYear ||
              !selectedBulkTerm ||
              selectedBulkClassCount === 0
            "
            :loading="isGeneratingBulkReports"
            @click="generateBulkReports"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useQuasar, date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useClassStore } from '../stores/class-store';
import { normalizeClassId } from '../utils/school-utils';
import { usePermissions } from 'src/composables/usePermissions';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useCalendarEventsStore } from '../stores/calendar-events-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useSchoolStore } from '../stores/school-store';
import { useInterventionStore } from '../stores/intervention-store';
import { exportBulkLearnerProgressToZip } from 'src/services/ReportExportService';
import { computeLearnerOverallAverage } from '../utils/school-goal-utils';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';
import { ENROLLMENT_STATUSES } from '../utils/school-constants';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge.vue';

const learnerStore = useLearnerStore();
const classStore = useClassStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));

const $q = useQuasar();
const academicTermsStore = useAcademicTermsStore();
const calendarEventsStore = useCalendarEventsStore();
const teacherStore = useTeacherStore();
const goalsStore = useSchoolGoalsStore();
const settingsStore = useSettingsStore();
const schoolStore = useSchoolStore();
const interventionStore = useInterventionStore();

// Bulk Report Dialog State
const showBulkReportDialog = ref(false);
const isGeneratingBulkReports = ref(false);
const selectedBulkClass = ref(null);
const selectedBulkYear = ref(null);
const selectedBulkTerm = ref(null);
const bulkClassNote = ref('');
const bulkProgressCount = ref(0);
const bulkProgressTotal = ref(0);

// Year and Term options for bulk dialog
const bulkYearOptions = computed(() => {
  return academicTermsStore.availableYears.map((y) => ({ label: String(y), value: y }));
});

const bulkTermOptions = computed(() => {
  if (!selectedBulkYear.value) return [];
  const yearValue =
    typeof selectedBulkYear.value === 'object'
      ? selectedBulkYear.value?.value
      : selectedBulkYear.value;
  return academicTermsStore.termsByYear(yearValue).map((t) => ({
    label: t.term_name,
    value: t.term_name,
    start_date: t.start_date,
    end_date: t.end_date,
  }));
});

const selectedBulkClassCount = computed(() => {
  if (!selectedBulkClass.value) return 0;
  const classValue =
    typeof selectedBulkClass.value === 'object'
      ? selectedBulkClass.value?.value
      : selectedBulkClass.value;
  return learnerStore.activeLearners.filter((l) => {
    const cId = l.class_id_normalized || normalizeClassId(l.class_id);
    return cId === classValue;
  }).length;
});

const activeClassOptions = computed(() => {
  return classStore.classes
    .filter((c) => {
      const count = learnerStore.activeLearners.filter((l) => {
        const cId = l.class_id_normalized || normalizeClassId(l.class_id);
        return cId === c.$id;
      }).length;
      return count > 0;
    })
    .map((c) => {
      const count = learnerStore.activeLearners.filter((l) => {
        const cId = l.class_id_normalized || normalizeClassId(l.class_id);
        return cId === c.$id;
      }).length;
      return { label: `${c.name} (${count} active)`, value: c.$id, count };
    });
});

async function generateBulkReports() {
  if (!selectedBulkClass.value || !selectedBulkYear.value || !selectedBulkTerm.value) {
    $q.notify({ type: 'warning', message: 'Please select a class, academic year, and term' });
    return;
  }

  const classValue =
    typeof selectedBulkClass.value === 'object'
      ? selectedBulkClass.value?.value
      : selectedBulkClass.value;
  const yearValue =
    typeof selectedBulkYear.value === 'object'
      ? selectedBulkYear.value?.value
      : selectedBulkYear.value;
  const termValue =
    typeof selectedBulkTerm.value === 'object'
      ? selectedBulkTerm.value?.value
      : selectedBulkTerm.value;
  const termStart = selectedBulkTerm.value?.start_date;
  const termEnd = selectedBulkTerm.value?.end_date;

  // Find all active learners in the selected class
  const classLearners = learnerStore.activeLearners
    .filter((l) => {
      const cId = l.class_id_normalized || normalizeClassId(l.class_id);
      return cId === classValue;
    })
    .sort((a, b) => learnerStore.getLearnerName(a).localeCompare(learnerStore.getLearnerName(b)));

  if (classLearners.length === 0) {
    $q.notify({ type: 'warning', message: 'No active learners in the selected class' });
    return;
  }

  isGeneratingBulkReports.value = true;
  bulkProgressCount.value = 0;
  bulkProgressTotal.value = classLearners.length;

  try {
    const className = classStore.classes.find((c) => c.$id === classValue)?.name || 'Class';
    const paramsList = [];

    // Batch-fetch household names for all class learners' residents
    const householdMap = new Map();
    const householdIds = [
      ...new Set(
        classLearners
          .map((l) => {
            const hid = l.resident?.household_id;
            return typeof hid === 'string' ? hid : hid?.$id;
          })
          .filter(Boolean),
      ),
    ];
    if (householdIds.length > 0) {
      try {
        const householdsRes = await tables.listRows({
          databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
          tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
          queries: [Query.equal('$id', householdIds), Query.limit(householdIds.length)],
        });
        householdsRes.rows.forEach((h) => householdMap.set(h.$id, h.name || ''));
      } catch (err) {
        console.warn('Batch-fetch of households failed; household names will be empty', err);
      }
    }

    // Loop and gather data for each learner
    for (const learner of classLearners) {
      // Fetch term attendance for this learner
      const attResult = await classStore.fetchAttendanceForLearner(learner.$id, termStart, termEnd);
      const attendanceRecords = attResult?.data || [];

      // Count total school days for term
      const totalSchoolDays = calendarEventsStore.countSchoolDaysBetween(termStart, termEnd);

      // Compute overall average
      const learnerOverallAverage = computeLearnerOverallAverage(
        schoolStore.testScores,
        learner.$id,
        yearValue,
        termValue,
      );

      // Resolve resident details
      let residentData = null;
      if (learner.resident) {
        const hid =
          typeof learner.resident.household_id === 'string'
            ? learner.resident.household_id
            : learner.resident.household_id?.$id;
        residentData = {
          full_name: learnerStore.getLearnerName(learner),
          dob: learner.resident.dob,
          household_name: (hid && householdMap.get(hid)) || '',
        };
      }

      paramsList.push({
        learner,
        resident: residentData,
        className,
        testScores: schoolStore.testScores,
        attendanceRecords,
        totalSchoolDays,
        interventions: interventionStore.getInterventionsForLearner(learner.$id),
        activeGoal: goalsStore.activeGoal,
        learnerOverallAverage,
        teacherComment: bulkClassNote.value,
        termName: termValue,
        academicYear: yearValue,
        villageName: settingsStore.villageName,
        teacherAssignments: teacherStore.teacherAssignments,
      });

      bulkProgressCount.value += 1;
    }

    const zipFileName = `progress-reports-${className.replace(/\s+/g, '')}-${yearValue}-${termValue.replace(/\s+/g, '')}`;

    const result = await exportBulkLearnerProgressToZip(paramsList, zipFileName);

    if (result?.fallback) {
      $q.notify({
        type: 'warning',
        message: 'ZIP unavailable — downloading reports individually.',
      });
    } else {
      $q.notify({
        type: 'positive',
        message: `${classLearners.length} progress reports generated.`,
      });
    }
    showBulkReportDialog.value = false;
  } catch (error) {
    console.error('Error generating bulk progress reports:', error);
    $q.notify({ type: 'negative', message: 'Failed to generate bulk progress reports' });
  } finally {
    isGeneratingBulkReports.value = false;
  }
}

const classOptions = computed(() =>
  classStore.classes.map((c) => ({ label: c.name, value: c.$id })),
);
const statusOptions = ENROLLMENT_STATUSES.map((s) => ({ label: s.label, value: s.value }));

const sortedLearners = computed(() => {
  return [...learnerStore.filteredLearners].sort((a, b) => {
    const aClassId = a.class_id_normalized || normalizeClassId(a.class_id);
    const bClassId = b.class_id_normalized || normalizeClassId(b.class_id);

    if (!aClassId && bClassId) return -1;
    if (aClassId && !bClassId) return 1;

    return learnerStore.getLearnerName(a).localeCompare(learnerStore.getLearnerName(b));
  });
});

const columns = [
  {
    name: 'name',
    label: 'Resident Name',
    field: (row) => learnerStore.getLearnerName(row),
    align: 'left',
    sortable: true,
  },
  {
    name: 'class',
    label: 'Class',
    field: (row) => {
      const classId = row.class_id_normalized || normalizeClassId(row.class_id);
      const cls = classStore.classes.find((c) => c.$id === classId);
      return cls ? cls.name : 'Unassigned';
    },
    align: 'left',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'enrollment_status',
    align: 'left',
    sortable: true,
  },
  {
    name: 'enrollment_date',
    label: 'Enrollment Date',
    field: 'enrollment_date',
    align: 'left',
    sortable: true,
    format: (val) => (val ? date.formatDate(val, 'DD MMM YYYY') : '—'),
  },
  {
    name: 'actions',
    label: 'Actions',
    field: '$id',
    align: 'right',
  },
];

onMounted(async () => {
  await Promise.all([
    learnerStore.fetchLearners(),
    classStore.fetchClasses(),
    academicTermsStore.fetchAcademicTerms(),
    teacherStore.fetchTeacherAssignments(),
    goalsStore.computeProgress(),
    schoolStore.fetchTestScores(),
    interventionStore.fetchInterventions(),
  ]);

  // Set default values for bulk report selects
  if (academicTermsStore.availableYears.length > 0) {
    const currentYear = new Date().getFullYear();
    const defaultYear = academicTermsStore.availableYears.includes(currentYear)
      ? currentYear
      : academicTermsStore.availableYears[0];
    selectedBulkYear.value = { label: String(defaultYear), value: defaultYear };

    const yearTerms = academicTermsStore.termsByYear(defaultYear);
    if (yearTerms.length > 0) {
      const lastTerm = yearTerms[yearTerms.length - 1];
      selectedBulkTerm.value = {
        label: lastTerm.term_name,
        value: lastTerm.term_name,
        start_date: lastTerm.start_date,
        end_date: lastTerm.end_date,
      };
    }
  }
});
</script>
