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
    content: `# Hey, my name is Mike! 👋

Welcome to my portfolio.

## About Me

I'm a **Senior Front-End Developer** passionate about building beautiful, functional web experiences. This portfolio is inspired by the iconic *Mac OS X Aqua* design from the early 2000s.

## What I Do

- Build modern web applications with **React** and **TypeScript**
- Create pixel-perfect UIs with attention to detail
- Design systems that feel authentic and nostalgic

## Technical Skills

- **Languages:** JavaScript, TypeScript, HTML, CSS
- **Frameworks:** React, Vite, Next.js
- **Styling:** Tailwind CSS, Framer Motion
- **Tools:** Git, Docker, VS Code

---

### Explore this OS

Double-click files to open them in TextEdit. Drag windows around. Click the dock. It's *almost* like the real thing.

Built with ❤️ in 2025, inspired by 2001.`,
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
