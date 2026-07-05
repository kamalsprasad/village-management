# Story 4.3: School Calendar — Academic Terms & School Holidays

**Epic:** 4 — School Management and Educational Accountability  
**Story ID:** 4.3  
**Status:** done  
**Date:** 2026-06-20  
**Author:** AI Assistant

---

## Story

As a **School Administrator** or **Head Teacher**, I want to configure the academic year's terms (name, start date, end date) and mark school holidays and non-teaching days on a calendar, so that the system knows exactly which dates are school days and can correctly drive attendance tracking and at-risk calculations.

---

## Summary

This story introduces the foundational **School Calendar** data layer that all subsequent attendance and at-risk logic depends on. It replaces the hard-coded `TERMS` constant (`['Term 1', 'Term 2', 'Term 3']`) with a configurable `school_academic_terms` table and adds a `school_calendar_events` table for holidays, PD days, exam blocks, and other non-teaching days.

Two new tables are introduced:

- **`school_academic_terms`** — Defines the named terms/semesters for each academic year (configurable count, custom names, start/end dates).
- **`school_calendar_events`** — Records school closures, public holidays, professional development days, exam blocks, early dismissal days, and other calendar events. Optionally scoped to specific classes.

The `test_scores` table's `term` column is **changed from a hard-coded enum to a free string** (`size: 100`) so it can store any term name from `school_academic_terms`. The `TERMS` constant in `school-constants.js` is retained as a UI fallback/default but the live term list is always fetched from the database first.

A new **School Calendar page** (`/school/calendar`) provides a monthly/yearly overview using `vue-cal`, with color-coded event types, term boundary markers, and an admin UI to add/edit terms and calendar events.

**Key Architectural Decisions:**

- **`term` on `test_scores` becomes a string** (not a relationship) — keeps the flat score table design, avoids cascade complexity, and allows historical scores to remain valid even if a term record is later renamed or deleted. The term name at recording time is stored literally.
- **`school_academic_terms` is school-wide** — one set of terms per academic year for the whole school. There is no per-class term variation.
- **`school_calendar_events` is school-wide by default**, with an optional `affected_class_ids` string array for per-class overrides (e.g., a class-specific field trip closing).
- **`is_school_day` flag** on calendar events — `false` = school closed (holiday, PD day); `true` = school open but modified (early dismissal, assembly day). Attendance logic in Story 4.6 uses this to determine valid attendance days.
- **No automatic term detection** — teachers still manually select the term when recording scores. The term dropdown is populated from the database (not the hard-coded constant).

---

## Prerequisites

- **Story 4.1** (done): Learner enrollment, school navigation, `school-store.js`.
- **Story 4.2** (done): Test scores, teacher assignments, class management.

---

## Schema Changes

### 1. New table: `school_academic_terms`

```javascript
school_academic_terms: {
  name: 'School Academic Terms',
  columns: [
    { key: 'academic_year', type: 'integer', required: true },
    // e.g. "Term 1", "Term 2", "Semester 1", "Quarter 3" — free text
    { key: 'term_name', type: 'string', size: 100, required: true },
    // Ordering within the year (1, 2, 3...)
    { key: 'term_order', type: 'integer', required: true },
    { key: 'start_date', type: 'datetime', required: true },
    { key: 'end_date', type: 'datetime', required: true },
    { key: 'notes', type: 'string', size: 500, required: false },
  ],
  indexes: [
    {
      key: 'idx_academic_terms_year',
      type: 'key',
      columns: ['academic_year'],
      orders: ['ASC'],
    },
    {
      key: 'idx_academic_terms_year_order',
      type: 'key',
      columns: ['academic_year', 'term_order'],
      orders: ['ASC', 'ASC'],
    },
  ],
}
```

### 2. New table: `school_calendar_events`

