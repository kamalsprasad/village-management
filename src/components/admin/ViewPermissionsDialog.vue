<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="max-width: 600px; width: 100%">
      <q-card-section>
        <div class="text-h6">Effective Permissions{{ user ? ' — ' + user.name : '' }}</div>
      </q-card-section>

      <q-card-section>
        <!-- Role chips -->
        <div class="q-mb-md">
          <div class="text-subtitle2 q-mb-xs">Assigned Roles</div>
          <div v-if="userRoleObjects.length === 0" class="text-grey-6">No roles assigned</div>
          <div v-else class="q-gutter-xs">
            <q-chip
              v-for="role in userRoleObjects"
              :key="role.$id"
              :color="getRoleColor(role.name)"
              text-color="white"
              size="sm"
            >
              {{ role.name }}
            </q-chip>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- Effective permissions -->
        <div class="text-subtitle2 q-mb-sm">Effective Permissions</div>
        <div v-if="groupedPermissions === null" class="text-body2">
          All permissions (wildcard *)
        </div>
        <div v-else-if="groupedPermissions.length === 0" class="text-grey-6">
          No permissions assigned
        </div>
        <div v-else>
          <div v-for="group in groupedPermissions" :key="group.module" class="q-mb-sm">
            <div class="text-subtitle2 text-weight-bold">{{ group.module }}</div>
            <q-chip v-for="action in group.actions" :key="action" size="sm" class="q-ma-xs">
              {{ group.module }}:{{ action }}
            </q-chip>
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" color="primary" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { getAllUserPermissions } from 'src/utils/permissions';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  user: {
    type: Object,
    default: null,
  },
  roles: {
    type: Array,
    default: () => [],
  },
});

defineEmits(['update:modelValue']);

const userRoleObjects = computed(() => {
  if (!props.user || !Array.isArray(props.user.role_ids)) {
    return [];
  }
  const roleIds = props.user.role_ids;
  if (roleIds.length > 0 && typeof roleIds[0] === 'object') {
    return roleIds.filter((entry) => entry && entry.name);
  }
  const rolesMap = new Map(props.roles.map((role) => [role.$id, role]));
  return roleIds.map((id) => rolesMap.get(id)).filter((role) => role && role.name);
});

const effectivePermissions = computed(() => getAllUserPermissions(userRoleObjects.value));

const groupedPermissions = computed(() => groupPermissionsByModule(effectivePermissions.value));

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
</script>
