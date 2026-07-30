/**
 * Personal Files Store (Story 5.3; extended Story 5.4)
 *
 * Pinia store for the private "My Files" storage page: lists, uploads,
 * renames, moves, deletes and searches the current user's files in the
 * personal_files bucket, and tracks their storage usage. `usageBytes` sums
 * across ALL of this owner's file_metadata rows (personal AND shared),
 * since shared files still count against the uploader's personal quota;
 * `personalOnlyFiles`/`filteredFiles` restrict the "My Files" LIST to the
 * personal bucket only (Story 5.4 added `shareToFolder` for copying a
 * personal file into a shared folder).
 *

 * A dedicated file_metadata table (rather than Storage's built-in file
 * listing) tracks owner_id and folder_path, since Storage listing does not
 * support either. Per-file Storage permissions (set at upload time via
 * useFileUpload) are the actual privacy boundary; owner_id filtering here is
 * an additional client-side guard.
 *
 * Quota enforcement is client-side only for Story 5.3 (server-side hardening
 * deferred to post-MVP). "Move" only updates folder_path within the same
 * personal bucket; shared folders are reached exclusively via the Story 5.4
 * copy-based `shareToFolder` action below, never by moving a folder_path.
 */

import { defineStore } from 'pinia';
import { ID, Permission, Query, Role } from 'appwrite';
import { storage, tables } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';
import { useFileUpload } from 'src/composables/useFileUpload';
import { useAuthStore } from 'src/stores/auth-store';
import { getUserStorageQuota } from 'src/utils/permissions';
import { SHARED_FOLDERS, getSharedFolderPermissions } from '../constants/shared-folders';

const errorHandler = useErrorHandler();

/**
 * Validates that a folder path stays inside the personal root.
 * Rejects empty paths, missing leading "/", traversal (".."), backslashes,
 * and any path under the reserved shared-folder root.
 * @param {string} path
 * @returns {boolean}
 */
function isPersonalFolderPath(path) {
  if (!path || !path.startsWith('/')) {
    errorHandler.notifyError('Folder path must start with "/".');
    return false;
  }
  if (path.includes('\\') || path.includes('..')) {
    errorHandler.notifyError('Folder path cannot contain ".." or backslashes.');
    return false;
  }
  // Normalize "//" and split into segments to detect the reserved /shared root.
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 0 && segments[0].toLowerCase() === 'shared') {
    errorHandler.notifyError(
      'Cannot move files into shared folders. Use "Share to Folder" instead.',
    );
    return false;
  }
  return true;
}

const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_PERSONAL_FILES || 'personal_files';
const SHARED_BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_SHARED_FILES || 'shared_files';
const FILE_METADATA_TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_FILE_METADATA || 'file_metadata';

