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
    <div className="relative flex h-[400px] items-center justify-center border-b border-[var(--color-border-subtle)] bg-black">
      <div className="relative max-h-full max-w-full">
        <img
          src={getImageUrl(photo)}
          alt={photo.name}
          className="max-h-full max-w-full object-contain"
        />
        {photos.length > 1 && (
          <>
            <button
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-aqua-blue)]'
              )}
              onClick={onPrevious}
              title="Previous (←)"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70',
                'focus:outline-none focus:ring-2 focus:ring-[var(--color-aqua-blue)]'
              )}
              onClick={onNext}
              title="Next (→)"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
      </div>
      <button
        className={cn(
          'absolute right-4 top-4 rounded bg-white/20 px-3 py-1 text-[11px] font-ui text-white transition-colors hover:bg-white/30',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-aqua-blue)]'
        )}
        onClick={onClose}
        type="button"
      >
        Close
      </button>
    </div>
  );
};

export default PhotosSingleView;

