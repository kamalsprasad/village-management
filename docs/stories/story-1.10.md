# Story 1.10: Dashboard Widgets - Residents and Households Summary

Status: ready-for-dev

## Story

As a **village administrator**,
I want to see key statistics about residents and households on my dashboard,
so that I have quick visibility into community composition. [Source: docs/epics.md#229-243]

## Requirements Context Summary

- Epic 1 Story 1.10 defines the Community Overview widget scope: total residents count, total households count, households by type chart, recent additions, with real-time updates and responsive design. [Source: docs/epics.md#229-243]
- PRD FR-1 and FR-2 specify residents and households management as core modules requiring dashboard visibility. [Source: docs/PRD.md#92-106]
- PRD UX Principle #7 mandates role-based contextual dashboards showing only relevant information and actions for each user role. [Source: docs/PRD.md#649-651]
- PRD UX Principle #9 prioritizes data visualization over tables with charts and visual indicators for trends. [Source: docs/PRD.md#653-654]
- UX Specification Flow 1 describes Farm Manager dashboard patterns with widgets displaying at-a-glance insights and "View All" links for navigation. [Source: docs/ux-specification.md#307-420]
- UX Specification Section 4 details dashboard widget design patterns: loading states, empty states, color-coded indicators, and responsive layouts. [Source: docs/ux-specification.md#1-800]
- Architecture Section 2.1 mandates Vue 3 `<script setup>` syntax, Quasar Framework components, Pinia stores, and Chart.js for data visualization. [Source: docs/architecture.md#63-82]
- Existing HouseholdsWidget.vue (Story 1.5) implements the widget pattern: QCard with loading skeleton, data fetching, empty states, and "View All" navigation. [Source: src/components/dashboard/HouseholdsWidget.vue]
- Story 1.9 implemented sample data seeding with 21 residents across 6 households, providing realistic data for widget testing. [Source: docs/stories/story-1.9.md]
- Story 1.7 implemented residents-store with pagination, filtering, and household enrichment methods. [Source: src/stores/residents-store.js]
- Story 1.6 implemented households-store with occupant count enrichment and type categorization. [Source: src/stores/households-store.js]

## Acceptance Criteria

1. Dashboard displays "Community Overview" widget with: total residents count, total households count, households by type chart, recent additions. [Source: docs/epics.md#235]
2. Widget updates in real-time when residents/households are added/edited (widget fetches fresh data from stores). [Source: docs/epics.md#236]
3. Click "View All" links navigate to respective list pages (`/residents` for residents, `/households` for households). [Source: docs/epics.md#237]
4. Widget is responsive and displays correctly on mobile devices (320px+), tablet (768px+), and desktop (1920px+). [Source: docs/epics.md#238]
5. Chart colors follow Quasar theme for visual consistency (primary, secondary, accent, positive, info, grey). [Source: docs/epics.md#239]
6. Widget shows placeholder message if no data exists (empty state with icon and helpful text). [Source: docs/epics.md#240]

## Tasks / Subtasks

- [ ] **Task 1: Create CommunityOverviewWidget component (AC: 1, 4, 5, 6)**
  - [ ] Create `src/components/dashboard/CommunityOverviewWidget.vue` following existing widget patterns
  - [ ] Add QCard structure with header "Community Overview"
  - [ ] Implement loading state with QSkeleton (3 rectangular placeholders)
  - [ ] Implement section-specific empty states ("No residents yet", "No households yet", "No types to display", "No recent additions")
  - [ ] Add responsive grid layout using Quasar row/col system (col-12 col-md-6 col-lg-4 patterns)
  - [ ] Use Quasar theme colors for visual consistency (primary, secondary, accent, positive, info, grey)

- [ ] **Task 2: Implement residents count display (AC: 1, 2)**
  - [ ] Add residents-store integration: import useResidentsStore
  - [ ] Create computed property `totalResidents` reading from store pagination.total
  - [ ] Display total residents count with icon (person icon) and large number (text-h4)
  - [ ] Add "View All Residents" link button with arrow icon navigating to `/residents`
  - [ ] Ensure count updates when store refreshes (reactive computed property)

- [ ] **Task 3: Implement households count display (AC: 1, 2)**
  - [ ] Add households-store integration: import useHouseholdsStore
  - [ ] Create computed property `totalHouseholds` reading from store pagination.total
  - [ ] Display total households count with icon (home icon) and large number (text-h4)
  - [ ] Add "View All Households" link button with arrow icon navigating to `/households`
  - [ ] Ensure count updates when store refreshes (reactive computed property)

- [ ] **Task 4: Implement households by type breakdown (AC: 1, 2, 5)**
  - [ ] Create computed property `householdsByType` aggregating household types from store
  - [ ] Use QList to display household types with QChip (colored by type) and QBadge (count)
  - [ ] Implement `getTypeColor()` function mapping types to Quasar theme colors:
    - Single Family → primary
    - Multi-Family → secondary
    - Dormitory → accent
    - Guest House → positive
    - Admin Building → info
    - Other → grey
  - [ ] Sort types by count descending for better visibility
  - [ ] Add QSeparator between list and total count section

- [ ] **Task 5: Implement recent additions display (AC: 1, 2)**
  - [ ] Fetch 5 most recent residents using residentsStore.fetchResidents(1, 5) to get last 5 created (store already sorts by $createdAt desc)
  - [ ] Display in QList with resident name, household name (enriched), and relative creation date
  - [ ] Use relative time formatting (date-fns or Day.js) for "Added 2 days ago" display
  - [ ] Show section empty state "No residents added yet" if residents array is empty
  - [ ] Ensure list updates when new residents are created (reactive to store changes)

- [ ] **Task 6: Integrate widget into DashboardPage (AC: 4)**
  - [ ] Import CommunityOverviewWidget into `src/pages/dashboard/DashboardPage.vue`
  - [ ] Add widget to dashboard grid with col-12 col-md-6 responsive classes
  - [ ] Position widget logically in grid (after Quick Stats, before/alongside other widgets)
  - [ ] Test responsive layout on mobile (320px), tablet (768px), desktop (1920px)

- [ ] **Task 7: Implement data fetching on mount (AC: 2)**
  - [ ] Add onMounted lifecycle hook to fetch residents and households data
  - [ ] Call residentsStore.fetchResidents(1, 100) to get counts (pagination total)
  - [ ] Call householdsStore.fetchHouseholds(1, 100) to get counts and types
  - [ ] Set loading state during fetch, clear after completion
  - [ ] Handle errors gracefully with useErrorHandler composable

- [ ] **Task 8: Testing and responsive validation (AC: 3, 4)**
  - [ ] Test widget display on desktop (1920px+): full breakdown and counts visible
  - [ ] Test widget display on tablet (768px+): stacked layout, all content accessible
  - [ ] Test widget display on mobile (320px minimum): vertical stack, readable text sizes
  - [ ] Test "View All" navigation links to `/residents` and `/households`
  - [ ] Test real-time updates: create resident/household, verify widget refreshes counts
  - [ ] Test empty states: verify section-specific empty messages display correctly
  - [ ] Test loading state: slow connection simulation, verify skeletons display

## Dev Notes

- **Widget Pattern Established**: Follow HouseholdsWidget.vue pattern for consistency - QCard wrapper, loading skeleton, empty state, "View All" action button. [Source: src/components/dashboard/HouseholdsWidget.vue]
- **Store Integration**: Use existing residents-store and households-store - no new store actions needed. Both stores already fetch data with pagination.total for counts. [Source: src/stores/residents-store.js, src/stores/households-store.js]
- **Data Fetching Strategy**: Call store fetch methods in onMounted to populate counts. Use pagination.total for totals, not households.length (which is paginated). [Source: src/components/dashboard/HouseholdsWidget.vue#108-130]
- **Chart Library**: Use QList + QChip + QBadge for household types display (not Chart.js) for consistency with existing HouseholdsWidget pattern. Chart.js deferred to future analytics features. [Source: src/components/dashboard/HouseholdsWidget.vue#14-46]
- **Responsive Design**: Follow Quasar responsive classes: col-12 (mobile), col-md-6 (tablet), col-lg-4 (desktop). Grid auto-adjusts based on viewport. [Source: src/pages/dashboard/DashboardPage.vue#12-31]
- **Color Consistency**: Use Quasar theme colors (primary, secondary, accent, positive, info, grey) for household types, matching existing HouseholdsWidget implementation. [Source: src/components/dashboard/HouseholdsWidget.vue#96-106]
- **Error Handling**: Use useErrorHandler composable for consistent error messaging - already established pattern in stores. [Source: src/stores/residents-store.js#7, src/stores/households-store.js#6]
- **Empty State Pattern**: QIcon with size="48px" color="grey-5", centered text message with text-grey-7 class. [Source: src/components/dashboard/HouseholdsWidget.vue#50-53]

### Learnings from Previous Story

**From Story 1.9 (Status: done)**

- **Sample Data Available**: 21 residents across 6 households seeded in sample data mode - excellent for testing widget with realistic data. [Source: docs/stories/story-1.9.md#157, #102]
- **Store Patterns Established**: Both residents-store and households-store use pagination.total for accurate counts, enrichment methods for related data (household names, occupant counts). [Source: docs/stories/story-1.9.md#99, #112]
- **Vue 3 `<script setup>` Syntax**: All new components use Composition API with `<script setup>` - continue this pattern for consistency. [Source: docs/stories/story-1.9.md#288]
- **Quasar Components**: Extensive use of QCard, QList, QItem, QChip, QBadge, QBtn, QIcon, QSkeleton established - reuse these patterns. [Source: docs/stories/story-1.9.md#289]
- **Real-time Updates**: Dashboard widgets should be reactive to store changes - use computed properties referencing store state, not local cached data. [Source: docs/epics.md#236]
- **Testing Strategy**: Manual testing documented in `docs/testing.md` - add test cases for Story 1.10 following established format. [Source: docs/stories/story-1.9.md#93]

### Project Structure Notes

- Add widget component: `src/components/dashboard/CommunityOverviewWidget.vue`
- Modify dashboard page: `src/pages/dashboard/DashboardPage.vue` (import and integrate widget)
- No new stores required - use existing `src/stores/residents-store.js` and `src/stores/households-store.js`
- No new routes required - navigate to existing `/residents` and `/households` routes

### References

- docs/epics.md#229-243 (Story 1.10 definition)
- docs/PRD.md#92-106 (FR-1 Residents Management, FR-2 Households Management)
- docs/PRD.md#649-651 (UX Principle #7: Role-Based Contextual Dashboards)
- docs/PRD.md#653-654 (UX Principle #9: Data Visualization Over Tables)
- docs/ux-specification.md#307-420 (Flow 1: Farm Manager Dashboard Patterns)
- docs/architecture.md#63-82 (Technology Stack)
- src/components/dashboard/HouseholdsWidget.vue (Existing widget pattern reference)
- src/pages/dashboard/DashboardPage.vue (Dashboard layout and widget integration)
- src/stores/residents-store.js (Residents data access)
- docs/stories/story-1.9.md (Sample data implementation and patterns)

## Dev Agent Record

### Context Reference

- [1-10-dashboard-widgets-residents-and-households-summary.context.xml](./1-10-dashboard-widgets-residents-and-households-summary.context.xml)

### Agent Model Used

Cascade SM (2025-11-28)

### Debug Log References

### Completion Notes List

### File List
