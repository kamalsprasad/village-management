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
Story to implement THIS iteration: 5.10d — Help and Documentation
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-10d-help-and-documentation.md

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
    - ✅ 5.10b Navigation Polish — Breadcrumbs and Quick Search (AC2) — DONE 2026-08-05 (post-finalization patch `3152db1` applied; see spec-5-10b Review Triage Log §2026-08-05)
    - ✅ 5.10c Notifications System (AC3) — includes new Appwrite `notifications` table — DONE 2026-08-05 (post-review patch `f5e5fc9` applied; see spec-5-10c Review Triage Log §2026-08-05)
    - 5.10d Help and Documentation (AC7) ← THIS ITERATION
    - 5.10e UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9)
    - AC8 System Health Monitoring — DEFERRED to post-MVP (user decision 2026-08-04; documented in deferred-work.md during 5.10a)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11, 5.10 AC8 (System Health Monitoring).

## Story 5.10d Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the Help and Documentation sub-story for MVP Story 5.10. Implement Story 5.10 AC7: "Help and documentation: help icon, contextual tooltips, user guide, FAQ." This sub-story adds (1) a help icon (`q-btn` with `icon="help"`) in the `MainLayout.vue` header toolbar (between the 5.10c notifications bell and the user profile `q-btn`) that opens a help menu/panel; (2) a user guide page at `/help` covering the core MVP modules (Residents, Households, Finance, Inventory, Farm, School, Vendors, Calendar, Storage, Admin) with role-based section visibility and a getting-started guide; (3) a FAQ page (either a tab on `/help` or a separate `/help/faq` route — the spec decides) with categorized Q&A entries covering common tasks, troubleshooting, and role-based questions; and (4) a bounded set of contextual tooltips (`q-tooltip`) added to KEY UI elements across the app — specifically on primary action buttons, form field labels for complex fields, and navigation items — to provide inline guidance without cluttering the interface. This is a REUSE-ONLY story — NO new Appwrite tables, server functions, permissions, or `.env` variables. All help content is hardcoded in Vue components (consistent with the project's hardcoded-English, no-i18n convention). This is Story 5.10 AC7 only — the remaining 5.10 ACs (UX polish, performance, mobile, testing checklist) are handled by sub-story 5.10e. AC8 (System Health Monitoring) is deferred to post-MVP (already documented in deferred-work.md during 5.10a).

Unlike 5.10c (which added new Appwrite infrastructure), 5.10d is REUSE-ONLY: it adds NO new Appwrite tables, NO new server functions, NO new permissions, NO new `.env` variables, and NO new stores. It ADDS: a help icon + menu/dropdown in `MainLayout.vue` header, a new `/help` route (+ optionally `/help/faq`), a new `HelpPage.vue` component (user guide), a new `FAQPage.vue` component (or a tab within `HelpPage.vue` — the spec decides), and contextual `q-tooltip` elements on a bounded set of key UI elements across existing pages. It REUSES the existing `MainLayout.vue` header toolbar (which after 5.10c has: village name + version + quick-search `q-input` `gt-xs` + notifications bell + user profile `q-btn`), the existing router (`src/router/routes.js`), and the existing `q-tooltip` Quasar component (already used 196+ times across the codebase — established pattern). It MODIFIES `MainLayout.vue` (add help icon + menu) and `src/router/routes.js` (add `/help` route). No existing module stores, server functions, or Appwrite tables are touched.

ACs (from docs/epics.md Story 5.10 AC7 — treat as authoritative):

7. Help and documentation: help icon, contextual tooltips, user guide, FAQ.

Sub-ACs for 5.10d (derived from AC7):

