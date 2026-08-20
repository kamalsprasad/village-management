// ***********************************************
// Custom Cypress commands
// ***********************************************

// --- Authentication helpers ---

/**
 * Log in as an admin via the Appwrite API.
 * Assumes the test Appwrite project has a seeded admin account.
 * This avoids the login UI and reduces the chance of Appwrite rate limits.
 */
Cypress.Commands.add('loginAsAdmin', (email = 'admin@test.village', password = 'TestAdmin123!') => {
  cy.session([email, password], () => {
    const endpoint = Cypress.env('VITE_APPWRITE_ENDPOINT').replace(/\/$/, '');
    const projectId = Cypress.env('VITE_APPWRITE_PROJECT_ID');

    cy.request({
      method: 'POST',
      url: `${endpoint}/account/sessions/email`,
      headers: {
        'X-Appwrite-Project': projectId,
        'Content-Type': 'application/json',
      },
      body: { email, password },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(201);
    });
  });
});

/**
 * Log in as a specific user via the Appwrite API.
 */
Cypress.Commands.add('loginAs', (email, password) => {
  cy.session([email, password], () => {
    const endpoint = Cypress.env('VITE_APPWRITE_ENDPOINT').replace(/\/$/, '');
    const projectId = Cypress.env('VITE_APPWRITE_PROJECT_ID');

    cy.request({
      method: 'POST',
      url: `${endpoint}/account/sessions/email`,
      headers: {
        'X-Appwrite-Project': projectId,
        'Content-Type': 'application/json',
      },
      body: { email, password },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(201);
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
    body: JSON.stringify(payload),
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status !== 201 && response.status !== 200) {
      cy.log(`Function call failed: ${response.status}`, response.body);
    }
    return response;
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
