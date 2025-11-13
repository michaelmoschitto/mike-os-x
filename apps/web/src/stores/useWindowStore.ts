import { create } from 'zustand';
import { DEFAULT_BOOKMARKS } from '@/config/defaultBookmarks';

export type BookmarkItem = 
  | { type: 'bookmark'; title: string; url: string }
  | { type: 'folder'; title: string; items: Array<{ title: string; url: string }> };

export interface HistoryEntry {
  url: string;
  title: string;
  visitTime: number;
}

export interface Window {
  id: string;
  type: 'textedit' | 'browser';
  title: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  // Browser-specific properties
  url?: string;
  history?: string[]; // Navigation history (back/forward)
  historyIndex?: number;
  browsingHistory?: HistoryEntry[]; // Full browsing history for autocomplete
  bookmarks?: BookmarkItem[];
}

interface WindowStore {
  windows: Window[];
  activeWindowId: string | null;
  maxZIndex: number;
  openWindow: (window: Omit<Window, 'id' | 'zIndex' | 'isMinimized'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  updateWindowSize: (id: string, size: { width: number; height: number }) => void;
  updateWindowContent: (id: string, content: string) => void;
  minimizeWindow: (id: string) => void;
  // Browser-specific actions
  navigateToUrl: (id: string, url: string, title?: string) => void;
  navigateBack: (id: string) => void;
  navigateForward: (id: string) => void;
  addBookmark: (id: string, title: string, url: string, folderName?: string) => void;
  removeBookmark: (id: string, url: string, folderName?: string) => void;
  addBookmarkToFolder: (id: string, folderName: string, title: string, url: string) => void;
  removeBookmarkFromFolder: (id: string, folderName: string, url: string) => void;
}

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  activeWindowId: null,
  maxZIndex: 100,

  openWindow: (window) => {
    const state = get();
    const id = `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const zIndex = state.maxZIndex + 1;

    // Offset each new window by 20px to cascade them
    const offset = state.windows.length * 20;
    const position = {
      x: window.position.x + offset,
      y: window.position.y + offset,
    };

    // Initialize browser windows with default folders from config
    const bookmarks = window.type === 'browser' && !window.bookmarks
      ? DEFAULT_BOOKMARKS
      : window.bookmarks;

    const newWindow: Window = {
      ...window,
      id,
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

  // Browser-specific actions
  navigateToUrl: (id, url, title?: string) => {
    set((state) => ({
      windows: state.windows.map((w) => {
        if (w.id === id && w.type === 'browser') {
          const history = w.history || [];
          const historyIndex = w.historyIndex ?? -1;
          // Remove forward history when navigating to a new URL
          const newHistory = [...history.slice(0, historyIndex + 1), url];
          
          // Add to browsing history for autocomplete
          const browsingHistory = w.browsingHistory || [];
          const pageTitle = title || new URL(url).hostname;
          const newHistoryEntry: HistoryEntry = {
            url,
            title: pageTitle,
            visitTime: Date.now(),
          };
          
          // Remove duplicate if exists and add to front (most recent first)
          const filteredHistory = browsingHistory.filter((entry) => entry.url !== url);
          const updatedBrowsingHistory = [newHistoryEntry, ...filteredHistory].slice(0, 100); // Keep last 100 entries
          
          return {
            ...w,
            url,
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
          
          // If folderName is provided, add to that folder
          if (folderName) {
            let folderFound = false;
            const updatedBookmarks = bookmarks.map((item) => {
              if (item.type === 'folder' && item.title === folderName) {
                folderFound = true;
                // Check for duplicates
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
            
            // If folder was found, return the updated bookmarks
            if (folderFound) {
              return {
                ...w,
                bookmarks: updatedBookmarks,
              };
            }
            
            // If folder wasn't found, fall back to adding as regular bookmark
            // Check for duplicates
            if (bookmarks.some((b) => b.type === 'bookmark' && b.url === url)) {
              return w;
            }
            return {
              ...w,
              bookmarks: [...bookmarks, { type: 'bookmark' as const, title, url }],
            };
          }
          
          // Otherwise add as a regular bookmark (not in a folder)
          // Check for duplicates
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
          
          // If folderName is provided, remove from that folder
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
          
          // Otherwise remove regular bookmark
          return {
            ...w,
            bookmarks: bookmarks.filter((b) => 
              b.type === 'bookmark' ? b.url !== url : true
            ),
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
                // Check for duplicates
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
}));
