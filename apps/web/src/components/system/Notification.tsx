import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';
import { EnvelopeIcon } from '@/components/system/NotificationIcons';
import { useNotificationStore, type NotificationConfig } from '@/stores/useNotificationStore';

const notificationSpring = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 30,
  mass: 1,
};

const CloseIcon = ({ className }: { className?: string }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className || 'text-white'}
  >
    <path
      d="M9 3L3 9M3 3l6 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
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

  const handleDismiss = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    hideNotification();
  };

  if (!config) return null;

  const isCompact = config.variant === 'compact';
  const message = config.message || (config.fields && config.fields[0]?.value) || '';
  const timestamp =
    config.timestamp ||
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (isCompact) {
    return (
      <AnimatePresence>
        <motion.div
          ref={dialogRef}
          layout
          className="aqua-dialog fixed top-4 right-4 z-[20000] min-h-[72px] w-80 overflow-hidden"
          initial={{ x: 100, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 20, opacity: 0, scale: 0.95 }}
          transition={notificationSpring}
        >
          <div className="aqua-pinstripe relative flex items-center bg-white px-4 py-3">
            {config.icon && (
              <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                {config.icon}
              </div>
            )}
            <div className="min-w-0 flex-grow">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="font-ui truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {config.title}
                </h4>
                <span className="font-ui ml-2 shrink-0 text-xs text-gray-500">{timestamp}</span>
              </div>
              <p className="font-ui line-clamp-1 text-sm text-[var(--color-text-primary)]">
                {message}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                'ml-2 shrink-0',
                'flex h-5 w-5 items-center justify-center rounded',
                'transition-colors hover:bg-gray-200',
                'focus:ring-1 focus:ring-[var(--color-highlight)] focus:outline-none',
                'opacity-60 hover:opacity-100'
              )}
              aria-label="Dismiss notification"
            >
              <CloseIcon className="text-gray-600" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        layout
        className="aqua-dialog fixed top-4 right-4 z-[20000] min-h-[70px] w-80 overflow-hidden"
        initial={{ x: 100, opacity: 0, scale: 0.95 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: 20, opacity: 0, scale: 0.95 }}
        transition={notificationSpring}
      >
        <div className="aqua-dialog-titlebar relative flex items-center gap-2 px-3">
          {config.icon || <EnvelopeIcon />}
          <span className="font-ui text-[11px] font-semibold text-white">{config.title}</span>
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'absolute top-1/2 right-2 -translate-y-1/2',
              'flex h-5 w-5 items-center justify-center rounded',
              'transition-colors hover:bg-white/20',
              'focus:ring-1 focus:ring-white/50 focus:outline-none',
              'opacity-80 hover:opacity-100'
            )}
            aria-label="Dismiss notification"
          >
            <CloseIcon />
          </button>
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
    </AnimatePresence>
  );
};

export default Notification;
