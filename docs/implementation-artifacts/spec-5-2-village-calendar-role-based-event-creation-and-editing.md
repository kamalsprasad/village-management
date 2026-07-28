---
title: 'Story 5.2 — Village Calendar: Role-Based Event Creation and Editing'
type: 'feature'
created: '2026-07-28'
status: 'done'
baseline_revision: '9d07fcf70089dee021ee7260d47b20107375f792'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
warnings: ['oversized']
---

<intent-contract>

## Intent

**Problem:** The 5.1 calendar is read-only — module managers cannot create or edit events for their area, and the dashboard widget assumes all events are all-day.

**Approach:** Add a `village_events` Appwrite table plus a write path in the calendar store; a permission-gated "Create Event" button and event form dialog on CalendarPage with role-scoped categories, time and simple recurrence (daily/weekly/monthly) support; edit/delete with confirmation gated to creator/admin/Events Coordinator; timed-event display in the dashboard widget. Hardcoded English (i18n deferred, user decision 2026-07-28).

## Boundaries & Constraints

**Always:**

- Vue 3 `<script setup>`, Quasar components only, Pinia options-store pattern, `useErrorHandler`, `tables` + `ID` + `Query` from `src/boot/appwrite` / `appwrite` (mirror `src/modules/school/stores/calendar-events-store.js` CRUD signatures exactly).
- Dates stored as ISO datetimes via `datePickerToStartOfDayISO`/`datePickerToEndOfDayISO`; display via `src/utils/dateUtils.js` with `settingsStore.timezone`. vue-cal all-day ends stay exclusive (+1 day via `addDaysToDateStr`).
- User-created events normalize into the 5.1 unified shape plus `startTime, endTime, isAllDay, isRecurring, recurrenceRule, createdBy, sourceId`; always `systemGenerated: false`. Farm harvest auto-events stay read-only (no edit/delete ever).
- All create/edit/delete UI gated by `hasPermission('calendar:write')` from `usePermissions`; category options scoped by role-name map: Farm Manager→[farm], Head Teacher→[school], Village Head→[village], Events Coordinator/System Administrator→all 7. Edit/delete allowed only for event creator, admin (`*` permission), or Events Coordinator.
- Recurrence uses simple string rules only: `daily` | `weekly` | `monthly` (enum). No rrule dependency. Expand occurrences in the store getter from series start to horizon = today + 12 months (village tz), capped at 400 occurrences, preserving multi-day span.
- SSR-safe: all Appwrite fetches remain client-mount-guarded (`isClient`); the form dialog only opens from client-side clicks.
- seed-roles.js: add `calendar:write` to Farm Manager, Head Teacher, Village Head role definitions (Events Coordinator and System Administrator already covered). Do not change seeder skip-existing behavior.

**Block If:** A new npm dependency seems required (e.g. rrule) — HALT `new dependency required: <name> — user approval needed`.

**Never:**

- No notification delivery for `notify_user_ids` (store the IDs only; the notifications system is Story 5.10).
- No per-occurrence editing of recurring series (editing a series edits all occurrences).
- No route-guard change (`/calendar` stays `requiresAuth` only); no i18n/vue-i18n; no Options API; no raw HTML controls; no emojis; no events for deferred-module sources (5.5/5.6/5.8).

## I/O & Edge-Case Matrix

| Scenario          | Input / State                                                     | Expected Output / Behavior                                                                         | Error Handling                         |
| ----------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Create happy path | Farm Manager, valid Farm event form                               | Row created with `created_by`=user id, `system_generated=false`; appears in calendar/agenda/widget | notifyError on createRow failure       |
| Category scoping  | Head Teacher opens form                                           | Category select offers only School; saving another category is impossible from UI                  | Validation blocks empty category       |
| Unauthorized user | Resident without `calendar:write`                                 | No Create button, no Edit/Delete buttons anywhere                                                  | No error expected                      |
| Edit rights       | Non-creator, non-admin, non-Events Coordinator views a user event | Detail dialog shows no Edit/Delete                                                                 | No error expected                      |
| System event      | Farm harvest event clicked                                        | Detail dialog has no Edit/Delete, keeps "System Generated" badge                                   | No error expected                      |
| Delete            | Creator clicks Delete, confirms                                   | `$q.dialog` confirm; row deleted; event gone after refetch                                         | Cancel = no-op; notifyError on failure |
| Recurring weekly  | is_recurring, rule `weekly`, start 2026-08-03                     | Occurrences every 7 days through today+12mo, each clickable to same base event                     | Cap 400 occurrences                    |
| Timed event       | is_all_day=false, start_time 14:30                                | vue-cal week/day render timed event; widget shows "at 14:30"; detail dialog shows time             | Missing end_time → 1h duration         |
| Validation        | end_date < start_date, or timed event without start_time          | Form refuses submit with rule messages                                                             | Quasar rules, no API call              |
| Fetch failure     | listRows on village_events rejects                                | Store error state + notifyError; school/farm events still render                                   | Promise.all catch (5.1 pattern)        |

