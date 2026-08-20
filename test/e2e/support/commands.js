// ***********************************************
// Custom Cypress commands
// ***********************************************

// --- Authentication helpers ---

/**
 * Log in as an admin through the UI.
 * Assumes the test Appwrite project has a seeded admin account.
 * Using the UI (rather than a direct API request) ensures the Appwrite
 * session cookie is set in the same browser context the app runs in, so
 * subsequent `cy.visit()` calls are authenticated.
 * `cy.session` caches the session, so each spec only pays for one UI login.
 */
Cypress.Commands.add('loginAsAdmin', (email = 'admin@test.village', password = 'TestAdmin123!') => {
  cy.session([email, password], () => {
    cy.visit('/auth');
    cy.get('[data-test="login-email"]').should('be.visible').type(email);
    cy.get('[data-test="login-password"]').should('be.visible').type(password);
    cy.get('[data-test="login-submit"]').click();
    cy.url().should('not.include', '/auth');
  });
});

/**
 * Log in as a specific user through the UI.
 */
Cypress.Commands.add('loginAs', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/auth');
    cy.get('[data-test="login-email"]').should('be.visible').type(email);
    cy.get('[data-test="login-password"]').should('be.visible').type(password);
    cy.get('[data-test="login-submit"]').click();
    cy.url().should('not.include', '/auth');
  });
});

/**
 * Ensure a test user exists in the Appwrite project, creating it via the
 * User Management function if necessary. Must be called while an admin
 * session is active (e.g. after `cy.loginAsAdmin()`).
 */
Cypress.Commands.add('ensureUser', ({ email, password, name, roleName }) => {
  const endpoint = Cypress.env('VITE_APPWRITE_ENDPOINT').replace(/\/$/, '');
  const projectId = Cypress.env('VITE_APPWRITE_PROJECT_ID');
  const dbId = Cypress.env('VITE_APPWRITE_DATABASE_ID');
  const usersTableId = Cypress.env('VITE_APPWRITE_TABLE_USERS') || 'users';
  const rolesTableId = Cypress.env('VITE_APPWRITE_TABLE_ROLES') || 'roles';

  const rowsFrom = (response) => response.body?.rows || response.body?.documents || [];

  // Find the target role by name. Fetch all roles and filter in JS to avoid
  // Appwrite query-string serialization issues (queries[] vs queries[0]).
  cy.request({
    method: 'GET',
    url: `${endpoint}/tablesdb/${dbId}/tables/${rolesTableId}/rows`,
    headers: { 'X-Appwrite-Project': projectId },
    qs: { limit: 100 },
    failOnStatusCode: false,
  }).then((roleResponse) => {
    if (roleResponse.status !== 200) {
      throw new Error(`Failed to fetch roles: ${roleResponse.status}`);
    }
    const role = rowsFrom(roleResponse).find((r) => r.name === roleName);
    if (!role) {
      throw new Error(
        `Role "${roleName}" not found. Make sure server/scripts/seed-roles.js has been run.`,
      );
    }
    const roleId = role.$id;

    // Check whether a user profile with this email already exists.
    cy.request({
      method: 'GET',
      url: `${endpoint}/tablesdb/${dbId}/tables/${usersTableId}/rows`,
      headers: { 'X-Appwrite-Project': projectId },
      qs: { limit: 100 },
      failOnStatusCode: false,
    }).then((userResponse) => {
      if (userResponse.status === 200 && rowsFrom(userResponse).some((u) => u.email === email)) {
        cy.log(`User ${email} already exists`);
        return;
      }

      cy.callAppwriteFunction('user_management', {
        action: 'createUser',
        name,
        email,
        password,
        role_ids: [roleId],
      }).then((response) => {
        if (response.status !== 201 && response.status !== 200) {
          throw new Error(`Failed to create user ${email}: ${response.status}`);
        }
        if (response.body?.success !== true) {
          throw new Error(
            `Failed to create user ${email}: ${response.body?.error || JSON.stringify(response.body)}`,
          );
        }
        cy.log(`Created test user ${email}`);
      });
    });
  });
});

/**
 * Log out via the UI.
 */
Cypress.Commands.add('logout', () => {
  cy.get('[data-test="user-menu"]').click();
  cy.get('[data-test="logout-button"]').click();
  // Confirm the logout dialog
  cy.get('.q-dialog').should('be.visible');
  cy.get('.q-dialog button').contains('OK').click();
  cy.url().should('include', '/auth');
});

// --- Appwrite data helpers ---

/**
 * Wipe all data via the Appwrite wipe function.
 * Requires an authenticated admin session.
 */
Cypress.Commands.add('wipeData', () => {
  cy.callAppwriteFunction('wipeAllData', { userId: 'admin' }).then((response) => {
    cy.log('Data wiped:', response);
  });
});

/**
 * Seed sample data via the Appwrite seed function.
 */
Cypress.Commands.add('seedData', () => {
  cy.callAppwriteFunction('seedAllData', {}).then((response) => {
    cy.log('Data seeded:', response);
  });
});

/**
 * Call an Appwrite Function by name (env var) via the Appwrite REST API.
 * This bypasses the UI and is used for test setup/teardown only.
 */
