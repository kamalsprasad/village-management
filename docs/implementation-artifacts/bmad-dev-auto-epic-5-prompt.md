# /bmad-dev-auto Prompt — Epic 5 Final Story (5.10 Sub-Stories: 5.10a → 5.10e)

> **Usage:** Copy everything below the `---` line into a fresh `/bmad-dev-auto` invocation.
> **Adapting for subsequent iterations:** Change ONLY the three sections marked
> `<<< CHANGE PER ITERATION >>>` — (1) Current Iteration Target, (2) Story X.Y Specifics,
> (3) Review invariants. Everything else is campaign-level context that stays constant.
> The MVP dependency order in "Epic 5 MVP Scope" tells you which sub-story is next after
> each completion; the previous sub-story's spec `## Auto Run Result → Next Iteration` section
> also points to the next target with its slug.
>
> **Sub-story split (user decision 2026-08-04):** Story 5.10 "System Completion" has 9 broad
> ACs spanning 6+ independently shippable features. Per the bmad-dev-auto discipline rules
> ("HALT if the intent resolves to multiple independently shippable goals"), 5.10 is split
> into sub-stories 5.10a–5.10e, each processed in its own iteration. AC8 (System Health
> Monitoring) is deferred to post-MVP with thorough documentation (user decision 2026-08-04).
> AC3 (Notifications) is included in MVP as sub-story 5.10c (user decision 2026-08-04).

---

You are running bmad-dev-auto for the Sustainable Model Village Management System (village-app). This invocation processes EXACTLY ONE story this iteration and HALT cleanly so the next iteration can pick up the next story.

## Current Iteration Target <<< CHANGE PER ITERATION >>>

Epic: 5 — "Village Calendar, Storage, Optional Modules, and User Management"
Story to implement THIS iteration: 5.10b — Navigation Polish (Breadcrumbs and Quick Search)
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md

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
9. ✅ 5.13 Role Assignment and Permissions Management UI (deps: 5.12) — DONE 2026-08-04
10. ✅ 5.11 Start Fresh Production Setup Wizard (deps: 5.9, 5.12) — DONE 2026-08-04
11. 5.10 System Completion — split into sub-stories (user decision 2026-08-04):
    - ✅ 5.10a Dashboard Completion — Real Data Wiring and Widget Finalization (AC1) — DONE 2026-08-04
    - 5.10b Navigation Polish — Breadcrumbs and Quick Search (AC2) ← THIS ITERATION
    - 5.10c Notifications System (AC3) — includes new Appwrite `notifications` table
    - 5.10d Help and Documentation (AC7)
    - 5.10e UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9)
    - AC8 System Health Monitoring — DEFERRED to post-MVP (user decision 2026-08-04; documented in deferred-work.md during 5.10a)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11, 5.10 AC8 (System Health Monitoring).

## Story 5.10b Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the Navigation Polish sub-story for MVP Story 5.10. Implement Story 5.10 AC2: "Navigation polish: clean menu, active page highlighted, breadcrumbs, quick search." This sub-story adds (1) a reusable breadcrumb component rendered on detail/form/create/edit pages following the UX spec's Module → List → Detail pattern with responsive behavior (desktop full path, tablet compact last-2, mobile back-button-only); (2) active-page highlighting that works on detail pages, including auto-expanding the parent nav section when a child route is active (currently collapsed sections hide the active item on detail-page reload); (3) a "clean menu" verification pass (no dead links, role gating correct, structure sane); and (4) a global quick-search box in the MainLayout header that queries permitted Appwrite tables AND sidebar menu items, rendering a dropdown of results grouped by module header (headers with no results are hidden). This is Story 5.10 AC2 only — the remaining 5.10 ACs (notifications, UX polish, performance, mobile, help/docs, testing checklist) are handled by sub-stories 5.10c–5.10e in subsequent iterations. AC8 (System Health Monitoring) is deferred to post-MVP (already documented in deferred-work.md during 5.10a).

This sub-story is primarily a **frontend navigation/UX** story. It adds NO new Appwrite tables, NO new columns, NO new server functions, NO new permissions, and NO new routes. It REUSES existing Appwrite tables (queried client-side for quick search) and existing RBAC (`usePermissions` / `hasPermission`). It modifies `MainLayout.vue` (add header search box + auto-expand nav sections on active child route), adds a new reusable `Breadcrumbs.vue` component, adds breadcrumb `meta` to existing routes, and replaces/augments the ad-hoc "Back" buttons on detail/form/create/edit pages with the breadcrumb component. It may add a `useGlobalSearch.js` composable — match the existing `ResidentSearchInput.vue` server-side search pattern (`Query.startsWith` + `Promise.allSettled` + debounce + min-length gate).

