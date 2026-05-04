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

  // Plantings (Story 3.3)
  {
    path: 'farm/plantings',
    name: 'farm-plantings',
    component: () => import('./pages/PlantingsListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/plantings/:id',
    name: 'farm-planting-detail',
    component: () => import('./pages/PlantingDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/plots/:id/plantings/new',
    name: 'farm-planting-create',
    component: () => import('./pages/CreatePlantingPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:write',
    },
  },

  // Planting edit (Story 3.4)
  {
    path: 'farm/plantings/:id/edit',
    name: 'farm-planting-edit',
    component: () => import('./pages/PlantingEditPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:write',
    },
  },

  // Harvests (Story 3.5 — entry-based model)
  // NOTE: Harvest detail now lives inline on the planting detail page
  // (at most one harvest per planting). Creating a harvest happens via a
  // dialog on the planting detail page, not a separate route.
  {
    path: 'farm/harvests',
    name: 'harvests-list',
    component: () => import('./pages/HarvestsListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  // Legacy route compatibility: redirect /farm/harvests/:id to the planting
  // detail page. Because we don't have the planting ID in the URL, we fall
  // back to the harvests list (user will re-click through).
  {
    path: 'farm/harvests/:id',
    redirect: () => ({ name: 'harvests-list' }),
  },
  {
    path: 'farm/plantings/:id/harvests/new',
    redirect: (to) => `/farm/plantings/${to.params.id}`,
  },

  // Sales (Story 3.8)
  {
    path: 'farm/sales',
    name: 'farm-sales-list',
    component: () => import('./pages/SalesListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },
  {
    path: 'farm/sales/:id',
    name: 'farm-sale-detail',
    component: () => import('./pages/SaleDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },

  // Farm Reports (Story 3.9)
  {
    path: 'farm/reports',
    name: 'farm-reports',
    component: () => import('./pages/FarmReportsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },

  // Farm Alerts (Story 3.10)
  {
    path: 'farm/alerts',
    name: 'farm-alerts',
    component: () => import('./pages/FarmAlertsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:read',
    },
  },

  // Farm Settings (Story 3.10)
  {
    path: 'farm/settings',
    name: 'farm-settings',
    component: () => import('./pages/FarmSettingsPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'farm:write',
    },
  },
];

export default farmRoutes;
