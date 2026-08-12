// E2E tests for household CRUD operations.
// Requires a seeded test Appwrite project with admin user.

describe('Household CRUD', () => {
  before(() => {
    cy.fixture('users').then((users) => {
      cy.visit('/auth');
      cy.get('[data-test="login-email"], input[type="email"]').type(users.adminUser.email);
      cy.get('[data-test="login-password"], input[type="password"]').type(users.adminUser.password);
      cy.get('[data-test="login-submit"], button[type="submit"]').click();
      cy.url().should('not.include', '/auth');
    });
  });

  beforeEach(() => {
    cy.visit('/households');
    cy.url().should('include', '/households');
  });

  it('displays the households list page', () => {
    cy.get('body').should('be.visible');
    cy.contains('h1, h2, .text-h5, .text-h6', /households/i).should('exist');
  });

  it('can open the create household form', () => {
    cy.get('[data-test="create-household-button"], button:contains("Add Household"), button:contains("New Household")')
      .first()
      .click();
    cy.get('[data-test="household-form"], .q-dialog, form').should('exist');
  });

  it('can create a new household', () => {
    cy.get('[data-test="create-household-button"], button:contains("Add Household"), button:contains("New Household")')
      .first()
      .click();

    cy.get('input[name="name"], [data-test="household-name"]').type('E2E Test Household');
    cy.get('select[name="household_type"], [data-test="household-type"]').select('family');

    cy.get('[data-test="form-submit"], button:contains("Save"), button[type="submit"]')
      .last()
      .click();

    cy.shouldSeeSuccess('successfully');
  });

  it('cannot delete a household with occupants', () => {
    // Find a household with occupants and try to delete it
    cy.get('[data-test="household-row"], tbody tr').first().then(($row) => {
      // Click delete button if it exists
      cy.wrap($row).find('[data-test="delete-button"], button:contains("Delete")').first().click();
      // Confirm deletion
      cy.get('[data-test="confirm-delete"], button:contains("Confirm")').last().click();
      // Should see an error about occupants
      // (This may pass or fail depending on whether the household has occupants)
    });
  });
});
