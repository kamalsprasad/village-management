import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { mockAccount, mockTables, mockFunctions } from 'test/helpers/appwrite-mock';
import { ADMIN_ROLE, makeUser, makeUserProfile } from 'test/helpers/fixtures';

describe('auth-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset all mocks between tests
    vi.clearAllMocks();
    // Restore default mock implementations
    mockAccount.get.mockResolvedValue(makeUser());
    mockAccount.deleteSession.mockResolvedValue();
    mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));
    mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
    mockTables.createRow.mockResolvedValue({});
    mockFunctions.createExecution.mockResolvedValue({
      responseBody: JSON.stringify({ success: true }),
    });
  });

  describe('checkSession', () => {
    it('returns true and populates user when session is valid and profile active', async () => {
      const user = makeUser();
      mockAccount.get.mockResolvedValue(user);
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));
      // fetchUserRoles: profile with populated role_ids
      // (called after checkSession sets this.user)
      mockTables.getRow.mockResolvedValueOnce(makeUserProfile({ active: true }));
      mockTables.getRow.mockResolvedValueOnce(makeUserProfile({ role_ids: [ADMIN_ROLE] }));

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
      mockTables.getRow.mockResolvedValue(
        makeUserProfile({ active: true, role_ids: [ADMIN_ROLE] }),
      );

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
      expect(mockAccount.updatePassword).toHaveBeenCalledWith({
        password: 'new',
        oldPassword: 'old',
      });
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

  // ================================================================
  // createAdmin — system initialization (highest complexity)
  // ================================================================

  describe('createAdmin', () => {
    it('creates admin user successfully with profile, roles, and team', async () => {
      const user = makeUser();
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(user);
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockResolvedValue({});
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });
      // fetchUserRoles will call getRow — return populated profile
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [ADMIN_ROLE] }));

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result).toEqual({ success: true });
      expect(store.user).toEqual(user);
      expect(store.isLoggedIn).toBe(true);
      expect(store.hasUsers).toBe(true);
      expect(mockAccount.create).toHaveBeenCalled();
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalled();
      expect(mockTables.createRow).toHaveBeenCalled();
    });

    it('sets localStorage systemInitialized flag on success', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockResolvedValue({});
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [ADMIN_ROLE] }));
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });

      const store = useAuthStore();
      await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(window.localStorage.getItem('systemInitialized')).toBe('true');
    });

    it('throws when System Administrator role is not found', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockTables.listRows.mockResolvedValue({
        rows: [{ $id: 'r1', name: 'Village Head' }],
      });

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/System Administrator role not found/);
    });

    it('returns error when account.create fails', async () => {
      mockAccount.create.mockRejectedValue(new Error('email already exists'));

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/email already exists/);
    });

    it('returns error when session creation fails after account creation', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockRejectedValue(new Error('auth failed'));

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/auth failed/);
    });

    it('returns error when profile creation fails', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockRejectedValue(new Error('db error'));

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/db error/);
    });

    it('continues successfully when team function execution fails (non-critical)', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockResolvedValue({});
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [ADMIN_ROLE] }));
      // Team function fails — should be caught and warned, not fatal
      mockFunctions.createExecution.mockRejectedValue(new Error('function down'));

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result).toEqual({ success: true });
      expect(store.isLoggedIn).toBe(true);
    });

    it('continues successfully when team function returns success=false', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockResolvedValue({});
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [ADMIN_ROLE] }));
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: false, error: 'team add failed' }),
      });

      const store = useAuthStore();
      const result = await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(result).toEqual({ success: true });
    });

    it('sets isLoading to false after completion', async () => {
      mockAccount.create.mockResolvedValue();
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE] });
      mockTables.createRow.mockResolvedValue({});
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [ADMIN_ROLE] }));
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });

      const store = useAuthStore();
      await store.createAdmin('Admin', 'admin@test.com', 'password123');

      expect(store.isLoading).toBe(false);
    });
  });

  // ================================================================
  // login
  // ================================================================

  describe('login', () => {
    it('logs in successfully with valid credentials', async () => {
      const user = makeUser();
      mockAccount.deleteSession.mockRejectedValue(new Error('no session')); // pre-existing session cleanup
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(user);
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));

      const store = useAuthStore();
      const result = await store.login('admin@test.com', 'password123');

      expect(result).toEqual({ success: true });
      expect(store.user).toEqual(user);
      expect(store.isLoggedIn).toBe(true);
      expect(store.hasUsers).toBe(true);
    });

    it('sets localStorage systemInitialized flag on success', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('no session'));
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));

      const store = useAuthStore();
      await store.login('admin@test.com', 'password123');

      expect(window.localStorage.getItem('systemInitialized')).toBe('true');
    });

    it('rejects login for deactivated account (defense-in-depth)', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('no session'));
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      // isUserProfileActive returns false
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: false }));

      const store = useAuthStore();
      const result = await store.login('admin@test.com', 'password123');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/deactivated/);
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      // Should delete the session that was just created
      expect(mockAccount.deleteSession).toHaveBeenCalledWith({ sessionId: 'current' });
    });

    it('returns error when createEmailPasswordSession fails', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('no session'));
      mockAccount.createEmailPasswordSession.mockRejectedValue(new Error('invalid credentials'));

      const store = useAuthStore();
      const result = await store.login('admin@test.com', 'wrongpass');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid credentials/);
    });

    it('cleans up pre-existing session before login (non-critical failure)', async () => {
      mockAccount.deleteSession.mockResolvedValue(); // session existed and was deleted
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));

      const store = useAuthStore();
      const result = await store.login('admin@test.com', 'password123');

      expect(result).toEqual({ success: true });
      expect(mockAccount.deleteSession).toHaveBeenCalled();
    });

    it('sets isLoading to false after completion', async () => {
      mockAccount.deleteSession.mockRejectedValue(new Error('no session'));
      mockAccount.createEmailPasswordSession.mockResolvedValue();
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));

      const store = useAuthStore();
      await store.login('admin@test.com', 'password123');

      expect(store.isLoading).toBe(false);
    });
  });

  // ================================================================
  // fetchUser
  // ================================================================

  describe('fetchUser', () => {
    it('fetches and populates user data when profile is active', async () => {
      const user = makeUser();
      mockAccount.get.mockResolvedValue(user);
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: true }));

      const store = useAuthStore();
      const result = await store.fetchUser();

      expect(result).toEqual(user);
      expect(store.user).toEqual(user);
      expect(store.isLoggedIn).toBe(true);
    });

    it('throws and clears state when profile is deactivated', async () => {
      mockAccount.get.mockResolvedValue(makeUser());
      mockTables.getRow.mockResolvedValue(makeUserProfile({ active: false }));

      const store = useAuthStore();
      await expect(store.fetchUser()).rejects.toThrow(/deactivated/);
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect(mockAccount.deleteSession).toHaveBeenCalledWith({ sessionId: 'current' });
    });

    it('throws and clears state when account.get fails', async () => {
      mockAccount.get.mockRejectedValue(new Error('no session'));

      const store = useAuthStore();
      await expect(store.fetchUser()).rejects.toThrow(/no session/);
      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });
  });

  // ================================================================
  // fetchUserRoles
  // ================================================================

  describe('fetchUserRoles', () => {
    it('sets empty array when no user is set', async () => {
      const store = useAuthStore();
      store.user = null;
      await store.fetchUserRoles();
      expect(store.userRoles).toEqual([]);
    });

    it('populates userRoles from populated role_ids (relationship objects)', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(
        makeUserProfile({
          role_ids: [ADMIN_ROLE, { $id: 'r2', name: 'Village Head', permissions: ['*'] }],
        }),
      );

      await store.fetchUserRoles();

      expect(store.userRoles).toHaveLength(2);
      expect(store.userRoles[0].name).toBe('System Administrator');
    });

    it('fetches individual role documents when role_ids are string IDs', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: ['role-admin', 'role-vh'] }));
      // First getRow is the profile, subsequent are role fetches
      mockTables.getRow
        .mockResolvedValueOnce(makeUserProfile({ role_ids: ['role-admin', 'role-vh'] }))
        .mockResolvedValueOnce(ADMIN_ROLE)
        .mockResolvedValueOnce({ $id: 'role-vh', name: 'Village Head', permissions: ['*'] });

      await store.fetchUserRoles();

      expect(store.userRoles).toHaveLength(2);
      expect(store.userRoles[0].name).toBe('System Administrator');
      expect(store.userRoles[1].name).toBe('Village Head');
    });

    it('sets empty array when role_ids is empty', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: [] }));

      await store.fetchUserRoles();

      expect(store.userRoles).toEqual([]);
    });

    it('sets empty array when role_ids is null/undefined', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(makeUserProfile({ role_ids: null }));

      await store.fetchUserRoles();

      expect(store.userRoles).toEqual([]);
    });

    it('sets storage quota override from profile', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(
        makeUserProfile({ role_ids: [ADMIN_ROLE], storage_quota: 15 }),
      );

      await store.fetchUserRoles();

      expect(store.userStorageQuotaOverride).toBe(15);
    });

    it('sets storage quota override to 0 when not a number', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockResolvedValue(
        makeUserProfile({ role_ids: [ADMIN_ROLE], storage_quota: null }),
      );

      await store.fetchUserRoles();

      expect(store.userStorageQuotaOverride).toBe(0);
    });

    it('sets empty array on error from tables.getRow', async () => {
      const store = useAuthStore();
      store.user = makeUser();
      mockTables.getRow.mockRejectedValue(new Error('network'));

      await store.fetchUserRoles();

      expect(store.userRoles).toEqual([]);
    });
  });
});
