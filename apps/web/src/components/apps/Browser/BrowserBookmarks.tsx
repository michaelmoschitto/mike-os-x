import { useState } from 'react';

import { findBookmarkLocation, getHostnameFromUrl, isUrlBookmarked } from '@/lib/utils';
import { BookmarkItem } from '@/stores/useWindowStore';

interface BrowserBookmarksProps {
  bookmarks: BookmarkItem[];
  currentUrl: string;
  currentTitle: string;
  onNavigate: (url: string) => void;
  onAddBookmark: (title: string, url: string, folderName?: string) => void;
  onRemoveBookmark: (url: string, folderName?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const BrowserBookmarks = ({
  bookmarks,
  currentUrl,
  currentTitle,
  onNavigate,
  onAddBookmark,
  onRemoveBookmark,
  isOpen,
  onClose,
  anchorRef,
}: BrowserBookmarksProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');

  const folders = bookmarks.filter((item) => item.type === 'folder') as Array<{
    type: 'folder';
    title: string;
    items: Array<{ title: string; url: string }>;
  }>;
  const regularBookmarks = bookmarks.filter((item) => item.type === 'bookmark') as Array<{
    type: 'bookmark';
    title: string;
    url: string;
  }>;

  // Check if current URL is bookmarked (in any folder or regular)
  const isCurrentUrlBookmarked = () => {
    if (!currentUrl) return false;
    return isUrlBookmarked(currentUrl, bookmarks);
  };

  const handleAddCurrentPage = () => {
    if (currentUrl) {
      const title = currentTitle || getHostnameFromUrl(currentUrl);
      onAddBookmark(title, currentUrl, selectedFolder || undefined);
      setSelectedFolder('');
    }
  };

  const handleRemoveCurrentPage = () => {
    if (currentUrl) {
      const location = findBookmarkLocation(currentUrl, bookmarks);
      onRemoveBookmark(currentUrl, location?.folderName);
    }
  };

  const handleAddCustomBookmark = () => {
    if (newTitle && newUrl) {
      onAddBookmark(newTitle, newUrl, selectedFolder || undefined);
      setNewTitle('');
      setNewUrl('');
      setSelectedFolder('');
      setIsAdding(false);
    }
  };

  const handleRemoveBookmark = (url: string, folderName?: string) => {
    onRemoveBookmark(url, folderName);
  };

  if (!isOpen) return null;

  // Calculate position based on anchor
  const anchorRect = anchorRef.current?.getBoundingClientRect();
  const top = anchorRect ? anchorRect.bottom + 4 : 100;
  const right = anchorRect ? window.innerWidth - anchorRect.right : 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1000]" onClick={onClose} />

      {/* Dropdown */}
      <div
        className="fixed z-[1001] w-[280px] overflow-hidden"
        style={{
          top: `${top}px`,
          right: `${right}px`,
          background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
          border: '1px solid #999',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        }}
      >
        {/* Header */}
        <div
          className="font-ui border-b px-3 py-2 text-[11px] font-semibold"
          style={{
            borderBottom: '1px solid #bbb',
            background: 'linear-gradient(180deg, #fafafa 0%, #efefef 100%)',
          }}
        >
          Bookmarks
        </div>

        {/* Current page actions */}
        {currentUrl && (
          <div
            className="border-b px-2 py-1.5"
            style={{
              borderBottom: '1px solid #ccc',
            }}
          >
            {isCurrentUrlBookmarked() ? (
              <button
                className="font-ui w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white"
                onClick={handleRemoveCurrentPage}
              >
                ✓ Remove Current Page
              </button>
            ) : (
              <div className="space-y-1.5">
                <button
                  className="font-ui w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white"
                  onClick={handleAddCurrentPage}
                >
                  + Add Current Page
                </button>
                {folders.length > 0 && (
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="font-ui w-full rounded border border-gray-400 px-2 py-1 text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="">Add to Favorites</option>
                    {folders.map((folder) => (
                      <option key={folder.title} value={folder.title}>
                        {folder.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bookmarks list */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {bookmarks.length === 0 ? (
            <div className="font-ui px-3 py-4 text-center text-[11px] text-gray-500">
              No bookmarks yet
            </div>
          ) : (
            <>
              {/* Folders */}
              {folders.map((folder) => (
                <div key={folder.title} className="px-2 py-0.5">
                  <div className="font-ui px-2 py-1 text-[10px] font-semibold text-gray-600 uppercase">
                    {folder.title}
                  </div>
                  {folder.items.length === 0 ? (
                    <div className="font-ui px-2 py-1 text-[10px] text-gray-400 italic">
                      Empty folder
                    </div>
                  ) : (
                    folder.items.map((bookmark) => (
                      <div key={bookmark.url} className="group flex items-center gap-2 px-2 py-0.5">
                        <button
                          className="font-ui flex-1 truncate rounded px-2 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white"
                          onClick={() => {
                            onNavigate(bookmark.url);
                            onClose();
                          }}
                          title={bookmark.url}
                        >
                          {bookmark.title}
                        </button>
                        <button
                          className="font-ui flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                          onClick={() => handleRemoveBookmark(bookmark.url, folder.title)}
                          title="Remove bookmark"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}

              {/* Regular bookmarks */}
              {regularBookmarks.length > 0 && (
                <div className="px-2 py-0.5">
                  {folders.length > 0 && (
                    <div className="font-ui px-2 py-1 text-[10px] font-semibold text-gray-600 uppercase">
                      Other Bookmarks
                    </div>
                  )}
                  {regularBookmarks.map((bookmark) => (
                    <div key={bookmark.url} className="group flex items-center gap-2 px-2 py-0.5">
                      <button
                        className="font-ui flex-1 truncate rounded px-2 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white"
                        onClick={() => {
                          onNavigate(bookmark.url);
                          onClose();
                        }}
                        title={bookmark.url}
                      >
                        {bookmark.title}
                      </button>
                      <button
                        className="font-ui flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                        onClick={() => handleRemoveBookmark(bookmark.url)}
                        title="Remove bookmark"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add custom bookmark */}
        <div
          className="border-t px-2 py-1.5"
          style={{
            borderTop: '1px solid #ccc',
          }}
        >
          {isAdding ? (
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="Title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="font-ui w-full rounded border border-gray-400 px-2 py-1 text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="URL"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="font-ui w-full rounded border border-gray-400 px-2 py-1 text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              {folders.length > 0 && (
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="font-ui w-full rounded border border-gray-400 px-2 py-1 text-[11px] focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Add to Favorites</option>
                  {folders.map((folder) => (
                    <option key={folder.title} value={folder.title}>
                      {folder.title}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-1.5">
                <button
                  className="font-ui flex-1 rounded bg-blue-500 px-2 py-1 text-[11px] text-white hover:bg-blue-600"
                  onClick={handleAddCustomBookmark}
                >
                  Add
                </button>
                <button
                  className="font-ui rounded border border-gray-400 px-2 py-1 text-[11px] hover:bg-gray-200"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTitle('');
                    setNewUrl('');
                    setSelectedFolder('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              className="font-ui w-full rounded px-2 py-1.5 text-left text-[11px] hover:bg-blue-500 hover:text-white"
              onClick={() => setIsAdding(true)}
            >
              + Add Bookmark...
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default BrowserBookmarks;
