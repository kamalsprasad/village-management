/**
 * School Module Routes (Story 4.1)
 *
 * Route definitions for the School module. Registered in src/router/routes.js
 * via spread, same as the Farm and Finance modules.
 *
 * IMPORTANT: 'school/learners/enroll' must be defined BEFORE 'school/learners/:id'
 * to prevent the :id param from capturing 'enroll' as an ID.
 */

const schoolRoutes = [
  {
    path: 'school',
    redirect: '/school/dashboard',
  },
  {
    path: 'school/dashboard',
    name: 'school-dashboard',
    component: () => import('./pages/SchoolDashboardPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/learners',
    name: 'school-learners',
    component: () => import('./pages/LearnersListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/learners/enroll',
    name: 'school-learner-enroll',
    component: () => import('./pages/EnrollLearnerPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:write',
    },
  },
  {
    path: 'school/learners/:id',
    name: 'school-learner-detail',
    component: () => import('./pages/LearnerDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/learners/:id/edit',
    name: 'school-learner-edit',
    component: () => import('./pages/EnrollLearnerPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:admin',
    },
  },
  {
    path: 'school/classes',
    name: 'school-classes',
    component: () => import('./pages/ClassesListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/classes/:id',
    name: 'school-class-detail',
    component: () => import('./pages/ClassDetailPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/classes/:id/record',
    name: 'school-record-scores',
    component: () => import('./pages/RecordScoresPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:write',
    },
  },
  {
    path: 'school/classes/:id/performance',
    name: 'school-class-performance',
    component: () => import('./pages/ClassPerformancePage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
  {
    path: 'school/teachers',
    name: 'school-teachers',
    component: () => import('./pages/TeachersListPage.vue'),
    meta: {
      requiresAuth: true,
      requiresPermission: 'school:read',
    },
  },
];

export default schoolRoutes;
