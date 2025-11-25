# Story 1.9: Sample Data Mode - Katete Model Village Seed Data

Status: review

## Story

As a **potential adopter**,
I want to **explore the system with realistic sample data**,
so that **I can evaluate the platform's capabilities before committing to production use**. [Source: docs/epics.md#209-225]

## Requirements Context Summary

- Epic 1 Story 1.9 defines the sample data mode scope: first-time setup wizard, Katete Model Village dataset (15-20 residents, 5-6 households, council members), persistent banner, and destructive wipe flow with confirmation phrase. [Source: docs/epics.md#209-225]
- PRD FR-16 mandates the setup wizard presents "Explore with Sample Data" vs "Start Fresh with Real Data" options, sets `is_using_sample_data` flag, displays persistent banner, and supports data wipe with "DELETE EVERYTHING" confirmation. [Source: docs/PRD.md#251-258]
- Tech Spec Epic 1 maps Sample Data Wizard to `src/pages/setup/SetupWizard.vue` and `src/pages/setup/SampleDataBanner.vue`, with Appwrite function/seed scripts for dataset management. [Source: docs/tech-spec-epic-1.md#53-54, #79, #94]
- UX specification Flow 3 details the setup wizard screens: Welcome with two cards, sample data loading, persistent yellow banner, and wipe confirmation dialog requiring typed phrase. [Source: docs/ux-specification.md#550-639]
- Story 1.8 implemented `is_using_sample_data` field in village_settings, `isUsingSampleData` getter in settings-store, and `isFirstRun` detection in boot file - all ready for wizard integration. [Source: docs/stories/story-1.8.md#88-104]
- Architecture requires Vue 3 `<script setup>` syntax, Pinia stores, `useErrorHandler` composable, and Appwrite Functions for server-side operations. [Source: docs/architecture.md#575-730]

## Acceptance Criteria

1. First-time setup wizard appears automatically when `settingsStore.isFirstRun` is true (no `settings_root` row exists). Wizard is shown before any authenticated content and cannot be bypassed. [Source: docs/epics.md#214][Source: docs/ux-specification.md#554-556]
2. Wizard Welcome screen presents two large cards: "Explore with Sample Data" (prominent, recommended badge) and "Start Fresh with Real Data" (disabled with "Coming in future update" note). [Source: docs/epics.md#215-216][Source: docs/ux-specification.md#596-604]
3. Selecting "Explore with Sample Data" triggers client-side seeding that creates: Katete Model Village configuration, 2-3 sample council members, 5-6 households (mixed types), 15-20 residents with realistic names and relationships. [Source: docs/epics.md#217][Source: docs/PRD.md#254]
4. After successful seeding, `village_settings.is_using_sample_data` is set to `true` and user is redirected to dashboard. [Source: docs/epics.md#218][Source: docs/PRD.md#256]
5. Persistent banner displays on all authenticated pages when `isUsingSampleData` is true: yellow background, "🏷️ SAMPLE DATA MODE - Exploring Katete Model Village" text, and "Start Fresh - Wipe All Data" button. Banner is not dismissible. [Source: docs/epics.md#219-220][Source: docs/ux-specification.md#628-633]
6. Clicking "Start Fresh - Wipe All Data" opens confirmation dialog requiring user to type "DELETE EVERYTHING" exactly to enable the confirm button. [Source: docs/epics.md#221][Source: docs/PRD.md#258]
7. Confirmed wipe triggers Appwrite Cloud Function that atomically deletes all residents, households, and resets village_settings to initial state. Function verifies caller has System Administrator permission. [Source: docs/epics.md#222][Source: docs/tech-spec-epic-1.md#79]
8. Successful wipe clears all Pinia stores, sets `isFirstRun` to true, and redirects to setup wizard. [Source: docs/epics.md#223]
9. Sample data includes realistic Zambian names, dates spanning reasonable ranges, and proper household-resident relationships. Data should feel authentic for demonstration purposes. [Source: docs/epics.md#224]

## Tasks / Subtasks

- [x] **Task 1: Create Setup Wizard page and routing (AC: 1, 2)**
  - [x] Create `src/pages/setup/SetupWizard.vue` with Welcome screen layout using two QCard components
  - [x] Add "Explore with Sample Data" card with recommended badge, description, and "Load Sample Data" button
  - [x] Add "Start Fresh with Real Data" card with disabled state and "Coming in future update" note
  - [x] Add route `/setup` with no auth requirement (wizard handles its own flow)
  - [x] Update boot file or router guard to redirect to `/setup` when `isFirstRun` is true
  - [x] Ensure wizard cannot be bypassed by direct URL navigation when in first-run state

- [x] **Task 2: Implement sample data seeding logic (AC: 3, 4, 9)**
  - [x] Create `src/composables/useSampleData.js` with `seedSampleData()` function
  - [x] Define Katete Model Village configuration data (name, address, timezone, currency, council members)
  - [x] Define 5-6 sample households with varied types (SingleFamily, MultiFamily, Dormitory, AdminBuilding)
  - [x] Define 15-20 sample residents with realistic Zambian names, DOBs, genders, and household assignments
  - [x] Implement progressive seeding: settings → households → residents (respecting relationships)
  - [x] Show loading indicator with progress during seeding
  - [x] Set `is_using_sample_data: true` after successful seeding
  - [x] Handle errors gracefully with rollback messaging via `useErrorHandler`

- [x] **Task 3: Create Sample Data Banner component (AC: 5)**
  - [x] Create `src/components/layout/SampleDataBanner.vue` with yellow background styling
  - [x] Display "🏷️ SAMPLE DATA MODE - Exploring Katete Model Village" text
  - [x] Add "Start Fresh - Wipe All Data" button (right-aligned, negative color)
  - [x] Integrate banner into `MainLayout.vue` above header, conditionally rendered when `isUsingSampleData`
  - [x] Ensure banner is not dismissible and persists across all pages

- [x] **Task 4: Implement wipe confirmation dialog (AC: 6)**
  - [x] Create `src/components/dialogs/WipeDataDialog.vue` with QDialog
  - [x] Add warning text explaining destructive action
  - [x] Add text input requiring exact match of "DELETE EVERYTHING"
  - [x] Disable confirm button until input matches exactly (case-sensitive)
  - [x] Style dialog with negative/warning colors to emphasize destructive nature

- [x] **Task 5: Create Appwrite Cloud Function for atomic wipe (AC: 7)**
  - [x] Create `server/functions/wipeAllData/` folder structure following existing patterns
  - [x] Implement function that deletes all rows from: residents, households tables
  - [x] Reset village_settings to default values with `is_using_sample_data: false`
  - [x] Verify caller has System Administrator permission inside function
  - [x] Return success/failure response with appropriate error messages
  - [x] Add `VITE_APPWRITE_FUNCTION_WIPE_DATA` to `.env.example`
  - [x] Document deployment instructions in `appwrite_setup/FUNCTION_DEPLOYMENT.md`

- [x] **Task 6: Integrate wipe flow with client (AC: 7, 8)**
  - [x] Add `wipeAllData()` action to settings-store that calls the cloud function
  - [x] On successful wipe: reset all Pinia stores (settings, residents, households)
  - [x] Set `isFirstRun: true` and redirect to `/setup`
  - [x] Handle wipe errors with user-friendly messaging
  - [x] Add loading state during wipe operation

- [x] **Task 7: Create fallback seed script for developers (AC: 3, 9)**
  - [x] Create `server/scripts/seed-sample-data.js` following existing seed script patterns
  - [x] Include same sample data as client-side seeding for consistency
  - [x] Add `npm run seed:sample` script to package.json
  - [x] Document usage in README or appwrite_setup docs

- [x] **Task 8: Testing and documentation (AC: all)**
  - [x] Test complete flow: first run → wizard → seed → banner → wipe → wizard
  - [x] Test wizard cannot be bypassed when in first-run state
  - [x] Test wipe confirmation requires exact phrase match
  - [x] Test wipe function permission check (non-admin should fail)
  - [x] Update `docs/testing.md` with Story 1.9 test cases
  - [x] Update README with sample data mode documentation

## Dev Notes

- Leverage existing `isFirstRun` detection from `src/boot/settings.js` - no need to add new detection logic. [Source: docs/stories/story-1.8.md#94]
- The `isUsingSampleData` getter already exists in settings-store and can be used directly for banner visibility. [Source: src/stores/settings-store.js#107]
- Use existing Pinia store actions (`createResident`, `createHousehold`, `updateSettings`) for client-side seeding to maintain consistency with app patterns.
- Sample data should use realistic Zambian names (e.g., Banda, Phiri, Mwale, Tembo, Zulu, Mulenga) and Eastern Province context.
- The wipe cloud function must perform server-side permission verification - do not trust client-side permission checks for destructive operations.
- Follow existing cloud function pattern from `server/functions/Check Users Exist/` for folder structure and deployment approach.
- The "Start Fresh with Real Data" option is explicitly deferred to Epic 5 per PRD - show disabled card with explanation.

### Learnings from Previous Story

**From Story 1.8 (Status: done)**

- **Settings Store Ready**: `isUsingSampleData` getter and `isFirstRun` flag already implemented - use directly without modification. [Source: docs/stories/story-1.8.md#93-94]
- **Boot File Pattern**: Settings boot file handles first-run detection gracefully - wizard routing should integrate with this existing flow. [Source: src/boot/settings.js#24-27]
- **Council Members**: Council member management uses `council_member_ids` array linking to resident IDs - sample data should follow this pattern. [Source: docs/stories/story-1.8.md#97]
- **Validation Pattern**: Use `useErrorHandler.validateForm()` for any form validation in wizard. [Source: docs/stories/story-1.8.md#58]
- **Date Handling**: Established date normalization pattern exists in settings-store - reuse for sample data dates. [Source: src/stores/settings-store.js#249-261]

### Project Structure Notes

- Add setup pages under `src/pages/setup/` (new folder)
- Add banner component under `src/components/layout/` (new folder or existing components)
- Add wipe dialog under `src/components/dialogs/` (new folder)
- Add composable under `src/composables/useSampleData.js`
- Add cloud function under `server/functions/wipeAllData/`
- Add seed script under `server/scripts/seed-sample-data.js`

### References

- docs/epics.md#209-225
- docs/PRD.md#251-258
- docs/tech-spec-epic-1.md#53-54, #79, #94
- docs/ux-specification.md#550-639
- docs/stories/story-1.8.md#88-104
- docs/architecture.md#575-730
- src/stores/settings-store.js
- src/boot/settings.js

## Dev Agent Record

### Context Reference

- docs/stories/story-1.9.context.xml

### Agent Model Used

Cascade SM (2025-11-25)

### Debug Log References

Implementation decisions confirmed with user:

- Decision 1: Router navigation guard (Option A) for first-run redirect
- Decision 2: Use existing store actions (Option A) for sample data seeding
- Decision 3: Pass user ID, verify server-side (Option A) for wipe permission check

### Completion Notes List

- Created SetupWizard.vue with two-card layout, "Recommended" badge on sample data option, disabled "Start Fresh" card
- Implemented useSampleData.js composable with 6 households, 21 residents, 3 council members using realistic Zambian names
- Created SampleDataBanner.vue with yellow gradient, non-dismissible, integrated into MainLayout above header
- Created WipeDataDialog.vue with case-sensitive "DELETE EVERYTHING" confirmation
- Created wipeAllData Appwrite Cloud Function with server-side System Administrator permission verification
- Added wipeAllData() action to settings-store with store reset and redirect logic
- Created seed-sample-data.js developer script with npm run seed:sample command
- Updated router-guards.js with first-run redirect logic
- Updated testing.md with comprehensive Story 1.9 test cases
- Updated README.md with Sample Data Mode documentation
- All linting passed

### File List

**New Files:**

- src/pages/setup/SetupWizard.vue
- src/composables/useSampleData.js
- src/components/layout/SampleDataBanner.vue
- src/components/dialogs/WipeDataDialog.vue
- server/functions/wipeAllData/src/main.js
- server/functions/wipeAllData/package.json
- server/functions/wipeAllData/.gitignore
- server/functions/wipeAllData/README.md
- server/scripts/seed-sample-data.js

**Modified Files:**

- src/router/routes.js (added /setup route)
- src/boot/router-guards.js (added first-run redirect logic)
- src/layouts/MainLayout.vue (integrated SampleDataBanner)
- src/stores/settings-store.js (added wipeAllData action, imports)
- .env.example (added VITE_APPWRITE_FUNCTION_WIPE_DATA)
- package.json (added seed:sample script)
- appwrite_setup/FUNCTION_DEPLOYMENT.md (added wipeAllData deployment instructions)
- docs/testing.md (added Story 1.9 test cases)
- README.md (added Sample Data Mode documentation)
- docs/sprint-status.yaml (status updates)
- docs/stories/story-1.9.md (task completion, status)

## Change Log

| Date       | Change                                                                | Author     |
| ---------- | --------------------------------------------------------------------- | ---------- |
| 2025-11-25 | Story drafted from epics, PRD, tech-spec, and UX specification        | Cascade SM |
| 2025-11-25 | Story implementation completed - all 8 tasks done                     | Cascade SM |
| 2025-11-25 | UI Fix: Moved SampleDataBanner inside QHeader for correct positioning | Cascade SM |
