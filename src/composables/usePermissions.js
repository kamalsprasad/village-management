/**
 * Vue Composable for Permission Checking
 *
 * Provides reactive permission checking for Vue components.
 * Automatically uses the current user from auth-store.
 */

import { computed } from 'vue';
import { useAuthStore } from 'stores/auth-store';
import {
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  getUserStorageQuota as getStorageQuota,
  getAllUserPermissions as getAllPermissions,
} from 'src/utils/permissions';

export function usePermissions() {
  const authStore = useAuthStore();

  /**
   * Check if current user has a specific permission
   * @param {string} permission - Permission to check (e.g., 'residents:read')
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    return checkPermission(authStore.user, authStore.userRoles, permission);
  };

  /**
   * Check if current user has any of the specified permissions
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean}
   */
  const hasAnyPermission = (permissions) => {
    return checkAnyPermission(authStore.user, authStore.userRoles, permissions);
  };

  /**
   * Check if current user has all of the specified permissions
   * @param {Array<string>} permissions - Array of permissions to check
   * @returns {boolean}
   */
  const hasAllPermissions = (permissions) => {
    return checkAllPermissions(authStore.user, authStore.userRoles, permissions);
  };

  /**
   * Get current user's storage quota in bytes.
   * Story 5.4: passes the user's per-user quota override (0 = no override)
   * so it takes precedence over the role-based fallback.
   * @returns {number} - Storage quota (-1 for unlimited)
   */
  const userStorageQuota = computed(() => {
    return getStorageQuota(authStore.userRoles, authStore.userStorageQuotaOverride);
  });

  /**
   * Get all permissions for current user
   * @returns {Array<string>} - Array of permission strings
   */
  const userPermissions = computed(() => {
    return getAllPermissions(authStore.userRoles);
  });

  /**
   * Check if current user is System Administrator
   * @returns {boolean}
   */
  const isAdmin = computed(() => {
    return hasPermission('*');
  });

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userStorageQuota,
    userPermissions,
    isAdmin,
  };
}
