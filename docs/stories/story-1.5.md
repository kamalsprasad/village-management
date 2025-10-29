# Story 1.5: Dashboard Framework and Layout

Status: drafted

## Story

As a **village administrator**,
I want a **role-aware dashboard layout with intuitive navigation**,
so that **I can quickly access the areas of the system relevant to my responsibilities**.

## Requirements Context Summary

- Epic 1 Story 1.5 defines the foundational dashboard shell, including top navigation, collapsible sidebar, responsive behavior, and placeholder widgets for upcoming modules. [Source: docs/epics.md#126-141]
- The dashboard must respect RBAC decisions so that navigation and widgets only surface modules aligned with the signed-in user's permissions. [Source: docs/stories/story-1.4.md#271-356]
- Dashboard widgets will eventually consume consolidated analytics via the GraphQL dashboard resolvers and caching model, so the layout must anticipate data-loading states and one-query hydration. [Source: docs/architecture.md#1551-2272]
- UX navigation guidelines require a collapsible sidebar (desktop), bottom navigation (mobile), prominent user profile access, and offline/sync indicators in the header. [Source: docs/ux-specification.md#236-305]
- Performance and accessibility NFRs mandate sub-2-second loads on 3G, responsive design from 320px to 1920px, and keyboard-friendly navigation. [Source: docs/PRD.md#288-314]

## Acceptance Criteria

1. Main layout includes top header, left sidebar navigation, and main content region wired into Quasar layout primitives. [Source: docs/epics.md#132-136]
2. Dashboard landing page renders placeholder widget slots for key modules (Upcoming Events, Quick Stats, Recent Activity). [Source: docs/epics.md#133-140]
3. Navigation menu items respect the user's permissions, showing only authorized modules based on RBAC utilities. [Source: docs/epics.md#133-138][Source: docs/stories/story-1.4.md#301-313]
4. Header user menu displays the authenticated user's name and active role badges. [Source: docs/epics.md#135-136]
5. Layout is responsive for desktop (1920px), tablet (768px), and mobile (320px) breakpoints with consistent usability. [Source: docs/epics.md#135-138][Source: docs/PRD.md#288-314]
6. Sidebar collapses into a hamburger-triggered drawer on tablet/mobile screens. [Source: docs/epics.md#135-138][Source: docs/ux-specification.md#236-275]
7. Dashboard hero greets the user with "Welcome back, [User Name]". [Source: docs/epics.md#137-139]
8. Placeholder widgets display section headers and loading states for Upcoming Events, Quick Stats, and Recent Activity. [Source: docs/epics.md#138-139][Source: docs/architecture.md#1551-1740]
9. Dashboard initial render completes within 2 seconds on a simulated 3G connection by minimizing blocking requests and leveraging skeleton states. [Source: docs/epics.md#139-140][Source: docs/PRD.md#288-299]

## Tasks / Subtasks

- [ ] **Task 1: Establish Layout Shell (AC: 1,7)**
  - [ ] Create/extend `src/layouts/MainLayout.vue` with `<q-layout>`, `<q-header>`, `<q-drawer>`, and `<q-page-container>` structure.
  - [ ] Wire greeting banner in dashboard page to pull `user.name` from auth store.
- [ ] **Task 2: Role-Aware Navigation (AC: 3,4,7)**
  - [ ] Integrate `usePermissions()` composable within layout navigation rendering.
  - [ ] Display user name and role chips in header dropdown using Pinia `auth-store` data.
- [ ] **Task 3: Responsive Behavior (AC: 5,6)**
  - [ ] Implement Quasar's breakpoint utilities to toggle drawer, and add hamburger button on tablet/mobile.
  - [ ] Add keyboard and screen-reader focus management for opening/closing the drawer.
- [ ] **Task 4: Dashboard Page Scaffolding (AC: 2,8)**
  - [ ] Build `src/pages/DashboardPage.vue` with placeholder widgets using `QCard` and skeleton loaders.
  - [ ] Add loading/error slots anticipating GraphQL hydration via `useDashboardData` composable.
- [ ] **Task 5: Performance Guardrails (AC: 5,9)**
  - [ ] Instrument lazy loading for heavy modules and defer GraphQL fetch within `onMounted`.
  - [ ] Add Vitest perf regression harness or scripted Lighthouse run targeting 3G profile.
- [ ] **Task 6: Verification Notes (AC: 3,5,6,8,9)**
  - [ ] Capture manual verification checklist results for navigation visibility, responsiveness, and performance budget.
  - [ ] Log that automated test creation is deferred until post-MVP per project direction.

## Dev Notes

### Architecture Patterns and Constraints

- Use Vue 3 `<script setup>` and Quasar layout components to align with mandated coding standards. [Source: docs/architecture.md#293-321]
- Dashboard widgets should consume cached GraphQL resolvers in future stories; keep loader UX and data contracts lightweight to plug into `useDashboardData`. [Source: docs/architecture.md#1551-2245]
- Navigation gating must reuse RBAC utilities and permission composables introduced in Story 1.4 to maintain a single source of truth. [Source: docs/stories/story-1.4.md#271-313]
- Maintain offline indicators and sync status placements reserved in header per UX specification; ensure placeholder elements dont obstruct them. [Source: docs/ux-specification.md#236-305]
- Enforce performance budget using skeleton states and deferred data fetching to satisfy 3G load constraints. [Source: docs/PRD.md#288-299]

### Learnings from Previous Story

**From Story 1.4 (Status: Done)**

- Reuse `usePermissions()` composable and `PermissionGuard.vue` to drive navigation and widget visibility instead of duplicating permission logic. [Source: docs/stories/story-1.4.md#301-312]
- Respect new router guard boot file (`src/boot/router-guards.js`) by ensuring dashboard route metadata specifies required permissions where applicable. [Source: docs/stories/story-1.4.md#294-305]
- Leverage `auth-store.js` enhancements (role fetching, storage quota helpers) for populating user menu details; avoid duplicating fetches. [Source: docs/stories/story-1.4.md#286-295]
- Incorporate documentation updates in `docs/testing.md` patterns when adding new test suites for dashboard behavior. [Source: docs/testing.md#220-335]

### Project Structure Notes

- Place dashboard page at `src/pages/dashboard/DashboardPage.vue` (new directory) to keep module pages organized; update router config to point `/` to this page. [Source: docs/architecture.md#59-60]
- Extend `src/layouts/MainLayout.vue` rather than introducing a new layout to preserve project conventions. [Source: docs/architecture.md#59-60]
- Register any new composables under `src/composables/` following camelCase naming, and ensure imports use existing alias mapping (`components/*`, `layouts/*`). [Source: docs/architecture.md#2685-2690]
- Update `quasar.config.js` only if additional boot files are required; reuse current boot pipeline. [Source: docs/stories/story-1.4.md#294-305]

### Testing Considerations

- Execute dashboard layout test suites outlined in `docs/testing.md` (component, integration, E2E, performance) once implementation stabilizes; testing is documented but intentionally deferred. [Source: docs/testing.md#Story 1.5: Dashboard Framework and Layout - Testing Requirements]

### References

- [Source: docs/epics.md#126-141]
- [Source: docs/PRD.md#288-314]
- [Source: docs/architecture.md#1551-2272]
- [Source: docs/ux-specification.md#236-305]
- [Source: docs/stories/story-1.4.md#271-356]
- [Source: docs/testing.md#220-335]
- [Source: docs/testing.md#Story 1.5: Dashboard Framework and Layout - Testing Requirements]

## Dev Agent Record

### Context Reference

### Key Findings

- Acceptance criteria map cleanly to tasks, and Dev Notes highlight reuse of RBAC utilities and dashboard GraphQL patterns for upcoming widgets.
- Added testing considerations ensure developers reference the centralized plan before sign-off.

### Action Items

- None.

### File List
