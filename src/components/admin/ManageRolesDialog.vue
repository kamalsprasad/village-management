<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card style="max-width: 600px; width: 100%">
      <q-card-section>
        <div class="text-h6">Manage Roles{{ user ? ' — ' + user.name : '' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-md" @submit="onSave">
          <q-select
            v-model="selectedRoleIds"
            label="Assigned Roles"
            outlined
            multiple
            use-chips
            emit-value
            map-options
            option-value="$id"
            option-label="name"
            :options="roles"
            :rules="[(val) => (val && val.length > 0) || 'Select at least one role']"
            lazy-rules
          />

          <q-expansion-item
            v-model="showEffectivePermissions"
            icon="lock"
            label="View Effective Permissions"
            dense-toggle
            class="q-mt-sm"
          >
            <div class="q-pa-sm">
              <div v-if="groupedPermissions === null" class="text-body2">
                All permissions (wildcard *)
              </div>
              <div v-else-if="groupedPermissions.length === 0" class="text-grey-6">
                No permissions assigned
              </div>
              <div v-else>
                <div
                  v-for="group in groupedPermissions"
                  :key="group.module"
                  class="q-mb-sm"
                >
                  <div class="text-subtitle2 text-weight-bold">{{ group.module }}</div>
                  <q-chip
                    v-for="action in group.actions"
                    :key="action"
                    size="sm"
                    class="q-ma-xs"
                  >
                    {{ group.module }}:{{ action }}
                  </q-chip>
                </div>
              </div>
            </div>
          </q-expansion-item>

          <div class="row justify-end q-gutter-sm">
            <q-btn
              type="button"
              flat
              label="Cancel"
              color="primary"
              :disable="loading"
              @click="onCancel"
            />
            <q-btn
              type="submit"
              label="Save"
              color="primary"
              :loading="loading"
              :disable="loading"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useUsersStore } from 'src/stores/users-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';
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

const emit = defineEmits(['update:modelValue', 'saved']);

const authStore = useAuthStore();
const usersStore = useUsersStore();
const { notifyError, notifySuccess } = useErrorHandler();

const formRef = ref(null);
const loading = ref(false);
const showEffectivePermissions = ref(false);
const selectedRoleIds = ref([]);

function extractRoleIds(roleIds) {
  if (!Array.isArray(roleIds)) {
    return [];
  }
  return roleIds.map((entry) => (typeof entry === 'object' && entry !== null ? entry.$id : entry));
}

watch(
  () => [props.modelValue, props.user],
  ([isOpen]) => {
    if (!isOpen) {
      return;
    }
    if (props.user) {
      selectedRoleIds.value = extractRoleIds(props.user.role_ids);
    } else {
      selectedRoleIds.value = [];
    }
  },
  { immediate: true },
);

const selectedRoleObjects = computed(() =>
  selectedRoleIds.value
    .map((id) => props.roles.find((r) => r.$id === id))
    .filter(Boolean),
);

const effectivePermissions = computed(() => getAllUserPermissions(selectedRoleObjects.value));

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

function resetForm() {
  selectedRoleIds.value = [];
  showEffectivePermissions.value = false;
  if (formRef.value) {
    formRef.value.resetValidation();
  }
}

function onCancel() {
  resetForm();
  emit('update:modelValue', false);
}

async function onSave() {
  loading.value = true;
  try {
    const result = await usersStore.updateUser(props.user.$id, {
      role_ids: selectedRoleIds.value,
      actorUserId: authStore.currentUser?.$id,
    });

    if (result.success) {
      notifySuccess('Roles updated successfully.');
      resetForm();
      emit('update:modelValue', false);
      emit('saved');
    } else {
      notifyError(result.error || 'Failed to update roles');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
}
</script>
