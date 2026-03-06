// Module routes
import financeRoutes from 'src/modules/finance/router';

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
      // Finance Module routes
      ...financeRoutes,
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
