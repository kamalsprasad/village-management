---
title: 'Story 5.14: Authentication Completeness - Password Change and Reset'
type: feature
created: '2026-08-03'
status: done
baseline_revision: 'fd109582a4fa0e76f6ffa6a550ba844f0a6679e6'
final_revision: 'a4cf756e47dba8ded5a4d0776d61f5ef4ae4491f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/docs/implementation-artifacts/epic-5-context.md'
warnings:
  - oversized
---

<intent-contract>

## Intent

**Problem:** Logged-in users cannot change their own password (ProfilePage's "Change Password" button is disabled with a stale "Epic 2" tooltip), and there is no forgot-password recovery flow for unauthenticated users, leaving admin-created accounts with no self-service password recourse.

**Approach:** Add `changePassword`, `requestPasswordReset`, and `resetPassword` actions to `auth-store.js` wrapping the Appwrite Account SDK (`updatePassword`, `createRecovery`, `updateRecovery`). Enable the ProfilePage dialog for change-password; add a "Forgot password?" dialog to `LoginForm.vue`; add a new public `/auth/reset-password` route/page that completes the recovery flow.

## Boundaries & Constraints

**Always:**

- Use `account` from `src/boot/appwrite.js` for all Appwrite Account SDK calls; no new Appwrite Function, table, or column.
- Enforce a minimum password length of 8 characters (matching `CreateAdminForm.vue`'s existing rule) on new-password fields client-side; let Appwrite validate the current password server-side via `oldPassword` — do not re-implement that check.
- `/auth/reset-password` route has no `requiresAuth` meta and no layout (matches `/auth`).
- All new/modified components use Vue 3 `<script setup>` and Quasar components; no raw HTML form controls.
- Client-only Appwrite calls in `ResetPasswordPage.vue` are guarded by an `isClient` ref set in `onMounted`, matching `AuthPage.vue`/`ProfilePage.vue`.
- All UI strings are hardcoded English; no i18n, no emojis.
- After `changePassword` succeeds, the existing session remains valid — do not call `logout` or force re-login.
- Derive the recovery redirect URL from `import.meta.env.VITE_APP_PUBLIC_URL` (never hardcode a host); document the var in `.env.example` with dev default `http://localhost:9000`.

**Block If:**

- N/A — no undecided design choices remain; all decisions below are resolved.

**Never:**

- Implement self-service signup or email verification (both explicitly out of scope per PRD FR-19).
- Add new RBAC permissions or modify `src/utils/permissions.js` / `usePermissions.js`.
- Modify `checkHasUsers`, `createAdmin`, `login`, `logout`, or `fetchUserRoles` behavior.

## I/O & Edge-Case Matrix

| Scenario                               | Input / State                                                                                      | Expected Output / Behavior                                                                                                | Error Handling                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Change password success                | Logged-in user enters correct current password + valid new password + matching confirmation        | `account.updatePassword({ password, oldPassword })` succeeds; success notification; dialog closes; session/user unchanged | N/A                                                                                                 |
| Change password wrong current password | Current password does not match                                                                    | Appwrite call rejects                                                                                                     | `notifyError` with Appwrite's error message; dialog stays open                                      |
| Change password mismatch confirmation  | New password and confirm new password differ                                                       | Submit blocked client-side                                                                                                | Inline validation message "Passwords do not match"; no API call made                                |
| Change password too short              | New password < 8 characters                                                                        | Submit blocked client-side                                                                                                | Inline validation message; no API call made                                                         |
| Forgot password success                | User enters a valid-looking email, clicks submit                                                   | `account.createRecovery({ email, url })` called with `url = ${VITE_APP_PUBLIC_URL}/auth/reset-password`                   | `notifySuccess` telling user to check email; dialog closes (do not reveal whether the email exists) |
| Forgot password Appwrite error         | `createRecovery` call rejects (e.g. rate limit)                                                    | Dialog stays open                                                                                                         | `notifyError` with Appwrite's error message                                                         |
| Reset password valid token             | `/auth/reset-password?userId=X&secret=Y` loaded, user submits new password + matching confirmation | `account.updateRecovery({ userId, secret, password })` succeeds                                                           | `notifySuccess`; redirect to `/auth` after a short delay                                            |
| Reset password missing token           | `userId` or `secret` query param absent                                                            | Form is not rendered                                                                                                      | `q-banner` shows "This password reset link is invalid or has expired." with a link back to `/auth`  |
| Reset password expired/invalid token   | `updateRecovery` call rejects                                                                      | Form stays rendered with fields cleared of password values                                                                | `notifyError` with Appwrite's error message                                                         |
| Reset password mismatch/too short      | New password and confirm differ, or new password < 8 characters                                    | Submit blocked client-side                                                                                                | Inline validation message; no API call made                                                         |

</intent-contract>

## Code Map

- `src/stores/auth-store.js` -- add `changePassword`, `requestPasswordReset`, `resetPassword` actions.
- `src/pages/profile/ProfilePage.vue` -- enable Change Password button, remove stale tooltip, open new dialog.
- `src/components/profile/ChangePasswordDialog.vue` -- new dialog: current/new/confirm password fields.
- `src/components/auth/LoginForm.vue` -- add "Forgot password?" link opening a new dialog.
- `src/components/auth/ForgotPasswordDialog.vue` -- new dialog: email input, calls `requestPasswordReset`.
- `src/pages/auth/ResetPasswordPage.vue` -- new public page reached from the recovery email link.
- `src/router/routes.js` -- add `/auth/reset-password` route (no layout, no `requiresAuth`).
- `.env.example` -- document `VITE_APP_PUBLIC_URL`.

## Tasks & Acceptance

**Execution:**

- [x] `.env.example` -- Add `VITE_APP_PUBLIC_URL=http://localhost:9000` with a comment explaining it's the base URL used to build the password-recovery redirect link. -- Makes the redirect URL environment-configurable per AC5.
- [x] `src/stores/auth-store.js` -- Add `async changePassword(oldPassword, newPassword)` action: calls `await account.updatePassword({ password: newPassword, oldPassword })`, returns `{ success: true }` on success or `{ success: false, error: error.message || 'Failed to change password' }` on catch, following the `login`/`logout` action pattern (no `isLoading` mutation needed since the dialog manages its own loading state). -- Satisfies AC2.
- [x] `src/stores/auth-store.js` -- Add `async requestPasswordReset(email)` action: builds `url = \`${import.meta.env.VITE_APP_PUBLIC_URL}/auth/reset-password\``and calls`await account.createRecovery({ email, url })`, returning `{ success: true }`or`{ success: false, error: error.message || 'Failed to send password reset email' }`. -- Satisfies AC5.
- [x] `src/stores/auth-store.js` -- Add `async resetPassword(userId, secret, newPassword)` action: calls `await account.updateRecovery({ userId, secret, password: newPassword })`, returning `{ success: true }` or `{ success: false, error: error.message || 'Failed to reset password' }`. -- Satisfies AC6.
- [x] `src/components/profile/ChangePasswordDialog.vue` -- New component: `v-model` boolean prop for dialog visibility (emits `update:modelValue`), a `q-form` with current-password, new-password, and confirm-password `q-input` fields (`type="password"` with a visibility-toggle icon matching `LoginForm.vue`'s pattern), client-side rules requiring all fields non-empty, new password >= 8 characters, and new password === confirm. On submit calls `authStore.changePassword(currentPassword, newPassword)`; on `{ success: true }` calls `notifySuccess('Password changed successfully.')`, resets the form, and emits `update:modelValue(false)`; on failure calls `notifyError(result.error)` and keeps the dialog open. -- Satisfies AC1-AC3.
- [x] `src/pages/profile/ProfilePage.vue` -- Remove `disabled` attribute and the stale `q-tooltip` ("available in Epic 2") from the Change Password `q-btn`; add `@click` to open a `showChangePasswordDialog` ref; render `<ChangePasswordDialog v-model="showChangePasswordDialog" />` guarded by `v-if="isClient"`. -- Satisfies AC1.
- [x] `src/components/auth/ForgotPasswordDialog.vue` -- New component: `v-model` boolean prop, a `q-form` with a single email `q-input` (required, basic email format rule matching `CreateAdminForm.vue`'s `isValidEmail`). On submit calls `authStore.requestPasswordReset(email)`; regardless of whether the account exists, on `{ success: true }` shows `notifySuccess('If an account exists for that email, a password reset link has been sent.')`, resets the form, and emits `update:modelValue(false)`; on `{ success: false }` calls `notifyError(result.error)` and keeps the dialog open. -- Satisfies AC4-AC5.
- [x] `src/components/auth/LoginForm.vue` -- Add a "Forgot password?" `q-btn` (flat, aligned right below the password field) that sets a `showForgotPasswordDialog` ref to `true`; render `<ForgotPasswordDialog v-model="showForgotPasswordDialog" />`. -- Satisfies AC4.
- [x] `src/pages/auth/ResetPasswordPage.vue` -- New page, no `MainLayout` (mirrors `AuthPage.vue`'s `q-layout`/`q-page-container`/gradient background structure). On `onMounted`, set `isClient.value = true` and read `userId`/`secret` from `route.query` via `useRoute()`. If either is missing, render a `q-banner` (negative) reading "This password reset link is invalid or has expired." with a `q-btn` linking to `/auth`. Otherwise render a `q-form` with new-password and confirm-password fields (same validation rules as `ChangePasswordDialog.vue`: >= 8 characters, must match). On submit calls `authStore.resetPassword(userId, secret, newPassword)`; on `{ success: true }` shows `notifySuccess('Password reset successfully. Please sign in with your new password.')` and `router.push('/auth')` after a 1.5s `setTimeout`; on `{ success: false }` calls `notifyError(result.error)` and keeps the form visible with fields cleared. -- Satisfies AC6.
- [x] `src/router/routes.js` -- Add a top-level route (alongside `/auth` and `/unauthorized`, outside the `MainLayout` children array): `{ path: '/auth/reset-password', component: () => import('pages/auth/ResetPasswordPage.vue') }` (no `meta`, so `requiresAuth` is absent and the route is public). -- Satisfies AC6.
- [x] `docs/sprint-status.yaml` -- Update `5-14-authentication-completeness-password-change-and-reset` from `backlog` to `done` after verification. -- Final status tracking.

**Acceptance Criteria:**

- **Given** a logged-in user on the Profile page, **when** they click the (now enabled) "Change Password" button, **then** a dialog opens with current-password, new-password, and confirm-password fields, and the stale "available in Epic 2" tooltip is gone.
- **Given** the change-password dialog is open with a correct current password and a valid, matching new password, **when** the user submits, **then** `account.updatePassword` is called with the old and new password, a success notification appears, the dialog closes, and the user remains logged in with no forced re-login.
- **Given** the change-password dialog with an incorrect current password, **when** the user submits, **then** an error notification is shown and the dialog remains open.
- **Given** an unauthenticated user on the login form, **when** they view the form, **then** a "Forgot password?" link/button is visible.
- **Given** the user clicks "Forgot password?" and submits a valid email, **when** the request completes, **then** `account.createRecovery` is called with a URL built from `VITE_APP_PUBLIC_URL` plus `/auth/reset-password`, and a success notification tells the user to check their email.
- **Given** a user follows the reset-password email link to `/auth/reset-password?userId=...&secret=...`, **when** they enter a valid new password and matching confirmation and submit, **then** `account.updateRecovery` is called and, on success, the user is notified and redirected to `/auth`.
- **Given** a user navigates to `/auth/reset-password` without `userId`/`secret` query params (or the token is later rejected by Appwrite), **when** the page loads or the submit fails, **then** a clear, user-friendly error is shown instead of a broken form or console error.
- **Given** the `/auth/reset-password` route, **when** any authenticated or unauthenticated user (or the SSR server render) hits it, **then** navigation is allowed without redirect to `/auth` or `/unauthorized` (route has no `requiresAuth`), and no hydration mismatch occurs due to the `isClient` guard.

## Spec Change Log

## Review Triage Log

### 2026-08-03 — Review pass

- intent_gap: 0
- bad_spec: 0
- patch: 8 (high 1, medium 2, low 5)
- defer: 4 (low 4)
- reject: 3 (low 3)
- addressed_findings:
  - `[high]` `[patch]` Dialogs (`ChangePasswordDialog.vue`, `ForgotPasswordDialog.vue`) did not clear form state when dismissed via ESC/backdrop click (no `@hide` handler). Added `@hide="resetForm"` on both `q-dialog` roots so stale plaintext password/email values never persist across reopenings in the same session.
  - `[medium]` `[patch]` `requestPasswordReset` built the recovery URL by naive string concatenation, producing a double slash if `VITE_APP_PUBLIC_URL` ends with `/`. Added `.replace(/\/+$/, '')` before appending `/auth/reset-password`.
  - `[medium]` `[patch]` No upper bound on password field length let a user paste a value beyond Appwrite's server-side password length limit, surfacing a raw Appwrite error instead of clean client-side feedback. Added `maxlength="265"` to all password `q-input` fields in `ChangePasswordDialog.vue` and `ResetPasswordPage.vue`.
  - `[low]` `[patch]` `ResetPasswordPage.vue` read `route.query.userId`/`route.query.secret` directly; a recovery link with a duplicated query key (e.g. `?userId=a&userId=b`) yields an array from vue-router, which would be passed straight to `account.updateRecovery` and produce an opaque SDK error. Added a `firstQueryValue` helper that coerces array values to their first element.
  - `[low]` `[patch]` `changePassword`/`requestPasswordReset`/`resetPassword` catch blocks accessed `error.message` directly; if Appwrite (or a network layer) ever rejects with a non-Error value (`null`/`undefined`), this would throw inside the catch block itself. Changed to optional chaining (`error?.message`) in all three actions.
  - `[low]` `[patch]` The diff reformatted an unrelated line in `LoginForm.vue` (collapsed the pre-existing `authStore.login(...)` call from multi-line to single-line) with no functional relationship to this story. Reverted to the original multi-line formatting to keep the diff focused.
  - addressed 6 distinct findings above (the dialog-dismissal finding was reported independently by both reviewers and counted once).
- Deferred to `docs/implementation-artifacts/deferred-work.md`: no guard against setting the new password equal to the current password (low); recovery `userId`/`secret` remain in the browser URL/history after use instead of being cleared via `router.replace` (low); no client-side resubmission throttle beyond the existing loading-state disable, relying on Appwrite's server-side rate limiting (low); password-visibility toggle icons have no `role`/`tabindex`/`aria-label` for keyboard/screen-reader access, but this mirrors the pre-existing pattern already in `LoginForm.vue` prior to this story (low).
- Rejected as noise: duplicated email-validation regex across `ForgotPasswordDialog.vue`/`CreateAdminForm.vue` (consistent with the codebase's existing per-form validation convention, not a new pattern); lack of automated test coverage (the project has no test framework configured — `npm test` is a no-op — so this is consistent with every other story in the repo, not a gap introduced here); speculative concern that Appwrite might leak account-existence through `createRecovery` error messages (Appwrite's documented behavior is to return success uniformly regardless of whether the email exists; no evidence in this codebase or the Appwrite SDK contradicts that).

## Design Notes

`ChangePasswordDialog.vue` and the new-password section of `ResetPasswordPage.vue` share identical validation rules (>= 8 chars, confirm match) but are kept as separate components/pages rather than extracted into a shared composable — the duplication is two small `q-input` blocks and extraction would add indirection disproportionate to the size of Story 5.14's scope. A future story may consolidate if a third password-entry surface appears.

## Verification

**Commands:**

- `npm run lint` -- expected: no new lint errors in changed files.

**Manual checks (if no CLI):**

- Start `npm run dev`, log in, go to `/profile`, open Change Password, submit with wrong current password (expect error, dialog stays open), then submit with correct current password + valid new password (expect success, dialog closes, still logged in — refresh the page to confirm session persists).
- Log out, on `/auth` click "Forgot password?", submit an email, confirm a success notification appears (email delivery itself is outside local dev scope unless SMTP is configured in Appwrite).
- Manually visit `/auth/reset-password` with no query params -- expect the invalid-link banner, not a broken form.
- Manually visit `/auth/reset-password?userId=x&secret=y` with a bogus secret, submit a valid new password -- expect an error notification (Appwrite rejects the invalid token) and the form to remain usable.

## Auto Run Result

Status: done

**Summary:** Implemented Story 5.14 (Authentication Completeness — Password Change and Reset). Logged-in users can now change their own password from the Profile page; unauthenticated users can request a recovery email from the login form and complete the reset on a new public `/auth/reset-password` page. All flows use the Appwrite Account SDK directly — no new Appwrite Function, table, column, or RBAC permission.

**Files changed:**

- `.env.example` — documented new `VITE_APP_PUBLIC_URL` env var (dev default `http://localhost:9000`).
- `src/stores/auth-store.js` — added `changePassword`, `requestPasswordReset`, `resetPassword` actions.
- `src/pages/profile/ProfilePage.vue` — enabled the Change Password button, removed the stale "Epic 2" tooltip, wired the new dialog.
- `src/components/profile/ChangePasswordDialog.vue` (new) — current/new/confirm password dialog.
- `src/components/auth/LoginForm.vue` — added a "Forgot password?" link.
- `src/components/auth/ForgotPasswordDialog.vue` (new) — email-only recovery request dialog.
- `src/pages/auth/ResetPasswordPage.vue` (new) — public page completing the recovery flow from the emailed link.
- `src/router/routes.js` — added the public `/auth/reset-password` route.
- `docs/sprint-status.yaml` — marked `5-14-authentication-completeness-password-change-and-reset: done`.
- `docs/implementation-artifacts/deferred-work.md` — recorded 4 deferred low-severity findings.

**Review findings breakdown:** 8 patches applied (1 high, 2 medium, 5 low — dialog form-state reset on ESC/backdrop dismiss, recovery URL trailing-slash handling, password field max length, array query-param coercion on the reset page, defensive `error?.message` access in all three new store actions, and reverting unrelated formatting churn in `LoginForm.vue`); 4 items deferred (no-op same-password change, lingering recovery token in browser history, no resubmission throttle, password-toggle accessibility — all low severity); 3 rejected as noise (duplicated email-regex convention already present elsewhere in the codebase, lack of automated tests consistent with the rest of the project, and a speculative Appwrite account-existence-leak concern with no supporting evidence). No intent gaps or bad-spec loopbacks occurred.

**Verification performed:** `npm run lint` passed with zero errors both after initial implementation and after the review patches. Manually traced all Appwrite SDK call shapes (`updatePassword`, `createRecovery`, `updateRecovery`) against the installed `appwrite` package source to confirm the object-parameter signatures. Confirmed route placement (`/auth/reset-password` sits outside `MainLayout`'s children, has no `requiresAuth` meta, and is unaffected by the `router-guards.js` first-run/permission checks). No automated test suite exists in this repo (`npm test` is a no-op), consistent with every other Epic 5 story.

**Residual risks:** The four deferred low-severity items above remain open (tracked in `deferred-work.md`). The `VITE_APP_PUBLIC_URL=http://localhost:9000` dev default assumes the standard Quasar CLI dev-server port, which is not explicitly pinned in `quasar.config.js`; if a developer's local Quasar dev server binds a different port, recovery links in local testing will point at the wrong host until `.env` is corrected — self-evident in local testing, not a production risk since production deployments must set their own `VITE_APP_PUBLIC_URL`.
