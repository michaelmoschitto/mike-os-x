import type { PhotoData } from '@/lib/photosContent';

export const getPhotoImageUrl = (photo: PhotoData): string => {
  const sanitizedPath = photo.urlPath.startsWith('/') ? photo.urlPath : '/' + photo.urlPath;
  return `/content${sanitizedPath}${photo.fileExtension}`;
};

export const getPhotoThumbnailUrl = (photo: PhotoData): string =>
  photo.thumbnailUrl || getPhotoImageUrl(photo);

export const getPhotoDisplayUrl = (photo: PhotoData): string =>
  photo.displayUrl || getPhotoImageUrl(photo);
