import { defineStore } from 'pinia';
import { tables, functions } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useAuthStore } from 'src/stores/auth-store';
import { Query, Permission, Role } from 'appwrite';

const errorHandler = useErrorHandler();

/**
 * Notifications Store
 *
 * Fetches role-targeted notifications for the current user and tracks per-user
 * read receipts in notification_reads. Notifications are created exclusively by
 * the createNotification Appwrite Function; this store only reads.
 */
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    notifications: [],
    loading: false,
    error: null,
    filterType: null,
    isClient: false,
  }),

  getters: {
    /**
     * Count of notifications not marked as read by the current user.
     */
    unreadCount: (state) => state.notifications.filter((n) => !n.is_read).length,

    /**
     * Notifications filtered by the currently selected type.
     */
    filteredNotifications: (state) => {
      if (!state.filterType) return state.notifications;
      return state.notifications.filter((n) => n.type === state.filterType);
    },

    /**
     * Distinct notification types present in the current list.
     */
    distinctTypes: (state) => [...new Set(state.notifications.map((n) => n.type))],
  },

  actions: {
    /**
     * Load notifications targeted at one of the user's roles and merge read
     * receipts from notification_reads. Guarded for SSR; must be called client-side.
     */
    async fetchMyNotifications() {
      if (!this.isClient) return;

      const authStore = useAuthStore();
      const userRoles = authStore.userRoles || [];

      if (userRoles.length === 0 || !authStore.user?.$id) {
        this.notifications = [];
        return;
      }

      this.loading = true;
      this.error = null;

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const notifTableId = import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATIONS || 'notifications';
        const readsTableId =
          import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATION_READS || 'notification_reads';

        // Build role filter. Query.or requires >= 2 inner queries, so for a
        // single role we use a plain Query.contains instead. Empty role names
        // are filtered out to avoid matching every row.
        const roleNames = userRoles
          .map((role) => role?.name)
          .filter((name) => name && typeof name === 'string');

        let roleFilter;
        if (roleNames.length === 0) {
          // No usable role names -> return no notifications.
          this.notifications = [];
          return;
        } else if (roleNames.length === 1) {
          roleFilter = Query.contains('target_roles', roleNames[0]);
        } else {
          roleFilter = Query.or(roleNames.map((name) => Query.contains('target_roles', name)));
        }

        const [notifResult, readsResult] = await Promise.all([
          tables.listRows({
            databaseId: dbId,
            tableId: notifTableId,
            queries: [roleFilter, Query.orderDesc('$createdAt'), Query.limit(50)],
          }),
          tables.listRows({
            databaseId: dbId,
            tableId: readsTableId,
            queries: [Query.equal('user_id', authStore.user.$id), Query.limit(100)],
          }),
        ]);

        const readIds = new Set((readsResult.rows || []).map((row) => row.notification_id));

        this.notifications = (notifResult.rows || []).map((row) => ({
          ...row,
          is_read: readIds.has(row.$id),
        }));
      } catch (err) {
        console.error('Error fetching notifications:', err);
        this.error = err.message || 'Unable to load notifications right now.';
        errorHandler.notifyError('Failed to load notifications.');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Mark a single notification as read for the current user. Idempotent:
     * no duplicate notification_reads row is created.
     */
    async markRead(notificationId) {
      if (!this.isClient) return;

      const authStore = useAuthStore();
      const uid = authStore.user?.$id;
      if (!uid) return;

      const row = this.notifications.find((n) => n.$id === notificationId);
      if (!row) return;
      if (row.is_read) return;

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const readsTableId =
          import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATION_READS || 'notification_reads';

        const existing = await tables.listRows({
          databaseId: dbId,
          tableId: readsTableId,
          queries: [
            Query.equal('notification_id', notificationId),
            Query.equal('user_id', uid),
            Query.limit(1),
          ],
        });

        if (!existing.rows || existing.rows.length === 0) {
          await tables.createRow({
            databaseId: dbId,
            tableId: readsTableId,
            rowId: `${notificationId}_${uid}`,
            data: {
              notification_id: notificationId,
              user_id: uid,
              read_at: new Date().toISOString(),
            },
            permissions: [
              Permission.read(Role.user(uid)),
              Permission.update(Role.user(uid)),
              Permission.delete(Role.user(uid)),
            ],
          });
        }
      } catch (err) {
        console.error('Error marking notification as read:', err);
        this.error = err.message || 'Failed to mark notification as read.';
      } finally {
        if (row) {
          row.is_read = true;
        }
      }
    },

    /**
     * Mark every currently-loaded unread notification as read.
     */
    async markAllRead() {
      const unread = this.notifications.filter((n) => !n.is_read);
      await Promise.allSettled(unread.map((n) => this.markRead(n.$id)));
    },

    /**
     * Set the type filter. Pass null to show all.
     */
    filterByType(type) {
      this.filterType = type || null;
    },

    /**
     * Invoke the createNotification Appwrite Function. The server ignores any
     * target_roles/target_permissions in the payload, so this is purely a
     * transport helper. Never throws; returns { success, data?, skipped?, error? }.
     */
    async createNotification(payload) {
      const functionId = import.meta.env.VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION;

      if (!functionId) {
        const message =
          'Notifications are not configured: VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION is missing.';
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
        console.error(`createNotification failed for type "${payload?.type}":`, error);
        return { success: false, error: error.message || 'Request failed' };
      }
    },
  },
});
