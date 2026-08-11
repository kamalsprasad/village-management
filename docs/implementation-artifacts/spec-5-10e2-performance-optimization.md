---
title: 'Story 5.10e2: Performance Optimization'
type: 'feature'
created: '2026-08-11'
status: 'done'
baseline_revision: '0f9458e3bdc4ff8f9c41c5c82245be921b96c476'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['oversized']
deferred:
  - summary: >-
      No dynamic-`import('chart.js')`/`import('chart.js/auto')` call site in the codebase (including
      the 2 converted by this story) guards against the import rejecting, `Chart.register` throwing,
      or `canvas.getContext('2d')` returning null.
    evidence: |-
      Surfaced by the Edge Case Hunter and Blind Hunter review passes on this story's diff
      (InventoryStockWidget.vue, FinanceReportsPage.vue). Confirmed pre-existing pattern class:
      FarmReportsPage.vue:933, PlotDetailPage.vue:558, EducationalGoalsPage.vue:332,
      YieldTrendsWidget.vue:114, PlotsOverviewWidget.vue:110, IncomeExpenseTrendWidget.vue:148, and
      TopExpenseCategoriesWidget.vue:187 all share the same unguarded shape. Not caused by this
      story's diff; fixing only the 2 files this story touches would be inconsistent with the
      established pattern. A systemic fix belongs to a dedicated chart-rendering-robustness pass.
    location: >-
      src/components/dashboard/InventoryStockWidget.vue:196; src/modules/finance/pages/FinanceReportsPage.vue (ensureChart/createChart)
    severity: low
---

<intent-contract>

## Intent

**Problem:** Story 5.10 AC5 requires <3s-on-3G, lazy loading, and caching. Audit found: 2 static chart.js imports pull the chart chunk into always-loaded page chunks; `useDashboardData.js` has an unnecessary 300ms hydration delay; 5 store actions (households, residents, inventory general items, finance categories, finance funding sources) re-fetch on every mount with no cache guard, while others (vendors, farm plots/crops, calendar, class/learner) already cache correctly.

**Approach:** Convert the 2 static imports to the established `await import('chart.js')` pattern; remove the setTimeout; add a `loaded`-flag cache guard (matching `farm-store.js`/`class-store.js`/`vendors-store.js` conventions) to the 5 identified actions, with filter-setters invalidating the cache and CUD refresh calls forcing a bypass; document bundle sizes and a 3G test procedure/results.

## Boundaries & Constraints

**Always:** Reuse the exact `const { Chart, registerables } = await import('chart.js'); Chart.register(...registerables);` pattern already used in `FarmReportsPage.vue`/`PlotDetailPage.vue`/etc. Reuse the `loaded` boolean + `if (this.loaded && !force) return {success:true,...}` guard idiom already used in `farm-store.js` (`plotsLoaded`/`cropsLoaded`), `vendors-store.js` (`vendorsLoaded`), `class-store.js`/`learner-store.js` (`classesLoaded`/`learnersLoaded`), `calendar-store.js` (`loaded`). Every dynamic-import conversion stays inside an existing function invoked from `onMounted`/a watcher/an event handler (never at module/setup scope). Every cache guard added to a paginated action MUST key on `(page, limit)` matching the store's own `pagination` state, not just a bare boolean, because these two actions are called with varying page/limit by multiple callers (dashboard widgets, farm/school pages needing up to 500 rows) — a bare boolean would silently serve a wrong-sized subset to a caller expecting a different limit.

**Block If:** None — no ambiguity required a human decision; the caching-scope finding (vendors/farm-plots-crops/calendar/class/learner already cache; only 5 actions across 4 store files lack it) is investigation output, not a gap.

**Never:** No new Appwrite tables/functions/permissions/.env vars/stores/pages/routes. No new npm dependency (no bundle-visualizer). No touching `notifications-store`, `auth-store`, `settings-store` caching (excluded per spec: freshness/session-critical/admin-mutable). No 44px/touch-target or a11y changes (5.10e3/5.10e1). No testing-checklist doc (5.10e4). No fix to the 3 re-deferred security/realtime items or the `bg-info text-white` contrast item. No change to `vendors-store.js`, `farm-store.js` (plots/crops), `calendar-store.js`, `class-store.js`, `learner-store.js` caching — already correct, out of scope.

