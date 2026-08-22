import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  stripQuotes,
  getAppwriteConfig,
  createAdminUser,
  syncExistingAdminToDatabase,
} from '../../../scripts/setup/create-admin.js';

describe('create-admin script', () => {
  describe('stripQuotes', () => {
    it('removes surrounding double and single quotes and trims whitespace', () => {
      expect(stripQuotes('"hello"')).toBe('hello');
      expect(stripQuotes("'world'")).toBe('world');
      expect(stripQuotes('  "quoted"  ')).toBe('quoted');
      expect(stripQuotes('plain')).toBe('plain');
      expect(stripQuotes('')).toBe('');
      expect(stripQuotes(null)).toBe(null);
    });
  });

  describe('getAppwriteConfig', () => {
    it('returns configuration from environment variables with fallbacks', () => {
      const config = getAppwriteConfig();
      expect(config).toBeDefined();
      expect(config.databaseId).toBeDefined();
      expect(config.rolesTableId).toBeDefined();
      expect(config.usersTableId).toBeDefined();
    });
  });

  describe('createAdminUser', () => {
    let mockUsersService;
    let mockTeamsService;
    let mockTables;
    const config = {
      databaseId: 'villageDB',
      rolesTableId: 'roles',
      usersTableId: 'users',
    };

    beforeEach(() => {
      mockUsersService = {
        create: vi.fn().mockResolvedValue({ $id: 'admin_user_123' }),
        delete: vi.fn().mockResolvedValue({}),
      };
      mockTeamsService = {
        createMembership: vi.fn().mockResolvedValue({}),
      };
      mockTables = {
        listRows: vi.fn().mockResolvedValue({
          rows: [{ $id: 'role_sys_admin_1', name: 'System Administrator' }],
        }),
        createRow: vi.fn().mockResolvedValue({ $id: 'admin_user_123', email: 'admin@village.local' }),
      };
    });

    it('creates Auth user, adds to team, and creates Users database document with active: true and matching $id', async () => {
      const result = await createAdminUser({
        usersService: mockUsersService,
        teamsService: mockTeamsService,
        tables: mockTables,
        config,
        email: 'admin@village.local',
        name: 'System Admin',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();

      // Verify Auth creation
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: result.userId,
          email: 'admin@village.local',
          name: 'System Admin',
          password: 'Password123!',
        })
      );

      // Verify team membership
      expect(mockTeamsService.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'village_administrators',
          roles: ['admin'],
          email: 'admin@village.local',
          userId: result.userId,
        })
      );

      // Verify database document creation in users table
      expect(mockTables.createRow).toHaveBeenCalledWith({
        databaseId: 'villageDB',
        tableId: 'users',
        rowId: result.userId,
        data: {
          email: 'admin@village.local',
          name: 'System Admin',
          role_ids: ['role_sys_admin_1'],
          active: true,
        },
      });
    });

    it('throws an error if System Administrator role is not found', async () => {
      mockTables.listRows.mockResolvedValue({ rows: [] });

      await expect(
        createAdminUser({
          usersService: mockUsersService,
          teamsService: mockTeamsService,
          tables: mockTables,
          config,
          email: 'admin@village.local',
          name: 'System Admin',
          password: 'Password123!',
        })
      ).rejects.toThrow('System Administrator role not found in database');

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('rolls back Auth user if database document creation fails', async () => {
      mockTables.createRow.mockRejectedValue(new Error('Database error'));

      await expect(
        createAdminUser({
          usersService: mockUsersService,
          teamsService: mockTeamsService,
          tables: mockTables,
          config,
          email: 'admin@village.local',
          name: 'System Admin',
          password: 'Password123!',
        })
      ).rejects.toThrow('Database error');

      expect(mockUsersService.delete).toHaveBeenCalled();
    });
  });

  describe('syncExistingAdminToDatabase', () => {
    let mockTeamsService;
    let mockTables;
    const config = {
      databaseId: 'villageDB',
      rolesTableId: 'roles',
      usersTableId: 'users',
    };

    beforeEach(() => {
      mockTeamsService = {
        createMembership: vi.fn().mockResolvedValue({}),
      };
      mockTables = {
        listRows: vi.fn().mockResolvedValue({
          rows: [{ $id: 'role_sys_admin_1', name: 'System Administrator' }],
        }),
        createRow: vi.fn().mockResolvedValue({ $id: 'auth_user_999' }),
      };
    });

    it('creates matching profile in Users database with active: true and matching $id', async () => {
      const authUser = {
        $id: 'auth_user_999',
        email: 'existing_admin@village.local',
        name: 'Existing Admin',
      };

      const result = await syncExistingAdminToDatabase({
        authUser,
        teamsService: mockTeamsService,
        tables: mockTables,
        config,
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe('auth_user_999');

      expect(mockTables.createRow).toHaveBeenCalledWith({
        databaseId: 'villageDB',
        tableId: 'users',
        rowId: 'auth_user_999',
        data: {
          email: 'existing_admin@village.local',
          name: 'Existing Admin',
          role_ids: ['role_sys_admin_1'],
          active: true,
        },
      });

      expect(mockTeamsService.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          teamId: 'village_administrators',
          userId: 'auth_user_999',
        })
      );
    });
  });
});
