# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.3 → 5.14)

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
Story to implement THIS iteration: 5.3 — Cloud Storage - Role-Based Storage Quotas and Personal Folders
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-3-cloud-storage-role-based-storage-quotas-and-personal-folders.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) ← THIS ITERATION
4. 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3)
5. 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done)
6. 5.9 Module Management and Configuration (deps: all MVP previous)
7. 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11)
8. 5.12 User Management - CRUD Operations (deps: 1.4, 1.11)
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12)
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.3 Specifics <<< CHANGE PER ITERATION >>>

Intent: A village user gets personal cloud storage with a role-based quota, a private personal folder, drag-and-drop multi-file upload with progress and client-side quota validation, and file operations (download, delete, rename, move, search). This is the first story to use Appwrite Storage buckets in the project.

ACs (from docs/epics.md Story 5.3 — treat as authoritative):

1. Storage quotas: Admin (Unlimited), Village Head (20 GB), Deputy (10 GB), Finance/Farm/Head Teacher (5-10 GB), Crop Manager/Resident (2 GB), Learner (1 GB), Guest (500 MB).
2. Storage page: usage display, progress bar, warning if >90%.
3. Personal folder: private, upload files, file operations (download, delete, rename, move), search.
4. File upload: drag-and-drop, multiple files, progress indicator, quota validation.

Prerequisites confirmed done: Story 1.10 (status `done` per docs/sprint-status.yaml — dashboard widgets). Story 1.11 (status `done` — user profile and storage quota display). No spec file exists yet for 5.3.

