// E2E tests for role-based access control (RBAC) navigation.
// Requires seeded users with different roles.

describe('RBAC navigation', () => {
  describe('admin user', () => {
    beforeEach(() => {
      cy.fixture('users').then((users) => {
        cy.visit('/auth');
        cy.get('[data-test="login-email"], input[type="email"]').type(users.adminUser.email);
        cy.get('[data-test="login-password"], input[type="password"]').type(users.adminUser.password);
        cy.get('[data-test="login-submit"], button[type="submit"]').click();
        cy.url().should('not.include', '/auth');
      });
    });

    it('can access admin settings page', () => {
      cy.visit('/admin/settings');
      cy.url().should('include', '/admin/settings');
    });

    it('can access admin users page', () => {
      cy.visit('/admin/users');
      cy.url().should('include', '/admin/users');
    });

    it('can access all module pages', () => {
      const modules = [
        '/residents',
        '/households',
        '/finance',
        '/inventory',
        '/calendar',
        '/storage',
      ];
      modules.forEach((path) => {
        cy.visit(path);
        cy.url().should('not.include', '/unauthorized');
      });
    });
  });

  describe('resident user (limited access)', () => {
    beforeEach(() => {
      cy.fixture('users').then((users) => {
        cy.visit('/auth');
        cy.get('[data-test="login-email"], input[type="email"]').type(users.resident.email);
        cy.get('[data-test="login-password"], input[type="password"]').type(users.resident.password);
        cy.get('[data-test="login-submit"], button[type="submit"]').click();
        cy.url().should('not.include', '/auth');
      });
    });

    it('is redirected to /unauthorized when accessing admin pages', () => {
      cy.visit('/admin/users');
      cy.url().should('include', '/unauthorized');
    });

    it('is redirected to /unauthorized when accessing finance', () => {
      cy.visit('/finance');
      cy.url().should('include', '/unauthorized');
    });
  });
});
