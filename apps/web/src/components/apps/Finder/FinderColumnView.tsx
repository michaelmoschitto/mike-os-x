import { useEffect, useMemo, useState } from 'react';

import type { FinderItemData } from '@/lib/finderContent';
import { getFolderContents } from '@/lib/finderContent';
import { cn } from '@/lib/utils';

interface FinderColumnViewProps {
  currentPath: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (item: FinderItemData) => void;
  onNavigate: (path: string) => void;
}

interface ColumnData {
  path: string;
  items: FinderItemData[];
  selectedId: string | null;
}

const FinderColumnView = ({
  currentPath,
  selectedId,
  onSelect,
  onOpen,
  onNavigate,
}: FinderColumnViewProps) => {
  const initialColumns = useMemo(() => {
    const pathParts = currentPath.split('/').filter(Boolean);
    const newColumns: ColumnData[] = [];

    for (let i = 0; i <= pathParts.length; i++) {
      const path = i === 0 ? '/home' : `/${pathParts.slice(0, i).join('/')}`;
      newColumns.push({
        path,
        items: getFolderContents(path),
        selectedId: i === pathParts.length ? selectedId : null,
      });
    }

    return newColumns;
  }, [currentPath, selectedId]);

  const [columns, setColumns] = useState<ColumnData[]>(initialColumns);

  useEffect(() => {
    setColumns(initialColumns);
  }, [initialColumns]);

  const handleItemClick = (item: FinderItemData, columnIndex: number) => {
    const newColumns = columns.slice(0, columnIndex + 1);
    const updatedColumns = newColumns.map((col, idx) =>
      idx === columnIndex ? { ...col, selectedId: item.id } : col
    );

    if (item.type === 'folder') {
      const folderContents = getFolderContents(item.path);
      updatedColumns.push({
        path: item.path,
        items: folderContents,
        selectedId: null,
      });
    }

    setColumns(updatedColumns);
    onSelect(item.id);
  };

  const handleItemDoubleClick = (item: FinderItemData) => {
    if (item.type === 'folder') {
      onNavigate(item.path);
    } else {
      onOpen(item);
    }
  };

  return (
    <div className="flex flex-1 overflow-x-auto">
      {columns.map((column, columnIndex) => (
        <div
          key={column.path}
          className="w-[200px] flex-shrink-0 border-r border-[var(--color-border-subtle)]"
        >
          <div className="aqua-pinstripe flex h-6 items-center border-b border-[var(--color-border-subtle)] px-2 text-[10px] font-medium text-[var(--color-text-secondary)]">
            {column.path === '/home' ? 'Home' : column.path.split('/').pop() || column.path}
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 24px)' }}>
            {column.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex h-6 cursor-pointer items-center gap-2 px-2 text-[11px] transition-colors',
                  column.selectedId === item.id && 'bg-[var(--color-highlight)] text-white',
                  column.selectedId !== item.id && 'hover:bg-[#f5f5f5]'
                )}
                onClick={() => handleItemClick(item, columnIndex)}
                onDoubleClick={() => handleItemDoubleClick(item)}
              >
                <img src={item.icon} alt={item.name} className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinderColumnView;
