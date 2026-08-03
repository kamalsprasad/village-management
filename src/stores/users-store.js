import { defineStore } from 'pinia';
import { tables, functions } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { Query } from 'appwrite';

const errorHandler = useErrorHandler();

/**
 * Story 5.12: User Management — CRUD Operations.
 *
 * Wraps the "User Management" Appwrite Function (create/update/deactivate/
 * reactivate) and read-only table queries used by `/admin/users`.
 */
export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    roles: [],
    isLoading: false,
    error: null,
  }),

  getters: {
    systemAdministratorRole: (state) =>
      state.roles.find((role) => role.name === 'System Administrator') || null,
  },

  actions: {
    /**
     * Fetch all users along with their populated roles.
     */
    async fetchUsers() {
      this.isLoading = true;
      this.error = null;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const usersCollectionId = import.meta.env.VITE_APPWRITE_TABLE_USERS;

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: usersCollectionId,
          queries: [Query.select(['*', 'role_ids.*']), Query.limit(500)],
        });

        this.users = response.rows || [];
        return { success: true, data: this.users };
      } catch (error) {
        console.error('Error fetching users:', error);
        this.error = error.message || 'Failed to load users';
        errorHandler.notifyError('Failed to load users');
        return { success: false, error: this.error };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch all roles (used to populate the role multi-select).
     */
    async fetchRoles() {
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const rolesCollectionId = import.meta.env.VITE_APPWRITE_TABLE_ROLES;

        const response = await tables.listRows({
          databaseId: dbId,
          tableId: rolesCollectionId,
          queries: [Query.limit(200)],
        });

        this.roles = response.rows || [];
        return { success: true, data: this.roles };
      } catch (error) {
        console.error('Error fetching roles:', error);
        this.error = error.message || 'Failed to load roles';
        errorHandler.notifyError('Failed to load roles');
        return { success: false, error: this.error };
      }
    },

    /**
     * Invoke the "User Management" Appwrite Function.
     * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
     */
    async _callUserManagementFunction(payload) {
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_USER_MANAGEMENT;

      if (!functionId) {
        const message =
          'User management is not configured: VITE_APPWRITE_FUNCTION_USER_MANAGEMENT is missing.';
        console.error(message);
        return { success: false, error: message };
      }

      try {
        const execution = await functions.createExecution({
          functionId,
          body: JSON.stringify(payload),
          async: false,
        });
        const response = JSON.parse(execution.responseBody);
        return response;
      } catch (error) {
        console.error(`User management action "${payload.action}" failed:`, error);
        return { success: false, error: error.message || 'Request failed' };
      }
    },

    /**
     * Create a new user (Auth account + `users` row + optional admin team
     * membership).
     */
    async createUser(payload) {
      this.isLoading = true;
      try {
        return await this._callUserManagementFunction({ action: 'createUser', ...payload });
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Update an existing user's name/email/roles/resident link.
     */
    async updateUser(userId, payload) {
      this.isLoading = true;
      try {
        return await this._callUserManagementFunction({
          action: 'updateUser',
          userId,
          ...payload,
        });
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Soft-deactivate a user: invalidates sessions and blocks login.
     */
    async deactivateUser(userId, actorUserId) {
      this.isLoading = true;
      try {
        return await this._callUserManagementFunction({
          action: 'deactivateUser',
          userId,
          actorUserId,
        });
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Reactivate a previously deactivated user.
     */
    async reactivateUser(userId, actorUserId) {
      this.isLoading = true;
      try {
        return await this._callUserManagementFunction({
          action: 'reactivateUser',
          userId,
          actorUserId,
        });
      } finally {
        this.isLoading = false;
      }
    },
  },
});
