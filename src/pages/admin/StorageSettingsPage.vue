<template>
  <q-page padding class="storage-settings-page">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h1 class="text-h5 text-weight-bold q-my-none">Storage Settings</h1>
        <p class="text-grey-7 q-mt-xs q-mb-none">
          Storage usage for every user (personal + shared files owned by them), their effective
          quota, and per-user quota overrides.
        </p>
      </div>
      <q-btn
        color="primary"
        icon="download"
        label="Export CSV"
        :disable="rows.length === 0"
        @click="exportCsv"
      />
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
        <q-btn flat label="Retry" @click="loadReport" />
      </template>
    </q-banner>

    <q-card v-else flat bordered>
      <q-table
        :rows="rows"
        :columns="columns"
        row-key="userId"
        flat
        :rows-per-page-options="[10, 25, 50]"
      >
        <template #body-cell-roles="props">
          <q-td :props="props">
            <q-chip v-for="role in props.row.roles" :key="role" size="sm" class="q-ma-xs">
              {{ role }}
            </q-chip>
            <span v-if="props.row.roles.length === 0" class="text-grey-6">No roles</span>
          </q-td>
        </template>

        <template #body-cell-usageBytes="props">
          <q-td :props="props">{{ formatBytes(props.row.usageBytes) }}</q-td>
        </template>

        <template #body-cell-effectiveQuotaBytes="props">
          <q-td :props="props">{{ formatQuota(props.row.effectiveQuotaBytes) }}</q-td>
        </template>

        <template #body-cell-quotaOverride="props">
          <q-td :props="props">
            <q-input
              v-model.number="props.row.quotaOverride"
              dense
              outlined
              type="number"
              step="0.5"
              style="max-width: 120px"
              hint="GB (-1 = unlimited, 0 = no override)"
              @blur="saveOverride(props.row)"
              @keyup.enter="saveOverride(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { tables, functions } from 'src/boot/appwrite';
import { Query } from 'appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { usePermissions } from 'src/composables/usePermissions';
import { getUserStorageQuota } from 'src/utils/permissions';
import { formatBytes, formatQuota } from 'src/modules/storage/utils/format-storage';
import { useAuthStore } from 'src/stores/auth-store';

const { notifyError, notifySuccess } = useErrorHandler();
const { hasPermission } = usePermissions();
const authStore = useAuthStore();

const isClient = ref(false);
const isLoading = ref(false);
const errorMessage = ref(null);
const rows = ref([]);

