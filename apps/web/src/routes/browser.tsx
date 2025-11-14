import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import Desktop from '@/components/system/Desktop';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/browser')({
  component: BrowserRouteComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      url: (search.url as string) || undefined,
    };
  },
});

function BrowserRouteComponent() {
  const { getOrCreateBrowserWindow, focusWindow, navigateToUrl } = useWindowStore();
  const { url } = Route.useSearch();

  useEffect(() => {
    const browserWindow = getOrCreateBrowserWindow();

    if (browserWindow) {
      focusWindow(browserWindow.id);

      if (url) {
        try {
          const decodedUrl = decodeURIComponent(url);
          if (decodedUrl !== browserWindow.url) {
            navigateToUrl(browserWindow.id, decodedUrl, undefined, true);
          }
        } catch (e) {
          console.error('Failed to decode URL:', e);
        }
      }
    }
  }, [url, getOrCreateBrowserWindow, focusWindow, navigateToUrl]);

  return <Desktop />;
}
