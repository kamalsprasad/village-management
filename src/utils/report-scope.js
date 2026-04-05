/**
 * Report Scope Resolver
 *
 * Story 2.8: Centralized role-to-module mapping for report scoping.
 * Determines which source_module values a user can access in reports
 * based on their assigned roles.
 *
 * Role names use title-case to match the actual role names in the
 * database and ROLE_QUOTA_FALLBACK in src/utils/permissions.js.
 */

/**
 * Role-to-module mapping
 * Roles with ['*'] have unrestricted access to all modules.
 * Module-specific roles are restricted to their mapped modules.
 * @type {Object<string, string[]>}
 */
export const MODULE_ROLES = {
  'System Administrator': ['*'],
  'Village Head': ['*'],
  'Finance Manager': ['*'],
  'Farm Manager': ['Farm'],
  'Head Teacher': ['School'],
  Teacher: ['School'],
  'Events Coordinator': ['Village'],
  'Crop Manager': ['Farm'],
  Resident: [],
  Learner: [],
  Guest: [],
};

/**
 * All valid source_module values used across the finance system.
 * Must stay in sync with finance-store.js sourceModules getter.
 * @type {string[]}
 */
export const SOURCE_MODULES = ['Farm', 'School', 'Village', 'Guest House', 'Other'];

/**
 * Get allowed source modules for a user based on their roles.
 * @param {Array} userRoles - Array of role objects from auth store (each has .name and .permissions)
 * @returns {string[]|null} Array of allowed module names, or null if all modules are allowed
 */
export function getAllowedModules(userRoles = []) {
  if (!userRoles || userRoles.length === 0) {
    return [];
  }

  // Check permissions first - wildcard permission means full access
  for (const role of userRoles) {
    if (role.permissions && role.permissions.includes('*')) {
      return null;
    }
  }

  // Check role-name-based module mapping
  const allowed = new Set();
  for (const role of userRoles) {
    const roleName = role.name;
    const modules = MODULE_ROLES[roleName];
    if (modules) {
      if (modules.includes('*')) {
        return null;
      }
      modules.forEach((m) => allowed.add(m));
    }
  }

  return allowed.size > 0 ? Array.from(allowed) : [];
}

/**
 * Check if user can access data for a specific source module.
 * @param {Array} userRoles - Array of role objects from auth store
 * @param {string} sourceModule - Module to check access for
 * @returns {boolean}
 */
export function canAccessModule(userRoles, sourceModule) {
  const allowed = getAllowedModules(userRoles);
  if (allowed === null) return true;
  return allowed.includes(sourceModule);
}

/**
 * Filter transactions by user's module scope.
 * @param {Array} transactions - Array of transaction objects with source_module field
 * @param {Array} userRoles - Array of role objects from auth store
 * @returns {Array} Filtered transactions the user is allowed to see
 */
export function filterByModuleScope(transactions, userRoles) {
  const allowed = getAllowedModules(userRoles);
  if (allowed === null) return transactions;
  return transactions.filter((t) => allowed.includes(t.source_module));
}

/**
 * Get the source module options available to a user for filter dropdowns.
 * @param {Array} userRoles - Array of role objects from auth store
 * @returns {string[]} Source modules the user can filter by
 */
export function getAvailableModuleOptions(userRoles) {
  const allowed = getAllowedModules(userRoles);
  if (allowed === null) return SOURCE_MODULES;
  return SOURCE_MODULES.filter((m) => allowed.includes(m));
}
