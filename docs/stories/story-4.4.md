# Story 4.4: School Calendar — Grade Bell Schedules (Period Slots)

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.4  
**Status:** ready-for-dev  
**Date:** 2026-06-20  
**Author:** AI Assistant

---

## Story

As a **School Administrator**, I want to define the daily bell schedule for each grade level — including the number of periods, break times, lunch, and the start/end time for each slot — so that the timetable builder in Story 4.5 has a structured grid to work with and every grade's unique schedule is reflected accurately.

---

## Summary

This story introduces the `school_period_slots` table, which defines the daily time structure for each grade level. Since you confirmed that period slot times are **per-grade** (younger grades may have a different bell schedule than older grades), each slot row is scoped to a `grade_level` enum value.

A slot can be a teaching period (`class`), a break (`break`), lunch (`lunch`), an assembly slot (`assembly`), or a free/prep period (`free`). Slots are ordered by `slot_number` within each grade. The `applies_to_days` string array allows certain slots to occur only on specific days of the week (e.g., a Friday-only assembly slot).

The existing `school_timetable` table schema is **replaced** by the expanded design introduced across Stories 4.4 and 4.5. The stubbed `school_timetable` table (added in the original schema but never fully used by application code) is dropped and recreated with the full schema. Since the DB is a fresh setup with only sample data, no migration is needed.

**Key Architectural Decisions:**

- **Per-grade bell schedule** — slots are defined once per grade, not per class. All classes in "Grade 3" share the same bell schedule. The timetable builder in Story 4.5 uses this as the grid template for each class.
- **`applies_to_days` as string array** — Supports slots that only occur on certain days (e.g., assembly on Fridays). Empty array = applies to all school days (Mon–Fri). Stored as `['Monday', 'Friday']` etc.
- **Slot type enum** — Distinguishes teaching slots (`class`) from non-teaching slots (`break`, `lunch`, `assembly`, `free`). Only `class`-type slots appear in the timetable subject grid (Story 4.5).
- **`academic_year` on period slots** — Allows the bell schedule to change between years. The UI defaults to the current year and allows year-by-year management. A "Copy from year" feature supports forward-planning.
- **Drop and replace `school_timetable`** — The original stub is removed. Story 4.5 will create `class_timetable_entries` as the proper replacement.

---

## Prerequisites

- **Story 4.1** (done): School module, navigation, grade level constants.
- **Story 4.2** (done): Class management (`school_classes` table).
- **Story 4.3** (done): Academic terms configured (bell schedules should be set up in the same settings area as terms).

---

## Schema Changes

### 1. Drop `school_timetable` table (replace in Story 4.5)

The `school_timetable` table in `setup-appwrite.js` is **removed** from `tableSchemas` and will be replaced by `class_timetable_entries` (Story 4.5). This affects `DATABASE_SCHEMA.md` and the setup script.

### 2. New table: `school_period_slots`

```javascript
school_period_slots: {
  name: 'School Period Slots',
  columns: [
    {
      key: 'grade_level',
      type: 'enum',
      elements: [
        'Early Childhood',
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
        'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9',
        'Grade 10', 'Grade 11', 'Grade 12',
      ],
      required: true,
    },
    { key: 'academic_year', type: 'integer', required: true },
    // Ordering within the day (1, 2, 3...). Determines display order.
    { key: 'slot_number', type: 'integer', required: true },
    // Display label: "Period 1", "Morning Break", "Lunch", "Assembly", etc.
    { key: 'label', type: 'string', size: 100, required: true },
    {
      key: 'slot_type',
      type: 'enum',
      elements: ['class', 'break', 'lunch', 'assembly', 'free'],
      required: true,
      default: 'class',
    },
    // "08:00" – 24-hour HH:mm format stored as string
    { key: 'start_time', type: 'string', size: 5, required: true },
    { key: 'end_time', type: 'string', size: 5, required: true },
    // Empty array = applies every school day.
    // Populated = only on listed days: ['Monday', 'Friday'] etc.
    {
      key: 'applies_to_days',
      type: 'string',
      size: 10,
      array: true,
      required: false,
    },
    { key: 'notes', type: 'string', size: 255, required: false },
  ],
  indexes: [
    {
      key: 'idx_period_slots_grade_year',
      type: 'key',
      columns: ['grade_level', 'academic_year'],
      orders: ['ASC', 'ASC'],
    },
    {
      key: 'idx_period_slots_grade_year_slot',
      type: 'key',
      columns: ['grade_level', 'academic_year', 'slot_number'],
      orders: ['ASC', 'ASC', 'ASC'],
    },
  ],
}
```

### 3. `DATABASE_SCHEMA.md` updates

- Remove `school_timetable` from the School Tables section (stub removed).
- Add `school_period_slots` to the School Tables section.
- Update the relationships section accordingly.

---

## Acceptance Criteria

### AC1: School Settings — Bell Schedules (`/school/settings/bell-schedules`)

- [ ] Page is accessible from the School Calendar page (or School Settings hub) via a "Bell Schedules" link, gated on `school:admin`.
- [ ] **Grade level selector** (dropdown, required) and **Academic Year selector** (integer input, default current year) at top of page.
- [ ] Page displays the period slot list for the selected grade + year, ordered by `slot_number`.
- [ ] Each row in the list shows: slot number, label, slot type (badge), start time, end time, applies-to days (chips or "All Days"), and edit/delete actions.
- [ ] **"Add Slot" button** opens an inline form or dialog:
  - Label (required, string)
  - Slot Type (required, dropdown: Class Period / Break / Lunch / Assembly / Free Period)
  - Start Time (required, time picker — HH:mm 24-hour format)
  - End Time (required, time picker — must be after Start Time)
  - Applies to Days (optional, multi-select checkboxes: Monday / Tuesday / Wednesday / Thursday / Friday — leave empty for all days)
  - Notes (optional)
  - Slot Number is auto-assigned as the next available integer; user can reorder using up/down arrows.