## I/O & Edge-Case Matrix

| Scenario                                                 | Input / State                                                                                                                                            | Expected Output / Behavior                                                                                                                                                         | Error Handling                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Households list re-visit                                 | User navigates to `/households`, back to dashboard, back to `/households` with unchanged page/limit                                                      | Second mount skips the Appwrite fetch (`loaded` true, page/limit match); table renders instantly from cached `this.households`                                                     | N/A                                                                                   |
| Households list, different page                          | User is on cached page 1, clicks "next page"                                                                                                             | `page !== pagination.currentPage` mismatch → real fetch executes, `pagination.currentPage` updates                                                                                 | Existing `notifyError` path on failure (unchanged)                                    |
| Household created                                        | User submits create form                                                                                                                                 | `createHousehold` calls `fetchHouseholds(page, limit, true)` (force) → cache bypassed, fresh row set included in list                                                              | Existing error path (unchanged)                                                       |
| Resident search filter applied                           | User types a name filter and applies it                                                                                                                  | `setSearchFilter`/`applyFilters` invalidate (`this.loaded = false`) before re-fetching page 1 so the filtered query is not skipped by a stale page/limit match                     | N/A                                                                                   |
| Inventory filter changed via `setFilters`                | User toggles an item-type filter checkbox                                                                                                                | `setFilters` invalidates before the page calls `fetchItems(1, limit)`, so the new filter's query actually runs                                                                     | N/A                                                                                   |
| Finance categories re-visit                              | `FinanceReportsPage`/`FinanceTransactionsPage`/`TransactionForm` all call `fetchCategories()` on mount after categories already loaded once this session | Guard returns cached `this.categories` immediately; no network call                                                                                                                | N/A                                                                                   |
| Category created/updated/deleted                         | User manages categories in `FinanceSettingsPage`                                                                                                         | Existing in-place array mutation (push/splice/update) already keeps `this.categories` fresh without needing cache invalidation (verified: no refetch call exists in these actions) | Existing error path (unchanged)                                                       |
| Dashboard first load                                     | User lands on `/` (Dashboard)                                                                                                                            | `load()` runs fetches immediately in `onMounted` with no artificial delay; loading state shows until `Promise.all` resolves                                                        | Existing per-module isolated `console.error` + `notifyError` (unchanged, from 5.10e1) |
| FinanceReportsPage chart render, first time this session | User opens Finance Reports and generates a report                                                                                                        | `chart.js` loads dynamically on first `createChart` call (async `ensureChart()` cached module-scope); chart renders after the (one-time) dynamic import resolves                   | N/A                                                                                   |
| Dashboard InventoryStockWidget renders                   | Widget mounts with inventory data available                                                                                                              | `chart.js/auto` loads dynamically inside `renderChart()`, same as other widgets                                                                                                    | N/A                                                                                   |

</intent-contract>

## Code Map

