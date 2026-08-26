import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import PlantingCostDialog from 'src/modules/farm/components/PlantingCostDialog.vue';

const planting = {
  $id: 'plant-1',
  planting_date: '2026-08-01T12:00:00.000Z',
  crop_name: 'Maize',
  status: 'growing',
};

const quasarStub = defineComponent({
  inheritAttrs: false,
  setup(_, { slots }) {
    return () => h('div', slots.default?.());
  },
});

const quasarStubs = Object.fromEntries(
  [
    'q-dialog',
    'q-card',
    'q-card-section',
    'q-space',
    'q-btn',
    'q-separator',
    'q-form',
    'q-select',
    'q-input',
    'q-checkbox',
    'q-banner',
    'q-icon',
    'q-card-actions',
    'q-avatar',
  ].map((name) => [name, quasarStub]),
);

function mountDialog(props = {}) {
  return mount(PlantingCostDialog, {
    props: {
      modelValue: true,
      planting,
      ...props,
    },
    global: {
      stubs: quasarStubs,
      directives: { ClosePopup: () => {} },
    },
  });
}

describe('PlantingCostDialog', () => {
  it('requires confirmation before emitting the submit payload', async () => {
    const wrapper = mountDialog();
    Object.assign(wrapper.vm.formData, {
      category: 'labor',
      date: '2026-08-20',
      description: 'Weeding crew',
      amount: 125,
    });

    await wrapper.vm.onSubmit();

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.vm.confirmationOpen).toBe(true);
    expect(wrapper.text()).toContain('labor');
    expect(wrapper.text()).toContain('125.00');

    wrapper.vm.confirmSubmit();

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      category: 'labor',
      amount: 125,
      description: 'Weeding crew',
      createFinance: false,
    });
  });

  it('prevents duplicate confirmation submissions and resets after a failed parent operation', async () => {
    const wrapper = mountDialog();
    Object.assign(wrapper.vm.formData, {
      category: 'labor',
      date: '2026-08-20',
      description: 'Weeding crew',
      amount: 125,
    });
    await wrapper.vm.onSubmit();

    wrapper.vm.confirmSubmit();
    wrapper.vm.confirmSubmit();

    expect(wrapper.emitted('submit')).toHaveLength(1);
    expect(wrapper.vm.confirmationOpen).toBe(true);
    expect(wrapper.vm.confirmationSubmitting).toBe(true);

    await wrapper.setProps({ loading: true });
    await wrapper.setProps({ loading: false });

    expect(wrapper.vm.confirmationSubmitting).toBe(false);
    wrapper.vm.confirmSubmit();
    expect(wrapper.emitted('submit')).toHaveLength(2);
  });

  it('rejects zero inventory quantity when an item is selected', async () => {
    const wrapper = mountDialog({
      inventoryItems: [{ $id: 'inv-1', item_name: 'Seed', unit: 'kg', unit_cost: 10 }],
    });
    Object.assign(wrapper.vm.formData, {
      category: 'inputs',
      date: '2026-08-20',
      description: 'Seed',
      amount: 10,
      inventoryItemId: 'inv-1',
      inventoryQuantity: 0,
    });

    await wrapper.vm.onSubmit();

    expect(wrapper.emitted('submit')).toBeUndefined();
    expect(wrapper.vm.confirmationOpen).toBe(false);
  });

  it('hides Finance controls and strips Finance payload without permission', async () => {
    const wrapper = mountDialog({ canUseFinance: false });
    expect(wrapper.text()).not.toContain('Create linked Finance expense');

    Object.assign(wrapper.vm.formData, {
      category: 'other',
      date: '2026-08-20',
      description: 'Transport',
      amount: 40,
      createFinance: true,
      financeCategoryId: 'finance-cat-1',
      fundingSourceId: 'fund-1',
      paymentMethod: 'Cash',
    });
    await wrapper.vm.onSubmit();
    wrapper.vm.confirmSubmit();

    expect(wrapper.emitted('submit')[0][0]).toMatchObject({
      createFinance: false,
      financeCategoryId: null,
      fundingSourceId: null,
      paymentMethod: null,
    });
  });

  it('preserves linked Finance fields during edit and prevents unlinking in the UI', async () => {
    const wrapper = mountDialog({
      canUseFinance: true,
      entry: {
        $id: 'cost-1',
        category: 'inputs',
        amount: 75,
        cost_date: '2026-08-15T12:00:00.000Z',
        description: 'Seed',
        finance_transaction_id: 'tx-1',
      },
      financeTransaction: {
        $id: 'tx-1',
        category_id: 'finance-cat-1',
        funding_source_id: 'fund-1',
        payment_method: 'Mobile Money',
      },
      financeCategories: [{ $id: 'finance-cat-1', name: 'Farm Inputs', type: 'expense' }],
      fundingSources: [{ $id: 'fund-1', name: 'Operating Fund', status: 'active' }],
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.vm.formData.createFinance).toBe(true);
    expect(wrapper.vm.formData.financeCategoryId).toBe('finance-cat-1');
    expect(wrapper.vm.formData.fundingSourceId).toBe('fund-1');
    expect(wrapper.vm.formData.paymentMethod).toBe('Mobile Money');
    expect(wrapper.text()).toContain('cannot be unlinked');
  });
});
