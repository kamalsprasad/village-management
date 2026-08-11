# /bmad-dev-auto Prompt — Epic 5 Final Story (5.10 Sub-Stories: 5.10a → 5.10e, with 5.10e split into 5.10e1 → 5.10e4)

> **Usage:** Copy everything below the `---` line into a fresh `/bmad-dev-auto` invocation.
> **Adapting for subsequent iterations:** Change ONLY the three sections marked
> `<<< CHANGE PER ITERATION >>>` — (1) Current Iteration Target, (2) Story X.Y Specifics,
> (3) Review invariants. Everything else is campaign-level context that stays constant.
> The MVP dependency order in "Epic 5 MVP Scope" tells you which sub-story is next after
> each completion.
>
> **Sub-story split (user decision 2026-08-04):** Story 5.10 "System Completion" has 9 broad
> ACs spanning 6+ independently shippable features. Per the bmad-dev-auto discipline rules
> ("HALT if the intent resolves to multiple independently shippable goals"), 5.10 is split
> into sub-stories 5.10a–5.10e, each processed in its own iteration. AC8 (System Health
> Monitoring) is deferred to post-MVP with thorough documentation (user decision 2026-08-04).
> AC3 (Notifications) is included in MVP as sub-story 5.10c (user decision 2026-08-04).
>
> **5.10e sub-split (user decision 2026-08-11):** 5.10e itself covers 4 broad ACs
> (AC4 UX polish/accessibility, AC5 performance, AC6 mobile responsiveness, AC9 final
> testing checklist) — the same multi-goal pattern that caused 5.10 to be split. Per the
> bmad-dev-auto discipline, 5.10e is pre-split into sub-stories 5.10e1–5.10e4, each
> processed in its own iteration. AC9's automated test infrastructure is deferred to a new
> post-MVP testing epic (user decision 2026-08-11); 5.10e4 produces only a manual final
> testing checklist doc for MVP. Completing 5.10e4 marks 5.10 and Epic 5 as done.

---

You are running bmad-dev-auto for the Sustainable Model Village Management System (village-app). This invocation processes EXACTLY ONE story this iteration and HALT cleanly so the next iteration can pick up the next story.

## Current Iteration Target <<< CHANGE PER ITERATION >>>

Epic: 5 — "Village Calendar, Storage, Optional Modules, and User Management"
Story to implement THIS iteration: 5.10e1 — UX Polish and Accessibility (AC4)
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-10e1-ux-polish-and-accessibility.md

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
11. 5.10 System Completion — split into sub-stories (user decision 2026-08-04; 5.10e re-split 2026-08-11):
    - ✅ 5.10a Dashboard Completion — Real Data Wiring and Widget Finalization (AC1) — DONE 2026-08-04
    - ✅ 5.10b Navigation Polish — Breadcrumbs and Quick Search (AC2) — DONE 2026-08-05 (post-finalization patch `3152db1` applied; see spec-5-10b Review Triage Log §2026-08-05)
    - ✅ 5.10c Notifications System (AC3) — includes new Appwrite `notifications` table — DONE 2026-08-05 (post-review patch `f5e5fc9` applied; see spec-5-10c Review Triage Log §2026-08-05)
    - ✅ 5.10d Help and Documentation (AC7) — DONE 2026-08-10 (post-review patch `4abd369` applied; see spec-5-10d Review Triage Log §2026-08-10)
    - 5.10e UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist — split into sub-stories (user decision 2026-08-11):
      - 5.10e1 UX Polish and Accessibility (AC4) ← THIS ITERATION
      - 5.10e2 Performance Optimization (AC5)
      - 5.10e3 Mobile Responsiveness (AC6)
      - 5.10e4 Final Testing Checklist (AC9 — manual doc; automated test infra deferred to new post-MVP testing epic)
    - AC8 System Health Monitoring — DEFERRED to post-MVP (user decision 2026-08-04; documented in deferred-work.md during 5.10a; 5.10e4 will verify/expand the deferral entry)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11, 5.10 AC8 (System Health Monitoring).

## Story 5.10e1 Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the UX Polish and Accessibility sub-story for MVP Story 5.10. Implement Story 5.10 AC4: "UX polish: consistent UI, loading states, error handling, success confirmations, accessibility." This sub-story is an AUDIT + BOUNDED-FIX pass across the existing MVP pages — it audits Quasar component usage consistency, loading-state coverage during async fetches, error-handling consistency (useErrorHandler + error banner with retry), success-notification consistency (Notify.create positive on CUD), and accessibility (aria-labels on icon-only buttons, keyboard navigation, 4.5:1 color contrast, screen-reader announcements). It also fixes the two accessibility deferred items owned by 5.10e1 (from 5.10b): the Breadcrumbs.vue mobile back-button aria-label regression and the quick-search results `no-focus no-refocus` keyboard-navigability issue. This is a REUSE-ONLY story — NO new Appwrite tables, server functions, permissions, `.env` variables, stores, pages, or routes. It MODIFIES existing pages/components for consistency and a11y. It MAY extract a small shared composable/component IF a fix pattern is repeated across many pages (e.g., an ErrorBanner or LoadingState component) — but the spec MUST first verify no such shared component already exists and justify any extraction. This is Story 5.10 AC4 only — AC5 (performance) is 5.10e2, AC6 (mobile responsiveness) is 5.10e3, AC9 (final testing checklist) is 5.10e4. The 44px touch-target audit is AC6 (5.10e3), NOT AC4 — do NOT pull touch-target work into 5.10e1. The 300ms `setTimeout` in `useDashboardData.js` is a performance item owned by 5.10e2, NOT 5.10e1. AC8 (System Health Monitoring) is deferred to post-MVP.

