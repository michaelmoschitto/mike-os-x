import { useEffect, useMemo, useState } from 'react';

import FinderColumnView from '@/components/apps/Finder/FinderColumnView';
import FinderIconView from '@/components/apps/Finder/FinderIconView';
import FinderListView from '@/components/apps/Finder/FinderListView';
import FinderToolbar from '@/components/apps/Finder/FinderToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';
import { getFolderContents, type FinderItemData } from '@/lib/finderContent';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { validateAndNormalizeUrl } from '@/lib/utils';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface FinderWindowProps {
  window: WindowType;
  isActive: boolean;
}

const FinderWindow = ({ window: windowData, isActive }: FinderWindowProps) => {
  const { updateWindow, openWindowFromUrl, navigateToUrl, getOrCreateBrowserWindow } =
    useWindowStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const windowTitle =
    windowData.title === 'Finder' || !windowData.title ? 'Finder' : windowData.title;
  const currentPath = windowData.currentPath || '/home';
  const viewMode = windowData.viewMode || 'icon';
  const navigationHistory = windowData.navigationHistory || [currentPath];
  const navigationIndex = windowData.navigationIndex ?? navigationHistory.length - 1;

  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const items = useMemo(() => {
    if (!useContentIndex.getState().isIndexed) {
      return [];
    }
    return getFolderContents(currentPath);
  }, [currentPath]);

  const canGoBack = navigationIndex > 0;
  const canGoForward = navigationIndex < navigationHistory.length - 1;

  const handleNavigate = (path: string) => {
    const newHistory = navigationHistory.slice(0, navigationIndex + 1);
    newHistory.push(path);

    updateWindow(windowData.id, {
      currentPath: path,
      navigationHistory: newHistory,
      navigationIndex: newHistory.length - 1,
    });
    setSelectedId(null);
  };

  const handleBack = () => {
    if (canGoBack) {
      const newIndex = navigationIndex - 1;
      const newPath = navigationHistory[newIndex];
      updateWindow(windowData.id, {
        currentPath: newPath,
        navigationIndex: newIndex,
      });
      setSelectedId(null);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      const newIndex = navigationIndex + 1;
      const newPath = navigationHistory[newIndex];
      updateWindow(windowData.id, {
        currentPath: newPath,
        navigationIndex: newIndex,
      });
      setSelectedId(null);
    }
  };

  const handleViewModeChange = (mode: 'icon' | 'list' | 'column') => {
    updateWindow(windowData.id, { viewMode: mode });
  };

  const handleOpen = async (item: FinderItemData) => {
    if (item.type === 'folder') {
      handleNavigate(item.path);
      return;
    }

    const entry = useContentIndex.getState().getEntry(item.path);
    if (!entry) {
      return;
    }

    // Handle shortcut files - navigate to browser with URL
    if (entry.appType === 'shortcut') {
      const targetUrl = entry.metadata.url;
      if (targetUrl) {
        const validatedUrl = validateAndNormalizeUrl(targetUrl);
        if (validatedUrl) {
          const browserWindow = getOrCreateBrowserWindow(validatedUrl);
          navigateToUrl(browserWindow.id, validatedUrl);
        } else {
          console.error('Invalid URL in shortcut file:', targetUrl);
        }
      }
      return;
    }

    setLoadingFile(item.path);

    try {
      // Get existing windows from URL, handling TanStack Router's JSON serialization
      const currentParams = new URLSearchParams(window.location.search);
      const rawWindows = currentParams.getAll('w');

      const existingWindows: string[] = [];
      for (const w of rawWindows) {
        if (w.startsWith('[') && w.endsWith(']')) {
          try {
            const parsed = JSON.parse(w);
            if (Array.isArray(parsed)) {
              existingWindows.push(...parsed);
            } else {
              existingWindows.push(w);
            }
          } catch {
            existingWindows.push(w);
          }
        } else {
          existingWindows.push(w);
        }
      }

      // Build window identifier based on appType
      const normalizedPath = item.path.startsWith('/') ? item.path.slice(1) : item.path;
      let windowIdentifier: string;

      if (entry.appType === 'photos') {
        // Photos use format: photos:album:photoName (without extension)
        const pathParts = normalizedPath.split('/').filter(Boolean);
        if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
          const albumName = pathParts[2];
          const photoName = pathParts[pathParts.length - 1].replace(
            /\.(jpg|jpeg|png|gif|webp|svg)$/i,
            ''
          );
          windowIdentifier = `photos:${albumName}:${photoName}`;
        } else {
          const photoName = pathParts[pathParts.length - 1].replace(
            /\.(jpg|jpeg|png|gif|webp|svg)$/i,
            ''
          );
          windowIdentifier = `photos:desktop:${photoName}`;
        }
      } else if (entry.appType === 'pdfviewer' || entry.appType === 'pdf') {
        windowIdentifier = `pdfviewer:${normalizedPath}`;
      } else if (entry.appType === 'browser') {
        // For browser type (images), use browser window
        windowIdentifier = `browser:${normalizedPath}`;
      } else {
        // Text files and other content
        windowIdentifier = `textedit:${normalizedPath}`;
      }

      // Append new window to existing windows and navigate
      const allWindows = [...existingWindows, windowIdentifier];
      window.location.href = '/?w=' + allWindows.join('&w=');
    } catch (error) {
      console.error('Failed to open file:', error);
    } finally {
      setLoadingFile(null);
    }
  };

  useEffect(() => {
    if (!useContentIndex.getState().isIndexed) {
      import('@/lib/contentIndex').then(({ initializeContentIndex }) => {
        initializeContentIndex();
      });
    }
  }, []);

  return (
    <Window
      id={windowData.id}
      title={windowTitle}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onFocus={handleFocus}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
    >
      <div className="relative flex h-full flex-col">
        <FinderToolbar
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          viewMode={viewMode}
          onBack={handleBack}
          onForward={handleForward}
          onViewModeChange={handleViewModeChange}
        />
        {viewMode === 'icon' && (
          <FinderIconView
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={handleOpen}
          />
        )}
        {viewMode === 'list' && (
          <FinderListView
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={handleOpen}
          />
        )}
        {viewMode === 'column' && (
          <FinderColumnView
            currentPath={currentPath}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={handleOpen}
            onNavigate={handleNavigate}
          />
        )}
        {loadingFile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-8 w-8">
                <div
                  className="absolute inset-0 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
                  style={{ animationDuration: '0.8s' }}
                />
              </div>
              <p className="font-ui text-sm text-[var(--color-text-primary)]">Opening file...</p>
            </div>
          </div>
        )}
      </div>
    </Window>
  );
};

export default FinderWindow;
