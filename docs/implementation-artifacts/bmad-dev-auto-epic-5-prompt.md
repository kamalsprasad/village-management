# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.12 → 5.10)

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
Story to implement THIS iteration: 5.12 — User Management - CRUD Operations
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-12-user-management-crud-operations.md

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
8. 5.12 User Management - CRUD Operations (deps: 1.4, 1.11) ← THIS ITERATION
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12)
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.12 Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver admin-driven user CRUD for MVP. A System Administrator can create new user accounts (name, email, admin-set initial password, multi-role assignment, optional resident link), edit users (name, email, roles, resident link), and soft-deactivate/reactivate users (never hard-delete, to preserve audit history). Deactivation blocks login. Validation prevents self-lockout and locking out the last System Administrator. All create/edit/deactivate/reactivate operations are audit-logged. Self-service signup remains out of scope (PRD FR-19). This is the first Epic 5 story that requires a server-side Appwrite Function and a schema migration — unlike 5.14 which was pure client-side Account SDK work.

ACs (from docs/epics.md Story 5.12 — treat as authoritative):

1. UsersPage (`/admin/users`) gains "Add User" button (visible to System Administrator only).
2. Add User form: name, email, initial password (admin-set), role assignment (multi-select), optional resident_id link (search/select from residents).
3. Creating user calls Appwrite Account creation (server-side function with admin scope) and inserts row in `users` table with `role_ids`.
4. New user automatically added to `village_administrators` team ONLY if assigned the System Administrator role.
5. Edit User: edit name, email, role assignments, resident_id link.
6. Deactivate User: soft-deactivate (sets `active=false`, blocks login) — no hard-delete to preserve audit history.
7. Reactivate deactivated user.
8. UsersPage shows active/deactivated status filter.
9. Cannot deactivate own account (validation prevents self-lockout).
10. Cannot deactivate the last remaining System Administrator (validation prevents admin lockout).
11. All operations audit-logged (who/when/what changed).

Prerequisites confirmed done: Story 1.4 (RBAC Foundation — `done`), Story 1.11 (User Profile and Storage Quota Display — `done`). Both confirmed via `docs/sprint-status.yaml`. Story 5.12 has NO hard dependency on any other unfinished Epic 5 story — it can be implemented independently (per `docs/planning-artifacts/sprint-change-proposal-2026-07-28.md` recommended order: 5.14 → 5.12 → 5.13 → 5.11; 5.14 is now DONE 2026-08-03). No spec file exists yet for 5.12.

**Data model — schema change REQUIRED (unlike 5.14):**

