import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useErrorHandler } from 'src/composables/useErrorHandler';

// Notify is globally mocked in test/setup.js to call vi.fn(). We grab the
// mock via the quasar mock module by importing it lazily.
let notifyCreate;
beforeEach(async () => {
  const quasar = await import('quasar');
  notifyCreate = quasar.Notify.create;
  notifyCreate.mockClear();
});

describe('useErrorHandler', () => {
  it('notifyError creates a negative Notify at bottom', () => {
    const { notifyError } = useErrorHandler();
    notifyError('boom');
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'negative', message: 'boom', position: 'bottom' }),
    );
  });

  it('notifyError merges extra options', () => {
    const { notifyError } = useErrorHandler();
    notifyError('boom', { timeout: 5000 });
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'negative', message: 'boom', timeout: 5000 }),
    );
  });

  it('notifySuccess creates a positive Notify', () => {
    const { notifySuccess } = useErrorHandler();
    notifySuccess('yay');
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'positive', message: 'yay' }),
    );
  });

  it('handleError uses err.message and notifies', () => {
    const { handleError } = useErrorHandler();
    handleError(new Error('oops'));
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'negative', message: 'oops' }),
    );
  });

  it('handleError uses fallback message when err has no message', () => {
    const { handleError } = useErrorHandler();
    handleError(null, 'fallback');
    expect(notifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'fallback' }),
    );
  });

  describe('validateForm', () => {
    it('returns invalid for non-object input', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm(null, {});
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain('Invalid form submission.');
    });

    it('passes when no rules and valid object', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ a: 1 }, {});
      expect(r.isValid).toBe(true);
      expect(r.errors).toEqual([]);
    });

    it('reports required field missing (string)', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ name: '' }, { name: { required: true } });
      expect(r.isValid).toBe(false);
      expect(r.errors[0]).toMatch(/Name is required/i);
    });

    it('reports required field missing (empty array)', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ tags: [] }, { tags: { required: true } });
      expect(r.isValid).toBe(false);
      expect(r.errors[0]).toMatch(/Tags is required/i);
    });

    it('reports required field missing (null)', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ x: null }, { x: { required: true } });
      expect(r.isValid).toBe(false);
    });

    it('passes required when value present', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ name: 'abc' }, { name: { required: true } });
      expect(r.isValid).toBe(true);
    });

    it('enforces minLength', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ name: 'ab' }, { name: { required: true, minLength: 3 } });
      expect(r.isValid).toBe(false);
      expect(r.errors[0]).toMatch(/at least 3/);
    });

    it('enforces maxLength', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm({ name: 'abcd' }, { name: { maxLength: 3 } });
      expect(r.isValid).toBe(false);
      expect(r.errors[0]).toMatch(/at most 3/);
    });

    it('enforces pattern with custom message', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm(
        { email: 'not-email' },
        { email: { pattern: /@/, patternMessage: 'Bad email' } },
      );
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain('Bad email');
    });

    it('enforces custom validator returning false', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm(
        { x: 'abc' },
        { x: { validator: () => false } },
      );
      expect(r.isValid).toBe(false);
      expect(r.errors[0]).toMatch(/X is invalid/i);
    });

    it('enforces custom validator returning a string', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm(
        { x: 'abc' },
        { x: { validator: () => 'custom failure' } },
      );
      expect(r.isValid).toBe(false);
      expect(r.errors).toContain('custom failure');
    });

    it('skips length/pattern checks when value is empty (not required)', () => {
      const { validateForm } = useErrorHandler();
      const r = validateForm(
        { name: '' },
        { name: { minLength: 5, maxLength: 1, pattern: /x/ } },
      );
      expect(r.isValid).toBe(true);
    });

    it('formatFieldLabel humanizes snake_case', () => {
      // Indirectly via required error message
      const { validateForm } = useErrorHandler();
      const r = validateForm({ first_name: '' }, { first_name: { required: true } });
      expect(r.errors[0]).toMatch(/First Name is required/i);
    });
  });
});
