<!--
  LearnerAcademicsTab.vue
  Academics tab for LearnerDetailPage: test scores, performance trends, subject averages.
-->
<template>
  <div v-if="learnerScores.length === 0" class="text-center q-pa-xl text-grey-7">
    <q-icon name="quiz" size="48px" class="q-mb-sm" />
    <div>No test scores recorded for {{ learnerName }}.</div>
    <div class="text-caption">Once teacher records test scores, they will appear here.</div>
  </div>

  <div v-else>
    <!-- Academics Header Metrics -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6">
        <q-card flat bordered class="bg-grey-1">
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-caption text-grey-7">Overall Academic Average</div>
              <div
                class="text-h4 text-weight-bold"
                :class="getScoreColorClass(overallAverage)"
              >
                {{ overallAverage }}%
              </div>
            </div>
            <q-icon name="trending_up" size="36px" color="primary" class="opacity-5" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6">
        <q-card flat bordered class="bg-grey-1">
          <q-card-section class="row items-center">
            <div class="col">
              <div class="text-caption text-grey-7">Total Assessments</div>
              <div class="text-h4 text-weight-bold text-primary">
                {{ learnerScores.length }}
              </div>
            </div>
            <q-icon name="assignment" size="36px" color="primary" class="opacity-5" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <!-- SVG Trend Line Chart -->
      <div class="col-12 col-md-6" v-if="chronologicalScores.length >= 2">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-sm">
              Performance Trend Over Time
            </div>
            <div style="width: 100%; overflow-x: auto">
              <svg
                viewBox="0 0 500 150"
                style="width: 100%; min-width: 400px; height: auto"
              >
                <!-- Grid lines -->
                <line x1="20" y1="20" x2="480" y2="20" stroke="#f0f0f0" stroke-width="1" />
                <line
                  x1="20"
                  y1="52.5"
                  x2="480"
                  y2="52.5"
                  stroke="#f0f0f0"
                  stroke-width="1"
                />
                <line x1="20" y1="85" x2="480" y2="85" stroke="#f0f0f0" stroke-width="1" />
                <line
                  x1="20"
                  y1="117.5"
                  x2="480"
                  y2="117.5"
                  stroke="#f0f0f0"
                  stroke-width="1"
                />
                <line
                  x1="20"
                  y1="130"
                  x2="480"
                  y2="130"
                  stroke="#cccccc"
                  stroke-width="1.5"
                />

                <!-- Grid labels -->
                <text x="5" y="24" font-size="8" fill="#999">100%</text>
                <text x="5" y="89" font-size="8" fill="#999">50%</text>
                <text x="5" y="134" font-size="8" fill="#999">0%</text>

                <!-- Trend line -->
                <path :d="svgPath" fill="none" stroke="var(--q-primary)" stroke-width="2" />

                <!-- Points -->
                <g v-for="(pt, idx) in svgPoints" :key="idx">
                  <circle
                    :cx="pt.x"
                    :cy="pt.y"
                    r="4"
                    :fill="
                      pt.percent < 50 ? '#db2828' : pt.percent < 60 ? '#f2c037' : '#21ba45'
                    "
                  >
                    <title>{{ pt.label }}</title>
                  </circle>
                </g>
              </svg>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Subject Averages list -->
      <div :class="chronologicalScores.length >= 2 ? 'col-12 col-md-6' : 'col-12'">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-subtitle2 text-weight-bold q-mb-sm">Subject Performance</div>
            <div
              v-if="subjectAverages.length === 0"
              class="text-grey-6 text-center q-pa-md"
            >
              No current subject data.
            </div>
            <q-list v-else dense separator>
              <q-item v-for="avg in subjectAverages" :key="avg.subject">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ avg.subject }}</q-item-label>
                  <q-item-label caption>{{ avg.test_count }} tests recorded</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-chip
                    dense
                    square
                    :class="getScoreColorClass(avg.average)"
                    class="text-weight-bold bg-grey-1"
                  >
                    {{ avg.average }}%
                  </q-chip>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Detailed Test Scores Table -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle2 text-weight-bold q-mb-sm">Assessment History</div>
        <q-table
          :rows="learnerScores"
          :columns="academicsColumns"
          row-key="$id"
          :pagination="{ rowsPerPage: 10 }"
          flat
          dense
        >
          <!-- Date formatted -->
          <template #body-cell-date="props">
            <q-td :props="props">
              {{ formatDate(props.value) }}
            </q-td>
          </template>

          <!-- Percentage Chip -->
          <template #body-cell-percent="props">
            <q-td :props="props">
              <q-chip
                dense
                square
                text-color="white"
                :color="
                  computeScorePercent(props.row.score_value, props.row.max_score) < 50
                    ? 'negative'
                    : computeScorePercent(props.row.score_value, props.row.max_score) < 60
                      ? 'warning'
                      : 'positive'
                "
              >
                {{ computeScorePercent(props.row.score_value, props.row.max_score) }}%
              </q-chip>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { date } from 'quasar';
import { computeScorePercent, getScoreColorClass } from '../utils/school-utils';

const props = defineProps({
  learnerName: { type: String, default: '' },
  learnerScores: { type: Array, default: () => [] },
  subjectAverages: { type: Array, default: () => [] },
  overallAverage: { type: Number, default: 0 },
});

const academicsColumns = [
  { name: 'date', label: 'Date', field: 'assessment_date', align: 'left', sortable: true },
  { name: 'subject', label: 'Subject', field: 'subject', align: 'left', sortable: true },
  { name: 'type', label: 'Type', field: 'assessment_type', align: 'left', sortable: true },
  { name: 'term', label: 'Term', field: 'term', align: 'left', sortable: true },
  {
    name: 'score',
    label: 'Score',
    align: 'left',
    field: (row) => `${row.score_value}/${row.max_score}`,
  },
  { name: 'percent', label: 'Percentage', align: 'center', sortable: true },
  { name: 'notes', label: 'Teacher Notes', field: 'notes', align: 'left' },
];

const chronologicalScores = computed(() => {
  return [...props.learnerScores].reverse(); // oldest first for trend chart
});

const svgPath = computed(() => {
  const scores = chronologicalScores.value;
  if (scores.length < 2) return '';

  const width = 500;
  const height = 150;
  const padding = 20;

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * usableWidth;
    const percent = computeScorePercent(score.score_value, score.max_score);
    const y = padding + ((100 - percent) / 100) * usableHeight;
    return `${x},${y}`;
  });

  return `M ${points.join(' L ')}`;
});

const svgPoints = computed(() => {
  const scores = chronologicalScores.value;
  if (scores.length === 0) return [];

  const width = 500;
  const height = 150;
  const padding = 20;

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return scores.map((score, index) => {
    const x = padding + (index / (scores.length - 1)) * usableWidth;
    const percent = computeScorePercent(score.score_value, score.max_score);
    const y = padding + ((100 - percent) / 100) * usableHeight;
    return {
      x,
      y,
      percent,
      label: `${score.subject}: ${percent}%`,
    };
  });
});

function formatDate(isoString) {
  if (!isoString) return '—';
  const [y, m, d] = isoString.slice(0, 10).split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  return date.formatDate(localDate, 'DD MMM YYYY');
}
</script>
