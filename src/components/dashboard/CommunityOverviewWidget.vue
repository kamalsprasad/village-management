<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 q-mb-md">Community Overview</div>

      <!-- Loading State -->
      <div v-if="isLoading" class="q-pa-md">
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="60px" class="q-mb-sm" />
        <q-skeleton type="rect" height="100px" />
      </div>

      <div v-else>
        <!-- Total Counts Row -->
        <div class="row q-col-gutter-md q-mb-md">
          <!-- Total Residents -->
          <div class="col-12 col-sm-6">
            <div class="stats-box q-pa-md rounded-borders bg-blue-1">
              <div class="row items-center">
                <div class="col-auto q-mr-md">
                  <q-icon name="person" size="32px" color="primary" />
                </div>
                <div class="col">
                  <div class="text-caption text-grey-7">Total Residents</div>
                  <div class="text-h4 text-primary text-weight-bold">{{ totalResidents }}</div>
                </div>
              </div>
              <q-btn
                flat
                dense
                size="sm"
                label="View All"
                color="primary"
                icon-right="arrow_forward"
                class="q-mt-sm full-width"
                @click="router.push('/residents')"
              />
            </div>
          </div>

          <!-- Total Households -->
          <div class="col-12 col-sm-6">
            <div class="stats-box q-pa-md rounded-borders bg-green-1">
              <div class="row items-center">
                <div class="col-auto q-mr-md">
                  <q-icon name="home" size="32px" color="positive" />
                </div>
                <div class="col">
                  <div class="text-caption text-grey-7">Total Households</div>
                  <div class="text-h4 text-positive text-weight-bold">{{ totalHouseholds }}</div>
                </div>
              </div>
              <q-btn
                flat
                dense
                size="sm"
                label="View All"
                color="positive"
                icon-right="arrow_forward"
                class="q-mt-sm full-width"
                @click="router.push('/households')"
              />
            </div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Households by Type -->
        <div class="q-mb-md">
          <div class="text-subtitle2 text-weight-medium q-mb-sm">Households by Type</div>
          <div v-if="householdsByType.length > 0">
            <q-list dense>
              <q-item v-for="item in householdsByType" :key="item.type" class="q-px-none">
                <q-item-section>
                  <q-item-label>
                    <q-chip
                      :color="getTypeColor(item.type)"
                      text-color="white"
                      dense
                      size="sm"
                      class="q-mr-sm"
                    >
                      {{ item.type }}
                    </q-chip>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :color="getTypeColor(item.type)" :label="item.count" />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-center q-pa-md">
            <q-icon name="category" size="32px" color="grey-5" />
            <p class="text-grey-7 q-mt-sm q-mb-none text-caption">No household types to display</p>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- Recent Additions -->
        <div>
          <div class="text-subtitle2 text-weight-medium q-mb-sm">Recent Additions</div>
          <div v-if="recentResidents.length > 0">
            <q-list dense>
              <q-item v-for="resident in recentResidents" :key="resident.$id" class="q-px-none">
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" size="32px">
                    <q-icon name="person" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ getFullName(resident) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ resident.household?.name || 'No household' }} •
                    {{ formatRelativeTime(resident.$createdAt) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
          <div v-else class="text-center q-pa-md">
            <q-icon name="person_add" size="32px" color="grey-5" />
            <p class="text-grey-7 q-mt-sm q-mb-none text-caption">No recent residents added yet</p>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useResidentsStore } from 'src/stores/residents-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { formatDistanceToNow } from 'date-fns';

const router = useRouter();
const residentsStore = useResidentsStore();
const householdsStore = useHouseholdsStore();

const isLoading = ref(false);

// Total residents from store pagination
const totalResidents = computed(() => residentsStore.pagination.total);

// Total households from store pagination
const totalHouseholds = computed(() => householdsStore.pagination.total);

// Households by type aggregation
const householdsByType = computed(() => {
  const typeCounts = {};

  householdsStore.households.forEach((household) => {
    const type = household.household_type || 'Other';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
});

// Recent residents (5 most recent)
const recentResidents = computed(() => {
  return residentsStore.residents.slice(0, 5);
});

/**
 * Get Quasar theme color for household type
 */
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

/**
 * Get full name for a resident
 */
function getFullName(resident) {
  const parts = [resident.first_name];
  if (resident.middle_names) {
    parts.push(resident.middle_names);
  }
  parts.push(resident.last_name);
  return parts.join(' ');
}

/**
 * Format relative time (e.g., "Added 2 days ago")
 */
function formatRelativeTime(dateString) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Recently';
  }
}

/**
 * Fetch data on component mount
 */
async function fetchData() {
  isLoading.value = true;
  try {
    // Fetch residents (limit 5 for recent additions, but get pagination.total for count)
    await residentsStore.fetchResidents(1, 5);

    // Fetch households (limit 100 to get all types for breakdown)
    await householdsStore.fetchHouseholds(1, 100);
  } catch (error) {
    console.error('Error fetching community overview data:', error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.stats-box {
  border: 1px solid rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
}

.stats-box:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.rounded-borders {
  border-radius: 8px;
}
</style>