</intent-contract>

## Code Map

- `src/modules/calendar/stores/calendar-store.js` — 5.1 aggregation store; add `userEvents` state, fetch, normalization + recurrence expansion into `allEvents`, and `createEvent`/`updateEvent`/`deleteEvent` actions
- `src/modules/school/stores/calendar-events-store.js` — CRUD + env-var pattern to mirror (`tables.createRow/updateRow/deleteRow`, `ID.unique()`, `Query.orderAsc`, notify on success/error)
- `src/modules/school/pages/CalendarEventsSettingsPage.vue` — form dialog pattern to mirror (q-dialog + q-form + rules + `form.validate()`, q-date/q-time with q-popup-proxy)
- `src/modules/calendar/pages/CalendarPage.vue` — add Create button, edit/delete actions in detail dialog, timed vue-cal events
- `src/modules/calendar/utils/calendar-categories.js` — reuse `CALENDAR_CATEGORIES` for the category dropdown
- `src/pages/admin/UsersPage.vue` — pattern for listing `users` table rows (notify-user select options: `Query.select(['*', 'role_ids.*'])` not needed; name + $id suffice)
- `src/composables/usePermissions.js` (`hasPermission`), `src/stores/auth-store.js` (`user?.$id`, `userRoles`)
- `server/scripts/setup-appwrite.js` — table schema pattern (`tableSchemas`, shared `permissions` var, ~line 1240 `school_calendar_events`)
- `server/scripts/seed-roles.js` — `defaultRoles` permission arrays
- `src/pages/dashboard/DashboardPage.vue` (line ~76) — widget mapping `time: 'All day'`
- `src/components/dashboard/UpcomingEventsWidget.vue` — renders `{{ formatEventDate(event.date) }} at {{ event.time }}`

## Tasks & Acceptance

**Execution:**

- [x] `server/scripts/setup-appwrite.js` — add `village_events` to `tableSchemas` after `school_calendar_events`, same `permissions` var: title (string 255, req), category (enum school/farm/village/guests/equipment/energy/other, req), start_date (datetime, req), end_date (datetime, req), start_time (string 5, opt), end_time (string 5, opt), is_all_day (boolean, req, default true), is_recurring (boolean, req, default false), recurrence_rule (enum daily/weekly/monthly, opt), location (string 255, opt), description (string 1000, opt), created_by (string 50, req), notify_user_ids (string 50, array, opt), system_generated (boolean, req, default false); index `idx_village_events_date` on start_date ASC
- [x] `server/scripts/seed-roles.js` — add `'calendar:write'` to Farm Manager, Head Teacher, Village Head `permissions` arrays (note in code comment that existing deployments must re-sync role rows since the seeder skips existing roles)
- [x] `src/modules/calendar/utils/calendar-permissions.js` — NEW: `ROLE_CATEGORY_MAP` (role name → category array, Events Coordinator + System Administrator → all 7), `allowedCategories(userRoles)` (union of mapped categories; `['other']` fallback if none mapped), `canManageEvent(event, userId, userRoles)` (false when `systemGenerated` or no `sourceId`; true when `createdBy === userId` or roles include `*` permission or name 'Events Coordinator')
- [x] `src/modules/calendar/stores/calendar-store.js` — add `userEvents: []` state; `fetchUserEvents()` (listRows `village_events`, env `VITE_APPWRITE_TABLE_VILLAGE_EVENTS` fallback `'village_events'`, `Query.orderAsc('start_date')`, limit 500) included in `fetchAllEvents` Promise.all; extend `allEvents` getter: normalize each row (dates via `toDateStrInTimezone`), expand recurring series (date-fns addDays/addWeeks/addMonths, horizon today+12mo, cap 400, preserve multi-day span; occurrence id `user-<rowId>-<date>`, base id `user-<rowId>`, both carry `sourceId`); add `createEvent`/`updateEvent`/`deleteEvent` actions mirroring school store (payload builds dates via `datePickerToStartOfDayISO`/`datePickerToEndOfDayISO`, sets `created_by` from authStore, `system_generated: false`; success notify + refetch user events)
- [x] `src/modules/calendar/components/EventFormDialog.vue` — NEW: q-dialog + q-form; props `modelValue`, `event` (null = create), `allowedCategories`; fields per I/O matrix (title, category q-select of allowed categories, is_all_day q-toggle, start/end q-date popup proxies, start/end q-time popup proxies when timed, is_recurring q-toggle + rule q-select, location, description textarea, notify-users q-select multiple from `users` table rows fetched on open); Quasar rules incl. end >= start and start_time required when timed; emits `save` with form payload; edit mode pre-fills from the `village_events` row
- [x] `src/modules/calendar/pages/CalendarPage.vue` — "Create Event" q-btn in header (`v-if="hasPermission('calendar:write')"`, opens dialog create mode); detail dialog: show time row for timed events, "Recurring: Daily/Weekly/Monthly" chip when applicable, resolve occurrence clicks to base event via `sourceId`; Edit/Delete q-btns `v-if="canManageEvent(selectedEvent, ...)"` — Edit opens dialog with the row from `calendarStore.userEvents`, Delete fires `$q.dialog` confirm then `deleteEvent`; `vueCalEvents` maps timed events as `start: '<date> <HH:mm>'` / `end: '<date> <HH:mm>'` (default +1h when no end_time), all-day keeps +1 day
- [x] `src/pages/dashboard/DashboardPage.vue` — widget mapping: `time: evt.isAllDay ? null : evt.startTime` (was hardcoded `'All day'`)
- [x] `src/components/dashboard/UpcomingEventsWidget.vue` — render ` at {{ event.time }}` only when `event.time` truthy (keep `formatEventDate` unchanged)

