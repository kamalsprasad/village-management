<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Back Button -->
      <q-btn flat icon="arrow_back" label="Back" @click="router.back()" class="q-mb-md" />

      <!-- Loading State -->
      <div v-if="residentsStore.isLoading && !residentsStore.currentResident" class="q-pa-md">
        <q-skeleton type="rect" height="200px" class="q-mb-md" />
        <q-skeleton type="rect" height="300px" />
      </div>

      <!-- Resident Details (AC6) -->
      <div v-else-if="residentsStore.currentResident">
        <!-- Personal Info Card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <h5 class="q-my-none">{{ getFullName(residentsStore.currentResident) }}</h5>
                <q-chip
                  :color="residentsStore.currentResident.gender === 'Male' ? 'blue' : 'pink'"
                  text-color="white"
                  dense
                  class="q-mt-sm"
                >
                  {{ residentsStore.currentResident.gender }}
                </q-chip>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="hasPermission('residents:write')"
                  flat
                  icon="edit"
                  label="Edit"
                  color="primary"
                  class="q-mr-sm"
                  @click="showEditDialog = true"
                />
                <q-btn
                  v-if="hasPermission('residents:delete')"
                  flat
                  icon="delete"
                  label="Delete"
                  color="negative"
                  @click="showDeleteDialog = true"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-col-gutter-md">
              <!-- Date of Birth -->
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Date of Birth</div>
                <div class="text-body1">
                  {{
                    residentsStore.currentResident.dob
                      ? formatDate(residentsStore.currentResident.dob)
                      : 'Not specified'
                  }}
                  <span v-if="residentsStore.currentResident.dob" class="text-grey-7">
                    ({{ calculateAge(residentsStore.currentResident.dob) }} years old)
                  </span>
                </div>
              </div>

              <!-- Room Number (if applicable) -->
              <div v-if="residentsStore.currentResident.room_number" class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Room Number</div>
                <div class="text-body1">
                  <q-icon name="meeting_room" class="q-mr-xs" />
                  {{ residentsStore.currentResident.room_number }}
                </div>
              </div>

              <!-- Contact Information -->
              <div v-if="residentsStore.currentResident.phone" class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Phone</div>
                <div class="text-body1">
                  <q-icon name="phone" class="q-mr-xs" />
                  {{ residentsStore.currentResident.phone }}
                </div>
              </div>

              <div v-if="residentsStore.currentResident.email" class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Email</div>
                <div class="text-body1">
                  <q-icon name="email" class="q-mr-xs" />
                  {{ residentsStore.currentResident.email }}
                </div>
              </div>

              <!-- Notes -->
              <div v-if="residentsStore.currentResident.notes" class="col-12">
                <div class="text-caption text-grey-7">Notes</div>
                <div class="text-body1">{{ residentsStore.currentResident.notes }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Household Membership Card (AC6) -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <h6 class="q-my-none">Household Membership</h6>
          </q-card-section>

          <q-separator />

          <q-card-section v-if="residentsStore.currentResident.household">
            <q-item clickable @click="viewHousehold(residentsStore.currentResident.household.$id)">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white">
                  <q-icon name="home" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label>{{ residentsStore.currentResident.household.name }}</q-item-label>
                <q-item-label caption>
                  {{ residentsStore.currentResident.household.household_type }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-icon name="chevron_right" color="grey" />
              </q-item-section>
            </q-item>
          </q-card-section>

          <q-card-section v-else>
            <div class="text-center q-pa-md text-grey-7">No household assigned</div>
          </q-card-section>
        </q-card>

        <!-- Activity Timeline Placeholder (AC6) -->
        <q-card flat bordered>
          <q-card-section>
            <h6 class="q-my-none">Activity Timeline</h6>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="text-center q-pa-lg">
              <q-icon name="timeline" size="48px" color="grey-5" />
              <p class="text-grey-7 q-mt-md">Activity timeline coming soon</p>
              <p class="text-caption text-grey-6">
                This section will show resident activity history and important events.
              </p>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Not Found State -->
      <div v-else class="text-center q-pa-xl">
        <q-icon name="person_off" size="64px" color="grey-5" />
        <p class="text-grey-7 q-mt-md">Resident not found</p>
      </div>

      <!-- Edit Dialog -->
      <q-dialog v-model="showEditDialog" persistent>
        <resident-form
          :resident="residentsStore.currentResident"
          @saved="handleSaved"
          @cancelled="showEditDialog = false"
        />
      </q-dialog>

      <!-- Delete Confirmation Dialog (AC8) -->
      <q-dialog v-model="showDeleteDialog" persistent>
        <q-card style="min-width: 350px">
          <q-card-section>
            <div class="text-h6">Confirm Deletion</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            Are you sure you want to delete
            <strong>{{ getFullName(residentsStore.currentResident) }}</strong
            >?
            <div class="text-caption text-grey-7 q-mt-sm">This action cannot be undone.</div>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancel" color="primary" @click="showDeleteDialog = false" />
            <q-btn
              flat
              label="Delete"
              color="negative"
              :loading="residentsStore.isLoading"
              @click="deleteResident"
            />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useResidentsStore } from 'src/stores/residents-store';
import { usePermissions } from 'src/composables/usePermissions';
import { differenceInYears } from 'date-fns';
import { formatDate } from 'src/utils/dateUtils';
import ResidentForm from 'src/components/residents/ResidentForm.vue';

const router = useRouter();
const route = useRoute();
const residentsStore = useResidentsStore();
const { hasPermission } = usePermissions();

const showEditDialog = ref(false);
const showDeleteDialog = ref(false);

function getFullName(resident) {
  if (!resident) return '';
  const parts = [resident.first_name];
  if (resident.middle_names) {
    parts.push(resident.middle_names);
  }
  parts.push(resident.last_name);
  return parts.join(' ');
}

function calculateAge(dob) {
  if (!dob) return 0;
  try {
    return differenceInYears(new Date(), new Date(dob));
  } catch {
    return 0;
  }
}

function viewHousehold(householdId) {
  router.push(`/households/${householdId}`);
}

async function deleteResident() {
  const result = await residentsStore.deleteResident(residentsStore.currentResident.$id);

  if (result.success) {
    showDeleteDialog.value = false;
    router.push('/residents');
  }
}

function handleSaved() {
  showEditDialog.value = false;
  // Refresh resident data
  residentsStore.fetchResidentById(route.params.id);
}

onMounted(async () => {
  const residentId = route.params.id;
  if (residentId) {
    await residentsStore.fetchResidentById(residentId);
  }
});
</script>
