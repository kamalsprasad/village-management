---
title: 'Story 5.1 — Village Calendar: Global Calendar with Category Filtering'
type: 'feature'
created: '2026-07-28'
status: 'done'
baseline_revision: '30dde429d9923a57f4d08fc0cc961fe2a7a611d5'
final_revision: 'cb606b5a34d198172010898747441aebea6b67e5'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
  - '{project-root}/docs/implementation-artifacts/dashboard-widget-pattern.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** Village events are scattered (school calendar, farm harvest plans) with no single read-only global calendar; the dashboard "Upcoming Events" widget shows placeholder data.

**Approach:** New `src/modules/calendar/` module: a global calendar page (vue-cal month/week/day + custom agenda list), a shared category→color map covering all 7 categories, a Pinia store aggregating existing School events + Farm expected-harvest auto-events, and rewiring the existing dashboard widget to real data. Read-only; creation/editing is Story 5.2. Hardcoded-English per project convention (i18n deferred to post-MVP by user decision 2026-07-28 — see deferred-work.md).

## Boundaries & Constraints

**Always:**

- Vue 3 `<script setup>`, Quasar components only, Pinia, date-fns via `src/utils/dateUtils.js` (village timezone from `settingsStore.timezone`), `useErrorHandler` in stores.
- All 7 categories in the color map: school, farm, village, guests, equipment, energy, other (guests/equipment/energy are forward-compatible labels; no events emitted for them).
- Farm auto-events only from `plantings` with status in `planted|growing|harvesting` and non-null `expected_harvest_date`; marked "System Generated". NO Equipment auto-events.
- SSR-safe: Appwrite fetches only after client mount (`isClient` pattern from school pages).
- Route guarded by `requiresAuth` only — global calendar is visible to every authenticated user (site map: all roles, view-only). No permission gate, no seed-roles change.
- Filter state is session-scoped (not persisted); resets on reload.
- Reuse existing stores: school `calendar-events-store` (`school_calendar_events` table), `farm-store` (`plantings`, `crops`, `plots`). No new Appwrite table in 5.1.

**Block If:** A new npm dependency seems required (e.g. anything beyond vue-cal v5, which is installed) — HALT `new dependency required: <name> — user approval needed`.

**Never:**

- No event creation/editing/deletion UI, no `village_events` table, no CRUD endpoints (Story 5.2).
- No Equipment/Guests/Energy event sources or feature flags (5.5/5.6/5.8 deferred).
- No i18n/vue-i18n setup (deferred post-MVP); hardcoded English matching existing modules.
- No new dependencies; no Options API; no raw HTML form controls; no emojis.

## I/O & Edge-Case Matrix

| Scenario               | Input / State                                               | Expected Output / Behavior                                                          | Error Handling            |
| ---------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| Happy path             | School events + active plantings exist                      | Events render color-coded in all views; widget lists next 5                         | No error expected         |
| Empty calendar         | No school events, no active plantings                       | Calendar renders empty; agenda shows empty state; widget shows "No upcoming events" | No error expected         |
| All categories hidden  | User clicks "Hide All"                                      | Zero events everywhere; filters remain visible/usable                               | No error expected         |
| Inactive planting      | status `completed`/`failed` or null `expected_harvest_date` | Excluded from events                                                                | Skipped silently          |
| Multi-day school event | start/end span week or month boundary                       | Renders as one continuous event (end +1 day, vue-cal exclusive end)                 | No error expected         |
| SSR render             | Server-side render of `/calendar` and dashboard             | No Appwrite/IndexedDB call server-side; content loads after hydration               | Guarded by `isClient`     |
| Fetch failure          | Appwrite listRows rejects                                   | Store error state; `useErrorHandler.notifyError`; page renders empty calendar       | notifyError + empty state |
| Widget no route        | "View All Events" clicked                                   | Navigates to `/calendar`                                                            | No error expected         |

</intent-contract>

## Code Map

