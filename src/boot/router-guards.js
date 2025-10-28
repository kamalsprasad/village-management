import { defineBoot } from '#q-app/wrappers';
import { useAuthStore } from 'src/stores/auth-store';
import { hasPermission } from 'src/utils/permissions';

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

    // If not logged in and trying to access protected route, redirect to auth
    if (!authStore.isLoggedIn) {
      next('/auth');
      return;
    }

    // Check if route requires specific permission
    if (to.meta.requiresPermission) {
      const permission = to.meta.requiresPermission;
      
      if (!hasPermission(authStore.user, authStore.userRoles, permission)) {
        // User doesn't have required permission, redirect to unauthorized page
        next('/unauthorized');
        return;
      }
    }

    // All checks passed, allow navigation
    next();
  });
});
