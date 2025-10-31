# Testing Documentation

This document outlines all tests that need to be implemented for the Village Management System.

## Story 1.4: RBAC Foundation - Testing Requirements

### Unit Tests

#### `src/utils/permissions.js`

**Test Suite: hasPermission()**
1. **Test: Returns false when user is null**
   - Input: `hasPermission(null, [], 'residents:read')`
   - Expected: `false`

2. **Test: Returns false when userRoles is empty**
   - Input: `hasPermission(user, [], 'residents:read')`
   - Expected: `false`

3. **Test: Returns true for wildcard permission (*)**
   - Setup: User with System Administrator role (permission: '*')
   - Input: `hasPermission(user, [adminRole], 'any:permission')`
   - Expected: `true`

4. **Test: Returns true for exact permission match**
   - Setup: User with role having 'residents:read' permission
   - Input: `hasPermission(user, [role], 'residents:read')`
   - Expected: `true`

5. **Test: Returns false when permission not found**
   - Setup: User with role having 'residents:read' permission
   - Input: `hasPermission(user, [role], 'finance:write')`
   - Expected: `false`

6. **Test: Returns true for wildcard pattern match**
   - Setup: User with role having 'finance:*' permission
   - Input: `hasPermission(user, [role], 'finance:read')`
   - Expected: `true`
   - Input: `hasPermission(user, [role], 'finance:write')`
   - Expected: `true`

7. **Test: Returns false for wildcard pattern mismatch**
   - Setup: User with role having 'finance:*' permission
   - Input: `hasPermission(user, [role], 'residents:read')`
   - Expected: `false`

8. **Test: Returns true for multi-role permission union**
   - Setup: User with two roles:
     - Role 1: ['residents:read']
     - Role 2: ['finance:read']
   - Input: `hasPermission(user, [role1, role2], 'residents:read')`
   - Expected: `true`
   - Input: `hasPermission(user, [role1, role2], 'finance:read')`
   - Expected: `true`

9. **Test: Handles role with null/undefined permissions array**
   - Setup: User with role where permissions is null
   - Input: `hasPermission(user, [roleWithNullPermissions], 'residents:read')`
   - Expected: `false`

**Test Suite: hasAnyPermission()**
1. **Test: Returns true when user has at least one permission**
   - Setup: User with 'residents:read' permission
   - Input: `hasAnyPermission(user, roles, ['residents:read', 'finance:write'])`
   - Expected: `true`

2. **Test: Returns false when user has none of the permissions**
   - Setup: User with 'residents:read' permission
   - Input: `hasAnyPermission(user, roles, ['finance:write', 'dashboard:admin'])`
   - Expected: `false`

**Test Suite: hasAllPermissions()**
1. **Test: Returns true when user has all permissions**
   - Setup: User with 'residents:read' and 'finance:read' permissions
   - Input: `hasAllPermissions(user, roles, ['residents:read', 'finance:read'])`
   - Expected: `true`

2. **Test: Returns false when user is missing one permission**
   - Setup: User with 'residents:read' permission only
   - Input: `hasAllPermissions(user, roles, ['residents:read', 'finance:read'])`
   - Expected: `false`

**Test Suite: getUserStorageQuota()**
1. **Test: Returns 0 for empty roles array**
   - Input: `getUserStorageQuota([])`
   - Expected: `0`

2. **Test: Returns -1 for unlimited quota**
   - Setup: User with System Administrator role (storage_quota: -1)
   - Input: `getUserStorageQuota([adminRole])`
   - Expected: `-1`

3. **Test: Returns maximum quota from multiple roles**
   - Setup: User with two roles:
     - Role 1: storage_quota = 5 (GB)
     - Role 2: storage_quota = 20 (GB)
   - Input: `getUserStorageQuota([role1, role2])`
   - Expected: `21474836480` (20 GB in bytes)

4. **Test: Converts GB to bytes correctly**
   - Setup: User with role having storage_quota = 2 (GB)
   - Input: `getUserStorageQuota([role])`
   - Expected: `2147483648` (2 GB in bytes)

