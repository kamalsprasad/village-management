<!--
  PlantingStatusWidget.vue
  Dashboard widget showing planting counts by status.

  Story 3.4: Farm Module - Planting Status Tracking and Lifecycle Management
-->
<template>
  <q-card class="full-height">
    <q-card-section class="q-pb-sm">
      <div
        class="text-subtitle1 text-weight-medium cursor-pointer text-primary row items-center"
        @click="$router.push('/farm/plantings')"
      >
        Planting Status
        <q-icon name="arrow_forward" size="18px" class="q-ml-xs" />
      </div>
    </q-card-section>

    <q-card-section class="q-pt-xs">
      <div v-if="isLoading" class="flex flex-center q-pa-md">
        <q-spinner-dots size="30px" color="primary" />
      </div>

      <div v-else-if="totalPlantings === 0" class="text-grey text-center q-pa-md">
        <q-icon name="spa" size="2em" class="q-mb-sm" />
        <div class="text-caption">No plantings recorded yet</div>
      </div>

      <div v-else class="row q-col-gutter-sm">
        <div
          v-for="stat in statusStats"
          :key="stat.status"
          class="col-6 col-sm-4"
        >
          <q-card
            flat
            bordered
            class="text-center q-pa-sm cursor-pointer status-tile"
            @click="$router.push('/farm/plantings')"
          >
            <div class="text-h5 text-weight-bold" :class="`text-${stat.color}`">
              {{ stat.count }}
            </div>
            <div class="text-caption text-grey">{{ stat.label }}</div>
            <q-badge
              :color="stat.color"
              transparent
              class="q-mt-xs"
              style="font-size: 11px"
            >
              {{ stat.status }}
            </q-badge>
          </q-card>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useFarmStore } from '../stores/farm-store';

const farmStore = useFarmStore();

const isLoading = computed(() => farmStore.isPlantingsLoading && !farmStore.plantingsLoaded);

const totalPlantings = computed(() => farmStore.plantings.length);

// "This season" threshold: last 180 days
const seasonCutoff = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() - 180);
  return d;
});

const statusStats = computed(() => {
  const plantings = farmStore.plantings;

  const count = (status) =>
    plantings.filter((p) => p.status?.toLowerCase() === status).length;

  const countSeason = (status) =>
    plantings.filter((p) => {
      if (p.status?.toLowerCase() !== status) return false;
      return new Date(p.$updatedAt || p.planting_date) >= seasonCutoff.value;
    }).length;

  return [
    { status: 'planted', label: 'Planted', count: count('planted'), color: 'info' },
    { status: 'growing', label: 'Growing', count: count('growing'), color: 'positive' },
    { status: 'harvesting', label: 'Harvesting', count: count('harvesting'), color: 'warning' },
    { status: 'completed', label: 'Completed', count: countSeason('completed'), color: 'green-8', note: 'season' },
    { status: 'failed', label: 'Failed', count: countSeason('failed'), color: 'negative', note: 'season' },
  ];
});

onMounted(async () => {
  if (!farmStore.plantingsLoaded) {
    await farmStore.fetchPlantings();
  }
});
</script>

<style scoped>
.status-tile {
  transition: box-shadow 0.15s ease;
}
.status-tile:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
