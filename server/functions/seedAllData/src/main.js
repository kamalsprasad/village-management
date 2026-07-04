import { Client, TablesDB, ID, Query } from 'node-appwrite';
import { SAMPLE_HOUSEHOLDS, SAMPLE_RESIDENTS, TIMETABLE_SCHEDULE } from './data.js';

// =============================================================================
// HELPERS
// =============================================================================

function isTransientError(err) {
  if (!err) return false;
  const code = err.code || err.status || 0;
  return code === 429 || code === 408 || code >= 500;
}

async function createRow(tablesDB, dbId, tableId, data, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await tablesDB.createRow({ databaseId: dbId, tableId, rowId: ID.unique(), data });
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function updateRow(tablesDB, dbId, tableId, rowId, data, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await tablesDB.updateRow({ databaseId: dbId, tableId, rowId, data });
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function batchRun(tasks, concurrency = 25) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map((fn) => fn()));
    results.push(...chunkResults);
  }
  return results;
}

async function listAll(tablesDB, dbId, tableId) {
  const res = await tablesDB.listRows({ databaseId: dbId, tableId, queries: [Query.limit(100)] });
  return res.rows || [];
}

function toISO(v) {
  if (!v) return new Date().toISOString();
  if (typeof v === 'string' && v.includes('T')) return v;
  return new Date(`${v}T12:00:00Z`).toISOString();
}

function invStatus(qty, thr) {
  if (!qty || qty <= 0) return 'out_of_stock';
  if (thr != null && qty <= thr) return 'low_stock';
  return 'in_stock';
}

function findResIdx(first, last) {
  return SAMPLE_RESIDENTS.findIndex((r) => r.first_name === first && r.last_name === last);
}

// =============================================================================
// PHASE 1 — HOUSEHOLDS + RESIDENTS
// =============================================================================

async function seedHouseholdsAndResidents(tablesDB, dbId, log) {
  log('Phase 1: Households...');
  const householdRows = await batchRun(
    SAMPLE_HOUSEHOLDS.map((h) => () => createRow(tablesDB, dbId, 'households', h)),
  );
  const householdIds = householdRows.map((r) => r.$id);

  log('Phase 1: Residents...');
  const residentRows = await batchRun(
    SAMPLE_RESIDENTS.map(
      (r) => () =>
        createRow(tablesDB, dbId, 'residents', {
          first_name: r.first_name,
          middle_names: r.middle_names || '',
          last_name: r.last_name,
          dob: r.dob,
          gender: r.gender,
          household_id: householdIds[r.householdIndex],
          room_number: r.room_number || '',
          phone: r.phone || '',
          notes: r.notes || '',
        }),
    ),
  );
  const residentIds = residentRows.map((r) => r.$id);
  const councilMemberIds = [];
  const headMap = {};
  for (let i = 0; i < SAMPLE_RESIDENTS.length; i++) {
    const r = SAMPLE_RESIDENTS[i];
    if (r.isCouncilMember)
      councilMemberIds.push({ residentId: residentIds[i], role: r.councilRole });
    if (headMap[r.householdIndex] === undefined) headMap[r.householdIndex] = residentIds[i];
  }

  log('Phase 1: Setting household heads...');
  await batchRun(
    Object.entries(headMap).map(([hIdx, headId]) => () => {
      const i = parseInt(hIdx);
      return updateRow(tablesDB, dbId, 'households', householdIds[i], {
        ...SAMPLE_HOUSEHOLDS[i],
        head_resident_id: headId,
      });
    }),
  );
  log(`  Done: ${householdIds.length} households, ${residentIds.length} residents`);
  return { residentIds, councilMemberIds };
}

// =============================================================================
// PHASE 2 — FINANCE
// =============================================================================

