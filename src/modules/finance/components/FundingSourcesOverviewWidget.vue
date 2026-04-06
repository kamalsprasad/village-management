<template>
  <q-card flat bordered class="funding-sources-widget">
    <q-card-section>
      <div class="row items-center justify-between">
        <div class="text-h6">
          <q-icon name="account_balance" class="q-mr-sm" color="primary" />
          Funding Sources Overview
        </div>
        <q-btn
          v-if="showViewAll"
          flat
          dense
          round
          icon="open_in_new"
          color="primary"
          size="sm"
          to="/admin/finance-settings"
        >
          <q-tooltip>View All Funding Sources</q-tooltip>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator />

    <!-- Loading State -->
    <q-card-section v-if="loading">
      <div class="column q-gutter-sm">
        <q-skeleton type="rect" height="60px" />
        <q-skeleton type="rect" height="60px" />
        <q-skeleton type="rect" height="60px" />
      </div>
    </q-card-section>

    <!-- Content -->
    <q-card-section v-else-if="activeSources.length > 0" class="q-pa-sm">
      <q-list dense>
        <q-item v-for="source in displayedSources" :key="source.$id" class="q-pa-sm">
          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ source.name }}
              <q-badge
                :color="getStatusColor(source.status)"
                :label="source.status"
                class="q-ml-sm"
              />
            </q-item-label>
            <q-item-label caption>
              <q-badge
                outline
                :color="getTypeColor(source.type)"
                :label="source.type"
                class="q-mr-sm"
              />
              {{ formatCurrency(source.current_balance) }} of
              {{ formatCurrency(source.total_received) }}
            </q-item-label>

            <!-- Progress Bar -->
            <div class="q-mt-sm">
              <q-linear-progress
                :value="getUtilizationRatio(source)"
                :color="getProgressColor(source)"
                size="8px"
                rounded
                class="q-mb-xs"
              />
              <div class="row justify-between text-caption text-grey-7">
                <span>{{ getUtilizationPercent(source) }}% remaining</span>
                <span v-if="source.restrictions" class="text-italic">
                  <q-icon name="info" size="xs" />
                  Has restrictions
                </span>
              </div>
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Show more indicator -->
      <div v-if="activeSources.length > maxDisplay" class="text-center q-mt-sm">
        <q-btn
          flat
          dense
          size="sm"
          :label="`+${activeSources.length - maxDisplay} more`"
          color="primary"
          @click="$emit('show-all')"
        />
      </div>
    </q-card-section>

    <!-- Empty State -->
    <q-card-section v-else class="text-center text-grey-6 q-pa-lg">
      <q-icon name="account_balance" size="3rem" class="q-mb-sm" />
      <div>No active funding sources</div>
      <q-btn
        v-if="allowAddSource"
        flat
        dense
        color="primary"
        label="Add Funding Source"
        class="q-mt-sm"
        @click="$emit('add-source')"
      />
    </q-card-section>

    <!-- Summary Footer -->
    <q-separator v-if="activeSources.length > 0" />
    <q-card-section v-if="activeSources.length > 0" class="q-pa-sm">
      <div class="row justify-between text-caption">
        <span class="text-grey-7">
          <q-icon name="account_balance_wallet" size="xs" class="q-mr-xs" />
          Total Available: <strong class="text-positive">{{ formatCurrency(totalBalance) }}</strong>
        </span>
        <span class="text-grey-7">
          {{ activeSources.length }} active source{{ activeSources.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  sources: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  maxDisplay: {
    type: Number,
    default: 5,
  },
  showViewAll: {
    type: Boolean,
    default: true,
  },
  allowAddSource: {
    type: Boolean,
    default: true,
  },
});

defineEmits(['show-all', 'add-source']);

// Computed
const activeSources = computed(() => {
  return props.sources.filter((s) => s.status === 'active');
});

const displayedSources = computed(() => {
  return activeSources.value.slice(0, props.maxDisplay);
});

const totalBalance = computed(() => {
  return activeSources.value.reduce((sum, s) => sum + (s.current_balance || 0), 0);
});

// Helpers
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getUtilizationRatio(source) {
  if (!source.total_received || source.total_received === 0) return 0;
  return source.current_balance / source.total_received;
}

function getUtilizationPercent(source) {
  return Math.round(getUtilizationRatio(source) * 100);
}

function getProgressColor(source) {
  const ratio = getUtilizationRatio(source);
  if (ratio > 0.5) return 'positive';
  if (ratio > 0.2) return 'warning';
  return 'negative';
}

function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'positive';
    case 'inactive':
      return 'grey';
    case 'depleted':
      return 'negative';
    default:
      return 'grey';
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'grant':
      return 'primary';
    case 'donation':
      return 'secondary';
    case 'income':
      return 'positive';
    case 'loan':
      return 'warning';
    default:
      return 'grey';
  }
}
</script>

<style scoped>
.funding-sources-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
