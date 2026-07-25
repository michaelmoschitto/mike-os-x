import * as Dialog from '@radix-ui/react-dialog';

import type { ScreenshotDetails } from '@/components/apps/Projects/CaseStudyFigure';

interface ScreenshotDialogProps {
  screenshot: ScreenshotDetails | null;
  onClose: () => void;
}

const ScreenshotDialog = ({ screenshot, onClose }: ScreenshotDialogProps) => {
  return (
    <Dialog.Root
      open={screenshot !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/55 backdrop-blur-[2px]" />
        {screenshot ? (
          <Dialog.Content className="aqua-dialog fixed top-1/2 left-1/2 z-[calc(var(--z-modal)+1)] flex h-[88vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 flex-col focus:outline-none">
            <div className="aqua-dialog-titlebar flex flex-shrink-0 items-center justify-between px-3">
              <Dialog.Title className="font-ui truncate pr-4 text-[11px] font-semibold text-white drop-shadow-sm">
                {screenshot.caption || screenshot.alt}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="aqua-button-base flex h-[20px] w-[24px] items-center justify-center"
                  aria-label="Close screenshot"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M3 3L9 9M9 3L3 9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="sr-only">
              Full-size case study screenshot. Press Escape to close.
            </Dialog.Description>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-[#2d3035] p-5">
              <img
                src={screenshot.src}
                alt={screenshot.alt}
                className="max-h-full max-w-full object-contain shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              />
            </div>

            {screenshot.caption ? (
              <p className="font-ui flex-shrink-0 border-t border-[#aaa] bg-[#ededed] px-4 py-2 text-center text-[11px] leading-4 text-[var(--color-text-secondary)]">
                {screenshot.caption}
              </p>
            ) : null}
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ScreenshotDialog;
