/**
 * Vendors/Suppliers Management Module Routes (Story 5.7)
 *
 * Defines routes for the Vendors module. Registered in src/router/routes.js
 * via spread, same as the other modules. Gated by `vendors:read`/`write`
 * permissions and the `vendorsEnabled` village setting.
 *
 * IMPORTANT: 'vendors/add' must be defined BEFORE 'vendors/:id' to prevent
 * the :id param from capturing 'add' as an ID.
 */

const vendorRoutes = [
  {
    path: 'vendors',
    name: 'vendors-list',
    component: () => import('./pages/VendorsListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'vendors:read',
      requiresSetting: 'vendorsEnabled',
    },
  },
  {
    path: 'vendors/add',
    name: 'vendors-add',
    component: () => import('./pages/VendorFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'vendors:write',
      requiresSetting: 'vendorsEnabled',
    },
  },
  {
    path: 'vendors/:id',
    name: 'vendors-detail',
    component: () => import('./pages/VendorDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'vendors:read',
      requiresSetting: 'vendorsEnabled',
    },
  },
  {
    path: 'vendors/:id/edit',
    name: 'vendors-edit',
    component: () => import('./pages/VendorFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'vendors:write',
      requiresSetting: 'vendorsEnabled',
    },
  },
];

export default vendorRoutes;