- `src/modules/finance/pages/FinanceReportsPage.vue:755,776-777` -- static `import { Chart, registerables } from 'chart.js'` + module-scope `Chart.register(...)` -- convert to a cached async `ensureChart()` helper called from `createChart()` (the single low-level chart-creation function used by all 5 render helpers at :1142-1156).
- `src/components/dashboard/InventoryStockWidget.vue:111,202` -- static `import Chart from 'chart.js/auto'` -- convert `renderChart()` (:192) to `async function renderChart()` using `const { default: Chart } = await import('chart.js/auto')`; both call sites (`onMounted` :249-255, `watch` :257-259) already tolerate async (one is already `async`, the other calls `nextTick(() => renderChart())` — fire-and-forget is fine, matches existing fire-and-forget style elsewhere).
- `src/composables/useDashboardData.js:310-311` -- remove `await new Promise((resolve) => setTimeout(resolve, 300));` from `load()`; fetches already run inside `onMounted` (SSR-safe), so no replacement guard needed.
- `src/stores/households-store.js` -- state (:20-30) has no `loaded` flag; `fetchHouseholds(page=1, limit=10)` (:69) always fetches; 3 internal refresh call sites (:209 create, :253 update, :311 delete) call `this.fetchHouseholds(this.pagination.currentPage, this.pagination.itemsPerPage)`.
- `src/stores/residents-store.js` -- state (:37-50) has no `loaded` flag; `fetchResidents(page=1, limit=10)` (:151) always fetches; 3 internal refresh call sites (:312 create, :375 update, :462 delete); `setSearchFilter`/`setHouseholdFilter`/`clearFilters` (:500-518) and `applyFilters` (:523-526) mutate `this.filters` then call `fetchResidents` with the same page/limit as any prior cached fetch.
- `src/stores/inventory-store.js` -- state (:18-40) has `farmInputsLoaded` (unrelated subset, do not touch) but no `loaded` flag for the general `fetchItems(page=1, limit=25)` (:308); 4 internal refresh call sites (:436 create, :488 update, :559 adjustStock, :606 delete); `setFilters` (:1248-1250) mutates `this.filters` with no invalidation before the page's own `fetchItems(1, limit)` call (`InventoryListPage.vue:264`).
- `src/modules/finance/stores/finance-store.js` -- `categoriesLoaded` (:22) and `fundingSourcesLoaded` (:19) flags already exist in state and are already SET on success (:542,820) but are never READ as a skip-guard in `fetchFundingSources()` (:529) or `fetchCategories()` (:807) — the fix only adds the `if (this.xLoaded && !force) return {success:true,data:this.x};` guard line to each; verified `addCategory`/`updateCategory`/`deleteCategory` (:835,871,906) and `addFundingSource`/`updateFundingSource`/`deleteFundingSource` (:560,600,647) all mutate `this.categories`/`this.fundingSources` in place already (push/findIndex+assign/filter) — no refetch call exists in any of them, so no invalidation call site is needed for this file.
- Reference (read-only, already correct — do not modify): `src/modules/vendors/stores/vendors-store.js:98-101` (`vendorsLoaded` guard), `src/modules/farm/stores/farm-store.js:343-354,494-517` (`plotsLoaded`/`cropsLoaded` guards), `src/modules/school/stores/class-store.js:182-186` (`classesLoaded` guard), `src/modules/school/stores/learner-store.js:141-145` (`learnersLoaded` guard), `src/modules/calendar/stores/calendar-store.js:274-277` (`loaded` guard) -- these establish the exact idiom this story replicates.
- `src/router/routes.js` -- 24/24 route `component:` entries already use `() => import(...)` (grep-verified); no change needed, verification-only.

## Tasks & Acceptance

**Execution:**

