<!--
  CreateInterventionPage.vue (Story 4.8)
  Create/Edit intervention plan.
  Route /school/interventions/create = create mode; /school/interventions/:id/edit = edit mode.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" :to="backTarget" class="q-mr-sm">
        <q-tooltip>Back</q-tooltip>
      </q-btn>
      <div>
        <div class="text-h5">
          {{ isEditMode ? 'Edit Intervention Plan' : 'Create Intervention Plan' }}
        </div>
        <div class="text-caption text-grey-7">
          {{
            isEditMode
              ? 'Update the intervention plan details, status, and outcome'
              : 'Specify a structured plan of support for an at-risk learner'
          }}
        </div>
      </div>
    </div>

    <q-card flat bordered style="max-width: 900px">
      <q-card-section v-if="isEditMode && isLoadingIntervention">
        <q-skeleton type="rect" height="400px" />
      </q-card-section>
      <q-card-section v-else>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <!-- Learner -->
          <q-select
            v-model="form.learner_id"
            :options="filteredLearnerOptions"
            label="Learner *"
            outlined
            emit-value
            map-options
            use-input
            input-debounce="0"
            :readonly="lockLearner"
            :disable="lockLearner"
            @filter="filterLearners"
            :rules="[(val) => !!val || 'Learner is required']"
          />

          <!-- Intervention Type -->
          <q-select
            v-model="form.intervention_type"
            :options="INTERVENTION_TYPES"
            label="Intervention Type *"
            outlined
            :rules="[(val) => !!val || 'Intervention type is required']"
          />

          <!-- Assigned Teacher -->
          <q-select
            v-model="form.assigned_teacher_id"
            :options="teacherOptions"
            :label="teacherOptions.length === 0 ? 'Assigned Teacher' : 'Assigned Teacher *'"
            outlined
            emit-value
            map-options
            :hint="
              teacherOptions.length === 0
                ? 'No teachers configured — please add teachers in School Settings.'
                : ''
            "
            :rules="
              teacherOptions.length === 0 ? [] : [(val) => !!val || 'Assigned teacher is required']
            "
          />

          <!-- Focus Areas -->
          <q-select
            v-model="form.focus_areas"
            :options="focusAreaOptions"
            label="Focus Areas"
            outlined
            multiple
            use-chips
            use-input
            new-value-mode="add-unique"
            hint="Select suggested focus areas or type your own"
          />

          <!-- Start / End Date -->
          <div class="row q-col-gutter-md">
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.start_date"
                label="Start Date *"
                outlined
                :rules="[(val) => !!val || 'Start date is required']"
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.start_date" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
            <div class="col-12 col-sm-6">
              <q-input
                v-model="form.end_date"
                label="End Date"
                outlined
                clearable
                :rules="[
                  (val) =>
                    !val ||
                    !form.start_date ||
                    val >= form.start_date ||
                    'End date must be after start date',
                ]"
              >
                <template #append>
                  <q-icon name="event" class="cursor-pointer">
                    <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                      <q-date v-model="form.end_date" mask="YYYY-MM-DD">
                        <div class="row items-center justify-end">
                          <q-btn v-close-popup label="Close" color="primary" flat />
                        </div>
                      </q-date>
                    </q-popup-proxy>
                  </q-icon>
                </template>
              </q-input>
            </div>
          </div>

          <!-- Frequency -->
          <q-input
            v-model="form.frequency"
            label="Frequency"
            outlined
            maxlength="255"
            placeholder="e.g. 3x per week - Mon/Wed/Fri, 3-4pm"
          />

          <!-- Success Criteria -->
          <q-input
            v-model="form.success_criteria"
            label="Success Criteria"
            outlined
            type="textarea"
            maxlength="500"
            placeholder="e.g. Score above 60% in all subjects by end of term"
          />

          <!-- Academic Term -->
          <q-select
            v-model="selectedTermId"
            :options="termOptions"
            label="Academic Term"
            outlined
            emit-value
            map-options
          />

          <!-- Status (edit mode only) -->
          <q-select
            v-if="isEditMode"
            v-model="form.status"
            :options="INTERVENTION_STATUSES.map((s) => ({ label: s.label, value: s.value }))"
            label="Status *"
            outlined
            emit-value
            map-options
            :rules="[(val) => !!val || 'Status is required']"
          />

          <!-- Outcome (edit mode, Resolved/Closed only) -->
          <q-input
            v-if="isEditMode && requiresOutcome"
            v-model="form.outcome"
            label="Outcome *"
            outlined
            type="textarea"
            maxlength="1000"
            :rules="[(val) => !!val || 'Outcome is required when status is Resolved or Closed']"
          />

          <!-- Notes -->
          <q-input v-model="form.notes" label="Notes" outlined type="textarea" maxlength="500" />

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn flat label="Cancel" :to="backTarget" />
            <q-btn
              type="submit"
              color="primary"
              :label="isEditMode ? 'Save Changes' : 'Save Plan'"
              :loading="isSubmitting"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useInterventionStore } from '../stores/intervention-store';
import { useAuthStore } from 'src/stores/auth-store';
import {
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  statusRequiresOutcome,
} from '../utils/school-constants';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const learnerStore = useLearnerStore();
const teacherStore = useTeacherStore();
const academicTermsStore = useAcademicTermsStore();
const atRiskStore = useAtRiskStore();
const interventionStore = useInterventionStore();
const authStore = useAuthStore();

const isSubmitting = ref(false);
const isLoadingIntervention = ref(false);

