<!--
  EducationalGoalsPage.vue (Story 4.12)

  Dashboard page showing progress toward the village's long-term educational goal.
  Accessible at /school/educational-goals — requires school:read.
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div class="row items-center">
        <q-btn flat dense round icon="arrow_back" to="/school/dashboard" class="q-mr-sm" />
        <div>
          <div class="text-h5">Educational Goals</div>
          <div class="text-caption text-grey-7">
            Progress toward the long-term educational goal
            <span v-if="activeGoal">— {{ activeGoal.goal_name }}</span>
          </div>
        </div>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          v-if="canWrite"
          outline
          color="primary"
          icon="picture_as_pdf"
          label="Generate Quarterly Report"
          :loading="isGeneratingPdf"
          @click="generateReport"
        />
        <q-btn
          v-if="canAdmin && !activeGoal"
          color="primary"
          icon="tune"
          label="Configure Goal"
          @click="$router.push('/school/settings/long-term-goals')"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Computing goal progress...</div>
    </div>

    <!-- Empty state: no active goal -->
    <div v-else-if="!activeGoal" class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders">
      <q-icon name="trending_up" size="48px" />
      <div class="text-subtitle1 q-mt-sm">No active long-term goal configured</div>
      <div class="text-caption">
        Configure the goal in School Settings to start tracking progress.
      </div>
      <q-btn
        v-if="canAdmin"
        color="primary"
        icon="tune"
        label="Configure Goal"
        class="q-mt-md"
        @click="$router.push('/school/settings/long-term-goals')"
      />
    </div>

    <!-- Empty state: no test scores -->
    <div
      v-else-if="!currentProgress || currentProgress.total === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="school" size="48px" />
      <div class="text-subtitle1 q-mt-sm">No scores recorded yet</div>
      <div class="text-caption">Record test scores to see progress toward the goal.</div>
      <q-btn
        color="primary"
        icon="groups_3"
        label="Go to Classes"
        class="q-mt-md"
        @click="$router.push('/school/classes')"
      />
    </div>

    <!-- Dashboard content -->
    <div v-else class="row q-col-gutter-md">
      <!-- Metric cards -->
      <div class="col-12">
        <div class="row q-col-gutter-md">
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Current %</div>
                <div class="text-h5 text-primary">
                  {{ formatPercent(currentProgress.percentAtTarget) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Target %</div>
                <div class="text-h5 text-primary">
                  {{ formatPercent(currentProgress.targetPercent) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Gap</div>
                <div
                  class="text-h5"
                  :class="currentProgress.gap > 0 ? 'text-negative' : 'text-positive'"
                >
                  {{ formatPercent(currentProgress.gap) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Years Remaining</div>
                <div class="text-h5 text-primary">
                  {{ currentProgress.yearsRemaining }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Required / Year</div>
                <div class="text-h5 text-primary">
                  {{ formatPercent(currentProgress.requiredAnnualImprovement) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-sm-4 col-md-2">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Projected Outcome</div>
                <div
                  class="text-h5"
                  :class="
                    currentProgress.projectionStatus === 'on_track'
                      ? 'text-positive'
                      : currentProgress.projectionStatus === 'at_risk'
                        ? 'text-negative'
                        : 'text-grey-7'
                  "
                >
                  {{
                    currentProgress.projectedOutcome != null
                      ? formatPercent(currentProgress.projectedOutcome)
                      : '—'
                  }}
                </div>
                <q-badge
                  :color="statusColor(currentProgress.projectionStatus)"
                  :label="statusLabel(currentProgress.projectionStatus)"
                  class="q-mt-xs"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Progress chart -->
      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 q-mb-md">Goal Progress Over Time</div>
            <div v-if="history.length === 0" class="text-grey text-caption text-center q-pa-md">
              No historical progress data available
            </div>
            <ClientOnly v-else>
              <div style="position: relative; height: 300px">
                <canvas ref="chartCanvas"></canvas>
              </div>
            </ClientOnly>
          </q-card-section>
        </q-card>
      </div>

      <!-- Breakdown by grade -->
      <div class="col-12 col-md-4">
        <q-card flat bordered class="full-height">
          <q-card-section>
            <div class="text-h6 q-mb-md">Breakdown by Grade</div>
            <div v-if="breakdownByGrade.length === 0" class="text-grey text-caption text-center">
              No grade data available
            </div>
            <q-list v-else dense separator>
              <q-item v-for="g in breakdownByGrade" :key="g.grade">
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ g.grade }}</q-item-label>
                  <q-item-label caption> {{ g.atTarget }} / {{ g.total }} learners </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="text-body2 text-weight-medium">
                    {{ formatPercent(g.percentAtTarget) }}
                  </div>
                  <div class="text-caption text-grey-7">Gap: {{ formatPercent(g.gap) }}</div>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Breakdown by subject -->
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 q-mb-md">Breakdown by Subject</div>
            <div v-if="breakdownBySubject.length === 0" class="text-grey text-caption text-center">
              No subject data available
            </div>
            <div v-else class="row q-col-gutter-md">
              <div
                v-for="s in breakdownBySubject"
                :key="s.subject"
                class="col-12 col-sm-6 col-md-4 col-lg-3"
              >
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle2">{{ s.subject }}</div>
                    <div class="text-caption text-grey-7">
                      {{ s.atTarget }} / {{ s.total }} learners assessed
                    </div>
                    <div class="row items-center justify-between q-mt-sm">
                      <div
                        class="text-h6"
                        :class="
                          s.percentAtTarget >= currentProgress.targetPercent
                            ? 'text-positive'
                            : 'text-negative'
                        "
                      >
                        {{ formatPercent(s.percentAtTarget) }}
                      </div>
                      <div class="text-caption text-grey-7">Gap {{ formatPercent(s.gap) }}</div>
                    </div>
                    <q-linear-progress
                      :value="s.percentAtTarget / 100"
                      :color="
                        s.percentAtTarget >= currentProgress.targetPercent ? 'positive' : 'negative'
                      "
                      class="q-mt-sm"
                      rounded
                    />
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import { exportEducationalGoalsToPDF } from 'src/services/ReportExportService';
import ClientOnly from 'src/components/layout/ClientOnly.vue';

const $q = useQuasar();
const goalsStore = useSchoolGoalsStore();
const settingsStore = useSettingsStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));
const isLoading = computed(() => goalsStore.isLoading);
const activeGoal = computed(() => goalsStore.activeGoal);
const currentProgress = computed(() => goalsStore.getCurrentProgress);
const history = computed(() => goalsStore.getProgressHistory);
const breakdownByGrade = computed(() => goalsStore.getBreakdownByGrade);
const breakdownBySubject = computed(() => goalsStore.getBreakdownBySubject);

const chartCanvas = ref(null);
const chartInstance = shallowRef(null);
const isGeneratingPdf = ref(false);

const villageName = computed(() => settingsStore.villageName || 'My Village');

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
}

function statusLabel(status) {
  switch (status) {
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    case 'insufficient_data':
    default:
      return 'Insufficient Data';
  }
}

function statusColor(status) {
  switch (status) {
    case 'on_track':
      return 'positive';
    case 'at_risk':
      return 'negative';
    case 'insufficient_data':
    default:
      return 'grey-7';
  }
}

async function renderChart() {
  if (!chartCanvas.value || history.value.length === 0) return;

  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }

  try {
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const labels = history.value.map((p) =>
      p.termName ? `${p.academicYear} ${p.termName}` : String(p.academicYear),
    );
    const data = history.value.map((p) => p.percentAtTarget);
    const targetPercent = currentProgress.value?.targetPercent ?? 90;

    chartInstance.value = new Chart(chartCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '% of learners at benchmark',
            data,
            borderColor: '#1976D2',
            backgroundColor: 'rgba(25, 118, 210, 0.15)',
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#1976D2',
            fill: true,
            tension: 0.3,
          },
          {
            label: `Target (${targetPercent}%)`,
            data: labels.map(() => targetPercent),
            borderColor: '#C10015',
            borderWidth: 2,
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxRotation: 45 },
          },
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: (v) => v + '%' },
          },
        },
        layout: { padding: { top: 4, bottom: 4, left: 4, right: 4 } },
      },
    });
  } catch (error) {
    console.error('Error rendering goal progress chart:', error);
  }
}

async function generateReport() {
  if (!activeGoal.value || !currentProgress.value) {
    $q.notify({ type: 'warning', message: 'No progress data available to export' });
    return;
  }

  isGeneratingPdf.value = true;
  try {
    await exportEducationalGoalsToPDF({
      goal: activeGoal.value,
      currentProgress: currentProgress.value,
      history: history.value,
      breakdownByGrade: breakdownByGrade.value,
      breakdownBySubject: breakdownBySubject.value,
      villageName: villageName.value,
      academicYearLabel: String(currentProgress.value.academicYear || new Date().getFullYear()),
      termLabel:
        history.value.length > 0 ? history.value[history.value.length - 1].termName || '' : '',
    });
  } catch (error) {
    console.error('Error generating educational goals PDF:', error);
    $q.notify({ type: 'negative', message: 'Failed to generate PDF report' });
  } finally {
    isGeneratingPdf.value = false;
  }
}

onMounted(async () => {
  await goalsStore.computeProgress();
  // Small delay to ensure canvas is rendered inside ClientOnly
  setTimeout(renderChart, 100);
});

onBeforeUnmount(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
});

watch(
  () => history.value,
  () => {
    renderChart();
  },
  { deep: true },
);
</script>
