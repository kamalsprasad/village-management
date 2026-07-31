import { Client, TablesDB, RelationshipType } from 'node-appwrite';
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

const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId).setKey(config.apiKey);
const tables = new TablesDB(client);

const PERMISSIONS = [
  'read("any")',
  'create("any")',
  'update("any")',
  'delete("any")',
];

async function checkCol(tableId, key) {
  const t = await tables.getTable({ databaseId: config.databaseId, tableId });
  return (t.columns || []).find((c) => c.key === key);
}

async function waitForStatus(tableId, key, attempts = 15) {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const col = await checkCol(tableId, key);
    if (col) {
      if (col.status === 'available' || col.status === 'failed') return col.status;
    }
  }
  return 'timeout';
}

async function safeDeleteColumn(tableId, key) {
  try {
    await tables.deleteColumn({ databaseId: config.databaseId, tableId, key });
    console.log(`  Deleted ${tableId}.${key}`);
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    if (err.code !== 404) {
      console.log(`  Could not delete ${tableId}.${key}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('=== Rebuilding inventory table to clear failed crop_id ===\n');

  // Step 1: Find and delete all relationship columns on OTHER tables that point to inventory
  console.log('Step 1: Deleting incoming relationships to inventory...');
  const tableIds = [
    'plantings', 'harvests', 'harvest_entries', 'farm_sales',
    'finance_transactions', 'transaction_links', 'loans',
    'repayment_schedule', 'loan_payments', 'farm_alerts',
  ];
  for (const tid of tableIds) {
    try {
      const t = await tables.getTable({ databaseId: config.databaseId, tableId: tid });
      const invRels = (t.columns || []).filter(
        (c) => c.type === 'relationship' && c.relatedTable === 'inventory',
      );
      for (const r of invRels) {
        console.log(`  Found ${tid}.${r.key} -> inventory [status: ${r.status}]`);
        await safeDeleteColumn(tid, r.key);
      }
    } catch (_) {}
  }

  // Step 2: Delete the inventory table itself
  console.log('\nStep 2: Dropping inventory table...');
  try {
    await tables.deleteTable({ databaseId: config.databaseId, tableId: 'inventory' });
    console.log('  ✅ Table dropped');
  } catch (err) {
    console.log(`  ❌ Drop failed: ${err.message} (code: ${err.code || err.status})`);
    // If we can't drop, try deleting all columns first
    console.log('  Trying to delete all columns first...');
    try {
      const t = await tables.getTable({ databaseId: config.databaseId, tableId: 'inventory' });
      for (const col of t.columns || []) {
        await safeDeleteColumn('inventory', col.key);
      }
      await new Promise((r) => setTimeout(r, 5000));
      await tables.deleteTable({ databaseId: config.databaseId, tableId: 'inventory' });
      console.log('  ✅ Table dropped after column cleanup');
    } catch (err2) {
      console.log(`  ❌ Still failed: ${err2.message}`);
    }
  }

  await new Promise((r) => setTimeout(r, 5000));

  // Step 3: Recreate the inventory table
  console.log('\nStep 3: Recreating inventory table...');
  try {
    await tables.createTable({
      databaseId: config.databaseId,
      tableId: 'inventory',
      name: 'Inventory',
      permissions: PERMISSIONS,
      enabled: true,
      rowSecurity: false,
    });
    console.log('  ✅ Table created');
  } catch (err) {
    console.log(`  ❌ Create failed: ${err.message}`);
    return;
  }

  await new Promise((r) => setTimeout(r, 3000));

  // Step 4: Create non-relationship columns
  console.log('\nStep 4: Creating non-relationship columns...');
  const scalarColumns = [
    { key: 'item_name', type: 'string', size: 255, required: true },
    { key: 'item_type', type: 'enum', elements: ['farm_inputs', 'farm_produce', 'school_supplies', 'medical_supplies', 'kitchen_supplies', 'equipment', 'other'], required: true },
    { key: 'quantity', type: 'integer', required: true },
    { key: 'unit', type: 'string', size: 20, required: true },
    { key: 'unit_cost', type: 'float', required: false },
    { key: 'estimated_value', type: 'float', required: false },
    { key: 'status', type: 'enum', elements: ['in_stock', 'low_stock', 'out_of_stock', 'reserved'], required: true },
    { key: 'source', type: 'enum', elements: ['finance_purchase', 'farm_harvest', 'manual_entry', 'donation'], required: true },
    { key: 'source_reference_id', type: 'string', size: 255, required: false },
    { key: 'reorder_threshold', type: 'integer', required: true },
    { key: 'date_added', type: 'datetime', required: false },
    { key: 'last_updated', type: 'datetime', required: true },
    { key: 'notes', type: 'string', size: 1000, required: false },
  ];

  for (const col of scalarColumns) {
    try {
      switch (col.type) {
        case 'string':
          await tables.createStringColumn({ databaseId: config.databaseId, tableId: 'inventory', key: col.key, size: col.size, required: col.required, array: false });
          break;
        case 'integer':
          await tables.createIntegerColumn({ databaseId: config.databaseId, tableId: 'inventory', key: col.key, required: col.required, array: false });
          break;
        case 'float':
          await tables.createFloatColumn({ databaseId: config.databaseId, tableId: 'inventory', key: col.key, required: col.required, array: false });
          break;
        case 'datetime':
          await tables.createDatetimeColumn({ databaseId: config.databaseId, tableId: 'inventory', key: col.key, required: col.required, array: false });
          break;
        case 'enum':
          await tables.createEnumColumn({ databaseId: config.databaseId, tableId: 'inventory', key: col.key, elements: col.elements, required: col.required, array: false });
          break;
      }
      console.log(`  ✅ ${col.key}`);
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  ❌ ${col.key}: ${err.message}`);
    }
  }

  // Step 5: Create relationship columns
  console.log('\nStep 5: Creating relationship columns...');

  // crop_id -> crops (the one that was failing!)
  console.log('  Creating crop_id -> crops...');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId: 'inventory',
      relatedTableId: 'crops',
      type: RelationshipType.ManyToOne,
      twoWay: false,
      key: 'crop_id',
      onDelete: 'restrict',
    });
    const status = await waitForStatus('inventory', 'crop_id', 10);
    console.log(`  crop_id status: ${status}`);
  } catch (err) {
    console.log(`  ❌ crop_id: ${err.message}`);
  }

  // planting_id -> plantings
  console.log('  Creating planting_id -> plantings...');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId: 'inventory',
      relatedTableId: 'plantings',
      type: RelationshipType.ManyToOne,
      twoWay: false,
      key: 'planting_id',
      onDelete: 'restrict',
    });
    const status = await waitForStatus('inventory', 'planting_id', 8);
    console.log(`  planting_id status: ${status}`);
  } catch (err) {
    console.log(`  ❌ planting_id: ${err.message}`);
  }

  // transaction_id -> finance_transactions (twoWay)
  console.log('  Creating transaction_id -> finance_transactions (twoWay)...');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId: 'inventory',
      relatedTableId: 'finance_transactions',
      type: RelationshipType.ManyToOne,
      twoWay: true,
      twoWayKey: 'inventory_items',
      key: 'transaction_id',
      onDelete: 'restrict',
    });
    const status = await waitForStatus('inventory', 'transaction_id', 8);
    console.log(`  transaction_id status: ${status}`);
  } catch (err) {
    console.log(`  ❌ transaction_id: ${err.message}`);
  }

  // Step 6: Recreate incoming relationships from other tables
  console.log('\nStep 6: Recreating incoming relationships...');

  // farm_sales.inventory_item_id -> inventory
  console.log('  Creating farm_sales.inventory_item_id -> inventory...');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId: 'farm_sales',
      relatedTableId: 'inventory',
      type: RelationshipType.ManyToOne,
      twoWay: false,
      key: 'inventory_item_id',
      onDelete: 'restrict',
    });
    const status = await waitForStatus('farm_sales', 'inventory_item_id', 8);
    console.log(`  farm_sales.inventory_item_id status: ${status}`);
  } catch (err) {
    console.log(`  ❌ farm_sales.inventory_item_id: ${err.message}`);
  }

  // finance_transactions.inventory_ids -> inventory
  console.log('  Creating finance_transactions.inventory_ids -> inventory...');
  try {
    await tables.createRelationshipColumn({
      databaseId: config.databaseId,
      tableId: 'finance_transactions',
      relatedTableId: 'inventory',
      type: RelationshipType.OneToMany,
      twoWay: false,
      key: 'inventory_ids',
      onDelete: 'restrict',
    });
    const status = await waitForStatus('finance_transactions', 'inventory_ids', 8);
    console.log(`  finance_transactions.inventory_ids status: ${status}`);
  } catch (err) {
    console.log(`  ❌ finance_transactions.inventory_ids: ${err.message}`);
  }

  // Final check
  console.log('\n=== Final verification ===');
  const invTable = await tables.getTable({ databaseId: config.databaseId, tableId: 'inventory' });
  for (const col of invTable.columns || []) {
    console.log(`  inventory.${col.key} (${col.type}) [status: ${col.status}]`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
