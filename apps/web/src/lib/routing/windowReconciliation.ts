import { WINDOW_Z_INDEX } from '@/lib/constants/windowZIndex';
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
  getWindows: () => Window[];
  updateMaxZIndex: () => void;
}

/**
 * Reassigns z-index values to windows based on URL order.
 *
 * This function ensures proper window stacking after reconciliation:
 * 1. Windows earlier in the URL get lower z-indices (BASE, BASE+1, BASE+2, ...)
 * 2. All but the last window get sequential z-indices
 * 3. The last window gets focused, which assigns it maxZIndex + 1 (top of stack)
 *
 * Special cases:
 * - Singleton windows (like Photos) use requiresSpecialReconciliation pattern
 * - Must use getWindows() to fetch fresh state after opening new windows
 *
 * @param urlWindowConfigs - Window configurations from URL, in order
 * @param windowStore - Window store actions for state access and updates
 */
function reassignWindowZIndices(
  urlWindowConfigs: WindowConfig[],
  windowStore: WindowStoreActions
): void {
  const allCurrentWindows = windowStore.getWindows().filter((w) => !w.isMinimized);
  const windowByIdentifier = new Map<string, Window>();

  for (const window of allCurrentWindows) {
    const identifier = serializeWindow(window);
    if (identifier) {
      windowByIdentifier.set(identifier, window);
    }
  }

  const lastIdentifier = urlWindowConfigs[urlWindowConfigs.length - 1].identifier;

  for (let i = 0; i < urlWindowConfigs.length - 1; i++) {
    const config = urlWindowConfigs[i];
    const window = windowByIdentifier.get(config.identifier);
    if (window) {
      const newZIndex = WINDOW_Z_INDEX.BASE + i;
      if (window.zIndex !== newZIndex) {
        windowStore.updateWindow(window.id, { zIndex: newZIndex }, { skipRouteSync: true });
      }
    }
  }

  windowStore.updateMaxZIndex();

  const lastConfigStrategy = getStrategyForIdentifier(lastIdentifier);
  if (lastConfigStrategy?.requiresSpecialReconciliation) {
    const specialWindow = allCurrentWindows.find((w) => {
      const strategy = getWindowTypeStrategy(w.type);
      return strategy === lastConfigStrategy;
    });
    if (specialWindow) {
      windowStore.focusWindow(specialWindow.id);
      return;
    }
  }

  const lastWindow = windowByIdentifier.get(lastIdentifier);
  if (lastWindow) {
    windowStore.focusWindow(lastWindow.id);
    return;
  }

  if (allCurrentWindows.length > 0) {
    windowStore.focusWindow(allCurrentWindows[allCurrentWindows.length - 1].id);
  }
}

/**
 * Check if a window needs updating based on config
 */
function needsUpdate(
  currentWindow: Window,
  newConfig: Partial<Window>,
  hasExplicitPosition: boolean = false
): boolean {
  const strategy = getWindowTypeStrategy(currentWindow.type);

  if (strategy.needsUpdate(currentWindow, newConfig)) {
    return true;
  }

  // Only check position/size if they were explicitly provided in the URL (extended state format)
  // Simple format uses default positions which shouldn't override user-dragged positions
  if (hasExplicitPosition) {
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
  }

  return false;
}

/**
 * Reconcile current windows with URL window configurations.
 * This function syncs the actual window state with what the URL says should be open.
 *
 * Reconciliation flow:
 * 1. Handle special windows (photos) that follow singleton pattern
 * 2. Close windows not in URL
 * 3. Update existing windows with new config
 * 4. Open new windows from URL
 * 5. Reassign z-indices based on URL order (last window on top)
 *
 * @param urlWindowConfigs - Window configurations parsed from URL
 * @param windowStore - Window store actions for state access and updates
 */
export function reconcileWindowsWithUrl(
  urlWindowConfigs: WindowConfig[],
  windowStore: WindowStoreActions
): void {
  const visibleWindows = windowStore.getWindows().filter((w) => !w.isMinimized);

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

      if (needsUpdate(specialWindow, specialConfig.config, specialConfig.hasExplicitPosition)) {
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
    if (currentWindow && needsUpdate(currentWindow, config.config, config.hasExplicitPosition)) {
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

  if (urlWindowConfigs.length > 0) {
    reassignWindowZIndices(urlWindowConfigs, windowStore);
  }
}
