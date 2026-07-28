---
status: blocked
---

# BMad Dev Auto Result

Status: blocked
Blocking condition: new dependency required: vue-i18n@9 — user approval needed

## Iteration

- Epic: 5 — Village Calendar, Storage, Optional Modules, and User Management
- Story: 5.1 — Village Calendar - Global Calendar with Category Filtering
- Spec file: `docs/implementation-artifacts/spec-5-1-village-calendar-global-calendar.md` (not created — planning halted before spec write)

## What was verified before the halt

- Working tree clean; branch `epic-5` matches Epic 5 work.
- Prerequisites confirmed `done` in `docs/sprint-status.yaml`: Epic 1 stories 1.1–1.11 all `done`; Story 5.1 is `backlog`.
- No existing spec file for 5.1 (no resume/overwrite conflict).
- Epic context compiled and verified: `docs/implementation-artifacts/epic-5-context.md` (fresh, valid — reusable by the next iteration; no recompile needed unless planning docs change).
- Codebase investigation completed: vue-cal v5 (`^5.0.1-rc.33`) already in package.json and used by School calendar; no global events collection exists yet; dashboard uses direct widget imports with an existing placeholder `UpcomingEventsWidget.vue`; RBAC has `calendar:read`/`calendar:write` already seeded for some roles; date-fns + `src/utils/dateUtils.js` timezone helpers in place. None of these block 5.1.

## Blocking detail

The invocation's non-negotiable conventions require: "all user-facing strings via the existing i18n setup (Quasar $t / vue-i18n). No hardcoded English in templates," and the step-04 review must verify "i18n keys exist for every user-facing string."

No i18n setup exists in this project:

- `vue-i18n` is not in `package.json` (verified by grep).
- No `src/boot/i18n.js`, no `src/i18n/` locale directory, zero `$t()`/`useI18n()` usage anywhere in `src/`.
- Every shipped module (Epics 1–4) is hardcoded English, including nav labels in `src/layouts/MainLayout.vue`.

Planning docs (PRD NFR-4, architecture.md §12) require externalized strings and prescribe `yarn add vue-i18n@9`, but that setup was never executed (it was flagged "Low Priority" in the Epic 1 readiness report and skipped). Satisfying the 5.1 conventions therefore requires a new third-party dependency, which the invocation says must HALT for user approval. Proceeding with hardcoded English would violate the stated conventions and guarantee a failed step-04 review; silently adding vue-i18n unattended is explicitly forbidden.

## Decision required from user

1. **Approve vue-i18n**: allow adding `vue-i18n@9` per architecture.md §12 and include a minimal i18n bootstrap (boot file + `src/i18n/en-US/`) in the 5.1 spec — new strings only; existing modules remain as-is. OR
2. **Amend the conventions**: follow the existing hardcoded-English codebase style for 5.1 and record project-wide i18n as deferred work (a dedicated setup story), then re-run this iteration.

Re-invoke `/bmad-dev-auto` with the same prompt after deciding; it will reuse the compiled `epic-5-context.md` and produce the 5.1 spec.
