import { Notify } from 'quasar';

const DEFAULT_POSITION = 'top';

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

  return {
    notifyError,
    notifySuccess,
    handleError,
  };
}
