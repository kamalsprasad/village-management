# Sprint Change Proposal — 2026-07-28

**Project:** village-app
**Author:** Kamal (via Correct Course workflow)
**Date:** 2026-07-28
**Change Scope Classification:** Major (fundamental replan — new stories, PRD updates, UX spec additions)
**Recommended Path Forward:** Direct Adjustment (Option 1) — additive changes, no rollback

---

## Section 1: Issue Summary

### Problem Statement

During review of `src/pages/setup/SetupWizard.vue`, two critical gaps were identified in the village management system:

1. **No onboarding-from-scratch path**: The SetupWizard's "Start Fresh with Real Data" card is disabled ("Coming in future update"). A brand-new user can only load sample data — there is no way to set up a real village from scratch through the UI.

2. **No user management plan**: The `UsersPage` (`/admin/users`) is read-only. There is no way to add, edit, deactivate, or assign roles to users from the UI. The `ProfilePage` "Change Password" button is disabled. No forgot-password flow exists.

### Context & Evidence

- **SetupWizard.vue** lines 63-82: "Start Fresh" card is `disabled-card` with `q-chip` "Coming in future update" and a disabled `q-btn`.
- **UsersPage.vue** line 6 comment: "Role editing will be available in Epic 2" — but Epic 2 contains no such story.
- **ProfilePage.vue** line 74: "Change Password" button disabled with tooltip "Password change functionality will be available in Epic 2".
- **epics.md**: No story exists for user management CRUD, role assignment UI, or password change/reset. The "Start Fresh" wizard is buried as AC10 of Story 5.10 (a 10-AC mega-story mixing dashboard polish, notifications, help, system health, and the production wizard).
- **PRD FR-16/FR-17** and **Epic 1 success criteria** claim production onboarding and user creation are Epic 1 deliverables — but Epic 1 is marked done without delivering them. Direct conflict between PRD and epics.md.
- **UX spec** (lines 233-238) lists "User Management (Admin only)" and "Roles & Permissions (Admin only)" in Settings navigation, but provides no screen specifications.
- **POST-MVP.md** does NOT defer user management or onboarding — they are implicitly MVP.

### Root Cause

Misunderstanding of original requirements during epic breakdown. The PRD specified these as Epic 1 features, but the epics.md either deferred them (Start Fresh → Story 5.10) or omitted them entirely (user management CRUD, role assignment, password reset/change). Story 1.4 and 1.11 comments promised "Epic 2" delivery, but no such Epic 2 stories were ever created.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic   | Impact                    | Detail                                                                                                                                               |
| ------ | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Epic 1 | Reconciliation only       | Marked done, but PRD Epic 1 success criteria overstate what was delivered. PRD will be realigned — no Epic 1 stories reopened.                       |
| Epic 2 | None                      | No user-management stories were ever added here despite Story 1.4/1.11 comments. Gap acknowledged.                                                   |
| Epic 5 | **Major — 4 new stories** | Stories 5.11 (Start Fresh wizard), 5.12 (User CRUD), 5.13 (Role Mgmt UI), 5.14 (Auth completeness) added. Story 5.10 split (AC10 extracted to 5.11). |

### Story Impact

| Story      | Change                                                  |
| ---------- | ------------------------------------------------------- |
| 5.10       | AC10 removed (extracted to new Story 5.11)              |
| 5.11 (NEW) | Start Fresh Production Setup Wizard                     |
| 5.12 (NEW) | User Management - CRUD Operations                       |
| 5.13 (NEW) | Role Assignment and Permissions Management UI           |
| 5.14 (NEW) | Authentication Completeness - Password Change and Reset |

### Artifact Conflicts

