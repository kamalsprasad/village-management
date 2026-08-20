// E2E tests for household CRUD operations.
// Requires a seeded test Appwrite project with admin user.

describe('Household CRUD', () => {
  beforeEach(() => {
    cy.loginAsAdmin();
    cy.visit('/households');
    cy.url().should('include', '/households');
  });

  it('displays the households list page', () => {
    cy.get('body').should('be.visible');
    cy.contains('h1, h2, .text-h5, .text-h6', /households/i).should('exist');
  });

  it('can open the create household form', () => {
    cy.get(
      '[data-test="create-household-button"], button:contains("Add Household"), button:contains("New Household")',
    )
      .first()
      .click();
    cy.get('[data-test="household-form"], .q-dialog, form').should('exist');
  });

  it('can create a new household', () => {
    cy.get(
      '[data-test="create-household-button"], button:contains("Add Household"), button:contains("New Household")',
    )
      .first()
      .click();

    cy.get('[data-test="household-name"]').type('E2E Test Household');
    cy.get('[data-test="household-type"]').click();
    cy.get('.q-menu .q-item').contains('Single Family').click();
    // construction_date is a required field
    cy.get('[data-test="household-name"]')
      .closest('form')
      .find('input[type="date"]')
      .first()
      .type('2020-01-15');

    cy.get('[data-test="form-submit"], button:contains("Save"), button[type="submit"]')
      .last()
      .click();

    cy.shouldSeeSuccess('successfully');
  });

  it('cannot delete a household with occupants', () => {
    // Setup: create a household, then add a resident to it so it has an occupant.
    const householdName = `Occupied HH ${Date.now()}`;
    cy.createHouseholdViaUI(householdName, 'Single Family', '2020-01-15');

    // Add a resident to this household via the residents page.
    cy.createResidentViaUI('Occupant', 'Test', '1990-01-15', 'Male');

    // Go back to households and find the household we created.
    cy.visit('/households');
    cy.get('[data-test="households-table"] tbody tr').should('have.length.gte', 1);

    // The household with occupants should not show a delete button (the UI
    // hides delete/edit actions when occupant_count > 0).
    cy.get('[data-test="households-table"] tbody tr').each(($row) => {
      const name = $row.find('td').first().text();
      if (name.includes(householdName)) {
        // The delete button should NOT be present for this household.
        cy.wrap($row).find('[data-test="delete-button"]').should('not.exist');
      }
    });
  });
});