- [ ] **Edit** opens a pre-filled dialog for the selected slot.
- [ ] **Delete** shows a confirmation dialog. If the slot is already referenced by timetable entries (Story 4.5), show a warning: "This slot is used in [N] timetable entries. Deleting it will also delete those entries. Continue?"
- [ ] **Reorder** — drag handle or up/down arrow buttons to reorder slots; `slot_number` values are renumbered on save.
- [ ] **Validation:**
  - End time must be after start time.
  - No two slots may have the same start time for the same grade/year/day combination (warn but do not hard block — unusual schedules exist).
  - A grade schedule must have at least one `class`-type slot to be usable in the timetable builder.

### AC2: Daily Schedule Preview

- [ ] Below the slot list, render a **read-only visual timeline** of the school day for the selected grade.
- [ ] Timeline displays each slot as a proportionally-sized block (based on duration in minutes), color-coded by slot type:
  - `class` → blue
  - `break` → green
  - `lunch` → orange
  - `assembly` → teal
  - `free` → grey
- [ ] Each block shows the slot label and time range.
- [ ] Mobile-responsive (scrolls horizontally on small screens).

### AC3: Copy Schedule

- [ ] **"Copy from Grade/Year"** button:
  - Dialog: select a source grade level and source academic year.
  - Copies all period slots from the source to the current grade + year selection.
  - If slots already exist for the target grade/year, show warning: "Existing slots for [Grade] [Year] will be replaced. Continue?"
- [ ] This enables quick setup: define Early Childhood schedule, then copy-and-adjust for Grade 1, and so on.

### AC4: `period-slots-store.js` (New Pinia Store)

- [ ] Store file: `src/modules/school/stores/period-slots-store.js`
- [ ] **State:** `periodSlots[]`, `periodSlotsLoaded`, `isLoading`
- [ ] **Getters:**
  - `slotsByGradeYear(gradeLevel, academicYear)` — Returns slots sorted by `slot_number`
  - `classSlotsByGradeYear(gradeLevel, academicYear)` — Returns only `slot_type === 'class'` slots (used by timetable builder in Story 4.5)
  - `slotDurationMinutes(slot)` — Computed duration from start/end time strings
- [ ] **Actions:**
  - `fetchPeriodSlots(force)` — Load all slots (follows existing store patterns)
  - `savePeriodSlot(slotData)` — Create or update a slot
  - `deletePeriodSlot(id)` — Delete a slot
  - `copySchedule(sourceGrade, sourceYear, targetGrade, targetYear)` — Copy all slots from source to target (delete existing target slots first, then create copies)
  - `reorderSlots(gradeLevel, academicYear, orderedSlotIds)` — Renumber `slot_number` in the provided order

### AC5: Grade Schedule Completeness Indicator on Bell Schedules Page

- [ ] For each grade level in the current academic year, show a completeness status badge in a summary table at the top of the Bell Schedules settings page:
  - Green badge: "Configured" — at least one `class`-type slot exists.
  - Yellow badge: "No class periods" — slots exist but none are type `class`.
  - Red badge: "Not configured" — no slots at all.
- [ ] This gives admins a quick overview of which grades still need their schedules set up.

### AC6: Sample Data

- [ ] `server/scripts/seed-sample-data.js` updated to seed:
  - A representative bell schedule for **Early Childhood** (fewer, shorter periods) and **Grade 5** (standard day) for the sample academic year.
  - Minimum slots per grade: morning assembly (optional), 3–5 class periods, 1–2 breaks, 1 lunch.

### AC7: Permissions

- [ ] `school:read` — can view bell schedules (read-only).
- [ ] `school:admin` — can add/edit/delete/copy period slots (School Administrator, Head Teacher).

---

## UI Notes

- The Bell Schedules settings page should live under a **School Settings hub** page (if one does not exist, create a simple `SchoolSettingsPage.vue` that links to Terms, Bell Schedules, and Calendar Events settings — a clean landing page for all school configuration).
- The visual timeline (AC2) is a lightweight custom component using CSS flex/grid — do not use vue-cal for this; vue-cal is overkill for a static daily timeline.
- Time pickers: use Quasar's `QTime` component in 24-hour mode.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/modules/school/pages/BellSchedulesSettingsPage.vue` |
| Create | `src/modules/school/pages/SchoolSettingsPage.vue` (hub page, if not already created in 4.3) |
| Create | `src/modules/school/stores/period-slots-store.js` |
| Create | `src/modules/school/components/DailyScheduleTimeline.vue` |
| Modify | `src/modules/school/router.js` (add bell-schedules route) |
| Modify | `src/layouts/MainLayout.vue` (add School Settings nav item if not added in 4.3) |
| Modify | `server/scripts/setup-appwrite.js` (remove school_timetable stub, add school_period_slots) |
| Modify | `server/scripts/seed-sample-data.js` (seed bell schedule data) |
| Modify | `DATABASE_SCHEMA.md` |
