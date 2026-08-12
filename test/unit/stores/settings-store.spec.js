import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from 'src/stores/settings-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables, mockFunctions } from 'test/helpers/appwrite-mock';
import { makeUser } from 'test/helpers/fixtures';

const validSettings = {
  village_name: 'Katete',
  address: '123 Main St',
  default_currency: 'ZMW',
  currency_symbol: 'K',
  timezone: 'Africa/Lusaka',
  country_code: 'ZM',
  country_phone_code: '260',
};

describe('settings-store', () => {
  let store;
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSettingsStore();
    authStore = useAuthStore();
  });

  describe('getters (default state)', () => {
    it('returns defaults when settings is null', () => {
      expect(store.villageName).toBe('My Village');
      expect(store.address).toBe('');
      expect(store.defaultCurrency).toBe('ZMW');
      expect(store.currencySymbol).toBe('K');
      expect(store.timezone).toBe('Africa/Lusaka');
      expect(store.countryCode).toBe('ZM');
      expect(store.isUsingSampleData).toBe(false);
      expect(store.lendingEnabled).toBe(true);
      expect(store.farmEnabled).toBe(false);
      expect(store.schoolEnabled).toBe(false);
      expect(store.vendorsEnabled).toBe(true);
      expect(store.councilMembers).toEqual([]);
      expect(store.modulesEnabled).toEqual([]);
      expect(store.lastUpdated).toBeNull();
      expect(store.isLoaded).toBe(false);
      expect(store.yieldUnit).toBe('kg_per_hectare');
    });

    it('establishedDate returns null when not set', () => {
      expect(store.establishedDate).toBeNull();
    });

    it('establishedDate slices first 10 chars', () => {
      store.settings = { established_date: '2020-01-15T00:00:00Z' };
      expect(store.establishedDate).toBe('2020-01-15');
    });
  });

  describe('getters (with settings)', () => {
    beforeEach(() => {
      store.settings = {
        village_name: 'Katete',
        address: 'Plot 1',
        default_currency: 'USD',
        currency_symbol: '$',
        timezone: 'UTC',
        country_code: 'US',
        modules_enabled: ['farm', 'school', 'vendors'],
        council_member_ids: JSON.stringify(['r1', 'r2']),
        is_using_sample_data: true,
        lending_enabled: false,
        yield_unit: 'tons_per_hectare',
        $updatedAt: '2025-01-01T00:00:00Z',
      };
    });

    it('returns configured values', () => {
      expect(store.villageName).toBe('Katete');
      expect(store.address).toBe('Plot 1');
      expect(store.defaultCurrency).toBe('USD');
      expect(store.currencySymbol).toBe('$');
      expect(store.timezone).toBe('UTC');
      expect(store.countryCode).toBe('US');
      expect(store.isUsingSampleData).toBe(true);
      expect(store.lendingEnabled).toBe(false);
      expect(store.farmEnabled).toBe(true);
      expect(store.schoolEnabled).toBe(true);
      expect(store.vendorsEnabled).toBe(true);
      expect(store.modulesEnabled).toEqual(['farm', 'school', 'vendors']);
      expect(store.lastUpdated).toBe('2025-01-01T00:00:00Z');
      expect(store.yieldUnit).toBe('tons_per_hectare');
      expect(store.isLoaded).toBe(true);
    });

    it('councilMembers parses JSON string', () => {
      expect(store.councilMembers).toEqual(['r1', 'r2']);
    });

    it('councilMembers returns [] on parse error', () => {
      store.settings.council_member_ids = 'not-json';
      expect(store.councilMembers).toEqual([]);
    });

    it('vendorsEnabled falls back to vendors_enabled when modules_enabled is not an array', () => {
      store.settings.modules_enabled = null;
      store.settings.vendors_enabled = false;
      expect(store.vendorsEnabled).toBe(false);
    });

    it('formatCurrency formats with symbol', () => {
      expect(store.formatCurrency(1500)).toBe('$ 1,500.00');
    });

    it('formatDateTime formats a date in the configured timezone', () => {
      const out = store.formatDateTime('2025-01-15T12:00:00Z', 'yyyy-MM-dd HH:mm');
      expect(out).toMatch(/2025-01-15/);
    });

    it('formatDateTime returns empty string for falsy input', () => {
      expect(store.formatDateTime(null)).toBe('');
    });

    it('formatDateTime returns empty string for invalid date', () => {
      expect(store.formatDateTime('garbage')).toBe('');
    });
  });

  describe('loadSettings', () => {
    it('loads settings successfully', async () => {
      mockTables.getRow.mockResolvedValue({ village_name: 'X' });
      const result = await store.loadSettings();
      expect(result.success).toBe(true);
      expect(store.settings).toEqual({ village_name: 'X' });
      expect(store.isFirstRun).toBe(false);
      expect(store.isLoading).toBe(false);
      expect(store.lastFetched).toBeInstanceOf(Date);
    });

    it('detects first run on 404', async () => {
      mockTables.getRow.mockRejectedValue({ code: 404 });
      const result = await store.loadSettings();
      expect(result.success).toBe(false);
      expect(result.isFirstRun).toBe(true);
      expect(store.isFirstRun).toBe(true);
    });

    it('handles non-404 errors', async () => {
      mockTables.getRow.mockRejectedValue(new Error('network'));
      const result = await store.loadSettings();
      expect(result.success).toBe(false);
      expect(store.isLoading).toBe(false);
    });
  });

  describe('updateSettings', () => {
    it('returns validation errors for missing required fields', async () => {
      const result = await store.updateSettings({ village_name: '' });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(mockTables.updateRow).not.toHaveBeenCalled();
    });

    it('rejects non-boolean lending_enabled', async () => {
      const result = await store.updateSettings({ ...validSettings, lending_enabled: 'yes' });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('lending_enabled must be a boolean');
    });

    it('updates successfully and notifies', async () => {
      mockTables.updateRow.mockResolvedValue({ ...validSettings });
      const result = await store.updateSettings(validSettings);
      expect(result.success).toBe(true);
      expect(store.settings).toEqual(validSettings);
    });

    it('normalizes established_date from YYYY-MM-DD to ISO', async () => {
      mockTables.updateRow.mockResolvedValue({});
      await store.updateSettings({ ...validSettings, established_date: '2020-01-15' });
      const args = mockTables.updateRow.mock.calls[0][0];
      expect(args.data.established_date).toBe('2020-01-15T00:00:00.000Z');
    });

    it('converts empty established_date to null', async () => {
      mockTables.updateRow.mockResolvedValue({});
      await store.updateSettings({ ...validSettings, established_date: '' });
      const args = mockTables.updateRow.mock.calls[0][0];
      expect(args.data.established_date).toBeNull();
    });

    it('maps council_member_ids objects to residentId strings', async () => {
      mockTables.updateRow.mockResolvedValue({});
      await store.updateSettings({
        ...validSettings,
        council_member_ids: [{ residentId: 'r1' }, { residentId: 'r2' }],
      });
      const args = mockTables.updateRow.mock.calls[0][0];
      expect(args.data.council_member_ids).toEqual(['r1', 'r2']);
    });

    it('handles update error', async () => {
      mockTables.updateRow.mockRejectedValue(new Error('network'));
      const result = await store.updateSettings(validSettings);
      expect(result.success).toBe(false);
    });
  });

  describe('createSettings', () => {
    it('creates settings and maps council_members', async () => {
      mockTables.createRow.mockResolvedValue({ village_name: 'New' });
      const result = await store.createSettings({
        ...validSettings,
        council_members: [{ residentId: 'r1' }, { residentId: 'r2' }],
      });
      expect(result.success).toBe(true);
      expect(store.isFirstRun).toBe(false);
      const args = mockTables.createRow.mock.calls[0][0];
      expect(args.data.council_member_ids).toEqual(['r1', 'r2']);
      expect(args.data.council_members).toBeUndefined();
    });

    it('normalizes established_date', async () => {
      mockTables.createRow.mockResolvedValue({});
      await store.createSettings({
        ...validSettings,
        established_date: '2020-06-15',
        council_members: [],
      });
      const args = mockTables.createRow.mock.calls[0][0];
      expect(args.data.established_date).toBe('2020-06-15T00:00:00.000Z');
    });

    it('handles error', async () => {
      mockTables.createRow.mockRejectedValue(new Error('fail'));
      const result = await store.createSettings({ ...validSettings, council_members: [] });
      expect(result.success).toBe(false);
    });
  });

  describe('refreshSettings', () => {
    it('delegates to loadSettings', async () => {
      mockTables.getRow.mockResolvedValue({ village_name: 'X' });
      const result = await store.refreshSettings();
      expect(result.success).toBe(true);
    });
  });

  describe('resetStore', () => {
    it('resets all state', () => {
      store.settings = { x: 1 };
      store.isFirstRun = true;
      store.lastFetched = new Date();
      store.resetStore();
      expect(store.settings).toBeNull();
      expect(store.isFirstRun).toBe(false);
      expect(store.lastFetched).toBeNull();
    });
  });

  describe('toggleModule', () => {
    it('adds a module when not present', () => {
      store.settings = { modules_enabled: [] };
      expect(store.toggleModule('farm')).toEqual(['farm']);
    });

    it('removes a module when present', () => {
      store.settings = { modules_enabled: ['farm', 'school'] };
      expect(store.toggleModule('farm')).toEqual(['school']);
    });

    it('works when settings is null', () => {
      expect(store.toggleModule('farm')).toEqual(['farm']);
    });
  });

  describe('updateModulesEnabled', () => {
    it('loads settings first if not loaded', async () => {
      mockTables.getRow.mockResolvedValue({ ...validSettings, modules_enabled: [] });
      mockTables.updateRow.mockResolvedValue({ ...validSettings });
      const result = await store.updateModulesEnabled(['farm']);
      expect(result.success).toBe(true);
    });

    it('rejects unknown module keys', async () => {
      store.settings = { ...validSettings, modules_enabled: [] };
      const result = await store.updateModulesEnabled(['nonexistent']);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid module keys/);
    });

    it('always includes core modules', async () => {
      store.settings = { ...validSettings, modules_enabled: [] };
      mockTables.updateRow.mockResolvedValue({ ...validSettings });
      await store.updateModulesEnabled(['farm']);
      const args = mockTables.updateRow.mock.calls[0][0];
      // Core modules should always be present
      expect(args.data.modules_enabled).toContain('residents');
      expect(args.data.modules_enabled).toContain('farm');
    });

    it('allows already-enabled deferred keys', async () => {
      store.settings = { ...validSettings, modules_enabled: ['custom_deferred'] };
      mockTables.updateRow.mockResolvedValue({ ...validSettings });
      const result = await store.updateModulesEnabled(['custom_deferred', 'farm']);
      expect(result.success).toBe(true);
    });
  });

  describe('wipeAllData', () => {
    it('returns error when not authenticated', async () => {
      authStore.user = null;
      const result = await store.wipeAllData();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/authenticated/i);
    });

    it('polls and succeeds on completed status', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      mockFunctions.createExecution.mockResolvedValue({ $id: 'exec-1' });
      mockFunctions.getExecution
        .mockResolvedValueOnce({ status: 'processing' })
        .mockResolvedValueOnce({
          status: 'completed',
          responseBody: JSON.stringify({
            success: true,
            data: { deletedResidents: 5, deletedHouseholds: 2 },
          }),
        });

      // Mock the dynamic imports' $reset
      const result = await store.wipeAllData();
      expect(result.success).toBe(true);
      expect(store.isFirstRun).toBe(true);
    });

    it('handles failed status', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      mockFunctions.createExecution.mockResolvedValue({ $id: 'exec-2' });
      mockFunctions.getExecution.mockResolvedValue({
        status: 'failed',
        errors: 'permission denied',
      });
      const result = await store.wipeAllData();
      expect(result.success).toBe(false);
    });

    it('handles 401 permission denied', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      mockFunctions.createExecution.mockRejectedValue({ code: 401 });
      const result = await store.wipeAllData();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Permission denied/i);
    });
  });

  describe('_pollExecutionStatus', () => {
    it('returns success on completed with empty response body', async () => {
      mockFunctions.getExecution.mockResolvedValue({ status: 'completed', responseBody: '' });
      const result = await store._pollExecutionStatus('fn', 'exec');
      expect(result.success).toBe(true);
    });

    it('returns success on completed with unparseable body', async () => {
      mockFunctions.getExecution.mockResolvedValue({ status: 'completed', responseBody: 'bad' });
      const result = await store._pollExecutionStatus('fn', 'exec');
      expect(result.success).toBe(true);
    });

    it('returns failure when response.success is false', async () => {
      mockFunctions.getExecution.mockResolvedValue({
        status: 'completed',
        responseBody: JSON.stringify({ success: false, error: 'boom' }),
      });
      const result = await store._pollExecutionStatus('fn', 'exec');
      expect(result.success).toBe(false);
      expect(result.error).toBe('boom');
    });

    it('returns failure on failed status', async () => {
      mockFunctions.getExecution.mockResolvedValue({
        status: 'failed',
        responseBody: 'error msg',
      });
      const result = await store._pollExecutionStatus('fn', 'exec');
      expect(result.success).toBe(false);
    });
  });
});
