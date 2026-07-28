# Epic 5 Context: Village Calendar, Storage, Optional Modules, and User Management

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Complete the integrated village management platform by delivering the shared village calendar, cloud storage with role-based quotas and shared folders, the Vendors optional module, a module enable/disable system, final system polish, production onboarding from scratch, and full user management (admin-driven user CRUD, role assignment UI, and password change/reset). Three optional modules (Guests, Equipment, Energy) are deferred to post-MVP; everything else in this epic is MVP scope.

## Stories

- Story 5.1: Village Calendar — Global Calendar with Category Filtering
- Story 5.2: Village Calendar — Role-Based Event Creation and Editing
- Story 5.3: Cloud Storage — Role-Based Storage Quotas and Personal Folders
- Story 5.4: Cloud Storage — Shared Folders and Module-Based Access
- Story 5.5: Guests Management Module — **DEFERRED to post-MVP**
- Story 5.6: Equipment Management Module — **DEFERRED to post-MVP**
- Story 5.7: Vendors/Suppliers Management Module
- Story 5.8: Energy Management Module — **DEFERRED to post-MVP**
- Story 5.9: Module Management and Configuration
- Story 5.10: System Completion — Final Dashboard Integration and Production Setup
- Story 5.11: Start Fresh Production Setup Wizard (added 2026-07-28; AC10 extracted from 5.10)
- Story 5.12: User Management — CRUD Operations (added 2026-07-28)
- Story 5.13: Role Assignment and Permissions Management UI (added 2026-07-28)
- Story 5.14: Authentication Completeness — Password Change and Reset (added 2026-07-28)

## Requirements & Constraints

- **Calendar:** Single global calendar visible to all users with month/week/day/agenda views. Events are color-coded by category (School, Farm, Village, Guests, Equipment, Energy, Other). Category filter checkboxes reset each session (not persisted). Event creation is role-scoped (e.g., Farm Manager creates Farm events); Events Coordinator and System Administrator can create/edit all categories. Automatic events are marked "System Generated"; for MVP the only auto-event source is Farm expected harvests — the Equipment maintenance-reminder auto-event was removed for MVP. An "Upcoming Events" dashboard widget is required.
- **Storage:** Role-based quotas enforced at upload time (Admin unlimited; Village Head 20 GB; down to Guest 500 MB). Personal folders are private; shared folders (Finance, Farm, School, Village Documents, Admin Only) have role-based read-only/read-write access. Usage display with progress bar and warning above 90%. Admin can view all usage, adjust individual quotas as exceptions, and run storage reports. Uploads support drag-and-drop, multiple files, and progress indication.
- **Vendors (MVP optional module):** Bidirectional supplier/buyer tracking; vendor selection must integrate into the farm-sales buyer dropdown and finance-expense vendor dropdown; transaction history updates automatically; dashboard widget required.
- **Module management:** MVP optional-module toggle list is exactly Farm, School, Vendors. The deferred modules (Guests, Equipment, Energy) must NOT appear in the MVP toggle list or setup wizard. Disabling a module hides its navigation/widgets but preserves data, with a warning if other modules depend on it.
- **User management:** All accounts are admin-created — self-service signup is NOT in scope. Users are distinct from residents; a user record may optionally link to a resident via `resident_id` (linking not required). Deactivation is soft (blocks login, preserves data) — never hard-delete. Validation must prevent deactivating one's own account and the last remaining System Administrator. All user and role changes are audit-logged (who/when/what). The roles page is read-only for MVP; custom role creation is post-MVP.
- **Auth completeness:** Change-password validates the current password and preserves the session. Forgot-password uses an email recovery link landing on a dedicated reset page. Email verification is deferred to post-MVP.
- **Setup wizard:** The "Start Fresh with Real Data" path must complete in under 10 minutes, set `is_using_sample_data = false`, and pre-fill Zambia defaults (currency ZMW, timezone Africa/Lusaka, country Zambia) that the user can override.
- **Cross-cutting NFRs:** Pages load within 3 seconds on 3G; usable on 320px screens with 44px minimum touch targets; 4.5:1 color contrast; designed for low digital literacy; MVP code is JavaScript (not TypeScript); all user-facing strings externalized for i18n.

## Technical Decisions

