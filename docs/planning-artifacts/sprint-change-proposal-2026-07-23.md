# Sprint Change Proposal: Defer Epic 5 Stories 5.5, 5.6, 5.8 to Post-MVP

**Project:** Sustainable Model Village Management System (village-app)
**Date:** 2026-07-23
**Proposed by:** Kamal (via Correct Course workflow)
**Scope:** Epic 5 — Village Calendar, Storage, and Optional Modules
**Affected stories:** 5.5 (Guests Management), 5.6 (Equipment Management), 5.8 (Energy Management)
**Execution mode:** Incremental
**Change scope classification:** Minor

---

## 1. Issue Summary

The user wants to defer three Epic 5 optional-module stories to post-MVP before starting the next epic:

- **Story 5.5:** Guests Management Module (Optional - No 90-Day Alert/Conversion)
- **Story 5.6:** Equipment Management Module (Optional)
- **Story 5.8:** Energy Management Module (Optional) - Solar Microgrid Monitoring

These stories introduce three optional village-management modules. They are valuable for long-term operational visibility, but they are not required for the core MVP (calendar, storage, vendor management, module configuration, and final system completion). This proposal aligns the project artifacts with the deferral decision and is the second such deferral, following the 2026-06-24 deferral of Epic 4 stories 4.9–4.11 (teacher evaluations and collaborative teaching practices).

The deferral was triggered by a scope-management decision ahead of starting the next epic, not by any technical limitation or failed implementation.

---

## 2. Impact Analysis

### 2.1 Epic Impact

- **Epic 5 can still be completed.** The remaining MVP stories (5.1, 5.2, 5.3, 5.4, 5.7, 5.9, 5.10) deliver the core MVP value: shared village calendar, cloud storage with shared folders, vendor/supplier management, module configuration, and final production-ready system integration.
- Epic 5 summary and key capabilities should be updated to remove Guests, Equipment, and Energy from MVP deliverables and move them to a post-MVP note.
- Epic 5 active story count for MVP drops from 10 to 7 (3 deferred).

### 2.2 Story Impact

| Story                                   | Status       | Impact of deferring 5.5/5.6/5.8                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5.1 Village Calendar (Global)           | Backlog      | **Minor impact:** AC5 "Automatic event creation: Farm (expected harvests), Equipment (maintenance reminders)" must drop the Equipment maintenance-reminder auto-event source. The Guests/Equipment/Energy calendar color-coding categories can remain as labels (no events generated until the modules are built). |
| 5.2 Calendar Role-Based Event Creation  | Backlog      | No impact. Depends on 5.1 only.                                                                                                                                                                                                                                                                                    |
| 5.3 Cloud Storage (Personal Folders)    | Backlog      | No impact. Depends on Epic 1 Story 1.10 only.                                                                                                                                                                                                                                                                      |
| 5.4 Cloud Storage (Shared Folders)      | Backlog      | No impact. Depends on 5.3 only.                                                                                                                                                                                                                                                                                    |
| 5.5 Guests Management Module            | **Deferred** | Optional module. Prerequisites (1.6, 2.1) are already done. No downstream MVP story depends on it.                                                                                                                                                                                                                 |
| 5.6 Equipment Management Module         | **Deferred** | Optional module. Prerequisite (2.2) is already done. The only soft reference is 5.1's auto-event (handled above). No downstream MVP story depends on it.                                                                                                                                                           |
| 5.7 Vendors/Suppliers Management        | Backlog      | No impact. Stays in MVP. Prerequisites (2.2, 3.8) are independent of 5.5/5.6/5.8.                                                                                                                                                                                                                                  |
| 5.8 Energy Management Module            | **Deferred** | Optional module. Prerequisite (Epic 1) is already done. No downstream MVP story depends on it.                                                                                                                                                                                                                     |
| 5.9 Module Management and Configuration | Backlog      | **Minor impact:** The MVP optional-module toggle list must exclude Guests/Equipment/Energy. MVP optional modules are Farm, School, and Vendors. The module-dependency warning logic (AC6) is unaffected because no MVP module depends on the deferred ones.                                                        |
| 5.10 System Completion                  | Backlog      | **Minor impact:** Prerequisite "All previous stories in all epics" must be relaxed to "All MVP previous stories in all epics". Final dashboard, navigation, notifications, UX polish, performance, mobile responsiveness, help/docs, system health, and the production setup wizard are all unaffected.            |

### 2.3 Cross-Epic Dependency Check

A project-wide search across `docs/` for references to 5.5/5.6/5.8, Guests, Equipment, and Energy returned the following cross-epic references. **None are hard dependencies on the deferred modules:**

