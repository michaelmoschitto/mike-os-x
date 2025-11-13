import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkItem } from '@/stores/useWindowStore';
import AquaDropdown from '@/components/ui/AquaDropdown';
import { cn } from '@/lib/utils';

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

  // Extract folders from bookmarks
  const folders = bookmarks.filter((item) => item.type === 'folder');
  
  // Create dropdown items - include "Bookmarks Bar" as default
  const dropdownItems = [
    { label: 'Bookmarks Bar', value: '' },
    ...folders.map((folder) => ({ label: folder.title, value: folder.title })),
  ];

  // Initialize bookmark name and folder when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set default name from current title or URL hostname
      const defaultName = currentTitle || (() => {
        try {
          return new URL(currentUrl).hostname;
        } catch {
          return currentUrl;
        }
      })();
      setBookmarkName(defaultName);
      setSelectedFolder(''); // Default to "Bookmarks Bar" (empty string = Bookmarks Bar)
      selectedFolderRef.current = '';

      // Focus and select name input so user can immediately edit
      setTimeout(() => {
        nameInputRef.current?.focus();
        nameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, currentUrl, currentTitle]);

  // Handle Escape key - close without saving
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
    const name = bookmarkName.trim() || currentTitle || (() => {
      try {
        return new URL(currentUrl).hostname;
      } catch {
        return currentUrl;
      }
    })();

    if (name && currentUrl) {
      // Use ref to get the most current value (in case state hasn't updated yet)
      const currentFolder = selectedFolderRef.current || selectedFolder;
      // Empty string means "Bookmarks Bar" (add as regular bookmark)
      // Non-empty string means add to that folder
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

  // Get favicon letter (first letter of domain)
  const getFaviconLetter = () => {
    try {
      const hostname = new URL(currentUrl).hostname;
      return hostname.charAt(0).toUpperCase();
    } catch {
      return '?';
    }
  };

  // Calculate position based on anchor - position below bookmark button, aligned to right edge
  const calculatePosition = () => {
    if (!anchorRef.current) {
      return { top: 100, left: 100 };
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const dialogWidth = 400;
    const spacing = 8;
    
    // Position below the button
    let top = rect.bottom + spacing;
    
    // Align to the right edge of the button (like Chrome)
    let left = rect.right - dialogWidth;
    
    // Ensure it doesn't go off the left edge of the viewport
    if (left < spacing) {
      left = spacing;
    }
    
    // Ensure it doesn't go off the right edge of the viewport
    if (left + dialogWidth > window.innerWidth - spacing) {
      left = window.innerWidth - dialogWidth - spacing;
    }
    
    return { top, left };
  };

  // Recalculate position when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure button is positioned
      const timeoutId = setTimeout(() => {
        setPosition(calculatePosition());
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Create trigger button for dropdown
  const folderTrigger = (
    <button
      type="button"
      className={cn(
        'font-ui flex w-full items-center justify-between rounded px-2 py-1 text-[11px]',
        'focus:outline-none focus:ring-1 focus:ring-[#3b9cff]'
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
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        style={{ marginLeft: '8px' }}
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
  );

  // Render dialog in a portal to avoid clipping and layout issues
  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[999]"
            onClick={handleSave}
            style={{ background: 'transparent' }}
          />

          {/* Dialog */}
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
            {/* Header */}
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

            {/* Content */}
            <div className="flex gap-3 p-4">
              {/* Favicon area */}
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

              {/* Form fields */}
              <div className="flex-1 space-y-3">
                {/* Name field */}
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
                    className="font-ui w-full px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-[#3b9cff]"
                    style={{
                      background: '#fff',
                      border: '1px solid #8a8a8a',
                      borderRadius: '3px',
                      boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1)',
                      color: '#2c2c2c',
                    }}
                  />
                </div>

                {/* Folder dropdown */}
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

  // Render in portal at document body level
  return createPortal(dialogContent, document.body);
};

export default BookmarkDialog;

