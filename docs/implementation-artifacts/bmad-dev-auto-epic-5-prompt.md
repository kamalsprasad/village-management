# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.14 → 5.10)

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
Story to implement THIS iteration: 5.14 — Authentication Completeness - Password Change and Reset
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-14-authentication-completeness-password-change-and-reset.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. ✅ 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) — DONE 2026-07-30
4. ✅ 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3) — DONE 2026-07-31
5. ✅ 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done) — DONE 2026-08-01
6. ✅ 5.9 Module Management and Configuration (deps: all MVP previous) — DONE 2026-08-03
7. 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11) ← THIS ITERATION
8. 5.12 User Management - CRUD Operations (deps: 1.4, 1.11)
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12)
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.14 Specifics <<< CHANGE PER ITERATION >>>

Intent: Complete the authentication UX for MVP. Logged-in users can change their own password from the Profile page (current password, new password, confirm). Unauthenticated users who forgot their password can request a reset email from the login screen and set a new password via a dedicated `/auth/reset-password` page reached through the email link. All flows use the Appwrite Account SDK directly (`Account.updatePassword`, `Account.createRecovery`, `Account.updateRecovery`) — no new Appwrite Function, table, or server-side component is required. Email verification and self-service signup remain out of scope.

ACs (from docs/epics.md Story 5.14 — treat as authoritative):

1. ProfilePage "Change Password" button enabled: opens a dialog (current password, new password, confirm new password).
2. Change password calls Appwrite `Account.updatePassword`; validates current password; enforces a minimum length.
3. On success: success notification, dialog closes, session preserved.
4. AuthPage login form: "Forgot password?" link.
5. Forgot password flow: user enters email → Appwrite `Account.createRecovery` sends reset email → user clicks email link → sets new password on a `/auth/reset-password` page.
6. `/auth/reset-password` page: validates the token from the URL, accepts new password + confirmation, calls `Account.updateRecovery`.
7. Email verification: deferred to post-MVP (admin-issued initial passwords trusted).
8. Self-service signup: NOT in scope (admin-created accounts only) — confirmed by PRD FR-19.

Prerequisites confirmed done: Story 1.3 (Authentication System with Email/Password — `done`), Story 1.11 (User Profile and Storage Quota Display — `done`). Both confirmed via `docs/sprint-status.yaml`. Story 5.14 has NO hard dependency on 5.9, 5.12, or any other unfinished Epic 5 story — it can be implemented independently (per `docs/planning-artifacts/sprint-change-proposal-2026-07-28.md` recommended order: 5.14 → 5.12 → 5.13 → 5.11). No spec file exists yet for 5.14.

**Data model — no schema change:** Passwords live in Appwrite Auth (the Account service), not in `village_settings` or any TablesDB collection. No new tables, columns, or migrations. No new Appwrite Function is required — `Account.updatePassword`, `Account.createRecovery`, and `Account.updateRecovery` are all client-side Account SDK calls available via `src/boot/appwrite.js` (`account`).

Continuity context from prior work (load the 1.3/1.11 specs for auth patterns, plus the files below):

- `src/pages/AuthPage.vue` — standalone auth layout (no MainLayout). Conditionally renders `CreateAdminForm` (no users) or `LoginForm` (users exist). 5.14 adds a "Forgot password?" affordance here (inside `LoginForm`).
- `src/components/auth/LoginForm.vue` — email/password form, uses `authStore.login`, `useErrorHandler` for notifications. 5.14 adds a "Forgot password?" link that opens a recovery dialog (email input → `account.createRecovery`) OR navigates to a small recovery page. Spec decides: inline dialog vs. separate route.
- `src/pages/profile/ProfilePage.vue` — already has a disabled "Change Password" button with a STALE tooltip ("Password change functionality will be available in Epic 2"). 5.14 enables this button, wires it to a change-password dialog, and removes/updates the stale tooltip.
- `src/stores/auth-store.js` — options-store pattern with `useErrorHandler`. Exposes `user`, `isLoggedIn`, `login`, `logout`, `checkSession`. 5.14 adds `changePassword(oldPassword, newPassword)` and `requestPasswordReset(email, resetUrl)` and `resetPassword(userId, secret, newPassword)` actions wrapping the Appwrite Account calls, returning `{ success, error }` like existing actions.
- `src/boot/appwrite.js` — exports `account` (Appwrite Account instance). All 5.14 SDK calls use this.
- `src/router/routes.js` — `/auth` is a top-level no-layout route. 5.14 adds `/auth/reset-password` as a sibling no-layout route with NO `requiresAuth` (public). The router guard in `src/boot/router-guards.js` already passes through routes without `requiresAuth`.
- `src/boot/router-guards.js` — no change needed; public routes (no `requiresAuth` meta) already pass through. Confirm the reset-password route is not caught by the first-run/setup redirect.
- `src/composables/useErrorHandler.js` — reuse `notifyError`/`notifySuccess` for all notifications; integrate form validation with the error handler per project convention.

