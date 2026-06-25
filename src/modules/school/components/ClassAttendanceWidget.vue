<!--
  ClassAttendanceWidget.vue (Story 4.7 AC4 — closes 4.6 AC5)
  School dashboard widget: current week's average attendance rate across all
  classes, with a per-class breakdown chip list.
-->
<template>
  <q-card flat bordered>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Class Attendance</div>
      <q-space />
      <q-btn flat dense round icon="refresh" :loading="loading" @click="refresh">
        <q-tooltip>Refresh</q-tooltip>
      </q-btn>
    </q-card-section>

    <q-card-section v-if="loading && classRates.length === 0">
      <q-skeleton type="rect" height="120px" />
    </q-card-section>

    <q-card-section v-else-if="classRates.length === 0">
      <div class="text-grey-7 text-center q-pa-md">No attendance recorded this week.</div>
    </q-card-section>

    <template v-else>
      <q-card-section class="row items-center q-col-gutter-md">
        <div class="col-6 col-sm-4">
          <div class="text-caption text-grey-7">This Week Avg</div>
          <div class="text-h4" :class="overallRateColor">{{ overallRate }}%</div>
        </div>
        <div class="col-6 col-sm-8">
          <div class="text-caption text-grey-7 q-mb-xs">By Class</div>
          <div class="row q-gutter-xs">
            <q-chip
              v-for="c in classRates"
              :key="c.classId"
              dense
              size="sm"
              :color="getRateColor(c.rate)"
              text-color="white"
            >
              {{ c.className }}: {{ c.rate }}%
            </q-chip>
          </div>
        </div>
      </q-card-section>
    </template>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { date } from 'quasar';
import { useClassStore } from '../stores/class-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { toDateStrInTimezone } from 'src/utils/dateUtils';

const classStore = useClassStore();
const settingsStore = useSettingsStore();

const loading = ref(false);
const classRates = ref([]);

const overallRate = computed(() => {
  if (classRates.value.length === 0) return 0;
  const total = classRates.value.reduce((sum, c) => sum + c.rate, 0);
  return Math.round(total / classRates.value.length);
});

const overallRateColor = computed(() => {
  return `text-${getRateColor(overallRate.value)}`;
});

function getRateColor(rate) {
  if (rate >= 90) return 'positive';
  if (rate >= 75) return 'warning';
  return 'negative';
}

async function refresh() {
  loading.value = true;
  try {
    // Compute the current week (Mon–Sun) in the village timezone
    const tz = settingsStore.timezone;
    const today = toDateStrInTimezone(new Date().toISOString(), tz);
    const todayDate = new Date(today + 'T12:00:00Z');
    const dayOfWeek = todayDate.getUTCDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(todayDate);
    monday.setUTCDate(todayDate.getUTCDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const startDate = date.formatDate(monday, 'YYYY-MM-DD');
    const endDate = date.formatDate(sunday, 'YYYY-MM-DD');

    await classStore.fetchClasses();

    // Fetch attendance for each class in parallel
    const results = await Promise.allSettled(
      classStore.classes.map((cls) =>
        classStore
          .fetchAttendanceForClassRange(cls.$id, startDate, endDate)
          .then((res) => ({ cls, records: res.data || [] })),
      ),
    );

    classRates.value = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .map(({ cls, records }) => {
        if (records.length === 0) return null;
        const present = records.filter((r) => r.status === 'Present' || r.status === 'Late').length;
        const rate = Math.round((present / records.length) * 100);
        return { classId: cls.$id, className: cls.name, rate };
      })
      .filter(Boolean)
      .sort((a, b) => a.rate - b.rate);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refresh();
});
</script>
