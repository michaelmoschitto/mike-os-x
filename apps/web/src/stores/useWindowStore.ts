import { create } from 'zustand';

import { DEFAULT_BOOKMARKS } from '@/config/defaultBookmarks';
import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { getRouteStrategy } from '@/lib/routing/windowRouteStrategies';
import { useUI } from '@/lib/store';
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
  route?: string;
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

const getAppTypeForDock = (
  windowType: 'textedit' | 'browser' | 'terminal' | 'pdfviewer' | 'finder' | 'photos'
): 'browser' | 'textedit' | 'terminal' | 'pdfviewer' | 'photos' | null => {
  if (windowType === 'finder') return null;
  return windowType;
};

interface WindowStore {
  windows: Window[];
  activeWindowId: string | null;
  maxZIndex: number;
  routeStack: string[];
  skipNextRouteSync: Record<string, boolean>;
  openWindow: (
    window: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }
  ) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  getRouteToNavigateOnClose: (id: string) => string | null;
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
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: 100,
  routeStack: [],
  skipNextRouteSync: {},

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

    const strategy = getRouteStrategy(window.type);
    const route = strategy.shouldSyncRoute(window as Window)
      ? strategy.getRouteForWindow(window as Window)
      : undefined;

    const newWindow: Window = {
      ...window,
      id,
      appName: window.appName || getAppName(window.type),
      position,
      zIndex,
      isMinimized: false,
      bookmarks,
      route,
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

    const routeStack = route ? [...state.routeStack, route] : state.routeStack;
    const appType = getAppTypeForDock(window.type);

    set({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      maxZIndex: zIndex,
      routeStack,
    });

    if (appType) {
      useUI.getState().setActiveApp(appType);
    }
  },

  closeWindow: (id) => {
    const state = get();
    const windowToClose = state.windows.find((w) => w.id === id);

    const windows = state.windows.filter((w) => w.id !== id);
    const activeWindowId =
      state.activeWindowId === id
        ? windows.length > 0
          ? windows[windows.length - 1].id
          : null
        : state.activeWindowId;

    const nextActiveWindow = activeWindowId ? windows.find((w) => w.id === activeWindowId) : null;
    const nextAppType = nextActiveWindow ? getAppTypeForDock(nextActiveWindow.type) : null;

    const routeStack = windowToClose?.route
      ? state.routeStack.filter((r) => r !== windowToClose.route)
      : state.routeStack;

    set({ windows, activeWindowId, routeStack });

    useUI.getState().setActiveApp(nextAppType);
  },

  getRouteToNavigateOnClose: (id) => {
    const state = get();
    const windowToClose = state.windows.find((w) => w.id === id);
    if (!windowToClose) return null;

    const windows = state.windows.filter((w) => w.id !== id);
    if (windows.length === 0) {
      return '/';
    }

    const nextActiveWindow = windows[windows.length - 1];
    if (nextActiveWindow?.route) {
      return nextActiveWindow.route;
    }

    const filteredRouteStack = windowToClose?.route
      ? state.routeStack.filter((r) => r !== windowToClose.route)
      : state.routeStack;

    if (filteredRouteStack.length > 0) {
      return filteredRouteStack[filteredRouteStack.length - 1];
    }

    return '/';
  },

  focusWindow: (id) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    if (!window) return;

    const zIndex = state.maxZIndex + 1;
    const windows = state.windows.map((w) => (w.id === id ? { ...w, zIndex } : w));

    const appType = getAppTypeForDock(window.type);

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
      const strategy = getRouteStrategy(updatedWindow.type);
      const newRoute = strategy.shouldSyncRoute(updatedWindow)
        ? strategy.getRouteForWindow(updatedWindow)
        : undefined;

      const finalWindow = { ...updatedWindow, route: newRoute };

      let routeStack = state.routeStack;
      if (window.route && newRoute && window.route !== newRoute) {
        routeStack = routeStack.map((r) => (r === window.route ? newRoute : r));
      } else if (!window.route && newRoute) {
        // If it didn't have a route but now does, append it
        routeStack = [...routeStack, newRoute];
      } else if (window.route && !newRoute) {
        // If it had a route but now doesn't, remove it
        routeStack = routeStack.filter((r) => r !== window.route);
      }

      const skipRouteSync = options?.skipRouteSync === true;
      const newSkipNextRouteSync = skipRouteSync
        ? { ...state.skipNextRouteSync, [id]: true }
        : state.skipNextRouteSync;

      return {
        windows: state.windows.map((w) => (w.id === id ? finalWindow : w)),
        skipNextRouteSync: newSkipNextRouteSync,
        routeStack,
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
      const strategy = getRouteStrategy('browser');
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

          const updatedWindow = {
            ...w,
            url,
            urlPath: url.startsWith('/') ? url : w.urlPath,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            browsingHistory: updatedBrowsingHistory,
          };

          const newRoute = strategy.getRouteForWindow(updatedWindow);

          return {
            ...updatedWindow,
            route: newRoute,
          };
        }
        return w;
      });

      const updatedWindow = updatedWindows.find((w) => w.id === id);
      const oldWindow = state.windows.find((w) => w.id === id);
      let routeStack = state.routeStack;

      if (oldWindow?.route && updatedWindow?.route && oldWindow.route !== updatedWindow.route) {
        routeStack = routeStack
          .map((r) => (r === oldWindow.route ? updatedWindow.route : r))
          .filter((r): r is string => r !== undefined);
      }

      const skipRouteSync = fromRoute === true;
      const newSkipNextRouteSync = skipRouteSync
        ? { ...state.skipNextRouteSync, [id]: true }
        : state.skipNextRouteSync;

      return { windows: updatedWindows, routeStack, skipNextRouteSync: newSkipNextRouteSync };
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
}));
