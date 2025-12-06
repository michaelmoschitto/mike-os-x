import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { serializeWindowsToUrl } from '@/lib/routing/windowSerialization';
import type { Window } from '@/stores/useWindowStore';
import { useWindowStore } from '@/stores/useWindowStore';

const areRoutesEqual = (
  currentPath: string,
  currentSearch: string,
  targetPath: string,
  targetSearch: string
): boolean => {
  const normalizedCurrent = currentPath.replace(/\/$/, '');
  const normalizedTarget = targetPath.replace(/\/$/, '');
  const normalizedCurrentSearch = currentSearch || '';
  const normalizedTargetSearch = targetSearch ? `?${targetSearch}` : '';

  return (
    normalizedCurrent === normalizedTarget && normalizedCurrentSearch === normalizedTargetSearch
  );
};

interface UseWindowLifecycleOptions {
  window: Window;
  isActive: boolean;
}

export const useWindowLifecycle = ({
  window: windowData,
  isActive,
}: UseWindowLifecycleOptions) => {
  const navigate = useNavigate();
  const lastHandledRouteRef = useRef<string | null>(null);
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    clearRouteSyncFlag,
    getMultiWindowUrlOnClose,
  } = useWindowStore();

  const handleClose = () => {
    console.log('[useWindowLifecycle] handleClose called for window:', windowData.id);
    const newUrl = getMultiWindowUrlOnClose(windowData.id);
    console.log('[useWindowLifecycle] New URL after close:', newUrl);
    closeWindow(windowData.id);
    console.log('[useWindowLifecycle] Navigating to:', newUrl);
    navigate({ to: newUrl, replace: true });
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

  useEffect(() => {
    if (!isActive) return;
    
    // Check if this window still exists in the store (prevent running after close)
    const allWindows = useWindowStore.getState().windows;
    const windowStillExists = allWindows.some(w => w.id === windowData.id);
    
    if (!windowStillExists) {
      console.log('[useWindowLifecycle] Window no longer exists, skipping URL sync');
      return;
    }

    // Get all visible windows and generate multi-window URL
    const visibleWindows = useWindowStore.getState().getVisibleWindows();
    const targetRoute = serializeWindowsToUrl(visibleWindows);
    
    console.log('[useWindowLifecycle] URL sync effect running for window:', windowData.id, {
      visibleWindowsCount: visibleWindows.length,
      targetRoute,
      currentUrl: window.location.pathname + window.location.search
    });
    
    // Split URL for comparison purposes only (don't reconstruct!)
    const [targetPath, ...searchParts] = targetRoute.split('?');
    const targetSearch = searchParts.join('?'); // Handle edge case of ? in params

    // Check skip flag
    const currentSkipFlag = useWindowStore.getState().skipNextRouteSync[windowData.id];
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search.slice(1); // Remove leading '?'

    const routesAreEqual = areRoutesEqual(currentPath, currentSearch, targetPath, targetSearch);

    if (currentSkipFlag) {
      if (routesAreEqual) {
        lastHandledRouteRef.current = targetRoute;
        clearRouteSyncFlag(windowData.id);
      }
      return;
    }

    if (lastHandledRouteRef.current === targetRoute) {
      return;
    }

    if (routesAreEqual) {
      lastHandledRouteRef.current = targetRoute;
      return;
    }

    lastHandledRouteRef.current = targetRoute;
    console.log('[useWindowLifecycle] Navigating from URL sync effect to:', targetRoute);
    navigate({
      to: targetRoute,
      replace: true,
    });
  }, [
    isActive,
    // Window state that affects URL
    windowData.type,
    windowData.url,
    windowData.urlPath,
    windowData.albumPath,
    windowData.selectedPhotoIndex,
    windowData.currentPath,
    windowData.isMinimized,
    // Listen to all windows for open/close/minimize
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(
      useWindowStore.getState().windows.map(w => ({
        id: w.id,
        type: w.type,
        isMinimized: w.isMinimized,
        url: w.url,
        urlPath: w.urlPath,
      }))
    ),
    navigate,
    clearRouteSyncFlag,
  ]);

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
