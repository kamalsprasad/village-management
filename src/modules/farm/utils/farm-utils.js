/**
 * Farm Module Utility Functions
 *
 * Shared helpers for farm-related calculations and naming conventions.
 * Story 3.7: Harvest-to-Inventory naming helpers
 */

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
