# Story 1.3: Authentication System with Email/Password

Status: Approved

## Story

As a **village administrator**,
I want to **log in with email and password**,
so that **I can securely access the village management system**.

As a **new system installer**,
if no users exist, I want to be **prompted to create the first administrator account**,
so that **I can begin using the application**.

## Requirements Context Summary

This story establishes the core authentication system. It will now include two primary functions:

1.  **First User Admin Creation**: If no users exist in the system, it will present a form to create the initial administrative user.
2.  **Standard Authentication**: For all subsequent visits, it will provide a secure login/logout mechanism for existing users.

This implementation leverages Appwrite's built-in email/password authentication and integrates with a Pinia store to manage the user's session state.

- **User Story**: As a village administrator, I want to log in with email and password, so that I can securely access the village management system. [Source: `docs/epics.md#87-104`]
- **New Requirement (Bootstrapping)**: As a new system installer, if no users exist, I want to be prompted to create the first administrator account so I can begin using the application. [Derived from user request & `docs/epics.md#Story-1.9` context]
- **Core Functionality**: The implementation must include a mechanism to check for existing users. If none, show a "Create Admin" form. Otherwise, show the standard login page. It will integrate with Appwrite's `createEmailPasswordSession` and `create` user methods, manage sessions, and handle redirection for protected routes. [Source: `docs/epics.md#93-101`, `docs/PRD.md#FR-16`]
- **State Management**: A Pinia store (`auth-store.js`) is required to manage the authentication state, including the user object and session information. This store will be the single source of truth for the user's authentication status. [Source: `docs/epics.md#101`, `docs/architecture.md#305`]
- **UI/UX**: The UI must conditionally render either the admin creation form or the login form. Both must provide clear feedback for success or failure. Unauthenticated users attempting to access protected routes must be redirected to the appropriate entry page. [Source: `docs/ux-specification.md#Flow-Login`, `docs/ux-specification.md#Flow-3`]
- **Error Handling**: The `useErrorHandler` composable should be used to provide user-friendly messages for common failures (e.g., invalid credentials, user already exists, network errors). [Source: `docs/architecture.md#4.1-error-handling-composable`]

## Dev Agent Record

### Context Reference

- `docs/stories/story-context-1.3.xml`

## Structure Alignment Summary

This story will introduce core authentication components into the existing project structure. All new files will adhere to the established architecture and naming conventions.

- **New Page**: A `LoginPage.vue` will be created in `src/pages/`. This component will be responsible for conditionally rendering either the login form or the first-time admin creation form.
- **New Store**: A Pinia store will be created at `src/stores/auth-store.js` to manage authentication state, user data, and session information, following your requested naming convention.
- **New Composable**: A `useAuth.js` composable may be created in `src/composables/` to encapsulate authentication logic (login, logout, admin creation) and interaction with the Appwrite `account` service and the `auth-store`.
- **Routing**:
  - A new route for `/login` will be added to `src/router/routes.js` pointing to the `LoginPage.vue` component.
  - A route guard will be implemented in a new boot file (e.g., `src/boot/router-auth.js`) to protect routes that require authentication. It will check the user's state in the `auth-store` and redirect to `/login` if unauthenticated.
- **Alignment**: This structure aligns with the existing Quasar project layout and the architectural decision to use Pinia for state management and composables for reusable logic. All Vue components will use the mandatory `<script setup>` syntax.

## Acceptance Criteria

1.  **Initial User Check**: On application startup, the system must check if any users exist in the Appwrite authentication service.
2.  **Conditional UI Rendering**:
    - If **no users exist**, the application must display a "Create First Admin User" form.
    - If **users exist**, the application must display the standard "Login" form.
3.  **Admin Creation Form**:
    - The form must include fields for Full Name, Email, and Password.
    - Input validation must enforce a valid email format and a strong password policy.
    - On successful creation, the new user is automatically logged in and redirected to the main dashboard.
4.  **Login Form**:
    - The form must include fields for Email and Password.
    - It must feature a "Remember me" option to create a persistent session.
    - Input validation must ensure fields are not empty.
5.  **Authentication Logic**:
    - Successfully integrates with the Appwrite Account service for user creation and session management.
    - Failed login or creation attempts must display a clear, user-friendly error message using the `useErrorHandler` composable.
6.  **State Management**: A Pinia store (`src/stores/auth-store.js`) must be created to manage the global authentication state, including the current user's account data and session status.
7.  **Route Protection**:
    - A router guard must be implemented to protect all authenticated routes.
    * Unauthenticated users attempting to access a protected route must be redirected to the login page.
8.  **Logout Functionality**: A logout mechanism must be available that properly clears the session from both the Pinia store and Appwrite, then redirects the user to the login page.

## Tasks / Subtasks

