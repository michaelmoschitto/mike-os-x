import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { BookmarkItem } from '@/stores/useWindowStore';
import { cn } from '@/lib/utils';

interface BrowserBookmarksBarProps {
  bookmarks: BookmarkItem[];
  onNavigate: (url: string) => void;
}

const BrowserBookmarksBar = ({ bookmarks, onNavigate }: BrowserBookmarksBarProps) => {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const folderRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (openFolder) {
      const buttonElement = folderRefs.current[openFolder];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dropdownWidth = Math.max(200, rect.width);
        const dropdownMaxHeight = 400;

        let left = rect.left;
        if (left + dropdownWidth > viewportWidth) {
          left = Math.max(0, viewportWidth - dropdownWidth);
        }

        let top = rect.bottom + 4;
        if (top + dropdownMaxHeight > viewportHeight && rect.top > dropdownMaxHeight) {
          top = rect.top - dropdownMaxHeight - 4;
        }

        setDropdownPosition({
          left,
          top,
          width: dropdownWidth,
        });
      }
    } else {
      setDropdownPosition(null);
    }
  }, [openFolder]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFolder) {
        const buttonElement = folderRefs.current[openFolder];
        const dropdownElement = document.querySelector('[data-bookmark-dropdown]');

        if (
          buttonElement &&
          !buttonElement.contains(event.target as Node) &&
          dropdownElement &&
          !dropdownElement.contains(event.target as Node)
        ) {
          setOpenFolder(null);
        }
      }
    };

    if (openFolder) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openFolder]);

  if (bookmarks.length === 0) {
    return (
      <div
        className="aqua-pinstripe font-ui flex h-[28px] items-center px-3 text-[11px] text-gray-700"
        style={{
          background:
            'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 1px, #e4e4e4 1px, #e4e4e4 2px)',
          borderBottom: '1px solid #999999',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        <span className="mr-2 font-semibold">Favorites:</span>
        <span className="text-gray-600 italic">Click the Favorites button to add bookmarks</span>
      </div>
    );
  }

  const folders = bookmarks.filter((item) => item.type === 'folder');
  const regularBookmarks = bookmarks.filter((item) => item.type === 'bookmark');

  const handleFolderClick = (folderTitle: string) => {
    setOpenFolder(openFolder === folderTitle ? null : folderTitle);
  };

  const handleBookmarkClick = (url: string) => {
    onNavigate(url);
    setOpenFolder(null);
  };

  return (
    <div
      className="aqua-pinstripe relative flex h-[28px] items-center gap-1 overflow-x-auto px-3"
      style={{
        background:
          'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 1px, #e4e4e4 1px, #e4e4e4 2px)',
        borderBottom: '1px solid #999999',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#888 #e4e4e4',
      }}
    >
      {/* Folders */}
      {folders.map((folder) => (
        <div key={folder.title} className="relative flex-shrink-0">
          <button
            ref={(el) => (folderRefs.current[folder.title] = el)}
            onClick={() => handleFolderClick(folder.title)}
            className={cn(
              'aqua-button-base flex items-center gap-1 rounded px-2 py-0.5 text-[11px]',
              openFolder === folder.title && 'bg-[var(--gradient-button-active)] shadow-[var(--shadow-button-active)]'
            )}
            type="button"
          >
            <span>{folder.title}</span>
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{
                transform: openFolder === folder.title ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path
                d="M2 3 L4 5 L6 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ))}

      {openFolder &&
        dropdownPosition &&
        (() => {
          const folder = folders.find((f) => f.title === openFolder && f.items.length > 0);
          if (!folder) return null;

          return createPortal(
            <div
              data-bookmark-dropdown
              className="fixed z-[10000] max-h-[400px] overflow-y-auto scrollbar-hide"
              style={{
                left: `${dropdownPosition.left}px`,
                top: `${dropdownPosition.top}px`,
                width: `${dropdownPosition.width}px`,
                background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
                border: '1px solid #999',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
                padding: '4px',
              }}
            >
              {folder.items.map((bookmark) => (
                <button
                  key={bookmark.url}
                  onClick={() => handleBookmarkClick(bookmark.url)}
                  className="font-ui relative flex w-full items-center truncate px-3 py-1.5 text-left text-[11px] outline-none transition-colors"
                  style={{
                    color: '#2c2c2c',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5A8DD9';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#2c2c2c';
                  }}
                  title={bookmark.url}
                  type="button"
                >
                  {bookmark.title}
                </button>
              ))}
            </div>,
            document.body
          );
        })()}

      {regularBookmarks.map((bookmark) => (
        <button
          key={bookmark.url}
          onClick={() => handleBookmarkClick(bookmark.url)}
          className="aqua-button-base flex-shrink-0 rounded px-2 py-0.5 text-[11px]"
          title={bookmark.url}
          type="button"
        >
          {bookmark.title}
        </button>
      ))}
    </div>
  );
};

export default BrowserBookmarksBar;
