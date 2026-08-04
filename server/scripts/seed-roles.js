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

// NOTE (Story 5.2): Farm Manager, Head Teacher and Village Head now include
// 'calendar:write' (Events Coordinator and System Administrator were already
// covered).
// NOTE (Story 5.3): storage_quota values now match AC1 exactly (System
// Administrator unlimited via -1; Village Head 20 GB; Deputy Village Head,
// Finance Manager, Farm Manager, Head Teacher 10 GB; Crop Manager and
// Village Resident 2 GB; Learner 1 GB; Guest 0.5 GB / 500 MB; unmapped roles
// default to the Resident tier of 2 GB). 'storage:read' and 'storage:write'
// were also added to every role (including Learner/Guest) since it is the
// storage_quota value, not the permission, that gates upload volume.
// NOTE (Story 5.4): additive shared-folder grants were added to the roles
// below (Finance Manager gets storage:finance:read/write; Council Member,
// Village Head and Deputy Village Head get storage:finance:read,
// storage:farm:read, storage:school:read and storage:village-docs:write;
// Farm Manager and Crop Manager get storage:farm:read/write; School
// Administrator, Head Teacher and Teacher get storage:school:read/write).
// This seeder is upsert-capable: when a role already exists by name, its
// permissions/storage_quota/category are updated to match the canonical
// definition below. Re-running this script keeps existing role rows in sync
// with the codebase (idempotent).
const defaultRoles = [
  {
    name: 'System Administrator',
    category: 'administration',
    permissions: ['*'],
    storage_quota: -1,
  },
  {
    name: 'Council Member',
    category: 'council',
    permissions: [
      'residents:read',
      'households:read',
      'households:write',
      'reports:read',
      'vendors:read',
      'storage:read',
      'storage:write',
      'storage:finance:read',
      'storage:farm:read',
      'storage:school:read',
      'storage:village-docs:write',
    ],
    storage_quota: 2,
  },
  {
    name: 'Farm Manager',
    category: 'farm',
    permissions: [
      'farm:read',
      'farm:write',
      'inventory:read',
      'reports:read',
      'calendar:write',
      'vendors:read',
      'storage:read',
      'storage:write',
      'storage:farm:read',
      'storage:farm:write',
    ],
    storage_quota: 10,
  },
  {
    name: 'Crop Manager',
    category: 'farm',
    permissions: [
      'farm:read',
      'farm:planting:write',
      'inventory:read',
      'vendors:read',
      'storage:read',
      'storage:write',
      'storage:farm:read',
      'storage:farm:write',
    ],
    storage_quota: 2,
  },
  {
    name: 'School Administrator',
    category: 'school',
    permissions: [
      'school:read',
      'school:write',
      'school:admin',
      'reports:read',
      'storage:read',
      'storage:write',
      'storage:school:read',
      'storage:school:write',
    ],
    storage_quota: 2,
  },
  {
    name: 'Head Teacher',
    category: 'school',
    permissions: [
      'school:read',
      'school:write',
      'school:admin',
      'reports:read',
      'calendar:write',
      'storage:read',
      'storage:write',
      'storage:school:read',
      'storage:school:write',
    ],
    storage_quota: 10,
  },
  {
    name: 'Teacher',
    category: 'school',
    permissions: [
      'school:read',
      'school:write',
      'storage:read',
      'storage:write',
      'storage:school:read',
      'storage:school:write',
    ],
    storage_quota: 2,
  },
  {
    name: 'Finance Manager',
    category: 'council',
    permissions: [
      'finance:read',
      'finance:write',
      'inventory:read',
      'inventory:write',
      'reports:read',
      'funding:write',
      'vendors:read',
      'vendors:write',
      'storage:read',
      'storage:write',
      'storage:finance:read',
      'storage:finance:write',
    ],
    storage_quota: 10,
  },
  {
    name: 'Village Head',
    category: 'council',
    permissions: [
      'residents:read',
      'households:read',
      'finance:read',
      'inventory:read',
      'farm:read',
      'reports:read',
      'calendar:write',
      'vendors:read',
      'storage:read',
      'storage:write',
      'storage:finance:read',
      'storage:farm:read',
      'storage:school:read',
      'storage:village-docs:write',
    ],
    storage_quota: 20,
  },
  {
    name: 'Village Resident',
    category: 'resident',
    permissions: ['profile:read', 'profile:write', 'storage:read', 'storage:write'],
    storage_quota: 2,
  },
  {
    name: 'Deputy Village Head',
    category: 'council',
    permissions: [
      'residents:read',
      'households:read',
      'finance:read',
      'inventory:read',
      'farm:read',
      'reports:read',
      'vendors:read',
      'storage:read',
      'storage:write',
      'storage:finance:read',
      'storage:farm:read',
      'storage:school:read',
      'storage:village-docs:write',
    ],
    storage_quota: 10,
  },
  {
    name: 'Events Coordinator',
    category: 'council',
    permissions: [
      'calendar:read',
      'calendar:write',
      'residents:read',
      'households:read',
      'storage:read',
      'storage:write',
    ],
    storage_quota: 2,
  },
  {
    name: 'Learner',
    category: 'school',
    permissions: ['school:read', 'profile:read', 'profile:write', 'storage:read', 'storage:write'],
    storage_quota: 1,
  },
  // {
  //   name: 'Guest',
  //   category: 'resident',
  //   permissions: ['profile:read', 'storage:read', 'storage:write'],
  //   storage_quota: 0.5,
  // },
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

    // Seed / upsert roles
    console.log('\n📝 Seeding roles...');
    let seededCount = 0;
    let updatedCount = 0;

    for (const role of defaultRoles) {
      const existingRole = existingRoles.rows.find((r) => r.name === role.name);

      if (existingRole) {
        try {
          await tables.updateRow({
            databaseId: databaseId,
            tableId: rolesTableId,
            rowId: existingRole.$id,
            data: {
              permissions: role.permissions,
              storage_quota: role.storage_quota,
              category: role.category,
            },
          });

          console.log(`   ✅ Updated role: ${role.name}`);
          updatedCount++;
        } catch (error) {
          console.error(`   ❌ Failed to update role ${role.name}:`, error.message);
        }
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
    console.log(`   📊 Updated ${updatedCount} existing roles`);
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
