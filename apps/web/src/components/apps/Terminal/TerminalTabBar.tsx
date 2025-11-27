import { useState } from 'react';

import { cn } from '@/lib/utils';
import { type TerminalTab } from '@/stores/useWindowStore';

interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string | undefined;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string, e: React.MouseEvent) => void;
  onTabReorder: (fromIndex: number, toIndex: number) => void;
}

const TerminalTabBar = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabReorder,
}: TerminalTabBarProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (tabs.length <= 1) {
    return null;
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onTabReorder(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="aqua-tab-bar flex h-7 items-center gap-0.5 border-b border-[#999] bg-[#e5e5e5] px-1">
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTabId;
        const shortcutNumber = index + 1;
        const isTabDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              'aqua-tab group font-ui relative flex h-6 cursor-move items-center gap-1.5 rounded-t px-2 text-[11px] transition-colors',
              isActive
                ? 'bg-white text-black shadow-sm'
                : 'bg-transparent text-black/70 hover:bg-white/50',
              isTabDragging && 'opacity-50',
              isDragOver && 'border-l-2 border-[var(--color-highlight)]'
            )}
            onClick={() => {
              if (draggedIndex === null) {
                onTabClick(tab.id);
              }
            }}
          >
            <span className="max-w-[120px] truncate">{tab.title}</span>
            <span className="text-[10px] text-black/50">⌘{shortcutNumber}</span>
            <button
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded text-[10px] opacity-0 transition-opacity hover:bg-black/10',
                isActive && 'opacity-100 group-hover:opacity-100'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id, e);
              }}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default TerminalTabBar;
