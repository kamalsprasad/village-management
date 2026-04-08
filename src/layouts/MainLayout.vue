<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
          class="lt-md"
        />

        <q-toolbar-title>
          {{ settingsStore.villageName }} - Village Management System
        </q-toolbar-title>

        <div class="text-caption q-mr-md">v{{ version }}</div>

        <!-- User Profile Dropdown -->
        <q-btn
          flat
          round
          dense
          aria-haspopup="menu"
          :aria-expanded="userMenuVisible ? 'true' : 'false'"
          @click="toggleUserMenu"
        >
          <q-avatar size="32px" color="primary" text-color="white">
            <span class="text-weight-bold">{{ isClient ? userInitials : 'U' }}</span>
          </q-avatar>
          <q-menu
            ref="userMenu"
            @before-show="userMenuVisible = true"
            @hide="userMenuVisible = false"
          >
            <q-list style="min-width: 250px">
              <!-- User Info Section -->
              <q-item>
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{
                    isClient ? userName : 'User'
                  }}</q-item-label>
                  <q-item-label caption>{{ userEmail }}</q-item-label>
                </q-item-section>
              </q-item>

              <!-- Role Badges -->
              <q-item v-if="userRoles.length > 0">
                <q-item-section>
                  <div class="q-gutter-xs">
                    <q-chip
                      v-for="role in userRoles"
                      :key="role.$id"
                      size="sm"
                      color="primary"
                      text-color="white"
                      dense
                    >
                      {{ role.name }}
                    </q-chip>
                  </div>
                </q-item-section>
              </q-item>

              <!-- Storage Quota -->
              <q-item v-if="storageQuota !== -1">
                <q-item-section>
                  <q-item-label caption>Storage Quota</q-item-label>
                  <q-linear-progress :value="storageUsagePercent" color="primary" class="q-mt-xs" />
                  <q-item-label caption class="q-mt-xs">
                    {{ formatStorageQuota(storageQuota) }} available
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator class="q-my-sm" />

              <!-- Quick Actions -->
              <q-item clickable v-close-popup to="/profile">
                <q-item-section avatar>
                  <q-icon name="person" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>My Profile</q-item-label>
                </q-item-section>
              </q-item>

              <q-item clickable v-close-popup>
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Settings</q-item-label>
                </q-item-section>
              </q-item>

              <q-separator class="q-my-sm" />

              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-negative">Logout</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>

      <!-- Sample Data Mode Banner - shown when using sample data -->
      <SampleDataBanner v-if="settingsStore.isUsingSampleData" />
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Navigation </q-item-label>

        <!-- Dashboard - Always visible -->
        <q-item clickable to="/" exact>
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-sm" />

        <!-- Households & Residents Section -->
        <q-item-label header> Community </q-item-label>

        <q-item v-if="isClient && hasPermission('households:read')" clickable to="/households">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Households</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="isClient && hasPermission('residents:read')" clickable to="/residents">
          <q-item-section avatar>
            <q-icon name="people" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Residents</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Finance Section -->
        <template
          v-if="isClient && hasAnyPermission(['finance:read', 'inventory:read', 'lending:read'])"
        >
          <q-separator class="q-my-sm" />
          <q-item-label header> Finance </q-item-label>

          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/dashboard"
            :class="{
              'bg-primary text-white':
                $route.path === '/finance' || $route.path === '/finance/dashboard',
            }"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Dashboard</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/transactions"
            :class="{ 'bg-primary text-white': $route.path === '/finance/transactions' }"
          >
            <q-item-section avatar>
              <q-icon name="receipt_long" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Transactions</q-item-label>
            </q-item-section>
          </q-item>

          <!-- Story 2.8: Finance Reports -->
          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/reports"
            :class="{ 'bg-primary text-white': $route.path === '/finance/reports' }"
          >
            <q-item-section avatar>
              <q-icon name="assessment" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Reports</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="hasPermission('inventory:read')" clickable to="/inventory">
            <q-item-section avatar>
              <q-icon name="inventory_2" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Inventory</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('lending:read') && settingsStore.lendingEnabled"
            clickable
            to="/lending"
          >
            <q-item-section avatar>
              <q-icon name="account_balance" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Lending</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <!-- Farm Section -->
        <template v-if="isClient && hasPermission('farm:read')">
          <q-separator class="q-my-sm" />
          <q-item-label header> Agriculture </q-item-label>

          <q-item clickable to="/farm">
            <q-item-section avatar>
              <q-icon name="agriculture" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Farm</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable to="/farm/plantings">
            <q-item-section avatar>
              <q-icon name="spa" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Plantings</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable to="/farm/crops">
            <q-item-section avatar>
              <q-icon name="grass" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Crop Database</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <!-- School Section -->
        <template v-if="isClient && hasPermission('school:read')">
          <q-separator class="q-my-sm" />
          <q-item-label header> Education </q-item-label>

          <q-item clickable to="/school">
            <q-item-section avatar>
              <q-icon name="school" />
            </q-item-section>
            <q-item-section>
              <q-item-label>School</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <!-- Community Services Section -->
        <template
          v-if="
            isClient && hasAnyPermission(['calendar:read', 'communications:read', 'storage:read'])
          "
        >
          <q-separator class="q-my-sm" />
          <q-item-label header> Services </q-item-label>

          <q-item v-if="hasPermission('calendar:read')" clickable to="/calendar">
            <q-item-section avatar>
              <q-icon name="event" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Calendar</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="hasPermission('communications:read')" clickable to="/communications">
            <q-item-section avatar>
              <q-icon name="campaign" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Communications</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="hasPermission('storage:read')" clickable to="/storage">
            <q-item-section avatar>
              <q-icon name="folder" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Storage</q-item-label>
            </q-item-section>
          </q-item>
        </template>

        <!-- Admin Section - Only visible to System Administrators -->
        <template v-if="isClient && hasPermission('*')">
          <q-separator class="q-my-md" />
          <q-item-label header> Administration </q-item-label>

          <q-item clickable to="/admin/users">
            <q-item-section avatar>
              <q-icon name="admin_panel_settings" />
            </q-item-section>
            <q-item-section>
              <q-item-label>User Management</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable to="/settings/village">
            <q-item-section avatar>
              <q-icon name="settings" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Village Settings</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable to="/admin/finance-settings">
            <q-item-section avatar>
              <q-icon name="account_balance_wallet" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Finance Settings</q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import SampleDataBanner from 'src/components/layout/SampleDataBanner.vue';
