import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSharedFilesStore } from 'src/modules/storage/stores/shared-files-store';
import { usePersonalFilesStore } from 'src/modules/storage/stores/personal-files-store';
import { useAuthStore } from 'src/stores/auth-store';
import { mockTables, mockStorage } from 'test/helpers/appwrite-mock';
import { makeUser, ADMIN_ROLE } from 'test/helpers/fixtures';

// Mock useFileUpload composable
vi.mock('src/composables/useFileUpload', () => ({
  useFileUpload: () => ({
    createUpload: vi.fn(() => ({
      promise: Promise.resolve({ $id: 'file-new', name: 'shared.pdf' }),
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
  bucket_id: 'shared_files',
  name: 'shared-doc.pdf',
  size: 2048,
  mime_type: 'application/pdf',
  folder_path: '/',
  shared_folder: 'farm',
  uploaded_at: '2025-01-15T12:00:00Z',
  ...over,
});

describe('shared-files-store', () => {
  let store;
  let personalStore;
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSharedFilesStore();
    personalStore = usePersonalFilesStore();
    authStore = useAuthStore();
    authStore.user = makeUser();
    authStore.userRoles = [ADMIN_ROLE];
    vi.clearAllMocks();
  });

  describe('fetchFolderFiles', () => {
    it('fetches files for a shared folder', async () => {
      const files = [fileMeta()];
      mockTables.listRows.mockResolvedValue({ rows: files });

      await store.fetchFolderFiles('farm');

      expect(store.filesByFolder.farm).toEqual(files);
      expect(store.loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockTables.listRows.mockRejectedValue(new Error('network'));

      await store.fetchFolderFiles('farm');

      expect(store.error).toBeTruthy();
      expect(store.loading).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('deletes metadata and storage file', async () => {
      store.filesByFolder = { farm: [fileMeta({ $id: 'fm-1', size: 2048 })] };
      personalStore.files = [fileMeta({ $id: 'fm-1', size: 2048 })];
      personalStore.usageBytes = 2048;
      mockTables.deleteRow.mockResolvedValue();
      mockStorage.deleteFile.mockResolvedValue();

      await store.deleteFile('fm-1', 'farm');

      expect(mockTables.deleteRow).toHaveBeenCalled();
      expect(mockStorage.deleteFile).toHaveBeenCalled();
      expect(store.filesByFolder.farm).toHaveLength(0);
      // Personal store should also be updated
      expect(personalStore.files).toHaveLength(0);
      expect(personalStore.usageBytes).toBe(0);
    });

    it('does nothing when file not found in folder', async () => {
      await store.deleteFile('unknown', 'farm');

      expect(mockTables.deleteRow).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('returns download URL for existing file', () => {
      store.filesByFolder = { farm: [fileMeta({ $id: 'fm-1' })] };
      mockStorage.getFileDownload.mockReturnValue('http://download.url');

      const url = store.getDownloadUrl('fm-1', 'farm');

      expect(url).toBe('http://download.url');
    });

    it('returns null when file not found', () => {
      const url = store.getDownloadUrl('unknown', 'farm');
      expect(url).toBeNull();
    });

    it('returns null when folder not found', () => {
      const url = store.getDownloadUrl('fm-1', 'unknown');
      expect(url).toBeNull();
    });
  });
});
