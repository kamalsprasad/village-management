<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn
        flat
        dense
        round
        icon="arrow_back"
        :to="'/school/classes/' + (route.params.id || '')"
        class="q-mr-sm"
      />
      <div>
        <div class="text-h5">Record Test Scores</div>
        <div class="text-caption text-grey-7">Record or update class assessment scores</div>
      </div>
    </div>

    <!-- Header Form Card -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <q-form ref="headerForm" class="row q-col-gutter-sm items-end">
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="classId"
              :options="classOptions"
              label="Class *"
              outlined
              dense
              emit-value
              map-options
              disable
              :rules="[(val) => !!val || 'Required']"
              @update:model-value="onClassChange"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-select
              v-model="subject"
              :options="SUBJECTS"
              label="Subject *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-2">
            <q-select
              v-model="assessmentType"
              :options="ASSESSMENT_TYPES"
              label="Assessment Type *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />
          </div>
          <div class="col-12 col-sm-6 col-md-2">
            <q-select
              v-model="term"
              :options="termOptions"
              label="Term *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />
          </div>
          <div v-if="hasNoDbTermsForYear" class="col-12">
            <q-banner class="bg-warning text-white rounded-borders" dense>
              <template #avatar>
                <q-icon name="warning" />
              </template>
              No terms configured for {{ academicYear }}. Using default term names as a fallback.
              <router-link to="/school/settings/terms" class="text-white">
                <strong>Configure terms in School Settings.</strong>
              </router-link>
            </q-banner>
          </div>
          <div class="col-12 col-sm-4 col-md-2">
            <q-input
              v-model.number="academicYear"
              type="number"
              label="Academic Year *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required', (val) => val > 2000 || 'Invalid']"
            />
          </div>
          <div class="col-12 col-sm-4 col-md-3">
            <q-input v-model="assessmentDate" outlined dense label="Assessment Date *">
              <template #append>
                <q-icon name="event" class="cursor-pointer">
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="assessmentDate" mask="YYYY-MM-DD">
                      <div class="row items-center justify-end">
                        <q-btn v-close-popup label="Close" color="primary" flat />
                      </div>
                    </q-date>
                  </q-popup-proxy>
                </q-icon>
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4 col-md-3">
            <q-input
              v-model.number="maxScore"
              type="number"
              label="Max Score *"
              outlined
              dense
              :rules="[(val) => !!val || 'Required', (val) => val > 0 || 'Must be > 0']"
              @update:model-value="onMaxScoreChange"
            />
          </div>
          <div class="col-12 col-sm-12 col-md-6 text-right q-pb-md">
            <q-btn
              v-if="rows.length > 0"
              outline
              color="secondary"
              icon="star"
              label="Set All to Max Score"
              class="q-mr-sm"
              @click="setAllToMax"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <!-- Spreadsheet-Style Table Card -->
    <q-card v-if="classId" flat bordered>
      <q-card-section>
        <div class="text-subtitle2 q-mb-md font-weight-medium text-grey-8">
          Class Students Score List
        </div>
      </q-card-section>

      <q-card-section v-if="loadingLearners" class="text-center q-pa-lg">
        <q-spinner color="primary" size="lg" />
        <div class="text-caption q-mt-sm">Loading learners...</div>
      </q-card-section>

      <q-card-section v-else-if="rows.length === 0" class="text-center q-pa-xl text-grey-7">
        <q-icon name="groups" size="48px" />
        <div>No active learners found in this class.</div>
        <div class="text-caption">Enroll active learners in the class page to record scores.</div>
      </q-card-section>

      <template v-else>
        <q-table
          :rows="rows"
          :columns="columns"
          row-key="learner_id"
          :pagination="{ rowsPerPage: 50 }"
          flat
          dense
          binary-state-sort
        >
          <template #body-cell-score="props">
            <q-td :props="props">
              <q-input
                v-model.number="props.row.score_value"
                type="number"
                dense
                outlined
                hide-bottom-space
                style="max-width: 120px"
                :rules="[
                  (val) =>
                    val === '' ||
                    val === null ||
                    val === undefined ||
                    (val >= 0 && val <= maxScore) ||
                    'Out of range',
                ]"
                :error="props.row.score_value > maxScore || props.row.score_value < 0"
                error-message="Invalid"
              />
            </q-td>
          </template>

          <template #body-cell-percent="props">
            <q-td :props="props">
              <q-chip
                :color="getPercentColor(props.row.score_value)"
                text-color="white"
                dense
                square
              >
                {{ computePercent(props.row.score_value) }}%
              </q-chip>
            </q-td>
          </template>

          <template #body-cell-notes="props">
            <q-td :props="props">
              <q-input v-model="props.row.notes" dense outlined label="Optional notes" />
            </q-td>
          </template>
        </q-table>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            flat
            color="grey-7"
            label="Cancel"
            :to="'/school/classes/' + (classId || '')"
            class="q-mr-sm"
          />
          <q-btn
            color="primary"
            icon="save"
            label="Save All Scores"
            :loading="isSaving"
            @click="validateAndSave"
          />
        </q-card-actions>
      </template>
    </q-card>

    <div v-else class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders border-dashed">
      <q-icon name="school" size="48px" />
      <div>No Class selected. Access this page through a Class Detail panel.</div>
    </div>

    <!-- Duplicate Warning Dialog -->
    <q-dialog v-model="showDupWarning" persistent>
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <q-avatar icon="warning" color="warning" text-color="white" />
          <span class="q-ml-sm text-h6">Overwrite Existing Scores?</span>
        </q-card-section>

        <q-card-section class="q-pt-none">
          There are already <strong>{{ existingMatchesCount }}</strong> recorded scores for this
          class, subject, and date. Do you want to overwrite them or cancel?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Cancel" color="primary" />
          <q-btn flat label="Overwrite" color="warning" @click="saveScores(true)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useSchoolStore } from '../stores/school-store';
