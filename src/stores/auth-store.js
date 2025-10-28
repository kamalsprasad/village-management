import { defineStore } from 'pinia';
import { account, functions, tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { ID, Query } from 'appwrite';
//import { api } from 'src/boot/axios';

const errorHandler = useErrorHandler();

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    userRoles: [], // Array of role objects with permissions
    isLoggedIn: false,
    isLoading: false,
    hasUsers: null, // null = not checked yet, true = users exist, false = no users
    errorMessage: null,
  }),

  getters: {
    currentUser: (state) => state.user,
    isAuthenticated: (state) => state.isLoggedIn,
  },

  actions: {
    /**
     * Check if the current session is valid and populate user data
     */
    async checkSession() {
      this.isLoading = true;
      try {
        const user = await account.get();
        this.user = user;
        this.isLoggedIn = true;
        // Fetch user roles
        await this.fetchUserRoles();
        return true;
      } catch {
        // No active session
        this.user = null;
        this.userRoles = [];
        this.isLoggedIn = false;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Check if any users exist in the system using Appwrite Function
     * Uses localStorage as a performance cache to avoid unnecessary function calls
     */
    async checkHasUsers() {
      this.isLoading = true;
      this.errorMessage = null;
      // Check localStorage cache first (performance optimization)
      const hasWindow = typeof window !== 'undefined';
      const storage = hasWindow ? window.localStorage : null;
      const systemInitialized = storage?.getItem('systemInitialized');

      if (systemInitialized === 'true') {
        this.hasUsers = true;
        // Also check for active session
        await this.checkSession();
        this.isLoading = false;
        return true;
      }

      // If not cached, call the Appwrite Function to check for users
      try {
        const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_CHECK_USERS;

        if (!functionId) {
          const message =
            'Authentication setup incomplete: VITE_APPWRITE_FUNCTION_CHECK_USERS is not configured. Please update your environment settings.';
          console.error(message);
          this.hasUsers = null;
          this.errorMessage = message;
          errorHandler.notifyError(message);
          this.isLoading = false;
          return false;
        }

        const execution = await functions.createExecution(functionId);
        const response = JSON.parse(execution.responseBody);

        if (response.success === false && response.userExists === null) {
          this.hasUsers = null;
          errorHandler.notifyError(
            response.message ||
              'The authentication service is unreachable at the moment. Please try again shortly.',
          );
          this.errorMessage =
            response.message ||
            'The authentication service is unreachable at the moment. Please try again shortly.';
          this.isLoading = false;
          return false;
        }

        if (response.success && response.userExists) {
          this.hasUsers = true;
          storage?.setItem('systemInitialized', 'true');
          // Also check for active session
          await this.checkSession();
          return true;
        } else {
          this.hasUsers = false;
          this.isLoading = false;
          return false;
        }
      } catch (error) {
        console.error('Error checking for users:', error);
        this.hasUsers = null;
        errorHandler.notifyError(
          'The authentication service is unreachable at the moment. Please try again shortly.',
        );
        this.errorMessage =
          'The authentication service is unreachable at the moment. Please try again shortly.';
        this.isLoading = false;
        return false;
      } finally {
        if (this.isLoading) {
          this.isLoading = false;
        }
      }
    },

    /**
     * Create the first admin user
     */
    async createAdmin(name, email, password) {
      this.isLoading = true;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const usersCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_USERS;
        const rolesCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ROLES;

        // 1. Create Appwrite Auth user
        const userId = ID.unique();
        await account.create(userId, email, password, name);

        // 2. Find System Administrator role
        const rolesResponse = await tables.listRows({
          databaseId: dbId,
          tableId: rolesCollectionId,
        });

        const adminRole = rolesResponse.rows.find((role) => role.name === 'System Administrator');

        if (!adminRole) {
          throw new Error('System Administrator role not found. Please seed roles table first.');
        }

        // 3. Create user profile in users table with same ID
        await tables.createRow({
          databaseId: dbId,
          tableId: usersCollectionId,
          rowId: userId,
          data: {
            email,
            name,
            role_ids: [adminRole.$id], // Relationship to roles table
            resident_id: null,
          },
        });

        // 4. Automatically log in the new user
        await this.login(email, password);

        const hasWindow = typeof window !== 'undefined';
        if (hasWindow) {
          window.localStorage.setItem('systemInitialized', 'true');
        }

        this.hasUsers = true;
        return { success: true };
      } catch (error) {
        console.error('Error creating admin:', error);
        return {
          success: false,
          error: error.message || 'Failed to create admin account',
        };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Log in with email and password
     */
    async login(email, password) {
      this.isLoading = true;
      try {
        // Create session
        await account.createEmailPasswordSession(email, password);

        // Fetch user data
        const user = await account.get();
        this.user = user;
        this.isLoggedIn = true;
        this.hasUsers = true;

        // Fetch user roles
        await this.fetchUserRoles();

        const hasWindow = typeof window !== 'undefined';
        if (hasWindow) {
          window.localStorage.setItem('systemInitialized', 'true');
        }

        return { success: true };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: error.message || 'Invalid email or password',
        };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Log out the current user
     */
    async logout() {
      this.isLoading = true;
      try {
        await account.deleteSession('current');
        this.user = null;
        this.userRoles = [];
        this.isLoggedIn = false;
        return { success: true };
      } catch (error) {
        console.error('Logout error:', error);
        return {
          success: false,
          error: error.message || 'Failed to log out',
        };
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch current user data
     */
    async fetchUser() {
      try {
        const user = await account.get();
        this.user = user;
        this.isLoggedIn = true;
        await this.fetchUserRoles();
        return user;
      } catch (error) {
        this.user = null;
        this.userRoles = [];
        this.isLoggedIn = false;
        throw error;
      }
    },

    /**
     * Fetch user roles from users table and populate userRoles state
     */
    async fetchUserRoles() {
      if (!this.user) {
        console.log('No user, setting userRoles to empty array');
        this.userRoles = [];
        return;
      }

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const usersCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_USERS;
        const rolesCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_ROLES;

        // Fetch user profile from users table (same ID as Auth user)
        const userProfile = await tables.getRow({
          databaseId: dbId,
          tableId: usersCollectionId,
          rowId: this.user.$id,
          queries: [Query.select(['*', 'role_ids.*'])],
        });

        // With relationships, role_ids will be an array of role objects (not just IDs)
        if (
          userProfile.role_ids &&
          Array.isArray(userProfile.role_ids) &&
          userProfile.role_ids.length > 0
        ) {
          // Check if role_ids contains objects (populated relationship) or strings (IDs only)
          if (typeof userProfile.role_ids[0] === 'object') {
            // Relationship is already populated
            this.userRoles = userProfile.role_ids;
          } else {
            // Relationship returned IDs only, need to fetch role documents
            const rolePromises = userProfile.role_ids.map((roleId) =>
              tables.getRow({
                databaseId: dbId,
                tableId: rolesCollectionId,
                rowId: roleId,
              }),
            );
            this.userRoles = await Promise.all(rolePromises);
            console.log('Roles fetched successfully:', this.userRoles);
          }
        } else {
          console.log('No role_ids found in user profile');
          this.userRoles = [];
        }
      } catch (error) {
        console.error('Error fetching user roles:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          type: error.type,
        });
        this.userRoles = [];
      }
    },
  },
});
