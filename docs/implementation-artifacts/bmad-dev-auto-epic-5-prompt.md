# /bmad-dev-auto Prompt — Epic 5 Remaining Stories (5.7 → 5.14)

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
Story to implement THIS iteration: 5.7 — Vendors/Suppliers Management Module
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-7-vendors-suppliers-management-module.md

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

## Story 5.7 Specifics <<< CHANGE PER ITERATION >>>

Intent: A Finance Manager can track vendors and suppliers (buyers and sellers) with a full CRUD vendors module — vendor list, add/edit vendor form (name, type, business type, contact info, payment terms, quality rating), vendor detail page with transaction history and performance metrics, vendor selection integration into farm sales (buyer dropdown) and finance expenses (vendor dropdown), automatic vendor transaction history updates, and a vendors dashboard widget. This is a new top-level module (`src/modules/vendors/`) with its own nav section, routes, store, and RBAC permissions.

ACs (from docs/epics.md Story 5.7 — treat as authoritative):

1. Vendors module enabled via settings.
2. Vendors list, "Add Vendor" form: name, vendor type (Supplier/Buyer/Both), business type, contact info, payment terms, quality rating.
3. Vendor detail page: transaction history, performance metrics.
4. Vendor selection integration: Farm sales buyer dropdown, Finance expenses vendor dropdown.
5. Vendor transaction history automatically updated.
6. Vendors dashboard widget.

Prerequisites confirmed done: Story 2.2 (expense recording — `done`), Story 2.3 (admin-configurable categories — `done`), Story 3.8 (farm sales with finance+inventory integration — `done`). All confirmed via docs/sprint-status.yaml. No spec file exists yet for 5.7.

**AC1 — "enabled via settings" interpretation (user-confirmed 2026-07-31):** 5.7 implements a basic settings flag that gates the Vendors module nav/routes. This is a simple boolean toggle in `village_settings` (e.g. `vendors_enabled` column, default `true`) checked by `settingsStore` and used in `MainLayout.vue` / route guards. Story 5.9 (Module Management) will later generalize this into the full Module Management page with toggle UI for all optional modules (Farm, School, Vendors). 5.7 does NOT build the `/admin/modules` page — that is 5.9 scope. The toggle for Vendors in 5.7 is a settings-store flag only, not a UI page.

**Data model — user-confirmed 2026-07-31:** This is a fresh install / greenfield project. No data migration is needed. Replace the free-text `vendor` field on `finance_transactions` with a `vendor_id` FK relationship to the new `vendors` table. Wire the existing `farm_sales.buyer_id` and `buyer_type` columns to the vendors table (buyer_type becomes `'vendor'` when a vendor is selected, `'external'` for ad-hoc buyers). The existing `buyer_name` on `farm_sales` remains as a denormalized display field. Old sample-data rows that used the free-text `vendor` field will be re-seeded (sample data composables will be updated to use vendor IDs).