import { useClassStore } from '../stores/class-store';
import { normalizeClassId } from '../utils/school-utils';
import { SUBJECTS, ASSESSMENT_TYPES, TERMS } from '../utils/school-constants';
import { useAcademicTermsStore } from '../stores/academic-terms-store';
import { computeScorePercent } from '../utils/school-utils';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const learnerStore = useLearnerStore();
const schoolStore = useSchoolStore();
const classStore = useClassStore();
const termsStore = useAcademicTermsStore();

const headerForm = ref(null);
const classId = ref(null);
const subject = ref(null);
const assessmentType = ref(null);
const term = ref(null);
const academicYear = ref(new Date().getFullYear());
const assessmentDate = ref(new Date().toISOString().slice(0, 10));
const maxScore = ref(100);

const rows = ref([]);
const loadingLearners = ref(false);
const isSaving = ref(false);

const showDupWarning = ref(false);
const existingMatchesCount = ref(0);
const preExistingScoresMap = ref({}); // learner_id -> test_score_row

const classOptions = computed(() => {
  return classStore.classes.map((c) => ({
    label: c.name,
    value: c.$id,
  }));
});

/**
 * Term options for the dropdown, loaded from school_academic_terms for the selected year.
 * Falls back to the static TERMS constant if no DB terms are configured yet (e.g. first run).
 * Term names are plain strings — exactly what gets stored in test_scores.term.
 */
const termOptions = computed(() => {
  const dbTerms = termsStore.termsByYear(academicYear.value);
  if (dbTerms.length > 0) {
    return dbTerms.map((t) => t.term_name);
  }
  // Fallback to static list when no terms are configured in DB
  return TERMS;
});

/**
 * True when the DB is loaded but has no terms configured for the selected academic year.
 * In this case, termOptions falls back to the static TERMS constant.
 * Used to show a warning prompting the admin to configure terms.
 */
const hasNoDbTermsForYear = computed(() => {
  return termsStore.academicTermsLoaded && termsStore.termsByYear(academicYear.value).length === 0;
});

// If the user changes the academic year, invalidate any term that no longer exists
// for the new year so we don't silently save stale term names.
watch(academicYear, () => {
  if (term.value && !termOptions.value.includes(term.value)) {
    term.value = termOptions.value[0] || null;
  }
});

// When the assessment date changes, update the term to the one whose range contains the date.
// This keeps the term dropdown consistent with the selected assessment date.
watch(assessmentDate, () => {
  if (!assessmentDate.value || termOptions.value.length === 0) return;
  const dateTerm = termsStore.getTermForDate(assessmentDate.value);
  if (dateTerm && termOptions.value.includes(dateTerm.term_name)) {
    term.value = dateTerm.term_name;
  }
});

const columns = [
  { name: 'name', label: 'Learner Name', field: 'learner_name', align: 'left', sortable: true },
  { name: 'score', label: 'Score', field: 'score_value', align: 'left' },
  { name: 'percent', label: '%', align: 'left' },
  { name: 'notes', label: 'Notes', field: 'notes', align: 'left' },
];

onMounted(async () => {
  // Fetch classes, learners, and terms in parallel for best performance
  await Promise.all([
    classStore.fetchClasses(),
    learnerStore.fetchLearners(),
    termsStore.fetchAcademicTerms(),
  ]);

  classId.value = route.params.id;

  // Prepopulate from query parameters (for editing or direct linking)
  if (route.query.subject) {
    subject.value = route.query.subject || null;
    assessmentType.value = route.query.assessmentType || null;
    term.value = route.query.term || null;
    if (route.query.year) academicYear.value = Number(route.query.year);
    if (route.query.date) assessmentDate.value = route.query.date;
    if (route.query.maxScore) maxScore.value = Number(route.query.maxScore);
  }

  // Auto-select the term for the assessment date if no term is set from query params.
  // Finds the term whose date range contains the assessment date, or falls back to the first term.
  if (!term.value && termOptions.value.length > 0) {
    const dateTerm = termsStore.getTermForDate(assessmentDate.value || new Date());
    if (dateTerm && termOptions.value.includes(dateTerm.term_name)) {
      term.value = dateTerm.term_name;
    } else {
      term.value = termOptions.value[0];
    }
  }

  if (classId.value) {
    await onClassChange(classId.value);
  }
});

