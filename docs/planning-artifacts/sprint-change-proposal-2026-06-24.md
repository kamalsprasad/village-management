# Sprint Change Proposal: Defer Epic 4 Stories 4.9–4.11 to Post-MVP

**Project:** Sustainable Model Village Management System (village-app)  
**Date:** 2026-06-24  
**Proposed by:** Kamal (via Correct Course workflow)  
**Scope:** Epic 4 — School Management and Educational Accountability  
**Affected stories:** 4.9, 4.10, 4.11

---

## 1. Issue Summary

The user wants to defer the following three Epic 4 stories to post-MVP:

- **Story 4.9:** Peer Review with Enhanced Categories and Checked Status
- **Story 4.10:** Self-Evaluation and Head Teacher Evaluation
- **Story 4.11:** Collaborative Teaching Practices Documentation

These stories introduce teacher-performance feedback loops and a shared teaching-practice library. They are valuable for long-term teacher accountability, but they are not required for the core school MVP (learners, scores, attendance, calendar, at-risk identification, interventions, and progress reports). The `docs/sprint-status.yaml` already lists them as `deferred`, but the canonical epic document (`docs/epics.md`) and the PRD still describe them as in-scope for Epic 4. This proposal aligns those artifacts with the deferral decision.

---

## 2. Impact Analysis

### 2.1 Epic Impact

- **Epic 4 can still be completed.** The remaining stories provide end-to-end school value without 4.9–4.11.
- Epic 4 summary and key capabilities should be updated to remove "teacher evaluations" and "collaborative teaching practices" from the MVP deliverables and move them to a post-MVP note.
- Epic 4 estimated story count drops from 13 to 10 active stories for the MVP.

### 2.2 Story Impact

| Story | Status | Impact of deferring 4.9–4.11 |
|-------|--------|------------------------------|
| 4.1–4.5 | Done | No impact. |
| 4.6 Attendance | Done | No impact. |
| 4.7 At-Risk | Done | No impact. |
| 4.8 Interventions | Backlog | No impact. 4.8 depends on 4.7 only. |
| 4.9 Peer Review | **Deferred** | 4.10 and 4.11 depend on 4.9, so they are naturally deferred as well. |
| 4.10 Self/HT Evaluation | **Deferred** | Cannot ship without 4.9. |
| 4.11 Teaching Practices | **Deferred** | Cannot ship without 4.9. |
| 4.12 Progress to Goal | Backlog | No prerequisite impact. 4.12 depends on 4.2 only. |
| 4.13 Progress Reports & Dashboard Completion | Backlog | **Minor impact:** The acceptance criterion "School dashboard completion: all widgets functional" must be redefined to exclude any teacher-evaluation or teaching-practice widgets that were deferred. No other dependency is affected. |

### 2.3 Artifact Conflicts

| Artifact | Conflict | Proposed Action |
|----------|----------|-----------------|
| `docs/epics.md` | Stories 4.9–4.11 still listed as active MVP stories. | Add `Status: Deferred (post-MVP)` and update Epic 4 summary. |
| `docs/PRD.md` | FR-11 lists teacher evaluations and collaborative teaching practices as MVP features. | Move those bullets to a post-MVP annotation; update Epic 4 key capabilities and success criteria. |
| `docs/ux-specification.md` | School module nav tree and Head Teacher dashboard include "Teacher Evaluations" and peer-review flows. | Annotate those items as post-MVP so the design does not imply they are MVP. |
| `src/modules/school/pages/SchoolDashboardPage.vue` | Header comment references outdated/old-numbered future widgets (teacher performance, progress to goal). | Update the comment to use current story numbers and remove deferred teacher-performance widget references. |
| `docs/POST-MVP.md` | Already contains the deferred features. | No change needed. |
| `docs/sprint-status.yaml` | Already marks 4.9–4.11 as `deferred`. | No change needed. |
| Architecture / GraphQL schema | No `teacherEvaluation` or `teachingPractice` types exist yet. | No change needed. |

### 2.4 Technical / Code Impact

- **No source code currently implements 4.9–4.11.** A project-wide search for `peer review`, `self-evaluation`, `teacher evaluation`, `teaching practice`, and `Teacher Evaluations` returned **no matches in `src/`** except for an outdated comment in `SchoolDashboardPage.vue`.
- **No prerequisite files can be safely removed or commented out.** The teacher-related code that exists (`teacher-store.js`, `TeachersListPage.vue`, `TeacherScheduleGrid.vue`, timetable editor, `/school/teachers` route, and the dashboard quick link) is required by completed Story 4.5 (Class Timetable) and by ongoing attendance/at-risk work. Removing or commenting out any of it would break the timetable and teacher-schedule features.
- **Build and lint verification:**
  - `npm run lint` — passes (exit 0).
  - `npm run build` — SPA build compiles successfully (exit 0).

Therefore, documenting the deferral is a pure planning-artifact change; it will not break existing code.

---

## 3. Recommended Approach

**Selected path:** Option 1 — Direct Adjustment (document-only update).

Rationale:
- The code already matches the desired state (no deferred-feature code exists), so no rollback or code change is required.
- The only work is to align `docs/epics.md`, `docs/PRD.md`, `docs/ux-specification.md`, and the `SchoolDashboardPage.vue` comment with the deferral.
- This is a low-risk, low-effort change that keeps the MVP scope focused on learner outcomes and school operations.

Effort: **Low** (documentation edits only).  
Risk: **Low** (no code removal, no dependency changes).

---

## 4. Detailed Change Proposals

### 4.1 `docs/epics.md`

Add a status line and a post-MVP note to each affected story.

**Story 4.9 — Peer Review**