ACs (from docs/epics.md Story 5.10 AC2 — treat as authoritative):

2. Navigation polish: clean menu, active page highlighted, breadcrumbs, quick search.

Sub-ACs for 5.10b (derived from AC2):

2a. **Breadcrumbs on detail/form/create/edit pages.** A reusable `src/components/layout/Breadcrumbs.vue` (or `src/components/navigation/`) renders Module → List → Detail (e.g., Farm → Plots → Maize Field A → Planting Detail) per `docs/ux-specification.md` §"Secondary Navigation" (line ~339) and §"Detail View Layout" (line ~1688). Breadcrumb labels come from route `meta.breadcrumb` (array of `{ label, to }`) added to existing routes in `src/router/routes.js` and each module router (`src/modules/*/router.js`); the last segment is the current page (non-clickable). Responsive: desktop (lg+) shows full path; tablet (md) shows compact last-2 levels; mobile (xs-sm) shows a back button only (reuse the existing `arrow_back` + `router.back()` pattern). Replace the existing ad-hoc `<q-btn flat icon="arrow_back" label="Back" @click="router.back()" />` on detail/form/create/edit pages with this component (the component renders the back button on mobile, so no duplicate back control). Pages to cover (non-exhaustive — enumerate ALL in the spec via grep for `arrow_back`/`router.back()`/`Back to`): ~13 detail pages (`HouseholdDetailPage`, `ResidentDetailPage`, `InventoryDetailPage`, `FundingSourceDetailPage`, `LoanDetailPage`, `PlotDetailPage`, `PlantingDetailPage`, `CropDetailPage`, `SaleDetailPage`, `LearnerDetailPage`, `ClassDetailPage`, `InterventionDetailPage`, `VendorDetailPage`), ~4 form pages (`InventoryFormPage`, `PlotFormPage`, `CropFormPage`, `VendorFormPage`), and create/edit pages (`CreatePlantingPage`, `PlantingEditPage`, `CreateLoanPage`, `EnrollLearnerPage`, `CreateInterventionPage`).
2b. **Active page highlighting (fix detail-page + auto-expand).** Verify that sidebar nav items highlight when their detail/form sub-routes are active (Quasar `q-item` `to` prefix-matching already handles this for items without `exact`; confirm no regression). FIX the gap that parent `q-expansion-item` sections do NOT auto-expand when a child route is active — on a detail-page reload the active item is currently hidden inside a collapsed section. Add a `watch` on the current route in `MainLayout.vue` that expands the section containing the active route (map route prefix → section key in `expandedSections`). Do NOT break the user's manual collapse/expand choice for sections unrelated to the current route.
2c. **Clean menu verification.** Audit `MainLayout.vue` nav: every `to` target resolves to a real route; role/module gating (`hasPermission` + `settingsStore.*Enabled`) is correct for every item; no orphaned/hidden-by-default items that should be visible; deferred-module labels (Guests/Equipment/Energy) do NOT appear (per Epic 5 scope). Fix any dead links or mis-gated items found. No structural redesign of the menu — "clean" means correct and consistent, not a new IA.
2d. **Global quick search (header).** Add a search `q-input` (with `search` icon, debounce ~300ms, clearable) to the `MainLayout.vue` header toolbar. On input (min 2 characters), query a curated set of permitted Appwrite tables via `Query.startsWith` on the headline field per module (households by `name`, residents by `first_name`/`last_name`, finance_transactions by `description`, plots by `name`, learners by `first_name`/`last_name`, vendors by `name`, inventory items by `item_name`, village_calendar_events by `title`) — each gated by `hasPermission('<module>:read')` and `settingsStore.*Enabled` for optional modules. ALSO match sidebar menu items by label (so users can jump to pages). Render results in a `q-menu`/`q-list` dropdown grouped by module header (e.g., "Residents", "Farm", "Pages"); a header is shown ONLY if it has ≥1 result; empty headers are hidden. Each result row shows a label + optional secondary text and navigates to the right route on click (detail pages use the record `$id`). Reuse the `ResidentSearchInput.vue` server-side search pattern (`Query.startsWith` + `Promise.allSettled` + activeSearchToken to discard stale responses + `Query.limit(N)`). Permission-gated: a user sees only modules they can `read`. SSR-safe: all `tables.listRows` calls run client-side only (guard with `isClient`); the search input is rendered but does not fire queries during SSR.

