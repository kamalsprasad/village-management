import { defineStore } from 'pinia';
import { account, functions } from 'src/boot/appwrite';
import { ID } from 'appwrite';
//import { api } from 'src/boot/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isLoggedIn: false,
    isLoading: false,
    hasUsers: null, // null = not checked yet, true = users exist, false = no users
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
        return true;
      } catch {
        // No active session
        this.user = null;
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
      // Check localStorage cache first (performance optimization)
      const hasWindow = typeof window !== 'undefined';
      const storage = hasWindow ? window.localStorage : null;
      const systemInitialized = storage?.getItem('systemInitialized');

      if (systemInitialized === 'true') {
        this.hasUsers = true;
        // Also check for active session
        await this.checkSession();
        return true;
      }

      // If not cached, call the Appwrite Function to check for users
      try {
        const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_CHECK_USERS;

        if (!functionId) {
          console.error('VITE_APPWRITE_FUNCTION_CHECK_USERS not configured');
          // Fallback: check for active session
          const hasSession = await this.checkSession();
          this.hasUsers = hasSession;
          return hasSession;
        }

        const execution = await functions.createExecution(functionId);
        const response = JSON.parse(execution.responseBody);

        if (response.success && response.userExists) {
          this.hasUsers = true;
          storage?.setItem('systemInitialized', 'true');
          // Also check for active session
          await this.checkSession();
          return true;
        } else {
          this.hasUsers = false;
          return false;
        }
      } catch (error) {
        console.error('Error checking for users:', error);
        // Fallback: assume no users on error
        this.hasUsers = false;
        return false;
      }
    },

    /**
     * Create the first admin user
     */
    async createAdmin(name, email, password) {
      this.isLoading = true;
      try {
        // Create user account
        const userId = ID.unique();
        await account.create(userId, email, password, name);

        // Automatically log in the new user
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
        return user;
      } catch (error) {
        this.user = null;
        this.isLoggedIn = false;
        throw error;
      }
    },
  },
});
