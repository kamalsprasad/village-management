/**
 * Inventory-Eligible Category Mapping
 *
 * Maps finance expense category names to inventory item_type values.
 * Used by Story 2.7 to determine which expense categories can auto-create inventory items.
 *
 * Category names must match exactly with the names in the finance_categories collection
 * (seeded by server/scripts/seed-finance-categories.js).
 */

export const INVENTORY_ELIGIBLE_CATEGORIES = {
  'Farm Inputs': 'farm_inputs',
  'School Supplies': 'school_supplies',
  'Medical Supplies': 'medical_supplies',
  'Kitchen Supplies': 'kitchen_supplies',
  Equipment: 'equipment',
};

/**
 * Check if a category name is eligible for automatic inventory creation
 * @param {string} categoryName - The category name from finance_categories
 * @returns {boolean}
 */
export function isInventoryEligible(categoryName) {
  return categoryName in INVENTORY_ELIGIBLE_CATEGORIES;
}

/**
 * Get the inventory item_type for a given category name
 * @param {string} categoryName - The category name from finance_categories
 * @returns {string|null} - The inventory item_type or null if not eligible
 */
export function getInventoryTypeForCategory(categoryName) {
  return INVENTORY_ELIGIBLE_CATEGORIES[categoryName] || null;
}
