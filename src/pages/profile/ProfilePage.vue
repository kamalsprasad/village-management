<template>
  <q-page class="profile-page">
    <div class="row justify-center q-pa-md">
      <div class="col-12 col-md-8 col-lg-6">
        <q-card class="profile-card">
          <!-- User Profile Section -->
          <q-card-section>
            <div class="text-h5 text-weight-medium q-mb-sm">
              {{ isClient ? authStore.user?.name || 'User' : 'User' }}
            </div>
            <div class="text-body2 text-grey-7 q-mb-md">
              {{ isClient ? authStore.user?.email || '' : '' }}
            </div>

            <!-- Roles Section -->
            <div v-if="isClient && userRoles.length > 0" class="q-mb-md">
              <div class="text-caption text-grey-7 q-mb-xs">Assigned Roles</div>
              <div class="row q-gutter-xs">
                <q-chip
                  v-for="role in userRoles"
                  :key="role.$id"
                  color="secondary"
                  text-color="white"
                  size="sm"
                  dense
                >
                  {{ role.name }}
                </q-chip>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Storage Quota Section -->
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">
              <q-icon name="cloud" class="q-mr-xs" />
              Storage Quota
            </div>

            <div class="q-mb-sm">
              <div class="text-body2 text-grey-7 q-mb-xs">
                {{ isClient ? formattedQuota : 'Loading...' }} available
              </div>
              <div class="text-body2 text-grey-7 q-mb-xs">
                Current usage:
                <span class="q-ml-xs">Calculating...</span>
                <q-spinner size="xs" class="q-ml-xs" color="primary" />
              </div>
            </div>

            <!-- Progress Bar -->
            <q-linear-progress :value="0" :buffer="0.1" color="info" rounded class="q-mb-md" />

            <!-- Storage Info Banner -->
            <q-banner dense inline-actions class="bg-info text-white" rounded>
              <template v-slot:avatar>
                <q-icon name="info" color="white" />
              </template>
              Storage functionality coming soon. Full file management will be available in Epic 5.
            </q-banner>
          </q-card-section>

          <q-separator />

          <!-- Account Actions Section -->
          <q-card-section>
            <q-btn
              outline
              color="primary"
              icon="lock"
              label="Change Password"
              disabled
              class="full-width"
            >
              <q-tooltip> Password change functionality will be available in Epic 2 </q-tooltip>
            </q-btn>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';

const authStore = useAuthStore();
const { userStorageQuota } = usePermissions();
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});

// User roles from auth store
const userRoles = computed(() => authStore.userRoles || []);

// Format storage quota for display
const formattedQuota = computed(() => {
  const quota = userStorageQuota.value;

  if (quota === -1) {
    return 'Unlimited';
  }

  if (quota === 0) {
    return '0 GB';
  }

  const gb = quota / (1024 * 1024 * 1024);

  // Format based on size
  if (gb >= 1) {
    return `${gb.toFixed(gb % 1 === 0 ? 0 : 1)} GB`;
  } else {
    const mb = quota / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }
});
</script>

<style scoped>
.profile-page {
  max-width: 1400px;
  margin: 0 auto;
}

.profile-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Ensure minimum touch target size for mobile */
@media (max-width: 599px) {
  .q-btn {
    min-height: 44px;
  }

  .q-chip {
    min-height: 44px;
    padding: 0 12px;
  }
}
</style>
