/**
 * Finance Module Router
 *
 * Defines routes for the Finance module.
 * This router is imported into the main routes.js file.
 */

const financeRoutes = [
  {
    path: 'finance',
    redirect: '/finance/dashboard',
  },
  {
    path: 'finance/dashboard',
    name: 'finance-dashboard',
    component: () => import('./pages/FinanceDashboardPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'finance:read',
    },
  },
  {
    path: 'finance/transactions',
    name: 'finance-transactions',
    component: () => import('./pages/FinanceTransactionsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'finance:read',
    },
  },
  // Story 2.4: Funding Source Detail Page
  {
    path: 'finance/funding/:id',
    name: 'funding-source-detail',
    component: () => import('./pages/FundingSourceDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'finance:read',
      breadcrumb: [{ label: 'Finance', to: '/finance/dashboard' }],
    },
  },
  // Story 2.8: Financial Reports
  {
    path: 'finance/reports',
    name: 'finance-reports',
    component: () => import('./pages/FinanceReportsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'finance:read',
    },
  },
  // Future routes for Finance module:
  // - /finance/transactions/:id (Transaction detail)
];

export default financeRoutes;
