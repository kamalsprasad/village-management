import { defineBoot } from '#q-app/wrappers';
import { useSettingsStore } from 'src/stores/settings-store';

/**
 * Settings Boot File
 *
 * Initializes village settings on app startup.
 * Handles first-run scenario gracefully by setting isFirstRun flag
 * without blocking app initialization.
 *
 * This ensures settings are available for:
 * - MainLayout header (village name display)
 * - Dashboard components
 * - Currency formatting throughout the app
 * - Timezone-aware date displays
 */
export default defineBoot(async ({ store }) => {
  const settingsStore = useSettingsStore(store);

  try {
    // Attempt to load settings
    const result = await settingsStore.loadSettings();

    if (result.isFirstRun) {
      // First run detected - settings don't exist yet
      // App will continue to load and show setup wizard
      console.log('First run detected - setup wizard will be shown');
    } else if (!result.success) {
      // Real error occurred
      console.error('Failed to load settings:', result.error);
      // App continues to load but settings will use defaults
    } else {
      // Settings loaded successfully
      console.log('Village settings loaded:', settingsStore.villageName);
    }
  } catch (error) {
    // Unexpected error - log but don't block app startup
    console.error('Unexpected error loading settings:', error);
  }
});
