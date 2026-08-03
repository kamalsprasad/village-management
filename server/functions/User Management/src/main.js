import { Client, Users, Teams, TablesDB, Query, ID } from 'node-appwrite';

// Story 5.12: User Management — admin-driven user CRUD.
//
// The Appwrite client SDK cannot create/update Auth accounts on behalf of an
// admin, so all account lifecycle mutations (create/update/deactivate/
// reactivate) run here, server-side, with an admin-scope API key. This
// function also keeps the `village_administrators` team membership in sync
// with the System Administrator role and writes an `audit_logs` row for
// every mutation.
//
// Request body: { action, actorUserId, ...payload }
// Response: { success, userId?, error? }

const DATABASE_ID = process.env.DATABASE_ID || 'villageDB';
const TABLE_USERS = process.env.TABLE_USERS || 'users';
const TABLE_ROLES = process.env.TABLE_ROLES || 'roles';
const TABLE_AUDIT_LOGS = process.env.TABLE_AUDIT_LOGS || 'audit_logs';
const ADMIN_TEAM_ID = 'village_administrators';
const SYSTEM_ADMIN_ROLE_NAME = 'System Administrator';

/**
 * Verify the caller is a System Administrator.
 * Appwrite Functions run with an admin API key, so we must enforce our own
 * RBAC. The caller's user ID is available in `req.headers['x-appwrite-user-id']`
 * when the function is invoked by an authenticated client.
 *
 * Returns { success: false, error, statusCode } on failure, or null on success.
 */
async function requireAdminCaller(req, tablesDB, log) {
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

  const roles = profile.role_ids || [];
  const isAdmin = roles.some((role) => {
    const permissions =
      role && typeof role === 'object' ? role.permissions : [];
    return Array.isArray(permissions) && permissions.includes('*');
  });

  if (!isAdmin) {
    return {
      success: false,
      error: 'Forbidden: System Administrator permission required',
      statusCode: 403,
    };
  }

  return { success: true, callerUserId };
}

/* eslint-disable no-unused-vars */
export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    'https://cloud.appwrite.io/v1';
  const projectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    '';
  const apiKey =
    process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(req.headers['x-appwrite-key'] || apiKey);

  const users = new Users(client);
  const teams = new Teams(client);
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

  const { action } = body;
  log(`User Management function called. action=${action}`);

  // All actions require an authenticated System Administrator caller.
  const adminCheck = await requireAdminCaller(req, tablesDB, log);
  if (adminCheck.success === false) {
    return res.json(
      { success: false, error: adminCheck.error },
      adminCheck.statusCode
    );
  }
  // Audit logs record the server-verified actor, not a client-supplied value.
  const actorUserId = adminCheck.callerUserId;

  const deps = { users, teams, tablesDB, log, error, actorUserId };

  try {
    switch (action) {
      case 'createUser':
        return res.json(await createUser(body, deps));
      case 'updateUser':
        return res.json(await updateUser(body, deps));
      case 'deactivateUser':
        return res.json(await deactivateUser(body, deps));
      case 'reactivateUser':
        return res.json(await reactivateUser(body, deps));
      case 'resetUserPassword':
        return res.json(await resetUserPassword(body, deps));
      default:
        return res.json(
          { success: false, error: `Unknown action: ${action}` },
          400
        );
    }
  } catch (err) {
    error(`Unhandled error in action "${action}": ${err.message}`);
    return res.json(
      { success: false, error: err.message || 'Unexpected server error' },
      500
    );
  }
};

// ============================================
// Action handlers
// ============================================

