<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 q-mb-md">Households Summary</div>

      <!-- Loading State -->
      <div v-if="isLoading" class="q-pa-md">
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton type="rect" height="40px" class="q-mb-sm" />
        <q-skeleton type="rect" height="40px" />
      </div>

      <!-- Households by Type -->
      <div v-else-if="householdsByType.length > 0">
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

        <q-separator class="q-my-md" />

        <!-- Total -->
        <div class="row items-center">
          <div class="col">
            <div class="text-weight-bold">Total Households</div>
          </div>
          <div class="col-auto">
            <div class="text-h5 text-primary text-weight-bold">{{ totalHouseholds }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center q-pa-lg">
        <q-icon name="home_work" size="48px" color="grey-5" />
        <p class="text-grey-7 q-mt-md q-mb-none">No households registered yet</p>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-actions>
      <q-btn
        flat
        label="View All"
        color="primary"
        icon-right="arrow_forward"
        @click="router.push('/households')"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Query } from 'appwrite';
import { tables } from 'src/boot/appwrite';

const router = useRouter();

const isLoading = ref(false);
const households = ref([]);

const householdsByType = computed(() => {
  const typeCounts = {};

  households.value.forEach((household) => {
    const type = household.household_type || 'Other';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
});

const totalHouseholds = computed(() => households.value.length);

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

async function fetchHouseholds() {
  isLoading.value = true;
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const householdsCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_HOUSEHOLDS;

    const response = await tables.listRows({
      databaseId: dbId,
      tableId: householdsCollectionId,
      queries: [Query.limit(100)], // Fetch up to 100 for summary
    });

    households.value = response.rows;
  } catch (error) {
    console.error('Error fetching households for widget:', error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchHouseholds();
});
</script>
