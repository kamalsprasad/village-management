/**
 * Seed Finance Categories Script (Story 2.3)
 *
 * Seeds default income and expense categories as per AC#7.
 * Run this script after validate-schema-epic-2.js to populate initial categories.
 *
 * Usage: node server/scripts/seed-finance-categories.js
 */

import { Client, TablesDB, ID, Query } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from server .env
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

const FINANCE_CATEGORIES_TABLE = 'finance_categories';

/**
 * Default categories as per Story 2.3 AC#7
 *
 * Income: Farm Sales, Guest Payments, Donations, Grants, Loan Repayments
 * Expense: Farm Inputs, School Supplies, Equipment, Utilities, Salaries, Maintenance
 */
const DEFAULT_CATEGORIES = [
  // Income Categories
  {
    name: 'Farm Sales',
    type: 'income',
    subcategories: ['Crops', 'Livestock', 'Dairy', 'Eggs', 'Honey', 'Other'],
  },
  {
    name: 'Guest Payments',
    type: 'income',
    subcategories: ['Room Rental', 'Meals', 'Events', 'Other'],
  },
  {
    name: 'Donations',
    type: 'income',
    subcategories: ['Individual', 'Corporate', 'Foundation', 'In-Kind', 'Other'],
  },
  {
    name: 'Grants',
    type: 'income',
    subcategories: ['Government', 'NGO', 'International', 'Research', 'Other'],
  },
  {
    name: 'Loan Repayments',
    type: 'income',
    subcategories: ['Principal', 'Interest', 'Other'],
  },

  // Expense Categories
  {
    name: 'Farm Inputs',
    type: 'expense',
    subcategories: ['Seeds', 'Fertilizer', 'Pesticides', 'Animal Feed', 'Veterinary', 'Other'],
  },
  {
    name: 'School Supplies',
    type: 'expense',
    subcategories: ['Books', 'Stationery', 'Uniforms', 'Equipment', 'Other'],
  },
  {
    name: 'Equipment',
    type: 'expense',
    subcategories: [
      'Farm Equipment',
      'Office Equipment',
      'Kitchen Equipment',
      'Maintenance Tools',
      'Other',
    ],
  },
  {
    name: 'Utilities',
    type: 'expense',
    subcategories: ['Electricity', 'Water', 'Internet', 'Phone', 'Fuel', 'Other'],
  },
  {
    name: 'Salaries',
    type: 'expense',
    subcategories: ['Staff', 'Teachers', 'Farm Workers', 'Contractors', 'Other'],
  },
  {
    name: 'Maintenance',
    type: 'expense',
    subcategories: ['Buildings', 'Vehicles', 'Equipment', 'Grounds', 'Other'],
  },
];

async function seedCategories() {
  console.log('🌱 Starting Finance Categories Seeding...');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);
  console.log(`   Database: ${config.databaseId}`);

  try {
    // Check if categories already exist
    const existingCategories = await tables.listRows({
      databaseId: config.databaseId,
      tableId: FINANCE_CATEGORIES_TABLE,
      queries: [Query.limit(1)],
    });

    if (existingCategories.total > 0) {
      console.log(`\n⚠️  Categories already exist (${existingCategories.total} found).`);
      console.log('   To re-seed, delete existing categories first.');
      console.log('   Skipping seeding to prevent duplicates.\n');
      return;
    }

    console.log(`\n📂 Seeding ${DEFAULT_CATEGORIES.length} default categories...\n`);

    let incomeCount = 0;
    let expenseCount = 0;

    for (const category of DEFAULT_CATEGORIES) {
      const newCategory = await tables.createRow({
        databaseId: config.databaseId,
        tableId: FINANCE_CATEGORIES_TABLE,
        rowId: ID.unique(),
        data: {
          name: category.name,
          type: category.type,
          subcategories: category.subcategories,
        },
      });

      if (category.type === 'income') {
        incomeCount++;
        console.log(
          `   ✅ [Income] ${newCategory.name} (${category.subcategories.length} subcategories)`,
        );
      } else {
        expenseCount++;
        console.log(
          `   ✅ [Expense] ${newCategory.name} (${category.subcategories.length} subcategories)`,
        );
      }
    }

    console.log(`\n✨ Seeding Complete!`);
    console.log(`   Income Categories: ${incomeCount}`);
    console.log(`   Expense Categories: ${expenseCount}`);
    console.log(`   Total: ${DEFAULT_CATEGORIES.length}\n`);
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
}

seedCategories();
