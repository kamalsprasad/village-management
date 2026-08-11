<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <h4 class="text-h5 q-my-none">User Management</h4>
      <q-btn
        v-if="isClient && isAdmin"
        color="primary"
        icon="person_add"
        label="Add User"
        @click="openAddDialog"
      />
    </div>

    <!-- Filter bar -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input
          v-model="searchTerm"
          outlined
          dense
          clearable
          label="Search by name or email"
          debounce="300"
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="statusFilter"
          outlined
          dense
          emit-value
          map-options
          :options="statusOptions"
          label="Status"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="!isClient || isLoading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="50px" />
    </div>

    <!-- Error State -->
    <q-banner v-else-if="errorMessage" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar>
        <q-icon name="error" />
      </template>
      {{ errorMessage }}
      <template #action>
        <q-btn flat label="Retry" @click="fetchAll" />
      </template>
    </q-banner>

    <!-- Users Table -->
    <q-card v-else flat bordered>
      <q-table
        :rows="filteredUsers"
        :columns="columns"
        row-key="$id"
        :pagination="pagination"
        flat
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-roles="props">
          <q-td :props="props">
            <q-chip
              v-for="role in props.row.roleObjects"
              :key="role.$id"
              :color="getRoleColor(role.name)"
              text-color="white"
              size="sm"
              class="q-ma-xs"
            >
              {{ role.name }}
            </q-chip>
            <span
              v-if="!props.row.roleObjects || props.row.roleObjects.length === 0"
              class="text-grey-6"
            >
              No roles assigned
            </span>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.active === false ? 'grey' : 'positive'">
              {{ props.row.active === false ? 'Deactivated' : 'Active' }}
            </q-badge>
          </q-td>
        </template>

        <template #body-cell-created_at="props">
          <q-td :props="props">
            {{ formatDate(props.row.$createdAt || props.row.created_at) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn flat dense round icon="edit" color="primary" @click="openEditDialog(props.row)">
              <q-tooltip>Edit</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              icon="admin_panel_settings"
              color="primary"
              @click="openManageRolesDialog(props.row)"
            >
              <q-tooltip>Manage Roles</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              icon="visibility"
              color="info"
              @click="openViewPermissionsDialog(props.row)"
            >
              <q-tooltip>View Permissions</q-tooltip>
            </q-btn>

            <q-btn
              flat
              dense
              round
              :icon="props.row.active === false ? 'toggle_on' : 'toggle_off'"
              :color="props.row.active === false ? 'positive' : 'negative'"
              @click="openDeactivateDialog(props.row)"
            >
              <q-tooltip>{{ props.row.active === false ? 'Reactivate' : 'Deactivate' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <UserFormDialog
      v-model="showFormDialog"
      :user="selectedUser"
      :roles="usersStore.roles"
      @saved="fetchAll"
    />

    <DeactivateUserDialog
      v-model="showDeactivateDialog"
      :user="selectedUser"
      :all-users="usersStore.users"
      :system-admin-role-id="usersStore.systemAdministratorRole?.$id"
      @saved="fetchAll"
    />

    <ManageRolesDialog
      v-model="showManageRolesDialog"
      :user="selectedUser"
      :roles="usersStore.roles"
      @saved="fetchAll"
    />

    <ViewPermissionsDialog
      v-model="showViewPermissionsDialog"
      :user="selectedUser"
      :roles="usersStore.roles"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUsersStore } from 'src/stores/users-store';
import { usePermissions } from 'src/composables/usePermissions';
import { formatDate } from 'src/utils/dateUtils';
import UserFormDialog from 'src/components/admin/UserFormDialog.vue';
import DeactivateUserDialog from 'src/components/admin/DeactivateUserDialog.vue';
import ManageRolesDialog from 'src/components/admin/ManageRolesDialog.vue';
import ViewPermissionsDialog from 'src/components/admin/ViewPermissionsDialog.vue';

const usersStore = useUsersStore();
const { isAdmin } = usePermissions();

const isClient = ref(false);
const searchTerm = ref('');
const statusFilter = ref('active');
const showFormDialog = ref(false);
const showDeactivateDialog = ref(false);
const showManageRolesDialog = ref(false);
const showViewPermissionsDialog = ref(false);
const selectedUser = ref(null);

const isLoading = computed(() => usersStore.isLoading);
const errorMessage = computed(() => usersStore.error);

const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Deactivated', value: 'deactivated' },
  { label: 'All', value: 'all' },
];

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
});

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'roles', label: 'Roles', field: 'role_ids', align: 'left' },
  { name: 'status', label: 'Status', field: 'active', align: 'left', sortable: true },
  { name: 'created_at', label: 'Created', field: '$createdAt', align: 'left', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'left' },
];

/**
 * Build role objects for chip display. Relationship payload may return
 * populated role objects (`Query.select(['*', 'role_ids.*'])`).
 */
function withRoleObjects(user) {
  const roleIds = user.role_ids;
  let roleObjects = [];
  if (Array.isArray(roleIds) && roleIds.length > 0) {
    if (typeof roleIds[0] === 'object') {
      roleObjects = roleIds.filter((entry) => entry && entry.name);
    } else {
      const rolesMap = new Map(usersStore.roles.map((role) => [role.$id, role]));
      roleObjects = roleIds.map((id) => rolesMap.get(id)).filter((role) => role && role.name);
    }
  }
  return { ...user, roleObjects };
}

const decoratedUsers = computed(() => usersStore.users.map(withRoleObjects));

const filteredUsers = computed(() => {
  let rows = decoratedUsers.value;

  if (statusFilter.value === 'active') {
    rows = rows.filter((user) => user.active !== false);
  } else if (statusFilter.value === 'deactivated') {
    rows = rows.filter((user) => user.active === false);
  }

  const term = searchTerm.value?.trim().toLowerCase();
  if (term) {
    rows = rows.filter(
      (user) =>
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term),
    );
  }

  return rows;
});

function getRoleColor(roleName) {
  const colorMap = {
    'System Administrator': 'deep-purple',
    'Village Head': 'primary',
    'Finance Manager': 'green',
    Resident: 'blue-grey',
    Guest: 'grey',
  };
  return colorMap[roleName] || 'grey';
}

async function fetchAll() {
  await Promise.all([usersStore.fetchUsers(), usersStore.fetchRoles()]);
}

function openAddDialog() {
  selectedUser.value = null;
  showFormDialog.value = true;
}

function openEditDialog(user) {
  selectedUser.value = user;
  showFormDialog.value = true;
}

function openDeactivateDialog(user) {
  selectedUser.value = user;
  showDeactivateDialog.value = true;
}

function openManageRolesDialog(user) {
  selectedUser.value = user;
  showManageRolesDialog.value = true;
}

function openViewPermissionsDialog(user) {
  selectedUser.value = user;
  showViewPermissionsDialog.value = true;
}

onMounted(async () => {
  isClient.value = true;
  await fetchAll();
});
</script>
