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
                  <q-linear-progress
                    :value="personalFilesStore.usagePercent"
                    :color="personalFilesStore.isOverQuota90 ? 'negative' : 'primary'"
                    class="q-mt-xs"
                  />
                  <q-item-label caption class="q-mt-xs">
                    {{ formatStorageQuota(storageQuota) }} total
                  </q-item-label>
                  <q-item-label
                    v-if="personalFilesStore.isOverQuota90"
                    caption
                    class="text-negative"
                  >
                    <q-icon name="warning" size="xs" class="q-mr-xs" />
                    Over 90% full
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

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="nav-drawer">
      <!-- Drawer brand header -->
      <div class="nav-brand q-px-md q-pt-md q-pb-sm">
        <div
          class="text-overline text-weight-bold text-primary"
          style="letter-spacing: 0.12em; font-size: 0.68rem"
        >
          NAVIGATION
        </div>
      </div>

      <q-list class="nav-list q-pb-md">
        <!-- Dashboard - Always visible -->
        <q-item clickable to="/" exact class="nav-top-item" active-class="nav-top-item--active">
          <q-item-section avatar class="nav-top-icon">
            <q-icon name="dashboard" size="22px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="nav-top-label">Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Calendar - Always visible (Story 5.1, all authenticated users) -->
        <q-item clickable to="/calendar" class="nav-top-item" active-class="nav-top-item--active">
          <q-item-section avatar class="nav-top-icon">
            <q-icon name="event" size="22px" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="nav-top-label">Calendar</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator spaced="sm" inset class="nav-separator" />

        <!-- Community Section -->
        <q-expansion-item
          v-model="expandedSections.community"
          icon="people"
          label="Community"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item
            v-if="isClient && hasPermission('households:read')"
            clickable
            to="/households"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="home" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Households</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="isClient && hasPermission('residents:read')"
            clickable
            to="/residents"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="people" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Residents</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- Finance Section -->
        <q-expansion-item
          v-if="isClient && hasAnyPermission(['finance:read', 'inventory:read', 'lending:read'])"
          v-model="expandedSections.finance"
          icon="account_balance"
          label="Finance"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/dashboard"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="dashboard" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Dashboard</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/transactions"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="receipt_long" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Transactions</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('finance:read')"
            clickable
            to="/finance/reports"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="assessment" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Reports</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('inventory:read')"
            clickable
            to="/inventory"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="inventory_2" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Inventory</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('lending:read') && settingsStore.lendingEnabled"
            clickable
            to="/lending"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="account_balance" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Lending</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- Vendors Section (Story 5.7) -->
        <q-expansion-item
          v-if="isClient && hasPermission('vendors:read') && settingsStore.vendorsEnabled"
          v-model="expandedSections.vendors"
          icon="storefront"
          label="Vendors"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item clickable to="/vendors" class="nav-sub-item" active-class="nav-sub-item--active">
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="list" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Vendors</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('vendors:write')"
            clickable
            to="/vendors/add"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="add" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Add Vendor</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- Agriculture Section -->
        <q-expansion-item
          v-if="isClient && hasPermission('farm:read') && settingsStore.farmEnabled"
          v-model="expandedSections.agriculture"
          icon="agriculture"
          label="Agriculture"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item clickable to="/farm" class="nav-sub-item" active-class="nav-sub-item--active">
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="agriculture" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Farm</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/farm/plantings"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="spa" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Plantings</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/farm/crops"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="grass" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Crop Database</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/farm/sales"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="point_of_sale" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Farm Sales</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/farm/reports"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="bar_chart" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Farm Reports</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/farm/alerts"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="notifications_active" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Farm Alerts</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('farm:write')"
            clickable
            to="/farm/settings"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="tune" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Farm Settings</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- School Section -->
        <q-expansion-item
          v-if="isClient && hasPermission('school:read') && settingsStore.schoolEnabled"
          v-model="expandedSections.school"
          icon="school"
          label="School"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item
            clickable
            to="/school/dashboard"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="school" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Dashboard</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/educational-goals"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="trending_up" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Educational Goals</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/learners"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="groups" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Learners</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/classes"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="groups_3" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Classes</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/teachers"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="badge" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Teachers &amp; Faculty</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/calendar"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="event" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">School Calendar</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/school/at-risk-learners"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="warning" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">At-Risk Learners</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('school:admin')"
            clickable
            to="/school/settings"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="tune" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">School Settings</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <!-- Services Section -->
        <q-expansion-item
          v-if="
            isClient && hasAnyPermission(['calendar:read', 'communications:read', 'storage:read'])
          "
          v-model="expandedSections.services"
          icon="miscellaneous_services"
          label="Services"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item
            v-if="hasPermission('communications:read')"
            clickable
            to="/communications"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="campaign" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Communications</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('storage:read')"
            clickable
            to="/storage"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="folder" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Storage</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-if="hasPermission('storage:read')"
            clickable
            to="/storage/shared"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="folder_shared" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Shared Folders</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>

        <q-separator spaced="sm" inset class="nav-separator" />

        <!-- Admin Section -->
        <q-expansion-item
          v-if="isClient && hasPermission('*')"
          v-model="expandedSections.administration"
          icon="admin_panel_settings"
          label="Administration"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-item
            clickable
            to="/admin/users"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="admin_panel_settings" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">User Management</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/admin/modules"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="view_module" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Module Management</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/settings/village"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="settings" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Village Settings</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/admin/finance-settings"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="account_balance_wallet" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Finance Settings</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            to="/admin/storage"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="storage" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Storage Settings</q-item-label>
            </q-item-section>
          </q-item>
        </q-expansion-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { usePermissions } from 'src/composables/usePermissions';
