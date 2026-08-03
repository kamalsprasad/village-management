/**
 * Static module registry for the Village Management System.
 *
 * Provides a single source of truth for module metadata, labels, icons,
 * and the optional-module dependency graph used by Module Management.
 */

export const MODULES = [
  // Core modules — always enabled and read-only on the module management page.
  {
    key: 'residents',
    label: 'Residents',
    description: 'Manage village residents and their household relationships.',
    icon: 'people',
    isCore: true,
    isOptional: false,
    configureRoute: null,
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'households',
    label: 'Households',
    description: 'Track village households and their composition.',
    icon: 'home',
    isCore: true,
    isOptional: false,
    configureRoute: null,
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    description: 'Central overview of village activity and key metrics.',
    icon: 'dashboard',
    isCore: true,
    isOptional: false,
    configureRoute: null,
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'finance',
    label: 'Finance',
    description: 'Record income, expenses, funding sources, and lending.',
    icon: 'account_balance',
    isCore: true,
    isOptional: false,
    configureRoute: '/admin/finance-settings',
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    description: 'Track village supplies, stock levels, and adjustments.',
    icon: 'inventory_2',
    isCore: true,
    isOptional: false,
    configureRoute: null,
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'calendar',
    label: 'Calendar',
    description: 'Village-wide calendar with events and category filtering.',
    icon: 'event',
    isCore: true,
    isOptional: false,
    configureRoute: null,
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'storage',
    label: 'Storage',
    description: 'Personal and shared file storage with role-based quotas.',
    icon: 'storage',
    isCore: true,
    isOptional: false,
    configureRoute: '/admin/storage',
    dependencies: [],
    requiredBy: [],
  },

  // Optional MVP modules — can be toggled on or off.
  {
    key: 'farm',
    label: 'Farm Management',
    description: 'Track plots, crops, plantings, harvests, and sales.',
    icon: 'agriculture',
    isCore: false,
    isOptional: true,
    configureRoute: '/farm/settings',
    dependencies: ['vendors'],
    requiredBy: ['calendar'],
  },
  {
    key: 'school',
    label: 'School',
    description: 'Manage learners, classes, academic records, and calendars.',
    icon: 'school',
    isCore: false,
    isOptional: true,
    configureRoute: '/school/settings',
    dependencies: [],
    requiredBy: [],
  },
  {
    key: 'vendors',
    label: 'Vendors',
    description: 'Track suppliers and buyers for farm sales and finance expenses.',
    icon: 'storefront',
    isCore: false,
    isOptional: true,
    configureRoute: null,
    dependencies: [],
    requiredBy: ['farm', 'finance'],
  },
];

export const CORE_MODULE_KEYS = MODULES.filter((module) => module.isCore).map(
  (module) => module.key,
);
export const OPTIONAL_MODULE_KEYS = MODULES.filter((module) => module.isOptional).map(
  (module) => module.key,
);

/**
 * Get a module definition by its key.
 * @param {string} key
 * @returns {Object|undefined}
 */
export function getModuleByKey(key) {
  return MODULES.find((module) => module.key === key);
}

/**
 * Get all modules of a given type.
 * @param {'core'|'optional'|'all'} type
 * @returns {Array<Object>}
 */
export function getModulesByType(type = 'all') {
  if (type === 'core') return MODULES.filter((module) => module.isCore);
  if (type === 'optional') return MODULES.filter((module) => module.isOptional);
  return [...MODULES];
}

/**
 * Get the display label for a module key, falling back to the key itself.
 * @param {string} key
 * @returns {string}
 */
export function getModuleLabel(key) {
  return getModuleByKey(key)?.label || key;
}
