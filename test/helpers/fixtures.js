// Reusable test fixtures. These mirror the shape of Appwrite rows used
// across the app (each row has $id, $createdAt, $updatedAt plus data fields).

export const ADMIN_ROLE = {
  $id: 'role-admin',
  name: 'System Administrator',
  permissions: ['*'],
  storage_quota: -1,
};

export const VILLAGE_HEAD_ROLE = {
  $id: 'role-vh',
  name: 'Village Head',
  permissions: ['*'],
  storage_quota: 20,
};

export const FINANCE_MANAGER_ROLE = {
  $id: 'role-fm',
  name: 'Finance Manager',
  permissions: ['finance:read', 'finance:write', 'dashboard:read'],
  storage_quota: 10,
};

export const FARM_MANAGER_ROLE = {
  $id: 'role-farm',
  name: 'Farm Manager',
  permissions: ['farm:read', 'farm:write'],
  storage_quota: 10,
};

export const RESIDENT_ROLE = {
  $id: 'role-res',
  name: 'Village Resident',
  permissions: ['residents:read', 'dashboard:read'],
  storage_quota: 2,
};

export const GUEST_ROLE = {
  $id: 'role-guest',
  name: 'Guest',
  permissions: [],
  storage_quota: 0.5,
};

export function makeUser(overrides = {}) {
  return {
    $id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    $createdAt: '2025-01-01T00:00:00.000Z',
    $updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeUserProfile(overrides = {}) {
  return {
    $id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role_ids: [ADMIN_ROLE],
    active: true,
    storage_quota: 0,
    ...overrides,
  };
}

export function makeResident(overrides = {}) {
  return {
    $id: 'res-1',
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    date_of_birth: '1990-01-01T00:00:00.000Z',
    gender: 'male',
    household_id: 'hh-1',
    is_head_of_household: false,
    status: 'active',
    ...overrides,
  };
}

export function makeHousehold(overrides = {}) {
  return {
    $id: 'hh-1',
    household_name: 'Doe Household',
    head_of_household_id: 'res-1',
    address: 'Village Center',
    ...overrides,
  };
}

export function makeInventoryItem(overrides = {}) {
  return {
    $id: 'inv-1',
    item_name: 'Maize Seeds',
    item_type: 'farm_inputs',
    quantity: 100,
    unit: 'kg',
    unit_cost: 5,
    status: 'in_stock',
    source: 'purchased',
    ...overrides,
  };
}

export function makePlot(overrides = {}) {
  return {
    $id: 'plot-1',
    plot_name: 'North Field',
    area_hectares: 2.5,
    status: 'Active',
    soil_type_id: 'soil-1',
    ...overrides,
  };
}

export function makeCrop(overrides = {}) {
  return {
    $id: 'crop-1',
    crop_name: 'Maize',
    category: 'cereal',
    growing_days: 120,
    is_active: true,
    ...overrides,
  };
}

export function makePlanting(overrides = {}) {
  return {
    $id: 'plant-1',
    plot_id: { $id: 'plot-1' },
    crop_id: { $id: 'crop-1' },
    planting_date: '2025-01-15T12:00:00.000Z',
    expected_harvest_date: '2025-05-15T12:00:00.000Z',
    area_used_hectares: 1,
    quantity_planted: 50,
    unit: 'kg',
    inputs_cost: 250,
    labor_cost: 100,
    other_cost: 0,
    status: 'planted',
    notes: '',
    ...overrides,
  };
}

export function makeTransaction(overrides = {}) {
  return {
    $id: 'txn-1',
    type: 'income',
    amount: 1000,
    category: 'Donations',
    source_module: 'Village',
    transaction_date: '2025-01-15T12:00:00.000Z',
    description: 'Donation from NGO',
    funding_source_id: null,
    ...overrides,
  };
}
