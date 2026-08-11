<!--
  SchoolDashboardPage.vue (Story 4.13)
  School module dashboard — Epic 4 complete.
  Teacher performance widgets (peer/self/HT evaluations) are deferred to post-MVP.
-->
<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">School Dashboard</h4>
        <p class="text-grey-7 q-mb-none">Learner enrollment and school management</p>
      </div>
      <q-space />
      <q-btn
        v-if="canWrite"
        color="primary"
        icon="person_add"
        label="Enroll Learner"
        @click="$router.push('/school/learners/enroll')"
      />
    </div>

    <div class="row q-col-gutter-md">
      <!-- Stats Cards -->
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Total Enrolled (Active)</div>
            <div class="text-h3 text-primary">
              <q-skeleton v-if="isInitialLoading" type="text" width="60px" />
              <span v-else>{{ learnerStore.activeLearners.length }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Classes with Learners</div>
            <div class="text-h3 text-secondary">
              <q-skeleton v-if="isInitialLoading" type="text" width="60px" />
              <span v-else>{{ Object.keys(learnerStore.activeLearnersByClass).length }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">Total Records</div>
            <div class="text-h3 text-accent">
              <q-skeleton v-if="isInitialLoading" type="text" width="60px" />
              <span v-else>{{ learnerStore.learners.length }}</span>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Progress to Goal Widget (Story 4.12) -->
      <div class="col-12 col-md-4">
        <ProgressToGoalWidget />
      </div>

      <!-- At-Risk Learners Widget (Story 4.7 AC5) -->
      <div class="col-12 col-md-8">
        <AtRiskLearnersWidget />
      </div>

      <!-- Class Attendance Widget (Story 4.7 AC4 — closes 4.6 AC5) -->
      <div class="col-12 col-md-4">
        <ClassAttendanceWidget />
      </div>

      <!-- Learners Overview Widget -->
      <div class="col-12 col-md-8">
        <LearnersOverviewWidget />
      </div>

      <!-- My Interventions Widget (Story 4.8) — visible only to teachers -->
      <div class="col-12">
        <MyInterventionsWidget />
      </div>

      <!-- Navigation Cards -->
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6 q-mb-sm">Quick Links</div>
            <q-list separator>
              <q-item clickable to="/school/educational-goals">
                <q-item-section avatar>
                  <q-icon name="trending_up" color="deep-orange" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Educational Goals</q-item-label>
                  <q-item-label caption>Track progress toward the long-term goal</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/learners">
                <q-item-section avatar>
                  <q-icon name="groups" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Learners</q-item-label>
                  <q-item-label caption>View and manage enrolled learners</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/classes">
                <q-item-section avatar>
                  <q-icon name="groups_3" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Classes & Timetables</q-item-label>
                  <q-item-label caption
                    >Manage grade sections, daily attendance, and schedules</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/teachers">
                <q-item-section avatar>
                  <q-icon name="badge" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Teachers & Faculty</q-item-label>
                  <q-item-label caption
                    >View teacher assignments and weekly master schedules</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/calendar">
                <q-item-section avatar>
                  <q-icon name="event" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>School Calendar</q-item-label>
                  <q-item-label caption>Academic terms, holidays, and school events</q-item-label>
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/at-risk-learners">
                <q-item-section avatar>
                  <q-icon name="warning" color="warning" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>At-Risk Learners</q-item-label>
                  <q-item-label caption
                    >Learners below attendance or academic thresholds</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-item clickable to="/school/interventions">
                <q-item-section avatar>
                  <q-icon name="support" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Interventions</q-item-label>
                  <q-item-label caption>Track support plans for at-risk learners</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-if="canAdmin" clickable to="/school/settings">
                <q-item-section avatar>
                  <q-icon name="tune" color="grey-6" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>School Settings</q-item-label>
                  <q-item-label caption>Configure terms, bell schedules, and more</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue';
import { useLearnerStore } from '../stores/learner-store';
import { usePermissions } from 'src/composables/usePermissions';
import LearnersOverviewWidget from '../components/LearnersOverviewWidget.vue';
import AtRiskLearnersWidget from '../components/AtRiskLearnersWidget.vue';
import ClassAttendanceWidget from '../components/ClassAttendanceWidget.vue';
import MyInterventionsWidget from '../components/MyInterventionsWidget.vue';
import ProgressToGoalWidget from '../components/ProgressToGoalWidget.vue';

const learnerStore = useLearnerStore();
const { hasPermission } = usePermissions();

const canWrite = computed(() => hasPermission('school:write'));
const canAdmin = computed(() => hasPermission('school:admin'));
const isInitialLoading = computed(() => learnerStore.isLoading && !learnerStore.learnersLoaded);

// All dashboard widgets self-initialize their data in their own onMounted hooks.
// No parent-level fetch is needed — adding one would cause redundant double-fetches.
</script>
