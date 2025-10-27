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

          <!-- Loading State -->
          <div v-if="authStore.isLoading" class="text-center">
            <q-spinner color="white" size="50px" />
            <div class="text-white q-mt-md">Loading...</div>
          </div>

          <!-- Conditional Form Rendering -->
          <template v-else-if="!authStore.errorMessage">
            <!-- Show Admin Creation Form if no users exist -->
            <CreateAdminForm v-if="authStore.hasUsers === false" />

            <!-- Show Login Form if users exist -->
            <LoginForm v-else-if="authStore.hasUsers === true" />

            <!-- Fallback: Checking state -->
            <div v-else class="text-center">
              <q-spinner color="white" size="50px" />
              <div class="text-white q-mt-md">Initializing...</div>
            </div>
          </template>

          <!-- Error State -->
          <div v-else class="text-center">
            <q-card class="q-pa-xl" style="max-width: 500px; width: 100%">
              <q-card-section>
                <q-icon name="warning" color="negative" size="48px" />
                <div class="text-h6 q-mt-md">Authentication Service Unavailable</div>
                <div class="text-body2 q-mt-sm">
                  {{ authStore.errorMessage || 'The authentication service is unreachable at the moment. Please try again later.' }}
                </div>
              </q-card-section>

              <q-card-actions align="center">
                <q-btn
                  color="primary"
                  label="Try Again"
                  :loading="authStore.isLoading"
                  @click="retryCheck"
                />
              </q-card-actions>
            </q-card>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import CreateAdminForm from 'src/components/auth/CreateAdminForm.vue';
import LoginForm from 'src/components/auth/LoginForm.vue';

const authStore = useAuthStore();

onMounted(async () => {
  // Ensure we have checked for users
  if (authStore.hasUsers === null) {
    await authStore.checkHasUsers();
  }
});

const retryCheck = async () => {
  await authStore.checkHasUsers();
};
</script>
