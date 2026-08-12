// ***********************************************
// Cypress E2E support commands
// ***********************************************

import './commands';

// Catch uncaught errors from the app so Cypress doesn't fail on
// benign Vue warnings or Appwrite SDK console.error noise.
Cypress.on('uncaught:exception', (err) => {
  // Returning false prevents Cypress from failing the test.
  // Only suppress known-benign errors; let real crashes propagate.
  if (err.message.includes('ResizeObserver')) return false;
  if (err.message.includes('Hydration')) return false;
  // Allow all other errors to fail the test.
  return true;
});
