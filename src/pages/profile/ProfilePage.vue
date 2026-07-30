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
                {{ isClient ? formattedQuota : 'Loading...' }} total quota
              </div>
              <div class="text-body2 text-grey-7 q-mb-xs">
                Current usage:
                <span v-if="isClient" class="q-ml-xs">{{ formattedUsage }}</span>
                <template v-else>
                  <span class="q-ml-xs">Calculating...</span>
                  <q-spinner size="xs" class="q-ml-xs" color="primary" />
                </template>
              </div>
            </div>

            <!-- Progress Bar -->
            <q-linear-progress
              :value="isClient ? usagePercent : 0"
              :color="isClient && personalFilesStore.isOverQuota90 ? 'negative' : 'info'"
              rounded
              class="q-mb-md"
            />

            <!-- Over-quota warning -->
            <q-banner
              v-if="isClient && personalFilesStore.isOverQuota90"
              dense
              inline-actions
              class="bg-warning text-dark"
              rounded
            >
              <template v-slot:avatar>
                <q-icon name="warning" color="dark" />
              </template>
              You have used over 90% of your storage quota.
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
import { usePersonalFilesStore } from 'src/modules/storage/stores/personal-files-store';
import { formatBytes } from 'src/modules/storage/utils/format-storage';

const authStore = useAuthStore();
const { userStorageQuota } = usePermissions();
const personalFilesStore = usePersonalFilesStore();
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
  personalFilesStore.fetchFiles();
});

// Real usage from the personal-files store, as a fraction of quota (0 when unlimited)
const usagePercent = computed(() => {
  const quota = userStorageQuota.value;
  if (quota === -1 || !quota) {
    return 0;
  }
  return Math.min(personalFilesStore.usageBytes / quota, 1);
});

const formattedUsage = computed(() => formatBytes(personalFilesStore.usageBytes));

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
