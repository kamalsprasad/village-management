#!/usr/bin/env node

/**
 * create-admin.js
 * 
 * Interactive script to create the initial System Administrator account,
 * assign them the DB role, create their profile in the Users database,
 * and add them to the village_administrators team.
 * 
 * Runs as part of the setup wizard (Linux, macOS, Windows) or standalone.
 */

import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Client, Users, Teams, TablesDB, Query, ID } from 'node-appwrite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Load environment variables from both root .env and server/.env
const rootEnvPath = path.join(rootDir, '.env');
const serverEnvPath = path.join(rootDir, 'server', '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: true });
}

export const stripQuotes = (str) => {
  if (!str) return str;
  return str.trim().replace(/^["']|["']$/g, '').trim();
};

export function getAppwriteConfig() {
  const endpoint =
    stripQuotes(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT) ||
    'https://cloud.appwrite.io/v1';
  const projectId = stripQuotes(
    process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID
  );
  const apiKey = stripQuotes(
    process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY
  );
  const databaseId =
    stripQuotes(process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID) ||
    'villageDB';
  const rolesTableId =
    stripQuotes(process.env.APPWRITE_TABLE_ROLES || process.env.VITE_APPWRITE_TABLE_ROLES) ||
    'roles';
  const usersTableId =
    stripQuotes(process.env.APPWRITE_TABLE_USERS || process.env.VITE_APPWRITE_TABLE_USERS) ||
    'users';

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
    rolesTableId,
    usersTableId,
  };
}

export async function createAdminUser({
  usersService,
  teamsService,
  tables,
  config,
  email,
  name,
  password,
}) {
  const { databaseId, rolesTableId, usersTableId } = config;

  // 1. Find System Administrator role
  const rolesResponse = await tables.listRows({
    databaseId,
    tableId: rolesTableId,
    queries: [Query.equal('name', 'System Administrator'), Query.limit(1)],
  });

  const adminRole = rolesResponse.rows?.[0];
  if (!adminRole) {
    throw new Error(
      'System Administrator role not found in database. Please run npm run seed:roles first.'
    );
  }

  // 2. Create Auth user
  const userId = ID.unique();
  await usersService.create({
    userId,
    email,
    password,
    name,
  });
  console.log('✅ Appwrite Auth account created.');

  // 3. Add to village_administrators team
  try {
    await teamsService.createMembership({
      teamId: 'village_administrators',
      roles: ['admin'],
      email,
      userId,
      name,
    });
    console.log('✅ Added to "village_administrators" team.');
  } catch (teamError) {
    console.warn('⚠️ Warning: Failed to add user to "village_administrators" team:', teamError.message);
    if (teamError.code === 401) {
      console.log('👉 Note: Your API key lacks "teams.write" scope. Please add this member manually in Appwrite console.');
    }
  }

  // 4. Create document in users database collection with matching $id
  try {
    const userDoc = await tables.createRow({
      databaseId,
      tableId: usersTableId,
      rowId: userId,
      data: {
        email,
        name,
        role_ids: [adminRole.$id],
        active: true,
      },
    });
    console.log(`✅ Created user profile document in database (User ID: ${userId}).`);
    return { success: true, userId, userDoc };
  } catch (dbError) {
    console.error('❌ Failed to create database user profile document:', dbError.message);
    // Roll back the orphaned Auth user
    try {
      await usersService.delete({ userId });
      console.log('ℹ️ Rolled back Auth user account due to database profile creation failure.');
    } catch (rollbackErr) {
      console.error('⚠️ Failed to roll back Auth user:', rollbackErr.message);
    }
    throw dbError;
  }
}

export async function syncExistingAdminToDatabase({
  authUser,
  teamsService,
  tables,
  config,
}) {
  const { databaseId, rolesTableId, usersTableId } = config;

  const rolesResponse = await tables.listRows({
    databaseId,
    tableId: rolesTableId,
    queries: [Query.equal('name', 'System Administrator'), Query.limit(1)],
  });

  const adminRole = rolesResponse.rows?.[0];
  if (!adminRole) {
    throw new Error(
      'System Administrator role not found in database. Please run npm run seed:roles first.'
    );
  }

  const userId = authUser.$id;
  const email = authUser.email;
  const name = authUser.name || 'System Administrator';

  console.log(`ℹ️ Auth user found (${email}, ID: ${userId}) without a matching database profile.`);
  console.log('📝 Creating matching profile in Users database table...');

  const userDoc = await tables.createRow({
    databaseId,
    tableId: usersTableId,
    rowId: userId,
    data: {
      email,
      name,
      role_ids: [adminRole.$id],
      active: true,
    },
  });

  console.log(`✅ Created user profile document in database (User ID: ${userId}).`);

  // Ensure user is in village_administrators team
  try {
    await teamsService.createMembership({
      teamId: 'village_administrators',
      roles: ['admin'],
      email,
      userId,
      name,
    });
    console.log('✅ Added to "village_administrators" team.');
  } catch (teamError) {
    // Might already be a member
    if (!teamError.message?.includes('already')) {
      console.warn('⚠️ Note when adding to team:', teamError.message);
    }
  }

  return { success: true, userId, userDoc };
}

let rl = null;
let lineQueue = [];
let lineResolver = null;
let inputClosed = false;

function flushLine() {
  if (!lineResolver) return;
  if (lineQueue.length > 0) {
    const resolve = lineResolver;
    lineResolver = null;
    resolve(lineQueue.shift());
  } else if (inputClosed) {
    const resolve = lineResolver;
    lineResolver = null;
    resolve(null);
  }
}

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    process.stdout.write(prompt);
    lineResolver = (line) => {
      resolve(line || defaultValue);
    };
    if (rl) {
      rl.resume();
    }
    flushLine();
  });
}