async function onClassChange(targetClassId) {
  if (!targetClassId) {
    rows.value = [];
    return;
  }
  loadingLearners.value = true;
  try {
    await learnerStore.fetchLearners();
    await schoolStore.fetchTestScores(); // Ensure scores are loaded to check existence

    const activeLearners = classStore.getActiveLearnersByClass(targetClassId);

    // Filter existing scores matching this header combination
    const dateStr = assessmentDate.value;
    const existingScores = schoolStore.testScores.filter(
      (s) =>
        s.subject === subject.value &&
        s.assessment_type === assessmentType.value &&
        s.term === term.value &&
        s.academic_year === academicYear.value &&
        s.assessment_date.slice(0, 10) === dateStr &&
        (s.class_id_normalized || normalizeClassId(s.class_id)) === targetClassId,
    );

    const existingMap = {};
    existingScores.forEach((s) => {
      existingMap[s.learner_id_normalized] = s;
    });

    rows.value = activeLearners.map((l) => {
      const match = existingMap[l.$id];
      return {
        learner_id: l.$id,
        learner_name: learnerStore.getLearnerName(l),
        score_value: match ? match.score_value : null,
        notes: match ? match.notes || '' : '',
        $id: match ? match.$id : null, // Stores Appwrite $id if editing existing
      };
    });
  } finally {
    loadingLearners.value = false;
  }
}

function computePercent(val) {
  if (val === '' || val === null || val === undefined) return 0;
  return computeScorePercent(val, maxScore.value);
}

function getPercentColor(val) {
  const p = computePercent(val);
  if (p < 50) return 'negative';
  if (p < 60) return 'warning';
  return 'positive';
}

function setAllToMax() {
  rows.value.forEach((r) => {
    r.score_value = maxScore.value;
  });
}

function onMaxScoreChange() {
  // Clear any inputs that now exceed the new max score
  rows.value.forEach((r) => {
    if (r.score_value > maxScore.value) {
      r.score_value = null;
    }
  });
}

async function validateAndSave() {
  const formOk = await headerForm.value.validate();
  if (!formOk) return;

  // Validate that all rows have a score filled in
  const missing = rows.value.filter(
    (r) => r.score_value === null || r.score_value === undefined || r.score_value === '',
  );

  if (missing.length > 0) {
    $q.notify({
      type: 'warning',
      message: `Please fill in test scores for all ${missing.length} remaining learners.`,
    });
    return;
  }

  // Validate range
  const outOfRange = rows.value.filter((r) => r.score_value < 0 || r.score_value > maxScore.value);
  if (outOfRange.length > 0) {
    $q.notify({
      type: 'negative',
      message: 'Scores must be between 0 and Max Score.',
    });
    return;
  }

  // Check duplicates (Option C - Load and check)
  isSaving.value = true;
  try {
    await schoolStore.fetchTestScores(true); // reload scores to avoid stale cache

    // Search local scores matching assessment header
    const searchDate = assessmentDate.value;
    const matches = schoolStore.testScores.filter((score) => {
      const matchHeader =
        score.subject === subject.value &&
        score.assessment_type === assessmentType.value &&
        score.term === term.value &&
        score.academic_year === academicYear.value &&
        score.assessment_date.slice(0, 10) === searchDate &&
        (score.class_id_normalized || normalizeClassId(score.class_id)) === classId.value;
      return matchHeader;
    });

    if (matches.length > 0) {
      existingMatchesCount.value = matches.length;
      preExistingScoresMap.value = {};
      matches.forEach((m) => {
        preExistingScoresMap.value[m.learner_id_normalized] = m;
      });

      // Update rows with their existing DB row ID to overwrite correctly
      rows.value.forEach((row) => {
        const pre = preExistingScoresMap.value[row.learner_id];
        if (pre) {
          row.$id = pre.$id;
        }
      });

      showDupWarning.value = true;
      isSaving.value = false;
    } else {
      // Safe to save immediately
      await saveScores(false);
    }
  } catch (error) {
    console.error('RecordScores: duplicate checking failed', error);
    isSaving.value = false;
  }
}

async function saveScores(overwrite = false) {
  showDupWarning.value = false;
  isSaving.value = true;

  try {
    const payload = rows.value.map((row) => {
      const rowPayload = {
        learner_id: row.learner_id,
        class_id: classId.value,
        subject: subject.value,
        assessment_type: assessmentType.value,
        term: term.value,
        academic_year: academicYear.value,
        assessment_date: new Date(assessmentDate.value).toISOString(),
        score_value: row.score_value,
        max_score: maxScore.value,
        notes: row.notes,
      };

      if (overwrite && row.$id) {
        rowPayload.$id = row.$id;
      }
      return rowPayload;
    });

    const result = await schoolStore.saveTestScores(payload);
    if (result.success) {
      $q.notify({
        type: 'positive',
        message: overwrite
          ? 'Scores updated (overwritten) successfully.'
          : 'Scores recorded successfully.',
      });
      router.push(`/school/classes/${classId.value}?tab=performance`);
    }
  } finally {
    isSaving.value = false;
  }
}
</script>
