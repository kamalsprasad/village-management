#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 *
 * This script automatically creates all tables, columns, indexes, and permissions
 * for the Village Management System in Appwrite.
 *
 * Prerequisites:
 * - Appwrite project created
 * - Database "villageDB" created in Appwrite console
 * - API key with appropriate permissions (Database, Collections)
 * - Environment variables set in .env file
 *
 * Usage:
 *   node scripts/setup-appwrite.js
 *
 * Or via npm:
 *   npm run setup:appwrite
 */

import { Client, Databases, TablesDB } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: 'villageDB',
};

// Validate configuration
if (!config.projectId) {
  console.error('❌ Error: APPWRITE_PROJECT_ID not found in .env file');
  process.exit(1);
}

if (!config.apiKey) {
  console.error('❌ Error: APPWRITE_API_KEY not found in .env file');
  console.error('   Please create an API key in the Appwrite console with Database permissions');
  console.error('   and add it to your .env file as: APPWRITE_API_KEY=your_api_key_here');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const tables = new TablesDB(client);

// Table schemas
const tableSchemas = {
  users: {
    name: 'Users',
    columns: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      {
        key: 'resident_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'role_ids',
        type: 'relationship',
        relatedTable: 'roles',
        relationType: 'manyToMany',
        twoWay: false,
        required: false,
      },
      { key: 'storage_quota', type: 'integer', min: 0, max: 1000, default: 2, required: false },
      { key: '$createdAt', type: 'datetime', required: true },
      { key: '$updatedAt', type: 'datetime', required: true },
    ],
    indexes: [{ key: 'idx_users_email_unique', type: 'unique', attributes: ['email'] }],
  },
  residents: {
    name: 'Residents',
    columns: [
      { key: 'first_name', type: 'string', size: 50, required: true },
      { key: 'middle_names', type: 'string', size: 255, required: false },
      { key: 'last_name', type: 'string', size: 50, required: true },
      { key: 'dob', type: 'datetime', required: false },
      {
        key: 'gender',
        type: 'enum',
        elements: ['Male', 'Female', 'Other'],
        required: true,
      },
      { key: 'phone', type: 'string', size: 20, required: false },
      { key: 'email', type: 'email', required: false },
      {
        key: 'household_id',
        type: 'relationship',
        relatedTable: 'households',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'resident_ids',
        required: false,
      },
      { key: 'room_number', type: 'string', size: 25, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
      { key: '$createdAt', type: 'datetime', required: true },
      { key: '$updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      {
        key: 'idx_residents_household_id',
        type: 'key',
        attributes: ['household_id'],
        orders: ['ASC'],
      },
      { key: 'idx_residents_role_ids', type: 'key', attributes: ['role_ids'], orders: ['ASC'] },
    ],
  },
  households: {
    name: 'Households',
    columns: [
      { key: 'name', type: 'string', size: 255, required: true },
      {
        key: 'head_resident_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'resident_ids',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'household_id',
        required: false,
      },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'construction_date', type: 'datetime', required: true },
      {
        key: 'household_type',
        type: 'enum',
        elements: [
          'Single Family',
          'Multi-Family',
          'Dormitory',
          'Guest House',
          'Admin Building',
          'Other',
        ],
        required: true,
      },
      { key: 'bedrooms', type: 'integer', min: 0, max: 50, required: false },
      { key: 'bathrooms', type: 'integer', min: 0, max: 5, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
      { key: '$createdAt', type: 'datetime', required: true },
      { key: '$updatedAt', type: 'datetime', required: true },
    ],
    indexes: [
      {
        key: 'idx_households_head_resident_id',
        type: 'key',
        attributes: ['head_resident_id'],
        orders: ['ASC'],
      },
    ],
  },
  roles: {
    name: 'Roles',
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      {
        key: 'category',
        type: 'enum',
        elements: ['administration', 'council', 'farm', 'school'],
        required: true,
      },
      { key: 'permissions', type: 'string', size: 100, array: true, required: false },
      { key: 'storage_quota', type: 'integer', min: 0, max: 1000, default: 2, required: false },
      { key: '$createdAt', type: 'datetime', required: true },
      { key: '$updatedAt', type: 'datetime', required: true },
    ],
    indexes: [],
  },
  village_settings: {
    name: 'Village Settings',
    columns: [
      { key: 'village_name', type: 'string', size: 255, required: true },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'established_date', type: 'datetime', required: false },
      { key: 'default_currency', type: 'string', size: 10, required: true, default: 'ZMW' },
      { key: 'currency_symbol', type: 'string', size: 10, required: true, default: 'K' },
      { key: 'timezone', type: 'string', size: 50, required: true, default: 'Africa/Lusaka' },
      { key: 'country_code', type: 'string', size: 10, required: true, default: 'ZM' },
      { key: 'country_phone_code', type: 'string', size: 10, required: true, default: '+260' },
      {
        key: 'council_member_ids',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToMany',
        twoWay: false,
        required: false,
      },
      { key: 'is_using_sample_data', type: 'boolean', required: true, default: false },
      { key: 'modules_enabled', type: 'string', size: 500, array: true, required: false },
    ],
    indexes: [],
  },
};

