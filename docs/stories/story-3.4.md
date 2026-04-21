# Story 3.4: Farm Module - Planting Status Tracking and Lifecycle Management

**Epic:** 3 - Farm Management and Agricultural Tracking  
**Story ID:** 3.4  
**Status:** Implemented  
**Date:** 2026-04-21  
**Author:** AI Assistant

---

## User Story

As a **Farm Manager**, I want to track planting status throughout the growing cycle, so that I can monitor crop progress and identify issues early.

---

## Summary

This story delivers the operational heartbeat of the Farm module: the ability to move plantings through their lifecycle (Planted → Growing → Harvesting → Completed, or any → Failed), the "Update Status" dialog that Story 3.3 left as a placeholder, edit functionality for planting cost corrections, a "Planting Status" dashboard widget on the Farm Dashboard, and harvest/overdue alerts.

Key outcomes:

- Farm Manager can change planting status with a required failure reason when marking Failed
- Plot status updates automatically in response to planting status transitions
- Farm Dashboard gains a "Planting Status" summary widget and two alert cards
- Planting list and detail pages are fully interactive for write users
- Edit planting form allows limited field edits (costs, notes, expected harvest date)

**Key Architectural Decisions:**

- **Status history deferred to POST-MVP** — No `planting_status_history` table exists in the DB schema. Appending history to `notes` would be lossy/unstructured. A dedicated table is the correct long-term solution but is deferred. See POST-MVP concern below.
- **Failure reason stored in `notes` field** — No `failure_reason` column exists in the `plantings` table schema. Failure reason + type will be prepended to the `notes` field in a structured prefix format: `[FAILURE: <reason>] <original notes>`.
- **Crop Manager scoping simplified for MVP** — The `users` table DOES have a `resident_id` oneToOne relationship to `residents` (defined in `server/scripts/setup-appwrite.js`). However, this `resident_id` is not currently loaded into `auth-store.js` state or exposed through `usePermissions`, so plot-level scoping (restrict to `plots.crop_manager_id` match) cannot be enforced at runtime without additional plumbing. For this story, Crop Manager role gets the same `farm:write` permission as Farm Manager with no plot-level filtering. Deferred to POST-MVP.
- **Edit constraints enforced client-side** — Crop, Plot, Planting date, Seed source cannot be edited (would break inventory audit trail). Only costs, notes, and expected harvest date are editable.
- **Plot status automation** — When last active planting on a plot transitions to `completed` or `failed`, plot status reverts to `Fallow`.

---

## Prerequisites

- **Story 3.1** (completed): Plot Management — `plots` table and `updatePlot` action exist
- **Story 3.2** (completed): Crops Database — crop data available for display
- **Story 3.3** (completed): Planting Records — `plantings` table, store actions (`updatePlanting`, `fetchPlantingsByPlot`), `PlantingDetailPage.vue` with "Edit" button placeholder, `PlotDetailPage.vue` with "Update Status" placeholder

---

## Acceptance Criteria

### AC1: "Update Status" Button on Planting Detail Page

- [x] "Update Status" button visible on `PlantingDetailPage.vue` for users with `farm:write` permission
- [x] Button is **disabled** (greyed out with tooltip "No further status changes available") when planting status is `completed` or `failed`
- [x] Clicking the button opens a dialog (not a new page) titled "Update Planting Status"
- [x] Dialog displays current status and the allowed next statuses based on workflow rules
- [x] Dialog also accessible via an "Update Status" action item in a planting row context menu on `PlantingsListPage.vue`

### AC2: Status Transition Workflow

The allowed status transitions (enforced in both UI and store action):

| From Status  | Allowed Next Statuses         |
| ------------ | ----------------------------- |
| `planted`    | `growing`, `failed`           |
| `growing`    | `harvesting`, `failed`        |
| `harvesting` | `completed`, `failed`         |
| `completed`  | _(terminal — no transitions)_ |
| `failed`     | _(terminal — no transitions)_ |

- [x] Dialog presents only valid next statuses as selectable options (radio buttons or segmented control)
- [x] Skipping statuses is allowed (e.g., `planted` → `harvesting` is **not** in the table above and should NOT be allowed — use the table strictly)
- [x] If current status is already `completed` or `failed`, the "Update Status" button is disabled (AC1)

### AC3: Failure Reason Required When Marking Failed

