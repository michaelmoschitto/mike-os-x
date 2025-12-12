import { serializeWindow, type WindowConfig } from '@/lib/routing/windowSerialization';
import {
  getWindowTypeStrategy,
  getStrategyForIdentifier,
} from '@/lib/routing/windowTypeStrategies';
import type { Window } from '@/stores/useWindowStore';

/**
 * Window store interface for reconciliation operations
 */
export interface WindowStoreActions {
  openWindow: (
    w: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }
  ) => void;
  closeWindow: (id: string) => void;
  updateWindow: (
    id: string,
    updates: Partial<Window>,
    options?: { skipRouteSync?: boolean }
  ) => void;
  focusWindow: (id: string) => void;
  windows: Window[];
  updateMaxZIndex: () => void;
  getWindows: () => Window[];
}

/**
 * Check if a window needs updating based on config
 */
function needsUpdate(currentWindow: Window, newConfig: Partial<Window>): boolean {
  const strategy = getWindowTypeStrategy(currentWindow.type);

  if (strategy.needsUpdate(currentWindow, newConfig)) {
    return true;
  }

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

  // (ex: photos only one instance allowed)
  const windowsRequiringSpecialReconciliation = visibleWindows.filter((w) => {
    const strategy = getWindowTypeStrategy(w.type);
    return strategy.requiresSpecialReconciliation === true;
  });

  for (const specialWindow of windowsRequiringSpecialReconciliation) {
    const strategy = getWindowTypeStrategy(specialWindow.type);
    const specialConfigs = urlWindowConfigs.filter((c) => {
      const configStrategy = getStrategyForIdentifier(c.identifier);
      return configStrategy === strategy;
    });

    if (specialConfigs.length > 0) {
      const specialConfig = specialConfigs[specialConfigs.length - 1];

      if (needsUpdate(specialWindow, specialConfig.config)) {
        windowStore.updateWindow(specialWindow.id, specialConfig.config, {
          skipRouteSync: true,
        });
      }
      if (urlWindowConfigs[urlWindowConfigs.length - 1].identifier === specialConfig.identifier) {
        windowStore.focusWindow(specialWindow.id);
      }

      urlWindowConfigs = urlWindowConfigs.filter((c) => c.identifier !== specialConfig.identifier);
      const specialIdentifier = serializeWindow(specialWindow);
      if (specialIdentifier) {
        currentMap.delete(specialIdentifier);
      }
    } else {
      windowStore.closeWindow(specialWindow.id);
      const specialIdentifier = serializeWindow(specialWindow);
      if (specialIdentifier) {
        currentMap.delete(specialIdentifier);
      }
    }
  }

  const toClose: Window[] = [];
  for (const window of visibleWindows) {
    const strategy = getWindowTypeStrategy(window.type);
    if (strategy.requiresSpecialReconciliation === true) {
      continue;
    }

    const identifier = serializeWindow(window);
    if (identifier && !urlMap.has(identifier)) {
      toClose.push(window);
    }
  }

  const toOpen: WindowConfig[] = [];
  for (const config of urlWindowConfigs) {
    if (!currentMap.has(config.identifier)) {
      toOpen.push(config);
    }
  }

  const toUpdate: Array<{ window: Window; config: Partial<Window> }> = [];
  for (const config of urlWindowConfigs) {
    const currentWindow = currentMap.get(config.identifier);
    if (currentWindow && needsUpdate(currentWindow, config.config)) {
      toUpdate.push({ window: currentWindow, config: config.config });
    }
  }

  for (const window of toClose) {
    windowStore.closeWindow(window.id);
  }

  for (const { window, config } of toUpdate) {
    windowStore.updateWindow(window.id, config, { skipRouteSync: true });
  }

  for (const config of toOpen) {
    windowStore.openWindow(config.config);
  }

  // Reassign z-index values based on URL order
  // The last window in the URL should have the highest z-index
  if (urlWindowConfigs.length > 0) {
    // Use getWindows() to get fresh window data after opening new windows
    const allCurrentWindows = windowStore.getWindows().filter((w) => !w.isMinimized);
    const windowByIdentifier = new Map<string, Window>();

    for (const window of allCurrentWindows) {
      const identifier = serializeWindow(window);
      if (identifier) {
        windowByIdentifier.set(identifier, window);
      }
    }

    // Assign z-index values based on URL order starting from a fresh base
    // This ensures proper sequential ordering without conflicts
    const baseZIndex = 100;
    const lastIdentifier = urlWindowConfigs[urlWindowConfigs.length - 1].identifier;

    // Assign all windows except the last sequential z-index values
    for (let i = 0; i < urlWindowConfigs.length - 1; i++) {
      const config = urlWindowConfigs[i];
      const window = windowByIdentifier.get(config.identifier);
      if (window) {
        const newZIndex = baseZIndex + i;
        if (window.zIndex !== newZIndex) {
          windowStore.updateWindow(window.id, { zIndex: newZIndex }, { skipRouteSync: true });
        }
      }
    }

    // Update the store's maxZIndex to reflect the reassigned values
    // This ensures focusWindow uses the correct base
    windowStore.updateMaxZIndex();

    // Handle special reconciliation windows (like photos)
    const lastConfigStrategy = getStrategyForIdentifier(lastIdentifier);

    if (lastConfigStrategy?.requiresSpecialReconciliation) {
      const specialWindow = allCurrentWindows.find((w) => {
        const strategy = getWindowTypeStrategy(w.type);
        return strategy === lastConfigStrategy;
      });
      if (specialWindow) {
        // focusWindow will set this to maxZIndex + 1, ensuring it's on top
        windowStore.focusWindow(specialWindow.id);
        return;
      }
    }

    // Focus the last window in URL, which will give it the highest z-index (maxZIndex + 1)
    const lastWindow = windowByIdentifier.get(lastIdentifier);
    if (lastWindow) {
      windowStore.focusWindow(lastWindow.id);
      return;
    }

    // Fallback: focus last visible window
    if (allCurrentWindows.length > 0) {
      windowStore.focusWindow(allCurrentWindows[allCurrentWindows.length - 1].id);
    }
  }
}
