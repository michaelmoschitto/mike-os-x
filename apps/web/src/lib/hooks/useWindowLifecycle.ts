import type { Window } from '@/stores/useWindowStore';
import { useWindowStore } from '@/stores/useWindowStore';

interface UseWindowLifecycleOptions {
  window: Window;
  isActive: boolean;
}

export const useWindowLifecycle = ({
  window: windowData,
  isActive: _isActive,
}: UseWindowLifecycleOptions) => {
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    getMultiWindowUrlOnClose,
  } = useWindowStore();

  const handleClose = () => {
    const newUrl = getMultiWindowUrlOnClose(windowData.id);
    closeWindow(windowData.id);
    
    // Use window.location for reliable URL navigation
    window.location.href = newUrl;
  };

  const handleFocus = () => {
    focusWindow(windowData.id);
  };

  const handleMinimize = () => {
    minimizeWindow(windowData.id);
  };

  const handleDragEnd = (position: { x: number; y: number }) => {
    updateWindowPosition(windowData.id, position);
  };

  const handleResize = (size: { width: number; height: number }) => {
    updateWindowSize(windowData.id, size);
  };

  // TEMPORARILY DISABLED - Testing URL-first architecture
  // URL sync removed - windows don't push to URL, only read from it via route loader
  // Smart URL sync: Keep URL in sync with window state without causing loops
  // This runs when window state changes and updates the URL accordingly
  // useEffect(() => {
  //   if (!isActive) return;

  //   // Skip if we're in the middle of closing (handleClose will handle URL)
  //   if (isClosingRef.current) {
  //     console.log('[useWindowLifecycle] Window is closing, letting handleClose manage URL');
  //     return;
  //   }

  //   // Check if this window still exists in the store
  //   const allWindows = useWindowStore.getState().windows;
  //   const windowStillExists = allWindows.some(w => w.id === windowData.id);
    
  //   if (!windowStillExists) {
  //     console.log('[useWindowLifecycle] Window no longer exists, skipping URL sync');
  //     return;
  //   }

  //   // Get all visible windows and generate the target URL
  //   const visibleWindows = getVisibleWindows();
  //   const targetUrl = serializeWindowsToUrl(visibleWindows);
  //   const currentUrl = window.location.pathname + window.location.search;
    
  //   console.log('[useWindowLifecycle] URL sync check:', {
  //     windowId: windowData.id,
  //     targetUrl,
  //     currentUrl,
  //     lastSynced: lastSyncedUrl.current,
  //   });

  //   // Skip if URL already matches (prevent unnecessary navigation)
  //   if (currentUrl === targetUrl) {
  //     lastSyncedUrl.current = targetUrl;
  //     return;
  //   }

  //   // Skip if we just synced to this URL (prevent oscillation)
  //   if (lastSyncedUrl.current === targetUrl) {
  //     console.log('[useWindowLifecycle] Already synced to this URL, skipping');
  //     return;
  //   }

  //   // Update the URL to match window state
  //   lastSyncedUrl.current = targetUrl;
  //   console.log('[useWindowLifecycle] Syncing URL to:', targetUrl);
    
  //   // Parse URL into path and search params for TanStack Router
  //   const [path, searchString] = targetUrl.split('?');
  //   const searchParams = new URLSearchParams(searchString || '');
    
  //   // Convert to object format that TanStack Router expects
  //   const searchObject: Record<string, string | string[]> = {};
  //   searchParams.forEach((value, key) => {
  //     const existing = searchObject[key];
  //     if (existing) {
  //       searchObject[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  //     } else {
  //       searchObject[key] = value;
  //     }
  //   });
    
  //   navigate({ 
  //     to: path || '/',
  //     search: Object.keys(searchObject).length > 0 ? searchObject : undefined,
  //     replace: true 
  //   });
  // }, [
  //   isActive,
  //   // Track window state changes that affect URL
  //   windowData.type,
  //   windowData.url,
  //   windowData.urlPath,
  //   windowData.albumPath,
  //   windowData.selectedPhotoIndex,
  //   windowData.currentPath,
  //   windowData.isMinimized,
  //   // Track all windows (for multi-window serialization)
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   JSON.stringify(
  //     useWindowStore.getState().windows.map(w => ({
  //       id: w.id,
  //       type: w.type,
  //       isMinimized: w.isMinimized,
  //       url: w.url,
  //       urlPath: w.urlPath,
  //       currentPath: w.currentPath,
  //       albumPath: w.albumPath,
  //       selectedPhotoIndex: w.selectedPhotoIndex,
  //     }))
  //   ),
  //   navigate,
  //   getVisibleWindows,
  // ]);

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
