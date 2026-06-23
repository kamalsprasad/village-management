<!--
  ClassTimetablePanel.vue (Story 4.5)

  Class timetable tab content for ClassDetailPage.vue.
  - Shows the class grid (default) or a vue-cal week view.
  - Falls back to the grade template preview when the class has no entries.
  - Supports admin edit mode, apply/reset template, and save/discard.
-->
<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner color="primary" size="md" />
      <div class="text-caption q-mt-sm">Loading timetable...</div>
    </div>

    <!-- Empty state: no slots configured for this grade -->
    <div
      v-else-if="slotsForGrade.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="schedule" size="48px" color="grey-5" />
      <div class="text-subtitle1 q-mt-sm">
        No bell schedule configured for {{ classData.grade_level }} {{ academicYear }}
      </div>
      <div class="text-caption">
        Set up the bell schedule first.
        <router-link v-if="canAdmin" to="/school/settings/bell-schedules" class="text-primary">
          Configure Bell Schedules
        </router-link>
      </div>
    </div>

    <template v-else>
      <!-- Header / controls -->
      <div class="row items-center q-mb-md">
        <div>
          <div class="text-subtitle1 text-weight-bold">Weekly Timetable</div>
          <div class="text-caption text-grey-6">
            <span v-if="hasClassEntries">Class-specific timetable</span>
            <span v-else>Using the {{ classData.grade_level }} template</span>
          </div>
        </div>
        <q-space />
        <q-btn-toggle
          v-model="viewMode"
          flat
          dense
          color="grey-7"
          toggle-color="primary"
          :options="[
            { label: 'Grid', value: 'grid' },
            { label: 'Calendar', value: 'calendar' },
          ]"
          class="q-mr-sm"
        />
        <template v-if="canAdmin">
          <q-btn
            v-if="!editMode"
            outline
            color="primary"
            icon="edit"
            label="Edit Timetable"
            class="q-mr-sm"
            @click="enterEditMode"
          />
          <q-btn
            v-if="hasClassEntries"
            outline
            color="negative"
            icon="refresh"
            label="Reset to Template"
            class="q-mr-sm"
            @click="confirmReset"
          />
        </template>
      </div>

      <!-- Template preview banner -->
      <q-banner
        v-if="!hasClassEntries && templateEntries.length > 0"
        class="bg-blue-1 text-blue-9 q-mb-md"
        rounded
        dense
      >
        <template #avatar>
          <q-icon name="info" color="blue-9" />
        </template>
        <div>
          This class does not have a customized timetable. It is currently using the
          <strong>{{ classData.grade_level }}</strong> template.
        </div>
        <template v-if="canAdmin" #action>
          <q-btn
            flat
            color="primary"
            label="Apply Template to Class"
            @click="confirmApplyTemplate"
          />
        </template>
      </q-banner>

      <!-- No template banner -->
      <q-banner
        v-else-if="!hasClassEntries && templateEntries.length === 0"
        class="bg-orange-1 text-orange-9 q-mb-md"
        rounded
        dense
      >
        <template #avatar>
          <q-icon name="warning" color="orange-9" />
        </template>
        No timetable template exists for {{ classData.grade_level }} {{ academicYear }}.
        <template v-if="canAdmin" #action>
          <q-btn
            flat
            color="primary"
            label="Create Template"
            to="/school/settings/timetable-templates"
          />
        </template>
      </q-banner>

      <!-- Edit mode actions -->
      <div v-if="editMode" class="row q-mb-md q-gutter-sm">
        <q-btn
          color="primary"
          icon="save"
          label="Save Changes"
          :loading="timetableStore.isLoading"
          :disable="timetableStore.isLoading"
          @click="saveChanges"
        />
        <q-btn
          outline
          color="grey-7"
          icon="cancel"
          label="Discard Changes"
          :disable="timetableStore.isLoading"
          @click="discardChanges"
        />
      </div>

      <!-- Grid view -->
      <TimetableGrid
        v-if="viewMode === 'grid'"
        class="timetable-grid-wrapper"
        :class="{ 'template-preview': isTemplatePreview }"
        :slots="slotsForGrade"
        :entries="editMode ? workingEntries : displayEntries"
        :template-entries="templateEntries"
        :edit-mode="editMode"
        :read-only="!canAdmin"
        :teacher-options="teacherOptions"
        :class-options="classOptions"
        :grade-level="classData.grade_level"
        :academic-year="academicYear"
        @update:cell="onCellUpdate"
        @apply-all-days="onApplyAllDays"
        @clear-cell="onClearCell"
      />

      <!-- Calendar view -->
      <div v-else class="calendar-wrapper">
        <VueCal
          :events="calendarEvents"
          :views="['week']"
          view="week"
          :time-from="calendarTimeRange.start"
          :time-to="calendarTimeRange.end"
          :hide-weekends="true"
          :show-all-day-events="false"
          :disable-views="['years', 'year', 'month', 'day']"
          :events-on-month-view="false"
          :editable-events="false"
          :time-cell-height="40"
          @event-click="onEventClick"
        />
      </div>
    </template>

    <!-- Event detail dialog -->
    <q-dialog v-model="showEventDialog">
      <q-card style="min-width: 300px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ selectedEvent?.title }}</div>
        </q-card-section>
        <q-card-section>
          <div v-if="selectedEvent?.teacherName" class="text-body2 q-mb-sm">
            <strong>Teacher:</strong> {{ selectedEvent.teacherName }}
          </div>
          <div class="text-body2 q-mb-sm">
            <strong>Time:</strong> {{ selectedEvent?.slotLabel }} ({{ selectedEvent?.slotTime }})
          </div>
          <div class="text-body2 q-mb-sm"><strong>Day:</strong> {{ selectedEvent?.dayOfWeek }}</div>
          <div v-if="selectedEvent?.className" class="text-body2">
            <strong>Class:</strong> {{ selectedEvent.className }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="primary" label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { VueCal } from 'vue-cal';
import 'vue-cal/style.css';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore, getSlotTypeColor } from '../stores/period-slots-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useClassStore } from '../stores/class-store';
import { usePermissions } from 'src/composables/usePermissions';
import TimetableGrid from './TimetableGrid.vue';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const props = defineProps({
  classId: { type: String, required: true },
  classData: { type: Object, required: true },
});

