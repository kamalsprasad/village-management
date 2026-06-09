<!--
  EnrollLearnerPage.vue (Story 4.1)
  Dedicated page for enrolling a new learner or editing an existing record.
  Route /school/learners/enroll = create mode; /school/learners/:id/edit = edit mode.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" :to="backTarget" class="q-mr-sm">
        <q-tooltip>Back</q-tooltip>
      </q-btn>
      <div>
        <div class="text-h5">{{ isEditMode ? 'Edit Learner' : 'Enroll Learner' }}</div>
        <div class="text-caption text-grey-7">
          {{
            isEditMode
              ? 'Update enrollment details, promote grade, or change status'
              : 'Select a resident to enroll as a learner'
          }}
        </div>
      </div>
    </div>

    <q-card flat bordered style="max-width: 900px">
      <q-card-section v-if="isEditMode && schoolStore.isCurrentLearnerLoading">
        <q-skeleton type="rect" height="400px" />
      </q-card-section>
      <q-card-section v-else>
        <LearnerForm
          :learner="isEditMode ? schoolStore.currentLearner : null"
          :submitting="isSubmitting"
          @submit="onSubmit"
          @cancel="$router.push(backTarget)"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useSchoolStore } from '../stores/school-store';
import LearnerForm from '../components/LearnerForm.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const schoolStore = useSchoolStore();

const isSubmitting = ref(false);

const isEditMode = computed(() => !!route.params.id);
const backTarget = computed(() =>
  isEditMode.value ? `/school/learners/${route.params.id}` : '/school/learners',
);

async function onSubmit(payload) {
  isSubmitting.value = true;
  try {
    if (isEditMode.value) {
      // Resident cannot change on edit; drop it from the update payload
      const updateData = { ...payload };
      delete updateData.resident_id;
      const result = await schoolStore.updateLearner(route.params.id, updateData);
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Learner updated successfully.' });
        router.push(`/school/learners/${route.params.id}`);
      }
    } else {
      const result = await schoolStore.enrollLearner(payload);
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Learner enrolled successfully.' });
        router.push(`/school/learners/${result.data.$id}`);
      } else if (result.duplicate) {
        $q.notify({ type: 'negative', message: result.error });
      }
    }
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(() => {
  if (isEditMode.value) {
    schoolStore.fetchLearnerById(route.params.id);
  }
});
</script>
