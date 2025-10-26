import { defineBoot } from '#q-app/wrappers';
import { useAuthStore } from 'src/stores/auth-store';

export default defineBoot(({ router, store }) => {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore(store);

    // Check if route requires authentication
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

    // If route doesn't require auth, allow navigation
    if (!requiresAuth) {
      next();
      return;
    }

    // Ensure we've checked for users
    if (authStore.hasUsers === null) {
      await authStore.checkHasUsers();
    }

    // If user is logged in, allow navigation
    if (authStore.isLoggedIn) {
      next();
      return;
    }

    // If not logged in and trying to access protected route, redirect to auth
    next('/auth');
  });
});
