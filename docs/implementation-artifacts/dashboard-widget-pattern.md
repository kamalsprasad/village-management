# Dashboard Widget Pattern Documentation

**Pattern Name**: Dashboard Widget Component
**Purpose**: Standardized pattern for creating dashboard widgets across all modules (Finance, Farm, School, etc.)
**Date**: 2026-04-06
**Status**: Established (Epic 2)

---

## Overview

This document defines the standardized pattern for dashboard widgets established in Epic 2 (Story 2.9). All future dashboard widgets in Epic 3 (Farm), Epic 4 (School), and beyond should follow this pattern for consistency.

---

## Widget Anatomy

### File Structure

```
src/modules/{module}/components/
├── {Module}DashboardPage.vue      # Main dashboard page
├── {WidgetName}Widget.vue           # Individual widget component
└── use{Module}DashboardData.js      # Data fetching composable (optional)
```

### Component Template

```vue
<!-- src/modules/{module}/components/{WidgetName}Widget.vue -->
<template>
  <q-card class="widget-card">
    <!-- Header -->
    <q-card-section class="widget-header row items-center justify-between">
      <div class="text-subtitle1 text-weight-medium">{{ title }}</div>
      <div class="row items-center q-gutter-sm">
        <!-- Period selector (optional) -->
        <q-btn-toggle
          v-if="showPeriodSelector"
          v-model="selectedPeriod"
          :options="periodOptions"
          dense
          flat
          size="sm"
        />
        <!-- Refresh button (optional) -->
        <q-btn
          icon="refresh"
          flat
          round
          dense
          size="sm"
          @click="$emit('refresh')"
        />
        <!-- Navigation link -->
        <q-btn
          icon="open_in_new"
          flat
          round
          dense
          size="sm"
          :to="detailRoute"
        />
      </div>
    </q-card-section>

    <q-separator />

    <!-- Content -->
    <q-card-section class="widget-content">
      <!-- Empty state -->
      <div v-if="isEmpty" class="text-center text-grey q-pa-md">
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
        <slot name="content" :data="data">
          <!-- Default content layout -->
        </slot>
      </div>
    </q-card-section>

    <!-- Footer (optional) -->
    <q-card-section v-if="$slots.footer" class="widget-footer q-pt-none">
      <slot name="footer" />
    </q-card-section>
  </q-card>
</template>
```

### Component Script

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  data: {
    type: [Object, Array],
    default: () => null
  },
  loading: {
    type: Boolean,
    default: false
  },
  emptyMessage: {
    type: String,
    default: 'No data available'
  },
  detailRoute: {
    type: String,
    default: null
  },
  showPeriodSelector: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['refresh', 'period-change']);

const isEmpty = computed(() => {
  if (!props.data) return true;
  if (Array.isArray(props.data)) return props.data.length === 0;
  if (typeof props.data === 'object') return Object.keys(props.data).length === 0;
  return false;
});

const selectedPeriod = computed({
  get: () => props.period,
  set: (val) => emit('period-change', val)
});
</script>
```

### Component Styles

```vue
<style scoped>
.widget-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  padding: 12px 16px;
}

.widget-content {
  flex: 1;
  min-height: 150px;
}

