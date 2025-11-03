import { defineStore } from 'pinia';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';

const errorHandler = useErrorHandler();

const DEFAULT_TIMEZONE = 'Africa/Lusaka';

const TIMEZONE_ALIASES = {
  cat: DEFAULT_TIMEZONE,
  'central africa time': DEFAULT_TIMEZONE,
  'central africa time-utc+02:00': DEFAULT_TIMEZONE,
  'central african time': DEFAULT_TIMEZONE,
  'central african time-utc+02:00': DEFAULT_TIMEZONE,
  'utc+02:00': 'Etc/GMT-2',
  'utc+2': 'Etc/GMT-2',
  'utc-02:00': 'Etc/GMT+2',
  'utc-2': 'Etc/GMT+2',
};

function normalizeTimezone(rawTz) {
  if (!rawTz) {
    return DEFAULT_TIMEZONE;
  }

  const trimmed = String(rawTz)
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\u00A0/g, ' ')
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');

  const alias = TIMEZONE_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  const offsetMatch = trimmed.match(/UTC\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i);
  if (offsetMatch) {
    const sign = offsetMatch[1] === '+' ? 1 : -1;
    const hours = Number(offsetMatch[2]);
    const minutes = offsetMatch[3] ? Number(offsetMatch[3]) : 0;
    if (!Number.isNaN(hours) && minutes === 0) {
      const offset = sign * hours;
      if (offset === 0) {
        return 'UTC';
      }
      const etcOffset = -offset;
      const signPrefix = etcOffset > 0 ? '+' : '';
      return `Etc/GMT${signPrefix}${etcOffset}`;
    }
  }

  return trimmed;
}

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
    establishedDate: (state) =>
      state.settings?.established_date ? state.settings.established_date.slice(0, 10) : null,

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
      if (!state.settings?.council_member_ids) return [];
      try {
        return JSON.parse(state.settings.council_member_ids);
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
    formatDateTime:
      (state) =>
      (date, formatStr = 'PPpp') => {
        if (!date) return '';
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
          console.error('Error formatting date: Invalid date input', date);
          return '';
        }

        const tz = normalizeTimezone(state.settings?.timezone || DEFAULT_TIMEZONE);

        try {
          return formatInTimeZone(parsedDate, tz, formatStr);
        } catch (error) {
          console.error('Error formatting date:', error);
          try {
            const fallbackTz = tz !== DEFAULT_TIMEZONE ? DEFAULT_TIMEZONE : 'UTC';
            return formatInTimeZone(parsedDate, fallbackTz, formatStr);
          } catch (fallbackError) {
            console.error('Fallback timezone formatting failed:', fallbackError);
            return format(parsedDate, formatStr);
          }
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
        const tableId = import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS;

        const result = await tables.getRow({
          databaseId: dbId,
          tableId,
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
        const tableId = import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS;

        // Validate required fields
        const validation = errorHandler.validateForm(updates, {
          village_name: { required: true, minLength: 1 },
          //default_currency: { required: true, minLength: 3, maxLength: 3 },
          default_currency: { required: true },
          currency_symbol: { required: true, minLength: 1 },
          timezone: { required: true },
          //country_code: { required: true, minLength: 2, maxLength: 2 },
          country_code: { required: true, minLength: 2, maxLength: 2 },
          country_phone_code: { required: true, minLength: 1, maxLength: 4 },
        });

        if (!validation.isValid) {
          errorHandler.notifyError(`Validation failed: ${validation.errors.join(', ')}`);
          return { success: false, errors: validation.errors };
        }

        const processedUpdates = { ...updates };

        // Normalize established_date to ISO string for Appwrite datetime attribute
        if (processedUpdates.established_date === '') {
          processedUpdates.established_date = null;
        } else if (typeof processedUpdates.established_date === 'string') {
          const dateOnlyMatch = processedUpdates.established_date.match(/^(\d{4}-\d{2}-\d{2})$/);
          const isoString = dateOnlyMatch
            ? new Date(`${processedUpdates.established_date}T00:00:00Z`).toISOString()
            : new Date(processedUpdates.established_date).toISOString();
          if (!Number.isNaN(new Date(isoString).getTime())) {
            processedUpdates.established_date = isoString;
          } else {
            processedUpdates.established_date = null;
          }
        }

        // Stringify council_members if it's an array
        // if (Array.isArray(processedUpdates.council_members)) {
        //   processedUpdates.council_members = JSON.stringify(processedUpdates.council_members);
        // }

        const council_member_ids = processedUpdates.council_members.map(
          (member) => member.residentId,
        );

        // Object.fromEntries(
        //   processedUpdates.council_members.map((member) => [member.id]),
        // );
        processedUpdates.council_member_ids = council_member_ids;
        delete processedUpdates.council_members;

        const result = await tables.updateRow({
          databaseId: dbId,
          tableId,
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
        const tableId = import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS;

        const processedSettings = { ...initialSettings };

        if (processedSettings.established_date === '') {
          processedSettings.established_date = null;
        } else if (typeof processedSettings.established_date === 'string') {
          const dateOnlyMatch = processedSettings.established_date.match(/^(\d{4}-\d{2}-\d{2})$/);
          const isoString = dateOnlyMatch
            ? new Date(`${processedSettings.established_date}T00:00:00Z`).toISOString()
            : new Date(processedSettings.established_date).toISOString();
          if (!Number.isNaN(new Date(isoString).getTime())) {
            processedSettings.established_date = isoString;
          } else {
            processedSettings.established_date = null;
          }
        }

        // Stringify council_members if it's an array
        // if (Array.isArray(processedSettings.council_members)) {
        //   processedSettings.council_members = JSON.stringify(processedSettings.council_members);
        // }

        const council_member_ids = processedSettings.council_members.map(
          (member) => member.residentId,
        );

        // Object.fromEntries(
        //   processedUpdates.council_members.map((member) => [member.id]),
        // );
        processedSettings.council_member_ids = council_member_ids;
        delete processedSettings.council_members;

        const result = await tables.createRow({
          databaseId: dbId,
          tableId,
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
