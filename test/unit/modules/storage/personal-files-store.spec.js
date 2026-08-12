import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePersonalFilesStore } from 'src/modules/storage/stores/personal-files-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables, mockStorage } from 'test/helpers/appwrite-mock';
import { makeUser, ADMIN_ROLE } from 'test/helpers/fixtures';

// Mock useFileUpload composable
vi.mock('src/composables/useFileUpload', () => ({
  useFileUpload: () => ({
    createUpload: vi.fn(() => ({
      promise: Promise.resolve({ $id: 'file-new', name: 'test.pdf' }),
    })),
  }),
}));

// Mock getUserStorageQuota — returns 1GB by default
vi.mock('src/utils/permissions', () => ({
  getUserStorageQuota: vi.fn(() => 1024 * 1024 * 1024),
}));

// Mock shared-folders constants
vi.mock('src/modules/storage/constants/shared-folders', () => ({
  SHARED_FOLDERS: [
    { id: 'farm', label: 'Farm' },
    { id: 'finance', label: 'Finance' },
  ],
  getSharedFolderPermissions: vi.fn(() => ['read']),
}));

const fileMeta = (over = {}) => ({
  $id: 'fm-1',
  file_id: 'file-1',
  owner_id: 'user-1',
  bucket_id: 'personal_files',
  name: 'document.pdf',
  size: 1024,
  mime_type: 'application/pdf',
  folder_path: '/',
  shared_folder: null,
  uploaded_at: '2025-01-15T12:00:00Z',
  ...over,
});

describe('personal-files-store', () => {
  let store;
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = usePersonalFilesStore();
    authStore = useAuthStore();
    authStore.user = makeUser();
    authStore.userRoles = [ADMIN_ROLE];
    vi.clearAllMocks();
  });

  describe('fetchFiles', () => {
    it('fetches files and computes usage', async () => {
      const files = [fileMeta({ size: 500 }), fileMeta({ $id: 'fm-2', size: 300 })];
      mockTables.listRows.mockResolvedValue({ rows: files });

      await store.fetchFiles();

      expect(store.files).toEqual(files);
      expect(store.usageBytes).toBe(800);
      expect(store.loading).toBe(false);
    });

    it('does nothing when no user is set', async () => {
      authStore.user = null;

      await store.fetchFiles();

      expect(mockTables.listRows).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      await store.fetchFiles();

      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('deletes metadata and storage file', async () => {
      store.files = [fileMeta({ $id: 'fm-1', size: 500 })];
      mockTables.deleteRow.mockResolvedValue();
      mockStorage.deleteFile.mockResolvedValue();

      await store.deleteFile('fm-1');

      expect(mockTables.deleteRow).toHaveBeenCalled();
      expect(mockStorage.deleteFile).toHaveBeenCalled();
      expect(store.files).toHaveLength(0);
      expect(store.usageBytes).toBe(0);
    });

    it('does nothing when file not found', async () => {
      await store.deleteFile('unknown');

      expect(mockTables.deleteRow).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('returns download URL for existing file', () => {
      store.files = [fileMeta({ $id: 'fm-1' })];
      mockStorage.getFileDownload.mockReturnValue('http://download.url');

      const url = store.getDownloadUrl('fm-1');

      expect(url).toBe('http://download.url');
    });

    it('returns null when file not found', () => {
      const url = store.getDownloadUrl('unknown');
      expect(url).toBeNull();
    });
  });

  describe('moveFile', () => {
    it('updates folder_path and syncs state', async () => {
      store.files = [fileMeta({ $id: 'fm-1', folder_path: '/' })];
      const updated = fileMeta({ $id: 'fm-1', folder_path: '/subfolder' });
      mockTables.updateRow.mockResolvedValue(updated);

      await store.moveFile('fm-1', '/subfolder');

      expect(mockTables.updateRow).toHaveBeenCalled();
      expect(store.files[0].folder_path).toBe('/subfolder');
    });

    it('does nothing when file not found', async () => {
      await store.moveFile('unknown', '/subfolder');

      expect(mockTables.updateRow).not.toHaveBeenCalled();
    });
  });
});
