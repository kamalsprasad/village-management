<!--
  InterventionDetailPage.vue (Story 4.8)
  Full detail view of a single intervention plan: details, live at-risk
  status, and the progress notes timeline (append-only).
-->
<template>
  <q-page padding>
    <div v-if="isLoading" class="q-pa-xl text-center">
      <q-skeleton type="rect" height="300px" />
    </div>

    <template v-else-if="intervention">
      <div class="row items-center q-mb-md">
        <q-btn flat dense round icon="arrow_back" to="/school/interventions" class="q-mr-sm">
          <q-tooltip>Back to Interventions</q-tooltip>
        </q-btn>
        <div>
          <router-link
            :to="`/school/learners/${intervention.learner_id_normalized}`"
            class="text-h6 text-primary"
            style="text-decoration: none"
          >
            {{ learnerName }}
          </router-link>
          <div class="text-caption text-grey-7">{{ intervention.intervention_type }}</div>
        </div>
        <InterventionStatusBadge :status="intervention.status" class="q-ml-md" />
        <q-space />
        <q-btn
          v-if="hasPermission('school:write')"
          flat
          color="primary"
          icon="edit"
          label="Edit"
          :to="`/school/interventions/${intervention.$id}/edit`"
        />
        <q-btn
          v-if="hasPermission('school:admin')"
          flat
          color="negative"
          icon="delete"
          label="Delete"
          @click="confirmDelete"
        />
      </div>

      <div class="row q-col-gutter-md">
        <!-- At-Risk Status Panel -->
        <div class="col-12">
          <q-banner class="bg-grey-2 rounded-borders">
            <template #avatar>
              <q-icon
                :name="
                  atRiskInfo ? 'warning' : atRiskNotComputed ? 'hourglass_top' : 'check_circle'
                "
                :color="atRiskInfo ? 'negative' : atRiskNotComputed ? 'grey-7' : 'positive'"
              />
            </template>
            <div class="text-weight-medium">
              {{
                atRiskInfo
                  ? `At Risk — ${atRiskInfo.reasons.map((r) => r.detail).join(', ')}`
                  : atRiskNotComputed
                    ? 'At-risk status not yet computed — refreshing...'
                    : 'Good Standing'
              }}
            </div>
            <div class="text-caption text-grey-7">
              At-risk status is calculated from current attendance and scores — it updates
              automatically. This is independent of the intervention's status below.
            </div>
          </q-banner>
        </div>

        <!-- Intervention Details -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Intervention Details</div>
              <q-list dense>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Assigned Teacher</q-item-label>
                    <q-item-label>{{ teacherName }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Focus Areas</q-item-label>
                    <q-item-label>
                      <q-chip
                        v-for="area in intervention.focus_areas || []"
                        :key="area"
                        dense
                        size="sm"
                      >
                        {{ area }}
                      </q-chip>
                      <span v-if="!intervention.focus_areas?.length" class="text-grey-6">—</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Start Date</q-item-label>
                    <q-item-label>{{ formatDate(intervention.start_date) }}</q-item-label>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label caption>End Date</q-item-label>
                    <q-item-label>{{
                      intervention.end_date ? formatDate(intervention.end_date) : 'No end date'
                    }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Frequency</q-item-label>
                    <q-item-label>{{ intervention.frequency || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Success Criteria</q-item-label>
                    <q-item-label>{{ intervention.success_criteria || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Academic Term</q-item-label>
                    <q-item-label>{{
                      intervention.term
                        ? `${intervention.term} (${intervention.academic_year})`
                        : '—'
                    }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="intervention.notes">
                  <q-item-section>
                    <q-item-label caption>Notes</q-item-label>
                    <q-item-label>{{ intervention.notes }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>

          <!-- Outcome -->
          <q-card
            v-if="
              intervention.status === 'Resolved' ||
              intervention.status === 'Closed Without Resolution'
            "
            flat
            bordered
            class="q-mt-md"
          >
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Outcome</div>
              <div>{{ intervention.outcome || 'No outcome recorded.' }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Progress Notes -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="text-subtitle1 q-mb-sm">Progress Notes</div>

              <div v-if="notes.length === 0" class="text-center q-pa-md text-grey-7">
                No progress notes yet. Add the first note below.
              </div>

              <q-list separator>
                <q-item v-for="note in notes" :key="note.$id">
                  <q-item-section>
                    <div class="row items-center q-gutter-sm">
                      <span class="text-weight-medium text-caption">{{
                        formatDateTime(note.note_date)
                      }}</span>
                      <span class="text-caption text-grey-7">{{
                        resolveAuthorName(note.author_id)
                      }}</span>
                      <q-chip
                        v-if="note.learner_response"
                        dense
                        size="sm"
                        :color="getResponseColor(note.learner_response)"
                        text-color="white"
                      >
                        {{ note.learner_response }}
                      </q-chip>
                    </div>
                    <q-item-label class="q-mt-xs">{{ note.content }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-if="notes.length > 0" class="text-caption text-grey-6 q-mt-sm">
                Notes cannot be edited or deleted after saving.
              </div>

              <!-- Add Note Form -->
              <q-separator class="q-my-md" />
              <div v-if="hasPermission('school:write')">
                <q-input
                  v-model="newNoteContent"
                  label="Add a progress note"
                  outlined
                  type="textarea"
                  maxlength="2000"
                />
                <q-select
                  v-model="newNoteResponse"
                  :options="
                    LEARNER_RESPONSE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))
                  "
                  label="Learner Response (optional)"
                  outlined
                  clearable
                  emit-value
                  map-options
                  class="q-mt-sm"
                />
                <div class="row justify-end q-mt-sm">
                  <q-btn
                    color="primary"
                    label="Add Note"
                    :disable="!newNoteContent.trim()"
                    :loading="isAddingNote"
                    @click="onAddNote"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <q-card v-else flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-7">
        <q-icon name="support" size="48px" class="q-mb-sm" />
        <div>Intervention not found.</div>
        <q-btn
          flat
          color="primary"
          label="Back to Interventions"
          to="/school/interventions"
          class="q-mt-sm"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, date } from 'quasar';
import { useLearnerStore } from '../stores/learner-store';
import { useTeacherStore } from '../stores/teacher-store';
import { useAtRiskStore } from '../stores/at-risk-store';
import { useInterventionStore } from '../stores/intervention-store';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';
import { LEARNER_RESPONSE_OPTIONS } from '../utils/school-constants';
import InterventionStatusBadge from '../components/InterventionStatusBadge.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const { hasPermission } = usePermissions();

const learnerStore = useLearnerStore();
const teacherStore = useTeacherStore();
const atRiskStore = useAtRiskStore();
const interventionStore = useInterventionStore();
const authStore = useAuthStore();

const isLoading = ref(true);
const isAddingNote = ref(false);
const newNoteContent = ref('');
const newNoteResponse = ref(null);

const intervention = computed(
  () => interventionStore.interventions.find((i) => i.$id === route.params.id) || null,
);

const notes = computed(() =>
  intervention.value ? interventionStore.getNotesForIntervention(intervention.value.$id) : [],
);

const learnerName = computed(() => {
  if (!intervention.value) return '';
  const learner = learnerStore.learners.find(
    (l) => l.$id === intervention.value.learner_id_normalized,
  );
  return learner ? learnerStore.getLearnerName(learner) : 'Unknown Learner';
});

const teacherName = computed(() => {
  if (!intervention.value?.assigned_teacher_id_normalized) return 'Unassigned';
  const match = teacherStore.teacherAssignments.find(
    (a) => a.teacher_id_normalized === intervention.value.assigned_teacher_id_normalized,
  );
  return match ? match.teacher_name : 'Unknown Teacher';
});

const atRiskInfo = computed(() => {
  if (!intervention.value) return null;
  return atRiskStore.getLearnerRisk(intervention.value.learner_id_normalized);
});

const atRiskNotComputed = computed(() => !atRiskStore.lastComputedAt);

function formatDate(isoString) {
  if (!isoString) return '—';
  return date.formatDate(new Date(isoString), 'DD MMM YYYY');
}

function formatDateTime(isoString) {
  if (!isoString) return '—';
  return date.formatDate(new Date(isoString), 'DD MMM YYYY HH:mm');
}

function resolveAuthorName(authorId) {
  if (!authorId) return 'Unknown';
  const match = teacherStore.teacherAssignments.find((a) => a.teacher_id_normalized === authorId);
  return match ? match.teacher_name : 'Unknown';
}

function getResponseColor(value) {
  const match = LEARNER_RESPONSE_OPTIONS.find((o) => o.value === value);
  return match ? match.color : 'grey';
}

async function onAddNote() {
  if (!intervention.value || !newNoteContent.value.trim()) return;
  isAddingNote.value = true;
  try {
    const result = await interventionStore.addNote(intervention.value.$id, {
      content: newNoteContent.value.trim(),
      learner_response: newNoteResponse.value,
      author_id: authStore.user?.resident_id || null,
    });
    if (result.success) {
      newNoteContent.value = '';
      newNoteResponse.value = null;
      $q.notify({ type: 'positive', message: 'Progress note added.' });
    }
  } finally {
    isAddingNote.value = false;
  }
}

function confirmDelete() {
  $q.dialog({
    title: 'Delete Intervention',
    message: `Delete intervention '${intervention.value.intervention_type}' for ${learnerName.value}? This action cannot be undone.`,
    cancel: true,
    persistent: true,
    color: 'negative',
  }).onOk(async () => {
    const result = await interventionStore.deleteIntervention(intervention.value.$id);
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Intervention deleted.' });
      router.push('/school/interventions');
    }
  });
}

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([
    learnerStore.fetchLearners(),
    teacherStore.fetchTeacherAssignments(),
    interventionStore.fetchInterventions(),
  ]);
  if (!atRiskStore.lastComputedAt) {
    await atRiskStore.computeAtRisk();
  }
  if (intervention.value) {
    await interventionStore.fetchNotesForIntervention(intervention.value.$id);
  }
  isLoading.value = false;
});
</script>
