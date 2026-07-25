import { useNavigate } from '@tanstack/react-router';

import { normalizePathForRouting } from '@/lib/utils';
import { useWindowStore } from '@/stores/useWindowStore';

export const useWindowNavigation = () => {
  const navigate = useNavigate();

  const navigateToWindows = (windowIdentifiers: string[]) => {
    navigate({
      to: '/',
      search: {
        w: windowIdentifiers.length > 0 ? windowIdentifiers : undefined,
        state: undefined,
      },
      replace: false,
    });
  };

  const addWindow = (existingWindows: string[], newWindowId: string) => {
    if (newWindowId.startsWith('textedit:')) {
      const existingTextEdit = useWindowStore.getState().windows.find((window) => {
        if (window.type !== 'textedit') return false;
        return `textedit:${normalizePathForRouting(window.urlPath ?? '')}` === newWindowId;
      });

      if (existingTextEdit) {
        if (existingTextEdit.isMinimized) {
          useWindowStore.getState().minimizeWindow(existingTextEdit.id);
        }
        useWindowStore.getState().focusWindow(existingTextEdit.id);
        return;
      }
    }

    if (existingWindows.includes(newWindowId)) return;
    navigateToWindows([...existingWindows, newWindowId]);
  };

  const removeWindow = (existingWindows: string[], windowIdToRemove: string) => {
    navigateToWindows(existingWindows.filter((id) => id !== windowIdToRemove));
  };

  return { navigateToWindows, addWindow, removeWindow };
};
