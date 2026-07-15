<!--
  TeacherScheduleGrid.vue (Story 4.5)

  Read-only weekly grid showing all class timetable entries assigned to a teacher.
  Rows = unique time slots across all grades; columns = Monday–Friday;
  cells show class name + subject.

  Responsive behaviour:
  - Desktop / week mode: full 5-day table.
  - Mobile / day mode: single-day view with prev/next buttons and swipe gestures.
  - mode='auto' flips between week (≥sm) and day (<sm).
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
      <!-- Week view (desktop or explicit week mode) -->
      <div v-if="!isDayMode" class="week-table-wrapper">
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

      <!-- Day view (mobile or explicit day mode) -->
      <div v-else>
        <div class="row items-center justify-between q-mb-sm">
          <q-btn
            flat
            round
            dense
            icon="chevron_left"
            color="primary"
            aria-label="Previous day"
            @click="prevDay"
          />
          <div class="text-center">
            <div class="text-subtitle2 text-weight-bold">{{ displayDay }}</div>
            <div class="text-caption text-grey-6">{{ displayDayDate }}</div>
          </div>
          <q-btn
            flat
            round
            dense
            icon="chevron_right"
            color="primary"
            aria-label="Next day"
            @click="nextDay"
          />
        </div>

        <div
          class="day-schedule-swipe"
          role="tabpanel"
          :aria-label="`Schedule for ${displayDay}`"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <q-list v-if="dayHasSlots" bordered separator class="rounded-borders">
            <q-item v-for="slot in uniqueSlots" :key="slot.key" class="q-py-sm">
              <q-item-section side style="min-width: 80px">
                <div class="text-weight-bold text-caption">{{ slot.label }}</div>
                <div class="text-caption text-grey-7">
                  {{ slot.start_time }} – {{ slot.end_time }}
                </div>
              </q-item-section>
              <q-item-section>
                <div v-if="getCell(slot.key, displayDay)" class="cell-block q-pa-xs">
                  <div class="text-caption text-weight-bold text-primary">
                    {{ getCell(slot.key, displayDay).subject || 'No subject' }}
                  </div>
                  <div class="text-caption text-weight-medium text-grey-8" style="font-size: 10px">
                    {{ getCell(slot.key, displayDay).className }}
                  </div>
                </div>
                <div v-else class="text-center text-grey-4 text-caption q-py-sm">—</div>
              </q-item-section>
            </q-item>
          </q-list>

          <div v-else class="text-center q-pa-md text-grey-7">
            <q-icon name="event_busy" size="36px" color="grey-5" />
            <div class="text-subtitle2 q-mt-sm">No scheduled periods</div>
            <div class="text-caption">
              {{ displayDay }} has no assigned classes for this teacher.
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
defineOptions({ name: 'TeacherScheduleGrid' });

import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useTimetableStore } from '../stores/timetable-store';
import { usePeriodSlotsStore } from '../stores/period-slots-store';
import { useClassStore } from '../stores/class-store';
import { getCurrentSchoolDayName } from '../utils/schedule-utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const props = defineProps({
  teacherId: { type: String, required: true },
  academicYear: { type: Number, default: () => new Date().getFullYear() },
  mode: {
    type: String,
    default: 'auto',
    validator: (value) => ['auto', 'week', 'day'].includes(value),
  },
  initialDay: { type: String, default: '' },
  timezone: { type: String, default: 'Africa/Lusaka' },
});

const $q = useQuasar();
const timetableStore = useTimetableStore();
const periodSlotsStore = usePeriodSlotsStore();
const classStore = useClassStore();

const displayDay = ref('Monday');
const dayCount = computed(() => DAYS.length);

const isDayMode = computed(() => {
  if (props.mode === 'day') return true;
  if (props.mode === 'week') return false;
  return $q.screen.lt.sm;
});

const displayDayDate = computed(() => {
  const today = new Date();
  // Find the next occurrence of displayDay from today.
  const currentDayIndex = today.getDay();
  const targetDayIndex = DAYS.indexOf(displayDay.value) + 1; // DAYS are Mon-Fri, JS day 1-5
  if (targetDayIndex === -1) return '';
  const diff = (targetDayIndex - currentDayIndex + 7) % 7;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
});

const dayHasSlots = computed(() =>
  uniqueSlots.value.some((slot) => getCell(slot.key, displayDay.value)),
);

const touchStartX = ref(0);
const touchStartY = ref(0);
const SWIPE_THRESHOLD = 50;

function onTouchStart(event) {
  touchStartX.value = event.changedTouches[0].screenX;
  touchStartY.value = event.changedTouches[0].screenY;
}

function onTouchEnd(event) {
  const endX = event.changedTouches[0].screenX;
  const endY = event.changedTouches[0].screenY;
  const diffX = touchStartX.value - endX;
  const diffY = touchStartY.value - endY;

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
    if (diffX > 0) {
      nextDay();
    } else {
      prevDay();
    }
  }
}

function nextDay() {
  const idx = DAYS.indexOf(displayDay.value);
  displayDay.value = DAYS[idx + 1] || DAYS[0];
}

function prevDay() {
  const idx = DAYS.indexOf(displayDay.value);
  displayDay.value = DAYS[idx - 1] || DAYS[DAYS.length - 1];
}

const loading = computed(
  () => timetableStore.isLoading || periodSlotsStore.isLoading || classStore.isLoading,
);

onMounted(async () => {
  displayDay.value = props.initialDay || getCurrentSchoolDayName(props.timezone);
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

watch(
  () => props.initialDay,
  (value) => {
    if (value && DAYS.includes(value)) {
      displayDay.value = value;
    }
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

<style scoped>
.teacher-schedule-table {
  border-radius: 8px;
  overflow: hidden;
}
.time-col {
  width: 80px;
  min-width: 80px;
}
.day-header {
  width: calc((100% - 80px) / v-bind('dayCount'));
  min-width: 140px;
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

.week-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.day-schedule-swipe {
  touch-action: pan-y;
  user-select: none;
}
</style>