const $q = useQuasar();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const teacherStore = useTeacherStore();
const classStore = useClassStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const loading = computed(
  () =>
    timetableStore.isLoading ||
    periodSlotsStore.isLoading ||
    teacherStore.isLoading ||
    classStore.isLoading,
);
const academicYear = computed(() => props.classData.academic_year || new Date().getFullYear());

const SUBJECT_COLOR_CLASSES = {
  Mathematics: 'bg-blue-1 text-blue-10',
  English: 'bg-red-1 text-red-10',
  'Integrated Science': 'bg-green-1 text-green-10',
  Biology: 'bg-green-1 text-green-10',
  Chemistry: 'bg-green-1 text-green-10',
  Physics: 'bg-green-1 text-green-10',
  'Social Studies': 'bg-orange-1 text-orange-10',
  Geography: 'bg-orange-1 text-orange-10',
  'Civic Education': 'bg-orange-1 text-orange-10',
  'Business Studies': 'bg-purple-1 text-purple-10',
  'Agriculture Science': 'bg-green-1 text-green-10',
  'Local Language': 'bg-cyan-1 text-cyan-10',
  'Creative and Technology Studies': 'bg-pink-1 text-pink-10',
  default: 'bg-grey-1 text-grey-10',
};

function subjectColorClass(subject) {
  return SUBJECT_COLOR_CLASSES[subject] || SUBJECT_COLOR_CLASSES.default;
}

