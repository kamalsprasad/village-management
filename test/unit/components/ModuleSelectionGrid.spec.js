import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ModuleSelectionGrid from 'src/components/admin/ModuleSelectionGrid.vue';
import { MODULES } from 'src/utils/module-registry';

describe('ModuleSelectionGrid.vue', () => {
  function mountGrid(props = {}) {
    return mount(ModuleSelectionGrid, {
      props: {
        modelValue: ['residents', 'households', 'farm'],
        ...props,
      },
    });
  }

  it('renders all registered modules', () => {
    const wrapper = mountGrid();
    expect(wrapper.exists()).toBe(true);
    const cards = wrapper.findAll('.module-card');
    expect(cards.length).toBe(MODULES.length);
  });

  it('renders Always On chip for core modules', () => {
    const wrapper = mountGrid();
    const text = wrapper.text();
    expect(text).toContain('Always On');
  });

  it('emits update:modelValue when toggling an optional module', async () => {
    const wrapper = mountGrid({ modelValue: ['residents', 'households'] });
    wrapper.vm.toggle('farm', true);
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).toContain('farm');

    wrapper.vm.toggle('residents', false);
    expect(wrapper.emitted('update:modelValue')[1][0]).not.toContain('residents');
  });

  it('shows warnings when a required dependency is disabled', () => {
    const wrapper = mountGrid({
      modelValue: ['finance'],
      showWarnings: true,
    });
    // inventory is required by finance
    const warning = wrapper.vm.getWarning({ key: 'inventory', requiredBy: ['finance'] });
    expect(warning).toContain('Used by:');
  });

  it('hides warnings when module is selected or showWarnings is false', () => {
    const wrapper = mountGrid({
      modelValue: ['farm'],
      showWarnings: false,
    });
    expect(wrapper.vm.getWarning({ key: 'farm', requiredBy: [] })).toBeNull();
  });
});
