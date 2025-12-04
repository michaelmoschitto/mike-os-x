import {
  EnvelopeIcon,
  AlertIcon,
  InfoIcon,
  ErrorIcon,
  SuccessIcon,
} from '@/components/system/NotificationIcons';
import {
  useNotificationStore,
  type NotificationButton,
  type NotificationField,
} from '@/stores/useNotificationStore';

export const showMessageNotification = (
  fields: NotificationField[],
  options?: {
    primaryButton?: NotificationButton;
    secondaryButton?: NotificationButton;
    autoDismiss?: number;
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: 'message',
    title: 'New Message',
    icon: <EnvelopeIcon />,
    fields,
    primaryButton: options?.primaryButton || {
      label: 'Open',
      action: () => {},
    },
    secondaryButton: options?.secondaryButton || {
      label: 'Dismiss',
      action: () => {},
    },
    autoDismiss: options?.autoDismiss ?? 0,
  });
};

export const showAlertNotification = (
  message: string,
  options?: {
    primaryButton?: NotificationButton;
    secondaryButton?: NotificationButton;
    autoDismiss?: number;
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: 'alert',
    title: 'Alert',
    icon: <AlertIcon />,
    fields: [{ label: 'Message', value: message }],
    primaryButton: options?.primaryButton || {
      label: 'OK',
      action: () => {},
    },
    secondaryButton: options?.secondaryButton,
    autoDismiss: options?.autoDismiss ?? 0,
  });
};

export const showInfoNotification = (
  message: string,
  options?: {
    primaryButton?: NotificationButton;
    autoDismiss?: number;
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: 'info',
    title: 'Information',
    icon: <InfoIcon />,
    fields: [{ label: 'Message', value: message }],
    primaryButton: options?.primaryButton || {
      label: 'OK',
      action: () => {},
    },
    autoDismiss: options?.autoDismiss ?? 5000,
  });
};

export const showErrorNotification = (
  message: string,
  options?: {
    primaryButton?: NotificationButton;
    autoDismiss?: number;
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: 'error',
    title: 'Error',
    icon: <ErrorIcon />,
    fields: [{ label: 'Message', value: message }],
    primaryButton: options?.primaryButton || {
      label: 'OK',
      action: () => {},
    },
    autoDismiss: options?.autoDismiss ?? 0,
  });
};

export const showSuccessNotification = (
  message: string,
  options?: {
    primaryButton?: NotificationButton;
    autoDismiss?: number;
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: 'success',
    title: 'Success',
    icon: <SuccessIcon />,
    fields: [{ label: 'Message', value: message }],
    primaryButton: options?.primaryButton || {
      label: 'OK',
      action: () => {},
    },
    autoDismiss: options?.autoDismiss ?? 3000,
  });
};

export const showCompactNotification = (
  title: string,
  message: string,
  options?: {
    icon?: React.ReactNode;
    autoDismiss?: number;
    timestamp?: string;
    type?: 'info' | 'success';
  }
) => {
  const store = useNotificationStore.getState();
  store.showNotification({
    type: options?.type || 'info',
    title,
    message,
    icon: options?.icon,
    variant: 'compact',
    autoDismiss: options?.autoDismiss ?? 3000,
    timestamp: options?.timestamp,
  });
};
