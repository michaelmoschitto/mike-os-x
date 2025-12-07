import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { parseWindowIdentifiersFromUrl, serializeWindow } from '@/lib/routing/windowSerialization';
import { getWindowTypeStrategy } from '@/lib/routing/windowTypeStrategies';
import { useWindowStore } from '@/stores/useWindowStore';
import type { Window } from '@/stores/useWindowStore';

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
    const strategy = getWindowTypeStrategy(windowData.type);
    let windowIdentifier = serializeWindow(windowData);

    if (!windowIdentifier && strategy.getFallbackIdentifier) {
      windowIdentifier = strategy.getFallbackIdentifier(windowData);
    }

    closeWindow(windowData.id);

    if (windowIdentifier) {
      // For browser windows, URLSearchParams decodes the URL, so we need to match
      // the decoded version. The serialized identifier has encoded URL, but the
      // URL parameter has decoded URL after URLSearchParams processing.
      if (windowIdentifier.startsWith('browser:')) {
        // Find matching browser window by comparing decoded URLs
        const serializedUrl = windowIdentifier.substring(8);
        const matchingIdentifier = existingWindows.find((id) => {
          if (!id.startsWith('browser:')) return false;
          const urlFromIdentifier = id.substring(8);
          // Compare decoded versions
          try {
            const decodedSerialized = decodeURIComponent(serializedUrl);
            return decodedSerialized === urlFromIdentifier;
          } catch {
            return serializedUrl === urlFromIdentifier;
          }
        });

        if (matchingIdentifier) {
          removeWindow(existingWindows, matchingIdentifier);
        }
      } else if (existingWindows.includes(windowIdentifier)) {
        removeWindow(existingWindows, windowIdentifier);
      }
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
