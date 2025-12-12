import { create } from 'zustand';

import { DEFAULT_BOOKMARKS } from '@/config/defaultBookmarks';
import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { WINDOW_Z_INDEX } from '@/lib/constants/windowZIndex';
import { serializeWindowsToUrl } from '@/lib/routing/windowSerialization';
import { useUI, type App } from '@/lib/store';
import { getHostnameFromUrl, sanitizeUrlPath } from '@/lib/utils';

export type BookmarkItem =
  | { type: 'bookmark'; title: string; url: string }
  | { type: 'folder'; title: string; items: Array<{ title: string; url: string }> };

export interface HistoryEntry {
  url: string;
  title: string;
  visitTime: number;
}

export interface TerminalTab {
  id: string;
  title: string;
  sessionId: string;
}

const getAppName = (
  windowType: 'textedit' | 'browser' | 'terminal' | 'pdfviewer' | 'finder' | 'photos'
): string => {
  const appNames: Record<
    'textedit' | 'browser' | 'terminal' | 'pdfviewer' | 'finder' | 'photos',
    string
  > = {
    browser: 'Internet Explorer',
    textedit: 'TextEdit',
    terminal: 'Terminal',
    pdfviewer: 'Preview',
    finder: 'Finder',
    photos: 'Photos',
  };
  return appNames[windowType];
};

export interface Window {
  id: string;
  type: 'textedit' | 'browser' | 'terminal' | 'pdfviewer' | 'finder' | 'photos';
  appName: string;
  title: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  url?: string;
  history?: string[];
  historyIndex?: number;
  browsingHistory?: HistoryEntry[];
  bookmarks?: BookmarkItem[];
  urlPath?: string;
  currentPath?: string;
  viewMode?: 'icon' | 'list' | 'column';
  navigationHistory?: string[];
  navigationIndex?: number;
  tabs?: TerminalTab[];
  activeTabId?: string;
  albumPath?: string;
  selectedPhotoIndex?: number;
  isSlideshow?: boolean;
}

export type WindowOpenConfig = Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & {
  appName?: string;
};

const getDockIconForFinderPath = (path: string | undefined): App | null => {
  if (!path) return null;

  const pathSegments = path.toLowerCase().split('/').filter(Boolean);

  if (pathSegments.includes('dock')) {
    const dockIndex = pathSegments.indexOf('dock');
    const nextSegment = pathSegments[dockIndex + 1];

    if (nextSegment === 'writing') return 'writing';
    if (nextSegment === 'reading') return 'reading';
    if (nextSegment === 'trash') return 'trash';
    if (nextSegment === 'finder') return 'finder';
  }

  return null;
};

const getAppTypeForDock = (
  window: Window
):
  | 'browser'
  | 'textedit'
  | 'terminal'
  | 'pdfviewer'
  | 'photos'
  | 'writing'
  | 'reading'
  | 'trash'
  | 'finder'
  | null => {
  if (window.type === 'finder') {
    return getDockIconForFinderPath(window.currentPath);
  }

  if (window.type === 'textedit' || window.type === 'pdfviewer') {
    return null;
  }

  return window.type;
};