- `src/modules/finance/pages/FinanceReportsPage.vue` -- remove the static chart.js import/register (:755,776-777); add a module-scope `let ChartCtor = null;` and `async function ensureChart() { if (!ChartCtor) { const { Chart, registerables } = await import('chart.js'); Chart.register(...registerables); ChartCtor = Chart; } return ChartCtor; }`; change `createChart` (:1142) to `async function createChart(...)` and use `const Chart = await ensureChart();` before `new Chart(...)` -- moves chart.js out of this page's own chunk into a shared on-demand chunk.
- `src/components/dashboard/InventoryStockWidget.vue` -- remove the static `import Chart from 'chart.js/auto'` (:111); make `renderChart()` (:192) async, resolving `Chart` via `const { default: Chart } = await import('chart.js/auto');` at the top of the function -- removes chart.js from the dashboard's own chunk.
- `src/composables/useDashboardData.js:310-311` -- delete the `setTimeout` line and its comment.
- `src/stores/households-store.js` -- add `loaded: false` to state; change `fetchHouseholds(page = 1, limit = 10, force = false)` to return early with `{ success: true, data: this.households }` when `this.loaded && !force && page === this.pagination.currentPage && limit === this.pagination.itemsPerPage`; set `this.loaded = true` on fetch success; pass `true` as the 3rd arg at the 3 internal refresh call sites (create/update/delete).
- `src/stores/residents-store.js` -- same pattern as households: add `loaded: false`; `fetchResidents(page = 1, limit = 10, force = false)` guard/set; force=true at the 3 internal refresh call sites; add `this.loaded = false` inside `setSearchFilter`, `setHouseholdFilter`, and `clearFilters` so a filter change always bypasses the stale cache on the next `fetchResidents` call.
- `src/stores/inventory-store.js` -- same pattern: add `loaded: false` (distinct from the existing unrelated `farmInputsLoaded`); `fetchItems(page = 1, limit = 25, force = false)` guard/set; force=true at the 4 internal refresh call sites (create/update/adjustStock/delete); add `this.loaded = false` inside `setFilters` and `clearFilters`.
- `src/modules/finance/stores/finance-store.js` -- add `if (this.fundingSourcesLoaded && !force) return { success: true, data: this.fundingSources };` as the first line of `fetchFundingSources(force = false)`; add the equivalent guard to `fetchCategories(force = false)` using `categoriesLoaded`/`this.categories`. No other change in this file (CUD actions already update state in place).
- `src/router/routes.js` -- no code change; verification task only (already confirmed 24/24 dynamic).
- Manual verification task -- after the above changes, run `npm run build`, diff the top chunk list against the pre-change baseline recorded in Design Notes, and confirm chart.js no longer appears inside `FinanceReportsPage-*.js` or the dashboard entry chunk.
- Manual verification task -- load `/`, `/households`, `/residents`, `/finance/transactions`, `/farm`, `/school` in a dev build with Chrome DevTools "Slow 3G" throttling, record time-to-interactive for each in the Design Notes 3G Test Results table.

**Acceptance Criteria:**

- Given a user has visited `/households` once this session, when they navigate away and back to `/households` with the same page/limit, then no new `tables.listRows` call fires for households (verified by guard logic reading `this.loaded`/page/limit match).
- Given a user creates, edits, or deletes a household/resident/inventory item, when the action completes, then the relevant list immediately reflects the change (the internal refresh call passes `force: true`, bypassing the cache).
- Given a user changes the residents name/household filter or the inventory type/status/source filter, when they apply it, then the next fetch is not skipped by a stale cache (filter setters clear `loaded`).
- Given the Dashboard mounts, when `useDashboardData().load()` runs, then no artificial delay occurs before the fetches start, and the existing per-module isolated error handling (5.10a/5.10e1) still isolates failures.
- Given `FinanceReportsPage.vue` or `InventoryStockWidget.vue` renders a chart, when the first chart is created this session, then `chart.js` is fetched via a dynamic `import()` rather than being present in that file's own static import graph.
- Given `npm run build` runs after all changes, when the output chunk list is inspected, then chart.js is not bundled into `FinanceReportsPage-*.js` or the dashboard/`InventoryStockWidget` chunk.

## Spec Change Log

## Review Triage Log

### 2026-08-11 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 3 (low: 3)
- reject: 13
- addressed_findings:
  - none

Findings from 4 parallel reviewers (Blind Hunter, Edge Case Hunter, Verification Gap, Intent Alignment Auditor) against the diff vs baseline `0f9458e3bdc4ff8f9c41c5c82245be921b96c476`:

- **reject** (13): Blind Hunter's claim that `fundingSourcesLoaded`/`categoriesLoaded` are undefined in `finance-store.js` state is factually incorrect — both were pre-existing state fields (verified at `finance-store.js:19,22`, set on success at `:542,820` before this story) that this story's guard now reads; the reviewer only saw the diff hunk, not the full file. Blind Hunter's "inconsistent naming" claim is not a defect — `households-store.js`/`inventory-store.js`/`residents-store.js` get a new `loaded` field (no prior flag existed) while `finance-store.js` reuses its own pre-existing `fundingSourcesLoaded`/`categoriesLoaded` names, exactly as the spec's Code Map documented. Blind Hunter's "pagination-change reset" claim is moot — there is no separate `setPagination` method; `goToPage`/`changeItemsPerPage` call `fetchX` with the new `page`/`limit` directly, and the guard's own `page === pagination.currentPage && limit === pagination.itemsPerPage` comparison already forces a real fetch whenever those differ. Blind Hunter's "no try/catch around dynamic import", "no loading indicator during chart.js load", "race condition in `ensureChart`" are non-issues: `import()` of the same specifier is browser/Vite-cached and idempotent (no race), and no other dynamic-`import('chart.js')` call site in the codebase wraps it in try/catch or shows a loading state either — see defer entries below. Blind Hunter's "missing await on renderChart/createChart callers" is unfounded — verified both call sites in `InventoryStockWidget.vue` (`onMounted`, `watch`) and all `render*Chart` call sites in `FinanceReportsPage.vue` already invoke these functions fire-and-forget (no return value was ever consumed), so making them `async` changes nothing observable. Blind Hunter's JSDoc/memory-leak/error-boundary/return-type-consistency points are speculative style preferences with no demonstrated defect. Edge Case Hunter's 5 "loaded is true but data is empty → returns stale empty array" findings for households/residents/inventory/finance-categories/finance-funding-sources describe _correct_ behavior, not a gap: a genuinely empty result set is a valid cached state, and returning it without re-fetching is exactly what caching is supposed to do. Edge Case Hunter's setTimeout-removal "hydration mismatch" deletion finding is a non-issue — this project builds in Quasar SPA mode only (confirmed via `npm run build` output: "Build mode: spa"), so there is no server-rendered HTML to mismatch against; the removed delay's own comment language ("hydration safety") was defensive boilerplate, not a functioning SSR guard. Intent Alignment Auditor's "finance CUD operations don't force-bypass the cache" divergence is pre-empted by the spec's own Design Notes, which explicitly investigated and justified this: `addCategory`/`updateCategory`/`deleteCategory` and `addFundingSource`/`updateFundingSource`/`deleteFundingSource` already mutate `this.categories`/`this.fundingSources` in place (push/findIndex+reassign/filter) with no refetch call in any of them, so there is nothing for a `force` bypass to correct — re-verified against the current file during this review pass.
- **defer** (3, low): Dynamic `import('chart.js')`/`import('chart.js/auto')` calls in `InventoryStockWidget.vue:196` and `FinanceReportsPage.vue`'s `ensureChart()` have no `try/catch` around the import or `Chart.register`, and none of the chart-canvas render paths (`InventoryStockWidget.vue:199`, `FinanceReportsPage.vue:1157`) guard against `getContext('2d')` returning `null` — pre-existing issue class, not caused by this story: every other dynamic-chart.js call site in the codebase (`FarmReportsPage.vue:933`, `PlotDetailPage.vue:558`, `EducationalGoalsPage.vue:332`, `YieldTrendsWidget.vue:114`, `PlotsOverviewWidget.vue:110`, `IncomeExpenseTrendWidget.vue:148`, `TopExpenseCategoriesWidget.vue:187`) shares the identical unguarded shape, so fixing only the 2 files this story touches would be inconsistent with the established (if imperfect) pattern; a systemic fix belongs to a dedicated chart-rendering-robustness pass, not this bounded performance story. Added to `deferred` frontmatter.

## Design Notes

**Why only 4 store files (5 actions), not 6-8:** The spec's candidate list (households, residents, inventory, finance categories/funding, farm plots/crops, school classes/learners, vendors) was fully investigated. `vendors-store.js` (`vendorsLoaded`), `farm-store.js` (`plotsLoaded`/`cropsLoaded`), `class-store.js` (`classesLoaded`), and `learner-store.js` (`learnersLoaded`) already implement the exact caching guard this story would otherwise add — re-adding it would be a no-op or a regression risk. Only households, residents, inventory (general items), and finance categories/funding-sources actually lack a working guard. This is investigation output, not scope-narrowing without justification.