Cypress.Commands.add('callAppwriteFunction', (functionEnvVar, payload) => {
  const endpoint = Cypress.env('VITE_APPWRITE_ENDPOINT');
  const projectId = Cypress.env('VITE_APPWRITE_PROJECT_ID');
  const functionId =
    Cypress.env(`VITE_APPWRITE_FUNCTION_${functionEnvVar.toUpperCase()}`) || functionEnvVar;

  cy.request({
    method: 'POST',
    url: `${endpoint}/functions/${functionId}/executions`,
    headers: {
      'X-Appwrite-Project': projectId,
      'Content-Type': 'application/json',
    },
    body: { body: JSON.stringify(payload) },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status !== 201 && response.status !== 200) {
      cy.log(`Function call failed: ${response.status}`, response.body);
      return response;
    }
    // The Appwrite executions endpoint returns execution metadata, not the
    // function's own response. The function's actual output is nested as a
    // JSON string in `responseBody`, with its HTTP status in
    // `responseStatusCode`. Unwrap it so callers receive the function's
    // real return value directly.
    const execution = response.body;
    const fnStatus = execution?.responseStatusCode;
    const fnBodyRaw = execution?.responseBody;
    let fnBody = fnBodyRaw;
    if (typeof fnBodyRaw === 'string' && fnBodyRaw) {
      try {
        fnBody = JSON.parse(fnBodyRaw);
      } catch {
        // keep raw string if it isn't JSON
      }
    }
    return { ...response, status: fnStatus ?? response.status, body: fnBody };
  });
});

// --- Navigation helpers ---

/**
 * Visit a page and wait for it to fully load.
 */
Cypress.Commands.add('visitPage', (path) => {
  cy.visit(path);
  cy.get('body').should('be.visible');
});

/**
 * Assert that the current user can see a specific nav item.
 */
Cypress.Commands.add('shouldSeeNavItem', (label) => {
  cy.get('[data-test="main-nav"]').should('contain', label);
});

/**
 * Assert that the current user cannot see a specific nav item.
 */
Cypress.Commands.add('shouldNotSeeNavItem', (label) => {
  cy.get('[data-test="main-nav"]').should('not.contain', label);
});

// --- CRUD helpers ---

/**
 * Create a household via the UI. Assumes the user is already logged in
 * and has the households:write permission.
 * @param {string} name - Household name
 * @param {string} type - Household type (e.g. 'Single Family')
 * @param {string} [constructionDate] - Construction date (YYYY-MM-DD), defaults to today
 */
Cypress.Commands.add('createHouseholdViaUI', (name, type = 'Single Family', constructionDate) => {
  const date = constructionDate || new Date().toISOString().split('T')[0];
  cy.visit('/households');
  cy.get('[data-test="create-household-button"]').should('be.visible').click();
  cy.get('[data-test="household-name"]').type(name);
  cy.get('[data-test="household-type"]').click();
  cy.get('.q-menu .q-item').contains(type).click();
  // construction_date is a required field in HouseholdForm
  cy.get('[data-test="household-name"]') // ensure form is ready
    .closest('form')
    .find('input[type="date"]')
    .first()
    .type(date);
  cy.get('[data-test="form-submit"]').click();
  cy.shouldSeeSuccess('successfully');
  // Wait for dialog to close and list to refresh
  cy.get('[data-test="households-table"]').should('be.visible');
});

/**
 * Create a resident via the UI. Assumes the user is already logged in,
 * has the residents:write permission, and at least one household exists.
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} dob - Date of birth (YYYY-MM-DD)
 * @param {string} gender - 'Male', 'Female', or 'Other'
 */
Cypress.Commands.add('createResidentViaUI', (firstName, lastName, dob, gender = 'Male') => {
  cy.visit('/residents');
  cy.get('[data-test="create-resident-button"]').should('be.visible').click();
  cy.get('[data-test="first-name"]').type(firstName);
  cy.get('[data-test="last-name"]').type(lastName);
  cy.get('[data-test="dob"]').type(dob);
  cy.get('[data-test="gender"]').click();
  cy.get('.q-menu .q-item').contains(gender).click();
  // Household assignment is required — select the first available household.
  cy.get('[data-test="household-select"]').click();
  cy.get('.q-menu .q-item').first().click();
  cy.get('[data-test="form-submit"]').click();
  cy.shouldSeeSuccess('successfully');
  // Wait for dialog to close and list to refresh
  cy.get('[data-test="residents-table"]').should('be.visible');
});

// --- Form helpers ---

/**
 * Fill a form by data-test attributes.
 * @param {Object} fields - { 'data-test-value': 'value' }
 */
Cypress.Commands.add('fillForm', (fields) => {
  Object.entries(fields).forEach(([testId, value]) => {
    cy.get(`[data-test="${testId}"]`).clear().type(value);
  });
});

/**
 * Submit a form by clicking the submit button.
 */
Cypress.Commands.add('submitForm', (testId = 'form-submit') => {
  cy.get(`[data-test="${testId}"]`).click();
});

// --- Notification helpers ---

/**
 * Wait for a success notification to appear.
 */
Cypress.Commands.add('shouldSeeSuccess', (text) => {
  cy.get('.q-notification').should('contain', text);
});

/**
 * Wait for an error notification to appear.
 */
Cypress.Commands.add('shouldSeeError', (text) => {
  cy.get('.q-notification').should('contain', text);
});
