#!/usr/bin/env node

/**
 * Seed Soil Types Script
 *
 * Seeds the soil_types table with default soil types for the Farm module.
 * This should be run after setup-appwrite.js but before using the farm module.
 *
 * Usage: npm run seed:soil-types
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
const soilTypesTableId = stripQuotes(process.env.APPWRITE_TABLE_SOIL_TYPES) || 'soil_types';

// ============================================
// DEFAULT SOIL TYPES
// ============================================

const defaultSoilTypes = [
  {
    name: 'Sandy',
    description: 'Light, warm, dry and tends to be acidic and low in nutrients. Drains quickly.',
    color_code: '#F4E4C1',
    is_system_default: true,
  },
  {
    name: 'Clay',
    description: 'Heavy, high in nutrients, wet and cold in winter, baking dry in summer.',
    color_code: '#8B7355',
    is_system_default: true,
  },
  {
    name: 'Loam',
    description: 'The ideal soil type. Mix of sand, silt and clay, fertile, well-drained.',
    color_code: '#5D4E37',
    is_system_default: true,
  },
  {
    name: 'Silt',
    description: 'Fertile, light, moisture-retentive, easy to compact.',
    color_code: '#A89F91',
    is_system_default: true,
  },
  {
    name: 'Peaty',
    description: 'High in organic matter, acidic, moist, slows decomposition.',
    color_code: '#3D2914',
    is_system_default: true,
  },
  {
    name: 'Chalky',
    description: 'Alkaline, stony, free-draining, low in nutrients.',
    color_code: '#D4D4D4',
    is_system_default: true,
  },
  {
    name: 'Other',
    description: 'Soil type not listed or mixed/composite soil.',
    color_code: '#9E9E9E',
    is_system_default: true,
  },
];

// ============================================
// MAIN SCRIPT
// ============================================

async function seedSoilTypes() {
  console.log('🌱 Starting Soil Types Seeding');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Project: ${projectId}`);
  console.log(`   Database: ${databaseId}`);
  console.log(`   Table: ${soilTypesTableId}`);

  if (!projectId || !apiKey) {
    console.error(
      '❌ Error: Missing VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_API_KEY in .env file',
    );
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tables = new TablesDB(client);

  try {
    // Check if soil_types table exists
    console.log('\n🔍 Verifying soil_types table exists...');
    try {
      await tables.getTable({
        databaseId: databaseId,
        tableId: soilTypesTableId,
      });
      console.log('   ✅ soil_types table found');
    } catch (error) {
      if (error.code === 404) {
        console.error(`   ❌ soil_types table "${soilTypesTableId}" not found`);
        console.error('      Please run setup:appwrite first to create the database schema');
        process.exit(1);
      }
      throw error;
    }

    // Check existing soil types
    console.log('\n🔍 Checking existing soil types...');
    const existingTypes = await tables.listRows({
      databaseId: databaseId,
      tableId: soilTypesTableId,
    });

    console.log(`   Found ${existingTypes.rows.length} existing soil types`);

    // Seed missing soil types
    console.log('\n📝 Seeding soil types...');
    let seededCount = 0;

    for (const soilType of defaultSoilTypes) {
      const existingType = existingTypes.rows.find((t) => t.name === soilType.name);

      if (existingType) {
        console.log(`   ⚠️  Soil type already exists: ${soilType.name}`);
        continue;
      }

      try {
        await tables.createRow({
          databaseId: databaseId,
          tableId: soilTypesTableId,
          rowId: ID.unique(),
          data: soilType,
        });

        console.log(`   ✅ Created soil type: ${soilType.name}`);
        seededCount++;
      } catch (error) {
        console.error(`   ❌ Failed to create soil type ${soilType.name}:`, error.message);
      }
    }

    console.log('\n✅ Soil types seeding complete!');
    console.log(`   📊 Seeded ${seededCount} new soil types`);
    console.log(`   📊 Total soil types: ${existingTypes.rows.length + seededCount}`);
    console.log('\n🎉 You can now use the farm module');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

// Run seeding
seedSoilTypes();
