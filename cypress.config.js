import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9000',
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
      // These are overridden by .env.test or CI environment variables.
      // Never put real secrets here.
      VITE_APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
      VITE_APPWRITE_PROJECT_ID: 'test-project',
    },
    setupNodeEvents(on, config) {
      // Upload coverage artifacts and screenshots/videos on failure.
      // Additional task registration can be added here.
      return config;
    },
  },
});