- [x] When user selects `failed` as the new status, a "Failure Reason" section expands in the dialog
- [x] Failure Reason is a required **dropdown** with options:
  - Drought
  - Pests
  - Disease
  - Flooding
  - Poor Soil
  - Other
- [x] Optional "Additional Notes" text area (max 500 chars) appears below the failure reason
- [x] Form validation prevents submission if `failed` is selected but no Failure Reason is chosen
- [x] On save, the failure reason is prepended to the planting's `notes` field in the format:
  ```
  [FAILURE: Drought] <additional notes if any>
  <original notes if any>
  ```
- [x] Plot status automatically changes to `Fallow` when a planting is marked `failed` (see AC5)

### AC4: Status Update Save Flow

- [x] "Save Status" button in dialog triggers `farmStore.updatePlantingStatus(plantingId, newStatus, { reason, notes })` action
- [x] Action calls `updatePlanting(plantingId, { status: newStatus, notes: updatedNotes })`
- [x] On success: dialog closes, planting detail page refreshes status badge and display, success notification shown: `"Planting status updated to [New Status]"`
- [x] On error: dialog stays open, error notification shown, no state mutation
- [x] Loading spinner shown on "Save Status" button during submission

### AC5: Automatic Plot Status Update on Planting Status Change

Planting status changes must cascade to plot status per these rules:

| Planting New Status     | Plot Status Change                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `growing`, `harvesting` | Plot stays `Active` (no change)                                                                                       |
| `completed`             | Check if any other active plantings remain on plot. If none → plot → `Fallow`. If others remain → plot stays `Active` |
| `failed`                | Same check as `completed` — if no other active plantings remain → plot → `Fallow`                                     |
| `planted`               | Plot already `Active` from Story 3.3 creation (no change needed)                                                      |

- [x] The `updatePlantingStatus` store action performs this cascade check after successfully updating the planting
- [x] "Active planting" for this check: any planting on the same `plot_id` with status in `['planted', 'growing', 'harvesting']` **excluding** the planting just updated
- [x] Plot status update failure does NOT roll back the planting status update (best-effort, logged to console)

### AC6: Edit Planting Form (Limited Fields)

- [x] "Edit" button on `PlantingDetailPage.vue` (currently shows a "coming in Story 3.4" notification) now opens an edit form at route `/farm/plantings/:id/edit`
- [x] Edit form pre-fills with current planting data
- [x] **Editable fields** (all optional):
  - Expected Harvest Date (date picker)
  - Labor Cost (currency input, min 0)
  - Other Costs (currency input, min 0)
  - Notes (textarea, max 1000 chars)
- [x] **Read-only / non-editable fields** (shown as display-only labels, not inputs):
  - Crop (with link to crop detail)
  - Plot (with link to plot detail)
  - Planting Date
  - Inputs Cost (with note: "Inputs cost cannot be edited after planting — it is tied to the inventory deduction at time of planting")
  - Seed Source
  - Current Status (note: "Use 'Update Status' to change status")
- [x] Banner at top of form: `"ℹ️ Only limited fields can be edited to preserve the inventory audit trail."`
- [x] Validation: Expected harvest date must be ≥ planting date
- [x] On success: redirect to planting detail page with success notification
- [x] Cancel button returns to planting detail page without saving

### AC7: Planting Detail Page — Progress Display

- [x] Planting detail page shows a **progress section** between the header and info cards:
  - **Days Since Planting**: `today - planting_date` (integer, always positive)
  - **Days Until Expected Harvest**: with overdue handling (shows negative as "X days overdue")
  - **Progress Bar**: `(days since planting / total maturity days) × 100%`, capped at 100%, color: positive (green) if on track, warning (orange) if within 7 days, negative (red) if overdue
- [x] `total maturity days` = `crop.maturity_days` from the linked crop record (loaded if not already in store)
- [x] Progress bar is hidden if the planting status is `completed` or `failed`
- [x] For `completed` status: show a green "✓ Harvest Completed" banner instead of progress bar
- [x] For `failed` status: show a red "✗ Planting Failed" banner; if notes start with `[FAILURE:`, parse and display the failure reason prominently

### AC8: Farm Dashboard — "Planting Status" Widget

