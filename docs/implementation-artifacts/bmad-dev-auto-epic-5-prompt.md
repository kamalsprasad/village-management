# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.9 → 5.14)

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
Story to implement THIS iteration: 5.9 — Module Management and Configuration
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-9-module-management-and-configuration.md

If the spec file already exists with status `draft`, resume it. If it exists with any other status, do NOT overwrite — HALT with blocking condition `spec already in progress/done; user decision required`.

## Epic 5 MVP Scope (do NOT implement deferred stories)

MVP stories, in dependency order (stories marked ✅ are done; ← THIS ITERATION marks the current target):

1. ✅ 5.1 Village Calendar - Global Calendar with Category Filtering (deps: Epic 1) — DONE 2026-07-28
2. ✅ 5.2 Village Calendar - Role-Based Event Creation and Editing (deps: 5.1) — DONE 2026-07-29
3. ✅ 5.3 Cloud Storage - Role-Based Storage Quotas and Personal Folders (deps: 1.10) — DONE 2026-07-30
4. ✅ 5.4 Cloud Storage - Shared Folders and Module-Based Access (deps: 5.3) — DONE 2026-07-31
5. ✅ 5.7 Vendors/Suppliers Management Module (deps: 2.2, 2.3, 3.8 — all done) — DONE 2026-08-01
6. 5.9 Module Management and Configuration (deps: all MVP previous) ← THIS ITERATION
7. 5.14 Authentication Completeness - Password Change and Reset (deps: 1.3, 1.11)
8. 5.12 User Management - CRUD Operations (deps: 1.4, 1.11)
9. 5.13 Role Assignment and Permissions Management UI (deps: 5.12)
10. 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12)
11. 5.10 System Completion - Final Dashboard Integration and Production Setup (deps: all MVP previous)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11.

## Story 5.9 Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver a Module Management and Configuration page that lets System Administrators enable or disable optional MVP modules (Farm, School, Vendors). Core modules (Residents, Households, Finance, Inventory, Calendar, Storage) are always enabled. Disabling an optional module hides its navigation section, routes, and dashboard widgets but preserves all underlying data. This story generalizes the basic `vendors_enabled` flag introduced in Story 5.7 into a single `modules_enabled` array in `village_settings`, and it produces a reusable module-selection component/composable that Story 5.11 will use in the Start Fresh wizard.

ACs (from docs/epics.md Story 5.9 — treat as authoritative):

1. Admin menu: System Administrators see a "Module Management" item in the Administration navigation section, linking to `/admin/modules`.
2. Module Management page (`/admin/modules`): Lists Core Modules (read-only, always enabled) and Optional Modules (toggleable). For each module show name, description, current status, toggle switch, and a "Configure" button where an existing settings page exists (e.g., Farm Settings, School Settings).
3. Enabling an optional module: its main navigation section appears (if the user has the relevant permission), its routes become accessible, and its dashboard widgets become visible.
4. Disabling an optional module: confirmation dialog explaining data is preserved; navigation section and routes are hidden/inaccessible, dashboard widgets hidden.
5. Module dependencies: show an informational warning when disabling a module that other enabled modules depend on. For MVP: Farm provides auto-events to Calendar; Vendors are selectable in Farm sales and Finance expenses. Disabling does not block the action, only warns.
6. First-time setup wizard updated with a "Select Modules" step — implementation of the wizard itself belongs to Story 5.11; 5.9 must produce a reusable module-selection UI piece (component or composable) that 5.11 can drop into the Start Fresh wizard without rework.
7. Settings persistence: toggling updates `village_settings.modules_enabled` via `settingsStore.updateSettings`; changes are reflected immediately in the UI after the settings store reloads.

Prerequisites confirmed done: Story 5.7 (Vendors module — `done` per `spec-5-7-vendors-suppliers-management-module.md` status `done`), Stories 5.1–5.4 (Calendar/Storage — `done`), and all Epic 2/3/4 stories (`done`). All confirmed via `docs/sprint-status.yaml`. No spec file exists yet for 5.9.

**Data model — greenfield project, no migration needed:** `village_settings.modules_enabled` is a string-array column already present in `server/scripts/setup-appwrite.js`. Story 5.7 also added a `vendors_enabled` boolean. For 5.9:

- Make `modules_enabled` the canonical source of truth for module toggles.
- Add `settingsStore` getters `farmEnabled`, `schoolEnabled`, and update `vendorsEnabled` to first check `modules_enabled`, falling back to legacy `vendors_enabled` for safety.
- Update `server/scripts/seed-village-settings.js` so the default `modules_enabled` includes all core modules plus `farm`, `school`, and `vendors`.
- Optionally deprecate `vendors_enabled` from new setups; the spec should document whether the column is removed from `setup-appwrite.js` or kept as a read-only fallback.

