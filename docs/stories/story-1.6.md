# Story 1.6: Households Management CRUD Operations

Status: ready-for-dev

## Story

As a **village administrator**,
I want to create, view, update, and retire households with accurate occupant context,
so that the community structure remains organized and supports downstream resident and service workflows. [Source: docs/epics.md#146-159]

## Requirements Context Summary

- Epic 1 Story 1.6 defines the households list, creation form, detail view, dashboard widget, and deletion guard requirements. [Source: docs/epics.md#146-159]
- PRD mandates managing household types, occupant relationships, construction metadata, and module-dependent quotas to maintain village structure. [Source: docs/PRD.md#101-109]
- Architecture enforces a normalized Appwrite schema with indexed foreign keys (e.g., `residents.household_id`) and offline-aware caching for households data. [Source: docs/architecture.md#854-959]
- UX specification allocates dedicated list, creation, and detail flows for Households within the core navigation, subject to RBAC visibility. [Source: docs/ux-specification.md#132-274]
- Story 1.5 delivered RBAC-aware navigation, dashboards, and component patterns that the Households module must reuse. [Source: docs/stories/story-1.5.md#56-137]

## Acceptance Criteria

1. Households list page shows each household2s name, type, occupant count, and construction date. [Source: docs/epics.md#152-159]
2. "Add Household" form collects household name, type, construction date, bedrooms, bathrooms, and room/unit numbers. [Source: docs/epics.md#152-159]
3. Successful save creates the household record in Appwrite. [Source: docs/epics.md#152-155]
4. Household detail view displays metadata, lists occupants (initially empty), and prompts administrators to add residents. [Source: docs/epics.md#154-156]
5. Edit and delete actions are available with confirmation handling for destructive flows. [Source: docs/epics.md#155-156]
6. Household dashboard widget summarizes total households grouped by type. [Source: docs/epics.md#156-158]
7. Deletion is blocked when the household still has occupants assigned. [Source: docs/epics.md#156-159]

## Tasks / Subtasks

- [ ] **Task 1: Define households data layer (AC: 3,5,7)**
  - [x] Configure the Appwrite `households` table with required fields, indexes, and resident relationship, following normalized schema guidelines. [Source: docs/architecture.md#854-959]
  - [ ] Implement Pinia store/composable for households CRUD leveraging existing Appwrite client patterns. [Source: docs/architecture.md#293-321]
- [ ] **Task 2: Build households list experience (AC: 1,5)**
  - [ ] Create `HouseholdsListPage.vue` showing name, type, occupant count, and construction date, with action buttons for edit/delete. [Source: docs/ux-specification.md#132-239]
  - [ ] Wire RBAC-aware navigation/visibility using established permissions composables. [Source: docs/stories/story-1.5.md#56-137]
- [ ] **Task 3: Implement add/edit household form (AC: 2,3,5)**
  - [ ] Create reusable form component with validation for all required fields and error handling notifications. [Source: docs/architecture.md#575-737]
  - [ ] Connect submit flows to Appwrite via the store and surface success/failure feedback aligned with UX guidelines. [Source: docs/ux-specification.md#239-274]
- [ ] **Task 4: Build household detail view (AC: 4,7)**
  - [ ] Render household metadata, occupant list, and "Add residents" guidance when empty. [Source: docs/epics.md#154-156]
  - [ ] Prevent deletion when occupants exist by checking resident linkage prior to destructive action. [Source: docs/architecture.md#881-899]
- [ ] **Task 5: Add household dashboard widget (AC: 6)**
  - [ ] Create widget component summarizing households by type and integrate into the dashboard layout established in Story 1.5. [Source: docs/stories/story-1.5.md#126-147]
- [ ] **Task 6: Verification & documentation (AC: 1-7)**
  - [ ] Perform manual verification against each acceptance criterion and record outcomes in Dev Notes. [Source: docs/epics.md#152-159]
  - [ ] Update testing documentation with any household-specific test plans deferred to post-MVP. [Source: docs/stories/story-1.5.md#78-90]

## Dev Notes

### Architecture Patterns and Constraints

- Use Vue 3 `<script setup>` syntax, Quasar components, and centralized error handling per established coding standards. [Source: docs/architecture.md#293-737]
- Persist households through Appwrite REST SDK with offline queue compatibility and enforce normalized relationships for residents. [Source: docs/architecture.md#854-959]
- Surface feedback via the approved notification patterns (toast, dialog, banner) while respecting offline-state indicators. [Source: docs/ux-specification.md#239-274]

### Project Structure Notes

- Place new pages under `src/pages/households/`, shared components under `src/components/households/`, and stores/composables in their existing directories using camelCase naming. [Source: docs/architecture.md#49-76]
- Reuse Story 1.52s dashboard widget structure (`src/components/dashboard/`) when adding the households summary widget. [Source: docs/stories/story-1.5.md#167-176]
- Align navigation entries with the sidebar conventions introduced in Story 1.5 to maintain a single RBAC-controlled menu. [Source: docs/stories/story-1.5.md#56-137]

### Learnings from Previous Story

**From Story 1.5 (Status: done)**

- Leverage existing `usePermissions()` and router guard boot files to gate access instead of duplicating logic. [Source: docs/stories/story-1.5.md#56-137]
- Integrate the new households widget into the established dashboard layout and loading patterns (skeleton states, deferred fetch). [Source: docs/stories/story-1.5.md#126-147]
- Maintain documentation parity by updating testing references alongside functional work per prior story guidance. [Source: docs/stories/story-1.5.md#78-90]

### Testing Considerations

- Follow manual verification checklist for each acceptance criterion; automated tests remain deferred per MVP direction, but document future scenarios in `docs/testing.md`. [Source: docs/stories/story-1.5.md#78-90]

### References

- docs/epics.md#146-159
- docs/PRD.md#101-109
- docs/architecture.md#293-959
- docs/ux-specification.md#132-274
- docs/stories/story-1.5.md#56-176

## Dev Agent Record

### Context Reference

- docs/stories/story-context-1.6.xml

### Agent Model Used

Cascade SM (2025-10-30)

### Debug Log References

- Not yet implemented (story in drafted state)

### Completion Notes List

- Pending implementation

### File List

- Pending implementation
