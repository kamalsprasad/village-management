# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.13 → 5.10)

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
Story to implement THIS iteration: 5.13 — Role Assignment and Permissions Management UI
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-13-role-assignment-and-permissions-management-ui.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. ✅ 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) — DONE 2026-07-30
4. ✅ 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3) — DONE 2026-07-31
5. ✅ 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done) — DONE 2026-08-01
6. ✅ 5.9 Module Management and Configuration (deps: all MVP previous) — DONE 2026-08-03
7. ✅ 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11) — DONE 2026-08-03
8. ✅ 5.12 User Management - CRUD Operations (deps: 1.4, 1.11) — DONE 2026-08-03
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12) ← THIS ITERATION
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.13 Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the Role Assignment and Permissions Management UI for MVP. A System Administrator can assign/modify user roles from a dedicated "Manage Roles" dialog on UsersPage (multi-select of seeded roles, with an effective-permissions preview), view a user's effective permission union read-only, and browse a new read-only `/admin/roles` page listing all roles (name, category, permission count, storage quota, assigned user count) with an expandable role × permission matrix. The roles page is read-only for MVP — no create/edit/delete roles from the UI (custom roles deferred to post-MVP). Role changes are audit-logged. This story builds entirely on the 5.12 infrastructure (the `User Management` server function's `updateUser` action, the `users-store`, the `audit_logs` table, the `roles` table) — it adds NO new server function, NO new schema table, and NO new Appwrite infrastructure. It is a UI + routing + seed-roles-upsert story.

ACs (from docs/epics.md Story 5.13 — treat as authoritative):

1. UsersPage row action: "Manage Roles" opens role assignment dialog.
2. Role assignment dialog: multi-select of all seeded roles; shows current assignments; save updates `users.role_ids`.
3. UsersPage row action: "View Permissions" shows the effective permission set (union of assigned roles) read-only.
4. New admin page `/admin/roles`: lists all roles with name, category, permission count, storage quota, assigned user count.
5. Roles page is read-only for MVP (no create/edit/delete roles from UI — roles remain seeded via script); custom roles deferred to post-MVP.
6. Permission matrix view on `/admin/roles`: expandable grid showing role × permission mapping.
7. Role changes audit-logged.

Prerequisites confirmed done: Story 5.12 (User Management - CRUD Operations — `done`, confirmed via `docs/sprint-status.yaml` on 2026-08-04; spec at `spec-5-12-user-management-crud-operations.md` is `done`; code committed through `f47fc6c`). Story 1.4 (RBAC Foundation — `done`). 5.13 has NO hard dependency on any other unfinished Epic 5 story (per `docs/planning-artifacts/sprint-change-proposal-2026-07-28.md` recommended order: 5.14 → 5.12 → 5.13 → 5.11; 5.14 and 5.12 are both DONE). No spec file exists yet for 5.13.

**No schema change, no new server function (unlike 5.12):**

