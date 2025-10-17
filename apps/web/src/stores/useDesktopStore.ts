import { create } from 'zustand';

export interface DesktopIcon {
  id: string;
  label: string;
  icon: string;
  type: 'file' | 'folder' | 'app' | 'volume';
  position?: { x: number; y: number };
  gridIndex?: number;
}

interface DesktopStore {
  icons: DesktopIcon[];
  selectedIcon: string | null;
  setSelectedIcon: (id: string | null) => void;
  updateIconPosition: (id: string, position: { x: number; y: number }) => void;
}

const initialIcons: DesktopIcon[] = [
  {
    id: 'readme',
    label: 'README.md',
    icon: '/icons/file-text.png',
    type: 'file',
    gridIndex: 0,
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

