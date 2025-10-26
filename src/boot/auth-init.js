import { defineBoot } from '#q-app/wrappers';
import { useAuthStore } from 'src/stores/auth-store';

export default defineBoot(async ({ store }) => {
  const authStore = useAuthStore(store);

  // Check for existing session on app startup
  await authStore.checkHasUsers();

  // If user is logged in, allow navigation
  // If not, redirect to auth page will be handled by router guard
});
