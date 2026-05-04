import { ref } from 'vue';
import { tables } from 'src/boot/appwrite';
import { ID, Query } from 'appwrite';

/**
 * Composable for seeding farm sample data (Epic 3)
 *
 * Generates a full relational farm data set:
 * - Soil types & crops (seeded inline if missing)
 * - Farm input inventory (seeds, fertilizer) as `farm_inputs`
 * - Plots (mix of Active/Fallow statuses, assigned to crop managers)
 * - Plantings (mixed states: Planted, Growing, Harvesting, Completed, Failed)
 * - Harvests for Completed / Harvesting plantings
 * - Farm produce inventory (`farm_produce`) auto-created from completed harvests
 * - Farm sales linking produce → harvest → finance_transactions (income)
 *
 * Designed to be called from useSampleData.js AFTER residents and finance data
 * are created, so it can link crop managers (by resident name) and use finance
 * categories / funding sources that finance seeding created.
 */
export function useFarmSampleData() {
  const isFarmSeeding = ref(false);
  const farmSeedingProgress = ref(0);
  const farmSeedingStatus = ref('');

  // ==========================================================================
  // CONSTANTS / STATIC SEED LISTS
  // ==========================================================================

  // Minimal soil type set (matches server/scripts/seed-soil-types.js defaults)
  const DEFAULT_SOIL_TYPES = [
    {
      name: 'Sandy',
      description: 'Light, warm, dry, acidic, low nutrients. Drains quickly.',
      color_code: '#F4E4C1',
      is_system_default: true,
    },
    {
      name: 'Clay',
      description: 'Heavy, nutrient-rich, wet in winter, dry in summer.',
      color_code: '#8B7355',
      is_system_default: true,
    },
    {
      name: 'Loam',
      description: 'Ideal soil: mix of sand, silt, clay. Fertile, well-drained.',
      color_code: '#5D4E37',
      is_system_default: true,
    },
    {
      name: 'Silt',
      description: 'Fertile, light, moisture-retentive.',
      color_code: '#A89F91',
      is_system_default: true,
    },
    {
      name: 'Peaty',
      description: 'High organic matter, acidic, moist.',
      color_code: '#3D2914',
      is_system_default: true,
    },
    {
      name: 'Chalky',
      description: 'Alkaline, stony, free-draining.',
      color_code: '#E5E4E2',
      is_system_default: true,
    },
    {
      name: 'Other',
      description: 'Unclassified or mixed soil type.',
      color_code: '#888888',
      is_system_default: true,
    },
  ];

  // Minimal crop subset referenced by sample plantings (superset of what we plant).
  // If crops table is empty at seed time we create these; otherwise we reuse whatever exists.
  const DEFAULT_CROPS = [
    {
      crop_name: 'Maize',
      category: 'Grain',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 3500,
      growing_season: 'Warm',
      notes: 'Staple crop in Zambia.',
    },
    {
      crop_name: 'Groundnuts',
      category: 'Legume',
      crop_type: 'Annual',
      maturity_days: 100,
      typical_yield_per_hectare: 1800,
      growing_season: 'Warm',
      notes: 'Nitrogen-fixing legume.',
    },
    {
      crop_name: 'Soybeans',
      category: 'Legume',
      crop_type: 'Annual',
      maturity_days: 110,
      typical_yield_per_hectare: 2200,
      growing_season: 'Warm',
      notes: 'High protein legume.',
    },
    {
      crop_name: 'Tomatoes',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 75,
      typical_yield_per_hectare: 25000,
      growing_season: 'All Year',
      notes: 'High-value vegetable.',
    },
    {
      crop_name: 'Rape',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 45,
      typical_yield_per_hectare: 8000,
      growing_season: 'Cool',
      notes: 'Fast-growing leafy green.',
    },
    {
      crop_name: 'Sweet Potato',
      category: 'Root',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 14000,
      growing_season: 'All Year',
      notes: 'Nutritious root crop.',
    },
    {
      crop_name: 'Cabbage',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 90,
      typical_yield_per_hectare: 40000,
      growing_season: 'Cool',
      notes: 'Cool-season vegetable.',
    },
    {
      crop_name: 'Onions',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 20000,
      growing_season: 'Cool',
      notes: 'Good storage crop.',
    },
    // Story 3.6: Perennial crops for continuous picking examples
    {
      crop_name: 'Banana',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 365,
      harvest_frequency_days: 90,
      typical_yield_per_hectare: 20000,
      growing_season: 'All Year',
      notes: 'Continuous production perennial with multiple harvest cycles.',
    },
    {
      crop_name: 'Mango',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 730,
      harvest_frequency_days: 365,
      typical_yield_per_hectare: 15000,
      growing_season: 'Warm',
      notes: 'Long-term perennial with annual harvests after maturity.',
    },
    {
      crop_name: 'Papaya',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 180,
      harvest_frequency_days: 60,
      typical_yield_per_hectare: 30000,
      growing_season: 'All Year',
      notes: 'Fast-producing perennial with frequent harvests.',
    },
    {
      crop_name: 'Moringa',
      category: 'Vegetable',
      crop_type: 'Perennial',
      maturity_days: 240,
      harvest_frequency_days: 45,
      typical_yield_per_hectare: 25000,
      growing_season: 'All Year',
      notes: 'Nutrient-dense perennial with frequent leaf harvests.',
    },
  ];

  // ==========================================================================
  // MAIN ENTRY POINT
  // ==========================================================================

  /**
   * @param {string[]} residentIds - Ordered list of resident $ids created in useSampleData
   * @param {Array<{first_name:string,last_name:string,isCouncilMember?:boolean,councilRole?:string}>} sampleResidents - The static sample-residents array, aligned 1:1 with residentIds
   */
  const seedFarmData = async (residentIds = [], sampleResidents = []) => {
    isFarmSeeding.value = true;
    farmSeedingProgress.value = 0;
    farmSeedingStatus.value = 'Preparing farm data...';

    try {
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

      // 1. Soil types (ensure present) ------------------------------------------------
      farmSeedingStatus.value = 'Ensuring soil types...';
      const soilTypes = await ensureSoilTypes(dbId);
      farmSeedingProgress.value = 0.05;

      // 2. Crops (ensure present) -----------------------------------------------------
      farmSeedingStatus.value = 'Ensuring crops database...';
      const crops = await ensureCrops(dbId);
      farmSeedingProgress.value = 0.1;

      // 3. Look up finance categories + funding sources (created earlier by finance seeding)
      farmSeedingStatus.value = 'Linking to finance data...';
      const [financeCategoriesRes, fundingSourcesRes] = await Promise.all([
        tables.listRows({
          databaseId: dbId,
          tableId: 'finance_categories',
          queries: [Query.limit(100)],
        }),
        tables.listRows({
          databaseId: dbId,
          tableId: 'funding_sources',
          queries: [Query.limit(100)],
        }),
      ]);
      const financeCategories = financeCategoriesRes.rows || [];
      const fundingSources = fundingSourcesRes.rows || [];
      farmSeedingProgress.value = 0.15;

      // 4. Resolve crop managers by name ---------------------------------------------
      const findResidentIdByName = (firstName, lastName) => {
        const idx = sampleResidents.findIndex(
          (r) => r.first_name === firstName && r.last_name === lastName,
        );
        return idx >= 0 ? residentIds[idx] : null;
      };
      const emmanuelId = findResidentIdByName('Emmanuel', 'Phiri');
      const danielId = findResidentIdByName('Daniel', 'Zulu');

      const soilId = (name) => soilTypes.find((s) => s.name === name)?.$id || null;
      const cropId = (name) => crops.find((c) => c.crop_name === name)?.$id || null;

      // 5. Farm Input inventory (seeds + fertilizer) ---------------------------------
      farmSeedingStatus.value = 'Creating farm input inventory...';
      const farmInputs = buildFarmInputs();
      await batchInsert(dbId, 'inventory', farmInputs);
      farmSeedingProgress.value = 0.3;

      // 6. Plots ---------------------------------------------------------------------
      farmSeedingStatus.value = 'Creating plots...';
      const plotDefs = buildPlots({ soilId, emmanuelId, danielId });
      const createdPlots = await batchInsert(
        dbId,
        'plots',
        plotDefs.map(({ _key, ...d }) => ({ data: d, _key })),
      );
      const plotByKey = (key) => createdPlots.find((r) => r._key === key);
      farmSeedingProgress.value = 0.45;

      // 7. Plantings -----------------------------------------------------------------
      farmSeedingStatus.value = 'Creating plantings (mixed states)...';
      const plantingDefs = buildPlantings({ cropId, plotByKey });
      const createdPlantings = await batchInsert(
        dbId,
        'plantings',
        plantingDefs.map(({ _key, ...d }) => ({ data: d, _key })),
      );
      const plantingByKey = (key) => createdPlantings.find((r) => r._key === key);
      farmSeedingProgress.value = 0.65;

      // 8. Harvests + entries + produce inventory + farm sales ----------------------
      //
      // New unified model (Story 3.5 refactor): each harvest parent record is
      // composed of one or more harvest_entries. The aggregated produce
      // inventory row links back to (planting_id, crop_id) rather than the
      // harvest, matching the runtime upsert rule in the inventory store.
      farmSeedingStatus.value = 'Creating harvests and entries...';
      const harvestPlans = buildHarvestPlans({ plantingByKey, cropId });

      // Insert harvest parents first
      const createdHarvests = await batchInsert(
        dbId,
        'harvests',
        harvestPlans.map((h) => ({ data: h.harvest, _key: h._key })),
      );
      farmSeedingProgress.value = 0.72;

      // Insert entries for each harvest (each plan carries an `entries` array)
      farmSeedingStatus.value = 'Creating harvest entries...';
      for (let i = 0; i < harvestPlans.length; i++) {
        const plan = harvestPlans[i];
        const harvestRow = createdHarvests[i];
        const entryRows = (plan.entries || []).map((e) => ({
          ...e,
          harvest_id: harvestRow.$id,
        }));
        if (entryRows.length) {
          await batchInsert(
            dbId,
            'harvest_entries',
            entryRows.map((data) => ({ data })),
          );
        }
      }
      farmSeedingProgress.value = 0.8;

      // For each harvest with produce, create the aggregated farm_produce row.
      farmSeedingStatus.value = 'Creating farm produce inventory...';
      const farmingRevenueCat = financeCategories.find((c) => c.name === 'Farming Revenue');
      const villageFund = fundingSources.find((s) => s.name === 'Village General Fund');

      for (let i = 0; i < harvestPlans.length; i++) {
        const plan = harvestPlans[i];
        const harvestRow = createdHarvests[i];
        if (!plan.produce) continue;

        const produceData = {
          ...plan.produce,
          source_reference_id: harvestRow.$id,
          planting_id: plan.planting_id,
          crop_id: plan.crop_id,
          date_added:
            plan.harvest.harvest_end_date ||
            plan.harvest.harvest_start_date ||
            new Date().toISOString().split('T')[0],
        };
        produceData.date_added = toISO(produceData.date_added);
        produceData.last_updated = produceData.date_added;
        const produceRow = await createRowWithRetry(dbId, 'inventory', produceData);

        // (b) if plan includes a sale, create finance transaction then farm_sale
        // Story 3.8: New three-way integration — farm_sales now links to both
        // the inventory_item and the finance_transaction via FKs.
        if (plan.sale) {
          if (!farmingRevenueCat) {
            console.warn('Farming Revenue category not found, skipping farm_sale');
            continue;
          }
          const saleDate = plan.sale.sale_date;
          const txData = {
            type: 'income',
            amount_needed: plan.sale.total_amount,
            amount_funded: plan.sale.total_amount,
            payment_method: plan.sale.payment_method,
            category_id: farmingRevenueCat.$id,
            source_module: 'Farm',
            funding_source_id: villageFund?.$id || null,
            date: new Date(`${saleDate}T10:00:00Z`).toISOString(),
            description: `Farm produce sale: ${plan.sale.quantity_sold}kg to ${plan.sale.buyer_name}`,
            status: 'completed',
          };
          const txRow = await createRowWithRetry(dbId, 'finance_transactions', txData);

          const saleData = {
            harvest_id: harvestRow.$id,
            // Story 3.8: Three-way integration FKs
            inventory_item_id: produceRow.$id,
            finance_transaction_id: txRow.$id,
            // Story 3.9: Denormalized crop_id for profitability grouping queries
            ...(plan.crop_id ? { crop_id: plan.crop_id } : {}),
            buyer_type: plan.sale.buyer_type,
            buyer_id: plan.sale.buyer_id || '',
            buyer_name: plan.sale.buyer_name,
            sale_date: toISO(plan.sale.sale_date),
            quantity_sold: plan.sale.quantity_sold,
            unit: plan.sale.unit || 'kg',
            price_per_unit: plan.sale.price_per_unit,
            total_amount: plan.sale.total_amount,
            // Story 3.8: payment_status enum is now 'Pending' | 'Completed'
            payment_status: plan.sale.payment_status || 'Completed',
            payment_method: plan.sale.payment_method,
            notes: plan.sale.notes,
          };
          await createRowWithRetry(dbId, 'farm_sales', saleData);

          // Story 3.8: Optional second sale to demonstrate partial-sales flow
          let secondSaleQty = 0;
          if (plan.additional_sale) {
            const aSale = plan.additional_sale;
            const aTxRow = await createRowWithRetry(dbId, 'finance_transactions', {
              type: 'income',
              amount_needed: aSale.total_amount,
              amount_funded: aSale.total_amount,
              payment_method: aSale.payment_method,
              category_id: farmingRevenueCat.$id,
              source_module: 'Farm',
              funding_source_id: villageFund?.$id || null,
              date: new Date(`${aSale.sale_date}T14:00:00Z`).toISOString(),
              description: `Farm produce sale: ${aSale.quantity_sold}kg to ${aSale.buyer_name}`,
              status: 'completed',
            });
            await createRowWithRetry(dbId, 'farm_sales', {
              harvest_id: harvestRow.$id,
              inventory_item_id: produceRow.$id,
              finance_transaction_id: aTxRow.$id,
              // Story 3.9: Denormalized crop_id
              ...(plan.crop_id ? { crop_id: plan.crop_id } : {}),
              buyer_type: aSale.buyer_type,
              buyer_id: aSale.buyer_id || '',
              buyer_name: aSale.buyer_name,
              sale_date: toISO(aSale.sale_date),
              quantity_sold: aSale.quantity_sold,
              unit: aSale.unit || 'kg',
              price_per_unit: aSale.price_per_unit,
              total_amount: aSale.total_amount,
              payment_status: aSale.payment_status || 'Completed',
              payment_method: aSale.payment_method,
              notes: aSale.notes,
            });
            secondSaleQty = aSale.quantity_sold;
          }

          // Decrement produce inventory to reflect sold quantity (both sales)
          const totalSold = plan.sale.quantity_sold + secondSaleQty;
          const remaining = Math.max(0, (produceData.quantity || 0) - totalSold);
          const newStatus = deriveInventoryStatus(remaining, produceData.reorder_threshold);
          try {
            await tables.updateRow({
              databaseId: dbId,
              tableId: 'inventory',
              rowId: produceRow.$id,
              data: {
                quantity: remaining,
                estimated_value: Math.round(remaining * (produceData.unit_cost || 0) * 100) / 100,
                status: newStatus,
                last_updated: toISO(plan.additional_sale?.sale_date || plan.sale.sale_date),
              },
            });
          } catch (e) {
            console.warn('Failed to update produce inventory after sale:', e.message);
          }
        }

        // spread progress across harvest-related inserts (0.75 -> 0.98)
        farmSeedingProgress.value = 0.75 + ((i + 1) / harvestPlans.length) * 0.23;
      }

      farmSeedingProgress.value = 1.0;
      farmSeedingStatus.value = 'Farm data seeded successfully!';
      return { success: true };
    } catch (error) {
      console.error('Error seeding farm data:', error);
      farmSeedingStatus.value = 'Error loading farm data';
      return { success: false, error: error.message };
    } finally {
      isFarmSeeding.value = false;
    }
  };

  // ==========================================================================
  // DATA BUILDERS
  // ==========================================================================

  function buildFarmInputs() {
    const now = new Date();
    const iso = (monthsAgo) => {
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 15);
      return d.toISOString();
    };

    // Each entry has a stable `_key` used to wire plantings to the correct item.
    // quantity represents REMAINING stock (post-plantings) so the data is internally consistent.
    const defs = [
      {
        _key: 'maize_seed',
        item_name: 'Maize Seed (SC627)',
        item_type: 'farm_inputs',
        quantity: 40,
        unit: 'kg',
        unit_cost: 55,
        source: 'finance_purchase',
        reorder_threshold: 20,
        date_added: iso(8),
      },
      {
        _key: 'groundnut_seed',
        item_name: 'Groundnut Seed (MGV-4)',
        item_type: 'farm_inputs',
        quantity: 25,
        unit: 'kg',
        unit_cost: 80,
        source: 'finance_purchase',
        reorder_threshold: 10,
        date_added: iso(7),
      },
      {
        _key: 'soybean_seed',
        item_name: 'Soybean Seed (Hernon-147)',
        item_type: 'farm_inputs',
        quantity: 18,
        unit: 'kg',
        unit_cost: 65,
        source: 'finance_purchase',
        reorder_threshold: 10,
        date_added: iso(6),
      },
      {
        _key: 'tomato_seed',
        item_name: 'Tomato Seedlings (Roma VF)',
        item_type: 'farm_inputs',
        quantity: 600,
        unit: 'seedlings',
        unit_cost: 1.5,
        source: 'finance_purchase',
        reorder_threshold: 200,
        date_added: iso(2),
      },
      {
        _key: 'rape_seed',
        item_name: 'Rape Seed (Chinese Cabbage)',
        item_type: 'farm_inputs',
        quantity: 3,
        unit: 'kg',
        unit_cost: 90,
        source: 'donation',
        reorder_threshold: 2,
        date_added: iso(3),
      },
      {
        _key: 'sweet_potato_vines',
        item_name: 'Sweet Potato Vines (Orange-flesh)',
        item_type: 'farm_inputs',
        quantity: 0,
        unit: 'bundles',
        unit_cost: 20,
        source: 'donation',
        reorder_threshold: 10,
        date_added: iso(5),
      },
      {
        _key: 'dcompound_fert',
        item_name: 'D-Compound Fertilizer',
        item_type: 'farm_inputs',
        quantity: 8,
        unit: 'bags_50kg',
        unit_cost: 550,
        source: 'finance_purchase',
        reorder_threshold: 4,
        date_added: iso(6),
      },
      {
        _key: 'urea_fert',
        item_name: 'Urea Top-Dressing Fertilizer',
        item_type: 'farm_inputs',
        quantity: 5,
        unit: 'bags_50kg',
        unit_cost: 600,
        source: 'finance_purchase',
        reorder_threshold: 4,
        date_added: iso(5),
      },
    ];

    return defs.map((d) => ({
      _key: d._key,
      data: {
        item_name: d.item_name,
        item_type: d.item_type,
        quantity: d.quantity,
        unit: d.unit,
        unit_cost: d.unit_cost,
        estimated_value: Math.round(d.quantity * d.unit_cost * 100) / 100,
        status: deriveInventoryStatus(d.quantity, d.reorder_threshold),
        source: d.source,
        reorder_threshold: d.reorder_threshold,
        date_added: d.date_added,
        last_updated: d.date_added,
      },
    }));
  }

  function buildPlots({ soilId, emmanuelId, danielId }) {
    return [
      {
        _key: 'north_field',
        name: 'North Field',
        size_hectares: 5.0,
        location_description: 'Largest plot along the main road, north of the village.',
        soil_type_id: soilId('Loam'),
        status: 'Active',
        crop_manager_id: emmanuelId,
      },
      {
        _key: 'south_field',
        name: 'South Field',
        size_hectares: 3.5,
        location_description: 'Rolling land south of the river bank.',
        soil_type_id: soilId('Sandy'),
        status: 'Active',
        crop_manager_id: danielId,
      },
      {
        _key: 'east_garden',
        name: 'East Garden',
        size_hectares: 1.0,
        location_description: 'Fenced vegetable garden near the clinic.',
        soil_type_id: soilId('Loam'),
        status: 'Active',
        crop_manager_id: emmanuelId,
      },
      {
        _key: 'west_plot',
        name: 'West Plot',
        size_hectares: 2.5,
        location_description: 'Western plot resting after last season.',
        soil_type_id: soilId('Clay'),
        status: 'Fallow',
        crop_manager_id: danielId,
      },
      {
        _key: 'riverside_plot',
        name: 'Riverside Plot',
        size_hectares: 1.5,
        location_description: 'Silty soil near the stream, good for moisture-loving crops.',
        soil_type_id: soilId('Silt'),
        status: 'Active',
        crop_manager_id: emmanuelId,
      },
    ];
  }

  function buildPlantings({ cropId, plotByKey }) {
    const today = new Date();
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().split('T')[0];
    };
    const addDaysStr = (base, n) => {
      const d = new Date(base);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    const plot = (k) => plotByKey(k)?.$id;
    const crop = (n) => cropId(n);

    // NOTE: The plantings table schema uses aggregated cost fields:
    // - quantity_planted (not seeds_used)
    // - inputs_cost, labor_cost, other_cost (not detailed breakdowns)
    // - notes (single text field)
    const defs = [
      // 1. Completed maize cycle (harvest recorded, produce sold) -- 10 months ago
      {
        _key: 'p_maize_completed',
        plot_id: plot('north_field'),
        crop_id: crop('Maize'),
        planting_date: daysAgo(300),
        expected_harvest_date: addDaysStr(daysAgo(300), 120),
        area_used_hectares: 1.5,
        quantity_planted: 60,
        unit: 'kg',
        inputs_cost: 3300 + 2750, // seed cost (60*55) + fertilizer
        labor_cost: 1200,
        other_cost: 0,
        notes:
          'Maize planting. Seeds from inventory (60kg). Fertilizer: 5 bags D-Compound. Labor: 8 farmhands for land prep/ploughing/planting.',
        status: 'completed',
      },
      // 2. Harvesting-in-progress tomatoes (East Garden) -- planted ~80 days ago
      {
        _key: 'p_tomato_harvesting',
        plot_id: plot('east_garden'),
        crop_id: crop('Tomatoes'),
        planting_date: daysAgo(80),
        expected_harvest_date: addDaysStr(daysAgo(80), 75),
        area_used_hectares: 0.5,
        quantity_planted: 400,
        unit: 'seedlings',
        inputs_cost: 600 + 450, // seedlings + materials
        labor_cost: 600,
        other_cost: 0,
        notes:
          'Tomato transplanting. 400 seedlings from inventory. Materials: stakes, twine, drip parts.',
        status: 'harvesting',
      },
      // 3. Growing groundnuts (South Field) -- 60 days ago
      {
        _key: 'p_groundnut_growing',
        plot_id: plot('south_field'),
        crop_id: crop('Groundnuts'),
        planting_date: daysAgo(60),
        expected_harvest_date: addDaysStr(daysAgo(60), 100),
        area_used_hectares: 1.0,
        quantity_planted: 40,
        unit: 'kg',
        inputs_cost: 3200, // seed cost only (40*80)
        labor_cost: 900,
        other_cost: 0,
        notes: 'Groundnut planting. 40kg seed from inventory. Labor: ridging and planting.',
        status: 'growing',
      },
      // 4. Freshly planted rape (East Garden second bed) -- 15 days ago
      {
        _key: 'p_rape_planted',
        plot_id: plot('east_garden'),
        crop_id: crop('Rape'),
        planting_date: daysAgo(15),
        expected_harvest_date: addDaysStr(daysAgo(15), 45),
        area_used_hectares: 0.3,
        quantity_planted: 2,
        unit: 'kg',
        inputs_cost: 180, // 2kg * 90
        labor_cost: 200,
        other_cost: 0,
        notes: 'Rape direct seeding. 2kg seed from inventory (donated). Bed prep labor.',
        status: 'planted',
      },
      // 5. Failed maize (drought) -- Riverside Plot earlier season
      {
        _key: 'p_maize_failed',
        plot_id: plot('riverside_plot'),
        crop_id: crop('Maize'),
        planting_date: daysAgo(200),
        expected_harvest_date: addDaysStr(daysAgo(200), 120),
        area_used_hectares: 0.8,
        quantity_planted: 20,
        unit: 'kg',
        inputs_cost: 1100 + 1100, // seed + fertilizer
        labor_cost: 450,
        other_cost: 0,
        notes:
          'Failed maize due to drought. 20kg seed from inventory. Fertilizer applied before failure observed.',
        status: 'failed',
      },
      // 6. Completed sweet potatoes with donated vines (South Field) -- 240 days ago
      {
        _key: 'p_sp_completed',
        plot_id: plot('south_field'),
        crop_id: crop('Sweet Potato'),
        planting_date: daysAgo(240),
        expected_harvest_date: addDaysStr(daysAgo(240), 120),
        area_used_hectares: 1.2,
        quantity_planted: null,
        unit: 'bundles',
        inputs_cost: 0, // donated vines
        labor_cost: 750,
        other_cost: 200,
        notes:
          'Sweet potato using donated vines. Labor: ridging and vine planting. Tool hire cost.',
        status: 'completed',
      },
      // 7. Purchased-separately soybean planting (Growing) -- 50 days ago
      {
        _key: 'p_soy_growing',
        plot_id: plot('north_field'),
        crop_id: crop('Soybeans'),
        planting_date: daysAgo(50),
        expected_harvest_date: addDaysStr(daysAgo(50), 110),
        area_used_hectares: 0.5,
        quantity_planted: null,
        unit: 'kg',
        inputs_cost: 1800 + 1100, // purchased seed + emergency fertilizer
        labor_cost: 750,
        other_cost: 0,
        notes:
          'Soybean with purchased seed (not from inventory). Emergency purchase of 2 bags D-Compound fertilizer.',
        status: 'growing',
      },
      // 8. Newly planted cabbage (Riverside Plot) -- 20 days ago
      {
        _key: 'p_cabbage_planted',
        plot_id: plot('riverside_plot'),
        crop_id: crop('Cabbage'),
        planting_date: daysAgo(20),
        expected_harvest_date: addDaysStr(daysAgo(20), 90),
        area_used_hectares: 0.7,
        quantity_planted: null,
        unit: 'seedlings',
        inputs_cost: 300,
        labor_cost: 450,
        other_cost: 0,
        notes: 'Cabbage planting with purchased seedlings.',
        status: 'planted',
      },
      // Story 3.6: Perennial crop examples for continuous picking
      // 9. Banana planting with 2 completed harvests, 3rd in progress (North Field) -- planted 1 year ago
      {
        _key: 'p_banana_harvesting',
        plot_id: plot('north_field'),
        crop_id: crop('Banana'),
        planting_date: daysAgo(365),
        expected_harvest_date: addDaysStr(daysAgo(365), 90),
        area_used_hectares: 1.0,
        quantity_planted: 50,
        unit: 'suckers',
        inputs_cost: 2000,
        labor_cost: 1500,
        other_cost: 500,
        notes:
          'Banana plantation established. Multiple harvest cycles demonstrating continuous picking.',
        status: 'harvesting',
      },
      // 10. Papaya with high-frequency harvests (East Garden) -- planted 6 months ago
      {
        _key: 'p_papaya_harvesting',
        plot_id: plot('east_garden'),
        crop_id: crop('Papaya'),
        planting_date: daysAgo(180),
        expected_harvest_date: addDaysStr(daysAgo(180), 60),
        area_used_hectares: 0.4,
        quantity_planted: 15,
        unit: 'seedlings',
        inputs_cost: 800,
        labor_cost: 600,
        other_cost: 200,
        notes:
          'Papaya showing frequent harvest cycles (60-day frequency). High labor tracking per harvest.',
        status: 'harvesting',
      },
      // 11. Moringa with leaf harvests (West Plot) -- planted 8 months ago
      {
        _key: 'p_moringa_harvesting',
        plot_id: plot('west_plot'),
        crop_id: crop('Moringa'),
        planting_date: daysAgo(240),
        expected_harvest_date: addDaysStr(daysAgo(240), 45),
        area_used_hectares: 0.2,
        quantity_planted: 30,
        unit: 'seedlings',
        inputs_cost: 400,
        labor_cost: 800,
        other_cost: 100,
        notes:
          'Moringa for leaf harvest. Short 45-day frequency demonstrates intensive continuous picking.',
        status: 'harvesting',
      },
    ];

    // Strip null crop/plot rows defensively (if a lookup failed, drop the row rather than insert bad data).
    return defs.filter((d) => d.plot_id && d.crop_id);
  }

  function buildHarvestPlans({ plantingByKey, cropId }) {
    const today = new Date();
    const daysAgo = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d.toISOString().split('T')[0];
    };

    const plans = [];

    // --- Completed maize harvest (single-entry) ------------------------------
    // 1 entry of 4200 kg recorded on harvest day.
    const maizeCompleted = plantingByKey('p_maize_completed');
    const maizeCropId = cropId('Maize');
    if (maizeCompleted && maizeCropId) {
      const harvestDate = daysAgo(180);
      plans.push({
        _key: 'h_maize_completed',
        planting_id: maizeCompleted.$id,
        crop_id: maizeCropId,
        harvest: {
          planting_id: maizeCompleted.$id,
          harvest_start_date: harvestDate,
          harvest_end_date: harvestDate,
          total_quantity_kg: 4200,
          total_labor_cost: 1800,
          total_other_costs: 400,
          status: 'Completed',
          notes: 'Grade A quality stored in Main Grain Shed.',
        },
        entries: [
          {
            entry_date: harvestDate,
            quantity_kg: 4200,
            farmhands_count: 10,
            labor_cost: 1800,
            other_costs: 400,
            other_costs_notes: 'Transport to grain shed',
            notes: 'Full-field single-day pick.',
          },
        ],
        produce: {
          // Story 3.7: Naming convention - Maize – North Field 2025/26 Wet Season
          item_name: 'Maize – North Field 2025/26 Wet Season',
          item_type: 'farm_produce',
          quantity: 4200,
          unit: 'kg',
          unit_cost: 3.5,
          status: 'in_stock',
          source: 'farm_harvest',
          reorder_threshold: 0,
          estimated_value: 4200 * 3.5,
        },
        sale: {
          buyer_type: 'external',
          buyer_name: 'Zambia Food Reserve Agency',
          quantity_sold: 3000,
          unit: 'kg',
          price_per_unit: 13,
          total_amount: 39000,
          payment_method: 'Bank Transfer',
          payment_status: 'Completed',
          sale_date: daysAgo(160),
          notes: 'Bulk sale to FRA depot.',
        },
        // Story 3.8: demonstrate partial sale — remaining 1200kg sold later to a local miller.
        additional_sale: {
          buyer_type: 'external',
          buyer_name: 'Katete Local Miller',
          quantity_sold: 800,
          unit: 'kg',
          price_per_unit: 15,
          total_amount: 12000,
          payment_method: 'Mobile Money',
          payment_status: 'Pending',
          sale_date: daysAgo(120),
          notes: 'Second batch sale. Awaiting payment.',
        },
      });
    }

    // --- In-progress tomato harvest (multi-entry continuous picking) --------
    // 3 entries spread across 10 days totaling 850 kg.
    const tomatoHarvesting = plantingByKey('p_tomato_harvesting');
    const tomatoCropId = cropId('Tomatoes');
    if (tomatoHarvesting && tomatoCropId) {
      const startDate = daysAgo(10);
      const midDate = daysAgo(5);
      const endDate = daysAgo(1);
      plans.push({
        _key: 'h_tomato_progress',
        planting_id: tomatoHarvesting.$id,
        crop_id: tomatoCropId,
        harvest: {
          planting_id: tomatoHarvesting.$id,
          harvest_start_date: startDate,
          harvest_end_date: endDate,
          total_quantity_kg: 850,
          total_labor_cost: 450,
          total_other_costs: 120,
          status: 'In Progress',
          notes: 'Continuous picking. Grade A stored in Cold Store A.',
        },
        entries: [
          {
            entry_date: startDate,
            quantity_kg: 300,
            farmhands_count: 3,
            labor_cost: 150,
            other_costs: 40,
            other_costs_notes: 'Crates',
            notes: 'First pick.',
          },
          {
            entry_date: midDate,
            quantity_kg: 280,
            farmhands_count: 3,
            labor_cost: 150,
            other_costs: 40,
            notes: 'Mid-season pick.',
          },
          {
            entry_date: endDate,
            quantity_kg: 270,
            farmhands_count: 3,
            labor_cost: 150,
            other_costs: 40,
            notes: 'Latest pick.',
          },
        ],
        produce: {
          // Story 3.7: Naming convention - Tomatoes – East Garden 2025/26 Wet Season
          item_name: 'Tomatoes – East Garden 2025/26 Wet Season',
          item_type: 'farm_produce',
          quantity: 850,
          unit: 'kg',
          unit_cost: 8,
          status: 'in_stock',
          source: 'farm_harvest',
          reorder_threshold: 0,
          estimated_value: 850 * 8,
        },
        sale: {
          buyer_type: 'market',
          buyer_name: 'Katete Market Vendors',
          quantity_sold: 600,
          unit: 'kg',
          price_per_unit: 25,
          total_amount: 15000,
          payment_method: 'Cash',
          payment_status: 'Completed',
          sale_date: daysAgo(8),
          notes: 'Sold to multiple market vendors.',
        },
      });
    }

    // --- Completed sweet potato harvest (multi-entry aggregate) -------------
    // 3 entries over 5 days totaling 3800 kg.
    const spCompleted = plantingByKey('p_sp_completed');
    const spCropId = cropId('Sweet Potato');
    if (spCompleted && spCropId) {
      const startDate = daysAgo(125);
      const midDate = daysAgo(123);
      const endDate = daysAgo(120);
      plans.push({
        _key: 'h_sp_completed',
        planting_id: spCompleted.$id,
        crop_id: spCropId,
        harvest: {
          planting_id: spCompleted.$id,
          harvest_start_date: startDate,
          harvest_end_date: endDate,
          total_quantity_kg: 3800,
          total_labor_cost: 900,
          total_other_costs: 200,
          status: 'Completed',
          notes: 'Multi-day aggregate. Grade B stored in Root Crop Shed.',
        },
        entries: [
          {
            entry_date: startDate,
            quantity_kg: 1200,
            farmhands_count: 6,
            labor_cost: 300,
            other_costs: 70,
            other_costs_notes: 'Bags',
            notes: 'Day 1 lifting.',
          },
          {
            entry_date: midDate,
            quantity_kg: 1400,
            farmhands_count: 6,
            labor_cost: 300,
            other_costs: 60,
            notes: 'Day 3 lifting.',
          },
          {
            entry_date: endDate,
            quantity_kg: 1200,
            farmhands_count: 6,
            labor_cost: 300,
            other_costs: 70,
            notes: 'Final day lifting.',
          },
        ],
        produce: {
          // Story 3.7: Naming convention - Sweet Potato – South Field 2025/26 Wet Season
          item_name: 'Sweet Potato – South Field 2025/26 Wet Season',
          item_type: 'farm_produce',
          quantity: 3800,
          unit: 'kg',
          unit_cost: 2.5,
          status: 'in_stock',
          source: 'farm_harvest',
          reorder_threshold: 0,
          estimated_value: 3800 * 2.5,
        },
        sale: {
          buyer_type: 'external',
          buyer_name: 'Chipata Urban Wholesaler',
          quantity_sold: 2500,
          unit: 'kg',
          price_per_unit: 12,
          total_amount: 30000,
          payment_method: 'Mobile Money',
          payment_status: 'Completed',
          sale_date: daysAgo(110),
          notes: 'Bulk purchase for Chipata market.',
        },
      });
    }

    // Story 3.6: Perennial crop harvest examples with continuous picking
    // --- Banana: 3 harvests over 9 months demonstrating 90-day frequency ---
    const bananaPlanting = plantingByKey('p_banana_harvesting');
    const bananaCropId = cropId('Banana');
    if (bananaPlanting && bananaCropId) {
      // Harvest 1: 9 months ago
      const h1Date = daysAgo(270);
      plans.push({
        _key: 'h_banana_1',
        planting_id: bananaPlanting.$id,
        crop_id: bananaCropId,
        harvest: {
          planting_id: bananaPlanting.$id,
          harvest_start_date: h1Date,
          harvest_end_date: h1Date,
          total_quantity_kg: 120,
          total_labor_cost: 150,
          total_other_costs: 30,
          status: 'Completed',
          is_continuous_picking: true,
          harvest_sequence: 1,
          notes: 'First banana harvest cycle.',
        },
        entries: [
          {
            entry_date: h1Date,
            quantity_kg: 120,
            farmhands_count: 2,
            labor_cost: 150,
            other_costs: 30,
            notes: 'First harvest from young plantation.',
          },
        ],
        // Story 3.6: Inventory aggregated on the LAST completed harvest only
        // (perennials use one farm_produce row per planting, upserted at runtime).
      });

      // Harvest 2: 6 months ago
      const h2Date = daysAgo(180);
      plans.push({
        _key: 'h_banana_2',
        planting_id: bananaPlanting.$id,
        crop_id: bananaCropId,
        harvest: {
          planting_id: bananaPlanting.$id,
          harvest_start_date: h2Date,
          harvest_end_date: h2Date,
          total_quantity_kg: 180,
          total_labor_cost: 160,
          total_other_costs: 35,
          status: 'Completed',
          is_continuous_picking: true,
          harvest_sequence: 2,
          notes: 'Second harvest cycle.',
        },
        entries: [
          {
            entry_date: h2Date,
            quantity_kg: 180,
            farmhands_count: 2,
            labor_cost: 160,
            other_costs: 35,
            notes: 'Increased yield as plantation matures.',
          },
        ],
      });

      // Harvest 3: In progress (3 months ago)
      const h3Date = daysAgo(90);
      plans.push({
        _key: 'h_banana_3',
        planting_id: bananaPlanting.$id,
        crop_id: bananaCropId,
        harvest: {
          planting_id: bananaPlanting.$id,
          harvest_start_date: h3Date,
          harvest_end_date: h3Date,
          total_quantity_kg: 200,
          total_labor_cost: 170,
          total_other_costs: 40,
          status: 'Completed',
          is_continuous_picking: true,
          harvest_sequence: 3,
          notes: 'Third harvest - peak production.',
        },
        entries: [
          {
            entry_date: h3Date,
            quantity_kg: 200,
            farmhands_count: 2,
            labor_cost: 170,
            other_costs: 40,
            notes: 'Peak harvest period.',
          },
        ],
        // Story 3.6: Cumulative produce row attached to the LAST completed harvest.
        // Banana cumulative: 120 + 180 + 200 = 500 kg.
        produce: {
          // Story 3.7: Naming convention for perennial - Banana – North Field (Ongoing)
          item_name: 'Banana – North Field (Ongoing)',
          item_type: 'farm_produce',
          quantity: 500,
          unit: 'kg',
          unit_cost: 5,
          status: 'in_stock',
          source: 'farm_harvest',
          reorder_threshold: 0,
          estimated_value: 500 * 5,
        },
      });
    }

    // --- Papaya: High-frequency harvests demonstrating 60-day cycle ---
    const papayaPlanting = plantingByKey('p_papaya_harvesting');
    const papayaCropId = cropId('Papaya');
    if (papayaPlanting && papayaCropId) {
      // 2 completed harvests at 60-day intervals + 1 in progress
      const papayaHarvests = [
        { days: 120, qty: 45, labor: 80, seq: 1 },
        { days: 60, qty: 60, labor: 90, seq: 2 },
        { days: 1, qty: 75, labor: 100, seq: 3 },
      ];
      // Story 3.6: Cumulative quantity from completed harvests only (seq 1+2 = 105 kg)
      const papayaCumulativeKg = papayaHarvests
        .filter((h) => h.seq !== 3)
        .reduce((sum, h) => sum + h.qty, 0);
      // Last completed harvest (seq 2) carries the aggregated produce row
      const papayaLastCompletedSeq = 2;

      papayaHarvests.forEach((h) => {
        const hDate = daysAgo(h.days);
        plans.push({
          _key: `h_papaya_${h.seq}`,
          planting_id: papayaPlanting.$id,
          crop_id: papayaCropId,
          harvest: {
            planting_id: papayaPlanting.$id,
            harvest_start_date: hDate,
            harvest_end_date: hDate,
            total_quantity_kg: h.qty,
            total_labor_cost: h.labor,
            total_other_costs: 20,
            status: h.seq === 3 ? 'In Progress' : 'Completed',
            is_continuous_picking: true,
            harvest_sequence: h.seq,
            notes: `Papaya harvest ${h.seq} - 60-day frequency.`,
          },
          entries: [
            {
              entry_date: hDate,
              quantity_kg: h.qty,
              farmhands_count: 1,
              labor_cost: h.labor,
              other_costs: 20,
              notes: `Harvest ${h.seq} - frequent picking cycle.`,
            },
          ],
          produce:
            h.seq === papayaLastCompletedSeq
              ? {
                  // Story 3.7: Naming convention for perennial - Papaya – East Garden (Ongoing)
                  item_name: 'Papaya – East Garden (Ongoing)',
                  item_type: 'farm_produce',
                  quantity: papayaCumulativeKg,
                  unit: 'kg',
                  unit_cost: 8,
                  status: 'in_stock',
                  source: 'farm_harvest',
                  reorder_threshold: 0,
                  estimated_value: papayaCumulativeKg * 8,
                }
              : undefined,
        });
      });
    }

    // --- Moringa: Very high-frequency leaf harvests at 45-day cycle ---
    const moringaPlanting = plantingByKey('p_moringa_harvesting');
    const moringaCropId = cropId('Moringa');
    if (moringaPlanting && moringaCropId) {
      // 3 completed harvests at 45-day intervals + 1 in progress
      const moringaHarvests = [
        { days: 135, qty: 30, labor: 50, seq: 1 },
        { days: 90, qty: 35, labor: 55, seq: 2 },
        { days: 45, qty: 40, labor: 60, seq: 3 },
        { days: 3, qty: 42, labor: 65, seq: 4 },
      ];
      // Story 3.6: Cumulative quantity from completed harvests only (seq 1+2+3 = 105 kg)
      const moringaCumulativeKg = moringaHarvests
        .filter((h) => h.seq !== 4)
        .reduce((sum, h) => sum + h.qty, 0);
      // Last completed harvest (seq 3) carries the aggregated produce row
      const moringaLastCompletedSeq = 3;

      moringaHarvests.forEach((h) => {
        const hDate = daysAgo(h.days);
        plans.push({
          _key: `h_moringa_${h.seq}`,
          planting_id: moringaPlanting.$id,
          crop_id: moringaCropId,
          harvest: {
            planting_id: moringaPlanting.$id,
            harvest_start_date: hDate,
            harvest_end_date: hDate,
            total_quantity_kg: h.qty,
            total_labor_cost: h.labor,
            total_other_costs: 10,
            status: h.seq === 4 ? 'In Progress' : 'Completed',
            is_continuous_picking: true,
            harvest_sequence: h.seq,
            notes: `Moringa leaf harvest ${h.seq} - 45-day frequency.`,
          },
          entries: [
            {
              entry_date: hDate,
              quantity_kg: h.qty,
              farmhands_count: 2,
              labor_cost: h.labor,
              other_costs: 10,
              notes: `Leaf harvest ${h.seq} - nutrient-dense greens.`,
            },
          ],
          produce:
            h.seq === moringaLastCompletedSeq
              ? {
                  // Story 3.7: Naming convention for perennial - Moringa – West Plot (Ongoing)
                  item_name: 'Moringa – West Plot (Ongoing)',
                  item_type: 'farm_produce',
                  quantity: moringaCumulativeKg,
                  unit: 'kg',
                  unit_cost: 12,
                  status: 'in_stock',
                  source: 'farm_harvest',
                  reorder_threshold: 0,
                  estimated_value: moringaCumulativeKg * 12,
                }
              : undefined,
        });
      });
    }

    // NOTE: The previously-seeded "failed maize" harvest has been dropped.
    // Failed plantings no longer get a zero-yield harvest record; their
    // `status = 'failed'` on the planting itself carries that meaning.

    return plans;
  }

  // ==========================================================================
  // ENSURE-EXISTS HELPERS
  // ==========================================================================

  async function ensureSoilTypes(dbId) {
    const existing = await tables.listRows({
      databaseId: dbId,
      tableId: 'soil_types',
      queries: [Query.limit(100)],
    });
    if ((existing.rows || []).length > 0) return existing.rows;

    const created = [];
    for (const t of DEFAULT_SOIL_TYPES) {
      const row = await createRowWithRetry(dbId, 'soil_types', t);
      created.push(row);
    }
    return created;
  }

  async function ensureCrops(dbId) {
    const existing = await tables.listRows({
      databaseId: dbId,
      tableId: 'crops',
      queries: [Query.limit(100)],
    });
    if ((existing.rows || []).length > 0) return existing.rows;

    const created = [];
    for (const c of DEFAULT_CROPS) {
      const row = await createRowWithRetry(dbId, 'crops', { ...c, is_active: true });
      created.push(row);
    }
    return created;
  }

  // ==========================================================================
  // LOW-LEVEL APPWRITE HELPERS (shared pattern w/ useFinanceSampleData)
  // ==========================================================================

  const MAX_RETRY_DELAY_MS = 30000; // Cap backoff at 30s so we can survive a 60s rate window
  const PER_ROW_DELAY_MS = 120; // Gentle pacing within a batch to reduce 429 frequency

  /**
   * Create a single row with retry/backoff for rate limiting.
   */
  async function createRowWithRetry(dbId, tableId, data, retries = 6, delay = 2000) {
    try {
      return await tables.createRow({
        databaseId: dbId,
        tableId,
        rowId: ID.unique(),
        data,
      });
    } catch (err) {
      if ((err.code === 429 || err.type === 'general_rate_limit_exceeded') && retries > 0) {
        const waitMs = Math.min(delay, MAX_RETRY_DELAY_MS);
        console.warn(
          `Rate limit hit for ${tableId}, retrying in ${waitMs}ms (${retries} retries left)...`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        return createRowWithRetry(
          dbId,
          tableId,
          data,
          retries - 1,
          Math.min(delay * 2, MAX_RETRY_DELAY_MS),
        );
      }
      console.error(`Error inserting into ${tableId}:`, data, err);
      throw err;
    }
  }

  /**
   * Batch insert items with rate-limit-aware pacing.
   * items: Array<{ data: object, _key?: string }>  OR plain object array.
   * Returns an array of the created rows, preserving input order, with `_key`
   * copied onto each returned row for later lookup.
   */
  async function batchInsert(dbId, tableId, items, batchSize = 5, interBatchDelayMs = 1000) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      for (let j = 0; j < batch.length; j++) {
        const entry = batch[j];
        const payload = entry && typeof entry === 'object' && 'data' in entry ? entry.data : entry;
        const row = await createRowWithRetry(dbId, tableId, payload);
        if (entry && entry._key) row._key = entry._key;
        results.push(row);
        // Gentle pacing between rows inside a batch
        if (j < batch.length - 1) {
          await new Promise((r) => setTimeout(r, PER_ROW_DELAY_MS));
        }
      }
      if (i + batchSize < items.length) {
        await new Promise((r) => setTimeout(r, interBatchDelayMs));
      }
    }
    return results;
  }

  function deriveInventoryStatus(quantity, reorderThreshold) {
    if (!quantity || quantity <= 0) return 'out_of_stock';
    if (reorderThreshold != null && quantity <= reorderThreshold) return 'low_stock';
    return 'in_stock';
  }

  function toISO(dateLike) {
    if (!dateLike) return new Date().toISOString();
    if (typeof dateLike === 'string' && dateLike.includes('T')) return dateLike;
    // date-only string -> add midday UTC
    return new Date(`${dateLike}T12:00:00Z`).toISOString();
  }

  return {
    seedFarmData,
    isFarmSeeding,
    farmSeedingProgress,
    farmSeedingStatus,
  };
}
