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
  // Crops Database (Story 3.2)
  {
    path: 'farm/crops',
    name: 'farm-crops',
    component: () => import('./pages/CropsListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/crops/add',
    name: 'farm-crop-add',
    component: () => import('./pages/CropFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:admin',
    },
  },
  {
    path: 'farm/crops/:id',
    name: 'farm-crop-detail',
    component: () => import('./pages/CropDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/crops/:id/edit',
    name: 'farm-crop-edit',
    component: () => import('./pages/CropFormPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:admin',
    },
  },
  // Future routes for Farm module (Stories 3.3-3.9):
  // - /farm/plantings (Planting records)
  // - /farm/harvests (Harvest records)
  // - /farm/sales (Farm sales)
  // - /farm/reports (Farm reports)
];

export default farmRoutes;
