/**
 * Finance Module Router
 *
 * Defines routes for the Finance module.
 * This router is imported into the main routes.js file.
 */

const financeRoutes = [
  {
    path: 'finance',
    component: () => import('./pages/FinanceTransactionsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'finance:read',
    },
  },
  // Future routes for Finance module:
  // - /finance/transactions/:id (Transaction detail)
  // - /finance/funding-sources (Funding sources management)
  // - /finance/reports (Financial reports)
];

export default financeRoutes;
