# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.4 → 5.14)

> **Usage:** Copy everything below the `---` line into a fresh `/bmad-dev-auto` invocation.
> **Adapting for subsequent iterations:** Change ONLY the three sections marked
> `<<< CHANGE PER ITERATION >>>` — (1) Current Iteration Target, (2) Story X.Y Specifics,
> (3) Review invariants. Everything else is campaign-level context that stays constant.
> The MVP dependency order in "Epic 5 MVP Scope" tells you which story is next after each
> completion; the previous story's spec `## Auto Run Result → Next Iteration` section
> also points to the next target with its slug.

---

You are running bmad-dev-auto for the Sustainable Model Village Management System (village-app). This invocation processes EXACTLY ONE story this iteration and HALT cleanly so the next iteration can pick up the next story.

## Current Iteration Target <<< CHANGE PER ITERATION >>>

Epic: 5 — "Village Calendar, Storage, Optional Modules, and User Management"
Story to implement THIS iteration: 5.4 — Cloud Storage - Shared Folders and Module-Based Access
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-4-cloud-storage-shared-folders-and-module-based-access.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. ✅ 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) — DONE 2026-07-30
4. 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3) ← THIS ITERATION
5. 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done)
6. 5.9 Module Management and Configuration (deps: all MVP previous)
7. 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11)
8. 5.12 User Management - CRUD Operations (deps: 1.4, 1.11)
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12)
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.4 Specifics <<< CHANGE PER ITERATION >>>

Intent: A module manager gets shared storage folders for their team (Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only) with role-based read-only/read-write access, a "Share to Folder" workflow from personal files, and an admin storage-settings page for viewing all users' usage, adjusting quotas, and running storage reports. This is the second and final storage story — it builds directly on the personal-files infrastructure from Story 5.3.

ACs (from docs/epics.md Story 5.4 — treat as authoritative):

1. Shared folders: Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only.
2. Shared folder permissions: read-only, read-write, role-based access.
3. File sharing workflow: "Share to Folder" from personal folder.
4. Storage settings (Admin): view all users' usage, adjust quotas, storage reports.

Prerequisites confirmed done: Story 5.3 (status `done` per docs/sprint-status.yaml — personal storage, quotas, `personal_files` bucket, `file_metadata` table, `StoragePage`, `useFileUpload`, `personal-files-store`). No spec file exists yet for 5.4.

