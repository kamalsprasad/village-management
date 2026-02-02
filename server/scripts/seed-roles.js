#!/usr/bin/env node

/**
 * Seed Roles Script
 *
 * Seeds the roles table with default roles for the Village Management System.
 * This should be run after setup-appwrite.js but before creating admin users.
 *
 * Usage: npm run seed:roles
 *
 * Prerequisites:
 * - Appwrite project configured
 * - Database schema created (run setup:appwrite first)
 * - .env file with APPWRITE_API_KEY
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
import { Client, TablesDB, ID } from 'node-appwrite';

// Helper to strip quotes from env variables if present
const stripQuotes = (str) => {
  if (!str) return str;
  return str.replace(/^["']|["']$/g, '');
};

// ============================================
// CONFIGURATION
// ============================================

const endpoint = stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1';
const projectId = stripQuotes(process.env.APPWRITE_PROJECT_ID);
const apiKey = stripQuotes(process.env.APPWRITE_API_KEY);
const databaseId = stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB';
const rolesTableId = stripQuotes(process.env.APPWRITE_TABLE_ROLES) || 'roles';

// ============================================
// DEFAULT ROLES
// ============================================

const defaultRoles = [
  {
    name: 'System Administrator',
    category: 'administration',
    permissions: ['*'],
    storage_quota: 1000,
  },
  {
    name: 'Council Member',
    category: 'council',
    permissions: ['view_residents', 'view_households', 'edit_households', 'view_reports'],
    storage_quota: 100,
  },
  {
    name: 'Farm Manager',
    category: 'farm',
    permissions: ['view_farm', 'edit_farm', 'view_reports'],
    storage_quota: 50,
  },
  {
    name: 'School Administrator',
    category: 'school',
    permissions: ['view_school', 'edit_school', 'view_reports'],
    storage_quota: 50,
  },
  {
    name: 'Village Resident',
    category: 'administration',
    permissions: ['view_profile', 'edit_profile'],
    storage_quota: 10,
  },
];

// ============================================
// MAIN SCRIPT
// ============================================

async function seedRoles() {
  console.log('🚀 Starting Roles Seeding');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Project: ${projectId}`);
  console.log(`   Database: ${databaseId}`);
  console.log(`   Table: ${rolesTableId}`);

  if (!projectId || !apiKey) {
    console.error(
      '❌ Error: Missing VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_API_KEY in .env file',
    );
    process.exit(1);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const tables = new TablesDB(client);

  try {
    // Check if roles table exists
    console.log('\n🔍 Verifying roles table exists...');
    try {
      await tables.getTable({
        databaseId: databaseId,
        tableId: rolesTableId,
      });
      console.log('   ✅ Roles table found');
    } catch (error) {
      if (error.code === 404) {
        console.error(`   ❌ Roles table "${rolesTableId}" not found`);
        console.error('      Please run setup:appwrite first to create the database schema');
        process.exit(1);
      }
      throw error;
    }

    // Check existing roles
    console.log('\n🔍 Checking existing roles...');
    const existingRoles = await tables.listRows({
      databaseId: databaseId,
      tableId: rolesTableId,
    });

    console.log(`   Found ${existingRoles.rows.length} existing roles`);

    // Seed missing roles
    console.log('\n📝 Seeding roles...');
    let seededCount = 0;

    for (const role of defaultRoles) {
      const existingRole = existingRoles.rows.find((r) => r.name === role.name);

      if (existingRole) {
        console.log(`   ⚠️  Role already exists: ${role.name}`);
        continue;
      }

      try {
        await tables.createRow({
          databaseId: databaseId,
          tableId: rolesTableId,
          rowId: ID.unique(),
          data: role,
        });

        console.log(`   ✅ Created role: ${role.name}`);
        seededCount++;
      } catch (error) {
        console.error(`   ❌ Failed to create role ${role.name}:`, error.message);
      }
    }

    console.log('\n✅ Roles seeding complete!');
    console.log(`   📊 Seeded ${seededCount} new roles`);
    console.log(`   📊 Total roles: ${existingRoles.rows.length + seededCount}`);
    console.log('\n🎉 You can now create the admin user');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

// Run seeding
seedRoles();