interface WindowStore {
  windows: Window[];
  activeWindowId: string | null;
  maxZIndex: number;
  skipNextRouteSync: Record<string, boolean>;
  openWindow: (
    window: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }
  ) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  getMultiWindowUrlOnClose: (id: string) => string;
  getVisibleWindows: () => Window[];
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  updateWindowContent: (id: string, content: string) => void;
  updateWindow: (
    id: string,
    updates: Partial<Window>,
    options?: { skipRouteSync?: boolean }
  ) => void;
  clearRouteSyncFlag: (id: string) => void;
  minimizeWindow: (id: string) => void;
  navigateToUrl: (id: string, url: string, title?: string, fromRoute?: boolean) => void;
  navigateBack: (id: string) => void;
  navigateForward: (id: string) => void;
  addBookmark: (id: string, title: string, url: string, folderName?: string) => void;
  removeBookmark: (id: string, url: string, folderName?: string) => void;
  addBookmarkToFolder: (id: string, folderName: string, title: string, url: string) => void;
  removeBookmarkFromFolder: (id: string, folderName: string, url: string) => void;
  openWindowFromUrl: (
    urlPath: string,
    content: string,
    entry: { appType: string; metadata: { title?: string }; fileExtension: string }
  ) => void;
  getActiveBrowserWindow: () => Window | null;
  getOrCreateBrowserWindow: (initialUrl?: string) => Window;
  addTabToWindow: (windowId: string) => void;
  closeTab: (windowId: string, tabId: string) => void;
  setActiveTab: (windowId: string, tabId: string) => void;
  getActiveTerminalTab: (windowId: string) => TerminalTab | null;
  reorderTabs: (windowId: string, fromIndex: number, toIndex: number) => void;
  updateMaxZIndex: () => void;
  getWindows: () => Window[];
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: WINDOW_Z_INDEX.BASE,
  skipNextRouteSync: {},

  /**
   * Opens a new window and assigns it the highest z-index (maxZIndex + 1).
   * New windows are automatically focused and appear on top.
   */
  openWindow: (window) => {
    const state = get();
    const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const zIndex = state.maxZIndex + 1;

    const offset = state.windows.length * 20;
    const position = {
      x: window.position.x + offset,
      y: window.position.y + offset,
    };

    const bookmarks =
      window.type === 'browser' && !window.bookmarks ? DEFAULT_BOOKMARKS : window.bookmarks;

    const newWindow: Window = {
      ...window,
      id,
      appName: window.appName || getAppName(window.type),
      position,
      zIndex,
      isMinimized: false,
      bookmarks,
      ...(window.type === 'terminal' && {
        tabs:
          window.tabs ||
          (() => {
            const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return [
              {
                id: tabId,
                title: '~/.zsh',
                sessionId: `${id}-${tabId}`,
              },
            ];
          })(),
        activeTabId:
          window.activeTabId ||
          (window.tabs && window.tabs.length > 0 ? window.tabs[0].id : undefined),
      }),
    };

    if (newWindow.type === 'terminal' && newWindow.tabs && newWindow.tabs.length > 0) {
      newWindow.activeTabId = newWindow.tabs[0].id;
    }

    const appType = getAppTypeForDock(newWindow);

    set({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      maxZIndex: zIndex,
    });

    if (appType) {
      useUI.getState().setActiveApp(appType);
    }
  },

  closeWindow: (id) => {
    const state = get();
    const windows = state.windows.filter((w) => w.id !== id);
    const activeWindowId =
      state.activeWindowId === id
        ? windows.length > 0
          ? windows[windows.length - 1].id
          : null
        : state.activeWindowId;

    const nextActiveWindow = activeWindowId ? windows.find((w) => w.id === activeWindowId) : null;
    const nextAppType = nextActiveWindow ? getAppTypeForDock(nextActiveWindow) : null;

    set({ windows, activeWindowId });

    useUI.getState().setActiveApp(nextAppType);
  },

  getMultiWindowUrlOnClose: (id) => {
    const state = get();
    const remainingWindows = state.windows.filter((w) => w.id !== id && !w.isMinimized);
    return serializeWindowsToUrl(remainingWindows);
  },

  getVisibleWindows: () => {
    return get().windows.filter((w) => !w.isMinimized);
  },

  /**
   * Focuses a window by assigning it the highest z-index (maxZIndex + 1).
   * This ensures the focused window appears on top of all other windows.
   */
  focusWindow: (id) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    if (!window) return;

    const zIndex = state.maxZIndex + 1;
    const windows = state.windows.map((w) => (w.id === id ? { ...w, zIndex } : w));

    const appType = getAppTypeForDock(window);

    set({
      windows,
      activeWindowId: id,
      maxZIndex: zIndex,
    });

    if (appType) {
      useUI.getState().setActiveApp(appType);
    }
  },

  updateWindowPosition: (id, position) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, position } : w)),
    }));
  },

  updateWindowSize: (id, size) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, size } : w)),
    }));
  },

  updateWindowContent: (id, content) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, content } : w)),
    }));
  },

  updateWindow: (id, updates, options) => {
    set((state) => {
      const window = state.windows.find((w) => w.id === id);
      if (!window) return { windows: state.windows };

      const updatedWindow = { ...window, ...updates };

      const skipRouteSync = options?.skipRouteSync === true;
      const newSkipNextRouteSync = skipRouteSync
        ? { ...state.skipNextRouteSync, [id]: true }
        : state.skipNextRouteSync;

      return {
        windows: state.windows.map((w) => (w.id === id ? updatedWindow : w)),
        skipNextRouteSync: newSkipNextRouteSync,
      };
    });
  },

  clearRouteSyncFlag: (id) => {
    set((state) => {
      const { [id]: _, ...rest } = state.skipNextRouteSync;
      return { skipNextRouteSync: rest };
    });
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)),
    }));
  },

  navigateToUrl: (id, url, title?: string, fromRoute?: boolean) => {
    set((state) => {
      const updatedWindows = state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          const history = w.history || [];
          const historyIndex = w.historyIndex ?? -1;
          const newHistory = [...history.slice(0, historyIndex + 1), url];

          const browsingHistory = w.browsingHistory || [];
          const pageTitle = title || getHostnameFromUrl(url);
          const newHistoryEntry: HistoryEntry = {
            url,
            title: pageTitle,
            visitTime: Date.now(),
          };

          const filteredHistory = browsingHistory.filter((entry) => entry.url !== url);
          const updatedBrowsingHistory = [newHistoryEntry, ...filteredHistory].slice(0, 100);

          return {
            ...w,
            url,
            urlPath: url.startsWith('/') ? url : w.urlPath,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            browsingHistory: updatedBrowsingHistory,
          };
        }
        return w;
      });

      const skipRouteSync = fromRoute === true;
      const newSkipNextRouteSync = skipRouteSync
        ? { ...state.skipNextRouteSync, [id]: true }
        : state.skipNextRouteSync;

      return { windows: updatedWindows, skipNextRouteSync: newSkipNextRouteSync };
    });
  },

  navigateBack: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (
          w.id === id &&
          w.type === 'browser' &&
          w.history &&
          w.historyIndex !== undefined &&
          w.historyIndex > 0
        ) {
          const newIndex = w.historyIndex - 1;
          return {
            ...w,
            url: w.history[newIndex],
            historyIndex: newIndex,
          };
        }
        return w;
      }),
    }));
  },

  navigateForward: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (
          w.id === id &&
          w.type === 'browser' &&
          w.history &&
          w.historyIndex !== undefined &&
          w.historyIndex < w.history.length - 1
        ) {
          const newIndex = w.historyIndex + 1;
          return {
            ...w,
            url: w.history[newIndex],
            historyIndex: newIndex,
          };
        }
        return w;
      }),
    }));
  },

  addBookmark: (id, title, url, folderName) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          const bookmarks = w.bookmarks || [];

          if (folderName) {
            let folderFound = false;
            const updatedBookmarks = bookmarks.map((item) => {
              if (item.type === 'folder' && item.title === folderName) {
                folderFound = true;
                if (item.items.some((b) => b.url === url)) {
                  return item;
                }
                return {
                  ...item,
                  items: [...item.items, { title, url }],
                };
              }
              return item;
            });

            if (folderFound) {
              return {
                ...w,
                bookmarks: updatedBookmarks,
              };
            }

            if (bookmarks.some((b) => b.type === 'bookmark' && b.url === url)) {
              return w;
            }
            return {
              ...w,
              bookmarks: [...bookmarks, { type: 'bookmark' as const, title, url }],
            };
          }

          if (bookmarks.some((b) => b.type === 'bookmark' && b.url === url)) {
            return w;
          }
          return {
            ...w,
            bookmarks: [...bookmarks, { type: 'bookmark' as const, title, url }],
          };
        }
        return w;
      }),
    }));
  },

  removeBookmark: (id, url, folderName) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          const bookmarks = w.bookmarks || [];

          if (folderName) {
            return {
              ...w,
              bookmarks: bookmarks.map((item) => {
                if (item.type === 'folder' && item.title === folderName) {
                  return {
                    ...item,
                    items: item.items.filter((b) => b.url !== url),
                  };
                }
                return item;
              }),
            };
          }

          return {
            ...w,
            bookmarks: bookmarks.filter((b) => (b.type === 'bookmark' ? b.url !== url : true)),
          };
        }
        return w;
      }),
    }));
  },

  addBookmarkToFolder: (id, folderName, title, url) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          return {
            ...w,
            bookmarks: (w.bookmarks || []).map((item) => {
              if (item.type === 'folder' && item.title === folderName) {
                if (item.items.some((b) => b.url === url)) {
                  return item;
                }
                return {
                  ...item,
                  items: [...item.items, { title, url }],
                };
              }
              return item;
            }),
          };
        }
        return w;
      }),
    }));
  },

  removeBookmarkFromFolder: (id, folderName, url) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          return {
            ...w,
            bookmarks: (w.bookmarks || []).map((item) => {
              if (item.type === 'folder' && item.title === folderName) {
                return {
                  ...item,
                  items: item.items.filter((b) => b.url !== url),
                };
              }
              return item;
            }),
          };
        }
        return w;
      }),
    }));
  },

  openWindowFromUrl: (urlPath, content, entry) => {
    const state = get();

    if (entry.appType === 'photos') {
      import('@/lib/photosContent').then(({ getPhotoByPath, getAlbumPhotos }) => {
        const existingPhotosWindow = state.windows.find(
          (w) => w.type === 'photos' && !w.isMinimized
        );
        if (existingPhotosWindow) {
          get().focusWindow(existingPhotosWindow.id);
          const photo = getPhotoByPath(urlPath);
          if (photo) {
            const photos = getAlbumPhotos(photo.albumPath);
            const index = photos.findIndex((p) => p.id === photo.id);
            if (index !== -1) {
              get().updateWindow(existingPhotosWindow.id, {
                selectedPhotoIndex: index,
                albumPath: photo.albumPath,
              });
            }
          }
          return;
        }

        const { width, height } = WINDOW_DIMENSIONS.photos;
        const position = getCenteredWindowPosition(width, height);

        const photo = getPhotoByPath(urlPath);
        let albumPath: string | undefined;
        let selectedPhotoIndex: number | undefined;

        if (photo) {
          const photos = getAlbumPhotos(photo.albumPath);
          const index = photos.findIndex((p) => p.id === photo.id);
          if (index !== -1) {
            selectedPhotoIndex = index;
            albumPath = photo.albumPath;
          }
        }

        const newWindow: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> = {
          type: 'photos',
          title: 'Photos',
          content: '',
          position,
          size: { width, height },
          urlPath,
          albumPath,
          selectedPhotoIndex,
        };

        get().openWindow(newWindow);
        const createdWindow = get().windows[get().windows.length - 1];
        if (createdWindow) {
          get().focusWindow(createdWindow.id);
        }
      });
      return;
    }

    const existingWindow = state.windows.find((w) => w.urlPath === urlPath && !w.isMinimized);
    if (existingWindow) {
      get().focusWindow(existingWindow.id);
      return;
    }

    const windowType =
      entry.appType === 'browser'
        ? 'browser'
        : entry.appType === 'pdfviewer'
          ? 'pdfviewer'
          : 'textedit';

    const dimensions =
      entry.appType === 'pdfviewer'
        ? WINDOW_DIMENSIONS.pdfviewer
        : entry.appType === 'browser'
          ? WINDOW_DIMENSIONS.browser
          : WINDOW_DIMENSIONS.textedit;
    const position = getCenteredWindowPosition(dimensions.width, dimensions.height);

    const title = entry.metadata.title || urlPath.split('/').pop() || 'Untitled';

    let browserUrl = urlPath;
    if (windowType === 'browser') {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const isImage = imageExtensions.some((ext) =>
        entry.fileExtension.toLowerCase().endsWith(ext)
      );
      if (isImage) {
        const sanitizedPath = sanitizeUrlPath(urlPath);
        browserUrl = `/content${sanitizedPath}${entry.fileExtension}`;
      }
    }

    const newWindow: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> = {
      type: windowType,
      title,
      content,
      position,
      size: { width: dimensions.width, height: dimensions.height },
      urlPath,
      ...(windowType === 'browser' && {
        url: browserUrl,
        history: [browserUrl],
        historyIndex: 0,
      }),
    };

    get().openWindow(newWindow);
    const createdWindow = get().windows[get().windows.length - 1];
    if (createdWindow) {
      get().focusWindow(createdWindow.id);
    }
  },

  getActiveBrowserWindow: () => {
    const state = get();
    const browserWindows = state.windows.filter((w) => w.type === 'browser' && !w.isMinimized);
    if (browserWindows.length === 0) return null;

    const activeBrowser = browserWindows.find((w) => w.id === state.activeWindowId);
    if (activeBrowser) return activeBrowser;

    return browserWindows.reduce((prev, curr) => (curr.zIndex > prev.zIndex ? curr : prev));
  },

  getOrCreateBrowserWindow: (initialUrl?: string) => {
    const state = get();
    const existingBrowser = state.getActiveBrowserWindow();

    if (existingBrowser) {
      return existingBrowser;
    }

    const { width, height } = WINDOW_DIMENSIONS.browser;
    const position = getCenteredWindowPosition(width, height);

    const newWindow: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> = {
      type: 'browser',
      title: 'Internet Explorer',
      content: '',
      position,
      size: { width, height },
      url: initialUrl || '',
      history: initialUrl ? [initialUrl] : [],
      historyIndex: initialUrl ? 0 : -1,
    };

    get().openWindow(newWindow);
    const createdWindow = get().windows[get().windows.length - 1];
    return createdWindow;
  },

  addTabToWindow: (windowId) => {
    set((state) => {
      const window = state.windows.find((w) => w.id === windowId);
      if (!window || window.type !== 'terminal') return state;

      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = `${windowId}-${tabId}`;
      const newTab: TerminalTab = {
        id: tabId,
        title: '~/.zsh',
        sessionId,
      };

      const tabs = window.tabs || [];
      const updatedTabs = [...tabs, newTab];

      return {
        windows: state.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                tabs: updatedTabs,
                activeTabId: tabId,
              }
            : w
        ),
        activeWindowId: windowId,
      };
    });
  },

  closeTab: (windowId, tabId) => {
    set((state) => {
      const window = state.windows.find((w) => w.id === windowId);
      if (!window || window.type !== 'terminal' || !window.tabs) return state;

      const tabs = window.tabs.filter((t) => t.id !== tabId);
      if (tabs.length === 0) {
        return {
          windows: state.windows.filter((w) => w.id !== windowId),
          activeWindowId:
            state.activeWindowId === windowId
              ? state.windows.length > 1
                ? state.windows.find((w) => w.id !== windowId)?.id || null
                : null
              : state.activeWindowId,
        };
      }

      const wasActiveTab = window.activeTabId === tabId;
      const newActiveTabId = wasActiveTab
        ? tabs.length > 0
          ? tabs[tabs.length - 1].id
          : undefined
        : window.activeTabId;

      return {
        windows: state.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                tabs,
                activeTabId: newActiveTabId,
              }
            : w
        ),
      };
    });
  },

  setActiveTab: (windowId, tabId) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId && w.type === 'terminal' ? { ...w, activeTabId: tabId } : w
      ),
      activeWindowId: windowId,
    }));
  },

  getActiveTerminalTab: (windowId) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    if (!window || window.type !== 'terminal' || !window.tabs || !window.activeTabId) {
      return null;
    }
    return window.tabs.find((t) => t.id === window.activeTabId) || null;
  },

  reorderTabs: (windowId, fromIndex, toIndex) => {
    set((state) => {
      const window = state.windows.find((w) => w.id === windowId);
      if (!window || window.type !== 'terminal' || !window.tabs) return state;

      const tabs = [...window.tabs];
      const [movedTab] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, movedTab);

      return {
        windows: state.windows.map((w) =>
          w.id === windowId
            ? {
                ...w,
                tabs,
              }
            : w
        ),
      };
    });
  },

  /**
   * Recalculates maxZIndex based on all windows in the store.
   * Includes minimized windows to prevent z-index conflicts when they're restored (future feature).
   * Should be called after batch z-index updates during window reconciliation.
   */
  updateMaxZIndex: () => {
    set((state) => {
      const maxZ = state.windows.reduce((max, w) => Math.max(max, w.zIndex), WINDOW_Z_INDEX.BASE);
      return { maxZIndex: maxZ };
    });
  },

  /**
   * Gets the current windows array from the store.
   * This always returns fresh state, not a snapshot, which is critical for
   * window reconciliation after opening/closing windows.
   */
  getWindows: () => {
    return get().windows;
  },
}));