Like 5.10d, 5.10e1 is REUSE-ONLY: it adds NO new Appwrite tables, NO new server functions, NO new permissions, NO new `.env` variables, NO new stores, NO new pages, and NO new routes. It MODIFIES a bounded set of existing pages/components for UI consistency and accessibility. It REUSES the existing `useErrorHandler` composable, the existing `Notify` (Quasar Notify.create) pattern, the existing Quasar loading components (`q-spinner`, `q-skeleton`, `q-linear-progress` — whichever the spec identifies as the dominant established pattern), and the existing `Breadcrumbs.vue` / `useGlobalSearch.js` from 5.10b. No existing module stores, server functions, Appwrite tables, or route definitions are touched.

ACs (from docs/epics.md Story 5.10 AC4 — treat as authoritative):

4. UX polish: consistent UI, loading states, error handling, success confirmations, accessibility.

Sub-ACs for 5.10e1 (derived from AC4):

4a. **Consistent UI audit.** Audit Quasar component usage consistency across all MVP pages: `q-btn` variants (flat/outline/unelevated consistency for primary vs secondary actions), `q-card` padding/spacing, `q-page` padding, heading hierarchy (h4/h5/h6 consistency), `q-banner` usage for info/warning/error states. The spec MUST enumerate the specific inconsistencies found (with file:line) and the fix for each. CAP at 10-15 consistency fixes to keep within one iteration — do NOT restyle the entire app. If the audit finds more than 15, prioritize the highest-traffic surfaces (dashboard, list pages, primary forms) and document the rest for post-MVP.

4b. **Loading states audit.** Audit every async page (pages that fetch data in `onMounted`/setup) for a loading state during fetch: `q-spinner` / `q-skeleton` / `q-linear-progress` / "Loading..." text — whichever the spec identifies as the dominant established pattern (check 3-5 existing pages that do this well and standardize to that pattern). Pages missing a loading state (blank screen or rendered-empty-state-during-fetch) get one added. The spec MUST enumerate which pages lack loading states (with file:line) and the fix for each. CAP at 10-15 pages.

4c. **Error handling audit.** Audit every async page for consistent error handling: `useErrorHandler` composable usage, error banner with retry button (matching the existing best-in-class pattern — the spec identifies which page has the cleanest error UI and standardizes to it). Pages with silent failures, `console.error`-only handling, or inconsistent error UI get fixed. The spec MUST enumerate the inconsistencies (with file:line) and the fix for each. CAP at 10-15 fixes. If the fix pattern is repeated across many pages, the spec MAY extract a shared `ErrorBanner.vue` component — but MUST first verify no such component exists (check `src/components/`) and justify the extraction.

4d. **Success confirmations audit.** Audit every CUD (create/update/delete) action for a consistent success notification: Quasar `Notify.create` with consistent type (`positive`), position, timeout, and message format. Actions missing success notifications or using inconsistent format (e.g., `notify` vs `Notify.create`, varying position, missing type) get fixed. The spec MUST enumerate the inconsistencies (with file:line) and the fix for each. CAP at 10-15 fixes.

4e. **Accessibility audit.** Audit key surfaces for accessibility: (1) `aria-label` on icon-only `q-btn`s (buttons with `icon` but no text label — screen readers need an accessible name); (2) keyboard navigation (focus indicators visible, tab order logical, focus-trap in dialogs); (3) 4.5:1 color contrast (audit Quasar theme key color pairs: primary, secondary, negative, warning, info, positive against white/dark text — manual sampling); (4) screen-reader announcements for dynamic content (`Notify` announcements, dialog open/close). The spec MUST enumerate the specific a11y issues found (with file:line) and the fix for each. CAP at 15-20 a11y fixes — prioritize icon-only buttons missing aria-labels (highest impact for screen-reader users), then contrast violations, then keyboard-nav gaps.

4f. **Deferred-item fixes (from 5.10b — owned by 5.10e1).** Fix the two accessibility deferred items that originate from the 5.10b review:

- **Breadcrumbs.vue mobile back-button a11y regression:** the 5.10b review noted that replacing ad-hoc Back buttons with the shared `Breadcrumbs.vue` component dropped several pages' destination-specific back-button tooltips/aria-labels in favor of a single generic `aria-label="Back"`. Restore destination-specific aria-labels on the `Breadcrumbs.vue` mobile back button (e.g., `aria-label="Back to Households"` — derive the destination from the breadcrumb trail). The spec MUST enumerate the exact aria-label text per page context or a generic-but-informative pattern.
- **Quick-search results `q-menu` keyboard navigability:** the 5.10b post-finalization patch `3152db1` added `no-focus no-refocus` to the search results `q-menu` to stop focus-stealing while typing. This may reduce keyboard navigability (arrow-key/Tab traversal of result rows). The spec MUST verify whether keyboard navigation is actually broken (test the current behavior), and if so, restore arrow-key/Tab traversal WITHOUT re-introducing the focus-steal regression that `3152db1` fixed. Investigate Quasar `q-menu` props (`focus-on-ready`, `auto-focus`, keyboard navigation) for a solution that preserves typing fluency while allowing keyboard result selection.

