<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        :to="'/school/classes/' + classId"
        class="q-mr-sm"
      />
      <div>
        <h4 class="text-h5 q-my-none">Class Performance Analysis</h4>
        <p class="text-grey-7 q-mb-none">
          Detailed grade-level assessment performance and analysis
        </p>
      </div>
      <q-space />
      <q-btn
        v-if="canWrite && isAuthorized"
        color="secondary"
        icon="edit"
        label="Edit Scores"
        @click="editScores"
      />
    </div>

    <!-- Header Summary Card -->
    <q-card flat bordered class="q-mb-md bg-grey-1">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <div class="text-subtitle1 text-weight-bold text-primary">{{ subject }}</div>
          <div class="text-caption text-grey-8">
            {{ assessmentType }} · {{ term }} ({{ academicYear }})
          </div>
          <div class="text-caption text-grey-6">
            Assessment Date: {{ formatDate(assessmentDate) }}
          </div>
        </div>
        <div class="col-12 col-md-8">
          <div class="row q-col-gutter-sm text-center">
            <div class="col-6 col-sm-3">
              <div class="bg-white q-pa-md rounded-borders border-accent">
                <div class="text-caption text-grey-7">Class Average</div>
                <div class="text-h4 text-weight-bold" :class="getScoreColor(stats.average_percent)">
                  {{ stats.average_percent }}%
                </div>
              </div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="bg-white q-pa-md rounded-borders border-accent">
                <div class="text-caption text-grey-7">Highest Score</div>
                <div class="text-h4 text-weight-bold text-positive">
                  {{ stats.highest_score }}/{{ stats.max_score }}
                </div>
                <div class="text-caption text-grey-6">({{ stats.highest_percent }}%)</div>
              </div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="bg-white q-pa-md rounded-borders border-accent">
                <div class="text-caption text-grey-7">Lowest Score</div>
                <div class="text-h4 text-weight-bold text-negative">
                  {{ stats.lowest_score }}/{{ stats.max_score }}
                </div>
                <div class="text-caption text-grey-6">({{ stats.lowest_percent }}%)</div>
              </div>
            </div>
            <div class="col-6 col-sm-3">
              <div class="bg-white q-pa-md rounded-borders border-accent">
                <div class="text-caption text-grey-7">Total Assessed</div>
                <div class="text-h4 text-weight-bold text-primary">
                  {{ stats.total_assessed }}
                </div>
                <div class="text-caption text-grey-6">Active Learners</div>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md">
      <!-- Left side: Distribution & Metrics -->
      <div class="col-12 col-md-5">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-md">Score Distribution</div>

            <!-- Score distribution bar chart (HTML / CSS styled) -->
            <div class="q-gutter-sm">
              <div
                v-for="(count, index) in distribution"
                :key="index"
                class="row items-center q-col-gutter-sm"
              >
                <div class="col-3 text-right text-caption text-grey-7">
                  {{ index * 10 }}-{{ index === 9 ? '100' : index * 10 + 9 }}%
                </div>
                <div class="col-7">
                  <div
                    class="bg-grey-2 rounded-borders"
                    style="height: 18px; width: 100%; position: relative"
                  >
                    <div
                      class="rounded-borders"
                      :class="getDistributionColor(index * 10)"
                      :style="{
                        height: '100%',
                        width: getDistributionWidth(count),
                        transition: 'width 0.5s ease-out',
                      }"
                    />
                  </div>
                </div>
                <div class="col-2 text-caption text-weight-bold text-grey-9">
                  {{ count }} {{ count === 1 ? 'student' : 'students' }}
                </div>
              </div>
            </div>

            <!-- Risk Summary Alerts (Story 4.4 / 4.2 AC4) -->
            <q-separator class="q-my-lg" />
            <div class="text-subtitle1 text-weight-bold q-mb-md">Performance Distribution</div>
            <div class="row q-col-gutter-sm">
              <div class="col-4 text-center">
                <q-chip color="positive" text-color="white" class="full-width text-center" square>
                  Good (60%+)
                </q-chip>
                <div class="text-h5 q-mt-xs">{{ rangeCounts.good }}</div>
              </div>
              <div class="col-4 text-center">
                <q-chip color="warning" text-color="black" class="full-width text-center" square>
                  Borderline (50-59%)
                </q-chip>
                <div class="text-h5 q-mt-xs">{{ rangeCounts.borderline }}</div>
              </div>
              <div class="col-4 text-center">
                <q-chip color="negative" text-color="white" class="full-width text-center" square>
                  At Risk (&lt;50%)
                </q-chip>
                <div class="text-h5 q-mt-xs">{{ rangeCounts.atRisk }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Right side: Student scores list -->
      <div class="col-12 col-md-7">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold q-mb-sm">Learner Scores</div>
            <q-table
              :rows="matchedScores"
              :columns="studentColumns"
              row-key="learner_id"
              :pagination="{ rowsPerPage: 15 }"
              flat
              dense
            >
              <!-- Name slot linking to profile -->
              <template #body-cell-learner_name="props">
                <q-td :props="props">
                  <router-link
                    :to="`/school/learners/${props.row.learner_id_normalized}`"
                    class="text-primary text-weight-medium text-decoration-none"
                    style="text-decoration: none"
                  >
                    {{ props.value }}
                  </router-link>
                </q-td>
              </template>

              <!-- Percentage Badge Slot -->
              <template #body-cell-percent="props">
                <q-td :props="props">
                  <q-chip
                    :color="getPercentChipColor(props.row.score_value, props.row.max_score)"
                    text-color="white"
                    dense
                    square
                  >
                    {{ getPercent(props.row.score_value, props.row.max_score) }}%
                  </q-chip>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { date } from 'quasar';
import { useSchoolStore } from '../stores/school-store';
import { useClassStore } from '../stores/class-store';
import { normalizeClassId } from '../utils/school-utils';
import { useTeacherStore } from '../stores/teacher-store';
import { usePermissions } from 'src/composables/usePermissions';
import { computeScorePercent } from '../utils/school-utils';

const route = useRoute();
const router = useRouter();
const schoolStore = useSchoolStore();
const classStore = useClassStore();
const teacherStore = useTeacherStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));

