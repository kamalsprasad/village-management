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

        <!-- Global Quick Search -->
        <div class="gt-xs q-mr-md" style="width: 260px">
          <q-input
            v-model="searchTerm"
            dense
            outlined
            clearable
            debounce="300"
            placeholder="Search..."
            aria-label="Search"
            bg-color="white"
            color="dark"
            input-class="text-dark"
            @update:model-value="onSearchInput"
            @focus="onSearchFocus"
            @keydown="onSearchKeydown"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
            <q-tooltip
              >Search across residents, households, finance, plots, learners, vendors, inventory,
              and calendar events.</q-tooltip
            >
          </q-input>
          <q-menu v-model="searchMenuOpen" fit no-parent-event no-focus no-refocus :offset="[0, 4]">
            <q-list style="min-width: 260px">
              <template v-if="(searchTerm || '').length < 2">
                <q-item>
                  <q-item-section class="text-grey"> Type at least 2 characters </q-item-section>
                </q-item>
              </template>
              <template v-else-if="loading">
                <q-item>
                  <q-item-section class="flex flex-center">
                    <q-spinner color="primary" size="2em" />
                  </q-item-section>
                </q-item>
              </template>
              <template v-else-if="Object.keys(groupedResults).length === 0">
                <q-item>
                  <q-item-section class="text-grey"> No results </q-item-section>
                </q-item>
              </template>
              <template v-else>
                <template v-for="(group, groupName) in groupedResults" :key="groupName">
                  <q-item-label header class="text-uppercase text-grey-7">
                    {{ groupName }}
                  </q-item-label>
                  <q-item
                    v-for="result in group"
                    :key="`${groupName}-${result.id}`"
                    clickable
                    v-close-popup
                    :class="{ highlighted: flattenedResults[highlightedIndex] === result }"
                    @click="onResultClick(result)"
                  >
                    <q-item-section avatar>
                      <q-icon :name="result.icon" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ result.label }}</q-item-label>
                      <q-item-label caption>{{ result.secondary }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </template>
            </q-list>
          </q-menu>
        </div>

        <!-- Notifications Bell -->
        <q-btn
          flat
          round
          dense
          icon="notifications"
          aria-label="Notifications"
          class="q-mr-sm"
          @click="$q.screen.xs && (notificationOpen = true)"
        >
          <q-tooltip>View your notifications. Unread count shown on the badge.</q-tooltip>
          <q-badge
            v-if="notificationsStore.unreadCount > 0"
            floating
            color="red"
            role="status"
            aria-live="polite"
            :aria-label="`${notificationsStore.unreadCount} unread notifications`"
          >
            {{ notificationBadgeLabel }}
          </q-badge>

          <q-menu
            v-if="$q.screen.gt.xs"
            anchor="bottom right"
            self="top right"
            :offset="[0, 8]"
            style="width: 360px; max-width: 90vw"
          >
            <NotificationPanel @close="closeNotificationPanel" @navigate="router.push" />
          </q-menu>
        </q-btn>

        <q-dialog v-if="$q.screen.xs" v-model="notificationOpen" full-width position="top">
          <q-card style="max-width: 100vw">
            <NotificationPanel @close="closeNotificationPanel" @navigate="router.push" />
          </q-card>
        </q-dialog>

        <!-- Help Dropdown -->
        <q-btn
          flat
          round
          dense
          icon="help"
          aria-label="Help"
          class="q-mr-sm"
          @click="$q.screen.xs && (helpMenuOpen = true)"
        >
          <q-tooltip>Help, user guide, and FAQ.</q-tooltip>

          <q-menu
            v-if="$q.screen.gt.xs"
            anchor="bottom right"
            self="top right"
            :offset="[0, 8]"
            style="min-width: 220px"
          >
            <HelpMenuList @navigate="onHelpNavigate" />
          </q-menu>
        </q-btn>

        <q-dialog v-if="$q.screen.xs" v-model="helpMenuOpen" full-width position="top">
          <q-card style="max-width: 100vw">
            <HelpMenuList @navigate="onHelpNavigate" />
          </q-card>
        </q-dialog>

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
          <q-tooltip>Manage households and residents.</q-tooltip>
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
          <q-tooltip>Record transactions, manage inventory, and track lending.</q-tooltip>
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
          <q-tooltip>Manage suppliers and buyers.</q-tooltip>
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
          <q-tooltip>Manage farm plots, crops, plantings, harvests, and sales.</q-tooltip>
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
          <q-tooltip>Manage learners, classes, attendance, and academic records.</q-tooltip>
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
          v-if="isClient && hasAnyPermission(['calendar:read', 'storage:read'])"
          v-model="expandedSections.services"
          icon="miscellaneous_services"
          label="Services"
          class="nav-section"
          header-class="nav-section-header"
          expand-icon-class="nav-expand-icon"
        >
          <q-tooltip>Access the village calendar and file storage.</q-tooltip>
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
          <q-tooltip>Manage users, roles, modules, and village settings.</q-tooltip>
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
            to="/admin/roles"
            class="nav-sub-item"
            active-class="nav-sub-item--active"
          >
            <q-item-section avatar class="nav-sub-icon">
              <q-icon name="verified_user" size="16px" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="nav-sub-label">Roles & Permissions</q-item-label>
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
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, reactive, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { Realtime } from 'appwrite';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { useNotificationsStore } from 'src/stores/notifications-store';
import { usePermissions } from 'src/composables/usePermissions';
import { usePersonalFilesStore } from 'src/modules/storage/stores/personal-files-store';
import { useGlobalSearch } from 'src/composables/useGlobalSearch';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { client } from 'src/boot/appwrite';
import SampleDataBanner from 'src/components/layout/SampleDataBanner.vue';
import NotificationPanel from 'src/components/layout/NotificationPanel.vue';
import HelpMenuList from 'src/components/layout/HelpMenuList.vue';
import { version } from '../../package.json';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const notificationsStore = useNotificationsStore();
const personalFilesStore = usePersonalFilesStore();
const { hasPermission, hasAnyPermission, userStorageQuota } = usePermissions();
const { searchTerm, groupedResults, loading, search } = useGlobalSearch();
const errorHandler = useErrorHandler();

const searchMenuOpen = ref(false);
const highlightedIndex = ref(-1);

// Flatten groupedResults (object keyed by group name -> array of results)
// into a single ordered list for arrow-key traversal, matching display order.
const flattenedResults = computed(() => {
  const flat = [];
  for (const groupName in groupedResults.value) {
    for (const result of groupedResults.value[groupName]) {
      flat.push(result);
    }
  }
  return flat;
});

const sectionPrefixMap = {
  '/households': 'community',
  '/residents': 'community',
  '/finance': 'finance',
  '/inventory': 'finance',
  '/lending': 'finance',
  '/vendors': 'vendors',
  '/farm': 'agriculture',
  '/school': 'school',
  '/calendar': 'services',
  '/storage': 'services',
  '/admin': 'administration',
  '/settings': 'administration',
};

function onResultClick(result) {
  if (result?.to) {
    router.push(result.to);
    searchMenuOpen.value = false;
    highlightedIndex.value = -1;
  }
}

function onSearchInput(term) {
  search(term);
  const trimmed = typeof term === 'string' ? term.trim() : '';
  // Open the menu for any non-empty input so the "type at least 2 characters"
  // hint is reachable; it only closes once the field is fully cleared.
  searchMenuOpen.value = trimmed.length >= 1;
  highlightedIndex.value = -1;
}

function onSearchFocus() {
  const trimmed = (searchTerm.value || '').trim();
  if (trimmed.length >= 1) {
    searchMenuOpen.value = true;
  }
}

// Keyboard navigation for the quick-search results menu. Keeps focus in the
// input (no-focus/no-refocus on the q-menu is preserved) while allowing
// ArrowDown/ArrowUp/Enter/Escape to drive result selection, matching the
// behavior a mouse click would produce.
function onSearchKeydown(evt) {
  if (!searchMenuOpen.value || flattenedResults.value.length === 0) {
    if (evt.key === 'Escape') {
      searchMenuOpen.value = false;
    }
    return;
  }

  if (evt.key === 'ArrowDown') {
    evt.preventDefault();
    highlightedIndex.value = (highlightedIndex.value + 1) % flattenedResults.value.length;
  } else if (evt.key === 'ArrowUp') {
    evt.preventDefault();
    highlightedIndex.value =
      (highlightedIndex.value - 1 + flattenedResults.value.length) % flattenedResults.value.length;
  } else if (evt.key === 'Enter') {
    if (highlightedIndex.value >= 0 && highlightedIndex.value < flattenedResults.value.length) {
      evt.preventDefault();
      onResultClick(flattenedResults.value[highlightedIndex.value]);
    }
  } else if (evt.key === 'Escape') {
    searchMenuOpen.value = false;
  }
}

const leftDrawerOpen = ref(false);
const userMenu = ref(null);
const userMenuVisible = ref(false);
const isClient = ref(false); // Track client-side hydration for SSR
const notificationOpen = ref(false);
const helpMenuOpen = ref(false);

const notificationBadgeLabel = computed(() => {
  const count = notificationsStore.unreadCount;
  if (count > 99) return '99+';
  return count > 0 ? String(count) : '';
});

function closeNotificationPanel() {
  notificationOpen.value = false;
}

function onHelpNavigate(to) {
  router.push(to);
  helpMenuOpen.value = false;
}

const expandedSections = reactive({
  community: false,
  finance: false,
  vendors: false,
  agriculture: false,
  school: false,
  services: false,
  administration: false,
});

watch(
  () => route.path,
  (path) => {
    const match = Object.entries(sectionPrefixMap).find(
      ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
    );
    if (match) {
      expandedSections[match[1]] = true;
    }
  },
  { immediate: true },
);

let notificationUnsubscribe = null;
let notificationPollInterval = null;

onMounted(() => {
  isClient.value = true; // Enable client-side rendering after hydration
  notificationsStore.isClient = true;
  notificationsStore.fetchMyNotifications();

  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const notifTableId = import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATIONS || 'notifications';
    const realtime = new Realtime(client);
    notificationUnsubscribe = realtime.subscribe(
      [`tablesdb.${dbId}.tables.${notifTableId}.rows`],
      () => notificationsStore.fetchMyNotifications(),
    );
  } catch (e) {
    console.error('Notification realtime subscribe failed, falling back to polling', e);
    errorHandler.notifyError('Live notifications unavailable; refreshing periodically instead.');
    notificationPollInterval = setInterval(() => notificationsStore.fetchMyNotifications(), 30000);
  }
});

onBeforeUnmount(() => {
  if (typeof notificationUnsubscribe === 'function') {
    notificationUnsubscribe();
    notificationUnsubscribe = null;
  }
  if (notificationPollInterval) {
    clearInterval(notificationPollInterval);
    notificationPollInterval = null;
  }
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
      errorHandler.notifySuccess('Logged out successfully');
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
/* ─── Quick search keyboard-nav highlight ─────────────────────── */
.highlighted {
  background: rgba(0, 0, 0, 0.06);
}

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