- `src/modules/school/pages/SchoolCalendarPage.vue` — vue-cal v5 pattern to mirror (import, `:views`, custom `#event` slot, click→QDialog, timezone date conversion, `end +1 day`)
- `src/modules/school/stores/calendar-events-store.js` — reuse `fetchCalendarEvents()` (table `school_calendar_events`)
- `src/modules/school/utils/school-constants.js` — category constant style to mirror
- `src/modules/farm/stores/farm-store.js` — reuse `fetchPlantings()` (table `plantings`: `expected_harvest_date`, `status`, `crop_id`, `plot_id`), plus crops/plots fetch for name resolution
- `src/stores/settings-store.js` — `timezone` getter (default `Africa/Lusaka`)
- `src/utils/dateUtils.js` — `toDateStrInTimezone`, `addDaysToDateStr`, `formatDateInTimezone`
- `src/router/routes.js` — spread module routes
- `src/layouts/MainLayout.vue` — top-level nav item pattern (Dashboard item, ~line 131)
- `src/pages/dashboard/DashboardPage.vue` — replace `placeholderEvents` (line ~89) with store data
- `src/components/dashboard/UpcomingEventsWidget.vue` — existing widget; props `{events, loading, maxDisplay}`; item shape `{id,title,date,time,location,type}`
- `src/boot/appwrite.js`, `src/composables/useErrorHandler.js` — service/error conventions

## Tasks & Acceptance

**Execution:**

- [x] `src/modules/calendar/utils/calendar-categories.js` — NEW: export `CALENDAR_CATEGORIES` (7 entries `{value,label,color,icon}`: school blue-7/school, farm green-7/agriculture, village brown-7/holiday_village, guests purple-6/luggage, equipment orange-7/build, energy amber-7/bolt, other grey-6/event_note) + `getCalendarCategory(value)` fallback to other — single shared color map for 5.2+ reuse
- [x] `src/modules/calendar/stores/calendar-store.js` — NEW Pinia store: `loading`/`error` state; `activeCategories` ref initialized to all 7 (session-scoped); `fetchAllEvents()` composing school `fetchCalendarEvents()` + farm `fetchPlantings()`/crops/plots via `Promise.all`, wrapped in try/catch + `useErrorHandler`; getter `allEvents` normalizing to `{id,title,start,end,category,systemGenerated,description,location}` (school→`school-*`; farm harvests→`farm-harvest-*` single-day "Expected Harvest: {crop}" + plot, `systemGenerated:true`); getters `filteredEvents`, `upcomingEvents(limit)` (end ≥ today in village tz, sorted by start)
- [x] `src/modules/calendar/pages/CalendarPage.vue` — NEW page: q-btn-toggle view switcher (Month/Week/Day/Agenda); vue-cal `:views="['month','week','day']"` hidden in agenda mode with custom `#event` slot (category CSS class); agenda mode = q-list grouped by date with q-items; filter panel: q-checkbox per category with color chip + "Show All"/"Hide All" q-btns; event detail q-dialog (title, category chip, formatted date(s), description, "System Generated" badge when applicable); `isClient` guard; fetch on mount
- [x] `src/modules/calendar/router.js` + `src/router/routes.js` — NEW route `{path:'calendar', name:'village-calendar', meta:{requiresAuth:true}}`; import+spread module router
- [x] `src/layouts/MainLayout.vue` — top-level "Calendar" q-item (`event` icon, `to="/calendar"`) after Dashboard, following the Dashboard item pattern (no permission gate)
- [x] `src/pages/dashboard/DashboardPage.vue` — replace `placeholderEvents` with calendar store: fetch on mount under `isClient`, pass mapped `upcomingEvents` (`{id,title,date,time,location,type}` where `type`=category) + real `loading` to `UpcomingEventsWidget`
- [x] `src/components/dashboard/UpcomingEventsWidget.vue` — "View All Events" button `:to="{name:'village-calendar'}"`; avatar icon/color resolved from `CALENDAR_CATEGORIES` by `type` (fallback: existing default)
- [x] `docs/implementation-artifacts/deferred-work.md` — verify i18n deferral entry remains; append any 5.1 review deferrals

