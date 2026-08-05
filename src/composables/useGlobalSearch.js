import { ref, onMounted } from 'vue';
import { Query } from 'appwrite';
import { tables } from 'src/boot/appwrite';
import { usePermissions } from 'src/composables/usePermissions';
import { useSettingsStore } from 'src/stores/settings-store';
import { formatDate } from 'src/utils/dateUtils';

const MIN_SEARCH_LENGTH = 2;
const MAX_RESULTS = 5;

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', requiredPermission: null, requiredSetting: null },
  { label: 'Calendar', to: '/calendar', requiredPermission: null, requiredSetting: null },
  {
    label: 'Households',
    to: '/households',
    requiredPermission: 'households:read',
    requiredSetting: null,
  },
  {
    label: 'Residents',
    to: '/residents',
    requiredPermission: 'residents:read',
    requiredSetting: null,
  },
  {
    label: 'Finance Dashboard',
    to: '/finance/dashboard',
    requiredPermission: 'finance:read',
    requiredSetting: null,
  },
  {
    label: 'Transactions',
    to: '/finance/transactions',
    requiredPermission: 'finance:read',
    requiredSetting: null,
  },
  {
    label: 'Finance Reports',
    to: '/finance/reports',
    requiredPermission: 'finance:read',
    requiredSetting: null,
  },
  {
    label: 'Inventory',
    to: '/inventory',
    requiredPermission: 'inventory:read',
    requiredSetting: null,
  },
  {
    label: 'Lending',
    to: '/lending',
    requiredPermission: 'lending:read',
    requiredSetting: 'lendingEnabled',
  },
  {
    label: 'Vendors',
    to: '/vendors',
    requiredPermission: 'vendors:read',
    requiredSetting: 'vendorsEnabled',
  },
  {
    label: 'Add Vendor',
    to: '/vendors/add',
    requiredPermission: 'vendors:write',
    requiredSetting: 'vendorsEnabled',
  },
  {
    label: 'Farm',
    to: '/farm/dashboard',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Plantings',
    to: '/farm/plantings',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Crop Database',
    to: '/farm/crops',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Farm Sales',
    to: '/farm/sales',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Farm Reports',
    to: '/farm/reports',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Farm Alerts',
    to: '/farm/alerts',
    requiredPermission: 'farm:read',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'Farm Settings',
    to: '/farm/settings',
    requiredPermission: 'farm:write',
    requiredSetting: 'farmEnabled',
  },
  {
    label: 'School Dashboard',
    to: '/school/dashboard',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'Educational Goals',
    to: '/school/educational-goals',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'Learners',
    to: '/school/learners',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'Classes',
    to: '/school/classes',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'Teachers & Faculty',
    to: '/school/teachers',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'School Calendar',
    to: '/school/calendar',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'At-Risk Learners',
    to: '/school/at-risk-learners',
    requiredPermission: 'school:read',
    requiredSetting: 'schoolEnabled',
  },
  {
    label: 'School Settings',
    to: '/school/settings',
    requiredPermission: 'school:admin',
    requiredSetting: 'schoolEnabled',
  },
  { label: 'Storage', to: '/storage', requiredPermission: 'storage:read', requiredSetting: null },
  {
    label: 'Shared Folders',
    to: '/storage/shared',
    requiredPermission: 'storage:read',
    requiredSetting: null,
  },
  { label: 'User Management', to: '/admin/users', requiredPermission: '*', requiredSetting: null },
  {
    label: 'Roles & Permissions',
    to: '/admin/roles',
    requiredPermission: '*',
    requiredSetting: null,
  },
  {
    label: 'Module Management',
    to: '/admin/modules',
    requiredPermission: '*',
    requiredSetting: null,
  },
  {
    label: 'Village Settings',
    to: '/settings/village',
    requiredPermission: 'settings:read',
    requiredSetting: null,
  },
  {
    label: 'Finance Settings',
    to: '/admin/finance-settings',
    requiredPermission: 'finance:read',
    requiredSetting: null,
  },
  {
    label: 'Storage Settings',
    to: '/admin/storage',
    requiredPermission: '*',
    requiredSetting: null,
  },
];

