import { Client, Users } from 'node-appwrite';
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
console.log(process.env.APPWRITE_FUNCTION_ENDPOINT);
export default async ({ req, res, log, error }) => {
  try {
    // Initialize Appwrite client with server credentials
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

    const users = new Users(client);

    // Query for users with a limit of 1 (we only need to know if ANY exist)
    const userList = await users.list([], 1);

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
    error('Error checking for users: ' + err.message);

    return res.json(
      {
        success: false,
        userExists: false,
        error: 'Failed to check for existing users',
        message: err.message,
      },
      500,
    );
  }
};