async function createUser(body, { users, teams, tablesDB, log, actorUserId }) {
  const {
    name,
    email,
    password,
    role_ids: roleIds,
    resident_id: residentId,
  } = body;

  if (!name || !email || !password) {
    return { success: false, error: 'Name, email, and password are required' };
  }
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return { success: false, error: 'At least one role must be assigned' };
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const userId = ID.unique();

  try {
    await users.create({ userId, email, password, name });
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to create Auth user',
    };
  }

  const rowData = {
    email,
    name,
    role_ids: roleIds,
    active: true,
  };
  if (residentId) {
    rowData.resident_id = residentId;
  }

  try {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
      data: rowData,
    });
  } catch (err) {
    // Roll back the orphaned Auth user so retries don't hit a duplicate-email error.
    try {
      await users.delete({ userId });
    } catch (rollbackErr) {
      log(`Failed to roll back Auth user ${userId}: ${rollbackErr.message}`);
    }
    return {
      success: false,
      error: err.message || 'Failed to create user profile',
    };
  }

  const isSystemAdmin = await roleIdsIncludeSystemAdmin(tablesDB, roleIds);
  if (isSystemAdmin) {
    await addToAdminTeam(teams, { userId, email, name }, log);
  }

  await writeAuditLog(tablesDB, {
    actorUserId,
    action: 'user_create',
    targetUserId: userId,
    before: null,
    after: {
      email,
      name,
      role_ids: roleIds,
      resident_id: residentId || null,
      active: true,
    },
  });

  return { success: true, userId };
}

async function updateUser(body, { users, teams, tablesDB, log, actorUserId }) {
  const {
    userId,
    name,
    email,
    role_ids: roleIds,
    resident_id: residentId,
  } = body;

  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  let before;
  try {
    before = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
    });
  } catch (err) {
    return { success: false, error: 'User not found' };
  }

  const beforeRoleIds = extractRoleIds(before.role_ids);
  const wasSystemAdmin = await roleIdsIncludeSystemAdmin(
    tablesDB,
    beforeRoleIds
  );

  try {
    if (email && email !== before.email) {
      await users.updateEmail({ userId, email });
    }
    if (name && name !== before.name) {
      await users.updateName({ userId, name });
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to update Auth user',
    };
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (Array.isArray(roleIds)) updateData.role_ids = roleIds;
  if (typeof residentId !== 'undefined')
    updateData.resident_id = residentId || null;

  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
      data: updateData,
    });
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to update user profile',
    };
  }

  const effectiveRoleIds = Array.isArray(roleIds) ? roleIds : beforeRoleIds;
  const isSystemAdminNow = await roleIdsIncludeSystemAdmin(
    tablesDB,
    effectiveRoleIds
  );

  if (isSystemAdminNow && !wasSystemAdmin) {
    await addToAdminTeam(
      teams,
      { userId, email: email || before.email, name: name || before.name },
      log
    );
  } else if (!isSystemAdminNow && wasSystemAdmin) {
    await removeFromAdminTeam(teams, userId, log);
  }

  await writeAuditLog(tablesDB, {
    actorUserId,
    action: 'user_update',
    targetUserId: userId,
    before: {
      name: before.name,
      email: before.email,
      role_ids: beforeRoleIds,
      resident_id: before.resident_id || null,
    },
    after: {
      name: name || before.name,
      email: email || before.email,
      role_ids: effectiveRoleIds,
      resident_id:
        typeof residentId !== 'undefined'
          ? residentId || null
          : before.resident_id || null,
    },
  });

  return { success: true, userId };
}

async function deactivateUser(
  body,
  { users, teams, tablesDB, log, actorUserId }
) {
  const { userId } = body;

  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  if (userId === actorUserId) {
    return { success: false, error: 'You cannot deactivate your own account' };
  }

  let target;
  try {
    target = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
    });
  } catch (err) {
    return { success: false, error: 'User not found' };
  }

  const targetRoleIds = extractRoleIds(target.role_ids);
  const isTargetSystemAdmin = await roleIdsIncludeSystemAdmin(
    tablesDB,
    targetRoleIds
  );

  if (isTargetSystemAdmin) {
    const otherActiveAdmins = await countOtherActiveSystemAdmins(
      tablesDB,
      userId
    );
    if (otherActiveAdmins === 0) {
      return {
        success: false,
        error: 'Cannot deactivate the last System Administrator',
      };
    }
  }

  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
      data: { active: false },
    });
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to deactivate user',
    };
  }

  try {
    await users.deleteSessions({ userId });
  } catch (err) {
    log(`Could not delete sessions for user ${userId}: ${err.message}`);
  }

  if (isTargetSystemAdmin) {
    await removeFromAdminTeam(teams, userId, log);
  }

  await writeAuditLog(tablesDB, {
    actorUserId,
    action: 'user_deactivate',
    targetUserId: userId,
    before: { active: true },
    after: { active: false },
  });

  return { success: true, userId };
}