```javascript
school_calendar_events: {
  name: 'School Calendar Events',
  columns: [
    { key: 'title', type: 'string', size: 255, required: true },
    {
      key: 'event_type',
      type: 'enum',
      elements: [
        'public_holiday',
        'school_holiday',
        'pd_day',
        'exam_block',
        'early_dismissal',
        'assembly',
        'other',
      ],
      required: true,
    },
    // For single-day or multi-day events. start_date = end_date for single-day.
    { key: 'start_date', type: 'datetime', required: true },
    { key: 'end_date', type: 'datetime', required: true },
    // false = school closed on these dates (not counted as school days)
    // true  = school open but modified (early dismissal, special event)
    { key: 'is_school_day', type: 'boolean', required: true, default: false },
    // null/empty = affects all classes; populated = only affects specific classes
    { key: 'affected_class_ids', type: 'string', size: 50, array: true, required: false },
    { key: 'notes', type: 'string', size: 500, required: false },
  ],
  indexes: [
    {
      key: 'idx_calendar_events_start',
      type: 'key',
      columns: ['start_date'],
      orders: ['ASC'],
    },
    {
      key: 'idx_calendar_events_type',
      type: 'key',
      columns: ['event_type'],
      orders: ['ASC'],
    },
  ],
}
```

### 3. Modify `test_scores` table: change `term` from enum to string

**Before (Story 4.2):**

```javascript
{
  key: 'term',
  type: 'enum',
  elements: ['Term 1', 'Term 2', 'Term 3'],
  required: true,
}
```

**After (Story 4.3):**

```javascript
{
  key: 'term',
  type: 'string',
  size: 100,
  required: true,
}
```

> **Rationale:** Terms are now configurable. Storing the term name as a literal string on each score row preserves the historical record even if terms are later renamed. The enum restriction is removed since Appwrite does not allow enum values to be modified after creation without recreating the column.

### 4. `DATABASE_SCHEMA.md` updates

- Add `school_academic_terms` to the School Tables section.
- Add `school_calendar_events` to the School Tables section.
- Update `test_scores.term` description to note it is now a free string.
- Add relationships: none (both new tables are standalone; calendar events reference class IDs by string, not relationship, to support optional scoping without cascade complexity).

---

## Acceptance Criteria

### AC1: School Navigation Updated

- [x] "Calendar" navigation item added under the School section in `MainLayout.vue` (icon: `calendar_month`), gated on `school:read`.
- [x] The School Dashboard "Quick Links" card enables a "Calendar" link routing to `/school/calendar`.

### AC2: School Calendar Page (`/school/calendar`)

- [x] Page renders a `vue-cal` monthly view by default.
- [x] View switcher: Month / Year (agenda-style list for Year).
- [x] **Term boundaries** displayed as colored background bands on the calendar — each term has a distinct color.
- [x] **Calendar events** rendered as chips/events on their dates, color-coded by `event_type`:
  - `public_holiday` → red
  - `school_holiday` → orange
  - `pd_day` → purple
  - `exam_block` → blue
  - `early_dismissal` → yellow
  - `assembly` → teal
  - `other` → grey
- [x] Clicking an event opens a detail popup showing title, type, date range, `is_school_day`, affected classes (if any), and notes.
- [x] **Read-only view** for users without `school:admin`.
- [x] Empty state (no terms or events configured): "No academic calendar has been set up yet. Configure terms and holidays in School Settings."
- [x] Navigation arrows to move between months/years.
- [x] Current date highlighted.

### AC3: School Settings — Academic Terms (`/school/settings/terms`)

- [x] Accessible from School Calendar page via "Manage Terms" button (gated on `school:admin`).
- [x] Lists all terms for the selected academic year (default: current year), showing term name, order, start date, end date.
- [x] Academic year selector at top (integer input, default current calendar year).
- [x] **"Add Term" button** opens inline form or dialog:
  - Term Name (string, required, e.g. "Term 1")
  - Term Order (integer, required, auto-incremented from existing terms)
  - Start Date (date picker, required)
  - End Date (date picker, required, must be after Start Date)
  - Notes (optional)
