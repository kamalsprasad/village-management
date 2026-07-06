<!--
  TeacherDetailDrawer.vue

  Responsive detail panel for a selected teacher.
  - Desktop: slides in from the right as a fixed-width drawer.
  - Mobile: opens as a full-screen dialog for maximum readability.

  Shows profile summary, grade assignments, and the full master schedule.
-->
<template>
  <q-dialog v-model="showDialog" v-bind="dialogProps">
    <q-card
      v-if="teacher"
      class="teacher-detail-card"
      flat
      square
      style="width: 95vw; max-width: 1200px"
    >
      <!-- Header -->
      <q-card-section class="bg-primary text-white row items-center justify-between">
        <div class="row items-center">
          <q-avatar color="white" text-color="primary" icon="person" size="md" class="q-mr-md" />
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ teacher.name }}</div>
            <div class="text-caption text-white-5">Faculty Profile & Timetable Schedule</div>
          </div>
        </div>
        <div class="row items-center">
          <q-btn v-if="canAdmin" flat round dense color="white" icon="delete" @click="onRemove">
            <q-tooltip>Remove all assignments</q-tooltip>
          </q-btn>
          <q-btn v-close-popup flat round dense color="white" icon="close" class="q-ml-sm" />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-md scroll" style="max-height: calc(100vh - 72px)">
        <!-- Faculty information -->
        <div class="row q-col-gutter-sm q-mb-md">
          <div class="col-12 col-sm-6">
            <div class="text-caption text-grey-7">Primary Class Assignment</div>
            <div class="text-subtitle2 text-weight-bold text-primary">
              {{ getPrimaryClassLabel(teacher.$id) }}
            </div>
          </div>
          <div class="col-12 col-sm-6" :class="{ 'border-left': $q.screen.gt.xs }">
            <div class="text-caption text-grey-7">Total Scheduled Periods</div>
            <div class="text-subtitle2 text-weight-bold text-secondary">
              {{ getTeachingPeriodsCount(teacher.$id) }} periods per week
            </div>
          </div>
          <div v-if="teacher.email" class="col-12 col-sm-6">
            <div class="text-caption text-grey-7">Email</div>
            <div class="text-subtitle2 text-weight-bold">{{ teacher.email }}</div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Grade assignments -->
        <div class="text-subtitle1 text-weight-bold q-mb-xs">Grade Assignments</div>
        <div class="q-mb-md">
          <div
            v-for="assignment in getTeacherAssignments(teacher.$id)"
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
              <span v-else class="text-caption text-grey-7 q-ml-sm"
                >All Subjects (Grade Teacher)</span
              >
            </div>
          </div>
          <div v-if="!getTeacherAssignments(teacher.$id).length" class="text-caption text-grey-6">
            No grade assignments on record.
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Master teaching timetable -->
        <div class="row items-center justify-between q-mb-xs">
          <div class="text-subtitle1 text-weight-bold">Master Teaching Schedule</div>
          <q-input
            v-model.number="selectedYear"
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
          :teacher-id="teacher.$id"
          :academic-year="selectedYear"
          :mode="scheduleMode"
          :initial-day="initialScheduleDay"
          :timezone="timezone"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useClassStore } from '../stores/class-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore } from '../stores/period-slots-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { GRADE_LEVELS } from '../utils/school-constants';
import { getCurrentSchoolDayName } from '../utils/schedule-utils';
import TeacherScheduleGrid from './TeacherScheduleGrid.vue';

defineOptions({ name: 'TeacherDetailDrawer' });

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  teacher: { type: Object, default: null },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
  canAdmin: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'remove']);

const $q = useQuasar();
const classStore = useClassStore();
const teacherStore = useTeacherStore();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const settingsStore = useSettingsStore();

const selectedYear = ref(props.academicYear);
const timezone = computed(() => settingsStore.timezone);

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const isMobile = computed(() => $q.screen.lt.md);

const dialogProps = computed(() => {
  if (isMobile.value) {
    return {
      maximized: true,
      transitionShow: 'slide-up',
      transitionHide: 'slide-down',
    };
  }
  return {
    position: 'right',
    'full-height': true,
    transitionShow: 'fade',
    transitionHide: 'fade',
  };
});

const scheduleMode = computed(() => (isMobile.value ? 'day' : 'week'));

const initialScheduleDay = computed(() => getCurrentSchoolDayName(timezone.value));

onMounted(async () => {
  selectedYear.value = props.academicYear;
  await Promise.all([
    classStore.fetchClasses(),
    timetableStore.fetchTimetableEntries(),
    periodSlotsStore.fetchPeriodSlots(),
  ]);
});

watch(
  () => props.academicYear,
  (value) => {
    selectedYear.value = value;
  },
);

function getPrimaryClassLabel(teacherId) {
  const matchClass = classStore.classes.find(
    (c) => c.class_teacher_id_normalized === teacherId || c.class_teacher_id === teacherId,
  );
  return matchClass ? `Class Teacher: ${matchClass.name}` : 'Subject Instructor';
}

function getTeachingPeriodsCount(teacherId) {
  return timetableStore.teacherSchedule(teacherId, selectedYear.value).length;
}

function getTeacherAssignments(teacherId) {
  return teacherStore.teacherAssignments
    .filter((a) => a.teacher_id_normalized === teacherId)
    .sort((a, b) => GRADE_LEVELS.indexOf(a.grade_level) - GRADE_LEVELS.indexOf(b.grade_level));
}

function isSubjectTeacherGrade(grade) {
  if (!grade) return false;
  const idx = GRADE_LEVELS.indexOf(grade);
  return idx >= 6;
}

function onRemove() {
  if (!props.teacher) return;
  emit('remove', props.teacher);
}
</script>

<style scoped>
.teacher-detail-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.border-left {
  border-left: 1px solid #e0e0e0;
  padding-left: 16px;
}
</style>