| Artifact            | Conflict                                                                                                                                                                            | Resolution                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PRD.md              | FR-16 implies Epic 1 delivery of "Start Fresh"; Epic 1 success criteria claim production onboarding & user creation. No FR for user management. PRD conflates residents with users. | Add FR-19 (User Management). Add note to FR-16 acknowledging Epic 5 delivery. Update Epic 1 success criteria. |
| epics.md            | No user-management stories. Story 5.10 bundles "Start Fresh" with 9 unrelated ACs. Epic 5 metadata doesn't mention user management.                                                 | Split 5.10. Add Stories 5.11-5.14. Update Epic 5 header/goal/value/summary.                                   |
| ux-specification.md | Lists User Management & Roles screens in nav but no screen specs. Setup Wizard flow exists but no Start Fresh step detail.                                                          | Add Start Fresh wizard step detail (with Zambia defaults). Add User Management & Roles screen specs.          |
| sprint-status.yaml  | No entries for new stories.                                                                                                                                                         | Add 5.11-5.14 as backlog.                                                                                     |
| architecture.md     | No conflict — already uses separate `users` table supporting "separate, linkable" model.                                                                                            | No change required (user↔resident link via `resident_id` on users table already supported).                   |
| POST-MVP.md         | No conflict — does not defer these features.                                                                                                                                        | No change required.                                                                                           |

### Technical Impact

- **Frontend**: New wizard component (multi-step), Add/Edit User dialog, Manage Roles dialog, /admin/roles page, Change Password dialog, Forgot Password flow, /auth/reset-password page, empty-state CTAs across list pages.
- **Backend**: New Appwrite Function for admin-scope user creation (Appwrite Account creation requires server-side key — client SDK cannot create users on behalf of admin). Soft-deactivate via `active` flag on users table. Audit logging for user/role changes.
- **Data model**: Add `active` boolean to `users` table (default true). `resident_id` link field already supported in schema. No changes to `residents` or `roles` tables.
- **No rollback needed**: Existing RBAC engine, permissions utilities, route guards, and the read-only UsersPage are all solid foundations. Changes are purely additive.

---

## Section 3: Recommended Approach

**Selected: Direct Adjustment (Option 1)**

Add 4 new stories to Epic 5, split Story 5.10, update PRD with FR-19, and add UX screen specs. No rollback of completed work — the existing RBAC engine and read-only UsersPage are correct foundations to build upon.

**Rationale:**

- The RBAC engine (`permissions.js`, route guards, `PermissionGuard`) is complete and correct — only the management UI is missing.
- The `users` and `roles` tables already exist with the right schema (including `role_ids` many-to-many and `resident_id` link).
- Adding stories is additive and low-risk; it doesn't invalidate completed work.
- Splitting Story 5.10 improves estimability and testability.

**Effort estimate:** Medium (4 new stories, ~2-4 hours each per BMAD story-sizing guidelines)
**Risk level:** Low (additive; no changes to existing data or completed stories)
**Timeline impact:** Adds 4 stories to Epic 5 backlog. Recommended implementation order: 5.14 (auth, no deps) → 5.12 (user CRUD) → 5.13 (role UI, depends on 5.12) → 5.11 (Start Fresh wizard, depends on 5.12 for Village Head creation step).

---

## Section 4: Detailed Change Proposals

All proposals below were reviewed and approved incrementally by the user on 2026-07-28.

### 4.1 PRD Changes (`docs/PRD.md`)

#### Change A — Add FR-19: User Management and Account Administration (after FR-17)

```
NEW FR-19: User Management and Account Administration

- Admin can create user accounts (email, name, initial role(s)) from the User Management screen
- Admin can edit user details (name, email, role assignments) and deactivate (not hard-delete) users
- Admin can assign/reassign one or more roles per user via the User Management UI
- Users are distinct from residents: a `users` record represents a login account; a `residents` record represents a person living in the village
- A user account MAY optionally be linked to a resident record (resident_id on users table) — linking is not required
- Self-service signup is NOT supported in MVP; all accounts are admin-created
- Logged-in users can change their own password from My Profile
- Forgot-password flow: unauthenticated user requests reset by email; Appwrite sends reset link; user sets new password
- Email verification: deferred to post-MVP (admin-issued initial passwords trusted)
```

#### Change B — Update FR-16 (add note acknowledging Epic 5 delivery)

