#!/usr/bin/env node

/**
 * Appwrite Database Setup Script
 *
 * This script automatically creates all tables, columns, indexes, and permissions
 * for the Village Management System in Appwrite.
 *
 * Prerequisites:
 * - Appwrite project created
 * - Database "villageDB" created in Appwrite console
 * - API key with appropriate permissions (Database, tables)
 * - Environment variables set in .env file
 *
 * Usage:
 *   node scripts/setup-appwrite.js
 *
 * Or via npm:
 *   npm run setup:appwrite
 */

import { Client, Databases, TablesDB, RelationshipType, RelationMutate } from 'node-appwrite';
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
  databaseId: 'villageDB',
};

// Validate configuration
if (!config.projectId) {
  console.error('❌ Error: APPWRITE_PROJECT_ID not found in .env file');
  process.exit(1);
}

if (!config.apiKey) {
  console.error('❌ Error: APPWRITE_API_KEY not found in .env file');
  console.error('   Please create an API key in the Appwrite console with Database permissions');
  console.error('   and add it to your .env file as: APPWRITE_API_KEY=your_api_key_here');
  process.exit(1);
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);
const tables = new TablesDB(client);

// TODO: Update these permissions to be more specific based on user roles and databases they to which they need access
const permissions = ['read("any")', 'create("any")', 'update("any")', 'delete("any")'];

