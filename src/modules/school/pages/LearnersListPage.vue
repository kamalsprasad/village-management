<!--
  LearnersListPage.vue (Story 4.1)
  Learner list with class/status filters, name search, sorting, and pagination.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Learners</div>
        <div class="text-caption text-grey-7">
          {{ learnerStore.filteredLearners.length }} of {{ learnerStore.learners.length }} learners
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="canWrite"
        color="primary"
        icon="person_add"
        label="Enroll Learner"
        @click="$router.push('/school/learners/enroll')"
      />
    </div>

    <!-- Filters (AC7) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input
            v-model="learnerStore.filters.searchQuery"
            label="Search by name"
            outlined
            dense
            clearable
            debounce="200"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-6 col-sm-3">
          <q-select
            v-model="learnerStore.filters.classIds"
            :options="classOptions"
            label="Class"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-6 col-sm-3">
          <q-select
            v-model="learnerStore.filters.statuses"
            :options="statusOptions"
            label="Status"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-sm-2">
          <q-btn flat color="grey-7" label="Clear Filters" @click="learnerStore.resetFilters()" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Learners Table (AC3) -->
    <q-table
      :rows="sortedLearners"
      :columns="columns"
      row-key="$id"
      :loading="learnerStore.isLoading"
      :pagination="{ rowsPerPage: 25 }"
      flat
      bordered
      @row-click="(evt, row) => $router.push(`/school/learners/${row.$id}`)"
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <span class="text-weight-medium">{{ props.value || 'Unknown' }}</span>
        </q-td>
      </template>

      <template #body-cell-status="props">
        <q-td :props="props">
          <EnrollmentStatusBadge :status="props.value" />
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props" @click.stop>
          <q-btn
            flat
            dense
            round
            icon="visibility"
            size="sm"
            :to="`/school/learners/${props.row.$id}`"
          >
            <q-tooltip>View Details</q-tooltip>
          </q-btn>
          <q-btn
            v-if="canAdmin"
            flat
            dense
            round
            icon="edit"
            size="sm"
            :to="`/school/learners/${props.row.$id}/edit`"
          >
            <q-tooltip>Edit</q-tooltip>
          </q-btn>
        </q-td>
      </template>

      <template #no-data>
        <div class="full-width text-center q-pa-lg text-grey-7">
          <template v-if="learnerStore.learners.length === 0">
            No learners enrolled yet.
            <span v-if="canWrite">Click "Enroll Learner" to get started.</span>
          </template>
          <template v-else> No learners match the current filters. </template>
        </div>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { normalizeClassId, useClassStore } from '../stores/class-store';
import { usePermissions } from 'src/composables/usePermissions';
import { ENROLLMENT_STATUSES } from '../utils/school-constants';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge.vue';

const learnerStore = useLearnerStore();
const classStore = useClassStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));

const classOptions = computed(() =>
  classStore.classes.map((c) => ({ label: c.name, value: c.$id })),
);
const statusOptions = ENROLLMENT_STATUSES.map((s) => ({ label: s.label, value: s.value }));

const sortedLearners = computed(() => {
  return [...learnerStore.filteredLearners].sort((a, b) => {
    const aClassId = a.class_id_normalized || normalizeClassId(a.class_id);
    const bClassId = b.class_id_normalized || normalizeClassId(b.class_id);

    if (!aClassId && bClassId) return -1;
    if (aClassId && !bClassId) return 1;

    return learnerStore.getLearnerName(a).localeCompare(learnerStore.getLearnerName(b));
  });
});

const columns = [
  {
    name: 'name',
    label: 'Resident Name',
    field: (row) => learnerStore.getLearnerName(row),
    align: 'left',
    sortable: true,
  },
  {
    name: 'class',
    label: 'Class',
    field: (row) => {
      const classId = row.class_id_normalized || normalizeClassId(row.class_id);
      const cls = classStore.classes.find((c) => c.$id === classId);
      return cls ? cls.name : 'Unassigned';
    },
    align: 'left',
    sortable: true,
  },
  {
    name: 'status',
    label: 'Status',
    field: 'enrollment_status',
    align: 'left',
    sortable: true,
  },
  {
    name: 'enrollment_date',
    label: 'Enrollment Date',
    field: 'enrollment_date',
    align: 'left',
    sortable: true,
    format: (val) => (val ? date.formatDate(val, 'DD MMM YYYY') : '—'),
  },
  {
    name: 'actions',
    label: 'Actions',
    field: '$id',
    align: 'right',
  },
];

onMounted(() => {
  learnerStore.fetchLearners();
  classStore.fetchClasses();
});
</script>
