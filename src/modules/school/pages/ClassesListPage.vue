<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">School Classes & Sections</div>
        <div class="text-caption text-grey-7">
          Manage grade-level classes, teachers, student rosters, and schedules
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="canAdmin"
        color="primary"
        icon="add"
        label="Add Class / Split"
        @click="openAddClassDialog"
      />
    </div>

    <!-- Filter Card -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="searchQuery"
            label="Search Classes (e.g. Grade 3A, Early Childhood)"
            outlined
            dense
            clearable
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="selectedGradeLevel"
            :options="GRADE_LEVELS"
            label="Filter by Grade Level"
            outlined
            dense
            clearable
          />
        </div>
        <div class="col-12 col-sm-2 text-right">
          <q-btn flat label="Reset" color="grey-7" @click="resetFilters" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Classes Grid -->
    <div v-if="classStore.isLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Loading school classes...</div>
    </div>

    <div
      v-else-if="filteredClasses.length === 0"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders border-dashed"
    >
      <q-icon name="groups_3" size="48px" />
      <div>No classes found matching the criteria.</div>
      <div v-if="canAdmin" class="text-caption q-mt-xs">
        Click "Add Class / Split" to create your first class.
      </div>
    </div>

    <div v-else class="row q-col-gutter-md">
      <div v-for="cls in filteredClasses" :key="cls.$id" class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="class-card cursor-pointer" @click="viewClass(cls)">
          <q-card-section class="bg-primary text-white q-py-sm row items-center">
            <div class="text-subtitle1 text-weight-bold">{{ cls.name }}</div>
            <q-space />
            <q-chip dense square color="white" text-color="primary" class="text-weight-bold">
              Year {{ cls.academic_year }}
            </q-chip>
          </q-card-section>

          <q-card-section class="q-py-md">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="text-caption text-grey-7">Enrolled Students</div>
                <div class="text-h6 text-weight-bold text-primary">
                  <q-icon name="groups" class="q-mr-xs" size="sm" />
                  {{ getStudentCount(cls.$id) }}
                </div>
              </div>
              <div class="col-6 border-left">
                <div class="text-caption text-grey-7">Class Performance</div>
                <div
                  class="text-h6 text-weight-bold"
                  :class="getAverageColorClass(getRollingAverage(cls.$id))"
                >
                  <q-icon name="analytics" class="q-mr-xs" size="sm" />
                  {{ getRollingAverage(cls.$id) > 0 ? getRollingAverage(cls.$id) + '%' : 'N/A' }}
                </div>
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <div class="row items-center q-mt-xs">
              <q-avatar
                size="32px"
                color="blue-1"
                text-color="primary"
                icon="person"
                class="q-mr-sm"
              />
              <div>
                <div class="text-caption text-grey-6">Class Teacher</div>
                <div class="text-subtitle2 text-weight-medium">
                  {{ cls.teacher_name || 'No assigned teacher' }}
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-py-xs bg-grey-1">
            <q-btn
              flat
              dense
              color="primary"
              icon="visibility"
              label="View Class"
              @click.stop="viewClass(cls)"
            />
            <q-btn
              v-if="canAdmin"
              flat
              dense
              color="secondary"
              icon="edit"
              label="Edit"
              @click.stop="openEditClassDialog(cls)"
            />
            <q-btn
              v-if="canAdmin"
              flat
              dense
              color="negative"
              icon="delete"
              label="Delete"
              @click.stop="confirmDelete(cls)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Create / Edit Class Dialog -->
    <q-dialog v-model="showClassDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">{{ isEditing ? 'Edit Class' : 'Create New Class' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form ref="classForm" class="q-gutter-md">
            <q-input
              v-model="formModel.name"
              label="Class Name *"
              placeholder="e.g. Grade 3A, Grade 5"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />

            <q-select
              v-model="formModel.grade_level"
              :options="GRADE_LEVELS"
              label="Grade Level *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />

            <q-input
              v-model.number="formModel.academic_year"
              type="number"
              label="Academic Year *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />

            <q-select
              v-model="selectedTeacherOption"
              :options="teacherOptions"
              label="Assigned Class Teacher"
              outlined
              dense
              clearable
              use-input
              fill-input
              hide-selected
              @filter="filterTeachers"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">No teachers found</q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-input
              v-model="formModel.notes"
              label="Notes"
              outlined
              dense
              type="textarea"
              rows="3"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat color="grey-7" label="Cancel" v-close-popup />
          <q-btn
            color="primary"
            :label="isEditing ? 'Save Changes' : 'Create Class'"
            :loading="isSubmitting"
            @click="saveClass"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { normalizeClassId, useClassStore } from '../stores/class-store';
import { useLearnerStore } from '../stores/learner-store';
import { useSchoolStore } from '../stores/school-store';
import { usePermissions } from 'src/composables/usePermissions';
import { tables } from 'src/boot/appwrite';
import { Query } from 'appwrite';
import { GRADE_LEVELS } from '../utils/school-constants';
import { computeScorePercent } from '../utils/school-utils';

const router = useRouter();
const $q = useQuasar();
const classStore = useClassStore();
const learnerStore = useLearnerStore();
const schoolStore = useSchoolStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));

const searchQuery = ref('');
const selectedGradeLevel = ref(null);

