<template>
  <q-page padding>
    <div class="q-mb-md">
      <h4 class="text-h4 q-my-md">User Management</h4>
      <p class="text-body2 text-grey-7">
        View all users and their assigned roles. Role editing will be available in Epic 2.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="50px" />
    </div>

    <!-- Error State -->
    <q-banner v-else-if="errorMessage" class="bg-negative text-white q-mb-md" rounded>
      <template #avatar>
        <q-icon name="error" />
      </template>
      {{ errorMessage }}
      <template #action>
        <q-btn flat label="Retry" @click="fetchUsers" />
      </template>
    </q-banner>

    <!-- Users Table -->
    <q-card v-else flat bordered>
      <q-table
        :rows="users"
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

        <template #body-cell-created_at="props">
          <q-td :props="props">
            {{ formatDate(props.row.created_at) }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { format } from 'date-fns';
import { Query } from 'appwrite';

const { notifyError } = useErrorHandler();

const isLoading = ref(false);
const errorMessage = ref(null);
const users = ref([]);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
});

const columns = [
  {
    name: 'name',
    label: 'Name',
    field: 'name',
    align: 'left',
    sortable: true,
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
    align: 'left',
    sortable: true,
  },
  {
    name: 'roles',
    label: 'Roles',
    field: 'role_ids',
    align: 'left',
  },
  {
    name: 'created_at',
    label: 'Created',
    field: 'created_at',
    align: 'left',
    sortable: true,
  },
];

/**
 * Fetch all users and their roles
 */
async function fetchUsers() {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const usersCollectionId = import.meta.env.VITE_APPWRITE_TABLE_USERS;
    const rolesCollectionId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;

    // Fetch all users
    const usersResponse = await tables.listRows({
      databaseId: dbId,
      tableId: usersCollectionId,
      queries: [Query.select(['*', 'role_ids.*'])],
    });

    // Fetch all roles once
    const rolesResponse = await tables.listRows({
      databaseId: dbId,
      tableId: rolesCollectionId,
    });

    const rolesMap = new Map(rolesResponse.rows.map((role) => [role.$id, role]));

    // Map users with their role objects
    users.value = usersResponse.rows.map((user) => ({
      ...user,
      roleObjects: (() => {
        const roles = user.role_ids;
        if (!roles || roles.length === 0) {
          return [];
        }

        // Relationship payload may return populated objects or nested arrays
        if (typeof roles[0] === 'object') {
          return roles
            .map((entry) => {
              if (entry?.name) {
                return entry;
              }
              if (entry?.role) {
                return entry.role;
              }
              if (entry?.related) {
                return entry.related;
              }
              return null;
            })
            .filter((role) => role && role.name);
        }

        // Fallback to mapping role IDs -> role objects from rolesMap
        return roles.map((roleId) => rolesMap.get(roleId)).filter((role) => role && role.name);
      })(),
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    errorMessage.value = 'Failed to load users. Please try again.';
    notifyError('Failed to load users');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Get color for role chip based on role name
 */
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

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

onMounted(() => {
  fetchUsers();
});
</script>
