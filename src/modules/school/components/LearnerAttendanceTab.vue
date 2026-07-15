<!--
  LearnerAttendanceTab.vue
  Attendance tab for LearnerDetailPage: daily rolls, attendance rate, at-risk status alert.
-->
<template>
  <div class="row q-col-gutter-md q-mb-md">
    <div class="col-12 col-sm-6">
      <q-card flat bordered class="bg-grey-1">
        <q-card-section class="row items-center">
          <div class="col">
            <div class="text-caption text-grey-7">Attendance Rate</div>
            <div
              v-if="termAttendanceRate !== null"
              class="text-h4 text-weight-bold"
              :class="termAttendanceRate >= 90 ? 'text-positive' : 'text-negative'"
            >
              {{ termAttendanceRate }}%
            </div>
            <div v-else class="text-subtitle1 text-grey-7">No attendance recorded yet</div>
          </div>
          <q-icon name="event_available" size="36px" color="primary" class="opacity-5" />
        </q-card-section>
      </q-card>
    </div>
    <div class="col-12 col-sm-6">
      <q-card flat bordered class="bg-grey-1">
        <q-card-section class="row items-center">
          <div class="col">
            <div class="text-caption text-grey-7">Status Alert</div>
            <div class="text-subtitle1 text-weight-bold" :class="`text-${statusColor}`">
              {{ statusLabel }}
            </div>
          </div>
          <q-icon :name="statusIcon" size="36px" :color="statusColor" class="opacity-5" />
        </q-card-section>
      </q-card>
    </div>
  </div>

  <div
    v-if="learnerAttendance.length === 0"
    class="text-center q-pa-lg text-grey-6 bg-grey-1 rounded-borders border-dashed"
  >
    <q-icon name="fact_check" size="36px" />
    <div class="text-subtitle2 text-weight-bold">
      No active daily rolls logged for this student.
    </div>
    <div class="text-caption">
      Head over to the Class Detail page to record or view daily attendance.
    </div>
  </div>

  <q-table
    v-else
    :rows="learnerAttendance"
    :columns="attendanceColumns"
    row-key="$id"
    flat
    dense
  >
    <!-- Status Badge Column -->
    <template #body-cell-status="props">
      <q-td :props="props">
        <q-chip
          :color="
            props.value === 'Present'
              ? 'positive'
              : props.value === 'Absent'
                ? 'negative'
                : 'warning'
          "
          text-color="white"
          dense
          square
        >
          {{ props.value }}
        </q-chip>
      </q-td>
    </template>
  </q-table>
</template>

<script setup>
import { date } from 'quasar';

defineProps({
  learnerAttendance: { type: Array, default: () => [] },
  termAttendanceRate: { type: Number, default: null },
  statusLabel: { type: String, default: '' },
  statusColor: { type: String, default: '' },
  statusIcon: { type: String, default: '' },
});

function formatDate(isoString) {
  if (!isoString) return '—';
  const [y, m, d] = isoString.slice(0, 10).split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  return date.formatDate(localDate, 'DD MMM YYYY');
}

const attendanceColumns = [
  {
    name: 'date',
    label: 'Date',
    field: 'attendance_date',
    align: 'left',
    sortable: true,
    format: (val) => formatDate(val),
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'absence_reason', label: 'Absence Reason', field: 'absence_reason', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
];
</script>