async function seedFinance(tablesDB, dbId, residentIds, log) {
  log('Phase 2: Finance categories...');
  const catDefs = [
    {
      name: 'Community Contributions',
      type: 'income',
      subcategories: ['Monthly Fee', 'Special Levy'],
    },
    {
      name: 'Grants & Donations',
      type: 'income',
      subcategories: ['Government Grant', 'NGO Donation'],
    },
    { name: 'Farming Revenue', type: 'income', subcategories: ['Crop Sales', 'Livestock'] },
    { name: 'Loan Repayment', type: 'income', subcategories: ['Principal', 'Interest'] },
    {
      name: 'Infrastructure Maintenance',
      type: 'expense',
      subcategories: ['Water Pump', 'Solar Panels', 'Road Repair'],
    },
    {
      name: 'Education Support',
      type: 'expense',
      subcategories: ['School Supplies', 'Teacher Allowance'],
    },
    { name: 'Health Clinic', type: 'expense', subcategories: ['Medicines', 'Equipment'] },
    { name: 'Administration', type: 'expense', subcategories: ['Office Supplies', 'Travel'] },
    { name: 'Loan Disbursement', type: 'expense', subcategories: ['Agriculture', 'Business'] },
  ];
  const categories = await batchRun(
    catDefs.map((c) => () => createRow(tablesDB, dbId, 'finance_categories', c)),
  );
  const getCatId = (name) => categories.find((c) => c.name === name)?.$id;

  log('Phase 2: Funding sources...');
  const now = new Date();
  const mAgo = (n) =>
    new Date(now.getFullYear(), now.getMonth() - n, 1).toISOString().split('T')[0];
  const fundingSources = await batchRun([
    () =>
      createRow(tablesDB, dbId, 'funding_sources', {
        name: 'Village General Fund',
        type: 'income',
        total_received: 50000,
        current_balance: 15500,
        date_received: mAgo(18),
        status: 'active',
      }),
    () =>
      createRow(tablesDB, dbId, 'funding_sources', {
        name: 'Water Sanitation Grant 2024',
        type: 'grant',
        total_received: 120000,
        current_balance: 45000,
        date_received: mAgo(14),
        restrictions: 'Water infrastructure only',
        status: 'active',
      }),
    () =>
      createRow(tablesDB, dbId, 'funding_sources', {
        name: 'Rotary Education Initiative',
        type: 'donation',
        total_received: 30000,
        current_balance: 0,
        date_received: mAgo(12),
        restrictions: 'School supplies and teacher allowances',
        status: 'depleted',
      }),
    () =>
      createRow(tablesDB, dbId, 'funding_sources', {
        name: 'Micro-Finance Seed Fund',
        type: 'grant',
        total_received: 80000,
        current_balance: 32000,
        date_received: mAgo(16),
        restrictions: 'Village loans only',
        status: 'active',
      }),
  ]);
  const getSrcId = (name) => fundingSources.find((s) => s.name === name)?.$id;

  log('Phase 2: Transactions (18 months)...');
  const txTasks = [];
  for (let i = 18; i >= 0; i--) {
    const md = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = md.getFullYear(),
      m = md.getMonth();
    const dt = (d) => new Date(Date.UTC(y, m, d)).toISOString();
    txTasks.push(() =>
      createRow(tablesDB, dbId, 'finance_transactions', {
        type: 'income',
        amount_needed: 2500,
        amount_funded: 2650,
        payment_method: 'Cash',
        category_id: getCatId('Community Contributions'),
        source_module: 'Village',
        funding_source_id: getSrcId('Village General Fund'),
        date: dt(5),
        description: `Monthly contributions ${md.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        status: 'completed',
      }),
    );
    txTasks.push(() =>
      createRow(tablesDB, dbId, 'finance_transactions', {
        type: 'expense',
        amount_needed: 900,
        amount_funded: 900,
        payment_method: 'Bank Transfer',
        category_id: getCatId('Administration'),
        source_module: 'Village',
        funding_source_id: getSrcId('Village General Fund'),
        date: dt(15),
        description: 'Monthly office supplies',
        status: 'completed',
      }),
    );
    if (m % 2 === 0)
      txTasks.push(() =>
        createRow(tablesDB, dbId, 'finance_transactions', {
          type: 'expense',
          amount_needed: 2500,
          amount_funded: 2500,
          payment_method: 'Bank Transfer',
          category_id: getCatId('Infrastructure Maintenance'),
          source_module: 'Village',
          funding_source_id: getSrcId('Water Sanitation Grant 2024'),
          date: dt(20),
          description: 'Water pump maintenance',
          status: 'completed',
        }),
      );
    if (m % 3 === 0 && i <= 12)
      txTasks.push(() =>
        createRow(tablesDB, dbId, 'finance_transactions', {
          type: 'expense',
          amount_needed: 2500,
          amount_funded: 2500,
          payment_method: 'Cash',
          category_id: getCatId('Education Support'),
          source_module: 'School',
          funding_source_id: getSrcId('Rotary Education Initiative'),
          date: dt(8),
          description: 'Teacher allowances',
          status: 'completed',
        }),
      );
    if (m >= 4 && m <= 6)
      txTasks.push(() =>
        createRow(tablesDB, dbId, 'finance_transactions', {
          type: 'income',
          amount_needed: 8000,
          amount_funded: 8000,
          payment_method: 'Mobile Money',
          category_id: getCatId('Farming Revenue'),
          source_module: 'Farm',
          funding_source_id: getSrcId('Village General Fund'),
          date: dt(18),
          description: 'Harvest sales',
          status: 'completed',
        }),
      );
  }
  await batchRun(txTasks, 25);

  log('Phase 2: Loans...');
  const today = new Date();
  const ds = (y, mo, d) => new Date(y, mo, d).toISOString().split('T')[0];
  const loanCfgs = [
    {
      bi: 0,
      p: 3000,
      ir: 10,
      term: 6,
      mp: 6,
      purpose: 'farm',
      coll: 'Tractor',
      smo: -15,
      sd: 5,
      status: 'paid_off',
      ndmo: null,
    },
    {
      bi: 1,
      p: 5000,
      ir: 12,
      term: 12,
      mp: 6,
      purpose: 'business',
      coll: 'Bicycle',
      smo: -6,
      sd: 12,
      status: 'active',
      ndmo: 1,
      ndd: 12,
    },
    {
      bi: 2,
      p: 2000,
      ir: 15,
      term: 12,
      mp: 4,
      purpose: 'medical',
      coll: 'Car',
      smo: -8,
      sd: 20,
      status: 'active',
      ndmo: -3,
      ndd: 20,
    },
  ];
  for (const cfg of loanCfgs) {
    const start = new Date(today.getFullYear(), today.getMonth() + cfg.smo, cfg.sd);
    const total = Math.round(cfg.p * (1 + cfg.ir / 100));
    const pay = Math.round(total / cfg.term);
    const outstanding = cfg.status === 'paid_off' ? 0 : total - pay * cfg.mp;
    const nextDue =
      cfg.ndmo === null ? null : ds(today.getFullYear(), today.getMonth() + cfg.ndmo, cfg.ndd);
    const loan = await createRow(tablesDB, dbId, 'loans', {
      borrower_id: residentIds[cfg.bi],
      principal_amount: cfg.p,
      interest_rate: cfg.ir,
      term_months: cfg.term,
      repayment_frequency: 'monthly',
      collateral_description: cfg.coll,
      purpose: cfg.purpose,
      disbursement_date: ds(start.getFullYear(), start.getMonth(), cfg.sd),
      status: cfg.status,
      outstanding_balance: outstanding,
      total_repayment: total,
      payment_amount: pay,
      next_due_date: nextDue,
    });
    const installmentTasks = [];
    for (let i = 1; i <= cfg.term; i++) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      const isPaid = i <= cfg.mp;
      installmentTasks.push(async () => {
        await createRow(tablesDB, dbId, 'repayment_schedule', {
          loan_id: loan.$id,
          installment_number: i,
          due_date: due.toISOString().split('T')[0],
          amount: pay,
          status: isPaid ? 'paid' : due < today ? 'overdue' : 'pending',
          paid_date: isPaid ? due.toISOString().split('T')[0] : null,
        });
        if (isPaid) {
          const tx = await createRow(tablesDB, dbId, 'finance_transactions', {
            type: 'income',
            amount_needed: pay,
            amount_funded: pay,
            payment_method: 'Cash',
            category_id: getCatId('Loan Repayment'),
            source_module: 'Finance',
            date: due.toISOString(),
            description: `Loan repayment installment ${i}`,
            status: 'completed',
          });
          await createRow(tablesDB, dbId, 'loan_payments', {
            loan_id: loan.$id,
            amount: pay,
            payment_date: due.toISOString().split('T')[0],
            payment_method: 'Cash',
            notes: `Installment ${i}/${cfg.term}`,
            finance_transaction_id: tx.$id,
          });
        }
      });
    }
    await batchRun(installmentTasks, 25);
  }
  log('  Finance done');
  return { categories, fundingSources };
}

// =============================================================================
// PHASE 3 — FARM
// =============================================================================

async function seedFarm(tablesDB, dbId, residentIds, categories, fundingSources, log) {
  log('Phase 3: Soil types...');
  const SOIL_TYPES = [
    { name: 'Sandy', description: 'Light, warm.', color_code: '#F4E4C1', is_system_default: true },
    {
      name: 'Clay',
      description: 'Heavy, nutrient-rich.',
      color_code: '#8B7355',
      is_system_default: true,
    },
    { name: 'Loam', description: 'Ideal mix.', color_code: '#5D4E37', is_system_default: true },
    {
      name: 'Silt',
      description: 'Fertile, moisture-retentive.',
      color_code: '#A89F91',
      is_system_default: true,
    },
    {
      name: 'Peaty',
      description: 'High organic matter.',
      color_code: '#3D2914',
      is_system_default: true,
    },
    {
      name: 'Chalky',
      description: 'Alkaline, free-draining.',
      color_code: '#E5E4E2',
      is_system_default: true,
    },
    { name: 'Other', description: 'Unclassified.', color_code: '#888888', is_system_default: true },
  ];
  let soilTypes = await listAll(tablesDB, dbId, 'soil_types');
  if (!soilTypes.length)
    soilTypes = await batchRun(
      SOIL_TYPES.map((t) => () => createRow(tablesDB, dbId, 'soil_types', t)),
    );
  const soilId = (n) => soilTypes.find((s) => s.name === n)?.$id || null;

  log('Phase 3: Crops...');
  const CROPS = [
    {
      crop_name: 'Maize',
      category: 'Grain',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 3500,
      growing_season: 'Warm',
      notes: 'Staple crop.',
    },
    {
      crop_name: 'Groundnuts',
      category: 'Legume',
      crop_type: 'Annual',
      maturity_days: 100,
      typical_yield_per_hectare: 1800,
      growing_season: 'Warm',
      notes: 'Nitrogen-fixing.',
    },
    {
      crop_name: 'Soybeans',
      category: 'Legume',
      crop_type: 'Annual',
      maturity_days: 110,
      typical_yield_per_hectare: 2200,
      growing_season: 'Warm',
      notes: 'High protein.',
    },
    {
      crop_name: 'Tomatoes',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 75,
      typical_yield_per_hectare: 25000,
      growing_season: 'All Year',
      notes: 'High-value.',
    },
    {
      crop_name: 'Rape',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 45,
      typical_yield_per_hectare: 8000,
      growing_season: 'Cool',
      notes: 'Fast-growing.',
    },
    {
      crop_name: 'Sweet Potato',
      category: 'Root',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 14000,
      growing_season: 'All Year',
      notes: 'Nutritious.',
    },
    {
      crop_name: 'Cabbage',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 90,
      typical_yield_per_hectare: 40000,
      growing_season: 'Cool',
      notes: 'Cool-season.',
    },
    {
      crop_name: 'Onions',
      category: 'Vegetable',
      crop_type: 'Annual',
      maturity_days: 120,
      typical_yield_per_hectare: 20000,
      growing_season: 'Cool',
      notes: 'Good storage.',
    },
    {
      crop_name: 'Banana',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 365,
      harvest_frequency_days: 90,
      typical_yield_per_hectare: 20000,
      growing_season: 'All Year',
      notes: 'Continuous perennial.',
    },
    {
      crop_name: 'Mango',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 730,
      harvest_frequency_days: 365,
      typical_yield_per_hectare: 15000,
      growing_season: 'Warm',
      notes: 'Annual harvest perennial.',
    },
    {
      crop_name: 'Papaya',
      category: 'Fruit',
      crop_type: 'Perennial',
      maturity_days: 180,
      harvest_frequency_days: 60,
      typical_yield_per_hectare: 30000,
      growing_season: 'All Year',
      notes: 'Frequent-harvest perennial.',
    },
    {
      crop_name: 'Moringa',
      category: 'Vegetable',
      crop_type: 'Perennial',
      maturity_days: 240,
      harvest_frequency_days: 45,
      typical_yield_per_hectare: 25000,
      growing_season: 'All Year',
      notes: 'Nutrient-dense perennial.',
    },
  ];
  let crops = await listAll(tablesDB, dbId, 'crops');
  if (!crops.length)
    crops = await batchRun(
      CROPS.map((c) => () => createRow(tablesDB, dbId, 'crops', { ...c, is_active: true })),
    );
  const cropId = (n) => crops.find((c) => c.crop_name === n)?.$id || null;

  const today = new Date();
  const dAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };
  const addD = (base, n) => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  };
  const isoMo = (mo) => new Date(today.getFullYear(), today.getMonth() - mo, 15).toISOString();

  const findResId = (f, l) => {
    const i = findResIdx(f, l);
    return i >= 0 ? residentIds[i] : null;
  };
  const emmanuelId = findResId('Emmanuel', 'Phiri');
  const danielId = findResId('Daniel', 'Zulu');

  log('Phase 3: Farm inputs...');
  const inputs = [
    {
      item_name: 'Maize Seed (SC627)',
      item_type: 'farm_inputs',
      quantity: 40,
      unit: 'kg',
      unit_cost: 55,
      source: 'finance_purchase',
      reorder_threshold: 20,
      date_added: isoMo(8),
    },
    {
      item_name: 'Groundnut Seed (MGV-4)',
      item_type: 'farm_inputs',
      quantity: 25,
      unit: 'kg',
      unit_cost: 80,
      source: 'finance_purchase',
      reorder_threshold: 10,
      date_added: isoMo(7),
    },
    {
      item_name: 'Soybean Seed (Hernon-147)',
      item_type: 'farm_inputs',
      quantity: 18,
      unit: 'kg',
      unit_cost: 65,
      source: 'finance_purchase',
      reorder_threshold: 10,
      date_added: isoMo(6),
    },
    {
      item_name: 'Tomato Seedlings (Roma VF)',
      item_type: 'farm_inputs',
      quantity: 600,
      unit: 'seedlings',
      unit_cost: 1.5,
      source: 'finance_purchase',
      reorder_threshold: 200,
      date_added: isoMo(2),
    },
    {
      item_name: 'Rape Seed (Chinese Cabbage)',
      item_type: 'farm_inputs',
      quantity: 3,
      unit: 'kg',
      unit_cost: 90,
      source: 'donation',
      reorder_threshold: 2,
      date_added: isoMo(3),
    },
    {
      item_name: 'Sweet Potato Vines (Orange-flesh)',
      item_type: 'farm_inputs',
      quantity: 0,
      unit: 'bundles',
      unit_cost: 20,
      source: 'donation',
      reorder_threshold: 10,
      date_added: isoMo(5),
    },
    {
      item_name: 'D-Compound Fertilizer',
      item_type: 'farm_inputs',
      quantity: 8,
      unit: 'bags_50kg',
      unit_cost: 550,
      source: 'finance_purchase',
      reorder_threshold: 4,
      date_added: isoMo(6),
    },
    {
      item_name: 'Urea Top-Dressing Fertilizer',
      item_type: 'farm_inputs',
      quantity: 5,
      unit: 'bags_50kg',
      unit_cost: 600,
      source: 'finance_purchase',
      reorder_threshold: 4,
      date_added: isoMo(5),
    },
  ];
  await batchRun(
    inputs.map(
      (inp) => () =>
        createRow(tablesDB, dbId, 'inventory', {
          ...inp,
          estimated_value: Math.round(inp.quantity * inp.unit_cost * 100) / 100,
          status: invStatus(inp.quantity, inp.reorder_threshold),
          last_updated: inp.date_added,
        }),
    ),
  );

  log('Phase 3: Plots...');
  const plotDefs = [
    {
      _k: 'north_field',
      name: 'North Field',
      size_hectares: 5.0,
      location_description: 'Largest plot along the main road.',
      soil_type_id: soilId('Loam'),
      status: 'Active',
      crop_manager_id: emmanuelId,
    },
    {
      _k: 'south_field',
      name: 'South Field',
      size_hectares: 3.5,
      location_description: 'Rolling land south of the river bank.',
      soil_type_id: soilId('Sandy'),
      status: 'Active',
      crop_manager_id: danielId,
    },
    {
      _k: 'east_garden',
      name: 'East Garden',
      size_hectares: 1.0,
      location_description: 'Fenced vegetable garden near the clinic.',
      soil_type_id: soilId('Loam'),
      status: 'Active',
      crop_manager_id: emmanuelId,
    },
    {
      _k: 'west_plot',
      name: 'West Plot',
      size_hectares: 2.5,
      location_description: 'Western plot resting after last season.',
      soil_type_id: soilId('Clay'),
      status: 'Fallow',
      crop_manager_id: danielId,
    },
    {
      _k: 'riverside_plot',
      name: 'Riverside Plot',
      size_hectares: 1.5,
      location_description: 'Silty soil near the stream.',
      soil_type_id: soilId('Silt'),
      status: 'Active',
      crop_manager_id: emmanuelId,
    },
  ];
  const plotRows = await batchRun(
    plotDefs.map(
      ({ _k, ...data }) =>
        () =>
          createRow(tablesDB, dbId, 'plots', data),
    ),
  );
  const plots = {};
  plotDefs.forEach((pd, i) => {
    plots[pd._k] = plotRows[i];
  });
  const plotId = (k) => plots[k]?.$id;

  log('Phase 3: Plantings...');
  const pd = [
    {
      _k: 'p_maize_completed',
      plot_id: plotId('north_field'),
      crop_id: cropId('Maize'),
      planting_date: dAgo(300),
      expected_harvest_date: addD(dAgo(300), 120),
      area_used_hectares: 1.5,
      quantity_planted: 60,
      unit: 'kg',
      inputs_cost: 6050,
      labor_cost: 1200,
      other_cost: 0,
      notes: 'Maize planting.',
      status: 'completed',
    },
    {
      _k: 'p_tomato_harvesting',
      plot_id: plotId('east_garden'),
      crop_id: cropId('Tomatoes'),
      planting_date: dAgo(80),
      expected_harvest_date: addD(dAgo(80), 75),
      area_used_hectares: 0.5,
      quantity_planted: 400,
      unit: 'seedlings',
      inputs_cost: 1050,
      labor_cost: 600,
      other_cost: 0,
      notes: 'Tomato transplanting.',
      status: 'harvesting',
    },
    {
      _k: 'p_groundnut_growing',
      plot_id: plotId('south_field'),
      crop_id: cropId('Groundnuts'),
      planting_date: dAgo(60),
      expected_harvest_date: addD(dAgo(60), 100),
      area_used_hectares: 1.0,
      quantity_planted: 40,
      unit: 'kg',
      inputs_cost: 3200,
      labor_cost: 900,
      other_cost: 0,
      notes: 'Groundnut planting.',
      status: 'growing',
    },
    {
      _k: 'p_rape_planted',
      plot_id: plotId('east_garden'),
      crop_id: cropId('Rape'),
      planting_date: dAgo(15),
      expected_harvest_date: addD(dAgo(15), 45),
      area_used_hectares: 0.3,
      quantity_planted: 2,
      unit: 'kg',
      inputs_cost: 180,
      labor_cost: 200,
      other_cost: 0,
      notes: 'Rape seeding.',
      status: 'planted',
    },
    {
      _k: 'p_maize_failed',
      plot_id: plotId('riverside_plot'),
      crop_id: cropId('Maize'),
      planting_date: dAgo(200),
      expected_harvest_date: addD(dAgo(200), 120),
      area_used_hectares: 0.8,
      quantity_planted: 20,
      unit: 'kg',
      inputs_cost: 2200,
      labor_cost: 450,
      other_cost: 0,
      notes: 'Failed due to drought.',
      status: 'failed',
    },
    {
      _k: 'p_sp_completed',
      plot_id: plotId('south_field'),
      crop_id: cropId('Sweet Potato'),
      planting_date: dAgo(240),
      expected_harvest_date: addD(dAgo(240), 120),
      area_used_hectares: 1.2,
      quantity_planted: null,
      unit: 'bundles',
      inputs_cost: 0,
      labor_cost: 750,
      other_cost: 200,
      notes: 'Donated vines.',
      status: 'completed',
    },
    {
      _k: 'p_soy_growing',
      plot_id: plotId('north_field'),
      crop_id: cropId('Soybeans'),
      planting_date: dAgo(50),
      expected_harvest_date: addD(dAgo(50), 110),
      area_used_hectares: 0.5,
      quantity_planted: null,
      unit: 'kg',
      inputs_cost: 2900,
      labor_cost: 750,
      other_cost: 0,
      notes: 'Purchased seed.',
      status: 'growing',
    },
    {
      _k: 'p_cabbage_planted',
      plot_id: plotId('riverside_plot'),
      crop_id: cropId('Cabbage'),
      planting_date: dAgo(20),
      expected_harvest_date: addD(dAgo(20), 90),
      area_used_hectares: 0.7,
      quantity_planted: null,
      unit: 'seedlings',
      inputs_cost: 300,
      labor_cost: 450,
      other_cost: 0,
      notes: 'Cabbage planting.',
      status: 'planted',
    },
    {
      _k: 'p_upcoming_harvest',
      plot_id: plotId('east_garden'),
      crop_id: cropId('Tomatoes'),
      planting_date: dAgo(75),
      expected_harvest_date: addD(dAgo(75), 80),
      area_used_hectares: 0.5,
      quantity_planted: 300,
      unit: 'seedlings',
      inputs_cost: 500,
      labor_cost: 800,
      other_cost: 0,
      notes: 'Upcoming harvest demo.',
      status: 'growing',
    },
    {
      _k: 'p_banana_harvesting',
      plot_id: plotId('north_field'),
      crop_id: cropId('Banana'),
      planting_date: dAgo(365),
      expected_harvest_date: addD(dAgo(365), 90),
      area_used_hectares: 1.0,
      quantity_planted: 50,
      unit: 'suckers',
      inputs_cost: 2000,
      labor_cost: 1500,
      other_cost: 500,
      notes: 'Banana plantation.',
      status: 'harvesting',
    },
    {
      _k: 'p_papaya_harvesting',
      plot_id: plotId('east_garden'),
      crop_id: cropId('Papaya'),
      planting_date: dAgo(180),
      expected_harvest_date: addD(dAgo(180), 60),
      area_used_hectares: 0.4,
      quantity_planted: 15,
      unit: 'seedlings',
      inputs_cost: 800,
      labor_cost: 600,
      other_cost: 200,
      notes: 'Papaya frequent harvests.',
      status: 'harvesting',
    },
    {
      _k: 'p_maize_underperforming',
      plot_id: plotId('south_field'),
      crop_id: cropId('Maize'),
      planting_date: dAgo(270),
      expected_harvest_date: addD(dAgo(270), 120),
      area_used_hectares: 1.0,
      quantity_planted: 10,
      unit: 'kg',
      inputs_cost: 800,
      labor_cost: 1200,
      other_cost: 200,
      notes: 'Drought-stressed.',
      status: 'completed',
    },
    {
      _k: 'p_moringa_harvesting',
      plot_id: plotId('west_plot'),
      crop_id: cropId('Moringa'),
      planting_date: dAgo(240),
      expected_harvest_date: addD(dAgo(240), 45),
      area_used_hectares: 0.2,
      quantity_planted: 30,
      unit: 'seedlings',
      inputs_cost: 400,
      labor_cost: 800,
      other_cost: 100,
      notes: 'Moringa leaf harvest.',
      status: 'harvesting',
    },
  ].filter((d) => d.plot_id && d.crop_id);
  const plantingRows = await batchRun(
    pd.map(
      ({ _k, ...data }) =>
        () =>
          createRow(tablesDB, dbId, 'plantings', data),
    ),
  );
  const plantings = {};
  pd.forEach((p, i) => {
    plantings[p._k] = plantingRows[i];
  });
  const pByK = (k) => plantings[k];

  log('Phase 3: Harvests + produce + sales...');
  const farmRevCat = categories.find((c) => c.name === 'Farming Revenue');
  const villageFund = fundingSources.find((s) => s.name === 'Village General Fund');

  const harvestPlans = buildHarvestPlans(dAgo, pByK, cropId);
  await batchRun(
    harvestPlans.map((plan) => async () => {
      const hRow = await createRow(tablesDB, dbId, 'harvests', plan.harvest);
      if (plan.entries?.length) {
        await batchRun(
          plan.entries.map(
            (entry) => () =>
              createRow(tablesDB, dbId, 'harvest_entries', { ...entry, harvest_id: hRow.$id }),
          ),
        );
      }
      if (!plan.produce) return;
      const pData = {
        ...plan.produce,
        source_reference_id: hRow.$id,
        planting_id: plan.planting_id,
        crop_id: plan.crop_id,
        date_added: toISO(plan.harvest.harvest_end_date || plan.harvest.harvest_start_date),
      };
      pData.last_updated = pData.date_added;
      const pRow = await createRow(tablesDB, dbId, 'inventory', pData);
      if (!plan.sale || !farmRevCat) return;
      const tx = await createRow(tablesDB, dbId, 'finance_transactions', {
        type: 'income',
        amount_needed: plan.sale.total_amount,
        amount_funded: plan.sale.total_amount,
        payment_method: plan.sale.payment_method,
        category_id: farmRevCat.$id,
        source_module: 'Farm',
        funding_source_id: villageFund?.$id || null,
        date: new Date(`${plan.sale.sale_date}T10:00:00Z`).toISOString(),
        description: `Sale: ${plan.sale.quantity_sold}kg to ${plan.sale.buyer_name}`,
        status: 'completed',
      });
      await createRow(tablesDB, dbId, 'farm_sales', {
        harvest_id: hRow.$id,
        inventory_item_id: pRow.$id,
        finance_transaction_id: tx.$id,
        ...(plan.crop_id ? { crop_id: plan.crop_id } : {}),
        buyer_type: plan.sale.buyer_type,
        buyer_id: '',
        buyer_name: plan.sale.buyer_name,
        sale_date: toISO(plan.sale.sale_date),
        quantity_sold: plan.sale.quantity_sold,
        unit: plan.sale.unit || 'kg',
        price_per_unit: plan.sale.price_per_unit,
        total_amount: plan.sale.total_amount,
        payment_status: plan.sale.payment_status || 'Completed',
        payment_method: plan.sale.payment_method,
        notes: plan.sale.notes || '',
      });
      let totalSold = plan.sale.quantity_sold;
      if (plan.additional_sale) {
        const aS = plan.additional_sale;
        const aTx = await createRow(tablesDB, dbId, 'finance_transactions', {
          type: 'income',
          amount_needed: aS.total_amount,
          amount_funded: aS.total_amount,
          payment_method: aS.payment_method,
          category_id: farmRevCat.$id,
          source_module: 'Farm',
          funding_source_id: villageFund?.$id || null,
          date: new Date(`${aS.sale_date}T14:00:00Z`).toISOString(),
          description: `Sale: ${aS.quantity_sold}kg to ${aS.buyer_name}`,
          status: 'completed',
        });
        await createRow(tablesDB, dbId, 'farm_sales', {
          harvest_id: hRow.$id,
          inventory_item_id: pRow.$id,
          finance_transaction_id: aTx.$id,
          ...(plan.crop_id ? { crop_id: plan.crop_id } : {}),
          buyer_type: aS.buyer_type,
          buyer_id: '',
          buyer_name: aS.buyer_name,
          sale_date: toISO(aS.sale_date),
          quantity_sold: aS.quantity_sold,
          unit: aS.unit || 'kg',
          price_per_unit: aS.price_per_unit,
          total_amount: aS.total_amount,
          payment_status: aS.payment_status || 'Completed',
          payment_method: aS.payment_method,
          notes: aS.notes || '',
        });
        totalSold += aS.quantity_sold;
      }
      const rem = Math.max(0, (pData.quantity || 0) - totalSold);
      try {
        await updateRow(tablesDB, dbId, 'inventory', pRow.$id, {
          quantity: rem,
          estimated_value: Math.round(rem * (pData.unit_cost || 0) * 100) / 100,
          status: invStatus(rem, pData.reorder_threshold),
          last_updated: toISO(plan.additional_sale?.sale_date || plan.sale.sale_date),
        });
      } catch (_) {
        /* non-fatal */
      }
    }),
    5,
  );
  log('  Farm done');
}

function buildHarvestPlans(dAgo, pByK, cropId) {
  const plans = [];
  const mCId = cropId('Maize');
  const maize = pByK('p_maize_completed');
  if (maize && mCId) {
    const hd = dAgo(180);
    plans.push({
      planting_id: maize.$id,
      crop_id: mCId,
      harvest: {
        planting_id: maize.$id,
        harvest_start_date: hd,
        harvest_end_date: hd,
        total_quantity_kg: 4200,
        total_labor_cost: 1800,
        total_other_costs: 400,
        status: 'Completed',
        notes: 'Grade A quality.',
      },
      entries: [
        {
          entry_date: hd,
          quantity_kg: 4200,
          farmhands_count: 10,
          labor_cost: 1800,
          other_costs: 400,
          other_costs_notes: 'Transport',
          notes: 'Single-day pick.',
        },
      ],
      produce: {
        item_name: 'Maize – North Field 2025/26 Wet Season',
        item_type: 'farm_produce',
        quantity: 4200,
        unit: 'kg',
        unit_cost: 3.5,
        status: 'in_stock',
        source: 'farm_harvest',
        reorder_threshold: 0,
        estimated_value: 14700,
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
        sale_date: dAgo(160),
        notes: 'Bulk sale to FRA.',
      },
      additional_sale: {
        buyer_type: 'external',
        buyer_name: 'Katete Local Miller',
        quantity_sold: 800,
        unit: 'kg',
        price_per_unit: 15,
        total_amount: 12000,
        payment_method: 'Mobile Money',
        payment_status: 'Pending',
        sale_date: dAgo(120),
        notes: 'Second batch.',
      },
    });
  }
  const tomato = pByK('p_tomato_harvesting');
  const tCId = cropId('Tomatoes');
  if (tomato && tCId) {
    const s = dAgo(10),
      mid = dAgo(5),
      e = dAgo(1);
    plans.push({
      planting_id: tomato.$id,
      crop_id: tCId,
      harvest: {
        planting_id: tomato.$id,
        harvest_start_date: s,
        harvest_end_date: e,
        total_quantity_kg: 850,
        total_labor_cost: 450,
        total_other_costs: 120,
        status: 'In Progress',
        notes: 'Continuous picking.',
      },
      entries: [
        {
          entry_date: s,
          quantity_kg: 300,
          farmhands_count: 3,
          labor_cost: 150,
          other_costs: 40,
          other_costs_notes: 'Crates',
          notes: 'First pick.',
        },
        {
          entry_date: mid,
          quantity_kg: 280,
          farmhands_count: 3,
          labor_cost: 150,
          other_costs: 40,
          notes: 'Mid pick.',
        },
        {
          entry_date: e,
          quantity_kg: 270,
          farmhands_count: 3,
          labor_cost: 150,
          other_costs: 40,
          notes: 'Latest pick.',
        },
      ],
      produce: {
        item_name: 'Tomatoes – East Garden 2025/26 Wet Season',
        item_type: 'farm_produce',
        quantity: 850,
        unit: 'kg',
        unit_cost: 8,
        status: 'in_stock',
        source: 'farm_harvest',
        reorder_threshold: 0,
        estimated_value: 6800,
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
        sale_date: dAgo(8),
        notes: 'Market vendors.',
      },
    });
  }
  const sp = pByK('p_sp_completed');
  const spCId = cropId('Sweet Potato');
  if (sp && spCId) {
    const s = dAgo(125),
      mid = dAgo(123),
      e = dAgo(120);
    plans.push({
      planting_id: sp.$id,
      crop_id: spCId,
      harvest: {
        planting_id: sp.$id,
        harvest_start_date: s,
        harvest_end_date: e,
        total_quantity_kg: 3800,
        total_labor_cost: 900,
        total_other_costs: 200,
        status: 'Completed',
        notes: 'Multi-day.',
      },
      entries: [
        {
          entry_date: s,
          quantity_kg: 1200,
          farmhands_count: 6,
          labor_cost: 300,
          other_costs: 70,
          other_costs_notes: 'Bags',
          notes: 'Day 1.',
        },
        {
          entry_date: mid,
          quantity_kg: 1400,
          farmhands_count: 6,
          labor_cost: 300,
          other_costs: 60,
          notes: 'Day 3.',
        },
        {
          entry_date: e,
          quantity_kg: 1200,
          farmhands_count: 6,
          labor_cost: 300,
          other_costs: 70,
          notes: 'Final.',
        },
      ],
      produce: {
        item_name: 'Sweet Potato – South Field 2025/26 Wet Season',
        item_type: 'farm_produce',
        quantity: 3800,
        unit: 'kg',
        unit_cost: 2.5,
        status: 'in_stock',
        source: 'farm_harvest',
        reorder_threshold: 0,
        estimated_value: 9500,
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
        sale_date: dAgo(110),
        notes: 'Bulk.',
      },
    });
  }
  const banana = pByK('p_banana_harvesting');
  const bCId = cropId('Banana');
  if (banana && bCId)
    for (const { days, qty, labor, seq } of [
      { days: 270, qty: 120, labor: 150, seq: 1 },
      { days: 180, qty: 180, labor: 160, seq: 2 },
      { days: 90, qty: 200, labor: 170, seq: 3 },
    ]) {
      const hd = dAgo(days);
      plans.push({
        planting_id: banana.$id,
        crop_id: bCId,
        harvest: {
          planting_id: banana.$id,
          harvest_start_date: hd,
          harvest_end_date: hd,
          total_quantity_kg: qty,
          total_labor_cost: labor,
          total_other_costs: 30,
          status: 'Completed',
          is_continuous_picking: true,
          harvest_sequence: seq,
          notes: `Banana harvest ${seq}.`,
        },
        entries: [
          {
            entry_date: hd,
            quantity_kg: qty,
            farmhands_count: 2,
            labor_cost: labor,
            other_costs: 30,
            notes: `Harvest ${seq}.`,
          },
        ],
        produce:
          seq === 3
            ? {
                item_name: 'Banana – North Field (Ongoing)',
                item_type: 'farm_produce',
                quantity: 500,
                unit: 'kg',
                unit_cost: 5,
                status: 'in_stock',
                source: 'farm_harvest',
                reorder_threshold: 0,
                estimated_value: 2500,
              }
            : undefined,
      });
    }
  const papaya = pByK('p_papaya_harvesting');
  const papCId = cropId('Papaya');
  if (papaya && papCId)
    for (const { days, qty, labor, seq } of [
      { days: 120, qty: 45, labor: 80, seq: 1 },
      { days: 60, qty: 60, labor: 90, seq: 2 },
      { days: 1, qty: 75, labor: 100, seq: 3 },
    ]) {
      const hd = dAgo(days);
      plans.push({
        planting_id: papaya.$id,
        crop_id: papCId,
        harvest: {
          planting_id: papaya.$id,
          harvest_start_date: hd,
          harvest_end_date: hd,
          total_quantity_kg: qty,
          total_labor_cost: labor,
          total_other_costs: 20,
          status: seq === 3 ? 'In Progress' : 'Completed',
          is_continuous_picking: true,
          harvest_sequence: seq,
          notes: `Papaya ${seq}.`,
        },
        entries: [
          {
            entry_date: hd,
            quantity_kg: qty,
            farmhands_count: 1,
            labor_cost: labor,
            other_costs: 20,
            notes: `Harvest ${seq}.`,
          },
        ],
        produce:
          seq === 2
            ? {
                item_name: 'Papaya – East Garden (Ongoing)',
                item_type: 'farm_produce',
                quantity: 105,
                unit: 'kg',
                unit_cost: 8,
                status: 'in_stock',
                source: 'farm_harvest',
                reorder_threshold: 0,
                estimated_value: 840,
              }
            : undefined,
      });
    }
  const moringa = pByK('p_moringa_harvesting');
  const morCId = cropId('Moringa');
  if (moringa && morCId)
    for (const { days, qty, labor, seq } of [
      { days: 135, qty: 30, labor: 50, seq: 1 },
      { days: 90, qty: 35, labor: 55, seq: 2 },
      { days: 45, qty: 40, labor: 60, seq: 3 },
      { days: 3, qty: 42, labor: 65, seq: 4 },
    ]) {
      const hd = dAgo(days);
      plans.push({
        planting_id: moringa.$id,
        crop_id: morCId,
        harvest: {
          planting_id: moringa.$id,
          harvest_start_date: hd,
          harvest_end_date: hd,
          total_quantity_kg: qty,
          total_labor_cost: labor,
          total_other_costs: 10,
          status: seq === 4 ? 'In Progress' : 'Completed',
          is_continuous_picking: true,
          harvest_sequence: seq,
          notes: `Moringa ${seq}.`,
        },
        entries: [
          {
            entry_date: hd,
            quantity_kg: qty,
            farmhands_count: 2,
            labor_cost: labor,
            other_costs: 10,
            notes: `Leaf harvest ${seq}.`,
          },
        ],
        produce:
          seq === 3
            ? {
                item_name: 'Moringa – West Plot (Ongoing)',
                item_type: 'farm_produce',
                quantity: 105,
                unit: 'kg',
                unit_cost: 12,
                status: 'in_stock',
                source: 'farm_harvest',
                reorder_threshold: 0,
                estimated_value: 1260,
              }
            : undefined,
      });
    }
  const maizeU = pByK('p_maize_underperforming');
  if (maizeU && mCId) {
    const hd = dAgo(150);
    plans.push({
      planting_id: maizeU.$id,
      crop_id: mCId,
      harvest: {
        planting_id: maizeU.$id,
        harvest_start_date: hd,
        harvest_end_date: hd,
        total_quantity_kg: 700,
        total_labor_cost: 500,
        total_other_costs: 100,
        status: 'Completed',
        notes: 'Poor yield — drought.',
      },
      entries: [
        {
          entry_date: hd,
          quantity_kg: 700,
          farmhands_count: 5,
          labor_cost: 500,
          other_costs: 100,
          other_costs_notes: 'Transport',
          notes: 'Drought harvest.',
        },
      ],
      produce: {
        item_name: 'Maize – South Field 2024/25 Wet Season (Low Yield)',
        item_type: 'farm_produce',
        quantity: 700,
        unit: 'kg',
        unit_cost: 3.5,
        status: 'in_stock',
        source: 'farm_harvest',
        reorder_threshold: 0,
        estimated_value: 2450,
      },
    });
  }
  return plans;
}

// =============================================================================
// PHASE 4 — SCHOOL
// =============================================================================

async function seedSchool(tablesDB, dbId, residentIds, slotIdsByGrade, log) {
  const findResId = (f, l) => {
    const i = findResIdx(f, l);
    return i >= 0 ? residentIds[i] : null;
  };

  log('Phase 4: School classes...');
  const gradeLevels = [
    'Early Childhood',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
  ];
  // Build flat list of class definitions with their key mappings
  const classDefs = [];
  for (const gl of gradeLevels) {
    const classNames = gl === 'Grade 3' ? ['Grade 3A', 'Grade 3B'] : [gl];
    for (const className of classNames) {
      const key = className === 'Grade 3B' ? 'Grade 3B' : gl;
      classDefs.push({ key, className, gl });
    }
  }
  const classRows = await batchRun(
    classDefs.map(
      (cd) => () =>
        createRow(tablesDB, dbId, 'school_classes', {
          name: cd.className,
          grade_level: cd.gl,
          academic_year: 2026,
          notes: '',
        }),
    ),
  );
  const classes = {};
  classDefs.forEach((cd, i) => {
    classes[cd.key] = classRows[i];
  });
  const clsId = (g) => {
    if (classes[g]) return classes[g].$id;
    const match = Object.values(classes).find((c) => c.name === g);
    return match?.$id;
  };

  log('Phase 4: Class teachers...');
  const clsTeachers = [
    ['Early Childhood', 'Grace', 'Banda'],
    ['Grade 1', 'Rebecca', 'Tembo'],
    ['Grade 2', 'Esther', 'Zulu'],
    ['Grade 3A', 'Ruth', 'Phiri'],
    ['Grade 3B', 'Ruth', 'Phiri'],
    ['Grade 4', 'Mary', 'Banda'],
    ['Grade 5', 'Elizabeth', 'Mwale'],
    ['Grade 6', 'Nkosi', 'Mumba'],
    ['Grade 7', 'Lilian', 'Zulu'],
    ['Grade 8', 'James', 'Mwale'],
    ['Grade 9', 'Michael', 'Tembo'],
    ['Grade 10', 'Daniel', 'Zulu'],
    ['Grade 11', 'Andrew', 'Mulenga'],
    ['Grade 12', 'Priscilla', 'Mulenga'],
  ];
  await batchRun(
    clsTeachers.map(([className, f, l]) => async () => {
      const cls = Object.values(classes).find((c) => c.name === className);
      const tid = findResId(f, l);
      if (cls && tid)
        try {
          await updateRow(tablesDB, dbId, 'school_classes', cls.$id, {
            name: cls.name,
            grade_level: cls.grade_level,
            academic_year: cls.academic_year,
            notes: cls.notes || '',
            class_teacher_id: tid,
          });
        } catch (_) {
          /* non-fatal */
        }
    }),
  );

  log('Phase 4: Learners...');
  // en() accepts an optional overrides object for non-Active statuses, medical_notes, etc.
  const en = (f, l, grade, date, g, gp, overrides) => ({
    resident_id: findResId(f, l),
    class_id: clsId(grade),
    enrollment_date: new Date(`${date}T12:00:00Z`).toISOString(),
    enrollment_status: 'Active',
    parent_guardian_name: g || '',
    parent_guardian_phone: gp || '',
    emergency_contact_name: g || '',
    emergency_contact_phone: gp || '',
    medical_notes: '',
    notes: '',
    ...overrides,
  });
  const learnerDefs = [
    en('Abel', 'Zulu', 'Early Childhood', '2026-01-12', 'Daniel Zulu', '+260976789012'),
    en('Daniel', 'Phiri', 'Early Childhood', '2026-01-12', 'Emmanuel Phiri', '+260972345678'),
    en('Natasha', 'Mumba', 'Early Childhood', '2026-01-12', 'Nkosi Mumba', '+260977001001', {
      medical_notes:
        'Mild asthma — keep inhaler in classroom. Avoid prolonged outdoor activity in dusty conditions.',
    }),
    en('Isaac', 'Kapata', 'Early Childhood', '2026-01-12', 'Bernard Kapata', '+260977002002'),
    en('Faith', 'Tembo', 'Grade 1', '2025-01-13', 'Michael Tembo', ''),
    en('Joseph', 'Tembo', 'Grade 1', '2025-01-13', 'Michael Tembo', ''),
    en('Chisomo', 'Banda', 'Grade 1', '2025-01-13', 'Joseph Banda', '+260971234567'),
    en('Thandeka', 'Phiri', 'Grade 1', '2025-01-13', 'Emmanuel Phiri', '+260972345678'),
    en('Samuel', 'Zulu', 'Grade 2', '2024-01-15', 'Daniel Zulu', ''),
    en('Naomi', 'Tembo', 'Grade 2', '2024-01-15', 'Michael Tembo', ''),
    en('Moses', 'Kapata', 'Grade 2', '2024-01-15', 'Bernard Kapata', '+260977002002', {
      medical_notes: 'Peanut allergy — no groundnut products. EpiPen in school office.',
    }),
    en('Priscah', 'Zulu', 'Grade 2', '2024-01-15', 'Esther Zulu', '+260976789012'),
    en('Blessing', 'Zulu', 'Grade 3A', '2023-01-16', 'Daniel Zulu', ''),
    en('Elijah', 'Banda', 'Grade 3A', '2023-01-16', 'Joseph Banda', '+260971234567'),
    en('Rachel', 'Phiri', 'Grade 3B', '2023-01-16', 'Emmanuel Phiri', '+260972345678'),
    en('Caleb', 'Mwale', 'Grade 3B', '2023-01-16', 'James Mwale', '+260973456789'),
    en('Esther', 'Phiri', 'Grade 4', '2022-01-17', 'Emmanuel Phiri', '+260972345678'),
    en('Hannah', 'Mwale', 'Grade 4', '2022-01-17', 'James Mwale', '+260973456789'),
    en('Levi', 'Banda', 'Grade 4', '2022-01-17', 'Joseph Banda', '+260971234567'),
    en('Joy', 'Tembo', 'Grade 4', '2022-01-17', 'Michael Tembo', '', {
      medical_notes: 'Wears prescription glasses. Seat near front of classroom recommended.',
    }),
    en('Lucy', 'Banda', 'Grade 5', '2021-01-18', 'Joseph Banda', '+260971234567'),
    en('Aaron', 'Phiri', 'Grade 5', '2021-01-18', 'Emmanuel Phiri', '+260972345678'),
    en('Miriam', 'Mwale', 'Grade 5', '2021-01-18', 'James Mwale', '+260973456789'),
    en('Simon', 'Zulu', 'Grade 5', '2021-01-18', 'Daniel Zulu', '+260976789012'),
    en('Catherine', 'Mwale', 'Grade 6', '2020-01-14', 'James Mwale', '+260973456789'),
    en('Emmanuel', 'Banda', 'Grade 6', '2020-01-14', 'Joseph Banda', '+260971234567'),
    en('Lydia', 'Phiri', 'Grade 6', '2020-01-14', 'Emmanuel Phiri', '+260972345678'),
    en('Nathan', 'Zulu', 'Grade 6', '2020-01-14', 'Daniel Zulu', '+260976789012'),
    en('Joshua', 'Phiri', 'Grade 7', '2019-01-15', 'Emmanuel Phiri', '+260972345678'),
    en('Deborah', 'Mwale', 'Grade 7', '2019-01-15', 'James Mwale', '+260973456789'),
    en('Philip', 'Banda', 'Grade 7', '2019-01-15', 'Joseph Banda', '+260971234567'),
    en('Ruth', 'Zulu', 'Grade 7', '2019-01-15', 'Daniel Zulu', '+260976789012'),
    en('Michael', 'Mwale', 'Grade 8', '2018-01-15', 'James Mwale', '+260973456789'),
    en('Naomi', 'Banda', 'Grade 8', '2018-01-15', 'Joseph Banda', '+260971234567'),
    en('Daniel', 'Tembo', 'Grade 8', '2018-01-15', 'Michael Tembo', ''),
    en('Abigail', 'Phiri', 'Grade 8', '2018-01-15', 'Emmanuel Phiri', '+260972345678'),
    en('Thomas', 'Banda', 'Grade 9', '2017-01-16', 'Joseph Banda', '+260971234567'),
    en('Rebecca', 'Mwale', 'Grade 9', '2017-01-16', 'James Mwale', '+260973456789'),
    en('Jonathan', 'Phiri', 'Grade 9', '2017-01-16', 'Emmanuel Phiri', '+260972345678'),
    en('Leah', 'Zulu', 'Grade 9', '2017-01-16', 'Daniel Zulu', '+260976789012'),
    en('Paul', 'Mwale', 'Grade 10', '2016-01-18', 'James Mwale', '+260973456789'),
    en('Zoe', 'Banda', 'Grade 10', '2016-01-18', 'Joseph Banda', '+260971234567'),
    en('Isaiah', 'Phiri', 'Grade 10', '2016-01-18', 'Emmanuel Phiri', '+260972345678'),
    en('Eunice', 'Tembo', 'Grade 10', '2016-01-18', 'Michael Tembo', ''),
    en('Sophia', 'Banda', 'Grade 11', '2015-01-19', 'Joseph Banda', '+260971234567'),
    en('Sarah', 'Phiri', 'Grade 11', '2015-01-19', 'Emmanuel Phiri', '+260972345678'),
    en('Cornelius', 'Mwale', 'Grade 11', '2015-01-19', 'James Mwale', '+260973456789'),
    en('Gloria', 'Zulu', 'Grade 11', '2015-01-19', 'Daniel Zulu', '+260976789012'),
    en('Margaret', 'Mwale', 'Grade 12', '2014-01-20', 'James Mwale', '+260973456789'),
    en('Peter', 'Banda', 'Grade 12', '2014-01-20', 'Joseph Banda', '+260971234567'),
    en('Dorcas', 'Phiri', 'Grade 12', '2014-01-20', 'Emmanuel Phiri', '+260972345678'),
    en('Tobias', 'Tembo', 'Grade 12', '2014-01-20', 'Michael Tembo', ''),
    // Non-Active enrollment statuses — showcase Graduated, Transferred, Dropped Out
    en('David', 'Phiri', 'Grade 12', '2012-01-16', 'Emmanuel Phiri', '+260972345678', {
      enrollment_status: 'Graduated',
      status_effective_date: new Date('2024-12-06T12:00:00Z').toISOString(),
      notes: 'Completed Grade 12 with distinction. Now at university.',
    }),
    en('Martha', 'Mwale', 'Grade 11', '2013-01-14', 'James Mwale', '+260973456789', {
      enrollment_status: 'Transferred',
      status_effective_date: new Date('2025-04-10T12:00:00Z').toISOString(),
      notes: 'Transferred to boarding school in Lusaka for specialised science programme.',
    }),
    en('John', 'Mwale', 'Grade 9', '2014-01-20', 'James Mwale', '+260973456789', {
      enrollment_status: 'Dropped Out',
      status_effective_date: new Date('2023-06-15T12:00:00Z').toISOString(),
      notes: 'Left school to assist with family business. Guardian meeting held.',
    }),
  ].filter((l) => l.resident_id && l.class_id);
  const createdLearners = await batchRun(
    learnerDefs.map((ld) => () => createRow(tablesDB, dbId, 'learners', ld)),
    25,
  );
  log(`  ${createdLearners.length} learners`);

  log('Phase 4: Teacher assignments...');
  const ta = (f, l, ...entries) =>
    entries.map((en) => ({
      teacher_id: findResId(f, l),
      grade_level: typeof en === 'string' ? en : en.g,
      subjects: typeof en === 'string' ? undefined : en.s,
      notes: '',
    }));
  const asgns = [
    ...ta('Grace', 'Banda', 'Early Childhood'),
    ...ta('Rebecca', 'Tembo', 'Grade 1'),
    ...ta('Esther', 'Zulu', 'Grade 2'),
    ...ta('Ruth', 'Phiri', 'Grade 3'),
    ...ta('Mary', 'Banda', 'Grade 4'),
    ...ta('Elizabeth', 'Mwale', 'Grade 5'),
    ...ta(
      'Nkosi',
      'Mumba',
      { g: 'Grade 6', s: ['Mathematics'] },
      { g: 'Grade 7', s: ['Mathematics'] },
      { g: 'Grade 8', s: ['Mathematics'] },
      { g: 'Grade 9', s: ['Mathematics'] },
    ),
    ...ta(
      'Chanda',
      'Mwamba',
      { g: 'Grade 10', s: ['Mathematics'] },
      { g: 'Grade 11', s: ['Mathematics'] },
      { g: 'Grade 12', s: ['Mathematics'] },
    ),
    ...ta(
      'Lilian',
      'Zulu',
      { g: 'Grade 6', s: ['English'] },
      { g: 'Grade 7', s: ['English'] },
      { g: 'Grade 8', s: ['English'] },
      { g: 'Grade 9', s: ['English'] },
    ),
    ...ta(
      'Agnes',
      'Phiri',
      { g: 'Grade 10', s: ['English'] },
      { g: 'Grade 11', s: ['English'] },
      { g: 'Grade 12', s: ['English'] },
    ),
    ...ta(
      'Emmanuel',
      'Phiri',
      { g: 'Grade 6', s: ['Integrated Science', 'Agriculture Science'] },
      { g: 'Grade 7', s: ['Integrated Science', 'Agriculture Science'] },
      { g: 'Grade 8', s: ['Integrated Science', 'Agriculture Science'] },
      { g: 'Grade 9', s: ['Agriculture Science'] },
    ),
    ...ta(
      'Daniel',
      'Zulu',
      { g: 'Grade 9', s: ['Biology'] },
      { g: 'Grade 10', s: ['Biology'] },
      { g: 'Grade 11', s: ['Biology'] },
      { g: 'Grade 12', s: ['Biology'] },
    ),
    ...ta(
      'Joseph',
      'Banda',
      { g: 'Grade 6', s: ['Social Studies'] },
      { g: 'Grade 7', s: ['Social Studies'] },
      { g: 'Grade 8', s: ['Social Studies'] },
      { g: 'Grade 9', s: ['Civic Education'] },
      { g: 'Grade 10', s: ['Civic Education'] },
    ),
    ...ta(
      'James',
      'Mwale',
      { g: 'Grade 8', s: ['Business Studies'] },
      { g: 'Grade 9', s: ['Business Studies'] },
      { g: 'Grade 10', s: ['Business Studies'] },
      { g: 'Grade 11', s: ['Business Studies'] },
      { g: 'Grade 12', s: ['Business Studies'] },
    ),
    ...ta(
      'Michael',
      'Tembo',
      { g: 'Grade 9', s: ['Chemistry'] },
      { g: 'Grade 10', s: ['Chemistry'] },
      { g: 'Grade 11', s: ['Chemistry'] },
      { g: 'Grade 12', s: ['Chemistry'] },
    ),
    ...ta(
      'Andrew',
      'Mulenga',
      { g: 'Grade 6', s: ['Geography'] },
      { g: 'Grade 7', s: ['Geography'] },
      { g: 'Grade 8', s: ['Geography'] },
      { g: 'Grade 9', s: ['Geography'] },
      { g: 'Grade 10', s: ['Physics', 'Geography'] },
      { g: 'Grade 11', s: ['Physics'] },
      { g: 'Grade 12', s: ['Physics'] },
    ),
    ...ta(
      'Priscilla',
      'Mulenga',
      { g: 'Grade 6', s: ['Local Language', 'Creative and Technology Studies'] },
      { g: 'Grade 7', s: ['Local Language', 'Creative and Technology Studies'] },
      { g: 'Grade 8', s: ['Local Language', 'Creative and Technology Studies'] },
      { g: 'Grade 9', s: ['Local Language'] },
      { g: 'Grade 10', s: ['Local Language'] },
      { g: 'Grade 11', s: ['Local Language'] },
      { g: 'Grade 12', s: ['Local Language'] },
    ),
  ].filter((a) => a.teacher_id);
  await batchRun(
    asgns.map((a) => () => createRow(tablesDB, dbId, 'teacher_assignments', a)),
    25,
  );
  log(`  ${asgns.length} teacher assignments`);

  log('Phase 4: Test scores...');
  const subsByGrade = {
    'Early Childhood': ['Local Language', 'Mathematics', 'Creative and Technology Studies'],
    'Grade 1': ['Mathematics', 'English', 'Local Language'],
    'Grade 2': ['Mathematics', 'English', 'Local Language'],
    'Grade 3': ['Mathematics', 'English', 'Integrated Science'],
    'Grade 4': ['Mathematics', 'English', 'Integrated Science', 'Social Studies'],
    'Grade 5': ['Mathematics', 'English', 'Integrated Science', 'Social Studies'],
    'Grade 6': [
      'Mathematics',
      'English',
      'Integrated Science',
      'Social Studies',
      'Agriculture Science',
    ],
    'Grade 7': [
      'Mathematics',
      'English',
      'Integrated Science',
      'Social Studies',
      'Agriculture Science',
    ],
    'Grade 8': ['Mathematics', 'English', 'Integrated Science', 'Business Studies', 'Geography'],
    'Grade 9': [
      'Mathematics',
      'English',
      'Biology',
      'Chemistry',
      'Agriculture Science',
      'Civic Education',
    ],
    'Grade 10': ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'Business Studies'],
    'Grade 11': ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'Business Studies'],
    'Grade 12': ['Mathematics', 'English', 'Biology', 'Chemistry', 'Physics', 'Business Studies'],
  };
  // Mix of assessment types — showcases Mid-Term Exam, End-of-Term Exam, Class Exercise, Quiz
  const assessments = [
    { type: 'Mid-Term Exam', date: '2025-08-15', term: 'Term 2', year: 2025 },
    { type: 'End-of-Term Exam', date: '2025-10-31', term: 'Term 3', year: 2025 },
    { type: 'Class Exercise', date: '2026-01-28', term: 'Term 1', year: 2026 },
    { type: 'Mid-Term Exam', date: '2026-02-14', term: 'Term 1', year: 2026 },
    { type: 'End-of-Term Exam', date: '2026-03-28', term: 'Term 1', year: 2026 },
    { type: 'Quiz', date: '2026-05-05', term: 'Term 2', year: 2026 },
    { type: 'Mid-Term Exam', date: '2026-05-16', term: 'Term 2', year: 2026 },
  ];
  const bases = [
    72, 65, 80, 58, 76, 62, 84, 69, 55, 74, 60, 78, 50, 88, 66, 45, 73, 81, 57, 67, 75, 61, 83, 70,
    53, 77, 63, 85, 48, 90, 64, 52, 71, 79, 56, 68, 74, 60, 82, 69, 54, 76, 62, 86, 49, 91, 65, 51,
  ];
  const gradeByClsId = {};
  for (const cls of Object.values(classes)) gradeByClsId[cls.$id] = cls.grade_level;
  const scoreTasks = [];
  // Story 4.7: At-risk learner indices (active learners only — non-Active statuses excluded from scoring):
  //   Index 2 = academic at-risk (Math < 50%, high severity, good attendance)
  //   Index 3 = medium-severity at-risk (overall < 60% but no subject individually < 50%)
  const ACADEMIC_AT_RISK_INDEX = 2;
  const MEDIUM_AT_RISK_INDEX = 3;
  // Non-Active learners: last 3 entries in learnerDefs are Graduated/Transferred/Dropped Out.
  // They still get scores for historical completeness but won't trigger at-risk (filter is Active-only).
  for (let li = 0; li < createdLearners.length; li++) {
    const learner = createdLearners[li];
    const cId2 = typeof learner.class_id === 'object' ? learner.class_id?.$id : learner.class_id;
    const grade = gradeByClsId[cId2] || 'Grade 1';
    const subjects = subsByGrade[grade] || ['Mathematics', 'English'];
    const base = bases[li % bases.length];
    for (let si = 0; si < subjects.length; si++)
      for (let ai = 0; ai < assessments.length; ai++) {
        const a = assessments[ai];
        const variation = ((li * 31 + si * 7 + ai * 13) % 25) - 12;
        let score = Math.max(20, Math.min(100, base + variation));
        // Story 4.7: For the academic-only at-risk learner, cap Math scores at 45%
        if (li === ACADEMIC_AT_RISK_INDEX && subjects[si] === 'Mathematics') {
          score = 35 + ai * 2; // 35, 37, 39, 41, 43, 45, 47 — all below 50%
        }
        // Story 4.7: Medium-severity at-risk — overall < 60% but no single subject < 50%.
        // Push all subjects into the 50-58 range so the average sits around 54%.
        if (li === MEDIUM_AT_RISK_INDEX) {
          score = 50 + ((si * 3 + ai * 2) % 9); // 50–58 range, avg ~54%
        }
        scoreTasks.push(() =>
          createRow(tablesDB, dbId, 'test_scores', {
            learner_id: learner.$id,
            class_id: cId2,
            subject: subjects[si],
            assessment_type: a.type,
            term: a.term,
            academic_year: a.year,
            assessment_date: new Date(`${a.date}T12:00:00Z`).toISOString(),
            score_value: score,
            max_score: 100,
            notes: '',
          }),
        );
      }
  }
  await batchRun(scoreTasks, 25);
  log(`  ${scoreTasks.length} test scores`);

  log('Phase 4: Long-term educational goal (Story 4.12)...');
  await createRow(tablesDB, dbId, 'school_long_term_goals', {
    goal_name: '90% of learners at 90th-percentile benchmark',
    target_percent_of_learners: 90,
    target_percentile_score: 90,
    baseline_academic_year: 2026,
    target_academic_year: 2036,
    is_active: true,
    notes: 'Default long-term goal seeded for demonstration. Edit in School Settings.',
  });
  log('  1 long-term goal');

  log('Phase 4: Timetable...');
  // Story 4.5: class_timetable_entries use slot IDs from seedBellSchedules (run before seedSchool).
  // slotIdsByGrade[grade][periodNum] → slot.$id for 2026 class-type slots.
  // periodNum is 1-based among class-type slots (Period 1 = 1, Period 2 = 2, …).
  const TIMETABLE_ACADEMIC_YEAR = 2026;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const primaryTeacher = {
    'Early Childhood': findResId('Grace', 'Banda'),
    'Grade 1': findResId('Rebecca', 'Tembo'),
    'Grade 2': findResId('Esther', 'Zulu'),
    'Grade 3': findResId('Ruth', 'Phiri'),
    'Grade 4': findResId('Mary', 'Banda'),
    'Grade 5': findResId('Elizabeth', 'Mwale'),
  };
  const subjectTeacher = {
    'Integrated Science': findResId('Emmanuel', 'Phiri'),
    'Agriculture Science': findResId('Emmanuel', 'Phiri'),
    Biology: findResId('Daniel', 'Zulu'),
    Chemistry: findResId('Michael', 'Tembo'),
    Physics: findResId('Andrew', 'Mulenga'),
    'Social Studies': findResId('Joseph', 'Banda'),
    'Civic Education': findResId('Joseph', 'Banda'),
    Geography: findResId('Andrew', 'Mulenga'),
    'Business Studies': findResId('James', 'Mwale'),
    'Local Language': findResId('Priscilla', 'Mulenga'),
    'Creative and Technology Studies': findResId('Priscilla', 'Mulenga'),
  };
  const resolveSecTeacher = (subject, gNum) => {
    if (subject === 'Mathematics')
      return gNum >= 10 ? findResId('Chanda', 'Mwamba') : findResId('Nkosi', 'Mumba');
    if (subject === 'English')
      return gNum >= 10 ? findResId('Agnes', 'Phiri') : findResId('Lilian', 'Zulu');
    return subjectTeacher[subject] || null;
  };

  // Story 4.5: Create class_timetable_entries using grade templates + class overrides.
  // slotIdsByGrade is populated by seedBellSchedules and passed in as a parameter.
  const ttTasks = [];

  const grade3TemplateTeacher = (subject) => {
    if (subject === 'Local Language' || subject === 'Creative and Technology Studies') {
      return findResId('Priscilla', 'Mulenga');
    }
    return findResId('Ruth', 'Phiri');
  };

  // Helper: look up the slot ID for a given grade + 1-based period number.
  const slotId = (grade, periodNum) => slotIdsByGrade[grade]?.[periodNum] ?? null;

  // 1. Grade 3 template (class_id = null, is_template = true)
  const grade3Week = TIMETABLE_SCHEDULE['Grade 3'];
  for (let dIdx = 0; dIdx < DAYS.length; dIdx++) {
    for (let pIdx = 0; pIdx < grade3Week[dIdx].length; pIdx++) {
      const subject = grade3Week[dIdx][pIdx];
      const periodNum = pIdx + 1; // 1-based period number
      ttTasks.push(() =>
        createRow(tablesDB, dbId, 'class_timetable_entries', {
          class_id: null,
          is_template: true,
          grade_level: 'Grade 3',
          slot_id: slotId('Grade 3', periodNum),
          day_of_week: DAYS[dIdx],
          subject,
          teacher_id: grade3TemplateTeacher(subject),
          academic_year: TIMETABLE_ACADEMIC_YEAR,
          valid_from: null,
          valid_to: null,
          notes: '',
        }),
      );
    }
  }

  // 2. Grade 3A class timetable: apply template with one override (Monday Period 1 -> Mary Banda)
  const classId3A = clsId('Grade 3');
  const override3A = { day: 'Monday', periodNum: 1, teacherId: findResId('Mary', 'Banda') };
  for (let dIdx = 0; dIdx < DAYS.length; dIdx++) {
    for (let pIdx = 0; pIdx < grade3Week[dIdx].length; pIdx++) {
      const subject = grade3Week[dIdx][pIdx];
      const periodNum = pIdx + 1;
      const day = DAYS[dIdx];
      let teacherId = grade3TemplateTeacher(subject);
      if (day === override3A.day && periodNum === override3A.periodNum) {
        teacherId = override3A.teacherId;
      }
      ttTasks.push(() =>
        createRow(tablesDB, dbId, 'class_timetable_entries', {
          class_id: classId3A,
          is_template: false,
          grade_level: 'Grade 3',
          slot_id: slotId('Grade 3', periodNum),
          day_of_week: day,
          subject,
          teacher_id: teacherId,
          academic_year: TIMETABLE_ACADEMIC_YEAR,
          valid_from: null,
          valid_to: null,
          notes: '',
        }),
      );
    }
  }

  // 3. Grade 3B deliberately has no class entries (tests template preview empty state).

  // 4. Other grades: class-specific entries.
  for (const [grade, weekSchedule] of Object.entries(TIMETABLE_SCHEDULE)) {
    if (grade === 'Grade 3') continue;
    const cId2 = clsId(grade);
    if (!cId2 || !slotIdsByGrade[grade]) continue;
    const isPrimary = grade in primaryTeacher;
    const gNum = grade === 'Early Childhood' ? 0 : parseInt(grade.replace('Grade ', '')) || 0;
    const ctId = isPrimary ? primaryTeacher[grade] : null;
    for (let dIdx = 0; dIdx < DAYS.length; dIdx++) {
      for (let pIdx = 0; pIdx < weekSchedule[dIdx].length; pIdx++) {
        const subject = weekSchedule[dIdx][pIdx];
        const periodNum = pIdx + 1;
        const teacherId = isPrimary ? ctId : resolveSecTeacher(subject, gNum);
        ttTasks.push(() =>
          createRow(tablesDB, dbId, 'class_timetable_entries', {
            class_id: cId2,
            is_template: false,
            grade_level: grade,
            slot_id: slotId(grade, periodNum),
            day_of_week: DAYS[dIdx],
            subject,
            teacher_id: teacherId || null,
            academic_year: TIMETABLE_ACADEMIC_YEAR,
            valid_from: null,
            valid_to: null,
            notes: '',
          }),
        );
      }
    }
  }
  await batchRun(ttTasks, 25);
  log(`  ${ttTasks.length} timetable entries`);

  log('Phase 4: Attendance...');
  const attendanceDates = [];
  const refDate = new Date();
  for (let i = 30; i >= 1; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const wd = d.getDay();
    if (wd >= 1 && wd <= 5) attendanceDates.push(d.toISOString().split('T')[0]);
  }
  // Story 4.7: Attendance seed designed to produce deterministic at-risk scenarios.
  // Most learners get ~94% attendance (above the 90% threshold).
  // Learners 0 and 1 get heavy absence (~60% rate) → at-risk on attendance.
  // Learner 2 gets perfect attendance → not at-risk on attendance, but is at-risk
  //   on academics (low Math scores injected above).
  // Learner 3 gets perfect attendance (medium-severity at-risk via academics only).
  const STATUSES = [
    'Present',
    'Present',
    'Present',
    'Present',
    'Present',
    'Present',
    'Present',
    'Present',
    'Late',
    'Absent',
  ];
  // Rotating absence reasons for realistic variety
  const ABSENCE_REASONS = [
    'Illness — fever and headache',
    'Family commitment — funeral attendance',
    'Transport unavailable — heavy rain',
    'Helping at home — harvest season',
    'Medical appointment at clinic',
    'Unknown — guardian not contactable',
  ];
  // Indices of learners who should be at-risk on attendance (heavy absence pattern)
  const ATTENDANCE_AT_RISK_INDICES = new Set([0, 1]);
  const attTasks = [];
  for (let li = 0; li < createdLearners.length; li++) {
    const learner = createdLearners[li];
    const cId2 = typeof learner.class_id === 'object' ? learner.class_id?.$id : learner.class_id;
    const isAttendanceAtRisk = ATTENDANCE_AT_RISK_INDICES.has(li);
    for (let di = 0; di < attendanceDates.length; di++) {
      let status;
      if (isAttendanceAtRisk) {
        // ~40% absent for at-risk learners → rate ~60%
        status = di % 5 === 0 || di % 5 === 2 ? 'Absent' : 'Present';
      } else {
        const statusIdx = (li * 7 + di * 3) % STATUSES.length;
        status = STATUSES[statusIdx];
      }
      // Add absence_reason for Absent records; use Excused for a few non-at-risk absences
      let absence_reason = '';
      let finalStatus = status;
      if (status === 'Absent') {
        absence_reason = ABSENCE_REASONS[(li + di) % ABSENCE_REASONS.length];
        // For non-at-risk learners, mark some absences as Excused to showcase that status
        if (!isAttendanceAtRisk && di % 3 === 0) {
          finalStatus = 'Excused';
          absence_reason = 'Medical appointment (excused by Head Teacher)';
        }
      }
      attTasks.push(() =>
        createRow(tablesDB, dbId, 'learner_attendance', {
          learner_id: learner.$id,
          class_id: cId2,
          attendance_date: new Date(`${attendanceDates[di]}T07:00:00Z`).toISOString(),
          status: finalStatus,
          absence_reason,
          notes: '',
        }),
      );
    }
  }
  await batchRun(attTasks, 25);
  log(`  ${attTasks.length} attendance records`);
  // Story 4.7: Expected at-risk learners after seeding:
  //   - Learners 0 and 1: at-risk on attendance (~60% rate, high severity)
  //   - Learner 2: at-risk on academics (Math < 50%, high severity) with good attendance
  //   - Learner 3: at-risk on academics (overall < 60%, medium severity) — no single subject < 50%
  //   - Most other learners: above 90% attendance, above 50% per subject → not at-risk
  //   - Grace period is NOT active (Term 2 started 2026-04-27, well over 5 school days ago)

  // Story 4.8: Intervention plans for the at-risk learners seeded above.
  // Uses asgns[0].teacher_id (Grace Banda, Early Childhood) as the assigned
  // teacher for both demo plans — already a resolved resident ID string.
  log('  Interventions...');
  const demoTeacherId = asgns[0]?.teacher_id || null;

  // Intervention 1: Active attendance counselling for learner 0 (attendance at-risk)
  const interventionDefs = [
    {
      learner_id: createdLearners[0].$id,
      assigned_teacher_id: demoTeacherId,
      intervention_type: 'Attendance Counselling',
      focus_areas: ['Attendance improvement', 'Punctuality'],
      frequency: 'Weekly check-in with Head Teacher, Mon 8am',
      success_criteria: 'Attendance above 90% for 3 consecutive weeks',
      start_date: new Date(Date.now() - 14 * 86400000).toISOString(),
      status: 'Active',
      term: 'Term 2',
      academic_year: 2026,
    },
    {
      learner_id: createdLearners[2].$id,
      assigned_teacher_id: demoTeacherId,
      intervention_type: 'Mathematics Support',
      focus_areas: ['Mathematics foundations', 'Problem solving'],
      frequency: '3x per week — Mon/Wed/Fri, 2:30-3:30pm after school',
      success_criteria: 'Score above 60% in Mathematics',
      start_date: new Date(Date.now() - 45 * 86400000).toISOString(),
      end_date: new Date(Date.now() - 15 * 86400000).toISOString(),
      status: 'Resolved',
      outcome:
        'Learner improved from 35% to 55% in Mathematics over 4 weeks of focused tutoring. Latest Mid-Term score at 55%. Monitoring continues.',
      term: 'Term 2',
      academic_year: 2026,
    },
    {
      learner_id: createdLearners[1].$id,
      assigned_teacher_id: demoTeacherId,
      intervention_type: 'Parent/Guardian Meeting',
      focus_areas: ['Home environment', 'Attendance improvement', 'Morning routine'],
      frequency: 'Bi-weekly meeting with guardian, alternate Fridays 1pm',
      success_criteria:
        'Attendance above 85% for 4 consecutive weeks; guardian engagement at every meeting',
      start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
      status: 'Active',
      term: 'Term 2',
      academic_year: 2026,
    },
    {
      learner_id: createdLearners[4].$id,
      assigned_teacher_id: demoTeacherId,
      intervention_type: 'Reading Support',
      focus_areas: ['Reading fluency', 'Comprehension'],
      frequency: '2x per week — Tue/Thu, during study period',
      success_criteria: 'Read at grade level (Grade 1 benchmark) by end of Term 2',
      start_date: new Date(Date.now() - 30 * 86400000).toISOString(),
      status: 'Paused',
      notes: 'Paused during exam block. Will resume after mid-term exams.',
      term: 'Term 2',
      academic_year: 2026,
    },
    {
      learner_id: createdLearners[8].$id,
      assigned_teacher_id: demoTeacherId,
      intervention_type: 'Mentoring',
      focus_areas: ['Social skills', 'Classroom behaviour'],
      frequency: 'Weekly 1-on-1 mentoring, Wed 12pm',
      success_criteria: 'No behavioural incidents for 4 consecutive weeks',
      start_date: new Date(Date.now() - 60 * 86400000).toISOString(),
      end_date: new Date(Date.now() - 20 * 86400000).toISOString(),
      status: 'Closed Without Resolution',
      outcome:
        'Learner disengaged from mentoring sessions. Guardian unresponsive to follow-up. Referred to Head Teacher for alternative approach.',
      term: 'Term 1',
      academic_year: 2026,
    },
  ];
  const interventionRows = await batchRun(
    interventionDefs.map((d) => () => createRow(tablesDB, dbId, 'interventions', d)),
  );
  const [intervention1, intervention2, intervention3, intervention4, intervention5] =
    interventionRows;

  const noteTasks = [
    // Intervention 1 notes (attendance counselling — Active)
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention1.$id,
        note_date: new Date(Date.now() - 14 * 86400000).toISOString(),
        content:
          'Initial meeting with learner and guardian. Discussed attendance barriers. Guardian committed to morning drop-off routine.',
        learner_response: 'Positive',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention1.$id,
        note_date: new Date(Date.now() - 7 * 86400000).toISOString(),
        content:
          'Week 1 check-in: Attendance improved to 80% this week (4/5 days). Still below threshold but trending up.',
        learner_response: 'Positive',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention1.$id,
        note_date: new Date().toISOString(),
        content:
          'Week 2 check-in: 3/5 days this week. Learner reported illness on 2 days. Will continue monitoring.',
        learner_response: 'Neutral',
        author_id: demoTeacherId,
      }),
    // Intervention 2 notes (maths support — Resolved)
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention2.$id,
        note_date: new Date(Date.now() - 40 * 86400000).toISOString(),
        content:
          'Started small-group Math sessions. Learner engaged but struggles with multiplication tables.',
        learner_response: 'Neutral',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention2.$id,
        note_date: new Date(Date.now() - 25 * 86400000).toISOString(),
        content:
          'Week 2: Some improvement on multiplication drills but word problems remain difficult. Learner becoming frustrated.',
        learner_response: 'Negative',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention2.$id,
        note_date: new Date(Date.now() - 15 * 86400000).toISOString(),
        content:
          'Final session. Math score improved from 35% to 55% on latest mid-term. Recommending continued monitoring.',
        learner_response: 'Positive',
        author_id: demoTeacherId,
      }),
    // Intervention 3 notes (parent/guardian meeting — Active)
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention3.$id,
        note_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        content:
          'First meeting with guardian. Identified that learner walks 3km to school and often misses morning classes. Exploring transport alternatives.',
        learner_response: 'Not Observed',
        author_id: demoTeacherId,
      }),
    // Intervention 4 notes (reading support — Paused)
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention4.$id,
        note_date: new Date(Date.now() - 28 * 86400000).toISOString(),
        content:
          'Initial assessment: learner reads at pre-Grade 1 level. Started with phonics flashcards and simple sentence exercises.',
        learner_response: 'Positive',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention4.$id,
        note_date: new Date(Date.now() - 14 * 86400000).toISOString(),
        content:
          'Good progress on letter recognition. Pausing sessions during exam block — will resume next week.',
        learner_response: 'Positive',
        author_id: demoTeacherId,
      }),
    // Intervention 5 notes (mentoring — Closed Without Resolution)
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention5.$id,
        note_date: new Date(Date.now() - 55 * 86400000).toISOString(),
        content:
          'First mentoring session. Learner reluctant to speak. Established ground rules and built initial rapport.',
        learner_response: 'Neutral',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention5.$id,
        note_date: new Date(Date.now() - 40 * 86400000).toISOString(),
        content:
          'Learner missed 2 of 3 scheduled sessions. When present, remained withdrawn. Guardian did not attend requested follow-up.',
        learner_response: 'Negative',
        author_id: demoTeacherId,
      }),
    () =>
      createRow(tablesDB, dbId, 'intervention_notes', {
        intervention_id: intervention5.$id,
        note_date: new Date(Date.now() - 20 * 86400000).toISOString(),
        content:
          'Closing intervention. Learner has not attended last 3 sessions. Guardian unreachable. Referring to Head Teacher.',
        learner_response: 'Not Observed',
        author_id: demoTeacherId,
      }),
  ];
  await batchRun(noteTasks, 25);
  log(`  5 intervention plans + ${noteTasks.length} progress notes`);
}

// =============================================================================
// PHASE 5 — VILLAGE SETTINGS
// =============================================================================

async function seedVillageSettings(tablesDB, dbId, councilMemberIds, log) {
  log('Phase 5: Village settings...');
  const councilResidentIds = councilMemberIds.map((c) => c.residentId);
  const settingsData = {
    village_name: 'Katete Model Village',
    address: 'Katete District, Eastern Province, Zambia',
    established_date: '2020-03-15',
    default_currency: 'ZMW',
    currency_symbol: 'K',
    timezone: 'Africa/Lusaka',
    country_code: 'ZM',
    country_phone_code: '+260',
    yield_unit: 'kg_per_hectare',
    is_using_sample_data: true,
    modules_enabled: [
      'residents',
      'households',
      'dashboard',
      'finance',
      'inventory',
      'farm',
      'school',
    ],
    council_member_ids: councilResidentIds,
  };
  try {
    const existing = await listAll(tablesDB, dbId, 'village_settings');
    if (existing.length > 0) {
      await updateRow(tablesDB, dbId, 'village_settings', existing[0].$id, settingsData);
    } else {
      await tablesDB.createRow({
        databaseId: dbId,
        tableId: 'village_settings',
        rowId: 'settings_root',
        data: settingsData,
      });
    }
  } catch (err) {
    console.error('Village settings error (non-fatal):', err.message);
  }
  log('  Village settings done');
}

// =============================================================================
// PHASE 5 — SCHOOL CALENDAR (academic terms + events)
// =============================================================================

async function seedCalendar(tablesDB, dbId, log) {
  log('Phase 5: Academic terms (2025 & 2026)...');

  // Zambian school calendar: 3 terms per year, Jan–Dec
  // Term 1: late Jan – late Mar/early Apr
  // Term 2: late Apr/early May – late Jul/early Aug
  // Term 3: late Aug/early Sep – early Dec
  const TERMS = [
    // 2025
    {
      academic_year: 2025,
      term_name: 'Term 1',
      term_order: 1,
      start_date: '2025-01-20',
      end_date: '2025-04-04',
      notes: 'First term 2025',
    },
    {
      academic_year: 2025,
      term_name: 'Term 2',
      term_order: 2,
      start_date: '2025-04-28',
      end_date: '2025-08-01',
      notes: 'Second term 2025',
    },
    {
      academic_year: 2025,
      term_name: 'Term 3',
      term_order: 3,
      start_date: '2025-08-25',
      end_date: '2025-11-28',
      notes: 'Third term 2025',
    },
    // 2026
    {
      academic_year: 2026,
      term_name: 'Term 1',
      term_order: 1,
      start_date: '2026-01-12',
      end_date: '2026-04-03',
      notes: 'First term 2026',
    },
    {
      academic_year: 2026,
      term_name: 'Term 2',
      term_order: 2,
      start_date: '2026-04-27',
      end_date: '2026-07-31',
      notes: 'Second term 2026',
    },
    {
      academic_year: 2026,
      term_name: 'Term 3',
      term_order: 3,
      start_date: '2026-08-24',
      end_date: '2026-11-27',
      notes: 'Third term 2026',
    },
  ];

  const toDateTime = (date) => new Date(`${date}T12:00:00Z`).toISOString();
  await batchRun(
    TERMS.map(
      (term) => () =>
        createRow(tablesDB, dbId, 'school_academic_terms', {
          ...term,
          start_date: toDateTime(term.start_date),
          end_date: toDateTime(term.end_date),
        }),
    ),
  );
  log(`  ${TERMS.length} academic terms created`);

  log('Phase 5: Calendar events (2025 & 2026)...');

  // Each event: title, event_type, start_date, end_date (null = single day), all_day, description, village_id
  // event_type values match CALENDAR_EVENT_TYPES in school-constants.js:
  //   public_holiday, school_holiday, pd_day, exam_block, early_dismissal, assembly, other
  // is_school_day: false = school closed; true = school open but modified.
  const isSchoolDay = (type) => !['public_holiday', 'school_holiday', 'pd_day'].includes(type);
  const EVENTS = [
    // ─── 2025 Public Holidays ─────────────────────────────────────────────
    {
      title: "New Year's Day",
      event_type: 'public_holiday',
      start_date: '2025-01-01',
      end_date: null,
      all_day: true,
      description: 'National public holiday',
    },
    {
      title: 'Youth Day',
      event_type: 'public_holiday',
      start_date: '2025-03-12',
      end_date: null,
      all_day: true,
      description: 'National Youth Day – Zambia',
    },
    {
      title: 'Good Friday',
      event_type: 'public_holiday',
      start_date: '2025-04-18',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Holy Saturday',
      event_type: 'public_holiday',
      start_date: '2025-04-19',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Easter Monday',
      event_type: 'public_holiday',
      start_date: '2025-04-21',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Labour Day',
      event_type: 'public_holiday',
      start_date: '2025-05-01',
      end_date: null,
      all_day: true,
      description: 'International Labour Day',
    },
    {
      title: 'Africa Freedom Day',
      event_type: 'public_holiday',
      start_date: '2025-05-25',
      end_date: null,
      all_day: true,
      description: 'Africa Freedom Day – Zambia',
    },
    {
      title: 'Heroes Day',
      event_type: 'public_holiday',
      start_date: '2025-07-07',
      end_date: null,
      all_day: true,
      description: 'Heroes Day – Zambia',
    },
    {
      title: 'Unity Day',
      event_type: 'public_holiday',
      start_date: '2025-07-08',
      end_date: null,
      all_day: true,
      description: 'Unity Day – Zambia',
    },
    {
      title: 'Farmers Day',
      event_type: 'public_holiday',
      start_date: '2025-08-04',
      end_date: null,
      all_day: true,
      description: 'Farmers Day – Zambia',
    },
    {
      title: 'Independence Day',
      event_type: 'public_holiday',
      start_date: '2025-10-24',
      end_date: null,
      all_day: true,
      description: 'Zambia Independence Day',
    },
    {
      title: 'Christmas Day',
      event_type: 'public_holiday',
      start_date: '2025-12-25',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Boxing Day',
      event_type: 'public_holiday',
      start_date: '2025-12-26',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    // ─── 2025 Term Breaks (school_holiday) ───────────────────────────────
    {
      title: 'Term 1 Break',
      event_type: 'school_holiday',
      start_date: '2025-04-05',
      end_date: '2025-04-27',
      all_day: true,
      description: 'School holiday between Term 1 and Term 2',
    },
    {
      title: 'Term 2 Break',
      event_type: 'school_holiday',
      start_date: '2025-08-02',
      end_date: '2025-08-24',
      all_day: true,
      description: 'School holiday between Term 2 and Term 3',
    },
    {
      title: 'Year-End Holidays 2025',
      event_type: 'school_holiday',
      start_date: '2025-11-29',
      end_date: '2026-01-11',
      all_day: true,
      description: 'End-of-year school break',
    },
    // ─── 2025 Exam Blocks ────────────────────────────────────────────────
    {
      title: 'Term 1 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-02-24',
      end_date: '2025-02-28',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 1 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-03-24',
      end_date: '2025-04-03',
      all_day: true,
      description: 'End-of-term examinations',
    },
    {
      title: 'Term 2 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-06-09',
      end_date: '2025-06-13',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 2 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-07-21',
      end_date: '2025-07-31',
      all_day: true,
      description: 'End-of-term examinations',
    },
    {
      title: 'Term 3 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-10-06',
      end_date: '2025-10-10',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 3 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2025-11-17',
      end_date: '2025-11-27',
      all_day: true,
      description: 'Final end-of-term examinations',
    },
    // ─── 2025 PD Days ────────────────────────────────────────────────────
    {
      title: 'Term 1 PD Day – Staff Planning',
      event_type: 'pd_day',
      start_date: '2025-01-17',
      end_date: '2025-01-19',
      all_day: true,
      description: 'Teacher professional development and curriculum planning before term starts',
    },
    {
      title: 'Term 2 PD Day – Curriculum Review',
      event_type: 'pd_day',
      start_date: '2025-04-25',
      end_date: '2025-04-25',
      all_day: true,
      description: 'Mid-year curriculum review and assessment moderation',
    },
    {
      title: 'Term 3 PD Day – STEM Workshop',
      event_type: 'pd_day',
      start_date: '2025-08-22',
      end_date: '2025-08-22',
      all_day: true,
      description: 'STEM teaching methods workshop for science and maths teachers',
    },
    // ─── 2025 Assemblies ─────────────────────────────────────────────────
    {
      title: 'Opening Assembly – Term 1',
      event_type: 'assembly',
      start_date: '2025-01-20',
      end_date: null,
      all_day: false,
      description: 'School opening assembly – welcome back and term overview',
    },
    {
      title: 'Opening Assembly – Term 2',
      event_type: 'assembly',
      start_date: '2025-04-28',
      end_date: null,
      all_day: false,
      description: 'Term 2 opening assembly',
    },
    {
      title: 'Opening Assembly – Term 3',
      event_type: 'assembly',
      start_date: '2025-08-25',
      end_date: null,
      all_day: false,
      description: 'Term 3 opening assembly',
    },
    {
      title: 'Prize-Giving Ceremony 2025',
      event_type: 'assembly',
      start_date: '2025-11-28',
      end_date: null,
      all_day: true,
      description: 'Annual prize-giving and end-of-year ceremony',
    },
    // ─── 2025 Early Dismissals ───────────────────────────────────────────
    {
      title: 'Independence Day Preparations',
      event_type: 'early_dismissal',
      start_date: '2025-10-23',
      end_date: null,
      all_day: false,
      description: 'Early dismissal for Independence Day eve celebrations',
    },
    // ─── 2025 Other ──────────────────────────────────────────────────────
    {
      title: 'Sports Day',
      event_type: 'other',
      start_date: '2025-06-27',
      end_date: null,
      all_day: true,
      description: 'Annual inter-class sports competition',
    },
    {
      title: 'Cultural Day',
      event_type: 'other',
      start_date: '2025-09-19',
      end_date: null,
      all_day: true,
      description: 'Students showcase traditional Zambian culture, food, and dress',
    },
    {
      title: 'School Open Day',
      event_type: 'other',
      start_date: '2025-03-07',
      end_date: null,
      all_day: true,
      description: 'Parents and guardians invited to visit classrooms and meet teachers',
    },

    // ─── 2026 Public Holidays ─────────────────────────────────────────────
    {
      title: "New Year's Day",
      event_type: 'public_holiday',
      start_date: '2026-01-01',
      end_date: null,
      all_day: true,
      description: 'National public holiday',
    },
    {
      title: 'Youth Day',
      event_type: 'public_holiday',
      start_date: '2026-03-12',
      end_date: null,
      all_day: true,
      description: 'National Youth Day – Zambia',
    },
    {
      title: 'Good Friday',
      event_type: 'public_holiday',
      start_date: '2026-04-03',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Holy Saturday',
      event_type: 'public_holiday',
      start_date: '2026-04-04',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Easter Monday',
      event_type: 'public_holiday',
      start_date: '2026-04-06',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Labour Day',
      event_type: 'public_holiday',
      start_date: '2026-05-01',
      end_date: null,
      all_day: true,
      description: 'International Labour Day',
    },
    {
      title: 'Africa Freedom Day',
      event_type: 'public_holiday',
      start_date: '2026-05-25',
      end_date: null,
      all_day: true,
      description: 'Africa Freedom Day – Zambia',
    },
    {
      title: 'Heroes Day',
      event_type: 'public_holiday',
      start_date: '2026-07-06',
      end_date: null,
      all_day: true,
      description: 'Heroes Day – Zambia',
    },
    {
      title: 'Unity Day',
      event_type: 'public_holiday',
      start_date: '2026-07-07',
      end_date: null,
      all_day: true,
      description: 'Unity Day – Zambia',
    },
    {
      title: 'Farmers Day',
      event_type: 'public_holiday',
      start_date: '2026-08-03',
      end_date: null,
      all_day: true,
      description: 'Farmers Day – Zambia',
    },
    {
      title: 'Independence Day',
      event_type: 'public_holiday',
      start_date: '2026-10-24',
      end_date: null,
      all_day: true,
      description: 'Zambia Independence Day',
    },
    {
      title: 'Christmas Day',
      event_type: 'public_holiday',
      start_date: '2026-12-25',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    {
      title: 'Boxing Day',
      event_type: 'public_holiday',
      start_date: '2026-12-26',
      end_date: null,
      all_day: true,
      description: 'Public holiday',
    },
    // ─── 2026 Term Breaks ────────────────────────────────────────────────
    {
      title: 'Term 1 Break',
      event_type: 'school_holiday',
      start_date: '2026-04-04',
      end_date: '2026-04-26',
      all_day: true,
      description: 'School holiday between Term 1 and Term 2',
    },
    {
      title: 'Term 2 Break',
      event_type: 'school_holiday',
      start_date: '2026-08-01',
      end_date: '2026-08-23',
      all_day: true,
      description: 'School holiday between Term 2 and Term 3',
    },
    {
      title: 'Year-End Holidays 2026',
      event_type: 'school_holiday',
      start_date: '2026-11-28',
      end_date: '2027-01-10',
      all_day: true,
      description: 'End-of-year school break',
    },
    // ─── 2026 Exam Blocks ────────────────────────────────────────────────
    {
      title: 'Term 1 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-02-23',
      end_date: '2026-02-27',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 1 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-03-23',
      end_date: '2026-04-02',
      all_day: true,
      description: 'End-of-term examinations',
    },
    {
      title: 'Term 2 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-06-08',
      end_date: '2026-06-12',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 2 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-07-20',
      end_date: '2026-07-30',
      all_day: true,
      description: 'End-of-term examinations',
    },
    {
      title: 'Term 3 Mid-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-10-05',
      end_date: '2026-10-09',
      all_day: true,
      description: 'Mid-term examinations for all grades',
    },
    {
      title: 'Term 3 End-of-Term Exams',
      event_type: 'exam_block',
      start_date: '2026-11-16',
      end_date: '2026-11-26',
      all_day: true,
      description: 'Final end-of-term examinations',
    },
    // ─── 2026 PD Days ────────────────────────────────────────────────────
    {
      title: 'Term 1 PD Day – Staff Planning',
      event_type: 'pd_day',
      start_date: '2026-01-09',
      end_date: '2026-01-11',
      all_day: true,
      description: 'Teacher professional development and curriculum planning before term starts',
    },
    {
      title: 'Term 2 PD Day – Curriculum Review',
      event_type: 'pd_day',
      start_date: '2026-04-24',
      end_date: '2026-04-24',
      all_day: true,
      description: 'Mid-year curriculum review and assessment moderation',
    },
    {
      title: 'Term 3 PD Day – Inclusive Education Workshop',
      event_type: 'pd_day',
      start_date: '2026-08-21',
      end_date: '2026-08-21',
      all_day: true,
      description: 'Workshop on inclusive education practices',
    },
    // ─── 2026 Assemblies ─────────────────────────────────────────────────
    {
      title: 'Opening Assembly – Term 1',
      event_type: 'assembly',
      start_date: '2026-01-12',
      end_date: null,
      all_day: false,
      description: 'School opening assembly – welcome back and term overview',
    },
    {
      title: 'Opening Assembly – Term 2',
      event_type: 'assembly',
      start_date: '2026-04-27',
      end_date: null,
      all_day: false,
      description: 'Term 2 opening assembly',
    },
    {
      title: 'Opening Assembly – Term 3',
      event_type: 'assembly',
      start_date: '2026-08-24',
      end_date: null,
      all_day: false,
      description: 'Term 3 opening assembly',
    },
    {
      title: 'Prize-Giving Ceremony 2026',
      event_type: 'assembly',
      start_date: '2026-11-27',
      end_date: null,
      all_day: true,
      description: 'Annual prize-giving and end-of-year ceremony',
    },
    // ─── 2026 Early Dismissals ───────────────────────────────────────────
    {
      title: 'Independence Day Preparations',
      event_type: 'early_dismissal',
      start_date: '2026-10-23',
      end_date: null,
      all_day: false,
      description: 'Early dismissal for Independence Day eve celebrations',
    },
    // ─── 2026 Other ──────────────────────────────────────────────────────
    {
      title: 'Sports Day',
      event_type: 'other',
      start_date: '2026-06-26',
      end_date: null,
      all_day: true,
      description: 'Annual inter-class sports competition',
    },
    {
      title: 'Cultural Day',
      event_type: 'other',
      start_date: '2026-09-18',
      end_date: null,
      all_day: true,
      description: 'Students showcase traditional Zambian culture, food, and dress',
    },
    {
      title: 'School Open Day',
      event_type: 'other',
      start_date: '2026-03-06',
      end_date: null,
      all_day: true,
      description: 'Parents and guardians invited to visit classrooms and meet teachers',
    },
  ];

  const eventTasks = EVENTS.map((ev) => async () => {
    const data = {
      title: ev.title,
      event_type: ev.event_type,
      start_date: toDateTime(ev.start_date),
      end_date: toDateTime(ev.end_date || ev.start_date),
      is_school_day: isSchoolDay(ev.event_type),
      notes: ev.description || '',
    };
    return createRow(tablesDB, dbId, 'school_calendar_events', data);
  });
  await batchRun(eventTasks, 25);
  log(`  ${EVENTS.length} calendar events created`);
}

// =============================================================================
// seedBellSchedules — Story 4.4
// Seeds realistic bell schedules for all 13 grade levels × 2025 & 2026.
//
// Three tiers:
//   Early Childhood — 5 class periods, shorter day (07:30–12:30)
//   Primary (Grades 1–7) — 6 class periods, full day (07:30–14:15)
//   Secondary (Grades 8–12) — 6 class periods + 1 study period, full day (07:30–15:00)
//
// Every grade gets: Monday assembly + morning break + lunch + afternoon break.
// The function returns slotIdsByGrade: { grade → { periodNum → slot.$id } }
// for the 2026 class-type slots only — used by seedSchool for timetable entries.
// =============================================================================

async function seedBellSchedules(tablesDB, dbId, log) {
  log('  Seeding bell schedules — all grades, 2025 & 2026…');

  // [slotNumber, label, slotType, startTime, endTime, appliesToDays, notes?]
  // appliesToDays: [] = every school day; ['Monday'] = Monday only, etc.

  // ─── Early Childhood (07:30–12:30, 5 class periods) ──────────────────────
  const EC_SLOTS = [
    [
      1,
      'Morning Assembly',
      'assembly',
      '07:30',
      '07:50',
      ['Monday'],
      'Weekly whole-school assembly',
    ],
    [2, 'Period 1', 'class', '07:50', '08:35', []],
    [3, 'Period 2', 'class', '08:35', '09:20', []],
    [4, 'Morning Break', 'break', '09:20', '09:45', []],
    [5, 'Period 3', 'class', '09:45', '10:30', []],
    [6, 'Lunch Break', 'lunch', '10:30', '11:00', []],
    [7, 'Period 4', 'class', '11:00', '11:45', []],
    [8, 'Afternoon Break', 'break', '11:45', '12:00', []],
    [9, 'Period 5', 'class', '12:00', '12:30', []],
  ];

  // ─── Primary Grades 1–7 (07:30–14:15, 6 class periods) ──────────────────
  const PRIMARY_SLOTS = [
    [
      1,
      'Morning Assembly',
      'assembly',
      '07:30',
      '07:45',
      ['Monday'],
      'Weekly whole-school assembly',
    ],
    [2, 'Period 1', 'class', '07:45', '08:35', []],
    [3, 'Period 2', 'class', '08:35', '09:25', []],
    [4, 'Period 3', 'class', '09:25', '10:15', []],
    [5, 'Morning Break', 'break', '10:15', '10:35', []],
    [6, 'Period 4', 'class', '10:35', '11:25', []],
    [7, 'Period 5', 'class', '11:25', '12:15', []],
    [8, 'Lunch Break', 'lunch', '12:15', '13:00', []],
    [9, 'Period 6', 'class', '13:00', '13:50', []],
    [10, 'Afternoon Break', 'break', '13:50', '14:05', []],
    [11, 'Study Period', 'free', '14:05', '14:15', [], 'Independent reading / homework'],
  ];

  // ─── Secondary Grades 8–12 (07:30–15:00, 6 class periods + study) ────────
  const SECONDARY_SLOTS = [
    [
      1,
      'Morning Assembly',
      'assembly',
      '07:30',
      '07:45',
      ['Monday'],
      'Weekly whole-school assembly',
    ],
    [2, 'Period 1', 'class', '07:45', '08:35', []],
    [3, 'Period 2', 'class', '08:35', '09:25', []],
    [4, 'Period 3', 'class', '09:25', '10:15', []],
    [5, 'Morning Break', 'break', '10:15', '10:35', []],
    [6, 'Period 4', 'class', '10:35', '11:25', []],
    [7, 'Period 5', 'class', '11:25', '12:15', []],
    [8, 'Lunch Break', 'lunch', '12:15', '13:00', []],
    [9, 'Period 6', 'class', '13:00', '13:50', []],
    [10, 'Afternoon Break', 'break', '13:50', '14:05', []],
    [11, 'Study Period', 'free', '14:05', '15:00', [], 'Supervised self-study / exam prep'],
  ];

  // Map grade → slot definition array
  const GRADE_SLOT_MAP = {
    'Early Childhood': EC_SLOTS,
    'Grade 1': PRIMARY_SLOTS,
    'Grade 2': PRIMARY_SLOTS,
    'Grade 3': PRIMARY_SLOTS,
    'Grade 4': PRIMARY_SLOTS,
    'Grade 5': PRIMARY_SLOTS,
    'Grade 6': PRIMARY_SLOTS,
    'Grade 7': PRIMARY_SLOTS,
    'Grade 8': SECONDARY_SLOTS,
    'Grade 9': SECONDARY_SLOTS,
    'Grade 10': SECONDARY_SLOTS,
    'Grade 11': SECONDARY_SLOTS,
    'Grade 12': SECONDARY_SLOTS,
  };

  const YEARS = [2025, 2026];

  // We track class-slot IDs for 2026 so seedSchool can reference them for timetable entries.
  // Shape: { grade → { periodNumber → slot.$id } }
  // "periodNumber" = 1-based index of class-type slots within that grade's schedule (Period 1 = 1, etc.)
  const slotIdsByGrade = {};

  const allTasks = [];

  for (const [grade, slotDefs] of Object.entries(GRADE_SLOT_MAP)) {
    // Pre-compute which slot_numbers are class-type, in order, so we can map
    // them to 1-based period numbers (Period 1 = 1, Period 2 = 2, …) for the timetable lookup.
    const classSlotNums = slotDefs.filter(([, , t]) => t === 'class').map(([n]) => n);

    for (const year of YEARS) {
      for (const [slotNum, label, slotType, startTime, endTime, appliesToDays, notes] of slotDefs) {
        allTasks.push(async () => {
          const slot = await createRow(tablesDB, dbId, 'school_period_slots', {
            grade_level: grade,
            academic_year: year,
            slot_number: slotNum,
            label,
            slot_type: slotType,
            start_time: startTime,
            end_time: endTime,
            ...(appliesToDays.length > 0 ? { applies_to_days: appliesToDays } : {}),
            ...(notes ? { notes } : {}),
          });
          // Record the slot ID for 2026 class-type slots only
          if (year === 2026 && slotType === 'class') {
            if (!slotIdsByGrade[grade]) slotIdsByGrade[grade] = {};
            // Map by 1-based period number (position among class slots)
            const periodNum = classSlotNums.indexOf(slotNum) + 1;
            slotIdsByGrade[grade][periodNum] = slot.$id;
          }
        });
      }
    }
  }

  // Must run sequentially per-slot within batchRun to avoid race conditions on slotIdsByGrade writes.
  // batchRun already serialises in chunks so this is safe.
  await batchRun(allTasks, 25);

  const totalSlots =
    Object.values(GRADE_SLOT_MAP).reduce((s, defs) => s + defs.length, 0) * YEARS.length;
  log(`  ${totalSlots} period slots created (13 grades × 2 years)`);

  return { slotIdsByGrade };
}

// =============================================================================
// ENTRY POINT
// =============================================================================

export default async ({ req, res, log, error }) => {
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const endpoint = process.env.APPWRITE_ENDPOINT || 'http://localhost/v1';
  const dbId = process.env.APPWRITE_DATABASE_ID;

  if (!apiKey || !dbId) {
    return res.json(
      { success: false, error: 'Missing APPWRITE_API_KEY or APPWRITE_DATABASE_ID env vars' },
      500,
    );
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);

  try {
    log('=== seedAllData: starting ===');

    const { residentIds, councilMemberIds } = await seedHouseholdsAndResidents(tablesDB, dbId, log);
    const { categories, fundingSources } = await seedFinance(tablesDB, dbId, residentIds, log);
    await seedFarm(tablesDB, dbId, residentIds, categories, fundingSources, log);
    // Bell schedules must run before seedSchool so timetable entries can reference the slot IDs.
    const { slotIdsByGrade } = await seedBellSchedules(tablesDB, dbId, log);
    await seedSchool(tablesDB, dbId, residentIds, slotIdsByGrade, log);
    await seedCalendar(tablesDB, dbId, log);
    await seedVillageSettings(tablesDB, dbId, councilMemberIds, log);

    log('=== seedAllData: complete ===');
    return res.json({ success: true, message: 'All sample data seeded successfully.' });
  } catch (err) {
    error(`seedAllData failed: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
