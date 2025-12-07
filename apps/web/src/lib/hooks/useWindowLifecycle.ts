import type { Window } from '@/stores/useWindowStore';
import { useWindowStore } from '@/stores/useWindowStore';
import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { parseWindowIdentifiersFromUrl } from '@/lib/routing/windowSerialization';
import { serializeWindow } from '@/lib/routing/windowSerialization';

interface UseWindowLifecycleOptions {
  window: Window;
  isActive: boolean;
}

export const useWindowLifecycle = ({
  window: windowData,
  isActive: _isActive,
}: UseWindowLifecycleOptions) => {
  const { closeWindow, focusWindow, updateWindowPosition, updateWindowSize, minimizeWindow } =
    useWindowStore();
  const { removeWindow } = useWindowNavigation();

  const handleClose = () => {
    const existingWindows = parseWindowIdentifiersFromUrl();
    const windowIdentifier = serializeWindow(windowData);

    closeWindow(windowData.id);

    if (windowIdentifier && existingWindows.includes(windowIdentifier)) {
      removeWindow(existingWindows, windowIdentifier);
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

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
