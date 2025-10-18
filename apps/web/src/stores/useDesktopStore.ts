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
    content: `# Hey, my name is Mike!

Welcome to my portfolio.

## About Me

I'm a **dev** based in Incline Village, NV passionate about AI/ML, databases, user interfaces, and scalability. This portfolio is inspired by the iconic *Mac OS X Aqua* design from 2000, the year I was born.

## What I Do

- idk I just liked to code.

## Tech used to make this site:

- **Languages:** JavaScript, TypeScript, HTML, CSS
- **Frameworks:** React, Vite
- **Styling:** Tailwind CSS, Framer Motion
- **Tools:** Git, Docker, Cursor

---

### Explore this OS

Built with ❤️ in 2025, inspired by 2000.`,
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
