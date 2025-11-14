import { create } from 'zustand';

import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';

export interface DesktopIconData {
  id: string;
  label: string;
  icon: string;
  type: 'file' | 'folder' | 'app' | 'volume';
  position?: { x: number; y: number };
  gridIndex?: number;
  content?: string;
  fileExtension?: string;
  urlPath?: string;
}

interface DesktopStore {
  icons: DesktopIconData[];
  selectedIcon: string | null;
  isInitialized: boolean;
  setSelectedIcon: (id: string | null) => void;
  updateIconPosition: (id: string, position: { x: number; y: number }) => void;
  initializeIcons: () => Promise<void>;
}

const getIconForFile = (fileExtension: string): string => {
  const ext = fileExtension.toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    return '/icons/file-text.png';
  }
  if (ext === '.pdf') {
    return '/icons/file-text.png'; // TODO: Add PDF icon
  }
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    return '/icons/photos.png';
  }
  return '/icons/file-text.png';
};

const buildIconsFromContent = async (): Promise<DesktopIconData[]> => {
  const icons: DesktopIconData[] = [];
  let gridIndex = 0;

  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    await initializeContentIndex();
  }

  const entries = useContentIndex.getState().getAllEntries();
  const folderMap = new Map<string, DesktopIconData[]>();

  for (const entry of entries) {
    const urlParts = entry.urlPath.split('/').filter(Boolean);
    const fileName = urlParts[urlParts.length - 1] || 'untitled';
    const folderPath = urlParts.slice(0, -1).join('/');

    const icon: DesktopIconData = {
      id: `file-${entry.urlPath}`,
      label: entry.metadata.title || fileName,
      icon: getIconForFile(entry.fileExtension),
      type: 'file',
      gridIndex: gridIndex++,
      fileExtension: entry.fileExtension.replace('.', ''),
      urlPath: entry.urlPath,
    };

    if (folderPath) {
      if (!folderMap.has(folderPath)) {
        folderMap.set(folderPath, []);
      }
      folderMap.get(folderPath)!.push(icon);
    } else {
      icons.push(icon);
    }
  }

  for (const [folderPath] of folderMap.entries()) {
    const folderParts = folderPath.split('/');
    const folderName = folderParts[folderParts.length - 1] || folderPath;

    const folderIcon: DesktopIconData = {
      id: `folder-${folderPath}`,
      label: folderName,
      icon: '/icons/finder.png',
      type: 'folder',
      gridIndex: gridIndex++,
      urlPath: `/${folderPath}`,
    };

    icons.push(folderIcon);
  }

  return icons;
};

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  icons: [],
  selectedIcon: null,
  isInitialized: false,
  setSelectedIcon: (id) => set({ selectedIcon: id }),
  updateIconPosition: (id, position) =>
    set((state) => ({
      icons: state.icons.map((icon) =>
        icon.id === id ? { ...icon, position, gridIndex: undefined } : icon
      ),
    })),
  initializeIcons: async () => {
    if (get().isInitialized) return;

    const icons = await buildIconsFromContent();
    set({ icons, isInitialized: true });
  },
}));
