import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { Grid, type CellComponentProps } from 'react-window';

import type { PhotoData } from '@/lib/photosContent';
import { getPhotoThumbnailUrl } from '@/lib/photosUtils';

interface PhotosGridProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
  selectedIndex?: number | null;
  isCarouselMode?: boolean;
}

type PhotosCellProps = {
  photos: PhotoData[];
  columnCount: number;
  columnWidth: number;
  gap: number;
  failedImages: Set<string>;
  onImageError: (photoId: string) => void;
  onPhotoInteraction: (photo: PhotoData, e: React.KeyboardEvent | React.MouseEvent) => void;
};

const ImageErrorPlaceholder = ({ size }: { size: number }) => (
  <div className="flex h-full w-full items-center justify-center bg-gray-200">
    <svg
      width={size}
      height={size}
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
);

const PhotosGridCell = ({
  columnIndex,
  rowIndex,
  style,
  photos,
  columnCount,
  columnWidth,
  gap,
  failedImages,
  onImageError,
  onPhotoInteraction,
}: CellComponentProps<PhotosCellProps>) => {
  const index = rowIndex * columnCount + columnIndex;
  if (index >= photos.length) return <div style={style} />;

  const photo = photos[index];
  const hasError = failedImages.has(photo.id);
  const isLastColumn = columnIndex === columnCount - 1;
  const isAboveFold = rowIndex < 2;

  const cellStyle: React.CSSProperties = {
    ...style,
    paddingRight: isLastColumn ? 0 : gap,
    paddingBottom: gap,
    width: columnWidth,
  };

  return (
    <div style={cellStyle}>
      <div
        className="group flex h-full cursor-pointer flex-col"
        onClick={(e) => onPhotoInteraction(photo, e)}
        onKeyDown={(e) => onPhotoInteraction(photo, e)}
        role="button"
        tabIndex={0}
        aria-label={`View photo ${photo.name}`}
      >
        <div
          className="relative flex-shrink-0 overflow-hidden rounded bg-gray-100"
          style={{ height: columnWidth, width: columnWidth }}
        >
          {hasError ? (
            <ImageErrorPlaceholder size={48} />
          ) : (
            <img
              src={getPhotoThumbnailUrl(photo)}
              alt={photo.name}
              className="block h-full w-full object-cover"
              loading={isAboveFold ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={isAboveFold ? 'high' : 'auto'}
              onError={() => onImageError(photo.id)}
            />
          )}
        </div>
        <div className="mt-2 text-center">
          <p className="font-ui text-[11px] text-[var(--color-text-primary)]">{photo.name}</p>
        </div>
      </div>
    </div>
  );
};

const PhotosGrid = ({
  photos,
  onPhotoClick,
  selectedIndex = null,
  isCarouselMode = false,
}: PhotosGridProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const handleImageError = useCallback((photoId: string) => {
    setFailedImages((prev) => new Set(prev).add(photoId));
  }, []);

  const handlePhotoInteraction = useCallback(
    (photo: PhotoData, e: React.KeyboardEvent | React.MouseEvent) => {
      if (e.type === 'click') {
        onPhotoClick(photo);
      } else if (e.type === 'keydown') {
        const keyEvent = e as React.KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          onPhotoClick(photo);
        }
      }
    },
    [onPhotoClick]
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [photos.length, isCarouselMode]);

  const selectedItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCarouselMode && selectedIndex !== null && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [selectedIndex, isCarouselMode]);

  const gap = 16;
  const padding = 16;
  const columnCount = 4;
  const availableWidth = dimensions.width - padding * 2;
  const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
  const rowHeight = columnWidth + 40;
  const rowCount = Math.ceil(photos.length / columnCount);

  const cellProps = useMemo(
    (): PhotosCellProps => ({
      photos,
      columnCount,
      columnWidth,
      gap,
      failedImages,
      onImageError: handleImageError,
      onPhotoInteraction: handlePhotoInteraction,
    }),
    [photos, columnCount, columnWidth, gap, failedImages, handleImageError, handlePhotoInteraction]
  );

  if (photos.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-white p-4">
        <div className="flex h-full items-center justify-center">
          <p className="font-ui text-sm text-[var(--color-text-secondary)]">No photos found</p>
        </div>
      </div>
    );
  }

  if (isCarouselMode) {
    const thumbnailSize = 140;

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="scrollbar-hide flex h-full items-center overflow-x-auto overflow-y-hidden px-4">
          <div className="flex h-full items-center gap-3 py-4">
            {photos.map((photo, index) => {
              const hasError = failedImages.has(photo.id);
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={photo.id}
                  ref={isSelected ? selectedItemRef : null}
                  className="group flex-shrink-0 cursor-pointer"
                  onClick={() => onPhotoClick(photo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPhotoClick(photo);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View photo ${photo.name}`}
                  style={{ width: thumbnailSize }}
                >
                  <div
                    className={`relative overflow-hidden rounded ${
                      isSelected ? 'ring-[3px] ring-[var(--color-highlight)] ring-offset-2' : ''
                    }`}
                    style={{ height: thumbnailSize }}
                  >
                    {hasError ? (
                      <ImageErrorPlaceholder size={32} />
                    ) : (
                      <img
                        src={getPhotoThumbnailUrl(photo)}
                        alt={photo.name}
                        className={`h-full w-full object-cover transition-transform ${
                          !isSelected ? 'group-hover:scale-105' : ''
                        }`}
                        loading="lazy"
                        decoding="async"
                        onError={() => handleImageError(photo.id)}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`font-ui text-[11px] ${
                        isSelected
                          ? 'font-semibold text-[var(--color-highlight)]'
                          : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {photo.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-white"
      />
    );
  }

  const gridHeight = Math.max(0, dimensions.height - padding * 2);
  const gridWidth = Math.max(0, dimensions.width - padding * 2);

  return (
    <div ref={containerRef} className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="h-full" style={{ padding: `${padding}px` }}>
        <Grid
          cellComponent={PhotosGridCell}
          cellProps={cellProps}
          columnCount={columnCount}
          columnWidth={columnWidth + gap}
          defaultHeight={gridHeight}
          rowCount={rowCount}
          rowHeight={rowHeight + gap}
          defaultWidth={gridWidth}
          overscanCount={2}
        />
      </div>
    </div>
  );
};

export default PhotosGrid;
