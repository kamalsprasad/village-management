// E2E tests for resident CRUD operations.
// Requires a seeded test Appwrite project with admin user and households.

describe('Resident CRUD', () => {
  before(() => {
    cy.loginAsAdmin();
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
    cy.get(
      '[data-test="create-resident-button"], button:contains("Add Resident"), button:contains("New Resident")',
    )
      .first()
      .click();
    // A form dialog or page should appear
    cy.get('[data-test="resident-form"], .q-dialog, form').should('exist');
  });

  it('can create a new resident', () => {
    // Open create form
    cy.get(
      '[data-test="create-resident-button"], button:contains("Add Resident"), button:contains("New Resident")',
    )
      .first()
      .click();

    // Fill form using data-test attributes.
    cy.get('[data-test="first-name"]').type('E2E Test');
    cy.get('[data-test="last-name"]').type('Resident');
    cy.get('[data-test="dob"]').type('1990-01-15');
    cy.get('[data-test="gender"]').click();
    cy.get('.q-menu .q-item').contains('Male').click();

    // Submit
    cy.get('[data-test="form-submit"], button:contains("Save"), button[type="submit"]')
      .last()
      .click();

    // Should see a success notification or the resident in the list
    cy.shouldSeeSuccess('successfully');
  });

  it('can view a resident detail page', () => {
    // Click the first resident in the list
    cy.get('[data-test="residents-table"] tbody tr').first().click();
    // Should navigate to detail or open a dialog
    cy.url().should('include', '/residents/');
  });
});