Continuity context from prior work (load the 5.4 spec's Auto Run Result and Design Notes for established patterns):

- `src/modules/farm/` — the Farm module is the most recent full-module example (Epics 3 + 5.4). It has `pages/`, `components/`, `stores/farm-store.js`, `router.js`, `utils/`. 5.7 follows the same structure under `src/modules/vendors/`.
- `src/modules/farm/stores/farm-store.js` — large Pinia options-store with `useErrorHandler`, CRUD actions, getters, cross-module integration (calls `useFinanceStore`). 5.7's `vendors-store.js` follows the same pattern but is simpler (no three-way integration). The store should have `fetchVendors`, `fetchVendorById`, `createVendor`, `updateVendor`, `deleteVendor`, `fetchVendorTransactions` (aggregates finance transactions + farm sales by vendor_id).
- `src/modules/farm/router.js` — route definitions with `requiresAuth` + `requiresPermission` guards. 5.7 adds `/vendors`, `/vendors/add`, `/vendors/:id`, `/vendors/:id/edit` routes with `vendors:read` / `vendors:write` permissions.
- `src/modules/finance/components/TransactionForm.vue` — the expense form currently has a free-text `vendor` q-input (lines 338-345, formData.vendor at line 492, submitData.vendor at line 839). 5.7 replaces this with a vendor picker (q-select with filterable dropdown of vendors, plus an "ad-hoc" free-text fallback option). The form submits `vendor_id` (FK to vendors table) instead of `vendor` (free-text string).
- `src/modules/finance/stores/finance-store.js` — `createTransaction`/`updateTransaction` currently set `data.vendor = transactionData.vendor || null` (lines 1076, 1199). 5.7 changes these to set `data.vendor_id = transactionData.vendor_id || null` and removes the `data.vendor` line.
- `src/modules/farm/components/RecordSaleDialog.vue` — the farm sale form has a `buyer_name` q-input (line 49-55). 5.7 adds an optional vendor picker (q-select) alongside or replacing the buyer_name field. When a vendor is selected, `buyer_id` is set to the vendor's `$id`, `buyer_type` to `'vendor'`, and `buyer_name` is auto-populated from the vendor's name. When no vendor is selected (ad-hoc buyer), `buyer_type` stays `'external'`, `buyer_id` stays empty, and `buyer_name` is the free-text input.
- `src/modules/farm/stores/farm-store.js` — `recordSale` (around line 2798-2805) currently hard-codes `buyer_type: 'external'`, `buyer_id: ''`. 5.7 updates this to use the form's `buyer_id` and `buyer_type` values from the vendor picker.
- `server/scripts/setup-appwrite.js` — `finance_transactions` table has a `vendor` string column (line 744). 5.7 replaces this with a `vendor_id` relationship column (manyToOne → `vendors`). `farm_sales` table already has `buyer_type` (enum) and `buyer_id` (string) columns (lines 941-945). 5.7 changes `buyer_id` to a relationship column (manyToOne → `vendors`) or keeps it as a string and sets it to the vendor `$id` — choose and document. A new `vendors` table is created following the existing `tableSchemas`/`createTable` pattern.
- `server/scripts/seed-roles.js` — all roles are defined with `permissions` arrays and `storage_quota`. 5.7 adds new `vendors:read` and `vendors:write` permissions to appropriate roles: Finance Manager (read+write), System Administrator (\*), Village Head (read), Deputy Village Head (read), Council Member (read). Farm Manager gets `vendors:read` (can select buyers in farm sales). Other roles do not get vendor access by default.
- `src/layouts/MainLayout.vue` — nav sections for Farm, School, Finance, Storage, Calendar already exist. 5.7 adds a top-level "Vendors" nav section with "Vendor List" (`/vendors`) entry, gated on `vendors:read` permission AND `settingsStore.vendorsEnabled` flag.
- `src/router/routes.js` — spreads module route arrays. 5.7 adds `...vendorRoutes`.
- `src/composables/useSampleData.js` — the main sample data composable. 5.7 adds vendor sample data (3-5 vendors: a cooperative buyer, an agro-dealer supplier, a local market buyer, a transport supplier) and updates existing finance/farm sample data to reference vendor IDs instead of free-text vendor names. The `useFinanceSampleData.js` composable's expense rows that currently set `vendor: 'Some Supplier'` must be updated to set `vendor_id: <vendor-$id>`.
- `src/composables/useFarmSampleData.js` — farm sample data. The `additional_sale` flow (maize sample sale) currently uses `buyer_name: 'Local Market'` — 5.7 updates it to use a vendor_id from the seeded vendors.
- `src/stores/settings-store.js` — Pinia options-store for `village_settings`. 5.7 adds a `vendorsEnabled` getter (reads `settings.vendors_enabled`, default `true`) and may add a `setVendorsEnabled` action if an admin toggle is needed before 5.9.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — 5.7 MUST add the `vendors` table to `TABLES_TO_WIPE`.
- `docs/DATABASE_SCHEMA.md` — 5.7 adds a Vendors table section documenting the table, columns, relationships, and indexes.
- `docs/POST-MVP.md` — the "Vendor Module Integration for Farm Sales (Story 3.8)" entry (lines 129-139) is now being implemented — remove or mark it as resolved.

New data model required: 5.7 introduces a `vendors` table. Key schema:

- `vendors` table: `name` (string, required), `vendor_type` (enum: 'Supplier' | 'Buyer' | 'Both', required), `business_type` (string, optional — e.g. 'Agro-dealer', 'Transport', 'Cooperative', 'Market'), `contact_person` (string, optional), `phone` (string, optional), `email` (string, optional), `address` (string, optional), `payment_terms` (string, optional — e.g. 'Cash on delivery', 'Net 30', 'Prepaid'), `quality_rating` (integer 1-5, optional — 0 or null means unrated), `notes` (string, optional), `is_active` (boolean, default true), `created_at`/`updated_at` (datetime, auto-managed). Indexes on `vendor_type` and `is_active`.
- `finance_transactions.vendor_id` — relationship (manyToOne → `vendors`, onDelete: setNull). Replaces the existing free-text `vendor` string column. Since this is a fresh install, no migration — just re-run setup-appwrite.
- `farm_sales.buyer_id` — change from string to relationship (manyToOne → `vendors`, onDelete: setNull) OR keep as string and store the vendor `$id` — the spec should choose and document. `buyer_type` enum should add `'vendor'` as a value (currently only `'external'`).

Key design decisions for the spec to resolve:

- Vendor picker UX in TransactionForm: q-select with filterable list + "ad-hoc" free-text fallback option (so users can still type a one-off vendor name without creating a vendor record), OR require a vendor record to exist first (q-select only, with an inline "Add Vendor" shortcut). Recommend: q-select with filterable list + an "ad-hoc" option that falls back to a free-text input — document the choice.
- Vendor picker UX in RecordSaleDialog: same pattern as TransactionForm — vendor q-select + ad-hoc buyer_name fallback. When a vendor is selected, buyer_name auto-populates from vendor.name.
- Vendor transaction history: the vendor detail page aggregates (a) finance_transactions where `vendor_id = this vendor` (expenses) and (b) farm_sales where `buyer_id = this vendor` (sales). Display as a combined chronological list with type indicators. No separate transaction table — history is computed on-the-fly from existing tables.
- Vendor performance metrics: for MVP, keep it simple — total transaction count, total transaction value (sum of expenses + sales), average quality rating (if rated), last transaction date. No complex on-time-delivery or payment-reliability metrics for MVP (those require additional data points not available yet — document as deferred to POST-MVP).
- Vendors dashboard widget: follows `dashboard-widget-pattern.md`. Shows vendor count, active vendors, recent transactions (top 5), and a link to the full vendors list. Place on the main Dashboard page or the Finance dashboard — the spec should decide and document.
- Whether to add a `vendors` sample data composable or inline the vendor seeding into `useSampleData.js` — follow the existing pattern (useSampleData.js coordinates, useFinanceSampleData.js handles finance-specific seeding; 5.7 may create `useVendorsSampleData.js` or inline into `useSampleData.js`).
- Module toggle: `village_settings.vendors_enabled` boolean column (default `true`). `settingsStore` exposes `vendorsEnabled` getter. `MainLayout.vue` gates the Vendors nav section on both `vendors:read` permission AND `vendorsEnabled`. Route guards also check `vendorsEnabled`. No admin UI for toggling — that is 5.9 scope. Document that 5.9 will generalize this into the full Module Management page.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.7 ACs and Epic 5 story list
- docs/PRD.md — FR-14 (Vendors/Suppliers Management: bidirectional relationships, contact info, payment terms, quality ratings, transaction history linking Finance and Farm, vendor selection during farm sales and finance expense recording), FR-9 (Farm Sales: buyer selection from Vendors module, vendor transaction history update), FR-16 (sample data includes vendors)
- docs/architecture.md — Appwrite patterns, RBAC, data model conventions, module structure conventions
- docs/ux-specification.md — no vendor-specific screen specs exist; follow general UX patterns and the module structure of existing modules (Farm, School, Finance)
- docs/implementation-artifacts/spec-5-4-cloud-storage-shared-folders-and-module-based-access.md — 5.4 spec (continuity context: Auto Run Result, Design Notes, deferred items — most recent Epic 5 story, shows established patterns for new module creation, seed-roles.js updates, setup-appwrite.js table creation, wipeAllData updates)
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items including the i18n deferral decision and prior story deferred items
- docs/implementation-artifacts/dashboard-widget-pattern.md — mandatory pattern for the Vendors dashboard widget (AC6)
- docs/DATABASE_SCHEMA.md — existing schema documentation; 5.7 adds a Vendors table section following the existing pattern
- docs/POST-MVP.md — contains the "Vendor Module Integration for Farm Sales (Story 3.8)" deferred item that 5.7 now implements — remove or mark as resolved

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('vendors:read')`, `hasPermission('vendors:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.7 adds new `vendors:read` / `vendors:write` permissions to `seed-roles.js` — document the decision.
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
- New Appwrite table definitions go in `server/scripts/setup-appwrite.js` following the existing pattern (attributes, permissions, indexes). The `vendors` table follows the same `tableSchemas`/`createTable` pattern used for all existing tables.
- Pinia stores follow the existing options-store pattern (state, getters, actions) with `useErrorHandler` for error handling. Follow `farm-store.js` or `school-store.js` as the template for a new `vendors-store.js`. Table operations use `tables.listRows`/`tables.createRow`/`tables.updateRow`/`tables.deleteRow` from the Appwrite TablesDB API (imported from `src/boot/appwrite.js`).
- Date handling: all dates stored as ISO 8601 in Appwrite; display via `src/utils/dateUtils.js` (`toDateStrInTimezone`, `formatDateInTimezone`, `addDaysToDateStr`) with `settingsStore.timezone`.
- Permission checks in templates: use `hasPermission('vendors:read')`, `hasPermission('vendors:write')` from `usePermissions` composable to gate UI. Use `PermissionGuard` component where appropriate.
- `wipeAllData` function (`server/functions/wipeAllData/src/main.js`) — 5.7 adds the `vendors` table to `TABLES_TO_WIPE`.
- No emojis in code or UI unless an existing module already uses them.

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.7 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.7:

- The `vendors` table exists in Appwrite with all required columns (name, vendor_type enum, business_type, contact info, payment terms, quality_rating, is_active) and indexes on vendor_type + is_active. The `finance_transactions.vendor` free-text column is replaced by `vendor_id` relationship → vendors. The `farm_sales.buyer_type` enum includes `'vendor'` and `buyer_id` is wired to vendors.
- Vendors list page (`/vendors`) shows all vendors with search/filter by vendor_type. "Add Vendor" and "Edit Vendor" forms work with all AC2 fields. Form validation is integrated with `useErrorHandler`.
- Vendor detail page (`/vendors/:id`) shows vendor info, transaction history (combined finance expenses + farm sales where vendor_id/buyer_id matches), and performance metrics (count, total value, avg rating, last transaction date).
- Vendor selection integration: the Finance expense form (TransactionForm.vue) has a vendor picker (q-select) that populates `vendor_id` — the old free-text `vendor` field is gone. The Farm sales form (RecordSaleDialog.vue) has a vendor picker for the buyer — selecting a vendor sets `buyer_id`, `buyer_type='vendor'`, and auto-populates `buyer_name`. Ad-hoc/free-text entry still works for both forms (buyer_type stays 'external' for ad-hoc farm sales, vendor_id is null for ad-hoc finance expenses).
- Vendor transaction history is automatically updated: when a new finance expense with a vendor_id is created, it appears in that vendor's transaction history. When a new farm sale with a buyer_id (vendor) is created, it appears in that vendor's transaction history. No manual sync needed — history is computed on-the-fly from existing tables.
- Vendors dashboard widget follows `dashboard-widget-pattern.md` and shows vendor count + recent transactions. It is placed on the appropriate dashboard page (spec decides which).
- `vendors:read` and `vendors:write` permissions are added to `seed-roles.js` for appropriate roles (Finance Manager: read+write, System Administrator: \*, Village Head/Deputy/Council Member: read, Farm Manager: read). Route guards and UI gating use these permissions.
- The Vendors nav section in `MainLayout.vue` is gated on BOTH `vendors:read` permission AND `settingsStore.vendorsEnabled` flag. When `vendors_enabled` is false in village_settings, the nav section and routes are hidden/inaccessible.
- `wipeAllData` is updated to wipe the `vendors` table.
- Sample data: `useSampleData.js` (or a new `useVendorsSampleData.js`) seeds 3-5 realistic vendors. Existing finance/farm sample data is updated to reference vendor IDs instead of free-text vendor names. The sample data flow works end-to-end (SetupWizard → seed vendors → seed finance/farm with vendor IDs).
- The existing finance expense and farm sales UX is not broken — expenses still create, list, edit, and delete correctly; farm sales still record, list, and show detail correctly. The only change is the vendor field is now a picker instead of free-text.
- `DATABASE_SCHEMA.md` is updated with the Vendors table section.
- `docs/POST-MVP.md` "Vendor Module Integration for Farm Sales (Story 3.8)" entry is removed or marked as resolved.
- No vendor CRUD operations leak across permissions (e.g., a Teacher without `vendors:read` cannot see the Vendors nav or access `/vendors`).

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Generalizes the basic `vendors_enabled` flag from 5.7 into the full module toggle system. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog (current password, new password, confirm). Calls `Account.updatePassword`. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` gains "Add User" button (System Admin only). Add User form: name, email, initial password, role multi-select, optional resident_id link. Requires server-side Appwrite Function for admin-scope user creation (client SDK cannot create users on behalf of admin — use node-appwrite with admin key). Soft-deactivate (active=false, blocks login). Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog (multi-select of seeded roles, updates `users.role_ids`). "View Permissions" shows effective permission union. New `/admin/roles` page: role list with name, category, permission count, storage quota, assigned user count. Permission matrix (expandable role × permission grid). Read-only for MVP. Role changes audit-logged. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile (Zambia defaults: ZMW, Africa/Lusaka) → Admin User (confirm existing) → Village Head (create or skip) → Module Selection (Farm/School/Vendors toggleable) → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages (household-before-resident ordering). "Start Fresh - Wipe All Data" from sample mode routes here. Deps: 5.9, 5.12.

**5.10 (System Completion):** Final dashboard integration (role-based widgets, <2s load). Navigation polish (breadcrumbs, quick search, active highlighting). Notifications system (bell icon, count badge, panel, filter, mark as read). UX polish (loading states, error handling, success confirmations, accessibility). Performance (<3s on 3G, lazy loading, caching). Mobile responsiveness (320px+, 44px touch targets). Help/docs (help icon, tooltips, user guide, FAQ). System health monitoring (Admin: DB size, storage usage, active users, error logs). Final testing checklist. Dep: ALL MVP previous stories in all epics.
