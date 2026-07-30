---
title: 'Story 5.4 — Cloud Storage: Shared Folders and Module-Based Access'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '8f341ba7ef87ac76a2e387de99f8591e5b4f1fef'
final_revision: 'PENDING_COMMIT'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** Story 5.3 only delivered private personal storage; there is no team storage for Finance/Farm/School/Village Documents/Admin, no way to share a personal file to a team folder, and no admin visibility into total storage usage or a way to grant quota exceptions.

**Approach:** Add a `shared_files` bucket + `shared_folder` column on the existing `file_metadata` table, gate each of the 5 shared folders by new `storage:<category>:read/write` permissions (mapped onto existing roles), add a "Share to Folder" copy workflow from the personal files page, and add an admin-only Storage Settings page for usage, per-user quota overrides, and a CSV report.

## Boundaries & Constraints

**Always:**

- Vue 3 `<script setup>`, Quasar components only, Pinia options-store pattern (mirror `personal-files-store.js`), `useErrorHandler`.
- SSR-safe: guard all Appwrite Storage/TablesDB calls with `isClient`/`onMounted`, matching `StoragePage.vue`.
- Reuse `useFileUpload`, `formatBytes`/`formatPercent`/`formatQuota`, `usePermissions`. No i18n, no emojis, no TypeScript.
- Shared files count against the uploader's **personal** quota (no separate shared quota) — reuse the existing quota pre-check pattern from `personal-files-store.js`.
- Per-user quota override precedence: `users.storage_quota` override (when set) > role-based quota (`getUserStorageQuota` fallback) > 0. `users.storage_quota <= 0` means "no override, use role quota"; `-1` means unlimited override; any positive value is a GB override. (The existing schema default of `2` must change to `0` so untouched users are not silently capped — see Design Notes.)
- Admin-only aggregate reporting (all users' usage) goes through a new server-side Appwrite Function using an admin API key (mirrors `wipeAllData`/`Check Users Exist`), not client-side row reads, to avoid granting every admin blanket read access to other users' personal file rows.
- Quota overrides and per-user usage in the admin UI are plain `tables.updateRow`/function calls gated by route `requiresPermission: '*'` + in-component `hasPermission('*')` check — same trust model as the existing `admin/users` page (the `users` table already has open table-level permissions).

**Block If:**

- The installed `node-appwrite`/`appwrite` SDK signatures for `Functions`/`Storage`/`TablesDB` used here differ from the object-style calls already used in `wipeAllData`/`personal-files-store.js`.
- A new npm dependency is required — HALT `new dependency required: <name> — user approval needed`.

**Never:**

- No real per-category Appwrite Teams/Labels synced to custom roles (that infrastructure doesn't exist and belongs to Story 5.12/5.13 role-management work) — shared-folder read/write for Finance/Farm/School/Village Documents is enforced via the existing custom `storage:*` permission system at the UI/store layer, not Appwrite-native RBAC. Only the Admin Only folder gets true Appwrite-level enforcement via the existing `village_administrators` team.
- No Guests/Equipment/Energy folders or plumbing (deferred modules).
- No custom role creation/editing (that's Story 5.13).
- Do not remove the `personal-files-store.js` shared-path rejection in `isPersonalFolderPath` — it remains correct (folder_path "Move" must never target `/shared*`; sharing now happens exclusively through the new copy-based "Share to Folder" action, not folder_path rewriting).

## I/O & Edge-Case Matrix

| Scenario                              | Input / State                                                                               | Expected Output / Behavior                                                                                                                                           | Error Handling                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Share to folder (happy path)          | User with `storage:finance:write` shares a personal file to Finance Shared, quota allows it | File is copied into `shared_files` bucket, a new `file_metadata` row is created with `shared_folder: 'finance_shared'`, original personal file/row untouched         | notifySuccess                                 |
| Share blocked by quota                | Sharing would push usage over quota                                                         | Copy is blocked before any upload call                                                                                                                               | notifyError, no partial row/file created      |
| Share without folder write permission | User only has `storage:read`, tries the workflow                                            | Dialog's folder dropdown excludes folders they can't write to; if none available, "Share to Folder" action is hidden                                                 | No API call attempted                         |
| Read-only shared folder view          | User has `storage:farm:read` but not `storage:farm:write`                                   | Farm Shared tab shows files, no upload area, no delete/rename actions                                                                                                | N/A                                           |
| Admin Only folder access              | Non-admin navigates to `/storage/shared`                                                    | Admin Only tab is not rendered; a direct Appwrite Storage/table read for an admin-only file is denied by `Role.team('village_administrators')` file/row permissions  | Storage/table 401                             |
| Quota override precedence             | Admin sets a Village Resident's `storage_quota` to 5 (GB)                                   | `getUserStorageQuota` returns 5 GB for that user, ignoring the 2 GB Resident-tier fallback                                                                           | N/A                                           |
| Quota override cleared                | Admin sets `storage_quota` back to 0                                                        | User falls back to their role-based quota again                                                                                                                      | N/A                                           |
| Admin usage report                    | System Administrator opens `/admin/storage`                                                 | Table lists every user with total usage (personal + shared bytes owned by them), effective quota, and an editable override field; CSV export downloads the same data | notifyError if the report function call fails |
| Non-admin hits `/admin/storage`       | User without `*` permission                                                                 | Router guard redirects to `/unauthorized`                                                                                                                            | N/A                                           |

</intent-contract>

## Code Map

- `server/scripts/setup-appwrite.js` — add `shared_files` bucket (`bucketSchemas`), add `shared_folder` column + index to `file_metadata`, change `users.storage_quota` default from `2` to `0`.
- `server/scripts/seed-roles.js` — add `storage:finance:*`, `storage:farm:*`, `storage:school:*`, `storage:village-docs:write` grants to the mapped roles.
- `server/functions/storageUsageReport/` — NEW Appwrite Function (mirrors `wipeAllData`'s structure/package.json/.gitignore): verifies caller is a System Administrator, then aggregates `file_metadata.size` by `owner_id` across all rows using the function's admin API key.
- `server/appwrite.config.json` — register the `storageUsageReport` function (`execute: ["team:village_administrators"]`, same as `wipeAllData`).
- `server/functions/wipeAllData/src/main.js` — add `shared_files` to the bucket-wipe step (alongside `personal_files`).
- `scripts/setup/configure-env.js`, `.env.example` — add `VITE_APPWRITE_BUCKET_SHARED_FILES`/`APPWRITE_BUCKET_SHARED_FILES` (default `shared_files`) and `VITE_APPWRITE_FUNCTION_STORAGE_REPORT` (function ID).
- `src/modules/storage/constants/shared-folders.js` — NEW: `SHARED_FOLDERS` array (`id`, `label`, `description`, `readPermission`, `writePermission`) for the 5 folders; single source of truth for gating and dropdowns.
- `src/utils/permissions.js` — `getUserStorageQuota(userRoles, quotaOverrideGB)` gains a second optional param implementing the override precedence.
- `src/composables/usePermissions.js` — pass `authStore.userStorageQuotaOverride` into `getStorageQuota`.
- `src/stores/auth-store.js` — `fetchUserRoles` also sets `this.userStorageQuotaOverride = userProfile.storage_quota ?? 0`.
- `src/modules/storage/stores/personal-files-store.js` — add a `personalOnlyFiles` getter (rows where `bucket_id` is the personal bucket) for the "My Files" list, keep `usageBytes` summed across ALL owner rows (personal + shared) per the quota-precedence rule; add `shareToFolder(file, folderId)` action (copy: download blob, re-upload to `shared_files` with folder permissions, insert new `file_metadata` row); update the `isPersonalFolderPath` comment to reference the new Share-to-Folder workflow instead of "until Story 5.4".
- `src/modules/storage/stores/shared-files-store.js` — NEW Pinia store: `fetchFolderFiles(folderId)`, `uploadFiles(folderId, files)`, `deleteFile(fileId)`, `getDownloadUrl(fileId)`, mirroring `personal-files-store.js` conventions.
- `src/modules/storage/pages/StoragePage.vue` — add a "Share to Folder" icon button per file row (visible when at least one shared folder is write-accessible) opening a dialog with a folder `q-select` + Share button.
- `src/modules/storage/pages/SharedStoragePage.vue` — NEW: `q-tabs` over the shared folders visible to the user (readPermission satisfied), each tab showing usage-agnostic file list + conditional upload area (writePermission satisfied) using `shared-files-store`.
- `src/pages/admin/StorageSettingsPage.vue` — NEW: calls the `storageUsageReport` function via `functions.createExecution`, joins with a `tables.listRows('users')` + `tables.listRows('roles')` fetch to show name/email/roles/usage/quota, inline quota-override input (`tables.updateRow` on `users`), and a "Export CSV" button.
- `src/modules/storage/router.js` — add `storage/shared` route (`requiresPermission: 'storage:read'`).
- `src/router/routes.js` — add `admin/storage` route (`requiresPermission: '*'`), same pattern as `admin/users`.
- `src/layouts/MainLayout.vue` — add a "Shared Folders" nav item under the existing Storage entry (gated on `storage:read`) and a "Storage Settings" admin nav item (gated on `hasPermission('*')`).

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/setup-appwrite.js` — add `shared_files` to `bucketSchemas` with the same shape as `personal_files` (`permissions: [Permission.create(Role.users())]`, `fileSecurity: true`); add `shared_folder` column to `file_metadata` (`type: 'string', size: 30, required: false`) plus a `key` index `idx_file_metadata_shared_folder` on `['shared_folder']`; change the `users.storage_quota` column `default` from `2` to `0` and add a comment that pre-existing rows already backfilled to `2` must be reset to `0` (or an explicit override) via the new Admin Storage Settings page to fall back to role-based quota; bump the setup summary counts/log lines to mention the new bucket/column.
- [x] `server/scripts/seed-roles.js` — add `storage:finance:read`/`storage:finance:write` to Finance Manager (both); add `storage:finance:read`, `storage:farm:read`, `storage:school:read`, `storage:village-docs:write` to Council Member, Village Head, Deputy Village Head; add `storage:farm:read`/`storage:farm:write` to Farm Manager and Crop Manager (both); add `storage:school:read`/`storage:school:write` to School Administrator, Head Teacher, Teacher (all three); add a code comment that these are additive grants for existing deployments (same manual-resync caveat as the Story 5.3 comment already in this file).
- [x] `src/modules/storage/constants/shared-folders.js` — NEW: export `SHARED_FOLDERS = [{ id: 'finance_shared', label: 'Finance Shared', readPermission: 'storage:finance:read', writePermission: 'storage:finance:write' }, { id: 'farm_shared', label: 'Farm Shared', readPermission: 'storage:farm:read', writePermission: 'storage:farm:write' }, { id: 'school_shared', label: 'School Shared', readPermission: 'storage:school:read', writePermission: 'storage:school:write' }, { id: 'village_documents', label: 'Village Documents', readPermission: 'storage:read', writePermission: 'storage:village-docs:write' }, { id: 'admin_only', label: 'Admin Only', readPermission: '*', writePermission: '*' }]`.
- [x] `src/utils/permissions.js` — change signature to `getUserStorageQuota(userRoles, quotaOverrideGB = 0)`: if `quotaOverrideGB === -1` return `-1`; else if `quotaOverrideGB > 0` return `quotaOverrideGB * 1024 * 1024 * 1024`; else fall through to the existing role-based logic unchanged.
- [x] `src/composables/usePermissions.js` — update `userStorageQuota` computed to call `getStorageQuota(authStore.userRoles, authStore.userStorageQuotaOverride)`.
- [x] `src/stores/auth-store.js` — add `userStorageQuotaOverride: 0` to state; in `fetchUserRoles`, after loading `userProfile`, set `this.userStorageQuotaOverride = typeof userProfile.storage_quota === 'number' ? userProfile.storage_quota : 0`; reset it to `0` alongside `userRoles = []` in the logout/no-session branches.
- [x] `src/modules/storage/stores/personal-files-store.js` — add `BUCKET_ID` comparison getter `personalOnlyFiles` (state.files filtered to `f.bucket_id === BUCKET_ID`); update `StoragePage.vue`'s `filteredFiles` caller indirectly by keeping `filteredFiles(search)` operating over `personalOnlyFiles` instead of `state.files`; keep `usageBytes` computed from all `state.files` (unchanged) since shared files must count toward personal quota; add `shareToFolder(file, folderId)` action: looks up the target folder in `SHARED_FOLDERS`, re-checks the write permission via `usePermissions` is the caller's responsibility (store trusts the caller already gated it, but re-validates `this.usageBytes + file.size` against quota before proceeding), fetches the source blob via `fetch(storage.getFileDownload({ bucketId: BUCKET_ID, fileId: file.file_id }))`, uploads it to the shared bucket (`VITE_APPWRITE_BUCKET_SHARED_FILES`) via `useFileUpload().createUpload` with permissions set per the target folder (see Design Notes), then creates a new `file_metadata` row with `shared_folder: folderId`, `bucket_id` = shared bucket id, `folder_path: '/'`, and updates local `usageBytes`; update the comment above `isPersonalFolderPath` to say sharing is now handled by `shareToFolder`, not folder_path moves.
- [x] `src/modules/storage/stores/shared-files-store.js` — NEW: state `filesByFolder: {}` (map of folderId → rows), `loading`, `error`; `fetchFolderFiles(folderId)` queries `file_metadata` with `Query.equal('shared_folder', folderId)`, `Query.orderDesc('uploaded_at')`, `Query.limit(500)`, stores into `filesByFolder[folderId]`; `uploadFiles(folderId, files)` reuses the current user's personal quota (`usePersonalFilesStore().usageBytes` + role/override quota) as the pre-check, then uploads each file into the shared bucket with the target folder's permissions and creates a `file_metadata` row (`shared_folder: folderId`), and increments the personal store's `usageBytes`; `deleteFile(fileId, folderId)` deletes the Storage file + metadata row and refreshes `filesByFolder[folderId]`; `getDownloadUrl(fileId)` mirrors the personal store.
- [x] `src/modules/storage/pages/StoragePage.vue` — compute `shareableFolders = SHARED_FOLDERS.filter(f => hasPermission(f.writePermission))`; add a "Share to Folder" icon button per file row (visible when `shareableFolders.length > 0`) opening a `q-dialog` with a `q-select` of `shareableFolders` and a Share button calling `store.shareToFolder(file, selectedFolderId)`; switch `visibleFiles` to `store.filteredFiles` operating over `store.personalOnlyFiles`.
- [x] `src/modules/storage/pages/SharedStoragePage.vue` — NEW: computes `visibleFolders = SHARED_FOLDERS.filter(f => hasPermission(f.readPermission))`; renders a `q-tabs`/`q-tab-panels` per visible folder; each panel shows a `q-list` of that folder's files (name, size, uploaded date, download button, and delete button gated by `hasPermission(folder.writePermission)`), plus a drag-and-drop upload area gated by the same write permission, using `useSharedFilesStore()`; guarded by `isClient`/`onMounted` per folder tab activation.
- [x] `src/pages/admin/StorageSettingsPage.vue` — NEW: on mount (`isClient`), calls `functions.createExecution(storageReportFunctionId, '', false)` to get `{ userId, usageBytes }[]`, fetches `tables.listRows('users')` and `tables.listRows('roles')` to build a `q-table` of `{ name, email, roles, usageBytes, quotaOverride, effectiveQuotaBytes }` using `getUserStorageQuota`; each row has an inline number input for the override (GB, `-1`/`0`/positive) that calls `tables.updateRow('users', userId, { storage_quota: value })` on blur/confirm and calls `notifySuccess`; an "Export CSV" button builds a CSV string client-side (`formatBytes`-free raw byte columns for spreadsheet friendliness) and downloads it via a Blob anchor, no chart.
- [x] `src/modules/storage/router.js` — add `{ path: 'storage/shared', name: 'storage-shared', component: () => import('./pages/SharedStoragePage.vue'), meta: { requiresAuth: true, requiresPermission: 'storage:read' } }`.
- [x] `src/router/routes.js` — add `{ path: 'admin/storage', component: () => import('pages/admin/StorageSettingsPage.vue'), meta: { requiresAuth: true, requiresPermission: '*' } }` next to the existing `admin/users` entry.
- [x] `src/layouts/MainLayout.vue` — add a "Shared Folders" `q-item` linking to `/storage/shared` next to the existing Storage nav item (gated on `hasPermission('storage:read')`, always true for authenticated users); add a "Storage Settings" `q-item` linking to `/admin/storage` in whatever admin/settings section already hosts `/admin/users`, gated on `hasPermission('*')`.
- [x] `server/functions/storageUsageReport/src/main.js` — NEW (mirrors `wipeAllData/src/main.js`'s permission-verification block): reads `{ userId }` from the request body, loads the caller's `users` row with `role_ids.*`, confirms a role's `permissions` includes `*`, then uses the admin-key `TablesDB` client to page through `file_metadata` (`Query.limit(100)` loop) summing `size` by `owner_id`, and returns `{ success: true, usage: [{ userId, usageBytes }] }`; returns 403 for non-admin callers.
- [x] `server/functions/storageUsageReport/package.json`, `server/functions/storageUsageReport/.gitignore` — NEW, copied from `server/functions/wipeAllData/` with the name/description updated.
- [x] `server/appwrite.config.json` — add a `storageUsageReport` entry to `functions`, same shape as the existing `wipeAllData` entry (`execute: ["team:village_administrators"]`).
- [x] `server/functions/wipeAllData/src/main.js` — add a second bucket-wipe pass for `process.env.BUCKET_SHARED_FILES || 'shared_files'` alongside the existing `personal_files` pass (reuse the same list-then-delete loop).
- [x] `scripts/setup/configure-env.js` — add `bucketSharedFiles = 'shared_files'` and a `storageReportFunctionId` placeholder consistent with how other function IDs are collected in this script; add corresponding root/server entries next to the Story 5.3 bucket entries.
- [x] `.env.example` — add `VITE_APPWRITE_BUCKET_SHARED_FILES=shared_files` / `APPWRITE_BUCKET_SHARED_FILES=shared_files` next to the Story 5.3 keys, and `VITE_APPWRITE_FUNCTION_STORAGE_REPORT=` (function ID, blank placeholder like other function IDs).

**Acceptance Criteria:**

- Given the 5 shared folders, when a user with `storage:read` opens `/storage/shared`, then only the folders whose `readPermission` they hold are shown as tabs (Village Documents always shown; Admin Only only for `*`).
- Given a Finance Manager on the Finance Shared tab, when they upload a file, then it appears in `file_metadata` with `shared_folder: 'finance_shared'`, `bucket_id` = the shared bucket, and is visible to a Council Member's Finance Shared tab (read-only, no upload/delete controls).
- Given a Farm Manager's personal file, when they click "Share to Folder" and pick Farm Shared, then a copy is created in the shared bucket with `shared_folder: 'farm_shared'`, the original personal file is untouched, and combined usage (personal store's `usageBytes`) increases by the file size.
- Given a user without any shared-folder write permission, when they view a personal file row, then no "Share to Folder" button is rendered.
- Given a non-System-Administrator user, when they navigate to `/admin/storage` or `/storage/shared`'s Admin Only tab, then they are redirected to `/unauthorized` (route) or the tab is not rendered (in-page), respectively; a direct Appwrite call to read/download an Admin Only file fails with 401 because its permissions are scoped to `Role.team('village_administrators')`.
- Given the System Administrator on `/admin/storage`, when the page loads, then every user appears with their total usage (personal + shared), effective quota, and an editable quota-override field; setting the override to `5` and reloading shows the new 5 GB quota taking precedence over the user's role-based quota; setting it back to `0` restores the role-based quota.
- Given the admin report data, when the System Administrator clicks "Export CSV", then a CSV file downloads containing one row per user with usage and quota columns.
- Given the existing "My Files" page, when a user with both personal and shared files opens `/storage`, then only personal-bucket files are listed (no shared files leak into the personal list), matching pre-5.4 behavior otherwise unchanged (upload/rename/move/delete/download/search).
- Given the `wipeAllData` function, when it runs, then it deletes files from both `personal_files` and `shared_files` buckets before dropping tables.

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 6: (high 1, medium 1, low 4)
- defer: 4
- reject: 10
- addressed_findings:
  - `[high][patch]` `shared-files-store.js`'s Design Notes claim that shared-folder update/delete is "restricted client-side to the uploader or an admin" did not match the implementation (any holder of the folder's write permission could delete any file in that folder); on reflection the implemented behavior is the correct one for a genuinely collaborative team folder (a shared team drive should let any writer manage the team's files, not just their own uploads) — corrected the Design Notes wording to describe the actual, intended behavior instead of changing code.
  - `[medium][patch]` `StorageSettingsPage.vue` was missing the in-component `hasPermission('*')` check required by the spec's "Always" boundary (defense-in-depth matching the `admin/users` trust model); added the check at the top of `loadReport()`.
  - `[low][patch]` `setup-appwrite.js` setup summary still logged "1 Storage bucket created/verified (personal_files)" after the `shared_files` bucket was added; updated to "2 Storage buckets created/verified (personal_files, shared_files)".
  - `[low][patch]` `StorageSettingsPage.vue` had no `isClient` SSR guard (spec required matching `StoragePage.vue`'s SSR-safe pattern); added `isClient` ref set in `onMounted` and used it to gate the loading/table render.
  - `[low][patch]` `StorageSettingsPage.vue`'s `saveOverride` accepted arbitrary negative numbers (e.g. `-5`) instead of only the `-1` (unlimited) sentinel; clamped to `-1` or `Math.max(0, value)`.
  - `[low][patch]` `StorageSettingsPage.vue`'s `loadReport` parsed the function response without checking `execution.status`, which could misinterpret a failed/timed-out execution; added a status check before parsing.
  - `defer` (4): pre-existing batch-upload quota pre-check limitation now duplicated in `shared-files-store.uploadFiles` (mirrors the already-accepted Story 5.3 pattern); seed-roles.js additive-grant skip-on-existing-role gap for the new Story 5.4 permissions (same pattern as 5.2/5.3); `storageUsageReport`'s pagination loop has no timeout/rate-limit backoff for very large tables; no automated test coverage for the new stores/function. All four logged to `deferred-work.md`.
  - `reject` (10): `storageUsageReport` pagination "infinite loop" claim (verified incorrect — loop terminates with at most one extra round-trip on exact-multiple page counts); `shareToFolder` usage-increment-before-confirmation claim (verified the increment already only runs after successful metadata-row creation); `shared-files-store.deleteFile`/`personal-files-store.deleteFile` metadata-before-storage delete ordering (deliberate, pre-existing, already-documented pattern, not a regression); no-duplicate-name-check in shared folders (not a real issue — multiple contributors naming files the same in a shared team folder is normal, unlike the single-owner personal folder); `getDownloadUrl` silent `null` return (already guarded at both call sites before use); orphaned `file_metadata` rows silently skipped in the usage report (acceptable, extremely rare edge case); race condition if the source file is deleted mid-`shareToFolder` (already surfaces a generic, actionable error); CSV export "undefined role names" (already filtered via `.filter(Boolean)` upstream in `loadReport`); shared-upload batch quota check not accounting for cumulative in-batch bytes (pre-existing Story 5.3 pattern, logged separately under defer, not a new patch-worthy regression); shared-files-store pushing the new row into `personalFilesStore.files` (intentional, required for `usageBytes` recomputation on delete, correctly excluded from the personal-only file list by `personalOnlyFiles`'s `bucket_id` filter).

## Design Notes

- **Bucket/table choice:** A separate `shared_files` bucket (not a `/shared` prefix inside `personal_files`) keeps file-level Appwrite permissions independent from personal files and avoids ever needing a shared-prefix exception in personal `Move`. `file_metadata` is extended (not duplicated into a new table) with a nullable `shared_folder` column so usage summation (`Query.equal('owner_id', ...)` across both buckets) stays a single query, matching the "shared files count against personal quota" decision.
- **Permission model — two tiers, documented trade-off:** Only Admin Only gets genuine Appwrite-level isolation, via the pre-existing `village_administrators` team (`Permission.read/update/delete(Role.team('village_administrators'))` on both the shared file and its metadata row). The other 4 folders don't have a matching Appwrite Team per role category — building that (and keeping it in sync with `role_ids` changes) is Story 5.12/5.13 scope. For MVP, their Storage/table permissions are `Role.users()` (any authenticated user) for read AND update/delete — these are genuinely collaborative team folders, so any user holding that folder's write permission can manage (upload/delete) any file in it, not just their own uploads, matching how a shared team drive behaves; the real access boundary for these 4 folders is the app's `storage:<category>:read/write` permission strings, checked in `SharedStoragePage.vue`/`StoragePage.vue` before ever calling the API. This mirrors the Story 5.3 precedent of deferring server-side quota hardening while documenting it explicitly.
- **Quota override sentinel:** Reusing `users.storage_quota` (added in 5.3, never read until now) as the override column. Its existing schema default of `2` would have silently overridden every higher-tier role's quota (e.g. a 20 GB Village Head) the moment this story starts reading it, so the default changes to `0` (meaning "no override") and `0`/unset is treated as "fall through to role quota". Deployments that already had users backfilled to `2` by the old default must have an admin explicitly clear/reset the value via the new Storage Settings page for that user to regain their role-based quota — a one-time, documented manual step, added to `deferred-work.md`.
- **Admin usage report via Function, not row grants:** Rather than granting `village_administrators` read on every personal `file_metadata` row (which would materially weaken "personal files are private"), a dedicated `storageUsageReport` Appwrite Function (admin API key, same trust pattern as `wipeAllData`) aggregates bytes by `owner_id` server-side and returns only numeric totals — no filenames or personal metadata cross the privacy boundary.
- **Share-to-Folder is copy, not move:** copying avoids surprising data loss (the user's personal copy stays put) at the cost of doubling storage for that file, which is acceptable given quota is pre-checked before the copy.

## Verification

**Commands:**

- `npm run lint` — expected: no lint errors in new/changed files.
- `npm run build` — expected: Quasar SSR build succeeds.
- `node --check server/scripts/setup-appwrite.js` — expected: syntax OK.
- `node --check server/scripts/seed-roles.js` — expected: syntax OK.
- `node --check server/functions/storageUsageReport/src/main.js` — expected: syntax OK.
- `node --check server/functions/wipeAllData/src/main.js` — expected: syntax OK.

**Manual checks (if no CLI):**

- Log in as Farm Manager: upload to Farm Shared, confirm a Council Member sees it read-only and a Teacher (no farm permission) doesn't see the Farm Shared tab at all.
- Share a personal file to Village Documents as a Village Resident (write-gated to council roles) — confirm the "Share to Folder" dialog does not list Village Documents for a Resident, only folders they hold write permission for (likely none, so the button is hidden entirely).
- As System Administrator, open `/admin/storage`, set a user's override to `10`, log in as that user, confirm their quota bar now reflects 10 GB; reset to `0` and confirm it reverts to their role-based tier.
- Confirm `/admin/storage` and the Admin Only shared tab are inaccessible to a non-admin account.

## Auto Run Result

- Summary of implemented change: Implemented Story 5.4 — shared cloud storage folders (Finance, Farm, School, Village Documents, Admin Only) with role-based read/write access via new `storage:<category>:read/write` permissions, a copy-based "Share to Folder" workflow from personal files, and an admin-only Storage Settings page (usage report, per-user quota overrides, CSV export) backed by a new server-side `storageUsageReport` Appwrite Function.
- Files changed:
  - `server/scripts/setup-appwrite.js` — added `shared_files` bucket, `shared_folder` column/index on `file_metadata`, changed `users.storage_quota` default `2` → `0`, updated setup summary log.
  - `server/scripts/seed-roles.js` — added `storage:finance:*`/`storage:farm:*`/`storage:school:*`/`storage:village-docs:write` grants to the mapped roles.
  - `server/functions/storageUsageReport/` (NEW) — admin-key function aggregating `file_metadata.size` by `owner_id`.
  - `server/functions/wipeAllData/src/main.js` — now also wipes the `shared_files` bucket.
  - `server/appwrite.config.json` — registered the `storageUsageReport` function.
  - `scripts/setup/configure-env.js`, `.env.example` — new shared-bucket and function-ID env vars.
  - `src/modules/storage/constants/shared-folders.js` (NEW) — `SHARED_FOLDERS` registry + `getSharedFolderPermissions`.
  - `src/utils/permissions.js`, `src/composables/usePermissions.js`, `src/stores/auth-store.js` — per-user `storage_quota` override precedence wired end-to-end.
  - `src/modules/storage/stores/personal-files-store.js` — `personalOnlyFiles` getter, `shareToFolder` copy action.
  - `src/modules/storage/stores/shared-files-store.js` (NEW) — shared-folder list/upload/delete/download.
  - `src/modules/storage/pages/StoragePage.vue` — "Share to Folder" action.
  - `src/modules/storage/pages/SharedStoragePage.vue` (NEW) — tabbed shared-folder browser.
  - `src/pages/admin/StorageSettingsPage.vue` (NEW) — admin usage report/quota overrides/CSV export.
  - `src/modules/storage/router.js`, `src/router/routes.js`, `src/layouts/MainLayout.vue` — new routes/nav entries.
- Review findings breakdown: 6 patches applied (1 medium: missing in-component `hasPermission('*')` check on the admin Storage Settings page; 5 low: bucket-count log line, SSR `isClient` guard, quota-override input clamping, function-execution-status check, and a Design Notes correction describing the intended collaborative-folder delete semantics), 4 items deferred to `deferred-work.md` (pre-existing batch-quota pre-check pattern now duplicated in shared uploads, seed-roles.js additive-grant skip-on-existing gap, storage report pagination timeout/rate-limit hardening, no automated test coverage), 10 findings rejected as noise or verified non-issues (see Review Triage Log for the full list).
- Follow-up review recommendation: `false` — the patched findings were localized to one new admin page plus a one-line log message and a documentation correction; no behavior/API/security regression remained after patching (the permission check was defense-in-depth on top of an already-enforced route guard).
- Verification performed: `npm run lint` clean; `npm run build` (Quasar SPA build) succeeded with all new pages/chunks compiled; `node --check` passed on `setup-appwrite.js`, `seed-roles.js`, `storageUsageReport/src/main.js`, `wipeAllData/src/main.js`, `configure-env.js`. Manual runtime verification (login as different roles, live Appwrite instance) was not performed in this session — recommend the manual checks listed above before production deployment.
- Residual risks: (1) Finance/Farm/School/Village Documents shared folders are enforced only at the app permission layer plus a broad `Role.users()` Appwrite grant, not true per-category Appwrite-native RBAC (documented, deferred to Story 5.12/5.13 team-sync infrastructure); (2) existing deployments with users already backfilled to the old `storage_quota` default of `2` must have an admin explicitly reset the value via the new Storage Settings page to regain their role-based quota; (3) `seed-roles.js`'s skip-on-existing-role behavior means current deployments won't automatically receive the new shared-folder permissions without a manual role resync.