export const usePersonalFilesStore = defineStore('personalFiles', {
  state: () => ({
    files: [],
    usageBytes: 0,
    loading: false,
    error: null,
  }),

  getters: {
    /**
     * Story 5.4: rows belonging to the personal bucket only (excludes any
     * shared-bucket rows the owner might also see via other queries), for
     * the "My Files" list. `usageBytes` is intentionally NOT restricted to
     * this getter — shared files still count against the uploader's
     * personal quota.
     * @returns {Array}
     */
    personalOnlyFiles: (state) => state.files.filter((f) => f.bucket_id === BUCKET_ID),

    /**
     * Client-side, case-insensitive filter of personal files by name.
     * @returns {(search: string) => Array}
     */
    filteredFiles() {
      return (search) => {
        const source = this.personalOnlyFiles;
        if (!search || !search.trim()) {
          return source;
        }
        const needle = search.trim().toLowerCase();
        return source.filter((file) => (file.name || '').toLowerCase().includes(needle));
      };
    },

    /** Fraction (0-1) of quota used; 0 when quota is unlimited or unknown. */
    usagePercent() {
      const authStore = useAuthStore();
      const quotaBytes = getUserStorageQuota(
        authStore.userRoles,
        authStore.userStorageQuotaOverride,
      );
      if (quotaBytes === -1 || Number.isNaN(quotaBytes)) {
        return 0;
      }
      if (quotaBytes === 0) {
        return this.usageBytes > 0 ? 1 : 0;
      }
      return Math.min(this.usageBytes / quotaBytes, 1);
    },

    /** True once usage crosses the 90% warning threshold. */
    isOverQuota90() {
      return this.usagePercent > 0.9;
    },
  },

  actions: {
    /**
     * Loads the current user's file metadata rows and recomputes usageBytes.
     */
    async fetchFiles() {
      const authStore = useAuthStore();
      const userId = authStore.user?.$id;
      if (!userId) {
        return;
      }

      this.loading = true;
      this.error = null;
      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const response = await tables.listRows({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          queries: [
            Query.equal('owner_id', userId),
            Query.orderDesc('uploaded_at'),
            Query.limit(500),
          ],
        });
        this.files = response.rows;
        this.usageBytes = this.files.reduce((sum, file) => sum + (file.size || 0), 0);
      } catch (error) {
        this.error = error.message;
        errorHandler.notifyError('Failed to load your files. Please try again.');
      } finally {
        this.loading = false;
      }
    },

    /**
     * Uploads a batch of files sequentially, blocking the whole batch up
     * front if the combined size would exceed quota. If an individual file
     * upload fails, the batch stops but earlier successful uploads are kept.
     * @param {File[]|FileList} files
     */
    async uploadFiles(files, options = {}) {
      const fileArray = Array.from(files || []);
      if (fileArray.length === 0) {
        return;
      }

      const authStore = useAuthStore();
      const userId = authStore.user?.$id;
      if (!userId) {
        return;
      }

      const { onProgress } = options;
      const quotaBytes = getUserStorageQuota(
        authStore.userRoles,
        authStore.userStorageQuotaOverride,
      );
      if (Number.isNaN(quotaBytes)) {
        errorHandler.notifyError('Storage quota is not configured — upload blocked.');
        return;
      }

      const totalNewBytes = fileArray.reduce((sum, file) => sum + file.size, 0);
      if (quotaBytes !== -1 && this.usageBytes + totalNewBytes > quotaBytes) {
        errorHandler.notifyError('Storage quota exceeded — these files were not uploaded.');
        return;
      }

      // Reject duplicate names in the destination folder before uploading
      // (personal-bucket rows only — shared files live in a different bucket).
      const duplicate = fileArray.find((file) =>
        this.personalOnlyFiles.some(
          (f) => f.folder_path === '/' && (f.name || '').toLowerCase() === file.name.toLowerCase(),
        ),
      );
      if (duplicate) {
        errorHandler.notifyError(
          `A file named "${duplicate.name}" already exists in your personal folder.`,
        );
        return;
      }

      const { createUpload } = useFileUpload();
      const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
      const rowPermissions = [
        Permission.read(Role.user(userId)),
        Permission.update(Role.user(userId)),
        Permission.delete(Role.user(userId)),
      ];

      for (const [index, file] of fileArray.entries()) {
        const { promise } = createUpload(BUCKET_ID, file, {
          userId,
          currentUsageBytes: this.usageBytes,
          quotaBytes,
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
              bucket_id: BUCKET_ID,
              name: file.name,
              size: file.size,
              mime_type: file.type || '',
              folder_path: '/',
              uploaded_at: now,
              updated_at: now,
            },
            permissions: rowPermissions,
          });
          this.files.unshift(metadataRow);
          this.usageBytes += file.size;
          errorHandler.notifySuccess(`Uploaded "${file.name}".`);
        } catch (error) {
          // Metadata row failed — clean up the orphan Storage file so it does
          // not consume invisible quota.
          try {
            await storage.deleteFile({ bucketId: BUCKET_ID, fileId: uploadedFile.$id });
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
     * Story 5.4: copies a personal file into a shared folder. The original
     * personal file/row is left untouched — sharing is copy, not move.
     * Re-validates the quota check (the caller is responsible for gating
     * the "Share to Folder" action on the target folder's write permission
     * via usePermissions before calling this).
     * @param {object} file - file_metadata row (from this.files/personalOnlyFiles)
     * @param {string} folderId - one of SHARED_FOLDERS[].id
     */
    async shareToFolder(file, folderId) {
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

      const quotaBytes = getUserStorageQuota(
        authStore.userRoles,
        authStore.userStorageQuotaOverride,
      );
      if (quotaBytes !== -1 && this.usageBytes + (file.size || 0) > quotaBytes) {
        errorHandler.notifyError('Storage quota exceeded — file was not shared.');
        return;
      }

      try {
        const downloadUrl = storage.getFileDownload({ bucketId: BUCKET_ID, fileId: file.file_id });
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error('Could not fetch the original file for sharing.');
        }
        const blob = await response.blob();
        const sharedFile = new File([blob], file.name, { type: file.mime_type || blob.type });

        const { createUpload } = useFileUpload();
        const { promise } = createUpload(SHARED_BUCKET_ID, sharedFile, {
          userId,
          currentUsageBytes: this.usageBytes,
          quotaBytes,
          permissions: getSharedFolderPermissions(folderId, 'file'),
        });

        const uploadedFile = await promise;
        if (!uploadedFile) {
          // Upload failed or was blocked; useFileUpload already notified.
          return;
        }

        try {
          const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
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
              mime_type: file.mime_type || '',
              folder_path: '/',
              shared_folder: folderId,
              uploaded_at: now,
              updated_at: now,
            },
            permissions: getSharedFolderPermissions(folderId, 'row'),
          });
          this.files.unshift(metadataRow);
          this.usageBytes += file.size || 0;
          errorHandler.notifySuccess(`Shared "${file.name}" to ${folder.label}.`);
        } catch (error) {
          try {
            await storage.deleteFile({ bucketId: SHARED_BUCKET_ID, fileId: uploadedFile.$id });
          } catch {
            // Best-effort cleanup; ignore secondary failure.
          }
          errorHandler.notifyError(error.message || `Failed to share "${file.name}".`);
        }
      } catch (error) {
        errorHandler.notifyError(error.message || `Failed to share "${file.name}".`);
      }
    },

    /**
     * Renames a file's metadata row and its underlying Storage file.
     * Blocked when another file in the same folder already has that name.
     * @param {string} fileId - file_metadata row $id
     * @param {string} newName
     */
    async renameFile(fileId, newName) {
      const file = this.files.find((f) => f.$id === fileId);
      if (!file) {
        return;
      }

      const trimmedName = (newName || '').trim();
      if (!trimmedName) {
        errorHandler.notifyError('File name cannot be empty.');
        return;
      }

      const duplicate = this.files.some(
        (f) =>
          f.$id !== fileId &&
          f.folder_path === file.folder_path &&
          (f.name || '').toLowerCase() === trimmedName.toLowerCase(),
      );
      if (duplicate) {
        errorHandler.notifyError(`A file named "${trimmedName}" already exists in this folder.`);
        return;
      }

      const oldName = file.name;
      try {
        // Rename the underlying Storage file first so the metadata stays
        // consistent if the Storage call fails.
        await storage.updateFile({
          bucketId: file.bucket_id,
          fileId: file.file_id,
          name: trimmedName,
        });

        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const now = new Date().toISOString();
        const updatedRow = await tables.updateRow({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          rowId: fileId,
          data: { name: trimmedName, updated_at: now },
        });

        const index = this.files.findIndex((f) => f.$id === fileId);
        if (index !== -1) {
          this.files.splice(index, 1, updatedRow);
        }
        errorHandler.notifySuccess('File renamed.');
      } catch (error) {
        // Try to revert the Storage rename if the metadata update failed.
        try {
          await storage.updateFile({
            bucketId: file.bucket_id,
            fileId: file.file_id,
            name: oldName,
          });
        } catch {
          // Best-effort revert; ignore secondary failure.
        }
        errorHandler.notifyError(error.message || 'Failed to rename file.');
      }
    },

    /**
     * Moves a file to a new folder path within the personal root.
     * Paths must start with "/" and may not target a shared-folder prefix
     * (shared folders are Story 5.4).
     * @param {string} fileId - file_metadata row $id
     * @param {string} newFolderPath
     */
    async moveFile(fileId, newFolderPath) {
      const file = this.files.find((f) => f.$id === fileId);
      if (!file) {
        return;
      }

      if (!isPersonalFolderPath(newFolderPath)) {
        return;
      }

      try {
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        const now = new Date().toISOString();
        const updatedRow = await tables.updateRow({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          rowId: fileId,
          data: { folder_path: newFolderPath, updated_at: now },
        });

        const index = this.files.findIndex((f) => f.$id === fileId);
        if (index !== -1) {
          this.files.splice(index, 1, updatedRow);
        }
        errorHandler.notifySuccess('File moved.');
      } catch (error) {
        errorHandler.notifyError(error.message || 'Failed to move file.');
      }
    },

    /**
     * Deletes a file from Storage and removes its metadata row, then
     * recalculates usage. Caller is responsible for confirmation dialogs.
     * @param {string} fileId - file_metadata row $id
     */
    async deleteFile(fileId) {
      const file = this.files.find((f) => f.$id === fileId);
      if (!file) {
        return;
      }

      try {
        // Delete the metadata row first so usage and the file list stay
        // consistent even if the underlying Storage delete fails.
        const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
        await tables.deleteRow({
          databaseId: dbId,
          tableId: FILE_METADATA_TABLE_ID,
          rowId: fileId,
        });

        this.files = this.files.filter((f) => f.$id !== fileId);
        this.usageBytes = this.files.reduce((sum, f) => sum + (f.size || 0), 0);

        await storage.deleteFile({ bucketId: file.bucket_id, fileId: file.file_id });
        errorHandler.notifySuccess(`Deleted "${file.name}".`);
      } catch (error) {
        errorHandler.notifyError(error.message || `Failed to delete "${file.name}".`);
      }
    },

    /**
     * Returns a download URL for the file, or null if it cannot be generated.
     * @param {string} fileId - file_metadata row $id
     * @returns {string|null}
     */
    getDownloadUrl(fileId) {
      const file = this.files.find((f) => f.$id === fileId);
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