```
OLD (FR-16, line 265):
- For production: Guide through village setup, first household creation, admin user creation, village head user creation (or same user), module selection

NEW:
- For production: Guide through village setup, first household creation, admin user creation, village head user creation (or same user), module selection
- Note: The "Start Fresh with Real Data" wizard path is delivered in Epic 5 (Story 5.11). Epic 1 delivers the "Explore with Sample Data" path only.
```

#### Change C — Update Epic 1 Success Criteria (realign with reality)

```
OLD (Epic 1 Success Criteria, line 690):
- Production mode guides through village setup, household creation, and admin user creation

NEW:
- Production mode onboarding is deferred to Epic 5 (Story 5.11); Epic 1 delivers sample-data onboarding only
- User management CRUD (create/edit/deactivate users, assign roles) is delivered in Epic 5 (Stories 5.12-5.14)
```

### 4.2 Epics Changes (`docs/epics.md`)

#### Change A — Remove AC10 from Story 5.10

```
OLD (Story 5.10 AC, line 966):
... 9. Final testing checklist: all user journeys tested, RBAC enforced, data integrity validated, all integrations working, sample data mode functional 10. Production setup wizard: "Start Fresh with Real Data" option, guides through village config, first household, admin user, Village Head user, module selection, initial data entry, sets is_using_sample_data = false

NEW:
... 9. Final testing checklist: all user journeys tested, RBAC enforced, data integrity validated, all integrations working, sample data mode functional

(AC10 removed — extracted to dedicated Story 5.11)
```

#### Change B — Add Story 5.11: Start Fresh Production Setup Wizard

```
### Story 5.11: Start Fresh Production Setup Wizard

As a **village administrator**, I want to set up the system with my own real village data from scratch, so that I can use the platform for actual village operations rather than evaluation.

**Acceptance Criteria:**
1. SetupWizard "Start Fresh with Real Data" card is enabled (no longer disabled/"coming soon")
2. Selecting "Start Fresh" launches a multi-step wizard: (1) Village Profile, (2) Admin User, (3) Village Head (or "same as admin" skip), (4) Module Selection, (5) First Household
3. Step 1 Village Profile: name, location, established date, currency, timezone — saved to village_settings with is_using_sample_data = false. Defaults pre-filled for Zambia (currency: ZMW — Zambian Kwacha, timezone: Africa/Lusaka, country: Zambia); user can override.
4. Step 2 Admin User: the already-logged-in first admin is confirmed/used; no second admin creation required (first admin created via CreateAdminForm at /auth)
5. Step 3 Village Head: create a second user with Village Head role, or skip if same as admin
6. Step 4 Module Selection: core modules always enabled; optional MVP modules (Farm, School, Vendors) toggleable — matches Story 5.9 AC7
7. Step 5 First Household: create first household record so residents can be added next
8. Wizard is skippable per step with "Back"/"Next"; progress indicator shows "Step X of 5"
9. On completion: redirect to dashboard with empty-state guidance ("Add your first household", "Record your first transaction")
10. Empty-state guidance: list pages show contextual CTAs when no records exist, respecting the household-before-resident ordering (Story 1.7 AC4) — dashboard prompts household creation first; once a household exists, prompts shift to adding residents
11. "Start Fresh - Wipe All Data" path (from sample mode) returns to this wizard

**Prerequisites:** Story 5.9, Story 5.12 (User CRUD — for Village Head creation in Step 3)
```

#### Change C — Add Story 5.12: User Management - CRUD Operations