const isEditMode = computed(() => !!route.params.id);
const existingIntervention = computed(() =>
  isEditMode.value
    ? interventionStore.interventions.find((i) => i.$id === route.params.id) || null
    : null,
);

// Learner is locked when arriving via ?learnerId= (from At-Risk page or Learner tab)
const lockLearner = computed(() => !isEditMode.value && !!route.query.learnerId);

const backTarget = computed(() => {
  if (isEditMode.value) return `/school/interventions/${route.params.id}`;
  if (route.query.learnerId) return `/school/learners/${route.query.learnerId}`;
  return '/school/interventions';
});

const form = ref({
  learner_id: null,
  intervention_type: null,
  assigned_teacher_id: null,
  focus_areas: [],
  start_date: new Date().toISOString().slice(0, 10),
  end_date: null,
  frequency: '',
  success_criteria: '',
  term: null,
  academic_year: null,
  status: 'Active',
  outcome: '',
  notes: '',
});

const requiresOutcome = computed(() => statusRequiresOutcome(form.value.status));

const learnerOptions = computed(() =>
  learnerStore.activeLearners.map((l) => ({
    label: learnerStore.getLearnerName(l),
    value: l.$id,
  })),
);

const filteredLearnerOptions = ref([]);

function filterLearners(val, update) {
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
    label: `${t.teacher_name} (${t.grades.map((g) => g.grade_level).join(', ')})`,
    value: t.teacher_id,
  })),
);

const focusAreaOptions = computed(() => {
  if (!form.value.learner_id) return [];
  const risk = atRiskStore.getLearnerRisk(form.value.learner_id);
  return risk ? risk.reasons.map((r) => r.detail) : [];
});

// Term names repeat across academic years (e.g. "Term 2" exists in both
// 2025 and 2026), so the select uses the term's $id as its value to avoid
// ambiguity, and form.term/form.academic_year are derived from it.
const termOptions = computed(() =>
  academicTermsStore.academicTerms.map((t) => ({
    label: `${t.term_name} (${t.academic_year})`,
    value: t.$id,
  })),
);

const selectedTermId = ref(null);

function applyCurrentTerm() {
  const term = academicTermsStore.getTermForDate(new Date());
  if (term) {
    selectedTermId.value = term.$id;
    form.value.term = term.term_name;
    form.value.academic_year = term.academic_year;
  }
}

// Keep form.term/form.academic_year in sync when the user changes the term dropdown
watch(selectedTermId, (termId) => {
  const match = academicTermsStore.academicTerms.find((t) => t.$id === termId);
  if (match) {
    form.value.term = match.term_name;
    form.value.academic_year = match.academic_year;
  }
});

function populateFromIntervention(intervention) {
  form.value = {
    learner_id: intervention.learner_id_normalized,
    intervention_type: intervention.intervention_type,
    assigned_teacher_id: intervention.assigned_teacher_id_normalized,
    focus_areas: intervention.focus_areas || [],
    start_date: intervention.start_date ? intervention.start_date.slice(0, 10) : '',
    end_date: intervention.end_date ? intervention.end_date.slice(0, 10) : null,
    frequency: intervention.frequency || '',
    success_criteria: intervention.success_criteria || '',
    term: intervention.term || null,
    academic_year: intervention.academic_year || null,
    status: intervention.status,
    outcome: intervention.outcome || '',
    notes: intervention.notes || '',
  };

  const match = academicTermsStore.academicTerms.find(
    (t) => t.term_name === intervention.term && t.academic_year === intervention.academic_year,
  );
  selectedTermId.value = match ? match.$id : null;
}

async function onSubmit() {
  isSubmitting.value = true;
  try {
    const payload = {
      learner_id: form.value.learner_id,
      assigned_teacher_id: form.value.assigned_teacher_id,
      intervention_type: form.value.intervention_type,
      focus_areas: form.value.focus_areas,
      frequency: form.value.frequency,
      success_criteria: form.value.success_criteria,
      start_date: new Date(`${form.value.start_date}T00:00:00`).toISOString(),
      end_date: form.value.end_date
        ? new Date(`${form.value.end_date}T00:00:00`).toISOString()
        : null,
      term: form.value.term,
      academic_year: form.value.academic_year,
      notes: form.value.notes,
    };

    if (isEditMode.value) {
      payload.status = form.value.status;
      payload.outcome = requiresOutcome.value ? form.value.outcome : '';
      const result = await interventionStore.updateIntervention(route.params.id, payload);
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Intervention plan updated.' });
        router.push(`/school/interventions/${route.params.id}`);
      }
    } else {
      payload.status = 'Active';
      payload.created_by = authStore.user?.resident_id || null;
      const result = await interventionStore.createIntervention(payload);
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Intervention plan created.' });
        router.push(`/school/interventions/${result.data.$id}`);
      }
    }
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    learnerStore.fetchLearners(),
    teacherStore.fetchTeacherAssignments(),
    academicTermsStore.fetchAcademicTerms(),
    atRiskStore.computeAtRisk(),
  ]);
  filteredLearnerOptions.value = learnerOptions.value;

  if (isEditMode.value) {
    isLoadingIntervention.value = true;
    await interventionStore.fetchInterventions();
    if (existingIntervention.value) {
      populateFromIntervention(existingIntervention.value);
    }
    isLoadingIntervention.value = false;
  } else {
    applyCurrentTerm();
    if (route.query.learnerId) {
      form.value.learner_id = route.query.learnerId;
    }
    // Pre-select the only teacher if there's exactly one
    if (teacherOptions.value.length === 1) {
      form.value.assigned_teacher_id = teacherOptions.value[0].value;
    }
  }
});
</script>
