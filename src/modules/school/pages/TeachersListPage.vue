<!--
  TeachersListPage.vue

  Full-width faculty browser with a responsive detail drawer.
  - Desktop: table view; row click opens a right-side drawer with full week schedule.
  - Mobile: table view; row click opens a full-screen dialog with swipeable day schedule.
  - Each row shows a "Current / Next" class indicator.
-->
<template>
  <q-page padding>
    <!-- Page header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">School Faculty & Teachers</div>
        <div class="text-caption text-grey-7">
          Browse teaching profiles, class assignments, and master schedules
        </div>
      </div>
      <q-btn
        v-if="canAdmin"
        color="primary"
        icon="person_add"
        label="Assign Teacher"
        @click="openAssignDialog"
      />
    </div>

    <!-- Search & filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-6 col-md-4">
          <q-input
            v-model="searchQuery"
            label="Search by name, email, or role"
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
        <div class="col-12 col-sm-6 col-md-8 text-right">
          <span class="text-caption text-grey-7">
            {{ filteredTeachers.length }} of {{ teachers.length }} faculty members
          </span>
        </div>
      </q-card-section>
    </q-card>

    <!-- Faculty data table -->
    <q-table
      :rows="filteredTeachers"
      :columns="columns"
      row-key="$id"
      :loading="loading"
      :pagination="{ rowsPerPage: 25 }"
      flat
      bordered
      dense
      @row-click="(evt, row) => openDrawer(row)"
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <div class="row items-center no-wrap">
            <q-avatar
              color="primary"
              text-color="white"
              icon="school"
              size="32px"
              class="q-mr-sm"
            />
            <span class="text-weight-medium">{{ props.value }}</span>
          </div>
        </q-td>
      </template>

      <template #body-cell-email="props">
        <q-td :props="props">
          <span v-if="props.value" class="text-caption">{{ props.value }}</span>
          <span v-else class="text-caption text-grey-5">No email registered</span>
        </q-td>
      </template>

      <template #body-cell-role="props">
        <q-td :props="props">
          <q-chip outline color="primary" dense square size="10px">
            {{ props.value }}
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-periods="props">
        <q-td :props="props">
          <q-chip outline color="secondary" dense square size="10px">
            {{ props.value }} Periods
          </q-chip>
        </q-td>
      </template>

      <template #body-cell-nextClass="props">
        <q-td :props="props">
          <div v-if="props.value" class="row items-center">
            <q-badge
              :color="props.value.isNow ? 'positive' : 'grey-6'"
              text-color="white"
              class="q-mr-xs"
            >
              {{ props.value.isNow ? 'Now' : 'Next' }}
            </q-badge>
            <div class="text-caption">
              <span class="text-weight-bold">{{ props.value.periodLabel }}</span>
              <span class="text-grey-7"> · {{ props.value.className }}</span>
              <span class="text-grey-6"> · {{ props.value.subject }}</span>
              <span class="text-grey-5"> · {{ props.value.startTime }}</span>
            </div>
          </div>
          <span v-else class="text-caption text-grey-5">No class scheduled</span>
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
            color="primary"
            @click="openDrawer(props.row)"
          >
            <q-tooltip>View Schedule</q-tooltip>
          </q-btn>
          <q-btn
            v-if="canAdmin"
            flat
            dense
            round
            icon="delete"
            size="sm"
            color="negative"
            class="q-ml-xs"
            @click="removeTeacher(props.row)"
          >
            <q-tooltip>Remove all assignments</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width text-center q-pa-lg text-grey-7">
          <template v-if="teachers.length === 0">
            No teaching faculty assigned yet.
            <span v-if="canAdmin">Click "Assign Teacher" to get started.</span>
          </template>
          <template v-else>No faculty match the current search.</template>
        </div>
      </template>
    </q-table>

    <!-- Detail drawer -->
    <TeacherDetailDrawer
      v-model="drawerOpen"
      :teacher="drawerTeacher"
      :academic-year="selectedScheduleYear"
      :can-admin="canAdmin"
      @remove="removeTeacher"
    />

    <!-- Assign Teacher Dialog -->
    <q-dialog v-model="showAssignDialog" persistent>
      <q-card style="min-width: 400px; max-width: 500px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Assign Teacher</div>
          <div class="text-caption">
            Select a resident and assign them to one or more grade levels.
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <ResidentSearchInput
            v-model="assignForm.residentId"
            label="Select Resident *"
            hint="Search by name"
            @select="onResidentSelect"
          />

          <div class="text-subtitle2 text-weight-medium">Grade Assignments</div>

          <div
            v-for="(row, idx) in assignForm.rows"
            :key="idx"
            class="row q-col-gutter-sm items-center"
          >
            <div class="col-5">
              <q-select
                v-model="row.grade"
                :options="gradeOptions"
                label="Grade Level *"
                outlined
                dense
                emit-value
                map-options
              />
            </div>
            <div class="col-6">
              <q-select
                v-if="isSubjectTeacherGrade(row.grade)"
                v-model="row.subjects"
                :options="subjectOptions"
                label="Subjects *"
                outlined
                dense
                multiple
                use-chips
                stack-label
                clearable
              />
              <q-chip v-else outline color="grey-6" dense size="sm">All Subjects</q-chip>
            </div>
            <div class="col-1">
              <q-btn
                v-if="assignForm.rows.length > 1"
                flat
                round
                dense
                color="negative"
                icon="remove"
                size="sm"
                @click="removeAssignRow(idx)"
              />
            </div>
          </div>

          <q-btn
            flat
            color="primary"
            icon="add"
            label="Add Grade Assignment"
            size="sm"
            :disable="!canAddAssignRow"
            @click="addAssignRow"
          />

          <q-input
            v-model="assignForm.notes"
            label="Notes"
            hint="Optional assignment details"
            outlined
            dense
            type="textarea"
            rows="2"
          />

          <q-banner v-if="assignForm.ageError" class="bg-negative text-white rounded-borders" dense>
            <q-icon name="error" class="q-mr-sm" />
            {{ assignForm.ageError }}
          </q-banner>

          <q-banner class="bg-info text-white rounded-borders" dense>
            <q-icon name="info" class="q-mr-sm" />
            To grant school module write access, assign the Teacher role in User Management.
          </q-banner>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancel" color="grey" @click="closeAssignDialog" />
          <q-btn
            label="Assign"
            color="primary"
            :loading="assignForm.submitting"
            :disable="!isFormValid || !!assignForm.ageError"
            @click="submitAssign"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useClassStore } from '../stores/class-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore } from '../stores/period-slots-store';
