import { describe, it, expect } from 'vitest';
import {
  INVENTORY_ELIGIBLE_CATEGORIES,
  isInventoryEligible,
  getInventoryTypeForCategory,
} from 'src/utils/inventory-categories';

describe('inventory-categories', () => {
  describe('INVENTORY_ELIGIBLE_CATEGORIES', () => {
    it('maps known finance categories to inventory item_types', () => {
      expect(INVENTORY_ELIGIBLE_CATEGORIES['Farm Inputs']).toBe('farm_inputs');
      expect(INVENTORY_ELIGIBLE_CATEGORIES['School Supplies']).toBe('school_supplies');
      expect(INVENTORY_ELIGIBLE_CATEGORIES['Medical Supplies']).toBe('medical_supplies');
      expect(INVENTORY_ELIGIBLE_CATEGORIES['Kitchen Supplies']).toBe('kitchen_supplies');
      expect(INVENTORY_ELIGIBLE_CATEGORIES['Equipment']).toBe('equipment');
    });
  });

  describe('isInventoryEligible', () => {
    it('returns true for eligible categories', () => {
      expect(isInventoryEligible('Farm Inputs')).toBe(true);
      expect(isInventoryEligible('Equipment')).toBe(true);
    });

    it('returns false for non-eligible categories', () => {
      expect(isInventoryEligible('Salaries')).toBe(false);
      expect(isInventoryEligible('Donations')).toBe(false);
    });

    it('returns false for undefined/empty input', () => {
      expect(isInventoryEligible(undefined)).toBe(false);
      expect(isInventoryEligible('')).toBe(false);
    });
  });

  describe('getInventoryTypeForCategory', () => {
    it('returns the item_type for eligible categories', () => {
      expect(getInventoryTypeForCategory('Farm Inputs')).toBe('farm_inputs');
      expect(getInventoryTypeForCategory('School Supplies')).toBe('school_supplies');
    });

    it('returns null for non-eligible categories', () => {
      expect(getInventoryTypeForCategory('Salaries')).toBeNull();
    });

    it('returns null for undefined/empty input', () => {
      expect(getInventoryTypeForCategory(undefined)).toBeNull();
      expect(getInventoryTypeForCategory('')).toBeNull();
    });
  });
});
