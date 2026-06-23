<!--
  TimetableCellEditor.vue (Story 4.5)

  Editable cell for the timetable grid.
  Provides a subject q-select (with free-text input), a teacher q-select, and a notes input.
  Emits updates when values change.
-->
<template>
  <div class="cell-editor q-gutter-xs">
    <q-select
      :model-value="subjectValue"
      :options="subjectOptions"
      label="Subject"
      outlined
      dense
      use-input
      fill-input
      hide-selected
      input-debounce="0"
      @update:model-value="onSubjectChange"
      @input-value="onSubjectInput"
      @blur="emitSubject"
      @keydown.enter="emitSubject"
    >
      <template #no-option>
        <q-item>
          <q-item-section class="text-grey">Type to add a custom subject</q-item-section>
        </q-item>
      </template>
    </q-select>

    <q-select
      :model-value="teacherValue"
      :options="teacherOptions"
      label="Teacher"
      outlined
      dense
      clearable
      emit-value
      map-options
      @update:model-value="onTeacherChange"
    />

    <q-input
      :model-value="notesValue"
      label="Notes"
      outlined
      dense
      autogrow
      input-style="min-height: 0; max-height: 60px"
      @update:model-value="onNotesChange"
    />

    <div v-if="conflict" class="text-caption text-warning row items-center">
      <q-icon name="warning" size="xs" class="q-mr-xs" />
      <span v-if="conflictTeacherName && conflictClassName">
        ⚠ {{ conflictTeacherName }} is already assigned to {{ conflictClassName }} at this time.
      </span>
      <span v-else>Conflict: same teacher assigned elsewhere at this time.</span>
    </div>

    <div class="row justify-end">
      <q-btn flat dense size="xs" color="grey-7" label="Clear" @click="clearCell" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { SUBJECTS } from '../utils/school-constants';

const props = defineProps({
  entry: { type: Object, default: null },
  teacherOptions: { type: Array, default: () => [] },
  classOptions: { type: Array, default: () => [] },
  conflict: { type: Object, default: null },
});

const emit = defineEmits(['update', 'clear']);

const customSubjects = ref([]);
const subjectOptions = computed(() => {
  const extras = new Set(customSubjects.value);
  if (props.entry?.subject && !SUBJECTS.includes(props.entry.subject)) {
    extras.add(props.entry.subject);
  }
  return [...SUBJECTS, ...extras];
});

const subjectValue = computed(() => props.entry?.subject || null);
const teacherValue = computed(() => props.entry?.teacher_id_normalized || null);
const notesValue = computed(() => props.entry?.notes || '');

const pendingSubject = ref(null);

function addCustomSubject(subject) {
  if (!subject) return;
  if (SUBJECTS.includes(subject)) return;
  if (!customSubjects.value.includes(subject)) {
    customSubjects.value.push(subject);
  }
}

const conflictTeacherName = computed(() => {
  if (!props.conflict?.entry?.teacher_id_normalized) return null;
  const match = props.teacherOptions.find(
    (t) => t.value === props.conflict.entry.teacher_id_normalized,
  );
  return match?.label || 'This teacher';
});

const conflictClassName = computed(() => {
  if (!props.conflict?.entry?.class_id_normalized) return null;
  const match = props.classOptions.find(
    (c) => c.value === props.conflict.entry.class_id_normalized,
  );
  return match?.label || props.conflict?.className || 'another class';
});

function onSubjectChange(val) {
  pendingSubject.value = null;
  emitUpdate(val || null, teacherValue.value, notesValue.value);
}

function onSubjectInput(val) {
  pendingSubject.value = val;
}

function emitSubject() {
  if (pendingSubject.value !== null && pendingSubject.value !== subjectValue.value) {
    emitUpdate(pendingSubject.value, teacherValue.value, notesValue.value);
    pendingSubject.value = null;
  }
}

function onTeacherChange(val) {
  emitUpdate(subjectValue.value, val || null, notesValue.value);
}

function onNotesChange(val) {
  emitUpdate(subjectValue.value, teacherValue.value, val || null);
}

function emitUpdate(subject, teacherId, notes) {
  addCustomSubject(subject);
  emit('update', { subject, teacherId, notes });
}

function clearCell() {
  emit('clear');
}
</script>

<style scoped>
.cell-editor {
  padding: 4px;
}
</style>