import { useResidentsStore } from 'src/stores/residents-store';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';
import TeacherDetailDrawer from '../components/TeacherDetailDrawer.vue';
import { GRADE_LEVELS, SUBJECTS } from '../utils/school-constants';
import { findCurrentOrNextClass } from '../utils/schedule-utils';

const $q = useQuasar();
const classStore = useClassStore();
const teacherStore = useTeacherStore();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const residentsStore = useResidentsStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const loading = ref(false);
const teachers = ref([]);
const searchQuery = ref('');
const drawerOpen = ref(false);
const drawerTeacher = ref(null);
const selectedScheduleYear = ref(new Date().getFullYear());
const showAssignDialog = ref(false);
const canAdmin = computed(() => hasPermission('school:admin'));
const timezone = computed(() => settingsStore.timezone);

const assignForm = reactive({
  residentId: null,
  residentRaw: null,
  rows: [{ grade: '', subjects: [] }],
  notes: '',
  ageError: '',
  submitting: false,
});

const gradeOptions = GRADE_LEVELS.map((g) => ({ label: g, value: g }));
const subjectOptions = SUBJECTS.map((s) => ({ label: s, value: s }));

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      classStore.fetchClasses(),
      timetableStore.fetchTimetableEntries(),
      periodSlotsStore.fetchPeriodSlots(),
      residentsStore.fetchResidents(1, 500),
    ]);
    await loadFaculty();
  } finally {
    loading.value = false;
  }
});

async function loadFaculty() {
  try {
    await teacherStore.fetchTeacherAssignments();
    const byTeacher = teacherStore.assignmentsByTeacher;
    teachers.value = Object.values(byTeacher).map((t) => {
      const resident = residentsStore.getResidentById(t.teacher_id);
      return {
        $id: t.teacher_id,
        name: t.teacher_name || 'Unknown Teacher',
        email: resident?.email || '',
        phone: resident?.phone || '',
      };
    });
  } catch (error) {
    console.error('TeachersListPage: failed to load teachers', error);
  }
}

function openDrawer(teacher) {
  drawerTeacher.value = teacher;
  drawerOpen.value = true;
}

function getPrimaryClassLabel(teacherId) {
  const matchClass = classStore.classes.find(
    (c) => c.class_teacher_id_normalized === teacherId || c.class_teacher_id === teacherId,
  );
  return matchClass ? `Class Teacher: ${matchClass.name}` : 'Subject Instructor';
}

function getTeacherNextClass(teacherId) {
  return findCurrentOrNextClass(
    teacherId,
    selectedScheduleYear.value,
    timetableStore,
    periodSlotsStore,
    classStore,
    timezone.value,
  );
}

function openAssignDialog() {
  resetAssignForm();
  showAssignDialog.value = true;
}

function closeAssignDialog() {
  showAssignDialog.value = false;
}

