import { Client, TablesDB, Query } from 'node-appwrite';

/**
 * Appwrite Cloud Function: Wipe All Data
 *
 * Deletes all data tables in the database by dropping them entirely, then
 * loops until all targeted tables are gone (handles FK-blocked first-pass
 * deletions by retrying). Schema is recreated separately via `appwrite push`.
 *
 * Deletion uses deleteTable (drops schema + data) rather than deleteRow to
 * avoid per-row rate limits entirely.
 *
 * Request body: { userId: string }
 * Response: { success: boolean, message?: string, error?: string, deleted?: string[] }
 */

// Tables to wipe, in preferred order (children first reduces FK retries)
const TABLES_TO_WIPE = [
  'transaction_links',
  'repayment_schedule',
  'loan_payments',
  'farm_sales',
  'finance_transactions',
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
  'school_classes',
  'village_settings',
  'residents',
  'households',
  'harvest_entries',
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

  const databaseId = process.env.DATABASE_ID || 'villageDB';
  const usersTableId = process.env.TABLE_USERS || 'users';
  const rolesTableId = process.env.TABLE_ROLES || 'roles';

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
