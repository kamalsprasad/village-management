// Farm Router Configuration
// Story 3.1-3.9: Farm Management routes

const farmRoutes = [
  {
    path: 'farm',
    redirect: '/farm/dashboard',
  },
  {
    path: 'farm/dashboard',
    name: 'farm-dashboard',
    component: () => import('./pages/FarmDashboardPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/plots',
    name: 'farm-plots',
    component: () => import('./pages/PlotsListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/plots/add',
    name: 'farm-plot-add',
    component: () => import('./pages/PlotFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:write',
    },
  },
  {
    path: 'farm/plots/:id',
    name: 'farm-plot-detail',
    component: () => import('./pages/PlotDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/plots/:id/edit',
    name: 'farm-plot-edit',
    component: () => import('./pages/PlotFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:write',
    },
  },
  // Future routes for Farm module (Stories 3.2-3.9):
  // - /farm/crops (Crops database)
  // - /farm/plantings (Planting records)
  // - /farm/harvests (Harvest records)
  // - /farm/sales (Farm sales)
  // - /farm/reports (Farm reports)
];

export default farmRoutes;
