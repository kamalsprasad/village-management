<template>
  <div class="sample-data-banner">
    <div class="banner-content">
      <div class="banner-text">
        <q-icon name="science" size="sm" class="q-mr-sm" />
        <span class="text-weight-medium">
          🏷️ SAMPLE DATA MODE - Exploring Katete Model Village
        </span>
      </div>
      <q-btn
        flat
        dense
        color="white"
        label="Start Fresh - Wipe All Data"
        icon="delete_forever"
        class="wipe-btn"
        @click="showWipeDialog = true"
      />
    </div>

    <!-- Wipe Confirmation Dialog -->
    <WipeDataDialog v-model="showWipeDialog" @confirmed="handleWipeConfirmed" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from 'src/stores/settings-store';
import WipeDataDialog from 'src/components/dialogs/WipeDataDialog.vue';

const router = useRouter();
const settingsStore = useSettingsStore();

const showWipeDialog = ref(false);

async function handleWipeConfirmed() {
  const result = await settingsStore.wipeAllData();

  if (result.success) {
    // Redirect to setup wizard after successful wipe
    router.push('/setup');
  }
  // Error handling is done inside wipeAllData via useErrorHandler
}
</script>

<style lang="scss" scoped>
.sample-data-banner {
  background: linear-gradient(90deg, #f9a825 0%, #fbc02d 100%);
  color: #000;
  padding: 8px 16px;
  position: relative;
  z-index: 2000;
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.banner-text {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.wipe-btn {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;

  &:hover {
    background: rgba(0, 0, 0, 0.25);
  }
}

@media (max-width: 600px) {
  .banner-content {
    flex-direction: column;
    text-align: center;
  }

  .banner-text {
    justify-content: center;
  }
}
</style>
