import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import PermissionGuard from 'src/components/PermissionGuard.vue';
import { ADMIN_ROLE, FINANCE_MANAGER_ROLE, RESIDENT_ROLE, makeUser } from 'test/helpers/fixtures';

describe('PermissionGuard.vue', () => {
  let authStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    authStore = useAuthStore();
  });

  function setAuth(user, roles) {
    authStore.user = user;
    authStore.userRoles = roles;
    authStore.isLoggedIn = !!user;
  }

  function mountGuard(props = {}, slotContent = '<div data-test="content">visible</div>') {
    return mount(PermissionGuard, {
      props,
      slots: { default: slotContent },
    });
  }

  describe('permission prop (single permission)', () => {
    it('renders slot when user has the permission', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const wrapper = mountGuard({ permission: 'finance:read' });
      expect(wrapper.html()).toContain('visible');
    });

    it('does not render slot when user lacks the permission', () => {
      setAuth(makeUser(), [RESIDENT_ROLE]);
      const wrapper = mountGuard({ permission: 'finance:write' });
      expect(wrapper.html()).not.toContain('visible');
    });

    it('admin wildcard renders slot for any permission', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const wrapper = mountGuard({ permission: 'anything:anything' });
      expect(wrapper.html()).toContain('visible');
    });
  });

  describe('anyOf prop (any of multiple permissions)', () => {
    it('renders when user has at least one', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const wrapper = mountGuard({ anyOf: ['finance:read', 'farm:write'] });
      expect(wrapper.html()).toContain('visible');
    });

    it('does not render when user has none', () => {
      setAuth(makeUser(), [RESIDENT_ROLE]);
      const wrapper = mountGuard({ anyOf: ['finance:read', 'farm:write'] });
      expect(wrapper.html()).not.toContain('visible');
    });

    it('does not render when anyOf is empty array', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const wrapper = mountGuard({ anyOf: [] });
      expect(wrapper.html()).not.toContain('visible');
    });
  });

  describe('allOf prop (all permissions required)', () => {
    it('renders when user has all', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const wrapper = mountGuard({ allOf: ['finance:read', 'finance:write'] });
      expect(wrapper.html()).toContain('visible');
    });

    it('does not render when user is missing one', () => {
      setAuth(makeUser(), [FINANCE_MANAGER_ROLE]);
      const wrapper = mountGuard({ allOf: ['finance:read', 'farm:write'] });
      expect(wrapper.html()).not.toContain('visible');
    });

    it('admin wildcard renders for allOf', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const wrapper = mountGuard({ allOf: ['a:b', 'c:d', 'e:f'] });
      expect(wrapper.html()).toContain('visible');
    });
  });

  describe('no props (deny by default)', () => {
    it('does not render slot when no permission props provided', () => {
      setAuth(makeUser(), [ADMIN_ROLE]);
      const wrapper = mountGuard({});
      expect(wrapper.html()).not.toContain('visible');
    });
  });

  describe('no user (not logged in)', () => {
    it('does not render slot', () => {
      setAuth(null, []);
      const wrapper = mountGuard({ permission: 'finance:read' });
      expect(wrapper.html()).not.toContain('visible');
    });
  });
});
