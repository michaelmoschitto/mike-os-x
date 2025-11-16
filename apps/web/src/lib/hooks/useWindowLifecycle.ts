import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import type { WindowRouteStrategy } from '@/lib/routing/windowRouteStrategies';
import type { Window } from '@/stores/useWindowStore';
import { useWindowStore } from '@/stores/useWindowStore';

interface UseWindowLifecycleOptions {
  window: Window;
  isActive: boolean;
  routeStrategy: WindowRouteStrategy;
}

export const useWindowLifecycle = ({
  window: windowData,
  isActive,
  routeStrategy,
}: UseWindowLifecycleOptions) => {
  const navigate = useNavigate();
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    routeNavigationWindowId,
    getRouteToNavigateOnClose,
  } = useWindowStore();

  const handleClose = () => {
    const routeToNavigate = getRouteToNavigateOnClose(windowData.id);
    closeWindow(windowData.id);
    if (routeToNavigate) {
      navigate({ to: routeToNavigate, replace: true });
    }
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
    if (!routeStrategy.shouldSyncRoute(windowData)) return;
    if (routeNavigationWindowId === windowData.id) return;

    const route = routeStrategy.getRouteForWindow(windowData);
    navigate({
      to: route,
      replace: true,
    });
  }, [isActive, windowData, routeStrategy, navigate, routeNavigationWindowId]);

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
