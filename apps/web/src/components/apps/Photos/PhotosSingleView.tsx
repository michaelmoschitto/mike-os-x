import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { PhotoData } from '@/lib/photosContent';
import { sanitizeUrlPath } from '@/lib/utils';

interface PhotosSingleViewProps {
  photo: PhotoData;
  photos: PhotoData[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const PhotosSingleView = ({
  photo,
  photos,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
}: PhotosSingleViewProps) => {
  const getImageUrl = (photo: PhotoData) => {
    const sanitizedPath = sanitizeUrlPath(photo.urlPath);
    return `/content${sanitizedPath}${photo.fileExtension}`;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onPrevious();
      } else if (e.key === 'ArrowRight') {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  return (
    <div className="flex flex-col">
      <div className="aqua-pinstripe relative flex h-[400px] items-center justify-center border-b border-[var(--color-border-subtle)] overflow-hidden">
        <div className="relative max-h-full max-w-full">
          <img
            src={getImageUrl(photo)}
            alt={photo.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <button
          className={cn(
            'aqua-button-base absolute right-2 top-2 z-10 flex h-[22px] w-[22px] items-center justify-center p-0',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-aqua-blue)]'
          )}
          onClick={onClose}
          type="button"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-2">
          <button
            className="aqua-button-base flex h-[22px] w-[28px] items-center justify-center"
            onClick={onPrevious}
            title="Previous (←)"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            className="aqua-button-base flex h-[22px] w-[28px] items-center justify-center"
            onClick={onNext}
            title="Next (→)"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotosSingleView;

