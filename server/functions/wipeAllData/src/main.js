import { Client, Databases, Users, Query } from 'node-appwrite';

/**
 * Appwrite Cloud Function: Wipe All Data
 *
 * Deletes all residents, households, and resets village settings using
 * parallel batch deletions for performance.
 * Requires System Administrator permission (verified server-side).
 *
 * Request body: { userId: string }
 * Response: {
 *   success: boolean,
 *   message?: string,
 *   error?: string,
 *   phase?: string,
 *   totalResidents?: number,
 *   totalHouseholds?: number,
 *   deletedResidents?: number,
 *   deletedHouseholds?: number
 * }
 */

// Configuration for parallel batch deletions
const BATCH_SIZE = 100; // Documents to fetch per query
const PARALLEL_DELETES = 25; // Concurrent delete operations

/**
 * Delete documents in parallel batches for better performance
 * @param {Databases} databases - Appwrite Databases instance
 * @param {string} databaseId - Database ID
 * @param {string} collectionId - Collection ID
 * @param {Function} log - Logging function
 * @returns {Promise<number>} Number of deleted documents
 */
async function deleteCollectionDocuments(databases, databaseId, collectionId, log) {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch a batch of documents
    const response = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(BATCH_SIZE),
    ]);

    if (response.documents.length === 0) {
      hasMore = false;
      break;
    }

    // Delete documents in parallel chunks
    const documents = response.documents;
    for (let i = 0; i < documents.length; i += PARALLEL_DELETES) {
      const chunk = documents.slice(i, i + PARALLEL_DELETES);
      const deletePromises = chunk.map((doc) =>
        databases.deleteDocument(databaseId, collectionId, doc.$id).catch((err) => {
          // Log but don't fail on individual delete errors
          log(`Warning: Failed to delete ${collectionId}/${doc.$id}: ${err.message}`);
          return null;
        }),
      );

      await Promise.all(deletePromises);
      totalDeleted += chunk.length;
    }

    log(`Deleted ${totalDeleted} documents from ${collectionId}...`);
  }

  return totalDeleted;
}

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
        // const role = await databases.getDocument(databaseId, rolesTableId, roleId);
        // console.log(`role: ${role}`);
        const permissions = roleId.permissions || [];
        console.log(`roleId: ${roleId}, permissions: ${permissions}`);

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
    // DATA WIPE OPERATIONS (Parallel Batch Deletions)
    // ============================================

    let deletedResidents = 0;
    let deletedHouseholds = 0;

    // Step 1: Delete all residents (parallel batches)
    log('Phase: Deleting residents...');
    try {
      deletedResidents = await deleteCollectionDocuments(
        databases,
        databaseId,
        residentsTableId,
        log,
      );
      log(`Completed: Deleted ${deletedResidents} residents`);
    } catch (residentsError) {
      error(`Error deleting residents: ${residentsError.message}`);
      // Continue with other deletions
    }

    // Step 2: Delete all households (parallel batches)
    log('Phase: Deleting households...');
    try {
      deletedHouseholds = await deleteCollectionDocuments(
        databases,
        databaseId,
        householdsTableId,
        log,
      );
      log(`Completed: Deleted ${deletedHouseholds} households`);
    } catch (householdsError) {
      error(`Error deleting households: ${householdsError.message}`);
      // Continue with settings reset
    }

    // Step 3: Delete village settings (settings_root)
    log('Phase: Resetting village settings...');
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
      phase: 'complete',
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
