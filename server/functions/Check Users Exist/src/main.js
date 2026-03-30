import { Client, Users } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
/* eslint-disable no-unused-vars */
export default async ({ req, res, log, error }) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Users service
  const endpoint =
    process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '';
  const apiKey = process.env.APPWRITE_API_KEY || '';

  log(`Resolved endpoint: ${endpoint}`);
  log(`Resolved project ID: ${projectId}`);

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(req.headers['x-appwrite-key'] || apiKey);
  const users = new Users(client);

  try {
    const response = await users.list();
    log(`Total users: ${response.total}`);
    return res.json({
      success: true,
      userExists: response.total > 0,
    });
  } catch (err) {
    error('Could not list users: ' + err.message);
    return res.json(
      {
        success: false,
        userExists: false,
        error: 'Failed to check for existing users',
        message: err.message,
      },
      500
    );
  }
};
