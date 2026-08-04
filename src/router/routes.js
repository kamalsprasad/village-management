// Module routes
import financeRoutes from 'src/modules/finance/router';
import lendingRoutes from 'src/modules/lending/router';
import farmRoutes from 'src/modules/farm/router';
import schoolRoutes from 'src/modules/school/router';
import calendarRoutes from 'src/modules/calendar/router';
import storageRoutes from 'src/modules/storage/router';
import vendorRoutes from 'src/modules/vendors/router';

const routes = [
  // Auth page (no layout)
  {
    path: '/auth',
    component: () => import('pages/AuthPage.vue'),
  },

  // Password reset page reached from recovery email link (no layout, public)
  {
    path: '/auth/reset-password',
    component: () => import('pages/auth/ResetPasswordPage.vue'),
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
        path: 'admin/storage',
        component: () => import('pages/admin/StorageSettingsPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: '*', // System Administrator only (Story 5.4)
        },
      },
      {
        path: 'admin/modules',
        component: () => import('pages/admin/ModulesPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: '*', // System Administrator only (Story 5.9)
        },
      },
      {
        path: 'admin/roles',
        component: () => import('pages/admin/RolesPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: '*', // System Administrator only (Story 5.13)
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
          breadcrumb: [{ label: 'Households', to: '/households' }],
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
          breadcrumb: [{ label: 'Residents', to: '/residents' }],
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
          breadcrumb: [{ label: 'Inventory', to: '/inventory' }],
        },
      },
      {
        path: 'inventory/:id',
        component: () => import('pages/inventory/InventoryDetailPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:read',
          breadcrumb: [{ label: 'Inventory', to: '/inventory' }],
        },
      },
      {
        path: 'inventory/:id/edit',
        component: () => import('pages/inventory/InventoryFormPage.vue'),
        meta: {
          requiresAuth: true,
          requiresPermission: 'inventory:write',
          breadcrumb: [{ label: 'Inventory', to: '/inventory' }],
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
      // Cloud Storage Module routes (Story 5.3)
      ...storageRoutes,
      // Vendors/Suppliers Management Module routes (Story 5.7)
      ...vendorRoutes,
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