```markdown
**Status:** Deferred to post-MVP

**Post-MVP note:** Teacher peer-review forms with 10 rating categories and Head Teacher "checked" status will be built after the core school module is stable.
```

**Story 4.10 — Self/HT Evaluation**

```markdown
**Status:** Deferred to post-MVP

**Post-MVP note:** Multi-angle evaluation (self + head teacher) and the combined teacher-performance summary will be implemented after peer review (4.9) is available.
```

**Story 4.11 — Teaching Practices**

```markdown
**Status:** Deferred to post-MVP

**Post-MVP note:** Collaborative teaching practice library, comments, and "I've tried this" adoption tracking will be implemented after peer review (4.9) is available.
```

Also update the Epic 4 summary line at the end of the epic to:

```markdown
**Epic 4 Summary:** 13 stories, **10 MVP stories**. Deliverables: School management (learners from residents, bulk test scores/attendance), configurable school calendar (academic terms, grade bell schedules, class timetable), at-risk identification (90% attendance, calendar-aware 5-day delay), interventions, progress tracking, learner reports. Teacher evaluations and collaborative teaching practices are deferred to post-MVP.
```

### 4.2 `docs/PRD.md`

In **FR-11: School Management**, change:

```markdown
- Implement teacher evaluations with three types: peer review, self-evaluation, head teacher evaluation
- Support collaborative teaching practices documentation
- Track teacher performance over time with evaluation history
```

to:

```markdown
- *(Post-MVP)* Implement teacher evaluations with three types: peer review, self-evaluation, head teacher evaluation
- *(Post-MVP)* Support collaborative teaching practices documentation
- *(Post-MVP)* Track teacher performance over time with evaluation history
```

In the **Epic 4** section, remove or annotate the following bullets under Key Capabilities:
- `Teacher evaluations: peer review, self-evaluation, head teacher evaluation` → `(Post-MVP)`
- `Collaborative teaching practices documentation` → `(Post-MVP)`

Under Success Criteria, change:
- `Teacher evaluations completed systematically each term (not checkbox exercise)` → `Teacher evaluations to be completed systematically each term after the post-MVP teacher-accountability phase is implemented.`

In the user journey (Step 7: Peer Review and Reflection), add a leading note: `*(Post-MVP step — peer/self/head teacher evaluations are out of MVP scope.)*`

### 4.3 `docs/ux-specification.md`

In the School module navigation tree, annotate:

```markdown
- Teacher Evaluations *(post-MVP)*
```

In the Head Teacher Dashboard widget list, annotate:

```markdown
- Teacher Evaluations: Pending reviews count *(post-MVP)*
```

In the user-flow diagram, label the peer-review step as post-MVP or leave it visually but document that it is out of MVP scope.

### 4.4 `src/modules/school/pages/SchoolDashboardPage.vue`

Update the top comment from:

```html
<!--
  SchoolDashboardPage.vue (Story 4.1)
  School module dashboard: learner overview stats and navigation cards.
  Future stories add: at-risk learners (4.4), teacher performance (4.7),
  progress to goal (4.9) widgets.
-->
```

to:

```html
<!--
  SchoolDashboardPage.vue (Story 4.1)
  School module dashboard: learner overview stats and navigation cards.
  Future MVP stories add: at-risk learners (4.7), progress to goal (4.12) widgets.
  Teacher performance widgets (peer/self/HT evaluations) are deferred to post-MVP.
-->
```

This removes the confusing old-numbered references and makes the deferral explicit in the code.

---

## 5. Files That Could Be Commented Out

**None.**

No source file exists today that is a prerequisite *only* for Stories 4.9–4.11. The existing teacher-related code is shared with completed Story 4.5 (Class Timetable) and is also used by the current teacher schedule/faculty view. Commenting out any of the following files would break working MVP functionality:

- `src/modules/school/stores/teacher-store.js`
- `src/modules/school/pages/TeachersListPage.vue`
- `src/modules/school/components/TeacherScheduleGrid.vue`
- `src/modules/school/components/TimetableCellEditor.vue`
- `src/modules/school/components/TimetableGrid.vue`
- `src/modules/school/pages/ClassDetailPage.vue` (teacher timetable panel)
- `src/modules/school/router.js` (`/school/teachers` route)
- `src/modules/school/pages/SchoolDashboardPage.vue` (quick link to Teachers & Faculty)

If future pull requests introduce peer-review/evaluation-specific code, those new files should be guarded by a feature flag or left on a separate branch until the post-MVP cycle begins.

---

## 6. Implementation Handoff

| Scope | Classification | Recipient | Deliverables / Next Steps |
|-------|----------------|-----------|---------------------------|
| Documentation update | Minor | Developer agent | Apply the edits in Section 4. Re-run `npm run lint` and `npm run build` to confirm no code impact. Update `docs/sprint-status.yaml` if needed (it is already current). |

Success criteria:
- `docs/epics.md`, `docs/PRD.md`, and `docs/ux-specification.md` consistently describe 4.9–4.11 as deferred/post-MVP.
- `SchoolDashboardPage.vue` comment no longer references deferred teacher-performance widgets.
- `npm run lint` and `npm run build` still pass.
- No source code is commented out or removed.

---

## 7. Checklist Summary

- [x] Trigger and context understood: defer 4.9–4.11 to focus MVP.
- [x] Epic impact assessed: Epic 4 can complete with 10 MVP stories; only 4.13 dashboard-completion wording needs adjustment.
- [x] PRD/UX/Architecture conflicts identified and documented.
- [x] Code impact verified: no code implements 4.9–4.11; lint and build pass.
- [x] Path selected: Direct Adjustment (document-only update).
- [x] No prerequisite files can be safely commented out.
- [ ] User approval to apply documentation edits.