**Test Suite: getAllUserPermissions()**
1. **Test: Returns empty array for no roles**
   - Input: `getAllUserPermissions([])`
   - Expected: `[]`

2. **Test: Returns unique permissions from multiple roles**
   - Setup: User with two roles:
     - Role 1: ['residents:read', 'finance:read']
     - Role 2: ['finance:read', 'dashboard:read']
   - Input: `getAllUserPermissions([role1, role2])`
   - Expected: `['residents:read', 'finance:read', 'dashboard:read']`

---

### Integration Tests

#### `src/stores/auth-store.js`

**Test Suite: createAdmin()**
1. **Test: Creates Auth user with correct credentials**
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Verify: Appwrite Auth user created with matching email and name

2. **Test: Creates user profile in users table with same ID**
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Verify: Document created in users table with $id matching Auth user ID

3. **Test: Assigns System Administrator role to new admin**
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Verify: User profile has role_ids containing System Administrator role ID

4. **Test: Automatically logs in new admin**
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Verify: `isLoggedIn` is true, `user` is populated

5. **Test: Fetches and populates userRoles after creation**
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Verify: `userRoles` array contains System Administrator role object

6. **Test: Returns error when System Administrator role not found**
   - Setup: Delete System Administrator role from roles table
   - Action: Call `createAdmin('Admin User', 'admin@example.com', 'password123')`
   - Expected: `{ success: false, error: 'System Administrator role not found...' }`

**Test Suite: login()**
1. **Test: Successfully logs in with valid credentials**
   - Setup: Create test user
   - Action: Call `login('test@example.com', 'password123')`
   - Verify: `isLoggedIn` is true, `user` is populated

2. **Test: Fetches user roles after login**
   - Setup: Create test user with Village Head role
   - Action: Call `login('test@example.com', 'password123')`
   - Verify: `userRoles` contains Village Head role object

3. **Test: Returns error for invalid credentials**
   - Action: Call `login('invalid@example.com', 'wrongpassword')`
   - Expected: `{ success: false, error: 'Invalid email or password' }`

**Test Suite: fetchUserRoles()**
1. **Test: Fetches all roles for user with multiple roles**
   - Setup: User with Village Head and Finance Manager roles
   - Action: Call `fetchUserRoles()`
   - Verify: `userRoles` contains both role objects

2. **Test: Handles user with no roles**
   - Setup: User with empty role_ids array
   - Action: Call `fetchUserRoles()`
   - Verify: `userRoles` is empty array

3. **Test: Handles missing user profile gracefully**
   - Setup: Auth user exists but no users table entry
   - Action: Call `fetchUserRoles()`
   - Verify: `userRoles` is empty array, no error thrown

---

### E2E Tests

#### Route Guards

**Test Suite: Authentication Guard**
1. **Test: Redirects unauthenticated user to /auth**
   - Setup: No active session
   - Action: Navigate to '/'
   - Expected: Redirected to '/auth'

2. **Test: Allows authenticated user to access protected route**
   - Setup: Active session
   - Action: Navigate to '/'
   - Expected: Page loads successfully

**Test Suite: Permission Guard**
1. **Test: Allows System Administrator to access admin routes**
   - Setup: Logged in as System Administrator
   - Action: Navigate to '/admin/users'
   - Expected: Page loads successfully

2. **Test: Blocks non-admin user from admin routes**
   - Setup: Logged in as Resident (no admin permission)
   - Action: Navigate to '/admin/users'
   - Expected: Redirected to '/unauthorized'

3. **Test: Allows user with specific permission to access route**
   - Setup: Logged in as Village Head (has 'residents:read')
   - Action: Navigate to route with `requiresPermission: 'residents:read'`
   - Expected: Page loads successfully

4. **Test: Blocks user without specific permission**
   - Setup: Logged in as Guest (no 'residents:read')
   - Action: Navigate to route with `requiresPermission: 'residents:read'`
   - Expected: Redirected to '/unauthorized'

