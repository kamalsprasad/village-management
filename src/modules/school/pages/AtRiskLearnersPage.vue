<!--
  AtRiskLearnersPage.vue (Story 4.7 AC6, intervention actions added Story 4.8)
  Dedicated page listing all at-risk learners with filters, sortable table,
  and grace-period/no-terms warnings. Each row offers a "Create Intervention
  Plan" shortcut, or "View Active Intervention" if one already exists.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">At-Risk Learners</h4>
        <p class="text-grey-7 q-mb-none">
          Learners below the 90% attendance or academic thresholds
          <span v-if="atRiskStore.lastComputedAt"> · Last updated {{ lastComputedLabel }} </span>
        </p>
      </div>
      <q-space />
      <q-btn
        flat
        dense
        icon="refresh"
        :loading="atRiskStore.isLoading"
        label="Refresh"
        @click="atRiskStore.refresh()"
      />
    </div>

    <!-- Grace period banner -->
    <q-banner
      v-if="atRiskStore.gracePeriodActive && atRiskStore.termsConfigured"
      class="bg-orange-2 text-dark q-mb-md rounded-borders"
      rounded
    >
      <template #avatar>
        <q-icon name="schedule" color="orange-8" />
      </template>
      <div class="text-caption">
        At-risk identification is in a 5-school-day grace period.
        {{ atRiskStore.elapsedSchoolDays }}/5 school days elapsed since
        {{ atRiskStore.currentTerm?.term_name || 'the current term' }} started on
        {{
          atRiskStore.currentTerm
            ? date.formatDate(atRiskStore.currentTerm.start_date, 'DD MMM YYYY')
            : '—'
        }}. Flagging begins after 5 school days.
      </div>
    </q-banner>

    <!-- No terms configured warning -->
    <q-banner
      v-else-if="!atRiskStore.termsConfigured"
      class="bg-warning text-dark q-mb-md rounded-borders"
      rounded
    >
      <template #avatar>
        <q-icon name="warning" color="warning" />
      </template>
      <div class="text-caption">
        No academic terms configured. At-risk flags ignore the 5-day grace period.
        <router-link to="/school/settings" class="text-primary text-weight-medium">
          Configure terms in School Settings.
        </router-link>
      </div>
    </q-banner>

    <!-- Filters -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filterGrade"
          :options="gradeOptions"
          label="Filter by Grade"
          outlined
          dense
          clearable
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filterSeverity"
          :options="severityOptions"
          label="Filter by Severity"
          outlined
          dense
          clearable
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-input v-model="searchQuery" label="Search by name" outlined dense clearable />
      </div>
    </div>

    <!-- At-risk table -->
    <q-card flat bordered>
      <q-table
        :rows="filteredAtRisk"
        :columns="columns"
        row-key="learnerId"
        :loading="atRiskStore.isLoading"
        :pagination="{ rowsPerPage: 25, sortBy: 'severity' }"
        flat
        dense
        :no-data-label="emptyLabel"
      >
        <template #body-cell-learnerName="props">
          <q-td
            :props="props"
            class="text-weight-medium text-primary cursor-pointer"
            @click="goToLearner(props.row.learnerId)"
          >
            {{ props.value }}
          </q-td>
        </template>

        <template #body-cell-attendanceRate="props">
          <q-td :props="props">
            <span v-if="props.value !== null && props.value !== undefined">{{ props.value }}%</span>
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>

        <template #body-cell-lowestSubject="props">
          <q-td :props="props">
            <span v-if="props.value">{{ props.value.subject }} {{ props.value.average }}%</span>
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>

        <template #body-cell-overallAverage="props">
          <q-td :props="props">
            <span v-if="props.value !== null && props.value !== undefined">{{ props.value }}%</span>
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>

        <template #body-cell-severity="props">
          <q-td :props="props">
            <q-chip
              :color="props.value === 'high' ? 'negative' : 'warning'"
              text-color="white"
              dense
              size="sm"
            >
              {{ props.value === 'high' ? 'High' : 'Medium' }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-reasons="props">
          <q-td :props="props">
            <q-chip
              v-for="(r, idx) in props.value"
              :key="idx"
              dense
              size="sm"
              color="grey-3"
              text-color="grey-9"
            >
              {{ r.detail }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn
              flat
              dense
              round
              icon="visibility"
              color="primary"
              size="sm"
              @click="goToLearner(props.row.learnerId)"
            >
              <q-tooltip>View Learner Profile</q-tooltip>
            </q-btn>
            <q-btn
              v-if="canWrite && !getActiveIntervention(props.row.learnerId)"
              flat
              dense
              round
              icon="add_task"
              color="primary"
              size="sm"
              @click="createIntervention(props.row.learnerId)"
            >
              <q-tooltip>Create Intervention Plan</q-tooltip>
            </q-btn>
            <q-btn
              v-else-if="canWrite && getActiveIntervention(props.row.learnerId)"
              flat
              dense
              round
              icon="open_in_new"
              color="positive"
              size="sm"
              @click="viewIntervention(getActiveIntervention(props.row.learnerId).$id)"
            >
              <q-tooltip>View Active Intervention</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { date } from 'quasar';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useInterventionStore } from '../stores/intervention-store';
import { usePermissions } from 'src/composables/usePermissions';

const router = useRouter();
const atRiskStore = useAtRiskStore();
const interventionStore = useInterventionStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));

