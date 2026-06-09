<!--
  LearnerDetailPage.vue (Story 4.1)
  Tabbed learner detail page. Tabs are designed so future stories fill in
  content without restructuring the page:
    - Overview (this story): personal, enrollment, guardian info
    - Academics (Story 4.2 placeholder)
    - Attendance (Story 4.3 placeholder)
    - Interventions (Story 4.5 placeholder)
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/learners" class="q-mr-sm">
        <q-tooltip>Back to Learners</q-tooltip>
      </q-btn>
      <div>
        <div class="text-h5">
          <q-skeleton v-if="isLoading" type="text" width="200px" />
          <span v-else>{{ learnerName || 'Learner' }}</span>
        </div>
        <div v-if="learner" class="text-caption text-grey-7">
          {{ learner.grade_level }} ·
          <EnrollmentStatusBadge :status="learner.enrollment_status" />
        </div>
      </div>
      <q-space />
      <q-btn
        v-if="canAdmin && learner"
        color="primary"
        icon="edit"
        label="Edit"
        :to="`/school/learners/${learner.$id}/edit`"
        class="q-mr-sm"
      />
      <q-btn
        v-if="canAdmin && learner"
        flat
        color="negative"
        icon="delete"
        label="Delete"
        @click="confirmDelete"
      />
    </div>

    <q-card v-if="isLoading" flat bordered>
      <q-card-section>
        <q-skeleton type="rect" height="300px" />
      </q-card-section>
    </q-card>

    <template v-else-if="learner">
      <q-tabs
        v-model="activeTab"
        dense
        align="left"
        class="text-grey-7"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="overview" label="Overview" icon="person" />
        <q-tab name="academics" label="Academics" icon="quiz" />
        <q-tab name="attendance" label="Attendance" icon="event_available" />
        <q-tab name="interventions" label="Interventions" icon="support" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Overview Tab -->
        <q-tab-panel name="overview" class="q-pa-none q-pt-md">
          <div class="row q-col-gutter-md">
            <!-- Personal Info (read-only, from resident) -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Personal Information</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    From the resident registry (read-only)
                  </div>
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Full Name</q-item-label>
                        <q-item-label>{{ learnerName || '—' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Date of Birth</q-item-label>
                        <q-item-label>{{ formatDate(resident?.dob) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Gender</q-item-label>
                        <q-item-label>{{ resident?.gender || '—' }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item
                      :clickable="!!householdId"
                      :to="householdId ? `/households/${householdId}` : undefined"
                    >
                      <q-item-section>
                        <q-item-label caption>Household</q-item-label>
                        <q-item-label :class="{ 'text-primary': !!householdId }">
                          {{ householdName || '—' }}
                          <q-icon v-if="householdId" name="open_in_new" size="xs" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- Enrollment Info -->
            <div class="col-12 col-md-6">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Enrollment Information</div>
                  <q-list dense>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Grade Level</q-item-label>
                        <q-item-label>{{ learner.grade_level }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Enrollment Date</q-item-label>
                        <q-item-label>{{ formatDate(learner.enrollment_date) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption>Status</q-item-label>
                        <q-item-label>
                          <EnrollmentStatusBadge :status="learner.enrollment_status" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="learner.status_effective_date">
                      <q-item-section>
                        <q-item-label caption>Status Effective Date</q-item-label>
                        <q-item-label>{{ formatDate(learner.status_effective_date) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- Guardian Info -->
            <div class="col-12">
              <q-card flat bordered>
                <q-card-section>
                  <div class="text-h6 q-mb-sm">Guardian & Medical Information</div>
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Parent/Guardian</div>
                      <div>{{ learner.parent_guardian_name || '—' }}</div>
                      <div class="text-caption">{{ learner.parent_guardian_phone || '' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Emergency Contact</div>
                      <div>{{ learner.emergency_contact_name || '—' }}</div>
                      <div class="text-caption">{{ learner.emergency_contact_phone || '' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Medical Notes</div>
                      <div>{{ learner.medical_notes || '—' }}</div>
                    </div>
                    <div class="col-12 col-sm-3">
                      <div class="text-caption text-grey-7">Additional Notes</div>
                      <div>{{ learner.notes || '—' }}</div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Academics Tab (Story 4.2 placeholder) -->
        <q-tab-panel name="academics">
          <div class="text-center q-pa-xl text-grey-7">
            <q-icon name="quiz" size="48px" class="q-mb-sm" />
            <div>No test scores recorded yet.</div>
            <div class="text-caption">Test score recording coming in Story 4.2.</div>
          </div>
        </q-tab-panel>

        <!-- Attendance Tab (Story 4.3 placeholder) -->
        <q-tab-panel name="attendance">
          <div class="text-center q-pa-xl text-grey-7">
            <q-icon name="event_available" size="48px" class="q-mb-sm" />
            <div>No attendance recorded yet.</div>
            <div class="text-caption">Attendance tracking coming in Story 4.3.</div>
          </div>
        </q-tab-panel>

        <!-- Interventions Tab (Story 4.5 placeholder) -->
        <q-tab-panel name="interventions">
          <div class="text-center q-pa-xl text-grey-7">
            <q-icon name="support" size="48px" class="q-mb-sm" />
            <div>No interventions recorded yet.</div>
            <div class="text-caption">Intervention tracking coming in Story 4.5.</div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <q-card v-else flat bordered>
      <q-card-section class="text-center q-pa-xl text-grey-7">
        <q-icon name="person_off" size="48px" class="q-mb-sm" />
        <div>Learner not found.</div>
        <q-btn
          flat
          color="primary"
          label="Back to Learners"
          to="/school/learners"
          class="q-mt-sm"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar, date } from 'quasar';
import { tables } from 'src/boot/appwrite';
import { useSchoolStore } from '../stores/school-store';
import { usePermissions } from 'src/composables/usePermissions';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const schoolStore = useSchoolStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));

const activeTab = ref('overview');
const householdName = ref('');
const householdId = ref(null);

const isLoading = computed(() => schoolStore.isCurrentLearnerLoading);
const learner = computed(() => schoolStore.currentLearner);
const resident = computed(() => learner.value?.resident || null);
const learnerName = computed(() =>
  learner.value ? schoolStore.getLearnerName(learner.value) : '',
);

function formatDate(isoString) {
  if (!isoString) return '—';
  const [y, m, d] = isoString.slice(0, 10).split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  return date.formatDate(localDate, 'DD MMM YYYY');
}

async function loadHousehold() {
  householdName.value = '';
  householdId.value = null;
  const householdRef = resident.value?.household_id;
  if (!householdRef) return;

  if (typeof householdRef === 'object') {
    householdId.value = householdRef.$id;
    householdName.value = householdRef.name || '';
    return;
  }
  householdId.value = householdRef;
  try {
    const household = await tables.getRow({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
      rowId: householdRef,
    });
    householdName.value = household.name || '';
  } catch (error) {
    console.error('LearnerDetailPage: failed to load household', error);
  }
}

async function loadLearner() {
  await schoolStore.fetchLearnerById(route.params.id);
  const l = schoolStore.currentLearner;

  // If Appwrite didn't expand the resident_id relationship, fetch it directly
  if (l && !l.resident && l.resident_id_normalized) {
    try {
      const r = await tables.getRow({
        databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS,
        rowId: l.resident_id_normalized,
      });
      const parts = [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' ');
      schoolStore.patchCurrentLearner({
        resident: r,
        resident_full_name: parts,
      });
    } catch (e) {
      console.error('LearnerDetailPage: failed to load resident', e);
    }
  }

  await loadHousehold();
}

function confirmDelete() {
  $q.dialog({
    title: 'Delete Learner Record',
    message: `Are you sure you want to delete the learner record for ${learnerName.value || 'this learner'}? This cannot be undone.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative' },
  }).onOk(async () => {
    const result = await schoolStore.deleteLearner(learner.value.$id);
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Learner record deleted.' });
      router.push('/school/learners');
    }
  });
}

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) loadLearner();
  },
);

onMounted(() => {
  loadLearner();
});
</script>