---

#### UI Conditional Rendering

**Test Suite: MainLayout Navigation**
1. **Test: Shows admin menu items only to System Administrator**
   - Setup: Logged in as System Administrator
   - Verify: "User Management" menu item is visible

2. **Test: Hides admin menu items from non-admin users**
   - Setup: Logged in as Resident
   - Verify: "User Management" menu item is not visible

3. **Test: Shows module menu items based on permissions**
   - Setup: Logged in as Finance Manager (has 'finance:read')
   - Verify: Finance menu item is visible
   - Verify: Residents menu item is not visible (no 'residents:read')

**Test Suite: PermissionGuard Component**
1. **Test: Renders content when user has permission**
   - Setup: User with 'residents:read' permission
   - Template: `<PermissionGuard permission="residents:read"><div>Content</div></PermissionGuard>`
   - Expected: Content is rendered

2. **Test: Hides content when user lacks permission**
   - Setup: User without 'residents:read' permission
   - Template: `<PermissionGuard permission="residents:read"><div>Content</div></PermissionGuard>`
   - Expected: Content is not rendered

3. **Test: anyOf prop works correctly**
   - Setup: User with 'residents:read' permission
   - Template: `<PermissionGuard :anyOf="['residents:read', 'finance:read']"><div>Content</div></PermissionGuard>`
   - Expected: Content is rendered

4. **Test: allOf prop works correctly**
   - Setup: User with only 'residents:read' permission
   - Template: `<PermissionGuard :allOf="['residents:read', 'finance:read']"><div>Content</div></PermissionGuard>`
   - Expected: Content is not rendered

---

#### Admin Users Page

**Test Suite: UsersPage.vue**
1. **Test: Displays all users from users table**
   - Setup: 3 users in database
   - Action: Navigate to '/admin/users'
   - Verify: Table shows 3 rows

2. **Test: Displays role names for each user**
   - Setup: User with Village Head and Finance Manager roles
   - Action: Navigate to '/admin/users'
   - Verify: User row shows both role chips

3. **Test: Shows correct role colors**
   - Setup: User with System Administrator role
   - Action: Navigate to '/admin/users'
   - Verify: Role chip has deep-purple color

4. **Test: Handles users with no roles**
   - Setup: User with empty role_ids
   - Action: Navigate to '/admin/users'
   - Verify: Shows "No roles assigned" text

5. **Test: Displays error message on fetch failure**
   - Setup: Simulate network error
   - Action: Navigate to '/admin/users'
   - Verify: Error banner is displayed with retry button

6. **Test: Retry button refetches users**
   - Setup: Initial fetch fails
   - Action: Click retry button
   - Verify: fetchUsers() is called again

---

### Manual Testing Checklist

#### Setup Verification
- [ ] Roles table contains all 5 core roles with correct permissions
- [ ] Users table has role_ids column (string array)
- [ ] Environment variables are set correctly in .env
- [ ] Dev server starts without errors

#### Admin Creation Flow
- [ ] Can create first admin user via CreateAdminForm
- [ ] Admin user appears in Appwrite Auth
- [ ] Admin user appears in users table with same ID
- [ ] Admin user has System Administrator role assigned
- [ ] Admin is automatically logged in after creation

#### Login and Role Fetching
- [ ] Can log in with admin credentials
- [ ] User roles are fetched and stored in auth-store
- [ ] Console shows no errors during role fetching
- [ ] Logout clears user and userRoles from state

#### Route Protection
- [ ] Unauthenticated users redirected to /auth
- [ ] Authenticated users can access home page
- [ ] System Administrator can access /admin/users
- [ ] Non-admin users redirected to /unauthorized when accessing /admin/users
- [ ] Unauthorized page displays correctly with navigation options

#### UI Conditional Rendering
- [ ] Admin menu section visible only to System Administrator
- [ ] User Management link appears for admin users
- [ ] User Management link hidden for non-admin users
- [ ] Navigation drawer updates immediately after login

