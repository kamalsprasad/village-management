import { defineStore } from 'pinia';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const errorHandler = useErrorHandler();

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null,
    isLoading: false,
    isFirstRun: false,
    lastFetched: null,
  }),

  getters: {
    /**
     * Get village name
     */
    villageName: (state) => state.settings?.village_name || 'My Village',

    /**
     * Get full address
     */
    address: (state) => state.settings?.address || '',

    /**
     * Get established date
     */
    establishedDate: (state) => state.settings?.established_date || null,

    /**
     * Get default currency code
     */
    defaultCurrency: (state) => state.settings?.default_currency || 'ZMW',

    /**
     * Get currency symbol
     */
    currencySymbol: (state) => state.settings?.currency_symbol || 'K',

    /**
     * Get timezone
     */
    timezone: (state) => state.settings?.timezone || 'Africa/Lusaka',

    /**
     * Get country code
     */
    countryCode: (state) => state.settings?.country_code || 'ZM',

    /**
     * Check if using sample data
     */
    isUsingSampleData: (state) => state.settings?.is_using_sample_data || false,

    /**
     * Get council members (parsed from JSON string)
     */
    councilMembers: (state) => {
      if (!state.settings?.council_members) return [];
      try {
        return JSON.parse(state.settings.council_members);
      } catch (error) {
        console.error('Error parsing council members:', error);
        return [];
      }
    },

    /**
     * Get enabled modules
     */
    modulesEnabled: (state) => state.settings?.modules_enabled || [],

    /**
     * Get last updated timestamp
     */
    lastUpdated: (state) => state.settings?.$updatedAt || null,

    /**
     * Format currency amount with symbol
     * @returns {Function} Function that takes amount and returns formatted string
     */
    formatCurrency: (state) => (amount) => {
      const symbol = state.settings?.currency_symbol || 'K';
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${symbol} ${formattedAmount}`;
    },

    /**
     * Format date/time in configured timezone
     * @returns {Function} Function that takes date and format string
     */
    formatDateTime: (state) => (date, formatStr = 'PPpp') => {
      if (!date) return '';
      const tz = state.settings?.timezone || 'Africa/Lusaka';
      try {
        return formatInTimeZone(new Date(date), tz, formatStr);
      } catch (error) {
        console.error('Error formatting date:', error);
        return format(new Date(date), formatStr);
      }
    },

    /**
     * Check if settings are loaded
     */
    isLoaded: (state) => state.settings !== null,
  },

  actions: {
    /**
     * Load village settings from Appwrite
     * @returns {Promise<Object>} Result object with success flag
     */
    async loadSettings() {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_VILLAGE_SETTINGS;

        const result = await tables.getRow({
          databaseId: dbId,
          tableId: collectionId,
          rowId: 'settings_root',
        });

        this.settings = result;
        this.lastFetched = new Date();
        this.isFirstRun = false;

        return { success: true, data: result };
      } catch (error) {
        if (error.code === 404) {
          // Settings don't exist yet - first run scenario
          console.log('Settings not found - first run detected');
          this.isFirstRun = true;
          return { success: false, error: 'Settings not found', isFirstRun: true };
        }

        console.error('Error loading settings:', error);
        errorHandler.notifyError('Failed to load village settings. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update village settings
     * @param {Object} updates - Settings fields to update
     * @returns {Promise<Object>} Result object with success flag
     */
    async updateSettings(updates) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_VILLAGE_SETTINGS;

        // Validate required fields
        const validation = errorHandler.validateForm(updates, {
          village_name: { required: true, minLength: 1 },
          default_currency: { required: true, minLength: 3, maxLength: 3 },
          currency_symbol: { required: true, minLength: 1 },
          timezone: { required: true },
          country_code: { required: true, minLength: 2, maxLength: 2 },
        });

        if (!validation.isValid) {
          errorHandler.notifyError(`Validation failed: ${validation.errors.join(', ')}`);
          return { success: false, errors: validation.errors };
        }

        // Stringify council_members if it's an array
        const processedUpdates = { ...updates };
        if (Array.isArray(processedUpdates.council_members)) {
          processedUpdates.council_members = JSON.stringify(processedUpdates.council_members);
        }

        const result = await tables.updateRow({
          databaseId: dbId,
          tableId: collectionId,
          rowId: 'settings_root',
          data: processedUpdates,
        });

        this.settings = result;
        this.lastFetched = new Date();

        errorHandler.notifySuccess('Village settings updated successfully');
        return { success: true, data: result };
      } catch (error) {
        console.error('Error updating settings:', error);
        errorHandler.notifyError('Failed to update village settings. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Create initial settings (for first-run scenario)
     * @param {Object} initialSettings - Initial settings data
     * @returns {Promise<Object>} Result object with success flag
     */
    async createSettings(initialSettings) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const collectionId = import.meta.env.VITE_APPWRITE_COLLECTION_VILLAGE_SETTINGS;

        // Stringify council_members if it's an array
        const processedSettings = { ...initialSettings };
        if (Array.isArray(processedSettings.council_members)) {
          processedSettings.council_members = JSON.stringify(processedSettings.council_members);
        }

        const result = await tables.createRow({
          databaseId: dbId,
          tableId: collectionId,
          rowId: 'settings_root',
          data: processedSettings,
        });

        this.settings = result;
        this.lastFetched = new Date();
        this.isFirstRun = false;

        errorHandler.notifySuccess('Village settings created successfully');
        return { success: true, data: result };
      } catch (error) {
        console.error('Error creating settings:', error);
        errorHandler.notifyError('Failed to create village settings. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Refresh settings from server
     */
    async refreshSettings() {
      return await this.loadSettings();
    },

    /**
     * Reset store state
     */
    resetStore() {
      this.settings = null;
      this.isLoading = false;
      this.isFirstRun = false;
      this.lastFetched = null;
    },
  },
});
