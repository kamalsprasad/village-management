/**
 * Village Calendar Module Routes (Story 5.1)
 *
 * Route definitions for the global village calendar. Registered in
 * src/router/routes.js via spread, same as the other modules.
 *
 * Guarded by requiresAuth only — the global calendar is read-only and
 * visible to every authenticated user (no permission gate).
 */

const calendarRoutes = [
  {
    path: 'calendar',
    name: 'village-calendar',
    component: () => import('./pages/CalendarPage.vue'),
    meta: {
      requiresAuth: true,
    },
  },
];

export default calendarRoutes;