#### Admin Users Page
- [ ] Page loads without errors for admin users
- [ ] All users displayed in table
- [ ] Role chips show correct names and colors
- [ ] Users with no roles show "No roles assigned"
- [ ] Table pagination works correctly
- [ ] Table sorting works correctly
- [ ] Date formatting is correct

#### Multi-Role Testing
- [ ] Create user with multiple roles via Appwrite console
- [ ] User has permissions from all assigned roles
- [ ] Permission checking works with union logic
- [ ] UI shows all assigned roles

#### Permission Patterns
- [ ] Wildcard (*) grants access to everything
- [ ] Wildcard patterns (finance:*) match correctly
- [ ] Exact permission matching works
- [ ] Permission denial redirects to /unauthorized

#### Error Handling
- [ ] Missing role in database handled gracefully
- [ ] Network errors show user-friendly messages
- [ ] Invalid user profile handled without crashes
- [ ] Console errors are descriptive and actionable

---

## Future Testing Requirements

### Story 1.5+: Additional Tests Needed
- Test role assignment UI (Epic 2)
- Test role editing functionality (Epic 2)
- Test permission changes propagate to active sessions
- Test storage quota enforcement (Epic 3)
- Test offline permission caching (Epic 4)
- Test permission sync after offline mode (Epic 4)

---

## Story 1.5: Dashboard Framework and Layout - MVP Testing Plan

- Automated unit, integration, E2E, and performance tests are deferred until post-MVP per product direction.
- During MVP implementation, capture manual verification notes (navigation visibility, responsiveness, performance budget) in story completion records without adding code-based tests.

---

## Story 1.7: Residents Management CRUD Operations - MVP Testing Plan

### Manual Verification Checklist

#### Residents List Page (AC1, AC2, AC10)
- [ ] List displays all required columns: full name, gender, household, contact info, status badges
- [ ] Pagination controls work correctly (10, 25, 50, 100 rows per page)
- [ ] Sort functionality works on all sortable columns
- [ ] Search by name filters results correctly (partial match)
- [ ] Household filter dropdown populates with existing households
- [ ] Filters persist across pagination
- [ ] Clear filters button resets all filters and reloads full list
- [ ] Contact information masked for users without residents:write permission
- [ ] Contact column hidden entirely for read-only users
- [ ] Quick actions (view, edit, delete) respect RBAC permissions
- [ ] Skeleton loaders display during initial load

#### Resident Form (AC3, AC4)
- [ ] Form requires first name, last name, DOB, gender, household
- [ ] Middle names field is optional
- [ ] Phone and email fields are optional with validation
- [ ] Phone validation accepts valid formats, rejects invalid
- [ ] Email validation accepts valid formats, rejects invalid
- [ ] Room number field appears only for Dormitory households
- [ ] Room number field hides when switching away from Dormitory
- [ ] Household dropdown lists all existing households
- [ ] Form blocks creation when no households exist
- [ ] Warning banner displays with CTA to Households page when no households
- [ ] "Go to Households" button navigates correctly
- [ ] Form validation displays inline error messages
- [ ] Cancel button closes dialog without saving
- [ ] Save button disabled when no households exist

#### Resident Creation (AC5, AC9)
- [ ] Successful creation shows success toast notification
- [ ] Residents list refreshes automatically after creation
- [ ] New resident appears in the list
- [ ] Household occupant count increments correctly
- [ ] Dashboard widgets update with new resident count

#### Resident Detail Page (AC6)
- [ ] Personal information displays correctly
- [ ] Household membership shows linked household
- [ ] Click on household navigates to household detail page
- [ ] Activity timeline placeholder displays
- [ ] Edit button visible only with residents:write permission
- [ ] Delete button visible only with residents:delete permission
- [ ] Back button returns to residents list

