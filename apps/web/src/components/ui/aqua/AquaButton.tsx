import { cn } from '@/lib/utils';

interface AquaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  children: React.ReactNode;
}

export const AquaButton = ({
  size = 'md',
  active = false,
  className,
  children,
  type = 'button',
  ...props
}: AquaButtonProps) => {
  return (
    <button
      type={type}
      className={cn(
        'aqua-button-base',
        size === 'sm' && 'h-[22px] px-2 text-[10px]',
        size === 'md' && 'h-[28px] px-3 text-[11px]',
        size === 'lg' && 'h-[32px] px-4 text-[12px]',
        active && 'bg-[var(--gradient-button-active)] shadow-[var(--shadow-button-active)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
