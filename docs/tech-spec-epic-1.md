# Epic Technical Specification: Project Foundation & Core Infrastructure

Date: 2025-10-31
Author: Kamal S. Prasad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the Sustainable Model Village Management System’s operational baseline by standing up the Quasar SSR frontend, Appwrite backend services, and mandatory modules for residents, households, authentication, RBAC, dashboards, and village configuration @docs/epics.md#42-263 @docs/PRD.md#90-205. Delivery of this epic gives administrators a production-ready shell that enforces project-wide architecture decisions—Pinia state management, custom error handling, offline-first scaffolding, and normalized Appwrite data stores—so subsequent epics can focus on vertical capabilities instead of platform setup @docs/architecture.md#63-321.

The epic also seeds the Katete sample dataset and introduces user-facing dashboards and profile experiences, enabling stakeholders to preview the end-to-end flow while validating usability and performance targets defined in the PRD @docs/PRD.md#209-263 @docs/ux-specification.md#32-303.

## Objectives and Scope

**In Scope**

- Initialize Quasar SSR project with required tooling, theming, linting, and environment configuration @docs/epics.md#50-85 @docs/architecture.md#19-144
- Provision Appwrite project, database, tables, indexes, and permission scaffolding that satisfy FR-1 and FR-2 requirements @docs/PRD.md#90-159 @docs/architecture.md#846-946
- Implement email/password authentication with session persistence, logout, and protected routing backed by Pinia stores @docs/epics.md#87-123 @docs/architecture.md#575-850
- Deliver role-based access control with multi-role union, routing guards, and UI gating per architecture standards @docs/epics.md#107-144 @docs/architecture.md#295-321
- Build responsive dashboard shell, navigation, and placeholder widgets honoring UX information architecture @docs/epics.md#126-143 @docs/ux-specification.md#132-303
- Provide full CRUD for households and residents with household-resident linkage and dashboard summaries @docs/epics.md#146-243
- Implement village configuration settings and sample data wizard, including wipe/reset flow and persistent sample banner @docs/epics.md#188-259 @docs/ux-specification.md#550-639
- Surface user profile view with role and storage quota display consistent with storage roadmap @docs/epics.md#246-260 @docs/architecture.md#317-321

**Out of Scope**

- Finance, inventory, farm, school, and other optional module functionality beyond navigation placeholders @docs/epics.md#267-636
- Automated testing suites, CI/CD automation, and TypeScript migration (post-MVP roadmap) @docs/architecture.md#1185-1199
- Full offline sync queue implementation and conflict resolution UI (scaffolded in later epics) @docs/architecture.md#324-569 @docs/ux-specification.md#643-825
- Advanced analytics, dashboards, and reporting widgets outside residents/households summary @docs/PRD.md#270-912

## System Architecture Alignment

Epic 1 must adhere to the architectural baseline: Quasar Framework v2.18.5 with Vue 3 `<script setup>` syntax, Vite tooling, and Pinia stores; Appwrite v21.2.1 for Auth, Databases, and Functions; IndexedDB + Dexie scaffolding for future offline sync; and Chart.js/vue-cal readiness within the dashboard shell @docs/architecture.md#63-321. All components must register shared boot files (`appwrite`, `error-handler`, `offline`) and enforce the custom `useErrorHandler` and `validateForm` composables for consistent error reporting @docs/architecture.md#575-814. RBAC implementation must mirror the normalized schema and permission patterns defined for Appwrite tables, ensuring role unions and field-level constraints are respected before unlocking higher-epic capabilities @docs/architecture.md#846-946.

## Detailed Design

### Services and Modules

