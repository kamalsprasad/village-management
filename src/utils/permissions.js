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
 * Role-based storage quota mapping (GB)
 * Used as fallback when database storage_quota field is not set
 * Values from Story 5.3 AC1. -1 means unlimited.
 * Roles not explicitly listed in AC1 (School Administrator, Council Member,
 * Teacher, Events Coordinator) default to the Village Resident tier (2 GB).
 * @type {Object<string, number>}
 */
const ROLE_QUOTA_FALLBACK = {
  'System Administrator': -1, // Unlimited
  'Village Head': 20,
  'Deputy Village Head': 10,
  'Finance Manager': 10,
  'Farm Manager': 10,
  'Head Teacher': 10,
  'Crop Manager': 2,
  'Village Resident': 2,
  Learner: 1,
  Guest: 0.5, // 500 MB
  // Unmapped roles default to Resident-tier (2 GB)
  'School Administrator': 2,
  'Council Member': 2,
  Teacher: 2,
  'Events Coordinator': 2,
};

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
 * Returns the maximum quota from all roles (highest quota wins)
 * -1 indicates unlimited storage (System Administrator)
 *
 * Uses hybrid approach:
 * 1. Tries to read storage_quota from database role object
 * 2. Falls back to ROLE_QUOTA_FALLBACK mapping if database value not set
 *
 * Story 5.4: an optional per-user quota override (in GB, from
 * users.storage_quota) takes precedence over the role-based quota when set.
 * `quotaOverrideGB <= 0` means "no override, use role quota"; `-1` means
 * unlimited override; any positive value is a GB override.
 *
 * @param {Array} userRoles - Array of role objects
 * @param {number} [quotaOverrideGB=0] - Per-user override in GB (-1 = unlimited, 0/unset = no override)
 * @returns {number} - Storage quota in bytes (-1 for unlimited)
 */
export function getUserStorageQuota(userRoles, quotaOverrideGB = 0) {
  if (quotaOverrideGB === -1) {
    return -1; // Unlimited override
  }
  if (quotaOverrideGB > 0) {
    return quotaOverrideGB * 1024 * 1024 * 1024;
  }

  if (!userRoles || userRoles.length === 0) {
    return 0;
  }

  let maxQuota = 0;

  for (const role of userRoles) {
    let quotaInGB = 0;

    // Try database value first
    if (role && typeof role.storage_quota === 'number') {
      if (role.storage_quota === -1) {
        return -1; // Unlimited storage
      }
      quotaInGB = role.storage_quota;
    }
    // Fallback to hardcoded mapping based on role name.
    // Unmapped roles default to the Village Resident tier (2 GB) so that a
    // custom or future role is not accidentally left with zero quota.
    else if (role && role.name) {
      quotaInGB =
        typeof ROLE_QUOTA_FALLBACK[role.name] === 'number' ? ROLE_QUOTA_FALLBACK[role.name] : 2;
      if (quotaInGB === -1) {
        return -1; // Unlimited storage
      }
    }

    // Convert GB to bytes and track maximum
    if (quotaInGB > 0) {
      const quotaInBytes = quotaInGB * 1024 * 1024 * 1024;
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
