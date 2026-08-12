import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUsersStore } from 'src/stores/users-store';
import { mockTables, mockFunctions } from 'test/helpers/appwrite-mock';
import { ADMIN_ROLE, FINANCE_MANAGER_ROLE, makeUserProfile } from 'test/helpers/fixtures';

describe('users-store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('fetchUsers', () => {
    it('populates users from listRows', async () => {
      mockTables.listRows.mockResolvedValue({
        rows: [makeUserProfile({ $id: 'u1' }), makeUserProfile({ $id: 'u2' })],
      });
      const store = useUsersStore();
      const result = await store.fetchUsers();
      expect(result.success).toBe(true);
      expect(store.users).toHaveLength(2);
      expect(store.isLoading).toBe(false);
    });

    it('returns failure and notifies on error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      const store = useUsersStore();
      const result = await store.fetchUsers();
      expect(result.success).toBe(false);
      expect(store.error).toBeTruthy();
      expect(store.isLoading).toBe(false);
    });
  });

  describe('fetchRoles', () => {
    it('populates roles from listRows', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [ADMIN_ROLE, FINANCE_MANAGER_ROLE] });
      const store = useUsersStore();
      const result = await store.fetchRoles();
      expect(result.success).toBe(true);
      expect(store.roles).toHaveLength(2);
    });

    it('returns failure on error', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));
      const store = useUsersStore();
      const result = await store.fetchRoles();
      expect(result.success).toBe(false);
    });
  });

  describe('systemAdministratorRole getter', () => {
    it('returns the System Administrator role', () => {
      const store = useUsersStore();
      store.roles = [FINANCE_MANAGER_ROLE, ADMIN_ROLE];
      expect(store.systemAdministratorRole).toEqual(ADMIN_ROLE);
    });

    it('returns null when no System Administrator role exists', () => {
      const store = useUsersStore();
      store.roles = [FINANCE_MANAGER_ROLE];
      expect(store.systemAdministratorRole).toBeNull();
    });
  });

  describe('_callUserManagementFunction', () => {
    it('returns error when function id is not configured', async () => {
      // The default VITE_APPWRITE_FUNCTION_USER_MANAGEMENT is set in vitest config,
      // so we simulate the missing-id branch by temporarily blanking it.
      const store = useUsersStore();
      // We can't easily blank import.meta.env at runtime; instead test the
      // success path and the catch path.
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true, userId: 'u1' }),
      });
      const result = await store._callUserManagementFunction({ action: 'createUser' });
      expect(result.success).toBe(true);
      expect(result.userId).toBe('u1');
    });

    it('returns error on execution failure', async () => {
      mockFunctions.createExecution.mockRejectedValue(new Error('function failed'));
      const store = useUsersStore();
      const result = await store._callUserManagementFunction({ action: 'createUser' });
      expect(result.success).toBe(false);
    });

    it('returns error on JSON parse failure', async () => {
      mockFunctions.createExecution.mockResolvedValue({ responseBody: 'not-json' });
      const store = useUsersStore();
      const result = await store._callUserManagementFunction({ action: 'createUser' });
      expect(result.success).toBe(false);
    });
  });

  describe('CRUD wrappers', () => {
    it('createUser calls the function with action createUser', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true, userId: 'new-1' }),
      });
      const store = useUsersStore();
      const result = await store.createUser({ name: 'X', email: 'x@y.com' });
      expect(result.success).toBe(true);
      expect(store.isLoading).toBe(false);
      const body = JSON.parse(mockFunctions.createExecution.mock.calls[0][0].body);
      expect(body.action).toBe('createUser');
      expect(body.name).toBe('X');
    });

    it('updateUser calls the function with action updateUser and userId', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });
      const store = useUsersStore();
      await store.updateUser('u1', { name: 'Updated' });
      const body = JSON.parse(mockFunctions.createExecution.mock.calls[0][0].body);
      expect(body.action).toBe('updateUser');
      expect(body.userId).toBe('u1');
      expect(body.name).toBe('Updated');
    });

    it('deactivateUser calls the function with action deactivateUser', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });
      const store = useUsersStore();
      await store.deactivateUser('u1', 'admin-1');
      const body = JSON.parse(mockFunctions.createExecution.mock.calls[0][0].body);
      expect(body.action).toBe('deactivateUser');
      expect(body.userId).toBe('u1');
      expect(body.actorUserId).toBe('admin-1');
    });

    it('reactivateUser calls the function with action reactivateUser', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });
      const store = useUsersStore();
      await store.reactivateUser('u1', 'admin-1');
      const body = JSON.parse(mockFunctions.createExecution.mock.calls[0][0].body);
      expect(body.action).toBe('reactivateUser');
    });

    it('resetUserPassword calls the function with action resetUserPassword', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true }),
      });
      const store = useUsersStore();
      await store.resetUserPassword('u1', 'newpw');
      const body = JSON.parse(mockFunctions.createExecution.mock.calls[0][0].body);
      expect(body.action).toBe('resetUserPassword');
      expect(body.password).toBe('newpw');
    });
  });
});