Prerequisites confirmed done: ALL prior MVP stories in all epics (1.1–1.11, 2.1–2.9, 3.1–3.10, 4.1–4.8, 4.12–4.13, 5.1–5.4, 5.7, 5.9, 5.11–5.14) are `done` in `docs/sprint-status.yaml`, and **5.10a is `done`** (sub-story row `5-10a-...: done` added 2026-08-04). 5.10b has NO hard dependency on any unfinished story. No spec file exists yet for 5.10b.

**No new Appwrite infrastructure (reuse-only):**

- All tables already exist (queried for quick search only): `households`, `residents`, `finance_transactions`, `plots`, `learners`, `vendors`, `inventory`, `village_calendar_events`. Verify table IDs via `import.meta.env.VITE_APPWRITE_TABLE_*` env vars where they exist (households, residents, inventory, village_events); module tables without env vars are hardcoded by convention (e.g., `finance_transactions`, `plots`, `learners`, `vendors` — match the existing stores' hardcoded IDs; do NOT invent new env vars).
- NO new server function. Quick search runs entirely client-side via `tables.listRows` with `Query.startsWith` + `Query.limit`. Do NOT create a new server function for 5.10b.
- NO new permissions. Quick search and nav gating reuse existing `hasPermission('<module>:read')` checks.

**Existing nav structure (verify, do NOT break):**

`MainLayout.vue` already renders a `q-header` toolbar (village name + version + user menu) and a `q-drawer` with sectioned `q-expansion-item` nav (Community, Finance, Vendors, Agriculture, School, Services, Administration) plus always-visible Dashboard/Calendar top items. Items use `active-class="nav-top-item--active"` / `nav-sub-item--active`. Section expand state is held in a reactive `expandedSections` object (all default `false`) with NO route watcher. 5.10b ADDS: a header search input + results dropdown, and a route watcher to auto-expand the active section. It must NOT change the nav item set, labels, or gating (except fixing any dead-link/mis-gate found in the 2c audit).

Continuity context from prior work (read these files before scaffolding):

- `src/layouts/MainLayout.vue` — the app shell. Header toolbar (lines 1-128) is where the quick-search input goes (next to the village name, hidden on xs if space-constrained). Drawer nav (lines 130-709) holds the `q-expansion-item` sections and `expandedSections` reactive state (lines 740+). 5.10b adds the search input + dropdown here and a `watch` on the current route to auto-expand the active section. Read the full file before editing.
- `src/router/routes.js` + `src/modules/*/router.js` — all route definitions. Routes currently carry only `meta: { requiresAuth, requiresPermission }` (some have `name`). 5.10b adds `meta.breadcrumb` (array of `{ label, to }`) to detail/form/create/edit routes. Enumerate every route that needs breadcrumb meta; prefer adding a `name` where missing so breadcrumb `to` can use named routes.
- `src/components/inputs/ResidentSearchInput.vue` — the established server-side search pattern (`Query.startsWith(field, term)` + `Promise.allSettled` + `activeSearchToken` to discard stale responses + `Query.limit(MAX_RESULTS)` + min-length gate). The `useGlobalSearch` composable MUST follow this pattern (debounce + stale-response guard + per-field `startsWith`).
- Detail/form/create/edit pages (see 2a list) — each currently has an ad-hoc `<q-btn flat icon="arrow_back" label="Back" @click="router.back()" />`. 5.10b replaces these with `<Breadcrumbs />` (which renders the back button on mobile). Grep for `arrow_back`/`router.back()`/`Back to` to find ALL occurrences (37 files matched in review — enumerate in spec).
- `src/composables/usePermissions.js` — `hasPermission('<module>:read')` for gating quick-search modules and nav items.
- `src/stores/settings-store.js` — `settingsStore.farmEnabled` / `schoolEnabled` / `vendorsEnabled` for gating optional-module search and nav.
- `src/boot/appwrite.js` — `tables` export for `tables.listRows`.
- `docs/ux-specification.md` §"Secondary Navigation" (line ~339: breadcrumbs Module → List → Detail, clickable), §"Responsive Behavior" (line ~1108: breadcrumbs desktop full / mobile back-only; line ~1401: tablet compact last-2), §"Detail View Layout" (line ~1688: header has breadcrumbs + title + status badge). These are the authoritative breadcrumb rules.
- `docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md` — 5.10a spec (DONE). Read to confirm 5.10a did NOT touch MainLayout/routes (it only touched DashboardPage + composable + QuickStatsWidget), so 5.10b has a clean surface.

Key design decisions for the spec to resolve:

- **Breadcrumb data source:** Route `meta.breadcrumb` is the recommended approach (array of `{ label, to }` segments). The spec MUST list every route that gets breadcrumb meta and the exact label/to for each segment. For detail pages with a dynamic `:id`, the parent List segment is static (`{ label: 'Households', to: '/households' }`) and the Detail segment label is derived from the loaded record (e.g., household `name`) — the spec MUST specify how the detail segment label is obtained (emit from the page via a slot/prop, or read from a store). Prefer a `<Breadcrumbs :items="..." />` prop-driven component so each page controls its own trail; route meta provides the static prefix, the page provides the dynamic leaf.
- **Responsive breadcrumb behavior:** Use Quasar's `$q.screen` breakpoints (xs/sm = back button only, md = compact last-2, lg/xl = full path). The spec MUST specify the exact breakpoint logic and that the back button uses `router.back()` (or the parent `to` if no history).
- **Active-section auto-expand:** Map each route prefix to its `expandedSections` key (e.g., `/households`|`/residents` → `community`, `/finance` → `finance`, `/farm` → `agriculture`, `/school` → `school`, `/vendors` → `vendors`, `/admin` → `administration`, `/calendar`|`/storage` → `services`). The `watch(route)` sets that key to `true` on navigation; do NOT collapse other sections (respect user choice). The spec MUST include the full prefix → section map.
- **Quick-search entity set & fields:** The spec MUST list exactly which table + field each module searches (see 2d), the `Query.startsWith` usage, the per-module `Query.limit` (e.g., 5), the debounce (300ms), the min-length (2 chars), and the stale-response guard (`Promise.allSettled` + token). It MUST specify the result row shape (`{ id, type, label, secondary, icon, to }`) and the grouping headers (module display names; "Pages" for nav items). It MUST specify the no-results state and the loading state.
- **Quick-search nav items:** Sidebar menu items are matched by label (case-insensitive `includes`). The spec MUST specify how the nav item list is obtained (extract from MainLayout or a shared nav config) — prefer a small shared `navItems` array to avoid duplicating the nav structure, but do NOT refactor MainLayout's rendering if a simpler inline approach works.
- **SSR safety:** All quick-search `tables.listRows` calls run client-side only (guard with `isClient`); the search input renders during SSR but fires no queries. Breadcrumbs render from route meta (available SSR-side) — verify the dynamic leaf label degrades gracefully (show a generic label like "Detail" until the record loads) so SSR output is not broken.
- **Error handling:** A failed quick-search module query (permission/network) must NOT crash the dropdown — use `Promise.allSettled` and skip failed modules (matching `ResidentSearchInput.vue`). Failed breadcrumb label lookups fall back to a generic label.
- **Performance:** Quick search is debounced and per-module capped (`Query.limit(5)`); do NOT fetch large result sets. Breadcrumb route meta is static (no runtime cost). The auto-expand watcher is O(1).
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.10 ACs (AC2 is the focus for 5.10b; AC8 deferred to post-MVP) and Epic 5 story list
- docs/PRD.md — navigation/search requirements, role-based nav visibility, NFR-3 (3G load <3s), NFR-5 (mobile 320px+)
- docs/architecture.md — routing structure, all table schemas (households, residents, finance_transactions, plots, learners, vendors, inventory, village_calendar_events), RBAC permissions model
- docs/ux-specification.md — §"Secondary Navigation" (line ~339: breadcrumbs Module → List → Detail, clickable), §"Responsive Behavior" (line ~1108: breadcrumbs desktop full / mobile back-only; line ~1401: tablet compact last-2), §"Detail View Layout" (line ~1688: header has breadcrumbs + title + status badge), §2 "Information Architecture" for role-based navigation visibility, §8 "Animation & Motion" for loading state patterns.
- docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md — 5.10a spec (DONE); read to confirm 5.10a did NOT touch MainLayout/routes (clean surface for 5.10b).
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items; 5.10 AC8 deferral already documented during 5.10a (no new deferral expected from 5.10b)
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms 5.10's dependency on all prior MVP stories

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.10b introduces NO new permissions; quick-search and nav gating reuse existing `hasPermission` checks.
- Dashboard widgets: follow docs/implementation-artifacts/dashboard-widget-pattern.md exactly.
- No new dependencies without verifying they're already in package.json. If a new dep is truly required, HALT with blocking condition `new dependency required: <name> — user approval needed`.
- Match existing code style in src/pages/, src/stores/, src/composables/, src/services/, src/modules/. Read neighboring modules (e.g. src/modules/school/, src/modules/farm/, src/modules/calendar/, src/modules/storage/, src/pages/setup/, src/pages/admin/) before scaffolding.
- i18n: NOT implemented in this project. vue-i18n is NOT installed. All UI strings are hardcoded English, matching existing modules (Epics 1–4 and Stories 5.1–5.14). This is a user-approved decision (2026-07-28); i18n is deferred to post-MVP — see docs/implementation-artifacts/deferred-work.md. Do NOT add vue-i18n. Do NOT use $t() or useI18n(). Write hardcoded English strings consistent with existing modules.
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

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
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT. (5.10b is a single AC2 sub-story: navigation polish — breadcrumbs + active highlighting + clean menu + quick search. The broader 5.10 was split into 5.10a–5.10e per user decision 2026-08-04 to avoid this condition. User decision 2026-08-04: keep 5.10b as ONE iteration covering all of AC2 — do NOT split further.)

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate.
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: any Appwrite TablesDB/Functions access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. FarmDashboardPage.vue, LearnersListPage.vue, DashboardPage.vue). Client-only `tables.listRows` calls in the quick-search composable must be `isClient`-guarded (the search input renders during SSR but fires no queries).
- Quasar components for all UI primitives. No raw HTML controls. (5.10b adds UI: breadcrumb component, header search input + results dropdown — all must use Quasar components: `QBreadcrumbs`/`QBreadcrumbsEl`, `QInput`, `QMenu`, `QList`, `QItem`, `QBtn`.)
- 5.10b creates NO new Appwrite infrastructure (no new tables, no new columns, no new server function, no new audit enum values, no new permissions, no new `.env` variables, no new routes). It reuses all existing tables (queried client-side for quick search) and existing RBAC. The frontend artifacts modified/added are: `MainLayout.vue` (header search input + dropdown + active-section auto-expand watcher), a new `src/components/layout/Breadcrumbs.vue` (or `src/components/navigation/`), breadcrumb `meta` added to existing routes in `src/router/routes.js` and `src/modules/*/router.js`, replacement of ad-hoc Back buttons on detail/form/create/edit pages with `<Breadcrumbs />`, and OPTIONALLY a new `src/composables/useGlobalSearch.js` composable. No server changes. The spec MUST include tasks for all modifications.
- Pinia stores follow the existing options-store pattern. 5.10b REUSES existing stores (`settingsStore`, `authStore`) and does NOT create new stores. No store changes are required for 5.10b.
- Date handling: all dates stored as ISO 8601 in Appwrite. Display via `src/utils/dateUtils.js` with `settingsStore.timezone`.
- Permission checks: 5.10b introduces NO new permissions. Quick-search and nav gating use existing `hasPermission` checks. No new `requiresPermission` meta values (breadcrumb `meta.breadcrumb` is added but is NOT a permission meta key).
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.10b <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.10b:

