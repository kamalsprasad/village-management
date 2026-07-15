<!--
  InterventionsListPage.vue (Story 4.8)
  School-wide list of all intervention plans with filters.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Interventions</div>
        <div class="text-caption text-grey-7">Track all learner intervention plans.</div>
      </div>
      <q-space />
      <q-btn
        v-if="hasPermission('school:write')"
        color="primary"
        icon="add"
        label="Create Intervention Plan"
        to="/school/interventions/create"
      />
    </div>

    <!-- Filters -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filterStatus"
          :options="statusOptions"
          label="Filter by Status"
          outlined
          dense
          multiple
          clearable
          emit-value
          map-options
          use-chips
        />
      </div>
      <div class="col-12 col-sm-4">
        <q-select
          v-model="filterLearner"
          :options="filteredLearnerOptions"
          label="Filter by Learner"
          outlined
          dense
          clearable
          emit-value
          map-options
          use-input
          input-debounce="0"
          @filter="onFilterLearner"
        />
      </div>
      <div class="col-12 col-sm-3">
        <q-select
          v-model="filterTeacher"
          :options="teacherOptions"
          label="Filter by Teacher"
          outlined
          dense
          clearable
          emit-value
          map-options
        />
      </div>
      <div class="col-12 col-sm-1 flex items-center">
        <q-btn flat dense icon="filter_alt_off" @click="clearFilters">
          <q-tooltip>Clear filters</q-tooltip>
        </q-btn>
      </div>
    </div>

    <q-card flat bordered>
      <q-skeleton v-if="interventionStore.isLoading" type="rect" height="300px" />
      <q-table
        v-else
        :rows="filteredInterventions"
        :columns="columns"
        row-key="$id"
        flat
        dense
        :pagination="{ rowsPerPage: 25, sortBy: 'start_date', descending: true }"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <InterventionStatusBadge :status="props.value" />
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
              :to="`/school/interventions/${props.row.$id}`"
            >
              <q-tooltip>View</q-tooltip>
            </q-btn>
            <q-btn
              v-if="hasPermission('school:write')"
              flat
              dense
              round
              icon="edit"
              color="grey-8"
              size="sm"
              :to="`/school/interventions/${props.row.$id}/edit`"
            >
              <q-tooltip>Edit</q-tooltip>
            </q-btn>
            <q-btn
              v-if="hasPermission('school:admin')"
              flat
              dense
              round
              icon="delete"
              color="negative"
              size="sm"
              @click="confirmDelete(props.row)"
            >
              <q-tooltip>Delete</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-7">
            <q-icon name="support" size="48px" class="q-mb-sm" />
            <div>No interventions recorded yet</div>
            <q-btn
              v-if="hasPermission('school:write')"
              flat
              color="primary"
              label="Create Intervention Plan"
              to="/school/interventions/create"
              class="q-mt-sm"
            />
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar, date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useInterventionStore } from '../stores/intervention-store';
import { usePermissions } from 'src/composables/usePermissions';
import { INTERVENTION_STATUSES } from '../utils/school-constants';
import InterventionStatusBadge from '../components/InterventionStatusBadge.vue';

const $q = useQuasar();
const { hasPermission } = usePermissions();

const learnerStore = useLearnerStore();
const teacherStore = useTeacherStore();
const interventionStore = useInterventionStore();

const filterStatus = ref(['Active']);
const filterLearner = ref(null);
const filterTeacher = ref(null);

const statusOptions = INTERVENTION_STATUSES.map((s) => ({ label: s.label, value: s.value }));

const learnerOptions = computed(() =>
  learnerStore.activeLearners.map((l) => ({
    label: learnerStore.getLearnerName(l),
    value: l.$id,
  })),
);

const filteredLearnerOptions = ref([]);

function onFilterLearner(val, update) {
  update(() => {
    if (!val) {
      filteredLearnerOptions.value = learnerOptions.value;
      return;
    }
    const needle = val.toLowerCase();
    filteredLearnerOptions.value = learnerOptions.value.filter((o) =>
      o.label.toLowerCase().includes(needle),
    );
  });
}

const teacherOptions = computed(() =>
  teacherStore.assignmentsByTeacher.map((t) => ({
    label: t.teacher_name,
    value: t.teacher_id,
  })),
);

function clearFilters() {
  filterStatus.value = [];
  filterLearner.value = null;
  filterTeacher.value = null;
}

function learnerName(learnerId) {
  const learner = learnerStore.learners.find((l) => l.$id === learnerId);
  return learner ? learnerStore.getLearnerName(learner) : 'Unknown Learner';
}

function teacherName(teacherId) {
  if (!teacherId) return 'Unassigned';
  const match = teacherStore.teacherAssignments.find((a) => a.teacher_id_normalized === teacherId);
  return match ? match.teacher_name : 'Unknown Teacher';
}

const filteredInterventions = computed(() => {
  let list = interventionStore.interventions.map((i) => ({
    ...i,
    learner_name: learnerName(i.learner_id_normalized),
    teacher_name: teacherName(i.assigned_teacher_id_normalized),
    notes_count: interventionStore.getNotesForIntervention(i.$id).length,
  }));

  if (filterStatus.value && filterStatus.value.length > 0) {
    list = list.filter((i) => filterStatus.value.includes(i.status));
  }
  if (filterLearner.value) {
    list = list.filter((i) => i.learner_id_normalized === filterLearner.value);
  }
  if (filterTeacher.value) {
    list = list.filter((i) => i.assigned_teacher_id_normalized === filterTeacher.value);
  }
  return list;
});

const columns = [
  { name: 'learner_name', label: 'Learner', field: 'learner_name', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'left', sortable: true },
  {
    name: 'intervention_type',
    label: 'Type',
    field: 'intervention_type',
    align: 'left',
    sortable: true,
  },
  {
    name: 'teacher_name',
    label: 'Assigned Teacher',
    field: 'teacher_name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'start_date',
    label: 'Start Date',
    field: 'start_date',
    align: 'left',
    sortable: true,
    format: (val) => (val ? date.formatDate(new Date(val), 'DD MMM YYYY') : '—'),
  },
  {
    name: 'end_date',
    label: 'End Date',
    field: 'end_date',
    align: 'left',
    format: (val) => (val ? date.formatDate(new Date(val), 'DD MMM YYYY') : 'No end date'),
  },
  { name: 'notes_count', label: 'Notes', field: 'notes_count', align: 'center' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
];

function confirmDelete(intervention) {
  $q.dialog({
    title: 'Delete Intervention',
    message: `Delete intervention '${intervention.intervention_type}' for ${intervention.learner_name}? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    const result = await interventionStore.deleteIntervention(intervention.$id);
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Intervention deleted.' });
    }
  });
}

onMounted(async () => {
  await Promise.all([
    learnerStore.fetchLearners(),
    teacherStore.fetchTeacherAssignments(),
    interventionStore.fetchInterventions(),
  ]);
  filteredLearnerOptions.value = learnerOptions.value;
  await Promise.all(
    interventionStore.interventions.map((i) => interventionStore.fetchNotesForIntervention(i.$id)),
  );
});
</script>