#### Resident Edit (AC7, AC9)
- [ ] Edit form pre-populates with existing data
- [ ] Date fields format correctly for editing
- [ ] Household change updates occupant counts for both old and new households
- [ ] Successful update shows success toast
- [ ] Detail page refreshes with updated data
- [ ] List page reflects changes after edit

#### Resident Delete (AC8, AC9)
- [ ] Delete button shows confirmation dialog
- [ ] Confirmation dialog displays resident name
- [ ] Cancel button closes dialog without deleting
- [ ] Delete succeeds for non-household-head residents
- [ ] Delete blocked for sole household head with clear error message
- [ ] Successful deletion shows success toast
- [ ] Residents list refreshes after deletion
- [ ] Household occupant count decrements correctly
- [ ] Dashboard widgets update with reduced resident count

#### RBAC and Permissions (AC10)
- [ ] Unauthenticated users redirected to /auth
- [ ] Users without residents:read cannot access residents pages
- [ ] Users with residents:read can view list and details
- [ ] Users without residents:write cannot see Add/Edit buttons
- [ ] Users without residents:delete cannot see Delete button
- [ ] Contact information properly masked based on permissions

#### Responsive Design (AC12)
- [ ] Layout works correctly at 320px width (mobile)
- [ ] Layout works correctly at 768px width (tablet)
- [ ] Layout works correctly at 1024px+ width (desktop)
- [ ] Search/filter toolbar stacks properly on mobile
- [ ] Table scrolls horizontally on small screens
- [ ] Form fields stack properly on mobile

#### Performance (AC12)
- [ ] Residents list loads in <2 seconds on 3G connection
- [ ] Skeleton loaders provide good perceived performance
- [ ] Search debounce prevents excessive API calls (500ms delay)
- [ ] Pagination doesn't reload entire dataset

#### Keyboard Navigation (AC12)
- [ ] Tab key navigates through form fields in logical order
- [ ] Enter key submits forms
- [ ] Escape key closes dialogs
- [ ] Focus management works correctly in modals

### Deferred Automated Tests

#### Unit Tests (Post-MVP)
- residents-store.js actions (CRUD operations)
- residents-store.js getters (pagination, filtering)
- residents-store.js household synchronization logic
- Form validation logic
- Permission masking logic

#### Component Tests (Post-MVP)
- ResidentsListPage.vue rendering and interactions
- ResidentForm.vue validation and submission
- ResidentDetailPage.vue data display and actions
- Search/filter toolbar functionality

#### Integration Tests (Post-MVP)
- Residents CRUD flow end-to-end
- Household occupant synchronization
- RBAC permission enforcement
- Search and filter combinations

#### E2E Tests (Post-MVP)
- Complete resident lifecycle (create → view → edit → delete)
- Household guard scenario (no households → create household → create resident)
- Multi-user permission scenarios
- Household head deletion prevention

---

## Testing Tools and Frameworks

### Recommended Setup
- **Unit Tests:** Vitest (already configured with Vite)
- **Component Tests:** @vue/test-utils + Vitest
- **E2E Tests:** Playwright or Cypress
- **Coverage:** Vitest coverage (c8 or istanbul)

### Test File Structure
```
src/
  utils/
    permissions.js
    __tests__/
      permissions.spec.js
  composables/
    usePermissions.js
    __tests__/
      usePermissions.spec.js
  stores/
    auth-store.js
    __tests__/
      auth-store.spec.js
  components/
    PermissionGuard.vue
    __tests__/
      PermissionGuard.spec.js
tests/
  e2e/
    rbac.spec.js
    admin-users.spec.js
```

---

## Coverage Goals

- **Unit Tests:** 90%+ coverage for utils and composables
- **Integration Tests:** All store actions covered
- **E2E Tests:** All critical user flows covered
- **Manual Tests:** All acceptance criteria verified

---

## Notes

- Tests should be implemented incrementally as features are built
- Each story should include tests before marking as complete
- Manual testing checklist should be completed for each story
- Automated tests should run in CI/CD pipeline before deployment