const classId = computed(() => route.params.id);
const subject = ref(route.query.subject);
const assessmentType = ref(route.query.assessmentType);
const term = ref(route.query.term);
const academicYear = ref(Number(route.query.year));
const assessmentDate = ref(route.query.date);

const userAssignedGrades = ref([]);

const studentColumns = [
  {
    name: 'learner_name',
    label: 'Learner Name',
    field: 'learner_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'score_value',
    label: 'Score',
    field: 'score_value',
    align: 'left',
    sortable: true,
    format: (val, row) => `${val}/${row.max_score}`,
  },
  {
    name: 'percent',
    label: 'Percentage',
    align: 'center',
    sortable: true,
    field: (row) => getPercent(row.score_value, row.max_score),
  },
  { name: 'notes', label: 'Teacher Notes', field: 'notes', align: 'left', sortable: true },
];

onMounted(async () => {
  await classStore.fetchClasses();
  await schoolStore.fetchTestScores();
  userAssignedGrades.value = await teacherStore.getAssignedGradesForCurrentUser();
});

const isAuthorized = computed(() => {
  if (canAdmin.value) return true;
  const cls = classStore.classes.find((c) => c.$id === classId.value);
  return cls && cls.class_teacher_id_normalized === teacherStore.user?.resident_id;
});

const matchedScores = computed(() => {
  if (!schoolStore.testScoresLoaded) return [];

  const dStr = assessmentDate.value;
  return schoolStore.testScores.filter((score) => {
    return (
      score.subject === subject.value &&
      score.assessment_type === assessmentType.value &&
      score.term === term.value &&
      score.academic_year === academicYear.value &&
      score.assessment_date.slice(0, 10) === dStr &&
      (score.class_id_normalized || normalizeClassId(score.class_id)) === classId.value
    );
  });
});

const stats = computed(() => {
  return classStore.getAssessmentClassStats(matchedScores.value);
});

const distribution = computed(() => {
  return classStore.getAssessmentDistribution(matchedScores.value);
});

const maxInAnyBucket = computed(() => {
  const dist = distribution.value;
  return Math.max(...dist, 1); // Avoid division by zero
});

const rangeCounts = computed(() => {
  const counts = { good: 0, borderline: 0, atRisk: 0 };
  matchedScores.value.forEach((s) => {
    const p = computeScorePercent(s.score_value, s.max_score);
    if (p < 50) counts.atRisk++;
    else if (p < 60) counts.borderline++;
    else counts.good++;
  });
  return counts;
});

function getPercent(val, max) {
  return computeScorePercent(val, max);
}

function getPercentChipColor(val, max) {
  const p = getPercent(val, max);
  if (p < 50) return 'negative';
  if (p < 60) return 'warning';
  return 'positive';
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return date.formatDate(isoString, 'DD MMM YYYY');
}

function getScoreColor(percent) {
  if (percent < 50) return 'text-negative';
  if (percent < 60) return 'text-warning';
  return 'text-positive';
}

function getDistributionColor(percent) {
  if (percent < 50) return 'bg-red-5';
  if (percent < 60) return 'bg-orange-5';
  return 'bg-green-5';
}

function getDistributionWidth(count) {
  return `${(count / maxInAnyBucket.value) * 100}%`;
}

function editScores() {
  router.push(
    `/school/classes/${classId.value}/record?subject=${encodeURIComponent(
      subject.value,
    )}&assessmentType=${encodeURIComponent(
      assessmentType.value,
    )}&term=${encodeURIComponent(term.value)}&year=${academicYear.value}&date=${
      assessmentDate.value
    }&maxScore=${stats.value.max_score}`,
  );
}
</script>
