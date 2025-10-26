import { defineStore } from 'pinia';
import { account } from 'src/boot/appwrite';
import { ID } from 'appwrite';

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
     * Check if any users exist in the system
     * Note: This requires admin privileges or a server function
     * For now, we'll use a workaround by attempting to get current session
     */
    async checkHasUsers() {
      // Use localStorage as a persistent flag to know if setup was ever completed.
      const hasWindow = typeof window !== 'undefined';
      const storage = hasWindow ? window.localStorage : null;
      const systemInitialized = storage?.getItem('systemInitialized');

      if (systemInitialized === 'true') {
        this.hasUsers = true;
        return true;
      }

      // If flag not set, fallback to original logic for first-time setup.
      try {
        const hasSession = await this.checkSession();
        if (hasSession) {
          this.hasUsers = true;
          storage?.setItem('systemInitialized', 'true');
          return true;
        }

        // No session and no flag, assume it's a fresh setup.
        this.hasUsers = false;
        return false;
      } catch {
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
