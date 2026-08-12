import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from 'src/stores/notifications-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables, mockFunctions } from 'test/helpers/appwrite-mock';
import { ADMIN_ROLE, FINANCE_MANAGER_ROLE, makeUser } from 'test/helpers/fixtures';

describe('notifications-store', () => {
  let authStore;
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
    store = useNotificationsStore();
    store.isClient = true;
  });

  describe('getters', () => {
    it('unreadCount counts notifications where is_read is false', () => {
      store.notifications = [
        { $id: 'n1', is_read: false, type: 'info' },
        { $id: 'n2', is_read: true, type: 'info' },
        { $id: 'n3', is_read: false, type: 'alert' },
      ];
      expect(store.unreadCount).toBe(2);
    });

    it('filteredNotifications returns all when no filter', () => {
      store.notifications = [
        { $id: 'n1', type: 'info' },
        { $id: 'n2', type: 'alert' },
      ];
      expect(store.filteredNotifications).toHaveLength(2);
    });

    it('filteredNotifications filters by type', () => {
      store.notifications = [
        { $id: 'n1', type: 'info' },
        { $id: 'n2', type: 'alert' },
      ];
      store.filterType = 'info';
      expect(store.filteredNotifications).toHaveLength(1);
      expect(store.filteredNotifications[0].type).toBe('info');
    });

    it('distinctTypes returns unique types', () => {
      store.notifications = [
        { type: 'info' },
        { type: 'info' },
        { type: 'alert' },
      ];
      expect(store.distinctTypes.sort()).toEqual(['alert', 'info']);
    });
  });

  describe('fetchMyNotifications', () => {
    it('returns early when not client', async () => {
      store.isClient = false;
      await store.fetchMyNotifications();
      expect(store.notifications).toEqual([]);
    });

    it('clears notifications when user has no roles', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [];
      await store.fetchMyNotifications();
      expect(store.notifications).toEqual([]);
    });

    it('clears notifications when no user', async () => {
      authStore.user = null;
      authStore.userRoles = [ADMIN_ROLE];
      await store.fetchMyNotifications();
      expect(store.notifications).toEqual([]);
    });

    it('fetches and merges read receipts for a single role', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.listRows
        .mockResolvedValueOnce({
          rows: [
            { $id: 'n1', type: 'info', target_roles: ['System Administrator'] },
            { $id: 'n2', type: 'alert', target_roles: ['System Administrator'] },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ notification_id: 'n1' }],
        });

      await store.fetchMyNotifications();
      expect(store.notifications).toHaveLength(2);
      expect(store.notifications[0].is_read).toBe(true);
      expect(store.notifications[1].is_read).toBe(false);
      expect(store.loading).toBe(false);
    });

    it('fetches for multiple roles using Query.or', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE, FINANCE_MANAGER_ROLE];
      mockTables.listRows
        .mockResolvedValueOnce({ rows: [{ $id: 'n1', type: 'info' }] })
        .mockResolvedValueOnce({ rows: [] });

      await store.fetchMyNotifications();
      expect(store.notifications).toHaveLength(1);
      expect(store.notifications[0].is_read).toBe(false);
    });

    it('handles error gracefully', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [ADMIN_ROLE];
      mockTables.listRows.mockRejectedValue(new Error('network'));
      await store.fetchMyNotifications();
      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });

    it('returns empty when role names are not usable strings', async () => {
      authStore.user = makeUser();
      authStore.userRoles = [{ name: null }, { name: '' }];
      await store.fetchMyNotifications();
      expect(store.notifications).toEqual([]);
    });
  });

  describe('markRead', () => {
    it('returns early when not client', async () => {
      store.isClient = false;
      await store.markRead('n1');
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns early when no user', async () => {
      authStore.user = null;
      await store.markRead('n1');
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns early when notification not found', async () => {
      authStore.user = makeUser();
      store.notifications = [];
      await store.markRead('n1');
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('returns early when already read', async () => {
      authStore.user = makeUser();
      store.notifications = [{ $id: 'n1', is_read: true }];
      await store.markRead('n1');
      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('creates a read receipt when none exists', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      store.notifications = [{ $id: 'n1', is_read: false }];
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockResolvedValue({});

      await store.markRead('n1');
      expect(mockTables.createRow).toHaveBeenCalled();
      expect(store.notifications[0].is_read).toBe(true);
    });

    it('does not create a duplicate read receipt', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      store.notifications = [{ $id: 'n1', is_read: false }];
      mockTables.listRows.mockResolvedValue({ rows: [{ notification_id: 'n1' }] });

      await store.markRead('n1');
      expect(mockTables.createRow).not.toHaveBeenCalled();
      expect(store.notifications[0].is_read).toBe(true);
    });

    it('still marks read even on error', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      store.notifications = [{ $id: 'n1', is_read: false }];
      mockTables.listRows.mockRejectedValue(new Error('network'));

      await store.markRead('n1');
      expect(store.notifications[0].is_read).toBe(true);
      expect(store.error).toBeTruthy();
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications as read', async () => {
      authStore.user = makeUser({ $id: 'u1' });
      store.notifications = [
        { $id: 'n1', is_read: false },
        { $id: 'n2', is_read: false },
        { $id: 'n3', is_read: true },
      ];
      mockTables.listRows.mockResolvedValue({ rows: [] });
      mockTables.createRow.mockResolvedValue({});

      await store.markAllRead();
      expect(store.notifications.every((n) => n.is_read)).toBe(true);
    });
  });

  describe('filterByType', () => {
    it('sets the filter type', () => {
      store.filterByType('info');
      expect(store.filterType).toBe('info');
    });

    it('resets to null when called with falsy', () => {
      store.filterType = 'info';
      store.filterByType(null);
      expect(store.filterType).toBeNull();
    });
  });

  describe('createNotification', () => {
    it('calls the function and returns the parsed response', async () => {
      mockFunctions.createExecution.mockResolvedValue({
        responseBody: JSON.stringify({ success: true, data: 'x' }),
      });
      const result = await store.createNotification({ type: 'info', message: 'hi' });
      expect(result.success).toBe(true);
    });

    it('returns error on execution failure', async () => {
      mockFunctions.createExecution.mockRejectedValue(new Error('fail'));
      const result = await store.createNotification({ type: 'info' });
      expect(result.success).toBe(false);
    });
  });
});
