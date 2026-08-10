<!--
  LongTermGoalsSettingsPage.vue (Story 4.12)

  Configure the village's long-term educational goal.
  Accessible at /school/settings/long-term-goals — requires school:admin.
-->
<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat dense round icon="arrow_back" to="/school/settings" class="q-mr-sm" />
      <div>
        <div class="text-h5">Long-Term Goal</div>
        <div class="text-caption text-grey-7">
          Configure the village's educational goal and target timeline
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isInitialLoading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="lg" />
      <div class="text-caption q-mt-sm">Loading goal settings...</div>
    </div>

    <!-- Empty / create state -->
    <div
      v-else-if="!goalForm.$id && !isEditing"
      class="text-center q-pa-xl text-grey-7 bg-grey-1 rounded-borders"
    >
      <q-icon name="trending_up" size="48px" />
      <div class="text-subtitle1 q-mt-sm">No long-term goal configured</div>
      <div class="text-caption">
        Set up the 10-year educational goal so the school can track progress toward it.
      </div>
      <q-btn color="primary" icon="add" label="Create Goal" class="q-mt-md" @click="startCreate" />
    </div>

    <!-- Form -->
    <q-card v-else flat bordered>
      <q-card-section>
        <div class="text-h6 q-mb-md">Goal Configuration</div>

        <q-form ref="goalFormRef" @submit="saveGoal">
          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-input
                v-model="goalForm.goal_name"
                label="Goal Name"
                outlined
                dense
                :rules="[(val) => !!val || 'Goal name is required']"
                maxlength="255"
                counter
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="goalForm.target_percent_of_learners"
                label="Target % of Learners"
                type="number"
                outlined
                dense
                min="0"
                max="100"
                step="0.1"
                :rules="[
                  (val) => (val !== null && val !== '') || 'Target % is required',
                  (val) => (val > 0 && val <= 100) || 'Must be greater than 0 and at most 100',
                ]"
                hint="e.g., 90% of active learners should meet the benchmark"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="goalForm.target_percentile_score"
                label="Benchmark Score Threshold"
                type="number"
                outlined
                dense
                min="0"
                max="100"
                step="0.1"
                :rules="[
                  (val) => (val !== null && val !== '') || 'Benchmark score is required',
                  (val) => (val > 0 && val <= 100) || 'Must be greater than 0 and at most 100',
                ]"
                hint="Represents the 90th-percentile target (e.g., 90%)"
              >
                <q-tooltip
                  >The minimum academic average (%) a learner must reach to be considered "at
                  target" for the long-term goal.</q-tooltip
                >
              </q-input>
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="goalForm.baseline_academic_year"
                label="Baseline Academic Year"
                type="number"
                outlined
                dense
                :rules="[
                  (val) => (val !== null && val !== '') || 'Baseline year is required',
                  (val) => Number.isInteger(val) || 'Year must be a whole number',
                  (val) => (val > 2000 && val <= 2100) || 'Enter a realistic year (2001-2100)',
                ]"
                hint="First year used to measure progress"
              />
            </div>

            <div class="col-12 col-sm-6">
              <q-input
                v-model.number="goalForm.target_academic_year"
                label="Target Academic Year"
                type="number"
                outlined
                dense
                :rules="[
                  (val) => (val !== null && val !== '') || 'Target year is required',
                  (val) => Number.isInteger(val) || 'Year must be a whole number',
                  (val) => (val > 2000 && val <= 2100) || 'Enter a realistic year (2001-2100)',
                  (val) => val >= goalForm.baseline_academic_year || 'Must be >= baseline year',
                  (val) => val >= new Date().getFullYear() || 'Must be >= current year',
                ]"
                hint="Year by which the goal should be reached (baseline + 10)"
              />
            </div>

            <div class="col-12">
              <q-toggle
                :model-value="goalForm.is_active"
                @update:model-value="onActiveToggle"
                label="Active goal"
                hint="Only active goals are used to calculate progress"
              />
            </div>

            <div class="col-12">
              <q-input
                v-model="goalForm.notes"
                label="Notes"
                type="textarea"
                outlined
                dense
                autogrow
                maxlength="1000"
                counter
              />
            </div>
          </div>

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn
              flat
              label="Cancel"
              color="grey-7"
              :disable="isSaving"
              @click="$router.push('/school/settings')"
            />
            <q-btn
              type="submit"
              color="primary"
              icon="save"
              label="Save Goal"
              :loading="isSaving"
              :disable="isSaving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useSchoolGoalsStore } from '../stores/school-goals-store';
import { usePermissions } from 'src/composables/usePermissions';

const router = useRouter();
const $q = useQuasar();
const goalsStore = useSchoolGoalsStore();
const { hasPermission } = usePermissions();

const canAdmin = computed(() => hasPermission('school:admin'));
const isInitialLoading = ref(true);
const isSaving = ref(false);
const isEditing = ref(false);
const goalFormRef = ref(null);

const emptyGoal = () => ({
  $id: null,
  goal_name: '90% of learners at 90th-percentile benchmark',
  target_percent_of_learners: 90,
  target_percentile_score: 90,
  baseline_academic_year: new Date().getFullYear(),
  target_academic_year: new Date().getFullYear() + 10,
  is_active: true,
  notes: '',
});

const goalForm = ref(emptyGoal());

onMounted(async () => {
  if (!canAdmin.value) {
    $q.notify({ type: 'warning', message: 'You do not have permission to manage goals' });
    router.push('/school/dashboard');
    return;
  }

  await goalsStore.fetchGoals();
  const active = goalsStore.activeGoal;
  if (active) {
    goalForm.value = { ...active };
    isEditing.value = true;
  }
  isInitialLoading.value = false;
});

function startCreate() {
  isEditing.value = true;
  goalForm.value = emptyGoal();
}

function onActiveToggle(newValue) {
  // Warn when deactivating the only active goal — leaves the system with no
  // active goal, which causes empty states on the dashboard and goals page.
  if (newValue === false && goalForm.value.$id) {
    const otherActiveGoals = goalsStore.goals.filter(
      (g) => g.is_active === true && g.$id !== goalForm.value.$id,
    );
    if (otherActiveGoals.length === 0) {
      $q.dialog({
        title: 'Deactivate the only active goal?',
        message:
          'If you deactivate this goal, the school will have no active goal. ' +
          'The dashboard and Educational Goals page will show empty states until a new goal is set.',
        cancel: true,
        persistent: true,
        ok: { label: 'Deactivate', color: 'negative', unelevated: true },
      }).onOk(() => {
        goalForm.value.is_active = false;
      });
      return;
    }
  }
  goalForm.value.is_active = newValue;
}

async function saveGoal() {
  const isValid = await goalFormRef.value.validate();
  if (!isValid) return;

  isSaving.value = true;
  const result = await goalsStore.saveGoal({
    goal_name: goalForm.value.goal_name,
    target_percent_of_learners: Number(goalForm.value.target_percent_of_learners),
    target_percentile_score: Number(goalForm.value.target_percentile_score),
    baseline_academic_year: Number(goalForm.value.baseline_academic_year),
    target_academic_year: Number(goalForm.value.target_academic_year),
    is_active: Boolean(goalForm.value.is_active),
    notes: goalForm.value.notes || '',
  });
  isSaving.value = false;

  if (result.success) {
    $q.notify({ type: 'positive', message: 'Long-term goal saved successfully' });
    router.push('/school/settings');
  } else {
    $q.notify({ type: 'negative', message: `Failed to save goal: ${result.error}` });
  }
}
</script>
