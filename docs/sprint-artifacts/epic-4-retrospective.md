# Epic 4 Retrospective: School Management and Educational Accountability (STUB)

**Date**: 2026-08-12 (backfilled)
**Epic**: 4 - School Management and Educational Accountability
**Status**: ⚠️ RETROSPECTIVE SKIPPED — backfilled stub
**Stories**: 13 planned (10 MVP, 3 deferred to post-MVP: 4.9–4.11)

---

## Why this stub exists

Epic 4's retrospective was never created. The retrospective continuity chain
runs Epic 1 → Epic 2 → Epic 3 → **(Epic 4 missing)** → Epic 5. This stub was
created during the Epic 5 retrospective (2026-08-12) to restore continuity and
make the gap explicit rather than implicit.

Epic 4 was marked `done` in `docs/sprint-status.yaml` (all 10 MVP stories done;
4.9, 4.10, 4.11 deferred). The `epic-4-retrospective` status remains `optional`.

## What is known about Epic 4 (from artifacts)

Epic 4 delivered the School module: learner enrollment from residents, test
score recording, school calendar (academic terms, bell schedules, class
timetable builder), attendance tracking, at-risk learner identification,
intervention planning, learner progress reports, and the school dashboard.

Findings from Epic 4 that surfaced in other artifacts (code reviews, deferred
items) and were carried forward:

- `useErrorHandler()` called at module scope in Pinia stores — anti-pattern
  shared across all stores (deferred from 4.4 review).
- Concurrent `slot_number` race condition in bell schedules (deferred from 4.4).
- `Promise.all` with no rollback in `reorderSlots`/`copySchedule` (deferred from 4.4).
- `computeScorePercent` divide-by-zero when `max_score` is 0/null — pre-existing
  in `school-utils.js` (deferred from 4.7 review).
- `countSchoolDaysBetween` potential infinite loop (deferred from 4.7).
- `toDateStrInTimezone` parse-failure behavior (deferred from 4.7).
- Server-side validation gaps for school goals (deferred from 4.12 review).
- Ephemeral teacher comments intentionally not persisted (4.13 design decision).
- JSZip dynamic import fallback (4.13).

## Action items NOT carried forward (gap)

Because no retro was held, no Epic 4 action items were tracked into Epic 5.
Several Epic 4 code-review findings were folded into `deferred-work.md` under
their owning stories, but there was no consolidated action-item list with
owners and deadlines. This is the gap that the Epic 5 retrospective's
"previous retro follow-through" analysis could not evaluate for Epic 4.

## Recommendation

If a fuller Epic 4 retro is desired, it should be reconstructed from the
Story 4.x spec files, the `deferred-work.md` entries tagged `story-4.*`, and
the git history on the `epic-4`/`epic-5` branches. For now, this stub
documents that the retro was skipped and points future readers to the
artifacts that capture Epic 4's lessons piecemeal.

---

**Backfilled by**: Epic 5 retrospective session, 2026-08-12.
**Next retrospective**: Epic 5 (see `epic-5-retro-2026-08-12.md`).
