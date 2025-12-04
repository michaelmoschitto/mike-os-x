import { useContentIndex, initializeContentIndex } from '@/lib/contentIndex';
import { normalizePath, normalizeUrlPath } from '@/lib/utils';

export interface PhotoData {
  id: string;
  name: string;
  path: string;
  albumPath: string;
  albumName: string;
  urlPath: string;
  filePath: string;
  fileExtension: string;
  size?: number;
  dateModified?: Date;
  dateCreated?: Date;
}

export interface AlbumData {
  path: string;
  name: string;
  photoCount: number;
}

const getAlbumName = (albumPath: string): string => {
  const parts = albumPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'All Photos';
};

export const getPhotoAlbums = (): AlbumData[] => {
  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    initializeContentIndex();
  }

  const albums = new Map<string, number>();
  const entries = useContentIndex.getState().getAllEntries();

  for (const entry of entries) {
    const normalizedPath = normalizePath(entry.urlPath);
    if (!normalizedPath.startsWith('dock/photos')) {
      continue;
    }

    const pathParts = normalizedPath.split('/').filter(Boolean);
    if (pathParts.length < 3) {
      continue;
    }

    const albumPath = pathParts.slice(0, 3).join('/');
    albums.set(albumPath, (albums.get(albumPath) || 0) + 1);
  }

  const albumList: AlbumData[] = [];
  for (const [path, count] of albums.entries()) {
    albumList.push({
      path,
      name: getAlbumName(path),
      photoCount: count,
    });
  }

  albumList.sort((a, b) => a.name.localeCompare(b.name));

  return albumList;
};

export const getAlbumPhotos = (albumPath?: string): PhotoData[] => {
  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    initializeContentIndex();
  }

  const photos: PhotoData[] = [];
  const entries = useContentIndex.getState().getAllEntries();
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  const targetPath = albumPath ? normalizePath(albumPath) : 'dock/photos';

  for (const entry of entries) {
    const normalizedPath = normalizePath(entry.urlPath);
    const isDockPhoto = normalizedPath.startsWith('dock/photos');
    const isDesktopPhoto = !normalizedPath.startsWith('dock') && imageExtensions.includes(entry.fileExtension.toLowerCase());

    if (!isDockPhoto && !isDesktopPhoto) {
      continue;
    }

    if (!imageExtensions.includes(entry.fileExtension.toLowerCase())) {
      continue;
    }

    if (isDockPhoto) {
      const pathParts = normalizedPath.split('/').filter(Boolean);
      if (pathParts.length < 3) {
        continue;
      }

      const entryAlbumPath = pathParts.slice(0, 3).join('/');
      const photoName = pathParts[pathParts.length - 1];

      if (albumPath && entryAlbumPath !== targetPath) {
        continue;
      }

      photos.push({
        id: `photo-${entry.urlPath}`,
        name: entry.metadata.title || photoName.replace(entry.fileExtension, ''),
        path: normalizedPath,
        albumPath: entryAlbumPath,
        albumName: getAlbumName(entryAlbumPath),
        urlPath: entry.urlPath,
        filePath: entry.filePath,
        fileExtension: entry.fileExtension,
        size: entry.fileSize,
        dateModified: entry.dateModified,
        dateCreated: entry.dateCreated,
      });
    } else if (isDesktopPhoto && !albumPath) {
      const pathParts = normalizedPath.split('/').filter(Boolean);
      const photoName = pathParts[pathParts.length - 1] || normalizedPath;

      photos.push({
        id: `photo-${entry.urlPath}`,
        name: entry.metadata.title || photoName.replace(entry.fileExtension, ''),
        path: normalizedPath,
        albumPath: '/desktop',
        albumName: 'Desktop',
        urlPath: entry.urlPath,
        filePath: entry.filePath,
        fileExtension: entry.fileExtension,
        size: entry.fileSize,
        dateModified: entry.dateModified,
        dateCreated: entry.dateCreated,
      });
    }
  }

  photos.sort((a, b) => {
    if (a.dateModified && b.dateModified) {
      return b.dateModified.getTime() - a.dateModified.getTime();
    }
    return a.name.localeCompare(b.name);
  });

  return photos;
};

export const getAllPhotos = (): PhotoData[] => {
  return getAlbumPhotos();
};

export const getPhotoByPath = (photoPath: string): PhotoData | null => {
  const indexState = useContentIndex.getState();
  if (!indexState.isIndexed) {
    initializeContentIndex();
  }

  const normalizedPath = normalizePath(photoPath);
  const entry = useContentIndex.getState().getEntry(normalizedPath);

  if (!entry) {
    return null;
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  if (!imageExtensions.includes(entry.fileExtension.toLowerCase())) {
    return null;
  }

  const pathParts = normalizedPath.split('/').filter(Boolean);
  const isDockPhoto = normalizedPath.startsWith('dock/photos');
  const albumPath = isDockPhoto && pathParts.length >= 3 
    ? pathParts.slice(0, 3).join('/') 
    : 'desktop';
  const photoName = pathParts[pathParts.length - 1] || normalizedPath;

  return {
    id: `photo-${entry.urlPath}`,
    name: entry.metadata.title || photoName.replace(entry.fileExtension, ''),
    path: normalizedPath,
    albumPath,
    albumName: getAlbumName(albumPath),
    urlPath: entry.urlPath,
    filePath: entry.filePath,
    fileExtension: entry.fileExtension,
    size: entry.fileSize,
    dateModified: entry.dateModified,
    dateCreated: entry.dateCreated,
  };
};