**Acceptance Criteria:**

- Given an authenticated user on `/calendar`, when they switch views, then month, week, and day render via vue-cal and agenda renders a chronological grouped event list (AC1).
- Given events from School and Farm sources, when the calendar renders, then each event uses its category color from `CALENDAR_CATEGORIES`, and the map contains all 7 categories including guests/equipment/energy with no events emitted for them (AC2).
- Given the filter panel, when the user unchecks categories or clicks "Show All"/"Hide All", then only events of checked categories render in calendar, agenda, and detail flows; filter state resets on page reload (AC3).
- Given a rendered event, when the user clicks it (any view incl. agenda), then a detail popup shows title, category, date(s), description, and a "System Generated" badge for Farm harvest events (AC4).
- Given plantings with status `planted`/`growing`/`harvesting` and an `expected_harvest_date`, when the calendar loads, then single-day Farm events appear on those dates; `completed`/`failed`/null-date plantings and Equipment reminders produce nothing (AC5).
- Given the dashboard, when it loads client-side, then "Upcoming Events" lists the next real events (max 5, soonest first) from the same store, and "View All Events" navigates to `/calendar` (AC6).
- Given an unauthenticated user, when they navigate to `/calendar`, then the existing auth guard redirects them; given any authenticated role (incl. Resident with no calendar permission), when they navigate there, then the read-only calendar renders with no create/edit affordances.

## Spec Change Log

## Review Triage Log

### 2026-07-28 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 2: (high 0, medium 2, low 0)
- defer: 1: (high 0, medium 0, low 1)
- reject: 16: (high 0, medium 4, low 12)
- addressed_findings:
  - `[medium]` `[patch]` Duplicate Calendar nav entry: pre-existing Services-section sub-item (`/calendar`, gated by `calendar:read`, dead link before this story) conflicted with the new always-visible top-level item — removed the stale Services sub-item from MainLayout.vue.
  - `[medium]` `[patch]` UpcomingEventsWidget.formatEventDate used browser-timezone date-fns (isToday/isTomorrow/differenceInDays) on village-tz date strings — rewritten to compare village-tz date strings via settingsStore.timezone + dateUtils (toDateStrInTimezone/addDaysToDateStr/differenceInCalendarDays).
  - Deferred (1): keyboard/arrow-key navigation for calendar views — project-wide a11y gap, recorded in deferred-work.md (post-MVP).
  - Rejected (16): status-case defensiveness already handled via toLowerCase; getter "performance risk" (Vue computed caching, ≤200 rows); hardcoded CSS rgba (mirrors SchoolCalendarPage pattern); 'All day' widget time (all 5.1 events all-day; 5.2 owns timed events); empty-state message variants (context-appropriate); plot-name null handling (explicit '' fallback); vue-cal error boundary (absent codebase-wide); relationId Appwrite assumption (correct by design); aria-labels, console.error, keyboard nav in vue-cal, contrast, no test infra (all match existing codebase conventions/deferred patterns); dashboard computed SSR (getters read in-memory Pinia state only — no Appwrite access); single-event-day speculation (no concrete defect); dialog null-safety (getCalendarCategory falls back to 'other'); 'Unknown Crop' fallback (matches farm module); dateUtils slice fallback (pre-existing, already in deferred-work); school start_date validation (schema-enforced required field).

## Design Notes

- Agenda view: vue-cal v5 has no agenda view (`day/days/week/month/year/years` only, verified against official docs) — agenda is a custom q-list fed by `filteredEvents`, grouped by `start` date via date-fns, matching AC1 without a new dependency.
- No global events table in 5.1: read-only sources are existing tables only. Story 5.2 will introduce the user-event table and write path; the normalizer's unified shape is designed so 5.2 events slot in as additional `allEvents` entries.
- Village/Other categories intentionally have no source in 5.1 (Village gets events via 5.2 creation); checkboxes render regardless.

## Verification

**Commands:**