- [x] Replace the placeholder card on `FarmDashboardPage.vue` (the second widget slot) with a **"Planting Status"** widget component (`PlantingStatusWidget.vue`)
- [x] Widget shows a count breakdown by status using `q-badge` or colored stat tiles:
  - 🌱 Planted: `N`
  - 🌿 Growing: `N`
  - 🌾 Harvesting: `N`
  - ✓ Completed (this season): `N`
  - ✗ Failed (this season): `N`
- [x] "This season" for completed/failed = plantings updated in the last 180 days (client-side filter on `$updatedAt`)
- [x] Widget title "Planting Status" is clickable and navigates to `/farm/plantings`
- [x] Widget loads data from `farmStore.plantings` (uses already-loaded data if `plantingsLoaded = true`, else calls `fetchPlantings()`)
- [x] Widget is mobile-responsive

### AC9: Farm Dashboard — Harvest Alerts

- [x] Below the Planting Status widget (or as a separate card on the dashboard), show two alert sections:

  **"Ready for Harvest" alert list:**
  - Shows plantings where `status` is `growing` or `planted` AND `expected_harvest_date` is within the next 7 days (inclusive of today)
  - Each row: `[Crop Name] on [Plot Name] — harvest expected [date] ([N days])`
  - Clicking a row navigates to that planting's detail page
  - If empty: show subtle message "No harvests due in the next 7 days"

  **"Overdue Harvest" alert list:**
  - Shows plantings where `status` is `growing` or `planted` AND `expected_harvest_date` is in the past (before today)
  - Each row shows crop name, plot name, expected date, and days overdue in red
  - Clicking a row navigates to that planting's detail page
  - If empty: show subtle message "No overdue harvests"

- [x] Both lists are collapsed by default on mobile (use `q-expansion-item`) and expanded on desktop
- [x] Counts shown in section headers: "Ready for Harvest (3)", "Overdue Harvest (1)"

### AC10: Planting List Page — Status Filter and Actions

- [x] `PlantingsListPage.vue` status filter dropdown already exists (from Story 3.3) — confirm it works correctly with all lowercase status values from the DB
- [x] Each row in the plantings list table includes an **Actions** column with:
  - "View" button (always visible, navigates to detail page)
  - "Update Status" button (visible for `farm:write` users, disabled if terminal status)
- [x] "Update Status" from the list page opens the same dialog as AC1 (shared component)
- [x] Planting list page title row shows a stat summary: "X active plantings, Y overdue"

### AC11: Error Handling and Edge Cases

- [x] **Terminal status guard**: If `updatePlantingStatus` is called with a terminal-to-any transition (e.g., programmatic call with `completed` → `growing`), return `{ success: false, error: 'Invalid status transition' }` without making any API call
- [x] **Missing crop data**: If `crop.maturity_days` is unavailable when rendering the progress bar, hide the progress bar and show "Progress data unavailable — crop details could not be loaded"
- [x] **Concurrent update**: If the Appwrite `updateRow` call fails with a conflict error, show: "This planting was recently updated. Please refresh and try again."
- [x] **Plot update failure**: Log to console (`console.error`) but do not surface to user as an error — planting status update is the primary action

---

## Technical Implementation Notes

### New Store Action: `updatePlantingStatus`

Add to `src/modules/farm/stores/farm-store.js`:

```javascript
async updatePlantingStatus(plantingId, newStatus, { failureReason = null, additionalNotes = '' } = {}) {
  // 1. Validate transition
  const ALLOWED_TRANSITIONS = {
    planted:    ['growing', 'failed'],
    growing:    ['harvesting', 'failed'],
    harvesting: ['completed', 'failed'],
  };
  const current = this.plantings.find(p => p.$id === plantingId) || this.currentPlanting;
  const currentStatus = current?.status?.toLowerCase();
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return { success: false, error: `Invalid status transition: ${currentStatus} → ${newStatus}` };
  }

  // 2. Build updated notes
  let updatedNotes = current?.notes || '';
  if (newStatus === 'failed' && failureReason) {
    const prefix = additionalNotes
      ? `[FAILURE: ${failureReason}] ${additionalNotes}`
      : `[FAILURE: ${failureReason}]`;
    updatedNotes = updatedNotes ? `${prefix}\n${updatedNotes}` : prefix;
  }

  // 3. Update planting
  const result = await this.updatePlanting(plantingId, {
    status: newStatus,
    notes: updatedNotes,
  });
  if (!result.success) return result;

  // 4. Cascade plot status update (best-effort)
  const plotId = current?.plot_id;
  if (plotId && ['completed', 'failed'].includes(newStatus)) {
    const otherActive = this.plantings.filter(
      p => p.plot_id === plotId &&
           p.$id !== plantingId &&
           ['planted', 'growing', 'harvesting'].includes(p.status?.toLowerCase())
    );
    if (otherActive.length === 0) {
      try {
        await this.updatePlot(plotId, { status: 'Fallow' });
      } catch (err) {
        console.error('Plot status cascade failed (non-blocking):', err);
      }
    }
  }

  return result;
},
```