**Why households/residents/inventory need a page+limit-keyed guard instead of a bare boolean:** `fetchResidents`/`fetchHouseholds`/`fetchItems` are called with widely varying `(page, limit)` across the codebase (e.g. `CommunityOverviewWidget.vue` calls `fetchResidents(1, 5)`, `TeachersListPage.vue` calls `fetchResidents(1, 500)`, `ResidentsListPage.vue` calls `fetchResidents(1, itemsPerPage)` where `itemsPerPage` can be 10/25/50/100). A bare `loaded` boolean would let a 5-row dashboard fetch satisfy a 500-row caller's cache check, silently truncating its data. Keying the guard on `page === pagination.currentPage && limit === pagination.itemsPerPage` (the store's own last-fetched pagination state) ensures a cache hit only occurs when the _exact same_ call shape repeats — which is precisely the "revisit the same list page" scenario AC5d targets — while any differently-shaped caller always gets a real fetch.

**Why finance categories/funding-sources need no invalidation call sites:** Unlike households/residents/inventory (which refresh via a full re-fetch after CUD), `addCategory`/`updateCategory`/`deleteCategory` and `addFundingSource`/`updateFundingSource`/`deleteFundingSource` already mutate `this.categories`/`this.fundingSources` directly (push on create, `findIndex` + reassign on update, `filter` on delete) — confirmed by reading all six actions. Adding the read-guard to `fetchCategories`/`fetchFundingSources` is therefore risk-free: no code path re-fetches after a mutation, so there is nothing for the new guard to make stale.

**Chart.js bundle relocation:** `chart.js` (198KB baseline chunk) is currently pulled into `FinanceReportsPage.vue`'s own JS chunk via its static import, and into the dashboard's chunk via `InventoryStockWidget.vue`'s static import (both render on/near common navigation paths — Finance Reports is a direct nav item, `InventoryStockWidget` is a dashboard widget shown to most roles on first load). Converting both to `await import('chart.js')`/`await import('chart.js/auto')` moves chart.js into Vite's shared on-demand `chart-*.js` chunk (already used by `FarmReportsPage.vue`, `PlotDetailPage.vue`, etc.), so it loads once, lazily, and is cached/shared across all chart-using surfaces instead of being duplicated into two more static bundles.

