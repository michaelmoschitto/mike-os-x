import { useRef } from 'react';

import type { FinderItemData } from '@/lib/finderContent';
import { cn } from '@/lib/utils';

interface FinderListViewProps {
  items: FinderItemData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (item: FinderItemData) => void;
}

const formatDate = (date?: Date): string => {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSize = (bytes?: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FinderListView = ({ items, selectedId, onSelect, onOpen }: FinderListViewProps) => {
  const lastClickTime = useRef(0);

  const handleClick = (item: FinderItemData) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      onOpen(item);
    } else {
      onSelect(item.id);
    }

    lastClickTime.current = now;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-full">
        <div className="aqua-pinstripe flex h-6 items-center border-b border-[var(--color-border-subtle)] px-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
          <div className="w-[200px]">Name</div>
          <div className="w-[120px]">Date Modified</div>
          <div className="w-[80px]">Size</div>
          <div className="flex-1">Kind</div>
        </div>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              'flex h-5 cursor-pointer items-center border-b border-[var(--color-border-subtle)] px-2 text-[11px] transition-colors',
              index % 2 === 0 && 'bg-white',
              index % 2 === 1 && 'bg-[#f5f5f5]',
              selectedId === item.id && 'bg-[var(--color-highlight)] text-white'
            )}
            onClick={() => handleClick(item)}
          >
            <div className="flex w-[200px] items-center gap-2">
              <img src={item.icon} alt={item.name} className="h-4 w-4" />
              <span className="truncate">{item.name}</span>
            </div>
            <div className="w-[120px] truncate">{formatDate(item.dateModified)}</div>
            <div className="w-[80px] truncate">{formatSize(item.size)}</div>
            <div className="flex-1 truncate">
              {item.kind || (item.type === 'folder' ? 'Folder' : 'Document')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinderListView;
