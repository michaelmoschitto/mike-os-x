import { useNavigate } from '@tanstack/react-router';

import { serializeWindowsToUrl } from '@/lib/routing/windowSerialization';
import type { Window } from '@/stores/useWindowStore';

interface SyncOptions {
  replace?: boolean;
}

/**
 * Hook for synchronizing window state to URL using TanStack Router navigation.
 * Provides SPA navigation (no page reload) while maintaining browser history.
 *
 * This replaces direct `window.location.href` usage for better performance
 * and consistency with the rest of the application.
 */
export const useWindowUrlSync = () => {
  const navigate = useNavigate();

  const syncWindowsToUrl = (windows: Window[], options?: SyncOptions) => {
    const url = serializeWindowsToUrl(windows);
    const urlObj = new URL(url, window.location.origin);
    const searchParams = new URLSearchParams(urlObj.search);
    const windowIdentifiers = searchParams.getAll('w');
    const stateParam = searchParams.get('state');

    navigate({
      to: '/',
      search: {
        w: windowIdentifiers.length > 0 ? windowIdentifiers : undefined,
        state: stateParam || undefined,
      },
      replace: options?.replace ?? false,
    });
  };

  return { syncWindowsToUrl };
};
