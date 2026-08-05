import { Client, TablesDB, Query, ID } from 'node-appwrite';
import { createHash } from 'crypto';

// Story 5.10c: Role-targeted in-app notification delivery.
//
// The function fully derives target_roles from its own TYPE_CONFIG; any client-
// supplied target_roles or target_permissions are ignored. Callers must hold the
// required permission for the requested notification type.
//
// Request body: { type, title, body, link, related_entity_type, related_entity_id, severity }
// Response: { success, data?, skipped?, error? }

const DATABASE_ID = process.env.DATABASE_ID || 'villageDB';
const TABLE_USERS = process.env.TABLE_USERS || 'users';
const TABLE_ROLES = process.env.TABLE_ROLES || 'roles';
const TABLE_NOTIFICATIONS = process.env.TABLE_NOTIFICATIONS || 'notifications';

const TYPE_CONFIG = {
  at_risk_learner: {
    requiredPermission: 'school:read',
    targetRoles: ['School Administrator', 'Head Teacher', 'Teacher'],
  },
  'farm_alert:upcoming_harvest': {
    requiredPermission: 'farm:read',
    targetRoles: ['Farm Manager', 'Crop Manager', 'Village Head', 'Deputy Village Head'],
  },
  'farm_alert:overdue_harvest': {
    requiredPermission: 'farm:read',
    targetRoles: ['Farm Manager', 'Crop Manager', 'Village Head', 'Deputy Village Head'],
  },
  'farm_alert:low_inventory': {
    requiredPermission: 'farm:read',
    targetRoles: ['Farm Manager', 'Crop Manager', 'Village Head', 'Deputy Village Head'],
  },
  'farm_alert:underperforming_yield': {
    requiredPermission: 'farm:read',
    targetRoles: ['Farm Manager', 'Crop Manager', 'Village Head', 'Deputy Village Head'],
  },
  'farm_alert:crop_failure': {
    requiredPermission: 'farm:read',
    targetRoles: ['Farm Manager', 'Crop Manager', 'Village Head', 'Deputy Village Head'],
  },
  vendor_created: {
    requiredPermission: 'vendors:write',
    targetRoles: [
      'Finance Manager',
      'Farm Manager',
      'Crop Manager',
      'Village Head',
      'Deputy Village Head',
    ],
  },
};

/**
 * Check whether a set of roles grants a required permission.
 * Mirrors src/utils/permissions.js: exact match, '*' wildcard, or 'module:*'.
 */
