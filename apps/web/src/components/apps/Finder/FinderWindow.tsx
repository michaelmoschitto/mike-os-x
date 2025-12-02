import { useNavigate } from '@tanstack/react-router';
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
import { getRouteStrategy } from '@/lib/routing/windowRouteStrategies';
import { validateAndNormalizeUrl } from '@/lib/utils';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface FinderWindowProps {
  window: WindowType;
  isActive: boolean;
}

const FinderWindow = ({ window: windowData, isActive }: FinderWindowProps) => {
  const navigate = useNavigate();
  const { updateWindow, openWindowFromUrl } = useWindowStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const windowTitle =
    windowData.title === 'Finder' || !windowData.title ? 'Finder' : windowData.title;
  const currentPath = windowData.currentPath || '/home';
  const viewMode = windowData.viewMode || 'icon';
  const navigationHistory = windowData.navigationHistory || [currentPath];
  const navigationIndex = windowData.navigationIndex ?? navigationHistory.length - 1;

  const routeStrategy = getRouteStrategy('finder');
  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
      routeStrategy,
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
          navigate({ to: '/browser', search: { url: validatedUrl } });
        } else {
          console.error('Invalid URL in shortcut file:', targetUrl);
        }
      }
      return;
    }

    setLoadingFile(item.path);

    try {
      let content = '';

      if (entry.appType === 'pdfviewer') {
        content = '';
      } else if (
        entry.appType === 'browser' &&
        ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(
          entry.fileExtension.toLowerCase()
        )
      ) {
        content = '';
      } else {
        const loaded = await loadContentFile(entry.filePath);
        content = loaded.content;
      }

      openWindowFromUrl(item.path, content, {
        appType: entry.appType,
        metadata: entry.metadata,
        fileExtension: entry.fileExtension,
      });
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
