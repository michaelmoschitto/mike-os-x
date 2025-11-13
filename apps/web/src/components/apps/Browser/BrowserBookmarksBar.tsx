import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkItem } from '@/stores/useWindowStore';

interface BrowserBookmarksBarProps {
  bookmarks: BookmarkItem[];
  onNavigate: (url: string) => void;
}

const BrowserBookmarksBar = ({ bookmarks, onNavigate }: BrowserBookmarksBarProps) => {
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const folderRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Calculate dropdown position when folder opens
  useEffect(() => {
    if (openFolder) {
      const buttonElement = folderRefs.current[openFolder];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const dropdownWidth = Math.max(200, rect.width);
        const dropdownMaxHeight = 400;
        
        // Calculate left position
        let left = rect.left;
        // If dropdown would overflow right edge, align to right edge
        if (left + dropdownWidth > viewportWidth) {
          left = Math.max(0, viewportWidth - dropdownWidth);
        }
        
        // Calculate top position
        let top = rect.bottom + 4;
        // If dropdown would overflow bottom, position above button instead
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

  // Close dropdown when clicking outside
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
          background: 'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 1px, #e4e4e4 1px, #e4e4e4 2px)',
          borderBottom: '1px solid #999999',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        <span className="font-semibold mr-2">Favorites:</span>
        <span className="italic text-gray-600">Click the Favorites button to add bookmarks</span>
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
        background: 'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 1px, #e4e4e4 1px, #e4e4e4 2px)',
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
            className="font-ui flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-all"
            style={{
              background: openFolder === folder.title
                ? 'linear-gradient(to bottom, #e0e0e0 0%, #d8d8d8 100%)'
                : 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)',
              border: '1px solid #a0a0a0',
              boxShadow: openFolder === folder.title
                ? 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9'
                : '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              color: '#2c2c2c',
            }}
            onMouseEnter={(e) => {
              if (openFolder !== folder.title) {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)';
              }
            }}
            onMouseLeave={(e) => {
              if (openFolder !== folder.title) {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)';
              }
            }}
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

      {/* Dropdown menu via Portal */}
      {openFolder &&
        dropdownPosition &&
        (() => {
          const folder = folders.find((f) => f.title === openFolder && f.items.length > 0);
          if (!folder) return null;

          return createPortal(
            <div
              data-bookmark-dropdown
              className="fixed z-[1000] max-h-[400px] overflow-y-auto scrollbar-hide"
              style={{
                left: `${dropdownPosition.left}px`,
                top: `${dropdownPosition.top}px`,
                width: `${dropdownPosition.width}px`,
                background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
                border: '1px solid #999',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              }}
            >
              {folder.items.map((bookmark) => (
                <button
                  key={bookmark.url}
                  onClick={() => handleBookmarkClick(bookmark.url)}
                  className="font-ui w-full truncate px-3 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white transition-colors"
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

      {/* Regular bookmarks (not in folders) */}
      {regularBookmarks.map((bookmark) => (
        <button
          key={bookmark.url}
          onClick={() => handleBookmarkClick(bookmark.url)}
          className="font-ui flex-shrink-0 rounded px-2 py-0.5 text-[11px] transition-all"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)',
            border: '1px solid #a0a0a0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
            color: '#2c2c2c',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom, #e0e0e0 0%, #d8d8d8 100%)';
            e.currentTarget.style.boxShadow = 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
          }}
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
