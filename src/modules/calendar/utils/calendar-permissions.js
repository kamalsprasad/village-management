/**
 * Village Calendar Permission Helpers (Story 5.2)
 *
 * Role-name → category scoping for event creation, plus the edit/delete
 * permission check for user-created events.
 *
 * Category scoping is matched on seeded role NAMES (exact strings from
 * server/scripts/seed-roles.js). Users holding `calendar:write` via a future
 * unmapped role fall back to ['other'] — a conservative default.
 */

import { CALENDAR_CATEGORIES } from './calendar-categories';

const ALL_CATEGORY_VALUES = CALENDAR_CATEGORIES.map((c) => c.value);

/**
 * Role name → calendar categories that role may create events in.
 * Events Coordinator and System Administrator get all 7 categories.
 * @type {Object<string, string[]>}
 */
export const ROLE_CATEGORY_MAP = {
  'Farm Manager': ['farm'],
  'Head Teacher': ['school'],
  'Village Head': ['village'],
  'Events Coordinator': ALL_CATEGORY_VALUES,
  'System Administrator': ALL_CATEGORY_VALUES,
};

/**
 * Union of the categories the user's roles may create events in,
 * in canonical CALENDAR_CATEGORIES order.
 * Falls back to ['other'] when no role is mapped.
 *
 * @param {Array} userRoles - Array of role objects (with .name) from auth-store
 * @returns {string[]} Category values (e.g. ['farm'])
 */
export function allowedCategories(userRoles) {
  const allowed = new Set();
  for (const role of userRoles || []) {
    const mapped = role?.name ? ROLE_CATEGORY_MAP[role.name] : null;
    if (mapped) {
      mapped.forEach((value) => allowed.add(value));
    }
  }
  if (allowed.size === 0) {
    return ['other'];
  }
  return ALL_CATEGORY_VALUES.filter((value) => allowed.has(value));
}

/**
 * Whether the given user may edit/delete a calendar event.
 *
 * Rules:
 * - System-generated events (Farm harvests) are never manageable.
 * - Events without a sourceId (aggregated school events) are not manageable here.
 * - The event creator may manage it.
 * - Admins (`*` permission in any role) and Events Coordinators may manage all
 *   user-created events.
 *
 * @param {Object} event - Normalized unified calendar event
 * @param {string} userId - Current user's Appwrite $id
 * @param {Array} userRoles - Current user's role objects from auth-store
 * @returns {boolean}
 */
export function canManageEvent(event, userId, userRoles) {
  if (!event || event.systemGenerated || !event.sourceId) {
    return false;
  }
  if (event.createdBy && event.createdBy === userId) {
    return true;
  }
  for (const role of userRoles || []) {
    if (role?.permissions?.includes('*')) {
      return true;
    }
    if (role?.name === 'Events Coordinator') {
      return true;
    }
  }
  return false;
}