7a. **Help icon in header.** Add a `q-btn` (`flat`, `round`, `dense`, `icon="help"`, `aria-label="Help"`) to the `MainLayout.vue` header toolbar, positioned between the 5.10c notifications bell and the user profile `q-btn`. The help icon MUST remain visible on xs (it is NOT `gt-xs` — unlike the quick-search box). Clicking the help icon opens a `q-menu` (desktop) / `q-dialog` (mobile, `$q.screen.xs`) with links to: "User Guide" (navigates to `/help`), "FAQ" (navigates to `/help/faq` or the FAQ tab on `/help` — the spec decides), and "About" (shows app version + village name in a small section or dialog — reuse `settingsStore.villageName` and `version` from `package.json` already imported in `MainLayout.vue`). The help icon must NOT break the 5.10b quick-search box, the 5.10c notifications bell, the `expandedSections` auto-expand watcher, or the user profile menu. Verify the header does not overflow on md/sm/xs — the quick-search is already `gt-xs`; the help icon and bell MUST both remain visible on xs (place them before the user profile `q-btn`, after the search box div).

7b. **User guide page (`/help`).** New `src/pages/help/HelpPage.vue` — a Quasar-styled page rendering a structured user guide for the MVP system. Content sections (the spec enumerates exact content — these are the required sections): (1) Getting Started (first-login setup, Start Fresh wizard reference, sample data mode explanation); (2) Navigation (drawer sections, quick search, breadcrumbs — reference 5.10b); (3) Residents & Households (core CRUD workflows); (4) Finance (transactions, categories, funding sources, lending, reports); (5) Inventory (stock management, auto-creation from purchases); (6) Farm (plots, crops, plantings, harvests, sales, alerts — reference 5.10c farm-alert notifications); (7) School (learners, attendance, test scores, at-risk identification, interventions, calendar, bell schedules, timetables — reference 5.10c at-risk notifications); (8) Vendors (supplier management); (9) Calendar (village events, role-based creation); (10) Storage (personal/shared folders, quotas); (11) Administration (user management, roles, module management, settings, Start Fresh wizard); (12) Notifications (bell, panel, mark-as-read — reference 5.10c). Each section uses Quasar components: `q-card`/`q-expansion-item`/`q-typography` elements, with clear headings, short paragraphs, and step-by-step instructions for key workflows. Role-based section visibility: sections for modules the village has disabled (via `settingsStore.modulesEnabled`) are hidden or marked "Not enabled" (e.g., if Farm is disabled, the Farm section shows a "This module is not enabled" note instead of instructions). The page is available to ALL authenticated users (no `requiresPermission` — help is universal). SSR-safe (no Appwrite calls; `settingsStore` data is already loaded by `MainLayout.vue`). Hardcoded English, no emojis, no i18n.

7c. **FAQ page.** Either a tab on `HelpPage.vue` (using `q-tabs`/`q-tab-panels`) or a separate `src/pages/help/FAQPage.vue` at `/help/faq` — the spec decides and justifies. Content: categorized Q&A entries covering: (1) General (what is the system, how do I log in, how do I change my password — reference 5.14); (2) Data Entry (how to add a resident, record a harvest, enter a test score, create a transaction); (3) Roles & Permissions (what can each role do, why don't I see a module); (4) Troubleshooting (page won't load, data not saving, search not finding results, notifications not appearing); (5) Sample Data vs Real Data (how to switch, what wipe does — reference 5.11). Each Q&A uses `q-expansion-item` (collapsed by default, click to expand) for a clean accordion FAQ pattern. The spec MUST enumerate the exact FAQ entries (at least 3 per category, 15+ total) — do NOT leave content as TBD. Hardcoded English, no emojis.

7d. **Contextual tooltips (bounded set).** Add `q-tooltip` elements to a BOUNDED set of key UI elements across the app. The tooltip set (the spec enumerates exact elements — CAP at 15-20 tooltips to keep within one iteration):

