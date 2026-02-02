import { ref } from 'vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { useResidentsStore } from 'src/stores/residents-store';
import { useErrorHandler } from 'src/composables/useErrorHandler';

/**
 * Composable for seeding sample data (Katete Model Village)
 *
 * Provides functions to seed realistic sample data for demonstration
 * and evaluation purposes. Uses existing store actions for consistency.
 */
export function useSampleData() {
  const settingsStore = useSettingsStore();
  const householdsStore = useHouseholdsStore();
  const residentsStore = useResidentsStore();
  const errorHandler = useErrorHandler();

  const isSeeding = ref(false);
  const seedingProgress = ref(0);
  const seedingStatus = ref('');

  // ============================================
  // SAMPLE DATA DEFINITIONS
  // ============================================

  /**
   * Katete Model Village configuration
   */
  const sampleVillageSettings = {
    village_name: 'Katete Model Village',
    address: 'Katete District, Eastern Province, Zambia',
    established_date: '2020-03-15',
    default_currency: 'ZMW',
    currency_symbol: 'K',
    timezone: 'Africa/Lusaka',
    country_code: 'ZM',
    country_phone_code: '+260',
    is_using_sample_data: true,
    modules_enabled: ['residents', 'households', 'dashboard', 'finance', 'inventory'],
    council_members: [], // Will be populated after residents are created
  };

  /**
   * Sample households with varied types
   */
  const sampleHouseholds = [
    {
      name: 'Banda Family Home',
      household_type: 'Single Family',
      construction_date: '2019-06-15',
      bedrooms: 3,
      bathrooms: 1,
      notes: 'Main family residence near the village center.',
    },
    {
      name: 'Phiri Family Home',
      household_type: 'Single Family',
      construction_date: '2020-02-20',
      bedrooms: 4,
      bathrooms: 2,
      notes: 'Two-story home with garden area.',
    },
    {
      name: 'Mwale Extended Family Compound',
      household_type: 'Multi-Family',
      construction_date: '2018-11-10',
      bedrooms: 6,
      bathrooms: 3,
      notes: 'Large compound housing multiple generations of the Mwale family.',
    },
    {
      name: 'Staff Quarters',
      household_type: 'Dormitory',
      construction_date: '2021-01-05',
      bedrooms: 8,
      bathrooms: 4,
      notes: 'Housing for village staff and workers.',
    },
    {
      name: 'Village Administration Office',
      household_type: 'Admin Building',
      construction_date: '2019-09-01',
      bedrooms: 0,
      bathrooms: 2,
      notes: 'Administrative building with meeting rooms and offices.',
    },
    {
      name: 'Visitor Accommodation',
      household_type: 'Guest House',
      construction_date: '2021-08-20',
      bedrooms: 4,
      bathrooms: 2,
      notes: 'Guest house for visitors and volunteers.',
    },
  ];

  /**
   * Sample residents organized by family
   * Each family member includes: first_name, middle_names (optional), last_name, dob, gender, householdIndex
   */
  const sampleResidents = [
    // Banda Family (Household 0) - Village Head family
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
      councilRole: 'Village Head',
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

    // Phiri Family (Household 1) - Deputy Village Head family
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
      councilRole: 'Deputy Village Head',
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

    // Mwale Extended Family (Household 2) - Finance Manager family
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
      councilRole: 'Finance Manager',
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

    // Mulenga Family (Guest House - Household 5, visiting volunteers)
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
  // SEEDING FUNCTIONS
  // ============================================

  /**
   * Main function to seed all sample data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function seedSampleData() {
    isSeeding.value = true;
    seedingProgress.value = 0;
    seedingStatus.value = 'Preparing sample data...';

    try {
      const createdHouseholdIds = [];
      const createdResidentIds = [];
      const councilMemberIds = [];

      // Step 1: Create households (30% of progress)
      seedingStatus.value = 'Creating households...';
      for (let i = 0; i < sampleHouseholds.length; i++) {
        const household = sampleHouseholds[i];
        const result = await householdsStore.createHousehold(household);

        if (!result.success) {
          throw new Error(`Failed to create household: ${household.name}`);
        }

        createdHouseholdIds.push(result.data.$id);
        seedingProgress.value = ((i + 1) / sampleHouseholds.length) * 0.3;
      }

      // Step 2: Create residents (60% of progress)
      seedingStatus.value = 'Creating residents...';
      for (let i = 0; i < sampleResidents.length; i++) {
        const resident = sampleResidents[i];
        const householdId = createdHouseholdIds[resident.householdIndex];

        const residentData = {
          first_name: resident.first_name,
          middle_names: resident.middle_names || '',
          last_name: resident.last_name,
          dob: resident.dob,
          gender: resident.gender,
          household_id: householdId,
          room_number: resident.room_number || '',
          phone: resident.phone || '',
          email: resident.email || '',
          notes: resident.notes || '',
        };

        const result = await residentsStore.createResident(residentData);

        if (!result.success) {
          throw new Error(
            `Failed to create resident: ${resident.first_name} ${resident.last_name}`,
          );
        }

        createdResidentIds.push(result.data.$id);

        // Track council members
        if (resident.isCouncilMember) {
          councilMemberIds.push({
            residentId: result.data.$id,
            role: resident.councilRole,
          });
        }

        seedingProgress.value = 0.3 + ((i + 1) / sampleResidents.length) * 0.5;
      }

      // Step 3: Set household heads (first resident in each household)
      seedingStatus.value = 'Setting household heads...';
      const householdHeadMap = {};
      sampleResidents.forEach((resident, index) => {
        if (householdHeadMap[resident.householdIndex] === undefined) {
          householdHeadMap[resident.householdIndex] = createdResidentIds[index];
        }
      });

      for (const [householdIndex, headResidentId] of Object.entries(householdHeadMap)) {
        const householdId = createdHouseholdIds[parseInt(householdIndex)];
        await householdsStore.updateHousehold(householdId, {
          ...sampleHouseholds[parseInt(householdIndex)],
          head_resident_id: headResidentId,
        });
      }

      seedingProgress.value = 0.85;

      // Step 4: Create village settings with council members
      seedingStatus.value = 'Configuring village settings...';
      const settingsData = {
        ...sampleVillageSettings,
        council_members: councilMemberIds,
      };

      const settingsResult = await settingsStore.createSettings(settingsData);

      if (!settingsResult.success) {
        throw new Error('Failed to create village settings');
      }

      seedingProgress.value = 1;
      seedingStatus.value = 'Sample data loaded successfully!';

      errorHandler.notifySuccess(
        'Katete Model Village sample data loaded successfully! Explore the dashboard to see your data.',
      );

      return { success: true };
    } catch (error) {
      console.error('Error seeding sample data:', error);
      seedingStatus.value = 'Error loading sample data';
      errorHandler.notifyError(`Failed to load sample data: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      isSeeding.value = false;
    }
  }

  return {
    seedSampleData,
    isSeeding,
    seedingProgress,
    seedingStatus,
    // Export sample data for use in seed script
    sampleVillageSettings,
    sampleHouseholds,
    sampleResidents,
  };
}