| Component                 | Responsibility                                                               | Key Assets                                                                                                                      | Notes                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quasar SSR Shell**      | Provides layout framework (MainLayout), responsive navigation, SSR hydration | `src/layouts/MainLayout.vue`, `src/pages/IndexPage.vue`, `src/pages/dashboard/DashboardPage.vue`                                | Must implement role-aware navigation per UX IA @docs/ux-specification.md#132-304                                                                           |
| **Authentication Module** | Handles login/logout, session persistence, route guards                      | `src/pages/auth/LoginPage.vue`, `src/stores/auth-store.js`, `src/router/index.js`                                               | Uses Appwrite Account API with email/password; integrates with `useErrorHandler` for feedback @docs/epics.md#87-123 @docs/architecture.md#575-814          |
| **RBAC Core**             | Resolves role unions, enforces permissions in UI and data layer              | `src/composables/usePermissions.js`, Pinia auth store, Appwrite table rules                                                     | Role metadata seeded via Appwrite `roles` table and mirrored client-side @docs/epics.md#107-144 @docs/architecture.md#295-321                              |
| **Residents Module**      | CRUD for residents; links residents to households and roles                  | `src/pages/residents/ResidentsListPage.vue`, `src/pages/residents/ResidentForm.vue`, `src/stores/residents-store.js`            | Requires household existence; enforces validation per FR-1 @docs/epics.md#164-185 @docs/PRD.md#92-133                                                      |
| **Households Module**     | CRUD for households; occupant overview widgets                               | `src/pages/households/HouseholdsListPage.vue`, `src/pages/households/HouseholdDetailPage.vue`, `src/stores/households-store.js` | Deletion guarded when occupants exist; drives dashboard summaries @docs/epics.md#146-183                                                                   |
| **Dashboard Framework**   | Presents community metrics widgets, recent activity, sample-mode banner      | `src/pages/dashboard/DashboardPage.vue`, dashboard widgets under `src/components/dashboard/`                                    | Widgets consume Pinia data selectors; includes residents/households summary @docs/epics.md#126-143                                                         |
| **Village Configuration** | Stores village metadata, council members, module toggles                     | `src/pages/settings/VillageSettingsPage.vue`, `src/stores/settings-store.js`                                                    | Updates Appwrite `village_settings` table; read-only access for non-admins @docs/epics.md#188-205                                                          |
| **Sample Data Wizard**    | Guides initial setup, loads Katete dataset, manages wipes                    | `src/pages/setup/SetupWizard.vue`, `src/pages/setup/SampleDataBanner.vue`, Appwrite function/seed scripts                       | Banner visible globally when `is_using_sample_data` true; wipe flow purges tables before relaunch @docs/epics.md#209-225 @docs/ux-specification.md#550-639 |
| **User Profile Pane**     | Displays roles, storage quota placeholder, account actions                   | `src/pages/profile/MyProfilePage.vue`                                                                                           | Reads role metadata and quota defaults; change-password button is stub per scope @docs/epics.md#246-260                                                    |

### Data Models and Contracts

| Table (Appwrite)             | Primary Fields                                                                                                                                                                                          | Indexes / Constraints                                                                                                        | Notes                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `users` (Appwrite system)    | `$id`, `email`, `name`, `resident_id`, `role_ids`, `storage_quota`                                                                                                                                      | Managed by Appwrite                                                                                                          | Source of authentication identities @docs/architecture.md#82-91                                          |
| `residents`                  | `$id`, `first_name`, `middle_names`, `last_name`, `dob`, `gender`, `household_id`, `phone`, `email`, `notes`, `$createdAt`, `$updatedAt`                                                                | Indexes on `household_id`, `first_name`, `middle_names`, `last_name` (search), `$createdAt`; foreign key to `households.$id` | Enforces FR-1 union roles and linkage to households @docs/PRD.md#92-133                                  |
| `households`                 | `$id`, `name`, `type`, `head_resident_id`, `resident_ids`, `construction_date`, `bedrooms`, `bathrooms`, `notes`, `$createdAt`, `$updatedAt`                                                            | Indexes on `type`, `name`, `$createdAt`                                                                                      | Type enum: SingleFamily, MultiFamily, Dormitory, GuestHouse, AdminBuilding, Other @docs/epics.md#146-159 |
| `roles`                      | `$id`, `name`, `description`, `permissions[]`, `storage_quota_mb`, `is_system_role`                                                                                                                     | Index on `name`; immutable system roles                                                                                      | Seeded with system defaults; client caches for RBAC @docs/epics.md#107-121                               |
| `village_settings`           | `$id`, `village_name`, `address`, `established_date`, `default_currency`, `currency_symbol`, `timezone`, `country_code`, `is_using_sample_data`, `council_members[]`, `modules_enabled[]`, `$updatedAt` | Single row; uses Appwrite row ID `settings_root`                                                                             | Drives banner, navigation toggles, and report headers @docs/epics.md#188-205                             |
| `sample_seed_log` (optional) | `$id`, `seed_version`, `applied_at`, `applied_by`, `status`, `notes`                                                                                                                                    | Index on `applied_at`                                                                                                        | Tracks sample data loads/wipes for audit trail @docs/epics.md#209-225                                    |

**Contracts & Validation**

