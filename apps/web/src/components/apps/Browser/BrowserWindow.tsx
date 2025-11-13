import { useEffect, useRef, useState } from 'react';

import BookmarkDialog from '@/components/apps/Browser/BookmarkDialog';
import BrowserBookmarksBar from '@/components/apps/Browser/BrowserBookmarksBar';
import BrowserContent from '@/components/apps/Browser/BrowserContent';
import BrowserToolbar from '@/components/apps/Browser/BrowserToolbar';
import Window from '@/components/window/Window';
import { findBookmarkLocation, getHostnameFromUrl, isUrlBookmarked } from '@/lib/utils';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface BrowserWindowProps {
  window: WindowType;
  isActive: boolean;
}

const BrowserWindow = ({ window: windowData, isActive }: BrowserWindowProps) => {
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    navigateToUrl,
    navigateBack,
    navigateForward,
    addBookmark,
    removeBookmark,
  } = useWindowStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [bookmarkButtonElement, setBookmarkButtonElement] = useState<HTMLButtonElement | null>(
    null
  );

  const currentUrl = windowData.url || '';
  const [addressBarValue, setAddressBarValue] = useState(currentUrl);
  const history = windowData.history || [];
  const historyIndex = windowData.historyIndex ?? -1;
  const bookmarks = windowData.bookmarks || [];
  const browsingHistory = windowData.browsingHistory || [];

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const handleNavigate = (url: string, title?: string) => {
    navigateToUrl(windowData.id, url, title);
  };

  const handleBack = () => {
    if (canGoBack) {
      navigateBack(windowData.id);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      navigateForward(windowData.id);
    }
  };

  const handleRefresh = () => {
    // Force iframe reload by navigating to same URL
    if (currentUrl) {
      navigateToUrl(windowData.id, currentUrl);
    }
  };

  const handleStop = () => {
    // In a real browser, this would stop loading, but with iframe we have limited control
    setIsLoading(false);
  };

  const handleHome = () => {
    // Navigate to about:blank as home
    navigateToUrl(windowData.id, 'about:blank');
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleBookmarksClick = () => {
    // Use address bar value if available, otherwise fall back to current URL
    const urlToBookmark = addressBarValue.trim() || currentUrl;

    // Chrome-like behavior: if not bookmarked, show dialog to add it
    // If already bookmarked, remove it (unbookmark)
    if (!urlToBookmark) return;

    if (isUrlBookmarked(urlToBookmark, bookmarks)) {
      // Already bookmarked - remove it
      const location = findBookmarkLocation(urlToBookmark, bookmarks);
      handleRemoveBookmark(urlToBookmark, location?.folderName);
    } else {
      // Not bookmarked - show dialog to add it
      setShowBookmarkDialog(true);
    }
  };

  const handleAddBookmark = (title: string, url: string, folderName?: string) => {
    addBookmark(windowData.id, title, url, folderName);
    setShowBookmarkDialog(false);
  };

  const handleRemoveBookmark = (url: string, folderName?: string) => {
    removeBookmark(windowData.id, url, folderName);
  };

  const getBookmarkTitle = () => {
    // Use address bar value if available, otherwise fall back to current URL
    const urlToUse = addressBarValue.trim() || currentUrl;
    if (!urlToUse) return '';
    return getHostnameFromUrl(urlToUse);
  };

  const getBookmarkUrl = () => {
    // Use address bar value if available, otherwise fall back to current URL
    return addressBarValue.trim() || currentUrl;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      // Cmd/Ctrl + L for address bar focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        // Focus address bar
        const addressBar = document.querySelector(
          `#browser-${windowData.id} input[type="text"]`
        ) as HTMLInputElement;
        addressBar?.focus();
      }

      // Cmd/Ctrl + R for refresh
      // Only intercept if Shift is NOT held (Shift+Cmd+R = hard refresh page)
      // Also check if focus is actually within the browser content area
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && !e.shiftKey) {
        const activeElement = document.activeElement;
        const browserElement = document.querySelector(`#browser-${windowData.id}`);
        const isFocusedInBrowser =
          activeElement &&
          browserElement &&
          (browserElement.contains(activeElement) ||
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA');

        // Only prevent default if focus is actually in the browser window
        // This allows Cmd+R to refresh the page when not focused on browser content
        if (isFocusedInBrowser) {
          e.preventDefault();
          handleRefresh();
        }
        // Otherwise, let the browser handle the refresh normally
      }

      // Cmd/Ctrl + [ for back
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        handleBack();
      }

      // Cmd/Ctrl + ] for forward
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        handleForward();
      }
    };

    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, windowData.id, canGoBack, canGoForward, currentUrl]);

  const getWindowTitle = () => {
    return 'Internet Explorer';
  };

  return (
    <Window
      id={windowData.id}
      title={getWindowTitle()}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={() => closeWindow(windowData.id)}
      onMinimize={() => minimizeWindow(windowData.id)}
      onFocus={() => focusWindow(windowData.id)}
      onDragEnd={(position) => updateWindowPosition(windowData.id, position)}
      onResize={(size) => updateWindowSize(windowData.id, size)}
    >
      <div id={`browser-${windowData.id}`} className="relative flex h-full flex-col">
        {/* Toolbar */}
        <div ref={toolbarRef} className="relative z-20">
          <BrowserToolbar
            url={currentUrl}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            isLoading={isLoading}
            browsingHistory={browsingHistory}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onForward={handleForward}
            onRefresh={handleRefresh}
            onStop={handleStop}
            onHome={handleHome}
            onBookmarksClick={handleBookmarksClick}
            bookmarkButtonRef={setBookmarkButtonElement}
            onAddressBarValueChange={setAddressBarValue}
          />
        </div>

        {/* Bookmarks Bar - needs to be able to render dropdown over content below */}
        <div className="relative z-10">
          <BrowserBookmarksBar bookmarks={bookmarks} onNavigate={handleNavigate} />
        </div>

        {/* Browser Content */}
        <div className="relative z-0 flex-1 overflow-hidden">
          <BrowserContent
            url={currentUrl}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
          />
        </div>

        {/* Bookmark Dialog - Chrome-like "Bookmark added" experience */}
        {getBookmarkUrl() && (
          <BookmarkDialog
            isOpen={showBookmarkDialog}
            onClose={() => setShowBookmarkDialog(false)}
            currentUrl={getBookmarkUrl()}
            currentTitle={getBookmarkTitle()}
            bookmarks={bookmarks}
            onAddBookmark={handleAddBookmark}
            anchorRef={{ current: bookmarkButtonElement }}
          />
        )}
      </div>
    </Window>
  );
};

export default BrowserWindow;