Continuity context from prior work (load the 5.3 spec's Auto Run Result and Design Notes for established patterns):

- `src/modules/storage/` — the storage module already exists with `pages/StoragePage.vue`, `stores/personal-files-store.js`, `router.js`, `utils/format-storage.js`. 5.4 extends this module — add shared-folders pages/components/stores alongside the existing personal-files code, do not replace it.
- `src/composables/useFileUpload.js` — `createUpload(bucketId, file, options)` already handles per-user file permissions, quota pre-check, and progress. 5.4 reuses this for shared-folder uploads; the bucket ID and permission model differ (shared bucket + role-based permissions instead of per-user).
- `src/modules/storage/stores/personal-files-store.js` — Pinia options-store pattern with `fetchFiles`, `uploadFiles`, `renameFile`, `moveFile`, `deleteFile`, `getDownloadUrl`, getters `filteredFiles`/`usagePercent`/`isOverQuota90`. 5.4 follows the same pattern for a new `shared-files-store.js`. The existing `moveFile` already blocks `/shared*` paths — 5.4 lifts that restriction and implements the actual shared-folder move.
- `server/scripts/setup-appwrite.js` — `personal_files` bucket created with `fileSecurity: true` and empty bucket-level permissions; `file_metadata` table created with row-level security (`rowSecurity: true`, `Permission.create(Role.users())` table-level, per-user `read/update/delete` row permissions). 5.4 adds a `shared_files` bucket (or reuses `personal_files` with a `folder_path` convention — choose and document) and extends `file_metadata` with a `shared_folder` column or a separate `shared_file_metadata` table. Follow the existing `bucketSchemas`/`createBuckets` and `tableSchemas`/`createTable` patterns.
- `server/scripts/seed-roles.js` — all roles already have `storage:read` and `storage:write`. 5.4 may need new permissions like `storage:admin` (for the admin storage-settings page) or `storage:share` (for the Share-to-Folder workflow) — add them to appropriate roles and document the decision. The existing role categories (`administration`, `council`, `farm`, `school`, `resident`) map naturally to the shared-folder access tiers.
- `src/utils/permissions.js` / `src/composables/usePermissions.js` — `hasPermission`, `hasAnyPermission`, `getUserStorageQuota` already exist. 5.4 reuses these for shared-folder access checks (e.g., `hasPermission('storage:finance:write')` or a role-category-based check — choose and document).
- `src/layouts/MainLayout.vue` — the Services section already has a `/storage` nav item. 5.4 adds a `/storage/shared` nav item (or a sub-route) and an `/admin/storage` nav item for the admin settings page, both gated on appropriate permissions.
- `src/modules/storage/router.js` — currently defines only the `/storage` route. 5.4 adds `/storage/shared` and `/admin/storage` routes with appropriate `requiresAuth` + `requiresPermission` guards.
- `src/modules/storage/utils/format-storage.js` — `formatBytes`, `formatPercent`, `formatQuota` already exist. 5.4 reuses these for the admin usage reports.
- `src/modules/storage/pages/StoragePage.vue` — the personal-files page. 5.4 adds a "Share to Folder" action to each file row (opens a dialog to pick a shared folder) and may add a tab/section for shared folders. Do not break the existing personal-files UX.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — already wipes the `personal_files` bucket and `file_metadata` table. 5.4 MUST add the `shared_files` bucket (if a separate bucket is used) to the bucket-wipe list and any new tables to `TABLES_TO_WIPE`.

New data model required: 5.4 introduces shared folders. Key design decisions for the spec to resolve:

- **Shared folder representation:** A separate `shared_files` bucket with role-based permissions, OR the same `personal_files` bucket with a `folder_path` convention (e.g. `/shared/finance/...`). A separate bucket is cleaner for permissions; a shared bucket is simpler for move operations. Document the choice and its trade-offs.
- **Shared folder permissions:** Map the 5 shared folders to role-based access. Suggested mapping (confirm against AC2 and PRD FR-6): Finance Shared → Finance Manager (write), Council Member/Village Head/Deputy (read); Farm Shared → Farm Manager/Crop Manager (write), Council (read); School Shared → School Administrator/Head Teacher/Teacher (write), Council (read); Village Documents → Council Member/Village Head/Deputy (write), all residents (read); Admin Only → System Administrator (read+write). Use Appwrite `Role.role(<role-name>)` or a custom permission scheme — document the approach.
- **Share-to-Folder workflow:** From a personal file row, user clicks "Share to Folder", picks a target shared folder, the file is copied (or moved) to the shared bucket/folder with the shared-folder's permissions. Decide copy-vs-move and document.
- **Admin storage settings page:** `/admin/storage` — System Administrator only (`storage:admin` permission or `*` wildcard). Lists all users with their usage (sum of `file_metadata.size` grouped by `owner_id`), their quota, and an inline quota-override field (updates `users.storage_quota` — the column already exists in the schema). Storage reports: a simple table or CSV export of per-user usage. No charts required for MVP unless trivially available.
- **Quota overrides:** The `users.storage_quota` column already exists (double, min -1, default 2). 5.4 wires it into `getUserStorageQuota` as a per-user override that takes precedence over the role-based quota. Document the precedence: per-user override > role-based quota > fallback map.

Key design decisions for the spec to resolve:

- Separate `shared_files` bucket vs. shared-folder paths in `personal_files`.
- Permission model for shared folders: Appwrite `Role.role()` vs. custom `storage:<folder>:<read|write>` permissions in `seed-roles.js`.
- Share-to-Folder: copy vs. move semantics.
- Admin quota override precedence and UI.
- Whether shared-folder files count against the uploader's personal quota or a separate shared quota (recommend: shared files count against the uploader's personal quota to keep MVP simple — document this).

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.4 ACs and Epic 5 story list
- docs/PRD.md — FR-6 (Cloud Storage: role-based quotas, personal/shared folders, file operations, usage indicators, admin quota adjustments)
- docs/architecture.md — Appwrite patterns, RBAC, data model conventions (note: architecture.md has no storage-specific section — use epic-5-context.md Technical Decisions for storage guidance)
- docs/ux-specification.md — no storage-specific screen specs exist; follow general UX patterns and the storage interaction notes in epic-5-context.md UX & Interaction Patterns section
- docs/implementation-artifacts/spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md — 5.3 spec (continuity context: Auto Run Result, Design Notes, deferred items — 5.4 builds directly on the personal-files infrastructure)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules; contains Storage requirements and Technical Decisions for bucket/composable approach)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision and 5.3 deferred items (server-side quota hardening, 500-row pagination cap, seed-role migration)

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('storage:read')`, `hasPermission('storage:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.4 may add new `storage:admin` / `storage:share` permissions to `seed-roles.js` — document the decision.
- Dashboard widgets: follow docs/implementation-artifacts/dashboard-widget-pattern.md exactly.
- No new dependencies without verifying they're already in package.json. If a new dep is truly required, HALT with blocking condition `new dependency required: <name> — user approval needed`.
- Match existing code style in src/pages/, src/stores/, src/composables/, src/services/, src/modules/. Read neighboring modules (e.g. src/modules/school/, src/modules/farm/, src/modules/calendar/, src/modules/storage/) before scaffolding.
- i18n: NOT implemented in this project. vue-i18n is NOT installed. All UI strings are hardcoded English, matching existing modules (Epics 1–4 and Stories 5.1–5.3). This is a user-approved decision (2026-07-28); i18n is deferred to post-MVP — see docs/implementation-artifacts/deferred-work.md. Do NOT add vue-i18n. Do NOT use $t() or useI18n(). Write hardcoded English strings consistent with existing modules.
- No emojis in code or UI unless an existing module already uses them.

## Strict Readiness Standard (HALT on any violation)

Before leaving step-02 (plan), the spec MUST satisfy the "Ready for Development" standard from SKILL.md:

- Actionable: every task has a file path and specific action.
- Logical: tasks ordered by dependency.
- Testable: all ACs in Given/When/Then form.
- Complete: no placeholders or TBDs.
- Sufficient: no unresolved requirement/acceptance/dependency/implementation gaps.
- Coherent: no internal contradictions.

HALT with status `blocked` and a precise blocking condition if ANY of these occur:

- A story AC cannot be translated into concrete tasks because a requirement is ambiguous or contradictory between epics.md / PRD.md / ux-specification.md / architecture.md.
- A prerequisite story is not actually `done` (verify against docs/sprint-status.yaml, not against docs/bmm-workflow-status.md which is stale).
- The working tree is dirty or the current branch is an obvious mismatch for Epic 5 work.
- A new third-party dependency is required.
- An AC requires functionality that belongs to a deferred story (5.5/5.6/5.8) or a not-yet-built story — split the work cleanly and exclude the forward-dep portion; if the AC cannot be satisfied without it, HALT.
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT.

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate.
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: any Appwrite Storage/TablesDB access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. StoragePage.vue, CalendarPage.vue, SchoolCalendarPage.vue).
- Quasar components for all UI primitives (q-btn, q-input, q-uploader, q-file, q-dialog, q-linear-progress, q-chip, q-table, q-select, q-banner, etc.). No raw HTML controls.
- New Appwrite table definitions go in `server/scripts/setup-appwrite.js` following the existing pattern (attributes, permissions, indexes). New Appwrite Storage bucket definitions also go in `server/scripts/setup-appwrite.js` using the Storage API (createBucket with appropriate permissions) and the existing `bucketSchemas`/`createBuckets` pattern.
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. Follow `personal-files-store.js` as the template for a new `shared-files-store.js`. Storage file operations use `storage.createFile`/`storage.getFileDownload`/`storage.deleteFile`/`storage.updateFile` from the Appwrite Storage API (imported from `src/boot/appwrite.js`). Metadata table operations use `tables.listRows`/`tables.createRow`/`tables.updateRow`/`tables.deleteRow` from the Appwrite TablesDB API.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Quota validation: reuse the client-side pre-check pattern from `personal-files-store.js` for shared-folder uploads. If shared files count against the uploader's personal quota (recommended for MVP), the same `getUserStorageQuota` check applies.
- Permission checks in templates: use `hasPermission('storage:read')`, `hasPermission('storage:write')`, and any new permissions (e.g. `storage:admin`, `storage:share`) from `usePermissions` composable to gate UI. Use `PermissionGuard` component where appropriate.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — if 5.4 adds a new `shared_files` bucket, add it to the bucket-wipe section. If 5.4 adds new tables, add them to `TABLES_TO_WIPE`.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.4 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.4:

