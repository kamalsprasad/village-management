<!--
  WidgetBase.vue
  Shared dashboard widget component for consistent widget structure across modules.
  Pattern established in Epic 2, extended for Epic 3+ modules.
-->
<template>
  <q-card class="widget-card full-height">
    <!-- Header -->
    <q-card-section class="widget-header row items-center justify-between">
      <div class="text-subtitle1 text-weight-medium">{{ title }}</div>
      <div class="row items-center q-gutter-sm">
        <!-- Period selector (optional) -->
        <q-btn-toggle
          v-if="showPeriodSelector"
          v-model="selectedPeriod"
          dense
          unelevated
          toggle-color="primary"
          :options="periodOptions"
          @update:model-value="$emit('periodChange', $event)"
        />
        <!-- Refresh button (optional) -->
        <q-btn
          v-if="showRefresh"
          icon="refresh"
          flat
          round
          dense
          size="sm"
          :loading="loading"
          @click="$emit('refresh')"
        />
        <!-- Navigation link (optional) -->
        <q-btn v-if="detailRoute" icon="open_in_new" flat round dense size="sm" :to="detailRoute" />
      </div>
    </q-card-section>

    <q-separator />

    <!-- Content -->
    <q-card-section class="widget-content">
      <!-- Empty state -->
      <div v-if="empty && !loading" class="text-center text-grey q-pa-md">
        <q-icon name="info" size="2em" />
        <div class="q-mt-sm">{{ emptyMessage }}</div>
      </div>

      <!-- Loading state -->
      <div v-else-if="loading" class="q-pa-md">
        <q-skeleton type="text" class="q-mb-sm" />
        <q-skeleton type="rect" height="100px" />
      </div>

      <!-- Data content -->
      <div v-else>
        <slot name="content" />
      </div>
    </q-card-section>

    <!-- Footer (optional) -->
    <q-card-section v-if="$slots.footer" class="widget-footer q-pt-none">
      <slot name="footer" />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, watch } from 'vue';

const emit = defineEmits(['refresh', 'periodChange']);

const selectedPeriod = ref('1m');

// Watch for period changes and emit event
watch(selectedPeriod, (newValue) => {
  emit('periodChange', newValue);
});

defineProps({
  title: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  empty: {
    type: Boolean,
    default: false,
  },
  emptyMessage: {
    type: String,
    default: 'No data available',
  },
  showRefresh: {
    type: Boolean,
    default: true,
  },
  showPeriodSelector: {
    type: Boolean,
    default: false,
  },
  periodOptions: {
    type: Array,
    default: () => [
      { label: '1M', value: '1m' },
      { label: '3M', value: '3m' },
      { label: '6M', value: '6m' },
      { label: '12M', value: '12m' },
    ],
  },
  detailRoute: {
    type: String,
    default: null,
  },
});
</script>

<style scoped>
.widget-card {
  display: flex;
  flex-direction: column;
}

.widget-header {
  padding: 12px 16px;
  min-height: 48px;
}

.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.widget-footer {
  padding-top: 0;
}

.full-height {
  height: 100%;
}
</style>
