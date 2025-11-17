import { create } from 'zustand';

type App =
  | 'finder'
  | 'browser'
  | 'textedit'
  | 'terminal'
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