**Acceptance Criteria:**

- Given a user with `calendar:write`, when they view `/calendar`, then a "Create Event" button shows and opens the event form; given a user without it, then no create/edit/delete affordance appears anywhere on the page (AC1).
- Given the event form, when it is filled (title, category, dates, optional times/recurrence/location/description/notify users) and saved, then a `village_events` row is created and the event appears in calendar, agenda, and dashboard widget (AC2).
- Given a Farm Manager (Head Teacher, Village Head), when they open the form, then the category select offers only Farm (School, Village); given an Events Coordinator or System Administrator, then all 7 categories are offered (AC3).
- Given a user-created event, when the creator, an admin, or an Events Coordinator opens its detail dialog, then Edit and Delete buttons show and Delete asks for confirmation; given any other user or a system-generated event, then no Edit/Delete buttons show (AC4).
- Given events on the calendar, when badges render, then only Farm harvest events carry "System Generated" and every user-created row has `system_generated = false` (AC5).
- Given a recurring weekly event starting 2026-08-03, when the calendar renders, then occurrences appear every 7 days through the 12-month horizon, and clicking any occurrence opens the same base event (AC2/recurrence).
- Given a timed user event (14:30), when the dashboard widget lists it, then it shows "at 14:30"; given an all-day event, then no "at …" text renders.
- Given an unauthenticated user, when they hit `/calendar`, then the existing guard redirects; given SSR, then no Appwrite call happens server-side.

## Spec Change Log

## Review Triage Log

