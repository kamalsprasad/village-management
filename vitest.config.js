// Vitest configuration for the Village Management System.
// Mirrors Quasar's path aliases so tests can import source modules
// using the same paths the app uses (src/..., stores/..., #q-app/wrappers).
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ mode }) => {
  // Load .env (and .env.test when mode === 'test') so import.meta.env
  // resolves VITE_APPWRITE_* the same way the app expects.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        src: r('./src'),
        'src/': r('./src/'),
        app: r('.'),
        'app/': r('./'),
        components: r('./src/components'),
        layouts: r('./src/layouts'),
        pages: r('./src/pages'),
        assets: r('./src/assets'),
        boot: r('./src/boot'),
        stores: r('./src/stores'),
        test: r('./test'),
        'test/': r('./test/'),
        // Boot files import '#q-app/wrappers' for defineBoot/defineStore glue.
        // In tests we replace it with a thin stub.
        '#q-app/wrappers': r('./test/stubs/q-app-wrappers.js'),
      },
    },
    define: {
      // Surface env vars on import.meta.env like Vite does in the app.
      'import.meta.env.VITE_APPWRITE_ENDPOINT': JSON.stringify(
        env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      ),
      'import.meta.env.VITE_APPWRITE_PROJECT_ID': JSON.stringify(
        env.VITE_APPWRITE_PROJECT_ID || 'test-project',
      ),
      'import.meta.env.VITE_APPWRITE_DATABASE_ID': JSON.stringify(
        env.VITE_APPWRITE_DATABASE_ID || 'villageDB',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_USERS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_USERS || 'users',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_ROLES': JSON.stringify(
        env.VITE_APPWRITE_TABLE_ROLES || 'roles',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_RESIDENTS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_RESIDENTS || 'residents',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_HOUSEHOLDS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_HOUSEHOLDS || 'households',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_VILLAGE_SETTINGS || 'village_settings',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_INVENTORY': JSON.stringify(
        env.VITE_APPWRITE_TABLE_INVENTORY || 'inventory',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_VILLAGE_EVENTS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_VILLAGE_EVENTS || 'village_events',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATIONS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_NOTIFICATIONS || 'notifications',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_NOTIFICATION_READS': JSON.stringify(
        env.VITE_APPWRITE_TABLE_NOTIFICATION_READS || 'notification_reads',
      ),
      'import.meta.env.VITE_APPWRITE_TABLE_FILE_METADATA': JSON.stringify(
        env.VITE_APPWRITE_TABLE_FILE_METADATA || 'file_metadata',
      ),
      'import.meta.env.VITE_APPWRITE_BUCKET_PERSONAL_FILES': JSON.stringify(
        env.VITE_APPWRITE_BUCKET_PERSONAL_FILES || 'personal_files',
      ),
      'import.meta.env.VITE_APPWRITE_BUCKET_SHARED_FILES': JSON.stringify(
        env.VITE_APPWRITE_BUCKET_SHARED_FILES || 'shared_files',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_CHECK_USERS': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_CHECK_USERS || 'checkUsersExist',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_WIPE_DATA': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_WIPE_DATA || 'wipeAllData',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_SEED_DATA': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_SEED_DATA || 'seedAllData',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_STORAGE_REPORT': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_STORAGE_REPORT || 'storageUsageReport',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_USER_MANAGEMENT': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_USER_MANAGEMENT || 'userManagement',
      ),
      'import.meta.env.VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION': JSON.stringify(
        env.VITE_APPWRITE_FUNCTION_CREATE_NOTIFICATION || 'createNotification',
      ),
      'import.meta.env.VITE_APP_PUBLIC_URL': JSON.stringify(
        env.VITE_APP_PUBLIC_URL || 'http://localhost:9000',
      ),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./test/setup.js'],
      include: ['test/unit/**/*.spec.js', 'src/**/*.spec.js'],
      exclude: ['node_modules', 'dist', 'test/e2e/**', 'cypress/**'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'html', 'lcov'],
        reportsDirectory: 'coverage',
        // Tiered thresholds are enforced in CI via a per-layer script
        // (see .github/workflows/test.yml and scripts/check-coverage.mjs),
        // not via a single global gate that would block during the
        // test build-out across Phases 1-4.
      },
    },
  };
});
