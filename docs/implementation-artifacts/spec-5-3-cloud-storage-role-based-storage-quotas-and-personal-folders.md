---
title: 'Story 5.3 — Cloud Storage: Role-Based Storage Quotas and Personal Folders'
type: 'feature'
created: '2026-07-30'
status: 'done'
baseline_revision: '77a829597df620e56bdac06f69b5ae9d427ebbf3'
final_revision: '490c7276f5ec3a4d0a0ed4dd2114f0aa7ff15088'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/spec-5-2-village-calendar-role-based-event-creation-and-editing.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** There is no place for a village user to store personal files, no enforcement of role-based storage quotas, and the storage usage bar in the drawer is a hardcoded 35% placeholder.

**Approach:** Introduce Appwrite Storage buckets and a `file_metadata` metadata table to power a private `/storage` page. Wire the existing `userStorageQuota` capability into client-side quota checks, real usage display, and file operations.

## Boundaries & Constraints

**Always:**

- Vue 3 `<script setup>`, Quasar components only, Pinia options-store pattern, `useErrorHandler`, `storage`/`tables`/`ID`/`Query`/`Permission`/`Role` from `src/boot/appwrite` / `appwrite`.
- Store dates as ISO 8601; use `src/utils/dateUtils.js` and `settingsStore.timezone` only when displaying.
- SSR-safe: all Appwrite Storage/TablesDB calls happen only inside client-guarded `onMounted` or `isClient` checks.
- RBAC gates use `hasPermission('storage:read')` / `hasPermission('storage:write')` from `usePermissions`; route `/storage` requires `storage:read`.
- All UI strings are hardcoded English (i18n deferred); no emojis.

**Block If:**

- A new npm dependency is required (e.g., a dedicated upload library) — HALT `new dependency required: <name> — user approval needed`.
- The installed Appwrite SDK signature for `storage.createFile`/`createBucket` is incompatible with object-style parameters.

**Never:**

- No shared folders, admin usage reports, per-user quota overrides, or public links — those belong to Story 5.4.
- No server-side quota enforcement function — deferred to post-MVP (client-side check is the MVP approach).
- No i18n/vue-i18n setup.
- No TypeScript.

## I/O & Edge-Case Matrix

| Scenario          | Input / State                                       | Expected Output / Behavior                                                    | Error Handling                                        |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Happy path upload | Authenticated user with quota, valid files selected | Files uploaded to personal bucket, metadata rows created, usage bar updates   | notifySuccess on each file                            |
| Quota exceeded    | Existing usage + new file size > role quota         | Upload blocked before any API call, clear "quota exceeded" message            | notifyError, file not uploaded                        |
| Zero-byte file    | File with size 0                                    | Allowed if within quota; metadata row created                                 | None                                                  |
| Drag-and-drop     | Files dropped onto drop zone                        | Files appear in the upload queue                                              | Visual drop indicator                                 |
| Multi-file batch  | 5 files selected, combined size within quota        | Each uploaded sequentially with per-file progress                             | First failure stops batch, earlier files kept         |
| Rename            | New unique name in same folder                      | Metadata name updated; storage file name also updated                         | Duplicate name in folder blocked                      |
| Move              | New folder path under personal root (e.g. `/Docs`)  | `folder_path` updated; file stays in same bucket                              | Paths outside personal root or shared folders blocked |
| Delete            | User confirms delete                                | File deleted from Storage bucket and metadata row removed; usage recalculated | notifyError on failure                                |
| Download          | User clicks download                                | `storage.getFileDownload` URL opened in a new tab                             | notifyError if URL cannot be generated                |
| Search            | Text typed in search box                            | File list filters client-side by name                                         | Empty state when no match                             |
| SSR               | Server-side render of `/storage`                    | No Appwrite calls; page renders empty/loading                                 | None                                                  |

</intent-contract>

## Code Map

- `src/utils/permissions.js` — `ROLE_QUOTA_FALLBACK` map and `getUserStorageQuota` must match the Story 5.3 quota tiers.
- `server/scripts/seed-roles.js` — role `storage_quota` values and new `storage:read`/`storage:write` grants.
- `server/scripts/setup-appwrite.js` — new `file_metadata` table schema and `personal_files` bucket creation (per-user file permissions).
- `scripts/setup/configure-env.js` and `.env.example` — new env keys for the bucket and metadata table.
- `src/router/routes.js` — register `src/modules/storage/router.js`.
- `src/modules/storage/router.js` — `/storage` route guarded by `requiresAuth` + `storage:read`.
- `src/composables/useFileUpload.js` — NEW: Appwrite Storage upload wrapper with progress callback and quota pre-check.
- `src/modules/storage/stores/personal-files-store.js` — NEW: Pinia store for listing, uploading, renaming, moving, deleting, searching personal files and usage.
- `src/modules/storage/pages/StoragePage.vue` — NEW: usage banner, drag-and-drop upload, file list, search, action dialogs.
- `src/modules/storage/utils/format-storage.js` — NEW: byte/percent formatting helpers.
- `src/layouts/MainLayout.vue` — replace hardcoded drawer usage bar with real data from `personal-files-store`.
- `src/pages/profile/ProfilePage.vue` — wire the real usage value to keep the quota display consistent.

