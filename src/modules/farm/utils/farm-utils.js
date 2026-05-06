/**
 * Farm Module Utility Functions
 *
 * Shared helpers for farm-related calculations and naming conventions.
 * Story 3.7: Harvest-to-Inventory naming helpers
 */

// Story 3.6/3.10: Grace period for perennial harvest frequency calculations
// Number of days past the recommended harvest frequency before marking as overdue
export const OVERDUE_GRACE_DAYS = 7;

/**
 * Derive the produce name for a farm_produce inventory item.
 *
 * Naming convention:
 * - Annual crop (single harvest): `[Crop Name] – [Plot Name] [Season Label]`
 *   Example: `Maize – North Field 2025/26 Wet Season`
 * - Perennial crop (aggregated, continuous picking): `[Crop Name] – [Plot Name] (Ongoing)`
 *   Example: `Banana – Orchard Plot (Ongoing)`
 *
 * Season derivation (Zambia):
 * - Dry season: May–October → `[Year] Dry Season`
 * - Wet season: November–April → `[Year]/[Year+1] Wet Season`
 *
 * @param {Object} crop - Crop object with crop_name, crop_type
 * @param {Object} plot - Plot object with name
 * @param {string|Date} harvestDate - Date for season calculation (ISO string or Date)
 * @returns {string} The derived produce name
 */
export function deriveProduceName(crop, plot, harvestDate) {
  if (!crop || !plot) {
    return 'Unknown Produce';
  }

  const cropName = crop.crop_name || 'Unknown Crop';
  const plotName = plot.name || 'Unknown Plot';
  const isPerennial = crop.crop_type === 'Perennial';

  // Perennials use (Ongoing) suffix
  if (isPerennial) {
    return `${cropName} – ${plotName} (Ongoing)`;
  }

  // Pin to noon UTC to avoid timezone drift across season boundaries
  const dateStr = harvestDate
    ? (typeof harvestDate === 'string' ? harvestDate : harvestDate.toISOString()).split('T')[0]
    : new Date().toISOString().split('T')[0];
  const date = new Date(dateStr + 'T12:00:00Z');
  const month = date.getUTCMonth() + 1; // 1-12, UTC-safe
  const year = date.getUTCFullYear();

  const seasonLabel =
    month >= 5 && month <= 10
      ? `${year} Dry Season`
      : month >= 11
        ? `${year}/${year + 1} Wet Season`
        : `${year - 1}/${year} Wet Season`;

  return `${cropName} – ${plotName} ${seasonLabel}`;
}

/**
 * Derive the final name for a perennial crop when planting is marked complete.
 *
 * Changes from `(Ongoing)` suffix to `(Complete)` suffix.
 *
 * Example: `Banana – Orchard Plot (Ongoing)` → `Banana – Orchard Plot (Complete)`
 *
 * @param {string} currentName - The current item_name (with Ongoing suffix)
 * @returns {string} The new item_name with Complete suffix
 */
export function derivePerennialCompleteName(currentName) {
  if (!currentName) {
    return 'Unknown Produce (Complete)';
  }

  // Replace (Ongoing) with (Complete)
  if (currentName.includes('(Ongoing)')) {
    return currentName.replace('(Ongoing)', '(Complete)');
  }

  // If no (Ongoing) suffix, append (Complete)
  return `${currentName} (Complete)`;
}

/**
 * Check if a name is in the perennial "ongoing" format.
 *
 * @param {string} name - The item_name to check
 * @returns {boolean} True if name contains (Ongoing)
 */
export function isPerennialOngoingName(name) {
  return name && name.includes('(Ongoing)');
}

// =============================================================================
// Story 3.10: Yield Analysis Utilities
// =============================================================================

/**
 * Derive the Zambian agricultural season from a planting date.
 *
 * Season boundaries (Eastern Province / standard Zambia):
 *   Wet Season : November–April  → "[startYear]/[endYear] Wet Season"
 *   Dry Season : May–October     → "[year] Dry Season"
 *
 * Uses UTC-anchored date parsing (same pattern as deriveProduceName) to avoid
 * timezone-driven season boundary errors.
 *
 * @param {string|Date} plantingDate - ISO date string or Date object
 * @returns {{ label: string, type: 'wet'|'dry', startYear: number }}
 */
export function getSeason(plantingDate) {
  if (!plantingDate)
    return { label: 'Unknown Season', type: 'dry', startYear: new Date().getFullYear() };

  // Pin to noon UTC to avoid timezone drift across month/season boundaries
  const dateStr =
    typeof plantingDate === 'string'
      ? plantingDate.split('T')[0]
      : plantingDate.toISOString().split('T')[0];
  const date = new Date(dateStr + 'T12:00:00Z');
  const month = date.getUTCMonth() + 1; // 1-indexed
  const year = date.getUTCFullYear();

  if (month >= 5 && month <= 10) {
    return {
      label: `${year} Dry Season`,
      type: 'dry',
      startYear: year,
    };
  } else {
    // Wet Season: Nov (11) of startYear → Apr (4) of startYear+1
    const startYear = month >= 11 ? year : year - 1;
    return {
      label: `${startYear}/${startYear + 1} Wet Season`,
      type: 'wet',
      startYear,
    };
  }
}

/**
 * Compute yield per hectare for a harvest against a planting/plot.
 *
 * @param {{ total_quantity_kg: number|string }} harvest
 * @param {{ area_used_hectares?: number|string }} planting
 * @param {{ size_hectares?: number|string }} plot
 * @returns {number|null} kg/ha rounded to 1 decimal, or null if area is 0/missing
 */
export function computeYieldPerHectare(harvest, planting, plot) {
  const kg = Number(harvest?.total_quantity_kg) || 0;
  const ha = Number(planting?.area_used_hectares || plot?.size_hectares || 0);
  if (!ha || ha <= 0) return null;
  return Math.round((kg / ha) * 10) / 10;
}
