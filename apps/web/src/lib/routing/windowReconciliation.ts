import type { Window } from '@/stores/useWindowStore';
import { serializeWindow, type WindowConfig } from './windowSerialization';

/**
 * Window store interface for reconciliation operations
 */
export interface WindowStoreActions {
  openWindow: (w: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }) => void;
  closeWindow: (id: string) => void;
  updateWindow: (
    id: string,
    updates: Partial<Window>,
    options?: { skipRouteSync?: boolean }
  ) => void;
  focusWindow: (id: string) => void;
  windows: Window[];
}

/**
 * Check if a window needs updating based on config
 */
function needsUpdate(currentWindow: Window, newConfig: Partial<Window>): boolean {
  // Check URL for browser windows
  if (currentWindow.type === 'browser' && newConfig.url) {
    return currentWindow.url !== newConfig.url;
  }

  // Check album/photo for photos windows
  if (currentWindow.type === 'photos') {
    if (newConfig.albumPath && currentWindow.albumPath !== newConfig.albumPath) {
      return true;
    }
    if (
      newConfig.selectedPhotoIndex !== undefined &&
      currentWindow.selectedPhotoIndex !== newConfig.selectedPhotoIndex
    ) {
      return true;
    }
    if (newConfig.urlPath && currentWindow.urlPath !== newConfig.urlPath) {
      return true;
    }
  }

  // Check path for finder windows
  if (currentWindow.type === 'finder' && newConfig.currentPath) {
    return currentWindow.currentPath !== newConfig.currentPath;
  }

  // Check urlPath for content windows
  if (
    (currentWindow.type === 'pdfviewer' || currentWindow.type === 'textedit') &&
    newConfig.urlPath
  ) {
    return currentWindow.urlPath !== newConfig.urlPath;
  }

  // Check position/size if provided (extended state)
  if (newConfig.position) {
    if (
      currentWindow.position.x !== newConfig.position.x ||
      currentWindow.position.y !== newConfig.position.y
    ) {
      return true;
    }
  }

  if (newConfig.size) {
    if (
      currentWindow.size.width !== newConfig.size.width ||
      currentWindow.size.height !== newConfig.size.height
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Reconcile current windows with URL window configurations
 * This function syncs the actual window state with what the URL says should be open
 */
export function reconcileWindowsWithUrl(
  urlWindowConfigs: WindowConfig[],
  windowStore: WindowStoreActions
): void {
  const visibleWindows = windowStore.windows.filter((w) => !w.isMinimized);

  // Create maps for efficient lookup
  const urlMap = new Map<string, WindowConfig>();
  for (const config of urlWindowConfigs) {
    urlMap.set(config.identifier, config);
  }

  const currentMap = new Map<string, Window>();
  for (const window of visibleWindows) {
    const identifier = serializeWindow(window);
    if (identifier) {
      currentMap.set(identifier, window);
    }
  }

  // Special handling for photos - only allow one photos window
  const photosConfigs = urlWindowConfigs.filter((c) => c.identifier.startsWith('photos'));
  const currentPhotosWindow = visibleWindows.find((w) => w.type === 'photos');

  if (photosConfigs.length > 0) {
    // Use the last photos config (most recent in URL)
    const photosConfig = photosConfigs[photosConfigs.length - 1];

    if (currentPhotosWindow) {
      // Update existing photos window if needed
      if (needsUpdate(currentPhotosWindow, photosConfig.config)) {
        windowStore.updateWindow(currentPhotosWindow.id, photosConfig.config, {
          skipRouteSync: true,
        });
      }
      // Focus if it's the last window in URL
      if (urlWindowConfigs[urlWindowConfigs.length - 1].identifier.startsWith('photos')) {
        windowStore.focusWindow(currentPhotosWindow.id);
      }
    } else {
      // Open new photos window
      windowStore.openWindow(photosConfig.config);
    }

    // Remove photos configs from processing (already handled)
    urlWindowConfigs = urlWindowConfigs.filter((c) => !c.identifier.startsWith('photos'));
    if (currentPhotosWindow) {
      const photosIdentifier = serializeWindow(currentPhotosWindow);
      if (photosIdentifier) {
        currentMap.delete(photosIdentifier);
      }
    }
  } else if (currentPhotosWindow) {
    // Photos window exists but not in URL - close it
    windowStore.closeWindow(currentPhotosWindow.id);
  }

  // Find windows to close (in current but not in URL)
  const toClose: Window[] = [];
  for (const window of visibleWindows) {
    if (window.type === 'photos') continue; // Already handled above

    const identifier = serializeWindow(window);
    if (identifier && !urlMap.has(identifier)) {
      toClose.push(window);
    }
  }

  // Find windows to open (in URL but not in current)
  const toOpen: WindowConfig[] = [];
  for (const config of urlWindowConfigs) {
    if (!currentMap.has(config.identifier)) {
      toOpen.push(config);
    }
  }

  // Find windows to update (in both but different state)
  const toUpdate: Array<{ window: Window; config: Partial<Window> }> = [];
  for (const config of urlWindowConfigs) {
    const currentWindow = currentMap.get(config.identifier);
    if (currentWindow && needsUpdate(currentWindow, config.config)) {
      toUpdate.push({ window: currentWindow, config: config.config });
    }
  }

  // 1. Close windows not in URL
  for (const window of toClose) {
    windowStore.closeWindow(window.id);
  }

  // 2. Update existing windows
  for (const { window, config } of toUpdate) {
    windowStore.updateWindow(window.id, config, { skipRouteSync: true });
  }

  // 3. Open new windows
  for (const config of toOpen) {
    windowStore.openWindow(config.config);
  }

  // 4. Focus the last window (if any windows exist)
  if (urlWindowConfigs.length > 0) {
    // Find the actual window instance for the last identifier
    const lastIdentifier = urlWindowConfigs[urlWindowConfigs.length - 1].identifier;

    // Special case for photos
    if (lastIdentifier.startsWith('photos') && currentPhotosWindow) {
      windowStore.focusWindow(currentPhotosWindow.id);
      return;
    }

    // Find matching window
    const allCurrentWindows = windowStore.windows.filter((w) => !w.isMinimized);
    for (const window of allCurrentWindows) {
      const identifier = serializeWindow(window);
      if (identifier === lastIdentifier) {
        windowStore.focusWindow(window.id);
        return;
      }
    }

    // Fallback: focus last visible window
    if (allCurrentWindows.length > 0) {
      windowStore.focusWindow(allCurrentWindows[allCurrentWindows.length - 1].id);
    }
  }
}