### New Component: `PlantingStatusWidget.vue`

Create `src/modules/farm/components/PlantingStatusWidget.vue`. Reads from `farmStore.plantings` (computed). Uses `q-card` with colored `q-badge` or tile layout. Navigates to `/farm/plantings` on title click.

### New Dialog Component: `UpdateStatusDialog.vue`

Create `src/modules/farm/components/UpdateStatusDialog.vue`. Accepts props: `plantingId`, `currentStatus`. Emits `updated` on success. Uses `q-dialog` + `q-card` pattern. Shared between `PlantingDetailPage.vue` and `PlantingsListPage.vue`.

### New Route

Add to `src/modules/farm/router.js`:

```javascript
{
  path: 'farm/plantings/:id/edit',
  name: 'farm-planting-edit',
  component: () => import('./pages/PlantingEditPage.vue'),
  meta: {
    requiresAuth: true,
    requiresPermission: 'farm:write',
  },
},
```

### Failure Reason Parsing (Display)

On `PlantingDetailPage.vue`, when status is `failed`, parse the prefix from `notes`:

```javascript
const failureInfo = computed(() => {
  if (planting.value?.status !== 'failed') return null;
  const notes = planting.value?.notes || '';
  const match = notes.match(/^\[FAILURE:\s*([^\]]+)\](.*?)(\n|$)/s);
  if (!match) return { reason: 'Unknown', notes: notes };
  return {
    reason: match[1].trim(),
    additionalNotes: match[2].trim(),
    remainingNotes: notes.replace(match[0], '').trim(),
  };
});
```

### Files to Create

| File                                                   | Purpose                     |
| ------------------------------------------------------ | --------------------------- |
| `src/modules/farm/components/UpdateStatusDialog.vue`   | Shared status update dialog |
| `src/modules/farm/components/PlantingStatusWidget.vue` | Dashboard widget            |
| `src/modules/farm/pages/PlantingEditPage.vue`          | Edit form (limited fields)  |

### Files to Modify

