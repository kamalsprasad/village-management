<!--
  FarmSettingsPage.vue

  Story 3.10: Farm alert configuration settings.
  Persists alert thresholds to village_settings.farm_alert_config (JSON string).
-->
<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <h4 class="text-h5 q-my-none">Farm Settings</h4>
        <p class="text-grey-7 q-mb-none">Configure farm alert thresholds and notifications</p>
      </div>
      <q-btn
        flat
        dense
        icon="arrow_back"
        label="Farm"
        color="primary"
        @click="$router.push('/farm')"
      />
    </div>

    <div v-if="isLoading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <template v-else>
      <!-- Alert Configuration Card -->
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-md">
            <q-icon name="notifications_active" class="q-mr-xs text-orange" />
            Alert Thresholds
          </div>

          <q-list separator>
            <!-- Upcoming Harvest -->
            <q-item>
              <q-item-section>
                <q-item-label>Upcoming Harvest Alert</q-item-label>
                <q-item-label caption> Notify when harvest is due within N days </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-input
                    v-model.number="localConfig.upcoming_harvest.threshold"
                    type="number"
                    min="1"
                    max="60"
                    dense
                    outlined
                    style="width: 80px"
                    suffix="days"
                    :disable="!localConfig.upcoming_harvest.enabled"
                  />
                  <q-toggle v-model="localConfig.upcoming_harvest.enabled" color="primary" />
                </div>
              </q-item-section>
            </q-item>

            <!-- Overdue Harvest -->
            <q-item>
              <q-item-section>
                <q-item-label>Overdue Harvest Alert</q-item-label>
                <q-item-label caption>
                  Warn when harvest expected date has passed by more than N days
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-input
                    v-model.number="localConfig.overdue_harvest.threshold"
                    type="number"
                    min="1"
                    max="60"
                    dense
                    outlined
                    style="width: 80px"
                    suffix="days"
                    :disable="!localConfig.overdue_harvest.enabled"
                  />
                  <q-toggle v-model="localConfig.overdue_harvest.enabled" color="primary" />
                </div>
              </q-item-section>
            </q-item>

            <!-- Low Inventory -->
            <q-item>
              <q-item-section>
                <q-item-label>Low Farm Input Inventory</q-item-label>
                <q-item-label caption>
                  Alert when a farm input item quantity falls to N or below
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-input
                    v-model.number="localConfig.low_inventory.threshold"
                    type="number"
                    min="0"
                    max="1000"
                    dense
                    outlined
                    style="width: 80px"
                    suffix="units"
                    :disable="!localConfig.low_inventory.enabled"
                  />
                  <q-toggle v-model="localConfig.low_inventory.enabled" color="primary" />
                </div>
              </q-item-section>
            </q-item>

            <!-- Underperforming Yield -->
            <q-item>
              <q-item-section>
                <q-item-label>Underperforming Yield Alert</q-item-label>
                <q-item-label caption>
                  Warn when a completed planting's yield/ha is less than N% of typical yield
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-input
                    v-model.number="localConfig.underperforming_yield.threshold"
                    type="number"
                    min="10"
                    max="99"
                    dense
                    outlined
                    style="width: 80px"
                    suffix="%"
                    :disable="!localConfig.underperforming_yield.enabled"
                  />
                  <q-toggle v-model="localConfig.underperforming_yield.enabled" color="primary" />
                </div>
              </q-item-section>
            </q-item>

            <!-- Crop Failure — always on, no threshold -->
            <q-item>
              <q-item-section>
                <q-item-label>Crop Failure Alert</q-item-label>
                <q-item-label caption>
                  Always notified when a planting is marked as Failed (last 30 days)
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="orange" label="Always On" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Alert Delivery Methods -->
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-md">
            <q-icon name="send" class="q-mr-xs text-primary" />
            Alert Delivery Methods
          </div>

          <q-list separator>
            <q-item>
              <q-item-section>
                <q-item-label>In-App Notifications</q-item-label>
                <q-item-label caption>
                  Always enabled. Alerts appear on the dashboard and alerts page.
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-toggle :model-value="true" color="positive" disable />
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section>
                <q-item-label>Email Notifications</q-item-label>
                <q-item-label caption> Receive alert digests via email. </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="row items-center q-gutter-sm">
                  <q-chip
                    v-if="localConfig.email_enabled"
                    size="sm"
                    color="info"
                    text-color="white"
                    icon="info"
                  >
                    SMTP required — see docs/POST-MVP.md
                  </q-chip>
                  <q-toggle v-model="localConfig.email_enabled" color="primary" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Save Button -->
      <div class="row q-gutter-sm q-mt-md">
        <q-btn
          color="primary"
          icon="save"
          label="Save Settings"
          :loading="isSaving"
          @click="save"
        />
        <q-btn flat color="grey" label="Reset to Defaults" @click="resetDefaults" />
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFarmStore } from '../stores/farm-store';

const farmStore = useFarmStore();
const $q = useQuasar();

const isLoading = ref(true);
const isSaving = ref(false);

const DEFAULT_CONFIG = {
  low_inventory: { enabled: true, threshold: 10 },
  upcoming_harvest: { enabled: true, threshold: 7 },
  overdue_harvest: { enabled: true, threshold: 7 },
  underperforming_yield: { enabled: true, threshold: 50 },
  email_enabled: false,
};

const localConfig = reactive({
  low_inventory: { enabled: true, threshold: 10 },
  upcoming_harvest: { enabled: true, threshold: 7 },
  overdue_harvest: { enabled: true, threshold: 7 },
  underperforming_yield: { enabled: true, threshold: 50 },
  email_enabled: false,
});

function applyConfig(cfg) {
  localConfig.low_inventory = { ...cfg.low_inventory };
  localConfig.upcoming_harvest = { ...cfg.upcoming_harvest };
  localConfig.overdue_harvest = { ...cfg.overdue_harvest };
  localConfig.underperforming_yield = { ...cfg.underperforming_yield };
  localConfig.email_enabled = !!cfg.email_enabled;
}

function resetDefaults() {
  applyConfig(DEFAULT_CONFIG);
}

async function save() {
  isSaving.value = true;
  const result = await farmStore.saveAlertConfig({ ...localConfig });
  if (result.success) {
    $q.notify({ type: 'positive', message: 'Farm settings saved.', position: 'top' });
  } else {
    $q.notify({ type: 'negative', message: 'Save failed: ' + result.error, position: 'top' });
  }
  isSaving.value = false;
}

onMounted(async () => {
  const cfg = await farmStore.fetchAlertConfig();
  applyConfig(cfg);
  isLoading.value = false;
});
</script>
