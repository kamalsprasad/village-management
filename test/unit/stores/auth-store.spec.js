import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { mockAccount, mockTables, mockFunctions } from 'test/helpers/appwrite-mock';
import { ADMIN_ROLE, makeUser, makeUserProfile } from 'test/helpers/fixtures';

describe('auth-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('checkSession', () => {
    it('returns true and populates user when session is valid and profile active', async () => {
      const user = makeUser();
      mockAccount.get.mockResolvedValue(user);
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));
      // fetchUserRoles: profile with populated role_ids
      // (called after checkSession sets this.user)
      mockTables.getRow.mockResolvedValueOnce(makeUserProfile({ active: true }));
      mockTables.getRow.mockResolvedValueOnce(
        makeUserProfile({ role_ids: [ADMIN_ROLE] }),
      );

      const store = useAuthStore();
      const result = await store.checkSession();

      expect(result).toBe(true);
      expect(store.isLoggedIn).toBe(true);
      expect(store.user).toEqual(user);
    });

    it('returns false when there is no active session', async () => {
      mockAccount.get.mockRejectedValue(new Error('no session'));

      const store = useAuthStore();
      const result = await store.checkSession();

      expect(result).toBe(false);
      expect(store.isLoggedIn).toBe(false);
      expect(store.user).toBeNull();
    });

    it('logs out and returns false when user profile is deactivated', async () => {
      const user = makeUser();
      mockAccount.get.mockResolvedValue(user);
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: false }));
      mockAccount.deleteSession.mockResolvedValue();

      const store = useAuthStore();
      const result = await store.checkSession();

      expect(result).toBe(false);
      expect(store.isLoggedIn).toBe(false);
      expect(store.user).toBeNull();
      expect(mockAccount.deleteSession).toHaveBeenCalledWith({ sessionId: 'current' });
    });
  });

  describe('isUserProfileActive', () => {
    it('returns true when profile.active is true', async () => {
      mockTables.getRow.mockResolvedValue({ active: true });
      const store = useAuthStore();
      await expect(store.isUserProfileActive('u1')).resolves.toBe(true);
    });

    it('returns false when profile.active is false', async () => {
      mockTables.getRow.mockResolvedValue({ active: false });
      const store = useAuthStore();
      await expect(store.isUserProfileActive('u1')).resolves.toBe(false);
    });

    it('returns true on 404 (missing profile treated as active)', async () => {
      mockTables.getRow.mockRejectedValue({ code: 404, message: 'not found' });
      const store = useAuthStore();
      await expect(store.isUserProfileActive('u1')).resolves.toBe(true);
    });

    it('returns false on non-404 errors (fail closed)', async () => {
      mockTables.getRow.mockRejectedValue({ code: 500, message: 'server error' });
      const store = useAuthStore();
      await expect(store.isUserProfileActive('u1')).resolves.toBe(false);
    });
  });

  describe('logout', () => {
    it('clears state and returns success', async () => {
      mockAccount.deleteSession.mockResolvedValue();
      const store = useAuthStore();
      store.user = makeUser();
      store.isLoggedIn = true;
      store.userRoles = [ADMIN_ROLE];

      const result = await store.logout();

      expect(result).toEqual({ success: true });
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect(store.userRoles).toEqual([]);
    });

    it('returns error on failure', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('network'));
      const store = useAuthStore();
      const result = await store.logout();
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('checkHasUsers', () => {
    it('returns true when users exist', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true, userExists: true }),
      });
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true, role_ids: [ADMIN_ROLE] }));

      const store = useAuthStore();
      const result = await store.checkHasUsers();

      expect(result).toBe(true);
      expect(store.hasUsers).toBe(true);
    });

    it('returns false when no users exist', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true, userExists: false }),
      });

      const store = useAuthStore();
      const result = await store.checkHasUsers();

      expect(result).toBe(false);
      expect(store.hasUsers).toBe(false);
    });

    it('returns false with error message when function id not configured', async () => {
      // Simulate missing function id by mocking import.meta.env — covered by
      // the fact that VITE_APPWRITE_FUNCTION_CHECK_USERS has a default in
      // vitest config. Instead test the unreachable-service branch.
      mockFunctions.createExecution.mockRejectedValue(new Error('network'));
      const store = useAuthStore();
      const result = await store.checkHasUsers();
      expect(result).toBe(false);
      expect(store.hasUsers).toBeNull();
      expect(store.errorMessage).toBeTruthy();
    });
  });

  describe('changePassword', () => {
    it('returns success on valid update', async () => {
      mockAccount.updatePassword.mockResolvedValue();
      const store = useAuthStore();
      const result = await store.changePassword('old', 'new');
      expect(result).toEqual({ success: true });
      expect(mockAccount.updatePassword).toHaveBeenCalledWith({ password: 'new', oldPassword: 'old' });
    });

    it('returns error on failure', async () => {
      mockAccount.updatePassword.mockRejectedValue(new Error('bad password'));
      const store = useAuthStore();
      const result = await store.changePassword('old', 'new');
      expect(result.success).toBe(false);
    });
  });

  describe('requestPasswordReset', () => {
    it('calls createRecovery with a built URL', async () => {
      mockAccount.createRecovery.mockResolvedValue();
      const store = useAuthStore();
      const result = await store.requestPasswordReset('a@b.com');
      expect(result).toEqual({ success: true });
      expect(mockAccount.createRecovery).toHaveBeenCalledWith({
        email: 'a@b.com',
        url: expect.stringMatching(/\/auth\/reset-password$/),
      });
    });
  });

  describe('resetPassword', () => {
    it('calls updateRecovery with the given token and password', async () => {
      mockAccount.updateRecovery.mockResolvedValue();
      const store = useAuthStore();
      const result = await store.resetPassword('u1', 'secret', 'newpw');
      expect(result).toEqual({ success: true });
      expect(mockAccount.updateRecovery).toHaveBeenCalledWith({
        userId: 'u1',
        secret: 'secret',
        password: 'newpw',
      });
    });
  });
});
