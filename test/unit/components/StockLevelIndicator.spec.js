import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StockLevelIndicator from 'src/components/inventory/StockLevelIndicator.vue';

const stubs = {
  'q-circular-progress': {
    template:
      '<div class="q-circular-progress" :data-color="color" :data-value="value" :data-track-color="trackColor"><slot /></div>',
    props: [
      'value',
      'min',
      'max',
      'color',
      'trackColor',
      'size',
      'thickness',
      'showValue',
      'rounded',
    ],
  },
  'q-icon': {
    template: '<i class="q-icon" :data-name="name" :data-color="color" :data-size="size" />',
    props: ['name', 'color', 'size'],
  },
};

function mountIndicator(props = {}) {
  return mount(StockLevelIndicator, {
    props,
    global: { stubs },
  });
}

describe('StockLevelIndicator.vue', () => {
  it('renders without crashing', () => {
    const wrapper = mountIndicator({ quantity: 50, reorderThreshold: 10 });
    expect(wrapper.exists()).toBe(true);
  });

  it('shows negative color when quantity is 0', () => {
    const wrapper = mountIndicator({ quantity: 0, reorderThreshold: 10 });
    expect(wrapper.find('.q-circular-progress').attributes('data-color')).toBe('negative');
  });

  it('shows warning color when quantity <= reorderThreshold', () => {
    const wrapper = mountIndicator({ quantity: 5, reorderThreshold: 10 });
    expect(wrapper.find('.q-circular-progress').attributes('data-color')).toBe('warning');
  });

  it('shows positive color when quantity > reorderThreshold', () => {
    const wrapper = mountIndicator({ quantity: 50, reorderThreshold: 10 });
    expect(wrapper.find('.q-circular-progress').attributes('data-color')).toBe('positive');
  });

  it('computes progress value as percentage of 2x threshold', () => {
    const wrapper = mountIndicator({ quantity: 10, reorderThreshold: 10 });
    // target = 20, quantity = 10, so 50%
    expect(wrapper.find('.q-circular-progress').attributes('data-value')).toBe('50');
  });

  it('caps progress at 100', () => {
    const wrapper = mountIndicator({ quantity: 100, reorderThreshold: 10 });
    expect(wrapper.find('.q-circular-progress').attributes('data-value')).toBe('100');
  });

  it('returns 0 progress when threshold is 0', () => {
    const wrapper = mountIndicator({ quantity: 10, reorderThreshold: 0 });
    expect(wrapper.find('.q-circular-progress').attributes('data-value')).toBe('0');
  });

  it('shows error icon when out of stock', () => {
    const wrapper = mountIndicator({ quantity: 0, reorderThreshold: 10 });
    expect(wrapper.find('.q-icon').attributes('data-name')).toBe('error');
  });

  it('shows warning icon when low stock', () => {
    const wrapper = mountIndicator({ quantity: 5, reorderThreshold: 10 });
    expect(wrapper.find('.q-icon').attributes('data-name')).toBe('warning');
  });

  it('shows check_circle icon when in stock', () => {
    const wrapper = mountIndicator({ quantity: 50, reorderThreshold: 10 });
    expect(wrapper.find('.q-icon').attributes('data-name')).toBe('check_circle');
  });

  it('computes icon size as 30% of indicator size', () => {
    const wrapper = mountIndicator({ quantity: 50, reorderThreshold: 10, size: '100px' });
    expect(wrapper.find('.q-icon').attributes('data-size')).toBe('30px');
  });

  it('defaults icon size to 24px for non-numeric size', () => {
    const wrapper = mountIndicator({ quantity: 50, reorderThreshold: 10, size: 'large' });
    expect(wrapper.find('.q-icon').attributes('data-size')).toBe('24px');
  });
});