async function reactivateUser(
  body,
  { users, teams, tablesDB, log, actorUserId }
) {
  const { userId } = body;

  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }

  let target;
  try {
    target = await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
    });
  } catch (err) {
    return { success: false, error: 'User not found' };
  }

  try {
    await tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
      data: { active: true },
    });
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to reactivate user',
    };
  }

  const targetRoleIds = extractRoleIds(target.role_ids);
  const isSystemAdmin = await roleIdsIncludeSystemAdmin(
    tablesDB,
    targetRoleIds
  );
  if (isSystemAdmin) {
    await addToAdminTeam(
      teams,
      { userId, email: target.email, name: target.name },
      log
    );
  }

  await writeAuditLog(tablesDB, {
    actorUserId,
    action: 'user_reactivate',
    targetUserId: userId,
    before: { active: false },
    after: { active: true },
  });

  return { success: true, userId };
}

async function resetUserPassword(body, { users, tablesDB, log, actorUserId }) {
  const { userId, password } = body;

  if (!userId) {
    return { success: false, error: 'Missing userId' };
  }
  if (!password || password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters',
    };
  }

  // Confirm the target exists. We don't need the row contents, but a 404
  // here means the caller referenced a user that was deleted out-of-band.
  try {
    await tablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      rowId: userId,
    });
  } catch (err) {
    return { success: false, error: 'User not found' };
  }

  try {
    await users.updatePassword({ userId, password });
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to reset password',
    };
  }

  // Invalidate existing sessions so the user must sign in with the new
  // password. This matches the security posture of deactivation and prevents
  // any stale session from remaining usable.
  try {
    await users.deleteSessions({ userId });
  } catch (err) {
    log(`Could not delete sessions for user ${userId}: ${err.message}`);
  }

  // Deliberately do NOT record the password (or any hash of it) in the audit
  // log — only the fact that a reset occurred.
  await writeAuditLog(tablesDB, {
    actorUserId,
    action: 'user_password_reset',
    targetUserId: userId,
    before: null,
    after: { reset: true },
  });

  return { success: true, userId };
}

// ============================================
// Helpers
// ============================================

// role_ids may come back as an array of IDs or an array of populated role
// objects, depending on the relationship query. Normalize to an array of IDs.
function extractRoleIds(roleIds) {
  if (!Array.isArray(roleIds)) {
    return [];
  }
  return roleIds.map((entry) =>
    typeof entry === 'object' && entry !== null ? entry.$id : entry
  );
}

let cachedSystemAdminRoleId = null;

async function getSystemAdminRoleId(tablesDB) {
  if (cachedSystemAdminRoleId) {
    return cachedSystemAdminRoleId;
  }
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_ROLES,
    queries: [Query.equal('name', SYSTEM_ADMIN_ROLE_NAME), Query.limit(1)],
  });
  const role = response.rows?.[0];
  cachedSystemAdminRoleId = role ? role.$id : null;
  return cachedSystemAdminRoleId;
}

async function roleIdsIncludeSystemAdmin(tablesDB, roleIds) {
  const ids = extractRoleIds(roleIds);
  if (ids.length === 0) {
    return false;
  }
  const systemAdminRoleId = await getSystemAdminRoleId(tablesDB);
  return systemAdminRoleId ? ids.includes(systemAdminRoleId) : false;
}