import { usePersonalFilesStore } from 'src/modules/storage/stores/personal-files-store';
import SampleDataBanner from 'src/components/layout/SampleDataBanner.vue';
import { version } from '../../package.json';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const personalFilesStore = usePersonalFilesStore();
const { hasPermission, hasAnyPermission, userStorageQuota } = usePermissions();

const leftDrawerOpen = ref(false);
const userMenu = ref(null);
const userMenuVisible = ref(false);
const isClient = ref(false); // Track client-side hydration for SSR

const expandedSections = reactive({
  community: false,
  finance: false,
  vendors: false,
  agriculture: false,
  school: false,
  services: false,
  administration: false,
});

onMounted(() => {
  isClient.value = true; // Enable client-side rendering after hydration
});

// Fetch personal-file usage whenever auth roles become available or change.
let unwatchRoles = null;
onMounted(() => {
  unwatchRoles = watch(
    () => authStore.userRoles,
    (roles) => {
      if (isClient.value && roles?.length > 0 && hasPermission('storage:read')) {
        personalFilesStore.fetchFiles();
      }
    },
    { immediate: false },
  );
});
onUnmounted(() => {
  unwatchRoles?.();
});

// User info computed properties
const userName = computed(() => authStore.user?.name || 'User');
const userEmail = computed(() => authStore.user?.email || '');
const userRoles = computed(() => authStore.userRoles || []);
const storageQuota = computed(() => userStorageQuota.value);

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

<style lang="scss">
/* ─── Drawer shell ─────────────────────────────────────────────── */
.nav-drawer {
  background: #ffffff;
}

.nav-brand {
  border-bottom: 1px solid rgba(0, 0, 0, 0.07);
  margin-bottom: 4px;
}

.nav-list {
  padding-top: 4px;
}

/* ─── Separator between logical groups ────────────────────────── */
.nav-separator {
  opacity: 0.5;
}

