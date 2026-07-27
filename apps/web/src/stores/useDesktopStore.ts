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
  if (ext === '.webloc') {
    return '/icons/browser.png';
  }
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
  const shortcutIcons: DesktopIconData[] = [];
  let gridIndex = 0;

  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    await initializeContentIndex();
  }

  const entries = useContentIndex.getState().getAllEntries();
  // Dock apps and portfolio project writeups live in content/ but aren't desktop items
  const desktopExcludedPrefixes = ['/dock', '/projects'];
  const desktopEntries = entries.filter(
    (entry) => !desktopExcludedPrefixes.some((prefix) => entry.urlPath.startsWith(prefix))
  );
  const folderMap = new Map<string, DesktopIconData[]>();

  for (const entry of desktopEntries) {
    const urlParts = entry.urlPath.split('/').filter(Boolean);
    const fileName = urlParts[urlParts.length - 1] || 'untitled';
    const folderPath = urlParts.slice(0, -1).join('/');
    const isWebloc = entry.fileExtension.toLowerCase() === '.webloc';

    const baseLabel = entry.metadata.title || fileName;
    const label = isWebloc
      ? baseLabel.replace(/\.webloc$/i, '')
      : baseLabel.endsWith(entry.fileExtension)
        ? baseLabel
        : `${baseLabel}${entry.fileExtension}`;

    const icon: DesktopIconData = {
      id: `file-${entry.urlPath}`,
      label,
      icon: getIconForFile(entry.fileExtension),
      type: 'file',
      fileExtension: entry.fileExtension.replace('.', ''),
      urlPath: entry.urlPath,
    };

    // Append shortcuts after folders so existing desktop grid slots stay put
    if (isWebloc && !folderPath) {
      shortcutIcons.push(icon);
      continue;
    }

    icon.gridIndex = gridIndex++;

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
    // Only top-level folders belong on the desktop; nested ones open via Finder
    if (folderParts.length !== 1) continue;

    const folderName = folderParts[0] || folderPath;

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

  // Place desktop shortcuts directly under Graduate_Work without reshuffling prior icons
  const graduateWorkIndex = icons.findIndex((icon) => icon.id === 'folder-Graduate_Work');
  const insertAtGridIndex =
    graduateWorkIndex >= 0 ? (icons[graduateWorkIndex].gridIndex ?? gridIndex) + 1 : gridIndex;

  for (const icon of icons) {
    if ((icon.gridIndex ?? -1) >= insertAtGridIndex) {
      icon.gridIndex = (icon.gridIndex ?? 0) + shortcutIcons.length;
    }
  }

  const shortcutsWithGrid = shortcutIcons.map((shortcut, offset) => ({
    ...shortcut,
    gridIndex: insertAtGridIndex + offset,
  }));

  if (graduateWorkIndex >= 0) {
    icons.splice(graduateWorkIndex + 1, 0, ...shortcutsWithGrid);
  } else {
    icons.push(...shortcutsWithGrid);
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
