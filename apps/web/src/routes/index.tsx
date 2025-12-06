import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { deserializeUrlToWindows } from '@/lib/routing/windowSerialization';
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
    const searchParams = new URLSearchParams(window.location.search);
    const rawWindowIdentifiers = searchParams.getAll('w');
    const stateParam = searchParams.get('state');
    
    console.log('[Index Loader] URL:', window.location.href);
    console.log('[Index Loader] Raw window identifiers:', rawWindowIdentifiers);
    
    // TanStack Router may serialize arrays as JSON strings like '["terminal"]'
    // We need to flatten these back to individual window IDs
    const windowIdentifiers: string[] = [];
    for (const w of rawWindowIdentifiers) {
      if (w.startsWith('[') && w.endsWith(']')) {
        try {
          const parsed = JSON.parse(w);
          if (Array.isArray(parsed)) {
            windowIdentifiers.push(...parsed);
          } else {
            windowIdentifiers.push(w);
          }
        } catch {
          windowIdentifiers.push(w);
        }
      } else {
        windowIdentifiers.push(w);
      }
    }
    
    console.log('[Index Loader] Parsed window identifiers:', windowIdentifiers);
    
    if (windowIdentifiers.length > 0 || stateParam) {
      console.log('[Index Loader] Multi-window mode detected!');
      
      // Initialize content index BEFORE deserialization if any window might need it
      // Photos, Finder, TextEdit, PDFViewer, and content windows all need the content index
      const mightNeedContentIndex = windowIdentifiers.some(
        id => id.startsWith('photos') || id.startsWith('finder') || 
              id.startsWith('textedit') || id.startsWith('pdfviewer') || id.includes('/')
      );
      
      if (mightNeedContentIndex) {
        const indexState = useContentIndex.getState();
        if (!indexState.isIndexed) {
          console.log('[Index Loader] Initializing content index before deserialization');
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
    
    console.log('[IndexComponent] useEffect triggered', { 
      loaderData, 
      currentUrl,
      lastReconciledUrl: lastReconciledUrl.current,
    });
    
    if (loaderData.mode === 'multi-window') {
      if (lastReconciledUrl.current === currentUrl) {
        console.log('[IndexComponent] Already reconciled this URL, skipping');
        return;
      }
      
      console.log('[IndexComponent] Multi-window mode', { windowConfigs: loaderData.windowConfigs });
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
      
      console.log('[IndexComponent] Empty desktop mode');
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