### 2026-07-28 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 14: (high 0, medium 6, low 8)
- defer: 4: (high 1, medium 0, low 3)
- reject: 4: (high 0, medium 1, low 3)
- addressed_findings:
  - `[medium]` `[patch]` Monthly recurrence drifted off month-end dates (Jan 31 -> Feb 28 -> Mar 28) because occurrences chained `addFn(current, 1)` — expansion rewritten to anchor every occurrence to the series start (`addFn(seriesStart, i)`) so date-fns clamping never compounds. [calendar-store.js]
  - `[medium]` `[patch]` The 400-occurrence cap was consumed by long-past occurrences, silently dropping old daily series from the calendar — expansion now fast-forwards to the first occurrence on/after a 12-month lookback before counting. [calendar-store.js]
  - `[medium]` `[patch]` Recurring series starting beyond the 12-month horizon emitted zero occurrences (invisible and unmanageable) — the base event is now always pushed when expansion emits nothing. [calendar-store.js]
  - `[medium]` `[patch]` A missing/unmigrated `village_events` table failed the whole calendar load (incl. pre-existing school/farm sources) with a double error toast — `fetchUserEvents` result excluded from the fatal check in `fetchAllEvents`; calendar degrades to 5.1 sources with a single toast. [calendar-store.js]
  - `[medium]` `[patch]` `upcomingEvents` had no per-series dedupe — one daily series could fill all 5 dashboard widget slots; now deduplicated by `sourceId` (soonest occurrence kept). [calendar-store.js]
  - `[medium]` `[patch]` Store write path had no guards: `created_by` fell back to `''` on a missing session and actions were callable without permission — added `guardCreate` (authenticated + `calendar:write`) and `guardManage` (creator/admin/Events Coordinator via `canManageEvent`) to all CUD actions as defense-in-depth. [calendar-store.js]
  - `[low]` `[patch]` `endDateOptions` compared q-date's `YYYY/MM/DD` callback format against the `YYYY-MM-DD` model (dead code — every date passed) — normalized before comparison. [EventFormDialog.vue]
  - `[low]` `[patch]` `normalizeUserEvent` didn't clamp `end < start` or unparseable end dates (NaN span, inverted vue-cal ranges) — clamped to start. [calendar-store.js]
  - `[low]` `[patch]` Timed vue-cal mapping wrapped past midnight (23:15 + 1h default -> 00:15 same day, end < start) and applied the 1h default to the last day of multi-day events — midnight wrap rolls the end date forward; multi-day without end_time ends 23:59 on the last day. [CalendarPage.vue]
  - `[low]` `[patch]` Whitespace-only titles passed validation then failed server-side; title/location/description had no length limits vs schema (255/255/1000) — trim-aware rule + maxlengths added. [EventFormDialog.vue]
  - `[low]` `[patch]` Notify-users select used `Query.orderAsc('name')` on an unindexed column and kept stale options across opens — order dropped (client-side sort), options reset per open, existing selection IDs merged into options. [EventFormDialog.vue]
  - `[low]` `[patch]` `VITE_APPWRITE_TABLE_VILLAGE_EVENTS` existed only as a code fallback — registered in `.env.example` and both entry lists of `scripts/setup/configure-env.js`.
  - `[low]` `[patch]` Recurring chip rendered "Recurring: " blank when `recurrence_rule` is null (API-written rows) — generic "Recurring" fallback. [CalendarPage.vue]
  - `[low]` `[patch]` Agenda view showed no time for timed events — time caption added. [CalendarPage.vue]
  - Deferred (4): client-side-only authorization posture (platform-wide `"any"` table permissions — architectural decision, recorded in deferred-work.md); seeder skip-existing means existing deployments need manual role re-sync (spec-constrained); 500-row fetch cap without pagination (mirrors school store pattern); 5.1 `formatDateInTimezone` UTC-midnight parse shift for negative-offset timezones (pre-existing).
  - Rejected (4): role-name-keyed category scoping (documented spec design decision with conservative `['other']` fallback); dashboard widget skeleton flash during CUD (store-wide `loading` flag is the codebase convention); admin manage-rights asymmetry when role permissions fail to load (speculative partial-degradation scenario); multi-day events grouped under start date only in agenda (pre-existing 5.1 behavior).

## Design Notes

- `notify_user_ids` is capture-only in 5.2: the form stores selected user IDs on the row; delivery belongs to the Story 5.10 notifications system. Select options come from the `users` table (name + $id), fetched when the dialog opens (client-side only).
- Recurrence horizon (today + 12 months, 400-occurrence cap) keeps getter cost bounded without an rrule dependency; series older than the cap still show future occurrences because expansion stops at the horizon, not at the cap, unless the cap is hit first.
- Category scoping is role-name based (matches seeded role names exactly). Users holding `calendar:write` via an unmapped future role fall back to `['other']` — conservative default, documented for review.
- seed-roles.js skips existing roles, so the new `calendar:write` grants apply to fresh setups; existing deployments update the three role rows in the Appwrite console.

## Verification

**Commands:**

- `npm run lint` — expected: no errors in new/changed files
- `npm run build` — expected: Quasar SSR build succeeds

**Manual checks (if no CLI):**

- Dev server with sample data: as admin, create a timed recurring event; verify calendar/agenda/widget rendering, edit + delete with confirmation; verify Farm harvest events have no Edit/Delete; verify a Resident sees no Create button.

## Auto Run Result

