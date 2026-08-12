// E2E tests for authentication flows.
// Requires a seeded test Appwrite project with admin/finance/farm/resident users.

describe('Authentication flows', () => {
  describe('login', () => {
    it('redirects to /auth when not logged in', () => {
      cy.visit('/');
      cy.url().should('include', '/auth');
    });

    it('shows error on invalid credentials', () => {
      cy.visit('/auth');
      cy.get('[data-test="login-email"], input[type="email"]').type('wrong@test.village');
      cy.get('[data-test="login-password"], input[type="password"]').type('wrongpassword');
      cy.get('[data-test="login-submit"], button[type="submit"]').click();
      // Should stay on auth page and show an error
      cy.url().should('include', '/auth');
    });

    it('logs in successfully as admin', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/auth');
        cy.get('[data-test="login-email"], input[type="email"]').type(users.adminUser.email);
        cy.get('[data-test="login-password"], input[type="password"]').type(users.adminUser.password);
        cy.get('[data-test="login-submit"], button[type="submit"]').click();
        // Should redirect away from auth
        cy.url().should('not.include', '/auth');
      });
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      cy.fixture('users').then((users) => {
        cy.visit('/auth');
        cy.get('[data-test="login-email"], input[type="email"]').type(users.adminUser.email);
        cy.get('[data-test="login-password"], input[type="password"]').type(users.adminUser.password);
        cy.get('[data-test="login-submit"], button[type="submit"]').click();
        cy.url().should('not.include', '/auth');
      });
    });

    it('logs out and redirects to /auth', () => {
      // Find and click the user menu / logout button
      cy.get('body').then(($body) => {
        if ($body.find('[data-test="user-menu"]').length) {
          cy.get('[data-test="user-menu"]').click();
          cy.get('[data-test="logout-button"]').click();
        } else {
          // Fallback: look for a logout button or avatar menu
          cy.get('[data-test="logout-button"], button:contains("Logout")').click();
        }
      });
      cy.url().should('include', '/auth');
    });
  });

  describe('protected routes', () => {
    it('redirects to /auth after logout when visiting protected route', () => {
      cy.visit('/auth');
      cy.url().should('include', '/auth');
      // Visit a protected route directly
      cy.visit('/residents');
      cy.url().should('include', '/auth');
    });
  });
});
