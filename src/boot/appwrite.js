import { defineBoot } from '#q-app/wrappers';
import { Client, Account, Databases, Storage, Functions, TablesDB } from 'appwrite';

// Initialize Appwrite Client
// SSR-safe: Each request gets its own instance
const client = new Client();

// Configure client with environment variables
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '';

console.log('Appwrite Boot: Initializing with', { endpoint, projectId });

client.setEndpoint(endpoint).setProject(projectId);

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const tables = new TablesDB(client);

export default defineBoot(({ app }) => {
  // Make Appwrite services available globally for Options API
  app.config.globalProperties.$appwrite = {
    client,
    account,
    databases,
    storage,
    functions,
    tables,
  };
});

export { client };