**Summary:** Shipped Story 5.2 — role-based event creation and editing on the village calendar: a new `village_events` Appwrite table, a permission-gated "Create Event" button and full event form dialog (role-scoped categories, all-day/timed, daily/weekly/monthly recurrence, notify-users capture), edit/delete with confirmation gated to creator/admin/Events Coordinator, user events aggregated into the 5.1 unified calendar (always non-system-generated), timed-event support in vue-cal views and the dashboard Upcoming Events widget, and `calendar:write` seed grants for Farm Manager, Head Teacher, and Village Head.

**Files changed:**

- [server/scripts/setup-appwrite.js](../../server/scripts/setup-appwrite.js) — `village_events` table schema (14 columns + date index).
- [server/scripts/seed-roles.js](../../server/scripts/seed-roles.js) — `calendar:write` added to Farm Manager, Head Teacher, Village Head; re-sync comment for existing deployments.
- [src/modules/calendar/utils/calendar-permissions.js](../../src/modules/calendar/utils/calendar-permissions.js) — NEW: role→category map, `allowedCategories`, `canManageEvent`.
- [src/modules/calendar/stores/calendar-store.js](../../src/modules/calendar/stores/calendar-store.js) — userEvents fetch/normalize/recurrence expansion (anchored, lookback-windowed, 400-cap), CUD actions with defense-in-depth guards, non-fatal user-events fetch, per-series widget dedupe.
- [src/modules/calendar/components/EventFormDialog.vue](../../src/modules/calendar/components/EventFormDialog.vue) — NEW: create/edit form dialog (category scoping, date/time pickers, recurrence, notify-users select).
- [src/modules/calendar/pages/CalendarPage.vue](../../src/modules/calendar/pages/CalendarPage.vue) — Create button, detail-dialog Edit/Delete + time/recurring display, timed vue-cal mapping, agenda times.
- [src/pages/dashboard/DashboardPage.vue](../../src/pages/dashboard/DashboardPage.vue) — widget mapping passes real event times.
- [src/components/dashboard/UpcomingEventsWidget.vue](../../src/components/dashboard/UpcomingEventsWidget.vue) — conditional time rendering.
- [.env.example](../../.env.example), [scripts/setup/configure-env.js](../../scripts/setup/configure-env.js) — `VITE_APPWRITE_TABLE_VILLAGE_EVENTS` registration.
- [docs/sprint-status.yaml](../sprint-status.yaml), [docs/epics.md](../epics.md), [docs/implementation-artifacts/deferred-work.md](deferred-work.md) — status/handoff bookkeeping.

**Review findings:** 2 reviewers (Blind Hunter, Edge Case Hunter). 14 patches applied (recurrence anchoring + lookback window + zero-occurrence fallback, non-fatal user-events fetch, widget series dedupe, store-level permission guards, q-date options format fix, end<start clamp, midnight-wrap/multi-day time fixes, validation hardening, unindexed-order fix, env registration, chip fallback, agenda times). 4 deferred (client-side-only authorization posture — platform-wide; seeder no-upsert for existing deployments; 500-row fetch cap; 5.1 date-parse shift) — all recorded in deferred-work.md. 4 rejected (documented design decisions, codebase conventions, speculation).

**Verification performed:** `npm run lint` exit 0 (post-implementation and post-patch); `npm run build` exit 0; `node --check` on setup-appwrite.js, seed-roles.js, configure-env.js; no stale `recurrenceLabel` references; all 8 spec tasks verified complete in code.

**Residual risks:** Event creation/editing verified by build/lint only (no automated tests in this project) — a dev-server pass with sample data is recommended, incl. a Farm Manager login to confirm role-scoped categories. On existing deployments, the `village_events` table must be created (re-run setup:appwrite) and the three role rows re-synced manually; until then the calendar degrades gracefully to 5.1 sources. Recurring-event rendering at month boundaries and the 12-month expansion window are worth a spot check. Follow-up review recommended given the volume of review-driven changes (14 patches, incl. the recurrence-expansion rewrite and store guards).

### Next Iteration

Target: **Story 5.3 — Cloud Storage: Role-Based Storage Quotas and Personal Folders** (slug: `5-3-cloud-storage-role-based-storage-quotas-and-personal-folders`; deps: Story 1.10 — done). Builds on: the seeded role `storage_quota` values and `userStorageQuota` in `usePermissions`/`permissions.js`, the dashboard widget pattern, and the Appwrite TablesDB/store conventions used here. 5.3 introduces Appwrite Storage buckets (personal/school/farm/village files) and a `useFileUpload`-style composable with client-side quota validation, usage progress bar with >90% warning, drag-and-drop multi-file upload, and private personal-folder file operations (download/delete/rename/move/search).
