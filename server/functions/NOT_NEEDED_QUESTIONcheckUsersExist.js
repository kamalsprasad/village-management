import { Client, Users, Query } from 'node-appwrite';
import { randomUUID } from 'node:crypto';
/**
 * Appwrite Function: Check if any users exist in the system
 *
 * This function is called from the client-side to determine if the system
 * has been initialized (i.e., if any users have been created).
 *
 * Required Environment Variables:
 * - APPWRITE_FUNCTION_ENDPOINT: Your Appwrite endpoint URL
 * - APPWRITE_FUNCTION_PROJECT_ID: Your Appwrite project ID
 * - APPWRITE_FUNCTION_API_KEY: API key with 'users.read' scope
 *
 * Execute Access: role:guest (must be configured in Appwrite Console)
 */
export default async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite client with server credentials
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const users = new Users(client);

    // Query for users with a limit of 1 (we only need to know if ANY exist)
    const userList = await users.list([Query.limit(1)]);

    const userExists = userList.total > 0;

    log(`User check completed. Users exist: ${userExists}`);

    return res.json({
      success: true,
      userExists,
      message: userExists
        ? 'Users found in the system'
        : 'No users found - first time setup required',
    });
  } catch (err) {
    const errorId = typeof randomUUID === 'function' ? randomUUID() : Date.now().toString();
    const errorMessage = `Error checking for users [${errorId}]: ${err.message}`;

    error(errorMessage);

    return res.json(
      {
        success: false,
        userExists: null,
        error: 'Unable to determine if users exist',
        errorId,
        message:
          'The authentication service is unreachable at the moment. Please try again shortly.',
      },
      503,
    );
  }
};
