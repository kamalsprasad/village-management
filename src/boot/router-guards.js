import { defineBoot } from '#q-app/wrappers';
import { useAuthStore } from 'src/stores/auth-store';
import { useSettingsStore } from 'src/stores/settings-store';
import { hasPermission } from 'src/utils/permissions';

export default defineBoot(({ router, store }) => {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore(store);
    const settingsStore = useSettingsStore(store);

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
      // Fix for SSR Hydration Mismatch:
      // On server, we can't verify auth (no cookies). If we redirect to /auth,
      // Server renders AuthPage while Client renders TargetPage, causing mismatch.
      // We allow navigation on Server and let Client handle the redirect.
      if (process.env.SERVER) {
        next();
        return;
      }

      next('/auth');
      return;
    }

    // First-run check: redirect to setup wizard if no settings exist
    // Skip this check if already navigating to setup wizard
    const isSetupWizard = to.matched.some((record) => record.meta.isSetupWizard);

    if (!isSetupWizard && settingsStore.isFirstRun) {
      // Redirect to setup wizard - user must complete setup first
      next('/setup');
      return;
    }

    // If on setup wizard but settings already exist (not first run), redirect to dashboard
    if (isSetupWizard && !settingsStore.isFirstRun && settingsStore.isLoaded) {
      next('/');
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
