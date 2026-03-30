#!/usr/bin/env node

/**
 * Appwrite Database Setup Script for Village Lending Module (Story 2.5)
 *
 * This script creates all tables, columns, indexes, and permissions
 * for the Village Lending module in Appwrite.
 *
 * Usage:
 *   node scripts/setup-lending-collections.js
 */

import {
  Client,
  Databases,
  TablesDB,
  RelationshipType,
  RelationMutate,
  ID,
  Query,
} from 'node-appwrite';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Helper to strip quotes from env variables if present
const stripQuotes = (str) => {
  if (!str) return str;
  return str.replace(/^["']|["']$/g, '');
};

// Configuration
const config = {
  endpoint: stripQuotes(process.env.APPWRITE_ENDPOINT) || 'https://cloud.appwrite.io/v1',
  projectId: stripQuotes(process.env.APPWRITE_PROJECT_ID),
  apiKey: stripQuotes(process.env.APPWRITE_API_KEY),
  databaseId: stripQuotes(process.env.APPWRITE_DATABASE_ID) || 'villageDB',
};

// Validate configuration
if (!config.projectId || !config.apiKey) {
  console.error('❌ Error: Missing required Appwrite environment variables in .env');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const tables = new TablesDB(client);

// Table schemas for Lending Module
const tableSchemas = {
  loans: {
    name: 'Loans',
    columns: [
      {
        key: 'borrower_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'principal_amount', type: 'integer', min: 0, required: true }, // Store as integer cents/ngwee to avoid float issues
      { key: 'interest_rate', type: 'integer', min: 0, max: 5000, required: true }, // Store as integer (e.g. 500 for 5.00%)
      { key: 'term_months', type: 'integer', min: 1, max: 60, required: true },
      {
        key: 'repayment_frequency',
        type: 'enum',
        elements: ['weekly', 'biweekly', 'monthly'],
        required: true,
      },
      { key: 'collateral_description', type: 'string', size: 1000, required: false },
      {
        key: 'purpose',
        type: 'enum',
        elements: ['farm', 'education', 'medical', 'business', 'other'],
        required: true,
      },
      { key: 'disbursement_date', type: 'datetime', required: true },
      { key: 'status', type: 'enum', elements: ['active', 'paid', 'defaulted'], required: true },
      { key: 'outstanding_balance', type: 'integer', min: 0, required: true },
      { key: 'total_repayment', type: 'integer', min: 0, required: true },
      { key: 'payment_amount', type: 'integer', min: 0, required: true },
      { key: 'next_due_date', type: 'datetime', required: false },
    ],
    indexes: [
      { key: 'idx_loans_status', type: 'key', attributes: ['status'] },
      { key: 'idx_loans_next_due_date', type: 'key', attributes: ['next_due_date'] },
    ],
  },
  loan_payments: {
    name: 'Loan Payments',
    columns: [
      {
        key: 'loan_id',
        type: 'relationship',
        relatedTable: 'loans',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'amount', type: 'integer', min: 0, required: true },
      { key: 'payment_date', type: 'datetime', required: true },
      { key: 'payment_method', type: 'string', size: 100, required: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
      {
        key: 'finance_transaction_id',
        type: 'relationship',
        relatedTable: 'finance_transactions',
        relationType: 'oneToOne',
        twoWay: false,
        required: false,
      },
    ],
    indexes: [
      {
        key: 'idx_loan_payments_date',
        type: 'key',
        attributes: ['payment_date'],
        orders: ['DESC'],
      },
    ],
  },
  repayment_schedule: {
    name: 'Repayment Schedule',
    columns: [
      {
        key: 'loan_id',
        type: 'relationship',
        relatedTable: 'loans',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'installment_number', type: 'integer', required: true },
      { key: 'due_date', type: 'datetime', required: true },
      { key: 'amount', type: 'integer', min: 0, required: true },
      { key: 'status', type: 'enum', elements: ['pending', 'paid', 'overdue'], required: true },
      { key: 'paid_date', type: 'datetime', required: false },
      {
        key: 'payment_id',
        type: 'relationship',
        relatedTable: 'loan_payments',
        relationType: 'oneToOne', // Though a payment can cover multiple installments, let's keep it simple or manyToOne
        twoWay: false,
        required: false,
      },
    ],
    indexes: [
      { key: 'idx_repayment_schedule_due_date', type: 'key', attributes: ['due_date'] },
      { key: 'idx_repayment_schedule_status', type: 'key', attributes: ['status'] },
    ],
  },
};

// ... Helper functions copied from setup-appwrite.js ...
async function createTable(tableId, schema) {
  try {
    console.log(`\n📦 Creating table: ${schema.name} (${tableId})`);
    await tables.createTable({
      databaseId: config.databaseId,
      tableId: tableId,
      name: schema.name,
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      enabled: true,
      rowSecurity: false,
    });
    console.log(`   ✅ Table created: ${schema.name}`);
    return true;
  } catch (error) {
    if (error.code === 409) {
      console.log(`   ⚠️  Table already exists: ${schema.name}`);
      return false;
    }
    throw error;
  }
}

async function createColumn(tableId, column) {
  try {
    const { key, type, size, required, array, elements, default: defaultValue, min, max } = column;
    console.log(`   📝 Creating column: ${key} (${type})`);

    switch (type) {
      case 'string':
        await tables.createStringColumn({
          databaseId: config.databaseId,
          tableId,
          key,
          size,
          required,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'integer':
        await tables.createIntegerColumn({
          databaseId: config.databaseId,
          tableId,
          key,
          required,
          min,
          max,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'datetime':
        await tables.createDatetimeColumn({
          databaseId: config.databaseId,
          tableId,
          key,
          required,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'enum':
        await tables.createEnumColumn({
          databaseId: config.databaseId,
          tableId,
          key,
          elements,
          required,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'boolean':
        await tables.createBooleanColumn({
          databaseId: config.databaseId,
          tableId,
          key,
          required,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'relationship':
        await tables.createRelationshipColumn({
          databaseId: config.databaseId,
          tableId,
          relatedTableId: column.relatedTable,
          type:
            column.relationType === 'oneToOne'
              ? RelationshipType.OneToOne
              : column.relationType === 'oneToMany'
                ? RelationshipType.OneToMany
                : column.relationType === 'manyToOne'
                  ? RelationshipType.ManyToOne
                  : RelationshipType.ManyToMany,
          twoWay: column.twoWay || false,
          key,
          twoWayKey: column.twoWayKey,
          onDelete: RelationMutate.Cascade,
        });
        break;
      default:
        console.log(`   ⚠️  Unknown column type: ${type}`);
        return;
    }
    console.log(`      ✅ Column created: ${key}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`      ⚠️  Column already exists: ${column.key}`);
    } else {
      throw error;
    }
  }
}

async function createIndex(tableId, index) {
  try {
    console.log(`   🔍 Creating index: ${index.key}`);
    await tables.createIndex(
      config.databaseId,
      tableId,
      index.key,
      index.type,
      index.attributes,
      index.orders || [],
    );
    console.log(`      ✅ Index created: ${index.key}`);
  } catch (err) {
    if (err.code === 409) {
      console.log(`      ⚠️  Index already exists: ${index.key}`);
    } else {
      throw err;
    }
  }
}

async function waitForColumnCreation(tableId, columnKey, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const table = await tables.getTable({ databaseId: config.databaseId, tableId });
      const column = table.columns.find((attr) => attr.key === columnKey);
      if (column && column.status === 'available') return true;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`      ⚠️  Error checking column status: ${error.message}`);
    }
  }
  console.log(`      ⚠️  Timeout waiting for column: ${columnKey}`);
  return false;
}

/**
 * Create or get 'Loan Repayment' income category
 */
async function createLoanRepaymentCategory() {
  try {
    console.log('\n📝 Checking for Loan Repayment category...');

    // Check if category exists
    const existingCategories = await tables.listRows({
      databaseId: config.databaseId,
      tableId: 'finance_categories',
      queries: [Query.equal('name', 'Loan Repayment'), Query.equal('type', 'income')],
    });

    if (existingCategories.rows.length > 0) {
      console.log('   ✅ Loan Repayment category already exists');
      return existingCategories.rows[0].$id;
    }

    // Create the category
    const category = await tables.createRow({
      databaseId: config.databaseId,
      tableId: 'finance_categories',
      rowId: ID.unique(),
      data: {
        name: 'Loan Repayment',
        type: 'income',
        subcategories: [],
      },
    });

    console.log('   ✅ Loan Repayment category created');
    return category.$id;
  } catch (error) {
    console.error('   ⚠️ Could not create Loan Repayment category:', error.message);
    return null;
  }
}

/**
 * Create or get 'Internal - Loan Repayments' funding source
 */
async function createLoanRepaymentsFundingSource() {
  try {
    console.log('\n📝 Checking for Internal - Loan Repayments funding source...');

    // Check if funding source exists
    const existingSources = await tables.listRows({
      databaseId: config.databaseId,
      tableId: 'funding_sources',
      queries: [Query.equal('name', 'Internal - Loan Repayments')],
    });

    if (existingSources.rows.length > 0) {
      console.log('   ✅ Internal - Loan Repayments funding source already exists');
      return existingSources.rows[0].$id;
    }

    // Create the funding source
    const source = await tables.createRow({
      databaseId: config.databaseId,
      tableId: 'funding_sources',
      rowId: ID.unique(),
      data: {
        name: 'Internal - Loan Repayments',
        type: 'loan repayment',
        total_received: 0,
        current_balance: 0,
        date_received: null,
        restrictions: 'Automatically tracks loan repayment income',
        status: 'active',
      },
    });

    console.log('   ✅ Internal - Loan Repayments funding source created');
    return source.$id;
  } catch (error) {
    console.error(
      '   ⚠️ Could not create Internal - Loan Repayments funding source:',
      error.message,
    );
    return null;
  }
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting Lending Module Database Setup');

  try {
    // Verify database exists
    try {
      await databases.get(config.databaseId);
    } catch (error) {
      if (error.code === 404) {
        console.error(`❌ Database "${config.databaseId}" not found`);
        process.exit(1);
      }
      throw error;
    }

    // Check if finance_transactions and residents exist
    try {
      await tables.getTable({ databaseId: config.databaseId, tableId: 'residents' });
      await tables.getTable({ databaseId: config.databaseId, tableId: 'finance_transactions' });
    } catch {
      console.error(
        `❌ Required core tables (residents or finance_transactions) missing. Please run setup-appwrite.js and validate-schema-epic-2.js first.`,
      );
      process.exit(1);
    }

    // Add lending_enabled setting to village_settings if it doesn't exist
    try {
      const settingsTable = await tables.getTable({
        databaseId: config.databaseId,
        tableId: 'village_settings',
      });
      const hasLendingEnabled = settingsTable.columns.find((c) => c.key === 'lending_enabled');

      if (!hasLendingEnabled) {
        console.log('\n📝 Adding lending_enabled column to village_settings...');
        await tables.createBooleanColumn({
          databaseId: config.databaseId,
          tableId: 'village_settings',
          key: 'lending_enabled',
          required: false,
          default: true,
          array: false,
        });
        await waitForColumnCreation('village_settings', 'lending_enabled');
      }
    } catch (err) {
      console.warn(
        '⚠️ Could not add lending_enabled to village_settings. Is the table created?',
        err.message,
      );
    }

    // Create all tables first
    console.log('\n📦 Creating Lending tables...');
    const tableCreationResults = {};
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      tableCreationResults[tableId] = await createTable(tableId, schema);
    }

    // Create non-relationship columns first
    console.log('\n📝 Creating non-relationship columns...');
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      const isNew = tableCreationResults[tableId];
      for (const column of schema.columns) {
        if (column.type !== 'relationship') {
          await createColumn(tableId, column);
          if (isNew) await waitForColumnCreation(tableId, column.key);
        }
      }
    }

    // Create relationship columns
    console.log('\n🔗 Creating relationship columns...');
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      for (const column of schema.columns) {
        if (column.type === 'relationship') {
          await createColumn(tableId, column);
        }
      }
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...');
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      if (schema.indexes.length > 0) {
        for (const index of schema.indexes) {
          await createIndex(tableId, index);
        }
      }
    }

    // Create Loan Repayment category and funding source
    await createLoanRepaymentCategory();
    await createLoanRepaymentsFundingSource();

    console.log('\n✅ Lending Database setup complete!');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) console.error('   Response:', error.response);
    process.exit(1);
  }
}

setupDatabase();