function resetAssignForm() {
  assignForm.residentId = null;
  assignForm.residentRaw = null;
  assignForm.rows = [{ grade: '', subjects: [] }];
  assignForm.notes = '';
  assignForm.ageError = '';
}

function isSubjectTeacherGrade(grade) {
  if (!grade) return false;
  const idx = GRADE_LEVELS.indexOf(grade);
  return idx >= 6;
}

const canAddAssignRow = computed(() => {
  return assignForm.rows.length < GRADE_LEVELS.length;
});

const isFormValid = computed(() => {
  if (!assignForm.residentId) return false;
  if (assignForm.rows.length === 0) return false;
  return assignForm.rows.every((row) => {
    if (!row.grade) return false;
    if (isSubjectTeacherGrade(row.grade)) {
      return row.subjects && row.subjects.length > 0;
    }
    return true;
  });
});

function addAssignRow() {
  assignForm.rows.push({ grade: '', subjects: [] });
}

function removeAssignRow(index) {
  assignForm.rows.splice(index, 1);
  if (assignForm.rows.length === 0) {
    addAssignRow();
  }
}

function onResidentSelect(option) {
  assignForm.residentId = option.id;
  assignForm.residentRaw = option.raw;
  validateAge();
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function validateAge() {
  const dob = assignForm.residentRaw?.date_of_birth;
  const age = calculateAge(dob);
  if (age !== null && age < 18) {
    assignForm.ageError = `Resident is ${age} years old. Teachers must be at least 18.`;
  } else {
    assignForm.ageError = '';
  }
}

async function submitAssign() {
  if (!isFormValid.value) return;

  validateAge();
  if (assignForm.ageError) return;

  assignForm.submitting = true;
  const results = [];

  try {
    for (const row of assignForm.rows) {
      const subjects = isSubjectTeacherGrade(row.grade) ? row.subjects : [];
      const res = await teacherStore.createTeacherAssignment(
        assignForm.residentId,
        row.grade,
        assignForm.notes,
        subjects,
      );
      results.push({ grade: row.grade, success: res.success, error: res.error });
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (failed === 0) {
      $q.notify({ type: 'positive', message: `Assigned to ${succeeded} grade(s).` });
    } else {
      const dupes = results.filter((r) => r.error?.includes('already assigned')).length;
      $q.notify({
        type: 'warning',
        message: `Assigned to ${succeeded} grade(s). ${dupes > 0 ? `${dupes} already assigned.` : ''}`,
      });
    }

    closeAssignDialog();
    await loadFaculty();
  } catch (error) {
    console.error('Error assigning teacher:', error);
    $q.notify({ type: 'negative', message: 'Failed to assign teacher. Please try again.' });
  } finally {
    assignForm.submitting = false;
  }
}

async function removeTeacher(teacher) {
  $q.dialog({
    title: 'Confirm Removal',
    message: `Remove all grade assignments for ${teacher.name}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const assignments = teacherStore.teacherAssignments.filter(
      (a) => a.teacher_id_normalized === teacher.$id,
    );
    for (const a of assignments) {
      await teacherStore.deleteTeacherAssignment(a.$id);
    }
    await loadFaculty();
    if (drawerTeacher.value?.$id === teacher.$id) {
      drawerOpen.value = false;
      drawerTeacher.value = null;
    }
    $q.notify({ type: 'positive', message: `${teacher.name} removed from all assignments.` });
  });
}

const columns = [
  {
    name: 'name',
    label: 'Name',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
    align: 'left',
    sortable: true,
  },
  {
    name: 'role',
    label: 'Role',
    field: (row) => getPrimaryClassLabel(row.$id),
    align: 'left',
    sortable: true,
  },
  {
    name: 'periods',
    label: 'Periods',
    field: (row) => timetableStore.teacherSchedule(row.$id, selectedScheduleYear.value).length,
    align: 'center',
    sortable: true,
  },
  {
    name: 'nextClass',
    label: 'Current / Next',
    field: (row) => getTeacherNextClass(row.$id),
    align: 'left',
    sortable: false,
  },
  {
    name: 'actions',
    label: 'Actions',
    field: '$id',
    align: 'right',
  },
];

const filteredTeachers = computed(() => {
  if (!searchQuery.value) return teachers.value;
  const term = searchQuery.value.toLowerCase();
  return teachers.value.filter((teacher) => {
    const role = getPrimaryClassLabel(teacher.$id).toLowerCase();
    const nextClass = getTeacherNextClass(teacher.$id);
    const nextClassText = nextClass
      ? `${nextClass.periodLabel} ${nextClass.className} ${nextClass.subject}`.toLowerCase()
      : '';
    return (
      (teacher.name || '').toLowerCase().includes(term) ||
      (teacher.email || '').toLowerCase().includes(term) ||
      role.includes(term) ||
      nextClassText.includes(term)
    );
  });
});
</script>

<style scoped></style>
