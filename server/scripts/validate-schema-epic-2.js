import { Client, RelationshipType, TablesDB, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from server .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Configuration
const config = {
  endpoint: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  databaseId: 'villageDB',
};

// Validate Config
if (!config.apiKey) {
  console.error('❌ Error: APPWRITE_API_KEY not found in server/.env file');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);
console.log(`   Project: ${config.projectId}`);

const tables = new TablesDB(client);

// Collection IDs
const TABLES = {
  TRANSACTIONS: 'finance_transactions',
  FUNDING_SOURCES: 'funding_sources',
  LOANS: 'loans',
  INVENTORY: 'inventory',
  RESIDENTS: 'residents',
};

async function setupSchema() {
  console.log('🚀 Starting Epic 2 Schema Validation Setup...');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);

  try {
    // 1. Create Tables
    await createTableIfNotExists(TABLES.TRANSACTIONS, 'Finance Transactions');
    await createTableIfNotExists(TABLES.FUNDING_SOURCES, 'Funding Sources');
    await createTableIfNotExists(TABLES.LOANS, 'Loans');
    await createTableIfNotExists(TABLES.INVENTORY, 'Inventory');

    // 2. Define Columns (Schema)

    // --- Funding Sources ---
    console.log('📦 Configuring Funding Sources...');
    await createColumn(TABLES.FUNDING_SOURCES, 'string', 'name', 255, true);
    await createColumn(TABLES.FUNDING_SOURCES, 'float', 'total_allocated', null, true);
    await createColumn(TABLES.FUNDING_SOURCES, 'float', 'current_balance', null, true);
    await createColumn(TABLES.FUNDING_SOURCES, 'string', 'restrictions', 1000, false);

    // --- Finance Transactions ---
    console.log('💰 Configuring Finance Transactions...');
    await createColumn(TABLES.TRANSACTIONS, 'enum', 'type', 20, true, false, [
      'expense',
      'income',
      'transfer',
    ]);
    await createColumn(TABLES.TRANSACTIONS, 'float', 'amount', null, true);
    await createColumn(TABLES.TRANSACTIONS, 'enum', 'category', null, true, false, [
      'Farm Inputs',
      'Farm Assets',
      'Village Assets',
      'School Assets',
      'Staff Reimbursements',
      'Other',
    ]);
    await createColumn(TABLES.TRANSACTIONS, 'string', 'source_module', 50, true);
    await createColumn(TABLES.TRANSACTIONS, 'datetime', 'date', null, true);
    await createColumn(TABLES.TRANSACTIONS, 'string', 'description', 500, true);
    await createColumn(TABLES.TRANSACTIONS, 'string', 'status', 20, true);
    await createRelationshipColumn(
      TABLES.TRANSACTIONS,
      TABLES.FUNDING_SOURCES,
      RelationshipType.ManyToOne,
      true,
      'funding_source_id',
      'transaction_ids',
      'restrict',
    );
    await createRelationshipColumn(
      TABLES.TRANSACTIONS,
      TABLES.LOANS,
      RelationshipType.ManyToOne,
      true,
      'loan_id',
      'transaction_ids',
      'restrict',
    );
    await createRelationshipColumn(
      TABLES.TRANSACTIONS,
      TABLES.INVENTORY,
      RelationshipType.OneToMany,
      false,
      'inventory_ids',
      null,
      'restrict',
    );

    // --- Loans ---
    console.log('💸 Configuring Loans...');
    await createRelationshipColumn(
      TABLES.LOANS,
      TABLES.RESIDENTS,
      RelationshipType.ManyToOne,
      true,
      'borrower_id',
      'loans',
      'restrict',
    );
    await createColumn(TABLES.LOANS, 'float', 'principal_amount', null, true);
    await createColumn(TABLES.LOANS, 'float', 'interest_rate', null, true);
    await createColumn(TABLES.LOANS, 'integer', 'term_months', null, true);
    await createColumn(TABLES.LOANS, 'enum', 'status', null, true, false, [
      'active',
      'overdue',
      'late',
      'defaulted',
      'paid_off',
    ]);
    await createColumn(TABLES.LOANS, 'float', 'outstanding_balance', null, true);

    // --- Inventory ---
    console.log('📦 Configuring Inventory...');
    await createColumn(TABLES.INVENTORY, 'string', 'item_name', 255, true);
    await createColumn(TABLES.INVENTORY, 'integer', 'quantity', null, true);
    await createColumn(TABLES.INVENTORY, 'string', 'unit', 20, true);
    await createColumn(TABLES.INVENTORY, 'integer', 'reorder_threshold', null, true);
    await createRelationshipColumn(
      TABLES.INVENTORY,
      TABLES.TRANSACTIONS,
      RelationshipType.ManyToOne,
      false,
      'transaction_id',
      'inventory_items',
      'restrict',
    );

    console.log('✅ Schema Setup Complete. Waiting for columns to be available...');

    // Wait for key columns to be ready
    await waitForColumn(TABLES.FUNDING_SOURCES, 'name');
    await waitForColumn(TABLES.TRANSACTIONS, 'amount');
    await waitForColumn(TABLES.INVENTORY, 'item_name');

    // 3. Validate Workflows
    await validateWorkflows();
  } catch (error) {
    console.error('❌ Setup Failed:', error);
  }
}