CAP RATIONALE: AC4 is an audit across the entire app, which is unbounded. Each sub-AC (4a-4f) caps its fix set to keep within one iteration. The spec MUST enumerate the exact fix set per sub-AC (file:line + fix description) — do NOT leave the fix set as TBD. If the total fix count across all sub-ACs exceeds one iteration, set `warnings: [multiple-goals]` and HALT with a proposal to split 5.10e1 into 5.10e1a (consistency + loading + error + success — 4a-4d) and 5.10e1b (accessibility audit + deferred a11y fixes — 4e-4f) — per the bmad-dev-auto discipline. Do NOT silently expand scope.

Prerequisites confirmed done: ALL prior MVP stories in all epics (1.1–1.11, 2.1–2.9, 3.1–3.10, 4.1–4.8, 4.12–4.13, 5.1–5.4, 5.7, 5.9, 5.11–5.14) are `done` in `docs/sprint-status.yaml`, and **5.10a, 5.10b, 5.10c, and 5.10d are `done`** (5.10d done 2026-08-10 after post-review patch `4abd369`; see spec-5-10d Review Triage Log §2026-08-10). 5.10e1 depends on 5.10d — it audits the pages/components that 5.10a–5.10d built (including the 5.10d tooltips and help icon, the 5.10c bell/panel, the 5.10b breadcrumbs/quick-search, and all prior module pages). No spec file exists yet for 5.10e1.

**REUSE-ONLY (no new Appwrite infrastructure — user decision 2026-08-11):**

- NO new tables, NO new server functions, NO new permissions, NO new `.env` variables, NO new stores, NO new pages, NO new routes.
- MODIFIED frontend artifacts: a bounded set of existing pages/components across `src/pages/`, `src/modules/*/pages/`, `src/components/`, and `src/layouts/MainLayout.vue` — the spec enumerates exact files per sub-AC (4a-4f) with file:line + fix.
- NEW frontend artifacts (only if justified per 4c/4b): OPTIONALLY a shared `src/components/common/ErrorBanner.vue` and/or `src/components/common/LoadingState.vue` IF the spec verifies no equivalent shared component exists AND the fix pattern is repeated across enough pages to justify extraction. The spec MUST justify any new component; default is in-place fixes.
- NO backend changes whatsoever.

**Existing app structure to audit (do NOT break functionality):**

5.10e1 is an audit-and-fix pass across the existing MVP surface. The app (after 5.10d) renders via `MainLayout.vue`: header toolbar (village name + version + quick-search `q-input` width 260px `gt-xs` with `q-menu` results dropdown using `no-focus no-refocus` + notifications bell `q-btn` with `q-badge` + help `q-btn` with `q-menu`/`q-dialog` + user profile `q-btn`) and drawer nav (sectioned `q-expansion-item`s with the 5.10b `expandedSections` route-watcher, 5.10d tooltips on section headers). Pages span: Dashboard, Households, Residents, Finance (transactions/categories/funding/lending/reports), Inventory, Farm (plots/crops/plantings/harvests/sales/alerts), School (learners/attendance/scores/at-risk/interventions/calendar/bell/timetable/goals/reports), Vendors, Calendar, Storage (personal/shared/settings), Admin (users/roles/modules), Settings (village/storage), Help (`/help`), Profile, Auth. 5.10e1 MUST NOT break any of these pages' functionality — it only polishes UI/a11y. The 5.10b quick-search, 5.10c bell + badge + panel + realtime subscription, 5.10d help icon + menu + tooltips, `expandedSections` watcher, and all module CRUD flows must continue to work after the polish pass.

Continuity context from prior work (read these files before scaffolding):