- Primary action buttons on key list pages: "Add Household", "Add Resident", "Record Transaction", "Add Inventory Item", "Add Plot", "Add Vendor" — tooltip explains what the action does.
- Complex form field labels in key forms: currency field in Village Settings, attendance threshold in at-risk settings, quota fields in storage settings — tooltip explains the field's purpose and valid values.
- Navigation section headers in `MainLayout.vue` drawer: each `q-expansion-item` section header gets a `q-tooltip` with a one-sentence description of the section (visible on hover, not on mobile where hover is unavailable).
- The 5.10b quick-search input: tooltip "Search across residents, households, finance, plots, learners, vendors, inventory, and calendar events."
- The 5.10c notifications bell: tooltip "View your notifications. Unread count shown on the badge."
- The new 7a help icon: tooltip "Help, user guide, and FAQ."

CAP RATIONALE: adding tooltips to EVERY button and field in the app would be unbounded scope. Capping at 15-20 high-value tooltips (primary actions, complex fields, nav sections, header icons) keeps this within one iteration while covering the most impactful guidance surfaces. The spec MUST enumerate the exact tooltip set with the exact tooltip text for each. Do NOT add tooltips to every element — only the bounded set. If the spec derivation finds the tooltip scope still exceeds one iteration, set `warnings: [multiple-goals]` and HALT with a proposal to split 5.10d into 5.10d1 (help icon + user guide + FAQ) and 5.10d2 (contextual tooltips) — per the bmad-dev-auto discipline. Do NOT silently expand scope.

7e. **Route registration.** Add the `/help` route (and optionally `/help/faq`) to `src/router/routes.js` as a child of the MainLayout route. Meta: `{ requiresAuth: true }` (no `requiresPermission` — help is available to all authenticated users). Add `meta.breadcrumb: 'Help'` (for the 5.10b `Breadcrumbs.vue` component). Lazy-load the page component: `component: () => import('pages/help/HelpPage.vue')`.

Prerequisites confirmed done: ALL prior MVP stories in all epics (1.1–1.11, 2.1–2.9, 3.1–3.10, 4.1–4.8, 4.12–4.13, 5.1–5.4, 5.7, 5.9, 5.11–5.14) are `done` in `docs/sprint-status.yaml`, and **5.10a, 5.10b, and 5.10c are `done`** (5.10c done 2026-08-05 after post-review patch `f5e5fc9`; see spec-5-10c Review Triage Log §2026-08-05). 5.10d depends on 5.10c — it adds the help icon to the same `MainLayout.vue` header that 5.10c added the notifications bell to (verify header spacing/overflow with both the bell and the help icon present). No spec file exists yet for 5.10d.

**REUSE-ONLY (no new Appwrite infrastructure — user decision 2026-08-10):**

- NO new tables, NO new server functions, NO new permissions, NO new `.env` variables, NO new stores.
- NEW frontend artifacts: `src/pages/help/HelpPage.vue` (user guide), `src/pages/help/FAQPage.vue` (or FAQ tab within HelpPage — spec decides), help icon + menu in `MainLayout.vue`, `/help` route in `src/router/routes.js`, `q-tooltip` additions on a bounded set of existing UI elements.
- MODIFIED frontend artifacts: `src/layouts/MainLayout.vue` (add help icon + menu between the bell and user profile), `src/router/routes.js` (add `/help` route), and the bounded set of pages/components receiving tooltips (the spec enumerates exact files).
- NO backend changes whatsoever.

**Existing header structure to verify (do NOT break):**

`MainLayout.vue` header (after 5.10c) renders: village name + version + quick-search `q-input` (width 260px, `class="gt-xs"`, with a `q-menu` results dropdown using `no-focus no-refocus`) + notifications bell `q-btn` (`icon="notifications"`, `class="q-mr-sm"`, with `q-badge` unread count, `q-menu`/`q-dialog` panel) + user profile `q-btn`. The drawer nav (sectioned `q-expansion-item`s with the 5.10b `expandedSections` route-watcher) is unchanged. 5.10d ADDS the help `q-btn` + `q-menu`/`q-dialog` to the same header toolbar. It MUST NOT break the 5.10b quick-search box, the 5.10c notifications bell + badge + panel + realtime subscription, the `expandedSections` auto-expand watcher, or the user menu. Verify the header does not overflow on md/sm/xs — the quick-search is already `gt-xs`; the help icon and bell MUST both remain visible on xs (place the help icon between the bell and the user profile, and confirm with `$q.screen` that xs does not overflow).

