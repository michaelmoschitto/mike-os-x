import { useRef, useState, useEffect, useMemo } from 'react';
import { Grid, type CellComponentProps } from 'react-window';

import type { PhotoData } from '@/lib/photosContent';
import { getPhotoImageUrl } from '@/lib/photosRouting';

interface PhotosGridProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
  selectedIndex?: number | null;
  isCarouselMode?: boolean;
}

// TODO: Consider implementing thumbnail generation to reduce memory usage further.
// This would involve creating smaller versions of images at build time (e.g., 300x300px thumbnails)
// and serving them in the grid view, while loading full-resolution images only in single view.
// This could provide an additional 50-70% memory reduction on top of virtual scrolling.

interface CellData {
  photos: PhotoData[];
  columnCount: number;
  columnWidth: number;
  gap: number;
  failedImages: Set<string>;
  onImageError: (photoId: string) => void;
  onPhotoInteraction: (photo: PhotoData, e: React.KeyboardEvent | React.MouseEvent) => void;
}

const PhotosGrid = ({
  photos,
  onPhotoClick,
  selectedIndex = null,
  isCarouselMode = false,
}: PhotosGridProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Scroll to selected item in carousel mode
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

  // Grid configuration - must be calculated before any early returns to maintain hook order
  const gap = 16; // 16px gap (gap-4)
  const padding = 16; // 16px padding (p-4)
  const columnCount = 4;
  const availableWidth = dimensions.width - padding * 2;
  const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
  const rowHeight = columnWidth + 40; // Add space for photo name
  const rowCount = Math.ceil(photos.length / columnCount);

  const cellProps: CellData = useMemo(
    () => ({
      photos,
      columnCount,
      columnWidth,
      gap,
      failedImages,
      onImageError: handleImageError,
      onPhotoInteraction: handlePhotoInteraction,
    }),
    [photos, columnCount, columnWidth, gap, failedImages]
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

  // Render as horizontal scrollable carousel when in carousel mode
  if (isCarouselMode) {
    const thumbnailSize = 140;

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
        <div className="flex h-full items-center overflow-x-auto overflow-y-hidden px-4 scrollbar-hide">
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
                      isSelected
                        ? 'ring-[3px] ring-[var(--color-highlight)] ring-offset-2'
                        : ''
                    }`}
                    style={{ height: thumbnailSize }}
                  >
                    {hasError ? (
                      <div className="flex h-full w-full items-center justify-center bg-gray-200">
                        <svg
                          width="32"
                          height="32"
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
                        className={`h-full w-full object-cover transition-transform ${
                          !isSelected ? 'group-hover:scale-105' : ''
                        }`}
                        loading="lazy"
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

  const Cell = ({
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
  }: CellComponentProps<CellData>) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= photos.length) return <div style={style} />;

    const photo = photos[index];
    const hasError = failedImages.has(photo.id);

    // Adjust style to account for gaps
    const adjustedStyle = {
      ...style,
      left: Number(style.left) + gap * columnIndex,
      top: Number(style.top) + gap * rowIndex,
      width: columnWidth,
      height: rowHeight,
    };

    return (
      <div style={adjustedStyle}>
        <div
          className="group cursor-pointer"
          onClick={(e) => onPhotoInteraction(photo, e)}
          onKeyDown={(e) => onPhotoInteraction(photo, e)}
          role="button"
          tabIndex={0}
          aria-label={`View photo ${photo.name}`}
        >
          <div
            className="relative overflow-hidden rounded bg-gray-100"
            style={{ height: columnWidth }}
          >
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

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col bg-white">
      <div style={{ padding: `${padding}px` }}>
        <Grid
          cellComponent={Cell}
          cellProps={cellProps}
          columnCount={columnCount}
          columnWidth={columnWidth + gap}
          defaultHeight={dimensions.height - padding * 2}
          rowCount={rowCount}
          rowHeight={rowHeight + gap}
          defaultWidth={dimensions.width - padding * 2}
          overscanCount={2}
          style={{ overflow: 'auto' }}
        />
      </div>
    </div>
  );
};

export default PhotosGrid;