.widget-footer {
  padding-top: 0;
}
</style>
```

---

## Widget Types Reference

### 1. Summary Cards Widget

**Example**: `FinancialSummaryWidget.vue`

```vue
<template #content>
  <div class="row q-col-gutter-md">
    <div class="col-12 col-sm-4" v-for="item in summaryItems" :key="item.label">
      <q-card bordered flat>
        <q-card-section>
          <div class="text-caption text-grey">{{ item.label }}</div>
          <div class="text-h6 text-weight-bold" :class="item.colorClass">
            {{ formatCurrency(item.value) }}
          </div>
          <div v-if="item.change" class="text-caption">
            <q-icon :name="item.changeIcon" size="xs" />
            {{ item.changeText }}
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>
```

### 2. List Widget

**Example**: `RecentTransactionsWidget.vue`, `LowStockAlertsWidget.vue`

```vue
<template #content="{ data }">
  <q-list dense>
    <q-item
      v-for="item in data.slice(0, 5)"
      :key="item.id"
      clickable
      @click="onItemClick(item)"
    >
      <q-item-section>
        <q-item-label>{{ item.name || item.description }}</q-item-label>
        <q-item-label caption>{{ formatDate(item.date) }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-badge :color="getStatusColor(item.status)">
          {{ formatCurrency(item.amount) }}
        </q-badge>
      </q-item-section>
    </q-item>
  </q-list>
  <div class="text-center q-mt-sm">
    <q-btn
      flat
      dense
      size="sm"
      color="primary"
      label="View All"
      :to="viewAllRoute"
    />
  </div>
</template>
```

### 3. Chart Widget

**Example**: `TopExpenseCategoriesWidget.vue`, `IncomeExpenseTrendWidget.vue`

```vue
<template>
  <WidgetBase
    :title="title"
    :loading="loading"
    :show-period-selector="true"
    @refresh="$emit('refresh')"
    @period-change="$emit('period-change', $event)"
  >
    <template #content>
      <!-- Client-only wrapper for SSR safety -->
      <ClientOnly>
        <canvas ref="chartRef" />
      </ClientOnly>
    </template>
  </WidgetBase>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue';
import { Chart } from 'chart.js';
import ClientOnly from 'src/components/ClientOnly.vue';
import WidgetBase from './WidgetBase.vue';

const props = defineProps({
  chartData: Object,
  loading: Boolean,
  period: String
});

const chartRef = ref(null);
const chartInstance = shallowRef(null);

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = new Chart(chartRef.value, {
      type: 'doughnut', // or 'line', 'bar', etc.
      data: props.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
    chartInstance.value = null;
  }
});

// Update chart when data changes
watch(() => props.chartData, (newData) => {
  if (chartInstance.value) {
    chartInstance.value.data = newData;
    chartInstance.value.update();
  }
}, { deep: true });
</script>
```

### 4. Progress/Bars Widget

**Example**: `FundingSourcesWidget.vue`

```vue
<template #content="{ data }">
  <div class="q-gutter-y-md">
    <div v-for="source in data" :key="source.id">
      <div class="row justify-between text-caption">
        <span>{{ source.name }}</span>
        <span>{{ formatCurrency(source.current_balance) }} / {{ formatCurrency(source.total_received) }}</span>
      </div>
      <q-linear-progress
        :value="source.percentUsed / 100"
        :color="getProgressColor(source.percentUsed)"
        size="md"
        rounded
      />
    </div>
  </div>
</template>
```

---

## Dashboard Page Layout

### Grid System

```vue
<!-- FinanceDashboardPage.vue -->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <h5 class="q-my-none">Financial Dashboard</h5>
      <div class="row q-gutter-sm">
        <q-btn
          icon="refresh"
          label="Refresh"
          flat
          @click="refreshAll"
        />
        <q-btn
          icon="download"
          label="Export"
          color="primary"
          @click="exportDashboard"
        />
      </div>
    </div>

    <!-- Widget Grid -->
    <div class="row q-col-gutter-md">
      <!-- Full width widgets -->
      <div class="col-12">
        <FinancialSummaryWidget
          :data="summaryData"
          :loading="isLoading"
          @refresh="refreshSummary"
        />
      </div>

      <!-- Half width widgets (desktop) -->
      <div class="col-12 col-md-6">
        <RecentTransactionsWidget
          :data="recentTransactions"
          :loading="isLoading"
        />
      </div>
      <div class="col-12 col-md-6">
        <FundingSourcesWidget
          :data="fundingSources"
          :loading="isLoading"
        />
      </div>

      <!-- Third width widgets (desktop) -->
      <div class="col-12 col-md-4">
        <ActiveLoansWidget
          :data="loansData"
          :loading="isLoading"
        />
      </div>
      <div class="col-12 col-md-4">
        <LowStockAlertsWidget
          :data="inventoryAlerts"
          :loading="isLoading"
        />
      </div>
      <div class="col-12 col-md-4">
        <TopExpenseCategoriesWidget
          :data="expenseCategories"
          :loading="isLoading"
        />
      </div>
    </div>
  </q-page>
