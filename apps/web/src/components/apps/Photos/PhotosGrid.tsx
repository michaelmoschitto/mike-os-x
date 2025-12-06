import { useRef, useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { Grid } from 'react-window';

import type { PhotoData } from '@/lib/photosContent';

// Helper to get photo image URL
const getPhotoImageUrl = (photo: PhotoData): string => {
  const sanitizedPath = photo.urlPath.startsWith('/') ? photo.urlPath : '/' + photo.urlPath;
  return `/content${sanitizedPath}${photo.fileExtension}`;
};

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
  rowHeight: number;
  gap: number;
  failedImages: Set<string>;
  onImageError: (photoId: string) => void;
  onPhotoInteraction: (photo: PhotoData, e: React.KeyboardEvent | React.MouseEvent) => void;
}

type GridCellProps = {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: CellData;
};

const PhotosGrid = ({
  photos,
  onPhotoClick,
  selectedIndex = null,
  isCarouselMode = false,
}: PhotosGridProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  // Update dimensions on mount and resize
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    // Measure immediately
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
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

  // Grid configuration - calculate these before early returns to ensure hooks are always called
  const gap = 16;
  const padding = 16;
  const columnCount = 4;
  const availableWidth = dimensions.width - padding * 2;
  const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
  const rowHeight = columnWidth + 40;
  const rowCount = Math.ceil(photos.length / columnCount);

  const cellData: CellData = useMemo(
    () => ({
      photos,
      columnCount,
      columnWidth,
      rowHeight,
      gap,
      failedImages,
      onImageError: handleImageError,
      onPhotoInteraction: handlePhotoInteraction,
    }),
    [
      photos,
      columnCount,
      columnWidth,
      rowHeight,
      gap,
      failedImages,
      handleImageError,
      handlePhotoInteraction,
    ]
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

  const Cell = ({ columnIndex, rowIndex, style, data }: GridCellProps) => {
    const {
      photos,
      columnCount,
      columnWidth,
      gap,
      failedImages,
      onImageError,
      onPhotoInteraction,
    } = data;
    const index = rowIndex * columnCount + columnIndex;
    if (index >= photos.length) return <div style={style} />;

    const photo = photos[index];
    const hasError = failedImages.has(photo.id);

    const isLastColumn = columnIndex === columnCount - 1;
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
                className="block h-full w-full object-cover"
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

  const gridHeight = Math.max(0, dimensions.height - padding * 2);
  const gridWidth = Math.max(0, dimensions.width - padding * 2);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="h-full" style={{ padding: `${padding}px` }}>
        <Grid
          cellComponent={(props) => <Cell {...props} data={cellData} />}
          cellProps={{}}
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
