<!--
  ActivePerennialsWidget.vue

  Dashboard widget showing active perennial crops with continuous picking status.
  Displays count by crop type, harvest readiness, and overdue alerts.

  Story 3.6: Farm Module - Continuous Picking Harvests for Perennial Crops
-->
<template>
  <q-card class="cursor-pointer" @click="navigateToPerennials">
    <q-card-section class="row items-center justify-between">
      <div class="text-subtitle1 text-weight-medium">
        <q-icon name="repeat" class="q-mr-xs text-primary" />
        Active Perennials
      </div>
      <q-badge color="primary" class="text-h6">{{ totalCount }}</q-badge>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Breakdown by crop type -->
      <div v-if="perennialsByCrop.length > 0" class="q-mb-md">
        <div
          v-for="item in perennialsByCrop"
          :key="item.cropName"
          class="row items-center justify-between q-mb-xs"
        >
          <span class="text-body2">{{ item.cropName }}</span>
          <q-badge :color="item.hasOverdue ? 'negative' : item.hasReady ? 'positive' : 'grey'">
            {{ item.count }}
            <q-icon v-if="item.hasOverdue" name="warning" size="xs" class="q-ml-xs" />
          </q-badge>
        </div>
      </div>

      <!-- No perennials message -->
      <div v-else class="text-center text-grey q-py-sm">No active perennial crops</div>

      <!-- Harvest readiness summary -->
      <div v-if="totalCount > 0" class="q-mt-sm q-pt-sm border-top">
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <div class="text-caption text-positive">
              <q-icon name="check_circle" size="xs" class="q-mr-xs" />
              Ready: {{ readyCount }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-caption" :class="overdueCount > 0 ? 'text-negative' : 'text-grey'">
              <q-icon name="warning" size="xs" class="q-mr-xs" />
              Overdue: {{ overdueCount }}
            </div>
          </div>
        </div>
      </div>
    </q-card-section>

    <!-- Alert banner for overdue harvests -->
    <q-banner v-if="overdueCount > 0" class="bg-negative text-white" dense>
      <q-icon name="warning" class="q-mr-sm" />
      {{ overdueCount }} perennial{{ overdueCount > 1 ? 's are' : ' is' }} overdue for harvest!
    </q-banner>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';

const router = useRouter();
const farmStore = useFarmStore();

// Get active perennials with stats from store getter
const perennialsData = computed(() => {
  return farmStore.activePerennialsWithStats || [];
});

const totalCount = computed(() => perennialsData.value.length);

const readyCount = computed(() => {
  return perennialsData.value.filter((p) => p.isReadyForHarvest && !p.isOverdue).length;
});

const overdueCount = computed(() => {
  return perennialsData.value.filter((p) => p.isOverdue).length;
});

// Group by crop type with status indicators
const perennialsByCrop = computed(() => {
  const groups = {};

  perennialsData.value.forEach((item) => {
    const cropName = item.crop?.crop_name || 'Unknown';
    if (!groups[cropName]) {
      groups[cropName] = {
        cropName,
        count: 0,
        hasReady: false,
        hasOverdue: false,
      };
    }
    groups[cropName].count++;
    if (item.isReadyForHarvest && !item.isOverdue) {
      groups[cropName].hasReady = true;
    }
    if (item.isOverdue) {
      groups[cropName].hasOverdue = true;
    }
  });

  return Object.values(groups).sort((a, b) => b.count - a.count);
});

// Navigate to plantings list (filtered by harvesting status).
// Note: 'type=perennial' query param is not yet wired up in PlantingsListPage.
function navigateToPerennials() {
  router.push({
    path: '/farm/plantings',
    query: { status: 'harvesting' },
  });
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.cursor-pointer:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
