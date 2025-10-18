import { create } from 'zustand';

export interface DesktopIcon {
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
    fileExtension: 'md',
    content: `# Welcome to Mike OS X

This is a Mac OS X 10.1 (Aqua era) themed portfolio built with React and Vite.

## Features

- Authentic Aqua design with gel buttons and pinstripes
- Desktop icon system with drag and drop
- TextEdit application for viewing and editing files
- Window management with focus and z-index handling

## Try it out

Double-click this file or other text files on the desktop to open them in TextEdit!

---

Built with ❤️ using modern web technologies.`,
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