- All create/update mutations must pass through `validateForm` enforcing required fields, enum bounds, and cross-entity checks (e.g., resident requires existing household) @docs/architecture.md#575-730.
- Client stores map Appwrite rows to typed ViewModels (e.g., `ResidentRecord`, `HouseholdSummary`) to ensure dashboard widgets receive normalized data.

### APIs and Interfaces

| Interface                                                                                | Direction                          | Payload / Schema                                                                         | Consumers                                                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Appwrite Account API** (`account.createEmailSession`, `account.deleteSession`)         | Frontend → Appwrite                | `{ email, password }` credentials; session JWT stored client-side                        | Login/Logout flows; auth store refresh @docs/architecture.md#575-650                        |
| **Appwrite Databases API** (`listRows`, `createRow`, `updateRow`, `deleteRow`)           | Frontend → Appwrite                | Residents, households, roles, settings rows per schema above                             | Residents/Households CRUD, settings updates, sample data wipe @docs/architecture.md#846-946 |
| **Appwrite Functions** (`seedSampleData`, `wipeSampleData`)                              | Frontend → Appwrite Cloud Function | `{ requestedBy, dryRun }` payload for seeding/wipe confirmation                          | Setup wizard controls; ensures consistent dataset reset @docs/epics.md#209-225              |
| **Pinia Stores** (`auth-store`, `residents-store`, `households-store`, `settings-store`) | Frontend internal                  | Normalized state objects with loading/error flags                                        | Dashboard widgets, profile screen, navigation guards                                        |
| **Navigation Guard** (`router.beforeEach`)                                               | Frontend internal                  | `to`, `from`, `next` with permission resolution                                          | Blocks unauthorized routes based on RBAC union @docs/architecture.md#295-321                |
| **Dashboard Widget Contracts**                                                           | Frontend internal                  | `CommunityOverviewWidgetProps` `{ totalResidents, totalHouseholds, householdsByType[] }` | Dashboard components render summary charts @docs/epics.md#229-243                           |

### Workflows and Sequencing

1. **Story 1.1 – Project Setup**: Scaffold Quasar SSR project, configure boot files, environment templates, and linting baseline; verify dev server operation @docs/epics.md#50-67.
2. **Story 1.2 – Appwrite Schema**: Provision Appwrite project, create core tables, indexes, and permissions aligned with normalized schema; row configuration in README @docs/epics.md#69-85.
3. **Story 1.3 – Authentication**: Implement login/logout UI, Pinia auth store, protected routes, and error handling integration before exposing secured pages @docs/epics.md#87-103.
4. **Story 1.4 – RBAC Foundation**: Seed roles, compute permission unions, enforce guards in router/layout; ensure Admin views for role inspection @docs/epics.md#107-121.
5. **Story 1.5 – Dashboard Framework**: Build responsive layout, navigation, placeholder widgets, and sample greeting to anchor future modules @docs/epics.md#126-143.
6. **Story 1.6 – Households CRUD**: Deliver households list/detail/forms with validation and occupant guardrails; surface dashboard counts @docs/epics.md#146-159.
7. **Story 1.7 – Residents CRUD**: Extend CRUD to residents with household linkage, search/filter, and occupant syncing to households @docs/epics.md#164-183.
8. **Story 1.8 – Village Configuration**: Implement settings UI, ensure currency/timezone propagate to header and dashboards, restrict edits to admins @docs/epics.md#188-205.
9. **Story 1.9 – Sample Data Mode**: Create setup wizard, seed Katete dataset, persistent banner, and wipe flow with confirmation phrase @docs/epics.md#209-225.
10. **Story 1.10 – Dashboard Widgets**: Populate residents/household summary widget with live data and responsive charts @docs/epics.md#229-243.
11. **Story 1.11 – User Profile**: Expose profile page with roles and quota indicators; prepare change-password stub for future epic @docs/epics.md#246-259.

Sequencing enforces dependencies (e.g., residents require households, RBAC before gating navigation). Completion of Story 1.11 marks Epic 1 as contexted and ready for downstream epics.

## Non-Functional Requirements

### Performance

- Dashboard home, residents list, and households list must load within 2 seconds over 3G on low-end Android devices, aligning with PRD performance targets @docs/PRD.md#288-311.
- Authentication round-trips (login/logout) must complete within 1.5 seconds on LAN deployments; fallback to cached session state when offline.
- Household and resident creation forms must validate client-side before network calls to minimize retries and Appwrite load.
- SSR build must pass Lighthouse performance score ≥85 on desktop for baseline layout to guarantee future widget performance headroom.