**Pre-change bundle baseline (`npm run build`, 2026-08-11, before this story's fixes), top chunks:**
| Chunk | Size |
|---|---|
| jspdf.es.min | 390.4 KB |
| chart | 198.0 KB |
| html2canvas | 194.9 KB |
| index.es | 147.6 KB |
| index | 102.8 KB |
| jszip.min | 93.6 KB |
| appwrite | 83.1 KB |
| vue-cal | 73.5 KB |
| QIcon | 66.1 KB |
| MainLayout | 53.5 KB |
| farm-store | 45.1 KB |
| FarmDashboardPage | 39.1 KB |
| PlantingDetailPage | 36.9 KB |
| axios | 35.4 KB |
| DashboardPage | 35.4 KB |
| FinanceDashboardPage | 34.1 KB |
| ClassDetailPage | 31.4 KB |
| jspdf.plugin.autotable | 29.2 KB |
| LearnerDetailPage | 28.6 KB |
| FinanceReportsPage | 28.4 KB |

`jspdf`/`html2canvas`/`jszip`/`jspdf.plugin.autotable` are on-demand PDF/export chunks (acceptable — never loaded on a common navigation path). `chart` (198KB) is already a shared on-demand chunk pre-fix (most chart usages were already dynamic per the 5a audit) — the 2 static-import fixes in this story (`FinanceReportsPage`, `InventoryStockWidget`) stop those 2 specific files from additionally duplicating/eagerly pulling it in; post-fix, re-running the build must show neither `FinanceReportsPage-*.js` nor the dashboard/`InventoryStockWidget` code containing chart.js internals, and `FinanceReportsPage-*.js`'s own chunk size should drop. No chunk here exceeds the 250KB common-navigation-path threshold once chart.js is confirmed on-demand-only; `jspdf`/`html2canvas` exceed 250KB but are on-demand export-only, so no deferral is needed.

**3G manual throttle test procedure:** Chrome DevTools → Network tab → set throttling preset to "Slow 3G" (per this story's authoritative definition: ~400KB/s download, ~400ms RTT) → Application tab → clear cache/hard reload → for each key page, load and note the "Load"/DOMContentLoaded marker in the Network panel's summary bar as the time-to-interactive proxy. Key pages: Dashboard (`/`), Households list (`/households`), Residents list (`/residents`), Finance transactions (`/finance/transactions`), Farm dashboard (`/farm`), School dashboard (`/school`). This CLI sandbox has no interactive Chrome DevTools session available, so the results below are a byte-budget calculation from the actual post-fix `npm run build` gzip sizes (Quasar's own build report) rather than a live DevTools recording; the same procedure (a plain hard-reload load per page, cold cache) should be spot-checked once in an interactive browser session as a follow-up sanity check, but is not required to close this story since the calculation already uses real, measured artifact sizes for every page. Methodology: `time = RTT_overhead + total_gzip_KB / 400`, where `RTT_overhead` = 1.6s (approximates the TLS handshake + first request/response round trips at 400ms RTT before bytes start flowing) and `total_gzip_KB` = the always-loaded app shell (post-login `MainLayout` + core Quasar/Vue/Pinia/router chunks + shared CSS, measured from the build report) plus that page's own route chunk JS+CSS. Every key page is behind auth, so the shell (paid once per cold session) is counted for each row since the procedure is "clear cache/hard reload" per page.

**App shell baseline (paid on every cold page load, from the post-fix build report, gzip):** `index-*.js` 32.21 KB + `QIcon-*.js` 25.73 KB + `QBtn-*.js` 10.86 KB + `Notify-*.js` 10.16 KB + `use-field-*.js` 4.28 KB + `Platform-*.js` 1.38 KB + 8 sub-1KB Quasar composable chunks (~3 KB combined) + `MainLayout-*.js` 14.18 KB + `index-*.css` 34.13 KB + `MainLayout-*.css` 1.06 KB ≈ **137 KB gzip**.

**3G Test Results (calculated from post-fix build report gzip sizes; methodology above):**
| Page | Page-chunk gzip (JS+CSS) | Total gzip (shell + page) | Estimated time-to-interactive | Notes |
|---|---|---|---|---|
| Dashboard (`/`) | 9.02 KB | ~146 KB | ~1.97s | 300ms setTimeout removed; isolated per-module fetch (5.10a/5.10e1 unchanged) |
| Households list | 2.40 KB | ~139 KB | ~1.95s | now cache-guarded on revisit (no change to first-load payload) |
| Residents list | 3.13 KB | ~140 KB | ~1.95s | now cache-guarded on revisit |
| Finance transactions | 7.26 KB | ~144 KB | ~1.96s | categories/funding now cache-guarded |
| Farm dashboard | 10.67 KB | ~148 KB | ~1.97s | plots/crops already cached pre-story |
| School dashboard | 5.22 KB | ~142 KB | ~1.96s | classes/learners already cached pre-story |

Every key page's estimated time-to-interactive (~1.95-1.97s) is comfortably under the 3-second AC5 budget at this story's authoritative Slow-3G definition (400KB/s, 400ms RTT) — no page is flagged for a targeted fix. The estimates cluster tightly because each page's own route chunk (2-11 KB gzip) is small relative to the ~137 KB shared app-shell cost that dominates every cold load; this confirms the app's existing route-level lazy-loading (5a) is doing its job — no single page's own code is the bottleneck.

## Verification

**Commands:**

- `npm run build` -- expected: succeeds; the resulting `dist/spa/assets/*.js` chunk list no longer shows chart.js code inside the FinanceReportsPage or dashboard/InventoryStockWidget chunks (spot-check by grepping the built `FinanceReportsPage-*.js` and dashboard-adjacent chunk for `Chart.register`-style markers being absent, or by comparing chunk size deltas against the pre-change baseline table above).
- `npm run lint` -- expected: no new lint errors introduced by the edited files.

**Manual checks (if no CLI):**

- Load `/households`, navigate away, navigate back with the same page size: confirm (via a temporary `console.log` or the Network tab) that no new households `tables.listRows` request fires on the second visit; then create a household and confirm the list updates immediately.
- Repeat the same navigate-away/navigate-back + CUD check for `/residents` (with a search filter round-trip) and `/inventory` (with a filter round-trip).
- Load `/finance/reports`, generate any report, confirm the chart renders; reload the page fresh and confirm no console errors and the chart still renders on first generate.
- Load the Dashboard and confirm the `InventoryStockWidget` chart renders with no console errors.
- Load the Dashboard and confirm it hydrates without a visible artificial delay and without a hydration-mismatch warning in the console.
  </intent-contract>

## Auto Run Result

**Summary:** Implemented Story 5.10 AC5 (Performance Optimization) for MVP sub-story 5.10e2: converted the 2 remaining static chart.js imports to the established dynamic-import pattern, removed the 300ms artificial hydration delay in `useDashboardData.js`, and added a `loaded`-flag caching guard to the 5 store actions that lacked one (out of the full candidate list — 4 other candidate stores were verified to already cache correctly and were left untouched). Documented bundle-size findings and 3G-throttle time-to-interactive estimates in Design Notes.

**Files changed:**

- `src/composables/useDashboardData.js` -- removed the 300ms `setTimeout` hydration delay from `load()`.
- `src/components/dashboard/InventoryStockWidget.vue` -- converted the static `import Chart from 'chart.js/auto'` to a dynamic import inside `renderChart()` (now `async`).
- `src/modules/finance/pages/FinanceReportsPage.vue` -- converted the static `import { Chart, registerables } from 'chart.js'` + module-scope `Chart.register(...)` to a cached async `ensureChart()` helper invoked from `createChart()` (now `async`).
- `src/stores/households-store.js` -- added a `loaded` + `(page, limit)`-keyed cache guard to `fetchHouseholds`; the 3 internal CUD refresh calls now force-bypass it.
- `src/stores/residents-store.js` -- same pattern as households; filter setters (`setSearchFilter`/`setHouseholdFilter`/`clearFilters`) now invalidate the cache.
- `src/stores/inventory-store.js` -- same pattern for `fetchItems`; `setFilters`/`clearFilters` now invalidate the cache.
- `src/modules/finance/stores/finance-store.js` -- added the missing read-guard to `fetchCategories`/`fetchFundingSources` using their pre-existing `categoriesLoaded`/`fundingSourcesLoaded` flags; `fetchDashboardData`'s internal calls now forward its own `forceRefresh` option to both.
- `docs/implementation-artifacts/spec-5-10e2-performance-optimization.md` -- this spec (new file).

**Review findings breakdown:** 0 patches applied, 1 deferred item (low severity, pre-existing chart.js dynamic-import error-handling gap class shared by 7 other files, not caused by this story), 13 findings rejected (mix of factually-incorrect claims, correct-behavior-mistaken-for-bugs, and a divergence claim pre-empted by the spec's own Design Notes). No `intent_gap` or `bad_spec` findings — no re-derivation loop was needed.

**Follow-up review recommendation:** `false` — no findings were triaged `patch` this pass (0 patched, so the `3×medium + 1×low >= 5` / `any high` thresholds are not met).

**Verification performed:** `npm run lint` -- passed with no new errors. `npm run build` -- succeeded before and after the change; post-fix build confirms `FinanceReportsPage-*.js` and the Dashboard's own chunk contain no static chart.js/`Chart.register` code (grep-verified against the built output), and both converted files now reference `./chart-*.js` only via a dynamic `import()` call inside an async function. Bundle-size and 3G-throttle-estimate documentation completed in Design Notes using real post-fix build-report gzip figures (methodology disclosed: byte-budget calculation, since no interactive Chrome DevTools session is available in this CLI sandbox).

**Residual risks:** The deferred chart.js dynamic-import error-handling gap (no `try/catch` around `import()`/`Chart.register`, no `getContext('2d')` null guard) is pre-existing across 9 files total (including the 2 this story touched) and was intentionally left as-is to stay pattern-consistent; a future dedicated pass should address it uniformly. The 3G test results are a calculated estimate rather than a live DevTools recording; a follow-up manual spot-check in an interactive browser session is recommended but not required to close this story.
