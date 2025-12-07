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
}

/**
 * Check if a window needs updating based on config
 */
function needsUpdate(currentWindow: Window, newConfig: Partial<Window>): boolean {
  const strategy = getWindowTypeStrategy(currentWindow.type);

  // Check type-specific updates using strategy
  if (strategy.needsUpdate(currentWindow, newConfig)) {
    return true;
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

  // Special handling for windows that require special reconciliation
  // (e.g., photos - only one instance allowed)
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
      // Use the last config (most recent in URL)
      const specialConfig = specialConfigs[specialConfigs.length - 1];

      // Update existing window if needed
      if (needsUpdate(specialWindow, specialConfig.config)) {
        windowStore.updateWindow(specialWindow.id, specialConfig.config, {
          skipRouteSync: true,
        });
      }
      // Focus if it's the last window in URL
      if (urlWindowConfigs[urlWindowConfigs.length - 1].identifier === specialConfig.identifier) {
        windowStore.focusWindow(specialWindow.id);
      }

      // Remove special configs from processing (already handled)
      urlWindowConfigs = urlWindowConfigs.filter((c) => c.identifier !== specialConfig.identifier);
      const specialIdentifier = serializeWindow(specialWindow);
      if (specialIdentifier) {
        currentMap.delete(specialIdentifier);
      }
    } else {
      // Special window exists but not in URL - close it
      windowStore.closeWindow(specialWindow.id);
      const specialIdentifier = serializeWindow(specialWindow);
      if (specialIdentifier) {
        currentMap.delete(specialIdentifier);
      }
    }
  }

  // Find windows to close (in current but not in URL)
  const toClose: Window[] = [];
  for (const window of visibleWindows) {
    // Skip windows that require special reconciliation (already handled above)
    const strategy = getWindowTypeStrategy(window.type);
    if (strategy.requiresSpecialReconciliation === true) {
      continue;
    }

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
    const lastConfigStrategy = getStrategyForIdentifier(lastIdentifier);

    // Special case: if last window requires special reconciliation, find it by type
    if (lastConfigStrategy?.requiresSpecialReconciliation) {
      const allCurrentWindows = windowStore.windows.filter((w) => !w.isMinimized);
      const specialWindow = allCurrentWindows.find((w) => {
        const strategy = getWindowTypeStrategy(w.type);
        return strategy === lastConfigStrategy;
      });
      if (specialWindow) {
        windowStore.focusWindow(specialWindow.id);
        return;
      }
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
