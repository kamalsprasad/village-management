<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">School Faculty & Teachers</div>
        <div class="text-caption text-grey-7">
          View teaching profiles, class assignments, and master schedules
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

    <!-- Main Content Grid -->
    <div class="row q-col-gutter-md">
      <!-- Left: Teachers List Cards -->
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section class="bg-grey-1 row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Teaching Faculty</div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="loading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="lg" />
            <div class="text-caption q-mt-sm">Loading faculty records...</div>
          </q-card-section>

          <q-list v-else separator>
            <q-item
              v-for="teacher in teachers"
              :key="teacher.$id"
              clickable
              :active="selectedTeacher && selectedTeacher.$id === teacher.$id"
              active-class="bg-blue-1 text-primary"
              @click="selectTeacher(teacher)"
            >
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" icon="school" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-bold">{{ teacher.name }}</q-item-label>
                <q-item-label caption>
                  <q-icon name="email" class="q-mr-xs" size="xs" />
                  {{ teacher.email || 'No email registered' }}
                </q-item-label>
                <q-item-label caption class="row items-center q-mt-xs">
                  <q-chip outline color="primary" dense square size="10px">
                    {{ getPrimaryClassLabel(teacher.$id) }}
                  </q-chip>
                  <q-chip outline color="secondary" dense square size="10px">
                    {{ getTeachingPeriodsCount(teacher.$id) }} Periods Scheduled
                  </q-chip>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row items-center">
                  <q-btn
                    v-if="canAdmin"
                    flat
                    round
                    dense
                    color="negative"
                    icon="delete"
                    size="sm"
                    @click.stop="removeTeacher(teacher)"
                  >
                    <q-tooltip>Remove all assignments</q-tooltip>
                  </q-btn>
                  <q-icon name="chevron_right" class="q-ml-sm" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Right: Selected Teacher Schedule & Assignments -->
      <div class="col-12 col-md-7">
        <q-card v-if="selectedTeacher" flat bordered>
          <q-card-section class="bg-primary text-white row items-center">
            <q-avatar color="white" text-color="primary" icon="person" size="md" class="q-mr-md" />
            <div>
              <div class="text-subtitle1 text-weight-bold">{{ selectedTeacher.name }}</div>
              <div class="text-caption text-white-5">Faculty Profile & Timetable Schedule</div>
            </div>
          </q-card-section>

          <q-card-section class="q-pa-md">
            <!-- Faculty Information -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <div class="text-caption text-grey-7">Primary Class Assignment</div>
                <div class="text-subtitle2 text-weight-bold text-primary">
                  {{ getPrimaryClassLabel(selectedTeacher.$id) }}
                </div>
              </div>
              <div class="col-6 border-left">
                <div class="text-caption text-grey-7">Total Scheduled Periods</div>
                <div class="text-subtitle2 text-weight-bold text-secondary">
                  {{ getTeachingPeriodsCount(selectedTeacher.$id) }} periods per week
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- Grade Assignments -->
            <div class="text-subtitle1 text-weight-bold q-mb-xs">Grade Assignments</div>
            <div v-if="selectedTeacher" class="q-mb-md">
              <div
                v-for="assignment in getTeacherAssignments(selectedTeacher.$id)"
                :key="assignment.grade_level"
                class="q-mb-sm"
              >
                <div class="row items-center">
                  <q-chip color="primary" text-color="white" dense size="sm">
                    {{ assignment.grade_level }}
                  </q-chip>
                  <span v-if="isSubjectTeacherGrade(assignment.grade_level)" class="q-ml-sm">
                    <q-chip
                      v-for="subject in assignment.subjects || []"
                      :key="subject"
                      outline
                      color="accent"
                      dense
                      size="sm"
                    >
                      {{ subject }}
                    </q-chip>
                    <span
                      v-if="!(assignment.subjects && assignment.subjects.length)"
                      class="text-caption text-grey-6"
                    >
                      No subjects assigned
                    </span>
                  </span>
                  <span v-else class="text-caption text-grey-7 q-ml-sm">
                    All Subjects (Grade Teacher)
                  </span>
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- Master teaching timetable -->
            <div class="row items-center justify-between q-mb-xs">
              <div class="text-subtitle1 text-weight-bold">Master Teaching Schedule</div>
              <q-input
                v-model.number="selectedScheduleYear"
                type="number"
                outlined
                dense
                label="Academic Year"
                style="width: 120px"
                :rules="[(v) => (v >= 2000 && v <= 2100) || 'Enter a year between 2000–2100']"
                hide-bottom-space
              />
            </div>
            <div class="text-caption text-grey-6 q-mb-md">
              Unified schedule aggregating all periods where this teacher is assigned as the subject
              instructor.
            </div>

            <TeacherScheduleGrid
              :teacher-id="selectedTeacher.$id"
              :academic-year="selectedScheduleYear"
            />
          </q-card-section>
        </q-card>

        <!-- Empty state placeholder -->
        <q-card v-else flat bordered class="text-center q-pa-xl text-grey-7">
          <q-icon name="badge" size="48px" />
          <div class="text-subtitle1 q-mt-md">No teacher selected</div>
          <div class="text-caption">
            Select a teacher from the left panel to inspect their teaching schedule and assignments.
          </div>
        </q-card>
      </div>
    </div>

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
            class="row q-col-gutter-sm items-start"
          >
            <div class="col-5">
              <q-select
                v-model="row.grade"
                :options="availableGradesForRow(row)"
                label="Grade *"
                outlined
                dense
                :rules="[(val) => !!val || 'Select a grade']"
              />
            </div>
            <div class="col">
              <q-select
                v-if="isSubjectTeacherGrade(row.grade)"
                v-model="row.subjects"
                :options="SUBJECTS"
                label="Subjects *"
                multiple
                outlined
                dense
                :rules="[(val) => val?.length > 0 || 'Select at least one subject']"
              />
              <div v-else-if="row.grade" class="text-caption text-grey-7 q-pt-sm">
                All Subjects (Grade Teacher)
              </div>
            </div>
            <div class="col-auto q-pt-xs">
              <q-btn
                flat
                round
                dense
                color="negative"
                icon="remove_circle"
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
import { usePermissions } from 'src/composables/usePermissions';
import { useAuthStore } from 'src/stores/auth-store';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';
import TeacherScheduleGrid from '../components/TeacherScheduleGrid.vue';
import { GRADE_LEVELS, SUBJECTS } from '../utils/school-constants';

