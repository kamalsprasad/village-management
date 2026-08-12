---
title: 'Story 5.10e3: Mobile Responsiveness (AC6)'
type: 'feature'
created: '2026-08-12'
status: 'done'
final_revision: 'cde237da3d0bef845cdb221134b8af3fa2ee67be'
baseline_revision: '31bb44d390b079b69d354bf63407bf2caef49f94'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 5.10 AC6 requires all MVP frontend pages to be functional on viewports as narrow as 320px and all interactive touch targets to be at least 44px. A pre-derivation audit found 30+ dialogs/cards with `min-width` greater than 320px, 50+ dense round icon-only buttons below 44px, three `no-wrap` flex rows that can overflow at 320px, and one keyboard-a11y gap on the FarmDashboardPage clickable module cards.

**Approach:** Add two global responsive CSS rules in `src/css/app.scss` to cap dialog-card widths and expand dense round button touch targets on mobile (≤599px), then apply a bounded, enumerated set of targeted per-file fixes for scoped-style dialogs, undersized `size="xs"` buttons, the three no-wrap rows, the FarmDashboardPage card keyboard interaction, and the MainLayout header menu widths.

## Boundaries & Constraints

**Always:** Reuse existing Quasar breakpoint conventions (`xs` = 0–599px, `@media (max-width: 599px)`). Target actual Quasar modifier classes (`.q-btn--dense`, `.q-btn--round`, `.q-dialog__inner`). Use `!important` only to override inline `style` attributes in the global dialog rule. Preserve all 5.10e1 aria-labels and do not change any page's data flow, permissions, route guards, stores, or component logic.

**Block If:** None.

**Never:** No new Appwrite tables/functions/permissions/.env variables/stores/pages/routes. No new npm dependencies. No desktop-only breakpoint changes. No deferred module work (5.5/5.6/5.8/AC8). No testing-checklist document (that is 5.10e4).

## I/O & Edge-Case Matrix

| Scenario                                  | Input / State                                                           | Expected Output / Behavior                            | Error Handling |
| ----------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| Open any dialog at 320px                  | A `q-dialog` with a `q-card` that has inline `style="min-width: 500px"` | Card renders at ≤95vw with no horizontal overflow     | N/A            |
| Tap a dense round icon button on mobile   | Button has `flat dense round` props                                     | Rendered hit area is at least 44px × 44px             | N/A            |
| Long teacher name on TeachersListPage     | Teacher name + avatar exceed cell width on xs                           | Row content wraps instead of overflowing              | N/A            |
| Long alert message on InventoryDetailPage | Alert title/message exceed card width on xs                             | Text wraps under icon instead of overflowing          | N/A            |
| Keyboard Tab to FarmDashboardPage card    | User tabs to a module card                                              | Card receives visible focus; Enter or Space navigates | N/A            |
| User menu on 320px screen                 | User taps the avatar button                                             | Menu panel stays within viewport                      | N/A            |

</intent-contract>

## Code Map

- `src/css/app.scss` -- global mobile responsive rules (dialog width cap + dense round button touch targets)
- `src/modules/farm/components/RecordSaleDialog.vue:303-317` -- scoped `.record-sale-dialog` min-width; add 599px override
- `src/modules/farm/components/HarvestEntryDialog.vue:431-441` -- scoped `.harvest-entry-dialog` min-width; add 599px override
- `src/modules/farm/pages/FarmDashboardPage.vue:217-238` -- clickable module-navigation cards; add keyboard a11y attributes and focus styling
- `src/modules/farm/pages/FarmAlertsPage.vue:164-177` -- action buttons use `size="xs"`; remove it
- `src/modules/school/components/TimetableCellEditor.vue:62-64` -- Clear button uses `size="xs"`; remove it
- `src/modules/finance/pages/FinanceTransactionsPage.vue:164-189` -- no-wrap row and inventory-link `size="xs"`; fix both
- `src/modules/school/pages/TeachersListPage.vue:67` -- no-wrap teacher name row
- `src/pages/inventory/InventoryDetailPage.vue:351` -- no-wrap alert row
- `src/layouts/MainLayout.vue:148,177` -- help and user menus need `max-width: 90vw`
- `src/modules/school/components/TimetableGrid.vue:305-311` -- existing `overflow-x: auto` wrapper; no change required
- `src/modules/school/components/TeacherScheduleGrid.vue:342-345` -- existing `overflow-x: auto` wrapper; no change required

## Tasks & Acceptance

**Execution:**

- `src/css/app.scss` -- add the global mobile responsive rules:

  ```scss
  @media (max-width: 599px) {
    .q-dialog__inner .q-card {
      max-width: 95vw !important;
      min-width: 0 !important;
      width: 95vw !important;
    }

    .q-btn.q-btn--dense.q-btn--round {
      min-width: 44px;
      min-height: 44px;
    }
  }
  ```

