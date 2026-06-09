<!--
  LearnerForm.vue (Story 4.1)
  Reusable enroll/edit form for learners.

  - Create mode: resident is selectable; duplicate enrollment is detected on
    selection (Option A: one learner row per resident, ever) and a banner
    offers navigation to the existing record.
  - Edit mode: resident is locked; grade promotion and status changes allowed.
    Status changes to Graduated/Transferred/Dropped Out require an effective date.

  Emits:
    - submit(payload): validated learner data ready for the store
    - cancel
-->
<template>
  <q-form ref="formRef" greedy @submit.prevent="onSubmit">
    <div class="row q-col-gutter-md">
      <!-- Resident Selection -->
      <div class="col-12">
        <ResidentSearchInput
          v-model="form.resident_id"
          label="Resident *"
          hint="Search by first or last name (min 3 characters)"
          :disable="isEditMode"
          :rules="[(val) => !!val || 'Resident is required']"
          @select="onResidentSelected"
        />
      </div>

      <!-- Duplicate enrollment banner (create mode) -->
      <div v-if="existingLearner" class="col-12">
        <q-banner
          :class="existingLearner.enrollment_status === 'Active' ? 'bg-negative' : 'bg-warning'"
          :text-color="existingLearner.enrollment_status === 'Active' ? 'white' : 'black'"
          rounded
          dense
        >
          <template #avatar>
            <q-icon
              :name="existingLearner.enrollment_status === 'Active' ? 'error' : 'info'"
              :color="existingLearner.enrollment_status === 'Active' ? 'white' : 'black'"
            />
          </template>
          <span v-if="existingLearner.enrollment_status === 'Active'">
            {{ existingLearnerName }} is already enrolled as an active learner.
          </span>
          <span v-else>
            {{ existingLearnerName }} has a previous enrollment ({{
              existingLearner.enrollment_status
            }}). Edit the existing record to re-enroll.
          </span>
          <template #action>
            <q-btn
              flat
              dense
              label="View Existing Record"
              @click="$router.push(`/school/learners/${existingLearner.$id}/edit`)"
            />
          </template>
        </q-banner>
      </div>

      <!-- Auto-populated resident info (read-only) -->
      <template v-if="selectedResident">
        <div class="col-12">
          <q-card flat bordered class="bg-grey-1">
            <q-card-section class="q-py-sm">
              <div class="text-caption text-grey-7 q-mb-xs">Resident Information (read-only)</div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-3">
                  <div class="text-caption text-grey-6">Full Name</div>
                  <div>{{ residentFullName }}</div>
                </div>
                <div class="col-12 col-sm-3">
                  <div class="text-caption text-grey-6">Date of Birth</div>
                  <div>{{ residentDob || '—' }}</div>
                </div>
                <div class="col-12 col-sm-3">
                  <div class="text-caption text-grey-6">Gender</div>
                  <div>{{ selectedResident.gender || '—' }}</div>
                </div>
                <div class="col-12 col-sm-3">
                  <div class="text-caption text-grey-6">Household</div>
                  <div>{{ householdName || '—' }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </template>

      <!-- Grade Level -->
      <div class="col-12 col-sm-6">
        <q-select
          v-model="form.grade_level"
          :options="gradeLevelOptions"
          label="Grade Level *"
          outlined
          emit-value
          map-options
          :rules="[(val) => !!val || 'Grade level is required']"
        />
      </div>

      <!-- Enrollment Date -->
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.enrollment_date"
          label="Enrollment Date *"
          type="date"
          outlined
          stack-label
          :rules="[(val) => !!val || 'Enrollment date is required']"
        />
      </div>

      <!-- Enrollment Status (edit mode only) -->
      <template v-if="isEditMode">
        <div class="col-12 col-sm-6">
          <q-select
            v-model="form.enrollment_status"
            :options="statusOptions"
            label="Enrollment Status *"
            outlined
            emit-value
            map-options
            :rules="[(val) => !!val || 'Status is required']"
          />
        </div>

        <!-- Status Effective Date (required for terminal statuses, AC6) -->
        <div v-if="requiresEffectiveDate" class="col-12 col-sm-6">
          <q-input
            v-model="form.status_effective_date"
            :label="`${form.enrollment_status} Effective Date *`"
            type="date"
            outlined
            stack-label
            :rules="[(val) => !!val || 'Effective date is required for this status']"
          />
        </div>
      </template>

      <!-- Guardian Info -->
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.parent_guardian_name"
          label="Parent/Guardian Name"
          outlined
          maxlength="255"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.parent_guardian_phone"
          label="Parent/Guardian Phone"
          outlined
          maxlength="20"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.emergency_contact_name"
          label="Emergency Contact Name"
          outlined
          maxlength="255"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-input
          v-model="form.emergency_contact_phone"
          label="Emergency Contact Phone"
          outlined
          maxlength="20"
        />
      </div>

      <!-- Notes -->
      <div class="col-12">
        <q-input
          v-model="form.medical_notes"
          label="Medical Notes"
          type="textarea"
          outlined
          autogrow
          maxlength="1000"
          hint="Allergies, conditions, medications, etc."
        />
      </div>
      <div class="col-12">
        <q-input
          v-model="form.notes"
          label="Additional Notes"
          type="textarea"
          outlined
          autogrow
          maxlength="1000"
        />
      </div>
    </div>

    <div class="row justify-end q-gutter-sm q-mt-md">
      <q-btn flat label="Cancel" color="grey-7" @click="$emit('cancel')" />
      <q-btn
        type="submit"
        :label="isEditMode ? 'Save Changes' : 'Enroll Learner'"
        color="primary"
        :loading="submitting"
        :disable="!!(existingLearner && !isEditMode)"
      />
    </div>
  </q-form>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { tables } from 'src/boot/appwrite';
import { useSchoolStore } from '../stores/school-store';
import { GRADE_LEVELS, ENROLLMENT_STATUSES, STATUSES_REQUIRING_EFFECTIVE_DATE } from '../utils/school-constants';
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';

const props = defineProps({
  // Existing learner row for edit mode; null for create mode
  learner: {
    type: Object,
    default: null,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['submit', 'cancel']);

const schoolStore = useSchoolStore();

const formRef = ref(null);
const selectedResident = ref(null);
const householdName = ref('');
const existingLearner = ref(null);

const isEditMode = computed(() => !!props.learner);

const gradeLevelOptions = GRADE_LEVELS.map((g) => ({ label: g, value: g }));
const statusOptions = ENROLLMENT_STATUSES.map((s) => ({ label: s.label, value: s.value }));

/**
 * Convert an ISO datetime to a 'YYYY-MM-DD' date input value
 */
function toDateInputValue(isoString) {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

/**
 * Today's date as 'YYYY-MM-DD'
 */
function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

const form = ref({
  resident_id: null,
  grade_level: null,
  enrollment_date: todayDateValue(),
  enrollment_status: 'Active',
  status_effective_date: '',
  parent_guardian_name: '',
  parent_guardian_phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  medical_notes: '',
  notes: '',
});

const requiresEffectiveDate = computed(() =>
  STATUSES_REQUIRING_EFFECTIVE_DATE.includes(form.value.enrollment_status),
);

const residentFullName = computed(() => {
  if (!selectedResident.value) return '';
  const r = selectedResident.value;
  return [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' ');
});

const residentDob = computed(() => {
  if (!selectedResident.value || !selectedResident.value.date_of_birth) return '';
  return toDateInputValue(selectedResident.value.date_of_birth);
});

const existingLearnerName = computed(() => {
  if (!existingLearner.value) return 'This resident';
  return schoolStore.getLearnerName(existingLearner.value) || residentFullName.value || 'This resident';
});

/**
 * Resident selected in the search input — populate read-only info and
 * check for an existing learner record (create mode only).
 */
async function onResidentSelected(option) {
  selectedResident.value = option?.raw || null;
  householdName.value = '';
  existingLearner.value = null;

  if (!selectedResident.value) return;

  // Resolve household name for the read-only preview
  await loadHouseholdName(selectedResident.value.household_id);

  // Duplicate check (Option A: one learner row per resident, ever)
  if (!isEditMode.value && option?.id) {
    try {
      existingLearner.value = await schoolStore.checkExistingEnrollment(option.id);
    } catch (error) {
      console.error('LearnerForm: duplicate enrollment check failed', error);
    }
  }
}

async function loadHouseholdName(householdRef) {
  if (!householdRef) return;
  // Relationship may be an embedded object or a plain ID
  if (typeof householdRef === 'object') {
    householdName.value = householdRef.name || '';
    return;
  }
  try {
    const household = await tables.getRow({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
      rowId: householdRef,
    });
    householdName.value = household.name || '';
  } catch (error) {
    console.error('LearnerForm: failed to load household', error);
  }
}

/**
 * Pre-populate form for edit mode
 */
function populateFromLearner(learner) {
  form.value = {
    resident_id: learner.resident_id_normalized || null,
    grade_level: learner.grade_level,
    enrollment_date: toDateInputValue(learner.enrollment_date),
    enrollment_status: learner.enrollment_status,
    status_effective_date: toDateInputValue(learner.status_effective_date),
    parent_guardian_name: learner.parent_guardian_name || '',
    parent_guardian_phone: learner.parent_guardian_phone || '',
    emergency_contact_name: learner.emergency_contact_name || '',
    emergency_contact_phone: learner.emergency_contact_phone || '',
    medical_notes: learner.medical_notes || '',
    notes: learner.notes || '',
  };
  if (learner.resident) {
    selectedResident.value = learner.resident;
    loadHouseholdName(learner.resident.household_id);
  }
}

watch(
  () => props.learner,
  (learner) => {
    if (learner) populateFromLearner(learner);
  },
);

onMounted(() => {
  if (props.learner) populateFromLearner(props.learner);
});

function onSubmit() {
  const payload = {
    resident_id: form.value.resident_id,
    grade_level: form.value.grade_level,
    enrollment_date: new Date(form.value.enrollment_date).toISOString(),
    enrollment_status: form.value.enrollment_status,
    status_effective_date:
      requiresEffectiveDate.value && form.value.status_effective_date
        ? new Date(form.value.status_effective_date).toISOString()
        : null,
    parent_guardian_name: form.value.parent_guardian_name || null,
    parent_guardian_phone: form.value.parent_guardian_phone || null,
    emergency_contact_name: form.value.emergency_contact_name || null,
    emergency_contact_phone: form.value.emergency_contact_phone || null,
    medical_notes: form.value.medical_notes || null,
    notes: form.value.notes || null,
  };
  emit('submit', payload);
}
</script>
