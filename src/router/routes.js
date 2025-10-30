const routes = [
  // Auth page (no layout)
  {
    path: '/auth',
    component: () => import('pages/AuthPage.vue'),
  },

  // Unauthorized page (no layout)
  {
    path: '/unauthorized',
    component: () => import('pages/UnauthorizedPage.vue'),
  },

  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/dashboard/DashboardPage.vue'),
        meta: {
          requiresAuth: true,
          // TODO(Story 1.10): Add dashboard-specific permission metadata once role matrix is finalized
        },
      },
      { 
        path: 'appwrite-test', 
        component: () => import('pages/AppwriteTestPage.vue'), 
        meta: { requiresAuth: true } 
      },
      {
        path: 'admin/users',
        component: () => import('pages/admin/UsersPage.vue'),
        meta: { 
          requiresAuth: true,
          requiresPermission: '*' // System Administrator only
        }
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes
