import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserStorageQuota,
  getAllUserPermissions,
} from 'src/utils/permissions';
import {
  ADMIN_ROLE,
  VILLAGE_HEAD_ROLE,
  FINANCE_MANAGER_ROLE,
  RESIDENT_ROLE,
  GUEST_ROLE,
  makeUser,
} from 'test/helpers/fixtures';

const user = makeUser();

describe('permissions.js', () => {
  describe('hasPermission', () => {
    it('returns false when user is null', () => {
      expect(hasPermission(null, [], 'residents:read')).toBe(false);
    });

    it('returns false when userRoles is empty', () => {
      expect(hasPermission(user, [], 'residents:read')).toBe(false);
    });

    it('returns false when userRoles is undefined', () => {
      expect(hasPermission(user, undefined, 'residents:read')).toBe(false);
    });

    it('returns true for wildcard permission (*)', () => {
      expect(hasPermission(user, [ADMIN_ROLE], 'any:permission')).toBe(true);
      expect(hasPermission(user, [ADMIN_ROLE], 'anything:atAll')).toBe(true);
    });

    it('returns true for exact permission match', () => {
      const role = { permissions: ['residents:read'] };
      expect(hasPermission(user, [role], 'residents:read')).toBe(true);
    });

    it('returns false when permission not found', () => {
      const role = { permissions: ['residents:read'] };
      expect(hasPermission(user, [role], 'finance:write')).toBe(false);
    });

    it('returns true for wildcard pattern match (module:*)', () => {
      const role = { permissions: ['finance:*'] };
      expect(hasPermission(user, [role], 'finance:read')).toBe(true);
      expect(hasPermission(user, [role], 'finance:write')).toBe(true);
      expect(hasPermission(user, [role], 'finance:delete')).toBe(true);
    });

    it('returns false for wildcard pattern mismatch', () => {
      const role = { permissions: ['finance:*'] };
      expect(hasPermission(user, [role], 'residents:read')).toBe(false);
    });

    it('returns true for multi-role permission union', () => {
      const role1 = { permissions: ['residents:read'] };
      const role2 = { permissions: ['finance:read'] };
      expect(hasPermission(user, [role1, role2], 'residents:read')).toBe(true);
      expect(hasPermission(user, [role1, role2], 'finance:read')).toBe(true);
      expect(hasPermission(user, [role1, role2], 'farm:write')).toBe(false);
    });

    it('handles role with null permissions array', () => {
      expect(hasPermission(user, [{ permissions: null }], 'residents:read')).toBe(false);
    });

    it('handles role with undefined permissions', () => {
      expect(hasPermission(user, [{}], 'residents:read')).toBe(false);
    });

    it('handles role with non-array permissions', () => {
      expect(hasPermission(user, [{ permissions: 'residents:read' }], 'residents:read')).toBe(false);
    });

    it('does not treat partial wildcard as module wildcard', () => {
      const role = { permissions: ['financ*'] };
      // 'financ*' does not end with ':*' so it should not match 'finance:read'
      expect(hasPermission(user, [role], 'finance:read')).toBe(false);
    });

    it('wildcard * takes precedence over other permissions', () => {
      const role = { permissions: ['residents:read', '*'] };
      expect(hasPermission(user, [role], 'finance:write')).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one of the permissions', () => {
      const role = { permissions: ['residents:read'] };
      expect(hasAnyPermission(user, [role], ['residents:read', 'finance:write'])).toBe(true);
    });

    it('returns false when user has none of the permissions', () => {
      const role = { permissions: ['residents:read'] };
      expect(hasAnyPermission(user, [role], ['finance:write', 'dashboard:admin'])).toBe(false);
    });

    it('returns false for empty roles', () => {
      expect(hasAnyPermission(user, [], ['residents:read'])).toBe(false);
    });

    it('returns true when wildcard present', () => {
      expect(hasAnyPermission(user, [ADMIN_ROLE], ['finance:write', 'school:read'])).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all permissions', () => {
      const role = { permissions: ['residents:read', 'finance:read'] };
      expect(hasAllPermissions(user, [role], ['residents:read', 'finance:read'])).toBe(true);
    });

    it('returns false when user is missing one permission', () => {
      const role = { permissions: ['residents:read'] };
      expect(hasAllPermissions(user, [role], ['residents:read', 'finance:read'])).toBe(false);
    });

    it('returns true for wildcard role', () => {
      expect(hasAllPermissions(user, [ADMIN_ROLE], ['a:b', 'c:d', 'e:f'])).toBe(true);
    });
  });

  describe('getUserStorageQuota', () => {
    it('returns 0 for empty roles array', () => {
      expect(getUserStorageQuota([])).toBe(0);
    });

    it('returns 0 for null roles', () => {
      expect(getUserStorageQuota(null)).toBe(0);
    });

    it('returns -1 for unlimited quota (System Administrator)', () => {
      expect(getUserStorageQuota([ADMIN_ROLE])).toBe(-1);
    });

    it('returns maximum quota from multiple roles', () => {
      const role1 = { storage_quota: 5, name: 'A' };
      const role2 = { storage_quota: 20, name: 'B' };
      // 20 GB in bytes
      expect(getUserStorageQuota([role1, role2])).toBe(20 * 1024 * 1024 * 1024);
    });

    it('converts GB to bytes correctly', () => {
      const role = { storage_quota: 2, name: 'A' };
      expect(getUserStorageQuota([role])).toBe(2 * 1024 * 1024 * 1024);
    });

    it('uses ROLE_QUOTA_FALLBACK when storage_quota is not a number', () => {
      // Village Head fallback = 20 GB
      expect(getUserStorageQuota([VILLAGE_HEAD_ROLE])).toBe(20 * 1024 * 1024 * 1024);
      // Resident fallback = 2 GB
      expect(getUserStorageQuota([RESIDENT_ROLE])).toBe(2 * 1024 * 1024 * 1024);
      // Guest fallback = 0.5 GB
      expect(getUserStorageQuota([GUEST_ROLE])).toBe(0.5 * 1024 * 1024 * 1024);
    });

    it('unmapped role defaults to 2 GB (Resident tier)', () => {
      const customRole = { name: 'Custom Role' };
      expect(getUserStorageQuota([customRole])).toBe(2 * 1024 * 1024 * 1024);
    });

    it('returns -1 when any role has storage_quota -1 (fallback)', () => {
      const role = { name: 'System Administrator' }; // fallback = -1
      expect(getUserStorageQuota([role])).toBe(-1);
    });

    it('per-user override -1 means unlimited', () => {
      expect(getUserStorageQuota([RESIDENT_ROLE], -1)).toBe(-1);
    });

    it('per-user override > 0 takes precedence (in bytes)', () => {
      expect(getUserStorageQuota([RESIDENT_ROLE], 5)).toBe(5 * 1024 * 1024 * 1024);
    });

    it('per-user override 0 means no override (use role quota)', () => {
      expect(getUserStorageQuota([RESIDENT_ROLE], 0)).toBe(2 * 1024 * 1024 * 1024);
    });

    it('handles role with no name and no storage_quota', () => {
      expect(getUserStorageQuota([{}])).toBe(0);
    });

    it('handles role with storage_quota 0', () => {
      const role = { storage_quota: 0, name: 'A' };
      // 0 GB → 0 bytes contribution; with only this role, max stays 0
      expect(getUserStorageQuota([role])).toBe(0);
    });
  });

  describe('getAllUserPermissions', () => {
    it('returns empty array for no roles', () => {
      expect(getAllUserPermissions([])).toEqual([]);
    });

    it('returns empty array for null roles', () => {
      expect(getAllUserPermissions(null)).toEqual([]);
    });

    it('returns unique permissions from multiple roles', () => {
      const role1 = { permissions: ['residents:read', 'finance:read'] };
      const role2 = { permissions: ['finance:read', 'dashboard:read'] };
      const result = getAllUserPermissions([role1, role2]);
      expect(result.sort()).toEqual(
        ['residents:read', 'finance:read', 'dashboard:read'].sort(),
      );
    });

    it('handles role with null permissions', () => {
      const role = { permissions: null };
      expect(getAllUserPermissions([role])).toEqual([]);
    });

    it('includes wildcard permission', () => {
      expect(getAllUserPermissions([ADMIN_ROLE])).toEqual(['*']);
    });
  });
});
