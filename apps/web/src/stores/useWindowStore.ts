import { create } from 'zustand';

export interface Window {
  id: string;
  type: 'textedit';
  title: string;
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
}

interface WindowStore {
  windows: Window[];
  activeWindowId: string | null;
  maxZIndex: number;
  openWindow: (window: Omit<Window, 'id' | 'zIndex' | 'isMinimized'>) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowPosition: (id: string, position: { x: number; y: number }) => void;
  updateWindowContent: (id: string, content: string) => void;
  minimizeWindow: (id: string) => void;
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

    const newWindow: Window = {
      ...window,
      id,
      position,
      zIndex,
      isMinimized: false,
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
}));
