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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="aqua-pinstripe relative flex min-h-0 flex-1 items-center justify-center overflow-hidden border-b border-[var(--color-border-subtle)]">
        <div className="relative flex h-full w-full items-center justify-center p-4">
          <img
            src={getImageUrl(photo)}
            alt={photo.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <button
          className={cn(
            'aqua-button-base absolute top-2 right-2 z-50 flex h-[22px] w-[22px] items-center justify-center p-0',
            'focus:ring-2 focus:ring-[var(--color-aqua-blue)] focus:outline-none'
          )}
          onClick={onClose}
          type="button"
          title="Close"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center justify-center gap-2">
            <button
              className="aqua-button-base flex h-[22px] w-[28px] items-center justify-center"
              onClick={onPrevious}
              title="Previous (←)"
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className="aqua-button-base flex h-[22px] w-[28px] items-center justify-center"
              onClick={onNext}
              title="Next (→)"
              type="button"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosSingleView;