import { version } from '../../package.json';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { hasPermission, hasAnyPermission, userStorageQuota } = usePermissions();

const leftDrawerOpen = ref(false);
const userMenu = ref(null);
const userMenuVisible = ref(false);
const isClient = ref(false); // Track client-side hydration for SSR

onMounted(() => {
  isClient.value = true; // Enable client-side rendering after hydration
});

// User info computed properties
const userName = computed(() => authStore.user?.name || 'User');
const userEmail = computed(() => authStore.user?.email || '');
const userRoles = computed(() => authStore.userRoles || []);
const storageQuota = computed(() => userStorageQuota.value);
const storageUsagePercent = computed(() => {
  // TODO(Story 1.11): Replace placeholder with actual storage usage once storage metrics are available
  return 0.35; // 35% used
});

// User initials for avatar
const userInitials = computed(() => {
  const name = userName.value;
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

function toggleUserMenu() {
  userMenu.value = !userMenu.value;
}

async function handleLogout() {
  $q.dialog({
    title: 'Confirm Logout',
    message: 'Are you sure you want to log out?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await authStore.logout();

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Logged out successfully',
        position: 'top',
      });
      router.push('/auth');
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to log out',
        position: 'top',
      });
    }
  });
}

function formatStorageQuota(bytes) {
  if (bytes === -1) return 'Unlimited';
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}
</script>