async function waitForColumn(tableId, key) {
  process.stdout.write(`   ⏳ Waiting for column '${key}' in ${tableId}...`);
  for (let i = 0; i < 20; i++) {
    // 40 seconds max
    try {
      const table = await tables.getTable(config.databaseId, tableId);
      const col = table.columns ? table.columns.find((a) => a.key === key) : null;

      if (col && col.status === 'available') {
        console.log(' ✅ Ready');
        return;
      }
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write('.');
  }
  console.log(' ⚠️ Timeout (proceeding anyway)');
}

async function validateWorkflows() {
  console.log('\n🧪 Validating Workflows...');

  try {
    // Workflow 1: Create Funding Source
    const donor = await tables.createRow({
      databaseId: config.databaseId,
      tableId: TABLES.FUNDING_SOURCES,
      rowId: ID.unique(),
      data: {
        name: 'Global Giving Grant 2025',
        total_allocated: 10000.0,
        current_balance: 10000.0,
        restrictions: 'For agricultural inputs only',
      },
    });
    console.log(
      `✅ [Workflow 1] Created Funding Source: ${donor.name} (Balance: ${donor.current_balance})`,
    );

    // Workflow 2: Record Expense
    const expenseAmount = 500.0;
    const expense = await tables.createRow({
      databaseId: config.databaseId,
      tableId: TABLES.TRANSACTIONS,
      rowId: ID.unique(),
      data: {
        type: 'expense',
        amount: expenseAmount,
        category: 'Farm Inputs',
        source_module: 'Farm',
        funding_source_id: donor.$id,
        date: new Date().toISOString(),
        description: 'Purchase of Maize Seeds',
        status: 'completed',
      },
    });
    console.log(`✅ [Workflow 2] Recorded Expense: ${expense.description} (-${expense.amount})`);

    // Update Balance
    const newBalance = donor.current_balance - expenseAmount;
    await tables.updateRow({
      databaseId: config.databaseId,
      tableId: TABLES.FUNDING_SOURCES,
      rowId: donor.$id,
      data: {
        current_balance: newBalance,
      },
    });
    console.log(`✅ [Workflow 2] Updated Funding Source Balance to: ${newBalance}`);

    // Workflow 3: Auto-create Inventory
    if (expense.category === 'Farm Inputs') {
      const inventory = await tables.createRow({
        databaseId: config.databaseId,
        tableId: TABLES.INVENTORY,
        rowId: ID.unique(),
        data: {
          item_name: 'Maize Seeds',
          quantity: 50,
          unit: 'kg',
          reorder_threshold: 10,
          transaction_id: expense.$id,
        },
      });
      console.log(
        `✅ [Workflow 3] Auto-created Inventory: ${inventory.item_name} (${inventory.quantity} ${inventory.unit})`,
      );
    }

    console.log('\n✨ All Validation Workflows Passed!');
  } catch (error) {
    console.error('❌ Workflow Validation Failed:', error);
  }
}

// Helpers
async function createTableIfNotExists(tableId, name) {
  try {
    await tables.getTable({
      databaseId: config.databaseId,
      tableId,
    });
    console.log(`   - Table ${name} already exists.`);
  } catch (e) {
    await tables.createTable({
      databaseId: config.databaseId,
      tableId,
      name,
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      isSystem: true,
      isPrivate: false,
    });
    console.log(`   + Created Table: ${name}`);
  }
}

//await createColumn(TABLES.TRANSACTIONS, 'float', 'amount', null, true);
let ii = 0;
async function createColumn(tableId, type, key, size, required, array = false, enumValues = []) {
  try {
    if (type === 'string') {
      await tables.createStringColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        size,
        required,
        array,
      });
    } else if (type === 'integer') {
      await tables.createIntegerColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        required,
        min: 0 || null,
        max: 0 || null,
        xdefault: 0 || null,
        array,
      });
    } else if (type === 'float') {
      await tables.createFloatColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        required,
        min: 0 || null,
        max: 0 || null,
        xdefault: 0 || null,
        array,
      });
    } else if (type === 'boolean') {
      await tables.createBooleanColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        required,
        default: false,
        array,
      });
    } else if (type === 'datetime') {
      await tables.createDatetimeColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        required,
        xdefault: undefined,
        array,
      });
    } else if (type === 'enum') {
      await tables.createEnumColumn({
        databaseId: config.databaseId,
        tableId,
        key,
        elements: enumValues,
        required,
        xdefault: undefined,
        array,
      });
    }

    console.log(`     ${++ii}: Added column: ${key} in table: ${tableId}`);
  } catch (e) {
    console.log(e.message);
    // Column likely exists
  }
}

async function createRelationshipColumn(
  tableId,
  relatedTableId,
  relationshipType,
  twoWay,
  key,
  relatedKey,
  onDelete,
) {
  //await createRelationshipColumn(TABLES.LOANS,TABLES.RESIDENTS,RelationshipType.ManyToOne,true,'borrower_id','loans','restrict');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId,
      relatedTableId,
      type: relationshipType,
      twoWay,
      key,
      twoWayKey: relatedKey,
      onDelete,
    });
    console.log(`   + Created Relationship Column: ${key} in table: ${tableId}`);
  } catch (e) {
    console.log(e.message);
    // Relationship column likely exists
  }
}

setupSchema();