Continuity context from prior work (load the 5.7 spec's Auto Run Result and Design Notes for module conventions, plus 5.4 for route/store patterns):

- `src/stores/settings-store.js` — already exposes `modulesEnabled` getter. 5.9 adds per-module boolean getters and a helper to add/remove a module key from `modules_enabled` before calling `updateSettings`.
- `src/boot/router-guards.js` — already supports `requiresSetting: '<getterName>'` by checking `settingsStore[<getterName>]`. 5.9 adds `requiresSetting: 'farmEnabled'` / `'schoolEnabled'` / `'vendorsEnabled'` to the optional module routes.
- `src/modules/farm/router.js`, `src/modules/school/router.js`, `src/modules/vendors/router.js` — update route `meta` on all optional module routes to include the appropriate `requiresSetting`. Keep existing `requiresPermission` checks unchanged.
- `src/layouts/MainLayout.vue` — currently gates Vendors on `settingsStore.vendorsEnabled`. 5.9 gates the Agriculture, School, and Vendors expansion items on the corresponding module-enabled getter (in addition to existing permission checks). Core sections remain always visible.
- `src/router/routes.js` — add the new `/admin/modules` route under the main layout, gated on System Administrator permission.
- `src/pages/dashboard/DashboardPage.vue` — the Vendors widget is already gated on `vendorsEnabled`. 5.9 establishes the same gating pattern for any Farm/School dashboard widgets (hide when the module is disabled).
- `src/pages/settings/VillageSettingsPage.vue` — currently has an editable "Enabled Modules" q-select. 5.9 should remove that editable control (or make it read-only with a link to `/admin/modules`) so there is a single source of truth for module toggles.
- `server/scripts/setup-appwrite.js` — `village_settings.modules_enabled` already exists; no new table needed. Decide whether to keep or remove the `vendors_enabled` boolean column.
- `server/scripts/seed-village-settings.js` — update default `modules_enabled` to `['residents','households','dashboard','finance','inventory','calendar','storage','farm','school','vendors']`.
- Story 5.11 will reuse the module-selection UI, so build it as a reusable component (e.g., `src/components/admin/ModuleSelectionCard.vue`) or composable (`useModuleOptions`) that accepts a `v-model` array of enabled module keys.

Key design decisions for the spec to resolve:

- Module option registry: hardcoded array in a new `src/utils/module-registry.js` (or inline in settings-store) with core/optional flag, label, description, icon, route name for Configure, and dependencies. Only `farm`, `school`, and `vendors` are optional for MVP.
- Dependency warning map: informational only. Example: `farm -> ['calendar']`, `vendors -> ['farm','finance']`. Warnings do not block disabling.
- Toggle UX: q-toggle per optional module card, saved in batch via a "Save Changes" button on `/admin/modules` to avoid multiple settings writes.
- Reusable selection component: `ModuleSelectionGrid` or `useModuleOptions` that Story 5.11 can import. It should depend only on a `v-model` array, not on route-level state.
- Data preservation: disabling a module only hides UI; no data is deleted and foreign-key relationships remain valid.
- No migration: greenfield; adjust seed script and setup defaults only.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.9 ACs and Epic 5 story list
- docs/PRD.md — module management / optional module requirements (village settings, module enable/disable behavior)
- docs/architecture.md — Appwrite patterns, RBAC, data model conventions, module structure conventions
- docs/ux-specification.md — no module-management-specific screen specs exist; follow general UX patterns and existing module settings pages
- docs/implementation-artifacts/spec-5-7-vendors-suppliers-management-module.md — 5.7 spec (continuity context: established module patterns, vendor nav/routable setting, reusable components)
- docs/implementation-artifacts/spec-5-4-cloud-storage-shared-folders-and-module-based-access.md — 5.4 spec (route guards, store patterns, setup-appwrite.js conventions)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision and prior story deferred items
- docs/DATABASE_SCHEMA.md — existing schema documentation; 5.9 uses the existing `village_settings.modules_enabled` array (no new tables)
- docs/POST-MVP.md — confirm Guests/Equipment/Energy modules remain deferred and are not added to the MVP module toggle list

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.9 does not introduce new permissions; it gates existing module UI/routes on `modules_enabled` in addition to existing permission checks.
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
- 5.9 does not create new Appwrite tables; module toggles live in the existing `village_settings.modules_enabled` array.
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. Modify `src/stores/settings-store.js` only; no new Pinia store is required for this story.
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Permission checks in templates: use existing module permissions from `usePermissions` composable to gate UI, and `requiresPermission: '*'` for `/admin/modules`. Use `PermissionGuard` where appropriate.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — no changes required for 5.9; module toggle data lives in `village_settings`.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.9 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.9:

- `village_settings.modules_enabled` is the canonical module toggle list; `settingsStore.farmEnabled`, `schoolEnabled`, and `vendorsEnabled` return `true` when the module key is present in `modules_enabled` (with `vendorsEnabled` falling back to legacy `vendors_enabled` if needed).
- `/admin/modules` route exists, gated on System Administrator permission (`requiresPermission: '*'`). The page lists Core Modules as non-interactive and Optional Modules as toggleable cards with name, description, status, and a "Configure" button linking to the module's settings page where one exists.
- All optional module routes use `requiresSetting` meta: farm routes → `farmEnabled`, school routes → `schoolEnabled`, vendor routes → `vendorsEnabled`. Direct navigation to a disabled module route is redirected by `src/boot/router-guards.js`.
- `MainLayout.vue` Agriculture, School, and Vendors sections are gated on both the module-enabled getter and the existing permission check. When a module is disabled, its nav section and sub-items disappear.
- Disabling a module shows a confirmation dialog that explicitly states data is preserved. After saving, the navigation section hides immediately via reactive settings-store update.
- Dependency warnings appear before disabling a module when another enabled module depends on it (e.g., disabling Farm warns Calendar auto-events; disabling Vendors warns Farm sales/Finance expenses). The action is informational and not blocked.
- `server/scripts/seed-village-settings.js` default `modules_enabled` includes all core modules plus `farm`, `school`, and `vendors`.
- Guests, Equipment, and Energy modules do not appear in the optional module toggle list or module registry.
- A reusable module-selection component or composable is created and documented so Story 5.11 can reuse it in the Start Fresh wizard without changing its internals.
- `src/pages/settings/VillageSettingsPage.vue` no longer offers a separate editable "Enabled Modules" control that conflicts with `/admin/modules`.
- `DATABASE_SCHEMA.md` (repo root) documents `modules_enabled` already; confirm it is current. No new tables are required.
- The existing functionality of Farm, School, and Vendors modules is unchanged when enabled; only visibility/routability changes when disabled.

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