- `npm run lint` -- expected: no errors in new/changed files
- `npm run build` -- expected: Quasar SSR build succeeds

**Manual checks (if no CLI):**

- Dev server: `/calendar` renders all 4 views; filters, detail popup, and dashboard widget behave per ACs with sample data active.

## Auto Run Result

**Summary:** Shipped Story 5.1 — a global, read-only Village Calendar at `/calendar` (vue-cal month/week/day + custom agenda list) aggregating School calendar events and Farm expected-harvest auto-events, with 7-category color coding, session-scoped checkbox filtering (Show All/Hide All), an event detail dialog with "System Generated" badges, a top-level nav entry for all authenticated users, and the dashboard "Upcoming Events" widget rewired from placeholder data to the live calendar store with village-timezone-aware relative dates.

**Files changed:**

- [src/modules/calendar/utils/calendar-categories.js](../../src/modules/calendar/utils/calendar-categories.js) — NEW: shared 7-category color/icon map (incl. forward-compatible Guests/Equipment/Energy) + `getCalendarCategory`.
- [src/modules/calendar/stores/calendar-store.js](../../src/modules/calendar/stores/calendar-store.js) — NEW: read-only aggregation Pinia store composing school `calendar-events-store` + `farm-store`; unified event shape; `filteredEvents`, `upcomingEvents(limit)`.
- [src/modules/calendar/pages/CalendarPage.vue](../../src/modules/calendar/pages/CalendarPage.vue) — NEW: calendar page (view toggle, vue-cal, agenda list, filter panel, detail dialog, SSR guard).
- [src/modules/calendar/router.js](../../src/modules/calendar/router.js) — NEW: `/calendar` route, `requiresAuth` only.
- [src/router/routes.js](../../src/router/routes.js) — spread calendar module routes.
- [src/layouts/MainLayout.vue](../../src/layouts/MainLayout.vue) — top-level Calendar nav item; removed stale permission-gated Services duplicate.
- [src/pages/dashboard/DashboardPage.vue](../../src/pages/dashboard/DashboardPage.vue) — widget fed from calendar store instead of placeholder data.
- [src/components/dashboard/UpcomingEventsWidget.vue](../../src/components/dashboard/UpcomingEventsWidget.vue) — "View All Events" routes to `/calendar`; category-driven avatar color/icon; village-tz-aware date labels; conditional attendees chip.
- [docs/sprint-status.yaml](../sprint-status.yaml), [docs/epics.md](../epics.md), [docs/implementation-artifacts/deferred-work.md](deferred-work.md) — status/handoff bookkeeping.

**Review findings:** 3 reviewers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). 2 patches applied (duplicate nav entry removed; widget timezone fix), 1 deferred (calendar keyboard navigation — post-MVP a11y), 16 rejected (codebase-convention matches, already-handled defensiveness, speculation). Acceptance Auditor: all 7 ACs and all 7 campaign invariants PASS with code evidence.

**Verification performed:** `npm run lint` exit 0 (post-implementation and post-patch); `npm run build` exit 0; `quasar build -m ssr` succeeded (implementation agent); contracts cross-checked against farm-store/school-store getters and fetch signatures.

**Residual risks:** Event rendering verified by build/lint only — no automated tests exist in this project (`npm test` is a stub); visual verification of the 4 views with sample data is recommended at next dev-server run. `village`/`other` categories have no event source until Story 5.2 (by design).

### Next Iteration

Target: **Story 5.2 — Village Calendar: Role-Based Event Creation and Editing** (slug: `5-2-village-calendar-role-based-event-creation-and-editing`; deps: 5.1 — this spec, status done). Builds on: the unified event shape and `CALENDAR_CATEGORIES` map (5.2 user-created events slot into `allEvents`), the `/calendar` route and page, and the store's fetch/aggregate pattern. 5.2 introduces the user-events table and the write path (create/edit/delete, role-scoped categories, recurring/time fields — note the dashboard widget currently maps `time: 'All day'` and must handle timed events in 5.2).
