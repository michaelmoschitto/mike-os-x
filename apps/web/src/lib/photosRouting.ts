import type { PhotoData } from '@/lib/photosContent';
import { sanitizeUrlPath } from '@/lib/utils';

export const getPhotoImageUrl = (photo: PhotoData): string => {
  const sanitizedPath = sanitizeUrlPath(photo.urlPath);
  return `/content${sanitizedPath}${photo.fileExtension}`;
};

const removeFileExtension = (filename: string): string => {
  return filename.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
};

const normalizePathForRouting = (path: string): string => {
  return path.startsWith('/') ? path.slice(1) : path;
};

export const buildPhotoRoute = (photo: PhotoData): string => {
  const urlPath = normalizePathForRouting(photo.urlPath);
  const pathParts = urlPath.split('/').filter(Boolean);

  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/photos/${albumName}/${photoNameWithoutExt}`;
  }

  if (pathParts.length > 0 && pathParts[0] !== 'dock') {
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/photos/desktop/${photoNameWithoutExt}`;
  }

  return `/photos?photo=${encodeURIComponent(photo.urlPath)}`;
};

export const buildAlbumRoute = (albumPath?: string): string => {
  if (!albumPath) {
    return '/photos';
  }

  const normalizedAlbumPath = normalizePathForRouting(albumPath);
  const pathParts = normalizedAlbumPath.split('/').filter(Boolean);

  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    return `/photos/${albumName}`;
  }

  return `/photos?album=${encodeURIComponent(albumPath)}`;
};

export const buildPhotoRouteFromWindow = (
  urlPath: string | undefined,
  selectedPhotoIndex: number | null | undefined
): string | null => {
  if (!urlPath || selectedPhotoIndex === undefined || selectedPhotoIndex === null) {
    return null;
  }

  const normalizedUrlPath = normalizePathForRouting(urlPath);
  const pathParts = normalizedUrlPath.split('/').filter(Boolean);

  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/photos/${albumName}/${photoNameWithoutExt}`;
  }

  if (pathParts.length > 0 && pathParts[0] !== 'dock') {
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/photos/desktop/${photoNameWithoutExt}`;
  }

  return `/photos?photo=${encodeURIComponent(urlPath)}`;
};

export const buildAlbumRouteFromWindow = (albumPath: string | undefined): string => {
  if (!albumPath) {
    return '/photos';
  }

  const normalizedAlbumPath = normalizePathForRouting(albumPath);
  const pathParts = normalizedAlbumPath.split('/').filter(Boolean);

  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    return `/photos/${albumName}`;
  }

  return `/photos?album=${encodeURIComponent(albumPath)}`;
};

