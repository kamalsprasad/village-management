<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card style="max-width: 500px; width: 100%">
      <q-card-section>
        <div class="text-h6">Change Password</div>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="form.currentPassword"
            :type="showCurrentPassword ? 'text' : 'password'"
            label="Current Password *"
            outlined
            maxlength="265"
            :rules="[(val) => (val && val.length > 0) || 'Current password is required']"
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showCurrentPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showCurrentPassword = !showCurrentPassword"
              />
            </template>
          </q-input>

          <q-input
            v-model="form.newPassword"
            :type="showNewPassword ? 'text' : 'password'"
            label="New Password *"
            outlined
            maxlength="265"
            :rules="[
              (val) => (val && val.length > 0) || 'New password is required',
              (val) => (val && val.length >= 8) || 'Password must be at least 8 characters',
            ]"
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showNewPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showNewPassword = !showNewPassword"
              />
            </template>
          </q-input>

          <q-input
            v-model="form.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            label="Confirm New Password *"
            outlined
            maxlength="265"
            :rules="[
              (val) => (val && val.length > 0) || 'Please confirm your new password',
              (val) => val === form.newPassword || 'Passwords do not match',
            ]"
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="lock" />
            </template>
            <template v-slot:append>
              <q-icon
                :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </q-input>

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancel" color="primary" :disable="loading" @click="onCancel" />
            <q-btn
              type="submit"
              label="Change Password"
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
import { ref } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
});

const emit = defineEmits(['update:modelValue']);

const authStore = useAuthStore();
const { notifyError, notifySuccess } = useErrorHandler();

const formRef = ref(null);
const loading = ref(false);
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const resetForm = () => {
  form.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  showCurrentPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  if (formRef.value) {
    formRef.value.resetValidation();
  }
};

const onCancel = () => {
  resetForm();
  emit('update:modelValue', false);
};

const onSubmit = async () => {
  loading.value = true;

  try {
    const result = await authStore.changePassword(
      form.value.currentPassword,
      form.value.newPassword,
    );

    if (result.success) {
      notifySuccess('Password changed successfully.');
      resetForm();
      emit('update:modelValue', false);
    } else {
      notifyError(result.error || 'Failed to change password');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
};
</script>
