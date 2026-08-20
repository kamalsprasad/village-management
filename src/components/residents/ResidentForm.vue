<template>
  <q-card style="min-width: 500px; max-width: 700px">
    <q-card-section>
      <div class="text-h6">{{ isEditMode ? 'Edit Resident' : 'Add Resident' }}</div>
    </q-card-section>

    <!-- No Households Warning (AC4) -->
    <q-banner v-if="households.length === 0" class="bg-warning text-dark">
      <template #avatar>
        <q-icon name="warning" color="white" />
      </template>
      <div class="text-weight-medium">No households available</div>
      <div class="text-caption">Please create at least one household before adding residents.</div>
      <template #action>
        <q-btn flat color="white" label="Go to Households" @click="goToHouseholds" />
      </template>
    </q-banner>

    <q-card-section class="q-pt-none">
      <q-form @submit="handleSubmit">
        <!-- Name Fields Row -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-4">
            <q-input
              v-model="formData.first_name"
              label="First Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'First name is required']"
              data-test="first-name"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="formData.middle_names"
              label="Middle Names"
              outlined
              dense
              hint="Optional"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="formData.last_name"
              label="Last Name *"
              outlined
              dense
              :rules="[(val) => !!val || 'Last name is required']"
              data-test="last-name"
            />
          </div>
        </div>

        <!-- DOB and Gender Row -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="formData.dob"
              label="Date of Birth *"
              outlined
              dense
              type="date"
              :rules="[(val) => !!val || 'Date of birth is required']"
              data-test="dob"
            >
              <template #prepend>
                <q-icon name="event" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <q-select
              v-model="formData.gender"
              :options="genderOptions"
              label="Gender *"
              outlined
              dense
              :rules="[(val) => !!val || 'Gender is required']"
              data-test="gender"
            />
          </div>
        </div>

        <!-- Household Assignment (AC3, AC4) -->
        <q-select
          v-model="formData.household_id"
          :options="householdOptions"
          label="Household *"
          outlined
          dense
          option-value="value"
          option-label="label"
          emit-value
          map-options
          :rules="[(val) => !!val || 'Household assignment is required']"
          :disable="households.length === 0"
          class="q-mb-md"
          data-test="household-select"
          @update:model-value="onHouseholdChange"
        >
          <template #prepend>
            <q-icon name="home" />
          </template>
        </q-select>

        <!-- Room Number (conditional for Dormitory) (AC3) -->
        <q-input
          v-if="showRoomNumber"
          v-model="formData.room_number"
          label="Room Number"
          outlined
          dense
          hint="Required for dormitory households"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="meeting_room" />
          </template>
        </q-input>

        <!-- Contact Information (optional) (AC3) -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="formData.phone"
              label="Phone"
              outlined
              dense
              hint="Optional"
              :rules="[
                (val) => !val || /^[0-9+\-() ]+$/.test(val) || 'Please enter a valid phone number',
              ]"
            >
              <template #prepend>
                <q-icon name="phone" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="formData.email"
              label="Email"
              outlined
              dense
              type="email"
              hint="Optional"
              :rules="[
                (val) =>
                  !val ||
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
                  'Please enter a valid email address',
              ]"
            >
              <template #prepend>
                <q-icon name="email" />
              </template>
            </q-input>
          </div>
        </div>

        <!-- Notes -->
        <q-input
          v-model="formData.notes"
          label="Notes"
          placeholder="Add any additional notes about the resident"
          outlined
          dense
          type="textarea"
          rows="3"
          class="q-mb-md"
        />

        <!-- Form Actions -->
        <div class="row q-gutter-sm justify-end">
          <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
          <q-btn
            type="submit"
            label="Save"
            color="primary"
            :loading="residentsStore.isLoading"
            :disable="households.length === 0"
            data-test="form-submit"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useResidentsStore } from 'src/stores/residents-store';
import { useHouseholdsStore } from 'src/stores/households-store';

const props = defineProps({
  resident: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['saved', 'cancelled']);

const router = useRouter();
const residentsStore = useResidentsStore();
const householdsStore = useHouseholdsStore();

const genderOptions = ['Male', 'Female', 'Other'];

const formData = ref({
  first_name: '',
  middle_names: '',
  last_name: '',
  dob: '',
  gender: '',
  household_id: '',
  room_number: '',
  phone: '',
  email: '',
  notes: '',
});

const isEditMode = computed(() => !!props.resident?.$id);

// Get households list
const households = computed(() => householdsStore.households);

const householdOptions = computed(() => {
  return households.value.map((h) => ({
    label: h.name,
    value: h.$id,
  }));
});

// Show room number field only for Dormitory households (AC3)
const showRoomNumber = computed(() => {
  if (!formData.value.household_id) return false;
  const selectedHousehold = households.value.find((h) => h.$id === formData.value.household_id);
  return selectedHousehold?.household_type === 'Dormitory';
});

// Watch for resident prop changes (edit mode)
watch(
  () => props.resident,
  (newResident) => {
    if (newResident) {
      formData.value = {
        first_name: newResident.first_name || '',
        middle_names: newResident.middle_names || '',
        last_name: newResident.last_name || '',
        dob: newResident.dob ? newResident.dob.split('T')[0] : '',
        gender: newResident.gender || '',
        household_id: newResident.household_id || '',
        room_number: newResident.room_number || '',
        phone: newResident.phone || '',
        email: newResident.email ? newResident.email : null,
        notes: newResident.notes || '',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function onHouseholdChange() {
  // Clear room number if switching away from dormitory
  if (!showRoomNumber.value) {
    formData.value.room_number = '';
  }
}

function resetForm() {
  formData.value = {
    first_name: '',
    middle_names: '',
    last_name: '',
    dob: '',
    gender: '',
    household_id: '',
    room_number: '',
    phone: '',
    email: '',
    notes: '',
  };
}

async function handleSubmit() {
  // Prepare data for submission
  const submitData = {
    ...formData.value,
    dob: formData.value.dob ? new Date(formData.value.dob).toISOString() : null,
  };

  let result;
  if (isEditMode.value) {
    result = await residentsStore.updateResident(props.resident.$id, submitData);
  } else {
    result = await residentsStore.createResident(submitData);
  }

  if (result.success) {
    resetForm();
    emit('saved');
  }
}

function handleCancel() {
  resetForm();
  emit('cancelled');
}

function goToHouseholds() {
  router.push('/households');
  emit('cancelled');
}
</script>
