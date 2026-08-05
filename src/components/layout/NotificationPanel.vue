<template>
  <div>
    <!-- Header -->
    <div class="row items-center justify-between q-pa-sm bg-grey-2">
      <div class="text-subtitle2 text-weight-medium">Notifications</div>
      <div class="row items-center q-gutter-x-sm">
        <q-btn-toggle
          v-if="filterOptions.length > 1"
          v-model="filterType"
          flat
          dense
          no-caps
          :options="filterOptions"
          size="sm"
          toggle-color="primary"
        />
        <q-btn
          v-if="notificationsStore.unreadCount > 0"
          flat
          dense
          size="sm"
          label="Mark all read"
          color="primary"
          @click="notificationsStore.markAllRead()"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="notificationsStore.loading" class="flex flex-center q-pa-md">
      <q-spinner color="primary" size="2em" />
    </div>

    <!-- Error -->
    <div
      v-else-if="notificationsStore.error"
      class="text-caption text-negative text-center q-pa-md"
    >
      Unable to load notifications right now.
    </div>

    <!-- Empty -->
    <div
      v-else-if="notificationsStore.filteredNotifications.length === 0"
      class="text-caption text-grey text-center q-pa-md"
    >
      No notifications
    </div>

    <!-- List -->
    <q-list v-else dense separator style="max-height: 400px; overflow-y: auto">
      <q-item
        v-for="n in notificationsStore.filteredNotifications"
        :key="n.$id"
        clickable
        class="q-py-sm"
        :class="{ 'bg-blue-1': !n.is_read }"
        @click="onClick(n)"
      >
        <q-item-section avatar style="min-width: 32px">
          <q-icon :name="severityIcon(n.severity)" :color="severityColor(n.severity)" size="sm" />
          <q-badge
            v-if="!n.is_read"
            color="primary"
            rounded
            floating
            style="top: 2px; right: 2px"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ n.title }}</q-item-label>
          <q-item-label v-if="n.body" caption class="q-mt-xs">{{ n.body }}</q-item-label>
          <q-item-label caption class="q-mt-xs">
            {{ formatRelativeTime(n.$createdAt) }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { useNotificationsStore } from 'src/stores/notifications-store';

const notificationsStore = useNotificationsStore();

const emit = defineEmits(['close']);

const filterType = computed({
  get: () => notificationsStore.filterType,
  set: (value) => notificationsStore.filterByType(value),
});

const filterOptions = computed(() => [
  { label: 'All', value: null },
  ...notificationsStore.distinctTypes.map((type) => ({ label: type, value: type })),
]);

function severityIcon(severity) {
  return severity === 'critical' ? 'error' : severity === 'warning' ? 'warning' : 'info';
}

function severityColor(severity) {
  return severity === 'critical' ? 'negative' : severity === 'warning' ? 'orange' : 'info';
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function onClick(notification) {
  emit('close');
  notificationsStore.markRead(notification.$id);
  if (notification.link) {
    // Navigation is the responsibility of the parent, which has the router.
    emit('navigate', notification.link);
  }
}
</script>
