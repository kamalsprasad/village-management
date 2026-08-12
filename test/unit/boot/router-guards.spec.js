import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { ADMIN_ROLE, FINANCE_MANAGER_ROLE, RESIDENT_ROLE, makeUser } from 'test/helpers/fixtures';

// The router-guards boot file calls defineBoot({router, store}) and registers
// a beforeEach guard. We capture the guard callback so we can invoke it
// directly with controlled store state.
let guardCallback = null;
const routerMock = {
  beforeEach: vi.fn((cb) => {
    guardCallback = cb;
  }),
};

// Stub #q-app/wrappers so defineBoot returns the boot function directly.
vi.mock('#q-app/wrappers', () => ({
  defineBoot: (fn) => fn,
}));

// Import the boot module once. We re-register the guard in each beforeEach
// by calling boot() with a fresh router mock.
import boot from 'src/boot/router-guards';

beforeEach(() => {
  setActivePinia(createPinia());
  guardCallback = null;
  routerMock.beforeEach.mockClear();
  // Default to client-side: process.env.SERVER must be undefined (falsy).
  // Using vi.stubEnv('SERVER', false) sets the string "false" which is truthy.
  delete process.env.SERVER;
  boot({ router: routerMock, store: null });
  expect(guardCallback).toBeTruthy();
});

function makeTo(over = {}) {
  return {
    matched: over.matched ?? [{ meta: over.meta ?? {} }],
    meta: over.meta ?? {},
    path: over.path ?? '/protected',
    ...over,
  };
}

const next = vi.fn();

describe('router-guards', () => {
  beforeEach(() => {
    next.mockReset();
  });

  describe('public routes (requiresAuth=false)', () => {
    it('calls next() immediately', async () => {
      const to = makeTo({ meta: { requiresAuth: false } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('protected routes (requiresAuth=true)', () => {
    it('redirects to /auth when not logged in (client)', async () => {
      const authStore = useAuthStore();
      authStore.isLoggedIn = false;
      authStore.hasUsers = true; // skip checkHasUsers
      const to = makeTo({ meta: { requiresAuth: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith('/auth');
    });

    it('allows navigation on SSR when not logged in', async () => {
      process.env.SERVER = 'true';
      const authStore = useAuthStore();
      authStore.isLoggedIn = false;
      authStore.hasUsers = true;
      const to = makeTo({ meta: { requiresAuth: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
      delete process.env.SERVER;
    });

    it('calls checkHasUsers when hasUsers is null', async () => {
      const authStore = useAuthStore();
      authStore.isLoggedIn = false;
      authStore.hasUsers = null;
      const checkSpy = vi.spyOn(authStore, 'checkHasUsers').mockResolvedValue({ success: true });
      const to = makeTo({ meta: { requiresAuth: true } });
      await guardCallback(to, {}, next);
      expect(checkSpy).toHaveBeenCalled();
    });
  });

  describe('authenticated user', () => {
    let authStore;
    let settingsStore;

    beforeEach(() => {
      authStore = useAuthStore();
      authStore.user = makeUser();
      authStore.userRoles = [FINANCE_MANAGER_ROLE];
      authStore.isLoggedIn = true;
      authStore.hasUsers = true;
      settingsStore = useSettingsStore();
      settingsStore.isFirstRun = false;
    });

    it('allows navigation to a normal protected route', async () => {
      const to = makeTo({ meta: { requiresAuth: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('redirects to /setup on first run (non-setup route)', async () => {
      settingsStore.isFirstRun = true;
      const to = makeTo({ meta: { requiresAuth: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith('/setup');
    });

    it('allows access to setup wizard on first run', async () => {
      settingsStore.isFirstRun = true;
      const to = makeTo({ meta: { requiresAuth: true, isSetupWizard: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('redirects to / when setup wizard accessed but settings already loaded', async () => {
      settingsStore.isFirstRun = false;
      settingsStore.settings = { village_name: 'X' }; // isLoaded = true
      const to = makeTo({ meta: { requiresAuth: true, isSetupWizard: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith('/');
    });

    it('allows setup wizard when settings not loaded yet', async () => {
      settingsStore.isFirstRun = false;
      settingsStore.settings = null; // isLoaded = false
      const to = makeTo({ meta: { requiresAuth: true, isSetupWizard: true } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('redirects to /unauthorized when permission check fails', async () => {
      authStore.userRoles = [RESIDENT_ROLE];
      const to = makeTo({ meta: { requiresAuth: true, requiresPermission: 'finance:write' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith('/unauthorized');
    });

    it('allows navigation when permission check passes', async () => {
      authStore.userRoles = [FINANCE_MANAGER_ROLE];
      const to = makeTo({ meta: { requiresAuth: true, requiresPermission: 'finance:read' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('admin wildcard passes any permission check', async () => {
      authStore.userRoles = [ADMIN_ROLE];
      const to = makeTo({ meta: { requiresAuth: true, requiresPermission: 'anything:anything' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('redirects to / when required setting is falsy', async () => {
      settingsStore.settings = { village_name: 'X' }; // isLoaded = true
      // vendorsEnabled getter returns false when modules_enabled=[] and vendors_enabled=false
      settingsStore.settings.modules_enabled = [];
      settingsStore.settings.vendors_enabled = false;
      const to = makeTo({ meta: { requiresAuth: true, requiresSetting: 'vendorsEnabled' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith('/');
    });

    it('allows navigation when required setting is truthy', async () => {
      settingsStore.settings = { village_name: 'X', modules_enabled: ['vendors'] };
      const to = makeTo({ meta: { requiresAuth: true, requiresSetting: 'vendorsEnabled' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('loads settings when not loaded and a requiresSetting is present', async () => {
      settingsStore.settings = null; // isLoaded = false, isLoading = false
      const loadSpy = vi.spyOn(settingsStore, 'loadSettings').mockImplementation(async () => {
        settingsStore.settings = { village_name: 'X', modules_enabled: ['vendors'] };
        return { success: true };
      });
      const to = makeTo({ meta: { requiresAuth: true, requiresSetting: 'vendorsEnabled' } });
      await guardCallback(to, {}, next);
      expect(loadSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('allows navigation on SSR when requiresSetting is present', async () => {
      process.env.SERVER = 'true';
      const to = makeTo({ meta: { requiresAuth: true, requiresSetting: 'vendorsEnabled' } });
      await guardCallback(to, {}, next);
      expect(next).toHaveBeenCalledWith();
      delete process.env.SERVER;
    });
  });
});
