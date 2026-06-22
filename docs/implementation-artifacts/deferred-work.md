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