```
### Story 5.12: User Management - CRUD Operations

As a **System Administrator**, I want to create, edit, and deactivate user accounts, so that I can control who has access to the village management system.

**Acceptance Criteria:**
1. UsersPage (/admin/users) gains "Add User" button (visible to System Administrator only)
2. Add User form: name, email, initial password (admin-set), role assignment (multi-select), optional resident_id link (search/select from residents)
3. Creating user calls Appwrite Account creation (server-side function with admin scope) and inserts row in users table with role_ids
4. New user automatically added to village_administrators team only if assigned System Administrator role
5. Edit User: edit name, email, role assignments, resident_id link
6. Deactivate User: soft-deactivate (sets active=false, blocks login) — no hard-delete to preserve audit history
7. Reactivate deactivated user
8. UsersPage shows active/deactivated status filter
9. Cannot deactivate own account (validation prevents self-lockout)
10. Cannot deactivate the last remaining System Administrator (validation prevents admin lockout)
11. All operations audit-logged (who/when/what changed)

**Prerequisites:** Story 1.4 (RBAC foundation), Story 1.11
```

#### Change D — Add Story 5.13: Role Assignment and Permissions Management UI

```
### Story 5.13: Role Assignment and Permissions Management UI

As a **System Administrator**, I want to assign and modify user roles from the UI, so that I can grant appropriate access without running seed scripts.

**Acceptance Criteria:**
1. UsersPage row action: "Manage Roles" opens role assignment dialog
2. Role assignment dialog: multi-select of all seeded roles; shows current assignments; save updates users.role_ids
3. UsersPage row action: "View Permissions" shows the effective permission set (union of assigned roles) read-only
4. New admin page /admin/roles: lists all roles with name, category, permission count, storage quota, assigned user count
5. Roles page is read-only for MVP (no create/edit/delete roles from UI — roles remain seeded via script); custom roles deferred to post-MVP
6. Permission matrix view on /admin/roles: expandable grid showing role × permission mapping
7. Role changes audit-logged

**Prerequisites:** Story 5.12
```

#### Change E — Add Story 5.14: Authentication Completeness - Password Change and Reset

```
### Story 5.14: Authentication Completeness - Password Change and Reset

As a **village user**, I want to change my password and recover a forgotten one, so that I can maintain account security and regain access if I lose my password.

**Acceptance Criteria:**
1. ProfilePage "Change Password" button enabled: opens dialog (current password, new password, confirm new password)
2. Change password calls Appwrite Account.updatePassword; validates current password; enforces minimum length
3. On success: success notification, dialog closes, session preserved
4. AuthPage login form: "Forgot password?" link
5. Forgot password flow: user enters email → Appwrite Account.createRecovery sends reset email → user clicks email link → sets new password on a /auth/reset-password page
6. /auth/reset-password page: validates token from URL, accepts new password + confirmation, calls Account.updateRecovery
7. Email verification: deferred to post-MVP (admin-issued initial passwords trusted)
8. Self-service signup: NOT in scope (admin-created accounts only) — confirmed by PRD FR-19

**Prerequisites:** Story 1.3, Story 1.11
```

#### Change F — Update Epic 5 header, goal, value, summary

```
OLD (line 848):
## Epic 5: Village Calendar, Storage, and Optional Modules (10 stories)

NEW:
## Epic 5: Village Calendar, Storage, Optional Modules, and User Management (13 stories)
```

```
OLD (line 850):
**Expanded Goal:** Complete the integrated village management platform with shared calendar, cloud storage, and optional modules.

NEW:
**Expanded Goal:** Complete the integrated village management platform with shared calendar, cloud storage, optional modules, production onboarding from scratch, and user management (CRUD, role assignment, auth completeness).
```

```
OLD (line 852):
**Value Delivered:** Village has complete operational visibility with shared calendar, document management, and optional modules (Guests, Equipment, Vendors, Energy).

NEW:
**Value Delivered:** Village has complete operational visibility with shared calendar, document management, optional modules (Vendors for MVP; Guests/Equipment/Energy post-MVP), production-ready onboarding from scratch, and full user management — admins can create/edit/deactivate users, assign roles from the UI, and users can change/reset passwords.
```

