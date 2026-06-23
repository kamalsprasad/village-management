<!--
  TeacherScheduleGrid.vue (Story 4.5)

  Read-only weekly grid showing all class timetable entries assigned to a teacher.
  Rows = unique time slots across all grades; columns = Monday–Friday;
  cells show class name + subject.
-->
<template>
  <div>
    <div v-if="loading" class="text-center q-pa-lg">
      <q-spinner color="primary" size="md" />
      <div class="text-caption q-mt-sm">Loading schedule...</div>
    </div>

    <div v-else-if="uniqueSlots.length === 0" class="text-center q-pa-md text-grey-7">
      <q-icon name="event_busy" size="36px" color="grey-5" />
      <div class="text-subtitle2 q-mt-sm">No scheduled periods found</div>
      <div class="text-caption">
        This teacher has no assigned timetable slots for {{ academicYear }}.
      </div>
    </div>

    <template v-else>
      <!-- Desktop grid -->
      <div class="gt-xs">
        <q-markup-table flat bordered dense class="teacher-schedule-table">
          <thead>
            <tr>
              <th class="time-col bg-grey-2">Time</th>
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
            <tr v-for="slot in uniqueSlots" :key="slot.key">
              <td class="period-info text-center bg-grey-1 q-py-xs">
                <div class="text-weight-bold text-caption">{{ slot.label }}</div>
                <div class="text-caption text-grey-7">
                  {{ slot.start_time }} – {{ slot.end_time }}
                </div>
              </td>
              <td v-for="day in DAYS" :key="day" class="schedule-cell">
                <div v-if="getCell(slot.key, day)" class="cell-block q-pa-xs">
                  <div class="text-caption text-weight-bold text-primary">
                    {{ getCell(slot.key, day).subject || 'No subject' }}
                  </div>
                  <div class="text-caption text-weight-medium text-grey-8" style="font-size: 10px">
                    {{ getCell(slot.key, day).className }}
                  </div>
                </div>
                <div v-else class="text-center text-grey-4 text-caption q-py-sm">—</div>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </div>

      <!-- Mobile day tabs -->
      <div class="lt-sm">
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
          <q-item v-for="slot in uniqueSlots" :key="slot.key" class="q-py-sm">
            <q-item-section side style="min-width: 80px">
              <div class="text-weight-bold text-caption">{{ slot.label }}</div>
              <div class="text-caption text-grey-7">
                {{ slot.start_time }} – {{ slot.end_time }}
              </div>
            </q-item-section>
            <q-item-section>
              <div v-if="getCell(slot.key, mobileDay)" class="cell-block q-pa-xs">
                <div class="text-caption text-weight-bold text-primary">
                  {{ getCell(slot.key, mobileDay).subject || 'No subject' }}
                </div>
                <div class="text-caption text-weight-medium text-grey-8" style="font-size: 10px">
                  {{ getCell(slot.key, mobileDay).className }}
                </div>
              </div>
              <div v-else class="text-center text-grey-4 text-caption q-py-sm">—</div>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore } from '../stores/period-slots-store';
import { useClassStore } from '../stores/class-store';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const props = defineProps({
  teacherId: { type: String, required: true },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
});

const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const classStore = useClassStore();

const mobileDay = ref('Monday');
const dayCount = computed(() => DAYS.length);

const loading = computed(
  () => timetableStore.isLoading || periodSlotsStore.isLoading || classStore.isLoading,
);

onMounted(async () => {
  await loadScheduleData();
});

watch(
  () => props.teacherId,
  async () => {
    await timetableStore.fetchTimetableEntries();
  },
);

watch(
  () => props.academicYear,
  async () => {
    await timetableStore.fetchTimetableEntries();
  },
);

async function loadScheduleData() {
  await Promise.all([
    timetableStore.fetchTimetableEntries(),
    periodSlotsStore.fetchPeriodSlots(),
    classStore.fetchClasses(),
  ]);
}

const teacherEntries = computed(() =>
  timetableStore.teacherSchedule(props.teacherId, props.academicYear),
);

/**
 * Build unique slot rows from the teacher's entries.
 * Unique key = `${start_time}:${end_time}`.
 */
const uniqueSlots = computed(() => {
  const map = new Map();
  teacherEntries.value.forEach((entry) => {
    const slot = periodSlotsStore.periodSlots.find((s) => s.$id === entry.slot_id);
    if (!slot) return;
    const key = `${slot.start_time}-${slot.end_time}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        start_time: slot.start_time,
        end_time: slot.end_time,
        label: slot.label,
        slotIds: new Set(),
      });
    }
    map.get(key).slotIds.add(slot.$id);
  });
  return Array.from(map.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
});

const cellMap = computed(() => {
  const map = new Map();
  teacherEntries.value.forEach((entry) => {
    const slot = periodSlotsStore.periodSlots.find((s) => s.$id === entry.slot_id);
    if (!slot) return;
    const key = `${slot.start_time}-${slot.end_time}`;
    const cls = classStore.classes.find((c) => c.$id === entry.class_id_normalized);
    const cellKey = `${key}:${entry.day_of_week}`;
    map.set(cellKey, {
      subject: entry.subject,
      className: cls?.name || 'Unknown Class',
    });
  });
  return map;
});

function getCell(slotKey, day) {
  return cellMap.value.get(`${slotKey}:${day}`) || null;
}
</script>

<script>
export default {
  name: 'TeacherScheduleGrid',
};
</script>

<style scoped>
.teacher-schedule-table {
  border-radius: 8px;
  overflow: hidden;
}
.time-col {
  width: 100px;
}
.day-header {
  width: calc((100% - 100px) / v-bind('dayCount'));
}
.period-info {
  vertical-align: middle;
  padding: 4px;
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
</style>
