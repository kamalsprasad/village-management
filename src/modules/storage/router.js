/**
 * Cloud Storage Module Routes (Story 5.3)
 *
 * Route definitions for the private personal-files storage page. Registered
 * in src/router/routes.js via spread, same as the other modules.
 *
 * Guarded by requiresAuth + storage:read — quota (not this permission)
 * is what gates whether a user can actually upload anything.
 */

const storageRoutes = [
  {
    path: 'storage',
    name: 'storage',
    component: () => import('./pages/StoragePage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'storage:read',
    },
  },
];

export default storageRoutes;
