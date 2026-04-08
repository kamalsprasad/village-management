#!/usr/bin/env node
/**
 * Seed Crops Script
 *
 * Seeds the crops table with 27 common Zambian crops.
 * This should be run after setup-appwrite.js but before using the crops database.
 *
 * Usage: npm run seed:crops
 */

import { Client, TablesDB, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Appwrite configuration
const endpoint = process.env.APPWRITE_ENDPOINT || 'http://localhost/v1';
const projectId = stripQuotes(process.env.APPWRITE_PROJECT_ID);
const apiKey = stripQuotes(process.env.APPWRITE_API_KEY);
const databaseId = stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB';
const cropsTableId = stripQuotes(process.env.APPWRITE_TABLE_CROPS) || 'crops';

// ============================================
// ZAMBIAN CROPS SEED DATA
// ============================================
const DEFAULT_CROPS = [
  // Grains (4)
  {
    crop_name: 'Maize',
    category: 'Grain',
    crop_type: 'Annual',
    maturity_days: 120,
    typical_yield_per_hectare: 3500,
    growing_season: 'Warm',
    notes: 'Staple crop in Zambia, requires adequate rainfall',
  },
  {
    crop_name: 'Sorghum',
    category: 'Grain',
    crop_type: 'Annual',
    maturity_days: 105,
    typical_yield_per_hectare: 2500,
    growing_season: 'Warm',
    notes: 'Drought-resistant grain',
  },
  {
    crop_name: 'Millet',
    category: 'Grain',
    crop_type: 'Annual',
    maturity_days: 90,
    typical_yield_per_hectare: 2000,
    growing_season: 'Warm',
    notes: 'Heat-tolerant grain',
  },
  {
    crop_name: 'Rice',
    category: 'Grain',
    crop_type: 'Annual',
    maturity_days: 150,
    typical_yield_per_hectare: 4500,
    growing_season: 'Wet',
    notes: 'Requires standing water or wetland conditions',
  },

  // Legumes (4)
  {
    crop_name: 'Groundnuts',
    category: 'Legume',
    crop_type: 'Annual',
    maturity_days: 100,
    typical_yield_per_hectare: 1800,
    growing_season: 'Warm',
    notes: 'Also known as peanuts, nitrogen-fixing crop',
  },
  {
    crop_name: 'Soybeans',
    category: 'Legume',
    crop_type: 'Annual',
    maturity_days: 110,
    typical_yield_per_hectare: 2200,
    growing_season: 'Warm',
    notes: 'High protein legume, good for crop rotation',
  },
  {
    crop_name: 'Cowpeas',
    category: 'Legume',
    crop_type: 'Annual',
    maturity_days: 75,
    typical_yield_per_hectare: 1500,
    growing_season: 'Warm',
    notes: 'Fast-growing, drought-tolerant legume',
  },
  {
    crop_name: 'Beans',
    category: 'Legume',
    crop_type: 'Annual',
    maturity_days: 80,
    typical_yield_per_hectare: 1400,
    growing_season: 'Warm',
    notes: 'Common dry beans for local consumption',
  },

  // Vegetables (6)
  {
    crop_name: 'Tomatoes',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 75,
    typical_yield_per_hectare: 25000,
    growing_season: 'All Year',
    notes: 'High-value vegetable, requires irrigation in dry season',
  },
  {
    crop_name: 'Cabbage',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 90,
    typical_yield_per_hectare: 40000,
    growing_season: 'Cool',
    notes: 'Cool-season vegetable, heavy feeder',
  },
  {
    crop_name: 'Rape',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 45,
    typical_yield_per_hectare: 8000,
    growing_season: 'Cool',
    notes: 'Fast-growing leafy green, also known as chibwabwa',
  },
  {
    crop_name: 'Onions',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 120,
    typical_yield_per_hectare: 20000,
    growing_season: 'Cool',
    notes: 'Longer growing season, good storage crop',
  },
  {
    crop_name: 'Pumpkin',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 100,
    typical_yield_per_hectare: 15000,
    growing_season: 'Warm',
    notes: 'Trailing vine, stores well',
  },
  {
    crop_name: 'Okra',
    category: 'Vegetable',
    crop_type: 'Annual',
    maturity_days: 55,
    typical_yield_per_hectare: 10000,
    growing_season: 'Warm',
    notes: 'Heat-loving vegetable, produces over extended period',
  },

  // Root Crops (3)
  {
    crop_name: 'Cassava',
    category: 'Root',
    crop_type: 'Annual',
    maturity_days: 365,
    typical_yield_per_hectare: 12000,
    growing_season: 'All Year',
    notes: 'Drought-tolerant staple, tubers harvested as needed',
  },
  {
    crop_name: 'Sweet Potato',
    category: 'Root',
    crop_type: 'Annual',
    maturity_days: 120,
    typical_yield_per_hectare: 14000,
    growing_season: 'All Year',
    notes: 'Fast-growing, nutritious root crop',
  },
  {
    crop_name: 'Irish Potato',
    category: 'Root',
    crop_type: 'Annual',
    maturity_days: 90,
    typical_yield_per_hectare: 20000,
    growing_season: 'Cool',
    notes: 'Cool-season crop, requires good soil drainage',
  },

  // Fruits (5)
  {
    crop_name: 'Banana',
    category: 'Fruit',
    crop_type: 'Perennial',
    maturity_days: 365,
    harvest_frequency: 365,
    typical_yield_per_hectare: 25000,
    growing_season: 'All Year',
    notes: 'Year-round production, requires ample water',
  },
  {
    crop_name: 'Mango',
    category: 'Fruit',
    crop_type: 'Perennial',
    maturity_days: 1825, // 5 years to first fruit
    harvest_frequency: 365,
    typical_yield_per_hectare: 8000,
    growing_season: 'Warm',
    notes: 'Long-term investment, fruiting typically 2-5 years depending on variety',
  },
  {
    crop_name: 'Papaya',
    category: 'Fruit',
    crop_type: 'Perennial',
    maturity_days: 270, // 9 months to first fruit
    harvest_frequency: 90,
    typical_yield_per_hectare: 30000,
    growing_season: 'All Year',
    notes: 'Fast to fruit, continuous harvest',
  },
  {
    crop_name: 'Guava',
    category: 'Fruit',
    crop_type: 'Perennial',
    maturity_days: 730, // 2 years to first fruit
    harvest_frequency: 120,
    typical_yield_per_hectare: 10000,
    growing_season: 'All Year',
    notes: 'Hardy fruit tree, multiple harvests per year',
  },
  {
    crop_name: 'Orange',
    category: 'Fruit',
    crop_type: 'Perennial',
    maturity_days: 1095, // 3 years to first fruit
    harvest_frequency: 365,
    typical_yield_per_hectare: 12000,
    growing_season: 'All Year',
    notes: 'Citrus fruit, good for vitamin C, fruiting typically 2-3 years',
  },

  // Perennials (2)
  {
    crop_name: 'Moringa',
    category: 'Other',
    crop_type: 'Perennial',
    maturity_days: 240,
    harvest_frequency: 60,
    typical_yield_per_hectare: 8000,
    growing_season: 'All Year',
    notes: 'Nutrient-dense leaves, fast-growing perennial',
  },
  {
    crop_name: 'Mulberry',
    category: 'Other',
    crop_type: 'Perennial',
    maturity_days: 365,
    harvest_frequency: 90,
    typical_yield_per_hectare: 5000,
    growing_season: 'All Year',
    notes: 'Fruit and fodder tree, supports silk production',
  },

  // Other (3)
  {
    crop_name: 'Sunflower',
    category: 'Other',
    crop_type: 'Annual',
    maturity_days: 100,
    typical_yield_per_hectare: 2000,
    growing_season: 'Warm',
    notes: 'Oil seed crop, also attracts pollinators',
  },
  {
    crop_name: 'Sugarcane',
    category: 'Other',
    crop_type: 'Perennial',
    maturity_days: 365,
    harvest_frequency: 365,
    typical_yield_per_hectare: 80000,
    growing_season: 'All Year',
    notes: 'High-yield cash crop, requires abundant water',
  },
  {
    crop_name: 'Cotton',
    category: 'Other',
    crop_type: 'Annual',
    maturity_days: 180,
    typical_yield_per_hectare: 2500,
    growing_season: 'Warm',
    notes: 'Cash crop, requires careful pest management',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function stripQuotes(value) {
  if (!value) return '';
  return value.replace(/^["'](.*)["']$/, '$1');
}

function validateEnvironment() {
  const errors = [];

  if (!projectId) {
    errors.push('APPWRITE_PROJECT_ID is required');
  }
  if (!apiKey) {
    errors.push('APPWRITE_API_KEY is required');
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:\n');
    errors.forEach((error) => console.error(`   - ${error}`));
    console.error('\nPlease check your .env file or environment variables.\n');
    process.exit(1);
  }
}

// ============================================
// SEEDING FUNCTION
// ============================================

async function seedCrops() {
  console.log('\n🌱 Starting Crops Database Seeding...\n');

  validateEnvironment();

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const tables = new TablesDB(client);

  try {
    // Check if crops table exists
    console.log('\n🔍 Verifying crops table exists...');
    try {
      await tables.getTable({
        databaseId: databaseId,
        tableId: cropsTableId,
      });
      console.log('   ✅ crops table found');
    } catch (error) {
      if (error.code === 404) {
        console.error(`   ❌ crops table "${cropsTableId}" not found`);
        console.error('      Please run setup:appwrite first to create the database schema');
        process.exit(1);
      }
      throw error;
    }

    // Check for existing crops to avoid duplicates
    console.log('\n📊 Checking existing crops...');
    const existingCrops = await tables.listRows({
      databaseId: databaseId,
      tableId: cropsTableId,
    });

    const existingNames = new Set(existingCrops.rows.map((c) => c.crop_name.toLowerCase()));

    console.log(`   Found ${existingCrops.rows.length} existing crops`);

    // Seed crops
    let created = 0;
    let skipped = 0;

    console.log('\n🌾 Seeding crops...\n');

    for (const cropData of DEFAULT_CROPS) {
      const lowerName = cropData.crop_name.toLowerCase();

      if (existingNames.has(lowerName)) {
        console.log(`   ⏭️  Skipping "${cropData.crop_name}" (already exists)`);
        skipped++;
        continue;
      }

      try {
        await tables.createRow({
          databaseId: databaseId,
          tableId: cropsTableId,
          rowId: ID.unique(),
          data: {
            ...cropData,
            is_active: true,
          },
        });
        console.log(
          `   ✅ Created "${cropData.crop_name}" (${cropData.category}, ${cropData.crop_type})`,
        );
        created++;
      } catch (error) {
        console.error(`   ❌ Failed to create "${cropData.crop_name}": ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 Seeding Summary:');
    console.log('='.repeat(50));
    console.log(`   ✅ Created: ${created} crops`);
    console.log(`   ⏭️  Skipped: ${skipped} crops (already exist)`);
    console.log(`   📦 Total in database: ${existingCrops.rows.length + created} crops`);
    console.log('='.repeat(50));

    if (created > 0) {
      console.log('\n🎉 Successfully seeded crops database!');
      console.log('\n📚 Crop Categories:');
      const categories = {};
      DEFAULT_CROPS.forEach((c) => {
        categories[c.category] = (categories[c.category] || 0) + 1;
      });
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} crops`);
      });
    } else {
      console.log('\n✅ All crops already exist. Database is up to date.');
    }

    console.log('\nNext steps:');
    console.log('   - Verify crops in the application at /farm/crops');
    console.log('   - Admins can add custom crops via the Crop Database page');
    console.log('   - Farm Managers can view crops and select for plantings');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

// Run the seeding
seedCrops();