```
OLD (line 974):
**Epic 5 Summary:** 10 stories, 7 MVP + 3 deferred to post-MVP. Deliverables: Village calendar, cloud storage with shared folders, Vendors Management, module management system, polished production-ready system, production setup wizard. Guests Management (5.5), Equipment Management (5.6), and Energy Management (5.8) are deferred to post-MVP — see `docs/POST-MVP.md` and `docs/planning-artifacts/sprint-change-proposal-2026-07-23.md`.

NEW:
**Epic 5 Summary:** 13 stories, 10 MVP + 3 deferred to post-MVP. Deliverables: Village calendar, cloud storage with shared folders, Vendors Management, module management system, polished production-ready system, production setup wizard (Story 5.11), user management CRUD (Story 5.12), role assignment UI (Story 5.13), auth completeness — password change/reset (Story 5.14). Guests Management (5.5), Equipment Management (5.6), and Energy Management (5.8) are deferred to post-MVP — see `docs/POST-MVP.md` and `docs/planning-artifacts/sprint-change-proposal-2026-07-23.md`.
```

### 4.3 Sprint Status Changes (`docs/sprint-status.yaml`)

Add 4 new story entries to Epic 5 section (status: backlog):

```yaml
5-11-start-fresh-production-setup-wizard: backlog
5-12-user-management-crud-operations: backlog
5-13-role-assignment-and-permissions-management-ui: backlog
5-14-authentication-completeness-password-change-and-reset: backlog
```

### 4.4 UX Specification Changes (`docs/ux-specification.md`)

#### Change A — Add Start Fresh Path Detailed Steps (after line 615)

```
**Start Fresh Path Detailed Steps (Story 5.11):**

Step 1 — Village Profile (defaults pre-filled for Zambia):
- Village name (text, required)
- Location/address (text, required)
- Established date (date picker, required)
- Currency (dropdown, default: ZMW — Zambian Kwacha)
- Timezone (dropdown, default: Africa/Lusaka)
- Country code (dropdown, default: Zambia)
- Note: "Defaults are set for Zambia. Adjust if your village is elsewhere."

Step 2 — Admin User:
- Confirm the already-logged-in first admin (name, email displayed read-only)
- No second admin creation — first admin created via CreateAdminForm at /auth
- "Next" button proceeds

Step 3 — Village Head:
- Choice: "I am the Village Head" (skip) OR "Create a different Village Head user"
- If create: name, email, initial password, role auto-set to Village Head
- Calls Story 5.12 user-creation flow

Step 4 — Module Selection:
- Core Modules (always enabled, greyed): Residents, Households, Finance, Inventory, Calendar, Storage
- Optional Modules (toggleable): Farm Management, School Management, Vendors/Suppliers
- Note: "You can enable/disable modules later in Settings"
- Matches Story 5.9 AC7

Step 5 — First Household:
- Household name (required), type, construction date
- On save: wizard completes, redirect to dashboard with empty-state CTAs

Empty-state guidance (post-wizard — respects household-before-resident ordering, Story 1.7 AC4):
- Dashboard (no households): "Welcome! Start by adding your first household."
- Dashboard (household exists, no residents): "Add your first resident to your household."
- Residents list (empty, no households): "Please create at least one household before adding residents." (primary CTA → Households page)
- Residents list (empty, household exists): "No residents yet. Add your first resident." (primary CTA button)
- Households list (empty): "No households yet. Add your first household." (primary CTA button)
- Finance (empty): "No transactions recorded. Record your first income or expense."
```

#### Change B — Add User Management and Roles Screen Specs (after Settings section, near line 238)

