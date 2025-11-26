import { useRef } from 'react';

import { cn } from '@/lib/utils';

interface FinderItemProps {
  name: string;
  type: 'file' | 'folder';
  icon: string;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

const FinderItem = ({ name, icon, isSelected, onClick, onDoubleClick }: FinderItemProps) => {
  const lastClickTime = useRef(0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      onDoubleClick();
    } else {
      onClick();
    }

    lastClickTime.current = now;
  };

  return (
    <div
      className={cn(
        'flex cursor-pointer flex-col items-center gap-1 rounded p-2 transition-colors',
        isSelected && 'bg-[var(--color-highlight)]'
      )}
      onClick={handleClick}
    >
      <img src={icon} alt={name} className="h-12 w-12" />
      <span
        className={cn(
          'max-w-[80px] truncate text-center text-[11px]',
          isSelected ? 'text-white' : 'text-[var(--color-text-primary)]'
        )}
      >
        {name}
      </span>
    </div>
  );
};

export default FinderItem;
