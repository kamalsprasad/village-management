<!--
  FarmAlertsWidget.vue

  Story 3.10: Dashboard widget showing active farm alerts with severity badges.
  Alerts are generated in-memory on each mount; no persistence in MVP.
-->
<template>
  <q-card>
    <q-card-section>
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle2 text-weight-medium">
          <q-icon name="notifications_active" size="sm" class="q-mr-xs text-orange" />
          Farm Alerts
          <q-badge v-if="activeCount" color="negative" class="q-ml-xs">{{ activeCount }}</q-badge>
        </div>
        <q-btn
          flat
          dense
          size="xs"
          icon="open_in_new"
          color="grey"
          @click="$router.push('/farm/alerts')"
        >
          <q-tooltip>View All Alerts</q-tooltip>
        </q-btn>
      </div>

      <div v-if="isLoading" class="q-pa-xs">
        <q-skeleton type="text" v-for="i in 3" :key="i" class="q-my-xs" />
      </div>

      <div v-else-if="!alerts.length" class="text-grey text-caption text-center q-pa-md">
        <q-icon name="check_circle" color="positive" size="sm" class="q-mr-xs" />
        No active alerts
      </div>

      <q-list v-else dense separator>
        <q-item
          v-for="alert in previewAlerts"
          :key="alert.alert_type + alert.related_entity_id"
          dense
          clickable
          @click="navigateToEntity(alert)"
          class="q-px-none"
        >
          <q-item-section avatar style="min-width: 28px">
            <q-icon
              :name="severityIcon(alert.severity)"
              :color="severityColor(alert.severity)"
              size="xs"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-caption ellipsis">
              {{ alert.title.length > 80 ? alert.title.slice(0, 80) + '...' : alert.title }}
              <q-tooltip v-if="alert.title.length > 80">{{ alert.title }}</q-tooltip>
            </q-item-label>
            <q-item-label caption>{{ formatRelativeTime(alert.triggered_at) }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              :color="severityColor(alert.severity)"
              outline
              :label="alert.severity"
              style="font-size: 9px"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="alerts.length > PREVIEW_LIMIT" class="text-caption text-grey text-right q-mt-xs">
        +{{ alerts.length - PREVIEW_LIMIT }} more —
        <span class="text-primary cursor-pointer" @click="$router.push('/farm/alerts')"
          >view all</span
        >
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFarmStore } from '../stores/farm-store';
import { useInventoryStore } from 'src/stores/inventory-store';

const PREVIEW_LIMIT = 5;

const farmStore = useFarmStore();
const inventoryStore = useInventoryStore();
const router = useRouter();

const isLoading = ref(true);
const alerts = ref([]);

const previewAlerts = computed(() => alerts.value.slice(0, PREVIEW_LIMIT));
const activeCount = computed(
  () => alerts.value.filter((a) => a.severity === 'critical' || a.severity === 'warning').length,
);

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

function severityIcon(severity) {
  return severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info';
}

function severityColor(severity) {
  return severity === 'critical' ? 'negative' : severity === 'warning' ? 'orange' : 'info';
}

function navigateToEntity(alert) {
  if (alert.related_entity_type === 'planting') {
    router.push(`/farm/plantings/${alert.related_entity_id}`);
  } else if (alert.related_entity_type === 'inventory') {
    router.push(`/inventory/${alert.related_entity_id}`);
  } else {
    router.push('/farm/alerts');
  }
}

onMounted(async () => {
  // Ensure all required data is present
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
});
</script>