export function useGlobalSearch() {
  const { hasPermission } = usePermissions();
  const settingsStore = useSettingsStore();

  const isClient = ref(false);
  const searchTerm = ref('');
  const groupedResults = ref({});
  const loading = ref(false);

  let activeSearchToken = 0;

  onMounted(() => {
    isClient.value = true;
  });

  function canAccessNavItem(item) {
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
      return false;
    }
    if (item.requiredSetting && !settingsStore[item.requiredSetting]) {
      return false;
    }
    return true;
  }

  function buildPagesGroup(term) {
    const needle = term.toLowerCase();
    return NAV_ITEMS.filter(
      (item) => canAccessNavItem(item) && item.label.toLowerCase().includes(needle),
    )
      .slice(0, MAX_RESULTS)
      .map((item) => ({
        id: `page-${item.to}`,
        label: item.label,
        secondary: item.to,
        icon: 'link',
        to: item.to,
      }));
  }

  async function queryTable(tableId, field, term, limit = MAX_RESULTS) {
    return tables.listRows({
      databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
      tableId,
      queries: [Query.startsWith(field, term), Query.limit(limit)],
    });
  }

  async function searchHouseholds(term) {
    if (!hasPermission('households:read')) return [];
    const response = await queryTable(import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS, 'name', term);
    return (response.rows || []).map((row) => ({
      id: row.$id,
      label: row.name,
      secondary: 'Household',
      icon: 'home',
      to: `/households/${row.$id}`,
    }));
  }

  async function searchResidents(term) {
    if (!hasPermission('residents:read')) return [];
    const results = await Promise.allSettled([
      queryTable(import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS, 'first_name', term),
      queryTable(import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS, 'last_name', term),
    ]);
    const map = new Map();
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        (result.value.rows || []).forEach((row) => {
          if (!map.has(row.$id)) {
            const fullName = [row.first_name, row.middle_names, row.last_name]
              .filter(Boolean)
              .join(' ');
            map.set(row.$id, {
              id: row.$id,
              label: fullName,
              secondary: 'Resident',
              icon: 'person',
              to: `/residents/${row.$id}`,
            });
          }
        });
      }
    });
    return Array.from(map.values()).slice(0, MAX_RESULTS);
  }

  async function searchFinance(term) {
    if (!hasPermission('finance:read')) return [];
    const response = await queryTable('finance_transactions', 'description', term);
    return (response.rows || []).map((row) => {
      const date = formatDate(row.date, '');
      const amount = row.amount_funded ?? row.amount ?? 0;
      const formatted = new Intl.NumberFormat('en-ZM', {
        style: 'currency',
        currency: 'ZMW',
        minimumFractionDigits: 0,
      }).format(amount);
      const secondary = `${row.type || 'Transaction'} — ${formatted}`;
      return {
        id: row.$id,
        label: row.description,
        secondary: date ? `${secondary} · ${date}` : secondary,
        icon: 'receipt_long',
        to: '/finance/transactions',
      };
    });
  }

  async function searchPlots(term) {
    if (!hasPermission('farm:read') || !settingsStore.farmEnabled) return [];
    const response = await queryTable('plots', 'name', term);
    return (response.rows || []).map((row) => ({
      id: row.$id,
      label: row.name,
      secondary: row.location_description || 'Plot',
      icon: 'grass',
      to: `/farm/plots/${row.$id}`,
    }));
  }

  // The learners table has no name columns — it links to residents via
  // resident_id. To search learners by name we first match residents by
  // first_name / last_name, then look up which of those residents have a
  // learner row. Pool size > MAX_RESULTS so we don't miss enrolled learners
  // hidden behind non-learner residents that matched the name prefix.
  const LEARNER_RESIDENT_POOL = 25;

  async function searchLearners(term) {
    if (!hasPermission('school:read') || !settingsStore.schoolEnabled) return [];
    const residentsTableId = import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS;
    const nameResults = await Promise.allSettled([
      queryTable(residentsTableId, 'first_name', term, LEARNER_RESIDENT_POOL),
      queryTable(residentsTableId, 'last_name', term, LEARNER_RESIDENT_POOL),
    ]);
    const residentMap = new Map();
    nameResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        (result.value.rows || []).forEach((row) => {
          if (!residentMap.has(row.$id)) {
            residentMap.set(row.$id, row);
          }
        });
      }
    });
    const residentIds = Array.from(residentMap.keys());
    if (residentIds.length === 0) return [];

    let learnerRows = [];
    try {
      const response = await tables.listRows({
        databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
        tableId: 'learners',
        queries: [Query.equal('resident_id', residentIds), Query.limit(MAX_RESULTS)],
      });
      learnerRows = response.rows || [];
    } catch (error) {
      console.error('GlobalSearch: learners lookup failed', error);
      return [];
    }

    return learnerRows.map((learner) => {
      const residentId =
        typeof learner.resident_id === 'object' ? learner.resident_id?.$id : learner.resident_id;
      const resident = residentMap.get(residentId);
      const fullName = resident
        ? [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ')
        : 'Learner';
      return {
        id: learner.$id,
        label: fullName,
        secondary: 'Learner',
        icon: 'school',
        to: `/school/learners/${learner.$id}`,
      };
    });
  }

  async function searchVendors(term) {
    if (!hasPermission('vendors:read') || !settingsStore.vendorsEnabled) return [];
    const response = await queryTable('vendors', 'name', term);
    return (response.rows || []).map((row) => ({
      id: row.$id,
      label: row.name,
      secondary: row.vendor_type || 'Vendor',
      icon: 'store',
      to: `/vendors/${row.$id}`,
    }));
  }

  async function searchInventory(term) {
    if (!hasPermission('inventory:read')) return [];
    const response = await queryTable(
      import.meta.env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory',
      'item_name',
      term,
    );
    return (response.rows || []).map((row) => ({
      id: row.$id,
      label: row.item_name,
      secondary: row.item_type || 'Inventory item',
      icon: 'inventory_2',
      to: `/inventory/${row.$id}`,
    }));
  }

  async function searchCalendar(term) {
    const response = await queryTable(
      import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_EVENTS || 'village_events',
      'title',
      term,
    );
    return (response.rows || []).map((row) => ({
      id: row.$id,
      label: row.title,
      secondary: row.category || 'Event',
      icon: 'event',
      to: '/calendar',
    }));
  }

  async function search(term) {
    if (!isClient.value) return;

    const trimmed = typeof term === 'string' ? term.trim() : '';
    searchTerm.value = trimmed;

    // Always consume a token, even below the min length, so a still-in-flight
    // request for a previously longer term can never repopulate results after
    // the user has shortened/cleared the input.
    const token = ++activeSearchToken;

    if (trimmed.length < MIN_SEARCH_LENGTH) {
      groupedResults.value = {};
      loading.value = false;
      return;
    }

    loading.value = true;

    const modules = [
      { key: 'Households', fn: searchHouseholds },
      { key: 'Residents', fn: searchResidents },
      { key: 'Finance', fn: searchFinance },
      { key: 'Farm', fn: searchPlots },
      { key: 'School', fn: searchLearners },
      { key: 'Vendors', fn: searchVendors },
      { key: 'Inventory', fn: searchInventory },
      { key: 'Calendar', fn: searchCalendar },
    ];

    const results = await Promise.allSettled(modules.map((module) => module.fn(trimmed)));

    if (token !== activeSearchToken) {
      return;
    }

    const nextGrouped = {};

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const rows = result.value || [];
        if (rows.length > 0) {
          nextGrouped[modules[index].key] = rows;
        }
      } else {
        console.error(`GlobalSearch: ${modules[index].key} search failed`, result.reason);
      }
    });

    const pages = buildPagesGroup(trimmed);
    if (pages.length > 0) {
      nextGrouped.Pages = pages;
    }

    groupedResults.value = nextGrouped;
    loading.value = false;
  }

  return {
    search,
    groupedResults,
    loading,
    searchTerm,
    isClient,
  };
}
