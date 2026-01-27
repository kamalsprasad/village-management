#!/usr/bin/env node

/**
 * Village Settings Seed Script
 *
 * This script creates the default settings_root document in the village_settings table.
 * This document serves as the single source of truth for village configuration.
 *
 * Prerequisites:
 * - Appwrite project and database set up
 * - village_settings table created (run setup-appwrite.js first)
 * - API key with appropriate permissions
 * - Environment variables set in .env file
 *
 * Usage:
 *   node scripts/seed-village-settings.js
 *
 * Or via npm:
 *   npm run seed:settings
 */

import { Client, TablesDB } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Helper to strip quotes from env variables if present
const stripQuotes = (str) => {
  if (!str) return str;
  return str.replace(/^["']|["']$/g, '');
};

// Configuration
const config = {
  endpoint: stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1',
  projectId: stripQuotes(process.env.APPWRITE_PROJECT_ID),
  apiKey: stripQuotes(process.env.APPWRITE_API_KEY),
  databaseId: stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB',
  tableId: stripQuotes(process.env.APPWRITE_TABLE_VILLAGE_SETTINGS) || 'village_settings',
};

// Validate configuration
if (!config.projectId) {
  console.error('❌ Error: APPWRITE_PROJECT_ID not found in .env file');
  process.exit(1);
}

if (!config.apiKey) {
  console.error('❌ Error: APPWRITE_API_KEY not found in .env file');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const tables = new TablesDB(client);

// Default village settings
const defaultSettings = {
  village_name: 'My Village',
  address: '',
  established_date: null,
  default_currency: 'ZMW',
  currency_symbol: 'K',
  timezone: 'Africa/Lusaka',
  country_code: 'ZM',
  is_using_sample_data: false,
  council_member_ids: null,
  modules_enabled: ['residents', 'households', 'dashboard'],
};

async function seedVillageSettings() {
  console.log('🌱 Seeding Village Settings');
  console.log(`   Database: ${config.databaseId}`);
  console.log(`   Table: ${config.tableId}`);

  try {
    // Check if settings_root already exists
    console.log('\n🔍 Checking for existing settings...');
    try {
      const existing = await tables.getRow({
        databaseId: config.databaseId,
        tableId: config.tableId,
        rowId: 'settings_root',
      });

      console.log('   ⚠️  Settings already exist');
      console.log(`   Village: ${existing.village_name}`);
      console.log(`   Currency: ${existing.currency_symbol} (${existing.default_currency})`);
      console.log(`   Sample Data: ${existing.is_using_sample_data}`);
      console.log('\n✅ No action needed - settings_root already configured');
      return;
    } catch (error) {
      if (error.code !== 404) {
        throw error;
      }
      // Row doesn't exist, proceed with creation
      console.log('   ℹ️  No existing settings found, creating defaults...');
    }

    // Create settings_root row
    console.log('\n📝 Creating settings_root row...');
    const result = await tables.createRow({
      databaseId: config.databaseId,
      tableId: config.tableId,
      rowId: 'settings_root',
      data: defaultSettings,
    });

    console.log('   ✅ Settings created successfully!');
    console.log('\n📋 Default Settings:');
    console.log(`   Village Name: ${result.village_name}`);
    console.log(`   Currency: ${result.currency_symbol} (${result.default_currency})`);
    console.log(`   Timezone: ${result.timezone}`);
    console.log(`   Country: ${result.country_code}`);
    console.log(`   Sample Data Mode: ${result.is_using_sample_data}`);
    console.log(`   Modules Enabled: ${result.modules_enabled.join(', ')}`);
    console.log('\n🎉 Village settings seeded successfully!');
    console.log('   You can now customize these settings through the Village Settings page.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
}

// Run seeding
seedVillageSettings();
