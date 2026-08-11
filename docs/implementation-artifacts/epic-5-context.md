# Epic 5 Context: Village Calendar, Storage, Optional Modules, and User Management

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Complete the integrated village management platform by delivering a shared village calendar, role-based cloud storage, an optional Vendors module, module enable/disable configuration, final system polish, production onboarding from scratch, and full user management. This epic turns the system into a cohesive, admin-configurable platform that can be deployed for a real village, while deferring Guests, Equipment, and Energy modules to post-MVP.

## Stories

- Story 5.1: Village Calendar — Global Calendar with Category Filtering
- Story 5.2: Village Calendar — Role-Based Event Creation and Editing
- Story 5.3: Cloud Storage — Role-Based Storage Quotas and Personal Folders
- Story 5.4: Cloud Storage — Shared Folders and Module-Based Access
- Story 5.5: Guests Management Module — **deferred to post-MVP**
- Story 5.6: Equipment Management Module — **deferred to post-MVP**
- Story 5.7: Vendors/Suppliers Management Module
- Story 5.8: Energy Management Module — **deferred to post-MVP**
- Story 5.9: Module Management and Configuration
- Story 5.10: System Completion — Final Dashboard Integration and Production Setup
- Story 5.11: Start Fresh Production Setup Wizard
- Story 5.12: User Management — CRUD Operations
- Story 5.13: Role Assignment and Permissions Management UI
- Story 5.14: Authentication Completeness — Password Change and Reset

## Requirements & Constraints

- **MVP scope boundary:** Guests (5.5), Equipment (5.6), and Energy (5.8) are deferred to post-MVP. All other Epic 5 stories are MVP. The module toggle list and Start Fresh wizard must only offer Farm, School, and Vendors as optional MVP modules.
- **Calendar:** Single global calendar with month/week/day/agenda views. Events are color-coded by category (School, Farm, Village, Guests, Equipment, Energy, Other). Users can filter categories per session. Event creation is role-scoped; Events Coordinator and System Administrator can create/edit all categories. For MVP, automatic events come only from Farm expected harvests; the Equipment maintenance-reminder auto-event was removed because Equipment is deferred.
- **Storage:** Role-based quotas enforced at upload time, ranging from unlimited for Admin down to 500 MB for Guest. Personal folders are private per user. Shared folders (Finance, Farm, School, Village Documents, Admin Only) support role-based read-only or read-write access. Usage is shown with a progress bar and a warning above 90%. Admins can view all usage, adjust individual quotas, and run storage reports.
- **Vendors:** Track suppliers, buyers, or both. Vendor selection must integrate into the Farm sales buyer dropdown and Finance expense vendor dropdown. Transaction history updates automatically, and a dashboard widget is required.
- **Module management:** Core modules are always enabled. Optional modules can be toggled; disabling hides navigation and widgets but preserves data, with a warning when another module depends on it.
- **System completion:** Final dashboard integration, notifications bell with badge and panel, UX polish, performance target of under 3 seconds on 3G, mobile support down to 320 px with 44 px minimum touch targets, help/docs, and admin system health monitoring.
- **User management:** All accounts are admin-created; self-service signup is out of scope. Users are distinct from residents, but a user account may optionally link to a resident record. Deactivation is soft and preserves audit history; hard deletes are not allowed. Validation must prevent self-deactivation and deactivation of the last System Administrator. All user and role changes are audit-logged.
- **Auth completeness:** Users can change their own password from their profile. A forgot-password flow sends an email recovery link to a dedicated reset page. Email verification is deferred to post-MVP.
- **Production onboarding:** The Start Fresh wizard walks a new village through Village Profile, Admin User confirmation, Village Head creation or skip, Module Selection, and First Household. Zambia defaults are pre-filled (currency ZMW, timezone Africa/Lusaka, country Zambia) but can be overridden. Completion sets `is_using_sample_data = false` and redirects to a dashboard with empty-state guidance.

## Technical Decisions

- **Calendar:** Reuse the existing `vue-cal` calendar patterns already established for the School module rather than introducing a second calendar component.
- **Storage buckets:** Personal files live in an Appwrite Storage bucket with file-level security enabled so each file carries per-user read/write/delete permissions. File metadata is stored in a separate collection with row-level owner-only access.
- **Admin user creation:** The Appwrite client SDK cannot create accounts on behalf of an admin. Story 5.12 therefore requires a server-side Appwrite Function using an admin-scope key to create the account and then insert the matching user row.
- **Users data model:** The existing `users` table already supports multi-role assignment via `role_ids[]` and an optional `resident_id` link. Add an `active` boolean (default true) for soft-deactivation.
- **Roles:** Roles remain seeded via script for MVP. Custom role creation and permission editing from the UI are deferred to post-MVP, so the Roles page is read-only.
- **Dashboard widgets:** Any new widget introduced in this epic must follow the established dashboard widget pattern.
- **Deferred-module plumbing:** Existing MVP strings and categories that will later connect to deferred modules must remain intact — for example, the "Guest House" income source example, the "Equipment" inventory-eligible category, the "Guest" role, and the Guests/Equipment/Energy navigation labels.

## UX & Interaction Patterns

- **Navigation:** Calendar and Storage are core modules and always visible. Optional modules appear in navigation only when enabled.
- **Calendar:** Check-box category filters with Show All/Hide All toggles, event detail popup, delete confirmations, and a "System Generated" badge on automatic events.
- **Storage:** My Files / Shared Folders views; drag-and-drop multi-file upload with progress indicators and clear quota-exceeded errors.
- **Settings:** User Management (`/admin/users`) and Roles & Permissions (`/admin/roles`) are visible to System Administrator only. The Users page has search, an active/deactivated status filter, and row actions (Edit, Manage Roles, Deactivate/Reactivate). The Roles page shows a read-only role list with an expandable role-by-permission matrix.
- **Start Fresh wizard:** 5 steps with Back/Next, per-step skip, and a "Step X of 5" progress indicator. Empty-state CTAs after completion must respect the household-before-resident ordering: prompt for a household first, then residents, then transactions. The sample-data banner's "Start Fresh — Wipe All Data" action should route into this wizard.
- **Profile & auth:** Profile page gets an enabled Change Password dialog. Login page gets a "Forgot password?" link leading to the email recovery flow and a `/auth/reset-password` landing page.

## Cross-Story Dependencies

- **Deferred modules:** 5.5, 5.6, and 5.8 have no downstream MVP dependencies. Calendar keeps Guests/Equipment/Energy as color-coding labels only; the Equipment maintenance-reminder auto-event will be restored when 5.6 is built post-MVP.
- **Within epic:** 5.2 depends on 5.1; 5.4 depends on 5.3; 5.9 depends on all prior MVP stories; 5.10 depends on all MVP stories across all epics (excluding deferred 4.9–4.11 and 5.5/5.6/5.8). The recommended implementation order for the new 2026-07-28 stories is 5.14 → 5.12 → 5.13 → 5.11.
- **Cross-epic:** 5.1 builds on Epic 1; 5.3 builds on Story 1.10; 5.12 builds on Stories 1.4 and 1.11; 5.14 builds on Stories 1.3 and 1.11; 5.11 depends on 5.9 and 5.12. Farm expected-harvest events feed the calendar from Epic 3. Vendors (5.7) depends on Stories 2.2, 2.3, and 3.8 for its dropdown integrations. The sample-data wipe path from Story 1.9 should route into the 5.11 wizard once implemented.
