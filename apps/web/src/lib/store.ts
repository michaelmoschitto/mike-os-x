import { create } from 'zustand';

type App =
  | 'finder'
  | 'browser'
  | 'projects'
  | 'writing'
  | 'photos'
  | 'reading'
  | 'about'
  | 'ai'
  | 'trash';

interface UIStore {
  activeApp: App | null;
  setActiveApp: (app: App | null) => void;
}

export const useUI = create<UIStore>((set) => ({
  activeApp: null,
  setActiveApp: (app) => set({ activeApp: app }),
}));