- [x] **Validation:**
  - End date must be after start date.
  - Term date ranges must not overlap with existing terms in the same academic year.
  - At least one term required before attendance can be recorded (soft warning, not a hard block here).
- [x] Edit and Delete buttons per term row.
- [x] Deleting a term shows a confirmation dialog: "Deleting this term will not affect existing test scores. Continue?"
- [x] Terms reorder automatically by `term_order` after any add/delete.
- [x] **Copy from previous year** button: copies the previous year's term names and relative date offsets (shifted by 365 days) as a starting point. User can then adjust dates. Only shown if a previous year's terms exist.

### AC4: School Settings — Calendar Events (`/school/settings/calendar`)

- [x] Accessible from School Calendar page via "Manage Holidays & Events" button (gated on `school:admin`).
- [x] Lists all calendar events sorted by `start_date` ascending, with type badge and date range.
- [x] Filter by `event_type` and by academic year (derived from `start_date` falling within a term's year range).
- [x] **"Add Event" button** opens a dialog:
  - Title (required)
  - Event Type (required, dropdown from enum list)
  - Start Date (required, date picker)
  - End Date (optional, date picker — defaults to same as Start Date for single-day; must be ≥ Start Date)
  - Is School Day? (toggle, default OFF — most events are closures)
    - Shown with helper text: "Turn ON only if school is open on this day (e.g. early dismissal — students attend but leave early)."
  - Affected Classes (optional, multi-select from active classes — leave empty for school-wide)
  - Notes (optional)
- [x] Edit and Delete buttons per event row.
- [x] Bulk import option (future/post-MVP placeholder): "Import public holidays from national calendar" — shown as disabled button with tooltip "Coming soon."
- [x] Empty state: "No calendar events added yet. Add holidays and non-teaching days to enable accurate attendance tracking."

### AC5: Term Selector in Record Scores Updated

- [x] In `RecordScoresPage.vue`, the **Term dropdown** is now populated from `school_academic_terms` for the selected `academic_year`, not from the hard-coded `TERMS` constant.
- [x] Term dropdown options show term names sorted by `term_order`.
- [x] If no terms are configured for the selected year, show inline warning: "No terms configured for [year]. Configure terms in School Settings before recording scores." The Term field shows an empty dropdown.
- [x] Fallback: if the database returns no terms (e.g., network error), fall back to the hard-coded `TERMS` constant and show a subtle warning indicator.

### AC6: `academic-terms-store.js` (New Pinia Store)

- [x] Store file: `src/modules/school/stores/academic-terms-store.js`
- [x] **State:** `academicTerms[]`, `academicTermsLoaded`, `isLoading`
- [x] **Getters:**
  - `termsByYear(year)` — Returns terms for a given academic year sorted by `term_order`
  - `currentYearTerms` — Terms for current calendar year
  - `getTermForDate(date)` — Returns the term record whose `start_date`–`end_date` range contains the given date (or `null`)
- [x] **Actions:**
  - `fetchAcademicTerms(force)` — Load all terms (follows existing store patterns)
  - `saveTerm(termData)` — Create or update a term
  - `deleteTerm(id)` — Delete a term
  - `copyTermsFromYear(sourceYear, targetYear)` — Copy terms from one year to another with date offset

### AC7: `calendar-events-store.js` (New Pinia Store)

- [x] Store file: `src/modules/school/stores/calendar-events-store.js`
- [x] **State:** `calendarEvents[]`, `calendarEventsLoaded`, `isLoading`
- [x] **Getters:**
  - `eventsByDateRange(startDate, endDate)` — Events overlapping a given range
  - `isSchoolDay(date, classId?)` — Returns `true` if the date is a school day (not a closure event; optionally considering class-specific overrides)
  - `schoolDaysBetween(startDate, endDate, classId?)` — Count of school days in a range (for attendance calculations)
- [x] **Actions:**
  - `fetchCalendarEvents(force)` — Load all events
  - `saveCalendarEvent(eventData)` — Create or update
  - `deleteCalendarEvent(id)` — Delete

### AC8: Sample Data

- [x] `server/scripts/seed-sample-data.js` updated to seed:
  - 3 academic terms for the current sample year (e.g. Term 1: Jan–Apr, Term 2: May–Aug, Term 3: Sep–Nov)
  - At least 5 school calendar events: 1 public holiday, 1 PD day, 1 school holiday, 1 exam block, 1 early dismissal

### AC9: Permissions

- [x] `school:read` — can view Calendar page and events.
- [x] `school:admin` — can add/edit/delete terms and calendar events (School Administrator, Head Teacher roles).
- [x] Teachers cannot modify the calendar but can view it.

---

## UI Notes

- The School Calendar page is the primary read view (vue-cal). The two settings pages (`/school/settings/terms` and `/school/settings/calendar`) are admin-only CRUD UIs. Link them from the calendar page with "Manage" buttons visible only to `school:admin`.
- Prefer a split layout on the calendar page: calendar on the left, upcoming events list on the right (or below on mobile).
- Term bands on the calendar should be subtle (low-opacity background color) so individual events remain readable over them.
- The "Copy from previous year" feature is a significant UX quality-of-life feature — do not skip it. Most schools repeat the same term structure year after year.

---

## Review Findings / Implementation Notes

> Implementation review conducted 2026-06-23 against the current branch (`school-classes`).

### Completed

- All acceptance criteria implemented and verified through code inspection.
- `MainLayout.vue` has the School Calendar nav item; `SchoolDashboardPage.vue` has the Quick Links card.
- `SchoolCalendarPage.vue` renders vue-cal month/year-list views, term bands, and color-coded events with a detail popup.
- `AcademicTermsSettingsPage.vue` and `CalendarEventsSettingsPage.vue` provide full CRUD with validation and copy-from-previous-year.
- `RecordScoresPage.vue` term dropdown is driven by `academic-terms-store.js` with fallback to `TERMS`.
- `academic-terms-store.js` and `calendar-events-store.js` are in place with the required getters/actions.
- `DATABASE_SCHEMA.md` and `server/scripts/setup-appwrite.js` updated with the two new tables and the `test_scores.term` string change.

### Concerns / Notes

- **Sample data location mismatch:** The story specifies `server/scripts/seed-sample-data.js`, but the actual school calendar seed data (terms + events) was added to `server/functions/seedAllData/src/main.js`. The standalone `seed-sample-data.js` script still only seeds households/residents and does not include the required 3 terms + 5 events. If teams use `npm run seed:sample` instead of the Appwrite function, the calendar will be empty.
  - **Recommendation:** Either port the school calendar seed block into `seed-sample-data.js`, or update the story file to point to `seedAllData` as the canonical seed mechanism and deprecate `seed-sample-data.js` for school data.

---

## Files to Create / Modify

| Action | File                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------- |
| Create | `src/modules/school/pages/SchoolCalendarPage.vue`                                                 |
| Create | `src/modules/school/pages/AcademicTermsSettingsPage.vue`                                          |
| Create | `src/modules/school/pages/CalendarEventsSettingsPage.vue`                                         |
| Create | `src/modules/school/stores/academic-terms-store.js`                                               |
| Create | `src/modules/school/stores/calendar-events-store.js`                                              |
| Modify | `src/modules/school/pages/RecordScoresPage.vue` (term dropdown source)                            |
| Modify | `src/modules/school/utils/school-constants.js` (TERMS kept as fallback, add CALENDAR_EVENT_TYPES) |
| Modify | `src/modules/school/router.js` (add calendar + settings routes)                                   |
| Modify | `src/layouts/MainLayout.vue` (add Calendar nav item)                                              |
| Modify | `server/scripts/setup-appwrite.js` (new tables + test_scores.term change)                         |
| Modify | `server/scripts/seed-sample-data.js` (seed terms + events)                                        |
| Modify | `DATABASE_SCHEMA.md`                                                                              |
