import { Client, TablesDB, Storage, Query } from 'node-appwrite';

/**
 * Appwrite Cloud Function: Wipe All Data
 *
 * Deletes all data tables in the database by dropping them entirely, then
 * loops until all targeted tables are gone (handles FK-blocked first-pass
 * deletions by retrying). Schema is recreated separately via `appwrite push`.
 *
 * Also deletes all files in the personal_files and shared_files Storage
 * buckets (Epic 5.3/5.4) so that re-seeding doesn't accumulate orphan files
 * that still count against user quotas.
 *
 * Deletion uses deleteTable (drops schema + data) rather than deleteRow to
 * avoid per-row rate limits entirely.
 *
 * Request body: { userId: string }
 * Response: { success: boolean, message?: string, error?: string, deleted?: string[] }
 */

// Tables to wipe, in preferred order (children first reduces FK retries)
const TABLES_TO_WIPE = [
  'notification_reads',
  'notifications',
  'transaction_links',
  'planting_cost_entries',
  'repayment_schedule',
  'loan_payments',
  'farm_sales',
  'finance_transactions',
  'vendors',
  'loans',
  'harvests',
  'farm_alerts',
  'inventory',
  'plantings',
  'plots',
  'crops',
  'soil_types',
  'finance_categories',
  'funding_sources',
  // School tables (children before parents)
  'school_calendar_events',
  'school_academic_terms',
  'class_timetable_entries',
  'school_period_slots',
  'intervention_notes',
  'interventions',
  'test_scores',
  'learner_attendance',
  'teacher_assignments',
  'learners',
  'school_long_term_goals',
  'school_classes',
  'village_settings',
  'residents',
  'households',
  'harvest_entries',
  // Epic 5 tables
  'village_events', // Story 5.1/5.2 — village calendar events
  'file_metadata', // Story 5.3 — personal file metadata
  'audit_logs', // Story 5.12 — user-management audit trail
];

const MAX_PASSES = 5; // Safety cap on retry loop

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    'https://cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

  log(`Wipe function called. Endpoint: ${endpoint}, Project: ${projectId}`);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);

  const databaseId = process.env.DATABASE_ID || 'villageDB';
  const usersTableId = process.env.TABLE_USERS || 'users';
  const rolesTableId = process.env.TABLE_ROLES || 'roles';
  const personalFilesBucketId = process.env.BUCKET_PERSONAL_FILES || 'personal_files';
  const sharedFilesBucketId = process.env.BUCKET_SHARED_FILES || 'shared_files';

  log(`Using databaseId: ${databaseId}`);

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
      return res.json({ success: false, error: 'Only System Administrators can wipe data' }, 403);
    }

    log('Permission verified. Starting full data wipe...');

    // ============================================
    // STORAGE WIPE — delete all files in Epic 5 buckets
    // ============================================

    // Story 5.4: wipe both the personal_files and shared_files buckets.
    for (const bucketId of [personalFilesBucketId, sharedFilesBucketId]) {
      log(`Wiping files from bucket: ${bucketId}`);
      try {
        let totalDeleted = 0;
        // List and delete in batches of 100. Since we delete as we go, the
        // next list call always returns the next batch (or empty when done).
        while (true) {
          const result = await storage.listFiles({
            bucketId,
            queries: [Query.limit(100)],
          });
          if (!result.files || result.files.length === 0) {
            break;
          }
          for (const file of result.files) {
            try {
              await storage.deleteFile({ bucketId, fileId: file.$id });
              totalDeleted++;
            } catch (fileErr) {
              log(`${bucketId}/${file.$id}: could not delete — ${fileErr.message}`);
            }
          }
        }
        log(`${bucketId}: wiped ${totalDeleted} file(s)`);
      } catch (bucketErr) {
        // Bucket may not exist yet on a fresh project — non-fatal.
        log(`${bucketId}: could not list files — ${bucketErr.message} (non-fatal, continuing)`);
      }
    }

    // ============================================
    // DATA WIPE — delete tables, retry until all gone
    // ============================================

    const deleted = [];
    // Start with full list; each pass attempts to delete remaining tables
    let remaining = [...TABLES_TO_WIPE];
    // Exclude users and roles tables from wiping (auth accounts and roles remain)
    remaining = remaining.filter((t) => t !== usersTableId && t !== rolesTableId);

    for (let pass = 1; pass <= MAX_PASSES && remaining.length > 0; pass++) {
      log(`Pass ${pass}: ${remaining.length} table(s) remaining — ${remaining.join(', ')}`);
      const stillRemaining = [];

      for (const tableId of remaining) {
        try {
          // Check if table still has rows
          const check = await tablesDB.listRows({
            databaseId,
            tableId,
            queries: [Query.limit(1)],
          });
          const rowCount = check.total ?? check.rows?.length ?? 0;

          if (rowCount === 0) {
            log(`${tableId}: no rows, skipping delete`);
          } else {
            log(`${tableId}: ${rowCount} row(s) exist, attempting deleteTable...`);
          }

          await tablesDB.deleteTable({ databaseId, tableId });
          log(`${tableId}: deleted successfully`);
          deleted.push(tableId);
        } catch (err) {
          log(`${tableId}: could not delete — ${err.message} (will retry if passes remain)`);
          stillRemaining.push(tableId);
        }
      }

      remaining = stillRemaining;
    }

    if (remaining.length > 0) {
      error(`Could not delete after ${MAX_PASSES} passes: ${remaining.join(', ')}`);
      return res.json({
        success: false,
        error: `Some tables could not be deleted: ${remaining.join(', ')}`,
        deleted,
      });
    }

    log(`Wipe completed. Deleted tables: ${deleted.join(', ')}`);
    return res.json({
      success: true,
      message: 'All data wiped successfully. Run `appwrite push` to recreate the schema.',
      deleted,
    });
  } catch (err) {
    error('Unexpected error during wipe: ' + err.message);
    return res.json(
      {
        success: false,
        error: 'An unexpected error occurred during data wipe',
        details: err.message,
      },
      500,
    );
  }
};
