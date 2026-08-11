<template>
  <q-page padding class="modules-page">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <h4 class="text-h5 q-my-none">Module Management</h4>
        <p class="text-grey-7 q-mb-none">
          Enable or disable optional modules. Disabling a module hides its navigation, routes, and
          dashboard widgets. No data is deleted.
        </p>
      </div>
      <div v-if="isClient" class="row q-gutter-sm">
        <q-btn
          flat
          label="Reset"
          :disable="!hasChanges || settingsStore.isLoading"
          @click="resetSelection"
        />
        <q-btn
          color="primary"
          icon="save"
          label="Save Changes"
          :loading="settingsStore.isLoading"
          :disable="!hasChanges"
          @click="handleSave"
        />
      </div>
    </div>

    <!-- Loading state -->
    <div
      v-if="!isClient || (settingsStore.isLoading && !settingsStore.isLoaded)"
      class="flex flex-center q-pa-xl"
    >
      <q-spinner color="primary" size="50px" />
    </div>

    <template v-else>
      <!-- Core modules -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-h6 q-mb-sm">Core Modules</div>
          <p class="text-body2 text-grey-7 q-mb-md">
            These modules are always enabled and cannot be disabled.
          </p>
          <ModuleSelectionGrid
            v-model="coreSelection"
            read-only
            :modules="coreModules"
            :show-warnings="false"
          />
        </q-card-section>
      </q-card>

      <!-- Optional modules -->
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h6 q-mb-sm">Optional Modules</div>
          <p class="text-body2 text-grey-7 q-mb-md">
            Toggle optional modules on or off. Warnings are shown when an enabled module depends on
            one you are disabling.
          </p>
          <ModuleSelectionGrid
            v-model="selectedModules"
            :modules="optionalModules"
            :show-warnings="true"
          />
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useSettingsStore } from 'src/stores/settings-store';
import { getModuleByKey, getModulesByType, CORE_MODULE_KEYS } from 'src/utils/module-registry';
import ModuleSelectionGrid from 'src/components/admin/ModuleSelectionGrid.vue';

const $q = useQuasar();
const settingsStore = useSettingsStore();

const isClient = ref(false);
const selectedModules = ref([]);

// Core modules are always enabled, so the grid is read-only.
const coreSelection = computed(() => CORE_MODULE_KEYS);
const coreModules = computed(() => getModulesByType('core'));
const optionalModules = computed(() => getModulesByType('optional'));

const currentModules = computed(() => settingsStore.modulesEnabled || []);

const hasChanges = computed(() => {
  const current = currentModules.value;
  if (current.length !== selectedModules.value.length) return true;
  const currentSet = new Set(current);
  return (
    selectedModules.value.some((key) => !currentSet.has(key)) ||
    current.some((key) => !selectedModules.value.includes(key))
  );
});

const modulesToDisable = computed(() => {
  const selectedSet = new Set(selectedModules.value);
  return currentModules.value.filter((key) => !selectedSet.has(key));
});

onMounted(async () => {
  isClient.value = true;

  if (!settingsStore.isLoaded) {
    await settingsStore.loadSettings();
  }

  // Preserve all currently enabled keys (core, optional, and any deferred/unknown
  // modules already in the database). The optional grid only renders known optional
  // modules; unknown keys are carried through without being dropped.
  selectedModules.value = [...(settingsStore.modulesEnabled || [])];
});

function resetSelection() {
  selectedModules.value = [...currentModules.value];
}

async function handleSave() {
  if (modulesToDisable.value.length > 0) {
    const names = modulesToDisable.value.map((key) => getModuleByKey(key)?.label || key).join(', ');

    $q.dialog({
      title: 'Disable Modules?',
      message: `You are disabling: ${names}. Existing data will be preserved, but navigation, routes, and dashboard widgets for these modules will be hidden.`,
      cancel: {
        label: 'Cancel',
        flat: true,
      },
      ok: {
        label: 'Confirm',
        color: 'negative',
      },
      persistent: true,
    }).onOk(async () => {
      await persistModules();
    });
  } else {
    await persistModules();
  }
}

async function persistModules() {
  const result = await settingsStore.updateModulesEnabled(selectedModules.value);

  if (result.success) {
    selectedModules.value = [...(settingsStore.modulesEnabled || [])];
    $q.notify({
      type: 'positive',
      message: 'Module settings saved successfully',
      position: 'bottom',
    });
  } else {
    $q.notify({
      type: 'negative',
      message: result.error || 'Failed to save module settings',
      position: 'bottom',
    });
  }
}
</script>