### Security

- Enforce Appwrite email/password authentication with secure session storage and explicit logout clearing Pinia state @docs/architecture.md#575-650.
- Apply RBAC union rules on every navigation guard and data fetch, restricting CRUD operations to authorized roles @docs/epics.md#107-144 @docs/architecture.md#295-321.
- Configure Appwrite table permissions to require authenticated sessions and role-based read/write scopes for residents, households, roles, and settings @docs/architecture.md#846-946.
- Mask sensitive fields (e.g., contact details) in UI for non-privileged roles and ensure HTTPS/TLS termination on LAN gateway per architecture guidance @docs/architecture.md#303-321.

### Reliability/Availability

- Follow offline-first scaffolding: queue resident/household mutations via Dexie sync queue so no data is lost during 2-day offline windows @docs/architecture.md#324-569.
- Implement optimistic UI updates with rollback on failure using `withErrorHandling` to maintain perceived availability even when Appwrite calls fail @docs/architecture.md#575-730.
- Provide sample data wipe safeguards (confirmation phrase, sequential deletion) to prevent partial resets and maintain baseline consistency @docs/epics.md#209-225.
- Ensure initialization scripts are idempotent so re-running setup wizard does not corrupt configuration or duplicate roles.

### Observability

- Instrument all API mutations through `useErrorHandler` to capture module, operation, and user-friendly error context for future logging pipelines @docs/architecture.md#575-730.
- Emit Quasar Notify events for state transitions (sync, offline, sample-mode) to give operators immediate visibility without external tooling @docs/ux-specification.md#643-825.
- Record seed/wipe operations in `sample_seed_log` with timestamps and actors to enable audit tracing of environment resets.
- Prepare Pinia devtools integration and console logging in development builds; strip verbose logging from production SSR bundle to avoid noise.

## Dependencies and Integrations

- **Appwrite v21.2.1**: Auth, Databases, Functions; requires configured endpoint/project ID and seeded roles/tables as described in architecture doc @docs/architecture.md#63-321 @docs/architecture.md#846-946.
- **Quasar Framework v2.18.5 / Vue 3.5.22 / Vite**: UI shell, SSR rendering, routing, Pinia integration @docs/architecture.md#63-144.
- **Pinia v2.x**: Centralized state for auth, residents, households, settings; interacts with Quasar components and Appwrite clients.
- **Dexie.js + IndexedDB**: Offline cache and sync queue groundwork, though full conflict workflows land in later epics @docs/architecture.md#324-569.
- **date-fns**: Date formatting for dashboards, household/resident views, and sample data banner timestamps @docs/architecture.md#305-316.
- **Chart.js v4.5.1**: Dashboard widgets for residents/households summary; configured but limited to core widget scope in this epic @docs/architecture.md#63-81 @docs/epics.md#229-243.
- **Custom Appwrite Functions (`seedSampleData`, `wipeSampleData`)**: Provide deterministic sample dataset management invoked by setup wizard @docs/epics.md#209-225.

## Acceptance Criteria (Authoritative)

1. Quasar SSR project scaffolding, linting, and environment configuration match architecture standards with successful dev server verification @docs/epics.md#50-67 @docs/architecture.md#19-144.
2. Appwrite project contains `residents`, `households`, `roles`, `village_settings`, and optional `sample_seed_log` tables with indexes/permissions per schema and is documented for operators @docs/epics.md#69-85 @docs/architecture.md#846-946.
3. Email/password authentication delivers login/logout, guarded routes, session persistence, and offline-safe auth state with consistent error messaging @docs/epics.md#87-103.
4. RBAC union logic enforces permissions across router guards, layout visibility, and data operations; Admin can inspect role assignments @docs/epics.md#107-121.
5. Dashboard layout renders responsive navigation, role-aware menus, placeholder widgets, and sample-mode banner when applicable @docs/epics.md#126-143 @docs/ux-specification.md#132-303.
6. Households module supports list, create, edit, delete (with occupant protection), and detail views with validation for structural metadata @docs/epics.md#146-159.
7. Residents module supports list with search/filter, create/edit/delete, automatic household linkage updates, and detail view @docs/epics.md#164-183.
8. Village configuration settings page allows admin edits, enforces role-based access, and propagates village metadata across layout/header @docs/epics.md#188-205.
9. Setup wizard loads Katete sample dataset, displays persistent banner, and provides destructive wipe flow requiring confirmation phrase @docs/epics.md#209-225 @docs/ux-specification.md#550-639.
10. Dashboard community overview widget surfaces total residents, households, households-by-type chart, and recent additions with live data @docs/epics.md#229-243.
11. User profile page shows name, email, roles, storage quota indicator, and stubbed password change action consistent with storage roadmap @docs/epics.md#246-259.

