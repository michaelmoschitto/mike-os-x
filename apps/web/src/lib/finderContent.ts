import { useContentIndex, initializeContentIndex } from '@/lib/contentIndex';
import { normalizePath, normalizeUrlPath } from '@/lib/utils';

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
  const folderSet = new Set<string>();

  const entries = useContentIndex.getState().getAllEntries();
  const folders = useContentIndex.getState().folders;

  const normalizedPath = normalizePath(path);
  const normalizedPathParts = normalizedPath ? normalizedPath.split('/') : [];

  for (const entry of entries) {
    const entryPath = normalizePath(entry.urlPath);
    const entryPathParts = entryPath ? entryPath.split('/') : [];

    const isInPath =
      normalizedPathParts.length === 0
        ? entryPathParts.length > 0
        : entryPathParts.length > normalizedPathParts.length &&
          entryPathParts.slice(0, normalizedPathParts.length).join('/') === normalizedPath;

    if (!isInPath) {
      continue;
    }

    const remainingParts = entryPathParts.slice(normalizedPathParts.length);
    const depth = remainingParts.length;

    if (depth === 1) {
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
    } else if (depth > 1) {
      const immediateSubfolder = remainingParts[0];
      const subfolderPath = normalizeUrlPath(
        normalizedPath ? `${normalizedPath}/${immediateSubfolder}` : immediateSubfolder
      );
      folderSet.add(subfolderPath);
    }
  }

  for (const folderPath of folders) {
    const folderPathNormalized = normalizePath(folderPath);
    const folderPathParts = folderPathNormalized ? folderPathNormalized.split('/') : [];

    const isInPath =
      normalizedPathParts.length === 0
        ? folderPathParts.length > 0
        : folderPathParts.length > normalizedPathParts.length &&
          folderPathParts.slice(0, normalizedPathParts.length).join('/') === normalizedPath;

    if (!isInPath) {
      continue;
    }

    const remainingParts = folderPathParts.slice(normalizedPathParts.length);
    if (remainingParts.length > 0) {
      const immediateSubfolder = remainingParts[0];
      const subfolderPath = normalizeUrlPath(
        normalizedPath ? `${normalizedPath}/${immediateSubfolder}` : immediateSubfolder
      );
      folderSet.add(subfolderPath);
    }
  }

  for (const folderPath of folderSet) {
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