| File                                            | Change                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/modules/farm/stores/farm-store.js`         | Add `updatePlantingStatus` action                                            |
| `src/modules/farm/pages/PlantingDetailPage.vue` | Wire "Update Status" button, "Edit" button, progress section, failure banner |
| `src/modules/farm/pages/PlantingsListPage.vue`  | Add Actions column with "Update Status", stat summary row                    |
| `src/modules/farm/pages/FarmDashboardPage.vue`  | Replace placeholder widget with `PlantingStatusWidget` + harvest alert cards |
| `src/modules/farm/router.js`                    | Add `/farm/plantings/:id/edit` route                                         |

---

## Concerns and Deferred Items

### ⚠️ Concern 1: `resident_id` Exists in DB but Not Loaded in Auth State (Crop Manager Scoping)

The `users` table DOES have a `resident_id` oneToOne relationship to `residents`, defined in `server/scripts/setup-appwrite.js`. However, `auth-store.js` does not fetch or expose the user's linked `resident_id` after login — only `email`, `name`, and `role_ids` are loaded into store state.

**Impact on this story:** Crop Manager plot-level scoping (restrict updates to plots where `plots.crop_manager_id === authStore.user.resident_id`) requires:

1. Loading the `users` table row after login and storing `resident_id` in `auth-store.js`
2. Passing `resident_id` into the permission check logic in `usePermissions.js`

**Decision for Story 3.4:** Crop Manager role is granted the same `farm:write` permission as Farm Manager. No plot-level filtering is applied.

**Recommendation for resolution:** In `auth-store.js`, after `fetchUserRoles()`, fetch the user's row from the `users` table and store `resident_id`. Expose it as `authStore.linkedResidentId`. Then in `farm-store.js`, filter allowed plots by matching `crop_manager_id`. Document the full implementation plan in `POST-MVP.md`.

### ⚠️ Concern 2: Status Change History Deferred

The epics spec calls for displaying "status change history" on the planting detail page. There is no `planting_status_history` table in the DB schema. The `notes` field prefix approach used for failure reason is a workaround for the failure case, but is not a general-purpose audit log.

**Decision for Story 3.4:** Status change history tracking and display are **deferred to POST-MVP**. The detail page will show only the **current status** with the progress display (AC7). Add to `docs/POST-MVP.md`.

---

## Testing Checklist

### Unit Tests

- [ ] `updatePlantingStatus` action: valid transitions succeed, invalid transitions return error without API call
- [ ] `updatePlantingStatus` with `failed` status: notes prefix formatted correctly, with and without additional notes
- [ ] Plot cascade: `completed` with no other active plantings → plot set to Fallow
- [ ] Plot cascade: `completed` with other active plantings → plot stays Active
- [ ] Progress bar calculation: days since planting, days until harvest, percentage capped at 100

### Integration Tests

- [ ] Full lifecycle: `planted` → `growing` → `harvesting` → `completed` with plot going Fallow after last completion
- [ ] Failure path: any active status → `failed` with reason → plot goes Fallow
- [ ] Edit planting: cost fields update, Inputs Cost remains unchanged
- [ ] Invalid transition rejected (e.g., `planted` → `completed` directly)

### E2E Tests

- [ ] User journey: Open planting detail → click Update Status → select Growing → save → badge updates on page
- [ ] User journey: Mark planting Failed (Drought) → plot status changes to Fallow on plot detail page
- [ ] Dashboard shows correct counts in Planting Status widget after status change
- [ ] Overdue harvest appears in dashboard alert when `expected_harvest_date` is in the past
- [ ] Edit form: update labor cost → verify on detail page after save

### Permission Tests

- [ ] Farm Manager can update status for any planting
- [ ] Crop Manager (same `farm:write`) can update status for any planting (MVP — no plot scoping)
- [ ] User without `farm:write` does not see "Update Status" or "Edit" buttons

---

## Deferred Integrations

| Feature                                      | Deferred To | Notes                                                            |
| -------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| Status change history / audit log            | POST-MVP    | Requires `planting_status_history` table in DB schema            |
| Crop Manager plot-level scoping              | POST-MVP    | Requires `resident_id` on `users` table + auth-store integration |
| Calendar event on status changes             | Story 5.1   | Calendar module not yet implemented                              |
| "Record Harvest" button on Harvesting status | Story 3.5   | Harvest recording not yet implemented                            |

---

## Dependencies on Future Stories

| This Story          | Depends On    | Future Stories Depend On This                                                                              |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| 3.4 Status Tracking | 3.1, 3.2, 3.3 | 3.5 Harvest Recording (uses `harvesting` status), 3.9 Profitability (uses `completed` status to aggregate) |

---

## Open Issues / TODOs

- [ ] **TODO-1**: Load `resident_id` from the `users` table row into `auth-store.js` after login to enable Crop Manager plot scoping in a future story. Also sync `appwrite.config.json` to match `setup-appwrite.js` (currently out of sync — `resident_id` is missing from the config file).
- [ ] **TODO-2**: Add `planting_status_history` table to DB schema for proper audit trail (POST-MVP)
- [ ] **TODO-3**: Add `failure_reason` as a dedicated column on `plantings` table (Post-MVP) — for now, prefix in `notes`
- [ ] **TODO-4**: When Story 3.5 is implemented, add a "Record Harvest" button shortcut that appears when status is `harvesting`

---

## Sign-off

- [x] Story reviewed and approved by Product Owner
- [x] Technical approach validated (especially status transition rules and plot cascade logic)
- [x] Concern 1 (Crop Manager scoping) acknowledged — MVP simplification accepted
- [x] Concern 2 (Status history) acknowledged — POST-MVP deferral accepted
- [x] Dependencies confirmed available (Stories 3.1, 3.2, 3.3 completed)
- [x] Estimated effort: 4–6 hours

---

_Last Updated: 2026-04-21_  
_Story Template Version: 1.0_  
_Status: Implemented_
