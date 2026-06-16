<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">School Faculty & Teachers</div>
        <div class="text-caption text-grey-7">
          View teaching profiles, class assignments, and master schedules
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="row q-col-gutter-md">
      <!-- Left: Teachers List Cards -->
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section class="bg-grey-1 row items-center q-py-sm">
            <div class="text-subtitle1 text-weight-bold">Teaching Faculty</div>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="loading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="lg" />
            <div class="text-caption q-mt-sm">Loading faculty records...</div>
          </q-card-section>

          <q-list v-else separator>
            <q-item
              v-for="teacher in teachers"
              :key="teacher.$id"
              clickable
              :active="selectedTeacher && selectedTeacher.$id === teacher.$id"
              active-class="bg-blue-1 text-primary"
              @click="selectTeacher(teacher)"
            >
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" icon="school" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-bold">{{ teacher.name }}</q-item-label>
                <q-item-label caption>
                  <q-icon name="email" class="q-mr-xs" size="xs" />
                  {{ teacher.email || 'No email registered' }}
                </q-item-label>
                <q-item-label caption class="row items-center q-mt-xs">
                  <q-chip outline color="primary" dense square size="10px">
                    {{ getPrimaryClassLabel(teacher.$id) }}
                  </q-chip>
                  <q-chip outline color="secondary" dense square size="10px">
                    {{ getTeachingPeriodsCount(teacher.$id, teacher.name) }} Periods Scheduled
                  </q-chip>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon name="chevron_right" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Right: Selected Teacher Schedule & Assignments -->
      <div class="col-12 col-md-7">
        <q-card v-if="selectedTeacher" flat bordered>
          <q-card-section class="bg-primary text-white row items-center">
            <q-avatar color="white" text-color="primary" icon="person" size="md" class="q-mr-md" />
            <div>
              <div class="text-subtitle1 text-weight-bold">{{ selectedTeacher.name }}</div>
              <div class="text-caption text-white-5">Faculty Profile & Timetable Schedule</div>
            </div>
          </q-card-section>

          <q-card-section class="q-pa-md">
            <!-- Faculty Information -->
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-6">
                <div class="text-caption text-grey-7">Primary Class Assignment</div>
                <div class="text-subtitle2 text-weight-bold text-primary">
                  {{ getPrimaryClassLabel(selectedTeacher.$id) }}
                </div>
              </div>
              <div class="col-6 border-left">
                <div class="text-caption text-grey-7">Total Scheduled Periods</div>
                <div class="text-subtitle2 text-weight-bold text-secondary">
                  {{ getTeachingPeriodsCount(selectedTeacher.$id, selectedTeacher.name) }} periods
                  per week
                </div>
              </div>
            </div>

            <q-separator class="q-my-md" />

            <!-- Master teaching timetable -->
            <div class="text-subtitle1 text-weight-bold q-mb-xs">Master Teaching Schedule</div>
            <div class="text-caption text-grey-6 q-mb-md">
              Unified schedule aggregating all periods where this teacher is assigned as the subject
              instructor.
            </div>

            <q-markup-table flat bordered dense class="teacher-schedule-table">
              <thead>
                <tr>
                  <th class="time-col bg-grey-2">Period & Time</th>
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
                <tr v-for="period in PERIODS" :key="period.num">
                  <td class="period-info text-center bg-grey-1 q-py-xs">
                    <div class="text-weight-bold" style="font-size: 11px">P{{ period.num }}</div>
                    <div class="text-caption text-grey-7" style="font-size: 9px">
                      {{ period.start }} - {{ period.end }}
                    </div>
                  </td>

                  <td v-for="day in DAYS" :key="day" class="schedule-cell">
                    <div
                      v-if="
                        hasTeacherPeriod(selectedTeacher.$id, selectedTeacher.name, day, period.num)
                      "
                      class="cell-block q-pa-xs"
                    >
                      <div class="text-caption text-weight-bold text-primary">
                        {{
                          getTeacherPeriodSubject(
                            selectedTeacher.$id,
                            selectedTeacher.name,
                            day,
                            period.num,
                          )
                        }}
                      </div>
                      <div
                        class="text-caption text-weight-medium text-grey-8"
                        style="font-size: 10px"
                      >
                        Class:
                        {{
                          getTeacherPeriodClass(
                            selectedTeacher.$id,
                            selectedTeacher.name,
                            day,
                            period.num,
                          )
                        }}
                      </div>
                    </div>
                    <div v-else class="text-center text-grey-4 text-caption q-py-sm">—</div>
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>

        <!-- Empty state placeholder -->
        <q-card v-else flat bordered class="text-center q-pa-xl text-grey-7">
          <q-icon name="badge" size="48px" />
          <div class="text-subtitle1 q-mt-md">No teacher selected</div>
          <div class="text-caption">
            Select a teacher from the left panel to inspect their teaching schedule and assignments.
          </div>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useClassStore } from '../stores/class-store';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const classStore = useClassStore();