Continuity context from prior work (load the 5.2 spec's Auto Run Result and the 5.1 spec for established patterns):

- `src/boot/appwrite.js` — already exports `storage` (Appwrite Storage client instance) alongside `account`, `databases`, `functions`, `tables`. 5.3 uses `storage` directly — no new client setup needed.
- `src/utils/permissions.js` — `getUserStorageQuota(userRoles)` returns quota in bytes (-1 for unlimited); uses hybrid approach: tries `role.storage_quota` from DB, falls back to `ROLE_QUOTA_FALLBACK` map. `src/composables/usePermissions.js` exposes `userStorageQuota` computed. 5.3 reuses this for quota display and pre-upload validation.
- `src/layouts/MainLayout.vue` — already has a `/storage` nav item gated on `hasPermission('storage:read')` inside the Services section, AND a storage-quota progress bar in the user drawer (currently hardcoded at 35% — `storageUsagePercent` is a placeholder with a `TODO(Story 1.11)` comment). 5.3 must wire the real usage value.
- `src/pages/profile/ProfilePage.vue` — displays `formattedQuota` from `userStorageQuota`. 5.3 does not change ProfilePage but should ensure quota display is consistent.
- `server/scripts/seed-roles.js` — all roles have a `storage_quota` field (in GB). **IMPORTANT:** The current seed values do NOT match the AC1 quota tiers. Current vs AC-required: System Administrator 1000 GB (AC: Unlimited → should be -1), Village Head 200 GB (AC: 20 GB), Deputy Village Head 100 GB (AC: 10 GB), Finance Manager 50 GB (AC: 5-10 GB), Farm Manager 50 GB (AC: 5-10 GB), Head Teacher 50 GB (AC: 5-10 GB), Crop Manager 20 GB (AC: 2 GB), Village Resident 10 GB (AC: 2 GB), Learner 1 GB (AC: 1 GB ✓), Guest 0.5 GB (AC: 500 MB ✓). 5.3 MUST update seed-roles.js `storage_quota` values to match AC1 exactly. Use -1 for Admin (unlimited), and GB values for the rest: Village Head 20, Deputy 10, Finance Manager 10, Farm Manager 10, Head Teacher 10, Crop Manager 2, Village Resident 2, Learner 1, Guest 0.5. School Administrator and Council Member are not listed in AC1 — keep their existing values (100 GB each) or set to a reasonable default. Events Coordinator is not listed — keep 20 GB or set to 2 GB (Resident-tier); use judgment and document the decision.
- `server/scripts/seed-roles.js` — **NO role currently has `storage:read` or `storage:write` permissions.** 5.3 MUST add `storage:read` to all roles (every user can view their own files) and `storage:write` to all roles except Learner and Guest (or add to all — AC does not restrict upload by role, only quota does). Document the decision. The MainLayout nav link already checks `storage:read` so adding the permission will make the nav item appear.
- No `useFileUpload` composable exists yet (epic-5-context.md says "follow the existing `useFileUpload` composable pattern" but it does not exist — 5.3 creates it).
- No `/storage` route exists in the router yet — 5.3 creates `src/modules/storage/router.js` and registers it in `src/router/routes.js`.
- No storage module exists yet — 5.3 creates `src/modules/storage/` (pages, components, stores, composables, utils).
- `server/scripts/setup-appwrite.js` — no Storage bucket definitions exist yet. 5.3 adds bucket creation/configuration following the existing table-definition pattern but using the Appwrite Storage API (createBucket). The personal-files bucket should have read/write/delete permissions scoped to the owning user (use `Permission.read(Role.user(userId))` pattern or document the chosen permission model).
- Dashboard widget pattern: follow `docs/implementation-artifacts/dashboard-widget-pattern.md` if a storage widget is needed (AC does not explicitly require a dashboard widget for 5.3 — the MainLayout drawer already has a usage bar; a dedicated dashboard widget is optional and should be deferred to 5.10 unless AC-driven).

New data model required: 5.3 introduces Appwrite Storage bucket(s) for personal files. The primary bucket (e.g. `personal_files`) stores user files with per-user folder isolation. File metadata (name, size, type, owner_id, folder_path, uploaded_at) may be tracked via an Appwrite table (e.g. `file_metadata`) for search/listing without listing the bucket directly, OR by using Appwrite Storage's built-in file listing — choose the approach that matches existing project conventions and document it. If a metadata table is used, add it to `server/scripts/setup-appwrite.js`. Also add `storage:read` and `storage:write` permissions to `server/scripts/seed-roles.js` for all appropriate roles, and update `storage_quota` values to match AC1.

Key design decisions for the spec to resolve:

- Bucket permission model: per-user read/write/delete via Appwrite Roles (`Role.user(userId)`) vs. a shared bucket with client-side filtering. Appwrite Storage v21 supports per-file permissions on upload — prefer that.
- File metadata: dedicated table vs. Appwrite Storage built-in file attributes. A dedicated table enables search and folder-path semantics; built-in listing is simpler but limited.
- Quota enforcement: client-side pre-upload check (sum of existing file sizes + new file size ≤ quota). Server-side enforcement via Appwrite Function is post-MVP — document in deferred-work.md.
- "Move" operation: within personal folder only (no shared folders until 5.4) — move = update folder_path metadata.
- Route: `/storage` (already referenced in MainLayout). Route guard: `requiresAuth` + `storage:read` permission.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.3 ACs and Epic 5 story list
- docs/PRD.md — FR-6 (Cloud Storage: role-based quotas, personal/shared folders, file operations, usage indicators, admin quota adjustments)
- docs/architecture.md — Appwrite patterns, RBAC, data model conventions (note: architecture.md has no storage-specific section — use epic-5-context.md Technical Decisions for storage guidance)
- docs/ux-specification.md — no storage-specific screen specs exist; follow general UX patterns and the storage interaction notes in epic-5-context.md UX & Interaction Patterns section
- docs/implementation-artifacts/spec-5-2-village-calendar-role-based-event-creation-and-editing.md — 5.2 spec (continuity context: Auto Run Result, Next Iteration section pointing to 5.3)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules; contains Storage requirements and Technical Decisions for bucket/composable approach)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('storage:read')`, `hasPermission('storage:write')`), route guards, PermissionGuard — reuse, do not reinvent. The `storage:read` and `storage:write` permissions do NOT yet exist in `server/scripts/seed-roles.js` — 5.3 MUST add them to appropriate roles (see Story 5.3 Specifics above for details).
- Dashboard widgets: follow docs/implementation-artifacts/dashboard-widget-pattern.md exactly.
- No new dependencies without verifying they're already in package.json. If a new dep is truly required, HALT with blocking condition `new dependency required: <name> — user approval needed`.
- Match existing code style in src/pages/, src/stores/, src/composables/, src/services/, src/modules/. Read neighboring modules (e.g. src/modules/school/, src/modules/farm/, src/modules/calendar/) before scaffolding.
- i18n: NOT implemented in this project. vue-i18n is NOT installed. All UI strings are hardcoded English, matching existing modules (Epics 1–4 and Story 5.1). This is a user-approved decision (2026-07-28); i18n is deferred to post-MVP — see docs/implementation-artifacts/deferred-work.md. Do NOT add vue-i18n. Do NOT use $t() or useI18n(). Write hardcoded English strings consistent with existing modules.
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
- SSR-safe: any Appwrite Storage/TablesDB access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. CalendarPage.vue, SchoolCalendarPage.vue).
- Quasar components for all UI primitives (q-btn, q-input, q-uploader, q-file, q-dialog, q-linear-progress, q-chip, q-table, etc.). No raw HTML controls. Use `q-uploader` for drag-and-drop multi-file upload with progress.
- New Appwrite table definitions go in `server/scripts/setup-appwrite.js` following the existing pattern (attributes, permissions, indexes). New Appwrite Storage bucket definitions also go in `server/scripts/setup-appwrite.js` using the Storage API (createBucket with appropriate permissions).
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. Storage file operations use `storage.createFile`/`storage.getFileDownload`/`storage.deleteFile`/`storage.updateFile` from the Appwrite Storage API (imported from `src/boot/appwrite.js`). Metadata table operations use `tables.listRows`/`tables.createRow`/`tables.updateRow`/`tables.deleteRow` from the Appwrite TablesDB API.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Quota validation: compute current usage (sum of file sizes for the user) and compare against `userStorageQuota` from `usePermissions` before each upload. Block upload with a clear error if exceeded. Use `useErrorHandler` for error display.
- Permission checks in templates: use `hasPermission('storage:read')` and `hasPermission('storage:write')` from `usePermissions` composable to gate upload/delete/rename/move UI.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.3 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.3:

- Storage quotas in `seed-roles.js` match AC1 exactly: Admin = -1 (unlimited), Village Head = 20 GB, Deputy = 10 GB, Finance/Farm/Head Teacher = 10 GB (or 5-10 GB range — pick one and document), Crop Manager = 2 GB, Resident = 2 GB, Learner = 1 GB, Guest = 0.5 GB. The `getUserStorageQuota` function in `permissions.js` and the `ROLE_QUOTA_FALLBACK` map must be consistent with these values.
- `storage:read` and `storage:write` permissions are added to appropriate roles in `seed-roles.js`. The MainLayout `/storage` nav item appears for users with `storage:read`.
- The storage page (`/storage`) shows a usage display with a progress bar (q-linear-progress) and a warning indicator when usage exceeds 90% of quota.
- The MainLayout drawer storage-quota bar is wired to real usage data (replacing the hardcoded 35% placeholder).
- Personal folder is private: a user can only see/download/delete/rename their own files. Other users cannot access another user's personal files.
- File upload supports drag-and-drop (q-uploader or q-file with appropriate config), multiple files, and a progress indicator per file.
- Quota validation is enforced client-side before upload: if existing usage + new file size > quota, the upload is blocked with a clear error message.
- File operations work: download (via Appwrite Storage `getFileDownload`), delete (with confirmation dialog), rename (update metadata), move (update folder_path metadata — within personal folder only, no shared folders until 5.4).
- Search filters files by name within the user's personal folder.
- Appwrite Storage bucket(s) are defined in `server/scripts/setup-appwrite.js` with appropriate permissions.
- The `useFileUpload` composable (or equivalent) handles upload progress, quota check, and error handling via `useErrorHandler`.
- All Appwrite Storage calls are SSR-safe (guarded with `isClient` pattern).
- No new third-party dependency was added without explicit approval.
- No i18n/vue-i18n setup was added (hardcoded English per project convention).
- Server-side quota enforcement is documented as deferred to post-MVP in `deferred-work.md` (client-side check is the MVP approach).

Triage findings into Fix Now / Defer / Acceptable per the skill. Fix Now items must be resolved before HALTing with status `done`. Defer items go into docs/implementation-artifacts/deferred-work.md with a pointer to the owning story.

## Iteration Handoff (on successful completion)

When the spec reaches status `done`:

1. Ensure docs/sprint-status.yaml is updated: `5-3-cloud-storage-role-based-storage-quotas-and-personal-folders: done` (match the existing slug format in that file).
2. Ensure docs/epics.md Story 5.3 has a `**Status:** Done` line appended (follow the pattern used by Story 5.1, 5.2 and other done stories — `**Status:** Done` on its own line after the ACs).
3. Append a "Next Iteration" section to the spec's ## Auto Run Result pointing to the next story in the MVP dependency order as the next iteration target, with its slug. The next story after 5.3 is 5.4 (slug: `5-4-cloud-storage-shared-folders-and-module-based-access`).
4. HALT with status `done` and a one-line summary of what was shipped.

Do NOT automatically start the next story in this iteration. One story per invocation.

## Communication

- Output language: English (per \_bmad/bmm/config.yaml communication_language).
- Document output language: English.
- Tailor to a senior developer audience; do not over-explain Quasar/Vue/Appwrite basics.
- Be concise in status updates; full detail belongs in the spec file.

---

## How to Adapt for Subsequent Iteruations

When re-invoking for the next story, change these three sections:

### 1. Current Iteration Target

- Story number, title, spec file path
- Check if spec file already exists (resume if `draft`, halt if other status)

### 2. Story X.Y Specifics

- Copy the ACs verbatim from docs/epics.md for the target story
- List prerequisites and verify they're `done` in docs/sprint-status.yaml
- Include continuity context from the previous story's spec (Code Map, Design Notes, Auto Run Result)
- Note any new data models, Appwrite tables, or backend functions required
- Note any seed-roles.js permission changes needed

### 3. Review invariants

- Story-specific checks that must be verified during step-04 review
- Derived from the story's ACs and the campaign-level constraints

### Next-story slug reference (for handoff section):

| Story | Slug                                                                      | Next Story        |
| ----- | ------------------------------------------------------------------------- | ----------------- |
| 5.2   | `5-2-village-calendar-role-based-event-creation-and-editing`              | 5.3 ✅            |
| 5.3   | `5-3-cloud-storage-role-based-storage-quotas-and-personal-folders`        | 5.4               |
| 5.4   | `5-4-cloud-storage-shared-folders-and-module-based-access`                | 5.7               |
| 5.7   | `5-7-vendors-suppliers-management-module`                                 | 5.9               |
| 5.9   | `5-9-module-management-and-configuration`                                 | 5.14              |
| 5.14  | `5-14-authentication-completeness-password-change-and-reset`              | 5.12              |
| 5.12  | `5-12-user-management-crud-operations`                                    | 5.13              |
| 5.13  | `5-13-role-assignment-and-permissions-management-ui`                      | 5.11              |
| 5.11  | `5-11-start-fresh-production-setup-wizard`                                | 5.10              |
| 5.10  | `5-10-system-completion-final-dashboard-integration-and-production-setup` | (Epic 5 complete) |

### Story-specific notes for remaining stories (reference when adapting):

**5.3 (Cloud Storage - Quotas/Personal Folders):** Requires Appwrite Storage buckets (personal/school/farm/village files). Quotas per role from seed-roles.js (`storage_quota` field). Follow existing `useFileUpload` composable pattern if it exists; otherwise create one. Storage page at `/storage` or `/my-files`. AC: usage display with progress bar, warning >90%, drag-and-drop multi-file upload with progress, quota validation client-side before upload. Personal folder is private. File operations: download, delete, rename, move, search. Dep: Story 1.10 (dashboard widgets — storage quota display widget already exists).

**5.4 (Cloud Storage - Shared Folders):** Shared folders: Finance Shared, Farm Shared, School Shared, Village Documents, Admin Only. Role-based read-only/read-write access. "Share to Folder" workflow from personal folder. Admin storage settings: view all users' usage, adjust quotas, storage reports. Dep: 5.3.

**5.7 (Vendors/Suppliers):** New `vendors` module (`src/modules/vendors/`). Bidirectional supplier/buyer tracking. Vendor selection integrates into farm-sales buyer dropdown (Epic 3, Story 3.8) and finance-expense vendor dropdown (Epic 2, Stories 2.2/2.3). Transaction history auto-updates. Dashboard widget required. Module enabled via module settings (ties into 5.9). Deps: 2.2, 2.3, 3.8 — all done.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
