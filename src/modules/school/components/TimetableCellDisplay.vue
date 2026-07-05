<!--
  TimetableCellDisplay.vue (Story 4.5)

  Read-only display of a single timetable cell:
  subject name + teacher name (if assigned).
-->
<template>
  <div class="cell-display">
    <div v-if="entry?.subject" class="text-subtitle2 text-weight-bold text-primary">
      {{ entry.subject }}
    </div>
    <div v-else class="text-grey-5 text-italic">—</div>

    <div v-if="teacherName" class="text-caption text-grey-8 text-weight-medium row items-center">
      <q-icon name="person" size="xs" class="q-mr-xs" />
      {{ teacherName }}
    </div>
    <div
      v-if="entry?.notes"
      class="text-caption text-grey-6 row items-center"
      style="margin-top: 2px"
    >
      <q-icon name="notes" size="xs" class="q-mr-xs" />
      {{ entry.notes }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  entry: { type: Object, default: null },
  teacherOptions: { type: Array, default: () => [] },
});

const teacherName = computed(() => {
  if (!props.entry?.teacher_id_normalized) return null;
  const match = props.teacherOptions.find((t) => t.value === props.entry.teacher_id_normalized);
  return match?.label || 'Unknown Teacher';
});
</script>

<style scoped>
.cell-display {
  line-height: 1.3;
  padding: 4px;
}
</style>
