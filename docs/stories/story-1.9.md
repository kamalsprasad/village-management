# Story 1.9: Sample Data Mode - Katete Model Village Seed Data

Status: drafted

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

1. First-time setup wizard appears automatically when `settingsStore.isFirstRun` is true (no `settings_root` document exists). Wizard is shown before any authenticated content and cannot be bypassed. [Source: docs/epics.md#214][Source: docs/ux-specification.md#554-556]
2. Wizard Welcome screen presents two large cards: "Explore with Sample Data" (prominent, recommended badge) and "Start Fresh with Real Data" (disabled with "Coming in future update" note). [Source: docs/epics.md#215-216][Source: docs/ux-specification.md#596-604]
3. Selecting "Explore with Sample Data" triggers client-side seeding that creates: Katete Model Village configuration, 2-3 sample council members, 5-6 households (mixed types), 15-20 residents with realistic names and relationships. [Source: docs/epics.md#217][Source: docs/PRD.md#254]
4. After successful seeding, `village_settings.is_using_sample_data` is set to `true` and user is redirected to dashboard. [Source: docs/epics.md#218][Source: docs/PRD.md#256]
5. Persistent banner displays on all authenticated pages when `isUsingSampleData` is true: yellow background, "🏷️ SAMPLE DATA MODE - Exploring Katete Model Village" text, and "Start Fresh - Wipe All Data" button. Banner is not dismissible. [Source: docs/epics.md#219-220][Source: docs/ux-specification.md#628-633]
6. Clicking "Start Fresh - Wipe All Data" opens confirmation dialog requiring user to type "DELETE EVERYTHING" exactly to enable the confirm button. [Source: docs/epics.md#221][Source: docs/PRD.md#258]
7. Confirmed wipe triggers Appwrite Cloud Function that atomically deletes all residents, households, and resets village_settings to initial state. Function verifies caller has System Administrator permission. [Source: docs/epics.md#222][Source: docs/tech-spec-epic-1.md#79]
8. Successful wipe clears all Pinia stores, sets `isFirstRun` to true, and redirects to setup wizard. [Source: docs/epics.md#223]
9. Sample data includes realistic Zambian names, dates spanning reasonable ranges, and proper household-resident relationships. Data should feel authentic for demonstration purposes. [Source: docs/epics.md#224]

## Tasks / Subtasks

- [ ] **Task 1: Create Setup Wizard page and routing (AC: 1, 2)**
  - [ ] Create `src/pages/setup/SetupWizard.vue` with Welcome screen layout using two QCard components
  - [ ] Add "Explore with Sample Data" card with recommended badge, description, and "Load Sample Data" button
  - [ ] Add "Start Fresh with Real Data" card with disabled state and "Coming in future update" note
  - [ ] Add route `/setup` with no auth requirement (wizard handles its own flow)
  - [ ] Update boot file or router guard to redirect to `/setup` when `isFirstRun` is true
  - [ ] Ensure wizard cannot be bypassed by direct URL navigation when in first-run state

- [ ] **Task 2: Implement sample data seeding logic (AC: 3, 4, 9)**
  - [ ] Create `src/composables/useSampleData.js` with `seedSampleData()` function
  - [ ] Define Katete Model Village configuration data (name, address, timezone, currency, council members)
  - [ ] Define 5-6 sample households with varied types (SingleFamily, MultiFamily, Dormitory, AdminBuilding)
  - [ ] Define 15-20 sample residents with realistic Zambian names, DOBs, genders, and household assignments
  - [ ] Implement progressive seeding: settings → households → residents (respecting relationships)
  - [ ] Show loading indicator with progress during seeding
  - [ ] Set `is_using_sample_data: true` after successful seeding
  - [ ] Handle errors gracefully with rollback messaging via `useErrorHandler`

- [ ] **Task 3: Create Sample Data Banner component (AC: 5)**
  - [ ] Create `src/components/layout/SampleDataBanner.vue` with yellow background styling
  - [ ] Display "🏷️ SAMPLE DATA MODE - Exploring Katete Model Village" text
  - [ ] Add "Start Fresh - Wipe All Data" button (right-aligned, negative color)
  - [ ] Integrate banner into `MainLayout.vue` above header, conditionally rendered when `isUsingSampleData`
  - [ ] Ensure banner is not dismissible and persists across all pages

- [ ] **Task 4: Implement wipe confirmation dialog (AC: 6)**
  - [ ] Create `src/components/dialogs/WipeDataDialog.vue` with QDialog
  - [ ] Add warning text explaining destructive action
  - [ ] Add text input requiring exact match of "DELETE EVERYTHING"
  - [ ] Disable confirm button until input matches exactly (case-sensitive)
  - [ ] Style dialog with negative/warning colors to emphasize destructive nature

- [ ] **Task 5: Create Appwrite Cloud Function for atomic wipe (AC: 7)**
  - [ ] Create `server/functions/wipeAllData/` folder structure following existing patterns
  - [ ] Implement function that deletes all documents from: residents, households collections
  - [ ] Reset village_settings to default values with `is_using_sample_data: false`
  - [ ] Verify caller has System Administrator permission inside function
  - [ ] Return success/failure response with appropriate error messages
  - [ ] Add `VITE_APPWRITE_FUNCTION_WIPE_DATA` to `.env.example`
  - [ ] Document deployment instructions in `appwrite_setup/FUNCTION_DEPLOYMENT.md`

- [ ] **Task 6: Integrate wipe flow with client (AC: 7, 8)**
  - [ ] Add `wipeAllData()` action to settings-store that calls the cloud function
  - [ ] On successful wipe: reset all Pinia stores (settings, residents, households)
  - [ ] Set `isFirstRun: true` and redirect to `/setup`
  - [ ] Handle wipe errors with user-friendly messaging
  - [ ] Add loading state during wipe operation

- [ ] **Task 7: Create fallback seed script for developers (AC: 3, 9)**
  - [ ] Create `server/scripts/seed-sample-data.js` following existing seed script patterns
  - [ ] Include same sample data as client-side seeding for consistency
  - [ ] Add `npm run seed:sample` script to package.json
  - [ ] Document usage in README or appwrite_setup docs

- [ ] **Task 8: Testing and documentation (AC: all)**
  - [ ] Test complete flow: first run → wizard → seed → banner → wipe → wizard
  - [ ] Test wizard cannot be bypassed when in first-run state
  - [ ] Test wipe confirmation requires exact phrase match
  - [ ] Test wipe function permission check (non-admin should fail)
  - [ ] Update `docs/testing.md` with Story 1.9 test cases
  - [ ] Update README with sample data mode documentation

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

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Cascade SM (2025-11-25)

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                                                         | Author     |
| ---------- | -------------------------------------------------------------- | ---------- |
| 2025-11-25 | Story drafted from epics, PRD, tech-spec, and UX specification | Cascade SM |