- The `roles` table already exists in `server/scripts/setup-appwrite.js` with columns `name` (string), `category` (enum: `administration`/`council`/`farm`/`school`/`resident`), `permissions` (string array), `storage_quota` (double, min -1). 5.13 adds NO columns and NO new tables.
- The `audit_logs` table already exists (created by 5.12) with `action` enum values `user_create`/`user_update`/`user_deactivate`/`user_reactivate`/`user_password_reset` (the 5th value, `user_password_reset`, was added by commit `f47fc6c` — an accepted 5.12 scope addition; see the 5.12 spec's Spec Change Log and `deferred-work.md`). 5.13 adds NO new enum values. Role changes reuse the existing `user_update` action via the 5.12 `updateUser` function action (the `changes_json` captures the before/after `role_ids` diff) — see "Audit logging for role changes" below.
- The `User Management` server function (`server/functions/User Management/src/main.js`) already has a `updateUser` action that updates `role_ids`, syncs `village_administrators` team membership, and writes an audit log. 5.13 REUSES this action for the "Manage Roles" save — do NOT add a new function action. The client calls `usersStore.updateUser(userId, { role_ids })` (already implemented in `src/stores/users-store.js`).
- The `users-store.js` (from 5.12) already has `fetchRoles()` (lists all roles via `tables.listRows` on the `roles` table) and a `roles` state array plus a `systemAdminRole` getter. 5.13 REUSES this — do NOT create a separate `roles-store.js`. AC4's "assigned user count" is computed client-side from the already-fetched `users` list (`users-store.fetchUsers` returns users with populated `role_ids`) — count users whose `role_ids` includes each role id. No new server call.

**Seed-roles upsert (INCLUDED per user decision 2026-08-04 — greenfield, no data migration):**

`server/scripts/seed-roles.js` currently SKIPS existing roles (`continue` on line 320), so re-running the seeder on a deployment that already has role rows does NOT update their `permissions` arrays. This was flagged as deferred debt in stories 5.2/5.3/5.4/5.7 (see `deferred-work.md`). User decision 2026-08-04: include a task in 5.13 to make `seed-roles.js` UPSERT-capable — when a role already exists by `name`, UPDATE its `permissions` (and `storage_quota`/`category`) to match the seeder's canonical definition instead of skipping. NOTE: this is a brand-new project with no prior deployed versions to upgrade, so NO data migration is required — the change only ensures future re-runs of `seed-roles.js` keep role permissions in sync with the codebase. The spec MUST include a task to convert the `continue` skip into an `updateRow` upsert, with a verification note that re-running `seed-roles.js` is idempotent and updates existing role rows. Do NOT change the seeded role definitions themselves (the canonical role list/permissions stay as-is).

**Routing — new `/admin/roles` route (AC4):**

- `src/router/routes.js` currently has `/admin/users` and `/admin/modules` (both `requiresPermission: '*'`). 5.13 adds a NEW `/admin/roles` route with the same `requiresPermission: '*'` (System Administrator only) and a new `src/pages/admin/RolesPage.vue`. Add a nav entry under the admin/settings group (match the existing `/admin/users`/`/admin/modules` nav placement — see the layout/menu config). No new permissions are introduced.

Continuity context from prior work (load the 5.12 spec for the User Management function/store/audit patterns + the 1.4 spec for RBAC patterns, plus the files below):

- `src/pages/admin/UsersPage.vue` — implemented in 5.12. Has an "Add User" button, status/search filters, and row actions: Edit (opens `UserFormDialog`), a DISABLED "Manage Roles" placeholder (`<q-btn ... disable>` with `<q-tooltip>Available in a future update</q-tooltip>`), and Deactivate/Reactivate (opens `DeactivateUserDialog`). 5.13 must ENABLE the "Manage Roles" row action and wire it to a NEW `ManageRolesDialog.vue`, and ADD a "View Permissions" row action (AC3) opening a read-only effective-permissions view. Reuse the existing `getRoleColor`/role-chip rendering and the `users-store.fetchUsers`/`fetchRoles` calls already on the page. Do NOT remove or break the 5.12 Add/Edit/Deactivate flows.
- `src/stores/users-store.js` — implemented in 5.12. Has `users`/`roles` state, `fetchUsers()` (returns users with populated `role_ids`), `fetchRoles()` (lists all roles), `systemAdminRole` getter, and `createUser`/`updateUser`/`deactivateUser`/`reactivateUser`/`resetUserPassword` actions calling the User Management function. 5.13 REUSES `fetchRoles`, `fetchUsers`, and `updateUser` (for saving role assignments). Do NOT duplicate role-fetching logic. AC4's "assigned user count" is computed client-side from `this.users` (count users whose `role_ids` includes each role id) — no new server call.
- `src/utils/permissions.js` — has `getAllUserPermissions(userRoles)` (returns the union/Set of all permissions across assigned roles — exactly what AC3 "effective permission set" needs), `hasPermission`/`hasAnyPermission`/`hasAllPermissions`, and `getUserStorageQuota`. REUSE `getAllUserPermissions` for the "View Permissions" read-only display and for the "View Effective Permissions" preview in the Manage Roles dialog. Do NOT reinvent permission-union logic.
- `src/composables/usePermissions.js` — `isAdmin`/`hasPermission('*')` computed. The new `/admin/roles` route uses the existing `*` permission gate; no new permissions.
- `src/router/routes.js` — add `/admin/roles` with `requiresPermission: '*'` (match the existing `/admin/users`/`/admin/modules` route shape).
- `server/scripts/seed-roles.js` — the role seeder. Currently skips existing roles (line 318-320 `continue`). 5.13 converts the skip into an upsert (update `permissions`/`storage_quota`/`category` on existing role rows). The canonical role definitions (names, categories, permissions, quotas) stay unchanged.
- `server/scripts/setup-appwrite.js` — `tableSchemas.roles` (the schema, not the data). No schema change for 5.13; reference only.
- `src/components/admin/UserFormDialog.vue` — from 5.12. Already has a role multi-select (`q-select` with chips from seeded roles) in both Add and Edit modes, AND a "Reset Password" section in edit mode (added by commit `f47fc6c`, beyond the 5.12 ACs — accepted/documented in the 5.12 spec Spec Change Log and `deferred-work.md`). 5.13's `ManageRolesDialog.vue` is a SEPARATE, focused dialog (roles-only) per the UX spec — do NOT merge it into `UserFormDialog`. The Manage Roles dialog adds a "View Effective Permissions" link/preview that `UserFormDialog` does not have.
- `src/components/admin/DeactivateUserDialog.vue` — from 5.12. Unchanged by 5.13.
- `docs/ux-specification.md` §"Roles & Permissions Screen (/admin/roles) — Story 5.13" — the authoritative UX layout: header "Roles & Permissions", role table (Name, Category, Permissions count, Storage Quota, Assigned Users count), "View Permissions" expandable row action, permission matrix (rows = permissions module:action, columns = roles, cells = checkmark if granted, read-only), and the Manage Roles Dialog (multi-select of seeded roles, shows current assignments, "View Effective Permissions" link shows union, save updates `users.role_ids` and is audit-logged). Follow this layout exactly.

Key design decisions for the spec to resolve:

- **Manage Roles dialog — NEW dedicated component (DECIDED — user-approved 2026-08-04):** Build a NEW `src/components/admin/ManageRolesDialog.vue` (not a reuse of `UserFormDialog`). It shows the target user's name, a `q-select` multi-select of all seeded roles (pre-selected with current `role_ids`), a "View Effective Permissions" expandable section showing the union via `getAllUserPermissions`, and Save/Cancel. On save, call `usersStore.updateUser(userId, { role_ids: selectedIds })` (reuses the 5.12 `updateUser` function action which syncs the admin team and writes an audit log). Do NOT duplicate the team-sync or audit logic — it already lives in the server function.
- **"View Permissions" row action (AC3):** a read-only dialog or expandable panel showing the target user's assigned roles (chips) and the effective permission union (`getAllUserPermissions` output, sorted/grouped by module). Read-only — no save button. Implement as a separate `ViewPermissionsDialog.vue` (or an expansion panel) triggered from the UsersPage row, per the UX spec which lists "View Permissions" as a distinct row action.
- **`/admin/roles` page (AC4–AC6):** NEW `src/pages/admin/RolesPage.vue`. Role table columns: Name, Category, Permissions (count = `role.permissions.length`), Storage Quota (format via existing storage-quota formatting util — check `src/utils/` for a `format-storage`/quota formatter used by 5.3; if none, format GB inline), Assigned Users (count = computed client-side from `users-store.users` by counting rows whose `role_ids` includes the role id). "View Permissions" row action expands to show the permission matrix for that role. The permission matrix (AC6): UX spec says rows = permissions (module:action), columns = roles; for a per-role expansion, show that role's permissions as a sorted list grouped by module (simpler and matches "expandable per role"). RECOMMEND per-role expandable rows showing the permission list grouped by module, plus an optional "Show full matrix" toggle that renders the grid (rows=permissions, columns=roles) if the spec wants it. Keep it read-only.
- **Audit logging for role changes (AC7):** REUSE the existing 5.12 `updateUser` function action — it already writes an `audit_logs` row with `action: 'user_update'` and a `changes_json` before/after snapshot that includes the `role_ids` diff. Do NOT add a new `user_role_update` enum value (would require a schema change + function change for no functional gain — the `changes_json` already distinguishes a role-only change). The spec should confirm this and note that role changes are audited as `user_update` with the role diff in `changes_json`.
- **Assigned-user-count (AC4):** compute client-side from `users-store.users` (already fetched on UsersPage). For the RolesPage, ensure `users-store.fetchUsers()` has been called (or call it in `RolesPage.onMounted`) so the count is accurate. Note the 5.12 deferred item: `fetchUsers` caps at `Query.limit(500)` — acceptable for MVP village scale; the count is approximate above 500 users (deferred, see `deferred-work.md`).
- **Seed-roles upsert:** convert the `continue` skip (line 318-320) into an `updateRow` that overwrites `permissions`/`storage_quota`/`category` on the existing role row. Keep the `createRow` path for roles that don't exist yet. Log both branches ("Created" vs "Updated"). No data migration (greenfield project).
- **Read-only enforcement (AC5):** the RolesPage and permission matrix have NO create/edit/delete buttons. Add a note/banner: "Custom role creation is deferred to post-MVP" (per UX spec). The only write path is the Manage Roles dialog on UsersPage (which assigns existing roles to users — it does NOT create/edit roles).
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.13 ACs and Epic 5 story list
- docs/PRD.md — FR-19 (User Management and Account Administration: self-service signup NOT supported; admin-created accounts; users can change own password; email verification deferred); roles/permissions model
- docs/architecture.md — RBAC, roles/permissions model, `audit_logs` (§11.5), auth/session conventions
- docs/ux-specification.md — "Roles & Permissions Screen (/admin/roles) — Story 5.13" layout spec: role table (Name, Category, Permissions count, Storage Quota, Assigned Users count), "View Permissions" expandable row action, permission matrix (rows = permissions module:action, columns = roles, read-only), and Manage Roles Dialog (multi-select of seeded roles, current assignments, "View Effective Permissions" link, save updates `users.role_ids` and is audit-logged). Also the User Management Screen row-actions spec (Manage Roles, View Permissions).
- docs/implementation-artifacts/spec-5-12-user-management-crud-operations.md — 5.12 spec (PRIMARY continuity context: the `User Management` function `updateUser` action, `users-store.js` `fetchRoles`/`fetchUsers`/`updateUser`, `audit_logs` table + enum, the accepted admin password-reset scope addition in its Spec Change Log)
- docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md — 5.9 spec (settings-store/router-guard patterns, SSR-safe admin page conventions — reference for the new `/admin/roles` page)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules) — note the "Users data model" and roles/permissions technical decisions
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision, the 5.12 deferred items (dir-name space, 500-user cap), and the seed-roles upsert debt owned by 5.13 (from stories 5.2/5.3/5.4/5.7)
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms recommended implementation order (5.14 → 5.12 → 5.13 → 5.11) and 5.13's dependency (5.12)

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.12 introduces NO new permissions; user management is gated by the existing `*` (System Administrator) permission on the `/admin/users` route. The "Add User" button and row actions use the existing `isAdmin` computed.
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
- SSR-safe: any Appwrite TablesDB access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. FarmDashboardPage.vue, LearnersListPage.vue, FinanceDashboardPage.vue).
- Quasar components for all UI primitives (q-btn, q-input, q-select, q-dialog, q-chip, q-table, q-banner, q-rating, etc.). No raw HTML controls.
- 5.13 creates NO new Appwrite infrastructure (no new tables, no new columns, no new server function, no new audit enum values). It reuses the 5.12 `User Management` function's `updateUser` action, the `users-store`, the `audit_logs` table, and the `roles` table. The only new artifacts are: a NEW `/admin/roles` route + `src/pages/admin/RolesPage.vue`, a NEW `src/components/admin/ManageRolesDialog.vue`, a NEW `src/components/admin/ViewPermissionsDialog.vue` (or equivalent), and the `seed-roles.js` upsert change. The spec MUST include tasks for these plus the nav-entry addition.
- Pinia stores follow the existing options-store pattern. 5.13 REUSES `src/stores/users-store.js` (from 5.12) — do NOT create a new `roles-store.js`. The `users-store` already has `fetchRoles`/`fetchUsers`/`updateUser`; 5.13 only adds UI that calls them. No `auth-store.js` changes are required for 5.13.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Permission checks: 5.13 introduces NO new permissions. The new `/admin/roles` route uses the existing `*` (System Administrator) permission, matching `/admin/users`/`/admin/modules`. No new `requiresPermission` meta values are invented.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — no change needed for 5.13 (it already wipes all TablesDB tables including `audit_logs` per the 5.12 task). The spec should confirm no gap exists but does NOT need a task unless one is found.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.13 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.13:

- The UsersPage "Manage Roles" row action (currently a DISABLED placeholder from 5.12 with tooltip "Available in a future update") is now ENABLED and opens the NEW `ManageRolesDialog.vue` (AC1). The 5.12 Add/Edit/Deactivate/Reactivate flows are NOT broken.
- The "Manage Roles" dialog shows a multi-select of ALL seeded roles (from `users-store.fetchRoles`), pre-selected with the target user's current `role_ids`; on save it calls `usersStore.updateUser(userId, { role_ids })` which reuses the 5.12 `updateUser` server function action (AC2). The dialog does NOT duplicate team-sync or audit logic — that lives in the server function.
- The "Manage Roles" dialog includes a "View Effective Permissions" preview showing the union of the currently-selected roles' permissions via `getAllUserPermissions` (per UX spec).
- A "View Permissions" row action on UsersPage shows the target user's assigned roles and effective permission union read-only (AC3) — no save button, no write path.
- A NEW `/admin/roles` route exists with `requiresPermission: '*'` (System Administrator only), matching `/admin/users`/`/admin/modules` (AC4). A nav entry is added under the admin/settings group.
- `RolesPage.vue` lists all roles with columns: Name, Category, Permissions (count = `role.permissions.length`), Storage Quota, Assigned Users (count computed client-side from `users-store.users` by counting rows whose `role_ids` includes the role id) (AC4).
- The roles page is READ-ONLY for MVP (AC5): NO create/edit/delete role buttons. A "Custom role creation is deferred to post-MVP" note/banner is present. The only write path in the story is the Manage Roles dialog (assigning existing roles to users — not creating/editing roles).
- A permission matrix view exists on `/admin/roles` (AC6): expandable per role, showing that role's permissions grouped by module (and optionally a full role × permission grid toggle). Read-only.
- Role changes are audit-logged (AC7): the 5.12 `updateUser` function action writes an `audit_logs` row with `action: 'user_update'` and a `changes_json` before/after snapshot that includes the `role_ids` diff. NO new audit enum value is added — `user_update` is reused. The spec confirms this.
- `seed-roles.js` is upsert-capable: existing role rows (matched by `name`) are UPDATED (`permissions`/`storage_quota`/`category`) instead of skipped; new roles are still created (user decision 2026-08-04). Re-running `seed-roles.js` is idempotent. No data migration is required (greenfield project). The canonical role definitions are unchanged.
- NO new Appwrite infrastructure is created: no new tables, no new columns, no new server function, no new audit enum values, no new `.env` variables, no `FUNCTION_DEPLOYMENT.md` changes. 5.13 is purely UI + routing + seed-roles upsert.
- NO new `roles-store.js` is created — `users-store.js` (from 5.12) is reused for `fetchRoles`/`fetchUsers`/`updateUser`. No `auth-store.js` changes.
- NO new permissions are introduced; the `/admin/roles` route uses the existing `*` permission gate.
- All new dialogs/pages are SSR-safe (`isClient` guard before client-only `tables`/`functions` calls, matching existing admin pages) and use Quasar components + `<script setup>`.
- The 5.12 admin password-reset feature (commit `f47fc6c`, `resetUserPassword` action in `UserFormDialog.vue` edit mode) is NOT broken or removed — it is accepted/documented scope. 5.13 does not re-derive a conflicting password-reset design.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
