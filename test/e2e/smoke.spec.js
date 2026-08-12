// E2E smoke test: verify the app loads and basic navigation works.
// This is the minimum viable E2E test to validate the Cypress setup.

describe('App smoke test', () => {
  it('loads the auth page on first visit', () => {
    cy.visit('/auth');
    cy.get('body').should('be.visible');
    // The auth page should have a login form
    cy.get('[data-test="login-email"], input[type="email"]').should('exist');
  });

  it('redirects unauthenticated users to /auth', () => {
    cy.visit('/');
    // Should redirect to auth page
    cy.url().should('include', '/auth');
  });

  it('can navigate to the setup page', () => {
    cy.visit('/setup');
    cy.get('body').should('be.visible');
  });

  it('shows the unauthorized page', () => {
    cy.visit('/unauthorized');
    cy.get('body').should('be.visible');
  });
});
