import { Permission, Role } from 'appwrite';

/**
 * Shared Folders Registry (Story 5.4)
 *
 * Single source of truth for the 5 module-based shared folders: their ids
 * (used as file_metadata.shared_folder values), display labels/descriptions,
 * and the custom `storage:<category>:read/write` permission strings that
 * gate visibility (read) and upload/delete (write) for each folder.
 *
 * Only 'admin_only' maps to a real Appwrite-level boundary (the
 * village_administrators team); the other 4 folders rely entirely on the
 * app-level permission checks in SharedStoragePage.vue / StoragePage.vue
 * (see Story 5.4 spec Design Notes).
 */

export const SHARED_FOLDERS = [
  {
    id: 'finance_shared',
    label: 'Finance Shared',
    description: 'Budgets, receipts and financial records shared with council roles.',
    readPermission: 'storage:finance:read',
    writePermission: 'storage:finance:write',
  },
  {
    id: 'farm_shared',
    label: 'Farm Shared',
    description: 'Farm plans, harvest records and other farm-related documents.',
    readPermission: 'storage:farm:read',
    writePermission: 'storage:farm:write',
  },
  {
    id: 'school_shared',
    label: 'School Shared',
    description: 'School records, timetables and learner-related documents.',
    readPermission: 'storage:school:read',
    writePermission: 'storage:school:write',
  },
  {
    id: 'village_documents',
    label: 'Village Documents',
    description: 'General village documents visible to everyone; editable by council roles.',
    readPermission: 'storage:read',
    writePermission: 'storage:village-docs:write',
  },
  {
    id: 'admin_only',
    label: 'Admin Only',
    description: 'System Administrator-only documents.',
    readPermission: '*',
    writePermission: '*',
  },
];

/**
 * Returns the Storage file / file_metadata row permissions to use for a
 * shared-folder upload or share.
 *
 * Only 'admin_only' gets a true Appwrite-level boundary, scoped to the
 * existing village_administrators team. The other 4 folders don't have a
 * matching Appwrite Team per role category (that's Story 5.12/5.13 scope),
 * so their permissions are `Role.users()` (any authenticated user) — the
 * real access boundary for those folders is the app-level
 * `storage:<category>:read/write` permission check performed before this
 * function is ever called (see SharedStoragePage.vue / StoragePage.vue).
 *
 * @param {string} folderId - one of SHARED_FOLDERS[].id
 * @param {'file'|'row'} [target='file'] - 'file' uses a Storage-style write
 *   permission (createFile only accepts read/write/delete); 'row' uses a
 *   TablesDB-style update permission (matching personal-files-store.js).
 * @returns {string[]} Appwrite permission strings
 */
export function getSharedFolderPermissions(folderId, target = 'file') {
  const role = folderId === 'admin_only' ? Role.team('village_administrators') : Role.users();
  const writeOrUpdate = target === 'row' ? Permission.update(role) : Permission.write(role);

  return [Permission.read(role), writeOrUpdate, Permission.delete(role)];
}

export default SHARED_FOLDERS;
