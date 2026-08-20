import { defineConfig } from 'cypress';
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load the test environment so Cypress.env() mirrors the app's Vite env.
// This ensures cy.request() calls hit the same Appwrite endpoint/project as the UI.
dotenvConfig({ path: resolve(process.cwd(), '.env.test'), override: true });

// Expose all VITE_* variables to Cypress tests.
const viteEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')),
);

export default defineConfig({
  e2e: {
    baseUrl: process.env.VITE_APP_PUBLIC_URL || 'http://localhost:9000',
    specPattern: 'test/e2e/**/*.spec.js',
    supportFile: 'test/e2e/support/e2e.js',
    fixturesFolder: 'test/e2e/fixtures',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      // Safe defaults; overridden by .env.test values above.
      VITE_APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
      VITE_APPWRITE_PROJECT_ID: 'test-project',
      ...viteEnv,
    },
    setupNodeEvents(on, config) {
      // Upload coverage artifacts and screenshots/videos on failure.
      // Additional task registration can be added here.
      return config;
    },
  },
});
