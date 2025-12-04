import type { PhotoData } from '@/lib/photosContent';
import { getPhotoImageUrl } from '@/lib/photosRouting';

interface PhotosGridProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
}

const PhotosGrid = ({ photos, onPhotoClick }: PhotosGridProps) => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white p-4">
      {photos.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="font-ui text-sm text-[var(--color-text-secondary)]">No photos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group cursor-pointer"
              onClick={() => onPhotoClick(photo)}
            >
              <div className="relative aspect-square overflow-hidden rounded bg-gray-100">
                <img
                  src={getPhotoImageUrl(photo)}
                  alt={photo.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="mt-2 text-center">
                <p className="font-ui text-[11px] text-[var(--color-text-primary)]">{photo.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotosGrid;