- **Breadcrumbs** render on ALL detail/form/create/edit pages (sub-AC 2a): Module → List → Detail, clickable parent segments, last segment non-clickable. Responsive: desktop full path, tablet compact last-2, mobile back-button-only. The ad-hoc `<q-btn icon="arrow_back" ...>` Back buttons are replaced by the `Breadcrumbs` component (no duplicate back controls on mobile). Verify via grep that no detail/form/create/edit page is missed (search `arrow_back`/`router.back()`/`Back to`).
- **Active highlighting** works on detail/form sub-routes (sub-AC 2b): the parent sidebar item is highlighted AND its `q-expansion-item` section is auto-expanded on detail-page reload (the active item is NOT hidden inside a collapsed section). A route watcher in `MainLayout.vue` expands the section matching the current route prefix; sections unrelated to the current route are NOT force-collapsed (user choice respected).
- **Clean menu** (sub-AC 2c): every nav `to` resolves to a real route; role/module gating (`hasPermission` + `settingsStore.*Enabled`) is correct; deferred-module labels (Guests/Equipment/Energy) do NOT appear; no dead links remain.
- **Quick search** (sub-AC 2d): header search input queries permitted Appwrite tables (via `Query.startsWith` + `Query.limit`, debounced, min 2 chars, stale-response guard) AND sidebar menu items by label. Results dropdown is grouped by module header; headers with zero results are hidden. Each result navigates to the correct route on click (detail pages use the record `$id`). Permission-gated: a user without `finance:read` sees no finance results; optional modules gated on `settingsStore.*Enabled`.
- Quick search is **SSR-safe**: no `tables.listRows` calls execute during SSR (the input renders but fires no queries until client hydration).
- A failed quick-search module query does NOT crash the dropdown — `Promise.allSettled` is used and failed modules are skipped (matching `ResidentSearchInput.vue`).
- NO new Appwrite infrastructure is created: no new tables, no new columns, no new server function, no new audit enum values, no new permissions, no new `.env` variables, no new routes. 5.10b adds only `meta.breadcrumb` to EXISTING routes (no new routes).
- NO new stores are created — `settingsStore` and `authStore` are reused.
- NO new permissions are introduced; quick-search and nav gating use existing `hasPermission` checks.
- The 5.10a dashboard real-data wiring (`useDashboardData`, `QuickStatsWidget` income/expense cards, `RecentActivityWidget`), the 5.11 empty-state guidance banners, the 5.9 module management, the 5.12/5.13 user/role management, the 5.14 password flows, and all prior module dashboards/pages are NOT broken.
- Breadcrumb labels degrade gracefully during SSR: the dynamic detail-leaf label falls back to a generic label (e.g., "Detail") until the record loads, so SSR output is not broken.

