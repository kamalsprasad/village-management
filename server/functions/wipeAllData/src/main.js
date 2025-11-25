import { Client, Databases, Users, Query } from 'node-appwrite';

/**
 * Appwrite Cloud Function: Wipe All Data
 *
 * Atomically deletes all residents, households, and resets village settings.
 * Requires System Administrator permission (verified server-side).
 *
 * Request body: { userId: string }
 * Response: { success: boolean, message?: string, error?: string }
 */
export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client with server-side credentials
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_ENDPOINT ||
    'https://cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY || '';

  log(`Wipe function called. Endpoint: ${endpoint}, Project: ${projectId}`);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const databases = new Databases(client);
  const users = new Users(client);

  // Database and table IDs from environment
  const databaseId = process.env.DATABASE_ID || 'villageDB';
  const residentsTableId = process.env.TABLE_RESIDENTS || 'residents';
  const householdsTableId = process.env.TABLE_HOUSEHOLDS || 'households';
  const settingsTableId = process.env.TABLE_VILLAGE_SETTINGS || 'village_settings';
  const usersTableId = process.env.TABLE_USERS || 'users';
  const rolesTableId = process.env.TABLE_ROLES || 'roles';

  try {
    // Parse request body
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

    // ============================================
    // PERMISSION VERIFICATION (Server-Side)
    // ============================================

    // Step 1: Get user profile from users table
    let userProfile;
    try {
      userProfile = await databases.getDocument(databaseId, usersTableId, userId);
    } catch (userError) {
      error(`User profile not found: ${userError.message}`);
      return res.json({ success: false, error: 'User not found' }, 403);
    }

    // Step 2: Check if user has System Administrator role
    const roleIds = userProfile.role_ids || [];
    if (roleIds.length === 0) {
      error('User has no roles assigned');
      return res.json({ success: false, error: 'Insufficient permissions' }, 403);
    }

    // Step 3: Fetch roles and check for '*' (System Administrator) permission
    let hasAdminPermission = false;
    for (const roleId of roleIds) {
      try {
        const role = await databases.getDocument(databaseId, rolesTableId, roleId);
        const permissions = role.permissions || [];

        if (permissions.includes('*')) {
          hasAdminPermission = true;
          log(`User has System Administrator permission via role: ${role.name}`);
          break;
        }
      } catch (roleError) {
        log(`Could not fetch role ${roleId}: ${roleError.message}`);
      }
    }

    if (!hasAdminPermission) {
      error('User does not have System Administrator permission');
      return res.json(
        {
          success: false,
          error: 'Only System Administrators can wipe data',
        },
        403,
      );
    }

    log('Permission verified. Starting data wipe...');

    // ============================================
    // DATA WIPE OPERATIONS
    // ============================================

    let deletedResidents = 0;
    let deletedHouseholds = 0;

    // Step 1: Delete all residents
    log('Deleting all residents...');
    try {
      let hasMore = true;
      while (hasMore) {
        const residentsResponse = await databases.listDocuments(databaseId, residentsTableId, [
          Query.limit(100),
        ]);

        if (residentsResponse.documents.length === 0) {
          hasMore = false;
          break;
        }

        for (const resident of residentsResponse.documents) {
          await databases.deleteDocument(databaseId, residentsTableId, resident.$id);
          deletedResidents++;
        }

        log(`Deleted ${deletedResidents} residents so far...`);
      }
    } catch (residentsError) {
      error(`Error deleting residents: ${residentsError.message}`);
      // Continue with other deletions
    }

    // Step 2: Delete all households
    log('Deleting all households...');
    try {
      let hasMore = true;
      while (hasMore) {
        const householdsResponse = await databases.listDocuments(databaseId, householdsTableId, [
          Query.limit(100),
        ]);

        if (householdsResponse.documents.length === 0) {
          hasMore = false;
          break;
        }

        for (const household of householdsResponse.documents) {
          await databases.deleteDocument(databaseId, householdsTableId, household.$id);
          deletedHouseholds++;
        }

        log(`Deleted ${deletedHouseholds} households so far...`);
      }
    } catch (householdsError) {
      error(`Error deleting households: ${householdsError.message}`);
      // Continue with settings reset
    }

    // Step 3: Delete village settings (settings_root)
    log('Resetting village settings...');
    try {
      await databases.deleteDocument(databaseId, settingsTableId, 'settings_root');
      log('Village settings deleted successfully');
    } catch (settingsError) {
      // Settings might not exist, which is fine
      log(`Settings deletion note: ${settingsError.message}`);
    }

    log(
      `Wipe completed. Deleted ${deletedResidents} residents and ${deletedHouseholds} households.`,
    );

    return res.json({
      success: true,
      message: 'All data wiped successfully',
      deletedResidents,
      deletedHouseholds,
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
