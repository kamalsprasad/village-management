<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-md">
      <h4 class="text-h4 q-my-md">Roles & Permissions</h4>
    </div>

    <q-banner class="bg-info text-white q-mb-md" rounded>
      <template #avatar>
        <q-icon name="info" />
      </template>
      Custom role creation is deferred to post-MVP. Roles are seeded via script.
    </q-banner>

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

    <!-- Roles Table -->
    <q-card v-else flat bordered>
      <q-table
        :rows="usersStore.roles"
        :columns="columns"
        row-key="$id"
        :pagination="pagination"
        flat
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body="props">
          <q-tr :props="props">
            <q-td v-for="col in props.cols" :key="col.name" :props="props">
              <template v-if="col.name === 'permissions'">
                {{ props.row.permissions ? props.row.permissions.length : 0 }}
              </template>
              <template v-else-if="col.name === 'storage_quota'">
                {{
                  formatQuota(
                    props.row.storage_quota === -1 ? -1 : props.row.storage_quota * 1024 ** 3,
                  )
                }}
              </template>
              <template v-else-if="col.name === 'assigned_users'">
                {{ assignedUserCount(props.row) }}
              </template>
              <template v-else-if="col.name === 'actions'">
                <q-btn
                  flat
                  dense
                  round
                  :icon="props.expand ? 'expand_less' : 'expand_more'"
                  color="primary"
                  @click="props.expand = !props.expand"
                >
                  <q-tooltip>View Permissions</q-tooltip>
                </q-btn>
              </template>
              <template v-else>
                {{ col.value }}
              </template>
            </q-td>
          </q-tr>
          <q-tr v-if="props.expand" :props="props">
            <q-td colspan="100%">
              <div
                v-if="groupPermissionsByModule(props.row.permissions) === null"
                class="text-body2"
              >
                All permissions (wildcard *)
              </div>
              <div
                v-else-if="groupPermissionsByModule(props.row.permissions).length === 0"
                class="text-grey-6"
              >
                No permissions assigned
              </div>
              <div v-else>
                <div
                  v-for="group in groupPermissionsByModule(props.row.permissions)"
                  :key="group.module"
                  class="q-mb-sm"
                >
                  <div class="text-subtitle2 text-weight-bold">{{ group.module }}</div>
                  <q-chip v-for="action in group.actions" :key="action" size="sm" class="q-ma-xs">
                    {{ group.module }}:{{ action }}
                  </q-chip>
                </div>
              </div>
            </q-td>
          </q-tr>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUsersStore } from 'src/stores/users-store';
import { formatQuota } from 'src/modules/storage/utils/format-storage';

const usersStore = useUsersStore();

const isClient = ref(false);

const isLoading = computed(() => usersStore.isLoading);
const errorMessage = computed(() => usersStore.error);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
});

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true },
  {
    name: 'permissions',
    label: 'Permissions',
    field: 'permissions',
    align: 'left',
    sortable: true,
  },
  {
    name: 'storage_quota',
    label: 'Storage Quota',
    field: 'storage_quota',
    align: 'left',
    sortable: true,
  },
  {
    name: 'assigned_users',
    label: 'Assigned Users',
    field: 'assigned_users',
    align: 'left',
    sortable: true,
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'left' },
];

function groupPermissionsByModule(permissions) {
  if (!permissions || permissions.length === 0) return [];
  if (permissions.includes('*')) return null;
  const map = new Map();
  for (const p of permissions) {
    const [module, action] = p.split(':');
    if (!map.has(module)) map.set(module, []);
    map.get(module).push(action || p);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([module, actions]) => ({ module, actions: actions.sort() }));
}

function assignedUserCount(role) {
  if (!role || !role.$id) return 0;
  return usersStore.users.filter(
    (u) =>
      Array.isArray(u.role_ids) &&
      u.role_ids.some((rid) => (typeof rid === 'object' ? rid.$id : rid) === role.$id),
  ).length;
}

async function fetchAll() {
  await Promise.all([usersStore.fetchRoles(), usersStore.fetchUsers()]);
}

onMounted(async () => {
  isClient.value = true;
  await fetchAll();
});
</script>