const viewMode = ref('grid');
const editMode = ref(false);
const showEventDialog = ref(false);
const selectedEvent = ref(null);

const slotsForGrade = computed(() =>
  periodSlotsStore.slotsByGradeYear(props.classData.grade_level, academicYear.value),
);

const templateEntries = computed(() =>
  timetableStore.templateByGradeYear(props.classData.grade_level, academicYear.value),
);

const classEntries = computed(() =>
  timetableStore.classTimetable(props.classId, academicYear.value),
);

const hasClassEntries = computed(() => classEntries.value.length > 0);
const isTemplatePreview = computed(
  () => !hasClassEntries.value && templateEntries.value.length > 0,
);

/**
 * Entries shown in the grid:
 * - class entries if they exist
 * - otherwise the grade template (preview)
 */
const displayEntries = computed(() => {
  if (hasClassEntries.value) return classEntries.value;
  return templateEntries.value;
});

const teacherOptions = computed(() => {
  return teacherStore.teacherAssignments
    .filter((a) => a.grade_level === props.classData.grade_level)
    .map((a) => ({
      label: a.teacher_name || 'Unknown Teacher',
      value: a.teacher_id_normalized,
    }));
});

const classOptions = computed(() => {
  return classStore.classes.map((c) => ({
    label: c.name,
    value: c.$id,
  }));
});

const workingEntries = ref([]);

function enterEditMode() {
  // Clone current display entries so we can discard changes
  workingEntries.value = displayEntries.value.map((e) => ({ ...e }));
  editMode.value = true;
}

function onCellUpdate({ slotId, day, subject, teacherId, notes }) {
  const index = workingEntries.value.findIndex(
    (e) => e.slot_id === slotId && e.day_of_week === day,
  );
  if (index !== -1) {
    workingEntries.value[index] = {
      ...workingEntries.value[index],
      subject,
      teacher_id: teacherId,
      teacher_id_normalized: teacherId,
      notes: notes ?? workingEntries.value[index].notes,
    };
  } else {
    workingEntries.value.push({
      slot_id: slotId,
      day_of_week: day,
      subject,
      teacher_id: teacherId,
      teacher_id_normalized: teacherId,
      notes: notes || '',
    });
  }
}

function onClearCell({ slotId, day }) {
  const index = workingEntries.value.findIndex(
    (e) => e.slot_id === slotId && e.day_of_week === day,
  );
  if (index !== -1) {
    workingEntries.value[index] = {
      ...workingEntries.value[index],
      subject: null,
      teacher_id: null,
      teacher_id_normalized: null,
    };
  }
}

function onApplyAllDays({ slotId, subject }) {
  if (!subject) return;
  for (const day of DAYS) {
    const index = workingEntries.value.findIndex(
      (e) => e.slot_id === slotId && e.day_of_week === day,
    );
    if (index !== -1) {
      workingEntries.value[index] = { ...workingEntries.value[index], subject };
    } else {
      workingEntries.value.push({
        slot_id: slotId,
        day_of_week: day,
        subject,
        teacher_id: null,
        teacher_id_normalized: null,
        notes: '',
      });
    }
  }
}

async function saveChanges() {
  const payload = workingEntries.value.map((e) => ({
    slot_id: e.slot_id,
    day_of_week: e.day_of_week,
    subject: e.subject,
    teacher_id: e.teacher_id_normalized,
    notes: e.notes || '',
  }));
  const result = await timetableStore.saveclassEntries(
    props.classId,
    academicYear.value,
    payload,
    props.classData.grade_level,
  );
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Timetable saved successfully.' });
    editMode.value = false;
    workingEntries.value = [];
  }
}

function discardChanges() {
  workingEntries.value = [];
  editMode.value = false;
}

function confirmApplyTemplate() {
  $q.dialog({
    title: 'Apply Template',
    message: `Apply the ${props.classData.grade_level} template to ${props.classData.name}? You can customize individual slots afterward.`,
    cancel: true,
  }).onOk(async () => {
    const result = await timetableStore.applyTemplateToClass(
      props.classId,
      props.classData.grade_level,
      academicYear.value,
    );
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Template applied to class.' });
    }
  });
}

