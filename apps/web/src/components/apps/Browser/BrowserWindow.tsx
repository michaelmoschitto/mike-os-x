import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const navigate = useNavigate();
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
    routeNavigationWindowId,
  } = useWindowStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [bookmarkButtonElement, setBookmarkButtonElement] = useState<HTMLButtonElement | null>(
    null
  );

  const currentUrl = windowData.url || '';
  const [addressBarValue, setAddressBarValue] = useState(currentUrl);
  const history = useMemo(() => windowData.history || [], [windowData.history]);
  const historyIndex = windowData.historyIndex ?? -1;
  const bookmarks = windowData.bookmarks || [];
  const browsingHistory = windowData.browsingHistory || [];

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const handleNavigate = (
    url: string,
    title?: string,
    syncSource?: 'user' | 'route' | 'internal'
  ) => {
    const fromRoute = syncSource === 'route';
    navigateToUrl(windowData.id, url, title, fromRoute);

    if (url.startsWith('/')) {
      navigate({ to: url });
    }
  };

  const handleBack = useCallback(() => {
    if (canGoBack) {
      navigateBack(windowData.id);
      const prevUrl = history[historyIndex - 1];
      if (prevUrl && prevUrl.startsWith('/')) {
        navigate({ to: prevUrl });
      }
    }
  }, [canGoBack, navigateBack, windowData.id, history, historyIndex, navigate]);

  const handleForward = useCallback(() => {
    if (canGoForward) {
      navigateForward(windowData.id);
      const nextUrl = history[historyIndex + 1];
      if (nextUrl && nextUrl.startsWith('/')) {
        navigate({ to: nextUrl });
      }
    }
  }, [canGoForward, navigateForward, windowData.id, history, historyIndex, navigate]);

  const handleRefresh = useCallback(() => {
    if (currentUrl) {
      navigateToUrl(windowData.id, currentUrl);
    }
  }, [currentUrl, navigateToUrl, windowData.id]);

  const handleStop = () => {
    // In a real browser, this would stop loading, but with iframe we have limited control
    setIsLoading(false);
  };

  const handleHome = () => {
    navigateToUrl(windowData.id, 'about:blank');
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleBookmarksClick = () => {
    const urlToBookmark = addressBarValue.trim() || currentUrl;
    if (!urlToBookmark) return;

    // Chrome-like behavior: toggle bookmark (add if not bookmarked, remove if bookmarked)
    if (isUrlBookmarked(urlToBookmark, bookmarks)) {
      const location = findBookmarkLocation(urlToBookmark, bookmarks);
      handleRemoveBookmark(urlToBookmark, location?.folderName);
    } else {
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
    const urlToUse = addressBarValue.trim() || currentUrl;
    if (!urlToUse) return '';
    return getHostnameFromUrl(urlToUse);
  };

  const getBookmarkUrl = () => {
    return addressBarValue.trim() || currentUrl;
  };

  useEffect(() => {
    if (!isActive) return;

    if (routeNavigationWindowId === windowData.id) return;

    const browserUrl = currentUrl && currentUrl !== 'about:blank' ? currentUrl : '';
    const siteUrl = browserUrl ? `/browser?url=${encodeURIComponent(browserUrl)}` : '/browser';

    navigate({
      to: siteUrl,
      replace: true,
    });
  }, [isActive, currentUrl, navigate, routeNavigationWindowId, windowData.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        const addressBar = document.querySelector(
          `#browser-${windowData.id} input[type="text"]`
        ) as HTMLInputElement;
        addressBar?.focus();
      }

      // Only intercept Cmd+R if Shift is NOT held (Shift+Cmd+R = hard refresh)
      // and focus is within browser window (allows normal refresh when not focused)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r' && !e.shiftKey) {
        const activeElement = document.activeElement;
        const browserElement = document.querySelector(`#browser-${windowData.id}`);
        const isFocusedInBrowser =
          activeElement &&
          browserElement &&
          (browserElement.contains(activeElement) ||
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA');

        if (isFocusedInBrowser) {
          e.preventDefault();
          handleRefresh();
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        handleBack();
      }

      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        handleForward();
      }
    };

    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActive,
    windowData.id,
    canGoBack,
    canGoForward,
    currentUrl,
    handleBack,
    handleForward,
    handleRefresh,
  ]);

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
        <div ref={toolbarRef} className="relative z-20">
          <BrowserToolbar
            url={currentUrl}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            isLoading={isLoading}
            browsingHistory={browsingHistory}
            onNavigate={(url) => handleNavigate(url, undefined, 'user')}
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

        {/* z-10 allows dropdown to render over content below */}
        <div className="relative z-10">
          <BrowserBookmarksBar
            bookmarks={bookmarks}
            onNavigate={(url) => handleNavigate(url, undefined, 'user')}
          />
        </div>

        <div className="relative z-0 flex-1 overflow-hidden">
          <BrowserContent
            url={currentUrl}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onUrlChange={(newUrl) => {
              // Only update if different to avoid unnecessary re-renders from iframe navigation
              if (newUrl !== currentUrl) {
                handleNavigate(newUrl, undefined, 'internal');
              }
            }}
          />
        </div>

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
