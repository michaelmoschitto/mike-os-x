import { useContentIndex, initializeContentIndex } from '@/lib/contentIndex';

export interface FinderItemData {
  id: string;
  name: string;
  type: 'file' | 'folder';
  icon: string;
  path: string;
  size?: number;
  dateModified?: Date;
  dateCreated?: Date;
  fileExtension?: string;
  kind?: string;
}

const getIconForFile = (fileExtension: string): string => {
  const ext = fileExtension.toLowerCase();
  if (ext === '.webloc') {
    return '/icons/Internet-shortcut-icon.png';
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

export const getFolderContents = (path: string): FinderItemData[] => {
  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    initializeContentIndex();
  }

  const items: FinderItemData[] = [];
  const folderMap = new Map<string, FinderItemData[]>();

  // TODO: remove hardcoded folders in finder
  if (path === '/home') {
    return [
      {
        id: 'folder-Documents',
        name: 'Documents',
        type: 'folder',
        icon: '/icons/finder.png',
        path: '/Documents',
      },
      {
        id: 'folder-Library',
        name: 'Library',
        type: 'folder',
        icon: '/icons/finder.png',
        path: '/Library',
      },
      {
        id: 'folder-Public',
        name: 'Public',
        type: 'folder',
        icon: '/icons/finder.png',
        path: '/Public',
      },
    ];
  }

  const entries = useContentIndex.getState().getAllEntries();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathParts = normalizedPath.split('/').filter(Boolean);

  // Handle /dock/* paths - map to content/dock/* folders
  if (pathParts.length >= 2 && pathParts[0] === 'dock') {
    const dockFolderName = pathParts[1];
    const dockPath = `/dock/${dockFolderName}`;
    const filteredEntries = entries.filter((entry) => {
      const entryPathParts = entry.urlPath.split('/').filter(Boolean);
      // Entry should start with /dock/{folderName}/ and have exactly one more part
      return (
        entryPathParts.length === 3 &&
        entryPathParts[0] === 'dock' &&
        entryPathParts[1] === dockFolderName
      );
    });

    for (const entry of filteredEntries) {
      const entryPathParts = entry.urlPath.split('/').filter(Boolean);
      const fileName = entryPathParts[entryPathParts.length - 1] || entry.urlPath;
      const nameWithExt = entry.metadata.title
        ? entry.metadata.title.endsWith(entry.fileExtension)
          ? entry.metadata.title
          : `${entry.metadata.title}${entry.fileExtension}`
        : fileName;

      items.push({
        id: `file-${entry.urlPath}`,
        name: nameWithExt,
        type: 'file',
        icon: getIconForFile(entry.fileExtension),
        path: entry.urlPath,
        size: entry.fileSize,
        dateModified: entry.dateModified,
        dateCreated: entry.dateCreated,
        fileExtension: entry.fileExtension.replace('.', ''),
        kind: entry.kind,
      });
    }

    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  // Filter out /dock paths from desktop view
  const visibleEntries = path === '/home' || pathParts.length === 0
    ? entries.filter((entry) => !entry.urlPath.startsWith('/dock'))
    : entries;

  for (const entry of visibleEntries) {
    const entryPathParts = entry.urlPath.split('/').filter(Boolean);

    if (pathParts.length === 0) {
      if (entryPathParts.length === 1) {
        const fileName = entryPathParts[0];
        const nameWithExt = entry.metadata.title
          ? entry.metadata.title.endsWith(entry.fileExtension)
            ? entry.metadata.title
            : `${entry.metadata.title}${entry.fileExtension}`
          : fileName;
        items.push({
          id: `file-${entry.urlPath}`,
          name: nameWithExt,
          type: 'file',
          icon: getIconForFile(entry.fileExtension),
          path: entry.urlPath,
          size: entry.fileSize,
          dateModified: entry.dateModified,
          dateCreated: entry.dateCreated,
          fileExtension: entry.fileExtension.replace('.', ''),
          kind: entry.kind,
        });
      } else if (entryPathParts.length > 1) {
        const folderName = entryPathParts[0];
        const folderPath = `/${folderName}`;
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, []);
        }
      }
    } else {
      const isInCurrentPath =
        entryPathParts.length > pathParts.length &&
        entryPathParts.slice(0, pathParts.length).join('/') === pathParts.join('/');

      if (isInCurrentPath) {
        const remainingParts = entryPathParts.slice(pathParts.length);

        if (remainingParts.length === 1) {
          const fileName = remainingParts[0];
          const nameWithExt = entry.metadata.title
            ? entry.metadata.title.endsWith(entry.fileExtension)
              ? entry.metadata.title
              : `${entry.metadata.title}${entry.fileExtension}`
            : fileName;
          items.push({
            id: `file-${entry.urlPath}`,
            name: nameWithExt,
            type: 'file',
            icon: getIconForFile(entry.fileExtension),
            path: entry.urlPath,
            size: entry.fileSize,
            dateModified: entry.dateModified,
            dateCreated: entry.dateCreated,
            fileExtension: entry.fileExtension.replace('.', ''),
            kind: entry.kind,
          });
        } else if (remainingParts.length > 1) {
          const folderName = remainingParts[0];
          const folderPath = `/${pathParts.concat([folderName]).join('/')}`;
          if (!folderMap.has(folderPath)) {
            folderMap.set(folderPath, []);
          }
        }
      }
    }
  }

  for (const [folderPath] of folderMap.entries()) {
    const folderParts = folderPath.split('/').filter(Boolean);
    const folderName = folderParts[folderParts.length - 1] || folderPath;

    items.push({
      id: `folder-${folderPath}`,
      name: folderName,
      type: 'folder',
      icon: '/icons/finder.png',
      path: folderPath,
    });
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
};
