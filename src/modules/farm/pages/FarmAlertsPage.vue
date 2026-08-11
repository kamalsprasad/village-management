<!--
  FarmAlertsPage.vue

  Story 3.10: Full alerts list page with filter, read/unread toggle (in-memory),
  dismiss, and navigation to related entities.
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Farm Alerts</h4>
        <p class="text-grey-7 q-mb-none">
          {{ unreadCount }} unread · {{ alerts.length }} total active alerts
        </p>
      </div>
      <div class="row q-gutter-sm">
        <q-btn
          flat
          dense
          icon="settings"
          label="Alert Settings"
          color="primary"
          @click="$router.push('/farm/settings')"
        />
        <q-btn
          flat
          dense
          icon="arrow_back"
          label="Farm"
          color="primary"
          @click="$router.push('/farm')"
        />
      </div>
    </div>

    <!-- Filter + Mark All Row -->
    <div class="row items-center q-gutter-sm q-mb-md">
      <q-select
        v-model="filterSeverity"
        dense
        outlined
        label="Severity"
        :options="severityOptions"
        clearable
        style="min-width: 140px"
      />
      <q-select
        v-model="filterType"
        dense
        outlined
        label="Alert Type"
        :options="alertTypeOptions"
        clearable
        style="min-width: 200px"
      />
      <q-input
        v-model="filterDateFrom"
        dense
        outlined
        type="date"
        label="From"
        style="min-width: 140px"
        clearable
      />
      <q-input
        v-model="filterDateTo"
        dense
        outlined
        type="date"
        label="To"
        style="min-width: 140px"
        clearable
      />
      <q-btn
        flat
        dense
        size="sm"
        icon="refresh"
        label="Refresh"
        color="primary"
        :loading="isLoading"
        @click="loadAlerts"
      />
      <q-btn
        v-if="unreadCount > 0"
        flat
        dense
        size="sm"
        icon="done_all"
        label="Mark All Read"
        color="grey"
        @click="markAllRead"
      />
    </div>

    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner color="orange" size="3em" />
      <span class="q-ml-md text-grey">Generating alerts…</span>
    </div>

    <template v-else>
      <div v-if="!filteredAlerts.length" class="text-center text-grey q-pa-xl">
        <q-icon name="check_circle" color="positive" size="3em" class="q-mb-md" />
        <div class="text-h6">No alerts</div>
        <div class="text-caption">All systems nominal.</div>
      </div>

      <q-table
        v-else
        :rows="filteredAlerts"
        :columns="alertColumns"
        :row-key="(row) => alertKey(row)"
        flat
        dense
        :rows-per-page-options="[10, 25, 0]"
        :pagination="{ rowsPerPage: 10 }"
        :row-class="getRowClass"
        @row-click="(_evt, row) => navigateToEntity(row)"
      >
        <template #body-cell-severity="{ value }">
          <q-td class="text-center">
            <q-icon :name="severityIcon(value)" :color="severityColor(value)" size="sm" />
            <q-badge
              :color="severityColor(value)"
              :label="value"
              outline
              class="q-ml-xs"
              style="font-size: 9px"
            />
          </q-td>
        </template>

        <template #body-cell-title="{ row }">
          <q-td>
            <div :class="readIds.has(alertKey(row)) ? 'text-grey' : 'text-weight-medium'">
              {{ row.title.length > 80 ? row.title.slice(0, 80) + '...' : row.title }}
              <q-tooltip v-if="row.title.length > 80">{{ row.title }}</q-tooltip>
            </div>
            <div class="text-caption text-grey">
              {{ formatRelativeTime(row.triggered_at) }}
            </div>
          </q-td>
        </template>

        <template #body-cell-entity="{ row }">
          <q-td>
            <q-btn
              v-if="row.related_entity_type"
              flat
              dense
              size="xs"
              color="primary"
              icon="open_in_new"
              :label="row.related_entity_type"
              @click.stop="navigateToEntity(row)"
            />
            <span v-else class="text-grey">—</span>
          </q-td>
        </template>

        <template #body-cell-actions="{ row }">
          <q-td class="text-center">
            <q-btn
              flat
              round
              dense
              size="xs"
              :icon="readIds.has(alertKey(row)) ? 'mark_email_unread' : 'mark_email_read'"
              :color="readIds.has(alertKey(row)) ? 'grey' : 'primary'"
              @click.stop="toggleRead(row)"
            >
              <q-tooltip>{{ readIds.has(alertKey(row)) ? 'Mark unread' : 'Mark read' }}</q-tooltip>
            </q-btn>
            <q-btn flat round dense size="xs" icon="close" color="grey" @click.stop="dismiss(row)">
              <q-tooltip>Dismiss</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';