Continuity context from prior work (read these files before scaffolding):

- `src/layouts/MainLayout.vue` — the app shell. Header toolbar (after 5.10c: village name + version + quick-search `q-input` width 260px `gt-xs` + notifications bell `q-btn` + user profile `q-btn`) is where the help icon + menu go. Drawer nav holds the `q-expansion-item` sections and `expandedSections` reactive state + the 5.10b route-watcher. 5.10d adds the help icon + menu here. Read the full file before editing.
- `src/composables/useGlobalSearch.js` — the 5.10b quick-search composable. 5.10d does NOT touch it but shares the header; confirm no collision and that the help icon placement doesn't break the search input's `q-menu`.
- `src/stores/notifications-store.js` — the 5.10c notifications store. 5.10d does NOT touch it but shares the header; confirm the help icon placement doesn't break the bell's `q-menu`/`q-dialog`.
- `src/components/layout/NotificationPanel.vue` — the 5.10c notification panel. 5.10d does NOT touch it; confirm no collision with the help menu.
- `src/components/layout/Breadcrumbs.vue` — the 5.10b breadcrumbs component. The `/help` route needs `meta.breadcrumb: 'Help'` for this to render correctly.
- `src/router/routes.js` — where the `/help` route is registered (as a child of the MainLayout route). Match the existing route declaration pattern (lazy import, `meta: { requiresAuth: true }`).
- `src/stores/settings-store.js` — `settingsStore.modulesEnabled` for role-based section visibility in the user guide (hide sections for disabled modules). `settingsStore.villageName` for the About section.
- `src/composables/usePermissions.js` — `hasPermission` for any role-based content gating in the user guide (optional — the spec decides whether any guide sections are role-gated beyond the module-enabled check).
- `src/utils/module-registry.js` — `CORE_MODULE_KEYS` / `OPTIONAL_MODULE_KEYS` for iterating modules in the user guide.
- `docs/ux-specification.md` — §"Help Text" (line ~1580: "Contextual help for complex fields" — Medium priority), §"Accessibility" (tooltips, aria-labels), §"Header" / §"Global Elements" if present. The UX spec rates "contextual help" as Medium priority and "Help Text" for complex fields as Medium — this story delivers on both.
- `docs/PRD.md` — NFR-1 (Usability for Low Digital Literacy: "contextual help, intuitive workflows"), UX Design Principle 1 ("provide contextual help where needed"), NFR-10 (Accessibility: keyboard navigation, screen reader support).
- `docs/implementation-artifacts/spec-5-10c-notifications-system.md` — 5.10c spec (DONE); read to confirm 5.10c's header changes (bell + badge + panel + realtime subscription) so 5.10d's help icon placement doesn't collide. NOTE the post-review patch `f5e5fc9` (single-role Query.or fix) — the spec's Review Triage Log §2026-08-05 is authoritative for the current 5.10c code state.
- `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md` — 5.10b spec (DONE); read to confirm 5.10b's header changes (quick-search box, `expandedSections` watcher, breadcrumbs) so 5.10d's help icon placement and `/help` route breadcrumb don't collide.
- `docs/implementation-artifacts/deferred-work.md` — carry-forward items; the 5.10b `no-focus` search-menu accessibility item and the 5.10c realtime/reads-table items are owned by 5.10e (do NOT fix in 5.10d).
- `docs/implementation-artifacts/epic-5-context.md` — compiled epic context (reuse if valid; see step-01 rules).

Key design decisions for the spec to resolve:

