import { defineStore } from 'pinia';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { tables, functions } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from 'src/stores/auth-store';
import { CORE_MODULE_KEYS, OPTIONAL_MODULE_KEYS } from 'src/utils/module-registry';

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
     * Check if lending module is enabled
     */
    lendingEnabled: (state) => state.settings?.lending_enabled ?? true,

    /**
     * Check if farm module is enabled (Story 5.9)
     */
    farmEnabled: (state) => state.settings?.modules_enabled?.includes('farm') ?? false,

    /**
     * Check if school module is enabled (Story 5.9)
     */
    schoolEnabled: (state) => state.settings?.modules_enabled?.includes('school') ?? false,

    /**
     * Check if vendors module is enabled (Story 5.7/5.9)
     * Uses modules_enabled as the canonical source, falling back to the legacy vendors_enabled flag.
     */
    vendorsEnabled: (state) => {
      const modules = state.settings?.modules_enabled;
      if (Array.isArray(modules)) {
        return modules.includes('vendors');
      }
      return state.settings?.vendors_enabled ?? true;
    },

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
     * Get yield unit
     */
    yieldUnit: (state) => state.settings?.yield_unit || 'kg_per_hectare',

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

        if (updates.lending_enabled !== undefined && typeof updates.lending_enabled !== 'boolean') {
          return { success: false, errors: ['lending_enabled must be a boolean'] };
        }

        if (!validation.isValid) {
          errorHandler.notifyError(`Validation failed: ${validation.errors.join(', ')}`);
          return { success: false, errors: validation.errors };
        }

        const processedUpdates = { ...updates };

        // Normalize established_date to ISO string for Appwrite datetime attribute
        // Only normalize when the field is present in the update payload.
        if ('established_date' in processedUpdates) {
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
        }

        // Only process council_member_ids when the field is present in the update payload.
        // Story 5.9: module-only updates must not re-process existing relationship data.
        if (
          'council_member_ids' in processedUpdates &&
          Array.isArray(processedUpdates.council_member_ids)
        ) {
          processedUpdates.council_member_ids = processedUpdates.council_member_ids.map((member) =>
            typeof member === 'string' ? member : member.residentId,
          );
        }

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

    /**
     * Build a new modules_enabled array by adding or removing a single key.
     * @param {string} moduleKey - Module key to toggle
     * @returns {string[]} The updated modules_enabled array
     */
    toggleModule(moduleKey) {
      const current = this.settings?.modules_enabled || [];
      const index = current.indexOf(moduleKey);
      if (index >= 0) {
        return current.filter((key) => key !== moduleKey);
      }
      return [...current, moduleKey];
    },

    /**
     * Persist the modules_enabled array to Appwrite.
     * Only sends the module field plus the required scalar validation fields;
     * relationship/datetime fields are left untouched.
     * @param {string[]} enabledKeys - Full list of enabled module keys
     * @returns {Promise<Object>} Result object with success flag
     */
    async updateModulesEnabled(enabledKeys) {
      if (!this.settings) {
        const loadResult = await this.loadSettings();
        if (!loadResult.success) {
          return { success: false, error: 'Settings not loaded' };
        }
      }

      const knownValid = new Set([...CORE_MODULE_KEYS, ...OPTIONAL_MODULE_KEYS]);
      const currentEnabled = new Set(this.settings?.modules_enabled || []);

      // Reject brand-new unknown keys (the UI can only toggle known optional modules),
      // but allow keys that already exist in the database (e.g. deferred modules).
      const invalidKeys = enabledKeys.filter(
        (key) => !knownValid.has(key) && !currentEnabled.has(key),
      );
      if (invalidKeys.length > 0) {
        return { success: false, error: `Invalid module keys: ${invalidKeys.join(', ')}` };
      }

      // Core modules are always enabled and cannot be removed.
      const finalKeys = [...new Set([...CORE_MODULE_KEYS, ...enabledKeys])];

      const base = this.settings;
      const updates = {
        village_name: base.village_name,
        address: base.address,
        default_currency: base.default_currency,
        currency_symbol: base.currency_symbol,
        timezone: base.timezone,
        country_code: base.country_code,
        country_phone_code: base.country_phone_code,
        is_using_sample_data: base.is_using_sample_data,
        lending_enabled: base.lending_enabled,
        modules_enabled: finalKeys,
      };

      return await this.updateSettings(updates);
    },

    /**
     * Wipe all data via Appwrite Cloud Function (async with polling)
     * Requires System Administrator permission (verified server-side)
     * @param {Function} onPhaseChange - Optional callback for phase updates
     * @returns {Promise<Object>} Result object with success flag
     */
    async wipeAllData(onPhaseChange = null) {
      this.isLoading = true;
      try {
        const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_WIPE_DATA;

        if (!functionId) {
          const message =
            'Wipe function not configured: VITE_APPWRITE_FUNCTION_WIPE_DATA is not set. Please update your environment settings.';
          console.error(message);
          errorHandler.notifyError(message);
          return { success: false, error: message };
        }

        // Get current user ID for server-side permission verification
        const authStore = useAuthStore();
        if (!authStore.user?.$id) {
          errorHandler.notifyError('You must be logged in to perform this action.');
          return { success: false, error: 'Not authenticated' };
        }

        // Notify phase change: starting
        if (onPhaseChange) onPhaseChange('starting');

        // Call the wipe cloud function with async=true to avoid 30s timeout
        const execution = await functions.createExecution(
          functionId,
          JSON.stringify({ userId: authStore.user.$id }),
          true, // async = true, returns immediately with execution ID
        );

        const executionId = execution.$id;
        console.log(`Wipe execution started: ${executionId}`);

        // Notify phase change: processing
        if (onPhaseChange) onPhaseChange('processing');

        // Poll for execution completion
        const result = await this._pollExecutionStatus(functionId, executionId, onPhaseChange);

        if (!result.success) {
          errorHandler.notifyError(result.error || 'Failed to wipe data.');
          return result;
        }

        // Reset all Pinia stores
        this.resetStore();
        this.isFirstRun = true; // Trigger first-run state

        // Reset households store
        const { useHouseholdsStore } = await import('src/stores/households-store');
        const householdsStore = useHouseholdsStore();
        householdsStore.$reset();

        // Reset residents store
        const { useResidentsStore } = await import('src/stores/residents-store');
        const residentsStore = useResidentsStore();
        residentsStore.$reset();

        // Notify phase change: complete
        if (onPhaseChange) onPhaseChange('complete');

        errorHandler.notifySuccess(
          `Data wiped successfully. Deleted ${result.data?.deletedResidents || 0} residents and ${result.data?.deletedHouseholds || 0} households.`,
        );

        return { success: true, data: result.data };
      } catch (error) {
        console.error('Error wiping data:', error);

        // Handle permission denied (401) specifically
        if (error.code === 401) {
          const message =
            'Permission denied. You must be a System Administrator to wipe data. Please log in with an authorized account.';
          errorHandler.notifyError(message);
          return { success: false, error: message };
        }

        errorHandler.notifyError('Failed to wipe data. Please try again.');
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Poll execution status until complete or failed
     * @param {string} functionId - Function ID
     * @param {string} executionId - Execution ID to poll
     * @param {Function} onPhaseChange - Optional callback for phase updates
     * @returns {Promise<Object>} Result with success flag and data
     * @private
     */
    async _pollExecutionStatus(functionId, executionId, onPhaseChange = null) {
      const POLL_INTERVAL_MS = 1500; // Poll every 1.5 seconds
      const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minute max wait
      const startTime = Date.now();

      let lastStatus = '';

      while (Date.now() - startTime < MAX_POLL_TIME_MS) {
        try {
          const execution = await functions.getExecution(functionId, executionId);
          const status = execution.status;

          // Log status changes
          if (status !== lastStatus) {
            console.log(`Wipe execution status: ${status}`);
            lastStatus = status;

            // Update phase based on status
            if (onPhaseChange) {
              if (status === 'waiting') {
                onPhaseChange('waiting');
              } else if (status === 'processing') {
                onPhaseChange('processing');
              }
            }
          }

          if (status === 'completed') {
            // Parse the response body (may be empty string for async executions)
            const responseBody = execution.responseBody || '';

            // If response body is empty but status is completed, treat as success
            // This can happen with async executions on self-hosted Appwrite
            if (!responseBody || responseBody.trim() === '') {
              console.log('Wipe execution completed (no response body - async execution)');
              return { success: true, data: { message: 'Wipe completed successfully' } };
            }

            let response;
            try {
              response = JSON.parse(responseBody);
            } catch (parseError) {
              console.error('Failed to parse wipe function response:', parseError);
              console.log('Raw response body:', responseBody);
              // If we can't parse but status is completed, assume success
              return { success: true, data: { message: 'Wipe completed (response parse failed)' } };
            }

            if (!response.success) {
              return { success: false, error: response.error || 'Wipe operation failed' };
            }

            return { success: true, data: response };
          }

          if (status === 'failed') {
            const errorMsg =
              execution.errors || execution.responseBody || 'Function execution failed';
            console.error('Wipe execution failed:', errorMsg);
            return { success: false, error: errorMsg };
          }

          // Wait before next poll
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        } catch (pollError) {
          console.error('Error polling execution status:', pollError);
          // Continue polling on transient errors
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      // Timeout reached
      return {
        success: false,
        error: 'Wipe operation timed out. Please check the Appwrite console for status.',
      };
    },
  },
});