/* ─── Top-level standalone item (Dashboard) ────────────────────── */
.nav-top-item {
  border-radius: 8px;
  margin: 2px 8px;
  min-height: 44px;
  color: rgba(0, 0, 0, 0.72);
  transition:
    background 0.15s ease,
    color 0.15s ease;

  .nav-top-icon {
    min-width: 40px;
  }

  .nav-top-label {
    font-size: 0.875rem;
    font-weight: 500;
  }

  &:hover {
    background: rgba(25, 118, 210, 0.06);
    color: rgba(0, 0, 0, 0.87);
  }

  &.nav-top-item--active {
    background: rgba(25, 118, 210, 0.12);
    color: #1565c0;

    .q-icon {
      color: #1565c0;
    }

    .nav-top-label {
      font-weight: 600;
    }
  }
}

/* ─── Section headers (expansion items) ───────────────────────── */
.nav-section {
  margin: 1px 0;

  /* The clickable header row */
  .nav-section-header {
    min-height: 44px;
    border-radius: 8px;
    margin: 2px 8px;
    color: rgba(0, 0, 0, 0.8);
    font-size: 0.875rem;
    font-weight: 600;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    /* Keep icon and chevron matching text colour */
    .q-icon,
    .nav-expand-icon {
      color: rgba(0, 0, 0, 0.55);
    }
  }
}

/* ─── Sub-items (children inside expansion panels) ─────────────── */
.nav-sub-item {
  border-radius: 6px;
  /* indent relative to section header */
  margin: 1px 8px 1px 20px;
  min-height: 36px;
  color: rgba(0, 0, 0, 0.58);
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-left-color 0.15s ease;
  border-left: 2px solid transparent;

  .nav-sub-icon {
    min-width: 32px;

    .q-icon {
      color: rgba(0, 0, 0, 0.4);
      transition: color 0.15s ease;
    }
  }

  .nav-sub-label {
    font-size: 0.825rem;
    font-weight: 400;
  }

  &:hover {
    background: rgba(25, 118, 210, 0.05);
    color: rgba(0, 0, 0, 0.8);
    border-left-color: rgba(25, 118, 210, 0.3);

    .nav-sub-icon .q-icon {
      color: rgba(25, 118, 210, 0.75);
    }
  }

  &.nav-sub-item--active {
    background: rgba(25, 118, 210, 0.1);
    color: #1565c0;
    border-left-color: #1976d2;

    .nav-sub-icon .q-icon {
      color: #1976d2;
    }

    .nav-sub-label {
      font-weight: 600;
    }
  }
}

/* ─── Dark mode overrides ──────────────────────────────────────── */
.body--dark {
  .nav-drawer {
    background: #1e1e2e;
  }

  .nav-top-item {
    color: rgba(255, 255, 255, 0.75);

    &:hover {
      background: rgba(100, 181, 246, 0.08);
      color: rgba(255, 255, 255, 0.92);
    }

    &.nav-top-item--active {
      background: rgba(100, 181, 246, 0.15);
      color: #90caf9;

      .q-icon {
        color: #90caf9;
      }
    }
  }

  .nav-section .nav-section-header {
    color: rgba(255, 255, 255, 0.8);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .q-icon,
    .nav-expand-icon {
      color: rgba(255, 255, 255, 0.45);
    }
  }

  .nav-sub-item {
    color: rgba(255, 255, 255, 0.52);

    .nav-sub-icon .q-icon {
      color: rgba(255, 255, 255, 0.35);
    }

    &:hover {
      background: rgba(100, 181, 246, 0.06);
      color: rgba(255, 255, 255, 0.8);
      border-left-color: rgba(100, 181, 246, 0.4);

      .nav-sub-icon .q-icon {
        color: rgba(100, 181, 246, 0.8);
      }
    }

    &.nav-sub-item--active {
      background: rgba(100, 181, 246, 0.14);
      color: #90caf9;
      border-left-color: #64b5f6;

      .nav-sub-icon .q-icon {
        color: #64b5f6;
      }
    }
  }
}
</style>
