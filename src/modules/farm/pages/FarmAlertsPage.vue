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
        <div class="text-h5 text-weight-bold">
          <q-icon name="notifications_active" class="q-mr-sm text-orange" />
          Farm Alerts
        </div>
        <div class="text-caption text-grey">
          {{ unreadCount }} unread · {{ alerts.length }} total active alerts
        </div>
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

      <q-list v-else separator bordered class="rounded-borders">
        <q-item
          v-for="alert in filteredAlerts"
          :key="alert.alert_type + alert.related_entity_id"
          :class="readIds.has(alertKey(alert)) ? 'bg-grey-1' : ''"
          clickable
          @click="navigateToEntity(alert)"
        >
          <q-item-section avatar>
            <q-icon
              :name="severityIcon(alert.severity)"
              :color="severityColor(alert.severity)"
              size="sm"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label :class="readIds.has(alertKey(alert)) ? 'text-grey' : 'text-weight-medium'">
              {{ alert.title }}
            </q-item-label>
            <q-item-label caption>
              {{ alertTypeLabel(alert.alert_type) }}
              · {{ formatRelativeTime(alert.triggered_at) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="row items-center q-gutter-xs">
              <q-badge
                :color="severityColor(alert.severity)"
                :label="alert.severity"
                outline
              />
              <q-btn
                flat
                round
                dense
                size="xs"
                :icon="readIds.has(alertKey(alert)) ? 'mark_email_unread' : 'mark_email_read'"
                :color="readIds.has(alertKey(alert)) ? 'grey' : 'primary'"
                @click.stop="toggleRead(alert)"
              >
                <q-tooltip>{{ readIds.has(alertKey(alert)) ? 'Mark unread' : 'Mark read' }}</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="close"
                color="grey"
                @click.stop="dismiss(alert)"
              >
                <q-tooltip>Dismiss</q-tooltip>
              </q-btn>
            </div>
          </q-item-section>
        </q-item>
      </q-list>
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
    .filter((a) => !filterType.value || a.alert_type === filterType.value);
});

const unreadCount = computed(() =>
  filteredAlerts.value.filter((a) => !readIds.value.has(alertKey(a))).length,
);

function severityIcon(s) {
  return s === 'critical' ? 'error' : s === 'warning' ? 'warning' : 'info';
}

function severityColor(s) {
  return s === 'critical' ? 'negative' : s === 'warning' ? 'orange' : 'info';
}

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
  isLoading.value = false;
}

onMounted(loadAlerts);
</script>