- [ ] **Task 1: Initial User Check & Conditional Rendering (AC: 1, 2)**
  - [ ] Subtask 1.1: Create a new boot file (`src/boot/auth-init.js`) to run on application startup.
  - [ ] Subtask 1.2: In the boot file, use the Appwrite `account.list()` method to check if any users exist.
  - [ ] Subtask 1.3: Store the result (e.g., `hasUsers`) in a temporary global state or a simple store.
  - [ ] Subtask 1.4: Create a new page `src/pages/AuthPage.vue`.
  - [ ] Subtask 1.5: In `AuthPage.vue`, conditionally render either the `CreateAdminForm` component or the `LoginForm` component based on the `hasUsers` state.

- [ ] **Task 2: Create Admin User Form (AC: 3)**
  - [ ] Subtask 2.1: Create a `CreateAdminForm.vue` component in `src/components/auth/`.
  - [ ] Subtask 2.2: Add input fields for Full Name, Email, and Password with appropriate `q-input` components.
  - [ ] Subtask 2.3: Implement form validation using the `validateForm` function from the `useErrorHandler` composable.
  - [ ] Subtask 2.4: On submit, call an `createAdmin` action in the `auth-store`.
  - [ ] Subtask 2.5: The `createAdmin` action should use the Appwrite `account.create()` method.
  - [ ] Subtask 2.6: Upon successful creation, automatically log the new user in and redirect to the `/` (dashboard) route.

- [ ] **Task 3: Create Login Form (AC: 4, 5)**
  - [ ] Subtask 3.1: Create a `LoginForm.vue` component in `src/components/auth/`.
  - [ ] Subtask 3.2: Add input fields for Email and Password.
  - [ ] Subtask 3.3: Add a `q-checkbox` for the "Remember me" functionality.
  - [ ] Subtask 3.4: On submit, call a `login` action in the `auth-store`.
  - [ ] Subtask 3.5: The `login` action should use Appwrite's `account.createEmailPasswordSession`.
  - [ ] Subtask 3.6: On successful login, redirect to the `/` (dashboard) route.
  - [ ] Subtask 3.7: On failure, display a clear error notification.

- [ ] **Task 4: Implement Pinia Auth Store (AC: 6)**
  - [ ] Subtask 4.1: Create the store file at `src/stores/auth-store.js`.
  - [ ] Subtask 4.2: Define state properties: `user` (for the user object), `isLoggedIn` (boolean), and `isLoading` (boolean).
  - [ ] Subtask 4.3: Create actions: `login`, `logout`, `createAdmin`, `fetchUser`, and `checkSession`.
  - [ ] Subtask 4.4: The `checkSession` action should run on startup to see if a valid session exists and update the store state accordingly.

- [ ] **Task 5: Implement Route Protection & Logout (AC: 7, 8)**
  - [ ] Subtask 5.1: Create a new boot file `src/boot/router-auth.js`.
  - [ ] Subtask 5.2: In the boot file, add a `router.beforeEach` guard.
  - [ ] Subtask 5.3: The guard will check `auth-store.isLoggedIn`. If false and the route requires auth, redirect to `/auth`.
  - [ ] Subtask 5.4: Add a "Logout" button to the `MainLayout.vue`.
  - [ ] Subtask 5.5: The button will call the `logout` action in the `auth-store`.
  - [ ] Subtask 5.6: The `logout` action will call Appwrite's `account.deleteSession('current')` and clear the local store state.

## Dev Notes

- **Initial User Check**: The check for existing users should be performed in a boot file (`auth-init.js`) that runs before the main application mounts. This ensures the `hasUsers` state is available before any pages attempt to render. The Appwrite `users.list()` method with a `limit(1)` is the most efficient way to perform this check.
- **Conditional Page**: A single `AuthPage.vue` should be used to handle both the admin creation and login states. This avoids duplicating layout code and simplifies routing. A reactive property (e.g., `const showAdminForm = ref(false)`) can toggle between the two form components.
- **Store Initialization**: The `auth-store.js` should include a `checkSession` action that is dispatched from a boot file. This action will attempt to get the current user account from Appwrite. If successful, it populates the store and sets `isLoggedIn` to true, enabling seamless navigation for returning users with a valid session.
- **Route Guard Logic**: The `router-auth.js` boot file will be critical. The `beforeEach` guard must check `auth-store.isLoggedIn`. It should allow navigation to the `/auth` page but block all other pages if the user is not authenticated.
- **Component Naming**: All new components (`AuthPage.vue`, `CreateAdminForm.vue`, `LoginForm.vue`) must use PascalCase and the `<script setup>` syntax as mandated by the architecture.

### References

- [Source: `docs/epics.md#87-104`](docs/epics.md#87-104) - Original story acceptance criteria.
- [Source: `docs/epics.md#Story-1.9`](docs/epics.md#Story-1.9) - Context for first-time setup and admin creation.
- [Source: `docs/architecture.md#4.1-authentication`](docs/architecture.md#4.1-authentication) - Architectural decision for using Appwrite Auth.
- [Source: `docs/architecture.md#4.2-state-management`](docs/architecture.md#4.2-state-management) - Mandate for using Pinia for state management.
- [Source: `docs/ux-specification.md#Flow-3`](docs/ux-specification.md#Flow-3) - UX flow for the first-time setup wizard.
- [Source: `src/boot/appwrite.js`](src/boot/appwrite.js) - Existing Appwrite client initialization.
