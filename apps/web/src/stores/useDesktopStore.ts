import { create } from 'zustand';

import readmeContent from '../../content/README.md?raw';

export interface DesktopIconData {
  id: string;
  label: string;
  icon: string;
  type: 'file' | 'folder' | 'app' | 'volume';
  position?: { x: number; y: number };
  gridIndex?: number;
  content?: string;
  fileExtension?: string;
}

interface DesktopStore {
  icons: DesktopIconData[];
  selectedIcon: string | null;
  setSelectedIcon: (id: string | null) => void;
  updateIconPosition: (id: string, position: { x: number; y: number }) => void;
}

const initialIcons: DesktopIconData[] = [
  {
    id: 'readme',
    label: 'README.md',
    icon: '/icons/file-text.png',
    type: 'file',
    gridIndex: 0,
    fileExtension: 'md',
    content: readmeContent,
  },
];

export const useDesktopStore = create<DesktopStore>((set) => ({
  icons: initialIcons,
  selectedIcon: null,
  setSelectedIcon: (id) => set({ selectedIcon: id }),
  updateIconPosition: (id, position) =>
    set((state) => ({
      icons: state.icons.map((icon) =>
        icon.id === id ? { ...icon, position, gridIndex: undefined } : icon
      ),
    })),
}));
