<template>
  <q-page padding>
    <div class="q-pa-md">
      <!-- Back Button -->
      <q-btn
        flat
        icon="arrow_back"
        label="Back to Households"
        @click="router.back()"
        class="q-mb-md"
      />

      <!-- Loading State -->
      <div v-if="householdsStore.isLoading && !householdsStore.currentHousehold" class="q-pa-md">
        <q-skeleton type="rect" height="200px" class="q-mb-md" />
        <q-skeleton type="rect" height="300px" />
      </div>

      <!-- Household Details -->
      <div v-else-if="householdsStore.currentHousehold">
        <!-- Household Info Card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <h5 class="q-my-none">{{ householdsStore.currentHousehold.name }}</h5>
                <q-chip
                  :color="getTypeColor(householdsStore.currentHousehold.household_type)"
                  text-color="white"
                  dense
                  class="q-mt-sm"
                >
                  {{ householdsStore.currentHousehold.household_type }}
                </q-chip>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="hasPermission('households:write')"
                  flat
                  icon="edit"
                  label="Edit"
                  color="primary"
                  @click="showEditDialog = true"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-col-gutter-md">
              <!-- Construction Date -->
              <div class="col-12 col-sm-6">
                <div class="text-caption text-grey-7">Construction Date</div>
                <div class="text-body1">
                  {{
                    householdsStore.currentHousehold.construction_date
                      ? formatDate(householdsStore.currentHousehold.construction_date)
                      : 'Not specified'
                  }}
                </div>
              </div>

              <!-- Bedrooms -->
              <div class="col-6 col-sm-3">
                <div class="text-caption text-grey-7">Bedrooms</div>
                <div class="text-body1">
                  <q-icon name="bed" class="q-mr-xs" />
                  {{ householdsStore.currentHousehold.bedrooms || 0 }}
                </div>
              </div>

              <!-- Bathrooms -->
              <div class="col-6 col-sm-3">
                <div class="text-caption text-grey-7">Bathrooms</div>
                <div class="text-body1">
                  <q-icon name="bathtub" class="q-mr-xs" />
                  {{ householdsStore.currentHousehold.bathrooms || 0 }}
                </div>
              </div>

              <!-- Address -->
              <div v-if="householdsStore.currentHousehold.address" class="col-12">
                <div class="text-caption text-grey-7">Address</div>
                <div class="text-body1">{{ householdsStore.currentHousehold.address }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Occupants Card -->
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <h6 class="q-my-none">
                  Occupants
                  <q-badge
                    :color="
                      householdsStore.currentHousehold.occupant_count > 0 ? 'positive' : 'grey'
                    "
                  >
                    {{ householdsStore.currentHousehold.occupant_count }}
                  </q-badge>
                </h6>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="hasPermission('residents:write')"
                  flat
                  icon="person_add"
                  label="Add Resident"
                  color="primary"
                  @click="addResident"
                />
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Empty State -->
          <q-card-section v-if="householdsStore.currentHousehold.occupant_count === 0">
            <div class="text-center q-pa-lg">
              <q-icon name="people_outline" size="64px" color="grey-5" />
              <p class="text-grey-7 q-mt-md">No occupants assigned to this household yet.</p>
              <p class="text-caption text-grey-6">
                Click "Add Resident" to assign residents to this household.
              </p>
            </div>
          </q-card-section>

          <!-- Occupants Table -->
          <q-card-section v-else class="q-pa-none">
            <household-residents-table
              :residents="householdsStore.currentHousehold.occupants"
              :household-type="householdsStore.currentHousehold.household_type"
            />
          </q-card-section>
        </q-card>
      </div>

      <!-- Error State -->
      <div v-else class="text-center q-pa-lg">
        <q-icon name="error_outline" size="64px" color="negative" />
        <p class="text-h6 q-mt-md">Household not found</p>
        <q-btn
          flat
          label="Back to Households"
          color="primary"
          @click="router.push('/households')"
        />
      </div>

      <!-- Edit Dialog -->
      <q-dialog v-model="showEditDialog" persistent>
        <household-form
          :household="householdsStore.currentHousehold"
          @saved="handleSaved"
          @cancelled="showEditDialog = false"
        />
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useHouseholdsStore } from 'src/stores/households-store';
import { usePermissions } from 'src/composables/usePermissions';
import { format } from 'date-fns';
import HouseholdForm from 'src/components/households/HouseholdForm.vue';
import HouseholdResidentsTable from 'src/components/households/HouseholdResidentsTable.vue';

const router = useRouter();
const route = useRoute();
const householdsStore = useHouseholdsStore();
const { hasPermission } = usePermissions();

const showEditDialog = ref(false);

function getTypeColor(type) {
  const colors = {
    'Single Family': 'primary',
    'Multi-Family': 'secondary',
    Dormitory: 'accent',
    'Guest House': 'positive',
    'Admin Building': 'info',
    Other: 'grey',
  };
  return colors[type] || 'grey';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMMM dd, yyyy');
  } catch {
    return 'Invalid date';
  }
}

function addResident() {
  // Navigate to residents page with household pre-selected
  router.push({
    path: '/residents',
    query: { household: route.params.id, action: 'add' },
  });
}

async function handleSaved() {
  showEditDialog.value = false;
  // Refresh household data
  await householdsStore.fetchHouseholdById(route.params.id);
}

onMounted(async () => {
  const householdId = route.params.id;
  if (householdId) {
    await householdsStore.fetchHouseholdById(householdId);
  }
});
</script>
