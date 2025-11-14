import { create } from 'zustand';

import { DEFAULT_BOOKMARKS } from '@/config/defaultBookmarks';
import { getHostnameFromUrl } from '@/lib/utils';

export type BookmarkItem =
  | { type: 'bookmark'; title: string; url: string }
  | { type: 'folder'; title: string; items: Array<{ title: string; url: string }> };

export interface HistoryEntry {
  url: string;
  title: string;
  visitTime: number;
}

const getAppName = (windowType: 'textedit' | 'browser'): string => {
  const appNames: Record<'textedit' | 'browser', string> = {
    browser: 'Internet Explorer',
    textedit: 'TextEdit',
  };
  return appNames[windowType];
};

export interface Window {
  id: string;
  type: 'textedit' | 'browser';
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
}

interface WindowStore {
  windows: Window[];
  activeWindowId: string | null;
  maxZIndex: number;
  openWindow: (
    window: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }
  ) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  updateWindowContent: (id: string, content: string) => void;
  minimizeWindow: (id: string) => void;
  navigateToUrl: (id: string, url: string, title?: string) => void;
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
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: 100,

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
    };

    set({
      windows: [...state.windows, newWindow],
      activeWindowId: id,
      maxZIndex: zIndex,
    });
  },

  closeWindow: (id) => {
    const state = get();
    const windowToClose = state.windows.find((w) => w.id === id);

    if (windowToClose?.urlPath) {
      window.history.back();
    }

    const windows = state.windows.filter((w) => w.id !== id);
    const activeWindowId =
      state.activeWindowId === id
        ? windows.length > 0
          ? windows[windows.length - 1].id
          : null
        : state.activeWindowId;

    set({ windows, activeWindowId });
  },

  focusWindow: (id) => {
    const state = get();
    const zIndex = state.maxZIndex + 1;
    const windows = state.windows.map((w) => (w.id === id ? { ...w, zIndex } : w));

    set({
      windows,
      activeWindowId: id,
      maxZIndex: zIndex,
    });
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

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)),
    }));
  },

  navigateToUrl: (id, url, title?: string) => {
    set((state) => ({
      windows: state.windows.map((w) => {
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
      }),
    }));
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

    const existingWindow = state.windows.find((w) => w.urlPath === urlPath && !w.isMinimized);
    if (existingWindow) {
      get().focusWindow(existingWindow.id);
      return;
    }

    const windowType = entry.appType === 'browser' ? 'browser' : 'textedit';

    const windowWidth = 600;
    const windowHeight = 500;
    const centerX = (window.innerWidth - windowWidth) / 2;
    const centerY = (window.innerHeight - windowHeight - 22 - 60) / 2;

    const title = entry.metadata.title || urlPath.split('/').pop() || 'Untitled';

    const newWindow: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> = {
      type: windowType,
      title,
      content,
      position: { x: centerX, y: centerY + 22 },
      size: { width: windowWidth, height: windowHeight },
      urlPath,
      ...(windowType === 'browser' && {
        url: urlPath,
        history: [urlPath],
        historyIndex: 0,
      }),
    };

    get().openWindow(newWindow);
  },
}));