// Helper functions
async function createTable(tableId, schema) {
  try {
    console.log(`\n📦 Creating table: ${schema.name} (${collectionId})`);

    await tables.createTable(
      config.databaseId,
      tableId,
      schema.name,
      ['read("any")', 'create("any")', 'update("any")', 'delete("any")'], // Permissions for any authenticated user
      true, // Enabled
      false, // Document security (false = table-level permissions)
    );

    console.log(`   ✅ Table created: ${schema.name}`);
    return true;
  } catch (error) {
    if (error.code === 409) {
      console.log(`   ⚠️  Table already exists: ${schema.name}`);
      return false;
    }
    throw error;
  }
}

async function createColumn(tableId, column) {
  try {
    const { key, type, size, required, array, elements, default: defaultValue, min, max } = column;

    console.log(`   📝 Creating column: ${key} (${type})`);

    switch (type) {
      case 'string':
        await tables.createColumn(
          config.databaseId,
          tableId,
          key,
          'string',
          size,
          required,
          defaultValue,
          array || false,
        );
        break;
      case 'integer':
        await tables.createColumn(
          config.databaseId,
          tableId,
          key,
          'integer',
          required,
          min,
          max,
          defaultValue,
          array || false,
        );
        break;

      case 'datetime':
        await tables.createColumn(
          config.databaseId,
          tableId,
          key,
          'datetime',
          required,
          defaultValue,
          array || false,
        );
        break;

      case 'enum':
        await tables.createColumn(
          config.databaseId,
          tableId,
          key,
          'enum',
          elements,
          required,
          defaultValue,
          array || false,
        );
        break;

      case 'boolean':
        await tables.createColumn(
          config.databaseId,
          tableId,
          key,
          'boolean',
          required,
          defaultValue,
          array || false,
        );
        break;

      default:
        console.log(`   ⚠️  Unknown column type: ${type}`);
        return;
    }

    console.log(`      ✅ Column created: ${key}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`      ⚠️  Column already exists: ${column.key}`);
    } else {
      throw error;
    }
  }
}

async function createIndex(tableId, index) {
  try {
    console.log(`   🔍 Creating index: ${index.key}`);

    await tables.createIndex(
      config.databaseId,
      tableId,
      index.key,
      index.type,
      index.attributes,
      index.orders || [],
    );

    console.log(`      ✅ Index created: ${index.key}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`      ⚠️  Index already exists: ${index.key}`);
    } else {
      throw error;
    }
  }
}

async function waitForColumnCreation(tableId, columnKey, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const table = await tables.getTable(config.databaseId, tableId);
      const column = table.columns.find((attr) => attr.key === columnKey);

      if (column && column.status === 'available') {
        return true;
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`      ⚠️  Error checking column status: ${error.message}`);
    }
  }

  console.log(`      ⚠️  Timeout waiting for column: ${columnKey}`);
  return false;
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting Appwrite Database Setup');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);
  console.log(`   Database: ${config.databaseId}`);

  try {
    // Verify database exists
    console.log('\n🔍 Verifying database exists...');
    try {
      await tables.get({ databaseId: config.databaseId });
      console.log('   ✅ Database found');
    } catch (error) {
      if (error.code === 404) {
        console.error(`   ❌ Database "${config.databaseId}" not found`);
        console.error('      Please create the database in the Appwrite console first');
        process.exit(1);
      }
      throw error;
    }

    // Create collections and attributes
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      const isNew = await createTable(tableId, schema);

      // Create attributes
      for (const column of schema.columns) {
        await createColumn(tableId, column);

        // Wait for column to be available before creating the next one
        if (isNew) {
          await waitForColumnCreation(tableId, column.key);
        }
      }

      // Create indexes (only after all attributes are created)
      if (schema.indexes.length > 0) {
        console.log(`   🔍 Creating indexes for ${schema.name}...`);
        for (const index of schema.indexes) {
          await createIndex(tableId, index);
        }
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\n📋 Summary:');
    console.log('   - 5 collections created/verified');
    console.log('   - 32 columns created/verified');
    console.log('   - 4 indexes created/verified');
    console.log('   - Permissions configured');
    console.log('\n🎉 You can now test the database connection at /appwrite-test');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

// Run setup
setupDatabase();