**5.10 sub-story roadmap (for context — do NOT implement future sub-stories in this iteration):**

- **5.10a (DONE 2026-08-04):** Dashboard Completion — Real Data Wiring (AC1). Replaced placeholder data, verified widgets functional, <2s load.
- **5.10b (THIS ITERATION):** Navigation Polish — Breadcrumbs and Quick Search (AC2). Add breadcrumbs to detail/form/create/edit pages (Module → List → Detail, responsive), global header quick search with grouped results dropdown, fix active highlighting (auto-expand nav section for active child route), clean-menu audit.
- **5.10c:** Notifications System (AC3). New Appwrite `notifications` table, notifications store, bell icon + count badge in MainLayout header, notification panel with filter by type and mark as read. This is the only 5.10 sub-story that adds new Appwrite infrastructure.
- **5.10d:** Help and Documentation (AC7). Help icon in header, contextual tooltips, user guide page, FAQ page.
- **5.10e:** UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9). Loading/error/success state consistency, accessibility audit (44px touch targets, 4.5:1 contrast, aria-labels), lazy loading, caching, <3s on 3G, mobile 320px+ audit, final testing checklist document.
- **AC8 (System Health Monitoring): DEFERRED to post-MVP** (user decision 2026-08-04). Document thoroughly in `deferred-work.md` during 5.10e: Admin page showing DB size, storage usage, active users, error logs; likely needs a new server function. Not implemented in MVP.

