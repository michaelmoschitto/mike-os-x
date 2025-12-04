import {
  useNotificationStore,
  type NotificationButton,
  type NotificationField,
} from './useNotificationStore';

const EnvelopeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M2 3h12v10H2V3zm0 1l6 4 6-4v8H2V4z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <path
      d="M8 2L2 14h12L8 2zm0 3l3 6H5l3-6z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
    />
    <circle cx="8" cy="11" r="1" fill="currentColor" />
  </svg>
);

const InfoIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ErrorIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M8 5v6M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SuccessIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-white"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M5 8l2 2 4-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
