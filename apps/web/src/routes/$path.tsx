import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { resolveUrlToContent } from '@/lib/urlResolver';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/$path')({
  loader: async ({ params }) => {
    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      await initializeContentIndex();
    }

    try {
      const resolved = await resolveUrlToContent(params.path);
      return { resolved, error: null };
    } catch (error) {
      return {
        resolved: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  component: PathComponent,
});

function PathComponent() {
  const { resolved, error } = Route.useLoaderData();
  const openWindowFromUrl = useWindowStore((state) => state.openWindowFromUrl);

  useEffect(() => {
    if (resolved && !error) {
      const entry: ContentIndexEntry = resolved.entry;
      openWindowFromUrl(entry.urlPath, resolved.content, {
        appType: entry.appType,
        metadata: entry.metadata,
        fileExtension: entry.fileExtension,
      });
    }
  }, [resolved, error, openWindowFromUrl]);

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