- All 5 shared folders exist and are accessible to the correct roles: Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only. Role-to-folder access matches the spec's documented mapping (read-only vs. read-write per role).
- Shared folder permissions are enforced: a user without read access to a shared folder cannot list or download its files; a user without write access cannot upload to it. Enforcement is via Appwrite permissions (not just client-side guards) where feasible — document any client-side-only enforcement as deferred.
- "Share to Folder" workflow works from a personal file: user can share a file from their personal folder to a shared folder they have write access to. The file becomes accessible to other users with read access to that shared folder.
- Admin storage settings page (`/admin/storage`) shows all users with their current usage, quota, and quota-override field. Only System Administrator can access it. Quota overrides persist to `users.storage_quota` and take effect immediately (next `getUserStorageQuota` call respects the override).
- Storage reports: admin can view a per-user usage report (table or CSV). No charts required for MVP.
- The existing personal-files UX from 5.3 is not broken — personal files still upload, list, search, rename, move, delete, and download as before.
- `wipeAllData` is updated to wipe any new buckets/tables added by 5.4.
- No shared-folder file operations leak across users/roles (e.g., a Farm Manager cannot see Admin Only files).
- Quota accounting is consistent: if shared files count against personal quota, the admin usage report reflects total usage (personal + shared). If shared files have a separate quota, document it.
- The `moveFile` restriction in `personal-files-store.js` that blocks `/shared*` paths is lifted or replaced with the actual shared-folder move logic — no dead code left behind.

**5.7 (Vendors/Suppliers):** VendorsPage at `/vendors`. Vendor form: name, type (supplier/buyer/both), contact, phone, email, address, payment terms, notes. Vendor list with search/filter by type. Vendor detail page with transaction history (linked finance transactions + farm sales). Farm-sales buyer dropdown and finance-expense vendor dropdown integrate vendor selection. Dashboard widget: vendor count + recent transactions. Deps: 2.2, 2.3, 3.8 — all done.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
