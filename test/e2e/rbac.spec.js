// E2E tests for role-based access control (RBAC) navigation.
// Requires seeded users with different roles.

describe('RBAC navigation', () => {
  describe('admin user', () => {
    beforeEach(() => {
      cy.loginAsAdmin();
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
    before(() => {
      cy.loginAsAdmin();
      cy.fixture('users').then((users) => {
        cy.ensureUser({ ...users.resident, roleName: 'Village Resident' });
      });
    });

    beforeEach(() => {
      cy.fixture('users').then((users) => {
        cy.loginAs(users.resident.email, users.resident.password);
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
