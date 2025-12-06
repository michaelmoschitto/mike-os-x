import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { deserializeUrlToWindows } from '@/lib/routing/windowSerialization';
import { reconcileWindowsWithUrl } from '@/lib/routing/windowReconciliation';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/')({
  loader: async () => {
    // Check for multi-window mode
    const searchParams = new URLSearchParams(window.location.search);
    const windowIdentifiers = searchParams.getAll('w');
    const stateParam = searchParams.get('state');
    
    console.log('[Index Loader] URL:', window.location.href);
    console.log('[Index Loader] Window identifiers:', windowIdentifiers);
    console.log('[Index Loader] State param:', stateParam);
    
    if (windowIdentifiers.length > 0 || stateParam) {
      console.log('[Index Loader] Multi-window mode detected!');
      const windowConfigs = deserializeUrlToWindows(searchParams);
      console.log('[Index Loader] Deserialized window configs:', windowConfigs);
      
      // Initialize content index if needed for photos/documents
      const needsContentIndex = windowConfigs.some(
        w => w.config.type === 'photos' || w.config.urlPath
      );
      
      if (needsContentIndex) {
        const indexState = useContentIndex.getState();
        if (!indexState.isIndexed) {
          await initializeContentIndex();
        }
      }
      
      return {
        mode: 'multi-window' as const,
        windowConfigs,
      };
    }
    
    // Empty desktop
    return {
      mode: 'empty' as const,
    };
  },
  component: IndexComponent,
});

function IndexComponent() {
  console.log('[IndexComponent] Component rendering');
  const loaderData = Route.useLoaderData();
  const { openWindow, closeWindow, updateWindow, focusWindow, windows } = useWindowStore();
  const reconciledRef = useRef<Set<string>>(new Set());
  
  console.log('[IndexComponent] Current loaderData:', loaderData);
  
  useEffect(() => {
    // Create a stable key from loaderData to detect changes
    const loaderDataKey = JSON.stringify(loaderData);
    
    console.log('[IndexComponent] useEffect triggered', { 
      currentUrl: window.location.href,
      loaderMode: 'mode' in loaderData ? loaderData.mode : 'unknown',
      currentWindowCount: windows.length,
      hasBeenReconciled: reconciledRef.current.has(loaderDataKey)
    });
    
    // Skip if we've already reconciled this exact loaderData (prevents double reconciliation in Strict Mode)
    if (reconciledRef.current.has(loaderDataKey)) {
      console.log('[IndexComponent] Already reconciled this loaderData, skipping');
      return;
    }
    
    console.log('[IndexComponent] New loaderData, will reconcile');
    reconciledRef.current.add(loaderDataKey);
    
    // Multi-window mode
    if ('mode' in loaderData && loaderData.mode === 'multi-window') {
      console.log('[IndexComponent] Multi-window mode, reconciling with', loaderData.windowConfigs.length, 'windows');
      console.log('[IndexComponent] Window configs:', loaderData.windowConfigs.map(c => c.identifier));
      
      reconcileWindowsWithUrl(loaderData.windowConfigs, {
        openWindow,
        closeWindow,
        updateWindow,
        focusWindow,
        windows,
      });
    } else if ('mode' in loaderData && loaderData.mode === 'empty') {
      console.log('[IndexComponent] Empty desktop mode - reconciling with empty config');
      // Use reconciliation to close all windows (this is more reliable than closing directly)
      reconcileWindowsWithUrl([], {
        openWindow,
        closeWindow,
        updateWindow,
        focusWindow,
        windows,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaderData, openWindow, closeWindow, updateWindow, focusWindow]);
  
  return <Desktop />;
}
