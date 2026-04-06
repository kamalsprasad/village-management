// Farm Router Configuration
// Story 3.1-3.9: Farm Management routes

const farmRoutes = {
  path: '/farm',
  component: () => import('layouts/MainLayout.vue'),
  meta: { requiresAuth: true, module: 'farm' },
  children: [
    {
      path: '',
      name: 'farm',
      component: () => import('./pages/FarmIndexPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'dashboard',
      name: 'farm-dashboard',
      component: () => import('./pages/FarmDashboardPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'plots',
      name: 'farm-plots',
      component: () => import('./pages/PlotsListPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'plots/:id',
      name: 'farm-plot-detail',
      component: () => import('./pages/PlotDetailPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'plantings',
      name: 'farm-plantings',
      component: () => import('./pages/PlantingsListPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'harvests',
      name: 'farm-harvests',
      component: () => import('./pages/HarvestsListPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'crops',
      name: 'farm-crops',
      component: () => import('./pages/CropsDatabasePage.vue'),
      meta: { permission: 'farm:admin' }
    },
    {
      path: 'sales',
      name: 'farm-sales',
      component: () => import('./pages/FarmSalesPage.vue'),
      meta: { permission: 'farm:read' }
    },
    {
      path: 'reports',
      name: 'farm-reports',
      component: () => import('./pages/FarmReportsPage.vue'),
      meta: { permission: 'farm:read' }
    }
  ]
};

export default farmRoutes;
