/**
 * Shared Files Store (Story 5.4)
 *
 * Pinia store backing the "Shared Folders" page: lists/uploads/deletes files
 * within each of the 5 module-based shared folders (see
 * ../constants/shared-folders.js). Mirrors personal-files-store.js
 * conventions (same table, different bucket_id/shared_folder filter).
 *
 * Uploads here reuse the uploader's PERSONAL quota (personal-files-store's
 * usageBytes + role/override quota) as the pre-check, since shared files
 * count against the uploader's personal quota, not a separate shared quota.
 */

import { defineStore } from 'pinia';
import { ID, Query } from 'appwrite';
import { storage, tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useFileUpload } from 'src/composables/useFileUpload';
import { useAuthStore } from 'src/stores/auth-store';
import { usePersonalFilesStore } from './personal-files-store';
import { getUserStorageQuota } from 'src/utils/permissions';
import { SHARED_FOLDERS, getSharedFolderPermissions } from '../constants/shared-folders';

const errorHandler = useErrorHandler();

const SHARED_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_SHARED_FILES || 'shared_files';
const FILE_METADATA_TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_FILE_METADATA || 'file_metadata';

export const useSharedFilesStore = defineStore('sharedFiles', {
  state: () => ({
    filesByFolder: {},
    loading: false,
    error: null,
  }),

  actions: {
    /**
     * Loads all file_metadata rows for a given shared folder.
     * @param {string} folderId - one of SHARED_FOLDERS[].id
     */
    async fetchFolderFiles(folderId) {
      this.loading = true;
      this.error = null;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          queries: [
            Query.equal('shared_folder', folderId),
            Query.orderDesc('uploaded_at'),
            Query.limit(500),
          ],
        });
        this.filesByFolder = { ...this.filesByFolder, [folderId]: response.rows };
      } catch (error) {
        this.error = error.message;
        errorHandler.notifyError('Failed to load shared files. Please try again.');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Uploads a batch of files into a shared folder, pre-checked against
     * the uploader's personal quota (personal usage + this batch).
     * @param {string} folderId - one of SHARED_FOLDERS[].id
     * @param {File[]|FileList} files
     */
    async uploadFiles(folderId, files, options = {}) {
      const fileArray = Array.from(files || []);
      if (fileArray.length === 0) {
        return;
      }

      const folder = SHARED_FOLDERS.find((f) => f.id === folderId);
      if (!folder) {
        errorHandler.notifyError('Unknown shared folder.');
        return;
      }

      const authStore = useAuthStore();
      const userId = authStore.user?.$id;
      if (!userId) {
        return;
      }

      const { onProgress } = options;
      const personalFilesStore = usePersonalFilesStore();
      const quotaBytes = getUserStorageQuota(authStore.userRoles, authStore.userStorageQuotaOverride);
      if (Number.isNaN(quotaBytes)) {
        errorHandler.notifyError('Storage quota is not configured — upload blocked.');
        return;
      }

      const totalNewBytes = fileArray.reduce((sum, file) => sum + file.size, 0);
      if (quotaBytes !== -1 && personalFilesStore.usageBytes + totalNewBytes > quotaBytes) {
        errorHandler.notifyError('Storage quota exceeded — these files were not uploaded.');
        return;
      }

      const { createUpload } = useFileUpload();
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;

      for (const [index, file] of fileArray.entries()) {
        const { promise } = createUpload(SHARED_BUCKET_ID, file, {
          userId,
          currentUsageBytes: personalFilesStore.usageBytes,
          quotaBytes,
          permissions: getSharedFolderPermissions(folderId, 'file'),
          onProgress: (progress) => {
            onProgress?.(index, progress);
          },
        });

        const uploadedFile = await promise;
        if (!uploadedFile) {
          // Upload failed or was blocked — stop the batch, keep earlier files.
          break;
        }

        try {
          const now = new Date().toISOString();
          const metadataRow = await tables.createRow({
            databaseId: dbId,
            tableId: FILE_METADATA_TABLE_ID,
            rowId: ID.unique(),
            data: {
              file_id: uploadedFile.$id,
              owner_id: userId,
              bucket_id: SHARED_BUCKET_ID,
              name: file.name,
              size: file.size,
              mime_type: file.type || '',
              folder_path: '/',
              shared_folder: folderId,
              uploaded_at: now,
              updated_at: now,
            },
            permissions: getSharedFolderPermissions(folderId, 'row'),
          });

          const existing = this.filesByFolder[folderId] || [];
          this.filesByFolder = { ...this.filesByFolder, [folderId]: [metadataRow, ...existing] };
          personalFilesStore.usageBytes += file.size;
          personalFilesStore.files.unshift(metadataRow);
          errorHandler.notifySuccess(`Uploaded "${file.name}" to ${folder.label}.`);
        } catch (error) {
          try {
            await storage.deleteFile({ bucketId: SHARED_BUCKET_ID, fileId: uploadedFile.$id });
          } catch {
            // Best-effort cleanup; ignore secondary failure.
          }
          errorHandler.notifyError(
            error.message || `Uploaded "${file.name}" but failed to save its metadata.`,
          );
          break;
        }
      }
    },

    /**
     * Deletes a shared file from Storage and removes its metadata row, then
     * refreshes the folder's file list and the personal store's usage.
     * @param {string} fileId - file_metadata row $id
     * @param {string} folderId - one of SHARED_FOLDERS[].id
     */
    async deleteFile(fileId, folderId) {
      const files = this.filesByFolder[folderId] || [];
      const file = files.find((f) => f.$id === fileId);
      if (!file) {
        return;
      }

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          rowId: fileId,
        });

        this.filesByFolder = {
          ...this.filesByFolder,
          [folderId]: files.filter((f) => f.$id !== fileId),
        };

        await storage.deleteFile({ bucketId: file.bucket_id, fileId: file.file_id });

        const personalFilesStore = usePersonalFilesStore();
        personalFilesStore.files = personalFilesStore.files.filter((f) => f.$id !== fileId);
        personalFilesStore.usageBytes = personalFilesStore.files.reduce(
          (sum, f) => sum + (f.size || 0),
          0,
        );

        errorHandler.notifySuccess(`Deleted "${file.name}".`);
      } catch (error) {
        errorHandler.notifyError(error.message || `Failed to delete "${file.name}".`);
      }
    },

    /**
     * Returns a download URL for the shared file, or null if not found.
     * @param {string} fileId - file_metadata row $id
     * @param {string} folderId - one of SHARED_FOLDERS[].id
     * @returns {string|null}
     */
    getDownloadUrl(fileId, folderId) {
      const files = this.filesByFolder[folderId] || [];
      const file = files.find((f) => f.$id === fileId);
      if (!file) {
        return null;
      }

      try {
        return storage.getFileDownload({ bucketId: file.bucket_id, fileId: file.file_id });
      } catch (error) {
        errorHandler.notifyError(error.message || 'Could not generate download link.');
        return null;
      }
    },
  },
});