const showClassDialog = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const classForm = ref(null);

const formModel = ref({
  $id: null,
  name: '',
  grade_level: null,
  academic_year: new Date().getFullYear(),
  class_teacher_id: null,
  notes: '',
});

const selectedTeacherOption = ref(null);
const allTeachers = ref([]);
const filteredTeachersList = ref([]);

onMounted(async () => {
  await classStore.fetchClasses();
  await learnerStore.fetchLearners();
  await schoolStore.fetchTestScores();
  await loadTeachers();
});

// Load residents that can be assigned as teachers
async function loadTeachers() {
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const tableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
    const response = await tables.listRows({
      databaseId: dbId,
      tableId: tableId,
      queries: [Query.limit(500), Query.orderAsc('last_name')],
    });

    allTeachers.value = response.rows.map((r) => {
      const parts = [r.first_name, r.middle_names, r.last_name].filter(Boolean);
      return {
        label: parts.join(' '),
        value: r.$id,
      };
    });
    filteredTeachersList.value = allTeachers.value;
  } catch (error) {
    console.error('ClassesListPage: failed to load teachers', error);
  }
}

const teacherOptions = computed(() => filteredTeachersList.value);

function filterTeachers(val, update) {
  if (val === '') {
    update(() => {
      filteredTeachersList.value = allTeachers.value;
    });
    return;
  }

  update(() => {
    const needle = val.toLowerCase();
    filteredTeachersList.value = allTeachers.value.filter((v) =>
      v.label.toLowerCase().includes(needle),
    );
  });
}

const filteredClasses = computed(() => {
  let list = classStore.classes;

  if (selectedGradeLevel.value) {
    list = list.filter((c) => c.grade_level === selectedGradeLevel.value);
  }

  if (searchQuery.value && searchQuery.value.trim()) {
    const term = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.grade_level.toLowerCase().includes(term) ||
        (c.teacher_name && c.teacher_name.toLowerCase().includes(term)),
    );
  }

  return list;
});

function getStudentCount(classId) {
  return classStore.getClassSize(classId);
}

function getRollingAverage(classId) {
  const scores = schoolStore.testScores.filter((s) => {
    const l = learnerStore.learners.find((l) => l.$id === s.learner_id_normalized);
    return l && (l.class_id_normalized || normalizeClassId(l.class_id)) === classId;
  });

  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, s) => sum + computeScorePercent(s.score_value, s.max_score), 0);
  return Math.round(total / scores.length);
}

function getAverageColorClass(avg) {
  if (avg === 0) return 'text-grey-7';
  if (avg < 50) return 'text-negative';
  if (avg < 60) return 'text-warning';
  return 'text-positive';
}

function viewClass(cls) {
  router.push(`/school/classes/${cls.$id}`);
}

function resetFilters() {
  searchQuery.value = '';
  selectedGradeLevel.value = null;
}

function openAddClassDialog() {
  isEditing.value = false;
  formModel.value = {
    $id: null,
    name: '',
    grade_level: null,
    academic_year: new Date().getFullYear(),
    class_teacher_id: null,
    notes: '',
  };
  selectedTeacherOption.value = null;
  showClassDialog.value = true;
}

function openEditClassDialog(cls) {
  isEditing.value = true;
  formModel.value = {
    $id: cls.$id,
    name: cls.name,
    grade_level: cls.grade_level,
    academic_year: cls.academic_year,
    class_teacher_id: cls.class_teacher_id_normalized || cls.class_teacher_id,
    notes: cls.notes || '',
  };

  // Pre-fill teacher option
  if (cls.class_teacher_id_normalized) {
    selectedTeacherOption.value = {
      label: cls.teacher_name,
      value: cls.class_teacher_id_normalized,
    };
  } else {
    selectedTeacherOption.value = null;
  }
  showClassDialog.value = true;
}

async function saveClass() {
  const formOk = await classForm.value.validate();
  if (!formOk) return;

  isSubmitting.value = true;
  try {
    const payload = {
      ...formModel.value,
      class_teacher_id: selectedTeacherOption.value ? selectedTeacherOption.value.value : null,
      teacher_name: selectedTeacherOption.value
        ? selectedTeacherOption.value.label
        : 'No Teacher Assigned',
    };

    let result;
    if (isEditing.value) {
      result = await classStore.updateClass(formModel.value.$id, payload);
    } else {
      result = await classStore.createClass(payload);
    }

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: isEditing.value
          ? 'Class details updated successfully.'
          : 'Class created successfully.',
      });
      showClassDialog.value = false;
    } else {
      $q.notify({
        type: 'negative',
        message: result.error,
      });
    }
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDelete(cls) {
  $q.dialog({
    title: 'Delete Class',
    message: `Are you sure you want to delete ${cls.name}? Active students in this class will need to be re-assigned. This action cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete Class', color: 'negative' },
  }).onOk(async () => {
    const result = await classStore.deleteClass(cls.$id);
    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Class deleted successfully.',
      });
    }
  });
}
</script>

<style scoped>
.class-card {
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  border-radius: 8px;
  overflow: hidden;
}
.class-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1) !important;
}
.border-left {
  border-left: 1px solid #e0e0e0;
  padding-left: 16px;
}
</style>