// Counts active users (excluding `excludeUserId`) who hold the System
// Administrator role. Used to guard against deactivating the last admin.
// Treats rows with `active !== false` as active to remain consistent with the
// client UI and to tolerate pre-existing rows that were created before the
// `active` column existed.
async function countOtherActiveSystemAdmins(tablesDB, excludeUserId) {
  const systemAdminRoleId = await getSystemAdminRoleId(tablesDB);
  if (!systemAdminRoleId) {
    // Role missing entirely — do not block deactivation on a data
    // inconsistency (there is no admin role to protect).
    return 1;
  }

  const PAGE_SIZE = 100;
  let offset = 0;
  let total = 0;
  let count = 0;

  do {
    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLE_USERS,
      queries: [Query.limit(PAGE_SIZE), Query.offset(offset)],
    });

    const rows = response.rows || [];
    if (offset === 0) {
      total = response.total ?? rows.length;
    }

    for (const row of rows) {
      if (row.$id === excludeUserId) {
        continue;
      }
      if (row.active === false) {
        continue;
      }
      const roleIds = extractRoleIds(row.role_ids);
      if (roleIds.includes(systemAdminRoleId)) {
        count++;
      }
    }

    offset += rows.length;
  } while (offset < total);

  return count;
}

async function addToAdminTeam(teams, { userId, email, name }, log) {
  try {
    const memberships = await teams.listMemberships({ teamId: ADMIN_TEAM_ID });
    const alreadyMember = (memberships.memberships || []).some(
      (membership) => membership.userId === userId
    );
    if (alreadyMember) {
      return;
    }
  } catch (err) {
    log(`Could not list admin team memberships: ${err.message}`);
  }

  try {
    await teams.createMembership({
      teamId: ADMIN_TEAM_ID,
      roles: ['admin'],
      userId,
      email,
      name: name || 'System Administrator',
    });
  } catch (err) {
    log(`Could not add user ${userId} to admin team: ${err.message}`);
  }
}

async function removeFromAdminTeam(teams, userId, log) {
  try {
    const memberships = await teams.listMemberships({ teamId: ADMIN_TEAM_ID });
    const membership = (memberships.memberships || []).find(
      (m) => m.userId === userId
    );
    if (!membership) {
      return;
    }
    await teams.deleteMembership({
      teamId: ADMIN_TEAM_ID,
      membershipId: membership.$id,
    });
  } catch (err) {
    log(`Could not remove user ${userId} from admin team: ${err.message}`);
  }
}

const MAX_CHANGES_JSON_LENGTH = 2000;

function safeChangesJson(before, after) {
  const snapshot = { before, after };
  let str = JSON.stringify(snapshot);
  if (str.length <= MAX_CHANGES_JSON_LENGTH) {
    return str;
  }

  // Strip nested objects to a placeholder, keeping top-level keys.
  const simplified = {};
  for (const [key, val] of Object.entries(snapshot)) {
    if (val && typeof val === 'object') {
      simplified[key] = '(object)';
    } else {
      simplified[key] = val;
    }
  }
  str = JSON.stringify(simplified);
  if (str.length <= MAX_CHANGES_JSON_LENGTH) {
    return str;
  }

  // Final fallback: truncate to a valid JSON string with an ellipsis note.
  const note = { note: 'Audit changes omitted: exceeded maximum length' };
  return JSON.stringify(note);
}

async function writeAuditLog(
  tablesDB,
  { actorUserId, action, targetUserId, before, after }
) {
  try {
    await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_AUDIT_LOGS,
      rowId: ID.unique(),
      data: {
        actor_user_id: actorUserId || null,
        action,
        target_user_id: targetUserId || null,
        changes_json: safeChangesJson(before, after),
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Audit logging must never block the primary operation from returning
    // success to the caller; failures are logged for operator visibility.
    console.error(
      `Failed to write audit log for action "${action}":`,
      err.message
    );
  }
}
