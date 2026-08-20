// E2E tests for resident CRUD operations.
// Requires a seeded test Appwrite project with admin user.

describe('Resident CRUD', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
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
    // Ensure at least one household exists (required for resident creation).
    cy.createHouseholdViaUI(`Resident HH ${Date.now()}`, 'Single Family', '2020-01-15');

    // Now create the resident.
    cy.visit('/residents');
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

    // Household assignment is required.
    cy.get('[data-test="household-select"]').click();
    cy.get('.q-menu .q-item').first().click();

    // Submit
    cy.get('[data-test="form-submit"], button:contains("Save"), button[type="submit"]')
      .last()
      .click();

    // Should see a success notification
    cy.shouldSeeSuccess('successfully');
  });

  it('can view a resident detail page', () => {
    // Setup: create a household + resident so the table is populated.
    const householdName = `Detail HH ${Date.now()}`;
    cy.createHouseholdViaUI(householdName, 'Single Family', '2020-01-15');
    cy.createResidentViaUI('Detail', 'Test', '1985-05-20', 'Female');

    // Go to residents list and click the view button on the first row.
    cy.visit('/residents');
    cy.get('[data-test="residents-table"] tbody tr').should('have.length.gte', 1);
    cy.get('[data-test="residents-table"] tbody tr')
      .first()
      .find('[data-test="view-resident-button"]')
      .click();

    // Should navigate to the resident detail page.
    cy.url().should('include', '/residents/');
  });
});
