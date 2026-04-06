<template>
  <div v-if="isClient">
    <slot />
  </div>
  <div v-else>
    <slot name="fallback" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});
</script>