</template>
```

### Responsive Breakpoints

- **Desktop (1920px+)**: 3-column layout for small widgets, 2-column for medium
- **Tablet (768px)**: 2-column layout for all widgets
- **Mobile (320px)**: Single column, stacked vertically

---

## Data Fetching Pattern

### Unified Dashboard Data Composable

```javascript
// src/modules/{module}/composables/use{Module}DashboardData.js
import { computed, watch } from 'vue';
import { debounce } from 'quasar';
import { use{Module}Store } from '../stores/{module}-store';

export function use{Module}DashboardData() {
  const moduleStore = use{Module}Store();

  // Gracefully handle optional cross-module stores
  let crossModuleStore = null;
  try {
    const { use{Other}Store } = await import('src/modules/{other}/stores/{other}-store');
    crossModuleStore = use{Other}Store();
  } catch {
    // Module not available - graceful degradation
  }

  // Computed dashboard data
  const dashboardData = computed(() => ({
    summary: moduleStore.dashboardData?.summary || defaultSummary,
    recentItems: moduleStore.items.slice(0, 10),
    alerts: crossModuleStore?.itemsNeedingAttention?.slice(0, 5) || [],
  }));

  // Debounced refresh for expensive aggregations
  const debouncedRefresh = debounce(async () => {
    await moduleStore.fetchDashboardData({ forceRefresh: true });
  }, 500);

  // Subscribe to store changes for real-time updates
  watch(() => moduleStore.items, () => {
    debouncedRefresh();
  }, { deep: true });

  // Manual refresh
  const refresh = async () => {
    await Promise.all([
      moduleStore.fetchDashboardData({ forceRefresh: true }),
      crossModuleStore?.fetchData?.(),
    ]);
  };

  return { dashboardData, refresh, debouncedRefresh };
}
```

---

## Real-Time Updates

### Appwrite Realtime Integration

```javascript
// In dashboard page or composable
import { subscribeToRealtime } from 'src/boot/appwrite';

onMounted(() => {
  // Subscribe to relevant collections
  const unsubscribe = subscribeToRealtime(
    ['finance_transactions', 'inventory', 'loans'],
    (event) => {
      // Debounced refresh when data changes
      debouncedRefresh();
    }
  );

  onUnmounted(() => {
    unsubscribe();
  });
});
```

---

## Widget Checklist

Before implementing a new widget, ensure:

- [ ] Widget uses the base widget structure (header, content, optional footer)
- [ ] Empty state is handled with appropriate message
- [ ] Loading state uses `q-skeleton`
- [ ] Chart widgets use `ClientOnly` wrapper for SSR safety
- [ ] Chart instances use `shallowRef` and are properly destroyed in `onUnmounted`
- [ ] Widget is responsive (mobile, tablet, desktop)
- [ ] Widget includes refresh button (emits 'refresh' event)
- [ ] Widget includes navigation link to detail view (if applicable)
- [ ] Period selector included for time-based widgets
- [ ] Uses consistent formatting (currency, dates via shared utils)

---

## Examples from Epic 2

### Reference Implementations

| Widget | File | Key Features |
|--------|------|--------------|
| Financial Summary | `FinancialSummaryWidget.vue` | Summary cards, trend indicators |
| Recent Transactions | `RecentTransactionsWidget.vue` | List with clickable items |
| Funding Sources | `FundingSourcesWidget.vue` | Progress bars |
| Active Loans | `ActiveLoansWidget.vue` | Cross-module data, conditional display |
| Low Stock Alerts | `LowStockAlertsWidget.vue` | Cross-module data (inventory) |
| Top Expense Categories | `TopExpenseCategoriesWidget.vue` | Chart.js doughnut, period selector |
| Income vs Expenses Trend | `IncomeExpenseTrendWidget.vue` | Chart.js line, period selector |

---

## Migration Notes for Epic 3

When creating Farm Dashboard widgets:

1. Copy widget structure from Finance widgets
2. Replace finance-specific data with farm data
3. Update color scheme for farm theme (green/brown)
4. Add farm-specific icons (agriculture, nature)
5. Profitability widgets will need custom calculations (not in ReportService yet)