export async function main() {
  const config = getAppwriteConfig();
  const { endpoint, projectId, apiKey, databaseId, usersTableId } = config;

  if (!projectId || !apiKey) {
    console.error('❌ Error: Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY in environment files (.env or server/.env)');
    process.exit(1);
  }

  // Initialize Appwrite Client
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const usersService = new Users(client);
  const teamsService = new Teams(client);
  const tables = new TablesDB(client);

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (line) => {
    lineQueue.push(line.trim());
    flushLine();
  });

  rl.on('close', () => {
    inputClosed = true;
    flushLine();
  });

  try {
    console.log('🔍 Checking for existing users in Appwrite...');
    let existingUsers;
    try {
      existingUsers = await usersService.list([Query.limit(100)]);
    } catch (err) {
      console.error('❌ Failed to check for existing users in Appwrite:', err.message);
      if (err.code === 401) {
        console.log('👉 ERROR: 401 Unauthorized. This usually means your APPWRITE_API_KEY does not');
        console.log('   have "users.read" permission. Please ensure your API key has all scopes.');
      }
      rl.close();
      process.exit(1);
    }

    if (existingUsers.total > 0) {
      // Check if the users table also has rows
      try {
        const dbUsers = await tables.listRows({
          databaseId,
          tableId: usersTableId,
          queries: [Query.limit(100)],
        });

        if (dbUsers.total > 0) {
          console.log(`ℹ️ ${existingUsers.total} user(s) in Appwrite Auth and ${dbUsers.total} profile(s) in Users database found.`);
          console.log('Skipping automated admin account creation.');
          rl.close();
          process.exit(0);
        } else {
          // Self-healing: Auth user exists but missing in database table!
          console.log('⚠️ Warning: Users exist in Appwrite Auth, but no user profile found in the Users database table.');
          const primaryUser = existingUsers.users[0];
          await syncExistingAdminToDatabase({
            authUser: primaryUser,
            teamsService,
            tables,
            config,
          });
          console.log('\n🎉 Administrator profile synchronized successfully!\n');
          rl.close();
          process.exit(0);
        }
      } catch (dbCheckErr) {
        console.warn('⚠️ Could not verify Users database table:', dbCheckErr.message);
        console.log('ℹ️ Users already exist in Appwrite Auth. Skipping automated admin account creation.');
        rl.close();
        process.exit(0);
      }
    }

    console.log('\n--- Administrator Account Setup (Mandatory) ---');
    console.log('You must create the initial System Administrator account now.');
    console.log('This will create the account, assign the System Administrator DB role,');
    console.log('and automatically add the user to the "village_administrators" team.\n');

    let email = '';
    let name = '';
    let password = '';

    while (true) {
      email = await ask('Enter Admin Email');
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        break;
      }
      console.log('❌ Invalid email format. Please try again.');
    }

    name = await ask('Enter Admin Display Name', 'System Administrator');

    while (true) {
      password = await ask('Enter Admin Password (min 8 characters, UPPERCASE, lowercase, and a number)');
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasMinLength = password.length >= 8;

      if (hasMinLength && hasUppercase && hasLowercase && hasNumber) {
        break;
      }
      console.log('❌ Password must be at least 8 characters long, and contain at least one UPPERCASE letter, one lowercase letter, and one number. Please try again.');
    }

    console.log('\nCreating account...');
    await createAdminUser({
      usersService,
      teamsService,
      tables,
      config,
      email,
      name,
      password,
    });

    console.log('\n🎉 Administrator account created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log('🔑 You can use these credentials to log in to the application.\n');

  } catch (error) {
    console.error('\n❌ Failed to create administrator account:', error.message);
    if (error.code === 401) {
      console.log('👉 ERROR: 401 Unauthorized. This usually means your APPWRITE_API_KEY does not');
      console.log('   have "users.write", "teams.write", and "documents.write" scopes. Please update your API Key');
      console.log('   scopes in the Appwrite console and try running this script again.');
    }
    process.exitCode = 1;
  } finally {
    if (rl) {
      rl.close();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

