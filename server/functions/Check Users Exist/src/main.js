import { Client, Users, Teams } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
/* eslint-disable no-unused-vars */
export default async ({ req, res, log, error }) => {
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
  const teams = new Teams(client);

  let body = {};
  if (req.body) {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      log('Failed to parse request body: ' + e.message);
    }
  }

  // Handle action to add the first user to the admin team
  if (body.action === 'addFirstUserToAdminTeam') {
    const { userId, email, name } = body;
    if (!userId || !email) {
      return res.json(
        { success: false, error: 'Missing userId or email' },
        400
      );
    }

    try {
      const userList = await users.list();
      log(`Total users when adding to team: ${userList.total}`);

      // We only allow adding the user to the admin team if they are the first user
      if (userList.total === 1 && userList.users[0].$id === userId) {
        const teamId = 'village_administrators';

        // Self-heal: ensure the admin team exists before adding membership.
        // setup-appwrite.js normally creates it, but if the function is run
        // against a project where `appwrite deploy` was never executed (so
        // appwrite.config.json's `teams:` block was never applied),
        // createMembership would 404 here and the admin would silently end up
        // with no team membership — breaking every function gated on
        // `team:village_administrators` with 401 "No permissions provided
        // for action 'execute'".
        try {
          await teams.get(teamId);
        } catch (teamErr) {
          if (teamErr.code === 404) {
            log(`Admin team "${teamId}" missing — creating it.`);
            try {
              await teams.create(teamId, 'Village Administrators');
              log(`Created team "${teamId}".`);
            } catch (createErr) {
              error(`Failed to create team "${teamId}": ${createErr.message}`);
              return res.json(
                {
                  success: false,
                  error: `Failed to create admin team: ${createErr.message}`,
                },
                500
              );
            }
          } else {
            error(
              `Could not verify admin team "${teamId}": ${teamErr.message}`
            );
            return res.json(
              {
                success: false,
                error: `Failed to verify admin team: ${teamErr.message}`,
              },
              500
            );
          }
        }

        log(`Adding first user ${userId} to village_administrators team`);
        await teams.createMembership({
          teamId,
          roles: ['admin'],
          email,
          userId,
          name: name || 'System Administrator',
        });
        log('Successfully added user to team.');
        return res.json({
          success: true,
          message: 'Added first user to village_administrators team',
        });
      } else {
        log(
          `Refusing to add user ${userId} to team. Users total: ${userList.total}`
        );
        return res.json(
          { success: false, error: 'Not authorized or not the first user' },
          403
        );
      }
    } catch (err) {
      error('Error adding user to team: ' + err.message);
      return res.json({ success: false, error: err.message }, 500);
    }
  }

  // Default: check if users exist
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
