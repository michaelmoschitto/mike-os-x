import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';

import Desktop from '@/components/system/Desktop';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { reconcileWindowsWithUrl } from '@/lib/routing/windowReconciliation';
import { deserializeUrlToWindows, parseWindowParams } from '@/lib/routing/windowSerialization';
import { useWindowStore } from '@/stores/useWindowStore';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const w = search.w;
    const state = search.state;

    return {
      w: w as string | string[] | undefined,
      state: typeof state === 'string' ? state : undefined,
    };
  },
  loader: async () => {
    const stateParam = new URLSearchParams(window.location.search).get('state');
    const windowIdentifiers = parseWindowParams(
      new URLSearchParams(window.location.search).getAll('w')
    );

    if (windowIdentifiers.length > 0 || stateParam) {
      const mightNeedContentIndex = windowIdentifiers.some(
        (id) =>
          id.startsWith('photos') ||
          id.startsWith('finder') ||
          id.startsWith('textedit') ||
          id.startsWith('pdfviewer') ||
          id.includes('/')
      );

      if (mightNeedContentIndex) {
        const indexState = useContentIndex.getState();
        if (!indexState.isIndexed) {
          await initializeContentIndex();
        }
      }
    }

    return { initialized: true };
  },
  component: IndexComponent,
});

function IndexComponent() {
  const { w: windowParams, state: stateParam } = Route.useSearch();
  const { openWindow, closeWindow, updateWindow, focusWindow, windows } = useWindowStore();
  const prevIdentifiers = useRef<string>('');

  const windowIdentifiers = useMemo(() => {
    return parseWindowParams(windowParams);
  }, [windowParams]);

  const windowConfigs = useMemo(() => {
    if (windowIdentifiers.length === 0 && !stateParam) {
      return [];
    }

    const cleanParams = new URLSearchParams();
    for (const id of windowIdentifiers) {
      cleanParams.append('w', id);
    }
    if (stateParam) {
      cleanParams.set('state', stateParam);
    }

    return deserializeUrlToWindows(cleanParams);
  }, [windowIdentifiers, stateParam]);

  useEffect(() => {
    const identifiersKey = JSON.stringify(windowIdentifiers) + (stateParam || '');
    const identifiersChanged = prevIdentifiers.current !== identifiersKey;

    if (!identifiersChanged) {
      return;
    }

    prevIdentifiers.current = identifiersKey;

    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      return;
    }

    reconcileWindowsWithUrl(windowConfigs, {
      openWindow,
      closeWindow,
      updateWindow,
      focusWindow,
      windows,
    });
  }, [
    windowConfigs,
    windowIdentifiers,
    stateParam,
    openWindow,
    closeWindow,
    updateWindow,
    focusWindow,
    windows,
  ]);

  return <Desktop />;
}