function getActiveIntervention(learnerId) {
  return (
    interventionStore.getInterventionsForLearner(learnerId).find((i) => i.status === 'Active') ||
    null
  );
}

function createIntervention(learnerId) {
  router.push(`/school/interventions/create?learnerId=${learnerId}`);
}

function viewIntervention(interventionId) {
  router.push(`/school/interventions/${interventionId}`);
}

const filterGrade = ref(null);
const filterSeverity = ref(null);
const searchQuery = ref('');

const severityOptions = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
];

const gradeOptions = computed(() => {
  const grades = [...new Set(atRiskStore.atRiskLearners.map((l) => l.gradeLevel))].sort();
  return grades.map((g) => ({ label: g, value: g }));
});

const filteredAtRisk = computed(() => {
  let list = atRiskStore.atRiskLearners;
  if (filterGrade.value) {
    list = list.filter((l) => l.gradeLevel === filterGrade.value);
  }
  if (filterSeverity.value) {
    list = list.filter((l) => l.severity === filterSeverity.value);
  }
  if (searchQuery.value.trim()) {
    const needle = searchQuery.value.toLowerCase().trim();
    list = list.filter((l) => l.learnerName.toLowerCase().includes(needle));
  }
  return list;
});

const emptyLabel = computed(() => {
  if (atRiskStore.gracePeriodActive) {
    return 'At-risk identification is in a grace period. No learners are flagged yet.';
  }
  if (atRiskStore.atRiskCount === 0) {
    return 'No learners currently meet the at-risk criteria.';
  }
  return 'No learners match the current filters.';
});

const lastComputedLabel = computed(() => {
  if (!atRiskStore.lastComputedAt) return '';
  return date.formatDate(new Date(atRiskStore.lastComputedAt), 'DD MMM YYYY HH:mm');
});

const columns = [
  { name: 'learnerName', label: 'Learner', field: 'learnerName', align: 'left', sortable: true },
  { name: 'gradeLevel', label: 'Grade', field: 'gradeLevel', align: 'left', sortable: true },
  {
    name: 'attendanceRate',
    label: 'Attendance',
    field: 'attendanceRate',
    align: 'center',
    sortable: true,
  },
  {
    name: 'lowestSubject',
    label: 'Lowest Subject',
    field: 'lowestSubject',
    align: 'left',
    sortable: false,
  },
  {
    name: 'overallAverage',
    label: 'Overall',
    field: 'overallAverage',
    align: 'center',
    sortable: true,
  },
  { name: 'severity', label: 'Severity', field: 'severity', align: 'center', sortable: true },
  { name: 'reasons', label: 'Reasons', field: 'reasons', align: 'left', sortable: false },
  { name: 'actions', label: 'Actions', align: 'right' },
];

function goToLearner(id) {
  router.push(`/school/learners/${id}`);
}

onMounted(() => {
  atRiskStore.computeAtRisk();
  interventionStore.fetchInterventions();
});
</script>
