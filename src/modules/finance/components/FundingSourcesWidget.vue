<template>
  <q-card class="full-height">
    <q-card-section class="row items-center justify-between">
      <div>
        <div class="text-h6">Funding Sources</div>
        <div class="text-caption text-grey">Current Status</div>
      </div>
      <q-btn v-if="!readOnly" flat color="primary" label="Manage" to="/admin/finance-settings" />
    </q-card-section>

    <q-card-section v-if="sources.length > 0">
      <div v-for="source in sources" :key="source.$id" class="q-mb-md">
        <div class="row justify-between items-end q-mb-xs">
          <div class="text-subtitle2 cursor-pointer text-primary" @click="goToDetail(source)">
            {{ source.name }}
          </div>
          <div class="text-caption text-grey-8">
            {{ formatCurrency(source.current_balance) }} left
          </div>
        </div>

        <q-linear-progress
          :value="source.percentUsed / 100"
          :color="getProgressColor(source.percentUsed)"
          rounded
          size="12px"
          class="q-mt-xs cursor-pointer"
          @click="goToDetail(source)"
        >
          <q-tooltip>
            {{ source.percentUsed.toFixed(1) }}% Used ({{
              formatCurrency(source.total_received - source.current_balance)
            }}
            of {{ formatCurrency(source.total_received) }})
          </q-tooltip>
        </q-linear-progress>
      </div>

      <q-separator class="q-my-md" />

      <div class="row q-gutter-sm justify-center">
        <q-chip outline color="primary" size="sm"> {{ sources.length }} Total Sources </q-chip>
        <q-chip v-if="depletedCount > 0" outline color="negative" size="sm">
          {{ depletedCount }} Depleted
        </q-chip>
        <q-chip v-if="restrictedCount > 0" outline color="warning" text-color="dark" size="sm">
          {{ restrictedCount }} Restricted
        </q-chip>
      </div>
    </q-card-section>

    <q-card-section v-else-if="!loading" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="volunteer_activism" size="3rem" class="q-mb-sm" />
      <div>No funding sources available</div>
    </q-card-section>

    <!-- Loading Overlay -->
    <q-inner-loading :showing="loading">
      <q-spinner-dots size="50px" color="primary" />
    </q-inner-loading>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { formatCurrency } from 'src/services/ReportService';

const props = defineProps({
  sources: {
    type: Array,
    required: true,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();

const getProgressColor = (percentUsed) => {
  if (percentUsed >= 90) return 'negative';
  if (percentUsed >= 70) return 'warning';
  return 'positive';
};

const depletedCount = computed(() => {
  return props.sources.filter((s) => s.status === 'depleted' || s.current_balance <= 0).length;
});

const restrictedCount = computed(() => {
  return props.sources.filter((s) => s.restrictions && s.restrictions.trim() !== '').length;
});

const goToDetail = (source) => {
  router.push(`/finance/funding/${source.$id}`);
};
</script>
