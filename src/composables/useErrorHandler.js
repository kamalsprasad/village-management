import { Notify } from 'quasar';

const DEFAULT_POSITION = 'bottom';

export function useErrorHandler() {
  const notifyError = (message, options = {}) => {
    Notify.create({
      type: 'negative',
      message,
      position: DEFAULT_POSITION,
      ...options,
    });
  };

  const notifySuccess = (message, options = {}) => {
    Notify.create({
      type: 'positive',
      message,
      position: DEFAULT_POSITION,
      ...options,
    });
  };

  const handleError = (err, fallbackMessage = 'An unexpected error occurred.') => {
    const message = err?.message || fallbackMessage;
    notifyError(message);
  };

  const formatFieldLabel = (field) =>
    field
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1));

  const validateForm = (values = {}, rules = {}) => {
    const errors = [];

    if (values === null || typeof values !== 'object') {
      errors.push('Invalid form submission.');
      return { isValid: false, errors };
    }

    Object.entries(rules).forEach(([field, fieldRules]) => {
      const value = values[field];
      const label = formatFieldLabel(field);

      if (fieldRules?.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
          errors.push(`${label} is required.`);
          return;
        }
      }

      if (value !== undefined && value !== null && value !== '') {
        const length = String(value).length;

        if (fieldRules?.minLength && length < fieldRules.minLength) {
          errors.push(`${label} must be at least ${fieldRules.minLength} characters.`);
        }

        if (fieldRules?.maxLength && length > fieldRules.maxLength) {
          errors.push(`${label} must be at most ${fieldRules.maxLength} characters.`);
        }

        if (fieldRules?.pattern && !fieldRules.pattern.test(String(value))) {
          errors.push(fieldRules.patternMessage || `${label} is invalid.`);
        }

        if (typeof fieldRules?.validator === 'function') {
          const result = fieldRules.validator(value, values);
          if (result === false) {
            errors.push(`${label} is invalid.`);
          } else if (typeof result === 'string') {
            errors.push(result);
          }
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  return {
    notifyError,
    notifySuccess,
    handleError,
    validateForm,
  };
}
