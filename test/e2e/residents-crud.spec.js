// E2E tests for resident CRUD operations.
// Requires a seeded test Appwrite project with admin user and households.

describe('Resident CRUD', () => {
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
    cy.visit('/residents');
    cy.url().should('include', '/residents');
  });

  it('displays the residents list page', () => {
    cy.get('body').should('be.visible');
    cy.contains('h1, h2, .text-h5, .text-h6', /residents/i).should('exist');
  });

  it('can open the create resident form', () => {
    cy.get('[data-test="create-resident-button"], button:contains("Add Resident"), button:contains("New Resident")')
      .first()
      .click();
    // A form dialog or page should appear
    cy.get('[data-test="resident-form"], .q-dialog, form').should('exist');
  });

  it('can create a new resident', () => {
    // Open create form
    cy.get('[data-test="create-resident-button"], button:contains("Add Resident"), button:contains("New Resident")')
      .first()
      .click();

    // Fill form — using flexible selectors since data-test attributes
    // may not be on all fields yet.
    cy.get('input[name="first_name"], [data-test="first-name"]').type('E2E Test');
    cy.get('input[name="last_name"], [data-test="last-name"]').type('Resident');
    cy.get('input[name="dob"], [data-test="dob"]').type('1990-01-15');
    cy.get('select[name="gender"], [data-test="gender"]').select('male');

    // Submit
    cy.get('[data-test="form-submit"], button:contains("Save"), button[type="submit"]')
      .last()
      .click();

    // Should see a success notification or the resident in the list
    cy.shouldSeeSuccess('successfully');
  });

  it('can view a resident detail page', () => {
    // Click the first resident in the list
    cy.get('[data-test="resident-row"], tbody tr').first().click();
    // Should navigate to detail or open a dialog
    cy.url().should('include', '/residents/');
  });
});
