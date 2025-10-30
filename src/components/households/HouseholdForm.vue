<template>
  <q-card style="min-width: 500px; max-width: 600px">
    <q-card-section>
      <div class="text-h6">{{ isEditMode ? 'Edit Household' : 'Add Household' }}</div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      <q-form @submit="handleSubmit">
        <!-- Household Name -->
        <q-input
          v-model="formData.name"
          label="Household Name *"
          outlined
          dense
          :rules="[(val) => !!val || 'Household name is required']"
          class="q-mb-md"
        />

        <!-- Household Type -->
        <q-select
          v-model="formData.household_type"
          :options="householdTypes"
          label="Household Type *"
          outlined
          dense
          :rules="[(val) => !!val || 'Household type is required']"
          class="q-mb-md"
        />

        <!-- Construction Date -->
        <q-input
          v-model="formData.construction_date"
          label="Construction Date *"
          outlined
          dense
          type="date"
          :rules="[(val) => !!val || 'Construction date is required']"
          class="q-mb-md"
        >
          <template #prepend>
            <q-icon name="event" />
          </template>
        </q-input>

        <!-- Bedrooms and Bathrooms Row -->
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-6">
            <q-input
              v-model.number="formData.bedrooms"
              label="Bedrooms"
              outlined
              dense
              type="number"
              min="0"
              :rules="[(val) => val >= 0 || 'Must be 0 or greater']"
            />
          </div>
          <div class="col-6">
            <q-input
              v-model.number="formData.bathrooms"
              label="Bathrooms"
              outlined
              dense
              type="number"
              min="0"
              :rules="[(val) => val >= 0 || 'Must be 0 or greater']"
            />
          </div>
        </div>

        <!-- Address -->
        <q-input
          v-model="formData.address"
          label="Address"
          outlined
          dense
          type="textarea"
          rows="3"
          class="q-mb-md"
        />

        <!-- Form Actions -->
        <div class="row q-gutter-sm justify-end">
          <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
          <q-btn type="submit" label="Save" color="primary" :loading="householdsStore.isLoading" />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useHouseholdsStore } from 'src/stores/households-store';

const props = defineProps({
  household: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['saved', 'cancelled']);

const householdsStore = useHouseholdsStore();

const householdTypes = [
  'Single Family',
  'Multi-Family',
  'Dormitory',
  'Guest House',
  'Admin Building',
  'Other',
];

const formData = ref({
  name: '',
  household_type: '',
  construction_date: '',
  bedrooms: 0,
  bathrooms: 0,
  address: '',
});

const isEditMode = computed(() => !!props.household?.$id);

// Watch for household prop changes (edit mode)
watch(
  () => props.household,
  (newHousehold) => {
    if (newHousehold) {
      formData.value = {
        name: newHousehold.name || '',
        household_type: newHousehold.household_type || '',
        construction_date: newHousehold.construction_date
          ? newHousehold.construction_date.split('T')[0]
          : '',
        bedrooms: newHousehold.bedrooms || 0,
        bathrooms: newHousehold.bathrooms || 0,
        address: newHousehold.address || '',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  formData.value = {
    name: '',
    household_type: '',
    construction_date: '',
    bedrooms: 0,
    bathrooms: 0,
    address: '',
  };
}

async function handleSubmit() {
  // Prepare data for submission
  const submitData = {
    ...formData.value,
    construction_date: formData.value.construction_date
      ? new Date(formData.value.construction_date).toISOString()
      : null,
  };

  let result;
  if (isEditMode.value) {
    result = await householdsStore.updateHousehold(props.household.$id, submitData);
  } else {
    result = await householdsStore.createHousehold(submitData);
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
</script>
