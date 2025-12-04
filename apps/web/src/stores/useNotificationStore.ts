import { create } from 'zustand';

export type NotificationType = 'message' | 'alert' | 'info' | 'error' | 'success';

export interface NotificationField {
  label: string;
  value: string;
}

export interface NotificationButton {
  label: string;
  action: () => void;
}

export type NotificationVariant = 'default' | 'compact';

export interface NotificationConfig {
  type: NotificationType;
  title: string;
  icon?: React.ReactNode;
  fields?: NotificationField[];
  primaryButton?: NotificationButton;
  secondaryButton?: NotificationButton;
  autoDismiss?: number;
  variant?: NotificationVariant;
  message?: string;
  timestamp?: string;
}

export interface NotificationState {
  notification: NotificationConfig | null;
  showNotification: (config: NotificationConfig | string) => void;
  hideNotification: () => void;
}

const defaultNotificationConfig = (message: string): NotificationConfig => ({
  type: 'info',
  title: 'Notification',
  fields: [{ label: 'Message', value: message }],
  primaryButton: {
    label: 'OK',
    action: () => {},
  },
  autoDismiss: 3000,
});

export const useNotificationStore = create<NotificationState>((set) => ({
  notification: null,
  showNotification: (config: NotificationConfig | string) => {
    const notificationConfig: NotificationConfig =
      typeof config === 'string' ? defaultNotificationConfig(config) : config;
    set({ notification: notificationConfig });
  },
  hideNotification: () => set({ notification: null }),
}));
