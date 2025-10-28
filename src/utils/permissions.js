/**
 * Permission Checking Utilities
 *
 * Implements RBAC permission checking with multi-role support.
 * Permissions are calculated as the union of all assigned roles.
 *
 * Permission Format: 'module:action' (e.g., 'residents:read', 'finance:write')
 * Wildcard: '*' grants full access (System Administrator)
 * Wildcard Patterns: 'finance:*' matches all finance actions
 */

/**
 * Check if user has a specific permission
 * @param {Object} user - Appwrite Auth user object
 * @param {Array} userRoles - Array of role objects with permissions
 * @param {string} requiredPermission - Permission to check (e.g., 'residents:read')
 * @returns {boolean} - True if user has permission
 */
export function hasPermission(user, userRoles, requiredPermission) {
  // Debug logging
  //   console.log('hasPermission called:', {
  //     user: user ? user.$id : null,
  //     userRolesCount: userRoles ? userRoles.length : 0,
  //     userRoles: userRoles,
  //     requiredPermission,
  //   });

  // No user or roles = no permission
  if (!user || !userRoles || userRoles.length === 0) {
    console.log('No user or roles, returning false');
    return false;
  }

  // Collect all permissions from all assigned roles
  const allPermissions = [];
  for (const role of userRoles) {
    if (role && role.permissions && Array.isArray(role.permissions)) {
      allPermissions.push(...role.permissions);
    }
  }

  // Check for wildcard permission (System Administrator)
  if (allPermissions.includes('*')) {
    return true;
  }

  // Check for exact match
  if (allPermissions.includes(requiredPermission)) {
    return true;
  }

  // Check for wildcard patterns (e.g., 'finance:*' matches 'finance:read')
  for (const permission of allPermissions) {
    if (permission.endsWith(':*')) {
      const module = permission.split(':')[0];
      if (requiredPermission.startsWith(module + ':')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - Appwrite Auth user object
 * @param {Array} userRoles - Array of role objects
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export function hasAnyPermission(user, userRoles, permissions) {
  return permissions.some((permission) => hasPermission(user, userRoles, permission));
}

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - Appwrite Auth user object
 * @param {Array} userRoles - Array of role objects
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export function hasAllPermissions(user, userRoles, permissions) {
  return permissions.every((permission) => hasPermission(user, userRoles, permission));
}

/**
 * Get user's total storage quota from all assigned roles
 * Returns the maximum quota from all roles
 * -1 indicates unlimited storage (System Administrator)
 *
 * @param {Array} userRoles - Array of role objects
 * @returns {number} - Storage quota in bytes (-1 for unlimited)
 */
export function getUserStorageQuota(userRoles) {
  if (!userRoles || userRoles.length === 0) {
    return 0;
  }

  let maxQuota = 0;

  for (const role of userRoles) {
    if (role && typeof role.storage_quota === 'number') {
      // -1 means unlimited
      if (role.storage_quota === -1) {
        return -1;
      }
      // Convert GB to bytes and track maximum
      const quotaInBytes = role.storage_quota * 1024 * 1024 * 1024;
      maxQuota = Math.max(maxQuota, quotaInBytes);
    }
  }

  return maxQuota;
}

/**
 * Get all unique permissions from user's roles
 * @param {Array} userRoles - Array of role objects
 * @returns {Array<string>} - Array of unique permission strings
 */
export function getAllUserPermissions(userRoles) {
  if (!userRoles || userRoles.length === 0) {
    return [];
  }

  const allPermissions = new Set();

  for (const role of userRoles) {
    if (role && role.permissions && Array.isArray(role.permissions)) {
      role.permissions.forEach((permission) => allPermissions.add(permission));
    }
  }

  return Array.from(allPermissions);
}