- `src/modules/farm/components/RecordSaleDialog.vue` -- replace the existing `@media (max-width: 600px)` block with `@media (max-width: 599px)` and add `min-width: 0 !important; max-width: 95vw;`
- `src/modules/farm/components/HarvestEntryDialog.vue` -- same scoped override as RecordSaleDialog
- `src/modules/farm/pages/FarmDashboardPage.vue:222-235` -- add `role="button"`, `tabindex="0"`, `@keydown.enter="$router.push(link.route)"`, and `@keydown.space.prevent="$router.push(link.route)"` to the module `q-card`; add a scoped `:focus-visible` outline rule
- `src/modules/farm/pages/FarmAlertsPage.vue` -- remove `size="xs"` from the mark-read/unread and dismiss action buttons
- `src/modules/school/components/TimetableCellEditor.vue` -- remove `size="xs"` from the Clear button
- `src/modules/finance/pages/FinanceTransactionsPage.vue:164` -- remove the `no-wrap` class from the type-cell row; remove `size="xs"` from the inventory-link button
- `src/modules/school/pages/TeachersListPage.vue:67` -- remove the `no-wrap` class from the teacher name row
- `src/pages/inventory/InventoryDetailPage.vue:351` -- remove the `no-wrap` class from the alert row
- `src/layouts/MainLayout.vue:177` -- add `max-width: 90vw` to the user menu `q-list` inline style; add `max-width: 90vw` to the help menu `q-list` inline style at line 148

**Acceptance Criteria:**

- Given any MVP page on a 320px-wide viewport, when a `q-dialog` is opened, then its `q-card` renders at ≤95vw and no horizontal overflow occurs.
- Given a dense round icon button on a mobile viewport, when the global CSS applies, then its rendered hit area is at least 44px × 44px.
- Given the transaction type cell on `FinanceTransactionsPage` at 320px, when the chip and inventory link do not fit on one line, then they wrap instead of overflowing.
- Given the module cards on `FarmDashboardPage`, when a user tabs to a card and presses Enter or Space, then the app navigates to the card's route and the focus indicator is visible.
- Given the user menu on a 320px screen, when it opens, then the panel stays within the viewport (max-width 90vw).

## Spec Change Log

## Review Triage Log

### 2026-08-12 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 1 (low: 1)
- defer: 0
- reject: 15
- addressed_findings:
  - `[low] [patch]` `src/modules/farm/pages/FarmDashboardPage.vue` focus-visible rule used bare `var(--q-primary)` without a fallback; replaced with `var(--q-primary, #1976d2)` so the outline remains visible even if the CSS custom property is undefined in a given build configuration.

## Design Notes

Viewport-based breakpoint `@media (max-width: 599px)` is used to match the nine existing files in the codebase that already use this pattern. The global dialog rule uses `!important` so it overrides inline `style="min-width: ..."` attributes. The global touch-target rule targets actual Quasar modifier classes (`.q-btn--dense.q-btn--round`) rather than prop names. No table-scroll fixes are required because `q-table` already provides horizontal scroll and the two `q-markup-table` usages are already wrapped in containers with `overflow-x: auto`.

## Verification

**Commands:**

- `npm run build` -- expected: build completes without errors

**Manual checks:**

- Use Chrome DevTools mobile emulation at 320px to open dialogs (e.g., `ResidentForm`, `HouseholdForm`, `RecordSaleDialog`, `HarvestEntryDialog`) and confirm no horizontal overflow.
- Inspect dense round header buttons (hamburger, notifications, help, user avatar) and confirm a 44px minimum rendered size.
- Tab through the `FarmDashboardPage` module cards and confirm visible focus plus Enter/Space navigation.
- Open the user menu on a 320px-emulated viewport and confirm it stays within the viewport.

## Auto Run Result

**Summary:** Added two global responsive CSS rules in `src/css/app.scss` to cap dialog cards at 95vw and expand dense round buttons to 44px touch targets on mobile (≤599px). Applied targeted per-file fixes to scoped-style dialogs, undersized `size="xs"` buttons, three no-wrap flex rows, the FarmDashboardPage card keyboard accessibility, and the MainLayout header menu widths.

**Files changed:**

- `src/css/app.scss` -- global dialog width and touch-target media queries
- `src/modules/farm/components/RecordSaleDialog.vue` -- scoped dialog mobile override at 599px
- `src/modules/farm/components/HarvestEntryDialog.vue` -- scoped dialog mobile override at 599px
- `src/modules/farm/pages/FarmDashboardPage.vue` -- keyboard-a11y attributes and focus-visible outline on module cards
- `src/modules/farm/pages/FarmAlertsPage.vue` -- removed `size="xs"` from action buttons
- `src/modules/school/components/TimetableCellEditor.vue` -- removed `size="xs"` from Clear button
- `src/modules/finance/pages/FinanceTransactionsPage.vue` -- removed `no-wrap` from type-cell row and `size="xs"` from inventory-link button
- `src/modules/school/pages/TeachersListPage.vue` -- removed `no-wrap` from teacher name row
- `src/pages/inventory/InventoryDetailPage.vue` -- removed `no-wrap` from alert row
- `src/layouts/MainLayout.vue` -- added `max-width: 90vw` to help and user menus

**Review findings:** 1 low patch applied (CSS variable fallback for focus outline). 15 findings rejected as out of scope, already handled by the global rules, or design decisions captured in the spec. No bad_spec or intent_gap. Verification gap review found no gaps.

**Verification performed:** `npm run build` completed successfully (exit code 0). Manual Chrome DevTools mobile-emulation checks remain recommended per the spec.

**Residual risks:** Manual visual/interactive verification at 320px was not performed in this session. No new Appwrite infrastructure, pages, routes, or dependencies were introduced.
