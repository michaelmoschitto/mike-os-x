import type { PhotoData } from './photosContent';

export const getPhotoImageUrl = (photo: PhotoData): string => {
  const sanitizedPath = photo.urlPath.startsWith('/') ? photo.urlPath : '/' + photo.urlPath;
  return `/content${sanitizedPath}${photo.fileExtension}`;
};

