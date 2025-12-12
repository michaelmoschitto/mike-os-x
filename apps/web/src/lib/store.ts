import { create } from 'zustand';

export type App =
  | 'finder'
  | 'browser'
  | 'textedit'
  | 'terminal'
  | 'pdfviewer'
  | 'projects'
  | 'writing'
  | 'photos'
  | 'reading'
  | 'about'
  | 'trash';

interface UIStore {
  activeApp: App | null;
  setActiveApp: (app: App | null) => void;
}

export const useUI = create<UIStore>((set) => ({
  activeApp: null,
  setActiveApp: (app) => set({ activeApp: app }),
}));
