<template>
  <q-page class="flex flex-center">
    <div class="text-center q-pa-md" style="max-width: 500px">
      <q-icon name="block" size="120px" color="negative" class="q-mb-md" />
      
      <h4 class="text-h4 q-mt-none q-mb-md">Access Denied</h4>
      
      <p class="text-body1 text-grey-7 q-mb-lg">
        You don't have permission to access this page. Please contact your system administrator if you believe this is an error.
      </p>

      <div class="q-gutter-sm">
        <q-btn
          label="Go to Home"
          color="primary"
          icon="home"
          to="/"
          unelevated
        />
        
        <q-btn
          label="Go Back"
          color="grey-7"
          icon="arrow_back"
          @click="goBack"
          flat
        />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.back();
}
</script>