- `users` table currently has `email`, `name`, `resident_id` (relationship→residents), `role_ids` (relationship→roles, manyToMany), `storage_quota`. It has NO `active` column. 5.12 adds an `active` boolean column (default `true`, required) for soft-deactivation. Add it to the `users` schema in `server/scripts/setup-appwrite.js`. The setup script is idempotent and self-healing (handles 409 "already exists", repairs `failed` columns — see `createColumn`/`getColumn` helpers), so re-running `setup-appwrite.js` on an existing deployment will add the `active` column without dropping data. The spec MUST include a task to add the column to `tableSchemas.users` and a verification note that existing deployments must re-run the setup script.
- `audit_logs` collection does NOT exist yet. `docs/architecture.md` §11.5 references it ("Detailed audit logs stored in `audit_logs` collection with write-only access for service") but it was never added to `server/scripts/setup-appwrite.js`. 5.12 creates it. Schema: `actor_user_id` (relationship→users, manyToOne), `action` (string enum: `user_create`/`user_update`/`user_deactivate`/`user_reactivate`), `target_user_id` (relationship→users, manyToOne), `changes_json` (string, size 2000 — JSON snapshot of before/after), `created_at` (datetime, auto). **Permissions (DECIDED — user-approved 2026-08-03):** read restricted to System Administrator (`Permission.read(Role.team('village_administrators')` or the project's equivalent admin-read pattern), create/update/delete via the server function's API key ONLY. This table is NOT client-writable — do NOT grant `create("any")`/`update("any")`/`delete("any")` (unlike every other table in the project, which uses the loose platform-wide `any` permissions with a noted security debt in `deferred-work.md`). Audit logs are the one table where client-writability would directly defeat their purpose; this is an intentional, contained deviation from the project-wide pattern. The spec MUST add this table to `tableSchemas` in `setup-appwrite.js` with these tightened permissions.
- No changes to Appwrite Auth itself — Appwrite manages the auth user records; 5.12 keeps the `users` table row in sync with the Appwrite Auth user via the new server function.

**Server-side Appwrite Function — REQUIRED (new):**

The client SDK CANNOT create/disable users on behalf of an admin — only the logged-in user can manage their own account. 5.12 requires a new server-side Appwrite Function using `node-appwrite` with an admin-scope API key, following the established pattern in `server/functions/Check Users Exist/src/main.js` (which already uses `Client().setKey(apiKey)` + `Users` + `Teams` SDKs). Create a NEW dedicated function (do NOT overload `Check Users Exist` — separation of concerns). Suggested path: `server/functions/User Management/src/main.js`. Suggested env var: `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT` (add to `.env.example` and update `appwrite_setup/FUNCTION_DEPLOYMENT.md`).

Function actions (dispatched by a `body.action` field, matching the `Check Users Exist` pattern):

- `createUser` — `users.create({ userId: ID.unique(), email, password, name })` (node-appwrite Users API creates the Auth user with an admin-set password), then `tables.createRow` in the `users` table with `role_ids`/`resident_id`/`active=true`, then conditionally `teams.createMembership({ teamId: 'village_administrators', userId, email, name })` ONLY if `role_ids` includes the System Administrator role. Returns `{ success, userId, error }`.
- `updateUser` — `users.updateName`/`users.updateEmail` (node-appwrite) for name/email changes, `tables.updateRow` for `role_ids`/`resident_id`/`name`/`email` sync, and sync `village_administrators` team membership (add if System Admin role added, remove membership if removed). Returns `{ success, error }`.
- `deactivateUser` — `tables.updateRow` setting `active=false`, AND `users.deleteSessions(userId)` (node-appwrite) to invalidate all active sessions so the user is immediately blocked, AND remove from `village_administrators` team if applicable. Server-side validation: reject if `userId === body.actorUserId` (self-lockout, AC9) OR if the target is the last active System Administrator (AC10 — count active users whose `role_ids` includes the System Admin role, excluding the target; if zero, reject). Returns `{ success, error }`.
- `reactivateUser` — `tables.updateRow` setting `active=true`; re-add to `village_administrators` team if they hold the System Administrator role. Returns `{ success, error }`.
- All actions write an `audit_logs` row (`tables.createRow` with `actor_user_id`, `action`, `target_user_id`, `changes_json`).

**Login blocking (AC6 "blocks login"):** Deactivation blocks login via TWO mechanisms: (1) the function calls `users.deleteSessions(userId)` to kill existing sessions, and (2) the client login flow checks `users.active` after a successful Appwrite `createEmailPasswordSession` and calls `account.deleteSession('current')` + rejects if `active === false` (defense-in-depth, matching the project's existing client-side RBAC pattern). The spec MUST add this `active` check to `authStore.login` (or `checkSession`) — do NOT rely on client-side alone, but also do NOT skip it. This is the recommended approach; the spec may refine it.

Continuity context from prior work (load the 1.4 spec for RBAC patterns + the 5.14 spec for the most recent auth-store conventions, plus the files below):

- `src/pages/admin/UsersPage.vue` — current read-only user list (Story 1.4 baseline). Has a STALE description "Role editing will be available in Epic 2." (line 6) — 5.12 must remove/update this, add the "Add User" button, status filter, and row actions (Edit, Deactivate/Reactivate). The "Manage Roles" row action belongs to 5.13 (do NOT implement it this iteration — leave a placeholder or omit). Reuse the existing `fetchUsers`/`getRoleColor`/role-chip rendering.
- `src/stores/auth-store.js` — options-store pattern with `useErrorHandler`. 5.14 added `changePassword`/`requestPasswordReset`/`resetPassword` actions returning `{ success, error }`. 5.12 adds a `users` management concern. DECISION for the spec: add user-management actions (`createUser`, `updateUser`, `deactivateUser`, `reactivateUser`, `fetchUsers`) to `auth-store.js` OR create a NEW `src/stores/users-store.js` Pinia store. RECOMMEND a new `users-store.js` (separation of concerns — `auth-store` is about the CURRENT user's session; `users-store` is admin management of ALL users). The new store calls the `functions.createExecution` API with `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT`, following the `checkHasUsers` pattern in `auth-store.js` (lines 76-131). Also add the `active` check to `authStore.login`/`checkSession`.
- `src/boot/appwrite.js` — exports `account`, `functions`, `tables`. The new users-store uses `functions` (to invoke the User Management function) and `tables` (to list/fetch users for the table view).
- `src/router/routes.js` — `/admin/users` already exists with `requiresPermission: '*'` (System Admin only). No route change needed for 5.12. The `/admin/roles` route belongs to 5.13 (do NOT add it this iteration).
- `src/components/inputs/ResidentSearchInput.vue` — EXISTING reusable resident search/select component (q-select with debounced search, `option-value="id"`, `option-label="fullName"`). REUSE this for the optional `resident_id` link in the Add/Edit User form — do NOT reinvent.
- `src/stores/residents-store.js` — has `fetchResidents`/`fetchResidentById`. `ResidentSearchInput.vue` queries `tables` directly (does not depend on this store), so the user form can use the component standalone.
- `src/components/profile/ChangePasswordDialog.vue` (from 5.14) — reference for the password-field validation pattern (min 8 chars, visibility toggle, `maxlength="265"`). Reuse the same min-8 rule for the Add User "initial password" field.
- `src/composables/usePermissions.js` / `src/utils/permissions.js` — `isAdmin`/`hasPermission('*')` already gates `/admin/users`. 5.12 introduces NO new permissions (user management is gated by the existing `*` permission on the route). The "Add User" button visibility uses the existing `isAdmin` computed.
- `server/functions/Check Users Exist/src/main.js` — the canonical server-side function pattern (node-appwrite `Client().setKey()`, `Users`/`Teams` SDKs, `body.action` dispatch, `res.json` returns, `village_administrators` team self-healing). The new User Management function follows this structure.
- `server/scripts/setup-appwrite.js` — `tableSchemas` object. Add the `active` column to `tableSchemas.users` and add a new `audit_logs` entry. The script's `createColumn` helper handles 409 + repairs `failed` columns, so re-running is safe on existing deployments.
- `appwrite_setup/FUNCTION_DEPLOYMENT.md` — deployment docs for existing functions. Add a section for the new User Management function (env vars, deploy command, required API-key scopes: `users.read`/`users.write`/`teams.read`/`teams.write`/`database.read`/`database.write`).

Key design decisions for the spec to resolve:

- **New `users-store.js` vs extending `auth-store.js`:** RECOMMEND a new `src/stores/users-store.js` Pinia store (options-store pattern, `useErrorHandler`) for admin user-management actions, keeping `auth-store` focused on the current session. The only `auth-store` change is the `active` check in `login`/`checkSession`.
- **Deactivation mechanism:** set `users.active=false` + `users.deleteSessions(userId)` (server function) + client-side `active` check in `login`/`checkSession` (defense-in-depth). Do NOT use Appwrite's user-status/verification flags — `deleteSessions` + the `active` column is sufficient for MVP and matches the soft-deactivate AC. The spec should confirm this.
- **Email change (AC5):** uses `users.updateEmail` (node-appwrite, server-side). Existing sessions remain valid (matches 5.14's session-preservation stance). Note in the spec that email is the login identifier; changing it does NOT force re-login.
- **Initial password (AC2):** `users.create({ ..., password })` (node-appwrite) accepts an admin-set password. Enforce min 8 chars client-side (matching `ChangePasswordDialog.vue`). Do NOT force first-login password change for MVP (admin-issued initial passwords trusted — consistent with PRD FR-19's "email verification deferred" stance).
- **"Last System Administrator" validation (AC10):** perform server-side in the `deactivateUser` function action (authoritative): count active users whose `role_ids` includes the System Administrator role, excluding the target; if zero, reject with a clear error. Add a client-side pre-check in the dialog for UX (disable the Deactivate button with a tooltip), but the server check is the source of truth.
- **"Cannot deactivate self" (AC9):** compare `target.$id === authStore.user.$id` client-side (disable button) AND server-side in the function (`userId === body.actorUserId` → reject).
- **Audit log shape:** `audit_logs` row per operation with `actor_user_id`, `action` (enum), `target_user_id`, `changes_json` (JSON string of before/after diff), `created_at`. The function writes these; the client never writes audit logs directly (table is not client-writable). Admin can view audit logs — but a dedicated audit-log viewer page is NOT required by 5.12's ACs (AC11 only requires that operations ARE logged). A future story may add a viewer; for 5.12 the rows just need to exist and be queryable via the Appwrite console. The spec should confirm this scope boundary.
- **"Manage Roles" row action:** belongs to 5.13. Do NOT implement the role-assignment dialog this iteration. The UsersPage shows a DISABLED "Manage Roles" row action (greyed out with a tooltip "Available in a future update") as a visual placeholder for 5.13 — do NOT omit it entirely, and do NOT wire it to a working dialog. Role multi-select WITHIN the Add/Edit User form IS in 5.12 scope (AC2/AC5).
- **Stale tooltip cleanup:** REMOVE the "Role editing will be available in Epic 2." description on `UsersPage.vue` (line 6) entirely — same cleanup pattern as 5.14's ProfilePage tooltip removal. Do not replace it with a different stale message.
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.12 ACs and Epic 5 story list
- docs/PRD.md — FR-19 (User Management and Account Administration: self-service signup NOT supported; admin-created accounts; users can change own password; email verification deferred)
- docs/architecture.md — Appwrite Users/Teams SDK patterns (§11.5 audit_logs), RBAC, auth/session conventions, server-side service API-key patterns
- docs/ux-specification.md — User Management Screen (/admin/users) layout spec: header with "Add User" button, filter bar (search + Active/Deactivated/All status filter), user table columns (Name, Email, Roles chips, Resident Link, Status, Created, Actions), Add/Edit User dialog fields, Deactivate confirmation dialog text and validation rules
- docs/implementation-artifacts/spec-5-14-authentication-completeness-password-change-and-reset.md — 5.14 spec (continuity context: most recent Epic 5 story, auth-store action patterns returning `{ success, error }`, password-field validation conventions, stale-tooltip cleanup pattern)
- docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md — 5.9 spec (settings-store/router-guard patterns, SSR-safe admin page conventions)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules) — note the "Admin user creation" and "Users data model" technical decisions
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision and prior story deferred items
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms recommended implementation order (5.14 → 5.12 → 5.13 → 5.11) and 5.12's dependencies (1.4, 1.11)

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
- 5.12 DOES create new Appwrite infrastructure: a new `active` column on the `users` table, a new `audit_logs` table, and a new server-side `User Management` Appwrite Function. These are the first schema/function additions in Epic 5 (5.1–5.14 added none). The spec MUST include tasks for all three plus the `.env.example`/`FUNCTION_DEPLOYMENT.md` updates.
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. RECOMMEND a new `src/stores/users-store.js` for admin user-management actions (calling `functions.createExecution` with `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT`, following the `checkHasUsers` pattern in `auth-store.js`); the only `auth-store.js` change is adding the `active` check to `login`/`checkSession`.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Permission checks: 5.12 introduces NO new permissions. User management is gated by the existing `*` (System Administrator) permission already on the `/admin/users` route. No new `requiresPermission` meta is added.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — review whether it should also wipe `audit_logs` rows; if it already wipes all TablesDB tables it will cover `audit_logs` automatically once the table is registered in `setup-appwrite.js`. The spec should confirm and add a task only if a gap exists.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.12 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.12:

- The UsersPage "Add User" button is visible ONLY to System Administrators (existing `*` permission gate on `/admin/users` + `isAdmin` computed). The stale "Role editing will be available in Epic 2." description (UsersPage.vue line 6) is removed/updated.
- The Add User form has name, email, initial password (min 8 chars, matching the `ChangePasswordDialog.vue` validation pattern), role multi-select (from seeded roles), and an optional resident_id link using the existing `ResidentSearchInput.vue` component (not a reinvented search).
- Creating a user calls the new server-side `User Management` Appwrite Function (`functions.createExecution` with `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT`), which uses `node-appwrite` with an admin-scope API key to call `users.create` (Appwrite Auth) + `tables.createRow` (users table with `role_ids`/`resident_id`/`active=true`) + conditionally `teams.createMembership` for `village_administrators` ONLY when the System Administrator role is assigned (AC4). The client SDK does NOT call `account.create` for admin user creation.
- Edit User updates name, email (via `users.updateEmail` server-side), role assignments, and resident_id link; `village_administrators` team membership is synced when the System Administrator role is added/removed.
- Deactivate sets `users.active=false` AND calls `users.deleteSessions(userId)` (server-side) to immediately invalidate sessions; the client login flow (`authStore.login`/`checkSession`) ALSO checks `users.active` and rejects a deactivated user (defense-in-depth). No hard-delete occurs (AC6).
- Reactivate sets `users.active=true` and re-adds to `village_administrators` if the System Administrator role is held.
- The UsersPage shows an active/deactivated status filter (AC8) and a Status column.
- Self-deactivation is blocked both client-side (disabled button when `target.$id === authStore.user.$id`, AC9) and server-side (function rejects `userId === actorUserId`).
- Last-System-Administrator deactivation is blocked server-side (function counts active System Administrator users excluding the target; rejects if zero, AC10) AND client-side (disabled button with tooltip for UX).
- Every create/update/deactivate/reactivate operation writes an `audit_logs` row (actor_user_id, action, target_user_id, changes_json, created_at) via the server function (AC11). The `audit_logs` table is NOT client-writable (admin-read + service-write only — NO `create("any")`/`update("any")`/`delete("any")`, an intentional deviation from the project-wide loose-permissions pattern, user-approved 2026-08-03) to prevent tampering.
- The `users` table schema in `server/scripts/setup-appwrite.js` has a new `active` boolean column (default true, required); the `audit_logs` table is added to `tableSchemas`. Re-running `setup-appwrite.js` on an existing deployment adds both without data loss (idempotent 409 handling).
- `VITE_APPWRITE_FUNCTION_USER_MANAGEMENT` is documented in `.env.example` and `appwrite_setup/FUNCTION_DEPLOYMENT.md` has a deployment section for the new function (env vars, deploy command, required API-key scopes).
- No self-service signup is implemented (confirmed out of scope per PRD FR-19). The "Manage Roles" row-action dialog belongs to 5.13 and is NOT implemented this iteration — the UsersPage shows a DISABLED "Manage Roles" row action (greyed out with a "Available in a future update" tooltip) as a placeholder, not a working dialog. Role multi-select WITHIN the Add/Edit User form IS in scope.
- All new dialogs/pages are SSR-safe (`isClient` guard before client-only `tables`/`functions` calls, matching existing admin pages) and use Quasar components + `<script setup>`.
- The existing login, logout, create-admin (first-user), session-check, and 5.14 password-change/reset flows are not broken; the only `auth-store.js` behavioral change is the added `active` check in `login`/`checkSession`.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
