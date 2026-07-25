import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';

import { AquaButton } from '@/components/ui/aqua';

interface PortfolioPasswordDialogProps {
  isChecking: boolean;
  onCancel: () => void;
  onUnlock: (password: string) => Promise<boolean>;
}

const PortfolioPasswordDialog = ({
  isChecking,
  onCancel,
  onUnlock,
}: PortfolioPasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const isUnlocked = await onUnlock(password);
    if (!isUnlocked) {
      setError('That password did not unlock Selected Work.');
      setPassword('');
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen && !isChecking) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-modal)] bg-black/20 backdrop-blur-[1px]" />
        <Dialog.Content
          className="aqua-dialog fixed top-1/2 left-1/2 z-[calc(var(--z-modal)+1)] w-[380px] -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="aqua-dialog-titlebar flex items-center justify-center px-4">
            <Dialog.Title className="font-ui text-[12px] font-semibold text-white drop-shadow-sm">
              Selected Work
            </Dialog.Title>
          </div>

          <form className="aqua-pinstripe p-5" onSubmit={handleSubmit}>
            <Dialog.Description className="font-ui mb-4 text-[12px] leading-5 text-[var(--color-text-primary)]">
              Enter the shared portfolio password to view selected product and interface work.
            </Dialog.Description>

            <label className="font-ui block text-[11px] font-semibold text-[var(--color-text-primary)]">
              Password
              <input
                autoFocus
                type="password"
                value={password}
                disabled={isChecking}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'portfolio-password-error' : undefined}
                onChange={(event) => setPassword(event.target.value)}
                className="font-ui mt-1.5 h-[28px] w-full rounded-[3px] border border-[#8a8a8a] bg-white px-2 text-[12px] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.12)] focus:ring-2 focus:ring-[var(--color-aqua-blue)] focus:outline-none disabled:opacity-60"
              />
            </label>

            <div
              id="portfolio-password-error"
              className="font-ui mt-2 min-h-[18px] text-[11px] text-[#a31d1d]"
              aria-live="polite"
            >
              {error}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <AquaButton disabled={isChecking} onClick={onCancel}>
                Cancel
              </AquaButton>
              <AquaButton
                className="aqua-button-blue min-w-[78px]"
                disabled={isChecking || password.length === 0}
                type="submit"
              >
                {isChecking ? 'Checking…' : 'Unlock'}
              </AquaButton>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PortfolioPasswordDialog;
