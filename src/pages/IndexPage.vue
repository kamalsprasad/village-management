<template>
  <q-page class="flex flex-center">
    <div class="text-center">
      <h1 class="text-h3 text-primary q-mb-md">Sustainable Model Village Management System</h1>
      <p class="text-h6 text-grey-7 q-mb-lg">
        Transforming rural African villages through data-driven management
      </p>
      <q-btn
        color="primary"
        label="Get Started"
        size="lg"
        class="q-px-xl"
        @click="handleGetStarted"
      />
    </div>
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar';

const $q = useQuasar();

function handleGetStarted() {
  $q.notify({
    message: 'Welcome to Village Management System!',
    color: 'positive',
    position: 'top',
  });
}
</script>
