# Deferred Work

Items deferred during code reviews. Revisit before closing their parent story or as prep for the next sprint.

---

## Deferred from: code review of story-4.4 (2026-06-20)

- `useErrorHandler()` called at module scope in Pinia stores — anti-pattern, but pre-existing across all stores; only becomes a problem if the composable is refactored to use Vue component context. [`period-slots-store.js:28`]
- Concurrent `slot_number` assignment race condition — two simultaneous admins saving a slot at the same time can create duplicate slot_number values. Only relevant if multi-user concurrent editing is introduced. [`BellSchedulesSettingsPage.vue:664-666`]
- `reorderSlots` and `copySchedule` use `Promise.all` with no rollback — a partial Appwrite failure leaves DB in an inconsistent state. Deferred because Appwrite has no transaction API; a retry + refetch pattern would mitigate. [`period-slots-store.js:307`, `period-slots-store.js:380`]
- Overlap detection warns only on same start-time, not on overlapping time ranges — full overlap check would improve schedule validity but the spec explicitly allows unusual schedules. Consider for Story 4.5 timetable validation. [`BellSchedulesSettingsPage.vue:650-661`]
- Timeline legend colour swatches have no `aria-label` — accessibility polish item. [`DailyScheduleTimeline.vue:101-113`]
- "All Days" chip label is hardcoded — no functional impact, cosmetic. [`DailyScheduleTimeline.vue:165`]
- Delete confirmation dialog does not check for timetable references (Story 4.5 concern) — intentional, documented in code comment. [`BellSchedulesSettingsPage.vue:14`]

## Deferred from: code review of story-4.7 (2026-06-25)

- `computeScorePercent` divides by zero if `max_score` is 0 or null — pre-existing issue in `school-utils.js` used by this story, not introduced here. [`at-risk-utils.js:100` via `school-utils.js`]
- `countSchoolDaysBetween` could infinite-loop if `addDaysToDateStr` returns an empty string — pre-existing in `calendar-events-store.js` and outside this story's scope. [`calendar-events-store.js:132-144`]
- `toDateStrInTimezone` returns `isoString.slice(0, 10)` on parse failure, which may return garbage — pre-existing utility behavior. [`dateUtils.js:115-124`]
- `eventsBetween` was specified for finding the covering closed event in `ClassDetailPage.vue`, but the manual `find()` achieves the same result. Consider switching to `eventsBetween` for consistency. [`ClassDetailPage.vue:768-774`]
- No term name/start date in the grace period banner on `ClassDetailPage.vue` — fix together with the corresponding patch finding if desired. [`ClassDetailPage.vue:582-589`]