| Reference                                             | Location                                          | Type                                                                        | Action                                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Guest House" income source example                   | `docs/stories/story-2.1.md` AC3                   | Free-text example in Finance income source-module dropdown                  | No change. Free-text category string; works independently. Will integrate naturally when Guests module is built.                                       |
| "Equipment" inventory-eligible category               | `docs/stories/story-2.7.md` AC1                   | Finance expense → inventory auto-creation category name                     | No change. Category matches by name and creates inventory items of `item_type: 'equipment'`. Independent of the Equipment asset-tracking module (5.6). |
| "Equipment rental, transport, miscellaneous expenses" | `docs/stories/story-3.3.md` Other Costs help text | Help text for farm planting Other Costs field                               | No change. Refers to equipment rental as a cost type, not the Equipment module.                                                                        |
| Guests/Equipment/Energy nav labels                    | `docs/architecture.md` lines 2471–2474            | i18n navigation label dictionary                                            | No change. Labels for optional modules that Story 5.9 will toggle. Preserves long-term plan.                                                           |
| Guests/Equipment/Energy sections                      | `docs/PRD.md`                                     | Optional module requirements                                                | Mark as post-MVP (annotate, don't remove).                                                                                                             |
| Guests/Equipment/Energy page tree + nav               | `docs/ux-specification.md`                        | Optional module navigation/page tree                                        | Mark as post-MVP.                                                                                                                                      |
| Guests/Equipment/Energy epic stories                  | `docs/epics.md`                                   | Epic 5 story definitions                                                    | Mark as Deferred to post-MVP.                                                                                                                          |
| Stale Epic 5 entries                                  | `docs/sprint-status.yaml` lines 82–91             | Story IDs/titles match outdated `ROADMAP.md` numbering, not `docs/epics.md` | Fix to match `docs/epics.md` (canonical), then mark 5-5/5-6/5-8 as `deferred`.                                                                         |

**Conclusion: No hard blockers.** The deferred modules are optional, their prerequisites are already complete, and the only soft references inside Epic 5 are easily adjusted (5.1 auto-event, 5.9 module list, 5.10 prerequisite wording). No source code currently implements 5.5, 5.6, or 5.8, so there is nothing to roll back.

### 2.4 Artifact Conflicts

| Artifact                                                                                                                                                                                            | Conflict                                                                                                | Proposed Action                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/epics.md`                                                                                                                                                                                     | Stories 5.5, 5.6, 5.8 still listed as active MVP stories; 5.1/5.9/5.10 reference them.                  | Add `Status: Deferred (post-MVP)` + post-MVP note to 5.5/5.6/5.8; adjust 5.1 AC5, 5.9 AC, 5.10 prerequisites; update Epic 5 summary and the top-of-doc Complete Epic Summary.   |
| `docs/PRD.md`                                                                                                                                                                                       | Guests/Equipment/Energy described as in-scope optional modules.                                         | Annotate those sections as post-MVP. Update MVP scope and Epic 5 key capabilities/success criteria if they reference these modules.                                             |
| `docs/ux-specification.md`                                                                                                                                                                          | Page-tree and sidebar nav list Guests/Equipment/Energy as optional modules without post-MVP annotation. | Annotate Guests/Equipment/Energy nav items and page-tree sections as post-MVP.                                                                                                  |
| `docs/POST-MVP.md`                                                                                                                                                                                  | Does not yet contain Guests/Equipment/Energy module entries.                                            | Add 3 entries with notes about existing MVP plumbing that will integrate when built.                                                                                            |
| `docs/sprint-status.yaml`                                                                                                                                                                           | Epic 5 entries use stale titles from outdated `ROADMAP.md` numbering. 5-5/5-6/5-8 marked `backlog`.     | Rewrite Epic 5 story IDs/titles to match `docs/epics.md`; mark `5-5-guests-management-module`, `5-6-equipment-management-module`, `5-8-energy-management-module` as `deferred`. |
| `docs/architecture.md`                                                                                                                                                                              | i18n nav labels include Guests/Equipment/Energy.                                                        | **No change.** Labels are for optional modules that Story 5.9 will toggle; preserves the long-term plan.                                                                        |
| `ROADMAP.md`                                                                                                                                                                                        | Stale Epic 5 numbering (out of sync with `docs/epics.md`).                                              | **Out of scope for this change.** Flagged separately for cleanup.                                                                                                               |
| Historical artifacts (`implementation-readiness-report-2025-10-25.md`, `brainstorming-session-results-2025-10-13.md`, `product-brief-brain-2025-10-15.md`, `project-workflow-status-2025-10-13.md`) | Reference Guests/Equipment/Energy as part of the original plan.                                         | **No change.** Historical artifacts; preserved as-is.                                                                                                                           |
| Source code (`src/`, `server/`)                                                                                                                                                                     | No matches for Guests/Equipment/Energy module implementations.                                          | **No change.** Nothing to roll back.                                                                                                                                            |

### 2.5 Technical / Code Impact

- **No source code currently implements 5.5, 5.6, or 5.8.** The modules have not been started.
- **No prerequisite files need to be removed or commented out.** The "Guest House" income source example, the "Equipment" inventory category, and the "Equipment rental" help text in already-done stories are independent free-text/category strings that remain valid and will integrate naturally when the deferred modules are built post-MVP.
- **No database schema changes.** No `guests`, `equipment`, or `energy_*` tables have been created.
- **No deployment, infrastructure, or CI/CD impact.**

---

## 3. Recommended Approach

**Selected approach: Option 3 — PRD MVP Review (reduce MVP scope).**

### Rationale

Deferring 5.5, 5.6, and 5.8 reduces MVP scope by removing three optional modules that were never required for the core MVP value proposition. This mirrors the precedent set by the 2026-06-24 deferral of Epic 4 stories 4.9–4.11 (teacher evaluations and collaborative teaching practices).

- **Implementation effort:** Low (doc edits + sprint-status.yaml update only; no code, no rollback)
- **Technical risk:** Low (no code changes; optional modules not yet started)
- **Timeline impact:** Positive — removes 3 stories from the MVP critical path, freeing capacity for the 7 remaining MVP Epic 5 stories and the in-flight Epic 2/3/4 work
- **Stakeholder value:** Neutral to positive — the core MVP (residents, households, finance, inventory, farm, school, calendar, storage, vendors, module management, production setup) is unaffected
- **Long-term sustainability:** Preserved — all deferred work is captured in `docs/POST-MVP.md` and the modules remain documented in `docs/epics.md`, `docs/PRD.md`, and `docs/ux-specification.md` with post-MVP annotations

### Alternatives Considered

- **Option 1 (Direct Adjustment):** Not selected — there is no implementation issue to fix; this is a scope decision, not a correction.
- **Option 2 (Potential Rollback):** Not viable — nothing to roll back (modules not implemented).

---

## 4. Detailed Change Proposals

The following edit proposals will be presented one at a time in Incremental mode for user approval (Approve / Edit / Skip) before being applied. See the workflow execution log for the approved versions of each edit.

### 4.1 `docs/epics.md`

- Add `**Status:** Deferred to post-MVP` and a post-MVP note to stories 5.5, 5.6, 5.8 (mirroring the 4.9/4.10/4.11 pattern).
- Story 5.1 AC5: remove "Equipment (maintenance reminders)" from automatic event creation; add post-MVP note. Keep Guests/Energy as calendar color-coding categories (no events generated until modules are built).
- Story 5.9 AC: clarify MVP optional modules = Farm, School, Vendors (5.7); Guests/Equipment/Energy are post-MVP optional modules excluded from the MVP toggle list.
- Story 5.10 prerequisites: change "All previous stories in all epics" → "All MVP previous stories in all epics"; add note excluding deferred post-MVP modules.
- Update Epic 5 Summary: "10 stories, 7 MVP stories, 3 deferred to post-MVP. Deliverables: Village calendar, cloud storage with shared folders, Vendors Management, module management system, polished production-ready system, production setup wizard. Guests, Equipment, and Energy modules are deferred to post-MVP."
- Update top-of-doc "Complete Epic Summary" to reflect Epic 5: 7 MVP stories (3 deferred).

### 4.2 `docs/PRD.md`

- Mark the Guests Management, Equipment Management, and Energy Management module sections as post-MVP (annotate, don't remove — preserves the long-term vision).
- Update MVP scope summary and Epic 5 key capabilities/success criteria if they reference these modules.

### 4.3 `docs/ux-specification.md`

- Mark the Guests, Equipment, and Energy page-tree sections (lines ~193–196, 199–202, 210–211) as post-MVP.
- Mark the Guests, Equipment, and Energy sidebar nav items (lines 250, 251, 253) as post-MVP.

### 4.4 `docs/POST-MVP.md`

- Add 3 new top-level sections (Guests Module / Equipment Module / Energy Module) under a new "Optional Modules (Epic 5)" heading, with notes about existing MVP plumbing that will integrate when built:
  - **Guests Module:** The Finance income source-module dropdown (Story 2.1) already includes "Guest House" as an example category; this will be wired to the Guests module's payment integration when built.
  - **Equipment Module:** The Finance expense → Inventory auto-creation (Story 2.7) already supports an "Equipment" inventory-eligible category that creates inventory items of `item_type: 'equipment'`. The Equipment asset-tracking module (5.6) will build on top of this with maintenance schedules, location/assignment tracking, and calendar maintenance-reminder auto-events (which Story 5.1's deferred AC will activate).
  - **Energy Module:** No existing MVP plumbing. The Solar Microgrid Monitoring module (5.8) is fully post-MVP. The "Energy" calendar color-coding category in Story 5.1 will start receiving events when this module is built.

### 4.5 `docs/sprint-status.yaml`

- Replace the stale Epic 5 story entries (lines 82–91, which currently use outdated titles matching `ROADMAP.md`) with the canonical titles from `docs/epics.md`.
- Mark `5-5-guests-management-module`, `5-6-equipment-management-module`, and `5-8-energy-management-module` as `deferred` (mirroring the `4-9`/`4-10`/`4-11` entries).

### 4.6 Artifacts with no change

- `docs/architecture.md` — i18n nav labels (lines 2471–2474) preserved as-is.
- `ROADMAP.md` — out of scope (separate cleanup needed; flagged).
- Historical planning artifacts — preserved as-is.
- All source code — no changes (modules not implemented).

---

## 5. Implementation Handoff

### Change scope classification: **Minor**

- Can be implemented directly by the Developer agent.
- No backlog reorganization beyond the 3 status changes.
- No PM / Architect escalation required.

### Handoff

- **Routing:** Developer agent (direct implementation of doc edits and sprint-status.yaml update).
- **Deliverables:** This Sprint Change Proposal document + the approved edit proposals from Section 4.
- **Success criteria:**
  1. `docs/epics.md` shows 5.5, 5.6, 5.8 as `Deferred to post-MVP`; 5.1/5.9/5.10 adjusted; Epic 5 summary and top-of-doc summary updated.
  2. `docs/PRD.md` Guests/Equipment/Energy sections annotated post-MVP.
  3. `docs/ux-specification.md` Guests/Equipment/Energy page-tree and nav sections annotated post-MVP.
  4. `docs/POST-MVP.md` contains 3 new entries under a new "Optional Modules (Epic 5)" heading.
  5. `docs/sprint-status.yaml` Epic 5 entries match `docs/epics.md` titles; `5-5`, `5-6`, `5-8` marked `deferred`.
  6. No remaining doc implies 5.5/5.6/5.8 are MVP scope.
  7. This Sprint Change Proposal document exists at `docs/planning-artifacts/sprint-change-proposal-2026-07-23.md`.

### Next steps after implementation

- Resume the in-flight sprint work (currently Story 2.9 — Financial Dashboard Widgets per `docs/bmm-workflow-status.md`).
- When ready to start Epic 5, the MVP scope is now 7 stories: 5.1, 5.2, 5.3, 5.4, 5.7, 5.9, 5.10.
- The 3 deferred modules (5.5 Guests, 5.6 Equipment, 5.8 Energy) are queued for post-MVP per `docs/POST-MVP.md`.

---

## Approval

**Status:** Approved by user on 2026-07-23 (plan approved before implementation; Incremental-mode edit proposals presented and applied per the workflow execution log below).

---

## Workflow Execution Log

- **2026-07-23:** Correct Course workflow invoked. Trigger: user decision to defer Epic 5 stories 5.5, 5.6, 5.8 to post-MVP before starting the next epic. Dependency check completed — no hard blockers found. Plan approved. Implementation in Incremental mode.
- **2026-07-23:** All edit proposals applied and verified:
  - `docs/epics.md` — 5.5/5.6/5.8 marked `Deferred to post-MVP`; Story 5.1 AC5 (Equipment maintenance auto-event) removed with post-MVP note; Story 5.9 (MVP optional modules note) and Story 5.10 (prerequisite relaxed to "All MVP previous stories") adjusted; Epic 5 summary and top-of-doc Complete Epic Summary updated.
  - `docs/PRD.md` — FR-12/FR-13/FR-15 annotated post-MVP; Epic 5 goal/value/capabilities/success-criteria updated; FR-16 sample-data note added; Guests narrative scenario annotated; 3 entries added to the "Additional Optional Modules (Post-MVP)" section.
  - `docs/ux-specification.md` — page-tree (Guests/Equipment/Energy), sidebar nav, and first-time setup wizard module list annotated post-MVP.
  - `docs/POST-MVP.md` — new "Optional Modules (Epic 5)" section with 3 entries (Guests/Equipment/Energy) documenting existing MVP plumbing that will integrate when built.
  - `docs/sprint-status.yaml` — stale Epic 5 slugs resynced to match `docs/epics.md`; `5-5-guests-management-module`, `5-6-equipment-management-module`, `5-8-energy-management-module` marked `deferred`; resync comment added.
- **2026-07-23:** Verification complete. All 6 success criteria met. Scope classification confirmed: **Minor** (doc edits only; no code changes). Handoff: complete — Developer agent implemented the doc edits directly. Next: resume in-flight sprint work (Story 2.9 — Financial Dashboard Widgets) per `docs/bmm-workflow-status.md`. Epic 5 MVP scope is now 7 stories: 5.1, 5.2, 5.3, 5.4, 5.7, 5.9, 5.10.
