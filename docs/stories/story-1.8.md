# Story 1.8: Village Configuration and Default Settings

Status: ready-for-dev

## Story

As a **System Administrator**,
I want to **configure core village information and default settings**,
so that **the platform reflects local realities, enforces correct financial metadata, and downstream modules inherit authoritative configuration values**. [Source: docs/epics.md#188-205]

## Requirements Context Summary

- Epic 1 Story 1.8 defines the village configuration scope: Appwrite `village_settings` table, admin-only editing UI, council member management, and currency/timezone propagation. [Source: docs/epics.md#188-205]
- PRD cross-cutting requirement FR-16 mandates a first-time setup wizard that loads or initializes configuration, toggles sample data mode, and enforces destructive wipe confirmation. [Source: docs/PRD.md#253-258]
- Tech Spec Epic 1 maps Village Configuration to `src/pages/settings/VillageSettingsPage.vue` with a dedicated Pinia store and single-row Appwrite collection guarded by RBAC. [Source: docs/tech-spec-epic-1.md#42-98]
- Architecture requires normalized schema, Appwrite Databases API, `useErrorHandler` for mutations, `validateForm` for settings validation, and SSR-compatible environment binding for currency/timezone. [Source: docs/architecture.md#295-735]
- Prior story learnings (1.7) highlighted reuse of RBAC guards, useErrorHandler patterns, and Dexie-aware synchronization for admin-only operations. [Source: docs/stories/story-1.7.md#55-82]
- UX specification aligns settings navigation under Admin menus with responsive layout and accessibility standards delivered earlier in the epic. [Source: docs/ux-specification.md#132-274]

## Acceptance Criteria

1. Appwrite `village_settings` collection exists with required fields: `village_name`, `address`, `established_date`, `default_currency`, `currency_symbol`, `timezone`, `country_code`, `is_using_sample_data`, `council_members[]`, `modules_enabled[]`, `$updatedAt`. [Source: docs/epics.md#194][Source: docs/tech-spec-epic-1.md#60-67]
2. Village Settings page is reachable from the Admin menu and respects RBAC so only System Administrator can access edit mode; other roles see read-only view. [Source: docs/epics.md#195][Source: docs/architecture.md#295-321]
3. UI sections are organized as Basic Information, Financial Settings, System Settings, and Council Members with inline validation using `validateForm`. [Source: docs/epics.md#196][Source: docs/architecture.md#575-730]
4. Council Members subsection supports add/edit/remove operations storing `name`, `position`, and `contact` fields within `council_members[]`, preserving audit metadata. [Source: docs/epics.md#197]
5. First-time setup wizard includes a village configuration step that populates defaults, toggles between sample and production modes, and writes the Appwrite record. [Source: docs/epics.md#198][Source: docs/PRD.md#253-258]
6. Village name surfaces in MainLayout header, dashboard hero, and exported reports by referencing the settings store. [Source: docs/epics.md#199][Source: docs/architecture.md#49-76]
7. Financial modules consume `default_currency` and `currency_symbol` for formatting, ensuring consistency across finance dashboards and transactions. [Source: docs/epics.md#200][Source: docs/tech-spec-epic-1.md#140-154]
8. Settings page shows "Last Updated" timestamp sourced from `$updatedAt`, adjusted to configured timezone using `date-fns`. [Source: docs/epics.md#201][Source: docs/architecture.md#969-1021]
9. RBAC enforces edit permissions for System Administrator while Village Head and other roles have read-only access; unauthorized users see permission warnings. [Source: docs/epics.md#202]
10. Audit and offline behavior: useErrorHandler logs context, offline queue stores mutations when offline, and Dexie sync replays changes post-reconnect. [Source: docs/architecture.md#324-395]

## Tasks / Subtasks

- [ ] **Task 1: Provision village settings backend (AC: 1,5)**
  - [x] Create/verify Appwrite `village_settings` collection with field schema, indexes, and permissions restricting writes to System Administrator. [Source: docs/epics.md#194][Source: docs/tech-spec-epic-1.md#60-67]
  - [x] Seed single row $id=`settings_root` with defaults and sample flag for setup wizard integration. [Source: docs/PRD.md#253-258]
- [ ] **Task 2: Implement Pinia settings store (AC: 2,5,7,10)**
  - [ ] Add `src/stores/settings-store.js` with load/update actions, caching, offline queue integration, and currency/timezone helpers. [Source: docs/tech-spec-epic-1.md#42-98]
  - [ ] Expose computed getters for formatted currency, timezone-aware timestamps, and council member list. [Source: docs/architecture.md#969-1045]
- [ ] **Task 3: Build Village Settings page UI (AC: 2,3,4,8,9)**
  - [ ] Create `src/pages/settings/VillageSettingsPage.vue` with sectioned layout, `QForm`, and `validateForm` rules. [Source: docs/epics.md#195-203]
  - [ ] Implement council member CRUD subcomponent with reorder support and `q-dialog` confirmation for deletes. [Source: docs/epics.md#197]
- [ ] **Task 4: Integrate configuration into shell and modules (AC: 6,7)**
  - [ ] Update `MainLayout.vue`, dashboard header, and finance formatting utilities to consume settings store values. [Source: docs/epics.md#199-200]
  - [ ] Adjust export/report generators to include village name and currency symbol. [Source: docs/epics.md#199-200]
- [ ] **Task 5: Extend setup wizard and offline handling (AC: 5,10)**
  - [ ] Add configuration step to `SetupWizard.vue` including sample data toggle and validation. [Source: docs/PRD.md#253-258]
  - [ ] Ensure offline mutation queue covers settings updates with useErrorHandler logging. [Source: docs/architecture.md#324-395]
- [ ] **Task 6: Verification & documentation (AC: 8-10)**
  - [ ] Document manual test checklist (RBAC scenarios, timezone formatting, currency propagation, offline edit retry). [Source: docs/PRD.md#288-311]
  - [ ] Update `docs/testing.md` and change log with configuration module coverage. [Source: docs/architecture.md#1185-1192]

## Dev Notes

- Leverage existing SSR boot patterns to preload village settings before rendering header components. [Source: docs/architecture.md#49-76]
- Use `date-fns` utilities for timezone-aware display (`formatDateTime` helper). [Source: docs/architecture.md#969-1045]
- Reuse `useErrorHandler` and `useOffline` composables to maintain consistency with previous stories. [Source: docs/architecture.md#324-395][Source: docs/architecture.md#575-730]
- Align settings store naming with camelCase conventions and ensure `useSettingsStore()` is singleton providing live updates. [Source: docs/tech-spec-epic-1.md#42-100]
- Enforce admin-only edit routes via `requiresPermission: 'settings:write'` metadata and guard in router. [Source: docs/architecture.md#295-321]

### Project Structure Notes

- Add settings page under `src/pages/settings/` and council member components under `src/components/settings/`. [Source: docs/architecture.md#49-76]
- Update router to include `/settings/village` path, nested under admin navigation. [Source: docs/epics.md#195]
- Document Appwrite collection definition in `docs/architecture.md` appendix if changes occur. [Source: docs/architecture.md#846-959]

### References

- docs/epics.md#188-205
- docs/PRD.md#253-258
- docs/tech-spec-epic-1.md#42-154
- docs/architecture.md#295-1045
- docs/stories/story-1.7.md#55-82

## Dev Agent Record

### Context Reference

- docs/stories/story-context-1.8.xml (generated 2025-10-31)

### Agent Model Used

Cascade SM (2025-10-31)

### Debug Log References

### Completion Notes List

### File List
