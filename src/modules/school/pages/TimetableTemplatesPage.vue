<!--
  TimetableTemplatesPage.vue (Story 4.5)

  Grade-level timetable template builder.
  - Select grade level and academic year.
  - Edit a weekly grid of subjects + teachers per slot/day.
  - Save or clear the template in bulk.
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/settings" class="q-mr-sm" />
      <div>
        <div class="text-h5">Timetable Templates</div>
        <div class="text-caption text-grey-7">Build grade-level weekly subject templates</div>
      </div>
    </div>

    <!-- Grade / Year selectors -->
    <div class="row items-center q-mb-md q-gutter-sm flex-wrap">
      <q-select
        v-model="selectedGrade"
        :options="GRADE_LEVELS"
        outlined
        dense
        label="Grade Level"
        style="min-width: 200px"
      />
      <div class="row items-center q-gutter-xs">
        <q-btn flat dense round icon="chevron_left" @click="changeYear(-1)" />
        <q-input
          v-model.number="selectedYear"
          type="number"
          outlined
          dense
          label="Year"
          style="width: 90px"
          :rules="[(v) => (v >= 2000 && v <= 2100) || 'Enter a year between 2000–2100']"
          hide-bottom-space
        />
        <q-btn flat dense round icon="chevron_right" @click="changeYear(1)" />
      </div>
      <q-space />
      <q-btn
        v-if="slotsForGrade.length > 0"
        outline
        :color="isEditing ? 'grey-7' : 'primary'"
        :icon="isEditing ? 'visibility' : 'edit'"
        :label="isEditing ? 'View Mode' : 'Edit Template'"
        class="q-mr-sm"
        @click="isEditing = !isEditing"
      />
      <q-btn
        v-if="slotsForGrade.length > 0 && isEditing"
        outline
        color="negative"
        icon="delete_outline"
        label="Clear Template"
        class="q-mr-sm"
        :disable="timetableStore.isLoading"
        @click="confirmClearTemplate"
      />
      <q-btn
        v-if="slotsForGrade.length > 0 && isEditing"
        color="primary"
        icon="save"
        label="Save Template"
        :loading="timetableStore.isLoading"
        :disable="timetableStore.isLoading"
        @click="saveTemplate"
      />
    </div>

    <!-- Empty state: no slots configured -->
    <div
      v-if="slotsForGrade.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="schedule" size="48px" color="grey-5" />
      <div class="text-subtitle1 q-mt-sm">
        No bell schedule configured for {{ selectedGrade }} {{ selectedYear }}
      </div>
      <div class="text-caption">
        Set up the bell schedule first.
        <router-link to="/school/settings/bell-schedules" class="text-primary">
          Configure Bell Schedules
        </router-link>
      </div>
    </div>

    <!-- Grid -->
    <TimetableGrid
      v-else
      :slots="slotsForGrade"
      :entries="workingEntries"
      :edit-mode="isEditing"
      :teacher-options="teacherOptions"
      :grade-level="selectedGrade"
      :academic-year="selectedYear"
      @update:cell="onCellUpdate"
      @apply-all-days="onApplyAllDays"
      @clear-cell="onClearCell"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore } from '../stores/period-slots-store';
import { useTeacherStore } from '../stores/teacher-store';
import { usePermissions } from 'src/composables/usePermissions';
import TimetableGrid from '../components/TimetableGrid.vue';
import { GRADE_LEVELS } from '../utils/school-constants';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const $q = useQuasar();
const router = useRouter();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const teacherStore = useTeacherStore();
const { hasPermission } = usePermissions();

// Redirect if not admin
if (!hasPermission('school:admin')) {
  router.push('/school/settings');
}

const selectedGrade = ref(GRADE_LEVELS[3]); // Default to Grade 3
const selectedYear = ref(new Date().getFullYear());
const workingEntries = ref([]);
const isEditing = ref(false);
const teacherAssignmentsLoaded = ref(false);

const slotsForGrade = computed(() =>
  periodSlotsStore.slotsByGradeYear(selectedGrade.value, selectedYear.value),
);

const templateEntries = computed(() =>
  timetableStore.templateByGradeYear(selectedGrade.value, selectedYear.value),
);

const teacherOptions = computed(() => {
  return teacherStore.teacherAssignments
    .filter((a) => a.grade_level === selectedGrade.value)
    .map((a) => ({
      label: a.teacher_name || 'Unknown Teacher',
      value: a.teacher_id_normalized,
    }));
});

function changeYear(delta) {
  selectedYear.value += delta;
}

async function loadData() {
  const requests = [
    timetableStore.fetchTimetableEntries(),
    periodSlotsStore.fetchPeriodSlotsForGradeYear(selectedGrade.value, selectedYear.value),
  ];
  if (!teacherAssignmentsLoaded.value) {
    requests.push(
      teacherStore.fetchTeacherAssignments().then(() => {
        teacherAssignmentsLoaded.value = true;
      }),
    );
  }
  await Promise.all(requests);
  syncWorkingEntries();
}

function syncWorkingEntries() {
  // Build a full grid from slots, seeded with existing template entries
  const entries = [];
  slotsForGrade.value.forEach((slot) => {
    if (slot.slot_type !== 'class') return;
    DAYS.forEach((day) => {
      const existing = templateEntries.value.find(
        (e) => e.slot_id === slot.$id && e.day_of_week === day,
      );
      entries.push({
        slot_id: slot.$id,
        day_of_week: day,
        subject: existing?.subject || null,
        teacher_id: existing?.teacher_id_normalized || null,
        teacher_id_normalized: existing?.teacher_id_normalized || null,
        notes: existing?.notes || '',
      });
    });
  });
  workingEntries.value = entries;
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
    }
  }
}

async function saveTemplate() {
  const payload = workingEntries.value.map((e) => ({
    slot_id: e.slot_id,
    day_of_week: e.day_of_week,
    subject: e.subject,
    teacher_id: e.teacher_id_normalized,
    notes: e.notes || '',
  }));
  const result = await timetableStore.saveTemplateEntries(
    selectedGrade.value,
    selectedYear.value,
    payload,
  );
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Template saved successfully.' });
  }
}

function confirmClearTemplate() {
  $q.dialog({
    title: 'Clear Template',
    message: `Remove all template entries for ${selectedGrade.value} ${selectedYear.value}? This will not affect class-specific timetables.`,
    cancel: true,
    ok: { label: 'Clear', color: 'negative' },
  }).onOk(async () => {
    const existing = timetableStore.templateByGradeYear(selectedGrade.value, selectedYear.value);
    const results = await Promise.allSettled(
      existing.map((e) => timetableStore.deleteEntry(e.$id)),
    );
    const allSucceeded = results.every((r) => r.status === 'fulfilled' && r.value?.success);
    if (allSucceeded) {
      syncWorkingEntries();
      $q.notify({ type: 'positive', message: 'Template cleared.' });
    } else {
      await timetableStore.fetchTimetableEntries(true);
      syncWorkingEntries();
      $q.notify({
        type: 'negative',
        message: 'Failed to clear some template entries. Please try again.',
      });
    }
  });
}

watch([selectedGrade, selectedYear], async () => {
  await loadData();
});

onMounted(() => {
  loadData();
});
</script>

<script>
export default {
  name: 'TimetableTemplatesPage',
};
</script>

<style scoped>
.timetable-table {
  table-layout: fixed;
  width: 100%;
}
</style>
