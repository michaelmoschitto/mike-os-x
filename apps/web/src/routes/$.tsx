import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { resolveUrlToContent } from '@/lib/urlResolver';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/$')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      url: (search.url as string) || undefined,
    };
  },
  loader: async ({ params }) => {
    const path = params._splat || '';
    
    if (path === 'browser' || path.startsWith('browser/')) {
      return { isBrowserRoute: true, resolved: null, error: null };
    }

    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      await initializeContentIndex();
    }

    try {
      const resolved = await resolveUrlToContent(path);
      return { isBrowserRoute: false, resolved, error: null };
    } catch (error) {
      return {
        isBrowserRoute: false,
        resolved: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  component: PathComponent,
});

function PathComponent() {
  const { resolved, error, isBrowserRoute } = Route.useLoaderData();
  const { url } = Route.useSearch();
  const { getOrCreateBrowserWindow, focusWindow, navigateToUrl, openWindowFromUrl } =
    useWindowStore();

  useEffect(() => {
    if (isBrowserRoute) {
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
      return;
    }

    if (resolved && !error) {
      const entry: ContentIndexEntry = resolved.entry;
      openWindowFromUrl(entry.urlPath, resolved.content, {
        appType: entry.appType,
        metadata: entry.metadata,
        fileExtension: entry.fileExtension,
      });
    }
  }, [
    isBrowserRoute,
    url,
    getOrCreateBrowserWindow,
    focusWindow,
    navigateToUrl,
    resolved,
    error,
    openWindowFromUrl,
  ]);

  return (
    <>
      <Desktop />
      {error && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="aqua-window max-w-md p-6">
            <h2 className="font-ui mb-4 text-lg font-semibold">File Not Found</h2>
            <p className="font-ui text-sm">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}

