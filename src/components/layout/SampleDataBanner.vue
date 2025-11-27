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
        color="black"
        label="Start Fresh - Wipe All Data"
        icon="delete_forever"
        class="wipe-btn"
        @click="showWipeDialog = true"
      />
    </div>

    <!-- Wipe Confirmation Dialog -->
    <WipeDataDialog
      v-model="showWipeDialog"
      :loading="isWiping"
      :current-phase="currentPhase"
      @confirmed="handleWipeConfirmed"
    />
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
const isWiping = ref(false);
const currentPhase = ref('');

/**
 * Handle phase changes from the wipe operation
 * @param {string} phase - Current phase: 'starting' | 'waiting' | 'processing' | 'complete'
 */
function handlePhaseChange(phase) {
  currentPhase.value = phase;
  console.log(`Wipe phase: ${phase}`);
}

async function handleWipeConfirmed() {
  isWiping.value = true;
  currentPhase.value = 'starting';

  try {
    const result = await settingsStore.wipeAllData(handlePhaseChange);

    if (result.success) {
      // Brief delay to show completion state before redirect
      await new Promise((resolve) => setTimeout(resolve, 800));
      showWipeDialog.value = false;
      // Redirect to setup wizard after successful wipe
      router.push('/setup');
    } else {
      // On error, close dialog (error notification handled by store)
      showWipeDialog.value = false;
    }
  } finally {
    isWiping.value = false;
    currentPhase.value = '';
  }
}
</script>

<style lang="scss" scoped>
.sample-data-banner {
  background: linear-gradient(90deg, #ffc107 0%, #ffca28 100%);
  color: #000;
  padding: 6px 16px;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  /* No fixed z-index needed as it is inside QHeader */
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
  margin: 0 auto;
  flex-wrap: wrap;
  gap: 8px;
}

.banner-text {
  display: flex;
  align-items: center;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.wipe-btn {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 12px;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
}

@media (max-width: 600px) {
  .banner-content {
    justify-content: center;
  }

  .wipe-btn {
    width: 100%;
    margin-top: 4px;
  }
}
</style>
