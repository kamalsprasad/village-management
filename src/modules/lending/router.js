/**
 * Lending Module Router
 *
 * Defines routes for the Lending module.
 * This router is imported into the main routes.js file.
 */

const lendingRoutes = [
  {
    path: 'lending',
    component: () => import('./pages/LendingIndex.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'lending:read',
      requiresSetting: 'lendingEnabled'
    },
    children: [
      {
        path: '',
        name: 'lending-dashboard',
        component: () => import('./pages/AllLoansPage.vue'),
      },
      {
        path: 'create',
        name: 'create-loan',
        component: () => import('./pages/CreateLoanPage.vue'),
      },
      {
        path: ':id',
        name: 'loan-detail',
        component: () => import('./pages/LoanDetailPage.vue'),
      },
      {
        path: 'reports',
        name: 'lending-reports',
        component: () => import('./pages/LendingReportsPage.vue'), // Placeholder for future
      }
    ]
  }
];

export default lendingRoutes;
