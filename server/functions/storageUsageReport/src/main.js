import { Client, TablesDB, Query } from 'node-appwrite';

/**
 * Appwrite Cloud Function: Storage Usage Report (Story 5.4)
 *
 * Verifies the caller is a System Administrator (same permission-verification
 * pattern as wipeAllData/src/main.js), then aggregates file_metadata.size by
 * owner_id across ALL rows (personal + shared) using the function's admin
 * API key. Returns only numeric totals per user — no filenames or other
 * personal metadata cross the privacy boundary (see Story 5.4 spec Design
 * Notes: "Admin usage report via Function, not row grants").
 *
 * Request body: { userId: string }
 * Response: { success: boolean, usage?: { userId: string, usageBytes: number }[], error?: string }
 */

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    'https://cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

  log(`Storage usage report function called. Endpoint: ${endpoint}, Project: ${projectId}`);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);

  const databaseId = process.env.DATABASE_ID || 'villageDB';
  const usersTableId = process.env.TABLE_USERS || 'users';
  const fileMetadataTableId = process.env.TABLE_FILE_METADATA || 'file_metadata';

  try {
    // ============================================
    // PERMISSION VERIFICATION (Server-Side)
    // ============================================

    let body = {};
    if (req.body) {
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (parseError) {
        error('Failed to parse request body: ' + parseError.message);
        return res.json({ success: false, error: 'Invalid request body' }, 400);
      }
    }

    const { userId } = body;
    if (!userId) {
      error('Missing userId in request');
      return res.json({ success: false, error: 'Missing userId parameter' }, 400);
    }

    log(`Verifying permissions for user: ${userId}`);

    let userProfile;
    try {
      userProfile = await tablesDB.getRow({
        databaseId,
        tableId: usersTableId,
        rowId: userId,
        queries: [Query.select(['*', 'role_ids.*'])],
      });
    } catch (userError) {
      error(`User profile not found: ${userError.message}`);
      return res.json({ success: false, error: 'User not found' }, 403);
    }

    const userRoles = userProfile.role_ids || [];
    if (userRoles.length === 0) {
      error('User has no roles assigned');
      return res.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    let hasAdminPermission = false;
    for (const role of userRoles) {
      const permissions = role.permissions || [];
      log(`Checking role: ${role.name}, permissions: ${permissions}`);
      if (permissions.includes('*')) {
        hasAdminPermission = true;
        log(`User has System Administrator permission via role: ${role.name}`);
        break;
      }
    }

    if (!hasAdminPermission) {
      error('User does not have System Administrator permission');
      return res.json(
        { success: false, error: 'Only System Administrators can view the storage report' },
        403,
      );
    }

    log('Permission verified. Aggregating storage usage...');

    // ============================================
    // AGGREGATE file_metadata.size BY owner_id
    // ============================================

    const usageByOwner = {};
    let offset = 0;
    const PAGE_SIZE = 100;

    while (true) {
      const page = await tablesDB.listRows({
        databaseId,
        tableId: fileMetadataTableId,
        queries: [Query.limit(PAGE_SIZE), Query.offset(offset)],
      });

      for (const row of page.rows) {
        const ownerId = row.owner_id;
        if (!ownerId) continue;
        usageByOwner[ownerId] = (usageByOwner[ownerId] || 0) + (row.size || 0);
      }

      if (page.rows.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }

    const usage = Object.entries(usageByOwner).map(([ownerId, usageBytes]) => ({
      userId: ownerId,
      usageBytes,
    }));

    log(`Aggregated usage for ${usage.length} user(s)`);

    return res.json({ success: true, usage });
  } catch (err) {
    error('Unexpected error during storage usage report: ' + err.message);
    return res.json(
      {
        success: false,
        error: 'An unexpected error occurred while generating the storage report',
        details: err.message,
      },
      500,
    );
  }
};
