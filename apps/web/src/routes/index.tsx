import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { deserializeUrlToWindows, parseWindowIdentifiersFromUrl } from '@/lib/routing/windowSerialization';
import { reconcileWindowsWithUrl } from '@/lib/routing/windowReconciliation';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const w = search.w;
    const wArray = w === undefined ? undefined : (Array.isArray(w) ? w : [w]);
    
    return {
      w: wArray as string[] | undefined,
      state: (search.state as string) || undefined,
    };
  },
  loader: async () => {
    const stateParam = new URLSearchParams(window.location.search).get('state');
    const windowIdentifiers = parseWindowIdentifiersFromUrl();
    
    if (windowIdentifiers.length > 0 || stateParam) {
      const mightNeedContentIndex = windowIdentifiers.some(
        id => id.startsWith('photos') || id.startsWith('finder') || 
              id.startsWith('textedit') || id.startsWith('pdfviewer') || id.includes('/')
      );
      
      if (mightNeedContentIndex) {
        const indexState = useContentIndex.getState();
        if (!indexState.isIndexed) {
          await initializeContentIndex();
        }
      }
      
      // Build clean URLSearchParams for deserialization
      const cleanParams = new URLSearchParams();
      for (const id of windowIdentifiers) {
        cleanParams.append('w', id);
      }
      if (stateParam) {
        cleanParams.set('state', stateParam);
      }
      
      const windowConfigs = deserializeUrlToWindows(cleanParams);
      
      return {
        mode: 'multi-window' as const,
        windowConfigs,
      };
    }
    
    return { mode: 'empty' as const };
  },
  component: IndexComponent,
});

function IndexComponent() {
  const loaderData = Route.useLoaderData();
  const { openWindow, closeWindow, updateWindow, focusWindow, windows } = useWindowStore();
  const lastReconciledUrl = useRef<string>('');

  useEffect(() => {
    const currentUrl = window.location.href;
    
    if (loaderData.mode === 'multi-window') {
      if (lastReconciledUrl.current === currentUrl) {
        return;
      }
      
      lastReconciledUrl.current = currentUrl;
      
      reconcileWindowsWithUrl(loaderData.windowConfigs, {
        openWindow,
        closeWindow,
        updateWindow,
        focusWindow,
        windows,
      });
      return;
    }
    
    if (loaderData.mode === 'empty') {
      if (lastReconciledUrl.current === currentUrl) {
        return;
      }
      
      lastReconciledUrl.current = currentUrl;
      
      reconcileWindowsWithUrl([], {
        openWindow,
        closeWindow,
        updateWindow,
        focusWindow,
        windows,
      });
    }
  }, [loaderData, openWindow, closeWindow, updateWindow, focusWindow, windows]);

  return <Desktop />;
}
