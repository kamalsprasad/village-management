/**
 * Vendor Utilities (Story 5.7)
 *
 * Small display helpers shared across the Vendors module pages/components.
 */

const VENDOR_TYPE_COLORS = {
  Supplier: 'blue',
  Buyer: 'orange',
  Both: 'purple',
};

const BUSINESS_TYPE_ICONS = {
  Individual: 'person',
  Cooperative: 'groups',
  Company: 'business',
  NGO: 'volunteer_activism',
  Government: 'account_balance',
  Market: 'storefront',
};

/**
 * Get the Quasar color name associated with a vendor type.
 * @param {string} vendorType - 'Supplier' | 'Buyer' | 'Both'
 * @returns {string} Quasar color name
 */
export function getVendorTypeColor(vendorType) {
  return VENDOR_TYPE_COLORS[vendorType] || 'grey';
}

/**
 * Get a Material icon name for a vendor's business type.
 * @param {string} businessType
 * @returns {string} Material icon name
 */
export function getBusinessTypeIcon(businessType) {
  return BUSINESS_TYPE_ICONS[businessType] || 'store';
}

/**
 * Format a vendor for display, e.g. "Benga Agro Supplies (Company)"
 * @param {Object} vendor
 * @returns {string}
 */
export function formatVendorName(vendor) {
  if (!vendor) return '';
  if (vendor.business_type) {
    return `${vendor.name} (${vendor.business_type})`;
  }
  return vendor.name;
}

/**
 * List of vendor type options for selects.
 */
export const VENDOR_TYPE_OPTIONS = ['Supplier', 'Buyer', 'Both'];

/**
 * List of business type options for selects.
 */
export const BUSINESS_TYPE_OPTIONS = [
  'Individual',
  'Cooperative',
  'Company',
  'NGO',
  'Government',
  'Market',
];
