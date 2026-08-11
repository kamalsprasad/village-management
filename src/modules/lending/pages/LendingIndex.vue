<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row items-center q-mb-md">
        <div class="col">
          <h4 class="text-h5 q-my-none">Village Lending</h4>
          <p class="text-grey-7 q-mb-none">Manage community loans and repayments</p>
        </div>
        <div class="col-auto">
          <q-btn
            color="primary"
            icon="add"
            label="New Loan"
            to="/lending/create"
            v-if="$route.name !== 'create-loan'"
          />
        </div>
      </div>

      <!-- Navigation Tabs -->
      <q-tabs
        v-model="activeTab"
        dense
        class="text-grey q-mb-md"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-route-tab
          name="dashboard"
          label="All Loans"
          to="/lending"
          exact
        />
        <q-route-tab
          name="reports"
          label="Reports"
          to="/lending/reports"
          exact
        />
      </q-tabs>

      <!-- Child Pages -->
      <router-view />
    </div>
  </q-page>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activeTab = ref('dashboard');

// Keep tab in sync with route if user navigates directly
watch(
  () => route.name,
  (newRouteName) => {
    if (newRouteName === 'lending-dashboard') {
      activeTab.value = 'dashboard';
    } else if (newRouteName === 'lending-reports') {
      activeTab.value = 'reports';
    } else {
      activeTab.value = ''; // Clear active tab if on detail or create page
    }
  },
  { immediate: true }
);
</script>