// Table schemas
const tableSchemas = {
  users: {
    name: 'Users',
    columns: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      {
        key: 'resident_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'role_ids',
        type: 'relationship',
        relatedTable: 'roles',
        relationType: 'manyToMany',
        twoWay: false,
        required: false,
      },
      { key: 'storage_quota', type: 'integer', min: 0, max: 1000, default: 2, required: false },
    ],
    indexes: [{ key: 'idx_users_email_unique', type: 'unique', columns: ['email'] }],
  },
  residents: {
    name: 'Residents',
    columns: [
      { key: 'first_name', type: 'string', size: 50, required: true },
      { key: 'middle_names', type: 'string', size: 255, required: false },
      { key: 'last_name', type: 'string', size: 50, required: true },
      { key: 'dob', type: 'datetime', required: false },
      {
        key: 'gender',
        type: 'enum',
        elements: ['Male', 'Female', 'Other'],
        required: true,
      },
      { key: 'phone', type: 'string', size: 20, required: false },
      { key: 'email', type: 'email', required: false },
      {
        key: 'household_id',
        type: 'relationship',
        relatedTable: 'households',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'resident_ids',
        required: false,
      },
      { key: 'room_number', type: 'string', size: 25, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_residents_household_id',
        type: 'key',
        columns: ['first_name', 'last_name'],
        orders: ['ASC', 'ASC'],
      },
    ],
  },
  households: {
    name: 'Households',
    columns: [
      { key: 'name', type: 'string', size: 255, required: true },
      {
        key: 'head_resident_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'resident_ids',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'household_id',
        required: false,
      },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'construction_date', type: 'datetime', required: true },
      {
        key: 'household_type',
        type: 'enum',
        elements: [
          'Single Family',
          'Multi-Family',
          'Dormitory',
          'Guest House',
          'Admin Building',
          'Other',
        ],
        required: true,
      },
      { key: 'bedrooms', type: 'integer', min: 0, max: 50, required: false },
      { key: 'bathrooms', type: 'integer', min: 0, max: 5, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_households_name',
        type: 'key',
        columns: ['name'],
        orders: ['ASC'],
      },
    ],
  },
  roles: {
    name: 'Roles',
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      {
        key: 'category',
        type: 'enum',
        elements: ['administration', 'council', 'farm', 'school', 'resident'],
        required: true,
      },
      { key: 'permissions', type: 'string', size: 100, array: true, required: false },
      { key: 'storage_quota', type: 'integer', min: 0, max: 1000, default: 2, required: false },
    ],
    indexes: [],
  },
  village_settings: {
    name: 'Village Settings',
    columns: [
      { key: 'village_name', type: 'string', size: 255, required: true },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'established_date', type: 'datetime', required: false },
      { key: 'default_currency', type: 'string', size: 10, required: true, default: 'ZMW' },
      { key: 'currency_symbol', type: 'string', size: 10, required: true, default: 'K' },
      { key: 'timezone', type: 'string', size: 50, required: true, default: 'Africa/Lusaka' },
      { key: 'country_code', type: 'string', size: 10, required: true, default: 'ZM' },
      { key: 'country_phone_code', type: 'string', size: 10, required: true, default: '+260' },
      {
        key: 'council_member_ids',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'oneToMany',
        twoWay: false,
        required: false,
      },
      { key: 'is_using_sample_data', type: 'boolean', required: true, default: false },
      { key: 'modules_enabled', type: 'string', size: 500, array: true, required: false },
      {
        key: 'yield_unit',
        type: 'enum',
        elements: ['kg_per_hectare', 'kg_per_acre', 'tonnes_per_hectare'],
        required: true,
        default: 'kg_per_hectare',
      },
    ],
    indexes: [],
  },
  // Epic 3: Farm Module Tables
  soil_types: {
    name: 'Soil Types',
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'description', type: 'string', size: 500, required: false },
      { key: 'color_code', type: 'string', size: 7, required: false },
      { key: 'is_system_default', type: 'boolean', required: true, default: false },
    ],
    indexes: [
      {
        key: 'idx_soil_types_name',
        type: 'key',
        columns: ['name'],
        orders: ['ASC'],
      },
    ],
  },
  plots: {
    name: 'Plots',
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'size_hectares', type: 'integer', min: 1, max: 10000000, required: true },
      { key: 'location_description', type: 'string', size: 500, required: false },
      {
        key: 'soil_type_id',
        type: 'relationship',
        relatedTable: 'soil_types',
        relationType: 'manyToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'status',
        type: 'enum',
        elements: ['Active', 'Fallow', 'Retired'],
        required: true,
        default: 'Active',
      },
      {
        key: 'crop_manager_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        required: false,
      },
    ],
    indexes: [
      {
        key: 'idx_plots_name',
        type: 'key',
        columns: ['name'],
        orders: ['ASC'],
      },
      {
        key: 'idx_plots_status',
        type: 'key',
        columns: ['status'],
        orders: ['ASC'],
      },
    ],
  },
  crops: {
    name: 'Crops',
    columns: [
      { key: 'crop_name', type: 'string', size: 100, required: true },
      {
        key: 'category',
        type: 'enum',
        elements: ['Grain', 'Vegetable', 'Fruit', 'Legume', 'Root', 'Other'],
        required: true,
      },
      {
        key: 'crop_type',
        type: 'enum',
        elements: ['Annual', 'Perennial'],
        required: true,
      },
      {
        key: 'maturity_days',
        type: 'integer',
        min: 1,
        max: 1825,
        required: true,
      },
      {
        key: 'harvest_frequency',
        type: 'integer',
        min: 1,
        max: 365,
        required: false,
      },
      {
        key: 'typical_yield_per_hectare',
        type: 'double',
        min: 0,
        max: 1000000,
        required: false,
      },
      {
        key: 'growing_season',
        type: 'enum',
        elements: ['Warm', 'Wet', 'Cool', 'All Year'],
        required: false,
      },
      { key: 'notes', type: 'string', size: 500, required: false },
      { key: 'is_active', type: 'boolean', required: true, default: true },
    ],
    indexes: [
      {
        key: 'idx_crops_category',
        type: 'key',
        columns: ['category'],
        orders: ['ASC'],
      },
      {
        key: 'idx_crops_type',
        type: 'key',
        columns: ['crop_type'],
        orders: ['ASC'],
      },
      {
        key: 'idx_crops_active',
        type: 'key',
        columns: ['is_active'],
        orders: ['ASC'],
      },
      {
        key: 'idx_crops_name',
        type: 'unique',
        columns: ['crop_name'],
        orders: ['ASC'],
      },
    ],
  },
  plantings: {
    name: 'Plantings',
    columns: [
      {
        key: 'plot_id',
        type: 'relationship',
        relatedTable: 'plots',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      {
        key: 'crop_id',
        type: 'relationship',
        relatedTable: 'crops',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'planting_date', type: 'datetime', required: true },
      { key: 'quantity_planted', type: 'integer', min: 1, max: 1000000000, required: false },
      { key: 'unit', type: 'string', size: 20, required: false, default: 'kg' },
      { key: 'expected_harvest_date', type: 'datetime', required: false },
      { key: 'actual_harvest_date', type: 'datetime', required: false },
      { key: 'inputs_cost', type: 'integer', min: 0, max: 1000000000000, required: false },
      { key: 'labor_cost', type: 'integer', min: 0, max: 1000000000000, required: false },
      { key: 'other_cost', type: 'integer', min: 0, max: 1000000000000, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['planned', 'planted', 'growing', 'harvesting', 'completed', 'failed'],
        required: true,
        default: 'planned',
      },
    ],
    indexes: [
      {
        key: 'idx_plantings_date',
        type: 'key',
        columns: ['planting_date'],
        orders: ['DESC'],
      },
      {
        key: 'idx_plantings_status',
        type: 'key',
        columns: ['status'],
        orders: ['ASC'],
      },
    ],
  },
  harvests: {
    name: 'Harvests',
    columns: [
      {
        key: 'planting_id',
        type: 'relationship',
        relatedTable: 'plantings',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'harvest_date', type: 'datetime', required: true },
      { key: 'quantity_harvested', type: 'integer', min: 0, max: 1000000000000, required: true },
      { key: 'unit', type: 'string', size: 20, required: true, default: 'kg' },
      { key: 'quality_grade', type: 'string', size: 50, required: false },
      { key: 'storage_location', type: 'string', size: 200, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      {
        key: 'idx_harvests_date',
        type: 'key',
        columns: ['harvest_date'],
        orders: ['DESC'],
      },
    ],
  },
  // Epic 2: Finance Module Tables
  finance_categories: {
    name: 'Finance Categories',
    permissions: permissions,
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      { key: 'type', type: 'enum', elements: ['income', 'expense'], required: true },
      { key: 'subcategories', type: 'string', size: 2000, required: false, array: true },
    ],
    indexes: [],
  },
  funding_sources: {
    name: 'Funding Sources',
    permissions: permissions,
    columns: [
      { key: 'name', type: 'string', size: 255, required: true },
      {
        key: 'type',
        type: 'enum',
        elements: ['grant', 'donation', 'income', 'loan', 'loan repayment'],
        required: true,
      },
      { key: 'total_received', type: 'float', required: true },
      { key: 'current_balance', type: 'float', required: true },
      { key: 'date_received', type: 'datetime', required: false },
      { key: 'restrictions', type: 'string', size: 1000, required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['active', 'inactive', 'depleted'],
        required: true,
      },
    ],
    indexes: [],
  },
  loans: {
    name: 'Loans',
    permissions: permissions,
    columns: [
      {
        key: 'borrower_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'loans',
        onDelete: 'restrict',
        required: true,
      },
      { key: 'principal_amount', type: 'float', required: true },
      { key: 'interest_rate', type: 'float', required: true },
      { key: 'term_months', type: 'integer', required: true },
      {
        key: 'repayment_frequency',
        type: 'enum',
        elements: ['weekly', 'biweekly', 'monthly', 'quarterly', 'annually'],
        required: true,
      },
      {
        key: 'purpose',
        type: 'enum',
        elements: ['farm', 'business', 'medical', 'education', 'other'],
        required: true,
      },
      { key: 'collateral_description', type: 'string', size: 500, required: false },
      { key: 'disbursement_date', type: 'datetime', required: false },
      { key: 'total_repayment', type: 'float', required: true },
      { key: 'payment_amount', type: 'float', required: true },
      { key: 'next_due_date', type: 'datetime', required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['active', 'overdue', 'late', 'defaulted', 'paid_off'],
        required: true,
      },
      { key: 'outstanding_balance', type: 'float', required: true },
    ],
    indexes: [],
  },
  inventory: {
    name: 'Inventory',
    permissions: permissions,
    columns: [
      { key: 'item_name', type: 'string', size: 255, required: true },
      {
        key: 'item_type',
        type: 'enum',
        elements: [
          'farm_inputs',
          'farm_produce',
          'school_supplies',
          'medical_supplies',
          'kitchen_supplies',
          'equipment',
          'other',
        ],
        required: true,
      },
      { key: 'quantity', type: 'integer', required: true },
      { key: 'unit', type: 'string', size: 20, required: true },
      { key: 'unit_cost', type: 'float', required: false },
      { key: 'estimated_value', type: 'float', required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['in_stock', 'low_stock', 'out_of_stock', 'reserved'],
        required: true,
      },
      {
        key: 'source',
        type: 'enum',
        elements: ['finance_purchase', 'farm_harvest', 'manual_entry', 'donation'],
        required: true,
      },
      { key: 'source_reference_id', type: 'string', size: 255, required: false },
      { key: 'reorder_threshold', type: 'integer', required: true },
      { key: 'date_added', type: 'datetime', required: false },
      { key: 'last_updated', type: 'datetime', required: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
      {
        key: 'transaction_id',
        type: 'relationship',
        relatedTable: 'finance_transactions',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'inventory_items',
        onDelete: 'restrict',
        required: false,
      },
    ],
    indexes: [],
  },
  finance_transactions: {
    name: 'Finance Transactions',
    permissions: permissions,
    columns: [
      {
        key: 'type',
        type: 'enum',
        elements: ['expense', 'income', 'transfer'],
        required: true,
      },
      { key: 'amount_needed', type: 'float', required: true },
      { key: 'amount_funded', type: 'float', required: true },
      {
        key: 'category_id',
        type: 'relationship',
        relatedTable: 'finance_categories',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'transaction_ids',
        onDelete: 'restrict',
        required: true,
      },
      {
        key: 'payment_method',
        type: 'enum',
        elements: ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Money', 'Other'],
        required: true,
      },
      { key: 'source_module', type: 'string', size: 50, required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'description', type: 'string', size: 500, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'subcategory', type: 'string', size: 100, required: false },
      { key: 'vendor', type: 'string', size: 255, required: false },
      { key: 'receipt_number', type: 'string', size: 100, required: false },
      {
        key: 'payment_status',
        type: 'enum',
        elements: ['paid', 'unpaid', 'partial'],
        required: false,
      },
      {
        key: 'funding_source_id',
        type: 'relationship',
        relatedTable: 'funding_sources',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'transaction_ids',
        onDelete: 'restrict',
        required: false,
      },
      {
        key: 'loan_id',
        type: 'relationship',
        relatedTable: 'loans',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'transaction_ids',
        onDelete: 'restrict',
        required: false,
      },
      {
        key: 'inventory_ids',
        type: 'relationship',
        relatedTable: 'inventory',
        relationType: 'oneToMany',
        twoWay: false,
        onDelete: 'restrict',
        required: false,
      },
    ],
    indexes: [],
  },
  transaction_links: {
    name: 'Transaction Links',
    permissions: permissions,
    columns: [
      {
        key: 'parent_transaction_id',
        type: 'relationship',
        relatedTable: 'finance_transactions',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'funding_links_received',
        onDelete: 'restrict',
        required: true,
      },
      {
        key: 'child_transaction_id',
        type: 'relationship',
        relatedTable: 'finance_transactions',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'funding_links_provided',
        onDelete: 'restrict',
        required: false,
      },
      { key: 'amount', type: 'float', required: true },
      {
        key: 'funding_source_id',
        type: 'relationship',
        relatedTable: 'funding_sources',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'funding_links_source',
        onDelete: 'restrict',
        required: true,
      },
      {
        key: 'recorded_by',
        type: 'relationship',
        relatedTable: 'users',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'recorded_transaction_links',
        onDelete: 'restrict',
        required: true,
      },
      { key: 'notes', type: 'string', size: 500, required: false },
      { key: 'created_at', type: 'datetime', required: true },
    ],
    indexes: [],
  },
  // Loan Management Tables
  repayment_schedule: {
    name: 'Repayment Schedule',
    permissions: permissions,
    columns: [
      {
        key: 'loan_id',
        type: 'relationship',
        relatedTable: 'loans',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'repayment_schedules',
        onDelete: 'restrict',
        required: true,
      },
      { key: 'installment_number', type: 'integer', required: true },
      { key: 'due_date', type: 'datetime', required: true },
      { key: 'amount', type: 'float', required: true },
      {
        key: 'status',
        type: 'enum',
        elements: ['pending', 'paid', 'overdue', 'partial'],
        required: true,
      },
      { key: 'paid_date', type: 'datetime', required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [],
  },
  loan_payments: {
    name: 'Loan Payments',
    permissions: permissions,
    columns: [
      {
        key: 'loan_id',
        type: 'relationship',
        relatedTable: 'loans',
        relationType: 'manyToOne',
        twoWay: true,
        twoWayKey: 'loan_payments',
        onDelete: 'restrict',
        required: true,
      },
      {
        key: 'finance_transaction_id',
        type: 'relationship',
        relatedTable: 'finance_transactions',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'restrict',
        required: false,
      },
      { key: 'amount', type: 'float', required: true },
      { key: 'payment_date', type: 'datetime', required: true },
      {
        key: 'payment_method',
        type: 'enum',
        elements: ['Bank Transfer', 'Cash', 'Cheque', 'Mobile Money', 'Other'],
        required: true,
      },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [],
  },
  farm_sales: {
    name: 'Farm Sales',
    permissions: permissions,
    columns: [
      {
        key: 'harvest_id',
        type: 'relationship',
        relatedTable: 'harvests',
        relationType: 'manyToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'buyer_type',
        type: 'enum',
        elements: ['household', 'external', 'market', 'cooperative'],
        required: true,
      },
      { key: 'buyer_id', type: 'string', size: 50, required: false },
      { key: 'buyer_name', type: 'string', size: 200, required: false },
      { key: 'sale_date', type: 'datetime', required: true },
      { key: 'quantity_sold', type: 'integer', min: 0, max: 1000000000000, required: true },
      { key: 'unit', type: 'string', size: 20, required: true, default: 'kg' },
      { key: 'price_per_unit', type: 'integer', min: 0, max: 1000000000000, required: true },
      { key: 'total_amount', type: 'integer', min: 0, max: 1000000000000, required: true },
      { key: 'payment_status', type: 'string', size: 20, required: true, default: 'pending' },
      { key: 'payment_method', type: 'string', size: 50, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      {
        key: 'idx_farm_sales_date',
        type: 'key',
        columns: ['sale_date'],
        orders: ['DESC'],
      },
      {
        key: 'idx_farm_sales_buyer',
        type: 'key',
        columns: ['buyer_type', 'buyer_id'],
        orders: ['ASC', 'ASC'],
      },
    ],
  },
};

// Helper functions
async function createTable(tableId, schema) {
  try {
    console.log(`\n📦 Creating table: ${schema.name} (${tableId})`);

    const permissions = schema.permissions || [
      'read("any")',
      'create("any")',
      'update("any")',
      'delete("any")',
    ];

    await tables.createTable({
      databaseId: config.databaseId,
      tableId: tableId,
      name: schema.name,
      permissions: permissions,
      enabled: true,
      rowSecurity: false, // Document security (false = table-level permissions)
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
          tableId: tableId,
          key: key,
          size: size,
          required: required,
          default: defaultValue,
          array: array || false,
        });
        break;
      case 'integer':
        await tables.createIntegerColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          required: required,
          min: min,
          max: max,
          default: defaultValue,
          array: array || false,
        });
        break;

      case 'float':
      case 'double':
        await tables.createFloatColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          required: required,
          min: min,
          max: max,
          default: defaultValue,
          array: array || false,
        });
        break;

      case 'datetime':
        await tables.createDatetimeColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          required: required,
          default: defaultValue,
          array: array || false,
        });
        break;

      case 'enum':
        await tables.createEnumColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          elements: elements,
          required: required,
          default: defaultValue,
          array: array || false,
        });
        break;

      case 'boolean':
        await tables.createBooleanColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          required: required,
          default: defaultValue,
          array: array || false,
        });
        break;

      case 'relationship':
        await tables.createRelationshipColumn({
          databaseId: config.databaseId,
          tableId: tableId,
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
          key: key,
          twoWayKey: column.twoWayKey,
          onDelete: column.onDelete,
        });
        break;

      case 'email':
        await tables.createEmailColumn({
          databaseId: config.databaseId,
          tableId: tableId,
          key: key,
          required: required,
          default: defaultValue,
          array: array || false,
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

    await tables.createIndex({
      databaseId: config.databaseId,
      tableId: tableId,
      key: index.key,
      type: index.type,
      columns: index.columns,
      orders: index.orders || [],
    });

    console.log(`      ✅ Index created: ${index.key}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`      ⚠️  Index already exists: ${index.key}`);
    } else {
      throw error;
    }
  }
}

async function waitForColumnCreation(tableId, columnKey, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const table = await tables.getTable({
        databaseId: config.databaseId,
        tableId: tableId,
      });
      const column = table.columns.find((attr) => attr.key === columnKey);

      if (column && column.status === 'available') {
        return true;
      }

      // Wait 2 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`      ⚠️  Error checking column status: ${error.message}`);
    }
  }

  console.log(`      ⚠️  Timeout waiting for column: ${columnKey}`);
  return false;
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting Appwrite Database Setup');
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Project: ${config.projectId}`);
  console.log(`   Database: ${config.databaseId}`);

  try {
    // Verify database exists
    console.log('\n🔍 Verifying database exists...');
    try {
      await databases.get(config.databaseId);
      console.log('   ✅ Database found');
    } catch (error) {
      if (error.code === 404) {
        console.error(`   ❌ Database "${config.databaseId}" not found`);
        console.error('      Please create the database in the Appwrite console first');
        process.exit(1);
      }
      throw error;
    }

    // Create all tables first
    console.log('\n📦 Creating all tables...');
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

          // Wait for column to be available before creating the next one
          if (isNew) {
            await waitForColumnCreation(tableId, column.key);
          }
        }
      }
    }

    // Create relationship columns after all tables and basic columns exist
    console.log('\n🔗 Creating relationship columns...');
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      for (const column of schema.columns) {
        if (column.type === 'relationship') {
          await createColumn(tableId, column);
        }
      }
    }

    // Create indexes (only after all columns are created)
    console.log('\n🔍 Creating indexes...');
    for (const [tableId, schema] of Object.entries(tableSchemas)) {
      if (schema.indexes.length > 0) {
        console.log(`   🔍 Creating indexes for ${schema.name}...`);
        for (const index of schema.indexes) {
          await createIndex(tableId, index);
        }
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\n📋 Summary:');
    console.log('   - 19 Tables created/verified');
    console.log('   - 130+ columns created/verified');
    console.log('   - 16 indexes created/verified');
    console.log('   - Permissions configured');
    console.log('\n🎉 You can now test the database connection at /appwrite-test');
    console.log('\n📦 Tables created:');
    console.log('   Core: users, residents, households, roles, village_settings');
    console.log('   Farm: soil_types, plots, crops, plantings, harvests, farm_sales');
    console.log(
      '   Finance: finance_categories, funding_sources, loans, inventory, finance_transactions, transaction_links',
    );
    console.log('   Loan Mgmt: repayment_schedule, loan_payments');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response);
    }
    process.exit(1);
  }
}

// Run setup
setupDatabase();