## Traceability Mapping

| Acceptance Criterion | PRD Reference                                      | Architecture / UX Reference                                                     | Implementing Stories |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| AC1                  | Setup prerequisites @docs/PRD.md#911-916           | Tooling baseline @docs/architecture.md#19-144                                   | Story 1.1            |
| AC2                  | FR-1 / FR-2 data requirements @docs/PRD.md#92-159  | Schema constraints @docs/architecture.md#846-946                                | Story 1.2            |
| AC3                  | Authentication FR-1 @docs/PRD.md#92-133            | Auth patterns @docs/architecture.md#575-650                                     | Story 1.3            |
| AC4                  | RBAC FR-17 @docs/PRD.md#262-269                    | RBAC design @docs/architecture.md#295-321                                       | Story 1.4            |
| AC5                  | Dashboard goals @docs/PRD.md#126-205               | UX IA @docs/ux-specification.md#132-303                                         | Story 1.5            |
| AC6                  | Households FR-2 @docs/PRD.md#101-109               | Data flows @docs/architecture.md#846-946                                        | Story 1.6            |
| AC7                  | Residents FR-1 @docs/PRD.md#92-100                 | Error handling @docs/architecture.md#575-730                                    | Story 1.7            |
| AC8                  | Configuration FR-16 @docs/PRD.md#253-260           | Settings design @docs/architecture.md#317-321                                   | Story 1.8            |
| AC9                  | Sample data mode FR-16 @docs/PRD.md#253-263        | Setup wizard UX @docs/ux-specification.md#550-639                               | Story 1.9            |
| AC10                 | Dashboard widgets FR-1/FR-2                        | Chart integration @docs/architecture.md#63-81 @docs/ux-specification.md#132-303 | Story 1.10           |
| AC11                 | Storage quota visibility FR-6 @docs/PRD.md#143-150 | UX profile layout @docs/ux-specification.md#132-304                             | Story 1.11           |

## Risks, Assumptions, Open Questions

| Type          | Description                                                                                     | Mitigation / Next Step                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Risk          | RBAC misconfiguration could expose resident contact data to unauthorized roles.                 | Pair Appwrite rule definitions with automated smoke tests in Epic 2; double-check role seeds during setup.               |
| Risk          | Sample data wipe could leave orphaned Appwrite rows if new tables appear later.                 | Centralize wipe logic in Appwrite function and update when schema changes; log wipe outcomes in `sample_seed_log`.       |
| Risk          | Offline queue not fully implemented yet—initial release relies on online availability for CRUD. | Document limitation; prioritize Dexie sync queue in subsequent story-context workflow before first offline-focused epic. |
| Assumption    | Appwrite instance is self-hosted on LAN with TLS termination available.                         | Coordinate with infrastructure team to confirm; otherwise add reverse proxy setup to Story 1.1 documentation.            |
| Assumption    | Sample dataset matches latest schema and includes required roles/households/residents.          | Re-run seed validation after schema migrations; include unit script to verify dataset integrity.                         |
| Open Question | Do we require multi-language support in setup wizard copy pre-i18n implementation?              | Pending product decision; default to English and revisit during Epic 5 i18n rollout.                                     |

## Test Strategy Summary

- **Manual Smoke Tests**: Validate login/logout, navigation guards, residents/households CRUD, dashboard widget rendering, sample data load/wipe, and profile view across Admin, Village Head, and Resident personas.
- **Offline Simulation**: Use browser devtools to toggle offline mode during resident/household creation to confirm graceful error handling and user messaging (no full queue yet).
- **Accessibility Checks**: Run Lighthouse accessibility audit on dashboard and CRUD forms to ensure contrast and keyboard navigation meet PRD targets @docs/PRD.md#309-314.
- **Performance Verification**: Collect page load timings via Chrome DevTools throttled 3G profile; record metrics in README for regression tracking.
- **Regression Checklist**: Maintain test checklist aligned with acceptance criteria to be executed before marking Epic 1 contexted; automate via Cypress after Epic 2 introduces testing harness.