**Prior Epic 5 story summaries (for regression-checking context):**

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` "Add User" button (System Admin only). Server-side Appwrite Function for admin-scope user creation. Soft-deactivate. Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog. "View Permissions" shows effective permission union. `/admin/roles` page: role list with permission matrix. Read-only for MVP. `seed-roles.js` upsert-capable. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile → Admin User → Village Head → Module Selection → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages. Last-System-Admin guard added to `updateUser`. Deps: 5.9, 5.12. DONE 2026-08-04.

**5.10a (Dashboard Completion — Real Data Wiring):** Replaced `DashboardPage.vue` placeholder data with real, permission-gated Appwrite fetches via new `src/composables/useDashboardData.js` (household/resident counts via `Query.limit(1)` + `.total`; finance totals via `financeStore.fetchSummary()`; recent activity via per-module `tables.listRows` with `Query.orderDesc('$createdAt')` + `Query.limit(3)`, merged/sorted/sliced to 8). Extended `QuickStatsWidget` with Total Income/Total Expense cards. Each module fetch isolated (try/catch) so one failure doesn't break the dashboard. SSR-safe (onMounted only). AC8 (System Health Monitoring) deferred to post-MVP and documented in `deferred-work.md`. NOTE: a 300ms `setTimeout` hydration delay remains in `useDashboardData.load()` — candidate for removal in 5.10e performance audit. Dep: all prior MVP stories. DONE 2026-08-04.
