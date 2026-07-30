/**
 * File Upload Composable (Story 5.3; extended Story 5.4)
 *
 * Thin wrapper around Appwrite Storage's createFile with:
 * - A client-side quota pre-check (no API call is made when it fails)
 * - A progress ref driven by the SDK's onProgress callback
 * - useErrorHandler notifications on failure
 * - An optional explicit `permissions` override (Story 5.4) so shared-folder
 *   uploads can use folder-specific permissions instead of the default
 *   userId-owner permissions used by personal uploads.
 *
 * This is the MVP quota enforcement point; server-side hardening is
 * explicitly deferred (see Story 5.3 spec Design Notes).
 */

import { ref } from 'vue';
import { ID, Permission, Role } from 'appwrite';
import { storage } from 'src/boot/appwrite';
import { useErrorHandler } from 'src/composables/useErrorHandler';

export function useFileUpload() {
  const { notifyError } = useErrorHandler();

  /**
   * Starts (or blocks) an upload for a single file.
   *
   * @param {string} bucketId - Storage bucket to upload into.
   * @param {File} file - The browser File object to upload.
   * @param {object} options
   * @param {string} options.userId - Appwrite user $id; used to grant per-file
   *   read/write/delete permissions to the file's owner (ignored when
   *   `options.permissions` is provided).
   * @param {number} options.currentUsageBytes - Usage already accounted for
   *   (e.g. earlier files in the same batch), before this file's size.
   * @param {number} options.quotaBytes - Role-based quota in bytes; -1 = unlimited.
   * @param {string[]} [options.permissions] - Story 5.4: explicit Storage
   *   permissions array (e.g. for shared-folder uploads with folder-specific
   *   permissions). When omitted, falls back to the userId-based owner
   *   read/write/delete permissions used by personal uploads.
   * @param {(progress: number) => void} [options.onProgress] - Optional callback fired
   *   with the upload progress fraction (0-1) as it changes.
   * @returns {{ promise: Promise<import('appwrite').Models.File|null>, progress: import('vue').Ref<number>, uploading: import('vue').Ref<boolean> }}
   */
  function createUpload(bucketId, file, options = {}) {
    const { userId, currentUsageBytes = 0, quotaBytes = 0, permissions, onProgress } = options;
    const progress = ref(0);
    const uploading = ref(false);

    const wouldExceedQuota = quotaBytes !== -1 && currentUsageBytes + file.size > quotaBytes;
    if (wouldExceedQuota) {
      notifyError(`Storage quota exceeded — "${file.name}" was not uploaded.`);
      return { promise: Promise.resolve(null), progress, uploading };
    }

    uploading.value = true;

    const promise = storage
      .createFile({
        bucketId,
        fileId: ID.unique(),
        file,
        permissions:
          permissions ||
          (userId
            ? [
                Permission.read(Role.user(userId)),
                Permission.write(Role.user(userId)),
                Permission.delete(Role.user(userId)),
              ]
            : undefined),
        onProgress: (event) => {
          if (event?.chunksTotal) {
            progress.value = event.chunksUploaded / event.chunksTotal;
            onProgress?.(progress.value);
          }
        },
      })
      .catch((error) => {
        notifyError(error?.message || `Failed to upload "${file.name}".`);
        return null;
      })
      .finally(() => {
        uploading.value = false;
      });

    return { promise, progress, uploading };
  }

  return { createUpload };
}