const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();
const router = useRouter();

const isLoading = ref(true);
const alerts = ref([]);
const dismissedKeys = ref(new Set());
const readIds = ref(new Set());

const filterSeverity = ref(null);
const filterType = ref(null);
const filterDateFrom = ref('');
const filterDateTo = ref('');

const severityOptions = ['critical', 'warning', 'info'];
const alertTypeOptions = [
  { label: 'Upcoming Harvest', value: 'upcoming_harvest' },
  { label: 'Overdue Harvest', value: 'overdue_harvest' },
  { label: 'Low Inventory', value: 'low_inventory' },
  { label: 'Underperforming Yield', value: 'underperforming_yield' },
  { label: 'Crop Failure', value: 'crop_failure' },
];

function alertKey(a) {
  return `${a.alert_type}__${a.related_entity_id}`;
}

const filteredAlerts = computed(() => {
  return alerts.value
    .filter((a) => !dismissedKeys.value.has(alertKey(a)))
    .filter((a) => !filterSeverity.value || a.severity === filterSeverity.value)
    .filter((a) => !filterType.value || a.alert_type === filterType.value)
    .filter((a) => {
      if (!filterDateFrom.value && !filterDateTo.value) return true;
      const d = a.triggered_at?.split('T')[0];
      if (filterDateFrom.value && d < filterDateFrom.value) return false;
      if (filterDateTo.value && d > filterDateTo.value) return false;
      return true;
    });
});

const unreadCount = computed(
  () => filteredAlerts.value.filter((a) => !readIds.value.has(alertKey(a))).length,
);

function alertTypeLabel(t) {
  const map = {
    upcoming_harvest: 'Upcoming Harvest',
    overdue_harvest: 'Overdue Harvest',
    low_inventory: 'Low Inventory',
    underperforming_yield: 'Underperforming Yield',
    crop_failure: 'Crop Failure',
  };
  return map[t] || t;
}

const alertColumns = [
  { name: 'severity', label: 'Severity', field: 'severity', align: 'center', sortable: true },
  {
    name: 'type',
    label: 'Type',
    field: 'alert_type',
    align: 'left',
    sortable: true,
    format: alertTypeLabel,
  },
  { name: 'title', label: 'Title', field: 'title', align: 'left', sortable: true },
  {
    name: 'triggeredAt',
    label: 'Triggered',
    field: 'triggered_at',
    align: 'left',
    sortable: true,
    format: formatRelativeTime,
  },
  { name: 'entity', label: 'Entity', field: 'related_entity_type', align: 'left' },
  { name: 'actions', label: 'Actions', field: () => null, align: 'center' },
];

function getRowClass(row) {
  return readIds.value.has(alertKey(row)) ? 'bg-grey-1' : '';
}

function severityIcon(s) {
  return s === 'critical' ? 'error' : s === 'warning' ? 'warning' : 'info';
}

function severityColor(s) {
  return s === 'critical' ? 'negative' : s === 'warning' ? 'orange' : 'info';
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.floor(diffHrs / 24)}d ago`;
  } catch {
    return '';
  }
}

function toggleRead(alert) {
  const key = alertKey(alert);
  if (readIds.value.has(key)) {
    readIds.value.delete(key);
  } else {
    readIds.value.add(key);
  }
  readIds.value = new Set(readIds.value);
}

function markAllRead() {
  filteredAlerts.value.forEach((a) => readIds.value.add(alertKey(a)));
  readIds.value = new Set(readIds.value);
}

function dismiss(alert) {
  dismissedKeys.value.add(alertKey(alert));
  dismissedKeys.value = new Set(dismissedKeys.value);
}

function navigateToEntity(alert) {
  toggleRead(alert);
  if (alert.related_entity_type === 'planting') {
    router.push(`/farm/plantings/${alert.related_entity_id}`);
  } else if (alert.related_entity_type === 'inventory') {
    router.push(`/inventory/${alert.related_entity_id}`);
  }
}

async function loadAlerts() {
  isLoading.value = true;
  dismissedKeys.value = new Set();
  await farmStore.ensureYieldDataLoaded();
  if (!inventoryStore.farmInputsLoaded) {
    await inventoryStore.fetchFarmInputItems();
  }
  if (!farmStore.alertConfigLoaded) {
    await farmStore.fetchAlertConfig();
  }
  alerts.value = farmStore.generateFarmAlerts();
  farmStore.notifyNewFarmAlerts(alerts.value);
  isLoading.value = false;
}

onMounted(loadAlerts);
</script>
