<template>
  <q-card class="q-pa-md" style="max-width: 500px; width: 100%">
    <q-card-section>
      <div class="text-h5 text-center q-mb-md">Create First Admin User</div>
      <div class="text-body2 text-center text-grey-7 q-mb-lg">
        Welcome! Let's set up your administrator account to get started.
      </div>
    </q-card-section>

    <q-card-section>
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="form.name"
          label="Full Name *"
          outlined
          :rules="[
            (val) => (val && val.length > 0) || 'Name is required',
            (val) => (val && val.length >= 2) || 'Name must be at least 2 characters',
          ]"
          lazy-rules
        >
          <template v-slot:prepend>
            <q-icon name="person" />
          </template>
        </q-input>

        <q-input
          v-model="form.email"
          label="Email *"
          type="email"
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

        <q-input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password *"
          outlined
          :rules="[
            (val) => (val && val.length > 0) || 'Password is required',
            (val) => (val && val.length >= 8) || 'Password must be at least 8 characters',
            (val) => /[A-Z]/.test(val) || 'Password must contain at least one uppercase letter',
            (val) => /[a-z]/.test(val) || 'Password must contain at least one lowercase letter',
            (val) => /[0-9]/.test(val) || 'Password must contain at least one number',
          ]"
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

        <div class="q-mt-md">
          <q-btn
            type="submit"
            label="Create Admin Account"
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
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const form = ref({
  name: '',
  email: '',
  password: '',
});

const showPassword = ref(false);
const loading = ref(false);

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const onSubmit = async () => {
  loading.value = true;

  try {
    const result = await authStore.createAdmin(
      form.value.name,
      form.value.email,
      form.value.password
    );

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Admin account created successfully!',
        position: 'top',
      });

      // Redirect to dashboard
      router.push('/');
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to create admin account',
        position: 'top',
      });
    }
  } catch {
    $q.notify({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.',
      position: 'top',
    });
  } finally {
    loading.value = false;
  }
};
</script>
