#!/usr/bin/env node

/**
 * create-admin.js
 * 
 * Interactive script to create the initial System Administrator account,
 * assign them the DB role, and add them to the village_administrators team.
 * 
 * Runs as part of the setup wizard.
 */

import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Client, Users, Teams, TablesDB, Query, ID } from 'node-appwrite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

// Load environment variables from the server/.env file
const envPath = path.join(rootDir, 'server', '.env');
dotenv.config({ path: envPath });

const stripQuotes = (str) => {
  if (!str) return str;
  return str.replace(/^["']|["']$/g, '');
};

const endpoint = stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1';
const projectId = stripQuotes(process.env.APPWRITE_PROJECT_ID);
const apiKey = stripQuotes(process.env.APPWRITE_API_KEY);
const databaseId = stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB';
const rolesTableId = stripQuotes(process.env.APPWRITE_TABLE_ROLES) || 'roles';
const usersTableId = stripQuotes(process.env.APPWRITE_TABLE_USERS) || 'users';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let lineQueue = [];
let lineResolver = null;
let inputClosed = false;

rl.on('line', (line) => {
  lineQueue.push(line.trim());
  flushLine();
});

rl.on('close', () => {
  inputClosed = true;
  flushLine();
});

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
    rl.resume();
    flushLine();
  });
}

async function main() {
  if (!projectId || !apiKey) {
    console.error('❌ Error: Missing APPWRITE_PROJECT_ID or APPWRITE_API_KEY in server/.env file');
    rl.close();
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

  try {
    console.log('🔍 Checking for existing users in Appwrite...');
    let existingUsers;
    try {
      existingUsers = await usersService.list();
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
      console.log('ℹ️ Users already exist in Appwrite. Skipping automated admin account creation.');
      rl.close();
      process.exit(0);
    }

    console.log('\n--- Administrator Account Setup (Recommended) ---');
    console.log('You can pre-create the initial System Administrator account now.');
    console.log('This will create the account, assign the System Administrator DB role,');
    console.log('and automatically add the user to the "village_administrators" team.\n');

    const choice = await ask('Pre-create System Administrator account? (Y/n)', 'y');
    if (choice.toLowerCase() !== 'y') {
      console.log('\n⚠️  Skipped administrator account creation.');
      console.log('👉 IMPORTANT: If you register your user later via the app UI, you MUST');
      console.log('   manually add them to the "village_administrators" team in the Appwrite Console');
      console.log('   to access administrative features (e.g. wiping/seeding data).\n');
      rl.close();
      process.exit(0);
    }

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
      password = await ask('Enter Admin Password (min 8 characters)');
      if (password.length >= 8) {
        break;
      }
      console.log('❌ Password must be at least 8 characters long. Please try again.');
    }

    console.log('\nCreating account...');
    const userId = ID.unique();

    // 1. Create Auth user
    await usersService.create({
      userId,
      email,
      password,
      name,
    });
    console.log('✅ Appwrite Auth account created.');

    // 2. Add to team
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
      console.error('❌ Failed to add user to "village_administrators" team:', teamError.message);
      if (teamError.code === 401) {
        console.log('👉 Note: Your API key lacks "teams.write" scope. Please add this member manually.');
      } else {
        console.log('👉 Please add this member manually in the Appwrite Console.');
      }
    }

    // 3. Create document in users collection
    try {
      // Find System Administrator role ID
      const rolesResponse = await tables.listRows({
        databaseId,
        tableId: rolesTableId,
        queries: [Query.equal('name', 'System Administrator')],
      });

      const adminRole = rolesResponse.rows[0];
      if (!adminRole) {
        throw new Error('System Administrator role not found in database. Please run seed:roles first.');
      }

      await tables.createRow({
        databaseId,
        tableId: usersTableId,
        rowId: userId,
        data: {
          email,
          name,
          role_ids: [adminRole.$id],
        },
      });
      console.log('✅ Created user profile document in database.');
    } catch (dbError) {
      console.error('❌ Failed to create database user profile document:', dbError.message);
      console.log('👉 Ensure you run seed:roles and that the database schema is initialized.');
    }

    console.log('\n🎉 Administrator account pre-created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log('🔑 You can use these credentials to log in to the application.\n');

  } catch (error) {
    console.error('\n❌ Failed to create administrator account:', error.message);
    if (error.code === 401) {
      console.log('👉 ERROR: 401 Unauthorized. This usually means your APPWRITE_API_KEY does not');
      console.log('   have "users.write" and "teams.write" scopes. Please update your API Key');
      console.log('   scopes in the Appwrite console and try running this script again.');
    }
  } finally {
    rl.close();
  }
}

main();
