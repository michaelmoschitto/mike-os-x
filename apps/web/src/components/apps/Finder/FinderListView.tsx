import type { FinderItemData } from '@/lib/finderContent';
import { useDoubleClick } from '@/lib/hooks/useDoubleClick';
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

interface FinderListItemProps {
  item: FinderItemData;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

const FinderListItem = ({ item, index, isSelected, onSelect, onOpen }: FinderListItemProps) => {
  const handleClick = useDoubleClick({
    onClick: onSelect,
    onDoubleClick: onOpen,
  });

  return (
    <div
      className={cn(
        'flex h-5 cursor-pointer items-center border-b border-[var(--color-border-subtle)] px-2 text-[11px] transition-colors',
        index % 2 === 0 && 'bg-white',
        index % 2 === 1 && 'bg-[#f5f5f5]',
        isSelected && 'bg-[var(--color-highlight)] text-white'
      )}
      onClick={handleClick}
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
  );
};

const FinderListView = ({ items, selectedId, onSelect, onOpen }: FinderListViewProps) => {
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
          <FinderListItem
            key={item.id}
            item={item}
            index={index}
            isSelected={selectedId === item.id}
            onSelect={() => onSelect(item.id)}
            onOpen={() => onOpen(item)}
          />
        ))}
      </div>
    </div>
  );
};

export default FinderListView;