function hasPermission(callerRoles, requiredPermission) {
  if (!Array.isArray(callerRoles) || callerRoles.length === 0) {
    return false;
  }

  const allPermissions = [];
  for (const role of callerRoles) {
    if (role && Array.isArray(role.permissions)) {
      allPermissions.push(...role.permissions);
    }
  }

  if (allPermissions.includes('*')) {
    return true;
  }

  if (allPermissions.includes(requiredPermission)) {
    return true;
  }

  for (const permission of allPermissions) {
    if (typeof permission === 'string' && permission.endsWith(':*')) {
      const module = permission.split(':')[0];
      if (module && requiredPermission.startsWith(`${module}:`)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verify the caller has the required permission for the notification type.
 * Returns { success: false, error, statusCode } on failure, or
 * { success: true, callerUserId, callerRoles } on success.
 */
async function requirePermissionCaller(req, tablesDB, log, requiredPermission) {
  const callerUserId = req.headers['x-appwrite-user-id'];
  if (!callerUserId) {
    return {
      success: false,
      error: 'Unauthorized: missing caller identity',
      statusCode: 401,
    };
  }

  let profile;
  try {
    profile = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: callerUserId,
      queries: [Query.select(['*', 'role_ids.*'])],
    });
  } catch (err) {
    if (err.code === 404) {
      return {
        success: false,
        error: 'Unauthorized: caller profile not found',
        statusCode: 403,
      };
    }
    log(`Error verifying caller permissions: ${err.message}`);
    return {
      success: false,
      error: 'Unauthorized: unable to verify caller permissions',
      statusCode: 500,
    };
  }

  const callerRoles = profile.role_ids || [];
  if (!hasPermission(callerRoles, requiredPermission)) {
    return {
      success: false,
      error: `Forbidden: ${requiredPermission} permission required`,
      statusCode: 403,
    };
  }

  return { success: true, callerUserId, callerRoles };
}

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    'https://cloud.appwrite.io/v1';
  const projectId =
    process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(req.headers['x-appwrite-key'] || apiKey);

  const tablesDB = new TablesDB(client);

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      log('Failed to parse request body: ' + parseError.message);
      return res.json({ success: false, error: 'Invalid request body' }, 400);
    }
  }

  const {
    type,
    title,
    body: notificationBody,
    link,
    related_entity_type,
    related_entity_id,
    severity,
  } = body;

  if (!type || !TYPE_CONFIG[type]) {
    return res.json(
      { success: false, error: `Unknown notification type: ${type || 'undefined'}` },
      400,
    );
  }

  if (!title) {
    return res.json({ success: false, error: 'title is required' }, 400);
  }

  const config = TYPE_CONFIG[type];

  const permissionCheck = await requirePermissionCaller(
    req,
    tablesDB,
    log,
    config.requiredPermission,
  );
  if (permissionCheck.success === false) {
    return res.json({ success: false, error: permissionCheck.error }, permissionCheck.statusCode);
  }

  const { callerUserId } = permissionCheck;

  const hasDedupKey = Boolean(related_entity_type && related_entity_id);

  try {
    // Crash-safe dedup, defense in depth:
    // 1) A pre-check query against the notifications table itself (fast path,
    //    avoids a write attempt in the common case).
    // 2) A deterministic rowId derived from (type, related_entity_type,
    //    related_entity_id) so that even two concurrent requests racing past
    //    the pre-check both attempt to create the SAME row ID — Appwrite
    //    rejects the second with a 409 conflict, which is caught below and
    //    treated as an idempotent "already exists" skip. This closes the
    //    check-then-act race the pre-check alone cannot prevent.
    if (hasDedupKey) {
      const existing = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLE_NOTIFICATIONS,
        queries: [
          Query.equal('type', type),
          Query.equal('related_entity_type', related_entity_type),
          Query.equal('related_entity_id', related_entity_id),
          Query.limit(1),
        ],
      });

      if (existing.rows && existing.rows.length > 0) {
        return res.json({ success: true, skipped: true });
      }
    }

    const rowId = hasDedupKey
      ? buildDedupeRowId(type, related_entity_type, related_entity_id)
      : ID.unique();

    const row = await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_NOTIFICATIONS,
      rowId,
      data: {
        type,
        title,
        body: notificationBody || null,
        link: link || null,
        target_roles: config.targetRoles,
        target_permissions: [],
        related_entity_type: related_entity_type || null,
        related_entity_id: related_entity_id || null,
        severity: severity || 'info',
        created_by: callerUserId,
      },
    });

    return res.json({ success: true, data: row });
  } catch (err) {
    // A 409 here means a concurrent request already created the same
    // deterministic dedup row ID — treat as an idempotent skip, not an error.
    if (hasDedupKey && err.code === 409) {
      return res.json({ success: true, skipped: true });
    }
    error(`Unhandled error creating notification: ${err.message}`);
    return res.json({ success: false, error: err.message || 'Unexpected server error' }, 500);
  }
};

/**
 * Deterministic, collision-safe row ID for dedup-eligible notifications, so
 * concurrent create attempts for the same (type, related_entity_type,
 * related_entity_id) race on Appwrite's own row-ID uniqueness rather than on
 * a check-then-act query alone. Appwrite custom IDs must be <= 36 chars and
 * use only [a-zA-Z0-9_.-]. A full SHA-256 digest of the composite key is used
 * (not a truncated hex of the raw string) so the entire key — not just its
 * prefix — determines the ID; two different `related_entity_id`s sharing a
 * long common `type`/`related_entity_type` prefix must not collide.
 */
function buildDedupeRowId(type, relatedEntityType, relatedEntityId) {
  const raw = `${type}\u0000${relatedEntityType}\u0000${relatedEntityId}`;
  const digest = createHash('sha256').update(raw, 'utf8').digest('hex');
  return `dd_${digest}`.slice(0, 36);
}
