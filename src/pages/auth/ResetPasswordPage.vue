<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page
        class="flex flex-center"
        style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      >
        <div
          class="column items-center q-gutter-md"
          style="width: 100%; max-width: 600px; padding: 20px"
        >
          <!-- Logo/Header -->
          <div class="text-center q-mb-md">
            <q-icon name="agriculture" size="80px" color="white" />
            <div class="text-h4 text-white q-mt-md">Village Management System</div>
          </div>

          <!-- Invalid Link State -->
          <q-card
            v-if="isClient && !hasValidToken"
            class="q-pa-md"
            style="max-width: 500px; width: 100%"
          >
            <q-card-section>
              <q-banner class="bg-negative text-white" rounded inline-actions>
                <template v-slot:avatar>
                  <q-icon name="warning" color="white" />
                </template>
                This password reset link is invalid or has expired.
                <template v-slot:action>
                  <q-btn flat color="white" label="Back to Sign In" :to="'/auth'" />
                </template>
              </q-banner>
            </q-card-section>
          </q-card>

          <!-- Reset Password Form -->
          <q-card v-else-if="isClient" class="q-pa-md" style="max-width: 500px; width: 100%">
            <q-card-section>
              <div class="text-h5 text-center q-mb-md">Reset Password</div>
              <div class="text-body2 text-center text-grey-7 q-mb-lg">
                Enter your new password below.
              </div>
            </q-card-section>

            <q-card-section>
              <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md">
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

                <div class="q-mt-md">
                  <q-btn
                    type="submit"
                    label="Reset Password"
                    color="primary"
                    class="full-width"
                    :loading="loading"
                    :disable="loading"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { notifyError, notifySuccess } = useErrorHandler();

const isClient = ref(false);
const formRef = ref(null);
const loading = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const form = ref({
  newPassword: '',
  confirmPassword: '',
});

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

const userId = computed(() => firstQueryValue(route.query.userId));
const secret = computed(() => firstQueryValue(route.query.secret));

const hasValidToken = computed(() => {
  return !!(userId.value && secret.value);
});

const resetForm = () => {
  form.value = {
    newPassword: '',
    confirmPassword: '',
  };
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  if (formRef.value) {
    formRef.value.resetValidation();
  }
};

onMounted(() => {
  isClient.value = true;
});

const onSubmit = async () => {
  loading.value = true;

  try {
    const result = await authStore.resetPassword(
      userId.value,
      secret.value,
      form.value.newPassword,
    );

    if (result.success) {
      notifySuccess('Password reset successfully. Please sign in with your new password.');
      resetForm();
      setTimeout(() => {
        router.push('/auth');
      }, 1500);
    } else {
      notifyError(result.error || 'Failed to reset password');
      resetForm();
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
    resetForm();
  } finally {
    loading.value = false;
  }
};
</script>