- **Stack:** Quasar v2.18.5 (Vue 3 `<script setup>`), Appwrite v21.2.1 (Auth, Databases, Storage, Functions), Pinia stores, vue-cal v5 for all calendar UI, date-fns for date math/formatting (dates stored as ISO 8601). vue-cal is already established by the School calendar work (Epic 4) — reuse those patterns rather than introducing alternatives.
- **Storage:** Appwrite Storage buckets (personal/school/farm/village files) with quotas configured per role in the roles collection and checked client-side before upload; follow the existing `useFileUpload` composable pattern (progress callback, quota validation, notify on success/failure).
- **Admin user creation:** The client SDK cannot create accounts on behalf of an admin — Story 5.12 requires a server-side Appwrite Function (or the Express backend extension service) using an admin-scope key (node-appwrite). New users join the `village_administrators` team only when assigned the System Administrator role.
- **Users data model:** `users` table already has `role_ids[]` (multi-role, permissions = union) and `resident_id`; add an `active` boolean (default true) for soft-deactivation. Audit entries go to an admin-only `audit_logs` collection.
- **Dashboard widgets:** Any widget added by this epic (Upcoming Events, Vendors, etc.) must follow the established dashboard widget pattern (standardized QCard-based widget anatomy defined in Epic 2 — see `docs/implementation-artifacts/dashboard-widget-pattern.md`).
- **Deferred-module plumbing stays in place:** the "Guest House" finance income-source string, the "Equipment" inventory-eligible category, the seeded "Guest" role, and Guests/Equipment/Energy i18n nav labels all remain and must not be removed; they integrate when the deferred modules are built post-MVP.

## UX & Interaction Patterns

- Calendar and Storage are core modules in the main navigation (always visible); optional modules appear in nav only when enabled via Module Management.
- Calendar: checkbox filters with "Show All"/"Hide All" toggles, event detail popup, delete confirmations; "System Generated" badge on automatic events.
- Storage pages: My Files / Shared Folders / Upload; drag-and-drop multi-file upload with progress indicators and clear quota-exceeded errors.
- Settings contains User Management (`/admin/users`) and Roles & Permissions (`/admin/roles`), visible to System Administrator only. Users page has search, active/deactivated status filter, and row actions (Edit, Manage Roles, Deactivate/Reactivate); roles page shows a read-only role list with an expandable role × permission matrix. A "Manage Roles" dialog shows current assignments and effective-permissions preview.
- Start Fresh wizard: 5 steps (Village Profile → Admin User → Village Head-or-skip → Module Selection → First Household) with Back/Next, per-step skip, and a "Step X of 5" progress indicator. On completion, redirect to a dashboard whose empty-state CTAs respect household-before-resident ordering (prompt household first, then residents, then first transaction). The sample-mode banner's "Start Fresh - Wipe All Data" action routes into this wizard.
- Profile page gets an enabled Change Password dialog; the login page gets a "Forgot password?" link leading to the email recovery flow and a `/auth/reset-password` page.

## Cross-Story Dependencies

- **MVP scope boundary:** Stories 5.5 (Guests), 5.6 (Equipment), and 5.8 (Energy) are DEFERRED to post-MVP (per the 2026-07-23 and 2026-07-28 scope decisions). No MVP story depends on them. The calendar keeps Guests/Equipment/Energy as color-coding labels that receive no events until those modules are built; the Equipment maintenance-reminder auto-event was removed from Story 5.1 for MVP and will be restored with Story 5.6. Stories 5.9 and 5.11 must limit optional-module selection to Farm, School, and Vendors.
- **Within epic:** 5.1 ← Epic 1; 5.2 ← 5.1; 5.3 ← Story 1.10; 5.4 ← 5.3; 5.9 ← all prior MVP stories; 5.10 ← all MVP stories in all epics (explicitly excluding deferred 4.9–4.11 and 5.5/5.6/5.8).
- **New stories 5.11–5.14 (added/replanned 2026-07-28):** recommended implementation order is 5.14 → 5.12 → 5.13 → 5.11. Dependencies: 5.12 ← 1.4, 1.11; 5.13 ← 5.12; 5.14 ← 1.3, 1.11; 5.11 ← 5.9 and 5.12 (the wizard's Village Head step calls the 5.12 user-creation flow).
- **Cross-epic:** Calendar auto-events come from Farm expected harvests (Epic 3). Vendors (5.7) depends on Stories 2.2, 2.3, and 3.8 — its dropdowns embed in farm-sales and finance-expense forms. The sample-data wipe path (Story 1.9) should route to the 5.11 wizard once implemented. Sample data for MVP excludes equipment, guests, and energy content.
