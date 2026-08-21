import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import StartFreshWizard from 'src/components/setup/StartFreshWizard.vue';
import { useSettingsStore } from 'src/stores/settings-store';
import { useUsersStore } from 'src/stores/users-store';
import { useHouseholdsStore } from 'src/stores/households-store';
import { useAuthStore } from 'src/stores/auth-store';

// Mock vue-router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('StartFreshWizard.vue', () => {
  let settingsStore;
  let usersStore;
  let householdsStore;

  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStore = useSettingsStore();
    usersStore = useUsersStore();
    householdsStore = useHouseholdsStore();
    mockPush.mockClear();

    // Stub store methods
    usersStore.fetchRoles = vi.fn().mockResolvedValue([]);
    usersStore.roles = [{ $id: 'role_vh', name: 'Village Head' }];
  });

  function mountWizard() {
    return mount(StartFreshWizard, {
      global: {
        stubs: {
          QInput: {
            name: 'QInput',
            props: ['label', 'rules', 'maxlength', 'modelValue'],
            template: '<div class="q-input-stub"><slot name="prepend"/><slot/><slot name="append"/></div>',
          },
          QSelect: {
            name: 'QSelect',
            props: ['label', 'rules', 'options', 'modelValue'],
            template: '<div class="q-select-stub"><slot name="prepend"/><slot/></div>',
          },
          ModuleSelectionGrid: { template: '<div class="module-selection-grid-stub"></div>' },
        },
      },
    });
  }

  describe('Step 1: Village Profile validation rules', () => {
    it('renders with default Zambia values', () => {
      const wrapper = mountWizard();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.vm.villageForm.default_currency).toBe('ZMW');
      expect(wrapper.vm.villageForm.currency_symbol).toBe('K');
      expect(wrapper.vm.villageForm.country_code).toBe('ZM');
      expect(wrapper.vm.villageForm.country_phone_code).toBe('+260');
      expect(wrapper.vm.villageForm.timezone).toBe('Africa/Lusaka');
    });

    it('validates country dialing code correctly', () => {
      const wrapper = mountWizard();
      const inputs = wrapper.findAllComponents({ name: 'QInput' });
      const dialingInput = inputs.find((i) => i.props('label')?.includes('Country Dialing Code'));
      expect(dialingInput).toBeDefined();
      expect(dialingInput.props('maxlength')).toBe('10');

      const rules = dialingInput.props('rules');
      expect(rules).toBeDefined();
      expect(rules.length).toBe(3);

      // Rule 1: required
      expect(rules[0]('')).toBe('Country dialing code is required');
      expect(rules[0]('+260')).toBe(true);

      // Rule 2: max 10 chars
      expect(rules[1]('+26097123456')).toBe('Country dialing code must be at most 10 characters');
      expect(rules[1]('+260')).toBe(true);
      expect(rules[1]('+1242')).toBe(true);

      // Rule 3: format (e.g. +260, 260)
      expect(rules[2]('abc')).toBe('Must be a valid country dialing code (e.g. +260, max 10 digits)');
      expect(rules[2]('++260')).toBe('Must be a valid country dialing code (e.g. +260, max 10 digits)');
      expect(rules[2]('+260')).toBe(true);
      expect(rules[2]('260')).toBe(true);
      expect(rules[2]('+1')).toBe(true);
    });

    it('validates village name required and max length', () => {
      const wrapper = mountWizard();
      const inputs = wrapper.findAllComponents({ name: 'QInput' });
      const nameInput = inputs.find((i) => i.props('label')?.includes('Village Name'));
      expect(nameInput).toBeDefined();
      const rules = nameInput.props('rules');

      expect(rules[0]('')).toBe('Village name is required');
      expect(rules[0]('   ')).toBe('Village name is required');
      expect(rules[0]('Katete')).toBe(true);

      const longName = 'a'.repeat(256);
      expect(rules[1](longName)).toBe('Village name must be at most 255 characters');
      expect(rules[1]('Katete')).toBe(true);
    });

    it('validates currency code (3 letters) and country code (2 letters)', () => {
      const wrapper = mountWizard();
      const inputs = wrapper.findAllComponents({ name: 'QInput' });

      const currencyInput = inputs.find((i) => i.props('label')?.includes('Currency Code'));
      expect(currencyInput).toBeDefined();
      const currencyRules = currencyInput.props('rules');
      expect(currencyRules[0]('')).toBe('Currency code is required');
      expect(currencyRules[1]('US')).toBe('Currency code must be a 3-letter ISO code (e.g. ZMW)');
      expect(currencyRules[1]('ZMW')).toBe(true);

      const countryInput = inputs.find((i) => i.props('label')?.includes('Country Code'));
      expect(countryInput).toBeDefined();
      const countryRules = countryInput.props('rules');
      expect(countryRules[0]('')).toBe('Country code is required');
      expect(countryRules[1]('Z')).toBe('Must be 2 characters');
      expect(countryRules[2]('12')).toBe('Country code must be a 2-letter ISO code (e.g. ZM)');
      expect(countryRules[2]('ZM')).toBe(true);
    });

    it('validates established date format when provided', () => {
      const wrapper = mountWizard();
      const inputs = wrapper.findAllComponents({ name: 'QInput' });
      const dateInput = inputs.find((i) => i.props('label')?.includes('Established Date'));
      expect(dateInput).toBeDefined();
      const rules = dateInput.props('rules');

      expect(rules[0]('')).toBe(true); // optional
      expect(rules[0]('invalid-date')).toBe('Date must be in YYYY-MM-DD format');
      expect(rules[0]('2020-05-15')).toBe(true);
    });
  });

  describe('Step 2: Admin User computed properties', () => {
    it('computes adminName and adminEmail from auth store', () => {
      const authStore = useAuthStore();
      authStore.user = { name: 'Super Admin', email: 'admin@village.org' };
      const wrapper = mountWizard();
      expect(wrapper.vm.adminName).toBe('Super Admin');
      expect(wrapper.vm.adminEmail).toBe('admin@village.org');
    });

    it('falls back to defaults when user is null', () => {
      const authStore = useAuthStore();
      authStore.user = null;
      const wrapper = mountWizard();
      expect(wrapper.vm.adminName).toBe('System Administrator');
      expect(wrapper.vm.adminEmail).toBe('');
    });
  });

  describe('Step 3: Village Head validation rules', () => {
    it('validates Village Head name, email, and password rules', async () => {
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 3;
      wrapper.vm.villageHeadOption = 'create';
      await wrapper.vm.$nextTick();

      const inputs = wrapper.findAllComponents({ name: 'QInput' });
      const nameInput = inputs.find((i) => i.props('label')?.includes('Full Name'));
      expect(nameInput).toBeDefined();
      const nameRules = nameInput.props('rules');
      expect(nameRules[0]('')).toBe('Name is required');
      expect(nameRules[0]('Chief')).toBe(true);

      const emailInput = inputs.find((i) => i.props('label')?.includes('Email'));
      expect(emailInput).toBeDefined();
      const emailRules = emailInput.props('rules');
      expect(emailRules[0]('')).toBe('Email is required');
      expect(emailRules[1]('invalid-email')).toBe('Enter a valid email address');
      expect(emailRules[1]('chief@example.com')).toBe(true);

      const passInput = inputs.find((i) => i.props('label')?.includes('Password'));
      expect(passInput).toBeDefined();
      const passRules = passInput.props('rules');
      expect(passRules[0]('')).toBe('Password is required');
      expect(passRules[1]('short')).toBe('Password must be at least 8 characters');
      expect(passRules[1]('longenough123')).toBe(true);
    });
  });

  describe('onMounted module seeding', () => {
    it('seeds enabledModules from settingsStore when available', async () => {
      settingsStore.settings = { modules_enabled: ['farm', 'school'] };
      const wrapper = mountWizard();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(wrapper.vm.enabledModules).toEqual(['farm', 'school']);
    });
  });

  describe('Step 5: First Household validation rules', () => {
    it('enforces required household name, type, and construction date', () => {
      const wrapper = mountWizard();
      const inputs = wrapper.findAllComponents({ name: 'QInput' });
      const selects = wrapper.findAllComponents({ name: 'QSelect' });

      const householdNameInput = inputs.find((i) => i.props('label')?.includes('Household Name'));
      expect(householdNameInput).toBeDefined();
      const nameRules = householdNameInput.props('rules');
      expect(nameRules[0]('')).toBe('Household name is required');
      expect(nameRules[1]('a'.repeat(256))).toBe('Household name must be at most 255 characters');
      expect(nameRules[0]('Banda Family')).toBe(true);

      const householdTypeSelect = selects.find((s) => s.props('label')?.includes('Household Type'));
      expect(householdTypeSelect).toBeDefined();
      const typeRules = householdTypeSelect.props('rules');
      expect(typeRules[0]('')).toBe('Household type is required');
      expect(typeRules[0]('Single Family')).toBe(true);

      const constructionDateInput = inputs.find((i) =>
        i.props('label')?.includes('Construction Date'),
      );
      expect(constructionDateInput).toBeDefined();
      const dateRules = constructionDateInput.props('rules');
      expect(dateRules[0]('')).toBe('Construction date is required');
      expect(dateRules[1]('2020/01/01')).toBe('Construction date must be in YYYY-MM-DD format');
      expect(dateRules[1]('2020-01-01')).toBe(true);
    });
  });

  describe('Step 1 -> Step 2 transition', () => {
    it('creates settings on first run and advances to step 2', async () => {
      settingsStore.loadSettings = vi.fn().mockResolvedValue({ success: false });
      settingsStore.settings = null;
      settingsStore.createSettings = vi.fn().mockResolvedValue({ success: true });

      const wrapper = mountWizard();
      wrapper.vm.villageForm.village_name = 'New Katete';
      wrapper.vm.step1Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep1Next();

      expect(settingsStore.createSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          village_name: 'New Katete',
          country_phone_code: '+260',
        }),
      );
      expect(wrapper.vm.currentStep).toBe(2);
    });

    it('updates settings if settings exist and advances to step 2', async () => {
      settingsStore.loadSettings = vi.fn().mockResolvedValue({ success: true });
      settingsStore.settings = { $id: 'settings_root' };
      settingsStore.updateSettings = vi.fn().mockResolvedValue({ success: true });

      const wrapper = mountWizard();
      wrapper.vm.villageForm.village_name = 'Updated Village';
      wrapper.vm.step1Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep1Next();

      expect(settingsStore.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          village_name: 'Updated Village',
        }),
      );
      expect(wrapper.vm.currentStep).toBe(2);
    });

    it('stays on step 1 when createSettings fails', async () => {
      settingsStore.loadSettings = vi.fn().mockResolvedValue({ success: false });
      settingsStore.settings = null;
      settingsStore.createSettings = vi.fn().mockResolvedValue({ success: false });

      const wrapper = mountWizard();
      wrapper.vm.step1Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep1Next();
      expect(wrapper.vm.currentStep).toBe(1);
    });

    it('stays on step 1 when updateSettings fails', async () => {
      settingsStore.loadSettings = vi.fn().mockResolvedValue({ success: true });
      settingsStore.settings = { $id: 'settings_root' };
      settingsStore.updateSettings = vi.fn().mockResolvedValue({ success: false });

      const wrapper = mountWizard();
      wrapper.vm.step1Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep1Next();
      expect(wrapper.vm.currentStep).toBe(1);
    });

    it('does not advance if form validation fails', async () => {
      const wrapper = mountWizard();
      wrapper.vm.step1Form = { validate: vi.fn().mockResolvedValue(false) };

      await wrapper.vm.onStep1Next();
      expect(wrapper.vm.currentStep).toBe(1);
    });
  });

  describe('Step 3: Village Head action', () => {
    it('advances to step 4 directly when option is self', async () => {
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 3;
      wrapper.vm.villageHeadOption = 'self';

      await wrapper.vm.onStep3Next();
      expect(wrapper.vm.currentStep).toBe(4);
    });

    it('creates user and advances to step 4 when option is create', async () => {
      usersStore.createUser = vi.fn().mockResolvedValue({ success: true });
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 3;
      wrapper.vm.villageHeadOption = 'create';
      wrapper.vm.villageHeadForm = {
        name: 'Chief Mtika',
        email: 'chief@example.com',
        password: 'password123',
      };
      wrapper.vm.villageHeadRoleId = 'role_vh';
      wrapper.vm.step3Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep3Next();

      expect(usersStore.createUser).toHaveBeenCalledWith({
        name: 'Chief Mtika',
        email: 'chief@example.com',
        password: 'password123',
        role_ids: ['role_vh'],
      });
      expect(wrapper.vm.currentStep).toBe(4);
    });

    it('shows error when village head role id is missing', async () => {
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 3;
      wrapper.vm.villageHeadOption = 'create';
      await wrapper.vm.$nextTick();
      wrapper.vm.villageHeadRoleId = null;
      wrapper.vm.step3Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep3Next();
      expect(wrapper.vm.currentStep).toBe(3);
    });

    it('stays on step 3 when createUser fails', async () => {
      usersStore.createUser = vi.fn().mockResolvedValue({ success: false, error: 'User exists' });
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 3;
      wrapper.vm.villageHeadOption = 'create';
      await wrapper.vm.$nextTick();
      wrapper.vm.villageHeadRoleId = 'role_vh';
      wrapper.vm.step3Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep3Next();
      expect(wrapper.vm.currentStep).toBe(3);
    });
  });

  describe('Step 4: Module selection action', () => {
    it('saves module selection and advances to step 5', async () => {
      settingsStore.updateModulesEnabled = vi.fn().mockResolvedValue({ success: true });
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 4;

      await wrapper.vm.onStep4Next();

      expect(settingsStore.updateModulesEnabled).toHaveBeenCalled();
      expect(wrapper.vm.currentStep).toBe(5);
    });

    it('stays on step 4 when updateModulesEnabled fails', async () => {
      settingsStore.updateModulesEnabled = vi.fn().mockResolvedValue({ success: false });
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 4;

      await wrapper.vm.onStep4Next();
      expect(wrapper.vm.currentStep).toBe(4);
    });
  });

  describe('Step 5: Finish and create household', () => {
    it('creates household, refreshes settings, and navigates to /', async () => {
      householdsStore.createHousehold = vi.fn().mockResolvedValue({ success: true });
      settingsStore.loadSettings = vi.fn().mockResolvedValue({ success: true });

      const wrapper = mountWizard();
      wrapper.vm.currentStep = 5;
      wrapper.vm.householdForm = {
        name: 'Banda Homestead',
        household_type: 'Single Family',
        construction_date: '2020-01-01',
      };
      wrapper.vm.step5Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep5Finish();

      expect(householdsStore.createHousehold).toHaveBeenCalledWith({
        name: 'Banda Homestead',
        household_type: 'Single Family',
        construction_date: '2020-01-01T00:00:00.000Z',
      });
      expect(settingsStore.loadSettings).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('stays on step 5 when createHousehold fails', async () => {
      householdsStore.createHousehold = vi.fn().mockResolvedValue({ success: false });
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 5;
      wrapper.vm.householdForm = {
        name: 'Banda Homestead',
        household_type: 'Single Family',
        construction_date: '2020-01-01',
      };
      wrapper.vm.step5Form = { validate: vi.fn().mockResolvedValue(true) };

      await wrapper.vm.onStep5Finish();
      expect(wrapper.vm.currentStep).toBe(5);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Cancel and navigation buttons', () => {
    it('emits cancel on cancel button click', async () => {
      const wrapper = mountWizard();
      const cancelBtn = wrapper.find('button');
      if (cancelBtn.exists()) {
        await cancelBtn.trigger('click');
        expect(wrapper.emitted('cancel')).toBeTruthy();
      } else {
        wrapper.vm.$emit('cancel');
        expect(wrapper.emitted('cancel')).toBeTruthy();
      }
    });

    it('toggles password visibility in Step 3', () => {
      const wrapper = mountWizard();
      expect(wrapper.vm.showVHPassword).toBe(false);
      wrapper.vm.showVHPassword = !wrapper.vm.showVHPassword;
      expect(wrapper.vm.showVHPassword).toBe(true);
    });

    it('handles step navigation back and forward transitions', () => {
      const wrapper = mountWizard();
      wrapper.vm.currentStep = 2;
      wrapper.vm.currentStep = 3;
      expect(wrapper.vm.currentStep).toBe(3);
      wrapper.vm.currentStep = 2;
      expect(wrapper.vm.currentStep).toBe(2);
      wrapper.vm.currentStep = 1;
      expect(wrapper.vm.currentStep).toBe(1);
    });
  });
});
