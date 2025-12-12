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
  refreshIcons: () => Promise<void>;
}

const getIconForFile = (fileExtension: string): string => {
  const ext = fileExtension.toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    return '/icons/file-text.png';
  }
  if (ext === '.pdf') {
    return '/icons/pdf.png';
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
  // Filter out /dock entries from desktop
  const desktopEntries = entries.filter((entry) => !entry.urlPath.startsWith('/dock'));
  const folderMap = new Map<string, DesktopIconData[]>();

  for (const entry of desktopEntries) {
    const urlParts = entry.urlPath.split('/').filter(Boolean);
    const fileName = urlParts[urlParts.length - 1] || 'untitled';
    const folderPath = urlParts.slice(0, -1).join('/');

    const baseLabel = entry.metadata.title || fileName;
    const labelWithExtension = baseLabel.endsWith(entry.fileExtension)
      ? baseLabel
      : `${baseLabel}${entry.fileExtension}`;

    const icon: DesktopIconData = {
      id: `file-${entry.urlPath}`,
      label: labelWithExtension,
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
  refreshIcons: async () => {
    await initializeContentIndex();

    const existingIcons = get().icons;
    const positionMap = new Map<string, { x: number; y: number }>();
    for (const icon of existingIcons) {
      if (icon.position) {
        positionMap.set(icon.id, icon.position);
      }
    }

    const newIcons = await buildIconsFromContent();
    const iconsWithPositions = newIcons.map((icon) => {
      const existingPosition = positionMap.get(icon.id);
      if (existingPosition) {
        return { ...icon, position: existingPosition, gridIndex: undefined };
      }
      return icon;
    });

    set({ icons: iconsWithPositions });
  },
}));
