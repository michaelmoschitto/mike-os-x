import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { useNotificationStore, type NotificationConfig } from '@/stores/useNotificationStore';

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

const Notification = () => {
  const notification = useNotificationStore((state) => state.notification);
  const hideNotification = useNotificationStore((state) => state.hideNotification);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const config: NotificationConfig | null = notification;

  useEffect(() => {
    if (config?.autoDismiss && config.autoDismiss > 0) {
      timeoutRef.current = setTimeout(() => {
        hideNotification();
      }, config.autoDismiss);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [config, hideNotification]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!config) return;

      if (e.key === 'Escape') {
        hideNotification();
      } else if (e.key === 'Enter' && config.primaryButton) {
        config.primaryButton.action();
        hideNotification();
      }
    };

    if (config) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [config, hideNotification]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      hideNotification();
    }
  };

  const handlePrimaryClick = () => {
    if (config?.primaryButton) {
      config.primaryButton.action();
    }
    hideNotification();
  };

  const handleSecondaryClick = () => {
    if (config?.secondaryButton) {
      config.secondaryButton.action();
    }
    hideNotification();
  };

  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[20000] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={handleBackdropClick}
      >
        <motion.div
          ref={dialogRef}
          className="aqua-dialog relative w-[400px] overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="aqua-dialog-titlebar flex items-center gap-2 px-3">
            {config.icon || <EnvelopeIcon />}
            <span className="font-ui text-[11px] font-semibold text-white">{config.title}</span>
          </div>

          <div className="aqua-pinstripe bg-white p-4">
            {config.fields && config.fields.length > 0 ? (
              <div className="space-y-2">
                {config.fields.map((field, index) => (
                  <div key={index} className="font-ui text-[11px] text-[var(--color-text-primary)]">
                    <span className="font-semibold">{field.label}:</span> <span>{field.value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              {config.secondaryButton && (
                <button
                  type="button"
                  className={cn(
                    'aqua-button-base font-ui h-[22px] px-4 text-[11px]',
                    'focus:ring-1 focus:ring-[var(--color-highlight)] focus:outline-none'
                  )}
                  onClick={handleSecondaryClick}
                >
                  {config.secondaryButton.label}
                </button>
              )}
              {config.primaryButton && (
                <button
                  type="button"
                  className={cn(
                    'aqua-button-base aqua-button-blue font-ui h-[22px] px-4 text-[11px]',
                    'focus:ring-1 focus:ring-[var(--color-highlight)] focus:outline-none'
                  )}
                  onClick={handlePrimaryClick}
                  autoFocus
                >
                  {config.primaryButton.label}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Notification;
