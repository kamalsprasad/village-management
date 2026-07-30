/**
 * Cloud Storage Module Routes (Story 5.3; extended Story 5.4)
 *
 * Route definitions for the private personal-files storage page and the
 * Story 5.4 shared-folders page. Registered in src/router/routes.js via
 * spread, same as the other modules.
 *
 * Both routes are guarded by requiresAuth + storage:read — quota (not this
 * permission) is what gates whether a user can actually upload anything,
 * and the individual shared folders are further gated in-page by their own
 * storage:<category>:read/write permissions.
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
  {
    path: 'storage/shared',
    name: 'storage-shared',
    component: () => import('./pages/SharedStoragePage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'storage:read',
    },
  },
];

export default storageRoutes;