## Tasks & Acceptance

**Execution:**

- [x] `src/utils/permissions.js` — update `ROLE_QUOTA_FALLBACK` to match Story 5.3 AC1: System Administrator -1 (unlimited), Village Head 20, Deputy Village Head 10, Finance Manager 10, Farm Manager 10, Head Teacher 10, Crop Manager 2, Village Resident 2, Learner 1, Guest 0.5; other roles (School Administrator, Council Member, Teacher, Events Coordinator) default to 2 GB (Resident-tier).
- [x] `server/scripts/seed-roles.js` — update `storage_quota` values to match AC1 exactly; add `storage:read` and `storage:write` to every role (including Learner/Guest, since quota, not permission, gates upload). Add a comment that existing deployments must re-sync role rows because the seeder skips existing roles.
- [x] `server/scripts/setup-appwrite.js` — import `Storage`, `Permission`, `Role`; add `file_metadata` table with columns `file_id` (string 50), `owner_id` (string 50, key index), `bucket_id` (string 50), `name` (string 255), `size` (integer), `mime_type` (string 100), `folder_path` (string 500, default `/`), `uploaded_at` (datetime), `updated_at` (datetime); fulltext index `idx_file_metadata_name` on `name`; add a `createBuckets` helper and create `personal_files` bucket with `fileSecurity: true` and empty bucket-level permissions after tables are created; update summary counts.
- [x] `server/scripts/setup-appwrite.js` — change `roles` table `storage_quota` integer `min` from `0` to `-1` so `-1` (unlimited) can be seeded; leave `users` table `storage_quota` min at `0` because per-user overrides are post-MVP.
- [x] `scripts/setup/configure-env.js` — register `VITE_APPWRITE_BUCKET_PERSONAL_FILES`/`APPWRITE_BUCKET_PERSONAL_FILES` (default `personal_files`) and `VITE_APPWRITE_TABLE_FILE_METADATA`/`APPWRITE_TABLE_FILE_METADATA` (default `file_metadata`) in both root and server entry lists.
- [x] `.env.example` — add the four new keys with the same defaults and comments.
- [x] `src/router/routes.js` — import and spread `storageRoutes` after `calendarRoutes`.
- [x] `src/modules/storage/router.js` — NEW: define `/storage` route with `meta: { requiresAuth: true, requiresPermission: 'storage:read' }`.
- [x] `src/composables/useFileUpload.js` — NEW: `createUpload(bucketId, file, options)` returns `{ promise, progress, uploading }`. Validates that `currentUsageBytes + file.size <= quotaBytes` (unless quota is `-1`). Calls `storage.createFile` with `fileId: ID.unique()`, per-user permissions `[Permission.read(Role.user(userId)), Permission.write(Role.user(userId)), Permission.delete(Role.user(userId))]`, and an `onProgress` callback using `progress.chunksUploaded / progress.chunksTotal`. Uses `useErrorHandler` for error notifications.
- [x] `src/modules/storage/utils/format-storage.js` — NEW: `formatBytes(bytes)` (B/KB/MB/GB/TB), `formatPercent(value)` (0-1 → "X%"), `formatQuota(quotaBytes)` (unlimited → "Unlimited").
- [x] `src/modules/storage/stores/personal-files-store.js` — NEW: Pinia store with state `files: []`, `usageBytes: 0`, `loading: false`, `error: null`. Actions: `fetchFiles()` (lists metadata for current user + bucket, computes `usageBytes`), `uploadFiles(files)` (validates batch quota, uses `useFileUpload` per file, creates metadata rows, updates local state and usage), `renameFile(fileId, newName)` (updates metadata and `storage.updateFile` name), `moveFile(fileId, newFolderPath)` (validates path starts with `/` and no shared-prefix, updates `folder_path`), `deleteFile(fileId)` (confirms handled by caller; deletes Storage file and metadata row; recalculates usage), `getDownloadUrl(fileId)`. Getters: `filteredFiles(search)`, `usagePercent`, `isOverQuota90`.
- [x] `src/modules/storage/pages/StoragePage.vue` — NEW: page with header showing usage text, `q-linear-progress`, warning `q-banner` when usage > 90%, drag-and-drop `q-file` multi-file upload area, per-file progress list, search input, `q-table`/`q-list` of files with Download/Rename/Move/Delete actions gated by `storage:write`, rename/move/delete `q-dialog`s. Calls `store.fetchFiles` in `onMounted` guarded by `isClient`.
- [x] `src/layouts/MainLayout.vue` — import `usePersonalFilesStore`; call `fetchFiles` in `onMounted` when `isClient` so `usageBytes` is loaded; replace hardcoded `storageUsagePercent` with `Math.min(usageBytes / storageQuota, 1)` (skip when quota is `-1`); keep existing `storageQuota !== -1` guard.
- [x] `src/pages/profile/ProfilePage.vue` — replace the hardcoded "Calculating..." usage text with real usage from `usePersonalFilesStore` (computed `usageBytes` / `userStorageQuota`) and keep the existing progress bar value bound to the real usage.

