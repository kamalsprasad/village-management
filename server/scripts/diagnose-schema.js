import { Client, TablesDB } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const stripQuotes = (str) => (str ? str.replace(/^["']|["']$/g, '') : str);

const config = {
  endpoint: stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1',
  projectId: stripQuotes(process.env.APPWRITE_PROJECT_ID),
  apiKey: stripQuotes(process.env.APPWRITE_API_KEY),
  databaseId: stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB',
};

if (!config.apiKey) {
  console.error('❌ APPWRITE_API_KEY not found in server/.env');
  process.exit(1);
}

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
const tables = new TablesDB(client);

const TABLES_TO_CHECK = ['plantings', 'harvests', 'harvest_entries', 'inventory', 'farm_sales', 'finance_transactions', 'vendors'];

async function main() {
  console.log(`\n🔍 Diagnosing schema for database: ${config.databaseId}\n`);

  for (const tableId of TABLES_TO_CHECK) {
    console.log(`\n=== ${tableId} ===`);
    try {
      const res = await tables.listColumns({ databaseId: config.databaseId, tableId });
      const cols = res.columns || [];
      console.log(`  Total columns: ${cols.length}`);
      for (const col of cols) {
        const status = col.status || 'unknown';
        const type = col.type;
        console.log(`  - ${col.key} (${type}) [status: ${status}]`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${err.message} (code: ${err.code || err.status || '?'})`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