const columns = [
  { name: 'name', label: 'Name', field: 'name', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
  { name: 'roles', label: 'Roles', field: 'roles', align: 'left' },
  { name: 'usageBytes', label: 'Usage', field: 'usageBytes', align: 'right', sortable: true },
  {
    name: 'effectiveQuotaBytes',
    label: 'Effective Quota',
    field: 'effectiveQuotaBytes',
    align: 'right',
  },
  {
    name: 'quotaOverride',
    label: 'Quota Override (GB)',
    field: 'quotaOverride',
    align: 'left',
  },
];

/**
 * Calls the storageUsageReport Appwrite Function (admin-key aggregation of
 * file_metadata.size by owner_id), then joins with users/roles table data
 * to build the report rows.
 */
async function loadReport() {
  // Defense-in-depth: the route already guards on requiresPermission: '*',
  // but this page also checks in-component (same trust model as admin/users).
  if (!hasPermission('*')) {
    errorMessage.value = 'Access denied. System Administrators only.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_STORAGE_REPORT;
    if (!functionId) {
      throw new Error(
        'Storage report function not configured: VITE_APPWRITE_FUNCTION_STORAGE_REPORT is not set.',
      );
    }
    if (!authStore.user?.$id) {
      throw new Error('You must be logged in to view the storage report.');
    }

    const execution = await functions.createExecution(
      functionId,
      JSON.stringify({ userId: authStore.user.$id }),
      false, // synchronous — wait for the function's response
    );

    if (execution.status && execution.status !== 'completed') {
      throw new Error(
        `Storage report function did not complete successfully (status: ${execution.status}).`,
      );
    }

    const responseBody = execution.responseBody || '';
    let result;
    try {
      result = responseBody ? JSON.parse(responseBody) : null;
    } catch {
      throw new Error('Could not parse the storage report response.');
    }

    if (!result || !result.success) {
      throw new Error(result?.error || 'Failed to generate the storage report.');
    }

    const usageByUserId = new Map((result.usage || []).map((u) => [u.userId, u.usageBytes]));

    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const usersTableId = import.meta.env.VITE_APPWRITE_TABLE_USERS;
    const rolesTableId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;

    const [usersResponse, rolesResponse] = await Promise.all([
      tables.listRows({
        databaseId: dbId,
        tableId: usersTableId,
        queries: [Query.select(['*', 'role_ids.*']), Query.limit(500)],
      }),
      tables.listRows({ databaseId: dbId, tableId: rolesTableId, queries: [Query.limit(200)] }),
    ]);

    const rolesMap = new Map(rolesResponse.rows.map((role) => [role.$id, role]));

    rows.value = usersResponse.rows.map((user) => {
      const roleObjects = resolveRoleObjects(user.role_ids, rolesMap);
      const quotaOverride = typeof user.storage_quota === 'number' ? user.storage_quota : 0;
      const effectiveQuotaBytes = getUserStorageQuota(roleObjects, quotaOverride);

      return {
        userId: user.$id,
        name: user.name,
        email: user.email,
        roles: roleObjects.map((r) => r.name).filter(Boolean),
        usageBytes: usageByUserId.get(user.$id) || 0,
        quotaOverride,
        effectiveQuotaBytes,
      };
    });
  } catch (error) {
    errorMessage.value = error.message || 'Failed to load the storage report.';
    notifyError(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
}

/** Resolves a user's role_ids (populated objects or bare IDs) to role objects. */
function resolveRoleObjects(roleIds, rolesMap) {
  if (!roleIds || roleIds.length === 0) {
    return [];
  }
  if (typeof roleIds[0] === 'object') {
    return roleIds.filter(Boolean);
  }
  return roleIds.map((id) => rolesMap.get(id)).filter(Boolean);
}

/**
 * Saves a row's quota override back to users.storage_quota.
 * <= 0 means "no override"; -1 means unlimited; positive is a GB override.
 */
async function saveOverride(row) {
  // Clamp to the valid sentinel range: -1 (unlimited), 0 (no override), or
  // any other positive GB value. Any other negative number is invalid.
  const raw = Number.isFinite(row.quotaOverride) ? row.quotaOverride : 0;
  const value = raw === -1 ? -1 : Math.max(0, raw);
  row.quotaOverride = value;
  try {
    const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
    const usersTableId = import.meta.env.VITE_APPWRITE_TABLE_USERS;
    await tables.updateRow({
      databaseId: dbId,
      tableId: usersTableId,
      rowId: row.userId,
      data: { storage_quota: value },
    });
    notifySuccess(`Updated quota override for ${row.name}.`);
    // Reload so the effective quota column reflects the new
    // override-vs-role-quota precedence immediately (no stale role data).
    await loadReport();
  } catch (error) {
    notifyError(error.message || 'Failed to update quota override.');
  }
}

/** Builds and downloads a CSV of the current report rows. */
function exportCsv() {
  const header = [
    'Name',
    'Email',
    'Roles',
    'Usage (bytes)',
    'Quota Override (GB)',
    'Effective Quota (bytes)',
  ];
  const lines = [header.join(',')];

  for (const row of rows.value) {
    lines.push(
      [
        csvEscape(row.name),
        csvEscape(row.email),
        csvEscape(row.roles.join('; ')),
        row.usageBytes,
        row.quotaOverride,
        row.effectiveQuotaBytes,
      ].join(','),
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `storage-usage-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

onMounted(() => {
  isClient.value = true;
  loadReport();
});
</script>

<style scoped>
.storage-settings-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
