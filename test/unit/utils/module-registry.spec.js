import { describe, it, expect } from 'vitest';
import {
  MODULES,
  CORE_MODULE_KEYS,
  OPTIONAL_MODULE_KEYS,
  getModuleByKey,
  getModulesByType,
  getModuleLabel,
} from 'src/utils/module-registry';

describe('module-registry', () => {
  describe('MODULES', () => {
    it('includes the core modules', () => {
      const keys = MODULES.map((m) => m.key);
      expect(keys).toContain('residents');
      expect(keys).toContain('households');
      expect(keys).toContain('dashboard');
      expect(keys).toContain('finance');
      expect(keys).toContain('inventory');
      expect(keys).toContain('calendar');
      expect(keys).toContain('storage');
    });

    it('includes the optional modules', () => {
      const keys = MODULES.map((m) => m.key);
      expect(keys).toContain('farm');
      expect(keys).toContain('school');
      expect(keys).toContain('vendors');
    });

    it('every module has required fields', () => {
      for (const m of MODULES) {
        expect(m.key).toBeTruthy();
        expect(m.label).toBeTruthy();
        expect(m.icon).toBeTruthy();
        expect(typeof m.isCore).toBe('boolean');
        expect(typeof m.isOptional).toBe('boolean');
        expect(Array.isArray(m.dependencies)).toBe(true);
        expect(Array.isArray(m.requiredBy)).toBe(true);
      }
    });

    it('farm depends on vendors', () => {
      const farm = getModuleByKey('farm');
      expect(farm.dependencies).toContain('vendors');
    });

    it('vendors is requiredBy farm and finance', () => {
      const vendors = getModuleByKey('vendors');
      expect(vendors.requiredBy).toContain('farm');
      expect(vendors.requiredBy).toContain('finance');
    });
  });

  describe('CORE_MODULE_KEYS / OPTIONAL_MODULE_KEYS', () => {
    it('core keys match isCore modules', () => {
      expect(CORE_MODULE_KEYS).toEqual(MODULES.filter((m) => m.isCore).map((m) => m.key));
    });

    it('optional keys match isOptional modules', () => {
      expect(OPTIONAL_MODULE_KEYS).toEqual(MODULES.filter((m) => m.isOptional).map((m) => m.key));
    });

    it('no module is both core and optional', () => {
      const both = MODULES.filter((m) => m.isCore && m.isOptional);
      expect(both).toHaveLength(0);
    });
  });

  describe('getModuleByKey', () => {
    it('returns the module for a known key', () => {
      expect(getModuleByKey('farm')?.label).toBe('Farm Management');
    });

    it('returns undefined for an unknown key', () => {
      expect(getModuleByKey('nonexistent')).toBeUndefined();
    });
  });

  describe('getModulesByType', () => {
    it('returns only core modules for "core"', () => {
      const core = getModulesByType('core');
      expect(core.every((m) => m.isCore)).toBe(true);
      expect(core.length).toBe(CORE_MODULE_KEYS.length);
    });

    it('returns only optional modules for "optional"', () => {
      const opt = getModulesByType('optional');
      expect(opt.every((m) => m.isOptional)).toBe(true);
      expect(opt.length).toBe(OPTIONAL_MODULE_KEYS.length);
    });

    it('returns all modules for "all" or default', () => {
      expect(getModulesByType('all')).toHaveLength(MODULES.length);
      expect(getModulesByType()).toHaveLength(MODULES.length);
    });
  });

  describe('getModuleLabel', () => {
    it('returns the label for a known key', () => {
      expect(getModuleLabel('farm')).toBe('Farm Management');
    });

    it('returns the key itself for an unknown key', () => {
      expect(getModuleLabel('nonexistent')).toBe('nonexistent');
    });
  });
});