```
### User Management Screen (/admin/users) — Story 5.12

**Access:** System Administrator only (requires `*` permission)

**Layout:**
- Header: "User Management" with "Add User" primary button
- Filter bar: search by name/email; status filter (Active / Deactivated / All)
- User table columns: Name, Email, Roles (chips), Resident Link, Status, Created, Actions
- Row actions: Edit, Manage Roles (Story 5.13), Deactivate/Reactivate

**Add/Edit User Dialog:**
- Name (text, required), Email (text, required, validated)
- Initial password (required on Add, hidden on Edit) — admin-set
- Role assignment (multi-select chips from seeded roles)
- Resident link (optional search/select from residents table — "Link to resident record")
- Save / Cancel buttons

**Deactivate confirmation:**
- "Deactivate [Name]? They will no longer be able to log in. Their data is preserved."
- Validation: cannot deactivate self; cannot deactivate last System Administrator

### Roles & Permissions Screen (/admin/roles) — Story 5.13

**Access:** System Administrator only

**Layout:**
- Header: "Roles & Permissions"
- Role table: Name, Category, Permissions (count), Storage Quota, Assigned Users (count)
- Row action: "View Permissions" (expandable)

**Permission Matrix (expandable per role):**
- Grid: rows = permissions (module:action), columns = roles, cells = checkmark if granted
- Read-only for MVP (note: "Custom role creation is deferred to post-MVP")

**Manage Roles Dialog (from UsersPage):**
- Multi-select of all seeded roles
- Shows current assignments
- "View Effective Permissions" link shows union of selected roles' permissions
- Save updates users.role_ids; audit-logged
```

---

## Section 5: Implementation Handoff

### Change Scope Classification: Major

This is a Major change because it adds 4 new stories, updates the PRD with a new functional requirement (FR-19), and adds UX screen specifications — fundamental replan with PM/Architect awareness recommended.

### Handoff

| Recipient                | Responsibility                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Developer agent (Amelia) | Implement Stories 5.14 → 5.12 → 5.13 → 5.11 in that order. Use `bmad-create-story` to generate per-story implementation plans before `bmad-dev-story`. |
| Product Manager (John)   | Review PRD FR-19 and Epic 1 criteria realignment. Confirm user-vs-resident "separate, linkable" model.                                                 |
| Architect (Winston)      | Confirm backend approach for admin-scope user creation (Appwrite Function with server API key) and `active` flag addition to users table.              |

### Recommended Implementation Order

1. **Story 5.14** (Auth completeness) — no dependencies, unblocks ProfilePage disabled button
2. **Story 5.12** (User CRUD) — depends on Story 1.4/1.11 (done); requires new Appwrite Function
3. **Story 5.13** (Role Mgmt UI) — depends on 5.12
4. **Story 5.11** (Start Fresh wizard) — depends on 5.9 and 5.12 (for Village Head creation step)

### Success Criteria

- [ ] A brand-new user can log in, choose "Start Fresh", complete the 5-step wizard, and arrive at an empty dashboard with CTAs
- [ ] Admin can create a new user with roles from `/admin/users`
- [ ] Admin can edit user details and reassign roles from the UI
- [ ] Admin can deactivate (not delete) a user; deactivated user cannot log in
- [ ] Validation prevents self-deactivation and last-admin deactivation
- [ ] User can change their own password from `/profile`
- [ ] Unauthenticated user can request a password reset email and reset password via `/auth/reset-password`
- [ ] `/admin/roles` page shows all roles with permission matrix (read-only)
- [ ] All user/role changes audit-logged
- [ ] Zambia defaults pre-filled in Start Fresh wizard Step 1 (user can override)
- [ ] Empty-state CTAs appear on Residents, Households, and Finance list pages when no records exist

### Out of Scope (Deferred to Post-MVP)

- Self-service signup (open registration)
- Email verification
- Custom role creation / permission editing from UI
- Bulk user import
- User activity tracking / last login display
- Multi-village user management
- OAuth/SSO

---

## Approval

**User decision (2026-07-28):** All 5 proposals approved incrementally.

- Proposal 1 (PRD edits): Approved
- Proposal 2 (split 5.10, add 5.11): Approved — with note to use Zambia defaults in Start Fresh wizard
- Proposal 3 (add 5.12, 5.13, 5.14): Approved
- Proposal 4 (Epic 5 metadata + sprint-status): Approved
- Proposal 5 (UX spec additions): Approved

**Next step:** Apply the documented edits to `docs/PRD.md`, `docs/epics.md`, `docs/sprint-status.yaml`, and `docs/ux-specification.md`, then route to Developer agent for implementation starting with Story 5.14.
