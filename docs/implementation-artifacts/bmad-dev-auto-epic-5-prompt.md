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
Story to implement THIS iteration: 5.10c — Notifications System
Epic context file to load/compile: {implementation_artifacts}/epic-5-context.md
Spec file to produce: {implementation_artifacts}/spec-5-10c-notifications-system.md

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
    - 5.10c Notifications System (AC3) — includes new Appwrite `notifications` table ← THIS ITERATION
    - 5.10d Help and Documentation (AC7)
    - 5.10e UX Polish, Performance, Mobile Responsiveness, and Final Testing Checklist (AC4, AC5, AC6, AC9)
    - AC8 System Health Monitoring — DEFERRED to post-MVP (user decision 2026-08-04; documented in deferred-work.md during 5.10a)

DEFERRED (post-MVP — out of scope, do NOT implement, do NOT add toggles for them): 5.5 Guests, 5.6 Equipment, 5.8 Energy, 4.9–4.11, 5.10 AC8 (System Health Monitoring).

## Story 5.10c Specifics <<< CHANGE PER ITERATION >>>

Intent: Deliver the Notifications System sub-story for MVP Story 5.10. Implement Story 5.10 AC3: "Notifications system: bell icon, count badge, notification panel, filter by type, mark as read." This sub-story adds (1) a new Appwrite `notifications` table and a per-user `notification_reads` table, plus a `createNotification` server function for role-targeted delivery; (2) a `notifications` Pinia store and a bell icon + unread count badge in the `MainLayout.vue` header (next to the 5.10b quick-search box); (3) a notification panel (dropdown off the bell) listing notifications filtered by type with mark-as-read (single + all); (4) an Appwrite realtime subscription so the badge updates live; and (5) a bounded set of REAL, role-targeted notification triggers wired into existing modules — including the school (at-risk learner newly flagged) and farm (farm alert newly raised) modules — so notifications fire ONLY for users whose roles are relevant to the event (e.g., an at-risk-learner notification does NOT fire for a user without a school-relevant role; a farm-alert notification does NOT fire for a user without `farm:read`). Email notifications are OUT of scope (AC3 lists in-app features only; PRD line 668's "email notifications (optional)" is deferred to post-MVP — user decision 2026-08-05). This is Story 5.10 AC3 only — the remaining 5.10 ACs (help/docs, UX polish, performance, mobile, testing checklist) are handled by sub-stories 5.10d–5.10e. AC8 (System Health Monitoring) is deferred to post-MVP (already documented in deferred-work.md during 5.10a).

This is the ONLY 5.10 sub-story that adds new Appwrite infrastructure. Unlike 5.10b (reuse-only), 5.10c ADDS: a new `notifications` table, a new `notification_reads` table, a new `createNotification` server function, new `notifications:read` / `notifications:write` permission keys, new `.env` table-ID vars (`VITE_APPWRITE_TABLE_NOTIFICATIONS`, `VITE_APPWRITE_TABLE_NOTIFICATION_READS`), and OPTIONALLY a new `/notifications` route (the panel may instead be a `q-menu`/`q-dialog` off the bell with no new route — the spec decides). It REUSES existing RBAC (`usePermissions` / `hasPermission`), the existing `authStore` (user roles), `settingsStore`, and existing module stores where triggers are wired (school `at-risk-store`, farm `farm-store`, + one create-event store). It modifies `MainLayout.vue` (add bell + badge + panel + realtime subscription) and adds a new `src/stores/notifications-store.js`.

ACs (from docs/epics.md Story 5.10 AC3 — treat as authoritative):

3. Notifications system: bell icon, count badge, notification panel, filter by type, mark as read.

Sub-ACs for 5.10c (derived from AC3 + user decisions 2026-08-05: in-app only; Appwrite realtime for live badge; role-targeted triggers including school + farm):

3a. **Notifications infrastructure (Appwrite).** New `notifications` table — schema: `type` (string enum), `title` (string), `body` (string), `link` (string, optional — route to navigate on click), `target_roles` (string array — role IDs), `target_permissions` (string array, optional — permission keys, alternative targeting), `related_entity_type` (string, optional), `related_entity_id` (string, optional), `severity` (string enum: info|warning|critical), `created_at` (datetime), `created_by` (string), `expires_at` (datetime, optional). New `notification_reads` table — schema: `notification_id` (relation → notifications), `user_id` (string), `read_at` (datetime) — for per-user read tracking. Add both to `server/scripts/setup-appwrite.js` (match the existing table-declaration pattern). Add `VITE_APPWRITE_TABLE_NOTIFICATIONS` and `VITE_APPWRITE_TABLE_NOTIFICATION_READS` to `.env.example` (do NOT commit real `.env`). Add permission keys `notifications:read` / `notifications:write` to `src/utils/permissions.js` and `server/scripts/seed-roles.js` (upsert-capable per 5.13 — grant `notifications:read` to ALL roles; `notifications:write` only to the server-function context + roles that legitimately create notifications).
3b. **Role-targeted delivery (server function).** New Appwrite Function `server/functions/createNotification/` (follow the existing `server/functions/User Management/` + `server/functions/storageUsageReport/` pattern — `package.json` with `@appwrite/node`, `src/main.js` exporting the handler, README). It accepts `{ type, title, body, link, target_roles, target_permissions, related_entity_type, related_entity_id, severity }`, validates the caller is authorized to create a notification of that `type` (per-type authorization matrix — e.g., only a caller with `school:read`/`school:write` may create `at_risk_learner` notifications; only `farm:read`/`farm:write` may create `farm_alert` notifications), and creates ONE `notifications` row with the `target_roles`/`target_permissions` fields. It does NOT create per-user rows — delivery is "one row, many targets"; per-user read state lives in `notification_reads`. It MUST NOT trust client-supplied `target_roles` blindly — it derives/validates them from the `type` (or rejects). Audit-log the creation only if it fits the existing audit pattern (optional — the spec decides; do NOT add new audit enum values unless needed, and if so document them).
3c. **Notifications store + bell UI.** New `src/stores/notifications-store.js` (Pinia options-store pattern matching existing stores — `useErrorHandler`, `isClient`-guarded fetch in `onMounted`): `fetchMyNotifications` (lists rows where `target_roles` intersects the current user's `authStore.userRoles` OR `target_permissions` matches one of the user's permissions, joined against `notification_reads` to compute `is_read`), `unreadCount` getter, `markRead(id)`, `markAllRead()`, `filterByType(type)`. Add a bell `q-btn` (`icon="notifications"`, `aria-label="Notifications"`) with a `q-badge` unread count to the `MainLayout.vue` header toolbar (next to the 5.10b quick-search box — verify spacing/overflow on xs; the bell MUST remain visible on xs even though the quick-search is `gt-xs`; hide the count badge when 0). The bell opens the notification panel.
3d. **Notification panel.** Panel (`q-menu` anchored to the bell on desktop, `q-dialog` on mobile — or a dedicated `/notifications` route; the spec decides) lists notifications newest-first, each row showing icon (by `type`/`severity`), `title`, `body`, relative time (via `date-fns formatDistanceToNow` with `settingsStore.timezone`), and a mark-as-read control. Filter by `type` (a `q-btn-toggle` or `q-select` of distinct types present). "Mark all read" action. Clicking a notification navigates to its `link` (if any) and marks it read. Empty state ("No notifications"), loading state, error state. SSR-safe (no Appwrite calls during SSR; fetch on mount client-side).
3e. **Realtime live updates.** Subscribe to the `notifications` table via Appwrite realtime in `MainLayout.vue` `onMounted` (verify the exact channel string against the installed Appwrite SDK version in `package.json` — e.g. `client.subscribe('databases.<db>.collections.<notifications-table>', handler)`); on any document event, refetch `unreadCount` (and refresh the open panel if open). MUST be client-only, subscribed after `isClient` hydration, unsubscribed in `onBeforeUnmount`/`onUnmounted`. SSR-safe. If the realtime subscription fails, fall back to the polled fetch from 3c (do NOT crash the bell).
3f. **Real, role-targeted triggers (bounded set — CAP at 3).** Wire notification creation into existing modules. The trigger set (the spec enumerates exact call sites + the per-type authorization matrix for the `createNotification` function):

- **At-risk learner newly flagged (school)** — target `school:read` (covers teachers/faculty/school admins). IMPORTANT: at-risk is a DERIVED, in-memory computation (`src/modules/school/stores/at-risk-store.js` `computeAtRisk`, 60s cache, NOT a persisted event — see lines 109-115). The trigger must detect NEWLY at-risk learners (diff the freshly computed list against the last-notified set) and create one notification per newly-at-risk learner, deduplicated by `related_entity_id` = learner id + `type` = `at_risk_learner` (check `notifications` for an existing row with the same `type` + `related_entity_type` + `related_entity_id` before creating — crash-safe across reloads). Wire into `computeAtRisk` (or a thin watcher on its result) — do NOT restructure the at-risk algorithm.
- **Farm alert newly raised (farm)** — target `farm:read`. IMPORTANT: farm alerts are ALSO derived/in-memory (`src/modules/farm/stores/farm-store.js` `generateFarmAlerts` — "Pure computation — does NOT write to Appwrite", lines 2402-2411). Same transition-detection + dedup pattern: detect newly-raised alerts (diff against last-notified set; dedup by `related_entity_type` + `related_entity_id` + `alert_type`), create one notification per new alert. Wire into `generateFarmAlerts` or its call sites (`FarmAlertsPage.vue`, `FarmAlertsWidget.vue`) — do NOT restructure the alert algorithm.
- **One simple create-event trigger (spec chooses exactly one)** — e.g., new finance transaction created (`finance-store` `createTransaction`) → target `finance:read`; OR new vendor created (`vendors-store`) → target `finance:read` + `farm:read`; OR new calendar event created (`calendar-store`) → target all. Pick the cleanest single create-event trigger (fires once at creation, no transition-detection needed) as a counterweight to the two derived triggers. The spec MUST pick exactly one and justify it.
  CAP RATIONALE: at-risk + farm-alert triggers each require transition-detection + dedup machinery (non-trivial); capping at 3 triggers total keeps this within one iteration. Do NOT wire triggers into every module. If the spec derivation finds the trigger-wiring scope still exceeds one iteration, set `warnings: [multiple-goals]` and HALT with a proposal to split 5.10c into 5.10c1 (infrastructure + bell + panel + realtime + seeded demo notifications) and 5.10c2 (real trigger wiring) — per the bmad-dev-auto discipline. Do NOT silently expand scope.
  3g. **Seeded demo notifications.** `seedAllData` (or a small dedicated seeder) inserts a few sample notifications of each type so the bell/panel are demonstrable in sample-data mode without waiting for a real trigger. Mark them read/unread mixed.

Prerequisites confirmed done: ALL prior MVP stories in all epics (1.1–1.11, 2.1–2.9, 3.1–3.10, 4.1–4.8, 4.12–4.13, 5.1–5.4, 5.7, 5.9, 5.11–5.14) are `done` in `docs/sprint-status.yaml`, and **5.10a and 5.10b are `done`** (5.10b done 2026-08-05 after post-finalization patch `3152db1`; see spec-5-10b Review Triage Log §2026-08-05). 5.10c depends on 5.10b — it adds the bell to the same `MainLayout.vue` header that 5.10b added the quick-search box to (verify header spacing/overflow). No spec file exists yet for 5.10c.

**New Appwrite infrastructure (5.10c is the EXCEPTION to the reuse-only rule — user decision 2026-08-05):**

- NEW tables: `notifications`, `notification_reads` (schemas in 3a). Add to `setup-appwrite.js`.
- NEW server function: `createNotification` (role-targeted, authorized delivery — 3b). Model on `server/functions/User Management/` + `server/functions/storageUsageReport/`.
- NEW permissions: `notifications:read` (all roles), `notifications:write` (limited — the spec defines the per-type authorization matrix). Add to `permissions.js` + `seed-roles.js` (upsert-capable).
- NEW `.env` vars: `VITE_APPWRITE_TABLE_NOTIFICATIONS`, `VITE_APPWRITE_TABLE_NOTIFICATION_READS` (add to `.env.example` ONLY — never commit real `.env`).
- OPTIONALLY new route `/notifications` (the spec decides — panel may be a `q-menu`/`q-dialog` with no new route).
- NO new audit enum values unless the spec determines `createNotification` auditing is needed (document if added).
- NO email (deferred to post-MVP — user decision 2026-08-05).

**Existing header structure to verify (do NOT break):**

`MainLayout.vue` header (after 5.10b) renders: village name + version + quick-search `q-input` (width 260px, `class="gt-xs"`, with a `q-menu` results dropdown using `no-focus no-refocus`) + user profile `q-btn`. The drawer nav (sectioned `q-expansion-item`s with the 5.10b `expandedSections` route-watcher) is unchanged. 5.10c ADDS the bell `q-btn` + `q-badge` + panel to the same header toolbar and a realtime subscription in `onMounted`. It MUST NOT break the 5.10b quick-search box, the `expandedSections` auto-expand watcher, or the user menu. Verify the header does not overflow on md/sm/xs — the quick-search is already `gt-xs`; the bell MUST remain visible on xs (place it so it survives xs, possibly before/after the search and confirmed with `$q.screen`).

Continuity context from prior work (read these files before scaffolding):

- `src/layouts/MainLayout.vue` — the app shell. Header toolbar (after 5.10b: village name + version + quick-search `q-input` width 260px `gt-xs` + user profile `q-btn`) is where the bell + badge + panel go. Drawer nav holds the `q-expansion-item` sections and `expandedSections` reactive state + the 5.10b route-watcher. 5.10c adds the bell + panel + realtime subscription here. Read the full file before editing.
- `src/composables/useGlobalSearch.js` — the 5.10b quick-search composable. 5.10c does NOT touch it but shares the header; confirm no collision and that the bell placement doesn't break the search input's `q-menu`.
- `src/stores/notifications-store.js` (NEW) — model on `src/stores/finance-store.js` / `src/modules/school/stores/at-risk-store.js` (options-store pattern, `useErrorHandler`, `isClient`-guarded fetch in `onMounted`).
- `server/functions/User Management/` + `server/functions/storageUsageReport/` — the established server-function pattern (`package.json` with `@appwrite/node`, `src/main.js` exporting the Appwrite function handler, README). Model `createNotification` on these.
- `server/scripts/setup-appwrite.js` — where new tables + permissions are declared. Match the existing table-declaration pattern (the shared `permissions` var + per-table overrides). NOTE the platform-wide `read/create/update/delete("any")` debt documented in deferred-work.md — for `notifications`/`notification_reads`, prefer per-row targeting via `target_roles` + the `createNotification` function rather than relying on table-level "any" (the spec MUST decide the table permission model; do NOT silently inherit the debt).
- `server/scripts/seed-roles.js` — upsert-capable role seeder (per 5.13). Add `notifications:read` to all roles, `notifications:write` to the relevant subset.
- `src/utils/permissions.js` + `src/composables/usePermissions.js` — add the new permission keys; reuse `hasPermission`.
- `src/modules/school/stores/at-risk-store.js` `computeAtRisk` (lines 109+) — the at-risk trigger site. Derived/in-memory, 60s cache.
- `src/modules/farm/stores/farm-store.js` `generateFarmAlerts` (lines 2402+) — the farm-alert trigger site. Pure computation, does NOT write to Appwrite.
- `src/boot/appwrite.js` — `tables` + `client` exports; the realtime subscription uses the `client` (verify the export name and the installed Appwrite SDK version in `package.json` for the correct `client.subscribe` channel syntax).
- `src/stores/auth-store.js` — `authStore.userRoles` for "my notifications" targeting intersection.
- `docs/architecture.md` — RBAC model, table schema conventions, server-function conventions.
- `docs/ux-specification.md` — notification bell/panel patterns (search for "notification" / "bell" / "alert"); §"Header" / §"Global Elements" if present.
- `docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md` — 5.10b spec (DONE); read to confirm 5.10b's header changes (quick-search box, `expandedSections` watcher) so 5.10c's bell placement doesn't collide.
- `docs/implementation-artifacts/deferred-work.md` — carry-forward items; the 5.10b `no-focus` search-menu accessibility item is owned by 5.10e (do NOT fix in 5.10c).

Key design decisions for the spec to resolve:

- **Read-tracking model:** per-user `notification_reads` table (recommended — scales, clean, gives per-user `read_at`) vs. `read_by` string array on `notifications` (simpler but Appwrite array limits + no per-user read_at). The spec MUST pick `notification_reads` unless it justifies otherwise, and specify the schema + the join query (`Query.equal('user_id', currentUserId)` on `notification_reads`, then mark notifications whose id is in the read set as `is_read`).
- **Targeting model:** `target_roles` (array of role IDs) vs. `target_permissions` (array of permission keys like `school:read`). The spec MUST pick one as primary (recommend `target_roles` since roles are the app's RBAC unit and the user explicitly wants role-based targeting) and specify how "my notifications" is computed (intersect `target_roles` with `authStore.userRoles`). If `target_permissions` is also supported, specify the OR logic.
- **Delivery mechanism:** the `createNotification` server function (recommended — single row + role targeting, secure, validates caller authority per type) vs. client-side direct row creation (spoofable, can't safely enumerate target roles — NOT recommended). The spec MUST use the server function and define the per-type authorization matrix (which `type` may be created by which permission/role).
- **Derived-trigger transition detection + dedup:** for at-risk and farm-alert triggers (both derived/in-memory), the spec MUST specify how NEWLY-detected items are identified (diff against last-notified set) and how duplicates are prevented across the 60s recompute cycle. Recommended: before creating a notification, check `notifications` for an existing row with the same `type` + `related_entity_type` + `related_entity_id` (and optionally within a time window); only create if absent. Specify where the "last notified" snapshot lives (in-memory in the store, or derived from the `notifications` table itself — the latter is crash-safe across reloads; recommend that).
- **Realtime channel + lifecycle:** the spec MUST specify the exact Appwrite realtime channel string (verify against the installed SDK version in `package.json`), the subscribe/unsubscribe lifecycle (subscribe in `onMounted` after `isClient`, unsubscribe in `onBeforeUnmount`), and the fallback if the subscription errors (fall back to polled fetch — do NOT crash).
- **Panel UI:** `q-menu` anchored to the bell (recommended for desktop) vs. `q-dialog` (mobile) vs. a dedicated `/notifications` route. The spec MUST pick and specify responsive behavior. Filter-by-type control type. Mark-as-read interaction (row button + "mark all read"). Empty/loading/error states.
- **Header layout:** the spec MUST specify the bell's position in the header relative to the 5.10b quick-search box and user menu, and verify no overflow on xs (the quick-search is `gt-xs`; the bell should stay visible on xs — possibly move the bell before/after the search and confirm with `$q.screen`).
- **SSR safety:** all `notifications`/`notification_reads` reads + the realtime subscription run client-side only (`isClient` guard); the bell renders during SSR with a placeholder count (0) until hydration. The `createNotification` function is server-side only.
- **Error handling:** a failed `fetchMyNotifications`/`markRead` must not crash the bell (try/catch + `useErrorHandler`); a failed realtime subscription falls back to polling; a failed trigger-side `createNotification` call must not crash the host module (e.g., at-risk computation must still complete if notification creation fails — log and continue).
- **Performance:** `fetchMyNotifications` capped (`Query.limit(N)` — e.g., 50 most recent + `Query.orderDesc('$createdAt')`); unread count via a count query, not full fetch. Realtime avoids polling overhead. Triggers dedup-then-create (no notification storms).
- **i18n / emojis:** none (hardcoded English, no emojis) — consistent with project convention.

## Planning Artifacts to Load

Authoritative sources (load via compile-epic-context subagent for epic-5-context.md if not already compiled, plus selectively for story-specific constraints):

- docs/epics.md — Story 5.10 ACs (AC3 is the focus for 5.10c; AC8 deferred to post-MVP) and Epic 5 story list
- docs/PRD.md — notifications requirements (line ~668: alert delivery methods — in-app for MVP, email optional/deferred), role-based visibility, NFR-3 (3G load <3s), NFR-5 (mobile 320px+)
- docs/architecture.md — RBAC permissions model, table schema conventions, server-function conventions, Appwrite realtime capabilities
- docs/ux-specification.md — notification bell/panel patterns (search for "notification" / "bell" / "alert"), §"Header" / §"Global Elements" if present, §8 "Animation & Motion" for loading state patterns.
- docs/implementation-artifacts/spec-5-10a-dashboard-completion-real-data-wiring.md — 5.10a spec (DONE); 5.10a did NOT touch MainLayout/routes.
- docs/implementation-artifacts/spec-5-10b-navigation-polish-breadcrumbs-and-quick-search.md — 5.10b spec (DONE); read to confirm 5.10b's header changes (quick-search box, `expandedSections` watcher) so 5.10c's bell placement doesn't collide. NOTE the post-finalization patch `3152db1` (learner search rework, finance field fix, `no-focus` menu) — the spec's Review Triage Log §2026-08-05 is authoritative for the current 5.10b code state.
- docs/implementation-artifacts/epic-5-context.md — compiled epic context (reuse if valid; see step-01 rules)
- docs/implementation-artifacts/deferred-work.md — carry-forward items; 5.10 AC8 deferral already documented during 5.10a (no new deferral expected from 5.10c unless the accessibility audit surfaces items)
- docs/planning-artifacts/sprint-change-proposal-2026-07-28.md — confirms 5.10's dependency on all prior MVP stories

Do NOT load POST-MVP.md as a primary source — it lists deferred modules only. Use it only to confirm a feature is deferred when in doubt.

## Project Conventions (non-negotiable)

- Frontend: Quasar v2.18.5 (Vue 3 + Vite + SSR), `<script setup>` syntax mandatory.
- Backend: Appwrite v21.2.1 (Database, Auth, Storage, Functions).
- State: Pinia. Date/Time: date-fns + date-fns-tz (village timezone from `settingsStore.timezone`, default `Africa/Lusaka`). Charts: Chart.js v4.5.1. Calendar: vue-cal v5 (`^5.0.1-rc.33`).
- Normalized ID-based relationships; composable error handling (useErrorHandler); custom form validation integrated with error handler.
- RBAC: `src/utils/permissions.js`, `src/composables/usePermissions.js` (`hasPermission('<module>:read')`, `hasPermission('<module>:write')`), route guards, PermissionGuard — reuse, do not reinvent. 5.10c ADDS new permission keys `notifications:read` / `notifications:write` (the only 5.10 sub-story that adds permissions); all other RBAC reuse existing `hasPermission` checks.
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
- The intent resolves to multiple independently shippable goals that cannot be scoped into one spec — set `warnings: [multiple-goals]` in frontmatter and proceed only if they're genuinely inseparable; otherwise HALT. (5.10c is AC3 — notifications infrastructure + bell/panel + realtime + a bounded set of role-targeted triggers. User decision 2026-08-05: keep 5.10c as ONE iteration covering AC3 with in-app only, Appwrite realtime, and a CAP of 3 triggers (at-risk learner, farm alert, + one create-event). If the spec derivation finds the trigger-wiring scope still exceeds one iteration, HALT with a proposal to split 5.10c into 5.10c1 (infrastructure + bell + panel + realtime + seeded demo notifications) and 5.10c2 (real trigger wiring) — do NOT silently expand scope. The broader 5.10 was split into 5.10a–5.10e per user decision 2026-08-04.)

Do NOT invent requirements. Do NOT pull scope from other stories into this iteration. Do NOT implement features that belong to a later story in the dependency order.

## Implementation Discipline (step-03)

- Follow the spec's task list in order. Do not reorder.
- Reuse existing composables, stores, services, and RBAC utilities. Do not duplicate.
- Vue 3 `<script setup>` only. No Options API. No `this`.
- SSR-safe: any Appwrite TablesDB/Functions access must be guarded for SSR; follow the `isClient` pattern used in existing pages (e.g. FarmDashboardPage.vue, LearnersListPage.vue, DashboardPage.vue). Client-only `tables.listRows` calls in the notifications store + the Appwrite realtime subscription must be `isClient`-guarded and subscribed in `onMounted` after hydration (the bell renders during SSR with a placeholder count but fires no queries/subscriptions).
- Quasar components for all UI primitives. No raw HTML controls. (5.10c adds UI: bell `q-btn` + `q-badge` + notification panel — all must use Quasar components: `QBtn`, `QBadge`, `QMenu`/`QDialog`, `QList`, `QItem`, `QItemLabel`, `QBtnToggle`/`QSelect` for type filter.)
- 5.10c is the EXCEPTION to the reuse-only rule: it ADDS new Appwrite infrastructure (new `notifications` + `notification_reads` tables, a new `createNotification` server function, new `notifications:read`/`notifications:write` permissions, new `.env` table-ID vars, and OPTIONALLY a new `/notifications` route). The frontend artifacts modified/added are: `MainLayout.vue` (bell + badge + panel + realtime subscription), a new `src/stores/notifications-store.js`, new permission keys in `src/utils/permissions.js`, `server/scripts/setup-appwrite.js` (new tables + permissions), `server/scripts/seed-roles.js` (upsert-capable), a new `server/functions/createNotification/` function, trigger wiring in `src/modules/school/stores/at-risk-store.js` + `src/modules/farm/stores/farm-store.js` + one create-event store, and a seedAllData addition. The spec MUST include tasks for all modifications.
- Pinia stores follow the existing options-store pattern. 5.10c CREATES one new store (`src/stores/notifications-store.js`) and REUSES `settingsStore`, `authStore`, and the trigger-host module stores (`at-risk-store`, `farm-store`, + one create-event store).
- Date handling: all dates stored as ISO 8601 in Appwrite. Display via `src/utils/dateUtils.js` / `date-fns formatDistanceToNow` with `settingsStore.timezone`.
- Permission checks: 5.10c ADDS new permission keys `notifications:read` (all roles) / `notifications:write` (limited). The `createNotification` server function enforces the per-type authorization matrix server-side; client-side `hasPermission` gates the bell/panel visibility. Do NOT add new `requiresPermission` route meta unless a `/notifications` route is created (spec decides).
- No emojis in code or UI unless an existing module already uses them (do not remove existing ones).

## Review (step-04) — Full Adversarial

Run the full adversarial review pass per the skill's step-04:

- Blind Hunter: does the implementation actually satisfy each AC as written, with no hidden gaps?
- Edge Case Hunter: walk every branching path and boundary.
- Acceptance Auditor: map each AC to concrete code/test evidence; flag any AC with no evidence.

### Review invariants for Story 5.10c <<< CHANGE PER ITERATION >>>

Specific invariants the review MUST verify for 5.10c:

- **Notifications table + reads table** exist in `setup-appwrite.js` with the specified schemas; env vars `VITE_APPWRITE_TABLE_NOTIFICATIONS`/`VITE_APPWRITE_TABLE_NOTIFICATION_READS` added to `.env.example` (NOT to `.env`); new permission keys `notifications:read`/`notifications:write` added to `permissions.js` + `seed-roles.js` (upsert-capable; `notifications:read` granted to all roles).
- **`createNotification` server function** exists, follows the existing function pattern, validates caller authority per `type` (per-type authorization matrix), and creates ONE `notifications` row with `target_roles`/`target_permissions` (NOT per-user rows). It does NOT trust client-supplied targeting blindly.
- **Bell + count badge** render in `MainLayout.vue` header; badge shows unread count and is hidden when 0; bell remains visible on xs (no header overflow introduced; 5.10b quick-search box still renders correctly on gt-xs).
- **Notification panel** lists notifications filtered by type, with mark-as-read (single + all), click-to-navigate-to-`link`, empty/loading/error states, and relative-time display using `settingsStore.timezone`.
- **"My notifications" query** correctly intersects `target_roles` with the current user's roles (and/or `target_permissions` with the user's permissions) and joins `notification_reads` to compute `is_read`. A user WITHOUT a school-relevant role sees NO `at_risk_learner` notifications; a user WITHOUT `farm:read` sees NO `farm_alert` notifications (role-targeting verified end-to-end).
- **Realtime** subscription is client-only, subscribed in `onMounted` after `isClient`, unsubscribed in `onBeforeUnmount`, and falls back to polled fetch on subscription error (bell never crashes).
- **Triggers** (bounded to 3): at-risk learner newly flagged (school, target = school-relevant roles), farm alert newly raised (farm, target = `farm:read`), + one create-event trigger. Derived triggers (at-risk, farm-alert) implement transition detection + dedup (no duplicate notifications across the 60s recompute; no notification storm). A failed `createNotification` call does NOT crash the host module (at-risk computation / farm alert generation still complete).
- **SSR-safe:** no `notifications`/`notification_reads` reads or realtime subscription execute during SSR; the bell renders with a placeholder count until hydration. The `createNotification` function is server-side only.
- **No email** is sent (in-app only; email deferred to post-MVP — user decision 2026-08-05).
- The 5.10b quick-search box (incl. the post-finalization learner-join + finance-field + `no-focus` fixes from `3152db1`), the `expandedSections` auto-expand watcher, breadcrumbs, the 5.10a dashboard real-data wiring, the 5.11 empty-state banners, the 5.9 module management, the 5.12/5.13 user/role management, the 5.14 password flows, and all prior module dashboards/pages are NOT broken.
- NO Guests/Equipment/Energy notification types or triggers appear (deferred modules).
- If the spec set `warnings: [multiple-goals]` and HALTed to propose splitting 5.10c into 5.10c1/5.10c2, the review verifies the HALT was clean and no partial implementation was left.

**5.10 sub-story roadmap (for context — do NOT implement future sub-stories in this iteration):**

- **5.10a (DONE 2026-08-04):** Dashboard Completion — Real Data Wiring (AC1). Replaced placeholder data, verified widgets functional, <2s load.
- **5.10b (DONE 2026-08-05):** Navigation Polish — Breadcrumbs and Quick Search (AC2). Added breadcrumbs to detail/form/create/edit pages (Module → List → Detail, responsive), global header quick search with grouped results dropdown, fixed active highlighting (auto-expand nav section for active child route), clean-menu audit (removed dead `/communications` link). Post-finalization patch `3152db1` corrected a defective learner search (learners table has no name columns — reworked to search residents then resolve learner rows), the finance result field, and a header-search focus issue.
- **5.10c (THIS ITERATION):** Notifications System (AC3). New Appwrite `notifications` + `notification_reads` tables, `createNotification` server function (role-targeted delivery), notifications store, bell icon + count badge in MainLayout header, notification panel with filter by type and mark-as-read, Appwrite realtime live updates, and a bounded set of REAL role-targeted triggers (at-risk learner newly flagged → school roles; farm alert newly raised → `farm:read`; + one create-event trigger). In-app only (email deferred). This is the only 5.10 sub-story that adds new Appwrite infrastructure.
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

**5.10b (Navigation Polish — Breadcrumbs and Quick Search):** Added reusable `src/components/layout/Breadcrumbs.vue` (responsive Module → List → Detail, mobile back-button-only) replacing ad-hoc Back buttons on 22 detail/form/create/edit pages; added `meta.breadcrumb` to existing routes; added `src/composables/useGlobalSearch.js` (permission-gated, SSR-safe quick search across households/residents/finance/plots/learners/vendors/inventory/calendar + nav items, grouped dropdown); added a route watcher in `MainLayout.vue` to auto-expand the active `expandedSections` key; removed the dead `/communications` nav link. Post-finalization patch `3152db1` (2026-08-05) corrected a defective learner search (the `learners` table has NO `first_name`/`last_name` columns — it joins `residents` via `resident_id`; reworked to search residents first then resolve learner rows), the finance result secondary field (`amount_funded ?? amount` + ZMW currency + date), and a header-search focus issue (`no-focus no-refocus` on the results `q-menu`). The 5.10b spec's `final_revision` is `3152db1`; its Review Triage Log §2026-08-05 is authoritative for the current code state. Dep: 5.10a. DONE 2026-08-05.
