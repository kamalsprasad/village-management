/**
 * Seed Funding Sources Script (Story 2.4)
 *
 * Seeds default funding sources for the Village Management System.
 * Run this script after validate-schema-epic-2.js to populate initial sources.
 *
 * Usage: node server/scripts/seed-funding-sources.js
 */

import { Client, TablesDB, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from server .env
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

// Validate Config
if (!config.apiKey) {
  console.error('❌ Error: APPWRITE_API_KEY not found in server/.env file');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const tables = new TablesDB(client);

const FUNDING_SOURCES_TABLE = 'funding_sources';

/**
 * Default funding sources for the Village Management System
 *
 * Types: grant, donation, income, loan
 * Status: active, inactive, depleted
 */
const DEFAULT_FUNDING_SOURCES = [
  {
    name: 'General Village Fund',
    type: 'income',
    total_received: 0,
    current_balance: 0,
    date_received: null,
    restrictions: null,
    status: 'active',
  },
  {
    name: 'Global Village Foundation Grant',
    type: 'grant',
    total_received: 50000.0,
    current_balance: 50000.0,
    date_received: new Date().toISOString(),
    restrictions: 'For community development projects only. Must be used within 12 months.',
    status: 'active',
  },
  {
    name: 'Agricultural Development Fund',
    type: 'grant',
    total_received: 25000.0,
    current_balance: 25000.0,
    date_received: new Date().toISOString(),
    restrictions: 'For farm inputs, equipment, and agricultural training only.',
    status: 'active',
  },
  {
    name: 'Education Support Fund',
    type: 'donation',
    total_received: 15000.0,
    current_balance: 15000.0,
    date_received: new Date().toISOString(),
    restrictions: 'For school supplies, teacher salaries, and student support.',
    status: 'active',
  },
  {
    name: 'Emergency Relief Fund',
    type: 'donation',
    total_received: 5000.0,
    current_balance: 5000.0,
    date_received: new Date().toISOString(),
    restrictions: 'For emergency situations only. Requires council approval.',
    status: 'active',
  },
];

async function seedFundingSources() {
  console.log('🌱 Starting Funding Sources Seeding...');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);
  console.log(`   Database: ${config.databaseId}`);

  try {
    // Check if funding sources already exist
    const existingSources = await tables.listRows({
      databaseId: config.databaseId,
      tableId: FUNDING_SOURCES_TABLE,
      queries: [Query.limit(1)],
    });

    if (existingSources.total > 0) {
      console.log(`\n⚠️  Funding sources already exist (${existingSources.total} found).`);
      console.log('   To re-seed, delete existing sources first.');
      console.log('   Skipping seeding to prevent duplicates.\n');
      return;
    }

    console.log(`\n📂 Seeding ${DEFAULT_FUNDING_SOURCES.length} default funding sources...\n`);

    let grantCount = 0;
    let donationCount = 0;
    let incomeCount = 0;
    let loanCount = 0;

    for (const source of DEFAULT_FUNDING_SOURCES) {
      const newSource = await tables.createRow({
        databaseId: config.databaseId,
        tableId: FUNDING_SOURCES_TABLE,
        rowId: ID.unique(),
        data: source,
      });

      // Count by type
      switch (source.type) {
        case 'grant':
          grantCount++;
          break;
        case 'donation':
          donationCount++;
          break;
        case 'income':
          incomeCount++;
          break;
        case 'loan':
          loanCount++;
          break;
      }

      const balanceStr =
        source.current_balance > 0
          ? `Balance: ZMW ${source.current_balance.toLocaleString()}`
          : 'No initial balance';

      console.log(`   ✅ [${source.type.toUpperCase()}] ${newSource.name} (${balanceStr})`);
    }

    console.log(`\n✨ Seeding Complete!`);
    console.log(`   Grants: ${grantCount}`);
    console.log(`   Donations: ${donationCount}`);
    console.log(`   Income Sources: ${incomeCount}`);
    console.log(`   Loans: ${loanCount}`);
    console.log(`   Total: ${DEFAULT_FUNDING_SOURCES.length}\n`);

    // Calculate total available balance
    const totalBalance = DEFAULT_FUNDING_SOURCES.reduce((sum, s) => sum + s.current_balance, 0);
    console.log(`   💰 Total Available Balance: ZMW ${totalBalance.toLocaleString()}\n`);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
}

seedFundingSources();