**Acceptance Criteria:**

- Given the seeded roles, when `getUserStorageQuota` is called for a user with each role, then the returned bytes match AC1: Admin unlimited, Village Head 20 GB, Deputy 10 GB, Finance/Farm/Head Teacher 10 GB, Crop Manager/Resident 2 GB, Learner 1 GB, Guest 500 MB.
- Given a user with `storage:read`, when they open the drawer or visit `/storage`, then the Storage nav item is visible and the usage bar reflects their real usage.
- Given usage exceeds 90% of quota, when the Storage page or drawer renders, then a warning banner/indicator is shown.
- Given a user on `/storage`, when they drag-and-drop or select multiple files and click upload, then each file is uploaded with a visible progress bar, and the aggregate upload is blocked if existing usage + total file size exceeds quota.
- Given a successful upload, when the file list refreshes, then a metadata row exists with `owner_id == current user`, the file is in the `personal_files` bucket, and usage has increased by the file size.
- Given a user-created personal file, when another user attempts to access it via Appwrite, then the per-user file permissions deny access.
- Given a file in the personal folder, when the user clicks Rename/Move/Delete/Download, then the corresponding operation succeeds (within personal folder only for Move), usage is recalculated on Delete, and a confirmation dialog precedes Delete.
- Given text in the search box, when the user types, then the file list filters to files whose name contains the text.
- Given an unauthenticated user or a user without `storage:read`, when they navigate to `/storage`, then the router guard redirects to `/auth` or `/unauthorized`.

## Spec Change Log

## Review Triage Log

### 2026-07-30 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 1, medium 0, low 0)
- defer: 3
- reject: 2
- addressed_findings:
  - `[high][patch]` `file_metadata` table used world-readable/writable table-level permissions; changed schema to row-level security (`rowSecurity: true`, `create("users")` table-level, per-user `read/update/delete` row permissions) and updated `personal-files-store.js` to pass row permissions on insert.
  - `[medium][patch]` Guest 500 MB quota could not be seeded into an `integer` column; changed `storage_quota` in both `users` and `roles` schemas to `double`.
  - `[medium][patch]` Upload left orphan Storage files if metadata row creation failed; added best-effort `storage.deleteFile` cleanup in the metadata-error path.
  - `[medium][patch]` Rename/delete partially updated Storage/metadata ordering could leave name/path mismatches; reordered operations so metadata stays consistent with Storage state and added rollback attempts on rename failure.
  - `[low][patch]` Drawer did not show a 90% usage warning indicator; added warning icon/caption and bound progress color to `isOverQuota90`.
  - `[low][patch]` Drawer fetched usage only once on mount and could miss async role loading; added a reactive watcher on `authStore.userRoles` that fetches when roles become available.
  - `[low][patch]` Quota display labels said “available” instead of “total quota”; relabeled drawer and profile quota text.
  - `[low][patch]` Unknown/custom roles fell back to 0 GB; updated `getUserStorageQuota` to default unmapped roles to the Resident tier (2 GB).
  - `[low][patch]` Move validation only blocked literal `/shared`; hardened path validation to reject `..`, backslashes, and any first-segment `shared` (case-insensitive).
  - `[low][patch]` Upload allowed duplicate names in the personal folder; added a pre-flight duplicate-name check.
  - `[low][patch]` Rename duplicate-name check was case-sensitive; made it case-insensitive.
  - `[low][patch]` Quota arithmetic could silently pass if `getUserStorageQuota` returned `NaN`; added an explicit guard.

