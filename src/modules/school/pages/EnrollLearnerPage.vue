<!--
  EnrollLearnerPage.vue (Story 4.1)
  Dedicated page for enrolling a new learner or editing an existing record.
  Route /school/learners/enroll = create mode; /school/learners/:id/edit = edit mode.
-->
<template>
  <q-page padding>
    <Breadcrumbs :items="breadcrumbItems" :current="currentLabel" class="q-mb-md" />
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">{{ isEditMode ? 'Edit Learner' : 'Enroll Learner' }}</div>
        <div class="text-caption text-grey-7">
          {{
            isEditMode
              ? 'Update enrollment details, change class, or update status'
              : 'Select a resident to enroll as a learner'
          }}
        </div>
      </div>
    </div>

    <q-card flat bordered style="max-width: 900px">
      <q-card-section v-if="isEditMode && learnerStore.isCurrentLearnerLoading">
        <q-skeleton type="rect" height="400px" />
      </q-card-section>
      <q-card-section v-else>
        <LearnerForm
          :learner="isEditMode ? learnerStore.currentLearner : null"
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
import { useLearnerStore } from '../stores/learner-store';
import Breadcrumbs from 'src/components/layout/Breadcrumbs.vue';
import LearnerForm from '../components/LearnerForm.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const learnerStore = useLearnerStore();

const isSubmitting = ref(false);

const isEditMode = computed(() => !!route.params.id);
const backTarget = computed(() =>
  isEditMode.value ? `/school/learners/${route.params.id}` : '/school/learners',
);

const breadcrumbItems = computed(() => route.meta.breadcrumb || []);
const currentLabel = computed(() => (isEditMode.value ? 'Edit Learner' : 'Enroll Learner'));

async function onSubmit(payload) {
  isSubmitting.value = true;
  try {
    if (isEditMode.value) {
      // Resident cannot change on edit; drop it from the update payload
      const updateData = { ...payload };
      delete updateData.resident_id;
      const result = await learnerStore.updateLearner(route.params.id, updateData);
      if (result.success) {
        $q.notify({ type: 'positive', message: 'Learner updated successfully.' });
        router.push(`/school/learners/${route.params.id}`);
      }
    } else {
      const result = await learnerStore.enrollLearner(payload);
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
    learnerStore.fetchLearnerById(route.params.id);
  }
});
</script>
