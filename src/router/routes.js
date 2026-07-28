// Module routes
import financeRoutes from 'src/modules/finance/router';
import lendingRoutes from 'src/modules/lending/router';
import farmRoutes from 'src/modules/farm/router';
import schoolRoutes from 'src/modules/school/router';
import calendarRoutes from 'src/modules/calendar/router';

const routes = [
  // Auth page (no layout)
  {
    path: '/auth',
    component: () => import('pages/AuthPage.vue'),
  },

  // Unauthorized page (no layout)
  {
    path: '/unauthorized',
    component: () => import('pages/UnauthorizedPage.vue'),
  },

  // Setup wizard (no layout, shown on first run)
  {
    path: '/setup',
    name: 'setup',
    component: () => import('pages/setup/SetupWizard.vue'),
    meta: {
      requiresAuth: true, // User must be logged in
      isSetupWizard: true, // Special flag to allow access during first-run
    },
  },

  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/dashboard/DashboardPage.vue'),
        meta: {
          requiresAuth: true,
          // TODO(Story 1.10): Add dashboard-specific permission metadata once role matrix is finalized
        },
      },
      {
        path: 'appwrite-test',
        component: () => import('pages/AppwriteTestPage.vue'),
        meta: { requiresAuth: false },
      },
      {
        path: 'admin/users',
        component: () => import('pages/admin/UsersPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: '*', // System Administrator only
        },
      },
      {
        path: 'households',
        component: () => import('pages/households/HouseholdsListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'households:read',
        },
      },
      {
        path: 'households/:id',
        component: () => import('pages/households/HouseholdDetailPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'households:read',
        },
      },
      {
        path: 'residents',
        component: () => import('pages/residents/ResidentsListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'residents:read',
        },
      },
      {
        path: 'residents/:id',
        component: () => import('pages/residents/ResidentDetailPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'residents:read',
        },
      },
      {
        path: 'settings/village',
        component: () => import('pages/settings/VillageSettingsPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'settings:read', // All authenticated users can view
          // Edit mode is controlled within the component based on settings:write permission
        },
      },
      {
        path: 'profile',
        component: () => import('pages/profile/ProfilePage.vue'),
        meta: {
          requiresAuth: true,
        },
      },
      // Admin Settings routes (Story 2.3)
      {
        path: 'admin/finance-settings',
        component: () => import('src/pages/admin/FinanceSettingsPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: ['finance:read', '*'],
        },
      },
      // Inventory Module routes (Story 2.6)
      // IMPORTANT: 'inventory/add' must be defined BEFORE 'inventory/:id'
      // to prevent the :id param from capturing 'add' as an ID.
      {
        path: 'inventory',
        component: () => import('pages/inventory/InventoryListPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:read',
        },
      },
      {
        path: 'inventory/add',
        component: () => import('pages/inventory/InventoryFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:write',
        },
      },
      {
        path: 'inventory/:id',
        component: () => import('pages/inventory/InventoryDetailPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:read',
        },
      },
      {
        path: 'inventory/:id/edit',
        component: () => import('pages/inventory/InventoryFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:write',
        },
      },
      // Finance Module routes
      ...financeRoutes,
      ...lendingRoutes,
      ...farmRoutes,
      // School Module routes (Story 4.1)
      ...schoolRoutes,
      // Village Calendar Module routes (Story 5.1)
      ...calendarRoutes,
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
