import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { resolveUrlToContent } from '@/lib/urlResolver';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/$')({
  loader: async ({ params }) => {
    const path = params._splat || '';

    console.log('[Splat Loader] Path:', path);

    // Empty path should be handled by index route, but just in case
    if (path === '') {
      return { mode: 'empty' as const, path };
    }

    // Try to resolve the path to content (e.g., /dock/photos/fam/photo.jpeg)
    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      await initializeContentIndex();
    }

    try {
      const resolved = await resolveUrlToContent(path);
      return {
        mode: 'content' as const,
        resolved,
        path,
      };
    } catch (error) {
      return {
        mode: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
      };
    }
  },
  component: PathComponent,
});

function PathComponent() {
  const loaderData = Route.useLoaderData();
  const { openWindowFromUrl } = useWindowStore();

  useEffect(() => {
    console.log('[Splat PathComponent] loaderData:', loaderData);

    // Content mode - open content in appropriate window
    if (loaderData.mode === 'content' && loaderData.resolved) {
      const entry: ContentIndexEntry = loaderData.resolved.entry;
      openWindowFromUrl(entry.urlPath, loaderData.resolved.content, {
        appType: entry.appType,
        metadata: entry.metadata,
        fileExtension: entry.fileExtension,
      });
    }
  }, [loaderData, openWindowFromUrl]);

  const error = loaderData.mode === 'error' ? loaderData.error : null;

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
