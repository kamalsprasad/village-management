<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card style="max-width: 560px; width: 100%">
      <q-card-section>
        <div class="text-h6">{{ isEditMode ? 'Edit User' : 'Add User' }}</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" class="q-gutter-md" @submit="onSubmit">
          <q-input
            v-model="form.name"
            label="Full Name *"
            outlined
            maxlength="255"
            :rules="[(val) => (val && val.trim().length > 0) || 'Name is required']"
            lazy-rules
          />

          <q-input
            v-model="form.email"
            type="email"
            label="Email *"
            outlined
            maxlength="255"
            :rules="[
              (val) => (val && val.trim().length > 0) || 'Email is required',
              (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email address',
            ]"
            lazy-rules
          />

          <q-input
            v-if="!isEditMode"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            label="Password *"
            outlined
            maxlength="265"
            :rules="[
              (val) => (val && val.length > 0) || 'Password is required',
              (val) => (val && val.length >= 8) || 'Password must be at least 8 characters',
            ]"
            lazy-rules
          >
            <template #prepend>
              <q-icon name="lock" />
            </template>
            <template #append>
              <q-icon
                :name="showPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-select
            v-model="form.roleIds"
            label="Roles *"
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

          <ResidentSearchInput
            v-model="form.residentId"
            label="Link to Resident (optional)"
            hint="Optional: connect this account to an existing resident record"
          />

          <!-- Admin-driven password reset (edit mode only) -->
          <q-separator v-if="isEditMode" class="q-my-sm" />
          <div v-if="isEditMode">
            <div class="text-subtitle2 q-mb-xs">Reset Password</div>
            <p class="text-caption text-grey-7 q-ma-none q-mb-sm">
              Use this when a user cannot reset their own password. Their active sessions will be
              invalidated and they must sign in with the new password.
            </p>
            <div class="row q-gutter-sm items-start">
              <q-input
                v-model="resetPasswordValue"
                class="col"
                :type="showResetPassword ? 'text' : 'password'"
                label="New password"
                outlined
                maxlength="265"
                hint="At least 8 characters"
                :rules="resetPasswordRules"
                lazy-rules
              >
                <template #prepend>
                  <q-icon name="lock_reset" />
                </template>
                <template #append>
                  <q-icon
                    :name="showResetPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showResetPassword = !showResetPassword"
                  />
                </template>
              </q-input>
              <q-btn
                type="button"
                color="warning"
                icon="vpn_key"
                label="Reset"
                outline
                :loading="resetLoading"
                :disable="resetLoading || !canResetPassword"
                class="q-mt-sm"
                @click="onResetPassword"
              >
                <q-tooltip v-if="!canResetPassword">
                  Enter a valid new password (min 8 characters) to enable
                </q-tooltip>
              </q-btn>
            </div>
          </div>

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
              :label="isEditMode ? 'Save Changes' : 'Add User'"
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
import ResidentSearchInput from 'src/components/inputs/ResidentSearchInput.vue';

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
const showPassword = ref(false);

const resetPasswordValue = ref('');
const showResetPassword = ref(false);
const resetLoading = ref(false);

const resetPasswordRules = [
  (val) => !val || val.length >= 8 || 'Password must be at least 8 characters',
];

const canResetPassword = computed(
  () => !!resetPasswordValue.value && resetPasswordValue.value.length >= 8,
);

const isEditMode = computed(() => !!props.user);

const emptyForm = () => ({
  name: '',
  email: '',
  password: '',
  roleIds: [],
  residentId: null,
});

const form = ref(emptyForm());

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
      form.value = {
        name: props.user.name || '',
        email: props.user.email || '',
        password: '',
        roleIds: extractRoleIds(props.user.role_ids),
        residentId: props.user.resident_id
          ? typeof props.user.resident_id === 'object'
            ? props.user.resident_id.$id
            : props.user.resident_id
          : null,
      };
    } else {
      form.value = emptyForm();
    }
  },
  { immediate: true },
);

function resetForm() {
  form.value = emptyForm();
  showPassword.value = false;
  resetPasswordValue.value = '';
  showResetPassword.value = false;
  if (formRef.value) {
    formRef.value.resetValidation();
  }
}

function onCancel() {
  resetForm();
  emit('update:modelValue', false);
}

async function onResetPassword() {
  if (!props.user || !canResetPassword.value) {
    return;
  }
  resetLoading.value = true;
  try {
    const result = await usersStore.resetUserPassword(props.user.$id, resetPasswordValue.value);
    if (result.success) {
      notifySuccess('Password reset successfully. The user must sign in again.');
      resetPasswordValue.value = '';
      showResetPassword.value = false;
      if (formRef.value) {
        formRef.value.resetValidation();
      }
    } else {
      notifyError(result.error || 'Failed to reset password');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    resetLoading.value = false;
  }
}

async function onSubmit() {
  loading.value = true;
  try {
    let result;
    if (isEditMode.value) {
      result = await usersStore.updateUser(props.user.$id, {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        role_ids: form.value.roleIds,
        resident_id: form.value.residentId || null,
        actorUserId: authStore.currentUser?.$id,
      });
    } else {
      result = await usersStore.createUser({
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
        role_ids: form.value.roleIds,
        resident_id: form.value.residentId || null,
        actorUserId: authStore.currentUser?.$id,
      });
    }

    if (result.success) {
      notifySuccess(isEditMode.value ? 'User updated successfully.' : 'User created successfully.');
      resetForm();
      emit('update:modelValue', false);
      emit('saved');
    } else {
      notifyError(result.error || 'Failed to save user');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
}
</script>
