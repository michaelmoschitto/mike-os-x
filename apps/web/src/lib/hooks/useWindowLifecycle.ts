import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

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
  const lastHandledRouteRef = useRef<string | null>(null);
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    clearRouteSyncFlag,
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

    const route = routeStrategy.getRouteForWindow(windowData);
    const targetPath = route.split('?')[0];
    const targetSearch = route.includes('?') ? route.split('?')[1] : '';
    const targetRoute = `${targetPath}${targetSearch ? `?${targetSearch}` : ''}`;

    const currentSkipFlag = useWindowStore.getState().skipNextRouteSync[windowData.id];
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;

    if (currentSkipFlag) {
      const normalizedCurrent = currentPath.replace(/\/$/, '');
      const normalizedTarget = targetPath.replace(/\/$/, '');

      if (
        normalizedCurrent === normalizedTarget &&
        currentSearch === (targetSearch ? `?${targetSearch}` : '')
      ) {
        lastHandledRouteRef.current = targetRoute;
        clearRouteSyncFlag(windowData.id);
      }
      return;
    }

    if (lastHandledRouteRef.current === targetRoute) {
      return;
    }

    const normalizedCurrent = currentPath.replace(/\/$/, '');
    const normalizedTarget = targetPath.replace(/\/$/, '');

    if (
      normalizedCurrent === normalizedTarget &&
      currentSearch === (targetSearch ? `?${targetSearch}` : '')
    ) {
      lastHandledRouteRef.current = targetRoute;
      return;
    }

    lastHandledRouteRef.current = targetRoute;
    navigate({
      to: route,
      replace: true,
    });
  }, [isActive, windowData, routeStrategy, navigate, clearRouteSyncFlag]);

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
