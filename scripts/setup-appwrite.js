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

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const config = {
  endpoint: process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: process.env.VITE_APPWRITE_API_KEY,
  databaseId: 'villageDB',
};

// Validate configuration
if (!config.projectId) {
  console.error('❌ Error: VITE_APPWRITE_PROJECT_ID not found in .env file');
  process.exit(1);
}

if (!config.apiKey) {
  console.error('❌ Error: VITE_APPWRITE_API_KEY not found in .env file');
  console.error('   Please create an API key in the Appwrite console with Database permissions');
  console.error('   and add it to your .env file as: VITE_APPWRITE_API_KEY=your_api_key_here');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

// Table schemas
const tableSchemas = {
  users: {
    name: 'Users',
    columns: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true },
    ],
    indexes: [{ key: 'idx_users_email_unique', type: 'unique', attributes: ['email'] }],
  },
  residents: {
    name: 'Residents',
    columns: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'dob', type: 'datetime', required: false },
      {
        key: 'gender',
        type: 'enum',
        elements: ['Male', 'Female', 'Other'],
        default: 'Other',
        required: false,
      },
      { key: 'contact', type: 'string', size: 100, required: false },
      { key: 'household_id', type: 'string', size: 36, required: false },
      { key: 'role_ids', type: 'string', size: 36, array: true, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true },
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
      { key: 'head_resident_id', type: 'string', size: 36, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true },
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
      { key: 'permissions', type: 'string', size: 100, array: true, required: false },
      { key: 'storage_quota', type: 'integer', min: 0, max: 1000, default: 2, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true },
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
      { key: 'is_using_sample_data', type: 'boolean', required: true, default: false },
      { key: 'council_members', type: 'string', size: 10000, required: false },
      { key: 'modules_enabled', type: 'string', size: 500, array: true, required: false },
    ],
    indexes: [],
  },
};

// Helper functions
async function createCollection(collectionId, schema) {
  try {
    console.log(`\n📦 Creating collection: ${schema.name} (${collectionId})`);

    await databases.createCollection(
      config.databaseId,
      collectionId,
      schema.name,
      [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")',
      ], // Permissions for any authenticated user
      true, // Enabled
      false, // Document security (false = collection-level permissions)
    );

    console.log(`   ✅ Collection created: ${schema.name}`);
    return true;
  } catch (error) {
    if (error.code === 409) {
      console.log(`   ⚠️  Collection already exists: ${schema.name}`);
      return false;
    }
    throw error;
  }
}

async function createAttribute(collectionId, column) {
  try {
    const { key, type, size, required, array, elements, default: defaultValue, min, max } = column;

    console.log(`   📝 Creating column: ${key} (${type})`);

    switch (type) {
      case 'string':
        await databases.createStringAttribute(
          config.databaseId,
          collectionId,
          key,
          size,
          required,
          defaultValue,
          array || false,
        );
        break;

      case 'integer':
        await databases.createIntegerAttribute(
          config.databaseId,
          collectionId,
          key,
          required,
          min,
          max,
          defaultValue,
          array || false,
        );
        break;

      case 'datetime':
        await databases.createDatetimeAttribute(
          config.databaseId,
          collectionId,
          key,
          required,
          defaultValue,
          array || false,
        );
        break;

      case 'enum':
        await databases.createEnumAttribute(
          config.databaseId,
          collectionId,
          key,
          elements,
          required,
          defaultValue,
          array || false,
        );
        break;

      case 'boolean':
        await databases.createBooleanAttribute(
          config.databaseId,
          collectionId,
          key,
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

async function createIndex(collectionId, index) {
  try {
    console.log(`   🔍 Creating index: ${index.key}`);

    await databases.createIndex(
      config.databaseId,
      collectionId,
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

async function waitForAttributeCreation(collectionId, attributeKey, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const collection = await databases.getCollection(config.databaseId, collectionId);
      const attribute = collection.attributes.find((attr) => attr.key === attributeKey);

      if (attribute && attribute.status === 'available') {
        return true;
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`      ⚠️  Error checking attribute status: ${error.message}`);
    }
  }

  console.log(`      ⚠️  Timeout waiting for attribute: ${attributeKey}`);
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
      await databases.get(config.databaseId);
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
    for (const [collectionId, schema] of Object.entries(tableSchemas)) {
      const isNew = await createCollection(collectionId, schema);

      // Create attributes
      for (const column of schema.columns) {
        await createAttribute(collectionId, column);

        // Wait for attribute to be available before creating the next one
        if (isNew) {
          await waitForAttributeCreation(collectionId, column.key);
        }
      }

      // Create indexes (only after all attributes are created)
      if (schema.indexes.length > 0) {
        console.log(`   🔍 Creating indexes for ${schema.name}...`);
        for (const index of schema.indexes) {
          await createIndex(collectionId, index);
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
