<template>
  <q-card class="q-pa-md" style="max-width: 500px; width: 100%">
    <q-card-section>
      <div class="text-h5 text-center q-mb-md">Welcome Back</div>
      <div class="text-body2 text-center text-grey-7 q-mb-lg">
        Sign in to access the Village Management System
      </div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="form.email"
          label="Email *"
          type="email"
          outlined
          :rules="[(val) => (val && val.length > 0) || 'Email is required']"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="email" />
          </template>
        </q-input>

        <q-input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password *"
          outlined
          :rules="[(val) => (val && val.length > 0) || 'Password is required']"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="lock" />
          </template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-checkbox v-model="form.rememberMe" label="Remember me" />

        <div class="q-mt-md">
          <q-btn
            type="submit"
            label="Sign In"
            color="primary"
            class="full-width"
            :loading="loading"
            :disable="loading"
          />
        </div>
      </q-form>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const router = useRouter();
const authStore = useAuthStore();
const { notifyError, notifySuccess } = useErrorHandler();

const form = ref({
  email: '',
  password: '',
  rememberMe: false,
});

const showPassword = ref(false);
const loading = ref(false);

const onSubmit = async () => {
  loading.value = true;

  try {
    const result = await authStore.login(
      form.value.email,
      form.value.password
    );

    if (result.success) {
      notifySuccess('Login successful!');

      // Redirect to dashboard
      router.push('/');
    } else {
      notifyError(result.error || 'Invalid email or password');
    }
  } catch {
    notifyError('An unexpected error occurred. Please try again.');
  } finally {
    loading.value = false;
  }
};
</script>
