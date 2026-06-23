<!--
  TimetableGrid.vue (Story 4.5)

  Reusable weekly timetable grid used by:
  - TimetableTemplatesPage.vue (grade-level template builder)
  - ClassTimetablePanel.vue (class-specific timetable editor)

  Props:
    - slots: all period slots for the grade (class + non-class)
    - entries: timetable entries for this scope
    - editMode: true = editable cells
    - readOnly: true = no edit controls at all
    - teacherOptions: [{ label, value }] for teacher dropdown
    - gradeLevel: grade label for display/empty states
    - academicYear: year for conflict detection
    - templateEntries: optional grade template entries for override comparison
    - showConflicts: enable inline conflict warnings (default true)

  Emits:
    - update:cell({ slotId, day, subject, teacherId, notes })
    - apply-all-days({ slotId, subject })
    - clear-cell({ slotId, day })
-->
<template>
  <div>
    <!-- Desktop: full 5-day grid -->
    <div class="gt-xs">
      <div
        v-if="slots.length === 0"
        class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
      >
        <q-icon name="schedule" size="48px" color="grey-5" />
        <div class="text-subtitle1 q-mt-sm">
          No bell schedule configured for {{ gradeLevel }} {{ academicYear }}
        </div>
        <div class="text-caption">Set up the bell schedule before building the timetable.</div>
      </div>

      <q-markup-table v-else flat bordered class="timetable-table">
        <thead>
          <tr>
            <th class="time-col bg-grey-2 text-grey-8">Period & Time</th>
            <th
              v-for="day in DAYS"
              :key="day"
              class="day-header bg-grey-2 text-primary text-weight-bold"
            >
              {{ day }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in sortedSlots" :key="slot.$id">
            <!-- Period info column -->
            <td class="period-info text-center bg-grey-1">
              <div class="text-weight-bold">{{ slot.label }}</div>
              <div class="text-caption text-grey-7">
                {{ slot.start_time }} – {{ slot.end_time }}
              </div>
              <q-btn
                v-if="canEdit && slot.slot_type === 'class'"
                flat
                dense
                size="xs"
                color="primary"
                label="Apply to All Days"
                class="q-mt-xs"
                @click="onApplyAllDays(slot)"
              />
            </td>

            <!-- Non-class slot: shaded row spanning all days -->
            <td
              v-if="slot.slot_type !== 'class'"
              :colspan="DAYS.length"
              class="non-class-row text-center"
              :class="`bg-${getSlotTypeColor(slot.slot_type)}-1 text-${getSlotTypeColor(slot.slot_type)}-9`"
            >
              <q-icon :name="getSlotTypeIcon(slot.slot_type)" size="sm" class="q-mr-xs" />
              {{ slot.label }}
            </td>

            <!-- Class slot: one cell per day -->
            <template v-else>
              <td v-for="day in DAYS" :key="day" class="cell" :class="cellClasses(slot, day)">
                <CellDisplay
                  v-if="!editMode"
                  :entry="getCellEntry(slot.$id, day)"
                  :teacher-options="teacherOptions"
                />
                <CellEditor
                  v-else
                  :entry="getCellEntry(slot.$id, day)"
                  :teacher-options="teacherOptions"
                  :class-options="classOptions"
                  :conflict="showConflicts ? getConflict(slot, day) : null"
                  @update="onCellUpdate(slot.$id, day, $event)"
                  @clear="onClearCell(slot.$id, day)"
                />
              </td>
            </template>
          </tr>
        </tbody>
      </q-markup-table>

      <!-- Edit-mode row actions (desktop) -->
      <div v-if="canEdit" class="row q-mt-sm q-gutter-sm">
        <div class="text-caption text-grey-7">
          Click "Apply to All Days" on a row to fill the same subject across Monday–Friday.
        </div>
      </div>
    </div>

    <!-- Mobile: day tabs -->
    <div class="lt-sm">
      <div
        v-if="slots.length === 0"
        class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
      >
        <q-icon name="schedule" size="48px" color="grey-5" />
        <div class="text-subtitle1 q-mt-sm">
          No bell schedule configured for {{ gradeLevel }} {{ academicYear }}
        </div>
      </div>

      <template v-else>
        <q-tabs
          v-model="mobileDay"
          dense
          class="bg-grey-1 text-grey-7"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab v-for="day in DAYS" :key="day" :name="day" :label="day" />
        </q-tabs>

        <q-list bordered separator class="rounded-borders">
          <q-item v-for="slot in sortedSlots" :key="slot.$id" class="q-py-sm">
            <q-item-section side style="min-width: 80px">
              <div class="text-weight-bold text-caption">{{ slot.label }}</div>
              <div class="text-caption text-grey-7">
                {{ slot.start_time }} – {{ slot.end_time }}
              </div>
            </q-item-section>

            <q-item-section>
              <div v-if="slot.slot_type !== 'class'" class="text-center text-caption text-grey-7">
                <q-icon :name="getSlotTypeIcon(slot.slot_type)" size="sm" class="q-mr-xs" />
                {{ slot.label }}
              </div>
              <div v-else>
                <CellDisplay
                  v-if="!editMode"
                  :entry="getCellEntry(slot.$id, mobileDay)"
                  :teacher-options="teacherOptions"
                />
                <CellEditor
                  v-else
                  :entry="getCellEntry(slot.$id, mobileDay)"
                  :teacher-options="teacherOptions"
                  :class-options="classOptions"
                  :conflict="showConflicts ? getConflict(slot, mobileDay) : null"
                  @update="onCellUpdate(slot.$id, mobileDay, $event)"
                  @clear="onClearCell(slot.$id, mobileDay)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useTimetableStore } from '../stores/timetable-store';
import { getSlotTypeColor, getSlotTypeIcon } from '../stores/period-slots-store';
import CellDisplay from './TimetableCellDisplay.vue';
import CellEditor from './TimetableCellEditor.vue';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const props = defineProps({
  slots: { type: Array, required: true },
  entries: { type: Array, required: true },
  editMode: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  teacherOptions: { type: Array, default: () => [] },
  classOptions: { type: Array, default: () => [] },
  gradeLevel: { type: String, default: '' },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
  templateEntries: { type: Array, default: () => null },
  showConflicts: { type: Boolean, default: true },
});

const emit = defineEmits(['update:cell', 'apply-all-days', 'clear-cell']);

const canEdit = computed(() => props.editMode && !props.readOnly);

const timetableStore = useTimetableStore();
const mobileDay = ref('Monday');
const dayCount = computed(() => DAYS.length);

const sortedSlots = computed(() => {
  return [...props.slots].sort((a, b) => a.slot_number - b.slot_number);
});

/**
 * Build a lookup map keyed by `${slotId}:${day}`.
 */
const entryMap = computed(() => {
  const map = new Map();
  props.entries.forEach((entry) => {
    const key = `${entry.slot_id}:${entry.day_of_week}`;
    map.set(key, entry);
  });
  return map;
});

const templateEntryMap = computed(() => {
  if (!props.templateEntries) return new Map();
  const map = new Map();
  props.templateEntries.forEach((entry) => {
    const key = `${entry.slot_id}:${entry.day_of_week}`;
    map.set(key, entry);
  });
  return map;
});

function getCellEntry(slotId, day) {
  return entryMap.value.get(`${slotId}:${day}`) || null;
}

function getTemplateEntry(slotId, day) {
  return templateEntryMap.value.get(`${slotId}:${day}`) || null;
}

function onCellUpdate(slotId, day, { subject, teacherId, notes }) {
  emit('update:cell', { slotId, day, subject, teacherId, notes });
}

function onClearCell(slotId, day) {
  emit('clear-cell', { slotId, day });
}

function onApplyAllDays(slot) {
  let subject = null;
  for (const day of DAYS) {
    const entry = getCellEntry(slot.$id, day);
    if (entry?.subject) {
      subject = entry.subject;
      break;
    }
  }
  if (subject) {
    emit('apply-all-days', { slotId: slot.$id, subject });
  }
}

function classNameForEntry(entry) {
  if (!entry?.class_id_normalized) return null;
  const match = props.classOptions.find((c) => c.value === entry.class_id_normalized);
  return match?.label || 'Another Class';
}

function getConflict(slot, day) {
  const entry = getCellEntry(slot.$id, day);
  if (!entry || !entry.teacher_id_normalized) return null;
  const conflictEntry = timetableStore.hasConflict(
    entry.teacher_id_normalized,
    day,
    slot.$id,
    props.academicYear,
    entry.$id,
  );
  if (!conflictEntry) return null;
  return {
    entry: conflictEntry,
    className: classNameForEntry(conflictEntry),
  };
}

function cellClasses(slot, day) {
  const entry = getCellEntry(slot.$id, day);
  const templateEntry = getTemplateEntry(slot.$id, day);
  const classes = ['cell'];
  if (!entry?.subject) classes.push('cell-empty');
  if (templateEntry && entry) {
    const subjectChanged = entry.subject !== templateEntry.subject;
    const teacherChanged = entry.teacher_id_normalized !== templateEntry.teacher_id_normalized;
    if (subjectChanged || teacherChanged) classes.push('cell-custom');
  }
  return classes;
}
</script>

<script>
export default {
  name: 'TimetableGrid',
};
</script>

<style scoped>
.timetable-table {
  table-layout: fixed;
  width: 100%;
}
.time-col {
  width: 130px;
}
.day-header {
  width: calc((100% - 130px) / v-bind('dayCount'));
}
.period-info {
  width: 130px;
  vertical-align: middle;
  padding: 8px;
}
.cell {
  vertical-align: top;
  height: 90px;
  padding: 4px;
  transition: background-color 0.15s;
}
.cell-empty {
  background-color: #fafafa;
}
.cell-custom {
  border-left: 3px solid #ff9800;
  background-color: #fff8e1;
}
.non-class-row {
  vertical-align: middle;
  font-weight: 500;
  padding: 12px;
}
</style>
