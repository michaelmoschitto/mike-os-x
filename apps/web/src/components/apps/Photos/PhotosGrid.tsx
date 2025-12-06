import { useState } from 'react';

import type { PhotoData } from '@/lib/photosContent';
import { getPhotoImageUrl } from '@/lib/photosRouting';

interface PhotosGridProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
}

const PhotosGrid = ({ photos, onPhotoClick }: PhotosGridProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageError = (photoId: string) => {
    setFailedImages((prev) => new Set(prev).add(photoId));
  };

  const handlePhotoInteraction = (photo: PhotoData, e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'click') {
      onPhotoClick(photo);
    } else if (e.type === 'keydown') {
      const keyEvent = e as React.KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault();
        onPhotoClick(photo);
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white p-4">
      {photos.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="font-ui text-sm text-[var(--color-text-secondary)]">No photos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {photos.map((photo) => {
            const hasError = failedImages.has(photo.id);
            return (
              <div
                key={photo.id}
                className="group cursor-pointer"
                onClick={(e) => handlePhotoInteraction(photo, e)}
                onKeyDown={(e) => handlePhotoInteraction(photo, e)}
                role="button"
                tabIndex={0}
                aria-label={`View photo ${photo.name}`}
              >
                <div className="relative aspect-square overflow-hidden rounded bg-gray-100">
                  {hasError ? (
                    <div className="flex h-full w-full items-center justify-center bg-gray-200">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-gray-400"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={getPhotoImageUrl(photo)}
                      alt={photo.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                      onError={() => handleImageError(photo.id)}
                    />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="font-ui text-[11px] text-[var(--color-text-primary)]">
                    {photo.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotosGrid;