const loading = ref(false);
const teachers = ref([]);
const selectedTeacher = ref(null);

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [
  { num: 1, start: '08:00', end: '08:45' },
  { num: 2, start: '08:45', end: '09:30' },
  { num: 3, start: '10:00', end: '10:45' },
  { num: 4, start: '10:45', end: '11:30' },
  { num: 5, start: '12:00', end: '12:45' },
  { num: 6, start: '12:45', end: '13:30' },
];

// Map of classId -> timetable array to aggregate master schedule
const masterTimetablesMap = ref({});

onMounted(async () => {
  loading.value = true;
  try {
    await classStore.fetchClasses();
    await loadFaculty();

    // Fetch and aggregate schedules for all active classes to generate master timetable
    const promises = classStore.classes.map(async (cls) => {
      try {
        const res = await classStore.fetchTimetable(cls.$id);
        if (res.success) {
          masterTimetablesMap.value[cls.$id] = res.data;
        }
      } catch (e) {
        console.error('TeachersListPage: failed to load timetable for class', cls.$id, e);
      }
    });
    await Promise.all(promises);

    if (teachers.value.length > 0) {
      selectedTeacher.value = teachers.value[0];
    }
  } finally {
    loading.value = false;
  }
});

// Fetch all users with Teacher or Head Teacher role details from residents
async function loadFaculty() {
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const tableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
    const response = await tables.listRows({
      databaseId: dbId,
      tableId: tableId,
      queries: [Query.limit(500), Query.orderAsc('last_name')],
    });

    teachers.value = response.rows.map((r) => {
      const parts = [r.first_name, r.middle_names, r.last_name].filter(Boolean);
      return {
        $id: r.$id,
        name: parts.join(' '),
        email: r.email,
        phone: r.phone,
      };
    });
  } catch (error) {
    console.error('TeachersListPage: failed to load teachers', error);
  }
}

function selectTeacher(teacher) {
  selectedTeacher.value = teacher;
}

function getPrimaryClassLabel(teacherId) {
  const matchClass = classStore.classes.find(
    (c) => c.class_teacher_id_normalized === teacherId || c.class_teacher_id === teacherId,
  );
  return matchClass ? `Class Teacher: ${matchClass.name}` : 'Subject Instructor';
}

function getTeachingPeriodsCount(teacherId, teacherName) {
  let count = 0;
  Object.values(masterTimetablesMap.value).forEach((classSchedule) => {
    classSchedule.forEach((entry) => {
      const entryId =
        typeof entry.teacher_id === 'object' ? entry.teacher_id?.$id : entry.teacher_id;
      if (entryId === teacherId || entry.teacher_name === teacherName) {
        count++;
      }
    });
  });
  return count;
}

// Master timetable verification cells
function getMatchingPeriod(teacherId, teacherName, day, periodNumber) {
  let matchedEntry = null;
  let matchedClassName = '';

  Object.entries(masterTimetablesMap.value).forEach(([classId, classSchedule]) => {
    classSchedule.forEach((entry) => {
      if (entry.day_of_week === day && entry.period_number === periodNumber) {
        const entryId =
          typeof entry.teacher_id === 'object' ? entry.teacher_id?.$id : entry.teacher_id;
        if (entryId === teacherId || entry.teacher_name === teacherName) {
          matchedEntry = entry;
          const cls = classStore.classes.find((c) => c.$id === classId);
          matchedClassName = cls ? cls.name : 'Unknown Class';
        }
      }
    });
  });

  return matchedEntry ? { entry: matchedEntry, className: matchedClassName } : null;
}

function hasTeacherPeriod(teacherId, teacherName, day, periodNumber) {
  return getMatchingPeriod(teacherId, teacherName, day, periodNumber) !== null;
}

function getTeacherPeriodSubject(teacherId, teacherName, day, periodNumber) {
  const match = getMatchingPeriod(teacherId, teacherName, day, periodNumber);
  return match ? match.entry.subject : '';
}

function getTeacherPeriodClass(teacherId, teacherName, day, periodNumber) {
  const match = getMatchingPeriod(teacherId, teacherName, day, periodNumber);
  return match ? match.className : '';
}
</script>

<style scoped>
.border-left {
  border-left: 1px solid #e0e0e0;
  padding-left: 16px;
}
.teacher-schedule-table {
  border-radius: 8px;
  overflow: hidden;
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
.time-col {
  width: 80px;
}
.day-header {
  width: calc(100% / 5);
}
</style>
