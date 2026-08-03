<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-card style="max-width: 480px; width: 100%">
      <q-card-section>
        <div class="text-h6">{{ isReactivating ? 'Reactivate User' : 'Deactivate User' }}</div>
      </q-card-section>

      <q-card-section>
        <p v-if="isReactivating">
          Reactivate <strong>{{ user?.name }}</strong> ({{ user?.email }})? They will regain access
          to the system.
        </p>
        <p v-else>
          Deactivate <strong>{{ user?.name }}</strong> ({{ user?.email }})? Their sessions will be
          invalidated immediately and they will not be able to log in until reactivated. Their data
          is preserved.
        </p>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" :disable="loading" @click="onCancel" />
        <span>
          <q-btn
            :label="isReactivating ? 'Reactivate' : 'Deactivate'"
            :color="isReactivating ? 'primary' : 'negative'"
            :loading="loading"
            :disable="loading || disableConfirm"
            @click="onConfirm"
          />
          <q-tooltip v-if="disableConfirm">{{ disableReason }}</q-tooltip>
        </span>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useUsersStore } from 'src/stores/users-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  user: {
    type: Object,
    default: null,
  },
  allUsers: {
    type: Array,
    default: () => [],
  },
  systemAdminRoleId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'saved']);

const authStore = useAuthStore();
const usersStore = useUsersStore();
const { notifyError, notifySuccess } = useErrorHandler();

const loading = ref(false);

const isReactivating = computed(() => props.user?.active === false);

function extractRoleIds(roleIds) {
  if (!Array.isArray(roleIds)) {
    return [];
  }
  return roleIds.map((entry) => (typeof entry === 'object' && entry !== null ? entry.$id : entry));
}

const isSelf = computed(() => {
  return !!props.user && props.user.$id === authStore.currentUser?.$id;
});

const isTargetSystemAdmin = computed(() => {
  if (!props.user || !props.systemAdminRoleId) {
    return false;
  }
  return extractRoleIds(props.user.role_ids).includes(props.systemAdminRoleId);
});

const isLastActiveSystemAdmin = computed(() => {
  if (isReactivating.value || !isTargetSystemAdmin.value || !props.systemAdminRoleId) {
    return false;
  }
  const otherActiveAdmins = props.allUsers.filter((candidate) => {
    if (candidate.$id === props.user?.$id) {
      return false;
    }
    if (candidate.active === false) {
      return false;
    }
    return extractRoleIds(candidate.role_ids).includes(props.systemAdminRoleId);
  });
  return otherActiveAdmins.length === 0;
});

const disableConfirm = computed(() => {
  if (isReactivating.value) {
    return false;
  }
  return isSelf.value || isLastActiveSystemAdmin.value;
});

const disableReason = computed(() => {
  if (isSelf.value) {
    return 'You cannot deactivate your own account';
  }
  if (isLastActiveSystemAdmin.value) {
    return 'At least one System Administrator must remain active';
  }
  return '';
});

function onCancel() {
  emit('update:modelValue', false);
}

async function onConfirm() {
  if (!props.user) {
    return;
  }
  loading.value = true;
  try {
    const actorUserId = authStore.currentUser?.$id;
    const result = isReactivating.value
      ? await usersStore.reactivateUser(props.user.$id, actorUserId)
      : await usersStore.deactivateUser(props.user.$id, actorUserId);

    if (result.success) {
      notifySuccess(isReactivating.value ? 'User reactivated successfully.' : 'User deactivated successfully.');
      emit('update:modelValue', false);
      emit('saved');
    } else {
      notifyError(result.error || 'Failed to update user status');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
}
</script>