- **FAQ structure:** a tab on `HelpPage.vue` (using `q-tabs`/`q-tab-panels` — simpler, one route, no extra route registration) vs. a separate `FAQPage.vue` at `/help/faq` (cleaner separation, but an extra route + component). The spec MUST pick one and justify. Recommend the tab approach for MVP simplicity (one route, one component, one lazy-load chunk).
- **User guide content structure:** `q-expansion-item` accordion (collapsible sections, compact) vs. linear scrollable page with `q-card` sections (always visible, more traditional). The spec MUST pick one. Recommend `q-expansion-item` for modules (Farm, School, Finance, etc. — users expand only what they need) and linear cards for Getting Started (always visible at top).
- **Role-based section visibility:** hide sections for disabled modules entirely vs. show a "This module is not enabled" note. The spec MUST pick one. Recommend showing the note (users may wonder why a section is missing; the note explains and points to Module Management).
- **Tooltip scope:** the spec MUST enumerate the exact 15-20 elements receiving tooltips (per 7d's CAP). Do NOT leave the tooltip set as TBD. Each tooltip must have exact text. The spec MUST verify each target element exists in the current codebase (read the files before listing them).
- **Help menu structure:** `q-menu` with `q-list`/`q-item` links (desktop) + `q-dialog` (mobile) vs. a simple `q-menu` that works on both. The spec MUST specify responsive behavior. Recommend `q-menu` for `gt.xs` and `q-dialog` for `xs` (matching the 5.10c notification panel pattern).
- **About section:** inline in the help menu (small `q-card` section) vs. a separate dialog. The spec MUST pick. Recommend inline in the help menu (simplest — version + village name + a link to the user guide).
- **SSR safety:** the help pages are pure Vue components with no Appwrite calls — they are inherently SSR-safe. The `settingsStore` data used for module-enabled visibility is already loaded by `MainLayout.vue`'s `onMounted` (client-side). During SSR, `settingsStore.modulesEnabled` may be empty/default — the guide should render all sections during SSR and hide disabled-module sections after hydration (or show all sections always — the spec decides; recommend rendering all sections during SSR for simplicity, then hiding after hydration if the module is disabled).
- **No new dependencies:** all UI components (`QBtn`, `QMenu`, `QDialog`, `QCard`, `QExpansionItem`, `QTabs`, `QTabPanel`, `QTooltip`, `QList`, `QItem`) are already in Quasar v2.18.5. No new npm packages.
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.10 ACs (AC7 is the focus for 5.10d; AC8 deferred to post-MVP) and Epic 5 story list
- docs/PRD.md — NFR-1 (Usability for Low Digital Literacy: "contextual help, intuitive workflows"), UX Design Principle 1 ("provide contextual help where needed"), NFR-10 (Accessibility), NFR-5 (mobile 320px+)
- docs/architecture.md — frontend route conventions, component structure, Quasar component usage patterns
- docs/ux-specification.md — §"Help Text" (line ~1580: "Contextual help for complex fields" — Medium priority), §"Accessibility" (tooltips, aria-labels, keyboard navigation), §"Header" / §"Global Elements" if present, §8 "Animation & Motion" for loading state patterns
- docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md — 5.10a spec (DONE); 5.10a did NOT touch MainLayout/routes.
- docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md — 5.10b spec (DONE); read to confirm 5.10b's header changes (quick-search box, `expandedSections` watcher, breadcrumbs) so 5.10d's help icon placement and `/help` route breadcrumb don't collide. NOTE the post-finalization patch `3152db1` — the spec's Review Triage Log §2026-08-05 is authoritative for the current 5.10b code state.
- docs/implementation-artifacts/spec-5-10c-notifications-system.md — 5.10c spec (DONE); read to confirm 5.10c's header changes (bell + badge + panel + realtime subscription) so 5.10d's help icon placement doesn't collide. NOTE the post-review patch `f5e5fc9` — the spec's Review Triage Log §2026-08-05 is authoritative for the current 5.10c code state.
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items; 5.10 AC8 deferral already documented during 5.10a; 5.10b/5.10c deferred items are owned by 5.10e (do NOT fix in 5.10d unless the tooltip/accessibility work naturally addresses them)
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms 5.10's dependency on all prior MVP stories

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.10d adds NO new permission keys (it is reuse-only); the `/help` route requires only `requiresAuth: true` (help is universal).
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
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT. (5.10d is AC7 — help icon + user guide + FAQ + a bounded set of contextual tooltips. If the spec derivation finds the tooltip scope still exceeds one iteration, HALT with a proposal to split 5.10d into 5.10d1 (help icon + user guide + FAQ) and 5.10d2 (contextual tooltips) — do NOT silently expand scope. The broader 5.10 was split into 5.10a–5.10e per user decision 2026-08-04.)

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate.
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: the help pages are pure Vue components with no Appwrite calls — inherently SSR-safe. The `settingsStore` data used for module-enabled visibility is loaded by `MainLayout.vue`'s `onMounted` (client-side); during SSR, render all sections (hide disabled-module sections after hydration if the spec decides). No `tables.listRows`, no realtime, no Functions calls in any 5.10d artifact.
- Quasar components for all UI primitives. No raw HTML controls. (5.10d adds UI: help `q-btn` + `q-menu`/`q-dialog` + `q-tooltip` on bounded elements + `HelpPage.vue` with `q-card`/`q-expansion-item`/`q-tabs`/`q-tab-panels` + `FAQPage.vue` or FAQ tab with `q-expansion-item` accordion — all Quasar components.)
- 5.10d is REUSE-ONLY: it adds NO new Appwrite infrastructure (no tables, no server functions, no permissions, no `.env` vars, no stores). The frontend artifacts modified/added are: `MainLayout.vue` (help icon + menu), `src/router/routes.js` (`/help` route), a new `src/pages/help/HelpPage.vue`, optionally a new `src/pages/help/FAQPage.vue`, and `q-tooltip` additions on a bounded set of existing pages/components (the spec enumerates exact files). The spec MUST include tasks for all modifications.
- Pinia stores: 5.10d creates NO new stores and REUSES `settingsStore` (for `modulesEnabled` + `villageName`).
- Date handling: N/A for 5.10d (no date display in help content beyond optional "last updated" metadata — the spec decides if needed).
- Permission checks: 5.10d adds NO new permission keys. The `/help` route requires only `requiresAuth: true` (help is universal). Role-based section visibility in the user guide uses `settingsStore.modulesEnabled` (module enabled/disabled), NOT `hasPermission` (role-based gating is optional — the spec decides).
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.10d <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.10d:

- **Help icon** renders in `MainLayout.vue` header between the 5.10c notifications bell and the user profile `q-btn`; it remains visible on xs (no header overflow introduced; 5.10b quick-search box still renders correctly on gt-xs; 5.10c bell + badge + panel still render correctly).
- **Help menu** opens on click (q-menu on desktop, q-dialog on xs); contains links to User Guide, FAQ, and About (version + village name); links navigate correctly.
- **User guide page** (`/help`) renders with all required sections (Getting Started, Navigation, Residents & Households, Finance, Inventory, Farm, School, Vendors, Calendar, Storage, Administration, Notifications); sections for disabled modules show "Not enabled" note (or are hidden — per spec decision); page is available to ALL authenticated users (no `requiresPermission`); SSR-safe (no Appwrite calls).
- **FAQ page** (or tab) renders with categorized Q&A entries (at least 3 per category, 15+ total — per spec's enumerated content); uses `q-expansion-item` accordion (collapsed by default); each entry has a real question and answer (no TBDs).
- **Contextual tooltips** (bounded to 15-20 per spec): each enumerated element has a `q-tooltip` with the specified text; tooltips do NOT clutter the interface (hover-triggered on desktop, absent on mobile where hover is unavailable — the spec decides whether to suppress on xs); tooltips have `aria-label` or are announced to screen readers (accessibility).
- **Route registration:** `/help` route exists in `src/router/routes.js` as a child of MainLayout with `meta: { requiresAuth: true, breadcrumb: 'Help' }`; lazy-loaded; the 5.10b `Breadcrumbs.vue` renders correctly on `/help`.
- **No new Appwrite infrastructure:** NO new tables, server functions, permissions, `.env` vars, or stores were added. Verify by checking `setup-appwrite.js`, `seed-roles.js`, `permissions.js`, `.env.example`, and `src/stores/` for any 5.10d-related additions (there should be NONE).
- **No backend changes:** no server functions modified, no `appwrite.config.json` changes, no seed data changes.
- The 5.10b quick-search box (incl. the post-finalization `no-focus` fixes from `3152db1`), the 5.10c notifications bell + badge + panel + realtime subscription, the `expandedSections` auto-expand watcher, breadcrumbs, the 5.10a dashboard real-data wiring, the 5.11 empty-state banners, the 5.9 module management, the 5.12/5.13 user/role management, the 5.14 password flows, and all prior module dashboards/pages are NOT broken.
- NO Guests/Equipment/Energy help sections or tooltips appear (deferred modules — their sections are absent or marked "Not available in MVP").
- If the spec set `warnings: [multiple-goals]` and HALTed to propose splitting 5.10d into 5.10d1/5.10d2, the review verifies the HALT was clean and no partial implementation was left.

**5.10 sub-story roadmap (for context — do NOT implement future sub-stories in this iteration):**

- **5.10a (DONE 2026-08-04):** Dashboard Completion — Real Data Wiring (AC1). Replaced placeholder data, verified widgets functional, <2s load.
- **5.10b (DONE 2026-08-05):** Navigation Polish — Breadcrumbs and Quick Search (AC2). Added breadcrumbs to detail/form/create/edit pages (Module → List → Detail, responsive), global header quick search with grouped results dropdown, fixed active highlighting (auto-expand nav section for active child route), clean-menu audit (removed dead `/communications` link). Post-finalization patch `3152db1` corrected a defective learner search (learners table has no name columns — reworked to search residents then resolve learner rows), the finance result field, and a header-search focus issue.
- **5.10c (DONE 2026-08-05):** Notifications System (AC3). New Appwrite `notifications` + `notification_reads` tables, `createNotification` server function (role-targeted delivery), notifications store, bell icon + count badge in MainLayout header, notification panel with filter by type and mark-as-read, Appwrite realtime live updates, and a bounded set of REAL role-targeted triggers (at-risk learner newly flagged → school roles; farm alert newly raised → `farm:read`; new vendor created → finance/farm roles). In-app only (email deferred). Post-review patch `f5e5fc9` fixed single-role users in `Query.or`. This was the only 5.10 sub-story that added new Appwrite infrastructure.
- **5.10d (THIS ITERATION):** Help and Documentation (AC7). Help icon in header, contextual tooltips on key UI elements, user guide page (`/help`), FAQ page (or tab). Reuse-only — no new Appwrite infrastructure.
- **5.10e:** UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9). Loading/error/success state consistency, accessibility audit (44px touch targets, 4.5:1 contrast, aria-labels), lazy loading, caching, <3s on 3G, mobile 320px+ audit, final testing checklist document. This is the FINAL 5.10 sub-story and the FINAL Epic 5 story — completing it marks 5.10 and Epic 5 as done.
- **AC8 (System Health Monitoring): DEFERRED to post-MVP** (user decision 2026-08-04). Document thoroughly in `deferred-work.md` during 5.10e: Admin page showing DB size, storage usage, active users, error logs; likely needs a new server function. Not implemented in MVP.

**Prior Epic 5 story summaries (for regression-checking context):**

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` "Add User" button (System Admin only). Server-side Appwrite Function for admin-scope user creation. Soft-deactivate. Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog. "View Permissions" shows effective permission union. `/admin/roles` page: role list with permission matrix. Read-only for MVP. `seed-roles.js` upsert-capable. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile → Admin User → Village Head → Module Selection → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages. Last-System-Admin guard added to `updateUser`. Deps: 5.9, 5.12. DONE 2026-08-04.

**5.10a (Dashboard Completion — Real Data Wiring):** Replaced `DashboardPage.vue` placeholder data with real, permission-gated Appwrite fetches via new `src/composables/useDashboardData.js` (household/resident counts via `Query.limit(1)` + `.total`; finance totals via `financeStore.fetchSummary()`; recent activity via per-module `tables.listRows` with `Query.orderDesc('$createdAt')` + `Query.limit(3)`, merged/sorted/sliced to 8). Extended `QuickStatsWidget` with Total Income/Total Expense cards. Each module fetch isolated (try/catch) so one failure doesn't break the dashboard. SSR-safe (onMounted only). AC8 (System Health Monitoring) deferred to post-MVP and documented in `deferred-work.md`. NOTE: a 300ms `setTimeout` hydration delay remains in `useDashboardData.load()` — candidate for removal in 5.10e performance audit. Dep: all prior MVP stories. DONE 2026-08-04.

**5.10b (Navigation Polish — Breadcrumbs and Quick Search):** Added reusable `src/components/layout/Breadcrumbs.vue` (responsive Module → List → Detail, mobile back-button-only) replacing ad-hoc Back buttons on 22 detail/form/create/edit pages; added `meta.breadcrumb` to existing routes; added `src/composables/useGlobalSearch.js` (permission-gated, SSR-safe quick search across households/residents/finance/plots/learners/vendors/inventory/calendar + nav items, grouped dropdown); added a route watcher in `MainLayout.vue` to auto-expand the active `expandedSections` key; removed the dead `/communications` nav link. Post-finalization patch `3152db1` (2026-08-05) corrected a defective learner search (the `learners` table has NO `first_name`/`last_name` columns — it joins `residents` via `resident_id`; reworked to search residents first then resolve learner rows), the finance result secondary field (`amount_funded ?? amount` + ZMW currency + date), and a header-search focus issue (`no-focus no-refocus` on the results `q-menu`). The 5.10b spec's `final_revision` is `3152db1`; its Review Triage Log §2026-08-05 is authoritative for the current code state. Dep: 5.10a. DONE 2026-08-05.

**5.10c (Notifications System):** Added new Appwrite `notifications` table (role-targeted, one row per event) and `notification_reads` table (per-user read receipts, row-secured matching the `file_metadata` precedent). New `createNotification` Appwrite Function derives `target_roles` from a hardcoded `TYPE_CONFIG` authorization+targeting matrix (never trusts client-supplied targeting; validates caller permission per type). New `src/stores/notifications-store.js` Pinia store (fetchMyNotifications with role-intersection query + read-receipt join, unreadCount getter, markRead/markAllRead, filterByType, createNotification helper). Bell `q-btn` + `q-badge` + `NotificationPanel.vue` in `MainLayout.vue` header (q-menu desktop, q-dialog mobile). Appwrite realtime subscription with 30s polling fallback. Exactly 3 triggers: at-risk learner newly flagged (school roles, dedup by type+related_entity_type+related_entity_id), farm alert newly raised (farm roles, same dedup), new vendor created (finance/farm roles). Seeded demo notifications in `seedAllData`. Review: 2 patches (1 high — deterministic SHA-256 rowId for race-free dedup; 1 low — missing `delete` permission on `notification_reads`), 3 deferred items (table-level create griefing vector, realtime sync-only error handling, at-risk 60s cache re-flip suppression — all pre-existing-pattern-class, owned by 5.10e), 7 rejected findings. Post-review patch `f5e5fc9` fixed single-role users in `Query.or` (used `Query.contains` for single role, `Query.or`+`Query.contains` for multiple). Dep: 5.10b. DONE 2026-08-05.
