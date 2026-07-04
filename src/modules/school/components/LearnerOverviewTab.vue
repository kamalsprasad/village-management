<!--
  LearnerOverviewTab.vue
  Overview tab for LearnerDetailPage: personal, enrollment, guardian info, at-risk status.
-->
<template>
  <div class="row q-col-gutter-md">
    <!-- At-Risk Status Card (Story 4.7 AC8) -->
    <div class="col-12">
      <q-card flat bordered :class="`bg-${statusBgColor}`">
        <q-card-section class="row items-center">
          <q-icon :name="statusIcon" size="32px" :color="statusColor" class="q-mr-md" />
          <div class="col">
            <div class="text-caption text-grey-7">At-Risk Status</div>
            <div class="text-subtitle1 text-weight-bold" :class="`text-${statusColor}`">
              {{ statusLabel }}
            </div>
            <div v-if="learnerRisk" class="text-caption text-grey-7 q-mt-xs">
              <span v-for="(r, idx) in learnerRisk.reasons" :key="idx">
                {{ r.detail }}{{ idx < learnerRisk.reasons.length - 1 ? ' · ' : '' }}
              </span>
            </div>
          </div>
          <q-btn
            v-if="learnerRisk"
            flat
            dense
            color="primary"
            label="View all at-risk"
            to="/school/at-risk-learners"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- Personal Info (read-only, from resident) -->
    <div class="col-12 col-md-6">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-sm">Personal Information</div>
          <div class="text-caption text-grey-7 q-mb-md">From the resident registry (read-only)</div>
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
                <q-item-label caption>Class</q-item-label>
                <q-item-label>{{ learnerClassName || '—' }}</q-item-label>
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
</template>

<script setup>
import { date } from 'quasar';
import EnrollmentStatusBadge from './EnrollmentStatusBadge.vue';

defineProps({
  learner: { type: Object, required: true },
  resident: { type: Object, default: null },
  learnerName: { type: String, default: '' },
  learnerClassName: { type: String, default: '' },
  learnerRisk: { type: Object, default: null },
  statusLabel: { type: String, default: '' },
  statusColor: { type: String, default: '' },
  statusBgColor: { type: String, default: '' },
  statusIcon: { type: String, default: '' },
  householdName: { type: String, default: '' },
  householdId: { type: String, default: null },
});

function formatDate(isoString) {
  if (!isoString) return '—';
  const [y, m, d] = isoString.slice(0, 10).split('-').map(Number);
  const localDate = new Date(y, m - 1, d);
  return date.formatDate(localDate, 'DD MMM YYYY');
}
</script>