## Design Notes

- **Bucket permissions:** `personal_files` uses `fileSecurity: true` with empty bucket-level permissions. Each uploaded file receives `read/write/delete` for `Role.user(currentUserId)`. This enforces privacy at the storage layer; the metadata table is additionally filtered by `owner_id` client-side.
- **Metadata table vs. built-in listing:** A dedicated `file_metadata` table is used because Appwrite Storage's built-in file listing does not support `owner_id` or custom folder paths, both needed for search and the future shared-folder work (Story 5.4).
- **Quota enforcement:** The client pre-check sums existing usage (from `usageBytes`) plus the new file size before calling `storage.createFile`. Server-side quota hardening is explicitly deferred.
- **Move semantics:** For Story 5.3, "move" only updates `folder_path` within the same bucket. Paths must start with `/`; any attempt to move to a shared-folder prefix (e.g. `/shared/...`) is rejected until Story 5.4.
- **Unmapped roles:** School Administrator and Council Member are not listed in AC1. They are assigned 2 GB (Resident-tier) in the fallback map, consistent with the lowest non-Guest tier. Teacher and Events Coordinator are also defaulted to 2 GB.

## Verification

**Commands:**

- `npm run lint` — expected: no lint errors in new/changed files.
- `npm run build` — expected: Quasar SSR build succeeds.
- `node --check server/scripts/setup-appwrite.js` — expected: syntax OK.
- `node --check server/scripts/seed-roles.js` — expected: syntax OK.

**Manual checks (if no CLI):**

- Dev server: log in as a Village Resident (2 GB quota), upload several files, verify usage bar and profile usage update, exceed quota intentionally and confirm error, delete a file and confirm usage drops.
- Log in as a different user and confirm the first user's files are not visible and cannot be downloaded.
- Verify MainLayout drawer shows the Storage section and usage bar for users with `storage:read`.

## Auto Run Result

- Summary of implemented change: Implemented Story 5.3 — role-based personal cloud storage. Added the `personal_files` Appwrite bucket, `file_metadata` table with row-level permissions, role quota fallback/seed updates, environment variables, a `StoragePage` with drag-and-drop multi-file upload, progress, search, rename/move/delete/download, and wired real usage into the drawer (`MainLayout`) and `ProfilePage`.
- Files changed:
  - `.env.example`, `scripts/setup/configure-env.js` — added bucket and metadata table env keys.
  - `server/scripts/setup-appwrite.js` — added `personal_files` bucket, `file_metadata` table (row-level security), changed `storage_quota` to `double`.
  - `server/scripts/seed-roles.js` — updated role quotas and added `storage:read`/`storage:write`.
  - `src/utils/permissions.js` — updated `ROLE_QUOTA_FALLBACK` and unmapped-role default.
  - `src/router/routes.js`, `src/modules/storage/router.js` — added `/storage` route.
  - `src/modules/storage/pages/StoragePage.vue` — storage UI and file operations.
  - `src/modules/storage/stores/personal-files-store.js` — Pinia store for listing/upload/rename/move/delete.
  - `src/composables/useFileUpload.js` — Appwrite upload wrapper with quota pre-check + progress.
  - `src/modules/storage/utils/format-storage.js` — bytes/percentage/quota formatting.
  - `src/layouts/MainLayout.vue`, `src/pages/profile/ProfilePage.vue` — real usage and warnings.
- Review findings breakdown: 12 patch-level findings addressed (permissions, decimal quota type, upload/delete/rename consistency, drawer warnings, async role loading, label wording, unknown-role fallback, path validation, duplicate-name checks, NaN guard); 4 items deferred (project-wide server-side permissions, seed-role migration, 500-row pagination cap, test coverage); 2 items rejected (setup-script emoji console style is pre-existing; table-count finding was incorrect).
- Follow-up review recommendation: `false` — all review findings were triaged into small, localized patches and verified; no high-severity unresolved issues remain.
- Verification performed:
  - `npm run lint` — 0 errors, 0 warnings.
  - `npm run build` — Quasar SPA build succeeded.
  - `node --check server/scripts/setup-appwrite.js` — OK.
  - `node --check server/scripts/seed-roles.js` — OK.
- Residual risks: Server-side quota enforcement is deferred (client-side pre-check only), so a determined caller could bypass the quota by calling Appwrite directly. Row-level metadata permissions now mitigate privacy but still rely on correct row permission usage in every client call.
