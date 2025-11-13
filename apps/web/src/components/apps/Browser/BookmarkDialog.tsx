import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { BookmarkItem } from '@/stores/useWindowStore';
import { AquaDropdown } from '@/components/ui/aqua';
import { cn, getHostnameFromUrl } from '@/lib/utils';

interface BookmarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  currentTitle: string;
  bookmarks: BookmarkItem[];
  onAddBookmark: (title: string, url: string, folderName?: string) => void;
  anchorRef: React.RefObject<HTMLElement> | { current: HTMLElement | null };
}

const BookmarkDialog = ({
  isOpen,
  onClose,
  currentUrl,
  currentTitle,
  bookmarks,
  onAddBookmark,
  anchorRef,
}: BookmarkDialogProps) => {
  const [bookmarkName, setBookmarkName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [position, setPosition] = useState({ top: 100, left: 100 });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const selectedFolderRef = useRef<string>('');

  const folders = bookmarks.filter((item) => item.type === 'folder');

  const dropdownItems = [
    { label: 'Bookmarks Bar', value: '' },
    ...folders.map((folder) => ({ label: folder.title, value: folder.title })),
  ];

  useEffect(() => {
    if (isOpen) {
      const defaultName = currentTitle || getHostnameFromUrl(currentUrl);
      setBookmarkName(defaultName);
      // Empty string = "Bookmarks Bar" (default)
      setSelectedFolder('');
      selectedFolderRef.current = '';

      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentUrl, currentTitle]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = () => {
    const name = bookmarkName.trim() || currentTitle || getHostnameFromUrl(currentUrl);

    if (name && currentUrl) {
      // Use ref to get most current value (state may not have updated yet)
      const currentFolder = selectedFolderRef.current || selectedFolder;
      const folderName = currentFolder.trim() === '' ? undefined : currentFolder;
      onAddBookmark(name, currentUrl, folderName);
    }
    onClose();
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const getFaviconLetter = () => {
    const hostname = getHostnameFromUrl(currentUrl);
    if (!hostname) return '?';
    return hostname.charAt(0).toUpperCase();
  };

  const calculatePosition = useCallback(() => {
    if (!anchorRef.current) {
      return { top: 100, left: 100 };
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const dialogWidth = 400;
    const spacing = 8;

    const top = rect.bottom + spacing;
    let left = rect.right - dialogWidth;

    if (left < spacing) {
      left = spacing;
    }

    if (left + dialogWidth > window.innerWidth - spacing) {
      left = window.innerWidth - dialogWidth - spacing;
    }

    return { top, left };
  }, [anchorRef]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure button is positioned
      const timeoutId = setTimeout(() => {
        setPosition(calculatePosition());
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, calculatePosition]);

  const folderTrigger = (
    <button
      type="button"
      className={cn(
        'font-ui flex w-full items-center justify-between rounded px-2 py-1 text-[11px]',
        'focus:outline-none focus:ring-1 focus:ring-[var(--color-highlight)]'
      )}
      style={{
        background: '#fff',
        border: '1px solid #8a8a8a',
        borderRadius: '3px',
        boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1)',
        color: '#2c2c2c',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{selectedFolder || 'Bookmarks Bar'}</span>
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ marginLeft: '8px' }}>
        <path
          d="M2 3 L4 5 L6 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[999]"
            onClick={handleSave}
            style={{ background: 'transparent' }}
          />

          <motion.div
            className="fixed z-[1000]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: '400px',
              maxWidth: 'calc(100vw - 16px)', // Ensure it doesn't overflow viewport
              background: 'linear-gradient(to bottom, #f6f8fb, #e7ebf3)',
              border: '1px solid #7a7a7a',
              borderRadius: '0px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{
                borderBottom: '1px solid #999',
                background: 'linear-gradient(to bottom, #fafafa, #efefef)',
              }}
            >
              <span className="font-ui text-[11px] font-semibold text-gray-800">
                Bookmark added
              </span>
              <button
                type="button"
                onClick={handleSave}
                className="font-ui flex h-4 w-4 items-center justify-center rounded text-[10px] hover:bg-gray-300"
                style={{
                  color: '#2c2c2c',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3 p-4">
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded"
                style={{
                  background: '#000',
                  border: '1px solid #333',
                }}
              >
                <span
                  className="font-ui text-lg font-bold text-white"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {getFaviconLetter()}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label
                    className="font-ui mb-1 block text-[11px] font-medium"
                    style={{ color: '#2c2c2c' }}
                  >
                    Name:
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={bookmarkName}
                    onChange={(e) => setBookmarkName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="font-ui w-full px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-[var(--color-highlight)]"
                    style={{
                      background: '#fff',
                      border: '1px solid #8a8a8a',
                      borderRadius: '3px',
                      boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1)',
                      color: '#2c2c2c',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="font-ui mb-1 block text-[11px] font-medium"
                    style={{ color: '#2c2c2c' }}
                  >
                    Folder:
                  </label>
                  <AquaDropdown
                    items={dropdownItems}
                    value={selectedFolder}
                    onValueChange={(value) => {
                      selectedFolderRef.current = value;
                      setSelectedFolder(value);
                    }}
                    trigger={folderTrigger}
                    align="start"
                    side="bottom"
                    sideOffset={4}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(dialogContent, document.body);
};

export default BookmarkDialog;
