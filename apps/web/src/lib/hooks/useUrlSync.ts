import { useEffect, useRef } from 'react';

import { useWindowUrlSync } from '@/lib/hooks/useWindowUrlSync';
import { serializeWindowsToUrl } from '@/lib/routing/windowSerialization';
import { useWindowStore } from '@/stores/useWindowStore';

/**
 * Centralized hook for synchronizing window state to URL.
 *
 * This hook watches the window store and automatically syncs changes to the URL.
 * It handles the skipNextRouteSync flag pattern to prevent sync loops when
 * windows are updated from URL reconciliation.
 *
 * This should be used once at the root level (e.g., in the main route component)
 * to ensure all window state changes are reflected in the URL.
 */
export const useUrlSync = () => {
  const windows = useWindowStore((state) => state.windows);
  const skipNextRouteSync = useWindowStore((state) => state.skipNextRouteSync);
  const clearRouteSyncFlag = useWindowStore((state) => state.clearRouteSyncFlag);
  const { syncWindowsToUrl } = useWindowUrlSync();

  const prevWindowsSerializedRef = useRef<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount - URL is already set from route loader
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevWindowsSerializedRef.current = serializeWindowsToUrl(windows);
      return;
    }

    // Check if any windows have skipNextRouteSync flag set
    const hasSkipFlags = Object.keys(skipNextRouteSync).length > 0;

    if (hasSkipFlags) {
      // Clear all skip flags - they've served their purpose
      Object.keys(skipNextRouteSync).forEach((windowId) => {
        clearRouteSyncFlag(windowId);
      });
      // Update ref to prevent re-sync on next render
      prevWindowsSerializedRef.current = serializeWindowsToUrl(windows);
      return;
    }

    // Serialize current windows to get URL representation
    const currentUrl = serializeWindowsToUrl(windows);
    const prevUrl = prevWindowsSerializedRef.current;

    // Only sync if URL actually changed
    if (currentUrl !== prevUrl) {
      syncWindowsToUrl(windows);
    }

    // Update ref for next comparison
    prevWindowsSerializedRef.current = currentUrl;
  }, [windows, skipNextRouteSync, clearRouteSyncFlag, syncWindowsToUrl]);
};
