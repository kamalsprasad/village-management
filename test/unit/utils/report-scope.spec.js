import { describe, it, expect } from 'vitest';
import {
  MODULE_ROLES,
  SOURCE_MODULES,
  getAllowedModules,
  canAccessModule,
  filterByModuleScope,
  getAvailableModuleOptions,
} from 'src/utils/report-scope';
import {
  ADMIN_ROLE,
  VILLAGE_HEAD_ROLE,
  FINANCE_MANAGER_ROLE,
  FARM_MANAGER_ROLE,
  RESIDENT_ROLE,
  GUEST_ROLE,
} from 'test/helpers/fixtures';

describe('report-scope', () => {
  describe('MODULE_ROLES', () => {
    it('maps System Administrator to all modules', () => {
      expect(MODULE_ROLES['System Administrator']).toEqual(['*']);
    });

    it('maps Farm Manager to Farm only', () => {
      expect(MODULE_ROLES['Farm Manager']).toEqual(['Farm']);
    });

    it('maps Resident/Learner/Guest to no modules', () => {
      expect(MODULE_ROLES['Resident']).toEqual([]);
      expect(MODULE_ROLES['Learner']).toEqual([]);
      expect(MODULE_ROLES['Guest']).toEqual([]);
    });
  });

  describe('SOURCE_MODULES', () => {
    it('contains the expected set', () => {
      expect(SOURCE_MODULES).toEqual(['Farm', 'School', 'Village', 'Guest House', 'Other']);
    });
  });

  describe('getAllowedModules', () => {
    it('returns [] for empty roles', () => {
      expect(getAllowedModules([])).toEqual([]);
    });

    it('returns null (all) when a role has wildcard permission', () => {
      expect(getAllowedModules([ADMIN_ROLE])).toBeNull();
      expect(getAllowedModules([VILLAGE_HEAD_ROLE])).toBeNull();
    });

    it('returns null when a role maps to ["*"] by name', () => {
      // Finance Manager has permissions without '*' but MODULE_ROLES maps it to ['*']
      const fmNoWildcard = { ...FINANCE_MANAGER_ROLE, permissions: ['finance:read'] };
      expect(getAllowedModules([fmNoWildcard])).toBeNull();
    });

    it('returns the union of modules for module-specific roles', () => {
      expect(getAllowedModules([FARM_MANAGER_ROLE])).toEqual(['Farm']);
    });

    it('returns [] for roles with no module mapping and no wildcard', () => {
      expect(getAllowedModules([RESIDENT_ROLE])).toEqual([]);
      expect(getAllowedModules([GUEST_ROLE])).toEqual([]);
    });

    it('unions modules across multiple module-specific roles', () => {
      const headTeacher = { name: 'Head Teacher', permissions: ['school:read'] };
      const result = getAllowedModules([FARM_MANAGER_ROLE, headTeacher]);
      expect(result.sort()).toEqual(['Farm', 'School']);
    });
  });

  describe('canAccessModule', () => {
    it('returns true for wildcard roles', () => {
      expect(canAccessModule([ADMIN_ROLE], 'Farm')).toBe(true);
      expect(canAccessModule([ADMIN_ROLE], 'School')).toBe(true);
    });

    it('returns true for the mapped module', () => {
      expect(canAccessModule([FARM_MANAGER_ROLE], 'Farm')).toBe(true);
    });

    it('returns false for a non-mapped module', () => {
      expect(canAccessModule([FARM_MANAGER_ROLE], 'School')).toBe(false);
    });

    it('returns false for empty roles', () => {
      expect(canAccessModule([], 'Farm')).toBe(false);
    });
  });

  describe('filterByModuleScope', () => {
    const txns = [
      { source_module: 'Farm' },
      { source_module: 'School' },
      { source_module: 'Village' },
    ];

    it('returns all transactions for wildcard roles', () => {
      expect(filterByModuleScope(txns, [ADMIN_ROLE])).toEqual(txns);
    });

    it('filters to allowed modules for module-specific roles', () => {
      const out = filterByModuleScope(txns, [FARM_MANAGER_ROLE]);
      expect(out).toEqual([{ source_module: 'Farm' }]);
    });

    it('returns empty for roles with no module access', () => {
      expect(filterByModuleScope(txns, [RESIDENT_ROLE])).toEqual([]);
    });
  });

  describe('getAvailableModuleOptions', () => {
    it('returns all SOURCE_MODULES for wildcard roles', () => {
      expect(getAvailableModuleOptions([ADMIN_ROLE])).toEqual(SOURCE_MODULES);
    });

    it('returns only allowed modules for module-specific roles', () => {
      expect(getAvailableModuleOptions([FARM_MANAGER_ROLE])).toEqual(['Farm']);
    });

    it('returns [] for roles with no module access', () => {
      expect(getAvailableModuleOptions([RESIDENT_ROLE])).toEqual([]);
    });
  });
});