function confirmReset() {
  $q.dialog({
    title: 'Reset to Template',
    message: `Remove all customizations for ${props.classData.name} and revert to the ${props.classData.grade_level} template?`,
    cancel: true,
  }).onOk(async () => {
    const result = await timetableStore.resetClassToTemplate(
      props.classId,
      props.classData.grade_level,
      academicYear.value,
    );
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Class timetable reset to template.' });
    }
  });
}

// Calendar events
const calendarEvents = computed(() => {
  const events = [];
  const weekStart = getWeekStart(new Date());
  const className = props.classData.name;

  slotsForGrade.value.forEach((slot) => {
    DAYS.forEach((day, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const entry = displayEntries.value.find(
        (e) => e.slot_id === slot.$id && e.day_of_week === day,
      );
      const isClassSlot = slot.slot_type === 'class';

      if (isClassSlot) {
        const title = entry?.subject || 'No subject assigned';
        const teacherId = entry?.teacher_id_normalized;
        const teacherName = teacherOptions.value.find((t) => t.value === teacherId)?.label || '';

        events.push({
          start: `${date} ${slot.start_time}`,
          end: `${date} ${slot.end_time}`,
          title,
          class: entry?.subject ? `class-event ${subjectColorClass(title)}` : 'empty-event',
          background: false,
          dayOfWeek: day,
          slotLabel: slot.label,
          slotTime: `${slot.start_time} – ${slot.end_time}`,
          teacherName,
          className,
        });
      } else {
        // Non-class slot as background event
        events.push({
          start: `${date} ${slot.start_time}`,
          end: `${date} ${slot.end_time}`,
          title: slot.label,
          class: `bg-${getSlotTypeColor(slot.slot_type)}-1`,
          background: true,
          dayOfWeek: day,
          slotLabel: slot.label,
          slotTime: `${slot.start_time} – ${slot.end_time}`,
        });
      }
    });
  });

  return events;
});

const calendarTimeRange = computed(() => {
  if (slotsForGrade.value.length === 0) {
    return { start: 8 * 60, end: 14 * 60 };
  }
  const minutes = slotsForGrade.value.map((s) => {
    const [h, m] = s.start_time.split(':').map(Number);
    return h * 60 + m;
  });
  const ends = slotsForGrade.value.map((s) => {
    const [h, m] = s.end_time.split(':').map(Number);
    return h * 60 + m;
  });
  const start = Math.min(...minutes);
  const end = Math.min(Math.max(...ends) + 30, 24 * 60);
  return { start, end };
});

function onEventClick(event) {
  selectedEvent.value = event;
  showEventDialog.value = true;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

onMounted(async () => {
  await loadPanelData();
});

watch(
  () => [props.classId, academicYear.value],
  async () => {
    viewMode.value = 'grid';
    editMode.value = false;
    workingEntries.value = [];
    await loadPanelData();
  },
);

async function loadPanelData() {
  await Promise.all([
    timetableStore.fetchTimetableEntries(),
    periodSlotsStore.fetchPeriodSlotsForGradeYear(props.classData.grade_level, academicYear.value),
    teacherStore.fetchTeacherAssignments(),
    classStore.fetchClasses(),
  ]);
}
</script>

<script>
export default {
  name: 'ClassTimetablePanel',
};
</script>

<style scoped>
.calendar-wrapper {
  height: 600px;
}

.timetable-grid-wrapper.template-preview {
  opacity: 0.75;
}

.timetable-grid-wrapper.template-preview :deep(.cell) {
  background-color: #f5f5f5;
}

:deep(.class-event) {
  border-left: 3px solid #1976d2 !important;
}

:deep(.empty-event) {
  opacity: 0.6;
  font-style: italic;
}
</style>