const $q = useQuasar();
const classStore = useClassStore();
const teacherStore = useTeacherStore();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const authStore = useAuthStore();
const { hasPermission } = usePermissions();
const loading = ref(false);
const teachers = ref([]);
const selectedTeacher = ref(null);
const selectedScheduleYear = ref(new Date().getFullYear());
const showAssignDialog = ref(false);
const canAdmin = computed(() => hasPermission('school:admin'));

const assignForm = reactive({
  residentId: null,
  residentRaw: null,
  rows: [{ grade: '', subjects: [] }],
  notes: '',
  ageError: '',
  submitting: false,
});

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      classStore.fetchClasses(),
      timetableStore.fetchTimetableEntries(),
      periodSlotsStore.fetchPeriodSlots(),
    ]);
    await loadFaculty();

    // If the current user is a teacher, default to their schedule; otherwise select the first teacher.
    const currentTeacher = teachers.value.find((t) => t.$id === authStore.user?.resident_id);
    if (currentTeacher) {
      selectedTeacher.value = currentTeacher;
    } else if (teachers.value.length > 0) {
      selectedTeacher.value = teachers.value[0];
    }
  } finally {
    loading.value = false;
  }
});

// Fetch actual teachers from teacher_assignments (joined with residents)
async function loadFaculty() {
  try {
    await teacherStore.fetchTeacherAssignments();
    const byTeacher = teacherStore.assignmentsByTeacher;
    teachers.value = Object.values(byTeacher).map((t) => ({
      $id: t.teacher_id,
      name: t.teacher_name || 'Unknown Teacher',
      email: '',
      phone: '',
    }));
  } catch (error) {
    console.error('TeachersListPage: failed to load teachers', error);
  }
}

function selectTeacher(teacher) {
  selectedTeacher.value = teacher;
}

function getTeacherAssignments(teacherId) {
  return teacherStore.teacherAssignments
    .filter((a) => a.teacher_id_normalized === teacherId)
    .sort((a, b) => GRADE_LEVELS.indexOf(a.grade_level) - GRADE_LEVELS.indexOf(b.grade_level));
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
  assignForm.submitting = false;
}

function isSubjectTeacherGrade(grade) {
  if (!grade) return false;
  const idx = GRADE_LEVELS.indexOf(grade);
  // Grade 6 is index 6 (0: Early Childhood, 1: Grade 1, ... 6: Grade 6)
  return idx >= 6;
}

function usedGrades() {
  return assignForm.rows.map((r) => r.grade).filter(Boolean);
}

function availableGradesForRow(row) {
  const used = usedGrades();
  return GRADE_LEVELS.filter((g) => g === row.grade || !used.includes(g));
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
    if (selectedTeacher.value) {
      selectTeacher(
        teachers.value.find((t) => t.$id === selectedTeacher.value.$id) || teachers.value[0],
      );
    }
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
    if (selectedTeacher.value?.$id === teacher.$id) {
      selectedTeacher.value = teachers.value.length > 0 ? teachers.value[0] : null;
    }
    $q.notify({ type: 'positive', message: `${teacher.name} removed from all assignments.` });
  });
}

function getPrimaryClassLabel(teacherId) {
  const matchClass = classStore.classes.find(
    (c) => c.class_teacher_id_normalized === teacherId || c.class_teacher_id === teacherId,
  );
  return matchClass ? `Class Teacher: ${matchClass.name}` : 'Subject Instructor';
}

const teachingPeriodsCountByTeacher = computed(() => {
  const map = new Map();
  teachers.value.forEach((teacher) => {
    const count = timetableStore.teacherSchedule(teacher.$id, selectedScheduleYear.value).length;
    map.set(teacher.$id, count);
  });
  return map;
});

function getTeachingPeriodsCount(teacherId) {
  return teachingPeriodsCountByTeacher.value.get(teacherId) || 0;
}
</script>

<style scoped>
.border-left {
  border-left: 1px solid #e0e0e0;
  padding-left: 16px;
}
.teacher-schedule-table {
  border-radius: 8px;
  overflow: hidden;
}
.schedule-cell {
  vertical-align: middle;
  padding: 4px;
}
.cell-block {
  background-color: #f1f8e9;
  border-left: 3px solid #4caf50;
  border-radius: 4px;
  line-height: 1.2;
}
.time-col {
  width: 80px;
}
.day-header {
  width: calc(100% / 5);
}
</style>
