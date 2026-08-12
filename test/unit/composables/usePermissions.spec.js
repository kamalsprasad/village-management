import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';
import { ADMIN_ROLE, FINANCE_MANAGER_ROLE, RESIDENT_ROLE, makeUser } from 'test/helpers/fixtures';

describe('usePermissions', () => {
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
  });

  function setAuth(user, roles) {
    authStore.user = user;
    authStore.userRoles = roles;
    authStore.isLoggedIn = !!user;
  }

  describe('hasPermission', () => {
    it('returns true for a permission the user has', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const { hasPermission } = usePermissions();
      expect(hasPermission('finance:read')).toBe(true);
    });

    it('returns false for a permission the user lacks', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const { hasPermission } = usePermissions();
      expect(hasPermission('farm:write')).toBe(false);
    });

    it('returns true for wildcard admin', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const { hasPermission } = usePermissions();
      expect(hasPermission('anything:anything')).toBe(true);
    });

    it('returns false when no user', () => {
      setAuth(null, []);
      const { hasPermission } = usePermissions();
      expect(hasPermission('finance:read')).toBe(false);
    });
  });

  describe('hasAnyPermission / hasAllPermissions', () => {
    it('hasAnyPermission returns true if any match', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const { hasAnyPermission } = usePermissions();
      expect(hasAnyPermission(['finance:read', 'farm:write'])).toBe(true);
    });

    it('hasAllPermissions returns false if one missing', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const { hasAllPermissions } = usePermissions();
      expect(hasAllPermissions(['finance:read', 'farm:write'])).toBe(false);
    });

    it('hasAllPermissions returns true when all present', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const { hasAllPermissions } = usePermissions();
      expect(hasAllPermissions(['finance:read', 'finance:write'])).toBe(true);
    });
  });

  describe('userStorageQuota (computed)', () => {
    it('returns the role-based quota in bytes', () => {
      setAuth(makeUser(), [RESIDENT_ROLE]);
      authStore.userStorageQuotaOverride = 0;
      const { userStorageQuota } = usePermissions();
      expect(userStorageQuota.value).toBe(2 * 1024 * 1024 * 1024);
    });

    it('returns -1 for admin (unlimited)', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      authStore.userStorageQuotaOverride = 0;
      const { userStorageQuota } = usePermissions();
      expect(userStorageQuota.value).toBe(-1);
    });

    it('honors a per-user override', () => {
      setAuth(makeUser(), [RESIDENT_ROLE]);
      authStore.userStorageQuotaOverride = 5;
      const { userStorageQuota } = usePermissions();
      expect(userStorageQuota.value).toBe(5 * 1024 * 1024 * 1024);
    });
  });

  describe('userPermissions (computed)', () => {
    it('returns the union of permissions', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE, RESIDENT_ROLE]);
      const { userPermissions } = usePermissions();
      expect(userPermissions.value.sort()).toEqual(
        ['finance:read', 'finance:write', 'dashboard:read', 'residents:read'].sort(),
      );
    });

    it('returns ["*"] for admin', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const { userPermissions } = usePermissions();
      expect(userPermissions.value).toEqual(['*']);
    });
  });

  describe('isAdmin (computed)', () => {
    it('is true for admin', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const { isAdmin } = usePermissions();
      expect(isAdmin.value).toBe(true);
    });

    it('is false for non-admin', () => {
      setAuth(makeUser(), [RESIDENT_ROLE]);
      const { isAdmin } = usePermissions();
      expect(isAdmin.value).toBe(false);
    });
  });
});
