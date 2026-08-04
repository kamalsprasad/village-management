/**
 * useDashboardData
 *
 * Story 5.10a: Real-data composable for the main DashboardPage.
 *
 * Fetches QuickStats counts (households, residents, finance) and a merged,
 * permission-gated "Recent Activity" feed from existing Appwrite tables and
 * Pinia stores. All Appwrite calls run inside `onMounted` so nothing executes
 * during SSR. Each module fetch is isolated so a single failure cannot break
 * the rest of the dashboard.
 */

import { ref, onMounted } from 'vue';
import { Query } from 'appwrite';
import { tables } from 'src/boot/appwrite';
import { useSettingsStore } from 'src/stores/settings-store';
import { useFinanceStore } from 'src/modules/finance/stores/finance-store';
import { usePermissions } from 'src/composables/usePermissions';

export function useDashboardData() {
  const settingsStore = useSettingsStore();
  const financeStore = useFinanceStore();
  const { hasPermission } = usePermissions();

  const quickStats = ref(null);
  const recentActivity = ref([]);
  const loading = ref(true);
  const error = ref(null);

  const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

  /**
   * Fetch QuickStats: household/resident counts + (permission-gated) finance totals.
   */
  async function fetchQuickStats() {
    const stats = {};

    try {
      const householdsResponse = await tables.listRows({
        databaseId: dbId,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
        queries: [Query.limit(1)],
      });
      stats.households = {
        total: householdsResponse.total,
        trend: 'flat',
        change: '—',
      };
    } catch (err) {
      console.error('Error fetching household count for dashboard:', err);
    }

    try {
      const residentsResponse = await tables.listRows({
        databaseId: dbId,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS,
        queries: [Query.limit(1)],
      });
      stats.residents = {
        total: residentsResponse.total,
        trend: 'flat',
        change: '—',
      };
    } catch (err) {
      console.error('Error fetching resident count for dashboard:', err);
    }

    if (hasPermission('finance:read')) {
      try {
        const result = await financeStore.fetchSummary();
        if (result && result.success) {
          const { totalIncome = 0, totalExpenses = 0, netBalance = 0 } = financeStore.summary || {};
          stats.finance = {
            totalIncome,
            totalExpenses,
            balance: netBalance,
            currency: settingsStore.defaultCurrency,
            trend: 'flat',
            change: '—',
          };
        }
      } catch (err) {
        console.error('Error fetching finance summary for dashboard:', err);
      }
    }

    quickStats.value = Object.keys(stats).length ? stats : null;
  }

  /**
   * Fetch up to 8 most-recent activity items across all permitted modules.
   */
  async function fetchRecentActivity() {
    const activityLists = await Promise.all([
      fetchHouseholdsActivity(),
      fetchResidentsActivity(),
      fetchFinanceActivity(),
      fetchFarmActivity(),
      fetchSchoolActivity(),
      fetchCalendarActivity(),
    ]);

    const merged = activityLists
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp || String(a.id).localeCompare(String(b.id)))
      .slice(0, 8);

    recentActivity.value = merged;
  }

  async function fetchHouseholdsActivity() {
    if (!hasPermission('households:read')) return [];
    try {
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS,
        queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
      });
      return (response.rows || []).map((row) => ({
        id: `household-${row.$id}`,
        type: 'household',
        icon: 'home',
        color: 'positive',
        timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
        module: 'Households',
        title: 'New household registered',
        description: row.name || 'Unnamed household',
        user: '—',
      }));
    } catch (err) {
      console.error('Error fetching households activity for dashboard:', err);
      return [];
    }
  }

  async function fetchResidentsActivity() {
    if (!hasPermission('residents:read')) return [];
    try {
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS,
        queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
      });
      return (response.rows || []).map((row) => ({
        id: `resident-${row.$id}`,
        type: 'resident',
        icon: 'person',
        color: 'blue',
        timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
        module: 'Residents',
        title: 'New resident added',
        description:
          [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed resident',
        user: '—',
      }));
    } catch (err) {
      console.error('Error fetching residents activity for dashboard:', err);
      return [];
    }
  }

  async function fetchFinanceActivity() {
    if (!hasPermission('finance:read')) return [];
    try {
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: 'finance_transactions',
        queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
      });
      return (response.rows || []).map((row) => {
        const isIncome = row.type === 'income';
        return {
          id: `finance-${row.$id}`,
          type: 'finance',
          icon: isIncome ? 'trending_up' : 'trending_down',
          color: isIncome ? 'positive' : 'negative',
          timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
          module: 'Finance',
          title: isIncome ? 'Income recorded' : 'Expense recorded',
          description: row.description || `Amount: ${row.amount ?? 0}`,
          user: '—',
        };
      });
    } catch (err) {
      console.error('Error fetching finance activity for dashboard:', err);
      return [];
    }
  }

  async function fetchFarmActivity() {
    if (!hasPermission('farm:read') || !settingsStore.farmEnabled) return [];

    const [harvests, sales] = await Promise.all([
      (async () => {
        try {
          const response = await tables.listRows({
            databaseId: dbId,
            tableId: 'harvests',
            queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
          });
          return (response.rows || []).map((row) => ({
            id: `harvest-${row.$id}`,
            type: 'harvest',
            icon: 'agriculture',
            color: 'green',
            timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
            module: 'Farm',
            title: 'Harvest recorded',
            description: `${row.total_quantity_kg ?? 0} kg harvested`,
            user: '—',
          }));
        } catch (err) {
          console.error('Error fetching harvests activity for dashboard:', err);
          return [];
        }
      })(),
      (async () => {
        try {
          const response = await tables.listRows({
            databaseId: dbId,
            tableId: 'farm_sales',
            queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
          });
          return (response.rows || []).map((row) => ({
            id: `sale-${row.$id}`,
            type: 'sale',
            icon: 'point_of_sale',
            color: 'green',
            timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
            module: 'Farm',
            title: 'Farm sale recorded',
            description: `${row.quantity_sold ?? 0} ${row.unit || 'kg'} sold to ${row.buyer_name || 'buyer'}`,
            user: '—',
          }));
        } catch (err) {
          console.error('Error fetching farm sales activity for dashboard:', err);
          return [];
        }
      })(),
    ]);

    return [...harvests, ...sales];
  }

  async function fetchSchoolActivity() {
    if (!hasPermission('school:read') || !settingsStore.schoolEnabled) return [];
    try {
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: 'learners',
        queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
      });
      return (response.rows || []).map((row) => ({
        id: `learner-${row.$id}`,
        type: 'learner',
        icon: 'school',
        color: 'purple',
        timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
        module: 'School',
        title: 'Learner enrolled',
        description: row.resident_full_name || 'New learner',
        user: '—',
      }));
    } catch (err) {
      console.error('Error fetching school activity for dashboard:', err);
      return [];
    }
  }

  async function fetchCalendarActivity() {
    try {
      const response = await tables.listRows({
        databaseId: dbId,
        tableId: import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_EVENTS || 'village_events',
        queries: [Query.orderDesc('$createdAt'), Query.limit(3)],
      });
      return (response.rows || []).map((row) => ({
        id: `event-${row.$id}`,
        type: 'event',
        icon: 'event',
        color: 'info',
        timestamp: row.$createdAt ? new Date(row.$createdAt) : new Date(0),
        module: 'Calendar',
        title: 'Event created',
        description: row.title || 'Untitled event',
        user: '—',
      }));
    } catch (err) {
      console.error('Error fetching calendar activity for dashboard:', err);
      return [];
    }
  }

  async function load() {
    loading.value = true;
    error.value = null;

    // Small delay for hydration safety, matching the existing DashboardPage pattern.
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      await Promise.all([fetchQuickStats(), fetchRecentActivity()]);
    } catch (err) {
      // Individual fetches are already isolated; this is a defensive fallback.
      console.error('Error loading dashboard data:', err);
      error.value = err;
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    load();
  });

  return {
    quickStats,
    recentActivity,
    loading,
    error,
    load,
  };
}
