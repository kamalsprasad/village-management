<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @hide="resetForm"
  >
    <q-card style="max-width: 500px; width: 100%">
      <q-card-section>
        <div class="text-h6">Reset Password</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          Enter your email address and we will send you a link to reset your password.
        </div>
      </q-card-section>

      <q-card-section>
        <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Email *"
            outlined
            :rules="[
              (val) => (val && val.length > 0) || 'Email is required',
              (val) => isValidEmail(val) || 'Please enter a valid email address',
            ]"
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancel" color="primary" :disable="loading" @click="onCancel" />
            <q-btn
              type="submit"
              label="Send Reset Link"
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
const email = ref('');
const loading = ref(false);

const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

const resetForm = () => {
  email.value = '';
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
    const result = await authStore.requestPasswordReset(email.value);

    if (result.success) {
      notifySuccess('If an account exists for that email, a password reset link has been sent.');
      resetForm();
      emit('update:modelValue', false);
    } else {
      notifyError(result.error || 'Failed to send password reset email');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
};
</script>
