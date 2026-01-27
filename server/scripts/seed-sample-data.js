/**
 * Seed Sample Data Script
 *
 * Seeds the Katete Model Village sample data for development and testing.
 * This script mirrors the client-side seeding logic in useSampleData.js.
 *
 * Usage: npm run seed:sample
 *
 * Prerequisites:
 * - Appwrite project configured
 * - Database schema created (run setup:appwrite first)
 * - .env file with APPWRITE_API_KEY
 */

import 'dotenv/config';
import { Client, Databases, ID } from 'node-appwrite';

// Helper to strip quotes from env variables if present
const stripQuotes = (str) => {
  if (!str) return str;
  return str.replace(/^["']|["']$/g, '');
};

// ============================================
// CONFIGURATION
// ============================================

const endpoint = stripQuotes(process.env.VITE_APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1';
const projectId = stripQuotes(process.env.VITE_APPWRITE_PROJECT_ID);
const apiKey = stripQuotes(process.env.APPWRITE_API_KEY);
const databaseId = stripQuotes(process.env.VITE_APPWRITE_DATABASE_ID) || 'villageDB';

const TABLES = {
  households: stripQuotes(process.env.VITE_APPWRITE_TABLE_HOUSEHOLDS) || 'households',
  residents: stripQuotes(process.env.VITE_APPWRITE_TABLE_RESIDENTS) || 'residents',
  settings: stripQuotes(process.env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS) || 'village_settings',
};

// ============================================
// SAMPLE DATA DEFINITIONS
// ============================================

const sampleVillageSettings = {
  village_name: 'Katete Model Village',
  address: 'Katete District, Eastern Province, Zambia',
  established_date: new Date('2020-03-15T00:00:00Z').toISOString(),
  default_currency: 'ZMW',
  currency_symbol: 'K',
  timezone: 'Africa/Lusaka',
  country_code: 'ZM',
  country_phone_code: '+260',
  is_using_sample_data: true,
  modules_enabled: ['residents', 'households', 'dashboard', 'finance', 'inventory'],
  council_member_ids: [], // Will be populated after residents are created
};

const sampleHouseholds = [
  {
    name: 'Banda Family Home',
    household_type: 'SingleFamily',
    construction_date: new Date('2019-06-15T00:00:00Z').toISOString(),
    bedrooms: 3,
    bathrooms: 1,
    notes: 'Main family residence near the village center.',
  },
  {
    name: 'Phiri Family Home',
    household_type: 'SingleFamily',
    construction_date: new Date('2020-02-20T00:00:00Z').toISOString(),
    bedrooms: 4,
    bathrooms: 2,
    notes: 'Two-story home with garden area.',
  },
  {
    name: 'Mwale Extended Family Compound',
    household_type: 'MultiFamily',
    construction_date: new Date('2018-11-10T00:00:00Z').toISOString(),
    bedrooms: 6,
    bathrooms: 3,
    notes: 'Large compound housing multiple generations of the Mwale family.',
  },
  {
    name: 'Staff Quarters',
    household_type: 'Dormitory',
    construction_date: new Date('2021-01-05T00:00:00Z').toISOString(),
    bedrooms: 8,
    bathrooms: 4,
    notes: 'Housing for village staff and workers.',
  },
  {
    name: 'Village Administration Office',
    household_type: 'AdminBuilding',
    construction_date: new Date('2019-09-01T00:00:00Z').toISOString(),
    bedrooms: 0,
    bathrooms: 2,
    notes: 'Administrative building with meeting rooms and offices.',
  },
  {
    name: 'Visitor Accommodation',
    household_type: 'GuestHouse',
    construction_date: new Date('2021-08-20T00:00:00Z').toISOString(),
    bedrooms: 4,
    bathrooms: 2,
    notes: 'Guest house for visitors and volunteers.',
  },
];

const sampleResidents = [
  // Banda Family (Household 0)
  {
    first_name: 'Joseph',
    middle_names: 'Chanda',
    last_name: 'Banda',
    dob: '1965-03-12',
    gender: 'Male',
    householdIndex: 0,
    phone: '+260971234567',
    notes: 'Village Head. Founding member of Katete Model Village.',
    isCouncilMember: true,
  },
  {
    first_name: 'Mary',
    middle_names: 'Nkandu',
    last_name: 'Banda',
    dob: '1970-07-22',
    gender: 'Female',
    householdIndex: 0,
    notes: "Joseph's wife. Active in women's cooperative.",
  },
  {
    first_name: 'Grace',
    middle_names: '',
    last_name: 'Banda',
    dob: '1995-11-08',
    gender: 'Female',
    householdIndex: 0,
    notes: 'Eldest daughter. Primary school teacher.',
  },
  {
    first_name: 'Peter',
    middle_names: 'Mumba',
    last_name: 'Banda',
    dob: '2005-04-15',
    gender: 'Male',
    householdIndex: 0,
    notes: 'Youngest child. Currently in secondary school.',
  },

  // Phiri Family (Household 1)
  {
    first_name: 'Emmanuel',
    middle_names: 'Tembo',
    last_name: 'Phiri',
    dob: '1972-09-30',
    gender: 'Male',
    householdIndex: 1,
    phone: '+260972345678',
    notes: 'Deputy Village Head. Agricultural specialist.',
    isCouncilMember: true,
  },
  {
    first_name: 'Ruth',
    middle_names: 'Mwila',
    last_name: 'Phiri',
    dob: '1978-01-14',
    gender: 'Female',
    householdIndex: 1,
    notes: "Emmanuel's wife. Runs the village health clinic.",
  },
  {
    first_name: 'David',
    middle_names: '',
    last_name: 'Phiri',
    dob: '2000-06-25',
    gender: 'Male',
    householdIndex: 1,
    notes: 'Son. University student studying agriculture.',
  },
  {
    first_name: 'Sarah',
    middle_names: 'Chipo',
    last_name: 'Phiri',
    dob: '2008-12-03',
    gender: 'Female',
    householdIndex: 1,
    notes: 'Daughter. Primary school student.',
  },

  // Mwale Extended Family (Household 2)
  {
    first_name: 'James',
    middle_names: 'Bwalya',
    last_name: 'Mwale',
    dob: '1968-05-18',
    gender: 'Male',
    householdIndex: 2,
    phone: '+260973456789',
    notes: 'Finance Manager. Former bank employee.',
    isCouncilMember: true,
  },
  {
    first_name: 'Elizabeth',
    middle_names: 'Mutale',
    last_name: 'Mwale',
    dob: '1975-08-07',
    gender: 'Female',
    householdIndex: 2,
    notes: "James's wife. Manages village store.",
  },
  {
    first_name: 'John',
    middle_names: '',
    last_name: 'Mwale',
    dob: '1998-02-28',
    gender: 'Male',
    householdIndex: 2,
    notes: 'Son. Works in village maintenance.',
  },
  {
    first_name: 'Martha',
    middle_names: 'Kasonde',
    last_name: 'Mwale',
    dob: '2002-10-11',
    gender: 'Female',
    householdIndex: 2,
    notes: 'Daughter. Vocational training student.',
  },
  {
    first_name: 'Paul',
    middle_names: 'Chilufya',
    last_name: 'Mwale',
    dob: '2010-07-19',
    gender: 'Male',
    householdIndex: 2,
    notes: 'Youngest son. Primary school student.',
  },

  // Tembo Family (Staff Quarters - Household 3)
  {
    first_name: 'Michael',
    middle_names: 'Zulu',
    last_name: 'Tembo',
    dob: '1985-04-02',
    gender: 'Male',
    householdIndex: 3,
    room_number: 'Room 1',
    notes: 'Village security coordinator.',
  },
  {
    first_name: 'Rebecca',
    middle_names: '',
    last_name: 'Tembo',
    dob: '1988-11-25',
    gender: 'Female',
    householdIndex: 3,
    room_number: 'Room 1',
    notes: "Michael's wife. Kitchen staff.",
  },

  // Zulu Family (Staff Quarters - Household 3)
  {
    first_name: 'Daniel',
    middle_names: 'Mulenga',
    last_name: 'Zulu',
    dob: '1990-01-30',
    gender: 'Male',
    householdIndex: 3,
    room_number: 'Room 3',
    notes: 'Farm supervisor.',
  },
  {
    first_name: 'Esther',
    middle_names: 'Nachilima',
    last_name: 'Zulu',
    dob: '1992-06-14',
    gender: 'Female',
    householdIndex: 3,
    room_number: 'Room 3',
    notes: "Daniel's wife. Childcare worker.",
  },
  {
    first_name: 'Samuel',
    middle_names: '',
    last_name: 'Zulu',
    dob: '2018-03-08',
    gender: 'Male',
    householdIndex: 3,
    room_number: 'Room 3',
    notes: 'Young child.',
  },

  // Mulenga Family (Guest House - Household 5)
  {
    first_name: 'Andrew',
    middle_names: 'Kapembwa',
    last_name: 'Mulenga',
    dob: '1982-12-05',
    gender: 'Male',
    householdIndex: 5,
    room_number: 'Room 2',
    notes: 'Visiting agricultural consultant.',
  },
  {
    first_name: 'Priscilla',
    middle_names: 'Monde',
    last_name: 'Mulenga',
    dob: '1986-09-17',
    gender: 'Female',
    householdIndex: 5,
    room_number: 'Room 2',
    notes: "Andrew's wife. Visiting nurse.",
  },
];

// ============================================
// MAIN SEEDING FUNCTION
// ============================================

async function seedSampleData() {
  console.log('🌱 Starting sample data seeding...\n');

  // Validate configuration
  if (!projectId || !apiKey) {
    console.error('❌ Missing required environment variables:');
    if (!projectId) console.error('   - VITE_APPWRITE_PROJECT_ID');
    if (!apiKey) console.error('   - APPWRITE_API_KEY');
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  // Initialize Appwrite client
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

  const databases = new Databases(client);

  try {
    const createdHouseholdIds = [];
    const createdResidentIds = [];
    const councilMemberIds = [];

    // Step 1: Create households
    console.log('📦 Creating households...');
    for (const household of sampleHouseholds) {
      const householdId = ID.unique();
      await databases.createDocument({
        databaseId: databaseId,
        collectionId: TABLES.households,
        documentId: householdId,
        data: {
          name: household.name,
          household_type: household.household_type,
          construction_date: household.construction_date,
          bedrooms: household.bedrooms,
          bathrooms: household.bathrooms,
          notes: household.notes,
          head_resident_id: null,
        },
      });
      createdHouseholdIds.push(householdId);
      console.log(`   ✓ Created: ${household.name}`);
    }
    console.log(`   Total: ${createdHouseholdIds.length} households\n`);

    // Step 2: Create residents
    console.log('👥 Creating residents...');
    for (const resident of sampleResidents) {
      const residentId = ID.unique();
      const householdId = createdHouseholdIds[resident.householdIndex];

      await databases.createDocument({
        databaseId: databaseId,
        collectionId: TABLES.residents,
        documentId: residentId,
        data: {
          first_name: resident.first_name,
          middle_names: resident.middle_names || '',
          last_name: resident.last_name,
          dob: new Date(`${resident.dob}T00:00:00Z`).toISOString(),
          gender: resident.gender,
          household_id: householdId,
          room_number: resident.room_number || '',
          phone: resident.phone || '',
          email: '',
          notes: resident.notes || '',
        },
      });

      createdResidentIds.push(residentId);

      if (resident.isCouncilMember) {
        councilMemberIds.push(residentId);
      }

      console.log(`   ✓ Created: ${resident.first_name} ${resident.last_name}`);
    }
    console.log(`   Total: ${createdResidentIds.length} residents\n`);

    // Step 3: Set household heads (first resident in each household)
    console.log('🏠 Setting household heads...');
    const householdHeadMap = {};
    sampleResidents.forEach((resident, index) => {
      if (householdHeadMap[resident.householdIndex] === undefined) {
        householdHeadMap[resident.householdIndex] = createdResidentIds[index];
      }
    });

    for (const [householdIndex, headResidentId] of Object.entries(householdHeadMap)) {
      const householdId = createdHouseholdIds[parseInt(householdIndex)];
      await databases.updateDocument({
        databaseId: databaseId,
        collectionId: TABLES.households,
        documentId: householdId,
        data: {
          head_resident_id: headResidentId,
        },
      });
      console.log(`   ✓ Set head for household ${parseInt(householdIndex) + 1}`);
    }
    console.log('');

    // Step 4: Create village settings
    console.log('⚙️  Creating village settings...');
    const settingsData = {
      ...sampleVillageSettings,
      council_member_ids: councilMemberIds,
    };

    await databases.createDocument({
      databaseId: databaseId,
      collectionId: TABLES.settings,
      documentId: 'settings_root',
      data: settingsData,
    });
    console.log(`   ✓ Created: ${sampleVillageSettings.village_name}\n`);

    // Summary
    console.log('✅ Sample data seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`   - Households: ${createdHouseholdIds.length}`);
    console.log(`   - Residents: ${createdResidentIds.length}`);
    console.log(`   - Council Members: ${councilMemberIds.length}`);
    console.log(`   - Village: ${sampleVillageSettings.village_name}`);
    console.log('\n🎉 You can now explore the application with sample data!');
  } catch (error) {
    console.error('\n❌ Error seeding sample data:', error.message);

    if (error.code === 409) {
      console.error('\n⚠️  Data already exists. If you want to re-seed:');
      console.error('   1. Delete existing data from Appwrite Console');
      console.error('   2. Or run the wipe function first');
    }

    process.exit(1);
  }
}

// Run the seeding
seedSampleData();
