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

import { Client, Databases, TablesDB, RelationshipType } from 'node-appwrite';
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
        key: 'idx_residents_first_name_fulltext',
        type: 'fulltext',
        columns: ['first_name'],
        orders: [],
      },
      {
        key: 'idx_residents_last_name_fulltext',
        type: 'fulltext',
        columns: ['last_name'],
        orders: [],
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
      // Story 3.10: Farm alert configuration stored as serialized JSON string
      { key: 'farm_alert_config', type: 'string', size: 2000, required: false },
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
      { key: 'size_hectares', type: 'float', min: 1, max: 10000000, required: true },
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
        key: 'harvest_frequency_days',
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
      { key: 'area_used_hectares', type: 'float', min: 0, max: 100000, required: false },
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
      // Single Day fields
      { key: 'harvest_date', type: 'datetime', required: false },
      // Multi-Day fields
      { key: 'harvest_start_date', type: 'datetime', required: false },
      { key: 'harvest_end_date', type: 'datetime', required: false },
      // Totals (auto-calculated from daily entries for multi-day)
      { key: 'total_quantity_kg', type: 'float', min: 0, required: true },
      { key: 'total_labor_cost', type: 'float', min: 0, required: false, default: 0 },
      { key: 'total_other_costs', type: 'float', min: 0, required: false, default: 0 },
      // Daily breakdown for multi-day harvests (JSON array)
      { key: 'daily_breakdown', type: 'string', size: 10000, required: false, array: true },
      // Status tracking for partial harvests
      {
        key: 'status',
        type: 'enum',
        elements: ['In Progress', 'Completed'],
        required: true,
        default: 'In Progress',
      },
      // Notes
      { key: 'notes', type: 'string', size: 1000, required: false },
      // Story 3.6: Continuous Picking for Perennials
      { key: 'is_continuous_picking', type: 'boolean', required: false, default: false },
      // Sequence number for perennial continuous picking (null/omitted for annuals).
      // No min constraint so annual harvests don't trip integer validation.
      { key: 'harvest_sequence', type: 'integer', required: false },
    ],
    indexes: [
      {
        key: 'idx_harvests_date',
        type: 'key',
        columns: ['harvest_date'],
        orders: ['DESC'],
      },
      {
        key: 'idx_harvests_status',
        type: 'key',
        columns: ['status'],
        orders: ['ASC'],
      },
      {
        key: 'idx_harvests_continuous',
        type: 'key',
        columns: ['is_continuous_picking'],
        orders: ['ASC'],
      },
    ],
  },
  // Partial harvest entries for multi-day tracking
  harvest_entries: {
    name: 'Harvest Entries',
    columns: [
      {
        key: 'harvest_id',
        type: 'relationship',
        relatedTable: 'harvests',
        relationType: 'manyToOne',
        twoWay: false,
        required: true,
      },
      { key: 'entry_date', type: 'datetime', required: true },
      { key: 'quantity_kg', type: 'float', min: 0, required: true },
      { key: 'farmhands_count', type: 'integer', min: 0, required: false },
      { key: 'labor_cost', type: 'float', min: 0, required: false, default: 0 },
      { key: 'other_costs', type: 'float', min: 0, required: false, default: 0 },
      { key: 'other_costs_notes', type: 'string', size: 500, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_harvest_entries_date',
        type: 'key',
        columns: ['entry_date'],
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
        key: 'planting_id',
        type: 'relationship',
        relatedTable: 'plantings',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'restrict',
        required: false,
      },
      {
        key: 'crop_id',
        type: 'relationship',
        relatedTable: 'crops',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'restrict',
        required: false,
      },
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
      // Three-way integration relationships (Story 3.8)
      {
        key: 'harvest_id',
        type: 'relationship',
        relatedTable: 'harvests',
        relationType: 'manyToOne',
        twoWay: false,
        required: false,
      },
      {
        key: 'inventory_item_id',
        type: 'relationship',
        relatedTable: 'inventory',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'restrict',
        required: false,
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
      // Story 3.9: Denormalized crop_id for direct crop-grouping queries without
      // the 3-hop chain (farm_sales → inventory → plantings → crops).
      // Nullable so existing/future records with no crop context don't break.
      {
        key: 'crop_id',
        type: 'relationship',
        relatedTable: 'crops',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'setNull',
        required: false,
      },
      // Buyer fields (Story 3.8: buyer_name is primary; buyer_type/buyer_id reserved
      // for future Vendor Module integration per POST-MVP.md)
      {
        key: 'buyer_type',
        type: 'enum',
        elements: ['household', 'external', 'market', 'cooperative'],
        required: true,
      },
      { key: 'buyer_id', type: 'string', size: 50, required: false },
      { key: 'buyer_name', type: 'string', size: 200, required: true },
      { key: 'sale_date', type: 'datetime', required: true },
      // Story 3.8: Changed integer → float to support fractional kg / decimal pricing (2 dp)
      { key: 'quantity_sold', type: 'float', min: 0, max: 1000000000000, required: true },
      { key: 'unit', type: 'string', size: 20, required: true, default: 'kg' },
      { key: 'price_per_unit', type: 'float', min: 0, max: 1000000000000, required: true },
      { key: 'total_amount', type: 'float', min: 0, max: 1000000000000, required: true },
      // Story 3.8: Constrained to enum for consistency
      {
        key: 'payment_status',
        type: 'enum',
        elements: ['Pending', 'Completed'],
        required: true,
      },
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

  // Story 3.10: Reserved for future persistent alert storage.
  // Not used in MVP — alerts are generated in-memory.
  farm_alerts: {
    name: 'Farm Alerts',
    permissions: permissions,
    columns: [
      { key: 'alert_type', type: 'string', size: 50, required: true },
      { key: 'severity', type: 'string', size: 20, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'message', type: 'string', size: 1000, required: false },
      { key: 'related_entity_type', type: 'string', size: 50, required: false },
      { key: 'related_entity_id', type: 'string', size: 50, required: false },
      { key: 'triggered_at', type: 'datetime', required: true },
      { key: 'is_read', type: 'boolean', required: true, default: false },
      { key: 'dismissed_at', type: 'datetime', required: false },
      // user_id is not a relationship in MVP; stored as string for flexibility
      { key: 'user_id', type: 'string', size: 50, required: true },
    ],
    indexes: [
      {
        key: 'idx_farm_alerts_user',
        type: 'key',
        columns: ['user_id'],
        orders: ['ASC'],
      },
      {
        key: 'idx_farm_alerts_type',
        type: 'key',
        columns: ['alert_type'],
        orders: ['ASC'],
      },
      {
        key: 'idx_farm_alerts_triggered',
        type: 'key',
        columns: ['triggered_at'],
        orders: ['DESC'],
      },
    ],
  },

  // School Module Tables (Story 4.1)
  learners: {
    name: 'Learners',
    permissions: permissions,
    columns: [
      // One learner row per resident, ever (Option A — Story 4.1).
      // Uniqueness is enforced in the school store (checkExistingEnrollment)
      // because Appwrite does not support indexes on relationship columns.
      {
        key: 'resident_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'restrict',
        required: true,
      },
      { key: 'enrollment_date', type: 'datetime', required: true },
      {
        key: 'enrollment_status',
        type: 'enum',
        elements: ['Active', 'Inactive', 'Graduated', 'Transferred', 'Dropped Out'],
        required: true,
        default: 'Active',
      },
      // Effective date for the most recent status change (Graduated/Transferred/Dropped Out)
      { key: 'status_effective_date', type: 'datetime', required: false },
      { key: 'parent_guardian_name', type: 'string', size: 255, required: false },
      { key: 'parent_guardian_phone', type: 'string', size: 20, required: false },
      { key: 'emergency_contact_name', type: 'string', size: 255, required: false },
      { key: 'emergency_contact_phone', type: 'string', size: 20, required: false },
      { key: 'medical_notes', type: 'string', size: 1000, required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      {
        key: 'class_id',
        type: 'relationship',
        relatedTable: 'school_classes',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'setNull',
        required: false,
      },
    ],
    indexes: [
      {
        key: 'idx_learners_status',
        type: 'key',
        columns: ['enrollment_status'],
        orders: ['ASC'],
      },
    ],
  },
  test_scores: {
    name: 'Test Scores',
    permissions: permissions,
    columns: [
      {
        key: 'learner_id',
        type: 'relationship',
        relatedTable: 'learners',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      {
        key: 'class_id',
        type: 'relationship',
        relatedTable: 'school_classes',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: false,
      },
      {
        key: 'subject',
        type: 'enum',
        elements: [
          'Mathematics',
          'English',
          'Integrated Science',
          'Social Studies',
          'Religious Education',
          'Civic Education',
          'Creative and Technology Studies',
          'Local Language',
          'Computer Studies',
          'Agriculture Science',
          'History',
          'Geography',
          'Biology',
          'Chemistry',
          'Physics',
          'Business Studies',
          'French',
          'Art',
          'Music',
          'Physical Education',
          'Other',
        ],
        required: true,
      },
      {
        key: 'assessment_type',
        type: 'enum',
        elements: [
          'Class Exercise',
          'Monthly Test',
          'Mid-Term Exam',
          'End-of-Term Exam',
          'Quiz',
          'Project',
          'Assignment',
          'Other',
        ],
        required: true,
      },
      // Story 4.3: Changed from enum to string — terms are now configurable via school_academic_terms.
      // The term name at recording time is stored literally so historical scores remain valid
      // even if terms are later renamed.
      { key: 'term', type: 'string', size: 100, required: true },
      { key: 'academic_year', type: 'integer', required: true },
      { key: 'assessment_date', type: 'datetime', required: true },
      { key: 'score_value', type: 'double', required: true },
      { key: 'max_score', type: 'double', required: true },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_test_scores_subject_date',
        type: 'key',
        columns: ['assessment_date', 'subject', 'assessment_type'],
        orders: ['DESC', 'ASC', 'ASC'],
      },
    ],
  },
  teacher_assignments: {
    name: 'Teacher Assignments',
    permissions: permissions,
    columns: [
      {
        key: 'teacher_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      {
        key: 'grade_level',
        type: 'enum',
        elements: [
          'Early Childhood',
          'Grade 1',
          'Grade 2',
          'Grade 3',
          'Grade 4',
          'Grade 5',
          'Grade 6',
          'Grade 7',
          'Grade 8',
          'Grade 9',
          'Grade 10',
          'Grade 11',
          'Grade 12',
        ],
        required: true,
      },
      { key: 'subjects', type: 'string', size: 100, array: true, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_teacher_assignments_grade',
        type: 'key',
        columns: ['grade_level'],
        orders: ['ASC'],
      },
    ],
  },
  school_classes: {
    name: 'School Classes',
    permissions: permissions,
    columns: [
      { key: 'name', type: 'string', size: 100, required: true },
      {
        key: 'grade_level',
        type: 'enum',
        elements: [
          'Early Childhood',
          'Grade 1',
          'Grade 2',
          'Grade 3',
          'Grade 4',
          'Grade 5',
          'Grade 6',
          'Grade 7',
          'Grade 8',
          'Grade 9',
          'Grade 10',
          'Grade 11',
          'Grade 12',
        ],
        required: true,
      },
      { key: 'academic_year', type: 'integer', required: true },
      {
        key: 'class_teacher_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'setNull',
        required: false,
      },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_school_classes_year',
        type: 'key',
        columns: ['academic_year'],
        orders: ['ASC'],
      },
    ],
  },
  // Story 4.3: Configurable academic terms (replaces hard-coded TERMS constant)
  school_academic_terms: {
    name: 'School Academic Terms',
    permissions: permissions,
    columns: [
      { key: 'academic_year', type: 'integer', required: true },
      // Free text — e.g. "Term 1", "Semester 1", "Quarter 3"
      { key: 'term_name', type: 'string', size: 100, required: true },
      // Ordering within the year (1, 2, 3...)
      { key: 'term_order', type: 'integer', required: true },
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: true },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_academic_terms_year',
        type: 'key',
        columns: ['academic_year'],
        orders: ['ASC'],
      },
      {
        key: 'idx_academic_terms_year_order',
        type: 'key',
        columns: ['academic_year', 'term_order'],
        orders: ['ASC', 'ASC'],
      },
    ],
  },

  // Story 4.3: School calendar events — holidays, PD days, exam blocks, etc.
  school_calendar_events: {
    name: 'School Calendar Events',
    permissions: permissions,
    columns: [
      { key: 'title', type: 'string', size: 255, required: true },
      {
        key: 'event_type',
        type: 'enum',
        elements: [
          'public_holiday',
          'school_holiday',
          'pd_day',
          'exam_block',
          'early_dismissal',
          'assembly',
          'other',
        ],
        required: true,
      },
      // start_date = end_date for single-day events
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: true },
      // false = school closed (not a school day); true = school open but modified
      { key: 'is_school_day', type: 'boolean', required: true, default: false },
      // Empty/null = school-wide; populated = only these class IDs affected.
      // Stored as string array (not a relationship) to avoid cascade complexity.
      { key: 'affected_class_ids', type: 'string', size: 50, array: true, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [
      {
        key: 'idx_calendar_events_start',
        type: 'key',
        columns: ['start_date'],
        orders: ['ASC'],
      },
      {
        key: 'idx_calendar_events_type',
        type: 'key',
        columns: ['event_type'],
        orders: ['ASC'],
      },
    ],
  },

  // Story 5.2: User-created village calendar events (role-scoped categories,
  // optional times, simple daily/weekly/monthly recurrence).
  village_events: {
    name: 'Village Events',
    permissions: permissions,
    columns: [
      { key: 'title', type: 'string', size: 255, required: true },
      {
        key: 'category',
        type: 'enum',
        elements: ['school', 'farm', 'village', 'guests', 'equipment', 'energy', 'other'],
        required: true,
      },
      // start_date = end_date for single-day events (inclusive end)
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: true },
      // HH:mm 24-hour strings; only set when is_all_day=false
      { key: 'start_time', type: 'string', size: 5, required: false },
      { key: 'end_time', type: 'string', size: 5, required: false },
      { key: 'is_all_day', type: 'boolean', required: true, default: true },
      { key: 'is_recurring', type: 'boolean', required: true, default: false },
      // Simple string rule only (no rrule) — required when is_recurring=true
      {
        key: 'recurrence_rule',
        type: 'enum',
        elements: ['daily', 'weekly', 'monthly'],
        required: false,
      },
      { key: 'location', type: 'string', size: 255, required: false },
      { key: 'description', type: 'string', size: 1000, required: false },
      // Appwrite user $id of the creator (edit/delete permission anchor)
      { key: 'created_by', type: 'string', size: 50, required: true },
      // Capture-only in Story 5.2 — delivery belongs to the Story 5.10 notifications system
      { key: 'notify_user_ids', type: 'string', size: 50, array: true, required: false },
      // Always false for user-created rows (system badge is for Farm harvest auto-events)
      { key: 'system_generated', type: 'boolean', required: true, default: false },
    ],
    indexes: [
      {
        key: 'idx_village_events_date',
        type: 'key',
        columns: ['start_date'],
        orders: ['ASC'],
      },
    ],
  },

  // Story 4.4: Per-grade daily bell schedule (replaces school_timetable stub)
  school_period_slots: {
    name: 'School Period Slots',
    permissions: permissions,
    columns: [
      {
        key: 'grade_level',
        type: 'enum',
        elements: [
          'Early Childhood',
          'Grade 1',
          'Grade 2',
          'Grade 3',
          'Grade 4',
          'Grade 5',
          'Grade 6',
          'Grade 7',
          'Grade 8',
          'Grade 9',
          'Grade 10',
          'Grade 11',
          'Grade 12',
        ],
        required: true,
      },
      { key: 'academic_year', type: 'integer', required: true },
      // Ordering within the day (1, 2, 3...)
      { key: 'slot_number', type: 'integer', required: true },
      // Display label: "Period 1", "Morning Break", "Lunch", "Assembly", etc.
      { key: 'label', type: 'string', size: 100, required: true },
      {
        key: 'slot_type',
        type: 'enum',
        elements: ['class', 'break', 'lunch', 'assembly', 'free'],
        required: true,
        default: 'class',
      },
      // HH:mm 24-hour format stored as string (e.g. "08:00")
      { key: 'start_time', type: 'string', size: 5, required: true },
      { key: 'end_time', type: 'string', size: 5, required: true },
      // Empty array = applies every school day.
      // Populated = only on listed days: ['Monday', 'Friday'] etc.
      { key: 'applies_to_days', type: 'string', size: 10, array: true, required: false },
      { key: 'notes', type: 'string', size: 255, required: false },
    ],
    indexes: [
      {
        key: 'idx_period_slots_grade_year',
        type: 'key',
        columns: ['grade_level', 'academic_year'],
        orders: ['ASC', 'ASC'],
      },
      {
        key: 'idx_period_slots_grade_year_slot',
        type: 'key',
        columns: ['grade_level', 'academic_year', 'slot_number'],
        orders: ['ASC', 'ASC', 'ASC'],
      },
    ],
  },

  // Story 4.5: Class timetable entries — weekly subject grid per class or grade template.
  // Replaces the removed school_timetable stub.
  // is_template = true + class_id = null → grade-level template
  // is_template = false + class_id set → class-specific schedule
  class_timetable_entries: {
    name: 'Class Timetable Entries',
    permissions: permissions,
    columns: [
      // null when is_template = true
      {
        key: 'class_id',
        type: 'relationship',
        relatedTable: 'school_classes',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: false,
      },
      { key: 'is_template', type: 'boolean', required: true, default: false },
      {
        key: 'grade_level',
        type: 'enum',
        elements: [
          'Early Childhood',
          'Grade 1',
          'Grade 2',
          'Grade 3',
          'Grade 4',
          'Grade 5',
          'Grade 6',
          'Grade 7',
          'Grade 8',
          'Grade 9',
          'Grade 10',
          'Grade 11',
          'Grade 12',
        ],
        required: true,
      },
      // school_period_slots.$id stored as string (not relationship) — intentional,
      // avoids cascade and allows slot reuse across grades.
      { key: 'slot_id', type: 'string', size: 50, required: true },
      {
        key: 'day_of_week',
        type: 'enum',
        elements: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        required: true,
      },
      // Free string — not enum — allows subjects not in the standard SUBJECTS list
      { key: 'subject', type: 'string', size: 100, required: false },
      {
        key: 'teacher_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'setNull',
        required: false,
      },
      { key: 'academic_year', type: 'integer', required: true },
      // Date range for mid-year timetable changes. null valid_to = currently active.
      { key: 'valid_from', type: 'datetime', required: false },
      { key: 'valid_to', type: 'datetime', required: false },
      { key: 'notes', type: 'string', size: 255, required: false },
    ],
    indexes: [
      {
        key: 'idx_timetable_grade_template',
        type: 'key',
        columns: ['grade_level', 'is_template', 'academic_year'],
        orders: ['ASC', 'ASC', 'ASC'],
      },
    ],
  },
  learner_attendance: {
    name: 'Learner Attendance',
    permissions: permissions,
    columns: [
      {
        key: 'learner_id',
        type: 'relationship',
        relatedTable: 'learners',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      {
        key: 'class_id',
        type: 'relationship',
        relatedTable: 'school_classes',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      { key: 'attendance_date', type: 'datetime', required: true },
      {
        key: 'status',
        type: 'enum',
        elements: ['Present', 'Absent', 'Late', 'Excused'],
        required: true,
      },
      { key: 'absence_reason', type: 'string', size: 255, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    indexes: [],
  },
  interventions: {
    name: 'Interventions',
    permissions: permissions,
    columns: [
      {
        key: 'learner_id',
        type: 'relationship',
        relatedTable: 'learners',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      {
        key: 'assigned_teacher_id',
        type: 'relationship',
        relatedTable: 'residents',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'setNull',
        required: false,
      },
      // Intervention type: controlled vocabulary (see INTERVENTION_TYPES constant)
      { key: 'intervention_type', type: 'string', size: 100, required: true },
      // Focus areas: free-text array (e.g. ["Reading comprehension", "Mathematics"])
      { key: 'focus_areas', type: 'string', size: 255, array: true, required: false },
      // Frequency description: free text (e.g. "3x per week - Mon/Wed/Fri")
      { key: 'frequency', type: 'string', size: 255, required: false },
      // Success criteria: free text (e.g. "Score above 60% in all subjects by end of term")
      { key: 'success_criteria', type: 'string', size: 500, required: false },
      { key: 'start_date', type: 'datetime', required: true },
      { key: 'end_date', type: 'datetime', required: false },
      // Academic term when intervention was created (free string, from academic-terms-store)
      { key: 'term', type: 'string', size: 100, required: false },
      { key: 'academic_year', type: 'integer', required: false },
      {
        key: 'status',
        type: 'enum',
        elements: ['Active', 'Paused', 'Resolved', 'Closed Without Resolution'],
        required: true,
      },
      // Outcome (filled when status is Resolved or Closed): free text summary
      { key: 'outcome', type: 'string', size: 1000, required: false },
      // Created by (resident ID of the user who created the plan)
      { key: 'created_by', type: 'string', size: 255, required: false },
      { key: 'notes', type: 'string', size: 500, required: false },
    ],
    // No indexes: learner_id and assigned_teacher_id are relationship columns,
    // and Appwrite does not support indexing relationship attributes.
    // Matches learner_attendance (relationship columns, indexes: []).
    indexes: [],
  },
  intervention_notes: {
    name: 'Intervention Notes',
    permissions: permissions,
    columns: [
      {
        key: 'intervention_id',
        type: 'relationship',
        relatedTable: 'interventions',
        relationType: 'manyToOne',
        twoWay: false,
        onDelete: 'cascade',
        required: true,
      },
      { key: 'note_date', type: 'datetime', required: true },
      { key: 'content', type: 'string', size: 2000, required: true },
      // Who wrote the note (resident ID, stored as string for resilience)
      { key: 'author_id', type: 'string', size: 255, required: false },
      {
        key: 'learner_response',
        type: 'enum',
        elements: ['Positive', 'Neutral', 'Negative', 'Not Observed'],
        required: false,
      },
    ],
    // No index: intervention_id is a relationship column (see interventions table note above).
    indexes: [],
  },

  // Story 4.12: Long-term educational goal configuration (e.g. 90% of learners at 90th-percentile benchmark).
  // Standalone table — one active row is selected by the school-goals store.
  school_long_term_goals: {
    name: 'School Long-Term Goals',
    permissions: permissions,
    columns: [
      {
        key: 'goal_name',
        type: 'string',
        size: 255,
        required: true,
        default: '90% of learners at 90th-percentile benchmark',
      },
      {
        key: 'target_percent_of_learners',
        type: 'double',
        required: true,
        default: 90,
      },
      {
        key: 'target_percentile_score',
        type: 'double',
        required: true,
        default: 90,
      },
      { key: 'baseline_academic_year', type: 'integer', required: true },
      { key: 'target_academic_year', type: 'integer', required: true },
      { key: 'is_active', type: 'boolean', required: true, default: true },
      { key: 'notes', type: 'string', size: 1000, required: false },
    ],
    indexes: [
      {
        key: 'idx_school_long_term_goals_active',
        type: 'key',
        columns: ['is_active'],
        orders: ['ASC'],
      },
    ],
  },
};

// Helper functions
async function createTable(tableId, schema) {
  const permissions = schema.permissions || [
    'read("any")',
    'create("any")',
    'update("any")',
    'delete("any")',
  ];

  try {
    console.log(`\n📦 Creating table: ${schema.name} (${tableId})`);

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
      // Sync permissions on existing tables so schema changes take effect
      try {
        await databases.updateCollection(config.databaseId, tableId, schema.name, permissions);
        console.log(`   🔄 Permissions synced: ${schema.name}`);
      } catch (permErr) {
        console.warn(`   ⚠️  Could not sync permissions for ${schema.name}:`, permErr.message);
      }
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
    console.log('   - 24 Tables created/verified');
    console.log('   - 150+ columns created/verified');
    console.log('   - 25+ indexes created/verified');
    console.log('   - Permissions configured');
    console.log('\n🎉 You can now test the database connection at /appwrite-test');
    console.log('\n📦 Tables created:');
    console.log('   Core: users, residents, households, roles, village_settings');
    console.log(
      '   Farm: soil_types, plots, crops, plantings, harvests, harvest_entries, farm_sales, farm_alerts',
    );
    console.log(
      '   Finance: finance_categories, funding_sources, loans, inventory, finance_transactions, transaction_links',
    );
    console.log('   Loan Mgmt: repayment_schedule, loan_payments');
    console.log(
      '   School: school_classes, learners, test_scores, teacher_assignments, learner_attendance,',
    );
    console.log('           interventions, intervention_notes, school_long_term_goals,');
    console.log(
      '           school_academic_terms, school_calendar_events, school_period_slots, class_timetable_entries',
    );
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
