<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title> Village Management System </q-toolbar-title>

        <div>v0.0.1</div>

        <q-btn flat dense round icon="logout" aria-label="Logout" @click="handleLogout">
          <q-tooltip>Logout</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Navigation </q-item-label>

        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="home" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Home</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable to="/appwrite-test">
          <q-item-section avatar>
            <q-icon name="cloud" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Appwrite Test</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Admin Section - Only visible to System Administrators -->
        <div v-if="hasPermission('*')">
          <q-separator class="q-my-md" />

          <q-item-label header> Administration </q-item-label>

          <q-item clickable to="/admin/users">
            <q-item-section avatar>
              <q-icon name="people" />
            </q-item-section>
            <q-item-section>
              <q-item-label>User Management</q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const { hasPermission } = usePermissions();

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleLogout() {
  $q.dialog({
    title: 'Confirm Logout',
    message: 'Are you sure you want to log out?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    const result = await authStore.logout();

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: 'Logged out successfully',
        position: 'top',
      });
      router.push('/auth');
    } else {
      $q.notify({
        type: 'negative',
        message: result.error || 'Failed to log out',
        position: 'top',
      });
    }
  });
}
</script>