Key design decisions for the spec to resolve:

- **Recovery redirect URL:** `Account.createRecovery` requires a `URL` argument — the page the user lands on after clicking the email link. Introduce a new `VITE_APP_PUBLIC_URL` env var holding the app's public base URL (e.g. `http://localhost:9000` for dev, `https://village.example.com` for prod) and derive the reset URL as `${VITE_APP_PUBLIC_URL}/auth/reset-password`. Add `VITE_APP_PUBLIC_URL` to `.env.example` with the dev default. This var is reusable for any future absolute-URL needs (e.g. email links in other stories).
- **Forgot-password UX:** inline dialog on the login form vs. a separate `/auth/forgot-password` route. Recommend inline dialog (email only) for MVP simplicity, reusing the q-dialog pattern.
- **Change-password validation:** enforce a minimum password length (Appwrite default is 8; confirm against existing `createAdmin` usage). Validate "new password === confirm". The "current password" field — Appwrite `Account.updatePassword` accepts an optional `oldPassword`; pass it so Appwrite validates the current password server-side. Do NOT re-implement current-password checking client-side.
- **Session preservation:** after `updatePassword`, the existing session remains valid (Appwrite keeps the session). Do not force re-login. Confirm in the spec's verification steps.
- **Reset-password page SSR safety:** `/auth/reset-password` is public and SSR-rendered. Read the `userId` and `secret` (token) from the route query. All `account.updateRecovery` calls must run on the client only (guard with `isClient` ref + `onMounted`, matching `AuthPage.vue`). Show a clear error if the token is missing/expired.
- **No new permissions:** password change/reset are self-service (the logged-in user changes their OWN password; recovery is unauthenticated). No new RBAC permissions, no `requiresPermission` on any 5.14 route.
- **Stale tooltip cleanup:** remove the "available in Epic 2" tooltip on the ProfilePage Change Password button when enabling it.
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.14 ACs and Epic 5 story list
- docs/PRD.md — FR-19 (User Management and Account Administration: self-service signup NOT supported; users can change own password; forgot-password flow; email verification deferred)
- docs/architecture.md — Appwrite Account SDK patterns, RBAC, auth/session conventions
- docs/ux-specification.md — no auth-specific screen specs exist; follow general UX patterns and the existing AuthPage/ProfilePage
- docs/implementation-artifacts/spec-5-9-module-management-and-configuration.md — 5.9 spec (continuity context: most recent Epic 5 story, settings-store/router-guard patterns, SSR-safe page conventions)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision and prior story deferred items
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms recommended implementation order (5.14 → 5.12 → 5.13 → 5.11) and that 5.14 has no hard dependency on unfinished Epic 5 stories

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.14 introduces NO new permissions; password change is self-service (logged-in user changes own password) and recovery is unauthenticated.
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
- 5.14 does not create new Appwrite tables or Functions; all password flows use the client-side Appwrite Account SDK (`account.updatePassword`, `account.createRecovery`, `account.updateRecovery`) from `src/boot/appwrite.js`.
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. Add the new password actions to `src/stores/auth-store.js`; no new Pinia store is required for this story.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Permission checks: 5.14 introduces NO new permissions. Password change is self-service (the logged-in user changes their own password); recovery is unauthenticated. The `/auth/reset-password` route must be PUBLIC (no `requiresAuth`).
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — no changes required for 5.14; passwords live in Appwrite Auth, not in TablesDB.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.14 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.14:

- The ProfilePage "Change Password" button is enabled and opens a dialog with current-password, new-password, and confirm-password fields. The stale "available in Epic 2" tooltip is removed.
- Change-password calls `Account.updatePassword` with the old password (so Appwrite validates the current password server-side) and the new password; minimum length is enforced; on success a success notification shows, the dialog closes, and the user stays logged in (session preserved — no forced re-login).
- The LoginForm shows a "Forgot password?" link. Clicking it lets the user enter an email and calls `Account.createRecovery` with an environment-configurable reset URL; a success notification tells the user to check their email.
- A public `/auth/reset-password` route exists (no `requiresAuth`, no MainLayout). It reads `userId` and `secret` from the URL query, accepts a new password + confirmation, and calls `Account.updateRecovery`. Missing/expired tokens show a clear, user-friendly error.
- No new Appwrite Function, table, column, or RBAC permission is introduced.
- No self-service signup and no email verification are implemented (both confirmed out of scope per PRD FR-19).
- All new pages/dialogs are SSR-safe (`isClient` guard before client-only `account` calls, matching `AuthPage.vue`) and use Quasar components + `<script setup>`.
- The recovery redirect URL is derived from a `VITE_APP_PUBLIC_URL` env var (not hardcoded to localhost) and `VITE_APP_PUBLIC_URL` is documented in `.env.example` with the dev default.
- The existing login, logout, create-admin, and session-check flows are not broken; the only AuthPage/LoginForm change is the added "Forgot password?" affordance.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
