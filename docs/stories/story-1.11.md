# Story 1.11: User Profile and Storage Quota Display

Status: ready-for-dev

## Story

As a **village user**,
I want to view my profile information and storage quota,
so that I understand my role and available storage space. [Source: docs/epics.md#246-248]

## Requirements Context Summary

- Epic 1 Story 1.11 defines user profile page scope: full name, email, assigned roles, storage quota based on primary role, current storage usage (placeholder), storage usage progress bar, \"Change Password\" button (functionality deferred to Epic 2), message \"Storage functionality coming soon\", mobile-responsive layout. [Source: docs/epics.md#246-259]
- Story 1.4 implemented RBAC foundation with multi-role assignment and role-based permission checking. [Source: docs/epics.md#107-123]
- Story 1.5 implemented dashboard framework with role-appropriate navigation and user menu displaying current user name and role(s). [Source: docs/epics.md#125-143]
- PRD FR-1 specifies residents management with role-based access control where permissions are the union of all assigned roles. [Source: docs/PRD.md#92-97]
- PRD NFR-3 mandates performance on low-end devices with page load times not exceeding 3 seconds on 3G connections, responsive on screens 320px-1920px. [Source: docs/PRD.md#285-287]
- PRD NFR-11 requires mobile-responsive design with optimal experience across desktop (1920px+), tablet (768px-1024px), and mobile (320px-767px), touch targets minimum 44px. [Source: docs/PRD.md#310-311]
- UX Specification Section 1.3 Design Principles mandates clarity over complexity, visual hierarchy over text, and mobile-first responsive design. [Source: docs/ux-specification.md#95-125]
- Architecture Section 2.1 mandates Vue 3 `<script setup>` syntax, Quasar Framework components, Pinia stores for state management. [Source: docs/architecture.md#65-82]
- Architecture Section 5 establishes error handling pattern using `useErrorHandler` composable for consistent, context-aware error handling. [Source: docs/architecture.md#576-736]
- Future Epic 5 Story 5.3 will implement full cloud storage functionality with role-based quotas and file management. [Source: docs/epics.md#786-924]
- User authentication state is managed by auth store (Story 1.3), providing current user session and profile information. [Source: docs/stories/story-1.10.md#reference]

## Acceptance Criteria

1. User menu in top navigation includes \"My Profile\" link. [Source: docs/epics.md#252]
2. Profile page displays: full name, email, assigned roles (list format if multi-role), storage quota based on primary role, current storage usage (placeholder: \"Calculating...\"), storage usage progress bar (visual representation). [Source: docs/epics.md#253]
3. Profile page shows message: \"Storage functionality coming soon\" with informational styling (info color, icon). [Source: docs/epics.md#254]
4. Profile page includes \"Change Password\" button (disabled state with tooltip: \"Functionality coming in Epic 2\"). [Source: docs/epics.md#255]
5. Profile loads within 1 second (NFR-3 compliance). [Source: docs/epics.md#256]
6. Mobile-responsive layout with proper touch targets (44px minimum) and vertical stacking on mobile devices (320px+). [Source: docs/epics.md#257, docs/PRD.md#310-311]

## Tasks / Subtasks

- [ ] **Task 1: Create ProfilePage component (AC: 1, 5, 6)**
  - [ ] Create `src/pages/profile/ProfilePage.vue` using Vue 3 `<script setup>` syntax
  - [ ] Add QPage wrapper with responsive layout (QCard for profile content)
  - [ ] Integrate `useAuthStore` to access current user session and profile
  - [ ] Implement loading state with QSkeleton for profile card
  - [ ] Add responsive layout using Quasar grid system (col-12 col-md-8 col-lg-6 centered)
  - [ ] Add route to router: `/profile` (protected route requiring authentication)

- [ ] **Task 2: Add \"My Profile\" link to user menu (AC: 1)**
  - [ ] Locate MainLayout.vue user menu component
  - [ ] Add \"My Profile\" menu item with person icon
  - [ ] Configure router-link navigation to `/profile`
  - [ ] Position above \"Settings\" and \"Logout\" in menu

- [ ] **Task 3: Display user profile information (AC: 2)**
  - [ ] Display full name from auth store: `authStore.user.name` with large text (text-h5)
  - [ ] Display email from auth store: `authStore.user.email` with secondary text (text-grey-7)
  - [ ] Display assigned roles: loop through `authStore.user.roles` array
  - [ ] Show roles as QChip components (color: secondary, size: small)
  - [ ] Handle single role vs. multi-role display (flex wrap for multiple chips)
  - [ ] Add section separator (QSeparator) between user info and storage section

- [ ] **Task 4: Implement storage quota display with placeholder (AC: 2, 3)**
  - [ ] Create computed property `storageQuota` that returns role-based quota:
    - System Administrator: 10 GB
    - Village Head: 5 GB
    - Farm Manager: 3 GB
    - Finance Manager: 5 GB
    - Head Teacher: 3 GB
    - Teacher: 2 GB
    - Crop Manager: 1 GB
    - Events Coordinator: 2 GB
    - Resident: 1 GB
    - Learner: 1 GB
    - Guest: 500 MB
  - [ ] Display storage quota with icon (cloud icon) and formatted text (e.g., \"5 GB available\")
  - [ ] Show current usage as placeholder: \"Calculating...\" with QSpinner (size: xs, inline)
  - [ ] Add QLinearProgress bar (value: 0, buffer: 0.1, color: info, rounded)
  - [ ] Display storage info message: QBanner (dense, inline-actions, color: info) with message \"Storage functionality coming soon. Full file management will be available in Epic 5.\"

- [ ] **Task 5: Add \"Change Password\" button (disabled state) (AC: 4)**
  - [ ] Add \"Change Password\" button with QBtn (outline, color: primary, icon: lock)
  - [ ] Set disabled attribute to true
  - [ ] Add QTooltip to button: \"Password change functionality will be available in Epic 2\"
  - [ ] Position button at bottom of profile card with proper spacing (q-mt-md)

- [ ] **Task 6: Implement role-based quota logic (AC: 2)**
  - [ ] Create helper function `getRoleQuota(roleName)` that maps role to storage quota in GB
  - [ ] Determine user's \"primary role\" logic: use highest quota role
  - [ ] Format quota for display using helper function (convert bytes to GB/MB for readability)
  - [ ] Add unit tests for quota calculation (deferred to Epic 2 testing framework)

- [ ] **Task 7: Ensure responsive design compliance (AC: 6)**
  - [ ] Test layout on desktop (1920px): centered card with max-width constraint
  - [ ] Test layout on tablet (768px): full-width card with padding
  - [ ] Test layout on mobile (320px minimum): vertical stack, touch targets 44px minimum
  - [ ] Verify QBtn, QChip, and interactive elements meet touch target size
  - [ ] Ensure text remains readable on all screen sizes (no horizontal scrolling)

- [ ] **Task 8: Optimize page load performance (AC: 5)**
  - [ ] Use computed properties instead of methods for reactive data (no unnecessary re-renders)
  - [ ] Avoid heavy operations in template (pre-calculate in setup)
  - [ ] Use Quasar's built-in loading states (QSkeleton) for perceived performance
  - [ ] Test page load time: target \u003c1 second on fast connection, \u003c3 seconds on 3G (NFR-3)

## Dev Notes

- **Component Pattern**: Follow Story 1.10 pattern for page structure - use QPage wrapper, QCard for content, responsive grid classes (col-12 col-md-8 col-lg-6), center horizontally with `class="row justify-center"`. [Source: src/components/dashboard/CommunityOverviewWidget.vue, src/pages/dashboard/DashboardPage.vue]
- **Auth Store Integration**: Use `useAuthStore()` to access current user session. Auth store provides `user` object with `name`, `email`, `roles[]` properties based on Story 1.3 implementation. [Source: docs/epics.md#87-103]
- **Router Configuration**: Add protected route to `/src/router/routes.js` under authenticated routes group. Use route meta `requiresAuth: true` for route guard enforcement. [Source: docs/epics.md#98]
- **Storage Quotas by Role**: Quota values based on Epic 5 Story 5.3 planning (not yet implemented). Use placeholder logic for now - full enforcement will be in Epic 5. [Source: docs/epics.md#786-924]
- **QuasarFramework Components**: Use QPage, QCard, QCardSection, QChip, QLinearProgress, QBanner, QTooltip, QBtn, QSeparator, QIcon, QSkeleton. All components support responsive props and Material Design 3. [Source: docs/architecture.md#65-82]
- **Error Handling**: Use `useErrorHandler` composable if fetching additional profile data in future (currently using local auth store, no async fetch needed). [Source: docs/architecture.md#576-736]
- **Responsive Classes**: Quasar grid system: `col-12` (mobile), `col-md-8` (tablet), `col-lg-6` (desktop). Use `row`, `justify-center`, `q-pa-md`, `q-gutter-md` for spacing. [Source: docs/ux-specification.md#642-645]
- **SSR Hydration**: No client-only rendering needed for this page - all data from auth store is available on both server and client (authenticated user data). No `isClient` check required. [Source: docs/stories/story-1.10.md#170-173]

### Learnings from Previous Story

**From Story 1.10 (Status: done)**

- **SSR Hydration Handling**: Story 1.10 identified and fixed hydration mismatches using `isClient` ref pattern. However, for this story, no client-only rendering is needed because profile data comes from auth store (available on both server and client for authenticated users). [Source: docs/stories/story-1.10.md#170-173]
- **Responsive Grid Pattern Established**: Use `col-12 col-sm-6` or `col-12 col-md-8 col-lg-6` classes for responsive layout. Dashboard widgets use this pattern successfully. [Source: docs/stories/story-1.10.md#206-207]
- **Quasar Component Patterns**: QCard wrapper, QSkeleton for loading states, QBanner for informational messages, QChip for tags/badges - all patterns established and working well. [Source: docs/stories/story-1.10.md#196-209]
- **Vue 3 `<script setup>` Syntax**: All new components use Composition API with `<script setup>` - continue this pattern for consistency. [Source: docs/stories/story-1.10.md#237]
- **date-fns Integration**: Story 1.10 successfully integrated date-fns for relative time formatting. Not needed for this story but available if needed. [Source: docs/stories/story-1.10.md#245]
- **Empty State Patterns**: Section-specific empty states with QIcon + text message work well for UX. Consider for \"no roles assigned\" edge case (unlikely but defensive programming). [Source: docs/stories/story-1.10.md#209]
- **Dashboard Widget Integration**: If adding profile widget to dashboard in future, follow Story 1.10 pattern for DashboardPage.vue integration. [Source: docs/stories/story-1.10.md#221]

### Project Structure Notes

- Add page component: `src/pages/profile/ProfilePage.vue`
- Modify router: `src/router/routes.js` (add `/profile` protected route)
- Modify layout: `src/layouts/MainLayout.vue` (add \"My Profile\" menu item)
- No new stores required - use existing `src/stores/auth-store.js` from Story 1.3
- No new composables required - all functionality uses existing auth store and Quasar components

### References

- docs/epics.md#246-259 (Story 1.11 definition)
- docs/epics.md#107-123 (Story 1.4: RBAC Foundation)
- docs/epics.md#125-143 (Story 1.5: Dashboard Framework)
- docs/PRD.md#92-97 (FR-1: Residents Management with RBAC)
- docs/PRD.md#285-287 (NFR-3: Performance on Low-End Devices)
- docs/PRD.md#310-311 (NFR-11: Mobile-Responsive Design)
- docs/ux-specification.md#95-125 (UX Design Principles)
- docs/architecture.md#65-82 (Technology Stack: Quasar + Vue 3)
- docs/architecture.md#576-736 (Error Handling Architecture)
- docs/stories/story-1.10.md (Previous story learnings and patterns)
- src/layouts/MainLayout.vue (User menu location)
- src/stores/auth-store.js (Authentication state management)

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

- [1-11-user-profile-and-storage-quota-display.context.xml](./1-11-user-profile-and-storage-quota-display.context.xml)

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