- `src/composables/useErrorHandler.js` — the existing error-handling composable. 5.10e1 audits consistent usage across all async pages and standardizes to the best existing pattern. Read this first to understand the established error-handling contract.
- `src/layouts/MainLayout.vue` — the app shell (after 5.10d: village name + version + quick-search + bell + help icon + user profile). 5.10e1 audits header a11y (aria-labels on icon-only buttons — bell, help, profile, menu-toggle) but does NOT change header layout or break 5.10b/5.10c/5.10d functionality. Read the full file before editing.
- `src/components/layout/Breadcrumbs.vue` — the 5.10b breadcrumbs component. 5.10e1 fixes the mobile back-button a11y regression (restore destination-specific aria-labels). Read to understand the current `aria-label="Back"` generic pattern and how the breadcrumb trail is computed.
- `src/composables/useGlobalSearch.js` — the 5.10b quick-search composable. 5.10e1 fixes the `no-focus no-refocus` keyboard-navigability issue on the results `q-menu` in `MainLayout.vue`. Read to understand the search flow and the `3152db1` focus-steal fix.
- `src/components/layout/NotificationPanel.vue` — the 5.10c notification panel. 5.10e1 audits its a11y (aria-labels, keyboard nav) but does NOT change its notification functionality.
- `src/components/layout/HelpMenuList.vue` — the 5.10d help menu list. 5.10e1 audits its a11y but does NOT change its navigation functionality.
- `src/pages/help/HelpPage.vue` — the 5.10d help page. 5.10e1 audits its a11y (q-expansion-item keyboard nav, tab keyboard nav) but does NOT change its content.
- `src/router/routes.js` — the route definitions. 5.10e1 does NOT add/remove routes but reads this to enumerate all async pages for the loading-state/error-handling audit.
- `docs/ux-specification.md` — §"Accessibility" (aria-labels, keyboard navigation, screen reader support, 4.5:1 contrast), §"Loading States" / §"Animation & Motion" (loading patterns), §"Error Handling" if present, §"Help Text". The UX spec rates accessibility and contextual help — 5.10e1 delivers the a11y audit.
- `docs/PRD.md` — NFR-1 (Usability for Low Digital Literacy), NFR-10 (Accessibility: keyboard navigation, screen reader support), UX Design Principles (consistency, intuitive workflows).
- `docs/implementation-artifacts/spec-5-10d-help-and-documentation.md` — 5.10d spec (DONE); read to confirm 5.10d's 20 tooltips and help icon are in place so 5.10e1's a11y audit includes them (verify the 5.10d tooltips have appropriate aria behavior — q-tooltip is hover-triggered, which is fine for a11y per the 5.10d spec decision).
- `docs/implementation-artifacts/spec-5-10c-notifications-system.md` — 5.10c spec (DONE); read to confirm the bell/panel a11y surface and the deferred realtime/reads-table items (5.10e1 does NOT fix the 3 security/realtime deferred items — they are re-deferred to post-MVP per user decision 2026-08-11).
- `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md` — 5.10b spec (DONE); read to confirm the two deferred a11y items (Breadcrumbs back-button, quick-search `no-focus`) that 5.10e1 picks up, and the post-finalization patch `3152db1` context.
- `docs/implementation-artifacts/deferred-work.md` — carry-forward items; 5.10e1 picks up the 2 fitting a11y items (Breadcrumbs back-button, quick-search keyboard nav) and the 300ms setTimeout is owned by 5.10e2 (NOT 5.10e1). The 3 security/realtime items (notification_reads griefing, realtime async-failure, at-risk cache re-flip) are re-deferred to post-MVP per user decision 2026-08-11 — 5.10e1 does NOT fix them.
- `docs/implementation-artifacts/epic-5-context.md` — compiled epic context (reuse if valid; see step-01 rules).

Key design decisions for the spec to resolve:

- **Fix cap per sub-AC:** the spec MUST cap each sub-AC's fix set (recommend 10-15 per sub-AC for 4a-4d, 15-20 for 4e, 2 specific fixes for 4f) to keep within one iteration. If the total across all sub-ACs exceeds one iteration, HALT with `warnings: [multiple-goals]` and a split proposal (5.10e1a = 4a-4d, 5.10e1b = 4e-4f). Do NOT silently expand scope.
- **Error banner pattern:** is there an existing shared `ErrorBanner.vue`/`ErrorState.vue` component, or do pages implement error UI ad-hoc (q-banner inline, Notify.create error, blank)? The spec MUST grep `src/components/` for existing error/loading components, identify the best-in-class error UI page, and decide: standardize in-place (fix each page's ad-hoc error UI to match the best pattern) OR extract a shared component (justify with the repetition count). Recommend in-place fixes unless >8 pages share the identical ad-hoc pattern.
- **Loading state pattern:** which Quasar loading pattern is dominant (`q-spinner`? `q-skeleton`? `q-linear-progress`? a `loading` ref + v-if?)? The spec MUST sample 3-5 existing pages that handle loading well, identify the dominant pattern, and standardize pages missing loading states to it. Recommend the simplest dominant pattern (likely `q-spinner` or a `loading` ref + conditional).
- **Success notification format:** what's the established `Notify.create` format (position: top/bottom/right? type: positive? timeout? message prefix verb "Saved"/"Created"/"Deleted")? The spec MUST grep `Notify.create` across the codebase, identify the dominant format, and standardize outliers to it.
- **Contrast audit method:** how to verify 4.5:1 contrast — manual sampling of Quasar theme key color pairs (primary, secondary, negative, warning, info, positive vs. white/dark text) using a contrast checker tool, OR automated (e.g., axe-core — but that's a new dependency, which would HALT). Recommend manual sampling of the ~10 key color pairs; document results in the spec. If any pair fails, the spec MUST propose a theme-color fix (in `src/css/quasar.variables.scss` or equivalent) — but changing theme colors is high-blast-radius; the spec should flag it and recommend a user decision if a contrast failure is found.
- **Quick-search keyboard nav fix:** the spec MUST verify whether the `no-focus no-refocus` on the search results `q-menu` actually breaks keyboard navigation (test current behavior), and if so, investigate Quasar `q-menu` props for a solution that preserves typing fluency (no focus-steal) while allowing arrow-key/Tab result selection. If no Quasar-native solution exists, the spec MAY propose a minimal custom keydown handler — but MUST justify it and keep it bounded. If the fix proves complex, the spec MAY defer this specific item to post-MVP with rationale (it's a single deferred item, not a full sub-AC).
- **44px touch targets:** AC4 mentions accessibility broadly, but the 44px touch-target check is AC6 (mobile responsiveness, 5.10e3) — NOT AC4. 5.10e1 MUST NOT pull touch-target sizing into its a11y audit. The spec's 4e sub-AC covers aria-labels, keyboard nav, contrast, and screen-reader announcements only.
- **No new dependencies:** all fixes use existing Quasar components and existing composables. No new npm packages. If a contrast-checker or a11y-scanner dependency would be needed, HALT with `new dependency required: <name> — user approval needed`.
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.10 ACs (AC4 is the focus for 5.10e1; AC5/AC6/AC9 are 5.10e2/e3/e4; AC8 deferred to post-MVP) and Epic 5 story list
- docs/PRD.md — NFR-1 (Usability for Low Digital Literacy: "contextual help, intuitive workflows"), UX Design Principles (consistency, intuitive workflows), NFR-10 (Accessibility: keyboard navigation, screen reader support, 4.5:1 contrast), NFR-5 (mobile 320px+ — this is 5.10e3's concern, referenced for boundary clarity)
- docs/architecture.md — frontend component structure, Quasar component usage patterns, composable conventions (useErrorHandler)
- docs/ux-specification.md — §"Accessibility" (aria-labels, keyboard navigation, screen reader support, 4.5:1 contrast), §"Loading States" / §8 "Animation & Motion" (loading patterns), §"Error Handling" if present, §"Help Text"
- docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md — 5.10a spec (DONE); 5.10e1 audits the dashboard's loading/error states and the 300ms setTimeout (but the setTimeout fix is owned by 5.10e2, NOT 5.10e1).
- docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md — 5.10b spec (DONE); the two deferred a11y items (Breadcrumbs back-button aria-label, quick-search `no-focus` keyboard nav) originate here and are owned by 5.10e1. NOTE the post-finalization patch `3152db1` — the spec's Review Triage Log §2026-08-05 is authoritative for the current 5.10b code state.
- docs/implementation-artifacts/spec-5-10c-notifications-system.md — 5.10c spec (DONE); 5.10e1 audits the bell/panel a11y but does NOT fix the 3 security/realtime deferred items (re-deferred to post-MVP per user decision 2026-08-11). NOTE the post-review patch `f5e5fc9`.
- docs/implementation-artifacts/spec-5-10d-help-and-documentation.md — 5.10d spec (DONE); 5.10e1 audits the 5.10d help icon/menu/tooltips a11y but does NOT change their functionality. NOTE the post-review patch `4abd369`.
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items; 5.10e1 picks up the 2 fitting a11y items (Breadcrumbs back-button, quick-search keyboard nav); the 300ms setTimeout is owned by 5.10e2; the 3 security/realtime items (notification_reads griefing, realtime async-failure, at-risk cache re-flip) are re-deferred to post-MVP per user decision 2026-08-11 — 5.10e1 does NOT fix them.
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms 5.10's dependency on all prior MVP stories

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.10e1 adds NO new permission keys and changes NO route guards (it is a polish/a11y pass on existing pages).
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
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT. (5.10e1 is AC4 — consistent UI + loading states + error handling + success confirmations + accessibility + 2 deferred a11y fixes. Each sub-AC (4a-4f) caps its fix set. If the spec derivation finds the total fix count still exceeds one iteration, HALT with a proposal to split 5.10e1 into 5.10e1a (consistency + loading + error + success — 4a-4d) and 5.10e1b (accessibility + deferred a11y fixes — 4e-4f) — do NOT silently expand scope. The broader 5.10 was split into 5.10a–5.10e per user decision 2026-08-04, and 5.10e was split into 5.10e1–5.10e4 per user decision 2026-08-11.)

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate. (5.10e1 reuses `useErrorHandler`, `Notify`, existing Quasar loading components, `Breadcrumbs.vue`, `useGlobalSearch.js`.)
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: 5.10e1 modifies existing pages' templates and adds aria-labels/keyboard handlers — all client-safe. No new `tables.listRows`, realtime, or Functions calls are introduced. Loading/error state additions use existing reactive refs (`loading`, `error`) already present in most pages' `onMounted` fetch flows. Any new component (e.g., `ErrorBanner.vue` IF justified) must be SSR-safe (no Appwrite calls, no `window`/`document` access at module scope).
- Quasar components for all UI primitives. No raw HTML controls. (5.10e1 uses: `q-spinner`/`q-skeleton`/`q-linear-progress` for loading states, `q-banner` for error states, `Notify.create` for success confirmations, `aria-label`/`role`/`tabindex` attributes for a11y, existing Quasar keyboard-nav where available — all Quasar/standard HTML attributes.)
- 5.10e1 is REUSE-ONLY: it adds NO new Appwrite infrastructure (no tables, no server functions, no permissions, no `.env` vars, no stores, no pages, no routes). The frontend artifacts modified are a bounded set of existing pages/components (the spec enumerates exact files per sub-AC 4a-4f). OPTIONALLY a shared `ErrorBanner.vue` and/or `LoadingState.vue` may be added IF the spec justifies extraction (per 4b/4c design decisions). The spec MUST include tasks for all modifications.
- Pinia stores: 5.10e1 creates NO new stores and modifies NO existing stores (it only touches page/component templates and adds aria/keyboard attributes).
- Date handling: N/A for 5.10e1 (no date logic changes — this is a UI/a11y polish pass).
- Permission checks: 5.10e1 adds NO new permission keys and changes NO route guards. It does NOT alter which users can see which pages — only how those pages render (consistency, loading, error, success, a11y).
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.10e1 <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.10e1:

- **Consistent UI (4a):** each enumerated consistency fix (per spec's 4a fix list) is applied at the exact file:line specified; `q-btn` variants, `q-card` spacing, heading hierarchy, and `q-banner` usage match the standardized pattern; no page's functionality is broken by the restyling (buttons still trigger their handlers, forms still submit, navigation still works).
- **Loading states (4b):** each enumerated page missing a loading state now shows the standardized loading pattern (q-spinner/q-skeleton/etc.) during async fetch; the loading state clears when data arrives or an error occurs; no page shows a blank screen or a premature empty-state during fetch.
- **Error handling (4c):** each enumerated page with inconsistent/silent error handling now uses the standardized error pattern (useErrorHandler + error banner with retry); the retry button re-fetches; errors don't crash the page; if a shared `ErrorBanner.vue` was extracted, it's reused consistently and is SSR-safe.
- **Success confirmations (4d):** each enumerated CUD action now shows a consistent `Notify.create` success notification (positive type, consistent position/format); no action silently succeeds without user feedback; no action uses an inconsistent notification format.
- **Accessibility (4e):** each enumerated icon-only `q-btn` now has an `aria-label`; keyboard navigation works on audited surfaces (focus indicators visible, tab order logical, dialogs focus-trap); 4.5:1 contrast audit results are documented (no failing pair left unfixed or unflagged); screen-reader announcements work for Notify/dialogs. If a contrast failure required a theme-color change, verify the change is documented and the user was notified (high-blast-radius change).
- **Deferred a11y fixes (4f):** `Breadcrumbs.vue` mobile back button now has destination-specific aria-labels (not just generic "Back"); the quick-search results `q-menu` keyboard navigation is restored (arrow-key/Tab traversal works) WITHOUT re-introducing the focus-steal regression that `3152db1` fixed (typing in the search box remains fluent — the `no-focus no-refocus` fix's purpose is preserved).
- **No new Appwrite infrastructure:** NO new tables, server functions, permissions, `.env` vars, stores, pages, or routes were added. Verify by checking `setup-appwrite.js`, `seed-roles.js`, `permissions.js`, `.env.example`, `src/stores/`, `src/router/routes.js`, and `src/pages/` for any 5.10e1-related additions (there should be NONE, except OPTIONALLY a shared `ErrorBanner.vue`/`LoadingState.vue` in `src/components/common/` IF the spec justified extraction).
- **No backend changes:** no server functions modified, no `appwrite.config.json` changes, no seed data changes.
- The 5.10b quick-search box, the 5.10c notifications bell + badge + panel + realtime subscription, the 5.10d help icon + menu + 20 tooltips, the `expandedSections` auto-expand watcher, breadcrumbs, the 5.10a dashboard real-data wiring, the 5.11 empty-state banners, the 5.9 module management, the 5.12/5.13 user/role management, the 5.14 password flows, and all prior module dashboards/pages are NOT broken — 5.10e1 only polishes UI/a11y, it does not change any page's data flow or permissions.
- NO 44px touch-target sizing changes appear in 5.10e1 (that's AC6 / 5.10e3, NOT AC4). NO 300ms setTimeout removal appears in 5.10e1 (that's AC5 / 5.10e2). NO performance/caching changes appear in 5.10e1 (that's 5.10e2). NO testing-checklist doc is produced in 5.10e1 (that's 5.10e4). NO security/realtime fixes (notification_reads griefing, realtime async-failure, at-risk cache re-flip) appear in 5.10e1 (re-deferred to post-MVP per user decision 2026-08-11).
- If the spec set `warnings: [multiple-goals]` and HALTed to propose splitting 5.10e1 into 5.10e1a/5.10e1b, the review verifies the HALT was clean and no partial implementation was left.

**5.10 sub-story roadmap (for context — do NOT implement future sub-stories in this iteration):**

- **5.10a (DONE 2026-08-04):** Dashboard Completion — Real Data Wiring (AC1). Replaced placeholder data, verified widgets functional, <2s load.
- **5.10b (DONE 2026-08-05):** Navigation Polish — Breadcrumbs and Quick Search (AC2). Added breadcrumbs to detail/form/create/edit pages (Module → List → Detail, responsive), global header quick search with grouped results dropdown, fixed active highlighting (auto-expand nav section for active child route), clean-menu audit (removed dead `/communications` link). Post-finalization patch `3152db1` corrected a defective learner search (learners table has no name columns — reworked to search residents then resolve learner rows), the finance result field, and a header-search focus issue.
- **5.10c (DONE 2026-08-05):** Notifications System (AC3). New Appwrite `notifications` + `notification_reads` tables, `createNotification` server function (role-targeted delivery), notifications store, bell icon + count badge in MainLayout header, notification panel with filter by type and mark-as-read, Appwrite realtime live updates, and a bounded set of REAL role-targeted triggers (at-risk learner newly flagged → school roles; farm alert newly raised → `farm:read`; new vendor created → finance/farm roles). In-app only (email deferred). Post-review patch `f5e5fc9` fixed single-role users in `Query.or`. This was the only 5.10 sub-story that added new Appwrite infrastructure.
- **5.10d (DONE 2026-08-10):** Help and Documentation (AC7). Help icon in header (between bell and user profile), responsive help menu (q-menu desktop / q-dialog mobile) with User Guide / FAQ / About, new `/help` page with User Guide tab (12 sections, module-enabled-aware for Farm/School/Vendors) and FAQ tab (17 Q&A across 5 categories), and exactly 20 enumerated `q-tooltip` elements across MainLayout.vue and 9 other existing pages. Reuse-only — no new Appwrite infrastructure. Post-review patch `4abd369` fixed the help button header placement. Review Triage Log §2026-08-10 is authoritative for the current code state.
- **5.10e (split into 5.10e1–5.10e4 per user decision 2026-08-11):** UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9):
  - **5.10e1 (THIS ITERATION):** UX Polish and Accessibility (AC4). Consistent UI, loading states, error handling, success confirmations, accessibility audit (aria-labels, keyboard nav, 4.5:1 contrast, screen-reader announcements). Picks up the 2 fitting deferred a11y items from 5.10b (Breadcrumbs back-button aria-label, quick-search keyboard nav). Reuse-only — no new Appwrite infra, no new pages/routes/stores.
  - **5.10e2:** Performance Optimization (AC5). Lazy-loading audit, bundle size check, caching, remove the 300ms `setTimeout` in `useDashboardData.js`, document the 3G manual throttle test. Reuse-only.
  - **5.10e3:** Mobile Responsiveness (AC6). Full 320px audit of ALL pages + all fixes, 44px touch-target audit (per user decision 2026-08-11: full audit + all fixes). Reuse-only.
  - **5.10e4:** Final Testing Checklist (AC9). Manual final-testing-checklist.md doc covering all MVP user journeys, RBAC matrix, data integrity, integrations, sample-data mode (per user decision 2026-08-11: manual checklist only; automated test infrastructure deferred to a new post-MVP testing epic — 5.10e4 documents the new epic in deferred-work.md). This is the FINAL 5.10 sub-story and the FINAL Epic 5 story — completing it marks 5.10 and Epic 5 as done.
- **AC8 (System Health Monitoring): DEFERRED to post-MVP** (user decision 2026-08-04). Documented in `deferred-work.md` during 5.10a; 5.10e4 will verify/expand the deferral entry (proposed admin page layout, server function requirements, data sources, estimated post-MVP effort). Not implemented in MVP.

**Prior Epic 5 story summaries (for regression-checking context):**

**5.9 (Module Management):** Admin page at `/admin/modules`. Core modules always enabled (Residents, Households, Finance, Inventory, Calendar, Storage). Optional MVP modules toggleable: Farm, School, Vendors ONLY (NOT Guests/Equipment/Energy — deferred). Toggle hides nav/widgets but preserves data. Dependency warning on disable. Updates `settingsStore.modulesEnabled`. Dep: all MVP previous stories.

**5.14 (Auth Completeness):** ProfilePage "Change Password" dialog. AuthPage "Forgot password?" link → `Account.createRecovery` → email link → `/auth/reset-password` page → `Account.updateRecovery`. Email verification deferred. No self-service signup. Deps: 1.3, 1.11.

**5.12 (User CRUD):** UsersPage `/admin/users` "Add User" button (System Admin only). Server-side Appwrite Function for admin-scope user creation. Soft-deactivate. Cannot deactivate self or last System Administrator. Audit logging. Deps: 1.4, 1.11.

**5.13 (Role Assignment UI):** UsersPage "Manage Roles" dialog. "View Permissions" shows effective permission union. `/admin/roles` page: role list with permission matrix. Read-only for MVP. `seed-roles.js` upsert-capable. Dep: 5.12.

**5.11 (Start Fresh Wizard):** SetupWizard "Start Fresh" card enabled. 5-step wizard: Village Profile → Admin User → Village Head → Module Selection → First Household. Sets `is_using_sample_data = false`. Empty-state CTAs on dashboard and list pages. Last-System-Admin guard added to `updateUser`. Deps: 5.9, 5.12. DONE 2026-08-04.

**5.10a (Dashboard Completion — Real Data Wiring):** Replaced `DashboardPage.vue` placeholder data with real, permission-gated Appwrite fetches via new `src/composables/useDashboardData.js` (household/resident counts via `Query.limit(1)` + `.total`; finance totals via `financeStore.fetchSummary()`; recent activity via per-module `tables.listRows` with `Query.orderDesc('$createdAt')` + `Query.limit(3)`, merged/sorted/sliced to 8). Extended `QuickStatsWidget` with Total Income/Total Expense cards. Each module fetch isolated (try/catch) so one failure doesn't break the dashboard. SSR-safe (onMounted only). AC8 (System Health Monitoring) deferred to post-MVP and documented in `deferred-work.md`. NOTE: a 300ms `setTimeout` hydration delay remains in `useDashboardData.load()` — owned by 5.10e2 (performance) for removal. Dep: all prior MVP stories. DONE 2026-08-04.

**5.10b (Navigation Polish — Breadcrumbs and Quick Search):** Added reusable `src/components/layout/Breadcrumbs.vue` (responsive Module → List → Detail, mobile back-button-only) replacing ad-hoc Back buttons on 22 detail/form/create/edit pages; added `meta.breadcrumb` to existing routes; added `src/composables/useGlobalSearch.js` (permission-gated, SSR-safe quick search across households/residents/finance/plots/learners/vendors/inventory/calendar + nav items, grouped dropdown); added a route watcher in `MainLayout.vue` to auto-expand the active `expandedSections` key; removed the dead `/communications` nav link. Post-finalization patch `3152db1` (2026-08-05) corrected a defective learner search (the `learners` table has NO `first_name`/`last_name` columns — it joins `residents` via `resident_id`; reworked to search residents first then resolve learner rows), the finance result secondary field (`amount_funded ?? amount` + ZMW currency + date), and a header-search focus issue (`no-focus no-refocus` on the results `q-menu`). The 5.10b spec's `final_revision` is `3152db1`; its Review Triage Log §2026-08-05 is authoritative for the current code state. Dep: 5.10a. DONE 2026-08-05.

**5.10c (Notifications System):** Added new Appwrite `notifications` table (role-targeted, one row per event) and `notification_reads` table (per-user read receipts, row-secured matching the `file_metadata` precedent). New `createNotification` Appwrite Function derives `target_roles` from a hardcoded `TYPE_CONFIG` authorization+targeting matrix (never trusts client-supplied targeting; validates caller permission per type). New `src/stores/notifications-store.js` Pinia store (fetchMyNotifications with role-intersection query + read-receipt join, unreadCount getter, markRead/markAllRead, filterByType, createNotification helper). Bell `q-btn` + `q-badge` + `NotificationPanel.vue` in `MainLayout.vue` header (q-menu desktop, q-dialog mobile). Appwrite realtime subscription with 30s polling fallback. Exactly 3 triggers: at-risk learner newly flagged (school roles, dedup by type+related_entity_type+related_entity_id), farm alert newly raised (farm roles, same dedup), new vendor created (finance/farm roles). Seeded demo notifications in `seedAllData`. Review: 2 patches (1 high — deterministic SHA-256 rowId for race-free dedup; 1 low — missing `delete` permission on `notification_reads`), 3 deferred items (table-level create griefing vector, realtime sync-only error handling, at-risk 60s cache re-flip suppression — all pre-existing-pattern-class; per user decision 2026-08-11 these 3 security/realtime items are re-deferred to post-MVP hardening, NOT owned by any 5.10e sub-story), 7 rejected findings. Post-review patch `f5e5fc9` fixed single-role users in `Query.or` (used `Query.contains` for single role, `Query.or`+`Query.contains` for multiple). Dep: 5.10b. DONE 2026-08-05.

**5.10d (Help and Documentation):** Added a help `q-btn` (`icon="help"`) in `MainLayout.vue` header between the 5.10c notifications bell and the user profile `q-btn`, with a responsive help menu (`q-menu` desktop / `q-dialog` mobile) containing User Guide / FAQ / About (version + village name) links — shared via a new `src/components/layout/HelpMenuList.vue` component (extracted during review patch to deduplicate the menu/dialog markup, mirroring the `NotificationPanel.vue` reuse pattern). Added a new `/help` route (`requiresAuth: true`, no `requiresPermission`, no breadcrumb — top-level page like Dashboard) and a new `src/pages/help/HelpPage.vue` with two `q-tab-panels`: "User Guide" (Getting Started card + 11 `q-expansion-item` module sections, module-enabled-aware for Farm/School/Vendors showing a "not enabled" banner post-hydration) and "FAQ" (17 Q&A across 5 categories: General, Data Entry, Roles & Permissions, Troubleshooting, Sample Data vs Real Data). Added exactly 20 enumerated `q-tooltip` elements: help icon, notifications bell, quick-search input, 7 nav-section headers in `MainLayout.vue`, 7 primary action buttons across 6 list pages, and 3 complex form fields (VillageSettingsPage currency, StorageSettingsPage quota, LongTermGoalsSettingsPage benchmark threshold — substituted for the non-existent at-risk attendance threshold UI control). Reuse-only — no new Appwrite tables, functions, permissions, `.env` vars, or stores. Review: 1 patch (low — `HelpMenuList.vue` extraction), 16 rejected findings (all out-of-scope or factually incorrect), 0 deferred. Post-review patch `4abd369` fixed the help button header placement. The 5.10d spec's `baseline_revision` is `d6e8be0`; its Review Triage Log §2026-08-10 is authoritative for the current code state. Dep: 5.10c. DONE 2026-08-10.
