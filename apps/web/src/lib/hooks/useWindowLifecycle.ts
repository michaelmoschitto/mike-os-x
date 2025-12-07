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

  return {
    handleClose,
    handleFocus,
    handleMinimize,
    handleDragEnd,
    handleResize,
  };
};
